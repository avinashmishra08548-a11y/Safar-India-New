/**
 * Vercel Serverless API Route: /api/verify-otp
 *
 * Secure Server-Side OTP Generation and Multi-Channel Verification Flow:
 * 1. Meta WhatsApp Cloud API (Official Template + Rich Text via /api/send-whatsapp)
 *    - Works for ANY WhatsApp number even without a prior "Hi/Hello" chat session
 * 2. Traccar SMS Gateway (Local Android Service + Cloud FCM Fallback via /api/send-sms)
 * 3. Fast2SMS Gateway (Route OTP + Route Q Wallet POST/GET Fallback)
 */

import crypto from 'crypto';
import { sendWhatsAppCloudMessage } from './send-whatsapp.js';
import { dispatchTraccarSms } from './send-sms.js';

const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';
const DEFAULT_KEY =
  '6B8sTgArm4kSQUaZC9iNhVdFEf3IPlMqoRDeuYjwGHvtnpXW51IKdZWsjBgMr2wl54C0JOYh9nuiVxcz';
const OTP_SECRET = process.env.OTP_SECRET || 'safar_india_cabs_secure_secret_2026_key';

function sanitize10Digit(num) {
  const clean = String(num || '').replace(/\D/g, '');
  if (clean.length >= 10) {
    return clean.slice(-10);
  }
  return clean;
}

function generateSignature(phone, otp, expiresAt) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${phone}:${otp}:${expiresAt}`)
    .digest('hex');
}

async function dispatchOtpViaWhatsApp(clean10DigitPhone, otp, customerName = 'Traveler') {
  const waMessage =
    `🔐 *Safar India Cabs Verification*\n\n` +
    `Your login OTP is: *${otp}*\n` +
    `Valid for 10 minutes. Do not share this with anyone.`;

  return sendWhatsAppCloudMessage(clean10DigitPhone, waMessage, null, null, {
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
  });
}

async function dispatchOtpViaFast2Sms(phone, otp, apiKey) {
  // 1. Try Route 'otp'
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

  // 2. Failover to Route 'q' (Quick SMS message)
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

  // 3. Fallback GET
  try {
    const getUrl = `${FAST2SMS_ENDPOINT}?authorization=${encodeURIComponent(apiKey)}&route=q&message=${encodeURIComponent(message)}&language=english&flash=0&numbers=${phone}`;
    const getRes = await fetch(getUrl, { method: 'GET' });
    const getData = await getRes.json().catch(() => null);
    return {
      success: getData?.return === true || getData?.status_code === 200,
      route: 'q_get'
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
    const { action, phone, otp, token, name } = body || {};

    const cleanPhone = sanitize10Digit(phone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res
        .status(400)
        .json({ success: false, error: 'Valid 10-digit Indian phone number required' });
    }

    const apiKey = process.env.FAST2SMS_API_KEY || DEFAULT_KEY;

    // ACTION: SEND OTP
    if (action === 'send') {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity
      const signature = generateSignature(cleanPhone, generatedOtp, expiresAt);
      const sessionToken = `${signature}.${expiresAt}.${cleanPhone}`;

      const smsText = `🔐 Safar India Cabs Verification OTP: ${generatedOtp}. Valid for 10 minutes. Do not share this code with anyone.`;

      const [fast2smsResult, traccarResult, waResult] = await Promise.allSettled([
        dispatchOtpViaFast2Sms(cleanPhone, generatedOtp, apiKey),
        dispatchTraccarSms(cleanPhone, smsText),
        dispatchOtpViaWhatsApp(cleanPhone, generatedOtp, name || 'Traveler')
      ]);

      const fast2smsOk =
        fast2smsResult.status === 'fulfilled' && Boolean(fast2smsResult.value?.success);
      const traccarOk =
        traccarResult.status === 'fulfilled' && Boolean(traccarResult.value?.success);
      const smsDelivered = fast2smsOk || traccarOk;
      const waDelivered = waResult.status === 'fulfilled' && Boolean(waResult.value?.success);
      const waTemplateDelivered =
        waResult.status === 'fulfilled' && Boolean(waResult.value?.templateDispatched);

      return res.status(200).json({
        success: true,
        message: `Live OTP sent to your WhatsApp (+91 ${cleanPhone})`,
        token: sessionToken,
        expiresAt,
        waDelivered,
        waTemplateDelivered,
        smsDelivered,
        delivered: smsDelivered || waDelivered
      });
    }

    // ACTION: VERIFY OTP
    if (action === 'verify') {
      if (!otp || typeof otp !== 'string' || otp.trim().length !== 4) {
        return res
          .status(400)
          .json({ success: false, error: 'Please enter a 4-digit verification code' });
      }

      if (!token || typeof token !== 'string' || !token.includes('.')) {
        return res.status(400).json({
          success: false,
          error: 'Session expired or invalid. Please request a new code.'
        });
      }

      const parts = token.split('.');
      const expectedSignature = parts[0];
      const expiresAt = Number(parts[1]);
      const tokenPhone = parts[2];

      if (tokenPhone !== cleanPhone) {
        return res
          .status(400)
          .json({ success: false, error: 'Phone number mismatch. Request a new code.' });
      }

      if (Date.now() > expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Verification code has expired. Please request a new code.'
        });
      }

      const inputCleanOtp = otp.trim();
      const calculatedSignature = generateSignature(cleanPhone, inputCleanOtp, expiresAt);

      if (calculatedSignature !== expectedSignature) {
        return res.status(400).json({
          success: false,
          error: 'Incorrect verification code. Please check your WhatsApp or SMS.'
        });
      }

      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Phone number successfully verified'
      });
    }

    return res
      .status(400)
      .json({ success: false, error: 'Invalid action. Supported actions: send, verify' });
  } catch (err) {
    console.error('Error in /api/verify-otp:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error during verification'
    });
  }
}
