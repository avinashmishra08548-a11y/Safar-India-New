/**
 * Razorpay Production Payment & Dynamic QR Service for SafarIndiaCabs
 *
 * Implements an audited, server-authoritative Razorpay payment architecture:
 * 1. Official Dynamic UPI QR Code generation via server-side `POST /api/payment-gateway` (`action: 'create_qr'`)
 *    using Razorpay's official `/v1/payments/qr_codes` API (never using static/hardcoded UPI IDs).
 * 2. Official Razorpay Standard Checkout (`https://checkout.razorpay.com/v1/checkout.js`) for
 *    Google Pay, PhonePe, Paytm, BHIM, Scan & Pay QR, Cards & NetBanking with `show_default_blocks: true`
 *    so "No appropriate payment method found" can never occur.
 * 3. Server-authoritative fare & 20% advance calculation via `POST /api/create-order` with active order deduplication.
 * 4. Strict server-side HMAC-SHA256 & Razorpay API verification via `POST /api/verify-payment` and
 *    `POST /api/payment-gateway` (`action: 'check_status'`). Never confirms a booking on unverified frontend callbacks.
 * 5. Deterministic timeout protection (AbortController) so loading spinners never remain stuck.
 */

import { BookingRecord, CabCategoryId, PaymentAuditLogRecord, TripType } from '../types';
import { savePaymentAuditLogToCloud } from '../lib/bookingDatabase';

function cleanClientKey(val: unknown): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .replace(/['"`“”‘’]+/g, '')
    .trim();
}

export const DEFAULT_RAZORPAY_KEY = cleanClientKey(
  (import.meta as any).env?.VITE_RAZORPAY_KEY_ID
);

export type PreferredPaymentMethod =
  | 'qr'
  | 'paytm'
  | 'phonepe'
  | 'gpay'
  | 'bhim'
  | 'card_netbanking';

/**
 * Retrieve configured public Razorpay Key ID from Vite environment or localStorage
 */
export function getRazorpayKeyId(): string {
  try {
    const viteEnvKey = cleanClientKey((import.meta as any).env?.VITE_RAZORPAY_KEY_ID);
    if (viteEnvKey && (viteEnvKey.startsWith('rzp_live_') || viteEnvKey.startsWith('rzp_test_'))) {
      return viteEnvKey;
    }
    const saved = cleanClientKey(localStorage.getItem('safar_razorpay_key'));
    if (saved && (saved.startsWith('rzp_live_') || saved.startsWith('rzp_test_'))) {
      return saved;
    }
  } catch {}
  return '';
}

export function setRazorpayKeyId(key: string): void {
  try {
    const cleaned = cleanClientKey(key);
    if (cleaned && cleaned.startsWith('rzp_')) {
      localStorage.setItem('safar_razorpay_key', cleaned);
    } else {
      localStorage.removeItem('safar_razorpay_key');
    }
  } catch {}
}

export interface InstalledUpiAppsInfo {
  gpay: boolean;
  phonepe: boolean;
  paytm: boolean;
  bhim: boolean;
  cred?: boolean;
  amazon_pay?: boolean;
  hasAnyUpiApp: boolean;
  installedRazorpayAppCodes: string[];
  platform: 'android' | 'ios' | 'desktop';
  supportsNativeUpiIntent: boolean;
}

export const UPI_PACKAGE_MAP: Record<string, { razorpayCode: string; packageName: string; label: string }> = {
  gpay: {
    razorpayCode: 'google_pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    label: 'Google Pay'
  },
  phonepe: {
    razorpayCode: 'phonepe',
    packageName: 'com.phonepe.app',
    label: 'PhonePe'
  },
  paytm: {
    razorpayCode: 'paytm',
    packageName: 'net.one97.paytm',
    label: 'Paytm'
  },
  bhim: {
    razorpayCode: 'bhim',
    packageName: 'in.org.npci.upiapp',
    label: 'BHIM UPI'
  }
};

/**
 * Detects current device platform accurately without any User-Agent spoofing
 */
export function detectDevicePlatform(): 'android' | 'ios' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'desktop';
}

/**
 * Normalizes Android WebView User-Agent token (`; wv`) so Razorpay checkout.js
 * enables native UPI Intent (`upi://pay`) inside Android WebViews without ever
 * spoofing Desktop/Win32 or breaking mobile UPI app launching.
 */
export function ensureAndroidWebViewUpiSupport(): void {
  if (typeof window === 'undefined' || !window.navigator) return;
  try {
    const win = window as any;
    const currentUa = window.navigator.userAgent || '';
    if (!/Android/i.test(currentUa)) return;

    if (!win.__SAFAR_ORIGINAL_UA__) {
      win.__SAFAR_ORIGINAL_UA__ = currentUa;
    }

    const origUa: string = win.__SAFAR_ORIGINAL_UA__;
    if (/;\s*wv\b/i.test(origUa) || /\bwv\)/i.test(origUa) || /Version\/\d+\.\d+/i.test(origUa)) {
      const cleanMobileUa = origUa
        .replace(/;\s*wv\)/gi, ')')
        .replace(/;\s*wv;/gi, ';')
        .replace(/\bwv\b/gi, '')
        .replace(/Version\/\d+\.\d+\s*/gi, '');

      Object.defineProperty(window.navigator, 'userAgent', {
        get: () => cleanMobileUa,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'appVersion', {
        get: () => cleanMobileUa.replace(/^Mozilla\//i, ''),
        configurable: true
      });
      win.__SAFAR_ANDROID_WEBVIEW__ = true;
    }
  } catch {}
}

