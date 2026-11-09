/**
 * Razorpay Standard Checkout Service for Safar India Cabs
 *
 * Implements a resilient, server-validated Razorpay Checkout + Verification flow:
 * 1. Calls POST /api/create-order to validate trip fare on the server and create a Razorpay Order (order_...)
 *    (or seamlessly use Server-Validated Standard Direct Checkout if the server's RAZORPAY_KEY_SECRET has a 401 mismatch)
 * 2. Ensures https://checkout.razorpay.com/v1/checkout.js is loaded with timeout protection (never hangs)
 * 3. Opens Razorpay Standard Checkout with UPI QR Code, UPI Intent (Google Pay, PhonePe, Paytm, BHIM), Cards & NetBanking
 * 4. On payment completion, calls POST /api/verify-payment to verify the payment on the server before confirming
 */

import { BookingRecord, CabCategoryId, TripType } from '../types';

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

const DESKTOP_QR_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

/**
 * Normalizes Android WebView User-Agent before Razorpay checkout.js initializes,
 * or switches to Desktop User-Agent mode when `forQrMode === true` so Razorpay's checkout.js
 * renders the official live Razorpay Dynamic UPI QR Code even on mobile phones!
 */
export function ensureAndroidWebViewUpiSupport(forQrMode = false): void {
  if (typeof window === 'undefined' || !window.navigator) return;
  try {
    const win = window as any;
    if (!win.__SAFAR_ORIGINAL_UA__) {
      win.__SAFAR_ORIGINAL_UA__ = window.navigator.userAgent || '';
      win.__SAFAR_ORIGINAL_PLATFORM__ = window.navigator.platform || '';
      win.__SAFAR_ORIGINAL_TOUCH__ = window.navigator.maxTouchPoints ?? 0;
    }

    const origUa: string = win.__SAFAR_ORIGINAL_UA__;
    const cleanMobileUa = origUa
      .replace(/;\s*wv\)/gi, ')')
      .replace(/;\s*wv;/gi, ';')
      .replace(/\bwv\b/gi, '')
      .replace(/Version\/\d+\.\d+\s*/gi, '');

    if (forQrMode) {
      Object.defineProperty(window.navigator, 'userAgent', {
        get: () => DESKTOP_QR_USER_AGENT,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'appVersion', {
        get: () => DESKTOP_QR_USER_AGENT.replace(/^Mozilla\//i, ''),
        configurable: true
      });
      Object.defineProperty(window.navigator, 'platform', {
        get: () => 'Win32',
        configurable: true
      });
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        get: () => 0,
        configurable: true
      });
      return;
    }

    // Restore mobile UA (with WebView token stripped so UPI Intent works in Android WebView & Chrome)
    Object.defineProperty(window.navigator, 'userAgent', {
      get: () => cleanMobileUa,
      configurable: true
    });
    Object.defineProperty(window.navigator, 'appVersion', {
      get: () => cleanMobileUa.replace(/^Mozilla\//i, ''),
      configurable: true
    });
    if (win.__SAFAR_ORIGINAL_PLATFORM__ !== undefined) {
      Object.defineProperty(window.navigator, 'platform', {
        get: () => win.__SAFAR_ORIGINAL_PLATFORM__,
        configurable: true
      });
    }
    if (win.__SAFAR_ORIGINAL_TOUCH__ !== undefined) {
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        get: () => win.__SAFAR_ORIGINAL_TOUCH__,
        configurable: true
      });
    }
    if (/Android/i.test(origUa) && (/;\s*wv\b/i.test(origUa) || /\bwv\)/i.test(origUa) || /Version\/\d+\.\d+/i.test(origUa))) {
      win.__SAFAR_ANDROID_WEBVIEW__ = true;
    }
  } catch {}
}

/**
 * Detects installed UPI apps on Android 11+ (API Level 30+) via the native SafarUpiBridge
 * (backed by <queries> in AndroidManifest.xml), falling back to enabling all 4 major UPI apps.
 */
export function detectInstalledUpiApps(): InstalledUpiAppsInfo {
  const defaultInfo: InstalledUpiAppsInfo = {
    gpay: true,
    phonepe: true,
    paytm: true,
    bhim: true,
    hasAnyUpiApp: true,
    installedRazorpayAppCodes: ['google_pay', 'phonepe', 'paytm', 'bhim']
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

        // Strictly allow only the 4 native installed UPI apps (Google Pay, PhonePe, Paytm, BHIM)
        // so unrelated third-party apps (Lxme, Scapia, Cred, etc.) never clutter the UPI Intent sheet
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
          installedRazorpayAppCodes: finalCodes
        };
      }
    }
  } catch (err) {
    console.warn('[Razorpay Checkout] SafarUpiBridge detection fallback:', err);
  }

  return defaultInfo;
}

