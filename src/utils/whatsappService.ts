/**
 * WhatsAppService (TypeScript / Web & Serverless Equivalent of WhatsAppService.java)
 * Package: com.safarindiacabs.app
 *
 * Uses Safar India Cabs Verified Meta WhatsApp Cloud API Credentials:
 * - PHONE_NUMBER_ID: 902764639583293
 * - API_URL: https://graph.facebook.com/v20.0/902764639583293/messages
 */

export const DEFAULT_WHATSAPP_PHONE_ID = '902764639583293';
export const DEFAULT_WHATSAPP_ACCESS_TOKEN =
  'EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD';

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
    localStorage.setItem('safar_wa_access_token', accessToken.trim() || DEFAULT_WHATSAPP_ACCESS_TOKEN);
  } catch {}
}

export class WhatsAppService {
  public static readonly PHONE_NUMBER_ID = DEFAULT_WHATSAPP_PHONE_ID;
  public static readonly ACCESS_TOKEN = DEFAULT_WHATSAPP_ACCESS_TOKEN;
  public static readonly API_URL = `https://graph.facebook.com/v20.0/${WhatsAppService.PHONE_NUMBER_ID}/messages`;

  // Common method to format and clean phone numbers (e.g., adds 91 for India)
  public formatPhoneNumber(phone: string): string {
    let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.slice(1);
    }
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    return cleanPhone;
  }

  /**
   * 1️⃣ CUSTOMER LOGIN OTP
   */
  public sendCustomerOtp(
    customerPhone: string,
    otpCode: string,
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(customerPhone);
    const messageText =
      `🔐 *Safar India Cabs Verification*\n\n` +
      `Your login OTP is: *${otpCode}*\n` +
      `Valid for 10 minutes. Do not share this with anyone.`;
    return this.sendTextMessage(phone, messageText, callback);
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
    const customerGreeting = details?.customerName ? `Hello *${details.customerName}*, your` : 'Your';
    const dateLine = details?.travelDateTime ? `🗓️ Date & Time: *${details.travelDateTime}*\n` : '';
    const cabLine = details?.cabClass ? `🚕 Cab Category: *${details.cabClass}*\n` : '';
    const addressLine = details?.pickupAddress ? `🏠 Pickup Address: ${details.pickupAddress}\n` : '';
    const advanceLine =
      details?.paidAmount !== undefined ? `✅ Advance Paid: *₹${details.paidAmount}*\n` : '';
    const balanceLine =
      details?.balanceAmount !== undefined
        ? `💵 Balance Payable at Trip: *₹${details.balanceAmount}*\n`
        : '';

    const messageText =
      `✅ *Booking Confirmed - Safar India Cabs*\n\n` +
      `${customerGreeting} cab booking is confirmed!\n\n` +
      `📋 *Complete Booking Details:*\n` +
      `• Booking ID: *#${cleanId}*\n` +
      `📍 Pickup: *${pickup}*\n` +
      `🏁 Drop: *${drop}*\n` +
      dateLine +
      cabLine +
      addressLine +
      `\n💰 *Fare Breakdown:*\n` +
      `• Total Fare: *₹${fare}*\n` +
      advanceLine +
      balanceLine +
      `\n🚗 Driver and vehicle details will be shared on your WhatsApp shortly before pickup.\n` +
      `📞 24/7 Helpline: +91 7710080992\n` +
      `Thank you for choosing *Safar India Cabs*!`;
    return this.sendTextMessage(phone, messageText, callback);
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
    const dateLine = details?.travelDateTime ? `🗓️ Date & Time: *${details.travelDateTime}*\n` : '';
    const cabLine = details?.cabClass ? `🚕 Cab Booked: *${details.cabClass}*\n` : '';
    const addressLine = details?.pickupAddress ? `🏠 Pickup Address: ${details.pickupAddress}\n` : '';
    const totalLine = details?.totalFare !== undefined ? `💰 Total Fare: *₹${details.totalFare}*\n` : '';
    const advanceLine =
      details?.paidAmount !== undefined ? `✅ Advance Paid: *₹${details.paidAmount}*\n` : '';
    const balanceLine =
      details?.balanceAmount !== undefined ? `💵 Balance Due: *₹${details.balanceAmount}*\n` : '';

    const messageText =
      `🚨 *New Booking Alert! (Safar India Cabs)*\n\n` +
      `Booking ID: *#${cleanId}*\n` +
      `👤 Customer: *${customerName}* (+91 ${customerPhone})\n` +
      `📍 Pickup: *${pickup}*\n` +
      `🏁 Drop: *${drop}*\n` +
      addressLine +
      dateLine +
      cabLine +
      totalLine +
      advanceLine +
      balanceLine +
      `\n⚡ Booking has been updated in the Owner Panel. Please assign a driver from the Owner Panel immediately.`;
    return this.sendTextMessage(phone, messageText, callback);
  }

  /**
   * 4️⃣ TRIP DETAILS & ASSIGNMENT TO DRIVER
   * Exact requested greeting: "SafarIndiaCabs Driver Partner {driverName}, your Pickup is confirmed! Please timely complete the trip."
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
    const dateLine = details?.travelDateTime
      ? `• Pickup Date & Time: *${details.travelDateTime}*\n`
      : '';
    const vehicleLine =
      details?.vehicleModel || details?.vehicleNumber
        ? `• Assigned Vehicle: *${details?.vehicleModel || 'Cab'}${details?.vehicleNumber ? ` (${details.vehicleNumber})` : ''}*\n`
        : '';
    const balanceLine =
      details?.balanceAmount !== undefined
        ? `• Collect Balance at Drop: *₹${details.balanceAmount}*\n`
        : '';

    const messageText =
      `🚖 *SafarIndiaCabs Driver Partner ${driverName}*\n\n` +
      `Your Pickup is confirmed! Please timely complete the trip.\n\n` +
      `📋 *Complete Trip Info:*\n` +
      `• Booking ID: *#${cleanId}*\n` +
      `• Customer Name: *${customerName}*\n` +
      `• Customer Mobile: *+91 ${customerPhone}*\n` +
      `• Pickup Location: *${pickup}*\n` +
      `• Drop Location: *${drop}*\n` +
      dateLine +
      vehicleLine +
      balanceLine +
      `\nPlease contact the customer promptly and reach pickup on time. Drive safely!\n` +
      `📞 Dispatch Helpline: +91 7710080992`;
    return this.sendTextMessage(phone, messageText, callback);
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
      balanceAmount?: number | string;
    },
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(customerPhone);
    const cleanId = details?.bookingId ? String(details.bookingId).replace(/^#/, '') : '';
    const greeting = details?.customerName ? `Hello *${details.customerName}*, your` : 'Your';
    const tripBlock =
      cleanId || details?.pickup
        ? `\n📋 *Trip Details:*\n` +
          (cleanId ? `• Booking ID: *#${cleanId}*\n` : '') +
          (details?.pickup && details?.drop ? `• Route: *${details.pickup}* ➔ *${details.drop}*\n` : '') +
          (details?.travelDateTime ? `• Date & Time: *${details.travelDateTime}*\n` : '') +
          (details?.balanceAmount !== undefined ? `• Balance Payable: *₹${details.balanceAmount}*\n` : '')
        : '';

    const messageText =
      `🚗 *Driver & Vehicle Assigned! - Safar India Cabs*\n\n` +
      `${greeting} ride is ready. Here are your complete driver & vehicle details:\n\n` +
      `👨‍✈️ *Driver Name:* ${driverName}\n` +
      `📞 *Driver Contact:* +91 ${driverPhoneNo}\n` +
      `🚙 *Vehicle Model:* ${vehicleName}\n` +
      `🔢 *Vehicle Number:* ${vehicleNumber}\n` +
      tripBlock +
      `\nYour driver partner will contact you shortly before pickup.\n` +
      `📞 24/7 Helpline: +91 7710080992\n` +
      `Have a safe and happy journey with *Safar India Cabs*!`;
    return this.sendTextMessage(phone, messageText, callback);
  }

  /**
   * Core HTTP Sender Method (Meta Cloud API + Serverless Proxy Fallback)
   */
  public async sendTextMessage(
    recipientPhone: string,
    messageText: string,
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const activePhoneId = getWhatsAppPhoneId();
    const activeToken = getWhatsAppAccessToken();
    const formattedPhone = this.formatPhoneNumber(recipientPhone);

    // 1. Try serverless backend proxy first (/api/send-whatsapp)
    try {
      const serverRes = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: formattedPhone,
          messageText,
          phoneNumberId: activePhoneId,
          accessToken: activeToken
        })
      });
      if (serverRes.ok) {
        const data = await serverRes.json().catch(() => null);
        if (data?.success) {
          callback?.onSuccess('Message Sent Successfully');
          return true;
        }
      }
    } catch {
      // Fall through to direct Meta Graph API call
    }

    // 2. Direct Meta WhatsApp Cloud API request
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText
        }
      };

      const apiUrl = `https://graph.facebook.com/v20.0/${activePhoneId}/messages`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json; utf-8',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 200 || res.status === 201) {
        callback?.onSuccess('Message Sent Successfully');
        return true;
      } else {
        const errData = await res.json().catch(() => null);
        const err = new Error(errData?.error?.message || `HTTP Error Code: ${res.status}`);
        callback?.onError(err);
        return false;
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      callback?.onError(err);
      return false;
    }
  }
}

export const whatsAppService = new WhatsAppService();
