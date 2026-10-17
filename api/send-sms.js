/**
 * Vercel Serverless API Route: /api/send-sms
 * 
 * Direct Traccar Cloud SMS Gateway Dispatch
 * Endpoint: https://www.traccar.org/sms/
 */

export const TRACCAR_SMS_ENDPOINT = 'https://www.traccar.org/sms/';
export const DEFAULT_TRACCAR_TOKEN =
  'f81x7L5jTmSJNsNrLn_vP9:APA91bEZh7cloIKBCB0sozFUOBiX9TvBGH_Osxi8dM-HdoGWmXIlYhmZbxnKizpCoDSII5t66VaGz6UVO2tno2UpqRXji0X4J3PWFDsrKiy2H9y_kSKJOV8';

export function sanitize10Digit(num) {
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

export function formatIndianE164(phone) {
  const clean = sanitize10Digit(phone);
  return clean.length === 10 ? `+91${clean}` : phone;
}

export async function dispatchTraccarSms(phone, message, customToken) {
  const cleanPhone = sanitize10Digit(phone);
  if (cleanPhone.length !== 10) {
    return { success: false, reason: 'Invalid 10-digit Indian phone number' };
  }

  const token = (customToken || process.env.TRACCAR_SMS_TOKEN || DEFAULT_TRACCAR_TOKEN).trim();
  const recipient = `+91${cleanPhone}`;

  try {
    const response = await fetch(TRACCAR_SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        to: recipient,
        message
      })
    });

    const responseText = await response.text().catch(() => '');
    let responseData = responseText;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      // Traccar Cloud Gateway often returns 200 OK with empty or plain text body
    }

    if (response.ok) {
      return {
        success: true,
        status: response.status,
        to: recipient,
        gateway: 'traccar_cloud',
        data: responseData
      };
    }

    return {
      success: false,
      status: response.status,
      to: recipient,
      gateway: 'traccar_cloud',
      error: typeof responseData === 'string' && responseData ? responseData : `Traccar Gateway HTTP ${response.status}`
    };
  } catch (err) {
    return {
      success: false,
      to: recipient,
      gateway: 'traccar_cloud',
      error: err?.message || 'Network error connecting to Traccar Cloud Gateway'
    };
  }
}

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
    const { to, phone, message, token } = body || {};
    const targetPhone = to || phone;

    if (!targetPhone || !message) {
      return res.status(400).json({ success: false, error: 'Missing recipient phone number ("to") or "message"' });
    }

    const result = await dispatchTraccarSms(targetPhone, message, token);
    return res.status(result.success ? 200 : 502).json(result);
  } catch (err) {
    console.error('Error in /api/send-sms:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while dispatching Traccar SMS'
    });
  }
}
