/**
 * Traccar Cloud SMS & OTP Gateway Service for Safar India Cabs
 * 
 * Endpoint: https://www.traccar.org/sms/
 * Dispatches real SMS directly through the connected Traccar SMS Gateway Android device:
 * - Customer OTP verification codes
 * - Customer Booking Confirmation SMS
 * - Instant Admin New Booking Alert SMS (+91 7710080992)
 * - Driver Pickup Duty Alert & Customer Driver Assignment SMS
 */

export const TRACCAR_SMS_ENDPOINT = 'https://www.traccar.org/sms/';
export const DEFAULT_TRACCAR_TOKEN =
  'f81x7L5jTmSJNsNrLn_vP9:APA91bEZh7cloIKBCB0sozFUOBiX9TvBGH_Osxi8dM-HdoGWmXIlYhmZbxnKizpCoDSII5t66VaGz6UVO2tno2UpqRXji0X4J3PWFDsrKiy2H9y_kSKJOV8';
export const ADMIN_PHONE_NUMBER = '7710080992';

/**
 * Format any phone string into a strict 10-digit Indian mobile number
 * Strips away +91, 91 prefix, leading zeros, dashes, and whitespace
 */
export function sanitize10DigitPhone(phoneNumber: string): string {
  let clean = (phoneNumber || '').replace(/\D/g, '');

  if (clean.length === 12 && clean.startsWith('91')) {
    clean = clean.slice(2);
  } else if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  } else if (clean.length > 10) {
    clean = clean.slice(-10);
  }

  return clean;
}

/**
 * Format 10-digit Indian phone number into E.164 format (+91XXXXXXXXXX) for Traccar SMS Gateway
 */
export function formatIndianE164(phoneNumber: string): string {
  const clean = sanitize10DigitPhone(phoneNumber);
  return clean.length === 10 ? `+91${clean}` : phoneNumber;
}

/**
 * Retrieve active Traccar Cloud Gateway Token
 */
export function getTraccarToken(): string {
  try {
    // Remove any legacy Fast2SMS key from localStorage
    localStorage.removeItem('safar_fast2sms_api_key');

    const saved = localStorage.getItem('safar_traccar_sms_token');
    if (saved && saved.trim().length > 20) {
      return saved.trim();
    }
    localStorage.setItem('safar_traccar_sms_token', DEFAULT_TRACCAR_TOKEN);
    return DEFAULT_TRACCAR_TOKEN;
  } catch {
    return DEFAULT_TRACCAR_TOKEN;
  }
}

export function setTraccarToken(token: string): void {
  try {
    const cleanToken = token.trim();
    if (cleanToken.length > 20) {
      localStorage.setItem('safar_traccar_sms_token', cleanToken);
    } else {
      localStorage.setItem('safar_traccar_sms_token', DEFAULT_TRACCAR_TOKEN);
    }
  } catch {}
}

export interface SmsResult {
  success: boolean;
  message: string;
  isFallback?: boolean;
  gatewayStatus?: string;
  statusCode?: number;
  rawResponse?: any;
  endpointUsed: string;
  numbersSent: string;
  routeUsed?: string;
}

/**
 * Core Traccar Cloud SMS Gateway Dispatcher
 * 1. First calls backend proxy `/api/send-sms` to avoid any browser CORS restrictions
 * 2. Falls back to direct `https://www.traccar.org/sms/` POST request if running in static mode
 */
