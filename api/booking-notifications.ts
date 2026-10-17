/**
 * Vercel Serverless API Route: /api/booking-notifications
 * 
 * Automated Dual SMS Notification via Traccar Cloud Gateway
 * 1. Customer Confirmation SMS with booking details & helpline
 * 2. Instant Admin New Booking Alert SMS to Safar India Fleet Manager (+91 7710080992)
 */

export const ADMIN_PHONE_NUMBER = '7710080992';
const TRACCAR_SMS_ENDPOINT = 'https://www.traccar.org/sms/';
const DEFAULT_TRACCAR_TOKEN =
  'f81x7L5jTmSJNsNrLn_vP9:APA91bEZh7cloIKBCB0sozFUOBiX9TvBGH_Osxi8dM-HdoGWmXIlYhmZbxnKizpCoDSII5t66VaGz6UVO2tno2UpqRXji0X4J3PWFDsrKiy2H9y_kSKJOV8';

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

async function dispatchTraccarSms(phone: string, message: string, token: string) {
  const cleanPhone = sanitize10Digit(phone);
  if (cleanPhone.length !== 10) {
    return { success: false, reason: 'Invalid 10-digit number' };
  }

  const recipient = `+91${cleanPhone}`;

  try {
    const res = await fetch(TRACCAR_SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        to: recipient,
        message
      })
    });

    const text = await res.text().catch(() => '');
    if (res.ok) {
      return { success: true, gateway: 'traccar_cloud', to: recipient, data: text };
    }
    return { success: false, status: res.status, error: text || `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export default async function handler(req: any, res: any) {
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

    const token = process.env.TRACCAR_SMS_TOKEN || DEFAULT_TRACCAR_TOKEN;
    const customerPhone = sanitize10Digit(booking.customerPhone);
    const adminPhone = ADMIN_PHONE_NUMBER;

    const travelDate = `${booking.pickupDate} at ${booking.pickupTime}`;

    // 1. Customer SMS Template (Clean and structured)
    const customerMessage = `🎉 SAFAR INDIA CABS - BOOKING CONFIRMED\n\nBooking ID: ${booking.id}\nCab: ${booking.cabName}\nRoute: ${booking.pickupCity} to ${booking.dropCity}\nDate/Time: ${travelDate}\n\nPaid Advance: Rs.${booking.advancePaid}\nBalance (Pay Driver): Rs.${booking.balanceDue}\n\nHelpline: +917710080992\nThank you for choosing Safar India Cabs!`;

    // 2. Admin Alert SMS Template (Clear New Booking Alert)
    const adminMessage = `🚨 NEW BOOKING ALERT! 🚨\n\nBooking ID: ${booking.id}\nCustomer Name: ${booking.customerName}\nPhone: +91${customerPhone}\n\nRoute: ${booking.pickupCity} -> ${booking.dropCity}\nCab Type: ${booking.cabName}\nTravel Date: ${travelDate}\n\nAdvance Paid: Rs.${booking.advancePaid}\nBalance Due: Rs.${booking.balanceDue}`;

    // Execute both SMS dispatches in parallel via Traccar Cloud Gateway
    const [customerRes, adminRes] = await Promise.allSettled([
      dispatchTraccarSms(customerPhone, customerMessage, token),
      dispatchTraccarSms(adminPhone, adminMessage, token)
    ]);

    const customerResult = customerRes.status === 'fulfilled' ? customerRes.value : { success: false };
    const adminResult = adminRes.status === 'fulfilled' ? adminRes.value : { success: false };

    return res.status(200).json({
      success: true,
      message: 'Dual Traccar Cloud SMS notifications processed',
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
