import React, { useState } from 'react';
import {
  Car,
  Phone,
  MessageSquare,
  Clock,
  Shield,
  Menu,
  X,
  User,
  MapPin,
  Info,
  HelpCircle,
  Mail,
  Users,
  CheckCircle2
} from 'lucide-react';
import { CustomerUser } from '../types';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { SAFAR_CONTACT_INFO } from './AboutAndHelpViews';

export type NavTabId = 'booking' | 'routes' | 'rides' | 'about' | 'help';

interface HeaderProps {
  currentUser: CustomerUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onNavigateTab: (tab: NavTabId) => void;
  activeNavTab: NavTabId;
  onOpenAdmin?: () => void;
  onOpenDriverPartner: () => void;
  onOpenLegalPolicy?: (tab: 'privacy' | 'terms' | 'refund' | 'contact' | 'delete-account') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  onNavigateTab,
  activeNavTab,
  onOpenAdmin,
  onOpenDriverPartner,
  onOpenLegalPolicy
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: NavTabId) => {
    onNavigateTab(tab);
    setMobileMenuOpen(false);
  };

  const handlePartnerClick = () => {
    onOpenDriverPartner();
    setMobileMenuOpen(false);
  };

  const whatsappHref = buildWhatsAppSchemeUrl(SAFAR_CONTACT_INFO.whatsappRaw);

  const navItems: Array<{
    id: NavTabId;
    label: string;
    mobileLabel: string;
    subText: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'booking',
      label: 'Book Cab',
      mobileLabel: 'Book Outstation / Local Cab',
      subText: 'One-Way, Round Trip, Local & Airport',
      icon: Car
    },
    {
      id: 'routes',
      label: 'Popular Routes',
      mobileLabel: 'Popular Intercity Routes',
      subText: '150+ Fixed-Fare Highway Routes',
      icon: MapPin
    },
    {
      id: 'rides',
      label: 'My Rides',
      mobileLabel: 'My Rides & GST Invoices',
      subText: 'View Bookings, Driver Info & Bills',
      icon: Clock
    },
    {
      id: 'about',
      label: 'About Us',
      mobileLabel: 'About Company & Features',
      subText: 'Why Choose Safar India Cabs & Fleet Rates',
      icon: Info
    },
    {
      id: 'help',
      label: 'Help & Contact',
      mobileLabel: '24/7 Help & Support Center',
      subText: 'Call, WhatsApp, Email, Instagram & FAQs',
      icon: HelpCircle
    }
  ];

  return (
    <header className="safar-dark-header sticky top-0 z-[1000] bg-[#0B0F19] text-white border-b border-slate-800/80 shadow-md">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 min-h-[62px] sm:min-h-[70px]">
          {/* Zone 1: 3-Line Menu Button + Brand Lockup */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer ${
                mobileMenuOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-400'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-white border-slate-700'
              }`}
              aria-label="Open menu"
              title="Menu (All Sections & Owner Panel)"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('booking')}
              className="flex items-center gap-2.5 text-left transition-transform active:scale-98 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <img
                src="/assets/aistudio/logo-96.webp"
                alt="Safarindiacabs Logo"
                width={40}
                height={40}
                decoding="async"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white p-0.5 shrink-0"
              />
              <div>
                <span className="font-black tracking-tight text-base sm:text-xl leading-none block">
                  <span className="text-white">Safar</span>
                  <span className="text-amber-400">india</span>
                  <span className="text-white">cabs</span>
                </span>
                <span className="text-[10px] font-bold text-slate-300 tracking-wider uppercase block mt-0.5">
                  A1 Cab Services • N. India
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Clean Desktop Navigation Links with Active Highlight */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold">
            {navItems.map((item) => {
              const isActive = activeNavTab === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handlePartnerClick}
              className="px-3.5 py-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-slate-800/80 transition-colors whitespace-nowrap cursor-pointer"
            >
              Driver Partner
            </button>
          </nav>

          {/* Zone 3: Quick Helpline + Login/Account */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <a
              href={SAFAR_CONTACT_INFO.telHref}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white transition"
              title="Call 24/7 Helpline"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono">77100 80992</span>
            </a>

            {currentUser ? (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 px-3.5 py-2 rounded-xl transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                title={`Logged in as ${currentUser.name} — Tap to Logout`}
              >
                <User className="w-4 h-4 text-slate-950 shrink-0" />
                <span className="max-w-[78px] truncate">{currentUser.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-500 px-3.5 py-2 rounded-xl transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>

        {/* 3-Line Navigation Drawer (Includes All App Sections, Contact Channels, Socials & Owner Panel) */}
        {mobileMenuOpen && (
          <div className="py-4 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 bg-[#0B0F19] text-white max-h-[84vh] overflow-y-auto">
            {/* Customer Account Strip */}
            <div className="pb-3 border-b border-slate-800">
              {currentUser ? (
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <span>{currentUser.name}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-[11px] font-mono text-slate-300">+91 {currentUser.phone}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="px-3 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl transition cursor-pointer"
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
                  className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-950" />
                  <span>Customer WhatsApp OTP Login</span>
                </button>
              )}
            </div>

            {/* All Main Sections with Active State Highlight */}
            <div className="space-y-1.5">
              <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                App Sections
              </div>
              <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {navItems.map((item) => {
                  const isActive = activeNavTab === item.id;
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`p-3 rounded-2xl text-left transition flex items-center justify-between gap-3 cursor-pointer border ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-900/80 hover:bg-slate-900 text-white border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-amber-400'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">{item.mobileLabel}</div>
                          <div
                            className={`text-[10px] truncate mt-0.5 ${
                              isActive ? 'text-slate-800 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            {item.subText}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 shrink-0">
                          Open
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Driver Partner Option */}
                <button
                  type="button"
                  onClick={handlePartnerClick}
                  className="p-3 rounded-2xl text-left bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-800 transition flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-amber-400 truncate">
                        Join as Driver / Vendor Partner
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        Attach Commercial Sedan, Ertiga or Innova
                      </div>
                    </div>
                  </div>
                </button>
              </nav>
            </div>

            {/* Direct Help, Email & Social Media Inside 3-Line Menu */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                24/7 Helpline &amp; Official Socials
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <a
                  href={SAFAR_CONTACT_INFO.telHref}
                  className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Call 7710080992</span>
                </a>

                <a
                  href={whatsappHref}
                  onClick={(e) => triggerWhatsAppDeepLink(e, SAFAR_CONTACT_INFO.whatsappRaw)}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>WhatsApp Chat</span>
                </a>

                <a
                  href={SAFAR_CONTACT_INFO.mailtoHref}
                  className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 truncate"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{SAFAR_CONTACT_INFO.email}</span>
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={SAFAR_CONTACT_INFO.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-pink-500/30 text-pink-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  <span>Instagram @safarindiacabs01</span>
                </a>
                <a
                  href={SAFAR_CONTACT_INFO.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  <span>Facebook Official Page</span>
                </a>
              </div>
            </div>

            {/* Legal Policies & Play Store Data Safety Links Inside 3-Line Menu */}
            {onOpenLegalPolicy && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Legal Policies &amp; Play Store Data Safety
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLegalPolicy('privacy');
                    }}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl text-center cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLegalPolicy('terms');
                    }}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl text-center cursor-pointer"
                  >
                    Terms &amp; Conditions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLegalPolicy('refund');
                    }}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl text-center cursor-pointer"
                  >
                    Refund Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLegalPolicy('contact');
                    }}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl text-center cursor-pointer"
                  >
                    Contact &amp; Address
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenLegalPolicy('delete-account');
                    }}
                    className="col-span-2 sm:col-span-1 py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl text-center cursor-pointer"
                  >
                    Delete Account / Data
                  </button>
                </div>
              </div>
            )}

            {/* Owner Control Dashboard (Exclusively in 3-Line Menu, Removed from Footer) */}
            {onOpenAdmin && (
              <div className="pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full py-2.5 px-4 text-xs text-amber-400 font-extrabold bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-700/90 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Owner Control Panel (PIN Protected)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
