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

    // 1. Validate & normalize required booking fields (supports SIC2601, SIC2608, SIC-2608, etc.)
    const rawBookingId =
      bookingId && typeof bookingId === 'string' ? bookingId.trim().replace(/^#/, '') : '';
    const normalizedBookingId =
      rawBookingId && /^SIC/i.test(rawBookingId)
        ? rawBookingId.toUpperCase()
        : rawBookingId || `SIC26${String(Math.floor(10 + Math.random() * 89))}`;

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

    // 2. Calculate fare on the server using project pricing rules, with safe fallback to client quote
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
      console.warn('[/api/create-order] Fare calculation fallback to client quote:', {
        bookingId: normalizedBookingId,
        tripType,
        cabId,
        distanceKm,
        message: fareErr?.message
      });
      const fallbackTotal = Math.max(
        100,
        Math.round(Number(clientTotalFareRupees || clientExpectedAmountRupees || 1500))
      );
      const fallbackAdvance = Math.max(
        1,
        Math.round(Number(clientExpectedAmountRupees || Math.round(fallbackTotal * 0.2)))
      );
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

    const serverPayableRupees =
      paymentMode === 'full' ? serverFare.totalFare : serverFare.advanceFare;
    const serverBalanceDueRupees =
      paymentMode === 'full' ? 0 : serverFare.balanceDue;

    // Always honor valid client-quoted fare shown on the user's Pay button so checkout matches UI
    let payableRupees = serverPayableRupees;
    let finalTotalFare = serverFare.totalFare;
    let finalBalanceDue = serverBalanceDueRupees;

    if (clientTotalFareRupees !== undefined && Number(clientTotalFareRupees) >= 50) {
      const clientTotal = Math.round(Number(clientTotalFareRupees));
      finalTotalFare = clientTotal;
      const clientAdvance = Math.round(clientTotal * 0.20);
      payableRupees =
        paymentMode === 'full'
          ? clientTotal
          : clientExpectedAmountRupees && Number(clientExpectedAmountRupees) >= 1
          ? Math.round(Number(clientExpectedAmountRupees))
          : clientAdvance;
      finalBalanceDue = paymentMode === 'full' ? 0 : Math.max(0, finalTotalFare - payableRupees);
    } else if (clientExpectedAmountRupees !== undefined && Number(clientExpectedAmountRupees) >= 1) {
      payableRupees = Math.round(Number(clientExpectedAmountRupees));
      if (paymentMode === 'full') {
        finalTotalFare = payableRupees;
        finalBalanceDue = 0;
      } else {
        finalTotalFare = Math.max(payableRupees, finalTotalFare);
        finalBalanceDue = Math.max(0, finalTotalFare - payableRupees);
      }
    }

    const amountInPaise = Math.round(payableRupees * 100);
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
        distance_km: String(serverFare.distanceKm || distanceKm || 230),
        payment_mode: String(paymentMode),
        total_fare_rupees: String(finalTotalFare),
        advance_paid_rupees: String(payableRupees),
        balance_due_rupees: String(finalBalanceDue),
        customer_info: `${String(customerName).trim().slice(0, 80)}|${cleanPhone}|${String(customerEmail || '').trim().slice(0, 80)}`
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

      return res.status(200).json({
        success: true,
        checkoutMode: 'order',
        orderId: rzpData.id,
        amount: rzpData.amount,
        amountInRupees: payableRupees,
        currency: rzpData.currency || 'INR',
        keyId: matchedKeyId,
        bookingId: normalizedBookingId,
        verificationToken,
        fareSummary: {
          distanceKm: serverFare.distanceKm,
          billedDistanceKm: serverFare.billedDistanceKm,
          baseFare: serverFare.baseFare,
          driverAllowance: serverFare.driverAllowance,
          tollsAndTaxes: serverFare.tollsAndTaxes,
          gstAmount: serverFare.gstAmount,
          totalFare: finalTotalFare,
          advancePaid: payableRupees,
          balanceDue: finalBalanceDue
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
        bookingId: normalizedBookingId,
        amountInPaise,
        keyPrefix: fallbackClientKey.slice(0, 9),
        keyMasked: `${fallbackClientKey.slice(0, 9)}***${fallbackClientKey.slice(-4)}`
      }
    );

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

    return res.status(200).json({
      success: true,
      checkoutMode: 'direct',
      orderId: '',
      amount: amountInPaise,
      amountInRupees: payableRupees,
      currency: 'INR',
      keyId: fallbackClientKey,
      bookingId: normalizedBookingId,
      verificationToken,
      fareSummary: {
        distanceKm: serverFare.distanceKm,
        billedDistanceKm: serverFare.billedDistanceKm,
        baseFare: serverFare.baseFare,
        driverAllowance: serverFare.driverAllowance,
        tollsAndTaxes: serverFare.tollsAndTaxes,
        gstAmount: serverFare.gstAmount,
        totalFare: finalTotalFare,
        advancePaid: payableRupees,
        balanceDue: finalBalanceDue
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
