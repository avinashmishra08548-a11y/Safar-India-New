import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Download,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { CustomerUser } from '../types';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { SAFAR_CONTACT_INFO } from './AboutAndHelpViews';
import { downloadProductionAab, downloadProductionApk } from '../utils/aabBinaryData';

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

const TAB_HEADER_META: Record<
  NavTabId,
  { badge: string; title: string; subtitle: string }
> = {
  booking: {
    badge: 'A1 Cab Services • All India Outstation & Local',
    title: 'Outstation & Local Cabs with Guaranteed Low Fares',
    subtitle: 'Verified AC Sedans, Ertiga SUV & Innova Crysta • Pay 20% Advance'
  },
  routes: {
    badge: '150+ Fixed-Fare Intercity Corridors',
    title: 'Popular One-Way & Outstation Highway Routes',
    subtitle: 'Instant fixed fares with zero return charges across North & Pan India'
  },
  rides: {
    badge: 'Verified Customer Portal & Billing',
    title: 'My Rides & Official GST Tax Invoices',
    subtitle: 'View complete past & upcoming trip details and download GST bills'
  },
  about: {
    badge: 'All India Tourist Permit (AITP) Fleet',
    title: 'About Safarindiacabs & Transparent Fare Rules',
    subtitle: 'Trusted highway chauffeurs, zero hidden charges & 24/7 trip support'
  },
  help: {
    badge: '24×7 Customer Care & Dispatch Desk',
    title: 'Help, Support Center & Legal Policies',
    subtitle: 'Instant assistance via Call (+91 7710080992), WhatsApp & Email'
  }
};

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

  // Close drawer on Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const handleNavClick = (tab: NavTabId) => {
    onNavigateTab(tab);
    setMobileMenuOpen(false);
  };

  const handlePartnerClick = () => {
    onOpenDriverPartner();
    setMobileMenuOpen(false);
  };

  const whatsappHref = buildWhatsAppSchemeUrl(SAFAR_CONTACT_INFO.whatsappRaw);
  const currentTabMeta = TAB_HEADER_META[activeNavTab] || TAB_HEADER_META.booking;

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
      label: 'Routes',
      mobileLabel: 'Popular Intercity Routes',
      subText: '150+ Fixed-Fare Highway Routes',
      icon: MapPin
    },
    {
      id: 'rides',
      label: 'My Rides',
      mobileLabel: 'My Rides & GST Invoices',
      subText: 'View Past Rides, Driver Info & GST Bills',
      icon: Clock
    },
    {
      id: 'about',
      label: 'About',
      mobileLabel: 'About Company & Fleet',
      subText: 'Why Choose Safarindiacabs & Fare Rules',
      icon: Info
    },
    {
      id: 'help',
      label: 'Help',
      mobileLabel: '24/7 Help & Support Center',
      subText: 'Call, WhatsApp, Email, FAQs & Policies',
      icon: HelpCircle
    }
  ];

  return (
    <>
      <header className="safar-dark-header shrink-0 z-[1000] bg-[#0B0F19] text-white border-b border-slate-800 shadow-md">
        {/* Top Row: Hamburger Menu + Brand Logo + Desktop Nav + Login / User Action */}
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 min-h-[60px] sm:min-h-[66px] py-1.5">
            {/* Zone 1: 3-Line Menu Button + Brand Lockup */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer ${
                  mobileMenuOpen
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-800/90 hover:bg-slate-800 text-white border-slate-700'
                }`}
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                title="Menu (All Sections & Owner Panel)"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 stroke-[2.5]" /> : <Menu className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('booking')}
                className="flex items-center gap-2.5 text-left transition-transform active:scale-98 whitespace-nowrap shrink-0 cursor-pointer py-1"
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

            {/* Zone 2: Desktop Navigation Links with Active Highlight */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold" aria-label="Main navigation">
              {navItems.map((item) => {
                const isActive = activeNavTab === item.id;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-h-[42px] px-4 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm ring-2 ring-amber-400/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <IconComp className={`w-4 h-4 ${isActive ? 'text-slate-950 stroke-[2.3]' : 'text-amber-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handlePartnerClick}
                className="min-h-[42px] px-3.5 py-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-slate-800/80 transition-colors whitespace-nowrap cursor-pointer"
              >
                Driver Partner
              </button>
            </nav>

            {/* Zone 3: Quick Helpline + Login/Account */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <a
                href={SAFAR_CONTACT_INFO.telHref}
                className="hidden sm:inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white transition"
                title="Call 24/7 Helpline"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono">77100 80992</span>
              </a>

              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleNavClick('rides')}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-3.5 py-2.5 rounded-xl transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                    title={`Logged in as ${currentUser.name} (+91 ${currentUser.phone})`}
                  >
                    <User className="w-4 h-4 text-slate-950 shrink-0" />
                    <span className="max-w-[84px] truncate">{currentUser.name.split(' ')[0]}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 p-2.5 transition active:scale-95 cursor-pointer"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 px-4 py-2.5 rounded-xl transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                >
                  <User className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Main Tab Title Line Strip (Remains Sticky at Top while Inner Content Scrolls) */}
        <div className="bg-gradient-to-r from-[#0F172A] via-[#131C31] to-[#0F172A] border-t border-slate-800/90 px-3.5 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-400 truncate">
                  {currentTabMeta.badge}
                </span>
              </div>
              <h1 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-tight truncate mt-0.5">
                {currentTabMeta.title}
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-300 font-medium">
                {currentTabMeta.subtitle}
              </span>
            </div>

            {activeNavTab !== 'booking' && (
              <button
                type="button"
                onClick={() => handleNavClick('booking')}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/30 font-extrabold text-xs transition shrink-0 cursor-pointer"
              >
                Book Cab →
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Bounded 3-Line Sidebar Drawer (Fixed Height, No Infinite Overflow Past Bottom) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-slate-950/75 backdrop-blur-xs flex justify-start animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setMobileMenuOpen(false);
            }
          }}
        >
          <aside
            aria-label="Sidebar navigation drawer"
            className="w-[88vw] max-w-[360px] h-[100dvh] max-h-[100dvh] bg-[#0B0F19] text-white border-r border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-200"
          >
            {/* 1. Fixed Drawer Top Header */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800 bg-[#080C14] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/logo-96.webp"
                  alt="Safarindiacabs Logo"
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shrink-0"
                />
                <div>
                  <div className="font-black text-base leading-none">
                    <span className="text-white">Safar</span>
                    <span className="text-amber-400">india</span>
                    <span className="text-white">cabs</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Official Mobile Menu
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-200 hover:text-rose-300 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Bounded Scrollable Drawer Body (Scrolls Only Up to Last Item) */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
              {/* Customer Account Strip */}
              <div>
                {currentUser ? (
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shrink-0">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-white flex items-center gap-1.5 truncate">
                          <span className="truncate">{currentUser.name}</span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
                      className="min-h-[40px] px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
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
                    className="w-full min-h-[48px] py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition active:scale-98"
                  >
                    <User className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>Customer Mobile OTP Login</span>
                  </button>
                )}
              </div>

              {/* All Main Sections with Active State Highlight */}
              <div className="space-y-2">
                <div className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Dedicated App Sections
                </div>
                <nav className="space-y-2" aria-label="Drawer sections">
                  {navItems.map((item) => {
                    const isActive = activeNavTab === item.id;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full min-h-[56px] p-3 rounded-2xl text-left transition flex items-center justify-between gap-3 cursor-pointer border ${
                          isActive
                            ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-slate-900/90 hover:bg-slate-900 text-white border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-amber-400'
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black truncate">{item.mobileLabel}</div>
                            <div
                              className={`text-[11px] truncate mt-0.5 ${
                                isActive ? 'text-slate-800 font-semibold' : 'text-slate-400'
                              }`}
                            >
                              {item.subText}
                            </div>
                          </div>
                        </div>
                        {isActive ? (
                          <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-950 text-amber-400 shrink-0">
                            Active
                          </span>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {/* Driver Partner Option */}
                  <button
                    type="button"
                    onClick={handlePartnerClick}
                    className="w-full min-h-[56px] p-3 rounded-2xl text-left bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-800 transition flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-amber-400 truncate">
                          Join as Driver / Vendor Partner
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          Attach Commercial Sedan, Ertiga or Innova
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                </nav>
              </div>

              {/* Direct Help, Email & Social Media Inside 3-Line Menu */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <div className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  24/7 Helpline &amp; Official Socials
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={SAFAR_CONTACT_INFO.telHref}
                    className="min-h-[44px] py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Call Helpline</span>
                  </a>

                  <a
                    href={whatsappHref}
                    onClick={(e) => triggerWhatsAppDeepLink(e, SAFAR_CONTACT_INFO.whatsappRaw)}
                    className="min-h-[44px] py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={SAFAR_CONTACT_INFO.mailtoHref}
                    className="col-span-2 min-h-[44px] py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 truncate"
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
                    className="min-h-[42px] py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-pink-500/30 text-pink-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <span>Instagram</span>
                  </a>
                  <a
                    href={SAFAR_CONTACT_INFO.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[42px] py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-blue-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <span>Facebook</span>
                  </a>
                </div>
              </div>

              {/* Legal Policies & Play Store Data Safety Links */}
              {onOpenLegalPolicy && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Legal Policies &amp; Data Safety
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenLegalPolicy('privacy');
                      }}
                      className="min-h-[42px] py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl text-center cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenLegalPolicy('terms');
                      }}
                      className="min-h-[42px] py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl text-center cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenLegalPolicy('refund');
                      }}
                      className="min-h-[42px] py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl text-center cursor-pointer"
                    >
                      Refund Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenLegalPolicy('contact');
                      }}
                      className="min-h-[42px] py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl text-center cursor-pointer"
                    >
                      Contact &amp; Address
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenLegalPolicy('delete-account');
                      }}
                      className="col-span-2 min-h-[42px] py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl text-center cursor-pointer"
                    >
                      Delete Account / Personal Data
                    </button>
                  </div>
                </div>
              )}

              {/* App Bundle (.AAB / .APK) & Owner Control Panel */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Play Console Release &amp; Administration
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={downloadProductionAab}
                    className="min-h-[42px] py-2 px-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>Download .AAB</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadProductionApk}
                    className="min-h-[42px] py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" />
                    <span>Download .APK</span>
                  </button>
                </div>

                {onOpenAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="w-full min-h-[46px] py-2.5 px-4 text-xs text-amber-400 font-extrabold bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Owner Control Panel (PIN Protected)</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Anchored Drawer Bottom Footer (Prevents Infinite Scroll Past Last Option) */}
            <div className="shrink-0 px-4 py-3 border-t border-slate-800 bg-[#070A12] flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Safarindiacabs v1.0.3</span>
              <span className="font-mono text-amber-400">+91-7710080992</span>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
