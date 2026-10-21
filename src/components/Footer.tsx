import React from 'react';
import {
  Car,
  Phone,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  Mail,
  MapPin,
  Clock,
  Info,
  HelpCircle
} from 'lucide-react';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { SAFAR_CONTACT_INFO } from './AboutAndHelpViews';
import { NavTabId } from './Header';

interface FooterProps {
  activeNavTab?: NavTabId;
  onNavigateTab?: (tab: NavTabId) => void;
  onOpenDriverPartner?: () => void;
  onSelectRoute?: (pickup: string, drop: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  activeNavTab = 'booking',
  onNavigateTab,
  onOpenDriverPartner,
  onSelectRoute
}) => {
  const popularRoutes = [
    { from: 'Delhi NCR', to: 'Agra', km: 230 },
    { from: 'Delhi NCR', to: 'Jaipur', km: 275 },
    { from: 'Delhi NCR', to: 'Chandigarh', km: 245 },
    { from: 'Delhi NCR', to: 'Haridwar', km: 225 },
    { from: 'Delhi NCR', to: 'Dehradun', km: 255 },
    { from: 'Mumbai', to: 'Pune', km: 150 },
    { from: 'Mumbai', to: 'Goa', km: 585 },
    { from: 'Mumbai', to: 'Nashik', km: 170 },
    { from: 'Mumbai', to: 'Shirdi', km: 240 },
    { from: 'Bangalore', to: 'Mysore', km: 145 },
    { from: 'Bangalore', to: 'Coorg', km: 260 },
    { from: 'Lucknow', to: 'Ayodhya', km: 135 },
    { from: 'Lucknow', to: 'Varanasi', km: 310 },
    { from: 'Jaipur', to: 'Udaipur', km: 395 }
  ];

  const footerNavLinks: Array<{
    id: NavTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'booking', label: 'Book Outstation / Local Cab', icon: Car },
    { id: 'routes', label: 'Popular Intercity Routes', icon: MapPin },
    { id: 'rides', label: 'My Rides & Tax Invoices', icon: Clock },
    { id: 'about', label: 'About Company & Features', icon: Info },
    { id: 'help', label: '24/7 Help & Support Center', icon: HelpCircle }
  ];

  const handleSectionSelect = (tab: NavTabId) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      id="footer-contact-section"
      className="bg-slate-100/90 border-t border-slate-200 pt-12 pb-32 sm:pb-12 text-xs text-slate-600"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Top Interactive Section Switcher Strip (Highlights Active Section) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 px-1">
              Quick App Navigation:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {footerNavLinks.map((item) => {
                const isActive = activeNavTab === item.id;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSectionSelect(item.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-black shadow-xs ring-2 ring-amber-400/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    <IconComp
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-slate-950' : 'text-amber-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Grid: Brand, Intercity Routes, & Official Contact Channels */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Column 1: Brand & Official Socials (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <button
              type="button"
              onClick={() => handleSectionSelect('booking')}
              className="flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <Car className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="font-black tracking-tight text-lg text-slate-950 font-sans flex items-center">
                  <span>SAFAR</span>
                  <span className="text-amber-500 mx-0.5 font-mono">.</span>
                  <span>INDIA</span>
                  <span className="text-amber-500 mx-0.5 font-mono">.</span>
                  <span className="text-amber-500">CABS</span>
                </div>
                <div className="text-[10px] tracking-[0.25em] font-extrabold text-amber-600 uppercase -mt-0.5">
                  Travel Smart
                </div>
              </div>
            </button>

            <p className="text-slate-600 text-xs leading-relaxed max-w-sm">
              India's premier outstation taxi network. Providing verified chauffeurs, one-way rides with zero return fare, round trips, local hourly rentals, and airport transfers across 150+ Indian cities.
            </p>

            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All India Tourist Permit (AITP) Verified Fleet</span>
            </div>

            {/* SOCIAL MEDIA LINKS INTEGRATION */}
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2.5">
                Connect With Us
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* WhatsApp */}
                <a
                  href={buildWhatsAppSchemeUrl(SAFAR_CONTACT_INFO.whatsappRaw)}
                  onClick={(e) => triggerWhatsAppDeepLink(e, SAFAR_CONTACT_INFO.whatsappRaw)}
                  className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 flex items-center gap-1.5 font-bold transition-all shadow-2xs cursor-pointer"
                  title="WhatsApp: +91 77100 80992"
                >
                  <MessageSquare className="w-4 h-4 fill-current shrink-0" />
                  <span>WhatsApp</span>
                </a>

                {/* Instagram */}
                <a
                  href={SAFAR_CONTACT_INFO.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-pink-50 hover:bg-gradient-to-tr hover:from-amber-500 hover:to-pink-500 text-pink-700 hover:text-white border border-pink-200 flex items-center gap-1.5 font-bold transition-all shadow-2xs"
                  title="Instagram: @safarindiacabs01"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>Instagram</span>
                </a>

                {/* Facebook */}
                <a
                  href={SAFAR_CONTACT_INFO.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 flex items-center gap-1.5 font-bold transition-all shadow-2xs"
                  title="Facebook: Safar India Cabs"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Popular Intercity Routes (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Popular Intercity Routes
              </h4>
              <button
                type="button"
                onClick={() => handleSectionSelect('routes')}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-extrabold cursor-pointer"
              >
                View All 150+ Routes →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              {popularRoutes.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (onSelectRoute) onSelectRoute(r.from, r.to);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left text-slate-600 hover:text-amber-700 transition flex items-center gap-1 group truncate font-medium cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-amber-600 shrink-0" />
                  <span className="truncate">
                    {r.from} ➔ {r.to}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Column 3: 24/7 Helpline, WhatsApp, Email & Partner (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              24/7 Help &amp; Contact
            </h4>
            <div className="space-y-2 text-slate-700">
              <a
                href={SAFAR_CONTACT_INFO.telHref}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition text-slate-900 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">
                    Calling Helpline
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 font-mono">
                    {SAFAR_CONTACT_INFO.phoneDisplay}
                  </div>
                </div>
              </a>

              <a
                href={buildWhatsAppSchemeUrl(SAFAR_CONTACT_INFO.whatsappRaw)}
                onClick={(e) => triggerWhatsAppDeepLink(e, SAFAR_CONTACT_INFO.whatsappRaw)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 transition text-emerald-700 shadow-2xs cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 fill-current text-emerald-600" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">
                    WhatsApp Support
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-emerald-700 font-mono">
                    {SAFAR_CONTACT_INFO.phoneDisplay}
                  </div>
                </div>
              </a>

              <a
                href={SAFAR_CONTACT_INFO.mailtoHref}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 transition text-slate-900 shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">
                    Official Email
                  </div>
                  <div className="font-bold text-xs text-slate-900 truncate">
                    {SAFAR_CONTACT_INFO.email}
                  </div>
                </div>
              </a>

              {onOpenDriverPartner && (
                <button
                  type="button"
                  onClick={onOpenDriverPartner}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-800 hover:text-amber-700 font-bold text-xs text-center transition block shadow-2xs cursor-pointer"
                >
                  Join as Driver / Vendor Partner
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Strip: Copyright & Interactive Policy Links (Owner Panel Removed from Footer) */}
        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} <strong>Safar India Cabs</strong> (safarindiacabs.com). All rights reserved. Travel Smart.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 font-semibold">
            <button
              type="button"
              onClick={() => handleSectionSelect('about')}
              className={`transition cursor-pointer ${
                activeNavTab === 'about'
                  ? 'text-amber-700 font-extrabold underline underline-offset-4'
                  : 'hover:text-slate-900'
              }`}
            >
              About Company
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleSectionSelect('help')}
              className={`transition cursor-pointer ${
                activeNavTab === 'help'
                  ? 'text-amber-700 font-extrabold underline underline-offset-4'
                  : 'hover:text-slate-900'
              }`}
            >
              Help &amp; FAQs
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleSectionSelect('about')}
              className="hover:text-slate-900 transition cursor-pointer"
            >
              Fare Rules
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleSectionSelect('help')}
              className="hover:text-slate-900 transition cursor-pointer"
            >
              Customer Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
