/**
 * Root Layout & PWA Metadata Configuration
 * 
 * Provides unified PWA metadata for mobile app conversion:
 * - Manifest linking: /manifest.json
 * - App Icons: /icon-192.png, /icon-512.png, /icon-512-maskable.png, /apple-touch-icon.png
 * - Theme color: #F59E0B
 * - Standalone display & mobile status bar
 */

import React, { useEffect } from 'react';
import { OfflineIndicator } from './components/OfflineIndicator';

// Standard Metadata Definition for Next.js / React Frameworks & PWA Builders
export const viewport = {
  themeColor: '#F59E0B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata = {
  title: 'Safar India Cabs - Outstation & Intercity Taxi Service | Instant Booking',
  description:
    'Book affordable outstation cabs, one-way taxi with zero return fare, round trips, local hourly rentals, and airport transfers across India. 24/7 Helpline: +91 7710080992.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Safar Cabs',
  },
  applicationName: 'Safar Cabs',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const ensureLink = (rel: string, href: string, attrs: Record<string, string> = {}) => {
      let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"][href="${href}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        Object.entries(attrs).forEach(([k, v]) => link!.setAttribute(k, v));
        document.head.appendChild(link);
      }
    };

    ensureLink('manifest', '/manifest.json');
    ensureLink('icon', '/icon-192.png', { type: 'image/png', sizes: '192x192' });
    ensureLink('icon', '/icon-512.png', { type: 'image/png', sizes: '512x512' });
    ensureLink('apple-touch-icon', '/apple-touch-icon.png', { sizes: '180x180' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased flex flex-col selection:bg-amber-400 selection:text-slate-950">
      {children}
      <OfflineIndicator />
    </div>
  );
};

export default RootLayout;
