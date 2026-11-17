/**
 * WhatsAppService (TypeScript / Web & Serverless Client for Interakt WhatsApp API)
 * Package: com.safarindiacabs.app
 *
 * Uses Safar India Cabs Verified Interakt WhatsApp API via Backend Proxy (/api/send-booking-sms?endpoint=send-whatsapp):
 * - Official WhatsApp API Number: 9570571516
 * - API_URL: https://api.interakt.ai/v1/public/message/
 * - Secret Authorization Header is stored securely in server-side .env (INTERAKT_AUTH_HEADER / INTERAKT_API_KEY)
 */

export const DEFAULT_WHATSAPP_PHONE_ID = '9570571516';
export const DEFAULT_WHATSAPP_WABA_ID = '9570571516';
export const DEFAULT_WHATSAPP_ACCESS_TOKEN = '';
export const INTERAKT_PUBLIC_API_URL = 'https://api.interakt.ai/v1/public/message/';

export interface WhatsAppCallback {
  onSuccess: (response: string) => void;
  onError: (e: Error) => void;
}

export interface WhatsAppBookingDetails {
  customerName?: string;
  pickupAddress?: string;
  dropAddress?: string;
  travelDateTime?: string;
  cabClass?: string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
}

export interface WhatsAppDriverTripDetails {
  travelDateTime?: string;
  cabClass?: string;
  vehicleModel?: string;
  vehicleNumber?: string;
  balanceAmount?: number | string;
}

export interface WhatsAppTemplateConfig {
  name: string;
  language?: string;
  recipientName?: string;
  referenceId?: string;
  params: string[];
  backups?: {
    name: string;
    language?: string;
    params: string[];
  }[];
}

export function getWhatsAppPhoneId(): string {
  try {
    return localStorage.getItem('safar_wa_phone_id') || DEFAULT_WHATSAPP_PHONE_ID;
  } catch {
    return DEFAULT_WHATSAPP_PHONE_ID;
  }
}

export function getWhatsAppAccessToken(): string {
  try {
    return localStorage.getItem('safar_wa_access_token') || DEFAULT_WHATSAPP_ACCESS_TOKEN;
  } catch {
    return DEFAULT_WHATSAPP_ACCESS_TOKEN;
  }
}

export function setWhatsAppConfig(phoneId: string, accessToken: string): void {
  try {
    localStorage.setItem('safar_wa_phone_id', phoneId.trim() || DEFAULT_WHATSAPP_PHONE_ID);
    localStorage.setItem(
      'safar_wa_access_token',
      accessToken.trim() || DEFAULT_WHATSAPP_ACCESS_TOKEN
    );
  } catch {}
}

function sanitizeTemplateParamClient(val: unknown): string {
  const str = String(val ?? '')
    .replace(/[\r\n\t]+/g, ' | ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return str.slice(0, 900) || '-';
}

export function formatWhatsAppDateTime(rawDateTime?: string, rawTime?: string): string {
  const input = String(rawDateTime || '').trim();
  if (!input) return rawTime ? `@ ${rawTime.trim()}` : 'Scheduled Time';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Convert YYYY-MM-DD (with optional "at HH:MM AM" or "@ HH:MM AM") into "26 Oct 2026 @ 07:00 AM"
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*(?:at|@|·)?\s*(.+))?$/i);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const timePart = (isoMatch[4] || rawTime || '').trim();
    const monthName = months[monthIdx] || isoMatch[2];
    const formattedDate = `${day} ${monthName} ${year}`;
    return timePart ? `${formattedDate} @ ${timePart}` : formattedDate;
  }

  if (/\s+at\s+/i.test(input)) {
    return input.replace(/\s+at\s+/i, ' @ ');
  }

  if (rawTime && !input.includes('@')) {
    return `${input} @ ${rawTime.trim()}`;
  }

  return input;
}

export function formatWhatsAppAmount(val: number | string | undefined): string {
  const num = Number(String(val ?? 0).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(num)) return '0';
  return Math.round(num).toLocaleString('en-IN');
}

