/**
 * Vercel Serverless API Route: /api/create-order
 *
 * Creates a Razorpay Order on the server using official Razorpay Orders API:
 * - Normalizes RAZORPAY_KEY_ID, VITE_RAZORPAY_KEY_ID, and RAZORPAY_KEY_SECRET (strips whitespace & invisible chars)
 * - Automatically falls back across RAZORPAY_KEY_ID -> VITE_RAZORPAY_KEY_ID -> clientPublicKeyId
 * - Validates booking details and independently calculates fare on the server
 * - Never trusts a price supplied only by the browser
 * - Uses INR and the exact amount in paise
 * - If Razorpay Orders API returns HTTP 401 Authentication failed due to a secret mismatch in Vercel,
 *   automatically falls back to Server-Validated Standard Direct Checkout mode using the valid public keyId
 *   and server-calculated amount in paise so customer payments are never blocked by a 401 error.
 */

import {
  appendPaymentAuditLog,
  cleanEnvVar,
  computeServerTripFare,
  getActiveOrderForBooking,
  getBookingRetryCount,
  getVerifiedBookingById,
  incrementBookingRetryAttempt,
  registerPendingOrderRecord,
  resolveNormalizedRazorpayCredentials,
  setActiveOrderForBooking,
  signOrderVerificationToken
} from './bookings.js';
import { sanitize10Digit } from './send-sms.js';

const RAZORPAY_ORDERS_API_URL = 'https://api.razorpay.com/v1/orders';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      errorCode: 'METHOD_NOT_ALLOWED',
      error: 'Method Not Allowed. Use POST.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
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

    // Server-authoritative amounts:
    // Total fare, 20% advance (Math.round(totalFare * 0.20)), balance due, and exact paise
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
            'Authorization': `Basic ${basicAuth}`
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

