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
    const verifiedAdvance = booking.paidAmount ?? booking.verifiedAdvance ?? booking.advancePaid ?? 0;
    const balance = booking.balanceAmount ?? booking.balance ?? booking.balanceDue ?? 0;
    const travelDateTime = booking.travelDateTime || `${booking.pickupDate} at ${booking.pickupTime}`;

    // 1. Send Booking Confirmation SMS to CUSTOMER:
    const customerMessage = `🎉 SAFAR INDIA CABS — BOOKING CONFIRMED\n\nBooking ID: ${booking.id}\nRoute: ${booking.pickupCity} to ${booking.dropCity}\nDate/Time: ${travelDateTime}\nCab Class: ${cabClass}\n\nTotal Fare: ₹${totalFare}\nAdvance Paid: ₹${verifiedAdvance}\nBalance Payable: ₹${balance}\n\nDriver and vehicle details will be shared shortly before pickup.\nHelpline: +917710080992\nThank you for choosing Safar India Cabs!`;

    // 2. Send Instant New Booking Alert SMS to ADMIN (+917710080992):
    const adminMessage = `🚨 NEW BOOKING ALERT — SAFAR INDIA CABS 🚨\n\nBooking ID: ${booking.id}\nCustomer: ${booking.customerName}\nPhone: +91${customerPhone}\n\nRoute: ${booking.pickupCity} -> ${booking.dropCity}\nDate/Time: ${travelDateTime}\nCab: ${cabClass}\n\nAdvance Paid: ₹${verifiedAdvance}\nBalance Due: ₹${balance}`;

    // Execute both Fast2SMS and Meta WhatsApp Cloud API dispatches in parallel
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '902764639583293';
    const waToken =
      process.env.WHATSAPP_ACCESS_TOKEN ||
      'EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD';
    const waApiUrl = `https://graph.facebook.com/v20.0/${waPhoneId}/messages`;

    const waCustomerMessage =
      `✅ *Booking Confirmed - Safar India Cabs*\n\n` +
      `Booking ID: #${String(booking.id).replace(/^#/, '')}\n` +
      `📍 Pickup: ${booking.pickupCity}\n` +
      `🏁 Drop: ${booking.dropCity}\n` +
      `💰 Fare: ₹${totalFare}\n\n` +
      `Driver and vehicle details will be shared shortly. Thank you for choosing us!`;

    const waAdminMessage =
      `🚨 *New Booking Alert! (Safar India Cabs)*\n\n` +
      `Booking ID: #${String(booking.id).replace(/^#/, '')}\n` +
      `👤 Customer: ${booking.customerName} (${customerPhone})\n` +
      `📍 Pickup: ${booking.pickupCity}\n` +
      `🏁 Drop: ${booking.dropCity}\n\n` +
      `Please assign a driver from the Owner Panel immediately.`;

    const sendWa = (toPhone, bodyText) =>
      fetch(waApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${waToken}`,
          'Content-Type': 'application/json; utf-8',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${toPhone}`,
          type: 'text',
          text: { preview_url: false, body: bodyText }
        })
      }).then(r => ({ success: r.status === 200 || r.status === 201 }));

    const [customerRes, adminRes, waCustomerRes, waAdminRes] = await Promise.allSettled([
      dispatchFast2Sms(customerPhone, customerMessage, apiKey),
      dispatchFast2Sms(adminPhone, adminMessage, apiKey),
      sendWa(customerPhone, waCustomerMessage),
      sendWa(adminPhone, waAdminMessage)
    ]);

    const customerResult = customerRes.status === 'fulfilled' ? customerRes.value : { success: false };
    const adminResult = adminRes.status === 'fulfilled' ? adminRes.value : { success: false };
    const waCustOk = waCustomerRes.status === 'fulfilled' && waCustomerRes.value?.success;
    const waAdmOk = waAdminRes.status === 'fulfilled' && waAdminRes.value?.success;

    return res.status(200).json({
      success: true,
      message: 'Dual Fast2SMS & Meta WhatsApp Cloud API notifications processed',
      bookingId: booking.id,
      customer: {
        phone: customerPhone,
        dispatched: customerResult.success || waCustOk,
        whatsappDispatched: waCustOk,
        details: customerResult
      },
      admin: {
        phone: adminPhone,
        dispatched: adminResult.success || waAdmOk,
        whatsappDispatched: waAdmOk,
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
