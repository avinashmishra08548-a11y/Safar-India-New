/**
 * Vercel Serverless API Route: /api/send-whatsapp
 *
 * Meta WhatsApp Cloud API Multi-Strategy Dispatcher for Safar India Cabs
 * Phone Number ID: 902764639583293
 * WABA ID: 837811205522579
 * Endpoint: https://graph.facebook.com/v20.0/902764639583293/messages
 *
 * Solves Meta's 24-Hour Customer Service Window restriction by:
 * 1. Dispatching Official Meta WhatsApp Template Messages ("type": "template") which deliver
 *    to ANY WhatsApp number even without a prior "Hi/Hello" chat session.
 * 2. Dynamically resolving any APPROVED template on WABA 837811205522579 as an automatic fallback.
 * 3. Dispatching Rich Formatted Text Messages ("type": "text") + staggered follow-up waves.
 * 4. Maintaining a 30-minute Pending WhatsApp Outbox Queue that auto-flushes on incoming webhook events.
 */

export const DEFAULT_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '902764639583293';
export const DEFAULT_WABA_ID = process.env.WHATSAPP_WABA_ID || '837811205522579';
export const DEFAULT_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN ||
  'EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD';

// In-memory Pending WhatsApp Outbox Queue (auto-flushes whenever a user/driver interacts or polls)
const pendingWhatsAppQueue = new Map();

// Cached WABA approved templates list (refreshed every 30s)
let cachedApprovedTemplates = null;
let cachedApprovedTemplatesAt = 0;

export function formatWhatsAppPhone(phone) {
  const digits = String(phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (last10.length === 10) {
    return '91' + last10;
  }
  return digits;
}

/**
 * Meta WhatsApp Template parameters cannot contain newlines, tabs, or >3 consecutive spaces (#132018)
 */
export function sanitizeTemplateParam(val) {
  const str = String(val ?? '')
    .replace(/[\r\n\t]+/g, ' | ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return str.slice(0, 900) || '-';
}

/**
 * Queries WABA 837811205522579 for currently APPROVED templates so that as soon as Meta
 * approves any utility/marketing/authentication template, it is automatically used for
 * business-initiated delivery to numbers that have never sent "Hi/Hello".
 */
async function getApprovedWabaTemplates(accessToken) {
  const now = Date.now();
  if (cachedApprovedTemplates && now - cachedApprovedTemplatesAt < 30000) {
    return cachedApprovedTemplates;
  }
  try {
    const url = `https://graph.facebook.com/v20.0/${DEFAULT_WABA_ID}/message_templates?fields=name,status,language,components&limit=50`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data?.data)
        ? data.data.filter((t) => t && t.status === 'APPROVED')
        : [];
      cachedApprovedTemplates = list;
      cachedApprovedTemplatesAt = now;
      return list;
    }
  } catch {
    // Ignore network errors during template discovery
  }
  return cachedApprovedTemplates || [];
}

/**
 * Sends a single Meta WhatsApp Cloud API "type": "template" payload
 */
export async function sendSingleTemplatePayload(
  apiUrl,
  activeToken,
  formattedTo,
  templateName,
  languageCode = 'en_US',
  bodyParams = []
) {
  const components = [];
  if (Array.isArray(bodyParams) && bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((p) => ({
        type: 'text',
        text: sanitizeTemplateParam(p)
      }))
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {})
    }
  };

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
        templateName,
        messageId: data?.messages?.[0]?.id || null,
        data
      };
    }
    return {
      success: false,
      status: response.status,
      templateName,
      errorCode: data?.error?.code,
      error: data?.error?.message || `HTTP ${response.status}`
    };
  } catch (err) {
    return {
      success: false,
      templateName,
      error: err?.message || 'Template network error'
    };
  }
}

/**
 * Dispatches a business-initiated Template message to open/deliver outside the 24h chat window.
 * Tries:
 * 1. Explicit primary & backup template configs passed by the caller
 * 2. Any currently APPROVED template discovered on WABA 837811205522579
 */
