/**
 * Razorpay Standard Checkout Service for Safar India Cabs
 *
 * Enforces:
 * - Direct UPI Apps (Google Pay, PhonePe, Paytm, BHIM) & Live Dynamic QR Code at topmost position
 * - Exact `upi_block` display configuration with `apps: ['google_pay', 'phonepe', 'paytm', 'bhim']`
 *   and `flows: ['qr', 'intent', 'collect']`
 * - `prefill.method: 'upi'` and `image: '/logo.png'` so UPI Apps & Scan QR render first in Android WebView
 * - Razorpay Modal / Iframe container styling so QR code renders clearly above bottom ad banners
 */

export const DEFAULT_RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag';

export type PreferredPaymentMethod = 'qr' | 'paytm' | 'phonepe' | 'gpay' | 'bhim' | 'card_netbanking';

/**
 * Retrieve public Razorpay Key ID
 */
export function getRazorpayKeyId(): string {
  try {
    const viteEnvKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
    if (viteEnvKey && typeof viteEnvKey === 'string' && viteEnvKey.trim().startsWith('rzp_')) {
      return viteEnvKey.trim();
    }
    const nextPublicKey =
      typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (nextPublicKey && typeof nextPublicKey === 'string' && nextPublicKey.trim().startsWith('rzp_')) {
      return nextPublicKey.trim();
    }
    const saved = localStorage.getItem('safar_razorpay_key');
    if (saved && saved.trim().startsWith('rzp_')) {
      return saved.trim();
    }
  } catch {}
  return DEFAULT_RAZORPAY_KEY;
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
 * Ensure upi:// and UPI app deep links (tez://, phonepe://, paytmmp://, bhim://)
 * work smoothly inside Android WebView / AppsGeyser
 */
let upiDeepLinkListenerRegistered = false;
export function registerWebViewUpiDeepLinkSupport(): void {
  if (typeof window === 'undefined' || upiDeepLinkListenerRegistered) return;
  upiDeepLinkListenerRegistered = true;

  document.addEventListener(
    'click',
    (e) => {
      const target = (e.target as HTMLElement)?.closest?.('a');
      if (!target) return;
      const href = target.getAttribute('href') || '';
      if (/^(upi|tez|gpay|phonepe|paytmmp|bhim|intent):\/\//i.test(href)) {
        e.preventDefault();
        try {
          window.open(href, '_system') || (window.location.href = href);
        } catch {
          window.location.href = href;
        }
      }
    },
    true
  );
}

/**
 * Ensure Razorpay checkout.js script is loaded in document
 */
export function loadRazorpayScript(): Promise<boolean> {
  registerWebViewUpiDeepLinkSupport();
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
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
 * and gives full vertical room for the Live Dynamic QR Code scan-and-pay screen
 */
function applyRazorpayModalOverlapFix(): void {
  const adjustContainer = () => {
    const containers = document.querySelectorAll<HTMLElement>('.razorpay-container');
    containers.forEach((container) => {
      container.style.setProperty('z-index', '2147483647', 'important');
      container.style.setProperty('padding-bottom', '56px', 'important');
      container.style.setProperty('box-sizing', 'border-box', 'important');
    });

    const frames = document.querySelectorAll<HTMLElement>('.razorpay-checkout-frame, .razorpay-container iframe');
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
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
  onError?: (errMessage: string) => void;
}

/**
 * Open official Razorpay Standard Checkout Modal with Enforced UPI Apps & Live Dynamic QR Code
 */
export async function launchRazorpayStandardCheckout(checkoutParams: RazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  const Razorpay = (window as any).Razorpay;

  if (!isLoaded || !Razorpay) {
    if (checkoutParams.onError) {
      checkoutParams.onError('Payment Gateway SDK is loading. Please check your internet connection and try again.');
    }
    return;
  }

  const keyId = getRazorpayKeyId();
  const amountInPaise = Math.round(checkoutParams.amountInRupees * 100);
  const customerName = checkoutParams.customerName;
  const customerPhone = (checkoutParams.customerPhone || '').replace(/\D/g, '').slice(-10);
  const customerEmail = checkoutParams.customerEmail || 'booking@safarindiacabs.in';

  const options: any = {
    key: keyId,
    amount: amountInPaise,
    currency: 'INR',
    name: 'Safar India Cabs',
    description: 'Advance Cab Booking Payment',
    image: '/logo.png', // App logo
    config: {
      display: {
        blocks: {
          upi_block: {
            name: 'Pay via UPI Apps or Scan QR',
            instruments: [
              {
                method: 'upi',
                apps: ['google_pay', 'phonepe', 'paytm', 'bhim']
              },
              {
                method: 'upi',
                flows: ['qr', 'intent', 'collect']
              }
            ]
          }
        },
        sequence: ['block.upi_block'],
        preferences: {
          show_default_blocks: true
        }
      }
    },
    prefill: {
      name: customerName,
      contact: customerPhone,
      email: customerEmail,
      method: 'upi'
    },
    notes: {
      booking_id: checkoutParams.bookingId,
      route: `${checkoutParams.pickupCity} -> ${checkoutParams.dropCity}`,
      pickup_date: checkoutParams.pickupDate,
      amount_payable: `INR ${checkoutParams.amountInRupees}`,
      customer_contact: customerPhone
    },
    theme: {
      color: '#F59E0B'
    },
    modal: {
      confirm_close: true,
      backdropclose: false,
      animation: true,
      ondismiss: function () {
        console.log('Checkout modal closed');
        if (checkoutParams.onDismiss) {
          checkoutParams.onDismiss();
        }
      }
    },
    handler: function (response: any) {
      if (!response || !response.razorpay_payment_id || typeof response.razorpay_payment_id !== 'string') {
        if (checkoutParams.onError) {
          checkoutParams.onError('Payment verification failed. No valid transaction ID was returned by the gateway.');
        }
        return;
      }

      const paymentId = response.razorpay_payment_id;
      if (!paymentId.startsWith('pay_')) {
        if (checkoutParams.onError) {
          checkoutParams.onError('Invalid payment reference returned by gateway.');
        }
        return;
      }

      checkoutParams.onSuccess(paymentId);
    }
  };

  try {
    const rzp = new Razorpay(options);

    rzp.on('payment.failed', function (errResp: any) {
      console.warn('Razorpay payment failed or declined:', errResp);
      const reason = errResp?.error?.description || errResp?.error?.reason || 'Payment was declined or cancelled.';
      if (checkoutParams.onError) {
        checkoutParams.onError(reason);
      }
    });

    rzp.open();
    applyRazorpayModalOverlapFix();
  } catch (err: any) {
    console.warn('Razorpay initialization exception:', err);
    if (checkoutParams.onError) {
      checkoutParams.onError(err?.message || 'Could not launch payment gateway. Please verify your connection.');
    }
  }
}
