/**
 * Razorpay Standard Checkout Service for Safar India Cabs
 * 
 * Supports:
 * - Force Razorpay UPI Method, UPI App Intent (upi://pay?...) & Dynamic UPI QR Code at topmost position
 * - Interactive UPI & Payment Method Selection (Paytm, PhonePe, Google Pay, BHIM UPI, Cards/NetBanking)
 * - WebView upi:// Deep-Link Intent Handling + Instant Dynamic QR Code Fallback
 * - Razorpay Modal / Iframe container styling fix so it always floats above bottom ad banners
 */

export const DEFAULT_RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag';

export type PreferredPaymentMethod = 'paytm' | 'phonepe' | 'gpay' | 'bhim' | 'card_netbanking';

/**
 * Retrieve public Razorpay Key ID
 */
export function getRazorpayKeyId(): string {
  try {
    const envKey = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID;
    if (envKey && typeof envKey === 'string' && envKey.trim().startsWith('rzp_')) {
      return envKey.trim();
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
 */
function applyRazorpayModalOverlapFix(): void {
  const adjustContainer = () => {
    const containers = document.querySelectorAll<HTMLElement>('.razorpay-container');
    containers.forEach((container) => {
      container.style.setProperty('z-index', '2147483647', 'important');
      container.style.setProperty('padding-bottom', '60px', 'important');
      container.style.setProperty('box-sizing', 'border-box', 'important');
    });

    const frames = document.querySelectorAll<HTMLElement>('.razorpay-checkout-frame, .razorpay-container iframe');
    frames.forEach((frame) => {
      frame.style.setProperty('z-index', '2147483647', 'important');
      frame.style.setProperty('max-height', 'calc(100% - 60px)', 'important');
      frame.style.setProperty('margin-bottom', '55px', 'important');
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
 * Open official Razorpay Standard Checkout Modal with Forced UPI Block (Intent + QR + Collect)
 */
export async function launchRazorpayStandardCheckout(options: RazorpayCheckoutOptions): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  const Razorpay = (window as any).Razorpay;

  if (!isLoaded || !Razorpay) {
    if (options.onError) {
      options.onError('Payment Gateway SDK is loading. Please check your internet connection and try again.');
    }
    return;
  }

  const keyId = getRazorpayKeyId();
  const amountInPaise = Math.round(options.amountInRupees * 100);
  const paymentTypeLabel = options.paymentMode === 'advance_20' ? '20% Advance Booking Deposit' : '100% Full Fare';
  const cleanPhone = (options.customerPhone || '').replace(/\D/g, '').slice(-10);

  const isCardOrNetbanking = options.preferredMethod === 'card_netbanking';
  const selectedMethod = isCardOrNetbanking ? 'card' : 'upi';

  const methodPreferenceLabel: Record<PreferredPaymentMethod, string> = {
    paytm: 'Paytm UPI / QR',
    phonepe: 'PhonePe UPI / QR',
    gpay: 'Google Pay UPI / QR',
    bhim: 'BHIM UPI / QR',
    card_netbanking: 'Cards / NetBanking'
  };

  const selectedMethodName = options.preferredMethod
    ? methodPreferenceLabel[options.preferredMethod]
    : 'Pay via UPI / QR Code';

  const rzpOptions: any = {
    key: keyId,
    amount: amountInPaise,
    currency: 'INR',
    name: 'Safar India Cabs',
    description:
      options.paymentMode === 'advance_20'
        ? 'Cab Booking Advance'
        : `${options.cabName} · ${options.pickupCity} to ${options.dropCity}`,
    image: 'https://cdn-icons-png.flaticon.com/512/3214/3214739.png',
    config: {
      display: {
        blocks: {
          upi: {
            name: 'Pay via UPI / QR Code',
            instruments: [
              {
                method: 'upi',
                flows: ['intent', 'qr', 'collect'],
                apps: ['google_pay', 'phonepe', 'paytm', 'bhim']
              }
            ]
          },
          banks: {
            name: 'Cards & NetBanking',
            instruments: [
              { method: 'card' },
              { method: 'netbanking' },
              { method: 'wallet' }
            ]
          }
        },
        sequence: isCardOrNetbanking ? ['block.banks', 'block.upi'] : ['block.upi', 'block.banks'],
        preferences: {
          show_default_blocks: true
        }
      }
    },
    prefill: {
      contact: cleanPhone,
      name: options.customerName,
      email: options.customerEmail || 'booking@safarindiacabs.in',
      method: selectedMethod
    },
    notes: {
      booking_id: options.bookingId,
      route: `${options.pickupCity} -> ${options.dropCity}`,
      pickup_date: options.pickupDate,
      payment_mode: paymentTypeLabel,
      preferred_gateway_option: selectedMethodName,
      amount_payable: `INR ${options.amountInRupees}`,
      customer_contact: cleanPhone
    },
    theme: {
      color: '#F59E0B' // Safar India Cabs Amber Accent
    },
    modal: {
      confirm_close: true,
      backdropclose: false,
      animation: true,
      ondismiss: function () {
        if (options.onDismiss) {
          options.onDismiss();
        }
      }
    },
    handler: function (response: any) {
      if (!response || !response.razorpay_payment_id || typeof response.razorpay_payment_id !== 'string') {
        if (options.onError) {
          options.onError('Payment verification failed. No valid transaction ID was returned by the gateway.');
        }
        return;
      }

      const paymentId = response.razorpay_payment_id;
      if (!paymentId.startsWith('pay_')) {
        if (options.onError) {
          options.onError('Invalid payment reference returned by gateway.');
        }
        return;
      }

      options.onSuccess(paymentId);
    }
  };

  try {
    const rzp = new Razorpay(rzpOptions);

    rzp.on('payment.failed', function (errResp: any) {
      console.warn('Razorpay payment failed or declined:', errResp);
      const reason = errResp?.error?.description || errResp?.error?.reason || 'Payment was declined or cancelled.';
      if (options.onError) {
        options.onError(reason);
      }
    });

    rzp.open();
    applyRazorpayModalOverlapFix();
  } catch (err: any) {
    console.warn('Razorpay initialization exception:', err);
    if (options.onError) {
      options.onError(err?.message || 'Could not launch payment gateway. Please verify your connection.');
    }
  }
}
