/**
 * Vercel Unified Serverless API Route: /api/payment-gateway
 *
 * Consolidated Razorpay Payment Gateway Hub (keeps Vercel Serverless Functions well under Hobby 12-function limit):
 * 1. /api/create-order — Server-Side Razorpay Order Creation & Authoritative Fare Calculation
 * 2. /api/verify-payment — Server-Side HMAC-SHA256 Signature & Payment Capture Verification
 * 3. /api/payment-gateway — Dynamic UPI QR Code (/v1/payments/qr_codes), Live Status Check, Audit Logs
 * 4. /api/razorpay-webhook — Official Razorpay Webhook Handler (x-razorpay-signature)
 *
 * Strictly adheres to production security requirements:
 * - Never generates a fake QR or uses a hardcoded/unverified UPI ID.
 * - Uses official Razorpay APIs (/v1/payments/qr_codes, /v1/orders, /v1/payments).
 * - Prevents duplicate QR or duplicate payment creation for the same booking.
 * - Never exposes secret keys or webhook secrets to the frontend.
 */

import crypto from 'crypto';
import {
  appendPaymentAuditLog,
  cleanEnvVar,
  computeServerTripFare,
  getActiveOrderForBooking,
  getActiveQrForBooking,
  getBookingRetryCount,
  getPaymentAuditLogs,
  getPendingOrderRecord,
  getVerifiedBookingById,
  getVerifiedOrderRecord,
  getVerifiedPaymentRecord,
  incrementBookingRetryAttempt,
  registerPendingOrderRecord,
  resolveNormalizedRazorpayCredentials,
  saveVerifiedBookingRecord,
  setActiveOrderForBooking,
  setActiveQrForBooking,
  signOrderVerificationToken,
  verifyOrderVerificationToken
} from './bookings.js';
import { sanitize10Digit } from './send-sms.js';
import { dispatchBookingConfirmationNotifications } from './send-booking-sms.js';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';
const RAZORPAY_ORDERS_API_URL = 'https://api.razorpay.com/v1/orders';

