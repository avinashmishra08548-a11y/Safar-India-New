/**
 * Vercel Serverless API Route: /api/assign-driver
 * 
 * Automated Driver / Vehicle Assignment & Reassignment Notification to Customer Phone via Fast2SMS
 */

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
    const {
      customerPhone,
      customerName = 'Passenger',
      bookingId,
      pickup,
      drop,
      travelDate,
      travelDateTime,
      cabClass,
      cabName,
      balanceAmount,
      balanceDue,
      driverName,
      driverPhone,
      vehicleModel,
      vehicleNo,
      registrationNumber
    } = body || {};

    const cleanCustomerPhone = sanitize10Digit(customerPhone);
    if (!cleanCustomerPhone || cleanCustomerPhone.length !== 10) {
      return res.status(400).json({ error: 'Valid 10-digit customer phone required' });
    }

    const cleanDriverPhone = sanitize10Digit(driverPhone);
    const vehicle = vehicleModel || cabName || 'Cab';
    const regNo = (registrationNumber || vehicleNo || 'Assigned').toUpperCase();
    const dateFormatted = travelDateTime || travelDate || 'Scheduled Time';
    const cab = cabClass || cabName || 'Commercial Cab';
    const balance = balanceAmount ?? balanceDue ?? 0;

    const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;

    // 1. Send Pickup Alert SMS to DRIVER:
    const driverMessage = `🚖 SAFAR INDIA CABS — NEW PICKUP DUTY\n\nBooking ID: ${bookingId}\nCustomer: ${customerName}\nPhone: +91${cleanCustomerPhone}\n\nPickup: ${pickup}\nDrop: ${drop}\nDate/Time: ${dateFormatted}\nCab: ${cab}\n\nCollect Balance at Drop: ₹${balance}\nPlease contact customer promptly.`;

    // 2. Send Driver Details SMS to CUSTOMER:
    const customerMessage = `🚗 SAFAR INDIA CABS — DRIVER ASSIGNED\n\nBooking ID: ${bookingId}\nRoute: ${pickup} to ${drop}\nDate/Time: ${dateFormatted}\n\nDriver Name: ${driverName}\nDriver Phone: ${cleanDriverPhone ? `+91${cleanDriverPhone}` : driverPhone}\nVehicle: ${vehicle} (${regNo})\n\nDriver will contact you prior to pickup.\nHelpline: +917710080992`;

    // Meta WhatsApp Cloud API templates (4️⃣ Trip Details to Driver & 5️⃣ Driver Details to Customer)
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '902764639583293';
    const waToken =
      process.env.WHATSAPP_ACCESS_TOKEN ||
      'EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD';
    const waApiUrl = `https://graph.facebook.com/v20.0/${waPhoneId}/messages`;

    const cleanId = String(bookingId).replace(/^#/, '');

    const waCustomerMessage =
      `🚗 *Driver & Vehicle Assigned! - Safar India Cabs*\n\n` +
      `Hello *${customerName}*, your ride is ready. Here are your complete driver & vehicle details:\n\n` +
      `👨‍✈️ *Driver Name:* ${driverName}\n` +
      `📞 *Driver Contact:* +91 ${cleanDriverPhone || driverPhone}\n` +
      `🚙 *Vehicle Model:* ${vehicle}\n` +
      `🔢 *Vehicle Number:* ${regNo}\n\n` +
      `📋 *Trip Details:*\n` +
      `• Booking ID: *#${cleanId}*\n` +
      `• Route: *${pickup}* ➔ *${drop}*\n` +
      `• Date & Time: *${dateFormatted}*\n` +
      `• Balance Payable: *₹${balance}*\n\n` +
      `Your driver partner will contact you shortly before pickup.\n` +
      `📞 24/7 Helpline: +91 7710080992\n` +
      `Have a safe and happy journey with *Safar India Cabs*!`;

    const waDriverMessage =
      `🚖 *SafarIndiaCabs Driver Partner ${driverName}*\n\n` +
      `Your Pickup is confirmed! Please timely complete the trip.\n\n` +
      `📋 *Complete Trip Info:*\n` +
      `• Booking ID: *#${cleanId}*\n` +
      `• Customer Name: *${customerName}*\n` +
      `• Customer Mobile: *+91 ${cleanCustomerPhone}*\n` +
      `• Pickup Location: *${pickup}*\n` +
      `• Drop Location: *${drop}*\n` +
      `• Pickup Date & Time: *${dateFormatted}*\n` +
      `• Assigned Vehicle: *${vehicle} (${regNo})*\n` +
      `• Collect Balance at Drop: *₹${balance}*\n\n` +
      `Please contact the customer promptly and reach pickup on time. Drive safely!\n` +
      `📞 Dispatch Helpline: +91 7710080992`;

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

    // Dispatch both SMS and WhatsApp messages in parallel
    const dispatches = [
      dispatchFast2Sms(cleanCustomerPhone, customerMessage, apiKey),
      sendWa(cleanCustomerPhone, waCustomerMessage)
    ];

    if (cleanDriverPhone && cleanDriverPhone.length === 10) {
      dispatches.push(dispatchFast2Sms(cleanDriverPhone, driverMessage, apiKey));
      dispatches.push(sendWa(cleanDriverPhone, waDriverMessage));
    }

    const results = await Promise.allSettled(dispatches);
    const customerResult = results[0]?.status === 'fulfilled' ? results[0].value : { success: false };
    const waCustomerResult = results[1]?.status === 'fulfilled' ? results[1].value : { success: false };
    const driverResult = results[2]?.status === 'fulfilled' ? results[2].value : { success: false };
    const waDriverResult = results[3]?.status === 'fulfilled' ? results[3].value : { success: false };

    return res.status(200).json({
      success: customerResult.success || waCustomerResult.success || driverResult.success || waDriverResult.success,
      bookingId,
      customer: {
        phone: cleanCustomerPhone,
        dispatched: customerResult.success || waCustomerResult.success,
        whatsappDispatched: waCustomerResult.success,
        details: customerResult
      },
      driver: {
        phone: cleanDriverPhone,
        dispatched: driverResult.success || waDriverResult.success,
        whatsappDispatched: waDriverResult.success,
        details: driverResult
      }
    });
  } catch (err) {
    console.error('Error in /api/assign-driver:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending driver assignment SMS'
    });
  }
}