export function formatCabCategoryFull(cabClass?: string): string {
  const raw = String(cabClass || 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)').trim();
  if (/^hatchback\s*ac$/i.test(raw)) {
    return 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)';
  }
  if (/^sedan\s*ac$/i.test(raw)) {
    return 'Sedan AC (Dzire, Etios, Aura or equivalent)';
  }
  if (/^suv\s*ac$/i.test(raw)) {
    return 'SUV AC (Maruti Ertiga, Kia Carens or equivalent)';
  }
  // Avoid nested/double parentheses like "Sedan AC (Dzire / Etios) (Maruti Suzuki Dzire...)"
  const doubleParen = raw.match(/^([^(]+)\([^)]*\)\s*\(([^)]+)\)$/);
  if (doubleParen) {
    return `${doubleParen[1].trim()} (${doubleParen[2].trim()})`;
  }
  return raw;
}

export function formatShortVehicleName(vehicleModel?: string, cabClass?: string): string {
  const raw = String(vehicleModel || cabClass || 'Hatchback AC').trim();
  const withoutParens = raw.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return withoutParens || 'Hatchback AC';
}

export function formatClean10DigitPhone(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits || String(phone || '').trim();
}

/**
 * 1) Customer Booking Confirmation Message (Box-Drawing Design)
 */
