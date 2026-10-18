/**
 * Vercel Serverless API Route: /api/verify-payment
 *
 * Securely verifies a Razorpay payment on the server before marking a booking confirmed:
 * 1. Verifies the Razorpay checkout signature using RAZORPAY_KEY_SECRET and crypto.timingSafeEqual
 * 2. Confirms the order-to-booking association via HMAC verificationToken and Razorpay Order receipt/notes
 * 3. Fetches the payment and order directly from Razorpay's official API (stateless across cold starts)
 * 4. Confirms payment.status === 'captured' (auto-capturing if 'authorized'), currency === 'INR',
 *    and amount matches the exact server-calculated expected amount in paise
 * 5. Prevents duplicate confirmation across both warm memory and Razorpay payment notes
 */

import crypto from 'crypto';
import {
  cleanEnvVar,
  getPendingOrderRecord,
  getVerifiedOrderRecord,
  getVerifiedPaymentRecord,
  saveVerifiedBookingRecord,
  verifyOrderVerificationToken
} from './bookings.js';
import { sanitize10Digit } from './send-sms.js';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

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
      error: 'Method Not Allowed. Use POST.'
    });
  }

  const keyId = cleanEnvVar(process.env.RAZORPAY_KEY_ID) || cleanEnvVar(process.env.VITE_RAZORPAY_KEY_ID);
  const keySecret = cleanEnvVar(process.env.RAZORPAY_KEY_SECRET);

  if (!keyId || !keySecret) {
    console.error('[/api/verify-payment] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.');
    return res.status(500).json({
      success: false,
      error: 'Payment verification server credentials are not configured.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
      verificationToken,
      bookingDraft
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !bookingId ||
      !bookingDraft
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification fields (order ID, payment ID, signature, or booking details).'
      });
    }

    const cleanOrderId = String(razorpay_order_id).trim();
    const cleanPaymentId = String(razorpay_payment_id).trim();
    const cleanBookingId = String(bookingId).trim();

    if (!cleanOrderId.startsWith('order_') || !cleanPaymentId.startsWith('pay_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay order ID or payment ID format.'
      });
    }

    // 1. Verify Razorpay Checkout HMAC-SHA256 signature using timingSafeEqual
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
      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed. This transaction could not be authenticated.'
      });
    }

    // 2. Warm-instance idempotency / duplicate confirmation guards
    const existingPaymentRecord = getVerifiedPaymentRecord(cleanPaymentId);
    if (existingPaymentRecord) {
      if (
        existingPaymentRecord.bookingId === cleanBookingId &&
        existingPaymentRecord.orderId === cleanOrderId
      ) {
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

    // 3. Fetch durable Order & Payment details directly from Razorpay's official API
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const authHeaders = {
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`
    };

    const [orderRes, paymentRes] = await Promise.all([
      fetch(`${RAZORPAY_API_BASE}/orders/${encodeURIComponent(cleanOrderId)}`, {
        method: 'GET',
        headers: authHeaders
      }),
      fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}`, {
        method: 'GET',
        headers: authHeaders
      })
    ]);

    const rzpOrder = await orderRes.json().catch(() => null);
    let rzpPayment = await paymentRes.json().catch(() => null);

    if (!orderRes.ok || !rzpOrder || rzpOrder.id !== cleanOrderId) {
      console.error('[/api/verify-payment] Failed to retrieve Razorpay order:', {
        orderId: cleanOrderId,
        status: orderRes.status
      });
      return res.status(502).json({
        success: false,
        error: 'Unable to verify order details with Razorpay server.'
      });
    }

    if (!paymentRes.ok || !rzpPayment || rzpPayment.id !== cleanPaymentId) {
      console.error('[/api/verify-payment] Failed to retrieve Razorpay payment:', {
        paymentId: cleanPaymentId,
        status: paymentRes.status
      });
      return res.status(502).json({
        success: false,
        error: 'Unable to retrieve payment status from Razorpay server.'
      });
    }

    // 4. Confirm order-to-booking association from Razorpay's durable Order receipt & notes
    const orderNotes = rzpOrder.notes || {};
    const orderBookingId = rzpOrder.receipt || orderNotes.booking_id;
    const pendingOrder = getPendingOrderRecord(cleanOrderId);

    if (orderBookingId !== cleanBookingId || bookingDraft.id !== cleanBookingId) {
      console.error('[/api/verify-payment] Booking ID mismatch:', {
        cleanBookingId,
        orderBookingId,
        draftId: bookingDraft.id
      });
      return res.status(400).json({
        success: false,
        error: 'Order-to-booking association failed: this order does not belong to the requested booking.'
      });
    }

    if (pendingOrder && pendingOrder.bookingId !== cleanBookingId) {
      return res.status(400).json({
        success: false,
        error: 'Pending order record does not match the booking ID.'
      });
    }

    // Cross-invocation duplicate check via payment notes on Razorpay
    const paymentNotes = rzpPayment.notes || {};
    if (paymentNotes.verified_booking_id && paymentNotes.verified_booking_id !== cleanBookingId) {
      return res.status(409).json({
        success: false,
        error: 'This payment has already been verified for another booking.'
      });
    }

    const expectedAmountPaise = Number(
      pendingOrder?.amountInPaise ??
        orderNotes.expected_amount_paise ??
        rzpOrder.amount
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
        bookingDraft.paymentMode
    );
    const expectedCustomerPhone = sanitize10Digit(
      pendingOrder?.customerPhone ??
        orderNotes.customer_phone ??
        bookingDraft.customerPhone
    );
    const expectedTripType = String(
      pendingOrder?.tripType ??
        orderNotes.trip_type ??
        bookingDraft.tripType
    );
    const expectedCabId = String(
      pendingOrder?.cabId ??
        orderNotes.cab_id ??
        bookingDraft.cabId
    );

    // Verify cryptographic HMAC verificationToken issued by /api/create-order
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
      keySecret
    );

    if (!isTokenValid) {
      console.error('[/api/verify-payment] Order verificationToken HMAC mismatch for booking:', cleanBookingId);
      return res.status(400).json({
        success: false,
        error: 'Booking verification token is invalid or tampered with.'
      });
    }

    // 5. Confirm payment belongs to this order, currency is INR, and amount matches
    if (rzpPayment.order_id !== cleanOrderId) {
      console.error('[/api/verify-payment] Payment order_id mismatch:', {
        paymentOrderId: rzpPayment.order_id,
        expectedOrderId: cleanOrderId
      });
      return res.status(400).json({
        success: false,
        error: 'Payment does not belong to the expected Razorpay order.'
      });
    }

    if (rzpPayment.currency !== 'INR' || rzpOrder.currency !== 'INR') {
      return res.status(400).json({
        success: false,
        error: `Invalid payment currency (${rzpPayment.currency}). Expected INR.`
      });
    }

    if (
      Number(rzpPayment.amount) !== expectedAmountPaise ||
      Number(rzpOrder.amount) !== expectedAmountPaise
    ) {
      console.error('[/api/verify-payment] Payment amount mismatch:', {
        paymentAmount: rzpPayment.amount,
        orderAmount: rzpOrder.amount,
        expectedAmountPaise
      });
      return res.status(400).json({
        success: false,
        error: 'Payment amount does not match the expected booking amount.'
      });
    }

    // 6. If payment is 'authorized' (not yet captured), attempt server-side capture
    if (rzpPayment.status === 'authorized') {
      const captureRes = await fetch(
        `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}/capture`,
        {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: expectedAmountPaise,
            currency: 'INR'
          })
        }
      );
      const capturedData = await captureRes.json().catch(() => null);
      if (captureRes.ok && capturedData && capturedData.status === 'captured') {
        rzpPayment = capturedData;
      }
    }

    // 7. Strictly require payment.status === 'captured'
    if (rzpPayment.status === 'failed') {
      const failDesc =
        rzpPayment.error_description ||
        rzpPayment.error_reason ||
        'Payment failed at the bank or UPI app.';
      return res.status(400).json({
        success: false,
        status: 'failed',
        error: `Payment was not completed: ${failDesc}`
      });
    }

    if (rzpPayment.status !== 'captured') {
      console.warn('[/api/verify-payment] Payment is not captured yet:', {
        paymentId: cleanPaymentId,
        status: rzpPayment.status
      });
      return res.status(409).json({
        success: false,
        status: rzpPayment.status,
        error: `Payment status is "${rzpPayment.status}" and has not been captured yet. Your booking will only be confirmed once payment is captured.`
      });
    }

    // 8. Durably stamp verified_booking_id on the Razorpay payment notes (best-effort)
    try {
      await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: {
            ...paymentNotes,
            verified_booking_id: cleanBookingId,
            verified_at: new Date().toISOString()
          }
        })
      });
    } catch {}

    // 9. Build verified confirmed booking with server-validated financial fields
    const paymentMethodDetail = rzpPayment.method
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

    console.log('[/api/verify-payment] Verified & confirmed booking:', {
      bookingId: cleanBookingId,
      orderId: cleanOrderId,
      paymentId: cleanPaymentId,
      amountInPaise: rzpPayment.amount,
      method: rzpPayment.method
    });

    return res.status(200).json({
      success: true,
      verified: true,
      booking: confirmedBooking,
      payment: {
        id: rzpPayment.id,
        orderId: rzpPayment.order_id,
        status: rzpPayment.status,
        amount: rzpPayment.amount,
        currency: rzpPayment.currency,
        method: rzpPayment.method
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
