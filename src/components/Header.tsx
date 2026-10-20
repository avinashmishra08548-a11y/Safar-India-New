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
    <header className="safar-dark-header sticky top-0 z-[1000] bg-[#0B0F19] text-white border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 min-h-[64px] sm:min-h-[72px]">
          
          {/* Zone 1: Brand Lockup */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-white flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button 
              type="button"
              onClick={() => handleNavClick('booking')}
              className="flex items-center gap-2.5 text-left transition-transform active:scale-98 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <img
                src="/assets/aistudio/file_000000007f788211880d40783635e995_5f28509a.png"
                alt="SafarIndiaCabs Logo"
                referrerPolicy="no-referrer"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover bg-white p-0.5 shrink-0"
              />
              <span className="font-black tracking-tight text-lg sm:text-xl leading-none">
                <span className="text-white">SafarIndia</span>
                <span className="text-amber-400">Cabs</span>
              </span>
            </button>
          </div>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => handleNavClick('booking')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeNavTab === 'booking' ? 'text-amber-400 font-bold' : ''
              }`}
            >
              Book Cab
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('routes')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeNavTab === 'routes' ? 'text-amber-400 font-bold' : ''
              }`}
            >
              Popular Routes
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('rides')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeNavTab === 'rides' ? 'text-amber-400 font-bold' : ''
              }`}
            >
              My Rides
            </button>

            <button
              type="button"
              onClick={handlePartnerClick}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Driver Partner
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('faq')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeNavTab === 'faq' ? 'text-amber-400 font-bold' : ''
              }`}
            >
              FAQ
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 px-4 py-2 rounded-xl transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                title={`Logged in as ${currentUser.name} — Tap to Logout`}
              >
                <User className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Logout</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 px-4 py-2 rounded-xl transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Login</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="py-4 border-t border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 bg-[#0B0F19] text-white">
            <div className="pb-2 border-b border-slate-800">
              {currentUser ? (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white">{currentUser.name}</div>
                      <div className="text-[11px] font-mono text-slate-300">+91 {currentUser.phone}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl transition"
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
                  className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4 text-slate-950" />
                  <span>Customer WhatsApp Login</span>
                </button>
              )}
            </div>

            <nav className="flex flex-col space-y-1 text-sm font-bold text-slate-100">
              <button
                type="button"
                onClick={() => handleNavClick('booking')}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-amber-400 transition flex items-center justify-between"
              >
                <span>Book Outstation / Local Cab</span>
                <Car className="w-4 h-4 text-amber-400" />
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('routes')}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-amber-400 transition"
              >
                Popular Intercity Routes
              </button>
              <button
                type="button"
                onClick={handlePartnerClick}
                className="px-3 py-2.5 rounded-xl text-left text-amber-400 hover:bg-slate-900 transition font-bold"
              >
                Join as Driver Partner
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('rides')}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-amber-400 transition flex items-center justify-between"
              >
                <span>My Rides &amp; Invoices</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={handleContactClick}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-amber-400 transition"
              >
                24/7 Helpline
              </button>
            </nav>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="tel:+917710080992"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span>Call +91 77100 80992</span>
              </a>

              <a
                href={whatsappHref}
                onClick={(e) => triggerWhatsAppDeepLink(e)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
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
                  className="sm:col-span-2 w-full py-2.5 px-3 text-xs text-amber-400 font-bold bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Owner Control Dashboard</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
