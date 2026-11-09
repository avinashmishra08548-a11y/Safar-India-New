/**
 * Vercel Unified Serverless API Route: /api/send-booking-sms
 *
 * Consolidated Communications & Notification Hub (keeps Vercel Serverless Functions well under Hobby 12-function limit):
 * 1. /api/send-booking-sms & /api/booking-notifications — Customer Booking Confirmation + Admin Alert
 * 2. /api/assign-driver & /api/send-driver-sms — Driver Duty Allotment + Customer Driver Details
 * 3. /api/send-review-email — Automated Customer Review Email Alert (Resend + EmailJS + FormSubmit + Admin WhatsApp)
 * 4. /api/verify-otp — Server-Side OTP Generation & Verification (Meta WhatsApp Cloud API + Fast2SMS)
 */

import crypto from 'crypto';
import { sendWhatsAppCloudMessage } from './send-whatsapp.js';
import { dispatchTraccarSms } from './send-sms.js';

export const ADMIN_PHONE_NUMBER = '7710080992';
export const TARGET_REVIEW_EMAIL =
  process.env.REVIEW_ALERT_EMAIL || 'safarindiacabs01@gmail.com';
export const ADMIN_WHATSAPP_NUMBER = '7710080992';

const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';
const DEFAULT_KEY =
  '6B8sTgArm4kSQUaZC9iNhVdFEf3IPlMqoRDeuYjwGHvtnpXW51IKdZWsjBgMr2wl54C0JOYh9nuiVxcz';
const OTP_SECRET = process.env.OTP_SECRET || 'safar_india_cabs_secure_secret_2026_key';

function sanitize10Digit(num) {
  let clean = String(num || '').replace(/\D/g, '');
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

// ============================================================================
// 1. BOOKING CONFIRMATION NOTIFICATIONS (/api/send-booking-sms, /api/booking-notifications)
// ============================================================================
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

  const customerMessage = `🎉 SAFAR INDIA CABS — BOOKING CONFIRMED\n\nBooking ID: ${cleanId}\nRoute: ${pickupCity} to ${dropCity}\nDate/Time: ${travelDateTime}\nCab Class: ${cabClass}\n\nTotal Fare: ₹${totalFareStr}/-\nAdvance Paid: ₹${advanceStr}/-\nBalance Payable: ₹${balanceStr}/- (Parking Extra If Applicable)\n\nDriver and vehicle details will be shared shortly before pickup.\nHelpline: +917710080992\nThank you for choosing Safar India Cabs!`;

  const adminMessage = `🚨 NEW BOOKING ALERT — SAFAR INDIA CABS 🚨\n\nBooking ID: ${cleanId}\nCustomer: ${customerName}\nPhone: +91${customerPhone}\n\nRoute: ${pickupCity} -> ${dropCity}\nDate/Time: ${travelDateTime}\nCab: ${cabClass}\n\nAdvance Paid: ₹${advanceStr}/-\nBalance Due: ₹${balanceStr}/- (Parking Extra If Applicable)`;

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

  RECENT_BOOKING_NOTIFICATIONS.set(dedupeKey, {
    sentAt: now,
    result: {
      success: true,
      deduplicated: true,
      bookingId: booking.id,
      customer: { phone: customerPhone, dispatched: true, whatsappDispatched: true },
      admin: { phone: adminPhone, dispatched: true, whatsappDispatched: true }
    }
  });

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
    sendWhatsAppCloudMessage(
      adminPhone,
      waAdminMessage,
      null,
      null,
      adminTemplateConfig
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

  if (waCustOk || customerSmsOk) {
    RECENT_BOOKING_NOTIFICATIONS.set(dedupeKey, {
      sentAt: now,
      result: responsePayload
    });
  } else {
    RECENT_BOOKING_NOTIFICATIONS.delete(dedupeKey);
  }

  return responsePayload;
}

// ============================================================================
// 2. DRIVER ASSIGNMENT NOTIFICATIONS (/api/assign-driver, /api/send-driver-sms)
// ============================================================================
async function handleAssignDriverNotification(req, res, body) {
  try {
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
    const rawVehicleCategory =
      cabClass || cabName || vehicleModel || 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)';
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
    const isoMatch = String(rawDate)
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*(?:at|@|·)?\s*(.+))?$/i);
    const dateFormatted = isoMatch
      ? `${parseInt(isoMatch[3], 10)} ${months[parseInt(isoMatch[2], 10) - 1] || isoMatch[2]} ${isoMatch[1]}${isoMatch[4] ? ` @ ${isoMatch[4].trim()}` : ''}`
      : String(rawDate).replace(/\s+at\s+/i, ' @ ').trim();

    const balance = balanceAmount ?? balanceDue ?? 0;
    const balanceNum = Number(String(balance).replace(/[^0-9.-]/g, ''));
    const balanceFormatted = Number.isFinite(balanceNum)
      ? Math.round(balanceNum).toLocaleString('en-IN')
      : '0';
    const cleanId = String(bookingId || 'SIC').replace(/^#/, '').trim();
    const cleanDriverName = String(driverName || 'Driver Partner').trim().replace(/\s+ji$/i, '');

    const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;

    const driverMessage = `🚖 SAFAR INDIA CABS — NEW PICKUP DUTY\n\nBooking ID: ${cleanId}\nCustomer: ${customerName}\nPhone: +91${cleanCustomerPhone}\n\nPickup: ${pickup}\nDrop: ${drop}\nDate/Time: ${dateFormatted}\nCab: ${shortVehicle} (${regNo})\n\nCollect Balance at Drop: ₹${balanceFormatted}/-\nPlease contact customer promptly.`;

    const customerMessage = `🚗 SAFAR INDIA CABS — DRIVER ASSIGNED\n\nBooking ID: ${cleanId}\nRoute: ${pickup} to ${drop}\nDate/Time: ${dateFormatted}\n\nDriver Name: ${driverName}\nDriver Phone: ${cleanDriverPhone ? `+91${cleanDriverPhone}` : driverPhone}\nVehicle: ${shortVehicle} (${regNo})\n\nDriver will contact you prior to pickup.\nHelpline: +917710080992`;

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
    console.error('Error in handleAssignDriverNotification:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending driver assignment notifications'
    });
  }
}

