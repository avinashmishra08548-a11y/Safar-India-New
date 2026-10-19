/**
 * WhatsAppService (TypeScript / Web & Serverless Equivalent of WhatsAppService.java)
 * Package: com.safarindiacabs.app
 *
 * Uses Safar India Cabs Verified Meta WhatsApp Cloud API Credentials:
 * - PHONE_NUMBER_ID: 902764639583293
 * - API_URL: https://graph.facebook.com/v20.0/902764639583293/messages
 */

export interface WhatsAppCallback {
  onSuccess: (response: string) => void;
  onError: (e: Error) => void;
}

export class WhatsAppService {
  private static readonly PHONE_NUMBER_ID = '902764639583293';
  private static readonly ACCESS_TOKEN =
    'EAAQJwftBnh4BSwB6NchrSSk726GnyhBhQ7KsRCdJjYD5ZBM9SzymkFEypXNws84BpNdbNVe3VpY48pDjjXZBZAdKbPboZBXlf8nzHhemNmvWNlwStfkcGSFfMTpPTExnhZAalcnx36ZBqXRhJeZBJo1NoJtjXhdZBo1zTJJywIOp6XKyW8poIxwlc5syie5J2qvubAZDZD';
  private static readonly API_URL = `https://graph.facebook.com/v20.0/${WhatsAppService.PHONE_NUMBER_ID}/messages`;

  // Common method to format and clean phone numbers (e.g., adds 91 for India)
  private formatPhoneNumber(phone: string): string {
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
   * 2️⃣ BOOKING CONFIRMATION TO CUSTOMER
   */
  public sendBookingConfirmationToCustomer(
    customerPhone: string,
    bookingId: string,
    pickup: string,
    drop: string,
    fare: string | number,
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(customerPhone);
    const cleanId = String(bookingId).replace(/^#/, '');
    const messageText =
      `✅ *Booking Confirmed - Safar India Cabs*\n\n` +
      `Booking ID: #${cleanId}\n` +
      `📍 Pickup: ${pickup}\n` +
      `🏁 Drop: ${drop}\n` +
      `💰 Fare: ₹${fare}\n\n` +
      `Driver and vehicle details will be shared shortly. Thank you for choosing us!`;
    return this.sendTextMessage(phone, messageText, callback);
  }

  /**
   * 3️⃣ NEW BOOKING ALERT TO ADMIN
   */
  public sendNewBookingAlertToAdmin(
    adminPhone: string,
    bookingId: string,
    customerName: string,
    customerPhone: string,
    pickup: string,
    drop: string,
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(adminPhone);
    const cleanId = String(bookingId).replace(/^#/, '');
    const messageText =
      `🚨 *New Booking Alert! (Safar India Cabs)*\n\n` +
      `Booking ID: #${cleanId}\n` +
      `👤 Customer: ${customerName} (${customerPhone})\n` +
      `📍 Pickup: ${pickup}\n` +
      `🏁 Drop: ${drop}\n\n` +
      `Please assign a driver from the Owner Panel immediately.`;
    return this.sendTextMessage(phone, messageText, callback);
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
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(driverPhone);
    const cleanId = String(bookingId).replace(/^#/, '');
    const messageText =
      `🚖 *New Trip Assigned - Safar India Cabs*\n\n` +
      `Hello ${driverName},\n` +
      `Your pickup is confirmed! Please complete the trip timely.\n\n` +
      `📋 *Trip Info:* \n` +
      `• Booking ID: #${cleanId}\n` +
      `• Customer: ${customerName} (${customerPhone})\n` +
      `• Pickup Location: ${pickup}\n` +
      `• Drop Location: ${drop}\n\n` +
      `Drive safely!`;
    return this.sendTextMessage(phone, messageText, callback);
  }

  /**
   * 5️⃣ DRIVER & VEHICLE DETAILS TO CUSTOMER (Sent after Admin assigns driver)
   */
  public sendDriverDetailsToCustomer(
    customerPhone: string,
    driverName: string,
    driverPhoneNo: string,
    vehicleName: string,
    vehicleNumber: string,
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    const phone = this.formatPhoneNumber(customerPhone);
    const messageText =
      `🚗 *Driver Assigned! - Safar India Cabs*\n\n` +
      `Your ride is ready. Here are your driver details:\n\n` +
      `👨✈️ Driver Name: ${driverName}\n` +
      `📞 Contact: ${driverPhoneNo}\n` +
      `🚙 Vehicle: ${vehicleName} (${vehicleNumber})\n\n` +
      `Have a safe and happy journey with Safar India Cabs!`;
    return this.sendTextMessage(phone, messageText, callback);
  }

  /**
   * Core HTTP Sender Method (Meta Cloud API + Serverless Proxy Fallback)
   */
  private async sendTextMessage(
    recipientPhone: string,
    messageText: string,
    callback?: WhatsAppCallback
  ): Promise<boolean> {
    // 1. Try serverless backend proxy first (/api/send-whatsapp)
    try {
      const serverRes = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientPhone, messageText })
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
        to: recipientPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText
        }
      };

      const res = await fetch(WhatsAppService.API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WhatsAppService.ACCESS_TOKEN}`,
          'Content-Type': 'application/json; utf-8',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 200 || res.status === 201) {
        callback?.onSuccess('Message Sent Successfully');
        return true;
      } else {
        const err = new Error(`HTTP Error Code: ${res.status}`);
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