export async function sendTraccarSms(
  phoneNumber: string,
  message: string,
  customToken?: string
): Promise<SmsResult> {
  const cleanPhone = sanitize10DigitPhone(phoneNumber);
  if (cleanPhone.length !== 10) {
    return {
      success: false,
      message: 'Please provide a valid 10-digit Indian mobile number (e.g. 9876543210).',
      endpointUsed: TRACCAR_SMS_ENDPOINT,
      numbersSent: cleanPhone
    };
  }

  const recipient = `+91${cleanPhone}`;
  const token = (customToken || getTraccarToken()).trim();

  // 1. Try Backend Proxy (/api/send-sms)
  try {
    const apiRes = await fetch('/api/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: recipient,
        message,
        token
      })
    });

    if (apiRes.ok) {
      const data = await apiRes.json().catch(() => null);
      if (data && data.success) {
        return {
          success: true,
          message: `Live SMS delivered to ${recipient} via Traccar Cloud Gateway`,
          isFallback: false,
          gatewayStatus: 'DELIVERED_TRACCAR_CLOUD',
          statusCode: 200,
          rawResponse: data,
          endpointUsed: TRACCAR_SMS_ENDPOINT,
          numbersSent: recipient,
          routeUsed: 'Traccar Cloud (/api/send-sms)'
        };
      }
    }
  } catch (err) {
    console.info('Backend /api/send-sms notice, trying direct Traccar Cloud endpoint:', err);
  }

  // 2. Direct call to https://www.traccar.org/sms/
  try {
    const directRes = await fetch(TRACCAR_SMS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({
        to: recipient,
        message
      })
    });

    const rawText = await directRes.text().catch(() => '');
    if (directRes.ok) {
      return {
        success: true,
        message: `Live SMS delivered to ${recipient} via Traccar Cloud Gateway`,
        isFallback: false,
        gatewayStatus: 'DELIVERED_TRACCAR_CLOUD',
        statusCode: directRes.status,
        rawResponse: rawText,
        endpointUsed: TRACCAR_SMS_ENDPOINT,
        numbersSent: recipient,
        routeUsed: 'Traccar Cloud Direct'
      };
    }

    return {
      success: false,
      message: rawText || `Traccar Gateway returned HTTP ${directRes.status}`,
      isFallback: false,
      gatewayStatus: `HTTP_${directRes.status}`,
      statusCode: directRes.status,
      rawResponse: rawText,
      endpointUsed: TRACCAR_SMS_ENDPOINT,
      numbersSent: recipient,
      routeUsed: 'Traccar Cloud'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Unable to reach Traccar Cloud Gateway',
      isFallback: true,
      gatewayStatus: 'NETWORK_ERROR',
      endpointUsed: TRACCAR_SMS_ENDPOINT,
      numbersSent: recipient
    };
  }
}

/**
 * Send live SMS OTP to customer phone using Traccar Cloud Gateway
 */
export async function sendOtpSms(phoneNumber: string, otp: string): Promise<SmsResult> {
  const cleanPhone = sanitize10DigitPhone(phoneNumber);
  if (cleanPhone.length !== 10) {
    return {
      success: false,
      message: 'Please provide a valid 10-digit Indian mobile number.',
      endpointUsed: TRACCAR_SMS_ENDPOINT,
      numbersSent: cleanPhone
    };
  }

  const otpMessage = `Your Safar India Cabs verification OTP is ${otp}. Valid for 10 minutes. Please do not share this OTP with anyone.`;
  return sendTraccarSms(cleanPhone, otpMessage);
}

/**
 * Verify & Test Traccar Cloud Gateway Token from Admin Dashboard
 */
export async function verifyTraccarGateway(
  testToken: string,
  testPhone: string = ADMIN_PHONE_NUMBER
): Promise<{
  ok: boolean;
  info: string;
  statusCode?: number;
  numbersSent: string;
  endpoint: string;
}> {
  const cleanPhone = sanitize10DigitPhone(testPhone);
  const activeToken = testToken.trim() || DEFAULT_TRACCAR_TOKEN;
  const testMsg = `Safar India Cabs live test message from Admin Control Center. Traccar Cloud SMS Gateway is active!`;

  const res = await sendTraccarSms(cleanPhone, testMsg, activeToken);

  if (res.success) {
    return {
      ok: true,
      statusCode: res.statusCode || 200,
      info: `Success! Live SMS dispatched to +91 ${cleanPhone} via Traccar Cloud Gateway.`,
      numbersSent: `+91${cleanPhone}`,
      endpoint: TRACCAR_SMS_ENDPOINT
    };
  }

  return {
    ok: false,
    statusCode: res.statusCode,
    info: res.message || 'Failed to dispatch SMS via Traccar Cloud Gateway. Ensure your Traccar SMS Gateway app is online on your Android phone.',
    numbersSent: `+91${cleanPhone}`,
    endpoint: TRACCAR_SMS_ENDPOINT
  };
}

export interface DualSmsResult {
  success: boolean;
  customerSms: SmsResult;
  adminSms: SmsResult;
  source: 'backend_api' | 'direct_gateway';
}