export async function dispatchWhatsAppTemplateWithFallback(
  apiUrl,
  activeToken,
  formattedTo,
  messageText,
  templateConfig
) {
  const candidateTemplates = [];

  if (templateConfig && templateConfig.name) {
    candidateTemplates.push({
      name: templateConfig.name,
      language: templateConfig.language || 'en_US',
      params: Array.isArray(templateConfig.params) ? templateConfig.params : []
    });
  }

  if (templateConfig && Array.isArray(templateConfig.backups)) {
    for (const b of templateConfig.backups) {
      if (b && b.name) {
        candidateTemplates.push({
          name: b.name,
          language: b.language || 'en_US',
          params: Array.isArray(b.params) ? b.params : []
        });
      }
    }
  }

  // Always add universal WABA templates as fallbacks
  const cleanSummary = sanitizeTemplateParam(messageText);
  candidateTemplates.push(
    {
      name: 'safar_ride_update',
      language: 'en_US',
      params: [
        templateConfig?.recipientName || 'Traveler',
        templateConfig?.referenceId || 'SAFAR-CAB',
        cleanSummary
      ]
    },
    {
      name: 'safar_trip_alert',
      language: 'en_US',
      params: [templateConfig?.recipientName || 'Traveler', cleanSummary]
    },
    {
      name: 'safar_booking_pin_update',
      language: 'en_US',
      params: [
        templateConfig?.recipientName || 'Traveler',
        templateConfig?.referenceId || cleanSummary.slice(0, 60)
      ]
    }
  );

  // Check if WABA has any live APPROVED templates first to avoid unnecessary round-trips
  const approvedList = await getApprovedWabaTemplates(activeToken);
  if (approvedList.length > 0) {
    const approvedMap = new Map(approvedList.map((t) => [t.name, t]));
    // 1. Try caller's preferred templates that are in the approved list
    for (const cand of candidateTemplates) {
      if (approvedMap.has(cand.name)) {
        const res = await sendSingleTemplatePayload(
          apiUrl,
          activeToken,
          formattedTo,
          cand.name,
          cand.language,
          cand.params
        );
        if (res.success) return res;
      }
    }
    // 2. Otherwise adapt to the first approved template on the WABA
    for (const approved of approvedList) {
      const bodyComp = (approved.components || []).find((c) => c.type === 'BODY');
      const bodyText = bodyComp?.text || '';
      const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
      const paramCount = matches.length;
      let autoParams = [];
      if (paramCount === 1) {
        autoParams = [cleanSummary];
      } else if (paramCount === 2) {
        autoParams = [templateConfig?.recipientName || 'Traveler', cleanSummary];
      } else if (paramCount >= 3) {
        autoParams = [
          templateConfig?.recipientName || 'Traveler',
          templateConfig?.referenceId || 'SAFAR-CAB',
          cleanSummary,
          ...Array(Math.max(0, paramCount - 3)).fill('-')
        ];
      }
      const res = await sendSingleTemplatePayload(
        apiUrl,
        activeToken,
        formattedTo,
        approved.name,
        approved.language || 'en_US',
        autoParams
      );
      if (res.success) return res;
    }
  } else {
    // Even if cache was empty, try primary template directly once
    const primary = candidateTemplates[0];
    if (primary) {
      const res = await sendSingleTemplatePayload(
        apiUrl,
        activeToken,
        formattedTo,
        primary.name,
        primary.language,
        primary.params
      );
      if (res.success) return res;
    }
  }

  return { success: false, reason: 'No approved template matched yet' };
}

// Per-recipient deduplication cache to prevent duplicate WhatsApp messages within 15 seconds
const recentWhatsAppDispatches = new Map();

/**
 * Core Raw Text Sender ("type": "text") - Single clean request without retry loops on 4xx
 */
async function sendRawTextPayload(apiUrl, activeToken, formattedTo, messageText) {
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
        messageId: data?.messages?.[0]?.id || null,
        data
      };
    }
    return {
      success: false,
      status: response.status,
      to: formattedTo,
      errorCode: data?.error?.code,
      error: data?.error?.message || `HTTP Error Code: ${response.status}`,
      data
    };
  } catch (err) {
    return {
      success: false,
      to: formattedTo,
      error: err?.message || 'Network or Exception Error'
    };
  }
}

/**
 * Primary Dispatcher:
 * 1. Deduplicates identical messages to the same recipient within 15 seconds so multiple OTPs are never sent.
 * 2. Tries Official Template Message first (delivers to any WhatsApp number).
 * 3. Only falls back to Raw Text Message if no template was dispatched — guaranteeing strictly 1 message per request.
 */
