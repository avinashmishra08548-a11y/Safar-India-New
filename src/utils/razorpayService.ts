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

/**
 * Normalizes Android WebView User-Agent before Razorpay checkout.js initializes.
 * Razorpay's web script hides UPI Intent apps when it sees "; wv" or "Version/4.0" in navigator.userAgent.
 */
export function ensureAndroidWebViewUpiSupport(): void {
  if (typeof window === 'undefined' || !window.navigator) return;
  try {
    const ua = window.navigator.userAgent || '';
    if (/Android/i.test(ua) && (/;\s*wv\b/i.test(ua) || /\bwv\)/i.test(ua) || /Version\/\d+\.\d+/i.test(ua))) {
      const cleanUa = ua
        .replace(/;\s*wv\)/gi, ')')
        .replace(/;\s*wv;/gi, ';')
        .replace(/\bwv\b/gi, '')
        .replace(/Version\/\d+\.\d+\s*/gi, '');
      Object.defineProperty(window.navigator, 'userAgent', {
        get: () => cleanUa,
        configurable: true
      });
      Object.defineProperty(window.navigator, 'appVersion', {
        get: () => cleanUa.replace(/^Mozilla\//i, ''),
        configurable: true
      });
      (window as any).__SAFAR_ANDROID_WEBVIEW__ = true;
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
        if (parsed.cred) codes.push('cred');
        if (parsed.amazon_pay) codes.push('amazon_pay');

        // Always keep all 4 primary apps visible in Razorpay sheet if none returned so UI never hides UPI
        const finalCodes =
          codes.length > 0 ? codes : ['google_pay', 'phonepe', 'paytm', 'bhim'];

        return {
          gpay: parsed.gpay !== false,
          phonepe: parsed.phonepe !== false,
          paytm: parsed.paytm !== false,
          bhim: parsed.bhim !== false,
          cred: Boolean(parsed.cred),
          amazon_pay: Boolean(parsed.amazon_pay),
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
 * Ensure Razorpay checkout.js script is loaded in document with timeout protection
 */
export function loadRazorpayScript(timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(false);
    }
    ensureAndroidWebViewUpiSupport();

    if (typeof (window as any).Razorpay === 'function') {
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
      finish(typeof (window as any).Razorpay === 'function');
    }, timeoutMs);

    const existingScript = document.getElementById('razorpay-checkout-js');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => finish(typeof (window as any).Razorpay === 'function');
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
  totalFareRupees?: number;
  bookingDraft?: BookingRecord;
  onStatusChange?: (statusText: string) => void;
  onSuccess: (paymentId: string, verifiedBooking?: BookingRecord) => void;
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
 */
export async function verifyRazorpayPaymentOnServer(params: {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  bookingId: string;
  verificationToken: string;
  bookingDraft: BookingRecord;
  clientPublicKeyId?: string;
}): Promise<{ verified: boolean; booking: BookingRecord }> {
  let response: Response;
  try {
    response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(params)
    });
  } catch (networkErr: any) {
    console.error('[Razorpay Checkout] Network error calling /api/verify-payment:', networkErr);
    throw new Error(
      'Network error while verifying payment with the server. If money was debited, please contact support with your UPI reference.'
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !data.success || !data.verified || !data.booking) {
    console.error('[Razorpay Checkout] Verification failed on /api/verify-payment:', {
      status: response.status,
      error: data?.error
    });
    throw new Error(
      data?.error ||
        `Payment verification failed on server (HTTP ${response.status}). Booking could not be confirmed.`
    );
  }

  return {
    verified: true,
    booking: data.booking as BookingRecord
  };
}

/**
 * Build Razorpay Checkout display config so UPI Intent Apps (Google Pay, PhonePe, Paytm, BHIM),
 * UPI Collect (VPA), and UPI QR appear prominently at the top on both Android 11+ apps and Web.
 */
function buildCheckoutDisplayConfig(preferredMethod?: PreferredPaymentMethod) {
  const installedUpi = detectInstalledUpiApps();
  const baseApps = installedUpi.installedRazorpayAppCodes.length > 0
    ? [...installedUpi.installedRazorpayAppCodes]
    : ['google_pay', 'phonepe', 'paytm', 'bhim'];

  // Prioritize the user's selected UPI app at the front of the list
  const preferredAppCode =
    preferredMethod && UPI_PACKAGE_MAP[preferredMethod]
      ? UPI_PACKAGE_MAP[preferredMethod].razorpayCode
      : null;

  const orderedUpiApps = preferredAppCode
    ? [preferredAppCode, ...baseApps.filter((app) => app !== preferredAppCode)]
    : baseApps;

  const isAndroid =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

  if (preferredMethod === 'card_netbanking') {
    return {
      display: {
        blocks: {
          cards_banks: {
            name: 'Pay via Card or NetBanking',
            instruments: [{ method: 'card' }, { method: 'netbanking' }]
          },
          upi_block: {
            name: 'Pay via UPI Apps (GPay, PhonePe, Paytm, BHIM)',
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
          show_default_blocks: true
        }
      }
    };
  }

  // On Android (or when a UPI app is selected), prioritize 'intent' and 'collect' flows
  // so installed UPI apps (Google Pay, PhonePe, Paytm, BHIM) render at the very top of the payment sheet.
  const upiFlows =
    preferredMethod === 'qr' && !isAndroid
      ? ['qr', 'intent', 'collect']
      : isAndroid
      ? ['intent', 'collect']
      : ['intent', 'qr', 'collect'];

  return {
    display: {
      blocks: {
        upi_block: {
          name: 'UPI Apps (GPay, PhonePe, Paytm, BHIM)',
          instruments: [
            {
              method: 'upi',
              flows: upiFlows,
              apps: orderedUpiApps
            }
          ]
        },
        cards_banks: {
          name: 'Cards & NetBanking',
          instruments: [{ method: 'card' }, { method: 'netbanking' }, { method: 'wallet' }]
        }
      },
      sequence: ['block.upi_block', 'block.cards_banks'],
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

    checkoutParams.onStatusChange?.('Preparing secure Razorpay payment...');
    const [orderData, isSdkLoaded] = await Promise.all([
      createRazorpayOrderOnServer({
        bookingId: checkoutParams.bookingId,
        tripType,
        cabId,
        distanceKm,
        extraKm,
        pickupCity: checkoutParams.pickupCity,
        dropCity: checkoutParams.dropCity,
        pickupAddress: checkoutParams.pickupAddress || checkoutParams.pickupCity,
        pickupDate: pickupDateRaw,
        pickupTime: pickupTimeRaw,
        returnDate: checkoutParams.returnDateRaw,
        localPackageId: checkoutParams.localPackageId || '8h_80k',
        includeTolls,
        addonCarrier: Boolean(checkoutParams.addonCarrier),
        addonPet: Boolean(checkoutParams.addonPet),
        addonAssuredModel: Boolean(checkoutParams.addonAssuredModel),
        paymentMode: checkoutParams.paymentMode,
        customerName: checkoutParams.customerName,
        customerPhone: checkoutParams.customerPhone,
        customerEmail: checkoutParams.customerEmail,
        clientExpectedAmountRupees: checkoutParams.amountInRupees,
        clientTotalFareRupees: totalFareRupees,
        clientPublicKeyId
      }),
      loadRazorpayScript()
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

    const customerPhone = (checkoutParams.customerPhone || '')
      .replace(/\D/g, '')
      .slice(-10);
    const customerEmail =
      checkoutParams.customerEmail || 'booking@safarindiacabs.in';

    const fallbackDraft: BookingRecord = checkoutParams.bookingDraft || {
      id: checkoutParams.bookingId,
      tripType,
      pickupCity: checkoutParams.pickupCity,
      dropCity: checkoutParams.dropCity,
      pickupAddress: checkoutParams.pickupAddress || checkoutParams.pickupCity,
      pickupDate: pickupDateRaw,
      pickupTime: pickupTimeRaw,
      cabId,
      cabName: checkoutParams.cabName,
      distanceKm,
      baseFare: orderData.amountInRupees,
      driverAllowance: 0,
      tollsAndTaxes: 0,
      gstAmount: 0,
      totalFare: totalFareRupees,
      advancePaid: orderData.amountInRupees,
      balanceDue: Math.max(0, totalFareRupees - orderData.amountInRupees),
      paymentMode: checkoutParams.paymentMode,
      paymentMethod: 'Razorpay',
      transactionId: '',
      customerName: checkoutParams.customerName,
      customerPhone,
      customerEmail,
      status: 'confirmed',
      createdAt: new Date().toISOString()
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
          ? `Full Cab Booking Payment (${checkoutParams.bookingId})`
          : `Advance Cab Booking Payment (${checkoutParams.bookingId})`,
      image: '/logo.png',
      // Explicitly enable UPI first and disable EMI/PayLater clutter so UPI is always rendered
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
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
        booking_id: checkoutParams.bookingId,
        route: `${checkoutParams.pickupCity} -> ${checkoutParams.dropCity}`,
        pickup_date: checkoutParams.pickupDate
      },
      theme: {
        color: '#F59E0B'
      },
      modal: {
        confirm_close: true,
        backdropclose: false,
        animation: true,
        ondismiss: function () {
          checkoutParams.onDismiss?.();
        }
      },
      handler: async function (response: {
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
      }) {
        if (!response || !response.razorpay_payment_id) {
          checkoutParams.onError?.(
            'Payment response from Razorpay is incomplete. Booking could not be verified.'
          );
          return;
        }

        try {
          checkoutParams.onStatusChange?.('Verifying payment & confirming your cab...');
          const verificationResult = await verifyRazorpayPaymentOnServer({
            razorpay_order_id: response.razorpay_order_id || (hasServerOrderId ? orderData.orderId : ''),
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature || '',
            bookingId: checkoutParams.bookingId,
            verificationToken: orderData.verificationToken,
            bookingDraft: fallbackDraft,
            clientPublicKeyId
          });

          checkoutParams.onSuccess(
            response.razorpay_payment_id,
            verificationResult.booking
          );
        } catch (verifyErr: any) {
          checkoutParams.onError?.(
            verifyErr?.message ||
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
