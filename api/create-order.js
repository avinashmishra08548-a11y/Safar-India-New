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
  cleanEnvVar,
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
      clientTotalFareRupees,
      clientPublicKeyId
    } = body;

    // Normalize RAZORPAY_KEY_ID, VITE_RAZORPAY_KEY_ID (automatic fallback), clientPublicKeyId, and RAZORPAY_KEY_SECRET
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

    // Explicit error handling when no Razorpay Key ID is available anywhere
    if (!keyId) {
      console.error(
        '[/api/create-order] Missing Razorpay Key ID (neither RAZORPAY_KEY_ID nor VITE_RAZORPAY_KEY_ID is set):',
        diagnostics
      );
      return res.status(500).json({
        success: false,
        errorCode: 'MISSING_RAZORPAY_KEY_ID',
        error:
          'Razorpay Key ID is missing on the server. Set RAZORPAY_KEY_ID (or VITE_RAZORPAY_KEY_ID) in Vercel Environment Variables and redeploy.'
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
        extraKm: Number(body.extraKm || 0),
        pickupCity,
        dropCity,
        pickupDate,
        pickupTime,
        returnDate,
        localPackageId,
        includeTolls: Boolean(includeTolls),
        addonCarrier: Boolean(body.addonCarrier),
        addonPet: Boolean(body.addonPet),
        addonAssuredModel: Boolean(body.addonAssuredModel)
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

    // 3. Try creating an order via official Razorpay Orders API across all candidate Key IDs
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
          console.log('[/api/create-order] Razorpay Order created with candidate key:', {
            source: candidate.source,
            keyPrefix: candidate.keyId.slice(0, 9),
            orderId: parsed.id
          });
          break;
        }

        lastGatewayStatus = rzpResponse.status;
        lastGatewayErrorDesc =
          parsed?.error?.description ||
          parsed?.error?.reason ||
          `Razorpay Orders API returned HTTP ${rzpResponse.status}`;

        console.warn('[/api/create-order] Candidate key failed on Razorpay Orders API:', {
          source: candidate.source,
          keyPrefix: candidate.keyId.slice(0, 9),
          status: rzpResponse.status,
          errorDescription: lastGatewayErrorDesc
        });
      }
    }

    // 4A. If Razorpay Order creation succeeded, return order-backed response
    if (rzpData && rzpData.id) {
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

      const verificationToken = signOrderVerificationToken(tokenPayload, signingSecret);

      registerPendingOrderRecord({
        ...tokenPayload,
        currency: rzpData.currency || 'INR',
        customerName: customerName.trim(),
        customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
        fareDetails: serverFare
      });

      return res.status(200).json({
        success: true,
        checkoutMode: 'order',
        orderId: rzpData.id,
        amount: rzpData.amount,
        amountInRupees: serverPayableRupees,
        currency: rzpData.currency || 'INR',
        keyId: matchedKeyId,
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
    }

    // 4B. If Razorpay Orders API returned 401 Authentication failed (or secret is missing/mismatched),
    // automatically fall back to Server-Validated Direct Standard Checkout so customer payment proceeds smoothly!
    const fallbackClientKey =
      (vitePublicKeyId && (vitePublicKeyId.startsWith('rzp_live_') || vitePublicKeyId.startsWith('rzp_test_'))
        ? vitePublicKeyId
        : '') ||
      (cleanEnvVar(clientPublicKeyId).startsWith('rzp_') ? cleanEnvVar(clientPublicKeyId) : '') ||
      keyId;

    console.warn(
      '[/api/create-order] Falling back to Server-Validated Standard Direct Checkout (Orders API status ' +
        `${lastGatewayStatus || 'N/A'}: ${lastGatewayErrorDesc || 'Secret mismatch/missing'}). ` +
        'Booking fare is validated on server and checkout will open with public key:',
      {
        bookingId: bookingId.trim(),
        amountInPaise,
        keyPrefix: fallbackClientKey.slice(0, 9),
        keyMasked: `${fallbackClientKey.slice(0, 9)}***${fallbackClientKey.slice(-4)}`
      }
    );

    const directTokenPayload = {
      bookingId: bookingId.trim(),
      orderId: 'DIRECT',
      amountInPaise,
      totalFare: serverFare.totalFare,
      advancePaid: serverPayableRupees,
      balanceDue: serverBalanceDueRupees,
      paymentMode,
      customerPhone: cleanPhone,
      tripType,
      cabId
    };

    const verificationToken = signOrderVerificationToken(directTokenPayload, signingSecret);

    registerPendingOrderRecord({
      ...directTokenPayload,
      orderId: `DIRECT_${bookingId.trim()}`,
      currency: 'INR',
      customerName: customerName.trim(),
      customerEmail: customerEmail ? String(customerEmail).trim() : undefined,
      fareDetails: serverFare
    });

    return res.status(200).json({
      success: true,
      checkoutMode: 'direct',
      orderId: '',
      amount: amountInPaise,
      amountInRupees: serverPayableRupees,
      currency: 'INR',
      keyId: fallbackClientKey,
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