export async function sendWhatsAppCloudMessage(
  recipientPhone,
  messageText,
  customPhoneId,
  customAccessToken,
  templateConfig = null,
  options = {}
) {
  const formattedTo = formatWhatsAppPhone(recipientPhone);
  if (!formattedTo || formattedTo.length < 12) {
    return { success: false, error: 'Invalid recipient phone number' };
  }

  const now = Date.now();
  const dedupeKey = `${formattedTo}:${String(messageText || '').trim().slice(0, 120)}`;
  const previousDispatch = recentWhatsAppDispatches.get(dedupeKey);
  if (!options?.force && previousDispatch && now - previousDispatch.sentAt < 15000) {
    return {
      ...previousDispatch.result,
      deduplicated: true
    };
  }

  const activePhoneId = (customPhoneId && String(customPhoneId).trim()) || DEFAULT_PHONE_NUMBER_ID;
  const activeToken =
    (customAccessToken && String(customAccessToken).trim()) || DEFAULT_ACCESS_TOKEN;
  const apiUrl = `https://graph.facebook.com/v20.0/${activePhoneId}/messages`;

  // Save in Pending WhatsApp Queue (valid for 30 mins) for webhook session sync
  pendingWhatsAppQueue.set(formattedTo, {
    to: formattedTo,
    messageText,
    templateConfig,
    apiUrl,
    activeToken,
    updatedAt: now,
    lastFlushedAt: now
  });

  const isRichBoxDrawingCard = String(messageText || '').includes('┌──');

  let templateResult = { success: false, status: null, templateName: null, messageId: null, data: null, error: null };
  let textResult = { success: false, status: null, messageId: null, data: null, error: null };

  if (isRichBoxDrawingCard) {
    // Step 1 (Box-Drawing Cards): Send Rich Multi-Line Text first so exact box formatting is preserved
    textResult = await sendRawTextPayload(apiUrl, activeToken, formattedTo, messageText);
    if (!textResult.success) {
      templateResult = await dispatchWhatsAppTemplateWithFallback(
        apiUrl,
        activeToken,
        formattedTo,
        messageText,
        templateConfig
      );
    }
  } else {
    // Step 1 (OTP / Standard): Try Official Meta Template first (delivers outside 24h window without duplicate text)
    templateResult = await dispatchWhatsAppTemplateWithFallback(
      apiUrl,
      activeToken,
      formattedTo,
      messageText,
      templateConfig
    );

    // Step 2: Only send Raw Text if template dispatch did not succeed
    if (!templateResult.success) {
      textResult = await sendRawTextPayload(apiUrl, activeToken, formattedTo, messageText);
    }
  }

  const overallSuccess = Boolean(templateResult.success || textResult.success);

  const finalResult = {
    success: overallSuccess,
    status: textResult.status || templateResult.status || (overallSuccess ? 200 : 502),
    to: formattedTo,
    phoneNumberId: activePhoneId,
    templateDispatched: Boolean(templateResult.success),
    templateName: templateResult.templateName || null,
    textDispatched: Boolean(textResult.success),
    messageId: textResult.messageId || templateResult.messageId || null,
    data: textResult.data || templateResult.data || null,
    error: overallSuccess ? undefined : textResult.error || templateResult.error
  };

  if (overallSuccess) {
    recentWhatsAppDispatches.set(dedupeKey, {
      sentAt: now,
      result: finalResult
    });
  }

  return finalResult;
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

  // Support Meta Webhook Verification (GET /api/send-whatsapp?hub.mode=subscribe&hub.challenge=...)
  if (req.method === 'GET') {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const mode = urlObj.searchParams.get('hub.mode');
    const challenge = urlObj.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && challenge) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(challenge);
      return;
    }
    return res.status(200).json({
      success: true,
      service: 'Safar India Cabs Meta WhatsApp Cloud API Dispatcher',
      phoneNumberId: DEFAULT_PHONE_NUMBER_ID,
      wabaId: DEFAULT_WABA_ID,
      queuedNumbers: pendingWhatsAppQueue.size
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // 1. Handle Incoming Meta WhatsApp Webhook Events (auto-flushes any pending OTP / Driver / Booking message)
    if (body && body.object === 'whatsapp_business_account' && Array.isArray(body.entry)) {
      const flushed = [];
      for (const entry of body.entry) {
        for (const change of entry?.changes || []) {
          const messages = change?.value?.messages || [];
          for (const msg of messages) {
            const senderPhone = formatWhatsAppPhone(msg?.from);
            const queued = pendingWhatsAppQueue.get(senderPhone);
            if (
              queued &&
              Date.now() - queued.updatedAt < 30 * 60 * 1000 &&
              (!queued.lastWebhookFlushedAt || Date.now() - queued.lastWebhookFlushedAt > 20000)
            ) {
              queued.lastWebhookFlushedAt = Date.now();
              queued.lastFlushedAt = Date.now();
              const flushRes = await sendRawTextPayload(
                queued.apiUrl,
                queued.activeToken,
                senderPhone,
                queued.messageText
              );
              flushed.push({ to: senderPhone, success: flushRes.success });
            }
          }
        }
      }
      return res.status(200).json({ success: true, webhookProcessed: true, flushed });
    }

    // 2. Standard Outbound WhatsApp Dispatch Request
    const {
      recipientPhone,
      messageText,
      phoneNumberId,
      accessToken,
      templateConfig,
      action
    } = body || {};

    // Action: flush_pending (re-pushes latest queued message for a phone number only if at least 20s have elapsed)
    if (action === 'flush_pending' && recipientPhone) {
      const formattedTo = formatWhatsAppPhone(recipientPhone);
      const queued = pendingWhatsAppQueue.get(formattedTo);
      if (queued && Date.now() - queued.updatedAt < 30 * 60 * 1000) {
        if (queued.lastFlushedAt && Date.now() - queued.lastFlushedAt < 20000) {
          return res.status(200).json({ success: true, throttled: true, to: formattedTo });
        }
        queued.lastFlushedAt = Date.now();
        const flushRes = await sendRawTextPayload(
          queued.apiUrl,
          queued.activeToken,
          formattedTo,
          queued.messageText
        );
        return res.status(200).json({
          success: flushRes.success,
          to: formattedTo,
          messageId: flushRes.messageId || null
        });
      }
      return res.status(200).json({ success: false, reason: 'No pending message for phone' });
    }

    if (!recipientPhone || !messageText) {
      return res.status(400).json({ error: 'recipientPhone and messageText are required' });
    }

    const result = await sendWhatsAppCloudMessage(
      recipientPhone,
      messageText,
      phoneNumberId,
      accessToken,
      templateConfig
    );
    return res.status(result.success ? 200 : 502).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error'
    });
  }
}
