/**
 * Vercel Serverless API Route: /api/booking-notifications
 * 
 * Automated Dual SMS Notification via Fast2SMS Gateway
 * 1. Customer Confirmation SMS with booking details & helpline
 * 2. Instant Admin New Booking Alert SMS to Safar India Fleet Manager (+91 7710080992)
 */

export const ADMIN_PHONE_NUMBER = '7710080992';
const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';
const DEFAULT_KEY = '6B8sTgArm4kSQUaZC9iNhVdFEf3IPlMqoRDeuYjwGHvtnpXW51IKdZWsjBgMr2wl54C0JOYh9nuiVxcz';

function sanitize10Digit(num: string): string {
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

async function dispatchFast2Sms(phone: string, message: string, apiKey: string) {
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
  } catch (err: any) {
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
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export default async function handler(req: any, res: any) {
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

    // 1. Customer Confirmation SMS
    const customerMessage = `Booking Confirmed! ID: ${booking.id}. Safar India Cabs: ${booking.cabName} from ${booking.pickupCity} to ${booking.dropCity} on ${booking.pickupDate} at ${booking.pickupTime}. Paid: Rs.${booking.advancePaid}. Bal: Rs.${booking.balanceDue}. Chauffeur details 2 hrs prior. Helpline: 7710080992`;

    // 2. Admin New Booking Alert SMS
    const adminMessage = `NEW BOOKING ALERT! ID: ${booking.id}. Customer: ${booking.customerName} (+91${customerPhone}). Route: ${booking.pickupCity} (${booking.pickupAddress || ''}) to ${booking.dropCity}. Cab: ${booking.cabName}. Date: ${booking.pickupDate} at ${booking.pickupTime}. Paid: Rs.${booking.advancePaid} (Txn: ${booking.transactionId || 'Razorpay'}). Bal: Rs.${booking.balanceDue}. Safar India Cabs`;

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
  } catch (err: any) {
    console.error('Error in /api/booking-notifications:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending notifications'
    });
  }
}
