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
    const { booking } = body || {};

    if (!booking || !booking.id || !booking.customerPhone) {
      return res.status(400).json({ error: 'Missing booking details or customer phone' });
    }

    const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;
    const customerPhone = sanitize10Digit(booking.customerPhone);
    const adminPhone = ADMIN_PHONE_NUMBER;

    const cabClass = booking.cabClass || booking.cabName || 'Commercial Cab';
    const totalFare =
      booking.totalFare ?? (Number(booking.advancePaid || 0) + Number(booking.balanceDue || 0));
    const verifiedAdvance =
      booking.paidAmount ?? booking.verifiedAdvance ?? booking.advancePaid ?? 0;
    const balance = booking.balanceAmount ?? booking.balance ?? booking.balanceDue ?? 0;
    const travelDateTime =
      booking.travelDateTime || `${booking.pickupDate} at ${booking.pickupTime}`;
    const cleanId = String(booking.id).replace(/^#/, '');
    const customerName = booking.customerName || 'Traveler';

    // 1. SMS Templates
    const customerMessage = `🎉 SAFAR INDIA CABS — BOOKING CONFIRMED\n\nBooking ID: #${cleanId}\nRoute: ${booking.pickupCity} to ${booking.dropCity}\nDate/Time: ${travelDateTime}\nCab Class: ${cabClass}\n\nTotal Fare: ₹${totalFare}\nAdvance Paid: ₹${verifiedAdvance}\nBalance Payable: ₹${balance}\n\nDriver and vehicle details will be shared shortly before pickup.\nHelpline: +917710080992\nThank you for choosing Safar India Cabs!`;

    const adminMessage = `🚨 NEW BOOKING ALERT — SAFAR INDIA CABS 🚨\n\nBooking ID: #${cleanId}\nCustomer: ${customerName}\nPhone: +91${customerPhone}\n\nRoute: ${booking.pickupCity} -> ${booking.dropCity}\nDate/Time: ${travelDateTime}\nCab: ${cabClass}\n\nAdvance Paid: ₹${verifiedAdvance}\nBalance Due: ₹${balance}`;

    // 2. WhatsApp Rich Text Templates
    const addressLine = booking.pickupAddress ? `🏠 Pickup Address: ${booking.pickupAddress}\n` : '';

    const waCustomerMessage =
      `✅ *Booking Confirmed - Safar India Cabs*\n\n` +
      `Hello *${customerName}*, your cab booking is confirmed!\n\n` +
      `📋 *Complete Booking Details:*\n` +
      `• Booking ID: *#${cleanId}*\n` +
      `📍 Pickup: *${booking.pickupCity}*\n` +
      `🏁 Drop: *${booking.dropCity}*\n` +
      `🗓️ Date & Time: *${travelDateTime}*\n` +
      `🚕 Cab Category: *${cabClass}*\n` +
      addressLine +
      `\n💰 *Fare Breakdown:*\n` +
      `• Total Fare: *₹${totalFare}*\n` +
      `✅ Advance Paid: *₹${verifiedAdvance}*\n` +
      `💵 Balance Payable at Trip: *₹${balance}*\n\n` +
      `🚗 Driver and vehicle details will be shared on your WhatsApp shortly before pickup.\n` +
      `📞 24/7 Helpline: +91 7710080992\n` +
      `Thank you for choosing *Safar India Cabs*!`;

    const waAdminMessage =
      `🚨 *New Booking Alert! (Safar India Cabs)*\n\n` +
      `Booking ID: *#${cleanId}*\n` +
      `👤 Customer: *${customerName}* (+91 ${customerPhone})\n` +
      `📍 Pickup: *${booking.pickupCity}*\n` +
      `🏁 Drop: *${booking.dropCity}*\n` +
      addressLine +
      `🗓️ Date & Time: *${travelDateTime}*\n` +
      `🚕 Cab Booked: *${cabClass}*\n` +
      `💰 Total Fare: *₹${totalFare}*\n` +
      `✅ Advance Paid: *₹${verifiedAdvance}*\n` +
      `💵 Balance Due: *₹${balance}*\n\n` +
      `⚡ Booking has been updated in the Owner Panel. Please assign a driver from the Owner Panel immediately.`;

    // 3. Official Meta WhatsApp Template Configurations
    const customerTemplateConfig = {
      name: 'safar_booking_confirmed_v1',
      language: 'en_US',
      recipientName: customerName,
      referenceId: cleanId,
      params: [
        customerName,
        cleanId,
        booking.pickupCity,
        booking.dropCity,
        travelDateTime,
        cabClass,
        String(totalFare),
        String(verifiedAdvance),
        String(balance)
      ],
      backups: [
        {
          name: 'safar_lib_order_confirmed',
          language: 'en_US',
          params: [
            customerName,
            `#${cleanId} (${booking.pickupCity} to ${booking.dropCity} on ${travelDateTime}, Cab: ${cabClass})`
          ]
        },
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            customerName,
            cleanId,
            `Route: ${booking.pickupCity} to ${booking.dropCity} on ${travelDateTime} | Cab: ${cabClass} | Total: Rs. ${totalFare} (Paid: Rs. ${verifiedAdvance}, Balance: Rs. ${balance})`
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
        booking.pickupCity,
        booking.dropCity,
        travelDateTime,
        cabClass,
        String(totalFare),
        String(verifiedAdvance),
        String(balance)
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
        customerTemplateConfig
      ),
      sendWhatsAppCloudMessage(adminPhone, waAdminMessage, null, null, adminTemplateConfig)
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

    return res.status(200).json({
      success: true,
      message:
        'Multi-channel Meta WhatsApp (Template + Text), Traccar SMS & Fast2SMS notifications processed',
      bookingId: booking.id,
      customer: {
        phone: customerPhone,
        dispatched: customerSmsOk || waCustOk,
        smsDispatched: customerSmsOk,
        whatsappDispatched: waCustOk
      },
      admin: {
        phone: adminPhone,
        dispatched: adminSmsOk || waAdmOk,
        smsDispatched: adminSmsOk,
        whatsappDispatched: waAdmOk
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
