/**
 * Vercel Serverless API Route: /api/send-sms
 * 
 * Dual-Mode Traccar SMS Gateway Dispatcher:
 * 1. Primary: Traccar Local Service (http://172.24.139.153:8082) with Token: b45b4260-7725-485b-8a65-15a2dd324fb9
 * 2. Automatic Fallback: Traccar Cloud Gateway (https://www.traccar.org/sms/)
 */

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

/**
 * Helper: fetch with timeout so Local IP requests never hang if unreachable from cloud server
 */
async function fetchWithTimeout(url, options, timeoutMs = 3500) {
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

/**
 * Dispatches SMS using:
 * STEP 1: Traccar Local HTTP Service (http://172.24.139.153:8082, token: b45b4260-7725-485b-8a65-15a2dd324fb9)
 * STEP 2: Automatic Fallback to Traccar Cloud Service (https://www.traccar.org/sms/)
 */
export async function dispatchTraccarSms(phone, message, options = {}) {
  const cleanPhone = sanitize10Digit(phone);
  if (cleanPhone.length !== 10) {
    console.error('[Traccar SMS Error] Invalid 10-digit phone number:', phone);
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

  // =========================================================================
  // STEP 1: Attempt Primary Traccar Local Service (http://172.24.139.153:8082)
  // =========================================================================
  try {
    console.log(`[Traccar Local Service Request] POST ${localEndpoint}`, {
      to: recipient,
      authorization: localToken,
      messagePreview: message.slice(0, 60)
    });

    const localRes = await fetchWithTimeout(
      localEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localToken
        },
        body: JSON.stringify(payload)
      },
      3500
    );

    const localText = await localRes.text().catch(() => '');
    console.log(`[Traccar Local Service Response] HTTP ${localRes.status} for ${recipient}:`, localText);

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
    console.warn(`[Traccar Local Service Non-200] ${localErrorLog} -> Falling back to Cloud Service...`);
  } catch (localErr) {
    localErrorLog = localErr?.name === 'AbortError'
      ? `Local Service timeout (3.5s) reaching ${localEndpoint}`
      : `Local Service unreachable (${localEndpoint}): ${localErr?.message || localErr}`;
    console.warn(`[Traccar Local Service Notice] ${localErrorLog} -> Falling back to Cloud Service...`);
  }

  // =========================================================================
  // STEP 2: Automatic Fallback to Traccar Cloud Service (https://www.traccar.org/sms/)
  // =========================================================================
  try {
    console.log(`[Traccar Cloud Fallback Request] POST ${TRACCAR_CLOUD_ENDPOINT}`, {
      to: recipient,
      tokenPrefix: cloudToken.slice(0, 18) + '...',
      messagePreview: message.slice(0, 60)
    });

    const cloudRes = await fetchWithTimeout(
      TRACCAR_CLOUD_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': cloudToken
        },
        body: JSON.stringify(payload)
      },
      6000
    );

    const responseText = await cloudRes.text().catch(() => '');
    let responseData = responseText;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {}

    console.log(`[Traccar Cloud Fallback Response] HTTP ${cloudRes.status} for ${recipient}:`, responseData);

    if (responseData && typeof responseData === 'object') {
      const failureCount = Number(responseData.failureCount ?? 0);
      const successCount = Number(responseData.successCount ?? -1);
      const firstResp = Array.isArray(responseData.responses) ? responseData.responses[0] : null;
      const fcmError = firstResp?.error;

      if (failureCount > 0 || successCount === 0 || (firstResp && firstResp.success === false)) {
        const errCode = fcmError?.code || 'FCM_DISPATCH_FAILED';
        const errMsg = fcmError?.message || 'Traccar Cloud FCM delivery failed';
        console.error(`[Traccar Cloud Fallback Failed] to=${recipient} | localError=${localErrorLog} | cloudError=${errCode}: ${errMsg}`);

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
    console.error(`[Traccar Cloud Fallback Exception] to=${recipient}:`, cloudErr);
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
    const { action, to, phone, message, localEndpoint, localToken, cloudToken, token } = body || {};

    if (action === 'update_config' || action === 'update_token') {
      updateServerTraccarConfig({
        localEndpoint,
        localToken,
        cloudToken: cloudToken || token
      });
      console.log('[Traccar SMS] Updated active server configuration:', {
        localEndpoint: ACTIVE_LOCAL_ENDPOINT,
        localToken: ACTIVE_LOCAL_TOKEN
      });
      return res.status(200).json({
        success: true,
        message: 'Server Traccar Local + Cloud configuration updated',
        localEndpoint: ACTIVE_LOCAL_ENDPOINT
      });
    }

    const targetPhone = to || phone;

    if (!targetPhone || !message) {
      return res.status(400).json({ success: false, error: 'Missing recipient phone number ("to") or "message"' });
    }

    const result = await dispatchTraccarSms(targetPhone, message, {
      localEndpoint,
      localToken,
      cloudToken: cloudToken || token
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('Error in /api/send-sms:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error while dispatching Traccar SMS'
    });
  }
}