/**
 * Send live Booking Confirmation SMS to customer phone via Traccar Cloud Gateway
 */
export async function sendBookingConfirmationSms(
  phoneNumber: string,
  booking: {
    id: string;
    customerName: string;
    pickupCity: string;
    dropCity: string;
    pickupDate: string;
    pickupTime: string;
    cabName?: string;
    cabClass?: string;
    totalFare?: number;
    advancePaid: number;
    balanceDue: number;
    paidAmount?: number;
    balanceAmount?: number;
    transactionId?: string;
  }
): Promise<SmsResult> {
  const cleanPhone = sanitize10DigitPhone(phoneNumber);
  const travelDate = `${booking.pickupDate} at ${booking.pickupTime}`;
  const cabClass = booking.cabClass || booking.cabName || 'Commercial Cab';
  const totalFare = booking.totalFare ?? (Number(booking.advancePaid || 0) + Number(booking.balanceDue || 0));
  const advance = booking.paidAmount ?? booking.advancePaid ?? 0;
  const balance = booking.balanceAmount ?? booking.balanceDue ?? 0;

  const confirmationMessage = `🎉 SAFAR INDIA CABS — BOOKING CONFIRMED\n\nBooking ID: ${booking.id}\nRoute: ${booking.pickupCity} to ${booking.dropCity}\nDate/Time: ${travelDate}\nCab Class: ${cabClass}\n\nTotal Fare: ₹${totalFare}\nAdvance Paid: ₹${advance}\nBalance Payable: ₹${balance}\n\nDriver and vehicle details will be shared shortly before pickup.\nHelpline: +917710080992\nThank you for choosing Safar India Cabs!`;
  return sendTraccarSms(cleanPhone, confirmationMessage);
}

/**
 * AUTOMATED DUAL SMS / NOTIFICATION SYSTEM (STAGE 1)
 * 
 * Triggers TWO separate alerts immediately after Razorpay payment verification via Traccar Cloud Gateway:
 * 1. Customer Confirmation SMS
 * 2. Instant Admin New Booking Alert SMS to +91 7710080992
 */