// ============================================================================
// 3. REVIEW EMAIL ALERTS (/api/send-review-email)
// ============================================================================
function buildReviewEmailHtml({
  customerName,
  city,
  route,
  car,
  rating,
  reviewMessage,
  submittedAt
}) {
  const starsVisual =
    '★'.repeat(Number(rating) || 5) + '☆'.repeat(Math.max(0, 5 - (Number(rating) || 5)));
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
      <div style="background: #0f172a; color: #ffffff; padding: 20px 24px; border-bottom: 4px solid #fbbf24;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #fbbf24; font-weight: bold;">
          Safar India Cabs · Customer Feedback Alert
        </div>
        <h2 style="margin: 6px 0 0; font-size: 20px;">
          New ${rating}-Star Customer Review Submitted
        </h2>
      </div>
      <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px;">
          <div style="font-size: 18px; color: #d97706; font-weight: bold; letter-spacing: 2px;">
            ${starsVisual} <span style="font-size: 14px; color: #92400e; letter-spacing: normal;">(${rating} / 5 Stars)</span>
          </div>
          <p style="margin: 8px 0 0; font-style: italic; color: #0f172a; font-size: 15px;">
            "${reviewMessage}"
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 140px;"><strong>Customer Name:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>City:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${city}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>Trip Route:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${route}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>Cab Category:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #b45309; font-weight: bold;">${car || 'Sedan AC'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Submitted On:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;">${submittedAt}</td>
          </tr>
        </table>
      </div>
      <div style="background: #f8fafc; padding: 14px 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        Automated Review Alert sent to <strong>${TARGET_REVIEW_EMAIL}</strong> · Safar India Cabs (safarindiacabs.com)
      </div>
    </div>
  `;
}

async function handleSendReviewEmail(req, res, body) {
  try {
    const customerName = String(body.name || body.customerName || 'Verified Traveler').trim();
    const city = String(body.city || 'India').trim();
    const route = String(body.route || 'Outstation / Local Trip').trim();
    const car = String(body.car || 'Sedan AC (Dzire / Etios)').trim();
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const reviewMessage = String(body.review || body.reviewMessage || '').trim();
    const submittedAt =
      body.date ||
      new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });

    if (!reviewMessage) {
      return res.status(400).json({
        success: false,
        error: 'Review message is required.'
      });
    }

    const emailSubject = `★ New ${rating}-Star Review from ${customerName} (${city}) - Safar India Cabs`;
    const htmlContent = buildReviewEmailHtml({
      customerName,
      city,
      route,
      car,
      rating,
      reviewMessage,
      submittedAt
    });
    const plainTextContent = [
      `NEW CUSTOMER REVIEW - SAFAR INDIA CABS`,
      `Recipient: ${TARGET_REVIEW_EMAIL}`,
      `Customer Name: ${customerName}`,
      `City: ${city}`,
      `Route: ${route}`,
      `Cab: ${car}`,
      `Star Rating: ${rating} / 5 Stars`,
      `Review Message: "${reviewMessage}"`,
      `Submitted At: ${submittedAt}`
    ].join('\n');

    const deliveryAttempts = [];
    let deliveredProvider = null;
    let needsFormSubmitActivation = false;
    let activationMessage = '';

    // 1. RESEND API Integration
    const resendApiKey = (process.env.RESEND_API_KEY || body.resendApiKey || '').trim();
    if (resendApiKey && resendApiKey !== 'your_resend_api_key_here') {
      try {
        const resendFrom =
          process.env.RESEND_FROM_EMAIL || 'Safar India Cabs Reviews <onboarding@resend.dev>';
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: resendFrom,
            to: [TARGET_REVIEW_EMAIL],
            subject: emailSubject,
            html: htmlContent,
            text: plainTextContent
          })
        });
        const resendData = await resendRes.json().catch(() => null);
        if (resendRes.ok) {
          deliveredProvider = 'resend';
          deliveryAttempts.push({ provider: 'resend', success: true, id: resendData?.id });
        } else {
          deliveryAttempts.push({
            provider: 'resend',
            success: false,
            status: resendRes.status,
            error: resendData?.message || 'Resend API error'
          });
        }
      } catch (err) {
        deliveryAttempts.push({
          provider: 'resend',
          success: false,
          error: err?.message || 'Resend network error'
        });
      }
    }

    // 2. EMAILJS REST API Integration
    const emailJsServiceId = (
      process.env.EMAILJS_SERVICE_ID ||
      process.env.VITE_EMAILJS_SERVICE_ID ||
      body.emailJsServiceId ||
      ''
    ).trim();
    const emailJsTemplateId = (
      process.env.EMAILJS_TEMPLATE_ID ||
      process.env.VITE_EMAILJS_TEMPLATE_ID ||
      body.emailJsTemplateId ||
      ''
    ).trim();
    const emailJsPublicKey = (
      process.env.EMAILJS_PUBLIC_KEY ||
      process.env.VITE_EMAILJS_PUBLIC_KEY ||
      body.emailJsPublicKey ||
      ''
    ).trim();
    const emailJsPrivateKey = (
      process.env.EMAILJS_PRIVATE_KEY ||
      body.emailJsPrivateKey ||
      ''
    ).trim();

    if (
      !deliveredProvider &&
      emailJsServiceId &&
      emailJsTemplateId &&
      emailJsPublicKey &&
      emailJsServiceId !== 'your_emailjs_service_id'
    ) {
      try {
        const emailJsPayload = {
          service_id: emailJsServiceId,
          template_id: emailJsTemplateId,
          user_id: emailJsPublicKey,
          ...(emailJsPrivateKey ? { accessToken: emailJsPrivateKey } : {}),
          template_params: {
            to_email: TARGET_REVIEW_EMAIL,
            customer_name: customerName,
            from_name: customerName,
            city,
            route,
            car,
            star_rating: `${rating} / 5 Stars`,
            rating: String(rating),
            review_message: reviewMessage,
            message: reviewMessage,
            submitted_at: submittedAt,
            subject: emailSubject
          }
        };

        const ejsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: req.headers?.origin || 'https://safarindiacabs.com',
            Referer: req.headers?.referer || 'https://safarindiacabs.com/'
          },
          body: JSON.stringify(emailJsPayload)
        });
        if (ejsRes.ok) {
          deliveredProvider = 'emailjs';
          deliveryAttempts.push({ provider: 'emailjs', success: true });
        } else {
          const ejsText = await ejsRes.text().catch(() => '');
          deliveryAttempts.push({
            provider: 'emailjs',
            success: false,
            status: ejsRes.status,
            error: ejsText
          });
        }
      } catch (err) {
        deliveryAttempts.push({
          provider: 'emailjs',
          success: false,
          error: err?.message || 'EmailJS network error'
        });
      }
    }

    // 3. FormSubmit AJAX Relay
    if (!deliveredProvider) {
      try {
        const originUrl = req.headers?.origin || 'https://safarindiacabs.com';
        const refererUrl = req.headers?.referer || 'https://safarindiacabs.com/';
        const relayRes = await fetch(`https://formsubmit.co/ajax/${TARGET_REVIEW_EMAIL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Origin: originUrl,
            Referer: refererUrl,
            'User-Agent':
              req.headers?.['user-agent'] ||
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
          },
          body: JSON.stringify({
            _subject: emailSubject,
            _template: 'table',
            _captcha: 'false',
            Customer_Name: customerName,
            City: city,
            Route: route,
            Cab_Booked: car,
            Star_Rating: `${rating} / 5 Stars`,
            Review_Message: reviewMessage,
            Submitted_At: submittedAt
          })
        });
        const relayData = await relayRes.json().catch(() => null);
        const relaySuccess =
          relayRes.ok &&
          (relayData?.success === true || String(relayData?.success).toLowerCase() === 'true');
        const msgStr = String(relayData?.message || '');

        if (relaySuccess) {
          deliveredProvider = 'formsubmit_relay';
          deliveryAttempts.push({ provider: 'formsubmit_relay', success: true, data: relayData });
        } else {
          if (msgStr.toLowerCase().includes('activate') || msgStr.toLowerCase().includes('activation')) {
            needsFormSubmitActivation = true;
            activationMessage = msgStr;
          }
          deliveryAttempts.push({
            provider: 'formsubmit_relay',
            success: false,
            status: relayRes.status,
            message: msgStr,
            data: relayData
          });
        }
      } catch (err) {
        deliveryAttempts.push({
          provider: 'formsubmit_relay',
          success: false,
          error: err?.message || 'Relay network error'
        });
      }
    }

    // 4. Instant Admin WhatsApp Cloud API Notification to +91 7710080992
    let whatsappAlertSent = false;
    try {
      const waMessage = [
        `⭐ *NEW CUSTOMER REVIEW (${rating}/5 Stars)*`,
        `👤 *Name:* ${customerName}`,
        `📍 *City:* ${city}`,
        `🛣️ *Route:* ${route}`,
        `🚖 *Cab:* ${car}`,
        `💬 *Review:* "${reviewMessage}"`,
        `🕒 *Time:* ${submittedAt}`,
        `📧 *Email Target:* ${TARGET_REVIEW_EMAIL}`
      ].join('\n');

      const waRes = await sendWhatsAppCloudMessage(
        ADMIN_WHATSAPP_NUMBER,
        waMessage,
        undefined,
        undefined,
        {
          recipientName: customerName,
          referenceId: `REVIEW-${rating}STAR`
        }
      );
      whatsappAlertSent = Boolean(waRes?.success);
    } catch {
      // ignore WhatsApp error
    }

    return res.status(200).json({
      success: Boolean(deliveredProvider),
      recipient: TARGET_REVIEW_EMAIL,
      provider: deliveredProvider,
      needsFormSubmitActivation,
      activationMessage,
      whatsappAlertSent,
      attempts: deliveryAttempts
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch review email alert'
    });
  }
}

