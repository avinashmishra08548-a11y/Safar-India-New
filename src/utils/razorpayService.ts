/**
 * Razorpay Standard Checkout Service for Safar India Cabs
 *
 * Implements a secure, server-verified Razorpay Orders + Checkout + Signature/Capture verification flow:
 * 1. Calls POST /api/create-order to validate trip fare on the server and create a Razorpay Order (order_...)
 * 2. Opens Razorpay Standard Checkout using the server-created order_id and matching public key ID
 * 3. On payment completion, calls POST /api/verify-payment to verify the HMAC signature (timing-safe),
 *    confirm order-to-booking association, and verify payment status === 'captured' in INR via Razorpay API
 * 4. Never marks a booking confirmed or paid unless server-side verification succeeds
 */

import { BookingRecord, CabCategoryId, TripType } from '../types';

export const DEFAULT_RAZORPAY_KEY =
  ((import.meta as any).env?.VITE_RAZORPAY_KEY_ID || '').trim();

export type PreferredPaymentMethod =
  | 'qr'
  | 'paytm'
  | 'phonepe'
  | 'gpay'
  | 'bhim'
  | 'card_netbanking';

/**
 * Retrieve configured public Razorpay Key ID from Vite environment
 */
export function getRazorpayKeyId(): string {
  try {
    const viteEnvKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
    if (viteEnvKey && typeof viteEnvKey === 'string' && viteEnvKey.trim().startsWith('rzp_')) {
      return viteEnvKey.trim();
    }
    const saved = localStorage.getItem('safar_razorpay_key');
    if (saved && saved.trim().startsWith('rzp_')) {
      return saved.trim();
    }
  } catch {}
  return '';
}

export function setRazorpayKeyId(key: string): void {
  try {
    if (key && key.trim().startsWith('rzp_')) {
      localStorage.setItem('safar_razorpay_key', key.trim());
    } else {
      localStorage.removeItem('safar_razorpay_key');
    }
  } catch {}
}

/**
 * Ensure Razorpay checkout.js script is loaded in document
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      return resolve(true);
    }
    const existingScript = document.getElementById('razorpay-checkout-js');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
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
  pickupCity: string;
  dropCity: string;
  pickupAddress: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string;
  localPackageId?: string;
  includeTolls: boolean;
  paymentMode: 'advance_20' | 'full';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  clientExpectedAmountRupees: number;
  clientTotalFareRupees: number;
}

export interface CreateOrderServerResponse {
  success: boolean;
  orderId: string;
  amount: number;
  amountInRupees: number;
  currency: string;
  keyId: string;
  bookingId: string;
  verificationToken: string;
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
  // Server order validation & booking verification fields
  tripType?: TripType;
  cabId?: CabCategoryId;
  distanceKm?: number;
  pickupAddress?: string;
  pickupDateRaw?: string;
  pickupTimeRaw?: string;
  returnDateRaw?: string;
  localPackageId?: string;
  includeTolls?: boolean;
  totalFareRupees?: number;
  bookingDraft?: BookingRecord;
  onStatusChange?: (statusText: string) => void;
  onSuccess: (paymentId: string, verifiedBooking?: BookingRecord) => void;
  onDismiss?: () => void;
  onError?: (errMessage: string) => void;
}

/**
 * Step 1: Create Razorpay Order on the server (/api/create-order)
 */