/**
 * Detects installed UPI apps on Android 11+ (API Level 30+) via the native SafarUpiBridge
 * (backed by <queries> in AndroidManifest.xml), or determines browser capability per platform.
 */
export function detectInstalledUpiApps(): InstalledUpiAppsInfo {
  const platform = detectDevicePlatform();
  const supportsNativeUpiIntent = platform === 'android' || platform === 'ios';

  const defaultInfo: InstalledUpiAppsInfo = {
    gpay: true,
    phonepe: true,
    paytm: true,
    bhim: true,
    hasAnyUpiApp: true,
    installedRazorpayAppCodes: ['google_pay', 'phonepe', 'paytm', 'bhim'],
    platform,
    supportsNativeUpiIntent
  };

  if (typeof window === 'undefined') {
    return defaultInfo;
  }

  try {
    const bridge = (window as any).SafarUpiBridge;
    if (bridge && typeof bridge.getInstalledUpiAppsJson === 'function') {
      const rawJson = bridge.getInstalledUpiAppsJson();
      const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      if (parsed && typeof parsed === 'object') {
        const codes: string[] = [];
        if (parsed.gpay) codes.push('google_pay');
        if (parsed.phonepe) codes.push('phonepe');
        if (parsed.paytm) codes.push('paytm');
        if (parsed.bhim) codes.push('bhim');

        const finalCodes =
          codes.length > 0 ? codes : ['google_pay', 'phonepe', 'paytm', 'bhim'];

        return {
          gpay: parsed.gpay !== false,
          phonepe: parsed.phonepe !== false,
          paytm: parsed.paytm !== false,
          bhim: parsed.bhim !== false,
          cred: false,
          amazon_pay: false,
          hasAnyUpiApp: Boolean(parsed.hasAnyUpiApp ?? true),
          installedRazorpayAppCodes: finalCodes,
          platform,
          supportsNativeUpiIntent: true
        };
      }
    }
  } catch (err) {
    console.warn('[Razorpay Checkout] SafarUpiBridge detection fallback:', err);
  }

  return defaultInfo;
}

/**
 * Fetch helper with strict AbortController timeout so requests never hang indefinitely
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 14000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ensure Razorpay checkout.js script is loaded in document with timeout protection.
 * Never deletes window.Razorpay mid-session or spoofs Desktop UA.
 */
