/**
 * Vercel Serverless API Route: /api/send-whatsapp
 *
 * Meta WhatsApp Cloud API Dispatcher for Safar India Cabs
 * Phone Number ID: 902764639583293
 * Endpoint: https://graph.facebook.com/v20.0/902764639583293/messages
 */

const DEFAULT_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '902764639583293';
const DEFAULT_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN ||
  'EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD';

export function formatWhatsAppPhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  // Always extract the core 10-digit Indian mobile number and prefix with 91
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (last10.length === 10) {
    return '91' + last10;
  }
  return digits;
}

export async function sendWhatsAppCloudMessage(
  recipientPhone,
  messageText,
  customPhoneId,
  customAccessToken
) {
  const formattedTo = formatWhatsAppPhone(recipientPhone);
  if (!formattedTo || formattedTo.length < 12) {
    return { success: false, error: 'Invalid recipient phone number' };
  }

  const activePhoneId = (customPhoneId && String(customPhoneId).trim()) || DEFAULT_PHONE_NUMBER_ID;
  const activeToken =
    (customAccessToken && String(customAccessToken).trim()) || DEFAULT_ACCESS_TOKEN;
  const apiUrl = `https://graph.facebook.com/v20.0/${activePhoneId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedTo,
    type: 'text',
    text: {
      preview_url: false,
      body: messageText
    }
  };

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);
      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          status: response.status,
          to: formattedTo,
          phoneNumberId: activePhoneId,
          messageId: data?.messages?.[0]?.id || null,
          data
        };
      } else {
        lastError = {
          success: false,
          status: response.status,
          to: formattedTo,
          phoneNumberId: activePhoneId,
          error: data?.error?.message || `HTTP Error Code: ${response.status}`,
          data
        };
      }
    } catch (err) {
      lastError = {
        success: false,
        to: formattedTo,
        phoneNumberId: activePhoneId,
        error: err?.message || 'Network or Exception Error'
      };
    }
  }

  return lastError || { success: false, to: formattedTo, error: 'WhatsApp dispatch failed' };
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
    const { recipientPhone, messageText, phoneNumberId, accessToken } = body || {};

    if (!recipientPhone || !messageText) {
      return res.status(400).json({ error: 'recipientPhone and messageText are required' });
    }

    const result = await sendWhatsAppCloudMessage(
      recipientPhone,
      messageText,
      phoneNumberId,
      accessToken
    );
    return res.status(result.success ? 200 : 502).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error'
    });
  }
}
