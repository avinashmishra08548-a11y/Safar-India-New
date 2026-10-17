/**
 * Vercel Serverless API Route: /api/assign-driver
 * 
 * Automated Driver / Vehicle Assignment & Reassignment Notification via Traccar Local Service + Cloud Fallback
 */

import { dispatchTraccarSms, sanitize10Digit } from './send-sms.js';

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
      registrationNumber,
      localEndpoint,
      localToken,
      cloudToken,
      token
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

    // 1. Send Pickup Alert SMS to DRIVER:
    const driverMessage = `🚖 SAFAR INDIA CABS — NEW PICKUP DUTY\n\nBooking ID: ${bookingId}\nCustomer: ${customerName}\nPhone: +91${cleanCustomerPhone}\n\nPickup: ${pickup}\nDrop: ${drop}\nDate/Time: ${dateFormatted}\nCab: ${cab}\n\nCollect Balance at Drop: ₹${balance}\nPlease contact customer promptly.`;

    // 2. Send Driver Details SMS to CUSTOMER:
    const customerMessage = `🚗 SAFAR INDIA CABS — DRIVER ASSIGNED\n\nBooking ID: ${bookingId}\nRoute: ${pickup} to ${drop}\nDate/Time: ${dateFormatted}\n\nDriver Name: ${driverName}\nDriver Phone: ${cleanDriverPhone ? `+91${cleanDriverPhone}` : driverPhone}\nVehicle: ${vehicle} (${regNo})\n\nDriver will contact you prior to pickup.\nHelpline: +917710080992`;

    const smsOpts = { localEndpoint, localToken, cloudToken: cloudToken || token };

    const dispatches = [
      dispatchTraccarSms(cleanCustomerPhone, customerMessage, smsOpts)
    ];

    if (cleanDriverPhone && cleanDriverPhone.length === 10) {
      dispatches.push(dispatchTraccarSms(cleanDriverPhone, driverMessage, smsOpts));
    }

    const results = await Promise.allSettled(dispatches);
    const customerResult = results[0]?.status === 'fulfilled' ? results[0].value : { success: false };
    const driverResult = results[1]?.status === 'fulfilled' ? results[1].value : { success: false };

    return res.status(200).json({
      success: customerResult.success || driverResult.success,
      bookingId,
      error: !customerResult.success ? customerResult.error : undefined,
      customer: {
        phone: cleanCustomerPhone,
        dispatched: customerResult.success,
        details: customerResult
      },
      driver: {
        phone: cleanDriverPhone,
        dispatched: driverResult.success,
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