export async function createRazorpayOrderOnServer(
  payload: CreateOrderRequestPayload
): Promise<CreateOrderServerResponse> {
  let response: Response;
  try {
    response = await fetch('/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(
      'Network error while connecting to the payment server. Please check your internet connection and try again.'
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !data.success || !data.orderId || !data.keyId) {
    throw new Error(
      data?.error ||
        `Unable to initialize payment order (HTTP ${response.status}). Please try again.`
    );
  }

  return data as CreateOrderServerResponse;
}

/**
 * Step 2: Verify Razorpay Payment on the server (/api/verify-payment)
 */
export async function verifyRazorpayPaymentOnServer(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId: string;
  verificationToken: string;
  bookingDraft: BookingRecord;
}): Promise<{ verified: boolean; booking: BookingRecord }> {
  let response: Response;
  try {
    response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
  } catch {
    throw new Error(
      'Network error while verifying payment with the server. If money was debited, please contact support with your UPI reference.'
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !data.success || !data.verified || !data.booking) {
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
 * Open official Razorpay Standard Checkout using a server-created order_id and verify payment on server
 */
export async function launchRazorpayStandardCheckout(
  checkoutParams: RazorpayCheckoutOptions
): Promise<void> {
  try {
    checkoutParams.onStatusChange?.('Loading Razorpay secure checkout...');
    const isLoaded = await loadRazorpayScript();
    const Razorpay = typeof window !== 'undefined' ? (window as any).Razorpay : null;

    if (!isLoaded || !Razorpay) {
      checkoutParams.onError?.(
        'Unable to load Razorpay Checkout SDK. Please check your internet connection and disable any ad-blockers.'
      );
      return;
    }

    // Build server order request using actual trip parameters
    const tripType: TripType = checkoutParams.tripType || 'oneway';
    const cabId: CabCategoryId = checkoutParams.cabId || 'sedan';
    const distanceKm = checkoutParams.distanceKm ?? 230;
    const pickupDateRaw =
      checkoutParams.pickupDateRaw || new Date().toISOString().split('T')[0];
    const pickupTimeRaw = checkoutParams.pickupTimeRaw || '08:00 AM';
    const includeTolls = checkoutParams.includeTolls ?? true;
    const totalFareRupees =
      checkoutParams.totalFareRupees ??
      (checkoutParams.paymentMode === 'full'
        ? checkoutParams.amountInRupees
        : Math.round(checkoutParams.amountInRupees * 5));

    checkoutParams.onStatusChange?.('Creating secure payment order...');
    const orderData = await createRazorpayOrderOnServer({
      bookingId: checkoutParams.bookingId,
      tripType,
      cabId,
      distanceKm,
      pickupCity: checkoutParams.pickupCity,
      dropCity: checkoutParams.dropCity,
      pickupAddress: checkoutParams.pickupAddress || checkoutParams.pickupCity,
      pickupDate: pickupDateRaw,
      pickupTime: pickupTimeRaw,
      returnDate: checkoutParams.returnDateRaw,
      localPackageId: checkoutParams.localPackageId || '8h_80k',
      includeTolls,
      paymentMode: checkoutParams.paymentMode,
      customerName: checkoutParams.customerName,
      customerPhone: checkoutParams.customerPhone,
      customerEmail: checkoutParams.customerEmail,
      clientExpectedAmountRupees: checkoutParams.amountInRupees,
      clientTotalFareRupees: totalFareRupees
    });

    // Ensure frontend public key ID (if configured via VITE_RAZORPAY_KEY_ID) matches server key ID
    const viteKeyId = ((import.meta as any).env?.VITE_RAZORPAY_KEY_ID || '').trim();
    if (viteKeyId && viteKeyId !== orderData.keyId) {
      checkoutParams.onError?.(
        'Payment configuration error: Frontend VITE_RAZORPAY_KEY_ID does not match server RAZORPAY_KEY_ID. Please ensure both environment variables use the same Razorpay key.'
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

    const options: Record<string, any> = {
      key: orderData.keyId,
      order_id: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Safar India Cabs',
      description:
        checkoutParams.paymentMode === 'full'
          ? `Full Cab Booking Payment (${checkoutParams.bookingId})`
          : `Advance Cab Booking Payment (${checkoutParams.bookingId})`,
      image: '/logo.png',
      prefill: {
        name: checkoutParams.customerName,
        contact: customerPhone,
        email: customerEmail
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
        if (
          !response ||
          !response.razorpay_payment_id ||
          !response.razorpay_order_id ||
          !response.razorpay_signature
        ) {
          checkoutParams.onError?.(
            'Payment response from Razorpay is incomplete. Booking could not be verified.'
          );
          return;
        }

        try {
          checkoutParams.onStatusChange?.('Verifying payment with Razorpay server...');
          const verificationResult = await verifyRazorpayPaymentOnServer({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            bookingId: checkoutParams.bookingId,
            verificationToken: orderData.verificationToken,
            bookingDraft: fallbackDraft
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

    const rzp = new Razorpay(options);

    rzp.on('payment.failed', function (errResp: any) {
      const errObj = errResp?.error || {};
      const reason =
        errObj.description ||
        errObj.reason ||
        'Payment failed or was declined by your bank/UPI app. Please try again.';
      checkoutParams.onError?.(reason);
    });

    checkoutParams.onStatusChange?.('Waiting for payment in Razorpay checkout...');
    rzp.open();
    applyRazorpayModalOverlapFix();
  } catch (err: any) {
    checkoutParams.onError?.(
      err?.message || 'Unable to start Razorpay checkout. Please try again.'
    );
  }
}
