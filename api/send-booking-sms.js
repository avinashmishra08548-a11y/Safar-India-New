/**
 * Vercel Serverless API Route: /api/send-booking-sms
 * 
 * Automated Dual Fast2SMS Dispatch with Professional Clean Templates:
 * 1. Customer Booking Confirmation SMS
 * 2. Instant Admin New Booking Alert SMS (+91 7710080992)
 */

export const ADMIN_PHONE_NUMBER = '7710080992';
const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';
const DEFAULT_KEY = '6B8sTgArm4kSQUaZC9iNhVdFEf3IPlMqoRDeuYjwGHvtnpXW51IKdZWsjBgMr2wl54C0JOYh9nuiVxcz';

function sanitize10Digit(num) {
  let clean = (num || '').replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    clean = clean.slice(2);
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  } else if (clean.length > 10) {
    clean = clean.slice(-10);
  }
  return clean;
}

async function dispatchFast2Sms(phone, message, apiKey) {
  const cleanPhone = sanitize10Digit(phone);
  if (cleanPhone.length !== 10) {
    return { success: false, reason: 'Invalid 10-digit number' };
  }

  // 1. Try POST with route 'q' (Direct wallet balance)
  try {
    const postRes = await fetch(FAST2SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message,
        numbers: cleanPhone
      })
    });
    const data = await postRes.json().catch(() => null);
    if (data && (data.return === true || data.status_code === 200)) {
      return { success: true, method: 'POST', data };
    }
  } catch (err) {
    console.warn(`Fast2SMS POST to ${cleanPhone} notice:`, err?.message);
  }

  // 2. Fallback GET
  try {
    const getUrl = `${FAST2SMS_ENDPOINT}?authorization=${encodeURIComponent(apiKey)}&route=q&message=${encodeURIComponent(message)}&language=english&flash=0&numbers=${cleanPhone}`;
    const getRes = await fetch(getUrl, { method: 'GET' });
    const getData = await getRes.json().catch(() => null);
    return {
      success: getData?.return === true || getData?.status_code === 200,
      method: 'GET',
      data: getData
    };
  } catch (err) {
    return { success: false, error: err?.message };
  }
}

export default async function handler(req, res) {
  // CORS configuration
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { booking } = body || {};

    if (!booking || !booking.id || !booking.customerPhone) {
      return res.status(400).json({ error: 'Missing booking details or customer phone' });
    }

    const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;
    const customerPhone = sanitize10Digit(booking.customerPhone);
    const adminPhone = ADMIN_PHONE_NUMBER;

    const cabClass = booking.cabClass || booking.cabName || 'Commercial Cab';
    const totalFare = booking.totalFare ?? (Number(booking.advancePaid || 0) + Number(booking.balanceDue || 0));
    const verifiedAdvance = booking.verifiedAdvance ?? booking.advancePaid ?? 0;
    const balance = booking.balance ?? booking.balanceDue ?? 0;
    const travelDateTime = booking.travelDateTime || `${booking.pickupDate} at ${booking.pickupTime}`;

    // 1. Customer Confirmation SMS (Clean, structured, NO OTP)
    const customerMessage = `SAFAR INDIA CABS — BOOKING CONFIRMED\nBooking ID: ${booking.id}\nDate/Time: ${travelDateTime}\nPickup: ${booking.pickupCity}\nDrop: ${booking.dropCity}\nCab Class: ${cabClass}\nTotal Fare: ₹${totalFare}\nAdvance Received: ₹${verifiedAdvance}\nBalance Payable: ₹${balance}\nHelpline: +917710080992`;

    // 2. Admin Alert SMS Template (Instant alert to +91 7710080992)
    const adminMessage = `🚨 NEW BOOKING ALERT — SAFAR INDIA CABS 🚨\nBooking ID: ${booking.id}\nCustomer Name: ${booking.customerName}\nPhone: +91${customerPhone}\nRoute: ${booking.pickupCity} -> ${booking.dropCity}\nCab: ${cabClass}\nDate/Time: ${travelDateTime}\nAdvance Paid: ₹${verifiedAdvance}\nBalance Due: ₹${balance}`;

    // Execute both SMS dispatches in parallel
    const [customerRes, adminRes] = await Promise.allSettled([
      dispatchFast2Sms(customerPhone, customerMessage, apiKey),
      dispatchFast2Sms(adminPhone, adminMessage, apiKey)
    ]);

    const customerResult = customerRes.status === 'fulfilled' ? customerRes.value : { success: false };
    const adminResult = adminRes.status === 'fulfilled' ? adminRes.value : { success: false };

    return res.status(200).json({
      success: true,
      message: 'Dual Fast2SMS notifications processed',
      bookingId: booking.id,
      customer: {
        phone: customerPhone,
        dispatched: customerResult.success,
        details: customerResult
      },
      admin: {
        phone: adminPhone,
        dispatched: adminResult.success,
        details: adminResult
      }
    });
  } catch (err) {
    console.error('Error in /api/send-booking-sms:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending notifications'
    });
  }
}
