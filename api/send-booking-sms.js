/**
 * Vercel Serverless API Route: /api/send-booking-sms
 * 
 * Automated Dual Traccar SMS Dispatch (Local Service Primary + Cloud Fallback):
 * 1. Customer Booking Confirmation SMS
 * 2. Instant Admin New Booking Alert SMS (+91 7710080992)
 */

import { dispatchTraccarSms, sanitize10Digit } from './send-sms.js';

export const ADMIN_PHONE_NUMBER = '7710080992';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
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
    const { booking, localEndpoint, localToken, cloudToken, token } = body || {};

    if (!booking || !booking.id || !booking.customerPhone) {
      return res.status(400).json({ error: 'Missing booking details or customer phone' });
    }

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

    const smsOpts = { localEndpoint, localToken, cloudToken: cloudToken || token };

    const [customerRes, adminRes] = await Promise.allSettled([
      dispatchTraccarSms(customerPhone, customerMessage, smsOpts),
      dispatchTraccarSms(adminPhone, adminMessage, smsOpts)
    ]);

    const customerResult = customerRes.status === 'fulfilled' ? customerRes.value : { success: false, error: 'Promise rejected' };
    const adminResult = adminRes.status === 'fulfilled' ? adminRes.value : { success: false, error: 'Promise rejected' };

    return res.status(200).json({
      success: customerResult.success || adminResult.success,
      message:
        customerResult.success && adminResult.success
          ? 'Both Customer & Admin SMS delivered via Traccar Gateway'
          : customerResult.error || adminResult.error || 'One or more SMS dispatches failed',
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