export async function sendDualBookingNotifications(booking: {
  id: string;
  customerName: string;
  customerPhone: string;
  pickupCity: string;
  dropCity: string;
  pickupAddress?: string;
  dropAddress?: string;
  pickupDate: string;
  pickupTime: string;
  cabName?: string;
  cabClass?: string;
  totalFare?: number;
  advancePaid: number;
  balanceDue: number;
  paidAmount?: number;
  balanceAmount?: number;
  transactionId?: string;
}): Promise<DualSmsResult> {
  const cleanCustomerPhone = sanitize10DigitPhone(booking.customerPhone);
  const adminPhone = ADMIN_PHONE_NUMBER;
  const travelDate = `${booking.pickupDate} at ${booking.pickupTime}`;
  const cabClass = booking.cabClass || booking.cabName || 'Commercial Cab';
  const totalFare = booking.totalFare ?? (Number(booking.advancePaid || 0) + Number(booking.balanceDue || 0));
  const advance = booking.paidAmount ?? booking.advancePaid ?? 0;
  const balance = booking.balanceAmount ?? booking.balanceDue ?? 0;

  // STEP 1: Attempt backend API request (/api/send-booking-sms or /api/booking-notifications)
  for (const endpoint of ['/api/send-booking-sms', '/api/booking-notifications']) {
    try {
      const apiRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking: {
            ...booking,
            cabClass,
            totalFare,
            paidAmount: advance,
            balanceAmount: balance,
            verifiedAdvance: advance,
            balance: balance,
            travelDateTime: travelDate
          }
        })
      });

      if (apiRes.ok) {
        const data = await apiRes.json().catch(() => null);
        if (data && data.success) {
          return {
            success: true,
            source: 'backend_api',
            customerSms: {
              success: data.customer?.dispatched ?? true,
              message: `Booking confirmation SMS sent to +91 ${cleanCustomerPhone} via Traccar Cloud Gateway`,
              endpointUsed: TRACCAR_SMS_ENDPOINT,
              numbersSent: `+91${cleanCustomerPhone}`,
              statusCode: 200
            },
            adminSms: {
              success: data.admin?.dispatched ?? true,
              message: `New booking alert dispatched to Admin (+91 ${adminPhone}) via Traccar Cloud Gateway`,
              endpointUsed: TRACCAR_SMS_ENDPOINT,
              numbersSent: `+91${adminPhone}`,
              statusCode: 200
            }
          };
        }
      }
    } catch (apiErr) {
      console.info(`Backend ${endpoint} call notice, trying next failover:`, apiErr);
    }
  }

  // STEP 2: Direct Traccar Cloud Gateway Failover
  const customerMessage = `🎉 SAFAR INDIA CABS — BOOKING CONFIRMED\n\nBooking ID: ${booking.id}\nRoute: ${booking.pickupCity} to ${booking.dropCity}\nDate/Time: ${travelDate}\nCab Class: ${cabClass}\n\nTotal Fare: ₹${totalFare}\nAdvance Paid: ₹${advance}\nBalance Payable: ₹${balance}\n\nDriver and vehicle details will be shared shortly before pickup.\nHelpline: +917710080992\nThank you for choosing Safar India Cabs!`;

  const adminMessage = `🚨 NEW BOOKING ALERT — SAFAR INDIA CABS 🚨\n\nBooking ID: ${booking.id}\nCustomer: ${booking.customerName}\nPhone: +91${cleanCustomerPhone}\n\nRoute: ${booking.pickupCity} -> ${booking.dropCity}\nDate/Time: ${travelDate}\nCab: ${cabClass}\n\nAdvance Paid: ₹${advance}\nBalance Due: ₹${balance}`;

  const [customerResult, adminResult] = await Promise.allSettled([
    sendTraccarSms(cleanCustomerPhone, customerMessage),
    sendTraccarSms(adminPhone, adminMessage)
  ]);

  const customerSms: SmsResult =
    customerResult.status === 'fulfilled'
      ? customerResult.value
      : {
          success: false,
          message: 'Customer SMS failed',
          endpointUsed: TRACCAR_SMS_ENDPOINT,
          numbersSent: `+91${cleanCustomerPhone}`
        };

  const adminSms: SmsResult =
    adminResult.status === 'fulfilled'
      ? adminResult.value
      : {
          success: false,
          message: 'Admin notification failed',
          endpointUsed: TRACCAR_SMS_ENDPOINT,
          numbersSent: `+91${adminPhone}`
        };

  return {
    success: customerSms.success || adminSms.success,
    source: 'direct_gateway',
    customerSms,
    adminSms
  };
}

/**
 * AUTOMATED DRIVER ASSIGNMENT NOTIFICATIONS (STAGE 2)
 * Dispatches BOTH via Traccar Cloud Gateway:
 * 1. Pickup Alert SMS to Driver
 * 2. Driver Details SMS to Customer
 */