// ============================================================================
// 4. SERVER-SIDE OTP GENERATION & VERIFICATION (/api/verify-otp)
// ============================================================================
function generateOtpSignature(phone, otp, expiresAt) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${phone}:${otp}:${expiresAt}`)
    .digest('hex');
}

async function dispatchOtpViaWhatsApp(clean10DigitPhone, otp, customerName = 'Traveler', force = false) {
  const waMessage =
    `🔐 *Safar India Cabs Verification*\n\n` +
    `Your login OTP is: *${otp}*\n` +
    `Valid for 10 minutes. Do not share this with anyone.`;

  return sendWhatsAppCloudMessage(
    clean10DigitPhone,
    waMessage,
    null,
    null,
    {
      name: 'safar_booking_pin_update',
      language: 'en_US',
      recipientName: customerName || 'Traveler',
      referenceId: otp,
      params: [customerName || 'Traveler', otp],
      backups: [
        {
          name: 'safar_account_notice',
          language: 'en_US',
          params: [customerName || 'Traveler', otp, 'instant account login']
        },
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            customerName || 'Traveler',
            `OTP-${otp}`,
            `Your Safar India Cabs verification code is ${otp}. Valid for 10 minutes.`
          ]
        }
      ]
    },
    { force }
  );
}

async function dispatchOtpViaFast2Sms(phone, otp, apiKey) {
  try {
    const postRes = await fetch(FAST2SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone
      })
    });
    const data = await postRes.json().catch(() => null);
    if (data && (data.return === true || data.status_code === 200)) {
      return { success: true, route: 'otp' };
    }
  } catch (err) {
    console.warn('Fast2SMS route otp notice:', err?.message);
  }

  const message = `Your Safar India Cabs verification code is ${otp}. Valid for 10 minutes. Do not share with anyone.`;
  try {
    const qRes = await fetch(FAST2SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message,
        numbers: phone
      })
    });
    const qData = await qRes.json().catch(() => null);
    if (qData && (qData.return === true || qData.status_code === 200)) {
      return { success: true, route: 'q' };
    }
  } catch (err) {
    console.warn('Fast2SMS route q POST notice:', err?.message);
  }

  return { success: false };
}

const ACTIVE_OTP_CACHE = new Map();

async function handleVerifyOtp(req, res, body) {
  try {
    const { action, phone, otp, token, name, forceNew } = body || {};

    const cleanPhone = sanitize10Digit(phone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res
        .status(400)
        .json({ success: false, error: 'Valid 10-digit Indian WhatsApp number required' });
    }

    const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;

    if (action === 'send') {
      const existing = ACTIVE_OTP_CACHE.get(cleanPhone);
      const now = Date.now();

      const minCooldownMs = forceNew ? 25000 : 60000;
      if (
        existing &&
        existing.expiresAt > now + 60 * 1000 &&
        existing.lastSentAt &&
        now - existing.lastSentAt < minCooldownMs
      ) {
        return res.status(200).json({
          success: true,
          deduplicated: true,
          message: `OTP sent to your WhatsApp (+91 ${cleanPhone})`,
          token: existing.token,
          expiresAt: existing.expiresAt,
          waDelivered: true,
          delivered: true
        });
      }

      let generatedOtp;
      let expiresAt;
      let sessionToken;
      let createdAt = now;

      if (
        existing &&
        existing.expiresAt > now + 2 * 60 * 1000 &&
        now - existing.createdAt < 5 * 60 * 1000
      ) {
        generatedOtp = existing.otp;
        expiresAt = existing.expiresAt;
        sessionToken = existing.token;
        createdAt = existing.createdAt;
      } else {
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        expiresAt = now + 10 * 60 * 1000;
        const signature = generateOtpSignature(cleanPhone, generatedOtp, expiresAt);
        sessionToken = `${signature}.${expiresAt}.${cleanPhone}`;
      }

      ACTIVE_OTP_CACHE.set(cleanPhone, {
        otp: generatedOtp,
        expiresAt,
        token: sessionToken,
        createdAt,
        lastSentAt: now
      });

      const [waResult, fast2smsResult] = await Promise.allSettled([
        dispatchOtpViaWhatsApp(cleanPhone, generatedOtp, name || 'Traveler', Boolean(forceNew)),
        dispatchOtpViaFast2Sms(cleanPhone, generatedOtp, apiKey)
      ]);

      const fast2smsOk =
        fast2smsResult.status === 'fulfilled' && Boolean(fast2smsResult.value?.success);
      const waDelivered = waResult.status === 'fulfilled' && Boolean(waResult.value?.success);
      const waTemplateDelivered =
        waResult.status === 'fulfilled' && Boolean(waResult.value?.templateDispatched);

      return res.status(200).json({
        success: true,
        message: `OTP sent to your WhatsApp (+91 ${cleanPhone})`,
        token: sessionToken,
        expiresAt,
        waDelivered,
        waTemplateDelivered,
        smsDelivered: fast2smsOk,
        delivered: waDelivered || fast2smsOk
      });
    }

    if (action === 'verify') {
      const inputCleanOtp = String(otp || '').replace(/\D/g, '').trim();
      if (inputCleanOtp.length !== 4) {
        return res
          .status(400)
          .json({ success: false, error: 'Please enter the 4-digit OTP received on your WhatsApp' });
      }

      const cached = ACTIVE_OTP_CACHE.get(cleanPhone);
      if (cached && Date.now() <= cached.expiresAt && cached.otp === inputCleanOtp) {
        ACTIVE_OTP_CACHE.delete(cleanPhone);
        return res.status(200).json({
          success: true,
          verified: true,
          message: 'WhatsApp number successfully verified'
        });
      }

      if (!token || typeof token !== 'string' || !token.includes('.')) {
        return res.status(400).json({
          success: false,
          error: 'OTP session expired or not requested yet. Please click "Get OTP on WhatsApp" first.'
        });
      }

      const parts = token.split('.');
      const expectedSignature = parts[0];
      const expiresAt = Number(parts[1]);
      const tokenPhone = parts[2];

      if (tokenPhone !== cleanPhone) {
        return res
          .status(400)
          .json({ success: false, error: 'Phone number changed. Please click "Get OTP on WhatsApp" for this number.' });
      }

      if (Date.now() > expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Verification code has expired. Please click "Resend OTP".'
        });
      }

      const calculatedSignature = generateOtpSignature(cleanPhone, inputCleanOtp, expiresAt);

      if (calculatedSignature !== expectedSignature) {
        return res.status(400).json({
          success: false,
          error: 'Incorrect OTP. Please enter the 4-digit OTP sent to your WhatsApp.'
        });
      }

      ACTIVE_OTP_CACHE.delete(cleanPhone);
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'WhatsApp number successfully verified'
      });
    }

    return res
      .status(400)
      .json({ success: false, error: 'Invalid action. Supported actions: send, verify' });
  } catch (err) {
    console.error('Error in handleVerifyOtp:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error during verification'
    });
  }
}

// ============================================================================
// UNIFIED SERVERLESS ROUTE HANDLER
// ============================================================================
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
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const reqUrl = String(req.url || '');
    const queryEndpoint = String(req.query?.endpoint || body?.endpoint || '').toLowerCase();

    // 1. Route to OTP verification (/api/verify-otp)
    if (
      reqUrl.includes('/verify-otp') ||
      queryEndpoint === 'verify-otp' ||
      body.action === 'send' ||
      body.action === 'verify'
    ) {
      return await handleVerifyOtp(req, res, body);
    }

    // 2. Route to Driver Assignment (/api/assign-driver, /api/send-driver-sms)
    if (
      reqUrl.includes('/assign-driver') ||
      reqUrl.includes('/send-driver-sms') ||
      queryEndpoint === 'assign-driver' ||
      queryEndpoint === 'send-driver-sms' ||
      Boolean(body.driverName || body.driverPhone || body.registrationNumber || body.vehicleNo)
    ) {
      return await handleAssignDriverNotification(req, res, body);
    }

    // 3. Route to Review Email Alert (/api/send-review-email)
    if (
      reqUrl.includes('/send-review-email') ||
      queryEndpoint === 'send-review-email' ||
      Boolean(body.review || body.reviewMessage)
    ) {
      return await handleSendReviewEmail(req, res, body);
    }

    // 4. Default: Booking Confirmation Notification (/api/send-booking-sms, /api/booking-notifications)
    const booking = body?.booking || body;

    if (!booking || !booking.id || !booking.customerPhone) {
      return res.status(400).json({ error: 'Missing booking details or customer phone' });
    }

    const result = await dispatchBookingConfirmationNotifications(booking);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/send-booking-sms unified handler:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while sending notifications'
    });
  }
}

