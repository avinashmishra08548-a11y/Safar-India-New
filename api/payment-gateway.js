/**
 * Vercel Serverless API Route: /api/payment-gateway
 *
 * Official Razorpay Dynamic UPI QR Code, Live Payment Status Verification,
 * Webhook Verification (HMAC-SHA256), and Admin Payment Troubleshooting Logs.
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
  getActiveQrForBooking,
  getBookingRetryCount,
  getPaymentAuditLogs,
  getPendingOrderRecord,
  getVerifiedBookingById,
  incrementBookingRetryAttempt,
  registerPendingOrderRecord,
  resolveNormalizedRazorpayCredentials,
  saveVerifiedBookingRecord,
  setActiveQrForBooking,
  signOrderVerificationToken
} from './bookings.js';
import { sanitize10Digit } from './send-sms.js';
import { dispatchBookingConfirmationNotifications } from './send-booking-sms.js';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

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
      keyId,
      keySecret,
      signingSecret,
      candidateKeys,
      diagnostics
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
        pickupAddress = '',
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

      // Check if booking is already paid
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

      // Calculate authoritative server-side fare
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

      // Reuse active unexpired QR for this exact bookingId + amountInPaise unless forceNew is requested
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

      // Attempt official Razorpay QR Codes API (/v1/payments/qr_codes)
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

      const closeByUnix = Math.floor(Date.now() / 1000) + 900; // 15 minutes validity
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

      // If Razorpay QR API returned 400/401 (e.g. UPI QR feature not enabled on merchant account or Test Mode limitation)
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

      // 4A. Check if already verified in memory
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

        // 4B. Check specific QR Code payments (/v1/payments/qr_codes/{qrId}/payments)
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

        // 4C. Check Order payments (/v1/orders/{orderId}/payments)
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

        // 4D. Check direct payment ID (/v1/payments/{paymentId})
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
