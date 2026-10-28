/**
 * Vercel Serverless API Route: /api/send-booking-sms
 *
 * Automated Dual Booking Notification System:
 * 1. Customer Booking Confirmation (WhatsApp Template + Rich Text + Traccar SMS + Fast2SMS)
 * 2. Instant Admin New Booking Alert (+91 7710080992)
 */

import { sendWhatsAppCloudMessage } from './send-whatsapp.js';
import { dispatchTraccarSms } from './send-sms.js';

export const ADMIN_PHONE_NUMBER = '7710080992';
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

// Deduplication cache so server-side /api/verify-payment and client-side /api/send-booking-sms
// never send duplicate messages for the same booking ID + customer phone within 60 seconds
const RECENT_BOOKING_NOTIFICATIONS = new Map();

export async function dispatchBookingConfirmationNotifications(booking) {
  if (!booking || !booking.id || !booking.customerPhone) {
    return {
      success: false,
      error: 'Missing booking details or customer phone'
    };
  }

  const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;
  const customerPhone = sanitize10Digit(booking.customerPhone);
  const adminPhone = ADMIN_PHONE_NUMBER;
  const cleanId = String(booking.id).replace(/^#/, '').trim();
  const dedupeKey = `${cleanId}:${customerPhone}`;
  const now = Date.now();

  const existing = RECENT_BOOKING_NOTIFICATIONS.get(dedupeKey);
  if (existing && now - existing.sentAt < 60000 && existing.result?.customer?.whatsappDispatched) {
    return {
      ...existing.result,
      deduplicated: true
    };
  }

  const rawCabClass =
    booking.cabClass || booking.cabName || 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)';
  const cabClass = /^hatchback\s*ac$/i.test(String(rawCabClass).trim())
    ? 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)'
    : String(rawCabClass).replace(/^([^(]+)\([^)]*\)\s*\(([^)]+)\)$/, '$1($2)').trim();
  const totalFare =
    booking.totalFare ?? (Number(booking.advancePaid || 0) + Number(booking.balanceDue || 0));
  const verifiedAdvance =
    booking.paidAmount ?? booking.verifiedAdvance ?? booking.advancePaid ?? 0;
  const balance = booking.balanceAmount ?? booking.balance ?? booking.balanceDue ?? 0;
  const rawTravelDateTime =
    booking.travelDateTime || `${booking.pickupDate} at ${booking.pickupTime}`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const isoMatch = String(rawTravelDateTime)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*(?:at|@|·)?\s*(.+))?$/i);
  const travelDateTime = isoMatch
    ? `${parseInt(isoMatch[3], 10)} ${months[parseInt(isoMatch[2], 10) - 1] || isoMatch[2]} ${isoMatch[1]}${isoMatch[4] ? ` @ ${isoMatch[4].trim()}` : ''}`
    : String(rawTravelDateTime).replace(/\s+at\s+/i, ' @ ').trim();

  const formatAmt = (v) => {
    const n = Number(String(v ?? 0).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? Math.round(n).toLocaleString('en-IN') : '0';
  };

  const totalFareStr = formatAmt(totalFare);
  const advanceStr = formatAmt(verifiedAdvance);
  const balanceStr = formatAmt(balance);
  const customerName = (booking.customerName || 'Traveler').trim();
  const pickupCity = booking.pickupCity || booking.pickup || 'Pickup';
  const dropCity = booking.dropCity || booking.drop || 'Drop';

  // 1. SMS Templates
  const customerMessage = `🎉 SAFAR INDIA CABS — BOOKING CONFIRMED\n\nBooking ID: ${cleanId}\nRoute: ${pickupCity} to ${dropCity}\nDate/Time: ${travelDateTime}\nCab Class: ${cabClass}\n\nTotal Fare: ₹${totalFareStr}/-\nAdvance Paid: ₹${advanceStr}/-\nBalance Payable: ₹${balanceStr}/- (Parking Extra If Applicable)\n\nDriver and vehicle details will be shared shortly before pickup.\nHelpline: +917710080992\nThank you for choosing Safar India Cabs!`;

  const adminMessage = `🚨 NEW BOOKING ALERT — SAFAR INDIA CABS 🚨\n\nBooking ID: ${cleanId}\nCustomer: ${customerName}\nPhone: +91${customerPhone}\n\nRoute: ${pickupCity} -> ${dropCity}\nDate/Time: ${travelDateTime}\nCab: ${cabClass}\n\nAdvance Paid: ₹${advanceStr}/-\nBalance Due: ₹${balanceStr}/- (Parking Extra If Applicable)`;

  // 2. WhatsApp Rich Text Templates
  const waCustomerMessage = [
    `🚗 SAFARINDIACABS | BOOKING CONFIRMATION`,
    `Dear ${customerName},`,
    `Greetings from SafarIndiaCabs!`,
    `Your booking has been successfully confirmed. Please find your trip details below:`,
    `┌──────────────────────────┐`,
    `TRIP DETAILS`,
    `├──────────────────────────┤`,
    `• Booking ID: ${cleanId}`,
    `• Pickup Location: ${pickupCity}`,
    `• Drop Location: ${dropCity}`,
    `• Date & Time: ${travelDateTime}`,
    `• Cab Category: ${cabClass}`,
    `└──────────────────────────┘`,
    `💵 FARE & PAYMENT BREAKUP`,
    `• Total Fare: ₹${totalFareStr}/-`,
    `• Advance Paid: ₹${advanceStr}/-`,
    `• Balance Payable: ₹${balanceStr}/- (Payable to driver · Parking Extra If Applicable)`,
    ``,
    `📞 CUSTOMER SUPPORT`,
    `• Helpline: +91-7710080992`,
    `• Website: https://safarindiacabs.com`,
    ``,
    `We wish you a pleasant, safe, and comfortable journey! 🚖`
  ].join('\n');

  const waAdminMessage = [
    `🚨 SAFARINDIACABS | NEW BOOKING ALERT`,
    `┌──────────────────────────┐`,
    `TRIP DETAILS`,
    `├──────────────────────────┤`,
    `• Booking ID: ${cleanId}`,
    `• Customer: ${customerName} (+91 ${customerPhone})`,
    `• Pickup Location: ${pickupCity}`,
    ...(booking.pickupAddress ? [`• Pickup Address: ${booking.pickupAddress}`] : []),
    `• Drop Location: ${dropCity}`,
    `• Date & Time: ${travelDateTime}`,
    `• Cab Category: ${cabClass}`,
    `└──────────────────────────┘`,
    `💵 FARE & PAYMENT BREAKUP`,
    `• Total Fare: ₹${totalFareStr}/-`,
    `• Advance Paid: ₹${advanceStr}/-`,
    `• Balance Payable: ₹${balanceStr}/- (Parking Extra If Applicable)`,
    ``,
    `⚡ Please assign a driver from the Owner Panel.`
  ].join('\n');

  // 3. Official Meta WhatsApp Template Configurations (Matches APPROVED WABA 837811205522579 templates)
  const customerTemplateConfig = {
    name: 'safar_booking_confirmed_v1',
    language: 'en_US',
    recipientName: customerName,
    referenceId: cleanId,
    params: [
      customerName,
      cleanId,
      pickupCity,
      dropCity,
      travelDateTime,
      cabClass,
      `${totalFareStr}/-`,
      `${advanceStr}/-`,
      `${balanceStr}/- (Parking Extra If Applicable)`
    ],
    backups: [
      {
        name: 'safar_lib_order_confirmed',
        language: 'en_US',
        params: [
          customerName,
          `${cleanId} (${pickupCity} to ${dropCity} on ${travelDateTime}, Cab: ${cabClass})`
        ]
      },
      {
        name: 'safar_ride_update',
        language: 'en_US',
        params: [
          customerName,
          cleanId,
          `BOOKING CONFIRMED - Route: ${pickupCity} to ${dropCity} (${travelDateTime}) | Cab: ${cabClass} | Total: Rs.${totalFareStr}/- | Advance Paid: Rs.${advanceStr}/- | Balance: Rs.${balanceStr}/- (Parking Extra If Applicable)`
        ]
      },
      {
        name: 'safar_account_notice',
        language: 'en_US',
        params: [
          customerName,
          cleanId,
          `Confirmed Cab Booking (${pickupCity} to ${dropCity} on ${travelDateTime})`
        ]
      }
    ]
  };

  const adminTemplateConfig = {
    name: 'safar_admin_booking_alert_v1',
    language: 'en_US',
    recipientName: 'Fleet Admin',
    referenceId: cleanId,
    params: [
      cleanId,
      customerName,
      `+91 ${customerPhone}`,
      pickupCity,
      dropCity,
      travelDateTime,
      cabClass,
      totalFareStr,
      advanceStr,
      `${balanceStr} (Parking Extra If Applicable)`
    ],
    backups: [
      {
        name: 'safar_ride_update',
        language: 'en_US',
        params: [
          'Fleet Admin',
          cleanId,
          `NEW BOOKING - Customer: ${customerName} (+91 ${customerPhone}) | Route: ${pickupCity} to ${dropCity} (${travelDateTime}) | Cab: ${cabClass} | Total: Rs.${totalFareStr}/- | Advance: Rs.${advanceStr}/- | Balance: Rs.${balanceStr}/-`
        ]
      }
    ]
  };

  const [
    custFast2Sms,
    custTraccar,
    admFast2Sms,
    admTraccar,
    waCustomerRes,
    waAdminRes
  ] = await Promise.allSettled([
    dispatchFast2Sms(customerPhone, customerMessage, apiKey),
    dispatchTraccarSms(customerPhone, customerMessage),
    dispatchFast2Sms(adminPhone, adminMessage, apiKey),
    dispatchTraccarSms(adminPhone, adminMessage),
    sendWhatsAppCloudMessage(
      customerPhone,
      waCustomerMessage,
      null,
      null,
      customerTemplateConfig,
      { force: true }
    ),
    sendWhatsAppCloudMessage(
      adminPhone,
      waAdminMessage,
      null,
      null,
      adminTemplateConfig,
      { force: true }
    )
  ]);

  const customerSmsOk =
    (custFast2Sms.status === 'fulfilled' && Boolean(custFast2Sms.value?.success)) ||
    (custTraccar.status === 'fulfilled' && Boolean(custTraccar.value?.success));
  const adminSmsOk =
    (admFast2Sms.status === 'fulfilled' && Boolean(admFast2Sms.value?.success)) ||
    (admTraccar.status === 'fulfilled' && Boolean(admTraccar.value?.success));
  const waCustOk =
    waCustomerRes.status === 'fulfilled' && Boolean(waCustomerRes.value?.success);
  const waAdmOk = waAdminRes.status === 'fulfilled' && Boolean(waAdminRes.value?.success);

  const responsePayload = {
    success: true,
    message:
      'Multi-channel Meta WhatsApp (Template + Text), Traccar SMS & Fast2SMS notifications processed',
    bookingId: booking.id,
    customer: {
      phone: customerPhone,
      dispatched: customerSmsOk || waCustOk,
      smsDispatched: customerSmsOk,
      whatsappDispatched: waCustOk,
      templateName: waCustomerRes.status === 'fulfilled' ? waCustomerRes.value?.templateName : null
    },
    admin: {
      phone: adminPhone,
      dispatched: adminSmsOk || waAdmOk,
      smsDispatched: adminSmsOk,
      whatsappDispatched: waAdmOk,
      templateName: waAdminRes.status === 'fulfilled' ? waAdminRes.value?.templateName : null
    }
  };

  if (waCustOk) {
    RECENT_BOOKING_NOTIFICATIONS.set(dedupeKey, {
      sentAt: now,
      result: responsePayload
    });
  }

  return responsePayload;
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
    const booking = body?.booking || body;

    if (!booking || !booking.id || !booking.customerPhone) {
      return res.status(400).json({ error: 'Missing booking details or customer phone' });
    }

    const result = await dispatchBookingConfirmationNotifications(booking);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/send-booking-sms:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending notifications'
    });
  }
}
