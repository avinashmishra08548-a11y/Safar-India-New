import React, { useState, useEffect } from 'react';
import { Car, Phone, MessageSquare, Clock, Shield, Menu, X, User } from 'lucide-react';
import { CustomerUser } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { checkIsStandaloneOrApp } from '../hooks/usePWAInstall';

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
  const [isStandaloneApp, setIsStandaloneApp] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      checkIsStandaloneOrApp() ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });

  useEffect(() => {
    const updateStandalone = () => {
      setIsStandaloneApp(
        checkIsStandaloneOrApp() ||
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true
      );
    };
    updateStandalone();
    const mq = window.matchMedia('(display-mode: standalone)');
    if (mq.addEventListener) {
      mq.addEventListener('change', updateStandalone);
      return () => mq.removeEventListener('change', updateStandalone);
    }
  }, []);

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

  return (
    <header className="safar-dark-header sticky top-0 z-[1000] bg-[#0B0B0E] text-white border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-h-[54px] sm:min-h-[62px]">
          
          {/* BRAND LOGO: SafarIndiaCabs - A1 Cab Services N.India */}
          <button 
            type="button"
            onClick={() => handleNavClick('booking')}
            className="flex items-center gap-2.5 sm:gap-3 text-left transition-transform active:scale-98 whitespace-nowrap shrink-0 group py-1"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FFCC00] text-slate-950 flex flex-col items-center justify-center shadow-md shrink-0">
              <div className="w-2.5 h-1 bg-slate-950 rounded-t-xs -mb-0.5" />
              <Car className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 stroke-[2.4]" />
            </div>
            <div className="leading-tight">
              <div className="font-black tracking-tight text-[17px] sm:text-xl font-sans flex items-center">
                <span className="text-white">SafarIndia</span>
                <span className="text-[#FFCC00]">Cabs</span>
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-slate-200 tracking-normal">
                A1 Cab Services N.India
              </div>
            </div>
          </button>

          {/* DESKTOP NAVIGATION LINKS */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-slate-200">
            <button
              type="button"
              onClick={() => handleNavClick('booking')}
              className={`hover:text-[#FFCC00] transition-colors whitespace-nowrap ${
                activeNavTab === 'booking' ? 'text-[#FFCC00] font-black' : ''
              }`}
            >
              Book Cab
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('routes')}
              className={`hover:text-[#FFCC00] transition-colors whitespace-nowrap ${
                activeNavTab === 'routes' ? 'text-[#FFCC00] font-black' : ''
              }`}
            >
              Popular Routes
            </button>

            <button
              type="button"
              onClick={handlePartnerClick}
              className="hover:text-[#FFCC00] transition-colors whitespace-nowrap text-slate-200"
            >
              Driver Partner
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('rides')}
              className={`flex items-center gap-1.5 hover:text-[#FFCC00] transition-colors whitespace-nowrap ${
                activeNavTab === 'rides' ? 'text-[#FFCC00] font-black' : ''
              }`}
            >
              <Clock className="w-4 h-4 text-[#FFCC00]" />
              <span>My Rides</span>
            </button>

            <button
              type="button"
              onClick={handleContactClick}
              className="hover:text-[#FFCC00] transition-colors whitespace-nowrap"
            >
              Contact Us
            </button>
          </nav>

          {/* RIGHT ACTIONS: Install App Pill + Login Pill + White Circle Hamburger Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* 1. Yellow Pill: Install App (Hidden in Standalone PWA / Android WebView) */}
            {!isStandaloneApp && <PWAInstallButton />}

            {/* 2. Yellow Pill: Login or Active Customer */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-[#FFCC00] text-slate-950 px-3 py-1.5 sm:py-2 rounded-full shadow-sm">
                <User className="w-3.5 h-3.5 text-slate-950 stroke-[2.5] shrink-0" />
                <span className="text-[11px] sm:text-xs font-extrabold max-w-[64px] sm:max-w-[110px] truncate">
                  {currentUser.name.split(' ')[0]}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-0.5 text-[10px] bg-slate-950 text-white hover:bg-slate-800 font-bold px-2 py-0.5 rounded-full transition"
                  title="Logout"
                >
                  Exit
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-slate-950 bg-[#FFCC00] hover:bg-[#f5c400] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition shadow-sm active:scale-95 whitespace-nowrap shrink-0"
              >
                <User className="w-3.5 h-3.5 text-slate-950 stroke-[2.5] shrink-0" />
                <span>Login</span>
              </button>
            )}

            {/* Desktop Owner Portal Button */}
            {onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#FFCC00] bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-full transition-colors"
                title="Owner & Dispatch Dashboard"
              >
                <Shield className="w-3.5 h-3.5 text-[#FFCC00]" />
                <span>Owner</span>
              </button>
            )}

            {/* 3. White Circular Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-slate-100 text-slate-950 flex items-center justify-center shadow-md transition active:scale-95 shrink-0"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5 stroke-[2.5]" />}
            </button>

          </div>

        </div>

        {/* Dropdown Navigation Drawer (Works on Mobile & Desktop when Hamburger is clicked) */}
        {mobileMenuOpen && (
          <div className="py-4 border-t border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 bg-[#0B0B0E] text-white">
            
            {/* Customer Status in Menu */}
            <div className="pb-2 border-b border-slate-800">
              {currentUser ? (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FFCC00] text-slate-950 font-black flex items-center justify-center text-sm shadow-sm">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[10px] text-[#FFCC00] font-bold uppercase tracking-wider">Logged In Customer</div>
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
                  className="w-full py-2.5 px-4 bg-[#FFCC00] hover:bg-[#f5c400] text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
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
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-[#FFCC00] transition flex items-center justify-between"
              >
                <span>Book Outstation / Local Cab</span>
                <Car className="w-4 h-4 text-[#FFCC00]" />
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('routes')}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-[#FFCC00] transition"
              >
                Popular Intercity Routes
              </button>
              <button
                type="button"
                onClick={handlePartnerClick}
                className="px-3 py-2.5 rounded-xl text-left text-[#FFCC00] hover:bg-slate-900 transition font-bold"
              >
                Join as Driver / Vendor Partner
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('rides')}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-[#FFCC00] transition flex items-center justify-between"
              >
                <span>My Rides & Tax Invoices</span>
                <Clock className="w-4 h-4 text-slate-400" />
              </button>
              <button
                type="button"
                onClick={handleContactClick}
                className="px-3 py-2.5 rounded-xl text-left hover:bg-slate-900 hover:text-[#FFCC00] transition"
              >
                Contact 24/7 Helpline
              </button>
            </nav>

            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href="tel:+917710080992"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-[#FFCC00]" />
                <span>Call +91 77100 80992</span>
              </a>

              <a
                href="https://wa.me/917710080992?text=Hello%20Safar%20India%20Cabs,%20I%20need%20assistance"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
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
                  className="sm:col-span-2 w-full py-2.5 px-3 text-xs text-[#FFCC00] font-bold bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-4 h-4 text-[#FFCC00]" />
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
