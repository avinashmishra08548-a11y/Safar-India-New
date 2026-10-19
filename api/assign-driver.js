/**
 * Vercel Serverless API Route: /api/assign-driver
 *
 * Automated Driver / Vehicle Assignment & Reassignment Notification to BOTH:
 * 1. Driver Partner Phone (Pickup Duty Details)
 * 2. Customer Phone (Assigned Driver & Vehicle Details)
 *
 * Dispatches simultaneously via:
 * - Meta WhatsApp Cloud API (Official Template + Rich Text via /api/send-whatsapp — works without prior chat)
 * - Traccar SMS Gateway (Local Android Gateway + Cloud FCM Fallback via /api/send-sms)
 * - Fast2SMS Gateway (Direct Wallet POST + GET Fallback)
 */

import { sendWhatsAppCloudMessage } from './send-whatsapp.js';
import { dispatchTraccarSms } from './send-sms.js';

const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';
const DEFAULT_KEY =
  '6B8sTgArm4kSQUaZC9iNhVdFEf3IPlMqoRDeuYjwGHvtnpXW51IKdZWsjBgMr2wl54C0JOYh9nuiVxcz';

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
        authorization: apiKey,
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
    const cleanId = String(bookingId || 'SIC').replace(/^#/, '');

    const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;

    // 1. SMS Templates for Driver & Customer
    const driverMessage = `🚖 SAFAR INDIA CABS — NEW PICKUP DUTY\n\nBooking ID: #${cleanId}\nCustomer: ${customerName}\nPhone: +91${cleanCustomerPhone}\n\nPickup: ${pickup}\nDrop: ${drop}\nDate/Time: ${dateFormatted}\nCab: ${cab} (${regNo})\n\nCollect Balance at Drop: ₹${balance}\nPlease contact customer promptly.`;

    const customerMessage = `🚗 SAFAR INDIA CABS — DRIVER ASSIGNED\n\nBooking ID: #${cleanId}\nRoute: ${pickup} to ${drop}\nDate/Time: ${dateFormatted}\n\nDriver Name: ${driverName}\nDriver Phone: ${cleanDriverPhone ? `+91${cleanDriverPhone}` : driverPhone}\nVehicle: ${vehicle} (${regNo})\n\nDriver will contact you prior to pickup.\nHelpline: +917710080992`;

    // 2. WhatsApp Rich Text Templates for Customer & Driver
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

    // 3. Official Meta WhatsApp Template Configurations (deliver outside 24h chat window without needing "Hi/Hello")
    const customerTemplateConfig = {
      name: 'safar_customer_driver_details',
      language: 'en_US',
      recipientName: customerName,
      referenceId: cleanId,
      params: [
        customerName,
        cleanId,
        driverName || 'Assigned Driver',
        `+91 ${cleanDriverPhone || driverPhone}`,
        vehicle,
        regNo,
        pickup,
        drop,
        dateFormatted,
        String(balance)
      ],
      backups: [
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            customerName,
            cleanId,
            `Driver: ${driverName} (+91 ${cleanDriverPhone || driverPhone}) | Vehicle: ${vehicle} (${regNo}) | Route: ${pickup} to ${drop} on ${dateFormatted} | Balance: Rs. ${balance}`
          ]
        }
      ]
    };

    const driverTemplateConfig = {
      name: 'safar_driver_pickup_details',
      language: 'en_US',
      recipientName: driverName || 'Driver Partner',
      referenceId: cleanId,
      params: [
        driverName || 'Driver Partner',
        cleanId,
        customerName,
        `+91 ${cleanCustomerPhone}`,
        pickup,
        drop,
        dateFormatted,
        `${vehicle} (${regNo})`,
        String(balance)
      ],
      backups: [
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            driverName || 'Driver Partner',
            cleanId,
            `NEW PICKUP DUTY - Customer: ${customerName} (+91 ${cleanCustomerPhone}) | Pickup: ${pickup} to ${drop} on ${dateFormatted} | Vehicle: ${vehicle} (${regNo}) | Collect Balance: Rs. ${balance}`
          ]
        }
      ]
    };

    // Dispatch all channels for Customer and Driver in parallel
    const dispatches = [
      dispatchFast2Sms(cleanCustomerPhone, customerMessage, apiKey),
      dispatchTraccarSms(cleanCustomerPhone, customerMessage),
      sendWhatsAppCloudMessage(
        cleanCustomerPhone,
        waCustomerMessage,
        null,
        null,
        customerTemplateConfig
      )
    ];

    if (cleanDriverPhone && cleanDriverPhone.length === 10) {
      dispatches.push(dispatchFast2Sms(cleanDriverPhone, driverMessage, apiKey));
      dispatches.push(dispatchTraccarSms(cleanDriverPhone, driverMessage));
      dispatches.push(
        sendWhatsAppCloudMessage(
          cleanDriverPhone,
          waDriverMessage,
          null,
          null,
          driverTemplateConfig
        )
      );
    }

    const results = await Promise.allSettled(dispatches);
    const custFast2Sms =
      results[0]?.status === 'fulfilled' ? results[0].value : { success: false };
    const custTraccar =
      results[1]?.status === 'fulfilled' ? results[1].value : { success: false };
    const waCustomerResult =
      results[2]?.status === 'fulfilled' ? results[2].value : { success: false };

    const drvFast2Sms =
      results[3]?.status === 'fulfilled' ? results[3].value : { success: false };
    const drvTraccar =
      results[4]?.status === 'fulfilled' ? results[4].value : { success: false };
    const waDriverResult =
      results[5]?.status === 'fulfilled' ? results[5].value : { success: false };

    const customerSmsOk = Boolean(custFast2Sms.success || custTraccar.success);
    const driverSmsOk = Boolean(drvFast2Sms.success || drvTraccar.success);

    return res.status(200).json({
      success:
        customerSmsOk ||
        waCustomerResult.success ||
        driverSmsOk ||
        waDriverResult.success,
      bookingId,
      customer: {
        phone: cleanCustomerPhone,
        dispatched: customerSmsOk || waCustomerResult.success,
        smsDispatched: customerSmsOk,
        whatsappDispatched: Boolean(waCustomerResult.success),
        whatsappTemplateDispatched: Boolean(waCustomerResult.templateDispatched),
        details: custTraccar.success ? custTraccar : custFast2Sms
      },
      driver: {
        phone: cleanDriverPhone,
        dispatched: driverSmsOk || waDriverResult.success,
        smsDispatched: driverSmsOk,
        whatsappDispatched: Boolean(waDriverResult.success),
        whatsappTemplateDispatched: Boolean(waDriverResult.templateDispatched),
        details: drvTraccar.success ? drvTraccar : drvFast2Sms
      }
    });
  } catch (err) {
    console.error('Error in /api/assign-driver:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending driver assignment notifications'
    });
  }
}
