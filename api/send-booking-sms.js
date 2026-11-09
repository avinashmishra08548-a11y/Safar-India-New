/**
 * Vercel Unified Serverless API Route: /api/send-booking-sms
 *
 * Consolidated Communications, SMS, WhatsApp, OTP & Email Hub (keeps Vercel Serverless Functions at 4 total):
 * 1. /api/send-booking-sms & /api/booking-notifications — Customer Booking Confirmation + Admin Alert
 * 2. /api/assign-driver & /api/send-driver-sms — Driver Duty Allotment + Customer Driver Details
 * 3. /api/send-review-email — Automated Customer Review Email Alert (Resend + EmailJS + FormSubmit + Admin WhatsApp)
 * 4. /api/verify-otp — Server-Side OTP Generation & Verification (Meta WhatsApp Cloud API + Fast2SMS)
 * 5. /api/send-whatsapp — Meta WhatsApp Cloud API Dispatcher (Templates + Rich Text + 24h Outbox Queue + Webhook)
 * 6. /api/send-sms — Dual-Mode Traccar Local + Cloud SMS Gateway Dispatcher
 */

import crypto from 'crypto';

export const ADMIN_PHONE_NUMBER = '7710080992';
export const TARGET_REVIEW_EMAIL =
  process.env.REVIEW_ALERT_EMAIL || 'safarindiacabs01@gmail.com';
export const ADMIN_WHATSAPP_NUMBER = '7710080992';

// ============================================================================
// TRACCAR LOCAL + CLOUD SMS GATEWAY (/api/send-sms)
// ============================================================================
export const DEFAULT_LOCAL_ENDPOINT = 'http://172.24.139.153:8082';
export const DEFAULT_LOCAL_TOKEN = 'b45b4260-7725-485b-8a65-15a2dd324fb9';
export const TRACCAR_CLOUD_ENDPOINT = 'https://www.traccar.org/sms/';
export const DEFAULT_CLOUD_TOKEN =
  'f81x7L5jTmSJNsNrLn_vP9:APA91bEZh7cloIKBCB0sozFUOBiX9TvBGH_Osxi8dM-HdoGWmXIlYhmZbxnKizpCoDSII5t66VaGz6UVO2tno2UpqRXji0X4J3PWFDsrKiy2H9y_kSKJOV8';

export let ACTIVE_LOCAL_ENDPOINT = process.env.TRACCAR_LOCAL_ENDPOINT || DEFAULT_LOCAL_ENDPOINT;
export let ACTIVE_LOCAL_TOKEN = process.env.TRACCAR_LOCAL_TOKEN || DEFAULT_LOCAL_TOKEN;
export let ACTIVE_CLOUD_TOKEN = process.env.TRACCAR_SMS_TOKEN || DEFAULT_CLOUD_TOKEN;

export function updateServerTraccarConfig({ localEndpoint, localToken, cloudToken } = {}) {
  if (localEndpoint && typeof localEndpoint === 'string' && localEndpoint.trim().startsWith('http')) {
    ACTIVE_LOCAL_ENDPOINT = localEndpoint.trim();
  }
  if (localToken && typeof localToken === 'string' && localToken.trim().length > 5) {
    ACTIVE_LOCAL_TOKEN = localToken.trim();
  }
  if (cloudToken && typeof cloudToken === 'string' && cloudToken.trim().length > 20) {
    ACTIVE_CLOUD_TOKEN = cloudToken.trim();
  }
}

