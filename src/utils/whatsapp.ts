import React from 'react';

export const WHATSAPP_NUMBER = '917710080992';
export const DEFAULT_WHATSAPP_TEXT = 'Hello Safar India Cabs, I need cab booking assistance';
export const OFFICIAL_REVIEW_URL = 'https://safarindiacabs.com/?action=review';

export function formatPhoneWithCountryCode(phone: string = WHATSAPP_NUMBER): string {
  const digits = (phone || WHATSAPP_NUMBER).replace(/\D/g, '');
  if (!digits) return WHATSAPP_NUMBER;
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return last10.length === 10 ? `91${last10}` : digits;
}

export function buildWhatsAppSchemeUrl(
  message: string = DEFAULT_WHATSAPP_TEXT,
  phone: string = WHATSAPP_NUMBER
): string {
  const whatsappNumber = formatPhoneWithCountryCode(phone);
  const textMsg = encodeURIComponent(message || DEFAULT_WHATSAPP_TEXT);
  return `https://wa.me/${whatsappNumber}?text=${textMsg}`;
}

export function buildCustomerReviewRequestMessage(params: {
  customerName: string;
  pickupCity: string;
  dropCity: string;
  bookingId?: string;
}): string {
  const name = (params.customerName || 'Valued Traveler').trim();
  const route = `${(params.pickupCity || 'Origin').trim()} to ${(params.dropCity || 'Destination').trim()}`;
  const bookingRef = params.bookingId ? ` (Booking ID: *${params.bookingId}*)` : '';

  return [
    `Namaste *${name}* ji! 🙏`,
    ``,
    `Thank you for traveling with *Safar India Cabs* on your recent trip from *${route}*${bookingRef}. We hope you had a safe, comfortable, and pleasant journey! 🚖✨`,
    ``,
    `We would love to hear your valuable feedback. Please take 30 seconds to rate your trip and share your review here:`,
    `👉 ${OFFICIAL_REVIEW_URL}`,
    ``,
    `Thank you for choosing *Safar India Cabs*!`,
    `*24x7 Helpline:* +91 77100 80992`
  ].join('\n');
}

export function buildCustomerReviewWhatsAppUrl(params: {
  customerName: string;
  customerPhone: string;
  pickupCity: string;
  dropCity: string;
  bookingId?: string;
}): string {
  const cleanPhone = formatPhoneWithCountryCode(params.customerPhone);
  const message = buildCustomerReviewRequestMessage(params);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function openExternalLinkSafely(url: string): void {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // Ignore popup or navigation restrictions
  }
}

export function triggerCustomerReviewWhatsApp(params: {
  customerName: string;
  customerPhone: string;
  pickupCity: string;
  dropCity: string;
  bookingId?: string;
}): void {
  const url = buildCustomerReviewWhatsAppUrl(params);
  openExternalLinkSafely(url);
}

/**
 * Safely opens WhatsApp chat without crashing or navigating the current page away.
 * Supports both calling conventions:
 * 1) triggerWhatsAppDeepLink(event, message, phone)
 * 2) triggerWhatsAppDeepLink(phone, message)
 */
export function triggerWhatsAppDeepLink(
  firstArg?: React.MouseEvent<HTMLElement> | string,
  secondArg: string = DEFAULT_WHATSAPP_TEXT,
  thirdArg: string = WHATSAPP_NUMBER
): void {
  let targetPhone = WHATSAPP_NUMBER;
  let targetMessage = DEFAULT_WHATSAPP_TEXT;

  if (typeof firstArg === 'string') {
    targetPhone = firstArg || WHATSAPP_NUMBER;
    targetMessage = secondArg || DEFAULT_WHATSAPP_TEXT;
  } else {
    if (firstArg && typeof (firstArg as any).preventDefault === 'function') {
      (firstArg as any).preventDefault();
    }
    targetMessage = secondArg || DEFAULT_WHATSAPP_TEXT;
    targetPhone = thirdArg || WHATSAPP_NUMBER;
  }

  const url = buildWhatsAppSchemeUrl(targetMessage, targetPhone);
  openExternalLinkSafely(url);
}
