import React, { useState } from 'react';
import { Car, Phone, MessageSquare, Clock, Shield, Menu, X, User } from 'lucide-react';
import { CustomerUser } from '../types';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from '../utils/whatsapp';

interface HeaderProps {
  currentUser: CustomerUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: 'booking' | 'rides' | 'routes' | 'faq') => void;
  activeNavTab: string;
  onOpenAdmin?: () => void;
  onOpenDriverPartner: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  onNavigateTab,
  activeNavTab,
  onOpenAdmin,
  onOpenDriverPartner
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'booking' | 'rides' | 'routes' | 'faq') => {
    onNavigateTab(tab);
    setMobileMenuOpen(false);
  };

  const handlePartnerClick = () => {
    onOpenDriverPartner();
    setMobileMenuOpen(false);
  };

  const handleContactClick = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('footer-contact-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = 'tel:+917710080992';
    }
  };

  const whatsappHref = buildWhatsAppSchemeUrl();

  return (
    <header className="safar-dark-header sticky top-0 z-[1000] bg-[#0B0B0E] text-white border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-h-[60px] sm:min-h-[68px]">
          
          {/* 1. FAR LEFT: White Circular Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-slate-100 text-slate-950 flex items-center justify-center shadow-md transition active:scale-95 shrink-0"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
          </button>

          {/* 2. CENTER-LEFT: SafarIndiaCabs Emblem Logo with Car Swoosh & Flanking Gold Lines */}
          <button 
            type="button"
            onClick={() => handleNavClick('booking')}
            className="flex flex-col items-center justify-center text-center transition-transform active:scale-98 whitespace-nowrap shrink-0 group py-0.5"
          >
            {/* Stylized Car Roofline Swoosh + Rising Sun Emblem */}
            <svg
              viewBox="0 0 180 28"
              className="w-28 sm:w-36 h-4 sm:h-5 -mb-1 overflow-visible"
              aria-hidden="true"
            >
              {/* White Left Roofline Curve */}
              <path
                d="M 28 22 Q 62 3 98 11 Q 72 8 44 22 Z"
                fill="#FFFFFF"
              />
              {/* Gold Right Hood Swoosh */}
              <path
                d="M 86 11 Q 120 12 148 22 Q 118 17 84 14 Z"
                fill="#FACC15"
              />
              {/* Gold Sun / Crown Rays on Right */}
              <circle cx="136" cy="11" r="3.5" fill="#FACC15" />
              <path
                d="M 131 6 L 133 9 M 136 4 L 136 7.5 M 141 6 L 139 9 M 144 10 L 140.5 11"
                stroke="#FACC15"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            {/* Main Brand Title: SafarIndiaCabs */}
            <div className="font-black tracking-tight text-[19px] sm:text-2xl font-sans leading-none flex items-center">
              <span className="text-white">SafarIndia</span>
              <span className="text-[#FACC15]">Cabs</span>
            </div>

            {/* Subtitle with Flanking Gold Lines: ─── A1 Cab Services N.India ─── */}
            <div className="flex items-center gap-1.5 mt-0.5 w-full justify-center">
              <span className="h-[1px] w-5 sm:w-8 bg-gradient-to-r from-transparent to-[#FACC15]" />
              <span className="text-[9.5px] sm:text-[11px] font-bold text-[#FDE047] tracking-wide">
                A1 Cab Services N.India
              </span>
              <span className="h-[1px] w-5 sm:w-8 bg-gradient-to-l from-transparent to-[#FACC15]" />
            </div>
          </button>

          {/* DESKTOP NAVIGATION LINKS */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-200">
            <button
              type="button"
              onClick={() => handleNavClick('booking')}
              className={`hover:text-[#FACC15] transition-colors whitespace-nowrap ${
                activeNavTab === 'booking' ? 'text-[#FACC15] font-black' : ''
              }`}
            >
              Book Cab
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('routes')}
              className={`hover:text-[#FACC15] transition-colors whitespace-nowrap ${
                activeNavTab === 'routes' ? 'text-[#FACC15] font-black' : ''
              }`}
            >
              Popular Routes
            </button>

            <button
              type="button"
              onClick={handlePartnerClick}
              className="hover:text-[#FACC15] transition-colors whitespace-nowrap text-slate-200"
            >
              Driver Partner
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('rides')}
              className={`flex items-center gap-1.5 hover:text-[#FACC15] transition-colors whitespace-nowrap ${
                activeNavTab === 'rides' ? 'text-[#FACC15] font-black' : ''
              }`}
            >
              <Clock className="w-4 h-4 text-[#FACC15]" />
              <span>My Rides</span>
            </button>
          </nav>

          {/* 3. RIGHT SIDE: Yellow Login/Logout Pill + Far-Right Yellow Circular Cab Icon Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Yellow Pill: Login or Logout */}
            {currentUser ? (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-slate-950 bg-[#FACC15] hover:bg-[#eab308] px-3.5 sm:px-4 py-2 rounded-full transition shadow-sm active:scale-95 whitespace-nowrap shrink-0"
                title={`Logged in as ${currentUser.name} — Tap to Logout`}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 stroke-[2.3] shrink-0" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-slate-950 bg-[#FACC15] hover:bg-[#eab308] px-3.5 sm:px-4 py-2 rounded-full transition shadow-sm active:scale-95 whitespace-nowrap shrink-0"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 stroke-[2.3] shrink-0" />
                <span>Login</span>
              </button>
            )}

            {/* Far Right: Yellow Circular Cab Icon Button */}
            <button
              type="button"
              onClick={() => {
                handleNavClick('booking');
                window.scrollTo({ top: 280, behavior: 'smooth' });
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FACC15] hover:bg-[#eab308] text-slate-950 flex flex-col items-center justify-center shadow-md transition active:scale-95 shrink-0"
              aria-label="Quick Book Cab"
              title="Book a Cab"
            >
              <div className="w-2.5 h-0.5 bg-slate-950 rounded-t-xs -mb-0.5" />
              <Car className="w-5 h-5 text-slate-950 fill-slate-950 stroke-[1.8]" />
            </button>

          </div>

        </div>

        {/* Dropdown Navigation Drawer (When Left Hamburger is clicked) */}
        {mobileMenuOpen && (
          <div className="py-4 border-t border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 bg-[#0B0B0E] text-white">
            
            {/* Customer Status in Menu */}
            <div className="pb-2 border-b border-slate-800">
              {currentUser ? (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FACC15] text-slate-950 font-black flex items-center justify-center text-sm shadow-sm">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[10px] text-[#FACC15] font-bold uppercase tracking-wider">Logged In Customer</div>
                      <div className="text-xs font-extrabold text-white">{currentUser.name}</div>
                      <div className="text-[11px] font-mono text-slate-300 font-semibold">+91 {currentUser.phone}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-bold text-xs rounded-xl transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-2.5 px-4 bg-[#FACC15] hover:bg-[#eab308] text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <User className="w-4 h-4 text-slate-950" />
                  <span>Customer Login / Register with OTP</span>
                </button>
              )}
            </div>

            <nav className="flex flex-col space-y-1 text-sm font-bold text-slate-100">
              <button
                type="button"
                onClick={() => handleNavClick('booking')}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-[#FACC15] transition flex items-center justify-between"
              >
                <span>Book Outstation / Local Cab</span>
                <Car className="w-4 h-4 text-[#FACC15]" />
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('routes')}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-[#FACC15] transition"
              >
                Popular Intercity Routes
              </button>
              <button
                type="button"
                onClick={handlePartnerClick}
                className="px-3 py-2.5 rounded-xl text-left text-[#FACC15] hover:bg-slate-900 transition font-bold"
              >
                Join as Driver / Vendor Partner
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('rides')}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-[#FACC15] transition flex items-center justify-between"
              >
                <span>My Rides & Tax Invoices</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={handleContactClick}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-[#FACC15] transition"
              >
                Contact 24/7 Helpline
              </button>
            </nav>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="tel:+917710080992"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-[#FACC15]" />
                <span>Call +91 77100 80992</span>
              </a>

              <a
                href={whatsappHref}
                onClick={(e) => triggerWhatsAppDeepLink(e)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>WhatsApp Support</span>
              </a>

              {onOpenAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="sm:col-span-2 w-full py-2.5 px-3 text-xs text-[#FACC15] font-bold bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-4 h-4 text-[#FACC15]" />
                  <span>Open Owner Control Dashboard</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