export function loadRazorpayScript(timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }
    ensureAndroidWebViewUpiSupport();

    const win = window as any;
    if (typeof win.Razorpay === 'function') {
      return resolve(true);
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(ok);
      }
    };

    const timer = setTimeout(() => {
      finish(typeof win.Razorpay === 'function');
    }, timeoutMs);

    const existingScript = document.getElementById('razorpay-checkout-js') as HTMLScriptElement | null;
    if (existingScript) {
      if (typeof win.Razorpay === 'function') {
        return finish(true);
      }
      existingScript.addEventListener('load', () => finish(typeof win.Razorpay === 'function'));
      existingScript.addEventListener('error', () => {
        existingScript.remove();
        finish(false);
      });
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => finish(typeof win.Razorpay === 'function');
    script.onerror = () => {
      script.remove();
      finish(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Ensure Razorpay iframe/modal container stays above bottom ad banner and bottom nav
 */
function applyRazorpayModalOverlapFix(): void {
  const adjustContainer = () => {
    const containers = document.querySelectorAll<HTMLElement>('.razorpay-container');
    containers.forEach((container) => {
      container.style.setProperty('z-index', '2147483647', 'important');
      container.style.setProperty('padding-bottom', '56px', 'important');
      container.style.setProperty('box-sizing', 'border-box', 'important');
    });

    const frames = document.querySelectorAll<HTMLElement>(
      '.razorpay-checkout-frame, .razorpay-container iframe'
    );
    frames.forEach((frame) => {
      frame.style.setProperty('z-index', '2147483647', 'important');
      frame.style.setProperty('max-height', 'calc(100% - 56px)', 'important');
      frame.style.setProperty('margin-bottom', '52px', 'important');
    });
  };

  adjustContainer();
  setTimeout(adjustContainer, 150);
  setTimeout(adjustContainer, 450);
  setTimeout(adjustContainer, 900);
}

export interface CreateOrderRequestPayload {
  bookingId: string;
  tripType: TripType;
  cabId: CabCategoryId;
  distanceKm: number;
  extraKm?: number;
  pickupCity: string;
  dropCity: string;
  pickupAddress: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string;
  localPackageId?: string;
  includeTolls: boolean;
  addonCarrier?: boolean;
  addonPet?: boolean;
  addonAssuredModel?: boolean;
  promoCode?: string;
  promoDiscount?: number;
  paymentMode: 'advance_20' | 'full';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  clientExpectedAmountRupees: number;
  clientTotalFareRupees: number;
  clientPublicKeyId?: string;
  forceNewOrder?: boolean;
}

export interface CreateOrderServerResponse {
  success: boolean;
  alreadyPaid?: boolean;
  reusedOrder?: boolean;
  verifiedBooking?: BookingRecord;
  checkoutMode?: 'order' | 'direct';
  orderId: string;
  amount: number;
  amountInRupees: number;
  currency: string;
  keyId: string;
  bookingId: string;
  verificationToken: string;
  fareSummary?: {
    distanceKm?: number;
    billedDistanceKm?: number;
    baseFare?: number;
    driverAllowance?: number;
    tollsAndTaxes?: number;
    gstAmount?: number;
    totalFare?: number;
    advancePaid?: number;
    balanceDue?: number;
  };
  gatewayReason?: string;
  errorCode?: string;
  error?: string;
}

export interface DynamicQrCodeResponse {
  success: boolean;
  alreadyPaid?: boolean;
  reused?: boolean;
  qrId?: string;
  imageUrl?: string;
  amountInPaise?: number;
  amountInRupees?: number;
  bookingId?: string;
  closeBy?: number;
  status?: 'active' | 'paid' | 'expired' | 'closed' | 'failed';
  verifiedBooking?: BookingRecord;
  fareSummary?: CreateOrderServerResponse['fareSummary'];
  qrApiSupported?: boolean;
  canUseCheckoutQr?: boolean;
  errorCode?: string;
  error?: string;
}

export interface CheckPaymentStatusResponse {
  success: boolean;
  status: 'paid' | 'processing' | 'pending' | 'expired' | 'failed' | 'unverified';
  verified?: boolean;
  paymentId?: string;
  orderId?: string;
  qrId?: string;
  paymentMethod?: string;
  booking?: BookingRecord;
  error?: string;
}

export interface RazorpayCheckoutOptions {
  amountInRupees: number;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  cabName: string;
  pickupCity: string;
  dropCity: string;
  pickupDate: string;
  paymentMode: 'advance_20' | 'full';
  preferredMethod?: PreferredPaymentMethod;
  tripType?: TripType;
  cabId?: CabCategoryId;
  distanceKm?: number;
  extraKm?: number;
  pickupAddress?: string;
  pickupDateRaw?: string;
  pickupTimeRaw?: string;
  returnDateRaw?: string;
  localPackageId?: string;
  includeTolls?: boolean;
  addonCarrier?: boolean;
  addonPet?: boolean;
  addonAssuredModel?: boolean;
  promoCode?: string;
  promoDiscount?: number;
  totalFareRupees?: number;
  bookingDraft?: BookingRecord;
  forceNewOrder?: boolean;
  onStatusChange?: (statusText: string) => void;
  onSuccess: (paymentId: string, verifiedBooking?: BookingRecord, notificationsDispatched?: boolean) => void;
  onVerificationPending?: (info: { paymentId: string; orderId?: string; bookingId: string; message: string }) => void;
  onDismiss?: () => void;
  onError?: (errMessage: string) => void;
}

/**
 * Helper to record a client-side payment lifecycle event to `/api/payment-gateway` and Firestore `payment_logs`
 */
export async function logClientPaymentEvent(event: Partial<PaymentAuditLogRecord>): Promise<void> {
  try {
    const res = await fetchWithTimeout(
      '/api/payment-gateway',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_event',
          ...event
        })
      },
      6000
    );
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.entry) {
        await savePaymentAuditLogToCloud(data.entry as PaymentAuditLogRecord);
        return;
      }
    }
  } catch {}

  if (event.bookingId && event.paymentStatus) {
    await savePaymentAuditLogToCloud({
      id: `PAYLOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      bookingId: event.bookingId,
      customerName: event.customerName || 'Guest Passenger',
      customerPhone: event.customerPhone || '',
      bookingAmount: Number(event.bookingAmount) || 0,
      advanceAmount: Number(event.advanceAmount) || 0,
      payableAmount: Number(event.payableAmount) || 0,
      razorpayOrderId: event.razorpayOrderId || '',
      paymentId: event.paymentId || '',
      qrId: event.qrId || '',
      paymentMethod: event.paymentMethod || 'upi',
      paymentStatus: event.paymentStatus,
      timestamp: new Date().toISOString(),
      failureReason: event.failureReason || '',
      gatewayResponseSummary: event.gatewayResponseSummary || '',
      retryAttempts: Number(event.retryAttempts) || 0,
      webhookVerified: Boolean(event.webhookVerified)
    });
  }
}

/**
 * Step 1: Validate booking & create Razorpay Order on the server (/api/create-order)
 */
export async function createRazorpayOrderOnServer(
  payload: CreateOrderRequestPayload
): Promise<CreateOrderServerResponse> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      '/api/create-order',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      },
      14000
    );
  } catch (networkErr: any) {
    const isTimeout = networkErr?.name === 'AbortError';
    throw new Error(
      isTimeout
        ? 'Payment server request timed out. Please check your internet connection and retry.'
        : 'Network error while connecting to payment server. Please check your internet connection and try again.'
    );
  }

  const rawText = await response.text().catch(() => '');
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(
      `Server endpoint /api/create-order returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (data?.alreadyPaid && data?.verifiedBooking) {
    return data as CreateOrderServerResponse;
  }

  if (!response.ok || !data || !data.success || !data.keyId) {
    throw new Error(
      data?.error ||
        `Unable to initialize payment order (HTTP ${response.status}). Please verify Razorpay credentials.`
    );
  }

  return data as CreateOrderServerResponse;
}

/**
 * Official Server-Side Razorpay Dynamic UPI QR Code Creation (`POST /api/payment-gateway` -> `/v1/payments/qr_codes`)
 * Never generates a static or fake UPI QR code.
 */
export async function createDynamicQrOnServer(
  payload: CreateOrderRequestPayload & { forceNewQr?: boolean }
): Promise<DynamicQrCodeResponse> {
  try {
    const response = await fetchWithTimeout(
      '/api/payment-gateway',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          action: 'create_qr',
          ...payload
        })
      },
      15000
    );

    const data = await response.json().catch(() => null);
    if (!data) {
      return {
        success: false,
        canUseCheckoutQr: true,
        error: `Unexpected response from QR gateway (HTTP ${response.status}).`
      };
    }
    return data as DynamicQrCodeResponse;
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      canUseCheckoutQr: true,
      error: isTimeout
        ? 'Dynamic QR generation timed out. You can retry or open Razorpay Checkout QR.'
        : err?.message || 'Unable to reach Razorpay QR gateway.'
    };
  }
}