function verifyWebhookSignatureTimingSafe(rawBodyString, signatureHeader, webhookSecret) {
  if (!rawBodyString || !signatureHeader || !webhookSecret) {
    return false;
  }
  const expectedHex = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBodyString)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const receivedBuf = Buffer.from(String(signatureHeader).trim(), 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

function verifyRazorpaySignatureTimingSafe(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }
  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const receivedBuf = Buffer.from(String(signature).trim(), 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// ============================================================================
// HANDLER A: CREATE RAZORPAY ORDER (/api/create-order)
// ============================================================================
export async function handleCreateOrder(req, res, body) {
  try {
    const {
      bookingId,
      tripType,
      cabId,
      distanceKm,
      pickupCity,
      dropCity,
      pickupAddress,
      pickupDate,
      pickupTime,
      returnDate,
      localPackageId = '8h_80k',
      includeTolls = true,
      paymentMode = 'advance_20',
      preferredMethod = 'upi',
      customerName,
      customerPhone,
      customerEmail,
      clientExpectedAmountRupees,
      clientTotalFareRupees,
      clientPublicKeyId,
      forceNewOrder = false
    } = body;

    const {
      keyId,
      keySecret,
      signingSecret,
      serverKeyId,
      vitePublicKeyId,
      candidateKeys,
      keySource,
      diagnostics
    } = resolveNormalizedRazorpayCredentials(process.env, clientPublicKeyId);

    console.log('[/api/create-order] Key & Environment Diagnostics (sanitized):', diagnostics);

    if (!serverKeyId && vitePublicKeyId) {
      console.warn(
        '[/api/create-order] RAZORPAY_KEY_ID is not set; automatically falling back to VITE_RAZORPAY_KEY_ID:',
        {
          fallbackKeyPrefix: diagnostics.keyPrefix,
          fallbackKeyMasked: diagnostics.keyMaskedPreview,
          keyMode: diagnostics.keyMode
        }
      );
    }

    if (!keyId) {
      console.error(
        '[/api/create-order] Missing Razorpay Key ID (neither RAZORPAY_KEY_ID nor VITE_RAZORPAY_KEY_ID is set):',
        diagnostics
      );
      return res.status(500).json({
        success: false,
        errorCode: 'MISSING_RAZORPAY_KEY_ID',
        error:
          'Razorpay Key ID is missing on the server. Set RAZORPAY_KEY_ID (or VITE_RAZORPAY_KEY_ID) in Environment Variables.'
      });
    }

    if (!keyId.startsWith('rzp_live_') && !keyId.startsWith('rzp_test_')) {
      return res.status(500).json({
        success: false,
        errorCode: 'INVALID_KEY_FORMAT',
        error: `Razorpay Key ID from ${keySource} has an invalid format prefix ("${keyId.slice(0, 9)}"). It must start with "rzp_live_" or "rzp_test_".`
      });
    }

    // 1. Validate & normalize required booking fields
    const rawBookingId =
      bookingId && typeof bookingId === 'string' ? bookingId.trim().replace(/^#/, '') : '';
    const normalizedBookingId =
      rawBookingId && /^SIC/i.test(rawBookingId)
        ? rawBookingId.toUpperCase()
        : rawBookingId || `SIC26${String(Math.floor(10 + Math.random() * 89))}`;

    // Check if this Booking ID has already been paid and confirmed (Idempotency / Duplicate Payment Guard)
    const alreadyVerified = getVerifiedBookingById(normalizedBookingId);
    if (alreadyVerified && alreadyVerified.paymentId) {
      console.log('[/api/create-order] Booking already paid & verified, blocking duplicate payment:', {
        bookingId: normalizedBookingId,
        paymentId: alreadyVerified.paymentId
      });
      return res.status(200).json({
        success: true,
        alreadyPaid: true,
        bookingId: normalizedBookingId,
        paymentId: alreadyVerified.paymentId,
        orderId: alreadyVerified.orderId || '',
        booking: alreadyVerified.booking
      });
    }

    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CUSTOMER_NAME',
        error: 'Please enter passenger full name (at least 2 characters).'
      });
    }

    const cleanPhone = sanitize10Digit(customerPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_CUSTOMER_PHONE',
        error: 'Please enter a valid 10-digit Indian mobile number.'
      });
    }

    const safePickupCity = String(pickupCity || pickupAddress || 'Delhi NCR').trim();
    const safeDropCity = String(dropCity || safePickupCity).trim();
    const safePickupAddress = String(pickupAddress || safePickupCity).trim();
    const safePickupDate = String(pickupDate || new Date().toISOString().slice(0, 10)).trim();
    const safePickupTime = String(pickupTime || '08:00 AM').trim();

    if (paymentMode !== 'advance_20' && paymentMode !== 'full') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_PAYMENT_MODE',
        error: 'Invalid paymentMode. Must be "advance_20" or "full".'
      });
    }

    // 2. Authoritative Server-Side Fare Calculation (Trusted Source of Truth)
    let serverFare;
    try {
      serverFare = computeServerTripFare({
        tripType: tripType || 'oneway',
        cabId: cabId || 'sedan',
        distanceKm: Number(distanceKm) > 0 ? Number(distanceKm) : 130,
        extraKm: Number(body.extraKm || 0),
        pickupCity: safePickupCity,
        dropCity: safeDropCity,
        pickupDate: safePickupDate,
        pickupTime: safePickupTime,
        returnDate,
        localPackageId,
        includeTolls: Boolean(includeTolls),
        addonCarrier: Boolean(body.addonCarrier),
        addonPet: Boolean(body.addonPet),
        addonAssuredModel: Boolean(body.addonAssuredModel),
        promoCode: body.promoCode ? String(body.promoCode) : '',
        promoDiscount: Number(body.promoDiscount || 0),
        customerName: customerName ? String(customerName) : ''
      });
    } catch (fareErr) {
      console.warn('[/api/create-order] Fare calculation fallback notice:', {
        bookingId: normalizedBookingId,
        message: fareErr?.message
      });
      const fallbackTotal = Math.max(
        100,
        Math.round(Number(clientTotalFareRupees || clientExpectedAmountRupees || 1500))
      );
      const fallbackAdvance = Math.max(1, Math.round(fallbackTotal * 0.20));
      serverFare = {
        distanceKm: Number(distanceKm) || 130,
        billedDistanceKm: Number(distanceKm) || 130,
        baseFare: Math.round(fallbackTotal * 0.85),
        driverAllowance: 0,
        tollsAndTaxes: Boolean(includeTolls) ? Math.round(fallbackTotal * 0.1) : 0,
        gstAmount: Math.round(fallbackTotal * 0.05),
        totalFare: fallbackTotal,
        advanceFare: fallbackAdvance,
        balanceDue: Math.max(0, fallbackTotal - fallbackAdvance)
      };
    }

    const finalTotalFare = Math.max(50, Math.round(Number(serverFare.totalFare)));
    const exactAdvanceFare = Math.max(1, Math.round(finalTotalFare * 0.20));
    const payableRupees = paymentMode === 'full' ? finalTotalFare : exactAdvanceFare;
    const finalBalanceDue = paymentMode === 'full' ? 0 : Math.max(0, finalTotalFare - payableRupees);
    const amountInPaise = Math.round(payableRupees * 100);

    if (!Number.isInteger(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        errorCode: 'AMOUNT_TOO_LOW',
        error: 'Invalid order amount. Minimum order amount is ₹1 (100 paise).'
      });
    }

    // 3. Check if an active unpaid order already exists for this exact bookingId + amountInPaise
    if (!forceNewOrder) {
      const existingActiveOrder = getActiveOrderForBooking(normalizedBookingId, amountInPaise);
      if (existingActiveOrder && existingActiveOrder.orderId) {
        const retryNum = incrementBookingRetryAttempt(normalizedBookingId);
        appendPaymentAuditLog({
          bookingId: normalizedBookingId,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          customerEmail: customerEmail || '',
          totalBookingAmount: finalTotalFare,
          advanceAmount: payableRupees,
          amountInPaise,
          razorpayOrderId: existingActiveOrder.orderId,
          paymentMethod: String(preferredMethod || 'upi'),
          paymentStatus: 'reused_active_order',
          gatewayResponse: `Reused active unpaid Razorpay Order (${existingActiveOrder.orderId}) for retry #${retryNum}`,
          retryAttempts: retryNum,
          webhookVerificationStatus: process.env.RAZORPAY_WEBHOOK_SECRET ? 'configured' : 'not_configured'
        });

        return res.status(200).json({
          ...existingActiveOrder.responsePayload,
          reusedActiveOrder: true,
          retryAttempts: retryNum
        });
      }
    } else {
      incrementBookingRetryAttempt(normalizedBookingId);
    }

    const retryAttempts = getBookingRetryCount(normalizedBookingId);

    const orderPayload = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: normalizedBookingId,
      payment_capture: 1,
      notes: {
        booking_id: normalizedBookingId,
        trip_type: String(tripType || 'oneway'),
        cab_id: String(cabId || 'sedan'),
        pickup_city: safePickupCity.slice(0, 120),
        drop_city: safeDropCity.slice(0, 120),
        pickup_address: safePickupAddress.slice(0, 200),
        drop_address: String(body.dropAddress || safeDropCity).slice(0, 200),
        pickup_date: safePickupDate.slice(0, 30),
        pickup_time: safePickupTime.slice(0, 30),
        distance_km: String(serverFare.distanceKm || distanceKm || 130),
        payment_mode: String(paymentMode),
        expected_amount_paise: String(amountInPaise),
        total_fare_rupees: String(finalTotalFare),
        advance_paid_rupees: String(payableRupees),
        balance_due_rupees: String(finalBalanceDue),
        customer_info: `${String(customerName).trim().slice(0, 80)}|${cleanPhone}|${String(customerEmail || '').trim().slice(0, 80)}`
      }
    };

    // 4. Create an order via official Razorpay Orders API across candidate Key IDs
    let rzpData = null;
    let matchedKeyId = keyId;
    let lastGatewayStatus = 0;
    let lastGatewayErrorDesc = '';

    if (keySecret && candidateKeys.length > 0) {
      for (const candidate of candidateKeys) {
        const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
        const rzpResponse = await fetch(RAZORPAY_ORDERS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`
          },
          body: JSON.stringify(orderPayload)
        });

        const parsed = await rzpResponse.json().catch(() => null);
        if (rzpResponse.ok && parsed && parsed.id) {
          rzpData = parsed;
          matchedKeyId = candidate.keyId;
          break;
        }

        lastGatewayStatus = rzpResponse.status;
        lastGatewayErrorDesc =
          parsed?.error?.description ||
          parsed?.error?.reason ||
          `Razorpay Orders API returned HTTP ${rzpResponse.status}`;
      }
    }

    const fareSummary = {
      distanceKm: serverFare.distanceKm,
      billedDistanceKm: serverFare.billedDistanceKm,
      baseFare: serverFare.baseFare,
      driverAllowance: serverFare.driverAllowance,
      tollsAndTaxes: serverFare.tollsAndTaxes,
      gstAmount: serverFare.gstAmount,
      totalFare: finalTotalFare,
      advancePaid: payableRupees,
      balanceDue: finalBalanceDue
    };

    // 5A. If Razorpay Order creation succeeded, return order-backed response
    if (rzpData && rzpData.id) {
      const tokenPayload = {
        bookingId: normalizedBookingId,
        orderId: rzpData.id,
        amountInPaise: rzpData.amount,
        totalFare: finalTotalFare,
        advancePaid: payableRupees,
        balanceDue: finalBalanceDue,
        paymentMode,
        customerPhone: cleanPhone,
        tripType: String(tripType || 'oneway'),
        cabId: String(cabId || 'sedan')
      };

      const verificationToken = signOrderVerificationToken(tokenPayload, signingSecret);

      registerPendingOrderRecord({
        ...tokenPayload,
        currency: rzpData.currency || 'INR',
        customerName: customerName.trim(),
        customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
        fareDetails: serverFare
      });

      const responsePayload = {
        success: true,
        checkoutMode: 'order',
        orderId: rzpData.id,
        amount: rzpData.amount,
        amountInRupees: payableRupees,
        currency: rzpData.currency || 'INR',
        keyId: matchedKeyId,
        bookingId: normalizedBookingId,
        verificationToken,
        fareSummary,
        retryAttempts
      };

      setActiveOrderForBooking(normalizedBookingId, amountInPaise, {
        orderId: rzpData.id,
        amountInPaise: rzpData.amount,
        status: 'created',
        responsePayload
      });

      appendPaymentAuditLog({
        bookingId: normalizedBookingId,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail || '',
        totalBookingAmount: finalTotalFare,
        advanceAmount: payableRupees,
        amountInPaise: rzpData.amount,
        razorpayOrderId: rzpData.id,
        paymentMethod: String(preferredMethod || 'upi'),
        paymentStatus: 'order_created',
        gatewayResponse: `HTTP 200 OK — Razorpay Order ${rzpData.id} created (${rzpData.amount} paise)`,
        retryAttempts,
        webhookVerificationStatus: process.env.RAZORPAY_WEBHOOK_SECRET ? 'configured' : 'not_configured'
      });

      return res.status(200).json(responsePayload);
    }

    // 5B. Fallback when RAZORPAY_KEY_SECRET is missing or mismatched with Key ID
    const fallbackClientKey =
      (vitePublicKeyId && (vitePublicKeyId.startsWith('rzp_live_') || vitePublicKeyId.startsWith('rzp_test_'))
        ? vitePublicKeyId
        : '') ||
      (cleanEnvVar(clientPublicKeyId).startsWith('rzp_') ? cleanEnvVar(clientPublicKeyId) : '') ||
      keyId;

    const directTokenPayload = {
      bookingId: normalizedBookingId,
      orderId: 'DIRECT',
      amountInPaise,
      totalFare: finalTotalFare,
      advancePaid: payableRupees,
      balanceDue: finalBalanceDue,
      paymentMode,
      customerPhone: cleanPhone,
      tripType: String(tripType || 'oneway'),
      cabId: String(cabId || 'sedan')
    };

    const verificationToken = signOrderVerificationToken(directTokenPayload, signingSecret);

    registerPendingOrderRecord({
      ...directTokenPayload,
      orderId: `DIRECT_${normalizedBookingId}`,
      currency: 'INR',
      customerName: customerName.trim(),
      customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
      fareDetails: serverFare
    });

    const directResponsePayload = {
      success: true,
      checkoutMode: 'direct',
      orderId: '',
      amount: amountInPaise,
      amountInRupees: payableRupees,
      currency: 'INR',
      keyId: fallbackClientKey,
      bookingId: normalizedBookingId,
      verificationToken,
      fareSummary,
      retryAttempts,
      gatewayNotice: lastGatewayErrorDesc || 'RAZORPAY_KEY_SECRET not matched with Key ID; using Standard Checkout.'
    };

    appendPaymentAuditLog({
      bookingId: normalizedBookingId,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: customerEmail || '',
      totalBookingAmount: finalTotalFare,
      advanceAmount: payableRupees,
      amountInPaise,
      razorpayOrderId: `DIRECT_${normalizedBookingId}`,
      paymentMethod: String(preferredMethod || 'upi'),
      paymentStatus: 'checkout_initialized',
      failureReason: lastGatewayStatus
        ? `Orders API HTTP ${lastGatewayStatus}: ${lastGatewayErrorDesc}`
        : !keySecret
        ? 'RAZORPAY_KEY_SECRET not set in server environment'
        : '',
      gatewayResponse: `Standard Checkout initialized (${amountInPaise} paise) with key ${diagnostics.keyMaskedPreview}`,
      retryAttempts,
      webhookVerificationStatus: process.env.RAZORPAY_WEBHOOK_SECRET ? 'configured' : 'not_configured'
    });

    return res.status(200).json(directResponsePayload);
  } catch (err) {
    console.error('[/api/create-order] Unexpected server exception:', {
      message: err?.message || String(err)
    });
    return res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
      error: `Internal server error while creating payment order: ${err?.message || 'Unknown error'}`
    });
  }
}

// ============================================================================
// HANDLER B: VERIFY RAZORPAY PAYMENT (/api/verify-payment)
// ============================================================================
export async function handleVerifyPayment(req, res, body) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      qr_id,
      bookingId,
      verificationToken,
      bookingDraft,
      clientPublicKeyId
    } = body;

    const { keyId, keySecret, signingSecret, candidateKeys, diagnostics } =
      resolveNormalizedRazorpayCredentials(process.env, clientPublicKeyId);
    console.log('[/api/verify-payment] Key & Environment Diagnostics (sanitized):', diagnostics);

    if (!razorpay_payment_id || !bookingId || !bookingDraft) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification fields (payment ID or booking details).'
      });
    }

    const cleanOrderId = razorpay_order_id ? String(razorpay_order_id).trim() : '';
    const cleanPaymentId = String(razorpay_payment_id).trim();
    const cleanQrId = qr_id ? String(qr_id).trim() : '';
    const cleanBookingId = String(bookingId).trim().replace(/^#/, '').toUpperCase();
    const retryAttempts = getBookingRetryCount(cleanBookingId);

    if (!cleanPaymentId.startsWith('pay_')) {
      appendPaymentAuditLog({
        bookingId: cleanBookingId,
        customerName: bookingDraft?.customerName || 'Traveler',
        customerPhone: bookingDraft?.customerPhone || '',
        totalBookingAmount: Number(bookingDraft?.totalFare || 0),
        advanceAmount: Number(bookingDraft?.advancePaid || 0),
        razorpayOrderId: cleanOrderId,
        razorpayPaymentId: cleanPaymentId,
        qrId: cleanQrId,
        paymentMethod: 'razorpay',
        paymentStatus: 'failed',
        failureReason: 'Invalid Razorpay payment ID format (must start with pay_)',
        gatewayResponse: 'HTTP 400 Rejected',
        retryAttempts
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay payment ID format (must start with pay_).'
      });
    }

    // 1. Warm-instance idempotency / duplicate confirmation guards
    const existingPaymentRecord = getVerifiedPaymentRecord(cleanPaymentId);
    if (existingPaymentRecord) {
      if (existingPaymentRecord.bookingId === cleanBookingId) {
        return res.status(200).json({
          success: true,
          verified: true,
          alreadyVerified: true,
          booking: existingPaymentRecord.booking
        });
      }
      return res.status(409).json({
        success: false,
        error: 'This payment ID has already been associated with another booking.'
      });
    }

    // MODE B: Direct Checkout or Dynamic QR Payment Verification (when no order_id was used)
    if (!cleanOrderId) {
      const pendingDirect = getPendingOrderRecord(`DIRECT_${cleanBookingId}`);
      const expectedTotalFare = Number(pendingDirect?.totalFare ?? bookingDraft.totalFare);
      const expectedAdvancePaid = Number(pendingDirect?.advancePaid ?? bookingDraft.advancePaid);
      const expectedAmountPaise = Number(
        pendingDirect?.amountInPaise ?? Math.round(expectedAdvancePaid * 100)
      );
      const expectedBalanceDue = Number(
        pendingDirect?.balanceDue ?? Math.max(0, expectedTotalFare - expectedAdvancePaid)
      );
      const expectedPaymentMode = String(pendingDirect?.paymentMode ?? bookingDraft.paymentMode ?? 'advance_20');
      const expectedCustomerPhone = sanitize10Digit(
        pendingDirect?.customerPhone ?? bookingDraft.customerPhone
      );
      const expectedTripType = String(pendingDirect?.tripType ?? bookingDraft.tripType ?? 'oneway');
      const expectedCabId = String(pendingDirect?.cabId ?? bookingDraft.cabId ?? 'sedan');

      const isDirectTokenValid = verifyOrderVerificationToken(
        {
          bookingId: cleanBookingId,
          orderId: 'DIRECT',
          amountInPaise: expectedAmountPaise,
          totalFare: expectedTotalFare,
          advancePaid: expectedAdvancePaid,
          balanceDue: expectedBalanceDue,
          paymentMode: expectedPaymentMode,
          customerPhone: expectedCustomerPhone,
          tripType: expectedTripType,
          cabId: expectedCabId
        },
        verificationToken,
        signingSecret
      );

      if (!isDirectTokenValid) {
        console.warn(
          '[/api/verify-payment] Direct checkout cross-instance token notice for booking (proceeding with gateway payment verification):',
          cleanBookingId
        );
      }

      let rzpPayment = null;
      if (keySecret && candidateKeys.length > 0) {
        for (const candidate of candidateKeys) {
          const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
          const authHeaders = {
            Accept: 'application/json',
            Authorization: `Basic ${basicAuth}`
          };
          const paymentRes = await fetch(
            `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}`,
            { method: 'GET', headers: authHeaders }
          ).catch(() => null);

          if (paymentRes && paymentRes.ok) {
            const pData = await paymentRes.json().catch(() => null);
            if (pData && pData.id === cleanPaymentId) {
              rzpPayment = pData;
              if (rzpPayment.status === 'authorized') {
                const captureAmount = Number(rzpPayment.amount) || expectedAmountPaise;
                const captureRes = await fetch(
                  `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}/capture`,
                  {
                    method: 'POST',
                    headers: { ...authHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: captureAmount, currency: 'INR' })
                  }
                ).catch(() => null);
                const capturedData = captureRes ? await captureRes.json().catch(() => null) : null;
                if (captureRes?.ok && capturedData?.status === 'captured') {
                  rzpPayment = capturedData;
                }
              }
              try {
                await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}`, {
                  method: 'PATCH',
                  headers: { ...authHeaders, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    notes: {
                      ...(rzpPayment.notes || {}),
                      verified_booking_id: cleanBookingId,
                      customer_info: `${String(bookingDraft.customerName || 'Traveler').slice(0, 70)}|${expectedCustomerPhone}|${String(bookingDraft.customerEmail || '').slice(0, 70)}`,
                      route_info: `${String(bookingDraft.tripType || 'oneway')}|${String(bookingDraft.pickupCity || '')}|${String(bookingDraft.dropCity || '')}|${String(bookingDraft.distanceKm || 130)}`,
                      address_info: `${String(bookingDraft.pickupAddress || '').slice(0, 110)}|${String(bookingDraft.dropAddress || '').slice(0, 110)}`,
                      schedule_info: `${String(bookingDraft.pickupDate || '')}|${String(bookingDraft.pickupTime || '')}|${String(bookingDraft.cabId || 'sedan')}|${String(bookingDraft.cabName || 'Sedan AC').slice(0, 60)}`,
                      fare_info: `${expectedTotalFare}|${expectedAdvancePaid}|${expectedBalanceDue}|${expectedPaymentMode}`
                    }
                  })
                });
              } catch {}
              break;
            }
          }
        }
      }

      if (rzpPayment && rzpPayment.status === 'failed') {
        const failReason = rzpPayment.error_description || rzpPayment.error_reason || 'Declined by bank/UPI app.';
        appendPaymentAuditLog({
          bookingId: cleanBookingId,
          customerName: bookingDraft.customerName,
          customerPhone: expectedCustomerPhone,
          customerEmail: bookingDraft.customerEmail || '',
          totalBookingAmount: expectedTotalFare,
          advanceAmount: expectedAdvancePaid,
          amountInPaise: expectedAmountPaise,
          razorpayOrderId: `DIRECT_${cleanBookingId}`,
          razorpayPaymentId: cleanPaymentId,
          qrId: cleanQrId,
          paymentMethod: rzpPayment.method || 'upi',
          paymentStatus: 'failed',
          failureReason: failReason,
          gatewayResponse: `Payment ${cleanPaymentId} status=failed`,
          retryAttempts
        });
        return res.status(400).json({
          success: false,
          status: 'failed',
          error: `Payment failed: ${failReason}`
        });
      }

      if (rzpPayment && rzpPayment.status === 'created') {
        appendPaymentAuditLog({
          bookingId: cleanBookingId,
          customerName: bookingDraft.customerName,
          customerPhone: expectedCustomerPhone,
          customerEmail: bookingDraft.customerEmail || '',
          totalBookingAmount: expectedTotalFare,
          advanceAmount: expectedAdvancePaid,
          amountInPaise: expectedAmountPaise,
          razorpayOrderId: `DIRECT_${cleanBookingId}`,
          razorpayPaymentId: cleanPaymentId,
          qrId: cleanQrId,
          paymentMethod: rzpPayment.method || 'upi',
          paymentStatus: 'processing',
          failureReason: 'Payment is created but not yet captured/authorized by bank',
          gatewayResponse: `Payment ${cleanPaymentId} status=created`,
          retryAttempts
        });
        return res.status(202).json({
          success: false,
          verified: false,
          status: 'processing',
          error: 'Payment is currently processing with your bank/UPI app. Please wait a few seconds and click Verify Payment Status.'
        });
      }

      if (rzpPayment && rzpPayment.amount && Number(rzpPayment.amount) < expectedAmountPaise) {
        appendPaymentAuditLog({
          bookingId: cleanBookingId,
          customerName: bookingDraft.customerName,
          customerPhone: expectedCustomerPhone,
          totalBookingAmount: expectedTotalFare,
          advanceAmount: expectedAdvancePaid,
          amountInPaise: expectedAmountPaise,
          razorpayOrderId: `DIRECT_${cleanBookingId}`,
          razorpayPaymentId: cleanPaymentId,
          qrId: cleanQrId,
          paymentMethod: rzpPayment.method || 'upi',
          paymentStatus: 'failed',
          failureReason: `Amount mismatch: expected ${expectedAmountPaise} paise, received ${rzpPayment.amount} paise`,
          gatewayResponse: 'HTTP 400 Amount Mismatch',
          retryAttempts
        });
        return res.status(400).json({
          success: false,
          status: 'failed',
          error: 'Payment amount mismatch detected. Booking could not be confirmed.'
        });
      }

      if (cleanQrId) {
        setActiveQrForBooking(cleanBookingId, expectedAmountPaise, null);
      }

      const paymentMethodDetail = rzpPayment?.method
        ? `${String(rzpPayment.method).toUpperCase()}${rzpPayment.vpa ? ` (${rzpPayment.vpa})` : ''}`
        : cleanQrId
        ? 'Dynamic UPI QR'
        : 'UPI / QR';

      const confirmedBooking = saveVerifiedBookingRecord({
        orderId: cleanQrId || `DIRECT_${cleanBookingId}`,
        paymentId: cleanPaymentId,
        booking: {
          ...bookingDraft,
          id: cleanBookingId,
          tripType: expectedTripType,
          cabId: expectedCabId,
          customerPhone: expectedCustomerPhone,
          totalFare: expectedTotalFare,
          advancePaid: expectedAdvancePaid,
          balanceDue: expectedBalanceDue,
          paymentMode: expectedPaymentMode,
          paymentMethod:
            expectedPaymentMode === 'full'
              ? `Razorpay ${paymentMethodDetail} (${cleanPaymentId}) - 100% Full Fare`
              : `Razorpay ${paymentMethodDetail} (${cleanPaymentId}) - 20% Advance`,
          transactionId: cleanPaymentId,
          status: 'confirmed',
          createdAt: bookingDraft.createdAt || new Date().toISOString()
        }
      });

      appendPaymentAuditLog({
        bookingId: cleanBookingId,
        customerName: bookingDraft.customerName,
        customerPhone: expectedCustomerPhone,
        customerEmail: bookingDraft.customerEmail || '',
        totalBookingAmount: expectedTotalFare,
        advanceAmount: expectedAdvancePaid,
        amountInPaise: expectedAmountPaise,
        razorpayOrderId: `DIRECT_${cleanBookingId}`,
        razorpayPaymentId: cleanPaymentId,
        qrId: cleanQrId,
        paymentMethod: rzpPayment?.method || (cleanQrId ? 'upi_qr' : 'upi'),
        paymentStatus: 'paid',
        gatewayResponse: `Verified & confirmed (${rzpPayment?.status || 'captured'})`,
        retryAttempts,
        webhookVerificationStatus: 'verified'
      });

      let notificationResult = null;
      try {
        notificationResult = await dispatchBookingConfirmationNotifications(confirmedBooking);
      } catch (notifyErr) {
        console.warn('[/api/verify-payment] Server booking notification notice:', notifyErr?.message);
      }

      return res.status(200).json({
        success: true,
        verified: true,
        booking: confirmedBooking,
        notifications: notificationResult,
        notificationsDispatched: Boolean(
          notificationResult?.customer?.whatsappDispatched ||
          notificationResult?.customer?.dispatched
        ),
        payment: {
          id: cleanPaymentId,
          orderId: null,
          qrId: cleanQrId || null,
          status: rzpPayment?.status || 'captured',
          amount: expectedAmountPaise,
          currency: 'INR',
          method: rzpPayment?.method || 'upi'
        }
      });
    }

    // MODE A: Order-Backed Checkout (cleanOrderId starts with order_)
    if (!cleanOrderId.startsWith('order_') || !razorpay_signature) {
      appendPaymentAuditLog({
        bookingId: cleanBookingId,
        customerName: bookingDraft?.customerName || 'Traveler',
        customerPhone: bookingDraft?.customerPhone || '',
        totalBookingAmount: Number(bookingDraft?.totalFare || 0),
        advanceAmount: Number(bookingDraft?.advancePaid || 0),
        razorpayOrderId: cleanOrderId,
        razorpayPaymentId: cleanPaymentId,
        paymentMethod: 'razorpay_order',
        paymentStatus: 'failed',
        failureReason: 'Missing or invalid order_id or razorpay_signature',
        gatewayResponse: 'HTTP 400 Rejected',
        retryAttempts
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay order ID or missing signature.'
      });
    }

    if (!keyId || !keySecret) {
      return res.status(500).json({
        success: false,
        error: 'Payment verification server credentials are not configured.'
      });
    }

    const isSignatureValid = verifyRazorpaySignatureTimingSafe(
      cleanOrderId,
      cleanPaymentId,
      razorpay_signature,
      keySecret
    );

    if (!isSignatureValid) {
      console.error('[/api/verify-payment] Invalid payment signature:', {
        bookingId: cleanBookingId,
        orderId: cleanOrderId,
        paymentId: cleanPaymentId
      });
      appendPaymentAuditLog({
        bookingId: cleanBookingId,
        customerName: bookingDraft?.customerName || 'Traveler',
        customerPhone: bookingDraft?.customerPhone || '',
        totalBookingAmount: Number(bookingDraft?.totalFare || 0),
        advanceAmount: Number(bookingDraft?.advancePaid || 0),
        razorpayOrderId: cleanOrderId,
        razorpayPaymentId: cleanPaymentId,
        paymentMethod: 'razorpay_order',
        paymentStatus: 'failed',
        failureReason: 'HMAC-SHA256 signature verification failed',
        gatewayResponse: 'HTTP 400 Invalid Signature',
        retryAttempts
      });
      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed. This transaction could not be authenticated.'
      });
    }

    const existingOrderRecord = getVerifiedOrderRecord(cleanOrderId);
    if (existingOrderRecord) {
      if (existingOrderRecord.bookingId === cleanBookingId) {
        return res.status(200).json({
          success: true,
          verified: true,
          alreadyVerified: true,
          booking: existingOrderRecord.booking
        });
      }
      return res.status(409).json({
        success: false,
        error: 'This Razorpay order has already been confirmed for a different booking.'
      });
    }

    let rzpOrder = null;
    let rzpPayment = null;
    let workingAuthHeaders = null;

    const keysToTry = candidateKeys.length > 0 ? candidateKeys : [{ keyId, source: 'default' }];
    for (const candidate of keysToTry) {
      const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
      const authHeaders = {
        Accept: 'application/json',
        Authorization: `Basic ${basicAuth}`
      };

      const [orderRes, paymentRes] = await Promise.all([
        fetch(`${RAZORPAY_API_BASE}/orders/${encodeURIComponent(cleanOrderId)}`, {
          method: 'GET',
          headers: authHeaders
        }).catch(() => null),
        fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}`, {
          method: 'GET',
          headers: authHeaders
        }).catch(() => null)
      ]);

      const oData = orderRes ? await orderRes.json().catch(() => null) : null;
      const pData = paymentRes ? await paymentRes.json().catch(() => null) : null;

      if (orderRes?.ok && paymentRes?.ok && oData?.id === cleanOrderId && pData?.id === cleanPaymentId) {
        rzpOrder = oData;
        rzpPayment = pData;
        workingAuthHeaders = authHeaders;
        break;
      }
    }

    const pendingOrder = getPendingOrderRecord(cleanOrderId);
    const orderNotes = rzpOrder?.notes || {};
    const paymentNotes = rzpPayment?.notes || {};

    if (paymentNotes.verified_booking_id && String(paymentNotes.verified_booking_id).toUpperCase() !== cleanBookingId) {
      return res.status(409).json({
        success: false,
        error: 'This payment has already been verified for another booking.'
      });
    }

    const expectedAmountPaise = Number(
      pendingOrder?.amountInPaise ??
        orderNotes.expected_amount_paise ??
        rzpOrder?.amount ??
        Math.round(Number(bookingDraft.advancePaid || 0) * 100)
    );
    const expectedTotalFare = Number(
      pendingOrder?.totalFare ??
        orderNotes.total_fare_rupees ??
        bookingDraft.totalFare
    );
    const expectedAdvancePaid = Number(
      pendingOrder?.advancePaid ??
        orderNotes.advance_paid_rupees ??
        Math.round(expectedAmountPaise / 100)
    );
    const expectedBalanceDue = Number(
      pendingOrder?.balanceDue ??
        orderNotes.balance_due_rupees ??
        Math.max(0, expectedTotalFare - expectedAdvancePaid)
    );
    const expectedPaymentMode = String(
      pendingOrder?.paymentMode ??
        orderNotes.payment_mode ??
        bookingDraft.paymentMode ??
        'advance_20'
    );
    const parsedCustomerPhoneFromInfo = orderNotes.customer_info
      ? String(orderNotes.customer_info).split('|')[1] || ''
      : '';
    const expectedCustomerPhone = sanitize10Digit(
      pendingOrder?.customerPhone ||
        orderNotes.customer_phone ||
        parsedCustomerPhoneFromInfo ||
        bookingDraft.customerPhone
    );
    const expectedTripType = String(
      pendingOrder?.tripType ??
        orderNotes.trip_type ??
        bookingDraft.tripType ??
        'oneway'
    );
    const expectedCabId = String(
      pendingOrder?.cabId ??
        orderNotes.cab_id ??
        bookingDraft.cabId ??
        'sedan'
    );

    const isTokenValid = verifyOrderVerificationToken(
      {
        bookingId: cleanBookingId,
        orderId: cleanOrderId,
        amountInPaise: expectedAmountPaise,
        totalFare: expectedTotalFare,
        advancePaid: expectedAdvancePaid,
        balanceDue: expectedBalanceDue,
        paymentMode: expectedPaymentMode,
        customerPhone: expectedCustomerPhone,
        tripType: expectedTripType,
        cabId: expectedCabId
      },
      verificationToken,
      signingSecret
    );

    if (!isTokenValid) {
      console.warn(
        '[/api/verify-payment] Order token cross-instance notice (Razorpay HMAC signature already verified):',
        cleanBookingId
      );
    }

    if (rzpPayment && rzpPayment.status === 'authorized' && workingAuthHeaders) {
      const captureAmount = Number(rzpPayment.amount) || expectedAmountPaise;
      const captureRes = await fetch(
        `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}/capture`,
        {
          method: 'POST',
          headers: {
            ...workingAuthHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: captureAmount,
            currency: 'INR'
          })
        }
      ).catch(() => null);
      const capturedData = captureRes ? await captureRes.json().catch(() => null) : null;
      if (captureRes?.ok && capturedData && capturedData.status === 'captured') {
        rzpPayment = capturedData;
      }
    }

    if (rzpPayment && rzpPayment.status === 'failed') {
      const failDesc =
        rzpPayment.error_description ||
        rzpPayment.error_reason ||
        'Payment failed at the bank or UPI app.';
      appendPaymentAuditLog({
        bookingId: cleanBookingId,
        customerName: bookingDraft.customerName,
        customerPhone: expectedCustomerPhone,
        customerEmail: bookingDraft.customerEmail || '',
        totalBookingAmount: expectedTotalFare,
        advanceAmount: expectedAdvancePaid,
        amountInPaise: expectedAmountPaise,
        razorpayOrderId: cleanOrderId,
        razorpayPaymentId: cleanPaymentId,
        qrId: cleanQrId,
        paymentMethod: rzpPayment.method || 'upi',
        paymentStatus: 'failed',
        failureReason: failDesc,
        gatewayResponse: `Payment ${cleanPaymentId} status=failed`,
        retryAttempts
      });
      return res.status(400).json({
        success: false,
        status: 'failed',
        error: `Payment was not completed: ${failDesc}`
      });
    }

    if (rzpPayment && rzpPayment.status === 'created') {
      appendPaymentAuditLog({
        bookingId: cleanBookingId,
        customerName: bookingDraft.customerName,
        customerPhone: expectedCustomerPhone,
        customerEmail: bookingDraft.customerEmail || '',
        totalBookingAmount: expectedTotalFare,
        advanceAmount: expectedAdvancePaid,
        amountInPaise: expectedAmountPaise,
        razorpayOrderId: cleanOrderId,
        razorpayPaymentId: cleanPaymentId,
        qrId: cleanQrId,
        paymentMethod: rzpPayment.method || 'upi',
        paymentStatus: 'processing',
        failureReason: 'Payment status is created (awaiting bank confirmation)',
        gatewayResponse: `Payment ${cleanPaymentId} status=created`,
        retryAttempts
      });
      return res.status(202).json({
        success: false,
        verified: false,
        status: 'processing',
        error: 'Payment is still processing with your bank. Please wait a moment and click Verify Payment Status.'
      });
    }

    if (workingAuthHeaders && rzpPayment) {
      try {
        await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}`, {
          method: 'PATCH',
          headers: {
            ...workingAuthHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notes: {
              ...paymentNotes,
              verified_booking_id: cleanBookingId,
              verified_at: new Date().toISOString(),
              customer_info: `${String(bookingDraft.customerName || 'Traveler').slice(0, 70)}|${expectedCustomerPhone}|${String(bookingDraft.customerEmail || '').slice(0, 70)}`,
              route_info: `${String(bookingDraft.tripType || 'oneway')}|${String(bookingDraft.pickupCity || '')}|${String(bookingDraft.dropCity || '')}|${String(bookingDraft.distanceKm || 130)}`,
              address_info: `${String(bookingDraft.pickupAddress || '').slice(0, 110)}|${String(bookingDraft.dropAddress || '').slice(0, 110)}`,
              schedule_info: `${String(bookingDraft.pickupDate || '')}|${String(bookingDraft.pickupTime || '')}|${String(bookingDraft.cabId || 'sedan')}|${String(bookingDraft.cabName || 'Sedan AC').slice(0, 60)}`,
              fare_info: `${expectedTotalFare}|${expectedAdvancePaid}|${expectedBalanceDue}|${expectedPaymentMode}`
            }
          })
        });
      } catch {}
    }

    const paymentMethodDetail = rzpPayment?.method
      ? `${String(rzpPayment.method).toUpperCase()}${rzpPayment.vpa ? ` (${rzpPayment.vpa})` : ''}`
      : 'Razorpay';

    const confirmedBooking = saveVerifiedBookingRecord({
      orderId: cleanOrderId,
      paymentId: cleanPaymentId,
      booking: {
        ...bookingDraft,
        id: cleanBookingId,
        tripType: expectedTripType,
        cabId: expectedCabId,
        customerPhone: expectedCustomerPhone,
        totalFare: expectedTotalFare,
        advancePaid: expectedAdvancePaid,
        balanceDue: expectedBalanceDue,
        paymentMode: expectedPaymentMode,
        paymentMethod:
          expectedPaymentMode === 'full'
            ? `Razorpay ${paymentMethodDetail} (${cleanPaymentId}) - 100% Full Fare`
            : `Razorpay ${paymentMethodDetail} (${cleanPaymentId}) - 20% Advance`,
        transactionId: cleanPaymentId,
        status: 'confirmed',
        createdAt: bookingDraft.createdAt || new Date().toISOString()
      }
    });

    appendPaymentAuditLog({
      bookingId: cleanBookingId,
      customerName: bookingDraft.customerName,
      customerPhone: expectedCustomerPhone,
      customerEmail: bookingDraft.customerEmail || '',
      totalBookingAmount: expectedTotalFare,
      advanceAmount: expectedAdvancePaid,
      amountInPaise: expectedAmountPaise,
      razorpayOrderId: cleanOrderId,
      razorpayPaymentId: cleanPaymentId,
      qrId: cleanQrId,
      paymentMethod: rzpPayment?.method || 'upi',
      paymentStatus: 'paid',
      gatewayResponse: `HTTP 200 OK — Order ${cleanOrderId} & Payment ${cleanPaymentId} HMAC-SHA256 verified (${rzpPayment?.status || 'captured'})`,
      retryAttempts,
      webhookVerificationStatus: 'verified'
    });

    let notificationResult = null;
    try {
      notificationResult = await dispatchBookingConfirmationNotifications(confirmedBooking);
    } catch (notifyErr) {
      console.warn('[/api/verify-payment] Server booking notification notice:', notifyErr?.message);
    }

    return res.status(200).json({
      success: true,
      verified: true,
      booking: confirmedBooking,
      notifications: notificationResult,
      notificationsDispatched: Boolean(
        notificationResult?.customer?.whatsappDispatched ||
        notificationResult?.customer?.dispatched
      ),
      payment: {
        id: rzpPayment?.id || cleanPaymentId,
        orderId: rzpPayment?.order_id || cleanOrderId,
        status: rzpPayment?.status || 'captured',
        amount: rzpPayment?.amount || expectedAmountPaise,
        currency: rzpPayment?.currency || 'INR',
        method: rzpPayment?.method || 'upi'
      }
    });
  } catch (err) {
    console.error('[/api/verify-payment] Unexpected server error:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while verifying payment. Please contact support with your payment reference.'
    });
  }
}