export function sanitize10Digit(num) {
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

export function formatIndianE164(phone) {
  const clean = sanitize10Digit(phone);
  return clean.length === 10 ? `+91${clean}` : phone;
}

async function fetchWithTimeoutSms(url, options, timeoutMs = 3500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function dispatchTraccarSms(phone, message, options = {}) {
  const cleanPhone = sanitize10Digit(phone);
  if (cleanPhone.length !== 10) {
    return {
      success: false,
      reason: `Invalid 10-digit Indian phone number: ${phone}`,
      errorCode: 'INVALID_PHONE'
    };
  }

  const localEndpoint = (options.localEndpoint || ACTIVE_LOCAL_ENDPOINT || DEFAULT_LOCAL_ENDPOINT).trim();
  const localToken = (options.localToken || ACTIVE_LOCAL_TOKEN || DEFAULT_LOCAL_TOKEN).trim();
  const cloudToken = (options.cloudToken || options.token || ACTIVE_CLOUD_TOKEN || DEFAULT_CLOUD_TOKEN).trim();

  const recipient = `+91${cleanPhone}`;
  const payload = {
    to: recipient,
    message
  };

  let localErrorLog = null;

  try {
    const localRes = await fetchWithTimeoutSms(
      localEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localToken
        },
        body: JSON.stringify(payload)
      },
      2500
    );

    const localText = await localRes.text().catch(() => '');

    if (localRes.ok) {
      return {
        success: true,
        status: localRes.status,
        to: recipient,
        gateway: 'traccar_local',
        endpointUsed: localEndpoint,
        data: localText || 'Delivered via Traccar Local Service'
      };
    }

    localErrorLog = `Local Service HTTP ${localRes.status}: ${localText}`;
  } catch (localErr) {
    localErrorLog =
      localErr?.name === 'AbortError'
        ? `Local Service timeout (2.5s) reaching ${localEndpoint}`
        : `Local Service unreachable (${localEndpoint}): ${localErr?.message || localErr}`;
  }

  try {
    const cloudRes = await fetchWithTimeoutSms(
      TRACCAR_CLOUD_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: cloudToken
        },
        body: JSON.stringify(payload)
      },
      5000
    );

    const responseText = await cloudRes.text().catch(() => '');
    let responseData = responseText;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {}

    if (responseData && typeof responseData === 'object') {
      const failureCount = Number(responseData.failureCount ?? 0);
      const successCount = Number(responseData.successCount ?? -1);
      const firstResp = Array.isArray(responseData.responses) ? responseData.responses[0] : null;
      const fcmError = firstResp?.error;

      if (failureCount > 0 || successCount === 0 || (firstResp && firstResp.success === false)) {
        const errCode = fcmError?.code || 'FCM_DISPATCH_FAILED';
        const errMsg = fcmError?.message || 'Traccar Cloud FCM delivery failed';

        return {
          success: false,
          status: cloudRes.status,
          to: recipient,
          gateway: 'traccar_local_and_cloud_failed',
          localError: localErrorLog,
          errorCode: errCode,
          error: `Local (${localEndpoint}) unreachable from cloud server & Cloud Fallback returned ${errCode} (${errMsg}). Client will attempt direct Local Service dispatch.`,
          rawResponse: {
            localAttempt: { endpoint: localEndpoint, error: localErrorLog },
            cloudAttempt: responseData
          }
        };
      }
    }

    if (cloudRes.ok) {
      return {
        success: true,
        status: cloudRes.status,
        to: recipient,
        gateway: 'traccar_cloud_fallback',
        endpointUsed: TRACCAR_CLOUD_ENDPOINT,
        data: responseData
      };
    }

    return {
      success: false,
      status: cloudRes.status,
      to: recipient,
      gateway: 'traccar_cloud_fallback',
      localError: localErrorLog,
      errorCode: `HTTP_${cloudRes.status}`,
      error: `Local (${localErrorLog}) & Cloud HTTP ${cloudRes.status}`,
      rawResponse: {
        localAttempt: { endpoint: localEndpoint, error: localErrorLog },
        cloudAttempt: responseData
      }
    };
  } catch (cloudErr) {
    return {
      success: false,
      to: recipient,
      gateway: 'traccar_local_and_cloud_failed',
      localError: localErrorLog,
      errorCode: 'NETWORK_ERROR',
      error: `Local (${localErrorLog}) & Cloud (${cloudErr?.message || 'Network error'})`
    };
  }
}

// ============================================================================
// META WHATSAPP CLOUD API DISPATCHER (/api/send-whatsapp)
// ============================================================================
export const DEFAULT_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '902764639583293';
export const DEFAULT_WABA_ID = process.env.WHATSAPP_WABA_ID || '837811205522579';
export const DEFAULT_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN ||
  'EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD';

const pendingWhatsAppQueue = new Map();
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

export function sanitizeTemplateParam(val) {
  const str = String(val ?? '')
    .replace(/[\r\n\t]+/g, ' | ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return str.slice(0, 900) || '-';
}

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
  } catch {}
  return cachedApprovedTemplates || [];
}

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

  const approvedList = await getApprovedWabaTemplates(activeToken);
  if (approvedList.length > 0) {
    const approvedMap = new Map(approvedList.map((t) => [t.name, t]));
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

const recentWhatsAppDispatches = new Map();

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
  const refId = templateConfig?.referenceId ? String(templateConfig.referenceId).trim() : '';
  const tplName = templateConfig?.name ? String(templateConfig.name).trim() : 'text';
  const dedupeKey = refId
    ? `${formattedTo}:${tplName}:${refId}`
    : `${formattedTo}:${String(messageText || '').trim().slice(0, 120)}`;
  const previousDispatch = recentWhatsAppDispatches.get(dedupeKey);
  if (!options?.force && previousDispatch && now - previousDispatch.sentAt < 90000) {
    return {
      ...previousDispatch.result,
      deduplicated: true
    };
  }

  const activePhoneId = (customPhoneId && String(customPhoneId).trim()) || DEFAULT_PHONE_NUMBER_ID;
  const activeToken =
    (customAccessToken && String(customAccessToken).trim()) || DEFAULT_ACCESS_TOKEN;
  const apiUrl = `https://graph.facebook.com/v20.0/${activePhoneId}/messages`;

  recentWhatsAppDispatches.set(dedupeKey, {
    sentAt: now,
    result: {
      success: true,
      status: 200,
      to: formattedTo,
      phoneNumberId: activePhoneId,
      deduplicated: true
    }
  });

  let templateResult = { success: false, status: null, templateName: null, messageId: null, data: null, error: null };
  let textResult = { success: false, status: null, messageId: null, data: null, error: null };

  templateResult = await dispatchWhatsAppTemplateWithFallback(
    apiUrl,
    activeToken,
    formattedTo,
    messageText,
    templateConfig
  );

  if (!templateResult.success) {
    textResult = await sendRawTextPayload(apiUrl, activeToken, formattedTo, messageText);
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
    pendingWhatsAppQueue.delete(formattedTo);
  } else {
    recentWhatsAppDispatches.delete(dedupeKey);
    pendingWhatsAppQueue.set(formattedTo, {
      to: formattedTo,
      messageText,
      templateConfig,
      apiUrl,
      activeToken,
      updatedAt: now,
      lastFlushedAt: now
    });
  }

  return finalResult;
}