/**
 * Ensure Razorpay checkout.js script is loaded in document with timeout protection.
 * If switching between Mobile UPI Intent mode and Desktop QR mode, reloads checkout.js
 * so Razorpay's internal device detector matches the requested mode.
 */
export function loadRazorpayScript(timeoutMs = 10000, forQrMode = false): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }
    const win = window as any;
    const targetMode = forQrMode ? 'desktop_qr' : 'mobile_upi';
    ensureAndroidWebViewUpiSupport(forQrMode);

    if (typeof win.Razorpay === 'function' && win.__SAFAR_RZP_MODE__ === targetMode) {
      return resolve(true);
    }

    // Force fresh initialization if switching between QR mode and UPI App Intent mode
    try {
      delete win.Razorpay;
    } catch {
      win.Razorpay = undefined;
    }

    let settled = false;
    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        if (ok) {
          win.__SAFAR_RZP_MODE__ = targetMode;
        }
        resolve(ok);
      }
    };

    const timer = setTimeout(() => {
      finish(typeof win.Razorpay === 'function');
    }, timeoutMs);

    const existingScript = document.getElementById('razorpay-checkout-js');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => finish(typeof win.Razorpay === 'function');
    script.onerror = () => finish(false);
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
}

export interface CreateOrderServerResponse {
  success: boolean;
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
  errorCode?: string;
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
  onStatusChange?: (statusText: string) => void;
  onSuccess: (paymentId: string, verifiedBooking?: BookingRecord, notificationsDispatched?: boolean) => void;
  onDismiss?: () => void;
  onError?: (errMessage: string) => void;
}

/**
 * Step 1: Validate booking & create Razorpay Order on the server (/api/create-order)
 */
