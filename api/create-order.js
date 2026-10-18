/**
 * Vercel Serverless API Route: /api/create-order
 *
 * Creates a Razorpay Order on the server using official Razorpay Orders API:
 * - Authenticates with RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * - Validates booking details and independently calculates fare on the server
 * - Never trusts a price supplied only by the browser
 * - Uses INR and the exact amount in paise
 * - Associates the Razorpay Order with the booking via receipt, notes, and HMAC token
 * - Returns only the order ID and public key ID needed by Razorpay Standard Checkout
 */

import {
  computeServerTripFare,
  registerPendingOrderRecord,
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
      error: 'Method Not Allowed. Use POST.'
    });
  }

  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const vitePublicKeyId = (process.env.VITE_RAZORPAY_KEY_ID || '').trim();

  if (!keyId || !keySecret) {
    console.error('[/api/create-order] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Payment gateway server credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the server.'
    });
  }

  if (!keyId.startsWith('rzp_live_') && !keyId.startsWith('rzp_test_')) {
    console.error('[/api/create-order] Invalid RAZORPAY_KEY_ID format.');
    return res.status(500).json({
      success: false,
      error: 'Server RAZORPAY_KEY_ID has an invalid format.'
    });
  }

  // Ensure VITE_RAZORPAY_KEY_ID (if set in environment) matches RAZORPAY_KEY_ID
  if (vitePublicKeyId && vitePublicKeyId !== keyId) {
    console.error('[/api/create-order] Key mismatch: VITE_RAZORPAY_KEY_ID does not match RAZORPAY_KEY_ID.');
    return res.status(500).json({
      success: false,
      error: 'Configuration mismatch: VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_ID must match on the server.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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
      customerName,
      customerPhone,
      customerEmail,
      clientExpectedAmountRupees,
      clientTotalFareRupees
    } = body || {};

    // 1. Validate required booking fields
    if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim().startsWith('SIC-')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing bookingId.'
      });
    }

    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Valid passenger full name is required.'
      });
    }

    const cleanPhone = sanitize10Digit(customerPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: 'Valid 10-digit Indian mobile number is required.'
      });
    }

    if (!pickupCity || ! pickupAddress || !pickupDate || !pickupTime) {
      return res.status(400).json({
        success: false,
        error: 'Complete pickup city, doorstep address, date, and time are required.'
      });
    }

    if (paymentMode !== 'advance_20' && paymentMode !== 'full') {
      return res.status(400).json({
        success: false,
        error: 'Invalid paymentMode. Must be "advance_20" or "full".'
      });
    }

    // 2. Independently calculate fare on the server using actual project pricing rules
    let serverFare;
    try {
      serverFare = computeServerTripFare({
        tripType,
        cabId,
        distanceKm,
        pickupDate,
        returnDate,
        localPackageId,
        includeTolls: Boolean(includeTolls)
      });
    } catch (fareErr) {
      return res.status(400).json({
        success: false,
        error: fareErr?.message || 'Invalid trip parameters for fare calculation.'
      });
    }

    const serverPayableRupees =
      paymentMode === 'full' ? serverFare.totalFare : serverFare.advanceFare;
    const serverBalanceDueRupees =
      paymentMode === 'full' ? 0 : serverFare.balanceDue;

    // Reject if the client supplied a tampered total fare or payable amount
    if (
      clientTotalFareRupees !== undefined &&
      Math.abs(Number(clientTotalFareRupees) - serverFare.totalFare) > 1
    ) {
      console.warn('[/api/create-order] Client totalFare mismatch:', {
        bookingId,
        clientTotalFareRupees,
        serverTotalFare: serverFare.totalFare
      });
      return res.status(400).json({
        success: false,
        error: 'Fare validation failed: total fare does not match server pricing rules.'
      });
    }

    if (
      clientExpectedAmountRupees !== undefined &&
      Math.abs(Number(clientExpectedAmountRupees) - serverPayableRupees) > 1
    ) {
      console.warn('[/api/create-order] Client payable amount mismatch:', {
        bookingId,
        clientExpectedAmountRupees,
        serverPayableRupees
      });
      return res.status(400).json({
        success: false,
        error: 'Fare validation failed: payable amount does not match server pricing rules.'
      });
    }

    const amountInPaise = Math.round(serverPayableRupees * 100);
    if (!Number.isInteger(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order amount. Minimum order amount is ₹1 (100 paise).'
      });
    }

    // 3. Create order via official Razorpay Orders API
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const orderPayload = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: bookingId.trim(),
      payment_capture: 1,
      notes: {
        booking_id: bookingId.trim(),
        trip_type: String(tripType),
        cab_id: String(cabId),
        pickup_city: String(pickupCity).slice(0, 60),
        drop_city: String(dropCity || pickupCity).slice(0, 60),
        pickup_date: `${pickupDate} ${pickupTime}`.slice(0, 60),
        payment_mode: String(paymentMode),
        expected_amount_paise: String(amountInPaise),
        total_fare_rupees: String(serverFare.totalFare),
        advance_paid_rupees: String(serverPayableRupees),
        balance_due_rupees: String(serverBalanceDueRupees),
        customer_phone: cleanPhone
      }
    };

    const rzpResponse = await fetch(RAZORPAY_ORDERS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: JSON.stringify(orderPayload)
    });

    const rzpData = await rzpResponse.json().catch(() => null);

    if (!rzpResponse.ok || !rzpData || !rzpData.id) {
      const gatewayDesc =
        rzpData?.error?.description ||
        rzpData?.error?.reason ||
        `Razorpay Orders API returned HTTP ${rzpResponse.status}`;
      console.error('[/api/create-order] Razorpay Order creation failed:', {
        status: rzpResponse.status,
        bookingId,
        mode: keyId.startsWith('rzp_live_') ? 'live' : 'test',
        errorDescription: gatewayDesc
      });
      return res.status(502).json({
        success: false,
        error: `Unable to create payment order with Razorpay: ${gatewayDesc}`
      });
    }

    // 4. Sign order-to-booking association token and store pending record
    const tokenPayload = {
      bookingId: bookingId.trim(),
      orderId: rzpData.id,
      amountInPaise: rzpData.amount,
      totalFare: serverFare.totalFare,
      advancePaid: serverPayableRupees,
      balanceDue: serverBalanceDueRupees,
      paymentMode,
      customerPhone: cleanPhone,
      tripType,
      cabId
    };

    const verificationToken = signOrderVerificationToken(tokenPayload, keySecret);

    registerPendingOrderRecord({
      ...tokenPayload,
      currency: rzpData.currency || 'INR',
      customerName: customerName.trim(),
      customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
      fareDetails: serverFare
    });

    console.log('[/api/create-order] Created Razorpay order:', {
      orderId: rzpData.id,
      bookingId: bookingId.trim(),
      amountInPaise: rzpData.amount,
      currency: rzpData.currency,
      mode: keyId.startsWith('rzp_live_') ? 'live' : 'test'
    });

    return res.status(200).json({
      success: true,
      orderId: rzpData.id,
      amount: rzpData.amount,
      amountInRupees: serverPayableRupees,
      currency: rzpData.currency || 'INR',
      keyId, // Public key ID only — never expose keySecret
      bookingId: bookingId.trim(),
      verificationToken,
      fareSummary: {
        distanceKm: serverFare.distanceKm,
        billedDistanceKm: serverFare.billedDistanceKm,
        baseFare: serverFare.baseFare,
        driverAllowance: serverFare.driverAllowance,
        tollsAndTaxes: serverFare.tollsAndTaxes,
        gstAmount: serverFare.gstAmount,
        totalFare: serverFare.totalFare,
        advancePaid: serverPayableRupees,
        balanceDue: serverBalanceDueRupees
      }
    });
  } catch (err) {
    console.error('[/api/create-order] Unexpected server error:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while creating payment order. Please try again.'
    });
  }
}
