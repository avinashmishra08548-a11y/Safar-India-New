import React from 'react';

export const WHATSAPP_NUMBER = '917710080992';
export const DEFAULT_WHATSAPP_TEXT = 'Hello Safar India Cabs, I need cab booking assistance';

export function buildWhatsAppSchemeUrl(
  message: string = DEFAULT_WHATSAPP_TEXT,
  phone: string = WHATSAPP_NUMBER
): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const whatsappNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const textMsg = encodeURIComponent(message);
  return `whatsapp://send?phone=${whatsappNumber}&text=${textMsg}`;
}

export function triggerWhatsAppDeepLink(
  e?: React.MouseEvent<HTMLElement>,
  message: string = DEFAULT_WHATSAPP_TEXT,
  phone: string = WHATSAPP_NUMBER
): void {
  if (e) {
    e.preventDefault();
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const whatsappNumber = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const textMsg = encodeURIComponent(message);
  // Primary deep-link scheme for Android WebView app (opens Normal WhatsApp or WhatsApp Business directly)
  const waUrl = `whatsapp://send?phone=${whatsappNumber}&text=${textMsg}`;
  const fallbackUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${textMsg}`;

  try {
    window.open(waUrl, '_system') || (window.location.href = waUrl);
  } catch {
    window.location.href = waUrl;
  }

  // Fallback for desktop browsers where whatsapp:// scheme may not be registered
  const isMobileOrWebView = /Android|iPhone|iPad|iPod|; wv\)|AppsGeyser|WebView/i.test(
    navigator.userAgent
  );
  if (!isMobileOrWebView) {
    setTimeout(() => {
      if (document.hasFocus()) {
        window.open(fallbackUrl, '_blank');
      }
    }, 600);
  }
}
