/**
 * Vercel Serverless API Route: /api/create-order
 *
 * Creates a Razorpay Order on the server using official Razorpay Orders API:
 * - Authenticates with RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * - Validates booking details and independently calculates fare on the server
 * - Never trusts a price supplied only by the browser
 * - Uses INR and the exact amount in paise
 * - Associates the Razorpay Order with the booking via receipt, notes, and HMAC token
 * - Includes safe diagnostic logging (never logs secrets or full customer PII)
 */

import {
  computeServerTripFare,
  registerPendingOrderRecord,
  resolveNormalizedRazorpayCredentials,
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

  // Normalize RAZORPAY_KEY_ID, VITE_RAZORPAY_KEY_ID (automatic fallback), and RAZORPAY_KEY_SECRET
  const {
    keyId,
    keySecret,
    serverKeyId,
    vitePublicKeyId,
    keySource,
    diagnostics
  } = resolveNormalizedRazorpayCredentials(process.env);

  // Detailed sanitized console log for key format prefix & environment diagnostics
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

  // Explicit error handling when both RAZORPAY_KEY_ID and fallback VITE_RAZORPAY_KEY_ID are missing
  if (!keyId) {
    console.error('[/api/create-order] Missing Razorpay Key ID (neither RAZORPAY_KEY_ID nor VITE_RAZORPAY_KEY_ID is set):', diagnostics);
    return res.status(500).json({
      success: false,
      errorCode: 'MISSING_RAZORPAY_KEY_ID',
      error:
        'Razorpay Key ID is missing on the server. Set RAZORPAY_KEY_ID (or VITE_RAZORPAY_KEY_ID) in Vercel Environment Variables and redeploy.'
    });
  }

  // Explicit error handling when RAZORPAY_KEY_SECRET is missing
  if (!keySecret) {
    console.error('[/api/create-order] Missing RAZORPAY_KEY_SECRET:', diagnostics);
    return res.status(500).json({
      success: false,
      errorCode: 'MISSING_RAZORPAY_KEY_SECRET',
      error:
        'Razorpay Key Secret (RAZORPAY_KEY_SECRET) is missing on the server. Add RAZORPAY_KEY_SECRET in Vercel Environment Variables and redeploy.'
    });
  }

  if (!keyId.startsWith('rzp_live_') && !keyId.startsWith('rzp_test_')) {
    console.error('[/api/create-order] Invalid Razorpay Key ID format prefix:', {
      keySource,
      keyPrefix: keyId.slice(0, 9),
      keyLength: keyId.length
    });
    return res.status(500).json({
      success: false,
      errorCode: 'INVALID_KEY_FORMAT',
      error: `Razorpay Key ID from ${keySource} has an invalid format prefix ("${keyId.slice(0, 9)}"). It must start with "rzp_live_" or "rzp_test_".`
    });
  }

  if (serverKeyId && vitePublicKeyId && serverKeyId !== vitePublicKeyId) {
    console.warn('[/api/create-order] Notice: RAZORPAY_KEY_ID and VITE_RAZORPAY_KEY_ID differ; using resolved server keyId for order creation and checkout:', {
      resolvedKeySource: keySource,
      resolvedKeyPrefix: diagnostics.keyPrefix,
      serverKeyPrefix: serverKeyId.slice(0, 9),
      viteKeyPrefix: vitePublicKeyId.slice(0, 9)
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
      customerName,
      customerPhone,
      customerEmail,
      clientExpectedAmountRupees,
      clientTotalFareRupees
    } = body;

    console.log('[/api/create-order] Incoming order request:', {
      bookingId,
      tripType,
      cabId,
      distanceKm,
      paymentMode,
      includeTolls: Boolean(includeTolls),
      clientExpectedAmountRupees,
      clientTotalFareRupees,
      keySource,
      keyPrefix: diagnostics.keyPrefix,
      keyMaskedPreview: diagnostics.keyMaskedPreview,
      keyMode: diagnostics.keyMode
    });

    // 1. Validate required booking fields
    if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim().startsWith('SIC-')) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_BOOKING_ID',
        error: 'Invalid or missing booking reference ID.'
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

    if (!pickupCity || !pickupAddress || !pickupDate || !pickupTime) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_PICKUP_DETAILS',
        error: 'Complete pickup city, doorstep pickup address, pickup date, and time are required.'
      });
    }

    if (paymentMode !== 'advance_20' && paymentMode !== 'full') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_PAYMENT_MODE',
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
      console.error('[/api/create-order] Fare calculation error:', {
        bookingId,
        tripType,
        cabId,
        distanceKm,
        message: fareErr?.message
      });
      return res.status(400).json({
        success: false,
        errorCode: 'FARE_CALCULATION_ERROR',
        error: fareErr?.message || 'Invalid trip parameters for fare calculation.'
      });
    }

    const serverPayableRupees =
      paymentMode === 'full' ? serverFare.totalFare : serverFare.advanceFare;
    const serverBalanceDueRupees =
      paymentMode === 'full' ? 0 : serverFare.balanceDue;

    // Validate client-supplied fare against server-computed fare
    if (
      clientTotalFareRupees !== undefined &&
      Math.abs(Number(clientTotalFareRupees) - serverFare.totalFare) > 2
    ) {
      console.warn('[/api/create-order] Client totalFare mismatch:', {
        bookingId,
        clientTotalFareRupees,
        serverTotalFare: serverFare.totalFare
      });
      return res.status(400).json({
        success: false,
        errorCode: 'TOTAL_FARE_MISMATCH',
        error: `Fare validation failed: browser total fare (₹${clientTotalFareRupees}) does not match server fare (₹${serverFare.totalFare}).`
      });
    }

    if (
      clientExpectedAmountRupees !== undefined &&
      Math.abs(Number(clientExpectedAmountRupees) - serverPayableRupees) > 2
    ) {
      console.warn('[/api/create-order] Client payable amount mismatch:', {
        bookingId,
        clientExpectedAmountRupees,
        serverPayableRupees
      });
      return res.status(400).json({
        success: false,
        errorCode: 'PAYABLE_AMOUNT_MISMATCH',
        error: `Fare validation failed: browser payable amount (₹${clientExpectedAmountRupees}) does not match server amount (₹${serverPayableRupees}).`
      });
    }

    const amountInPaise = Math.round(serverPayableRupees * 100);
    if (!Number.isInteger(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        errorCode: 'AMOUNT_TOO_LOW',
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
        errorCode: rzpData?.error?.code,
        errorDescription: gatewayDesc
      });
      return res.status(502).json({
        success: false,
        errorCode: rzpData?.error?.code || 'RAZORPAY_ORDER_API_ERROR',
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

    console.log('[/api/create-order] Successfully created Razorpay order:', {
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
