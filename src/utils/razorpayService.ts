/**
 * Razorpay Standard Checkout Service for Safar India Cabs
 * 
 * Supports:
 * - Dynamic Amount (20% Advance or 100% Full Fare)
 * - Explicit Dynamic UPI / QR Code option (Paytm, PhonePe, Google Pay, BHIM)
 * - Credit & Debit Cards (RuPay, Visa, Mastercard)
 * - NetBanking (All major Indian banks)
 * - Mobile Wallets (Paytm, PhonePe, Mobikwik)
 * - Seamless prefill with traveler contact & name
 */

export const DEFAULT_RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag';

/**
 * Retrieve public Razorpay Key ID
 * Prioritizes:
 * 1. Vite Environment Variable VITE_RAZORPAY_KEY_ID
 * 2. Admin configured key stored in localStorage
 * 3. Default verified public test key
 * Note: Secret Key is NEVER stored or exposed in frontend code.
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
 * Ensure Razorpay checkout.js script is loaded in document
 */
export function loadRazorpayScript(): Promise<boolean> {
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
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
  onError?: (errMessage: string) => void;
}

/**
 * Open official Razorpay Standard Checkout Modal
 * 
 * Uses standard, certified Razorpay options which automatically enable:
 * - Dynamic UPI QR Code (Paytm, PhonePe, Google Pay, BHIM)
 * - UPI App Direct Intent (Mobile 1-tap redirect)
 * - UPI Collect (Any UPI ID)
 * - Credit & Debit Cards (RuPay, Visa, Mastercard)
 * - NetBanking & Mobile Wallets
 * 
 * Prevents "Invalid UPI ID" error by letting Razorpay generate verified UPI QR codes dynamically.
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

  const rzpOptions: any = {
    key: keyId,
    amount: amountInPaise,
    currency: 'INR',
    name: 'Safar India Cabs',
    description: `${options.cabName} · ${options.pickupCity} to ${options.dropCity} (${paymentTypeLabel})`,
    image: 'https://cdn-icons-png.flaticon.com/512/3214/3214739.png',
    prefill: {
      name: options.customerName,
      contact: cleanPhone,
      email: options.customerEmail || 'booking@safarindiacabs.in'
    },
    notes: {
      booking_id: options.bookingId,
      route: `${options.pickupCity} -> ${options.dropCity}`,
      pickup_date: options.pickupDate,
      payment_mode: paymentTypeLabel,
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
  } catch (err: any) {
    console.warn('Razorpay initialization exception:', err);
    if (options.onError) {
      options.onError(err?.message || 'Could not launch payment gateway. Please verify your connection.');
    }
  }
}
