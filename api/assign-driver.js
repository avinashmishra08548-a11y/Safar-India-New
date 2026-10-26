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
    const rawVehicleCategory = cabClass || cabName || vehicleModel || 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)';
    const vehicleCategoryFull = /^hatchback\s*ac$/i.test(String(rawVehicleCategory).trim())
      ? 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)'
      : String(rawVehicleCategory).replace(/^([^(]+)\([^)]*\)\s*\(([^)]+)\)$/, '$1($2)').trim();
    const shortVehicle =
      String(vehicleModel || cabClass || cabName || 'Hatchback AC')
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim() || 'Hatchback AC';
    const regNo = String(registrationNumber || vehicleNo || 'Assigned').trim().toUpperCase();
    const rawDate = travelDateTime || travelDate || 'Scheduled Time';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const isoMatch = String(rawDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*(?:at|@|·)?\s*(.+))?$/i);
    const dateFormatted = isoMatch
      ? `${parseInt(isoMatch[3], 10)} ${months[parseInt(isoMatch[2], 10) - 1] || isoMatch[2]} ${isoMatch[1]}${isoMatch[4] ? ` @ ${isoMatch[4].trim()}` : ''}`
      : String(rawDate).replace(/\s+at\s+/i, ' @ ').trim();

    const balance = balanceAmount ?? balanceDue ?? 0;
    const balanceNum = Number(String(balance).replace(/[^0-9.-]/g, ''));
    const balanceFormatted = Number.isFinite(balanceNum) ? Math.round(balanceNum).toLocaleString('en-IN') : '0';
    const cleanId = String(bookingId || 'SIC').replace(/^#/, '').trim();
    const cleanDriverName = String(driverName || 'Driver Partner').trim().replace(/\s+ji$/i, '');

    const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;

    // 1. SMS Templates for Driver & Customer
    const driverMessage = `🚖 SAFAR INDIA CABS — NEW PICKUP DUTY\n\nBooking ID: ${cleanId}\nCustomer: ${customerName}\nPhone: +91${cleanCustomerPhone}\n\nPickup: ${pickup}\nDrop: ${drop}\nDate/Time: ${dateFormatted}\nCab: ${shortVehicle} (${regNo})\n\nCollect Balance at Drop: ₹${balanceFormatted}/-\nPlease contact customer promptly.`;

    const customerMessage = `🚗 SAFAR INDIA CABS — DRIVER ASSIGNED\n\nBooking ID: ${cleanId}\nRoute: ${pickup} to ${drop}\nDate/Time: ${dateFormatted}\n\nDriver Name: ${driverName}\nDriver Phone: ${cleanDriverPhone ? `+91${cleanDriverPhone}` : driverPhone}\nVehicle: ${shortVehicle} (${regNo})\n\nDriver will contact you prior to pickup.\nHelpline: +917710080992`;

    // 2. WhatsApp Rich Text Templates for Customer & Driver (Box-Drawing Design)
    const waCustomerMessage = [
      `👨‍✈️ SAFARINDIACABS | DRIVER ALLOTMENT`,
      ``,
      `Dear ${String(customerName || 'Traveler').trim()},`,
      ``,
      `Greetings from SafarIndiaCabs!`,
      `Your driver and vehicle have been assigned for your upcoming trip. Details below:`,
      ``,
      `┌──────────────────────────┐`,
      `TRIP SUMMARY`,
      `├──────────────────────────┤`,
      `• Booking ID: ${cleanId}`,
      `• Route: ${pickup} to ${drop}`,
      `• Pickup Date & Time: ${dateFormatted}`,
      `└──────────────────────────┘`,
      ``,
      `🚗 DRIVER & VEHICLE DETAILS`,
      `• Driver Name: ${String(driverName || 'Assigned Driver').trim()}`,
      `• Driver Contact: +91 ${cleanDriverPhone || driverPhone}`,
      `• Vehicle Category: ${vehicleCategoryFull}`,
      `• Vehicle Number: ${regNo}`,
      ``,
      `Have a safe, comfortable, and pleasant journey! 🚖`
    ].join('\n');

    const waDriverMessage = [
      `🚖 SAFARINDIACABS | DRIVER DUTY ALLOTMENT`,
      ``,
      `Dear ${cleanDriverName} ji,`,
      ``,
      `Your pickup duty has been confirmed by SafarIndiaCabs. Details are given below:`,
      ``,
      `┌──────────────────────────┐`,
      `TRIP DETAILS`,
      `├──────────────────────────┤`,
      `• Booking ID: ${cleanId}`,
      `• Customer Name: ${String(customerName || 'Customer').trim()}`,
      `• Customer Mobile: +91 ${cleanCustomerPhone}`,
      `• Pickup Location: ${pickup}`,
      `• Drop Location: ${drop}`,
      `• Date & Time: ${dateFormatted}`,
      `• Vehicle: ${shortVehicle} (${regNo})`,
      `└──────────────────────────┘`,
      ``,
      `💵 PAYMENT COLLECTION`,
      `• Collect Balance: ₹${balanceFormatted}/- (Collect from customer)`,
      ``,
      `📌 Important Instructions:`,
      `Call the customer immediately and reach the pickup location before time. Keep the vehicle clean and strictly follow the non-smoking/non-drinking policy.`,
      ``,
      `📞 HELP & SUPPORT`,
      `• Helpline: +91-7710080992`,
      `• Website: https://safarindiacabs.com`
    ].join('\n');

    // 3. Official Meta WhatsApp Template Configurations
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
        vehicleCategoryFull,
        regNo,
        pickup,
        drop,
        dateFormatted,
        `₹${balanceFormatted}/-`
      ],
      backups: [
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            customerName,
            cleanId,
            `DRIVER ALLOTMENT - Driver: ${driverName} (+91 ${cleanDriverPhone || driverPhone}) | Vehicle: ${vehicleCategoryFull} (${regNo}) | Route: ${pickup} to ${drop} (${dateFormatted})`
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
        `${shortVehicle} (${regNo})`,
        `₹${balanceFormatted}/-`
      ],
      backups: [
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            driverName || 'Driver Partner',
            cleanId,
            `DRIVER DUTY ALLOTMENT - Customer: ${customerName} (+91 ${cleanCustomerPhone}) | Pickup: ${pickup} to ${drop} (${dateFormatted}) | Vehicle: ${shortVehicle} (${regNo}) | Collect Balance: ₹${balanceFormatted}/-`
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
