/**
 * Vercel Serverless API Route: /api/bookings
 *
 * Booking Repository & Server-Side Fare / Token Utilities
 *
 * IMPORTANT NOTE ON SERVERLESS STORAGE:
 * - `storedBookings`, `pendingOrdersById`, `verifiedPaymentsById`, and `verifiedOrdersById`
 *   are in-memory structures that only persist within a warm Vercel lambda instance.
 * - Therefore, `/api/create-order` and `/api/verify-payment` DO NOT rely solely on in-memory
 *   Maps across invocations. Instead, they persist booking metadata directly inside Razorpay's
 *   durable Order `receipt` and `notes` via the Razorpay Orders API and verify a timing-safe
 *   HMAC-SHA256 `verificationToken` signed with `RAZORPAY_KEY_SECRET`.
 */

import crypto from 'crypto';

// Fleet pricing table matching src/data/cabsFleet.ts
export const SERVER_CABS_FLEET = {
  hatchback: { id: 'hatchback', name: 'Hatchback AC', models: 'WagonR, Swift, Tiago or equivalent', ratePerKm: 11 },
  sedan: { id: 'sedan', name: 'Sedan AC (Dzire / Etios)', models: 'Maruti Suzuki Dzire, Toyota Etios, Hyundai Aura', ratePerKm: 12 },
  exec_sedan: { id: 'exec_sedan', name: 'Executive Sedan', models: 'Honda City, Maruti Ciaz, Hyundai Verna', ratePerKm: 15 },
  suv: { id: 'suv', name: 'SUV (Ertiga / Carens)', models: 'Maruti Ertiga, Kia Carens, Triber', ratePerKm: 16 },
  innova: { id: 'innova', name: 'Innova Crysta Premium', models: 'Toyota Innova Crysta Luxury', ratePerKm: 21 },
  tempo: { id: 'tempo', name: 'Tempo Traveller (12 Seater)', models: 'Force Urbania / Traveller 12-17 Seater', ratePerKm: 29 }
};

/**
 * Strip accidental surrounding quotes and whitespace from environment variables
 */
