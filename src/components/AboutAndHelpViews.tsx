import React from 'react';
import {
  Car,
  ShieldCheck,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  Award,
  Users,
  Sparkles,
  HeadphonesIcon,
  ArrowRight,
  ExternalLink,
  FileText,
  HelpCircle,
  Navigation
} from 'lucide-react';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { CabBazarAdvantages } from './CabBazarAdvantages';
import { CustomerReviews } from './CustomerReviews';
import { FaqSection } from './FaqSection';

export const SAFAR_CONTACT_INFO = {
  phoneDisplay: '+91 77100 80992',
  phoneRaw: '7710080992',
  telHref: 'tel:+917710080992',
  whatsappRaw: '7710080992',
  email: 'safarindiacabs01@gmail.com',
  mailtoHref: 'mailto:safarindiacabs01@gmail.com',
  address: 'H NO 143 STREET NO 4 JHARODA MAJRA NORTH DELHI BURARI 110084',
  instagramUrl: 'https://www.instagram.com/safarindiacabs01?psln=ODd0bmttYnc3NGky',
  instagramHandle: '@safarindiacabs01',
  facebookUrl: 'https://www.facebook.com/share/1ETNJWXeo7/',
  facebookLabel: 'Safar India Cabs Official'
};

interface AboutSectionViewProps {
  onNavigateToBooking: () => void;
  onNavigateToRoutes: () => void;
  onOpenDriverPartner: () => void;
  focusedSectionId?: string;
}

