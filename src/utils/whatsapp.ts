import React from 'react';

export const WHATSAPP_NUMBER = '917710080992';
export const DEFAULT_WHATSAPP_TEXT = 'Hello Safar India Cabs, I need cab booking assistance';

export function buildWhatsAppSchemeUrl(
  message: string = DEFAULT_WHATSAPP_TEXT,
  phone: string = WHATSAPP_NUMBER
): string {
  const cleanPhone = (phone || WHATSAPP_NUMBER).replace(/\D/g, '');
  const whatsappNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const textMsg = encodeURIComponent(message || DEFAULT_WHATSAPP_TEXT);
  return `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${textMsg}`;
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
    // Called as triggerWhatsAppDeepLink(phone, message)
    targetPhone = firstArg || WHATSAPP_NUMBER;
    targetMessage = secondArg || DEFAULT_WHATSAPP_TEXT;
  } else {
    // Called as triggerWhatsAppDeepLink(event, message, phone)
    if (firstArg && typeof (firstArg as any).preventDefault === 'function') {
      (firstArg as any).preventDefault();
    }
    targetMessage = secondArg || DEFAULT_WHATSAPP_TEXT;
    targetPhone = thirdArg || WHATSAPP_NUMBER;
  }

  const cleanPhone = targetPhone.replace(/\D/g, '');
  const whatsappNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const textMsg = encodeURIComponent(targetMessage);
  const webWhatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${textMsg}`;

  try {
    const win = window.open(webWhatsappUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      const a = document.createElement('a');
      a.href = webWhatsappUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch {
    // Ignore popup block errors so the current React UI never crashes
  }
}