export function formatWhatsAppBookingConfirmationMessage(params: {
  customerName?: string;
  bookingId: string;
  pickup: string;
  drop: string;
  travelDateTime?: string;
  cabCategory?: string;
  totalFare: number | string;
  advancePaid?: number | string;
  balancePayable?: number | string;
}): string {
  const cleanId = String(params.bookingId || 'SIC').replace(/^#/, '').trim();
  const customerName = (params.customerName || 'Traveler').trim();
  const dateAndTime = formatWhatsAppDateTime(params.travelDateTime);
  const cabCategory = formatCabCategoryFull(params.cabCategory);
  const totalStr = formatWhatsAppAmount(params.totalFare);
  const advanceStr = formatWhatsAppAmount(params.advancePaid ?? 0);
  const balanceStr = formatWhatsAppAmount(params.balancePayable ?? 0);

  return [
    `🚗 SAFARINDIACABS | BOOKING CONFIRMATION`,
    `Dear ${customerName},`,
    `Greetings from SafarIndiaCabs!`,
    `Your booking has been successfully confirmed. Please find your trip details below:`,
    `┌──────────────────────────┐`,
    `TRIP DETAILS`,
    `├──────────────────────────┤`,
    `• Booking ID: ${cleanId}`,
    `• Pickup Location: ${params.pickup}`,
    `• Drop Location: ${params.drop}`,
    `• Date & Time: ${dateAndTime}`,
    `• Cab Category: ${cabCategory}`,
    `└──────────────────────────┘`,
    `💵 FARE & PAYMENT BREAKUP`,
    `• Total Fare: ₹${totalStr}/-`,
    `• Advance Paid: ₹${advanceStr}/-`,
    `• Balance Payable: ₹${balanceStr}/- (Payable to driver · Toll Extra)`,
    ``,
    `📞 CUSTOMER SUPPORT`,
    `• Helpline: +91-9570571516`,
    `• Website: https://safarindiacabs.com`,
    ``,
    `We wish you a pleasant, safe, and comfortable journey! 🚖`
  ].join('\n');
}

/**
 * 2) Customer Driver & Vehicle Allotment Message (Box-Drawing Design)
 */
export function formatWhatsAppDriverAllotmentCustomerMessage(params: {
  customerName?: string;
  bookingId: string;
  pickup: string;
  drop: string;
  travelDateTime?: string;
  driverName: string;
  driverPhone: string;
  vehicleCategory?: string;
  vehicleNumber: string;
}): string {
  const cleanId = String(params.bookingId || 'SIC').replace(/^#/, '').trim();
  const customerName = (params.customerName || 'Traveler').trim();
  const dateAndTime = formatWhatsAppDateTime(params.travelDateTime);
  const cleanDriverPhone = formatClean10DigitPhone(params.driverPhone);
  const vehicleCategory = formatCabCategoryFull(params.vehicleCategory);
  const vehicleNumber = String(params.vehicleNumber || 'Assigned').trim().toUpperCase();

  return [
    `👨‍✈️ SAFARINDIACABS | DRIVER ALLOTMENT`,
    ``,
    `Dear ${customerName},`,
    ``,
    `Greetings from SafarIndiaCabs!`,
    `Your driver and vehicle have been assigned for your upcoming trip. Details below:`,
    ``,
    `┌──────────────────────────┐`,
    `TRIP SUMMARY`,
    `├──────────────────────────┤`,
    `• Booking ID: ${cleanId}`,
    `• Route: ${params.pickup} to ${params.drop}`,
    `• Pickup Date & Time: ${dateAndTime}`,
    `└──────────────────────────┘`,
    ``,
    `🚗 DRIVER & VEHICLE DETAILS`,
    `• Driver Name: ${(params.driverName || 'Assigned Driver').trim()}`,
    `• Driver Contact: +91 ${cleanDriverPhone}`,
    `• Vehicle Category: ${vehicleCategory}`,
    `• Vehicle Number: ${vehicleNumber}`,
    ``,
    `Have a safe, comfortable, and pleasant journey! 🚖`
  ].join('\n');
}

/**
 * 3) Driver Duty Allotment Message (Box-Drawing Design)
 */
export function formatWhatsAppDriverDutyAllotmentMessage(params: {
  driverName: string;
  bookingId: string;
  customerName?: string;
  customerPhone: string;
  pickup: string;
  drop: string;
  travelDateTime?: string;
  vehicleModel?: string;
  cabClass?: string;
  vehicleNumber?: string;
  balanceAmount?: number | string;
}): string {
  const cleanId = String(params.bookingId || 'SIC').replace(/^#/, '').trim();
  const rawDriverName = (params.driverName || 'Driver Partner').trim().replace(/\s+ji$/i, '');
  const customerName = (params.customerName || 'Customer').trim();
  const cleanCustomerPhone = formatClean10DigitPhone(params.customerPhone);
  const dateAndTime = formatWhatsAppDateTime(params.travelDateTime);
  const shortVehicle = formatShortVehicleName(params.vehicleModel, params.cabClass);
  const regNo = String(params.vehicleNumber || 'Assigned').trim().toUpperCase();
  const balanceStr = formatWhatsAppAmount(params.balanceAmount ?? 0);

  return [
    `🚖 SAFARINDIACABS | DRIVER DUTY ALLOTMENT`,
    ``,
    `Dear ${rawDriverName} ji,`,
    ``,
    `Your pickup duty has been confirmed by SafarIndiaCabs. Details are given below:`,
    ``,
    `┌──────────────────────────┐`,
    `TRIP DETAILS`,
    `├──────────────────────────┤`,
    `• Booking ID: ${cleanId}`,
    `• Customer Name: ${customerName}`,
    `• Customer Mobile: +91 ${cleanCustomerPhone}`,
    `• Pickup Location: ${params.pickup}`,
    `• Drop Location: ${params.drop}`,
    `• Date & Time: ${dateAndTime}`,
    `• Vehicle: ${shortVehicle} (${regNo})`,
    `└──────────────────────────┘`,
    ``,
    `💵 PAYMENT COLLECTION`,
    `• Collect Balance: ₹${balanceStr}/- (Collect from customer)`,
    ``,
    `📌 Important Instructions:`,
    `Call the customer immediately and reach the pickup location before time. Keep the vehicle clean and strictly follow the non-smoking/non-drinking policy.`,
    ``,
    `📞 HELP & SUPPORT`,
    `• Helpline: +91-9570571516`,
    `• Website: https://safarindiacabs.com`
  ].join('\n');
}

export class WhatsAppService {
  public static readonly PHONE_NUMBER_ID = DEFAULT_WHATSAPP_PHONE_ID;
  public static readonly ACCESS_TOKEN = DEFAULT_WHATSAPP_ACCESS_TOKEN;
  public static readonly API_URL = INTERAKT_PUBLIC_API_URL;

  // Common method to format and clean phone numbers (always 91 + 10-digit Indian mobile number)
  public formatPhoneNumber(phone: string): string {
    const digits = (phone || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
    if (last10.length === 10) {
      return '91' + last10;
    }
    return digits;
  }

  /**
   * 1️⃣ CUSTOMER LOGIN OTP (Template + Rich Text)
   */
  public sendCustomerOtp(
    customerPhone: string,
    otpCode: string,
    callback?: WhatsAppCallback,
    customerName: string = 'Traveler'
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(customerPhone);
    const messageText =
      `🔐 *Safar India Cabs Verification*\n\n` +
      `Your login OTP is: *${otpCode}*\n` +
      `Valid for 10 minutes. Do not share this with anyone.`;

    const templateConfig: WhatsAppTemplateConfig = {
      name: 'safar_booking_pin_update',
      language: 'en_US',
      recipientName: customerName || 'Traveler',
      referenceId: otpCode,
      params: [customerName || 'Traveler', otpCode],
      backups: [
        {
          name: 'safar_account_notice',
          language: 'en_US',
          params: [customerName || 'Traveler', otpCode, 'instant account login']
        },
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            customerName || 'Traveler',
            `OTP-${otpCode}`,
            `Your Safar India Cabs verification code is ${otpCode}. Valid for 10 minutes.`
          ]
        }
      ]
    };

    return this.sendTextMessage(phone, messageText, callback, templateConfig);
  }

  /**
   * 2️⃣ BOOKING CONFIRMATION TO CUSTOMER (Complete Booking Details after Payment)
   */
  public sendBookingConfirmationToCustomer(
    customerPhone: string,
    bookingId: string,
    pickup: string,
    drop: string,
    fare: string | number,
    details?: WhatsAppBookingDetails,
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(customerPhone);
    const cleanId = String(bookingId).replace(/^#/, '');
    const customerName = details?.customerName || 'Traveler';

    const messageText = formatWhatsAppBookingConfirmationMessage({
      customerName,
      bookingId: cleanId,
      pickup,
      drop,
      travelDateTime: details?.travelDateTime,
      cabCategory: details?.cabClass,
      totalFare: fare,
      advancePaid: details?.paidAmount ?? 0,
      balancePayable: details?.balanceAmount ?? 0
    });

    const formattedDate = formatWhatsAppDateTime(details?.travelDateTime);
    const formattedCab = formatCabCategoryFull(details?.cabClass);

    const templateConfig: WhatsAppTemplateConfig = {
      name: 'safar_booking_confirmed_v1',
      language: 'en_US',
      recipientName: customerName,
      referenceId: cleanId,
      params: [
        customerName,
        cleanId,
        pickup,
        drop,
        formattedDate,
        formattedCab,
        `${formatWhatsAppAmount(fare)}/-`,
        `${formatWhatsAppAmount(details?.paidAmount ?? 0)}/-`,
        `${formatWhatsAppAmount(details?.balanceAmount ?? 0)}/- (Toll Extra)`
      ],
      backups: [
        {
          name: 'safar_lib_order_confirmed',
          language: 'en_US',
          params: [
            customerName,
            `${cleanId} (${pickup} to ${drop} on ${formattedDate})`
          ]
        },
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            customerName,
            cleanId,
            `Pickup: ${pickup} to ${drop} (${formattedDate}) | Cab: ${formattedCab} | Total: ₹${formatWhatsAppAmount(fare)}/- | Advance: ₹${formatWhatsAppAmount(details?.paidAmount ?? 0)}/- | Balance: ₹${formatWhatsAppAmount(details?.balanceAmount ?? 0)}/- (Toll Extra)`
          ]
        }
      ]
    };

    return this.sendTextMessage(phone, messageText, callback, templateConfig);
  }

  /**
   * 3️⃣ NEW BOOKING ALERT TO ADMIN (Complete Details + Owner Panel Update Notice)
   */
  public sendNewBookingAlertToAdmin(
    adminPhone: string,
    bookingId: string,
    customerName: string,
    customerPhone: string,
    pickup: string,
    drop: string,
    details?: WhatsAppBookingDetails & { totalFare?: number | string },
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(adminPhone);
    const cleanId = String(bookingId).replace(/^#/, '');
    const formattedDate = formatWhatsAppDateTime(details?.travelDateTime);
    const formattedCab = formatCabCategoryFull(details?.cabClass);

    const messageText = [
      `🚨 SAFARINDIACABS | NEW BOOKING ALERT`,
      `┌──────────────────────────┐`,
      `TRIP DETAILS`,
      `├──────────────────────────┤`,
      `• Booking ID: ${cleanId}`,
      `• Customer: ${customerName} (+91 ${customerPhone})`,
      `• Pickup Location: ${pickup}`,
      ...(details?.pickupAddress ? [`• Pickup Address: ${details.pickupAddress}`] : []),
      `• Drop Location: ${drop}`,
      `• Date & Time: ${formattedDate}`,
      `• Cab Category: ${formattedCab}`,
      `└──────────────────────────┘`,
      `💵 FARE & PAYMENT BREAKUP`,
      `• Total Fare: ₹${formatWhatsAppAmount(details?.totalFare ?? 0)}/-`,
      `• Advance Paid: ₹${formatWhatsAppAmount(details?.paidAmount ?? 0)}/-`,
      `• Balance Payable: ₹${formatWhatsAppAmount(details?.balanceAmount ?? 0)}/- (Toll Extra)`,
      ``,
      `⚡ Please assign a driver from the Owner Panel.`
    ].join('\n');

    const templateConfig: WhatsAppTemplateConfig = {
      name: 'safar_admin_booking_alert_v1',
      language: 'en_US',
      recipientName: 'Fleet Admin',
      referenceId: cleanId,
      params: [
        cleanId,
        customerName,
        `+91 ${customerPhone}`,
        pickup,
        drop,
        formattedDate,
        formattedCab,
        String(details?.totalFare ?? 0),
        String(details?.paidAmount ?? 0),
        String(details?.balanceAmount ?? 0)
      ]
    };

    return this.sendTextMessage(phone, messageText, callback, templateConfig);
  }

  /**
   * 4️⃣ TRIP DETAILS & ASSIGNMENT TO DRIVER
   */
  public sendTripDetailsToDriver(
    driverPhone: string,
    driverName: string,
    bookingId: string,
    customerName: string,
    customerPhone: string,
    pickup: string,
    drop: string,
    details?: WhatsAppDriverTripDetails,
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(driverPhone);
    const cleanId = String(bookingId).replace(/^#/, '');

    const messageText = formatWhatsAppDriverDutyAllotmentMessage({
      driverName,
      bookingId: cleanId,
      customerName,
      customerPhone,
      pickup,
      drop,
      travelDateTime: details?.travelDateTime,
      vehicleModel: details?.vehicleModel,
      cabClass: details?.cabClass,
      vehicleNumber: details?.vehicleNumber,
      balanceAmount: details?.balanceAmount
    });

    const formattedDate = formatWhatsAppDateTime(details?.travelDateTime);
    const shortVehicle = formatShortVehicleName(details?.vehicleModel, details?.cabClass);
    const vehicleStr = `${shortVehicle} (${details?.vehicleNumber || 'Assigned'})`;

    const templateConfig: WhatsAppTemplateConfig = {
      name: 'safar_driver_pickup_details',
      language: 'en_US',
      recipientName: driverName || 'Driver Partner',
      referenceId: cleanId,
      params: [
        driverName || 'Driver Partner',
        cleanId,
        customerName,
        `+91 ${formatClean10DigitPhone(customerPhone)}`,
        pickup,
        drop,
        formattedDate,
        vehicleStr,
        `₹${formatWhatsAppAmount(details?.balanceAmount ?? 0)}/-`
      ],
      backups: [
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            driverName || 'Driver Partner',
            cleanId,
            `DRIVER DUTY ALLOTMENT - Customer: ${customerName} (+91 ${formatClean10DigitPhone(customerPhone)}) | Pickup: ${pickup} to ${drop} (${formattedDate}) | Vehicle: ${vehicleStr} | Collect Balance: ₹${formatWhatsAppAmount(details?.balanceAmount ?? 0)}/-`
          ]
        }
      ]
    };

    return this.sendTextMessage(phone, messageText, callback, templateConfig);
  }

  /**
   * 5️⃣ DRIVER & VEHICLE DETAILS TO CUSTOMER (Sent immediately after Admin assigns driver)
   */
  public sendDriverDetailsToCustomer(
    customerPhone: string,
    driverName: string,
    driverPhoneNo: string,
    vehicleName: string,
    vehicleNumber: string,
    details?: {
      bookingId?: string;
      customerName?: string;
      pickup?: string;
      drop?: string;
      travelDateTime?: string;
      cabClass?: string;
      balanceAmount?: number | string;
    },
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(customerPhone);
    const cleanId = details?.bookingId ? String(details.bookingId).replace(/^#/, '') : 'SIC';
    const customerName = details?.customerName || 'Traveler';

    const messageText = formatWhatsAppDriverAllotmentCustomerMessage({
      customerName,
      bookingId: cleanId,
      pickup: details?.pickup || 'Pickup',
      drop: details?.drop || 'Drop',
      travelDateTime: details?.travelDateTime,
      driverName,
      driverPhone: driverPhoneNo,
      vehicleCategory: details?.cabClass || vehicleName,
      vehicleNumber
    });

    const formattedDate = formatWhatsAppDateTime(details?.travelDateTime);
    const formattedCategory = formatCabCategoryFull(details?.cabClass || vehicleName);

    const templateConfig: WhatsAppTemplateConfig = {
      name: 'safar_customer_driver_details',
      language: 'en_US',
      recipientName: customerName,
      referenceId: cleanId,
      params: [
        customerName,
        cleanId,
        driverName,
        `+91 ${formatClean10DigitPhone(driverPhoneNo)}`,
        formattedCategory,
        vehicleNumber,
        details?.pickup || 'Pickup',
        details?.drop || 'Drop',
        formattedDate,
        `₹${formatWhatsAppAmount(details?.balanceAmount ?? 0)}/-`
      ],
      backups: [
        {
          name: 'safar_ride_update',
          language: 'en_US',
          params: [
            customerName,
            cleanId,
            `DRIVER ALLOTMENT - Driver: ${driverName} (+91 ${formatClean10DigitPhone(driverPhoneNo)}) | Vehicle: ${formattedCategory} (${vehicleNumber}) | Route: ${details?.pickup || ''} to ${details?.drop || ''} (${formattedDate})`
          ]
        }
      ]
    };

    return this.sendTextMessage(phone, messageText, callback, templateConfig);
  }

  /**
   * Core HTTP Sender Method (Dispatches via Backend Interakt API Proxy `/api/send-booking-sms?endpoint=send-whatsapp`)
   */
  public async sendTextMessage(
    recipientPhone: string,
    messageText: string,
    callback?: WhatsAppCallback,
    templateConfig?: WhatsAppTemplateConfig
  ): Promise<boolean> {
    const activePhoneId = getWhatsAppPhoneId();
    const activeToken = getWhatsAppAccessToken();
    const formattedPhone = this.formatPhoneNumber(recipientPhone);

    try {
      const serverRes = await fetch('/api/send-booking-sms?endpoint=send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'send-whatsapp',
          recipientPhone: formattedPhone,
          messageText,
          phoneNumberId: activePhoneId,
          accessToken: activeToken || undefined,
          templateConfig
        })
      });
      const data = await serverRes.json().catch(() => null);
      if (data && data.success) {
        callback?.onSuccess('Message Sent Successfully via Interakt API');
        return true;
      }
      const err = new Error(data?.error || `HTTP Error Code: ${serverRes.status}`);
      callback?.onError(err);
      return false;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      callback?.onError(err);
      return false;
    }
  }
}

export const whatsAppService = new WhatsAppService();