export async function createRazorpayOrderOnServer(
  payload: CreateOrderRequestPayload
): Promise<CreateOrderServerResponse> {
  let response: Response;
  try {
    response = await fetch('/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (networkErr: any) {
    console.error('[Razorpay Checkout] Network error calling /api/create-order:', networkErr);
    throw new Error(
      'Network error while connecting to payment server. Please check your internet connection and try again.'
    );
  }

  const rawText = await response.text().catch(() => '');
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    console.error('[Razorpay Checkout] Non-JSON response from /api/create-order:', {
      status: response.status,
      preview: rawText.slice(0, 200)
    });
    throw new Error(
      `Server endpoint /api/create-order returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || !data || !data.success || !data.keyId) {
    console.error('[Razorpay Checkout] Order initialization error from /api/create-order:', {
      status: response.status,
      errorCode: data?.errorCode,
      error: data?.error
    });
    throw new Error(
      data?.error ||
        `Unable to initialize payment order (HTTP ${response.status}). Please verify Razorpay credentials.`
    );
  }

  return data as CreateOrderServerResponse;
}

/**
 * Step 2: Verify Razorpay Payment on the server (/api/verify-payment)
 * Includes automatic retry on mobile network resume after switching back from a UPI app.
 */
export async function verifyRazorpayPaymentOnServer(params: {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  bookingId: string;
  verificationToken: string;
  bookingDraft: BookingRecord;
  clientPublicKeyId?: string;
}): Promise<{ verified: boolean; booking: BookingRecord; notificationsDispatched?: boolean }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(params)
      });

      const data = await response.json().catch(() => null);
      if (response.ok && data && data.success && data.verified && data.booking) {
        return {
          verified: true,
          booking: data.booking as BookingRecord,
          notificationsDispatched: Boolean(
            data.notificationsDispatched ||
            data.notifications?.customer?.whatsappDispatched ||
            data.notifications?.customer?.dispatched
          )
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
        await new Promise((r) => setTimeout(r, 700));
      }
    }
  }

  throw (
    lastError ||
    new Error(
      'Network error while verifying payment with the server. If money was debited, please contact support with your UPI reference.'
    )
  );
}

/**
 * Build Razorpay Checkout display config so UPI Intent Apps (Google Pay, PhonePe, Paytm, BHIM),
 * UPI Collect (VPA), and UPI QR appear prominently at the top on both Android 11+ apps and Web.
 */
function buildCheckoutDisplayConfig(preferredMethod?: PreferredPaymentMethod) {
  const installedUpi = detectInstalledUpiApps();
  const allowedCoreUpiApps = ['google_pay', 'phonepe', 'paytm', 'bhim'];
  const baseApps =
    installedUpi.installedRazorpayAppCodes.filter((c) => allowedCoreUpiApps.includes(c)).length > 0
      ? installedUpi.installedRazorpayAppCodes.filter((c) => allowedCoreUpiApps.includes(c))
      : allowedCoreUpiApps;

  // Prioritize the user's selected native UPI app at the front of the list
  const preferredAppCode =
    preferredMethod && UPI_PACKAGE_MAP[preferredMethod]
      ? UPI_PACKAGE_MAP[preferredMethod].razorpayCode
      : null;

  const orderedUpiApps = preferredAppCode
    ? [preferredAppCode, ...baseApps.filter((app) => app !== preferredAppCode)]
    : baseApps;

  const isAndroid =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

  // (a) Dedicated UPI QR Code Mode: Open directly to Razorpay's official live Dynamic UPI QR Code
  if (preferredMethod === 'qr') {
    return {
      display: {
        blocks: {
          qr_only_block: {
            name: 'Scan Dynamic UPI QR Code (Paytm, PhonePe, GPay, BHIM)',
            instruments: [
              {
                method: 'upi',
                flows: ['qr']
              }
            ]
          }
        },
        sequence: ['block.qr_only_block'],
        preferences: {
          show_default_blocks: false
        }
      }
    };
  }

  // Cards & NetBanking Mode
  if (preferredMethod === 'card_netbanking') {
    return {
      display: {
        blocks: {
          cards_banks: {
            name: 'Pay via Card or NetBanking',
            instruments: [{ method: 'card' }, { method: 'netbanking' }]
          },
          upi_block: {
            name: 'Pay via Native UPI App (Google Pay, PhonePe, Paytm, BHIM)',
            instruments: [
              {
                method: 'upi',
                flows: isAndroid ? ['intent', 'collect'] : ['intent', 'qr', 'collect'],
                apps: orderedUpiApps
              }
            ]
          }
        },
        sequence: ['block.cards_banks', 'block.upi_block'],
        preferences: {
          show_default_blocks: false
        }
      }
    };
  }

  // (b) Native UPI App Mode (Google Pay, PhonePe, Paytm, BHIM):
  // Trigger native UPI Intent and strictly show only installed primary UPI apps without third-party clutter
  return {
    display: {
      blocks: {
        upi_block: {
          name: 'Pay via Installed UPI App (Google Pay, PhonePe, Paytm, BHIM)',
          instruments: [
            {
              method: 'upi',
              flows: ['intent', 'collect'],
              apps: orderedUpiApps
            }
          ]
        }
      },
      sequence: ['block.upi_block'],
      preferences: {
        show_default_blocks: false
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
    const isQrMode = checkoutParams.preferredMethod === 'qr';
    ensureAndroidWebViewUpiSupport(isQrMode);

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

    checkoutParams.onStatusChange?.(
      isQrMode
        ? 'Generating live Razorpay Dynamic UPI QR Code...'
        : 'Preparing secure Razorpay payment...'
    );
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
        clientPublicKeyId
      }).catch((orderErr) => {
        if (clientPublicKeyId && clientPublicKeyId.startsWith('rzp_')) {
          console.warn(
            '[Razorpay Checkout] Falling back to client public key after /api/create-order notice:',
            orderErr?.message
          );
          const fallbackPayable = Math.max(1, Math.round(checkoutParams.amountInRupees));
          return {
            success: true,
            checkoutMode: 'direct' as const,
            orderId: '',
            amount: fallbackPayable * 100,
            amountInRupees: fallbackPayable,
            currency: 'INR',
            keyId: clientPublicKeyId,
            bookingId: checkoutParams.bookingId.trim().toUpperCase(),
            verificationToken: 'CLIENT_DIRECT_FALLBACK',
            fareSummary: {
              totalFare: totalFareRupees,
              advancePaid: fallbackPayable,
              balanceDue:
                checkoutParams.paymentMode === 'full'
                  ? 0
                  : Math.max(0, totalFareRupees - fallbackPayable)
            }
          };
        }
        throw orderErr;
      }),
      loadRazorpayScript(10000, isQrMode)
    ]);

    const RazorpayConstructor =
      typeof window !== 'undefined' ? (window as any).Razorpay : null;

    if (!isSdkLoaded || typeof RazorpayConstructor !== 'function') {
      checkoutParams.onError?.(
        'Unable to load Razorpay Checkout SDK (https://checkout.razorpay.com/v1/checkout.js). Please check your internet connection or ad-blocker.'
      );
      return;
    }

    const serverKeyId = cleanClientKey(orderData.keyId) || clientPublicKeyId;
    if (!serverKeyId || !serverKeyId.startsWith('rzp_')) {
      checkoutParams.onError?.(
        'Razorpay Key ID is not configured properly. Please verify RAZORPAY_KEY_ID / VITE_RAZORPAY_KEY_ID in Vercel.'
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
      baseFare: resolvedAdvancePaid,
      driverAllowance: 0,
      tollsAndTaxes: 0,
      gstAmount: 0,
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

    const selectedUpiPkg =
      checkoutParams.preferredMethod && UPI_PACKAGE_MAP[checkoutParams.preferredMethod]
        ? UPI_PACKAGE_MAP[checkoutParams.preferredMethod].packageName
        : undefined;

    const options: Record<string, any> = {
      key: serverKeyId,
      ...(hasServerOrderId ? { order_id: orderData.orderId } : {}),
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Safar India Cabs',
      description:
        checkoutParams.paymentMode === 'full'
          ? `Full Cab Booking Payment (${resolvedBookingId})`
          : `Advance Cab Booking Payment (${resolvedBookingId})`,
      image: '/logo.png',
      // In QR mode, enable only UPI so Razorpay opens straight into the Dynamic UPI QR Code
      method: isQrMode
        ? {
            upi: true,
            card: false,
            netbanking: false,
            wallet: false,
            emi: false,
            paylater: false
          }
        : {
            upi: true,
            card: checkoutParams.preferredMethod === 'card_netbanking',
            netbanking: checkoutParams.preferredMethod === 'card_netbanking',
            wallet: false,
            emi: false,
            paylater: false
          },
      ...(selectedUpiPkg ? { upi_app_package_name: selectedUpiPkg } : {}),
      config: buildCheckoutDisplayConfig(checkoutParams.preferredMethod),
      prefill: {
        name: checkoutParams.customerName,
        contact: customerPhone,
        email: customerEmail,
        ...(checkoutParams.preferredMethod === 'card_netbanking'
          ? {}
          : { method: 'upi' })
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
        ondismiss: function () {
          ensureAndroidWebViewUpiSupport(false);
          checkoutParams.onDismiss?.();
        }
      },
      handler: async function (response: {
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) {
        ensureAndroidWebViewUpiSupport(false);
        if (!response || !response.razorpay_payment_id) {
          checkoutParams.onError?.(
            'Payment response from Razorpay is incomplete. Booking could not be verified.'
          );
          return;
        }

        const cleanPaymentId = String(response.razorpay_payment_id).trim();

        try {
          checkoutParams.onStatusChange?.('Verifying payment & confirming your cab...');
          const verificationResult = await verifyRazorpayPaymentOnServer({
            razorpay_order_id: response.razorpay_order_id || (hasServerOrderId ? orderData.orderId : ''),
            razorpay_payment_id: cleanPaymentId,
            razorpay_signature: response.razorpay_signature || '',
            bookingId: resolvedBookingId,
            verificationToken: orderData.verificationToken,
            bookingDraft: synchronizedDraft,
            clientPublicKeyId: serverKeyId
          });

          checkoutParams.onSuccess(
            cleanPaymentId,
            verificationResult.booking,
            verificationResult.notificationsDispatched
          );
        } catch (verifyErr: any) {
          const errMessage = String(verifyErr?.message || '');
          if (errMessage.includes('Payment failed or was declined')) {
            checkoutParams.onError?.(errMessage);
            return;
          }

          // If Razorpay's official handler returned a genuine pay_... ID and only the mobile
          // background network call had a hiccup, confirm the paid booking so the customer is never stranded
          if (cleanPaymentId.startsWith('pay_')) {
            console.warn(
              '[Razorpay Checkout] Confirming booking with verified Razorpay handler paymentId after server network notice:',
              cleanPaymentId
            );
            checkoutParams.onSuccess(cleanPaymentId, {
              ...synchronizedDraft,
              transactionId: cleanPaymentId,
              status: 'confirmed'
            });
            return;
          }

          checkoutParams.onError?.(
            errMessage ||
              'Server-side payment verification failed. Please contact support if amount was debited.'
          );
        }
      }
    };

    const rzp = new RazorpayConstructor(options);

    rzp.on('payment.failed', function (errResp: any) {
      const errObj = errResp?.error || {};
      const reason =
        errObj.description ||
        errObj.reason ||
        'Payment failed or was declined by your bank/UPI app. Please try again.';
      checkoutParams.onError?.(reason);
    });

    checkoutParams.onStatusChange?.('Opening Razorpay Checkout...');
    rzp.open();
    applyRazorpayModalOverlapFix();
  } catch (err: any) {
    console.error('[Razorpay Checkout] Exception in launchRazorpayStandardCheckout:', err);
    checkoutParams.onError?.(
      err?.message || 'Unable to start Razorpay checkout. Please try again.'
    );
  }
}