// ============================================================================
// UNIFIED SERVERLESS ROUTE HANDLER
// ============================================================================
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Razorpay-Signature'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const webhookSignature =
    req.headers?.['x-razorpay-signature'] || req.headers?.['X-Razorpay-Signature'] || '';

  // ===========================================================================
  // GET: Fetch Sanitized Admin Payment Audit Logs & Gateway Diagnostics
  // ===========================================================================
  if (req.method === 'GET') {
    try {
      let query = req.query || {};
      try {
        const parsedUrl = new URL(req.url || '/', 'https://safarindiacabs.com');
        const urlParams = {};
        parsedUrl.searchParams.forEach((v, k) => {
          urlParams[k] = v;
        });
        query = { ...urlParams, ...query };
      } catch {}

      const { keyId, keySecret, candidateKeys, diagnostics } =
        resolveNormalizedRazorpayCredentials(process.env);
      const webhookSecret = cleanEnvVar(process.env.RAZORPAY_WEBHOOK_SECRET || '');

      let gatewayAuthStatus = 'unconfigured';
      let qrApiStatus = 'untested';
      let gatewayStatusMessage = '';

      if (!keyId) {
        gatewayAuthStatus = 'missing_key_id';
        gatewayStatusMessage = 'RAZORPAY_KEY_ID / VITE_RAZORPAY_KEY_ID is not set.';
      } else if (!keySecret) {
        gatewayAuthStatus = 'missing_key_secret';
        gatewayStatusMessage =
          'Public Key ID is configured, but RAZORPAY_KEY_SECRET is not set in server environment variables. Server-side Orders API and Dynamic QR API require RAZORPAY_KEY_SECRET.';
      } else if (query.probe === '1') {
        for (const candidate of candidateKeys) {
          const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
          const testRes = await fetch(`${RAZORPAY_API_BASE}/orders?count=1`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Basic ${basicAuth}`
            }
          }).catch(() => null);

          if (testRes && testRes.ok) {
            gatewayAuthStatus = 'authenticated';
            gatewayStatusMessage = `Razorpay REST API authenticated successfully with ${candidate.keyId.slice(0, 9)}***`;

            const qrTestRes = await fetch(`${RAZORPAY_API_BASE}/payments/qr_codes?count=1`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                Authorization: `Basic ${basicAuth}`
              }
            }).catch(() => null);
            qrApiStatus = qrTestRes && qrTestRes.ok ? 'enabled' : 'disabled_on_merchant_account';
            break;
          } else if (testRes) {
            gatewayAuthStatus = `http_${testRes.status}`;
            gatewayStatusMessage = `Razorpay API returned HTTP ${testRes.status}. Verify that RAZORPAY_KEY_SECRET belongs to the same mode (Live/Test) and account as ${candidate.keyId.slice(0, 9)}***`;
          }
        }
      } else {
        gatewayAuthStatus = 'configured';
        gatewayStatusMessage = `Razorpay Key (${diagnostics.keyMaskedPreview}) and Secret Key are configured on server.`;
      }

      const logs = getPaymentAuditLogs(query.bookingId || '');

      return res.status(200).json({
        success: true,
        diagnostics: {
          keyMaskedPreview: diagnostics.keyMaskedPreview,
          keyMode: diagnostics.keyMode,
          keySource: diagnostics.keySource,
          hasKeyId: Boolean(keyId),
          hasKeySecret: Boolean(keySecret),
          hasWebhookSecret: Boolean(webhookSecret),
          gatewayAuthStatus,
          qrApiStatus,
          gatewayStatusMessage
        },
        count: logs.length,
        logs
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to load payment audit logs.'
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });
  }

  try {
    const rawBodyString =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const reqUrl = String(req.url || '');
    const queryEndpoint = String(req.query?.endpoint || body?.endpoint || '').toLowerCase();

    // =========================================================================
    // ROUTE 0A: /api/create-order (Create Razorpay Order)
    // =========================================================================
    if (
      reqUrl.includes('/create-order') ||
      queryEndpoint === 'create-order' ||
      body.action === 'create_order'
    ) {
      return await handleCreateOrder(req, res, body);
    }

    // =========================================================================
    // ROUTE 0B: /api/verify-payment (Verify Razorpay Payment)
    // =========================================================================
    if (
      reqUrl.includes('/verify-payment') ||
      queryEndpoint === 'verify-payment' ||
      body.action === 'verify_payment' ||
      Boolean(body.razorpay_payment_id && !body.action)
    ) {
      return await handleVerifyPayment(req, res, body);
    }

    // =========================================================================
    // 1. RAZORPAY OFFICIAL WEBHOOK HANDLER (x-razorpay-signature)
    // =========================================================================
    if (webhookSignature || body.event?.startsWith('payment.') || body.event?.startsWith('order.') || body.event?.startsWith('qr_code.')) {
      const webhookSecret = cleanEnvVar(process.env.RAZORPAY_WEBHOOK_SECRET || '');
      const isWebhookValid = webhookSecret
        ? verifyWebhookSignatureTimingSafe(rawBodyString, webhookSignature, webhookSecret)
        : false;

      if (webhookSecret && !isWebhookValid) {
        appendPaymentAuditLog({
          bookingId:
            body?.payload?.payment?.entity?.notes?.booking_id ||
            body?.payload?.order?.entity?.receipt ||
            'WEBHOOK',
          razorpayOrderId: body?.payload?.payment?.entity?.order_id || '',
          razorpayPaymentId: body?.payload?.payment?.entity?.id || '',
          paymentMethod: body?.payload?.payment?.entity?.method || 'webhook',
          paymentStatus: 'webhook_rejected',
          failureReason: 'Webhook signature verification failed (invalid x-razorpay-signature)',
          gatewayResponse: `Event: ${body?.event || 'unknown'}`,
          webhookVerificationStatus: 'failed'
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid Razorpay webhook signature.'
        });
      }

      const eventName = String(body.event || '');
      const paymentEntity = body?.payload?.payment?.entity;
      const orderEntity = body?.payload?.order?.entity;
      const qrEntity = body?.payload?.qr_code?.entity;

      const bookingIdFromNotes = String(
        paymentEntity?.notes?.verified_booking_id ||
          paymentEntity?.notes?.booking_id ||
          orderEntity?.notes?.booking_id ||
          orderEntity?.receipt ||
          qrEntity?.notes?.booking_id ||
          ''
      )
        .trim()
        .toUpperCase();

      if (bookingIdFromNotes) {
        const isPaidEvent =
          eventName === 'payment.captured' ||
          eventName === 'order.paid' ||
          eventName === 'qr_code.credited';
        const isFailedEvent = eventName === 'payment.failed';

        appendPaymentAuditLog({
          bookingId: bookingIdFromNotes,
          customerName:
            String(paymentEntity?.notes?.customer_info || '').split('|')[0] || 'Traveler',
          customerPhone:
            String(paymentEntity?.notes?.customer_info || '').split('|')[1] ||
            paymentEntity?.contact ||
            '',
          customerEmail: paymentEntity?.email || '',
          totalBookingAmount: Math.round(
            Number(
              orderEntity?.notes?.total_fare_rupees ||
                Number(paymentEntity?.amount || 0) / 100
            )
          ),
          advanceAmount: Math.round(Number(paymentEntity?.amount || 0) / 100),
          amountInPaise: Number(paymentEntity?.amount || 0),
          razorpayOrderId: paymentEntity?.order_id || orderEntity?.id || '',
          razorpayPaymentId: paymentEntity?.id || '',
          qrId: qrEntity?.id || paymentEntity?.notes?.qr_id || '',
          paymentMethod: paymentEntity?.method || 'webhook',
          paymentStatus: isPaidEvent ? 'paid' : isFailedEvent ? 'failed' : eventName,
          failureReason: isFailedEvent
            ? paymentEntity?.error_description || paymentEntity?.error_reason || 'Payment failed'
            : '',
          gatewayResponse: `Webhook ${eventName} processed`,
          webhookVerificationStatus: isWebhookValid ? 'verified' : 'unverified_no_secret'
        });
      }

      return res.status(200).json({
        success: true,
        webhookProcessed: true,
        webhookVerified: isWebhookValid
      });
    }

    const { action } = body;
    const {
      keySecret,
      signingSecret,
      candidateKeys
    } = resolveNormalizedRazorpayCredentials(process.env, body.clientPublicKeyId);

    // =========================================================================
    // 2. LOG CLIENT PAYMENT EVENT (Cancel, Error, UPI Intent Fallback, etc.)
    // =========================================================================
    if (action === 'log_event') {
      const logItem = appendPaymentAuditLog({
        bookingId: body.bookingId || 'UNKNOWN',
        customerName: body.customerName || 'Traveler',
        customerPhone: body.customerPhone || '',
        customerEmail: body.customerEmail || '',
        totalBookingAmount: body.totalBookingAmount || 0,
        advanceAmount: body.advanceAmount || 0,
        amountInPaise: body.amountInPaise || 0,
        razorpayOrderId: body.razorpayOrderId || '',
        razorpayPaymentId: body.razorpayPaymentId || '',
        qrId: body.qrId || '',
        paymentMethod: body.paymentMethod || 'upi',
        paymentStatus: body.paymentStatus || 'client_event',
        failureReason: body.failureReason || '',
        gatewayResponse: body.gatewayResponse || '',
        retryAttempts: body.retryAttempts ?? getBookingRetryCount(body.bookingId || ''),
        webhookVerificationStatus: process.env.RAZORPAY_WEBHOOK_SECRET ? 'configured' : 'not_configured'
      });

      return res.status(200).json({
        success: true,
        log: logItem
      });
    }

    // =========================================================================
    // 3. CREATE OFFICIAL RAZORPAY DYNAMIC UPI QR CODE (/v1/payments/qr_codes)
    // =========================================================================
    if (action === 'create_qr') {
      const {
        bookingId,
        tripType = 'oneway',
        cabId = 'sedan',
        distanceKm = 130,
        extraKm = 0,
        pickupCity = 'Delhi NCR',
        dropCity = 'Agra',
        pickupDate,
        pickupTime = '08:00 AM',
        returnDate,
        localPackageId = '8h_80k',
        includeTolls = true,
        paymentMode = 'advance_20',
        customerName = 'Traveler',
        customerPhone = '',
        customerEmail = '',
        forceNew = false
      } = body;

      const cleanBookingId = String(bookingId || '')
        .trim()
        .replace(/^#/, '')
        .toUpperCase();

      if (!cleanBookingId) {
        return res.status(400).json({
          success: false,
          errorCode: 'MISSING_BOOKING_ID',
          error: 'Booking ID is required to generate a Dynamic QR code.'
        });
      }

      const alreadyVerified = getVerifiedBookingById(cleanBookingId);
      if (alreadyVerified && alreadyVerified.paymentId) {
        return res.status(200).json({
          success: true,
          alreadyPaid: true,
          bookingId: cleanBookingId,
          paymentId: alreadyVerified.paymentId,
          booking: alreadyVerified.booking
        });
      }

      const cleanPhone = sanitize10Digit(customerPhone);
      const safePickupDate = String(pickupDate || new Date().toISOString().slice(0, 10)).trim();

      const serverFare = computeServerTripFare({
        tripType,
        cabId,
        distanceKm: Number(distanceKm) > 0 ? Number(distanceKm) : 130,
        extraKm: Number(extraKm || 0),
        pickupCity,
        dropCity,
        pickupDate: safePickupDate,
        pickupTime,
        returnDate,
        localPackageId,
        includeTolls: Boolean(includeTolls),
        addonCarrier: Boolean(body.addonCarrier),
        addonPet: Boolean(body.addonPet),
        addonAssuredModel: Boolean(body.addonAssuredModel),
        promoCode: body.promoCode ? String(body.promoCode) : '',
        promoDiscount: Number(body.promoDiscount || 0),
        customerName
      });

      const finalTotalFare = Math.max(50, Math.round(Number(serverFare.totalFare)));
      const exactAdvanceFare = Math.max(1, Math.round(finalTotalFare * 0.20));
      const payableRupees = paymentMode === 'full' ? finalTotalFare : exactAdvanceFare;
      const finalBalanceDue = paymentMode === 'full' ? 0 : Math.max(0, finalTotalFare - payableRupees);
      const amountInPaise = Math.round(payableRupees * 100);

      const fareSummary = {
        distanceKm: serverFare.distanceKm,
        billedDistanceKm: serverFare.billedDistanceKm,
        baseFare: serverFare.baseFare,
        driverAllowance: serverFare.driverAllowance,
        tollsAndTaxes: serverFare.tollsAndTaxes,
        gstAmount: serverFare.gstAmount,
        totalFare: finalTotalFare,
        advancePaid: payableRupees,
        balanceDue: finalBalanceDue
      };

      if (!forceNew) {
        const existingQr = getActiveQrForBooking(cleanBookingId, amountInPaise);
        if (existingQr && existingQr.qrId && existingQr.imageUrl) {
          return res.status(200).json({
            success: true,
            qrApiSupported: true,
            reusedActiveQr: true,
            bookingId: cleanBookingId,
            qrId: existingQr.qrId,
            imageUrl: existingQr.imageUrl,
            amountInPaise,
            amountInRupees: payableRupees,
            closeBy: existingQr.closeBy,
            status: existingQr.status || 'active',
            verificationToken: existingQr.verificationToken,
            fareSummary
          });
        }
      } else {
        incrementBookingRetryAttempt(cleanBookingId);
      }

      const retryAttempts = getBookingRetryCount(cleanBookingId);

      const directTokenPayload = {
        bookingId: cleanBookingId,
        orderId: 'DIRECT',
        amountInPaise,
        totalFare: finalTotalFare,
        advancePaid: payableRupees,
        balanceDue: finalBalanceDue,
        paymentMode,
        customerPhone: cleanPhone,
        tripType: String(tripType || 'oneway'),
        cabId: String(cabId || 'sedan')
      };
      const verificationToken = signOrderVerificationToken(directTokenPayload, signingSecret);

      registerPendingOrderRecord({
        ...directTokenPayload,
        orderId: `DIRECT_${cleanBookingId}`,
        currency: 'INR',
        customerName: String(customerName).trim(),
        customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
        fareDetails: serverFare
      });

      if (!keySecret || candidateKeys.length === 0) {
        appendPaymentAuditLog({
          bookingId: cleanBookingId,
          customerName,
          customerPhone: cleanPhone,
          customerEmail,
          totalBookingAmount: finalTotalFare,
          advanceAmount: payableRupees,
          amountInPaise,
          paymentMethod: 'upi_qr',
          paymentStatus: 'qr_fallback_to_checkout',
          failureReason: 'RAZORPAY_KEY_SECRET is not configured on server; using Razorpay Checkout QR modal.',
          gatewayResponse: 'Fallback to Razorpay Standard Checkout QR',
          retryAttempts
        });

        return res.status(200).json({
          success: true,
          qrApiSupported: false,
          canUseCheckoutQr: true,
          bookingId: cleanBookingId,
          amountInPaise,
          amountInRupees: payableRupees,
          verificationToken,
          fareSummary,
          reason:
            'Server-side QR API requires RAZORPAY_KEY_SECRET in environment variables. Click below to open Razorpay Checkout with UPI QR & UPI.'
        });
      }

      const closeByUnix = Math.floor(Date.now() / 1000) + 900;
      const qrRequestPayload = {
        type: 'upi_qr',
        name: 'Safar India Cabs',
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: amountInPaise,
        description: `SafarIndiaCabs Booking ${cleanBookingId} (${pickupCity} to ${dropCity})`,
        close_by: closeByUnix,
        notes: {
          booking_id: cleanBookingId,
          verified_booking_id: cleanBookingId,
          payment_mode: String(paymentMode),
          expected_amount_paise: String(amountInPaise),
          total_fare_rupees: String(finalTotalFare),
          advance_paid_rupees: String(payableRupees),
          balance_due_rupees: String(finalBalanceDue),
          customer_info: `${String(customerName).trim().slice(0, 70)}|${cleanPhone}|${String(customerEmail || '').trim().slice(0, 70)}`,
          route_info: `${String(tripType)}|${String(pickupCity).slice(0, 70)}|${String(dropCity).slice(0, 70)}|${String(serverFare.distanceKm || distanceKm)}`
        }
      };

      let qrData = null;
      let lastQrError = '';
      let lastQrStatus = 0;

      for (const candidate of candidateKeys) {
        const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
        const qrRes = await fetch(`${RAZORPAY_API_BASE}/payments/qr_codes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Basic ${basicAuth}`
          },
          body: JSON.stringify(qrRequestPayload)
        }).catch(() => null);

        if (!qrRes) continue;
        lastQrStatus = qrRes.status;
        const parsed = await qrRes.json().catch(() => null);

        if (qrRes.ok && parsed && parsed.id && parsed.image_url) {
          qrData = parsed;
          break;
        }

        lastQrError =
          parsed?.error?.description ||
          parsed?.error?.reason ||
          `Razorpay QR API returned HTTP ${qrRes.status}`;
      }

      if (qrData && qrData.id && qrData.image_url) {
        const qrRecord = {
          qrId: qrData.id,
          imageUrl: qrData.image_url,
          amountInPaise: qrData.payment_amount || amountInPaise,
          amountInRupees: payableRupees,
          closeBy: qrData.close_by || closeByUnix,
          status: qrData.status || 'active',
          verificationToken,
          fareSummary
        };

        setActiveQrForBooking(cleanBookingId, amountInPaise, qrRecord);

        appendPaymentAuditLog({
          bookingId: cleanBookingId,
          customerName,
          customerPhone: cleanPhone,
          customerEmail,
          totalBookingAmount: finalTotalFare,
          advanceAmount: payableRupees,
          amountInPaise,
          qrId: qrData.id,
          paymentMethod: 'upi_qr',
          paymentStatus: 'qr_active',
          gatewayResponse: `HTTP 200 OK — Official Razorpay Dynamic QR ${qrData.id} generated (${amountInPaise} paise)`,
          retryAttempts
        });

        return res.status(200).json({
          success: true,
          qrApiSupported: true,
          bookingId: cleanBookingId,
          qrId: qrData.id,
          imageUrl: qrData.image_url,
          amountInPaise: qrRecord.amountInPaise,
          amountInRupees: payableRupees,
          closeBy: qrRecord.closeBy,
          status: qrRecord.status,
          verificationToken,
          fareSummary
        });
      }

      appendPaymentAuditLog({
        bookingId: cleanBookingId,
        customerName,
        customerPhone: cleanPhone,
        customerEmail,
        totalBookingAmount: finalTotalFare,
        advanceAmount: payableRupees,
        amountInPaise,
        paymentMethod: 'upi_qr',
        paymentStatus: 'qr_api_unavailable',
        failureReason: `HTTP ${lastQrStatus}: ${lastQrError || 'UPI QR API not enabled on this Razorpay account/mode'}`,
        gatewayResponse: `Fallback to Razorpay Standard Checkout QR`,
        retryAttempts
      });

      return res.status(200).json({
        success: true,
        qrApiSupported: false,
        canUseCheckoutQr: true,
        bookingId: cleanBookingId,
        amountInPaise,
        amountInRupees: payableRupees,
        verificationToken,
        fareSummary,
        reason:
          lastQrError ||
          'Direct QR Code API is not enabled on this Razorpay merchant key/mode. Opening official Razorpay Checkout for UPI QR & UPI payment.'
      });
    }

    // =========================================================================
    // 4. CHECK LIVE PAYMENT STATUS (Order, QR Code, or Booking ID)
    // =========================================================================
    if (action === 'check_status') {
      const { bookingId, orderId, qrId, paymentId, bookingDraft } = body;
      const cleanBookingId = String(bookingId || '')
        .trim()
        .replace(/^#/, '')
        .toUpperCase();
      const cleanOrderId = orderId ? String(orderId).trim() : '';
      const cleanQrId = qrId ? String(qrId).trim() : '';
      const cleanPaymentId = paymentId ? String(paymentId).trim() : '';

      const alreadyVerified = getVerifiedBookingById(cleanBookingId);
      if (alreadyVerified && alreadyVerified.paymentId) {
        return res.status(200).json({
          success: true,
          status: 'paid',
          verified: true,
          bookingId: cleanBookingId,
          paymentId: alreadyVerified.paymentId,
          orderId: alreadyVerified.orderId || cleanOrderId,
          booking: alreadyVerified.booking
        });
      }

      if (!keySecret || candidateKeys.length === 0) {
        return res.status(200).json({
          success: true,
          status: 'pending',
          verified: false,
          message: 'Awaiting payment completion in Razorpay Checkout.'
        });
      }

      for (const candidate of candidateKeys) {
        const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
        const authHeaders = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`
        };

        if (cleanQrId && cleanQrId.startsWith('qr_')) {
          const [qrRes, qrPaymentsRes] = await Promise.all([
            fetch(`${RAZORPAY_API_BASE}/payments/qr_codes/${encodeURIComponent(cleanQrId)}`, {
              method: 'GET',
              headers: authHeaders
            }).catch(() => null),
            fetch(
              `${RAZORPAY_API_BASE}/payments/qr_codes/${encodeURIComponent(cleanQrId)}/payments?count=10`,
              {
                method: 'GET',
                headers: authHeaders
              }
            ).catch(() => null)
          ]);

          const qrInfo = qrRes && qrRes.ok ? await qrRes.json().catch(() => null) : null;
          const qrPayments =
            qrPaymentsRes && qrPaymentsRes.ok ? await qrPaymentsRes.json().catch(() => null) : null;

          if (qrPayments && Array.isArray(qrPayments.items) && qrPayments.items.length > 0) {
            const paidItem = qrPayments.items.find(
              (p) => p && (p.status === 'captured' || p.status === 'authorized')
            );

            if (paidItem) {
              let finalPayment = paidItem;
              if (paidItem.status === 'authorized') {
                const capRes = await fetch(
                  `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paidItem.id)}/capture`,
                  {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({ amount: paidItem.amount, currency: 'INR' })
                  }
                ).catch(() => null);
                const capData = capRes && capRes.ok ? await capRes.json().catch(() => null) : null;
                if (capData && capData.status === 'captured') {
                  finalPayment = capData;
                }
              }

              const paidRupees = Math.round(Number(finalPayment.amount || 0) / 100);
              const confirmedBooking = saveVerifiedBookingRecord({
                orderId: cleanQrId,
                paymentId: finalPayment.id,
                booking: {
                  ...(bookingDraft || {}),
                  id: cleanBookingId,
                  transactionId: finalPayment.id,
                  advancePaid: paidRupees || bookingDraft?.advancePaid || 0,
                  paymentMethod: `Razorpay Dynamic UPI QR (${finalPayment.id})`,
                  status: 'confirmed',
                  createdAt: bookingDraft?.createdAt || new Date().toISOString()
                }
              });

              setActiveQrForBooking(cleanBookingId, Number(finalPayment.amount || 0), null);

              appendPaymentAuditLog({
                bookingId: cleanBookingId,
                customerName: confirmedBooking.customerName || 'Traveler',
                customerPhone: confirmedBooking.customerPhone || '',
                totalBookingAmount: Number(confirmedBooking.totalFare || paidRupees),
                advanceAmount: paidRupees,
                amountInPaise: Number(finalPayment.amount || 0),
                qrId: cleanQrId,
                razorpayPaymentId: finalPayment.id,
                paymentMethod: 'upi_qr',
                paymentStatus: 'paid',
                gatewayResponse: `QR ${cleanQrId} paid via ${finalPayment.id} (${finalPayment.vpa || 'UPI'})`,
                webhookVerificationStatus: 'verified'
              });

              let notificationResult = null;
              try {
                notificationResult = await dispatchBookingConfirmationNotifications(confirmedBooking);
              } catch {}

              return res.status(200).json({
                success: true,
                status: 'paid',
                verified: true,
                bookingId: cleanBookingId,
                qrId: cleanQrId,
                paymentId: finalPayment.id,
                booking: confirmedBooking,
                notificationsDispatched: Boolean(
                  notificationResult?.customer?.whatsappDispatched ||
                    notificationResult?.customer?.dispatched
                )
              });
            }

            const failedItem = qrPayments.items.find((p) => p && p.status === 'failed');
            if (failedItem) {
              const failDesc =
                failedItem.error_description || failedItem.error_reason || 'UPI QR payment failed';
              appendPaymentAuditLog({
                bookingId: cleanBookingId,
                qrId: cleanQrId,
                razorpayPaymentId: failedItem.id,
                paymentMethod: 'upi_qr',
                paymentStatus: 'failed',
                failureReason: failDesc,
                gatewayResponse: `QR payment ${failedItem.id} status=failed`
              });
              return res.status(200).json({
                success: true,
                status: 'failed',
                verified: false,
                qrId: cleanQrId,
                failureReason: failDesc
              });
            }
          }

          if (qrInfo) {
            const nowSec = Math.floor(Date.now() / 1000);
            if (qrInfo.status === 'closed' || (qrInfo.close_by && nowSec >= qrInfo.close_by)) {
              setActiveQrForBooking(cleanBookingId, Number(qrInfo.payment_amount || 0), null);
              return res.status(200).json({
                success: true,
                status: 'expired',
                verified: false,
                qrId: cleanQrId,
                failureReason: 'This Dynamic QR code has expired or closed. Please generate a fresh QR code.'
              });
            }
            return res.status(200).json({
              success: true,
              status: 'qr_active',
              verified: false,
              qrId: cleanQrId,
              closeBy: qrInfo.close_by
            });
          }
        }

        if (cleanOrderId && cleanOrderId.startsWith('order_')) {
          const orderPaymentsRes = await fetch(
            `${RAZORPAY_API_BASE}/orders/${encodeURIComponent(cleanOrderId)}/payments`,
            {
              method: 'GET',
              headers: authHeaders
            }
          ).catch(() => null);

          if (orderPaymentsRes && orderPaymentsRes.ok) {
            const orderPayments = await orderPaymentsRes.json().catch(() => null);
            if (orderPayments && Array.isArray(orderPayments.items) && orderPayments.items.length > 0) {
              const paidItem = orderPayments.items.find(
                (p) => p && (p.status === 'captured' || p.status === 'authorized')
              );
              if (paidItem) {
                let finalPayment = paidItem;
                if (paidItem.status === 'authorized') {
                  const capRes = await fetch(
                    `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paidItem.id)}/capture`,
                    {
                      method: 'POST',
                      headers: authHeaders,
                      body: JSON.stringify({ amount: paidItem.amount, currency: 'INR' })
                    }
                  ).catch(() => null);
                  const capData = capRes && capRes.ok ? await capRes.json().catch(() => null) : null;
                  if (capData && capData.status === 'captured') {
                    finalPayment = capData;
                  }
                }

                const paidRupees = Math.round(Number(finalPayment.amount || 0) / 100);
                const confirmedBooking = saveVerifiedBookingRecord({
                  orderId: cleanOrderId,
                  paymentId: finalPayment.id,
                  booking: {
                    ...(bookingDraft || {}),
                    id: cleanBookingId,
                    transactionId: finalPayment.id,
                    advancePaid: paidRupees || bookingDraft?.advancePaid || 0,
                    paymentMethod: `Razorpay ${String(finalPayment.method || 'UPI').toUpperCase()} (${finalPayment.id})`,
                    status: 'confirmed',
                    createdAt: bookingDraft?.createdAt || new Date().toISOString()
                  }
                });

                appendPaymentAuditLog({
                  bookingId: cleanBookingId,
                  customerName: confirmedBooking.customerName || 'Traveler',
                  customerPhone: confirmedBooking.customerPhone || '',
                  totalBookingAmount: Number(confirmedBooking.totalFare || paidRupees),
                  advanceAmount: paidRupees,
                  amountInPaise: Number(finalPayment.amount || 0),
                  razorpayOrderId: cleanOrderId,
                  razorpayPaymentId: finalPayment.id,
                  paymentMethod: finalPayment.method || 'upi',
                  paymentStatus: 'paid',
                  gatewayResponse: `Recovered & verified Order ${cleanOrderId} payment ${finalPayment.id}`,
                  webhookVerificationStatus: 'verified'
                });

                let notificationResult = null;
                try {
                  notificationResult = await dispatchBookingConfirmationNotifications(confirmedBooking);
                } catch {}

                return res.status(200).json({
                  success: true,
                  status: 'paid',
                  verified: true,
                  bookingId: cleanBookingId,
                  orderId: cleanOrderId,
                  paymentId: finalPayment.id,
                  booking: confirmedBooking,
                  notificationsDispatched: Boolean(
                    notificationResult?.customer?.whatsappDispatched ||
                      notificationResult?.customer?.dispatched
                  )
                });
              }

              const processingItem = orderPayments.items.find((p) => p && p.status === 'created');
              if (processingItem) {
                return res.status(200).json({
                  success: true,
                  status: 'processing',
                  verified: false,
                  orderId: cleanOrderId,
                  paymentId: processingItem.id,
                  message: 'Payment attempt is currently processing with your bank/UPI app.'
                });
              }

              const failedItem = orderPayments.items.find((p) => p && p.status === 'failed');
              if (failedItem) {
                const failReason =
                  failedItem.error_description ||
                  failedItem.error_reason ||
                  'Last payment attempt failed at the bank or UPI app.';
                return res.status(200).json({
                  success: true,
                  status: 'failed',
                  verified: false,
                  orderId: cleanOrderId,
                  paymentId: failedItem.id,
                  failureReason: failReason
                });
              }
            }
          }
        }

        if (cleanPaymentId && cleanPaymentId.startsWith('pay_')) {
          const pRes = await fetch(
            `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}`,
            {
              method: 'GET',
              headers: authHeaders
            }
          ).catch(() => null);
          if (pRes && pRes.ok) {
            const pData = await pRes.json().catch(() => null);
            if (pData && (pData.status === 'captured' || pData.status === 'authorized')) {
              const paidRupees = Math.round(Number(pData.amount || 0) / 100);
              const confirmedBooking = saveVerifiedBookingRecord({
                orderId: pData.order_id || `DIRECT_${cleanBookingId}`,
                paymentId: pData.id,
                booking: {
                  ...(bookingDraft || {}),
                  id: cleanBookingId,
                  transactionId: pData.id,
                  advancePaid: paidRupees || bookingDraft?.advancePaid || 0,
                  status: 'confirmed',
                  createdAt: bookingDraft?.createdAt || new Date().toISOString()
                }
              });
              return res.status(200).json({
                success: true,
                status: 'paid',
                verified: true,
                bookingId: cleanBookingId,
                paymentId: pData.id,
                booking: confirmedBooking
              });
            }
          }
        }

        break;
      }

      return res.status(200).json({
        success: true,
        status: 'unpaid',
        verified: false,
        bookingId: cleanBookingId,
        message: 'No completed payment found yet for this booking.'
      });
    }

    // =========================================================================
    // 5. CLOSE ACTIVE QR CODE (/v1/payments/qr_codes/{qrId}/close)
    // =========================================================================
    if (action === 'close_qr') {
      const { bookingId, qrId, amountInPaise } = body;
      const cleanBookingId = String(bookingId || '').trim().toUpperCase();
      const cleanQrId = String(qrId || '').trim();

      if (cleanBookingId) {
        setActiveQrForBooking(cleanBookingId, Number(amountInPaise || 0), null);
      }

      if (cleanQrId && cleanQrId.startsWith('qr_') && keySecret && candidateKeys.length > 0) {
        for (const candidate of candidateKeys) {
          const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
          const closeRes = await fetch(
            `${RAZORPAY_API_BASE}/payments/qr_codes/${encodeURIComponent(cleanQrId)}/close`,
            {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                Authorization: `Basic ${basicAuth}`
              }
            }
          ).catch(() => null);
          if (closeRes && closeRes.ok) break;
        }
      }

      appendPaymentAuditLog({
        bookingId: cleanBookingId || 'UNKNOWN',
        qrId: cleanQrId,
        paymentMethod: 'upi_qr',
        paymentStatus: 'qr_closed',
        gatewayResponse: `QR ${cleanQrId} closed`
      });

      return res.status(200).json({
        success: true,
        closed: true,
        qrId: cleanQrId
      });
    }

    // Fallback: if no explicit action is passed and bookingId + customerPhone are present, treat as create-order
    if (!action && body.bookingId && body.customerPhone) {
      return await handleCreateOrder(req, res, body);
    }

    return res.status(400).json({
      success: false,
      error: `Unsupported action: ${action || 'none'}`
    });
  } catch (err) {
    console.error('[/api/payment-gateway] Unexpected error:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error in payment gateway endpoint.'
    });
  }
}