export function cleanEnvVar(val) {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^['"]+|['"]+$/g, '').trim();
}

/**
 * Compute trip fare on the server using the exact pricing rules in src/utils/fareCalculator.ts
 */
export function computeServerTripFare({
  tripType,
  cabId,
  distanceKm,
  pickupDate,
  returnDate,
  localPackageId = '8h_80k',
  includeTolls = true
}) {
  const validTripTypes = ['oneway', 'roundtrip', 'local', 'airport'];
  if (!validTripTypes.includes(tripType)) {
    throw new Error(`Invalid tripType: ${tripType}`);
  }

  const cab = SERVER_CABS_FLEET[cabId] || SERVER_CABS_FLEET.sedan;
  const ratePerKm = cab.ratePerKm;

  const parsedDistance = Number(distanceKm ?? 0);
  if (!Number.isFinite(parsedDistance) || parsedDistance < 0 || parsedDistance > 15000) {
    throw new Error(`Invalid distanceKm: ${distanceKm}`);
  }

  let billedDistanceKm = parsedDistance;
  let baseFare = 0;
  let driverAllowance = 0;
  let daysCount = 1;

  if (tripType === 'oneway') {
    // Standard intercity rule: minimum 130 km billing (matches src/utils/fareCalculator.ts line 47)
    billedDistanceKm = Math.max(130, parsedDistance);
    baseFare = billedDistanceKm * ratePerKm;
    driverAllowance = 300;
  } else if (tripType === 'roundtrip') {
    if (pickupDate && returnDate) {
      const p = new Date(pickupDate).getTime();
      const r = new Date(returnDate).getTime();
      if (Number.isFinite(p) && Number.isFinite(r)) {
        const diffDays = Math.ceil((r - p) / (1000 * 60 * 60 * 24));
        daysCount = Math.max(1, diffDays + 1);
      }
    }
    const minKmForDays = daysCount * 250;
    const actualTwoWayKm = parsedDistance * 2;
    billedDistanceKm = Math.max(minKmForDays, actualTwoWayKm);
    baseFare = billedDistanceKm * ratePerKm;
    driverAllowance = daysCount * 350;
  } else if (tripType === 'local') {
    if (localPackageId === '4h_40k') {
      billedDistanceKm = 40;
      baseFare = Math.round(40 * ratePerKm + 550);
      driverAllowance = 150;
    } else if (localPackageId === '12h_120k') {
      billedDistanceKm = 120;
      baseFare = Math.round(120 * ratePerKm + 950);
      driverAllowance = 300;
    } else {
      billedDistanceKm = 80;
      baseFare = Math.round(80 * ratePerKm + 750);
      driverAllowance = 250;
    }
  } else if (tripType === 'airport') {
    billedDistanceKm = Math.max(45, parsedDistance);
    baseFare = Math.round(billedDistanceKm * ratePerKm + 450);
    driverAllowance = 200;
  }

  let tollsAndTaxes = 0;
  if (includeTolls) {
    if (tripType === 'oneway') {
      tollsAndTaxes = Math.round(billedDistanceKm * 1.6);
    } else if (tripType === 'roundtrip') {
      tollsAndTaxes = Math.round(billedDistanceKm * 1.4);
    } else {
      tollsAndTaxes = 120;
    }
  }

  const taxableSubtotal = baseFare + driverAllowance;
  const gstAmount = Math.round(taxableSubtotal * 0.05);

  const totalFare = baseFare + driverAllowance + tollsAndTaxes + gstAmount;
  const advanceFare = Math.round(totalFare * 0.20);
  const balanceDue = totalFare - advanceFare;

  return {
    distanceKm: parsedDistance,
    billedDistanceKm,
    baseFare,
    driverAllowance,
    tollsAndTaxes,
    gstAmount,
    totalFare,
    advanceFare,
    balanceDue,
    daysCount,
    ratePerKm
  };
}

/**
 * Create a timing-safe HMAC verification token that binds the Razorpay order and booking parameters
 * so verification works reliably across separate Vercel serverless invocations.
 */
export function signOrderVerificationToken(payload, secret) {
  const canonical = [
    payload.bookingId,
    payload.orderId,
    payload.amountInPaise,
    payload.totalFare,
    payload.advancePaid,
    payload.balanceDue,
    payload.paymentMode,
    payload.customerPhone,
    payload.tripType,
    payload.cabId
  ].join('|');

  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

export function verifyOrderVerificationToken(payload, token, secret) {
  if (!token || typeof token !== 'string' || !secret) return false;
  const expected = signOrderVerificationToken(payload, secret);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(token.trim(), 'utf8');
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// In-memory cache for warm serverless invocations
let storedBookings = [
  {
    id: 'SIC-789940',
    tripType: 'oneway',
    pickupCity: 'Delhi NCR',
    dropCity: 'Agra',
    pickupAddress: 'T3 IGI Airport, New Delhi',
    dropAddress: 'Tajganj, Agra, Uttar Pradesh',
    landmark: 'Taj View Point',
    pickupDate: '2026-10-18',
    pickupTime: '08:00 AM',
    cabId: 'sedan',
    cabName: 'Sedan AC (Maruti Dzire)',
    distanceKm: 230,
    baseFare: 1450,
    driverAllowance: 0,
    tollsAndTaxes: 280,
    gstAmount: 87,
    totalFare: 1817,
    advancePaid: 363,
    balanceDue: 1454,
    paymentMode: 'advance_20',
    paymentMethod: 'upi_razorpay',
    transactionId: 'pay_live_captured_789940',
    customerName: 'Verified Passenger',
    customerPhone: '7710080992',
    customerEmail: 'passenger@safarindiacabs.in',
    status: 'confirmed',
    createdAt: '2026-10-17T08:30:00.000Z',
    notes: '20% advance received via Razorpay. Balance Rs. 1,454 payable to driver at destination.'
  }
];

const pendingOrdersById = new Map();
const verifiedPaymentsById = new Map();
const verifiedOrdersById = new Map();

export function registerPendingOrderRecord(orderRecord) {
  if (!orderRecord || !orderRecord.orderId || !orderRecord.bookingId) return;
  pendingOrdersById.set(orderRecord.orderId, {
    ...orderRecord,
    status: 'created',
    createdAt: new Date().toISOString()
  });
}

export function getPendingOrderRecord(orderId) {
  return pendingOrdersById.get(orderId) || null;
}

export function getVerifiedPaymentRecord(paymentId) {
  return verifiedPaymentsById.get(paymentId) || null;
}

export function getVerifiedOrderRecord(orderId) {
  return verifiedOrdersById.get(orderId) || null;
}

export function saveVerifiedBookingRecord({ booking, orderId, paymentId }) {
  if (!booking || !booking.id) {
    throw new Error('Cannot save verified booking without booking.id');
  }

  const confirmedBooking = {
    ...booking,
    status: 'confirmed',
    transactionId: paymentId
  };

  const existingIdx = storedBookings.findIndex(b => b.id === confirmedBooking.id);
  if (existingIdx >= 0) {
    storedBookings[existingIdx] = { ...storedBookings[existingIdx], ...confirmedBooking };
  } else {
    storedBookings.unshift(confirmedBooking);
  }

  const record = {
    bookingId: confirmedBooking.id,
    orderId,
    paymentId,
    verifiedAt: new Date().toISOString(),
    booking: confirmedBooking
  };

  if (paymentId) {
    verifiedPaymentsById.set(paymentId, record);
  }
  if (orderId) {
    verifiedOrdersById.set(orderId, record);
    const pending = pendingOrdersById.get(orderId);
    if (pending) {
      pendingOrdersById.set(orderId, { ...pending, status: 'verified', paymentId });
    }
  }

  return confirmedBooking;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const cleanList = storedBookings.filter(
      b => b && !b.id.includes('DEMO') && !b.id.includes('TEST')
    );
    return res.status(200).json({
      success: true,
      count: cleanList.length,
      bookings: cleanList
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { action, booking, bookingId, status, driverInfo } = body || {};

      if (action === 'clear_demo') {
        storedBookings = storedBookings.filter(
          b => b.transactionId && !b.id.includes('DEMO') && !b.id.includes('TEST')
        );
        return res.status(200).json({ success: true, count: storedBookings.length, bookings: storedBookings });
      }

      if (action === 'update_status' && bookingId) {
        storedBookings = storedBookings.map(b => {
          if (b.id === bookingId) {
            return {
              ...b,
              status: status || b.status,
              driverName: driverInfo?.name || b.driverName,
              driverPhone: driverInfo?.phone || b.driverPhone,
              driverVehicleModel: driverInfo?.vehicleModel || b.driverVehicleModel,
              driverVehicleNo: driverInfo?.carPlate || b.driverVehicleNo,
              driverAssignedAt: driverInfo ? new Date().toISOString() : b.driverAssignedAt
            };
          }
          return b;
        });
        return res.status(200).json({ success: true, bookings: storedBookings });
      }

      if (booking && booking.id) {
        if (
          booking.status === 'confirmed' &&
          (!booking.transactionId || !String(booking.transactionId).startsWith('pay_'))
        ) {
          return res.status(400).json({
            success: false,
            error: 'Bookings cannot be marked confirmed without a verified Razorpay payment.'
          });
        }

        const existingIdx = storedBookings.findIndex(b => b.id === booking.id);
        if (existingIdx >= 0) {
          storedBookings[existingIdx] = { ...storedBookings[existingIdx], ...booking };
        } else {
          storedBookings.unshift(booking);
        }
        return res.status(200).json({ success: true, booking, bookings: storedBookings });
      }

      return res.status(400).json({ error: 'Missing booking details' });
    } catch (err) {
      console.error('Error in /api/bookings:', err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