export const AboutSectionView: React.FC<AboutSectionViewProps> = ({
  onNavigateToBooking,
  onNavigateToRoutes,
  onOpenDriverPartner,
  focusedSectionId
}) => {
  const companyStats = [
    { label: 'Indian Cities Covered', value: '150+', icon: MapPin },
    { label: 'Verified Chauffeurs', value: '2,500+', icon: Users },
    { label: 'Happy Outstation Trips', value: '50,000+', icon: Award },
    { label: 'Customer Support', value: '24/7 Live', icon: HeadphonesIcon }
  ];

  const coreFeatures = [
    {
      title: 'One-Way Zero Return Fare',
      desc: 'Pay strictly for one-way distance when traveling intercity. No return kilometer or return driver charges.',
      badge: 'Save up to 40%'
    },
    {
      title: 'Transparent Round-Trip Billing',
      desc: 'Standard 250 KM/day package with multi-city stop support, clear per-KM rates (Sedan ₹13, SUV ₹17, Innova ₹22), and zero hidden charges.',
      badge: 'Multi-Stop Ready'
    },
    {
      title: '20% Advance Instant Confirmation',
      desc: 'Confirm your cab immediately by paying just 20% advance via UPI (Google Pay, PhonePe, Paytm, BHIM) or Cards. Pay 80% directly to the driver.',
      badge: '100% Safe UPI'
    },
    {
      title: 'Verified Commercial Fleet & Drivers',
      desc: 'Clean, sanitized AC Sedans (Dzire/Etios), Ertiga SUVs, and Innova Crysta driven by police-verified highway chauffeurs.',
      badge: 'AITP Permitted'
    },
    {
      title: 'On-Time Doorstep Pickup',
      desc: 'Ghar, Hotel, Office ya Airport Terminal se exact time par pickup. Driver & vehicle details shared via WhatsApp & SMS.',
      badge: 'Punctual Service'
    },
    {
      title: 'Free Cancellation Policy',
      desc: 'Plans changed? Enjoy 100% free cancellation up to 6 hours before your scheduled pickup time with instant support.',
      badge: 'Zero Penalty'
    }
  ];

  const fleetSummary = [
    {
      category: 'AC Hatchback / Compact',
      models: 'WagonR, Celerio, Tiago',
      seats: '4 Seats · 2 Bags',
      oneWayRate: '₹11/km',
      roundTripRate: '₹11/km',
      idealFor: 'Budget solo & couple intercity travel'
    },
    {
      category: 'AC Comfort Sedan',
      models: 'Maruti Dzire, Toyota Etios, Aura',
      seats: '4 Seats · 3 Bags',
      oneWayRate: '₹13/km',
      roundTripRate: '₹13/km',
      idealFor: 'Most popular for families & business trips'
    },
    {
      category: 'AC Family SUV (6+1)',
      models: 'Maruti Ertiga, Mahindra Marazzo, Carens',
      seats: '6 Seats · 4 Bags',
      oneWayRate: '₹16/km',
      roundTripRate: '₹17/km',
      idealFor: 'Spacious group & hill station journeys'
    },
    {
      category: 'Premium Innova Crysta (6+1 / 7+1)',
      models: 'Toyota Innova Crysta',
      seats: '7 Seats · 5 Bags',
      oneWayRate: '₹20/km',
      roundTripRate: '₹22/km',
      idealFor: 'Executive long-distance highway comfort'
    }
  ];

  return (
    <div
      id="about-company-top"
      className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 sm:space-y-14 animate-in fade-in"
    >
      {/* Hero Banner Card */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white border border-slate-800 p-6 sm:p-10 shadow-xl">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-extrabold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>About Safar India Cabs · India’s Trusted Intercity Taxi Network</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Safe, Affordable &amp; Transparent Outstation Cabs Across{' '}
            <span className="text-amber-400">150+ Cities in India</span>
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Safar India Cabs is built with one simple promise: making outstation One-Way, Round-Trip, Local Hourly Rental, and Airport Transfer bookings completely stress-free, honest, and affordable for every Indian traveler and family.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNavigateToBooking}
              className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
            >
              <Car className="w-4 h-4 text-slate-950" />
              <span>Book a Cab Now</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
            <button
              type="button"
              onClick={onNavigateToRoutes}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-amber-400" />
              <span>View Popular Routes</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Key Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {companyStats.map((stat, idx) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-3.5"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-black text-slate-950 tabular-nums">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-500">
                  {stat.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Company Features & Guarantees */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
              Our Core Features
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 mt-0.5">
              Why Travelers Choose Safar India Cabs
            </h2>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>All India Tourist Permit (AITP) Verified</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coreFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-5 shadow-2xs transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-800 font-black text-xs flex items-center justify-center">
                    0{idx + 1}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Guaranteed on Every Booking</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fleet & Transparent Fare Structure Table */}
      <div
        id="fare-rules-section"
        className={`scroll-mt-24 bg-white border rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5 transition-all ${
          focusedSectionId === 'fare-rules-section'
            ? 'border-amber-400 ring-2 ring-amber-400/40'
            : 'border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
              Transparent Fare Rules &amp; Verified Fleet Rates
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-950">
              Official Per-KM Rates &amp; Outstation Billing Rules
            </h3>
          </div>
          <button
            type="button"
            onClick={onNavigateToBooking}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 self-start sm:self-auto transition cursor-pointer"
          >
            <Car className="w-4 h-4" />
            <span>Check Exact Route Fare</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {fleetSummary.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="text-xs font-black text-slate-950">{item.category}</div>
                <div className="text-[11px] font-semibold text-amber-700 mt-0.5">{item.models}</div>
                <div className="text-[11px] text-slate-500 mt-1">{item.seats}</div>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">One-Way:</span>
                  <span className="font-mono font-black text-slate-900">{item.oneWayRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Round-Trip:</span>
                  <span className="font-mono font-black text-emerald-700">{item.roundTripRate}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600">{item.idealFor}</p>
            </div>
          ))}
        </div>

        {/* Standard Fare Rules Summary Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-3.5 space-y-1">
            <div className="text-xs font-black text-slate-900">1. One-Way Trip Rule</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Chargeable strictly for one-way distance (min 130 KM). Zero return fare &amp; zero return driver charges.
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-3.5 space-y-1">
            <div className="text-xs font-black text-slate-900">2. Round-Trip 250 KM/Day Rule</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Minimum 250 KM/day billing package plus standard driver allowance (₹300/day Sedan/SUV, ₹400/day Innova) &amp; night charge (₹300/night).
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50/60 border border-blue-200/80 p-3.5 space-y-1">
            <div className="text-xs font-black text-slate-900">3. Tolls, State Tax &amp; Parking</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Highway FASTag tolls, state border entry tax, and parking fees are payable as per actual receipts unless pre-included.
            </p>
          </div>
        </div>
      </div>

      {/* Advantages & Reviews */}
      <CabBazarAdvantages />
      <CustomerReviews />

      {/* Driver Partner Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            Partner With Safar India Cabs
          </div>
          <h3 className="text-lg sm:text-xl font-black">
            Own a Commercial Sedan, Ertiga or Innova?
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            Attach your taxi with Safar India Cabs and get regular intercity one-way &amp; round-trip bookings across India.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDriverPartner}
          className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm shrink-0 transition active:scale-95 cursor-pointer"
        >
          Join as Driver Partner
        </button>
      </div>
    </div>
  );
};

interface HelpSupportViewProps {
  onNavigateToBooking: () => void;
  onNavigateToRides: () => void;
  onOpenLegalPolicy?: (tab: 'privacy' | 'terms' | 'refund' | 'contact' | 'delete-account') => void;
  focusedSectionId?: string;
}

export const HelpSupportView: React.FC<HelpSupportViewProps> = ({
  onNavigateToBooking,
  onNavigateToRides,
  onOpenLegalPolicy,
  focusedSectionId
}) => {
  const quickSupportTopics = [
    {
      title: 'Instant Cab Booking & Route Quote',
      desc: 'Get exact fare for One-Way, Round-Trip (Multi-City), Local or Airport cab on WhatsApp.',
      whatsappText: 'Hello Safar India Cabs, I need a cab fare quote for my upcoming trip.',
      actionLabel: 'Ask Quote on WhatsApp'
    },
    {
      title: 'Driver & Vehicle Assignment Status',
      desc: 'Need your chauffeur name, phone number or vehicle plate number for a confirmed booking?',
      whatsappText: 'Hello Safar India Cabs, please share driver and vehicle details for my booking.',
      actionLabel: 'Get Driver Status'
    },
    {
      title: 'Payment, UPI & GST Tax Invoice Help',
      desc: 'Assistance with 20% advance payment, UPI Intent (GPay/PhonePe/Paytm), or downloading GST invoice.',
      whatsappText: 'Hello Safar India Cabs, I need help regarding payment / GST invoice for my cab booking.',
      actionLabel: 'Payment / Invoice Help'
    },
    {
      title: 'Reschedule or Cancel Booking',
      desc: 'Free cancellation up to 6 hours before pickup time or instant date/time modification.',
      whatsappText: 'Hello Safar India Cabs, I want to reschedule / modify my cab booking.',
      actionLabel: 'Modify / Cancel Trip'
    }
  ];

  return (
    <div
      id="customer-support-top"
      className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 animate-in fade-in"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-9 border border-slate-800 shadow-xl">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>24×7 Live Dispatch &amp; Customer Support Desk</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            How Can We Help You Today?
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Reach our 24/7 customer support team directly via Call, WhatsApp, Email, Instagram, or Facebook for instant booking assistance, driver tracking, or billing queries.
          </p>
        </div>
      </div>

      {/* Direct Contact Channels Grid (Phone, WhatsApp, Email, Instagram, Facebook) */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
            Official Contact &amp; Social Channels
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-950 mt-0.5">
            Connect With Safar India Cabs
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Direct Call Helpline */}
          <a
            href={SAFAR_CONTACT_INFO.telHref}
            className="bg-white border-2 border-slate-200 hover:border-amber-400 rounded-2xl p-5 shadow-2xs transition flex items-start justify-between gap-4 group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block">
                  24/7 Calling Helpline
                </span>
                <div className="text-base sm:text-lg font-black text-slate-950 font-mono mt-0.5">
                  {SAFAR_CONTACT_INFO.phoneDisplay}
                </div>
                <span className="text-xs text-slate-500 font-medium mt-1 block">
                  Tap to call dispatch desk directly
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0 mt-1" />
          </a>

          {/* 2. WhatsApp Support */}
          <a
            href={buildWhatsAppSchemeUrl(SAFAR_CONTACT_INFO.whatsappRaw)}
            onClick={(e) => triggerWhatsAppDeepLink(e, SAFAR_CONTACT_INFO.whatsappRaw)}
            className="bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-2xl p-5 shadow-2xs transition flex items-start justify-between gap-4 group cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                <MessageSquare className="w-6 h-6 fill-current" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                  WhatsApp Support &amp; Booking
                </span>
                <div className="text-base sm:text-lg font-black text-slate-950 font-mono mt-0.5">
                  {SAFAR_CONTACT_INFO.phoneDisplay}
                </div>
                <span className="text-xs text-slate-500 font-medium mt-1 block">
                  Tap to chat on WhatsApp instantly
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0 mt-1" />
          </a>

          {/* 3. Email Support */}
          <a
            href={SAFAR_CONTACT_INFO.mailtoHref}
            className="bg-white border-2 border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-2xs transition flex items-start justify-between gap-4 group"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                <Mail className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                  Official Email Support
                </span>
                <div className="text-sm sm:text-base font-black text-slate-950 truncate mt-0.5">
                  {SAFAR_CONTACT_INFO.email}
                </div>
                <span className="text-xs text-slate-500 font-medium mt-1 block">
                  Tap to send email / invoice query
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1" />
          </a>

          {/* 4. Official Instagram */}
          <a
            href={SAFAR_CONTACT_INFO.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-white border-2 border-slate-200 hover:border-pink-400 rounded-2xl p-5 shadow-2xs transition flex items-start justify-between gap-4 group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0 group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:to-pink-600 group-hover:text-white transition">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-700 block">
                  Instagram Official
                </span>
                <div className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                  {SAFAR_CONTACT_INFO.instagramHandle}
                </div>
                <span className="text-xs text-slate-500 font-medium mt-1 block">
                  Follow trip updates &amp; fleet reels
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-pink-600 shrink-0 mt-1" />
          </a>

          {/* 5. Official Facebook */}
          <a
            href={SAFAR_CONTACT_INFO.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-5 shadow-2xs transition flex items-start justify-between gap-4 group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                  Facebook Official Page
                </span>
                <div className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                  {SAFAR_CONTACT_INFO.facebookLabel}
                </div>
                <span className="text-xs text-slate-500 font-medium mt-1 block">
                  Connect with us on Facebook
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 mt-1" />
          </a>

          {/* 6. My Bookings & Tax Invoices Quick Card */}
          <button
            type="button"
            onClick={onNavigateToRides}
            className="bg-amber-50/70 border-2 border-amber-200 hover:border-amber-400 rounded-2xl p-5 shadow-2xs transition flex items-start justify-between gap-4 group text-left cursor-pointer"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                  Self-Service Portal
                </span>
                <div className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                  My Rides &amp; GST Invoices
                </div>
                <span className="text-xs text-slate-600 font-medium mt-1 block">
                  View booking status &amp; download bill
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-700 shrink-0 mt-1" />
          </button>
        </div>

        {/* Official Registered Office Address & Legal Compliance Strip */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                Official Registered Business Address
              </span>
              <address className="not-italic text-sm sm:text-base font-black text-slate-950 mt-0.5">
                {SAFAR_CONTACT_INFO.address}
              </address>
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                Email: {SAFAR_CONTACT_INFO.email} · Customer Care: +91-7710080992
              </span>
            </div>
          </div>

          {onOpenLegalPolicy && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenLegalPolicy('privacy')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-amber-400 text-slate-800 hover:text-slate-950 font-extrabold text-xs transition cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onOpenLegalPolicy('terms')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-amber-400 text-slate-800 hover:text-slate-950 font-extrabold text-xs transition cursor-pointer"
              >
                Terms &amp; Conditions
              </button>
              <button
                type="button"
                onClick={() => onOpenLegalPolicy('refund')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-amber-400 text-slate-800 hover:text-slate-950 font-extrabold text-xs transition cursor-pointer"
              >
                Refund Policy
              </button>
              <button
                type="button"
                onClick={() => onOpenLegalPolicy('delete-account')}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-extrabold text-xs transition cursor-pointer"
              >
                Delete Account / Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 1-Tap Quick WhatsApp Help Topics */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <h3 className="text-base sm:text-lg font-black text-slate-950">
            Quick Topic-Wise Assistance (1-Tap WhatsApp)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickSupportTopics.map((topic, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3"
            >
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">{topic.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{topic.desc}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={buildWhatsAppSchemeUrl(SAFAR_CONTACT_INFO.whatsappRaw, topic.whatsappText)}
                  onClick={(e) =>
                    triggerWhatsAppDeepLink(e, SAFAR_CONTACT_INFO.whatsappRaw, topic.whatsappText)
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span>{topic.actionLabel}</span>
                </a>
                <a
                  href={SAFAR_CONTACT_INFO.telHref}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs inline-flex items-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Call Desk</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded FAQs & Billing Rules */}
      <div
        id="help-faqs-section"
        className={`scroll-mt-24 rounded-3xl transition-all ${
          focusedSectionId === 'help-faqs-section'
            ? 'bg-white p-4 sm:p-6 border border-amber-400 ring-2 ring-amber-400/40 shadow-xs'
            : ''
        }`}
      >
        <FaqSection />
      </div>

      {/* Bottom CTA */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onNavigateToBooking}
          className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm inline-flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
        >
          <Car className="w-4 h-4" />
          <span>Back to Cab Booking</span>
        </button>
      </div>
    </div>
  );
};
