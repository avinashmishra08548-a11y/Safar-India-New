/**
 * Vercel Serverless API Route: /api/send-whatsapp
 *
 * Meta WhatsApp Cloud API Dispatcher for Safar India Cabs
 * Phone Number ID: 902764639583293
 * Endpoint: https://graph.facebook.com/v20.0/902764639583293/messages
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '902764639583293';
const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN ||
  'EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD';
const API_URL = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

export function formatWhatsAppPhone(phone) {
  let cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.slice(1);
  }
  if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  return cleanPhone;
}

export async function sendWhatsAppCloudMessage(recipientPhone, messageText) {
  const formattedTo = formatWhatsAppPhone(recipientPhone);
  if (!formattedTo || formattedTo.length < 10) {
    return { success: false, error: 'Invalid recipient phone number' };
  }

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

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json; utf-8',
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
        data
      };
    } else {
      return {
        success: false,
        status: response.status,
        to: formattedTo,
        error: data?.error?.message || `HTTP Error Code: ${response.status}`,
        data
      };
    }
  } catch (err) {
    return {
      success: false,
      to: formattedTo,
      error: err?.message || 'Network or Exception Error'
    };
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
    const { recipientPhone, messageText } = body || {};

    if (!recipientPhone || !messageText) {
      return res.status(400).json({ error: 'recipientPhone and messageText are required' });
    }

    const result = await sendWhatsAppCloudMessage(recipientPhone, messageText);
    return res.status(result.success ? 200 : 502).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error'
    });
  }
}
