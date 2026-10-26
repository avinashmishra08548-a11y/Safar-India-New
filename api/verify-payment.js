/**
 * Vercel Serverless API Route: /api/verify-payment
 *
 * Securely verifies a Razorpay payment on the server before marking a booking confirmed:
 * - Supports both Order-Backed Checkout (razorpay_order_id + razorpay_payment_id + razorpay_signature)
 *   and Server-Validated Standard Direct Checkout (razorpay_payment_id + server-signed HMAC verificationToken)
 * - Uses timingSafeEqual for all HMAC comparisons
 * - Prevents duplicate confirmation across warm memory and Razorpay payment notes
 */

import crypto from 'crypto';
import {
  getPendingOrderRecord,
  getVerifiedOrderRecord,
  getVerifiedPaymentRecord,
  resolveNormalizedRazorpayCredentials,
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

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
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
    const cleanBookingId = String(bookingId).trim();

    if (!cleanPaymentId.startsWith('pay_')) {
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

    // =========================================================================
    // MODE B: Server-Validated Standard Direct Checkout (when no order_id was used)
    // =========================================================================
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
      const expectedPaymentMode = String(pendingDirect?.paymentMode ?? bookingDraft.paymentMode);
      const expectedCustomerPhone = sanitize10Digit(
        pendingDirect?.customerPhone ?? bookingDraft.customerPhone
      );
      const expectedTripType = String(pendingDirect?.tripType ?? bookingDraft.tripType);
      const expectedCabId = String(pendingDirect?.cabId ?? bookingDraft.cabId);

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
        console.error('[/api/verify-payment] Direct checkout verificationToken mismatch for booking:', cleanBookingId);
        return res.status(400).json({
          success: false,
          error: 'Booking verification token is invalid or tampered with.'
        });
      }

      // Best-effort server-side payment status & auto-capture check if keySecret authenticates
      let rzpPayment = null;
      if (keySecret && candidateKeys.length > 0) {
        for (const candidate of candidateKeys) {
          const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
          const authHeaders = {
            'Accept': 'application/json',
            'Authorization': `Basic ${basicAuth}`
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
                const captureRes = await fetch(
                  `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}/capture`,
                  {
                    method: 'POST',
                    headers: { ...authHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: expectedAmountPaise, currency: 'INR' })
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
                      route_info: `${String(bookingDraft.tripType || 'oneway')}|${String(bookingDraft.pickupCity || '')}|${String(bookingDraft.dropCity || '')}|${String(bookingDraft.distanceKm || 230)}`,
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
        return res.status(400).json({
          success: false,
          status: 'failed',
          error: `Payment failed: ${rzpPayment.error_description || 'Declined by bank/UPI app.'}`
        });
      }

      const paymentMethodDetail = rzpPayment?.method
        ? `${String(rzpPayment.method).toUpperCase()}${rzpPayment.vpa ? ` (${rzpPayment.vpa})` : ''}`
        : 'UPI / QR';

      const confirmedBooking = saveVerifiedBookingRecord({
        orderId: `DIRECT_${cleanBookingId}`,
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

      console.log('[/api/verify-payment] Verified & confirmed direct checkout booking:', {
        bookingId: cleanBookingId,
        paymentId: cleanPaymentId,
        amountInPaise: expectedAmountPaise
      });

      return res.status(200).json({
        success: true,
        verified: true,
        booking: confirmedBooking,
        payment: {
          id: cleanPaymentId,
          orderId: null,
          status: rzpPayment?.status || 'captured',
          amount: expectedAmountPaise,
          currency: 'INR',
          method: rzpPayment?.method || 'upi'
        }
      });
    }

    // =========================================================================
    // MODE A: Order-Backed Checkout (cleanOrderId starts with order_)
    // =========================================================================
    if (!cleanOrderId.startsWith('order_') || !razorpay_signature) {
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
    let rzpOrder = null;
    let rzpPayment = null;
    let workingAuthHeaders = null;

    const keysToTry = candidateKeys.length > 0 ? candidateKeys : [{ keyId, source: 'default' }];
    for (const candidate of keysToTry) {
      const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
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

      const oData = await orderRes.json().catch(() => null);
      const pData = await paymentRes.json().catch(() => null);

      if (orderRes.ok && paymentRes.ok && oData?.id === cleanOrderId && pData?.id === cleanPaymentId) {
        rzpOrder = oData;
        rzpPayment = pData;
        workingAuthHeaders = authHeaders;
        break;
      }
    }

    if (!rzpOrder || rzpOrder.id !== cleanOrderId || !rzpPayment || rzpPayment.id !== cleanPaymentId) {
      console.error('[/api/verify-payment] Failed to retrieve Razorpay order/payment from API:', {
        orderId: cleanOrderId,
        paymentId: cleanPaymentId
      });
      return res.status(502).json({
        success: false,
        error: 'Unable to verify order or payment details with Razorpay server.'
      });
    }

    // 4. Confirm order-to-booking association from Razorpay's durable Order receipt & notes
    const orderNotes = rzpOrder.notes || {};
    const orderBookingId = rzpOrder.receipt || orderNotes.booking_id;
    const pendingOrder = getPendingOrderRecord(cleanOrderId);

    if (orderBookingId !== cleanBookingId || bookingDraft.id !== cleanBookingId) {
      return res.status(400).json({
        success: false,
        error: 'Order-to-booking association failed: this order does not belong to the requested booking.'
      });
    }

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
        bookingDraft.tripType
    );
    const expectedCabId = String(
      pendingOrder?.cabId ??
        orderNotes.cab_id ??
        bookingDraft.cabId
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
      return res.status(400).json({
        success: false,
        error: 'Booking verification token is invalid or tampered with.'
      });
    }

    if (rzpPayment.order_id !== cleanOrderId) {
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
      return res.status(400).json({
        success: false,
        error: 'Payment amount does not match the expected booking amount.'
      });
    }

    // 6. If payment is 'authorized' (not yet captured), attempt server-side capture
    if (rzpPayment.status === 'authorized' && workingAuthHeaders) {
      const captureRes = await fetch(
        `${RAZORPAY_API_BASE}/payments/${encodeURIComponent(cleanPaymentId)}/capture`,
        {
          method: 'POST',
          headers: {
            ...workingAuthHeaders,
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
      return res.status(409).json({
        success: false,
        status: rzpPayment.status,
        error: `Payment status is "${rzpPayment.status}" and has not been captured yet.`
      });
    }

    if (workingAuthHeaders) {
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
              route_info: `${String(bookingDraft.tripType || 'oneway')}|${String(bookingDraft.pickupCity || '')}|${String(bookingDraft.dropCity || '')}|${String(bookingDraft.distanceKm || 230)}`,
              address_info: `${String(bookingDraft.pickupAddress || '').slice(0, 110)}|${String(bookingDraft.dropAddress || '').slice(0, 110)}`,
              schedule_info: `${String(bookingDraft.pickupDate || '')}|${String(bookingDraft.pickupTime || '')}|${String(bookingDraft.cabId || 'sedan')}|${String(bookingDraft.cabName || 'Sedan AC').slice(0, 60)}`,
              fare_info: `${expectedTotalFare}|${expectedAdvancePaid}|${expectedBalanceDue}|${expectedPaymentMode}`
            }
          })
        });
      } catch {}
    }

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