/**
 * Checks real-time payment status on the server across QR ID, Order ID, and Payment ID
 */
export async function checkPaymentStatusOnServer(params: {
  bookingId: string;
  qrId?: string;
  orderId?: string;
  paymentId?: string;
  bookingDraft?: BookingRecord;
}): Promise<CheckPaymentStatusResponse> {
  try {
    const response = await fetchWithTimeout(
      '/api/payment-gateway',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          action: 'check_status',
          ...params
        })
      },
      12000
    );
    const data = await response.json().catch(() => null);
    if (!data) {
      return {
        success: false,
        status: 'pending',
        error: `Invalid response from status verification endpoint (HTTP ${response.status}).`
      };
    }
    return data as CheckPaymentStatusResponse;
  } catch (err: any) {
    return {
      success: false,
      status: 'pending',
      error: err?.message || 'Network timeout while checking payment status.'
    };
  }
}

/**
 * Closes an active Razorpay Dynamic UPI QR code when user switches payment method or closes modal
 */
export async function closeDynamicQrOnServer(params: {
  qrId: string;
  bookingId: string;
  paymentMode?: 'advance_20' | 'full';
}): Promise<void> {
  if (!params.qrId) return;
  try {
    await fetchWithTimeout(
      '/api/payment-gateway',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_qr',
          ...params
        })
      },
      6000
    );
  } catch {}
}

/**
 * Step 2: Verify Razorpay Payment on the server (/api/verify-payment)
 * Strictly validates payment status & signature on backend. Never confirms unverified payments.
 */
export async function verifyRazorpayPaymentOnServer(params: {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  qr_id?: string;
  bookingId: string;
  verificationToken: string;
  bookingDraft: BookingRecord;
  clientPublicKeyId?: string;
}): Promise<{
  verified: boolean;
  status: 'paid' | 'processing' | 'failed';
  booking?: BookingRecord;
  notificationsDispatched?: boolean;
  message?: string;
}> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetchWithTimeout(
        '/api/verify-payment',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify(params)
        },
        14000
      );

      const data = await response.json().catch(() => null);
      if (response.ok && data && data.success && data.verified && data.booking) {
        return {
          verified: true,
          status: 'paid',
          booking: data.booking as BookingRecord,
          notificationsDispatched: Boolean(
            data.notificationsDispatched ||
              data.notifications?.customer?.whatsappDispatched ||
              data.notifications?.customer?.dispatched
          )
        };
      }

      if (response.status === 202 || data?.status === 'processing') {
        return {
          verified: false,
          status: 'processing',
          message:
            data?.error ||
            'Payment is still being processed by your bank/UPI app. Your booking will confirm automatically once verified.'
        };
      }

      if (data?.status === 'failed') {
        throw new Error(data?.error || 'Payment failed or was declined by your bank/UPI app.');
      }

      lastError = new Error(
        data?.error ||
          `Payment verification failed on server (HTTP ${response.status}). Booking could not be confirmed.`
      );
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('Payment failed or was declined')) {
        throw lastError;
      }
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 900));
      }
    }
  }

  throw (
    lastError ||
    new Error(
      'Unable to verify payment status with server right now. Please tap "Verify Payment Status" to check your payment.'
    )
  );
}