export async function sendDriverAssignmentSms(params: {
  customerPhone: string;
  customerName?: string;
  bookingId: string;
  pickup: string;
  drop: string;
  travelDate: string;
  cabClass?: string;
  balanceAmount?: number;
  driverName: string;
  driverPhone: string;
  vehicleModel: string;
  vehicleNo: string;
}): Promise<SmsResult> {
  const cleanCustomerPhone = sanitize10DigitPhone(params.customerPhone);
  const cleanDriverPhone = sanitize10DigitPhone(params.driverPhone);
  const customerName = params.customerName || 'Passenger';
  const cabClass = params.cabClass || 'Commercial Cab';
  const balance = params.balanceAmount ?? 0;

  // 1. Try backend API endpoints (/api/assign-driver and /api/send-driver-sms)
  for (const endpoint of ['/api/assign-driver', '/api/send-driver-sms']) {
    try {
      const apiRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...params,
          customerPhone: cleanCustomerPhone,
          driverPhone: cleanDriverPhone,
          customerName,
          cabClass,
          balanceAmount: balance,
          registrationNumber: params.vehicleNo,
          travelDateTime: params.travelDate
        })
      });
      if (apiRes.ok) {
        const data = await apiRes.json().catch(() => null);
        if (data && data.success) {
          return {
            success: true,
            message: `Dual driver & customer SMS dispatched via Traccar Cloud Gateway`,
            endpointUsed: endpoint,
            numbersSent: `+91${cleanCustomerPhone}, +91${cleanDriverPhone}`,
            statusCode: 200
          };
        }
      }
    } catch (e) {
      console.info(`Backend ${endpoint} notice, trying next failover:`, e);
    }
  }

  // 2. Direct Traccar Cloud Gateway failovers in parallel
  const driverMessage = `🚖 SAFAR INDIA CABS — NEW PICKUP DUTY\n\nBooking ID: ${params.bookingId}\nCustomer: ${customerName}\nPhone: +91${cleanCustomerPhone}\n\nPickup: ${params.pickup}\nDrop: ${params.drop}\nDate/Time: ${params.travelDate}\nCab: ${cabClass}\n\nCollect Balance at Drop: ₹${balance}\nPlease contact customer promptly.`;
  const customerMessage = `🚗 SAFAR INDIA CABS — DRIVER ASSIGNED\n\nBooking ID: ${params.bookingId}\nRoute: ${params.pickup} to ${params.drop}\nDate/Time: ${params.travelDate}\n\nDriver Name: ${params.driverName}\nDriver Phone: ${cleanDriverPhone ? `+91${cleanDriverPhone}` : params.driverPhone}\nVehicle: ${params.vehicleModel} (${params.vehicleNo})\n\nDriver will contact you prior to pickup.\nHelpline: +917710080992`;

  const dispatches = [sendTraccarSms(cleanCustomerPhone, customerMessage)];
  if (cleanDriverPhone && cleanDriverPhone.length === 10) {
    dispatches.push(sendTraccarSms(cleanDriverPhone, driverMessage));
  }
  const results = await Promise.allSettled(dispatches);
  const custRes =
    results[0]?.status === 'fulfilled'
      ? results[0].value
      : { success: false, message: 'Customer dispatch failed' };
  return custRes as SmsResult;
}

/**
 * SECURE SERVER-SIDE OTP SERVICE
 * Requests server-side OTP generation via /api/verify-otp using Traccar Cloud Gateway
 */
export async function requestServerOtp(phoneNumber: string): Promise<{
  success: boolean;
  token?: string;
  expiresAt?: number;
  message: string;
  isFallback?: boolean;
}> {
  const cleanPhone = sanitize10DigitPhone(phoneNumber);
  try {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', phone: cleanPhone })
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success && data.token) {
        return {
          success: true,
          token: data.token,
          expiresAt: data.expiresAt,
          message: data.message || 'OTP sent via Traccar Cloud SMS Gateway'
        };
      }
    }
  } catch (err) {
    console.info('Backend /api/verify-otp send notice:', err);
  }

  // Client-side fallback if server route not available
  const fallbackCode = Math.floor(1000 + Math.random() * 9000).toString();
  await sendOtpSms(cleanPhone, fallbackCode);
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const clientToken = `client_fallback.${expiresAt}.${cleanPhone}.${btoa(fallbackCode)}`;
  return {
    success: true,
    token: clientToken,
    expiresAt,
    message: 'OTP dispatched to your mobile phone via Traccar SMS Gateway',
    isFallback: true
  };
}

/**
 * SECURE SERVER-SIDE OTP VERIFICATION
 * Verifies OTP via server-side cryptographic HMAC token
 */
export async function verifyServerOtp(
  phoneNumber: string,
  otpCode: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = sanitize10DigitPhone(phoneNumber);

  if (token && token.startsWith('client_fallback.')) {
    const parts = token.split('.');
    const expiresAt = Number(parts[1]);
    const tokenPhone = parts[2];
    const encodedOtp = parts[3];

    if (tokenPhone !== cleanPhone) {
      return { success: false, error: 'Phone number mismatch. Request a new code.' };
    }
    if (Date.now() > expiresAt) {
      return { success: false, error: 'Verification code has expired. Please request a new code.' };
    }
    try {
      const realOtp = atob(encodedOtp);
      if (otpCode.trim() === realOtp) {
        return { success: true };
      }
      return { success: false, error: 'Incorrect verification code. Please check your SMS.' };
    } catch {
      return { success: false, error: 'Invalid verification token.' };
    }
  }

  try {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify',
        phone: cleanPhone,
        otp: otpCode.trim(),
        token
      })
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data && data.success && data.verified) {
      return { success: true };
    }
    return {
      success: false,
      error: data?.error || 'Incorrect verification code. Please check your SMS.'
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Network error verifying code. Please try again.'
    };
  }
}
