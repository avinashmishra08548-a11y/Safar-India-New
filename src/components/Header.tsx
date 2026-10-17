import React, { useState } from 'react';
import { Car, Phone, MessageSquare, Clock, Shield, Menu, X, User } from 'lucide-react';
import { CustomerUser } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

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

  return (
    <header className="sticky top-0 z-[1000] bg-white border-b border-slate-200 p-0 m-0">
      {/* 1. Top Black Status Bar (height: 24px, #000000 bg, #ffffff centered 12px text) */}
      <div className="top-black-status-bar">
        SafarIndiaCabs
      </div>

      {/* 2. Main Header Directly Below Black Bar (Zero Unwanted White Gap) */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 h-14 sm:h-16">
          
          {/* BRAND LOGO: SAFAR.INDIA.CABS - TRAVEL SMART */}
          <button 
            onClick={() => handleNavClick('booking')}
            className="flex items-center gap-2 sm:gap-3 text-left transition-colors whitespace-nowrap shrink-0 group py-1"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Car className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div>
              <div className="font-black tracking-tight text-xs sm:text-lg text-slate-950 font-sans flex items-center leading-tight">
                <span>SAFAR</span>
                <span className="text-amber-500 mx-0.5 font-mono font-bold">.</span>
                <span>INDIA</span>
                <span className="text-amber-500 mx-0.5 font-mono font-bold">.</span>
                <span className="text-amber-500">CABS</span>
              </div>
              <div className="text-[8px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.25em] font-extrabold text-amber-600 uppercase">
                Travel Smart
              </div>
            </div>
          </button>

          {/* CLEAN & MINIMAL NAVIGATION */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-bold text-slate-700">
            <button
              onClick={() => handleNavClick('booking')}
              className={`hover:text-amber-600 transition-colors whitespace-nowrap ${
                activeNavTab === 'booking' ? 'text-amber-600 font-black' : ''
              }`}
            >
              Book Cab
            </button>

            <button
              onClick={() => handleNavClick('routes')}
              className={`hover:text-amber-600 transition-colors whitespace-nowrap ${
                activeNavTab === 'routes' ? 'text-amber-600 font-black' : ''
              }`}
            >
              Popular Routes
            </button>

            <button
              onClick={handlePartnerClick}
              className="hover:text-amber-600 transition-colors whitespace-nowrap text-slate-700 hover:underline decoration-amber-500/40 underline-offset-4"
            >
              Driver Partner
            </button>

            <button
              onClick={() => handleNavClick('rides')}
              className={`flex items-center gap-1.5 hover:text-amber-600 transition-colors whitespace-nowrap ${
                activeNavTab === 'rides' ? 'text-amber-600 font-black' : ''
              }`}
            >
              <Clock className="w-4 h-4 text-slate-400" />
              <span>My Rides</span>
            </button>

            <button
              onClick={handleContactClick}
              className="hover:text-amber-600 transition-colors whitespace-nowrap"
            >
              Contact Us
            </button>
          </nav>

          {/* TOP RIGHT ACTIONS: PWA INSTALL, WHATSAPP SUPPORT & DIRECT CALL */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* PWA Install Button - Always clearly visible without clipping */}
            <PWAInstallButton />

            {/* Quick WhatsApp Support Button */}
            <a
              href="https://wa.me/917710080992?text=Hello%20Safar%20India%20Cabs,%20I%20need%20assistance%20with%20cab%20booking"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm active:scale-95"
              title="Quick WhatsApp Booking & Support"
            >
              <MessageSquare className="w-3.5 h-3.5 text-white fill-current" />
              <span>WhatsApp Support</span>
            </a>

            {/* Direct Call Button (+91 7710080992) */}
            <a 
              href="tel:+917710080992" 
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition shadow-sm font-bold"
              title="24/7 Cab Helpline"
            >
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">+91 77100 80992</span>
              <span className="md:hidden">Call</span>
            </a>

            {/* User Profile or Login */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl">
                <div className="text-right">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight max-w-[60px] sm:max-w-none truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-amber-700 leading-tight font-mono font-semibold hidden sm:block">+91 {currentUser.phone}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="text-[10px] text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold px-1.5 sm:px-2 py-1 rounded-lg transition"
                  title="Logout"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl transition shadow-sm active:scale-95 whitespace-nowrap"
              >
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-950 shrink-0" />
                <span>Login</span>
              </button>
            )}

            {/* Owner Portal / Admin */}
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors shadow-sm"
                title="Owner & Dispatch Dashboard"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 shrink-0"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2 bg-white">
            
            {/* Customer Status in Mobile Menu */}
            <div className="pb-2 border-b border-slate-100">
              {currentUser ? (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-sm">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Logged In Customer</div>
                      <div className="text-xs font-extrabold text-slate-900">{currentUser.name}</div>
                      <div className="text-[11px] font-mono text-slate-600 font-semibold">+91 {currentUser.phone}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl transition shadow-sm"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <User className="w-4 h-4 text-slate-950" />
                  <span>Customer Login / Register with OTP</span>
                </button>
              )}
            </div>

            <nav className="flex flex-col space-y-1.5 text-sm font-bold text-slate-800">
              <button
                onClick={() => handleNavClick('booking')}
                className="px-3 py-2 rounded-xl text-left hover:bg-slate-100 hover:text-amber-600 transition"
              >
                Book Cab
              </button>
              <button
                onClick={() => handleNavClick('routes')}
                className="px-3 py-2 rounded-xl text-left hover:bg-slate-100 hover:text-amber-600 transition"
              >
                Popular Routes
              </button>
              <button
                onClick={handlePartnerClick}
                className="px-3 py-2 rounded-xl text-left text-amber-700 hover:bg-slate-100 transition font-bold"
              >
                Join as Driver / Vendor Partner
              </button>
              <button
                onClick={() => handleNavClick('rides')}
                className="px-3 py-2 rounded-xl text-left hover:bg-slate-100 hover:text-amber-600 transition"
              >
                My Rides & Invoices
              </button>
              <button
                onClick={handleContactClick}
                className="px-3 py-2 rounded-xl text-left hover:bg-slate-100 hover:text-amber-600 transition"
              >
                Contact 24/7 Helpline
              </button>
            </nav>

            <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
              <PWAInstallButton className="w-full justify-center py-2.5" />

              <a
                href="https://wa.me/917710080992?text=Hello%20Safar%20India%20Cabs,%20I%20need%20assistance"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Chat on WhatsApp (+91 77100 80992)</span>
              </a>

              {onOpenAdmin && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full py-2 px-3 text-xs text-amber-800 font-bold bg-amber-50 rounded-xl border border-amber-200"
                >
                  Open Owner Dashboard
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