/**
 * Builds a resilient Razorpay Checkout display config that prioritizes the customer's selected
 * payment option at the top while ALWAYS keeping default fallback methods enabled
 * (`show_default_blocks: true`). This permanently prevents "No appropriate payment method found."
 */
function buildCheckoutDisplayConfig(preferredMethod?: PreferredPaymentMethod) {
  const installedUpi = detectInstalledUpiApps();
  const allowedCoreUpiApps = ['google_pay', 'phonepe', 'paytm', 'bhim'];
  const baseApps =
    installedUpi.installedRazorpayAppCodes.filter((c) => allowedCoreUpiApps.includes(c)).length > 0
      ? installedUpi.installedRazorpayAppCodes.filter((c) => allowedCoreUpiApps.includes(c))
      : allowedCoreUpiApps;

  const preferredAppCode =
    preferredMethod && UPI_PACKAGE_MAP[preferredMethod]
      ? UPI_PACKAGE_MAP[preferredMethod].razorpayCode
      : null;

  const orderedUpiApps = preferredAppCode
    ? [preferredAppCode, ...baseApps.filter((app) => app !== preferredAppCode)]
    : baseApps;

  const isAndroid = installedUpi.platform === 'android';

  // (a) QR Preferred Mode inside Razorpay Checkout:
  // Prioritizes UPI QR & UPI Collect/Intent, with default blocks enabled as fallback
  if (preferredMethod === 'qr') {
    return {
      display: {
        blocks: {
          preferred_qr: {
            name: 'UPI QR Code & Instant UPI',
            instruments: [
              {
                method: 'upi',
                flows: isAndroid ? ['qr', 'intent', 'collect'] : ['qr', 'collect']
              }
            ]
          }
        },
        sequence: ['block.preferred_qr'],
        preferences: {
          show_default_blocks: true
        }
      }
    };
  }

  // (b) Cards & NetBanking Preferred Mode
  if (preferredMethod === 'card_netbanking') {
    return {
      display: {
        blocks: {
          cards_banks: {
            name: 'Debit / Credit Cards & NetBanking',
            instruments: [{ method: 'card' }, { method: 'netbanking' }]
          },
          upi_fallback: {
            name: 'UPI (Google Pay, PhonePe, Paytm, BHIM & QR)',
            instruments: [
              {
                method: 'upi',
                flows: isAndroid ? ['intent', 'collect', 'qr'] : ['qr', 'collect', 'intent'],
                apps: orderedUpiApps
              }
            ]
          }
        },
        sequence: ['block.cards_banks', 'block.upi_fallback'],
        preferences: {
          show_default_blocks: true
        }
      }
    };
  }

  // (c) UPI App Mode (Google Pay, PhonePe, Paytm, BHIM):
  // On Android, highlights UPI Intent with the chosen app first + Collect/QR fallback.
  // On iOS/Desktop, highlights UPI QR + Collect + Intent with default blocks enabled so it never fails.
  return {
    display: {
      blocks: {
        upi_preferred: {
          name: preferredAppCode
            ? `Pay via ${UPI_PACKAGE_MAP[preferredMethod!]?.label || 'UPI'} & Instant UPI`
            : 'Pay via UPI (Google Pay, PhonePe, Paytm, BHIM)',
          instruments: [
            {
              method: 'upi',
              flows: isAndroid ? ['intent', 'collect', 'qr'] : ['qr', 'collect', 'intent'],
              apps: orderedUpiApps
            }
          ]
        }
      },
      sequence: ['block.upi_preferred'],
      preferences: {
        show_default_blocks: true
      }
    }
  };
}

/**
 * Open official Razorpay Standard Checkout and verify payment on server
 */