const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';
const DEFAULT_KEY =
  '6B8sTgArm4kSQUaZC9iNhVdFEf3IPlMqoRDeuYjwGHvtnpXW51IKdZWsjBgMr2wl54C0JOYh9nuiVxcz';
const OTP_SECRET = process.env.OTP_SECRET || 'safar_india_cabs_secure_secret_2026_key';

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
// 5. DIRECT TRACCAR SMS ROUTE HANDLER (/api/send-sms)
// ============================================================================
async function handleSendSmsEndpoint(req, res, body) {
  try {
    const { action, to, phone, message, localEndpoint, localToken, cloudToken, token } = body || {};

    if (action === 'update_config' || action === 'update_token') {
      updateServerTraccarConfig({
        localEndpoint,
        localToken,
        cloudToken: cloudToken || token
      });
      return res.status(200).json({
        success: true,
        message: 'Server Traccar Local + Cloud configuration updated',
        localEndpoint: ACTIVE_LOCAL_ENDPOINT
      });
    }

    const targetPhone = to || phone;
    if (!targetPhone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing recipient phone number ("to") or "message"'
      });
    }

    const result = await dispatchTraccarSms(targetPhone, message, {
      localEndpoint,
      localToken,
      cloudToken: cloudToken || token
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while dispatching Traccar SMS'
    });
  }
}

// ============================================================================
// 6. DIRECT WHATSAPP CLOUD API ROUTE HANDLER (/api/send-whatsapp)
// ============================================================================
async function handleSendWhatsAppEndpoint(req, res, body) {
  try {
    // 1. Handle Incoming Meta WhatsApp Webhook Events
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

// ============================================================================
// UNIFIED SERVERLESS ROUTE HANDLER
// ============================================================================
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

  // Support Meta Webhook Verification & Status on GET
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
      service: 'Safar India Cabs Unified Communications & Notification Hub',
      phoneNumberId: DEFAULT_PHONE_NUMBER_ID,
      wabaId: DEFAULT_WABA_ID,
      queuedNumbers: pendingWhatsAppQueue.size
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const reqUrl = String(req.url || '');
    const queryEndpoint = String(req.query?.endpoint || body?.endpoint || '').toLowerCase();

    // 1. Route to WhatsApp Cloud API (/api/send-whatsapp)
    if (
      reqUrl.includes('/send-whatsapp') ||
      queryEndpoint === 'send-whatsapp' ||
      body.object === 'whatsapp_business_account' ||
      body.action === 'flush_pending' ||
      Boolean(body.recipientPhone && body.messageText)
    ) {
      return await handleSendWhatsAppEndpoint(req, res, body);
    }

    // 2. Route to Traccar SMS Gateway (/api/send-sms)
    if (
      reqUrl.includes('/send-sms') ||
      queryEndpoint === 'send-sms' ||
      body.action === 'update_config' ||
      body.action === 'update_token' ||
      Boolean((body.to || body.phone) && body.message && !body.booking && !body.id)
    ) {
      return await handleSendSmsEndpoint(req, res, body);
    }

    // 3. Route to OTP verification (/api/verify-otp)
    if (
      reqUrl.includes('/verify-otp') ||
      queryEndpoint === 'verify-otp' ||
      body.action === 'send' ||
      body.action === 'verify'
    ) {
      return await handleVerifyOtp(req, res, body);
    }

    // 4. Route to Driver Assignment (/api/assign-driver, /api/send-driver-sms)
    if (
      reqUrl.includes('/assign-driver') ||
      reqUrl.includes('/send-driver-sms') ||
      queryEndpoint === 'assign-driver' ||
      queryEndpoint === 'send-driver-sms' ||
      Boolean(body.driverName || body.driverPhone || body.registrationNumber || body.vehicleNo)
    ) {
      return await handleAssignDriverNotification(req, res, body);
    }

    // 5. Route to Review Email Alert (/api/send-review-email)
    if (
      reqUrl.includes('/send-review-email') ||
      queryEndpoint === 'send-review-email' ||
      Boolean(body.review || body.reviewMessage)
    ) {
      return await handleSendReviewEmail(req, res, body);
    }

    // 6. Default: Booking Confirmation Notification (/api/send-booking-sms, /api/booking-notifications)
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