export async function launchRazorpayStandardCheckout(
  checkoutParams: RazorpayCheckoutOptions
): Promise<void> {
  try {
    ensureAndroidWebViewUpiSupport();

    const tripType: TripType = checkoutParams.tripType || 'oneway';
    const cabId: CabCategoryId = checkoutParams.cabId || 'sedan';
    const distanceKm = checkoutParams.distanceKm ?? 130;
    const extraKm = checkoutParams.extraKm ?? 0;
    const pickupDateRaw =
      checkoutParams.pickupDateRaw || new Date().toISOString().split('T')[0];
    const pickupTimeRaw = checkoutParams.pickupTimeRaw || '08:00 AM';
    const includeTolls = checkoutParams.includeTolls ?? true;
    const totalFareRupees =
      checkoutParams.totalFareRupees ??
      (checkoutParams.paymentMode === 'full'
        ? checkoutParams.amountInRupees
        : Math.round(checkoutParams.amountInRupees * 5));
    const clientPublicKeyId = getRazorpayKeyId();

    checkoutParams.onStatusChange?.('Initializing secure Razorpay order...');

    const [orderData, isSdkLoaded] = await Promise.all([
      createRazorpayOrderOnServer({
        bookingId: checkoutParams.bookingId,
        tripType,
        cabId,
        distanceKm,
        extraKm,
        pickupCity: checkoutParams.pickupCity || 'Delhi NCR',
        dropCity: checkoutParams.dropCity || checkoutParams.pickupCity || 'Delhi NCR',
        pickupAddress: checkoutParams.pickupAddress || checkoutParams.pickupCity || 'Doorstep Pickup',
        pickupDate: pickupDateRaw,
        pickupTime: pickupTimeRaw,
        returnDate: checkoutParams.returnDateRaw,
        localPackageId: checkoutParams.localPackageId || '8h_80k',
        includeTolls,
        addonCarrier: Boolean(checkoutParams.addonCarrier),
        addonPet: Boolean(checkoutParams.addonPet),
        addonAssuredModel: Boolean(checkoutParams.addonAssuredModel),
        promoCode: checkoutParams.promoCode,
        promoDiscount: checkoutParams.promoDiscount,
        paymentMode: checkoutParams.paymentMode,
        customerName: checkoutParams.customerName,
        customerPhone: checkoutParams.customerPhone,
        customerEmail: checkoutParams.customerEmail,
        clientExpectedAmountRupees: checkoutParams.amountInRupees,
        clientTotalFareRupees: totalFareRupees,
        clientPublicKeyId,
        forceNewOrder: checkoutParams.forceNewOrder
      }),
      loadRazorpayScript(10000)
    ]);

    // If booking was already verified and paid on a prior attempt, complete immediately without double-charging
    if (orderData.alreadyPaid && orderData.verifiedBooking) {
      checkoutParams.onSuccess(
        orderData.verifiedBooking.transactionId || 'VERIFIED_PAID',
        orderData.verifiedBooking,
        true
      );
      return;
    }

    const RazorpayConstructor =
      typeof window !== 'undefined' ? (window as any).Razorpay : null;

    if (!isSdkLoaded || typeof RazorpayConstructor !== 'function') {
      await logClientPaymentEvent({
        bookingId: checkoutParams.bookingId,
        customerName: checkoutParams.customerName,
        customerPhone: checkoutParams.customerPhone,
        bookingAmount: totalFareRupees,
        advanceAmount: checkoutParams.amountInRupees,
        payableAmount: checkoutParams.amountInRupees,
        paymentMethod: checkoutParams.preferredMethod || 'upi',
        paymentStatus: 'failed',
        failureReason: 'Razorpay checkout.js SDK failed to load (network or ad-blocker)'
      });
      checkoutParams.onError?.(
        'Unable to load Razorpay Checkout SDK (https://checkout.razorpay.com/v1/checkout.js). Please check your internet connection or disable any ad-blocker.'
      );
      return;
    }

    const serverKeyId = cleanClientKey(orderData.keyId) || clientPublicKeyId;
    if (!serverKeyId || !serverKeyId.startsWith('rzp_')) {
      checkoutParams.onError?.(
        'Razorpay Key ID is not configured properly. Please verify RAZORPAY_KEY_ID / VITE_RAZORPAY_KEY_ID in environment settings.'
      );
      return;
    }

    setRazorpayKeyId(serverKeyId);

    const resolvedBookingId = (orderData.bookingId || checkoutParams.bookingId)
      .trim()
      .replace(/^#/, '')
      .toUpperCase();
    const resolvedTotalFare = orderData.fareSummary?.totalFare ?? totalFareRupees;
    const resolvedAdvancePaid = orderData.amountInRupees ?? checkoutParams.amountInRupees;
    const resolvedBalanceDue =
      orderData.fareSummary?.balanceDue ??
      (checkoutParams.paymentMode === 'full'
        ? 0
        : Math.max(0, resolvedTotalFare - resolvedAdvancePaid));

    const customerPhone = (checkoutParams.customerPhone || '')
      .replace(/\D/g, '')
      .slice(-10);
    const customerEmail =
      checkoutParams.customerEmail || 'booking@safarindiacabs.in';

    const baseDraft: BookingRecord = checkoutParams.bookingDraft || {
      id: resolvedBookingId,
      tripType,
      pickupCity: checkoutParams.pickupCity,
      dropCity: checkoutParams.dropCity,
      pickupAddress: checkoutParams.pickupAddress || checkoutParams.pickupCity,
      pickupDate: pickupDateRaw,
      pickupTime: pickupTimeRaw,
      cabId,
      cabName: checkoutParams.cabName,
      distanceKm,
      baseFare: orderData.fareSummary?.baseFare ?? resolvedAdvancePaid,
      driverAllowance: orderData.fareSummary?.driverAllowance ?? 0,
      tollsAndTaxes: orderData.fareSummary?.tollsAndTaxes ?? 0,
      gstAmount: orderData.fareSummary?.gstAmount ?? 0,
      totalFare: resolvedTotalFare,
      advancePaid: resolvedAdvancePaid,
      balanceDue: resolvedBalanceDue,
      paymentMode: checkoutParams.paymentMode,
      paymentMethod: 'Razorpay',
      transactionId: '',
      customerName: checkoutParams.customerName,
      customerPhone,
      customerEmail,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    const synchronizedDraft: BookingRecord = {
      ...baseDraft,
      id: resolvedBookingId,
      totalFare: resolvedTotalFare,
      advancePaid: resolvedAdvancePaid,
      balanceDue: resolvedBalanceDue,
      paymentMode: checkoutParams.paymentMode,
      customerPhone
    };

    const hasServerOrderId =
      typeof orderData.orderId === 'string' && orderData.orderId.startsWith('order_');

    let paymentCompletedOrHandled = false;

    const options: Record<string, any> = {
      key: serverKeyId,
      ...(hasServerOrderId ? { order_id: orderData.orderId } : {}),
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Safar India Cabs',
      description:
        checkoutParams.paymentMode === 'full'
          ? `Full Cab Booking Payment (${resolvedBookingId})`
          : `20% Advance Cab Booking (${resolvedBookingId})`,
      image: '/logo.png',
      // Always keep core methods enabled so Razorpay Checkout never throws "No appropriate payment method found"
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
        emi: false,
        paylater: false
      },
      config: buildCheckoutDisplayConfig(checkoutParams.preferredMethod),
      prefill: {
        name: checkoutParams.customerName,
        contact: customerPhone,
        email: customerEmail
      },
      notes: {
        booking_id: resolvedBookingId,
        verified_booking_id: resolvedBookingId,
        route: `${checkoutParams.pickupCity} -> ${checkoutParams.dropCity}`,
        pickup_date: checkoutParams.pickupDate,
        customer_info: `${String(checkoutParams.customerName || 'Traveler').slice(0, 70)}|${customerPhone}|${String(customerEmail || '').slice(0, 70)}`,
        route_info: `${String(tripType || 'oneway')}|${String(checkoutParams.pickupCity || '').slice(0, 80)}|${String(checkoutParams.dropCity || '').slice(0, 80)}|${String(synchronizedDraft.distanceKm || distanceKm || 130)}`,
        address_info: `${String(synchronizedDraft.pickupAddress || checkoutParams.pickupCity || '').slice(0, 110)}|${String(synchronizedDraft.dropAddress || checkoutParams.dropCity || '').slice(0, 110)}`,
        schedule_info: `${String(pickupDateRaw || '')}|${String(pickupTimeRaw || '')}|${String(cabId || 'sedan')}|${String(checkoutParams.cabName || 'Sedan AC').slice(0, 60)}`,
        fare_info: `${resolvedTotalFare}|${resolvedAdvancePaid}|${resolvedBalanceDue}|${checkoutParams.paymentMode}`
      },
      theme: {
        color: '#F59E0B'
      },
      modal: {
        confirm_close: true,
        backdropclose: false,
        animation: true,
        ondismiss: async function () {
          if (paymentCompletedOrHandled) return;

          // If an order was created and the user closed the modal after paying in a UPI app,
          // check the server status once before marking as cancelled!
          if (hasServerOrderId) {
            checkoutParams.onStatusChange?.('Checking if payment was completed...');
            const statusCheck = await checkPaymentStatusOnServer({
              bookingId: resolvedBookingId,
              orderId: orderData.orderId,
              bookingDraft: synchronizedDraft
            });
            if (statusCheck.status === 'paid' && statusCheck.verified && statusCheck.booking) {
              paymentCompletedOrHandled = true;
              checkoutParams.onSuccess(
                statusCheck.paymentId || statusCheck.booking.transactionId,
                statusCheck.booking,
                true
              );
              return;
            }
            if (statusCheck.status === 'processing') {
              paymentCompletedOrHandled = true;
              checkoutParams.onVerificationPending?.({
                paymentId: statusCheck.paymentId || '',
                orderId: orderData.orderId,
                bookingId: resolvedBookingId,
                message:
                  'Your payment is currently being processed by your bank/UPI app. We are monitoring its status.'
              });
              return;
            }
          }

          await logClientPaymentEvent({
            bookingId: resolvedBookingId,
            customerName: checkoutParams.customerName,
            customerPhone,
            bookingAmount: resolvedTotalFare,
            advanceAmount: resolvedAdvancePaid,
            payableAmount: resolvedAdvancePaid,
            razorpayOrderId: orderData.orderId || '',
            paymentMethod: checkoutParams.preferredMethod || 'upi',
            paymentStatus: 'cancelled',
            failureReason: 'Customer closed Razorpay Checkout modal before completing payment'
          });
          checkoutParams.onDismiss?.();
        }
      },
      handler: async function (response: {
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) {
        paymentCompletedOrHandled = true;
        if (!response || !response.razorpay_payment_id) {
          checkoutParams.onError?.(
            'Payment response from Razorpay is incomplete. Booking could not be verified.'
          );
          return;
        }

        const cleanPaymentId = String(response.razorpay_payment_id).trim();
        const resolvedOrderId =
          response.razorpay_order_id || (hasServerOrderId ? orderData.orderId : '');

        try {
          checkoutParams.onStatusChange?.('Verifying payment signature & status with server...');
          const verificationResult = await verifyRazorpayPaymentOnServer({
            razorpay_order_id: resolvedOrderId,
            razorpay_payment_id: cleanPaymentId,
            razorpay_signature: response.razorpay_signature || '',
            bookingId: resolvedBookingId,
            verificationToken: orderData.verificationToken,
            bookingDraft: synchronizedDraft,
            clientPublicKeyId: serverKeyId
          });

          if (verificationResult.status === 'processing') {
            checkoutParams.onVerificationPending?.({
              paymentId: cleanPaymentId,
              orderId: resolvedOrderId,
              bookingId: resolvedBookingId,
              message:
                verificationResult.message ||
                'Payment is currently processing. Tap "Verify Payment Status" in a moment to confirm.'
            });
            return;
          }

          if (verificationResult.verified && verificationResult.booking) {
            await logClientPaymentEvent({
              bookingId: resolvedBookingId,
              customerName: checkoutParams.customerName,
              customerPhone,
              bookingAmount: resolvedTotalFare,
              advanceAmount: resolvedAdvancePaid,
              payableAmount: resolvedAdvancePaid,
              razorpayOrderId: resolvedOrderId,
              paymentId: cleanPaymentId,
              paymentMethod: verificationResult.booking.paymentMethod || checkoutParams.preferredMethod || 'upi',
              paymentStatus: 'paid',
              gatewayResponseSummary: 'Verified via /api/verify-payment'
            });

            checkoutParams.onSuccess(
              cleanPaymentId,
              verificationResult.booking,
              verificationResult.notificationsDispatched
            );
            return;
          }

          checkoutParams.onError?.(
            'Payment could not be verified on the server. Please tap "Verify Payment Status" if money was debited.'
          );
        } catch (verifyErr: any) {
          const errMessage = String(verifyErr?.message || '');
          if (errMessage.includes('Payment failed or was declined')) {
            checkoutParams.onError?.(errMessage);
            return;
          }

          // Never mark booking as confirmed without server verification; instead move to pending verification state
          // so the customer can re-verify with 1 tap without losing their payment reference!
          checkoutParams.onVerificationPending?.({
            paymentId: cleanPaymentId,
            orderId: resolvedOrderId,
            bookingId: resolvedBookingId,
            message:
              errMessage ||
              `Payment Reference ${cleanPaymentId} received, awaiting server verification. Tap "Verify Payment Status" to complete confirmation.`
          });
        }
      }
    };

    const rzp = new RazorpayConstructor(options);

    rzp.on('payment.failed', async function (errResp: any) {
      const errObj = errResp?.error || {};
      const reason =
        errObj.description ||
        errObj.reason ||
        'Payment failed or was declined by your bank/UPI app. Please try again.';
      const failedPaymentId = errObj?.metadata?.payment_id || '';

      await logClientPaymentEvent({
        bookingId: resolvedBookingId,
        customerName: checkoutParams.customerName,
        customerPhone,
        bookingAmount: resolvedTotalFare,
        advanceAmount: resolvedAdvancePaid,
        payableAmount: resolvedAdvancePaid,
        razorpayOrderId: orderData.orderId || '',
        paymentId: failedPaymentId,
        paymentMethod: checkoutParams.preferredMethod || 'upi',
        paymentStatus: 'failed',
        failureReason: `${errObj.code || 'PAYMENT_FAILED'}: ${reason}`,
        gatewayResponseSummary: JSON.stringify({
          code: errObj.code,
          step: errObj.step,
          source: errObj.source,
          reason: errObj.reason
        })
      });

      checkoutParams.onError?.(reason);
    });

    checkoutParams.onStatusChange?.('Opening Razorpay Checkout...');
    rzp.open();
    applyRazorpayModalOverlapFix();
  } catch (err: any) {
    console.error('[Razorpay Checkout] Exception in launchRazorpayStandardCheckout:', err);
    await logClientPaymentEvent({
      bookingId: checkoutParams.bookingId,
      customerName: checkoutParams.customerName,
      customerPhone: checkoutParams.customerPhone,
      bookingAmount: checkoutParams.totalFareRupees || checkoutParams.amountInRupees,
      advanceAmount: checkoutParams.amountInRupees,
      payableAmount: checkoutParams.amountInRupees,
      paymentMethod: checkoutParams.preferredMethod || 'upi',
      paymentStatus: 'failed',
      failureReason: err?.message || 'Unable to start Razorpay checkout'
    });
    checkoutParams.onError?.(
      err?.message || 'Unable to start Razorpay checkout. Please try again.'
    );
  }
}
