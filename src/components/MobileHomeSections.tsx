import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  FileText,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  Plane,
  Repeat,
  ShieldCheck,
  User,
  Users
} from 'lucide-react';
import { BookingRecord, CabVehicle, CustomerUser, TripType } from '../types';
import { buildDynamicFleetList } from '../data/cabsFleet';
import { POPULAR_ROUTES, PopularRouteDeal } from '../data/indianCities';
import {
  computeTripFare,
  FareCalculationResult,
  formatINR
} from '../utils/fareCalculator';
import { getAdminPricingConfigSync } from '../utils/olaMapsService';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { SAFAR_CONTACT_INFO } from './AboutAndHelpViews';

interface HomeTopContextBarProps {
  currentUser: CustomerUser | null;
  activeTripsCount: number;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onOpenRides: () => void;
  onOpenDriverPartner: () => void;
}

export const HomeTopContextBar: React.FC<HomeTopContextBarProps> = ({
  currentUser,
  activeTripsCount,
  onOpenLogin,
  onOpenProfile,
  onOpenRides,
  onOpenDriverPartner
}) => {
  return (
    <div className="bg-white border border-slate-200/85 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-2xs">
      <button
        type="button"
        onClick={currentUser ? onOpenProfile : onOpenLogin}
        className="flex items-center gap-3 min-w-0 text-left cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 font-extrabold text-sm flex items-center justify-center shrink-0">
          {currentUser ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate group-hover:text-amber-700 transition-colors">
            {currentUser ? `Hello, ${currentUser.name.split(' ')[0]}` : 'Sign in for instant booking'}
          </div>
          <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
            {currentUser ? (
              <>
                <span className="font-mono tabular-nums">+91 {currentUser.phone}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-semibold">Verified</span>
              </>
            ) : (
              <span>OTP login · Saved rides · GST bills</span>
            )}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {activeTripsCount > 0 ? (
          <button
            type="button"
            onClick={onOpenRides}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs transition cursor-pointer whitespace-nowrap"
          >
            {activeTripsCount} Active {activeTripsCount === 1 ? 'Ride' : 'Rides'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenDriverPartner}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Attach Cab</span>
          </button>
        )}
      </div>
    </div>
  );
};

interface ActiveRideDutyBannerProps {
  booking: BookingRecord;
  onTrackLive: (booking: BookingRecord) => void;
  onViewReceipt: (booking: BookingRecord) => void;
  onViewAllRides: () => void;
}

export const ActiveRideDutyBanner: React.FC<ActiveRideDutyBannerProps> = ({
  booking,
  onTrackLive,
  onViewReceipt,
  onViewAllRides
}) => {
  const statusLabel = booking.driverName
    ? 'Driver Allotted'
    : booking.status === 'confirmed'
    ? 'Booking Confirmed'
    : 'Dispatch Pending';

  const driverPhoneClean = (booking.driverPhone || '').replace(/\D/g, '');
  const callHref = driverPhoneClean.length >= 10 ? `tel:+91${driverPhoneClean.slice(-10)}` : SAFAR_CONTACT_INFO.telHref;

  return (
    <section
      aria-label="Active ride and duty details"
      className="bg-[#0B1324] text-white rounded-3xl p-4 sm:p-5 shadow-md border border-slate-800 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusLabel}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="font-mono text-slate-300">{booking.id}</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight mt-1 truncate">
            {booking.pickupCity.split(',')[0]} → {booking.dropCity.split(',')[0]}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>{booking.pickupDate}</span>
            <span aria-hidden="true">·</span>
            <span>{booking.pickupTime}</span>
            <span aria-hidden="true">·</span>
            <span>{booking.cabName}</span>
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] text-slate-400 font-medium">Total Fare</div>
          <div className="text-base sm:text-lg font-extrabold text-amber-400 font-mono tabular-nums">
            {formatINR(booking.totalFare)}
          </div>
          <div className="text-[11px] text-slate-300 font-mono tabular-nums">
            Due {formatINR(booking.balanceDue)}
          </div>
        </div>
      </div>

      {/* Assigned Driver / Duty Strip */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 font-medium">Assigned Chauffeur &amp; Vehicle</div>
          {booking.driverName ? (
            <div className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
              {booking.driverName}
              {booking.driverVehicleNo ? ` · ${booking.driverVehicleNo}` : ''}
            </div>
          ) : (
            <div className="text-xs font-semibold text-amber-300 mt-0.5">
              Chauffeur details will be shared on WhatsApp 2–4 hrs before pickup
            </div>
          )}
        </div>
        <a
          href={callHref}
          className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
        >
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>{booking.driverPhone ? 'Call Driver' : 'Call Desk'}</span>
        </a>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onTrackLive(booking)}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5 shrink-0" />
          <span>Track Trip</span>
        </button>
        <button
          type="button"
          onClick={() => onViewReceipt(booking)}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Receipt</span>
        </button>
        <button
          type="button"
          onClick={onViewAllRides}
          className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
        >
          <span>All Rides</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>
    </section>
  );
};

interface QuickServiceGridProps {
  tripType: TripType;
  onSelectMode: (mode: TripType) => void;
}

export const QuickServiceGrid: React.FC<QuickServiceGridProps> = ({ tripType, onSelectMode }) => {
  const services: Array<{
    id: TripType;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'oneway', title: 'One-Way', subtitle: 'Zero return fare', icon: Navigation },
    { id: 'roundtrip', title: 'Round Trip', subtitle: 'Multi-city & return', icon: Repeat },
    { id: 'local', title: 'Local Rental', subtitle: '4h / 8h / 12h city', icon: Car },
    { id: 'airport', title: 'Airport Cab', subtitle: 'Pickup & drop 24×7', icon: Plane }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {services.map((svc) => {
        const IconComp = svc.icon;
        const isActive =
          tripType === svc.id ||
          (svc.id === 'roundtrip' && (tripType === 'multiday' || tripType === 'custom'));
        return (
          <button
            key={svc.id}
            type="button"
            onClick={() => onSelectMode(svc.id)}
            className={`min-h-[68px] p-3.5 rounded-2xl text-left transition-all cursor-pointer border flex items-center gap-3 active:scale-[0.98] ${
              isActive
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-900 border-slate-200/85 hover:border-amber-400'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-50 text-amber-700'
              }`}
            >
              <IconComp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold leading-tight truncate">{svc.title}</div>
              <div
                className={`text-[11px] mt-0.5 truncate ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {svc.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

interface HomeFleetPreviewStripProps {
  tripType: TripType;
  pickupCity: string;
  dropCity: string;
  distanceKm: number;
  tripDays: number;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  localPackageId: string;
  routeRequiresManualQuote: boolean;
  onSelectCab: (cab: CabVehicle, fare: FareCalculationResult) => void;
  onExploreAllCabs: () => void;
}

export const HomeFleetPreviewStrip: React.FC<HomeFleetPreviewStripProps> = ({
  tripType,
  pickupCity,
  dropCity,
  distanceKm,
  tripDays,
  pickupDate,
  pickupTime,
  returnDate,
  localPackageId,
  routeRequiresManualQuote,
  onSelectCab,
  onExploreAllCabs
}) => {
  const [pricingRevision, setPricingRevision] = useState(0);

  useEffect(() => {
    const handlePricingUpdated = () => setPricingRevision((r) => r + 1);
    window.addEventListener('safar_pricing_config_updated', handlePricingUpdated);
    return () => window.removeEventListener('safar_pricing_config_updated', handlePricingUpdated);
  }, []);

  const featuredCabs = useMemo(() => {
    const adminCfg = getAdminPricingConfigSync();
    const allCabs = buildDynamicFleetList(adminCfg);
    const preferredIds = ['hatchback', 'dzire', 'ertiga', 'innova_crysta'];
    const picked = preferredIds
      .map((id) => allCabs.find((c) => c.id === id))
      .filter((c): c is CabVehicle => Boolean(c));
    return picked.length >= 3 ? picked : allCabs.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingRevision]);

  const fareMap = useMemo(() => {
    return featuredCabs.map((cab) => {
      const fare = computeTripFare({
        tripType,
        cabId: cab.id,
        distanceKm: Math.max(distanceKm || 150, 40),
        pickupCity,
        dropCity,
        days: tripDays,
        pickupDate,
        pickupTime,
        returnDate: tripType === 'roundtrip' || tripType === 'multiday' ? returnDate : undefined,
        localPackageId,
        includeTolls: false,
        routeVerified: !routeRequiresManualQuote
      });
      return { cab, fare };
    });
  }, [
    featuredCabs,
    tripType,
    distanceKm,
    pickupCity,
    dropCity,
    tripDays,
    pickupDate,
    pickupTime,
    returnDate,
    localPackageId,
    routeRequiresManualQuote
  ]);

  const routeCaption =
    tripType === 'local'
      ? `${pickupCity.split(',')[0] || 'City'} Local Rental`
      : `${pickupCity.split(',')[0] || 'Pickup'} → ${dropCity.split(',')[0] || 'Drop'}`;

  return (
    <section className="space-y-3" aria-label="Popular cab categories and instant fares">
      <div className="flex items-end justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            Instant Fleet Fares
          </h2>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {routeCaption} · Toll &amp; Parking extra as per actuals
          </p>
        </div>
        <button
          type="button"
          onClick={onExploreAllCabs}
          className="text-xs font-bold text-amber-700 hover:text-amber-800 whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer"
        >
          <span>Compare All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex lg:grid lg:grid-cols-4 gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-mandatory">
        {fareMap.map(({ cab, fare }) => (
          <div
            key={cab.id}
            className="snap-start shrink-0 w-[238px] lg:w-auto bg-white border border-slate-200/85 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs hover:border-amber-400 transition-colors"
          >
            <div>
              <div className="relative h-28 w-full bg-slate-100 overflow-hidden">
                <img
                  src={cab.image}
                  alt={cab.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 text-[11px] font-semibold text-white/95 truncate">
                  {cab.capacityPassengers} Seats · {cab.capacityLuggage} Bags · AC
                </div>
              </div>

              <div className="p-3.5 space-y-1">
                <div className="text-sm font-extrabold text-slate-900 leading-snug truncate">
                  {cab.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {cab.models}
                </div>
              </div>
            </div>

            <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {routeRequiresManualQuote ? 'Starts at' : 'Est. Total'}
                </div>
                <div className="text-base font-extrabold text-slate-950 font-mono tabular-nums">
                  {routeRequiresManualQuote ? formatINR(cab.minFare ?? 1299) : formatINR(fare.totalFare)}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  routeRequiresManualQuote ? onExploreAllCabs() : onSelectCab(cab, fare)
                }
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-amber-400 text-amber-400 hover:text-slate-950 font-bold text-xs transition cursor-pointer whitespace-nowrap"
              >
                Book →
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

interface QuickWhatsAppConciergeCardProps {
  tripType: TripType;
  pickupCity: string;
  dropCity: string;
  pickupDate: string;
  pickupTime: string;
}

export const QuickWhatsAppConciergeCard: React.FC<QuickWhatsAppConciergeCardProps> = ({
  tripType,
  pickupCity,
  dropCity,
  pickupDate,
  pickupTime
}) => {
  const prefilledMessage =
    tripType === 'local'
      ? `Hi SafarIndiaCabs, I want to book a Local Rental cab in ${pickupCity || 'my city'} on ${pickupDate || 'today'} (${pickupTime || 'flexible time'}). Please share the best fare.`
      : `Hi SafarIndiaCabs, I want to book a ${tripType.toUpperCase()} cab from ${pickupCity || 'Pickup'} to ${dropCity || 'Destination'} on ${pickupDate || 'upcoming date'} at ${pickupTime || 'preferred time'}. Please share cab availability & fare.`;

  const whatsappUrl = buildWhatsAppSchemeUrl(prefilledMessage);

  return (
    <section
      aria-label="Quick WhatsApp Booking and 24/7 Dispatch"
      className="bg-white border border-slate-200/85 rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="space-y-1 min-w-0">
        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span>24×7 Live Dispatch Concierge</span>
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
          Prefer Quick WhatsApp Booking?
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Send your route in 1 tap for instant fare quotes, custom multi-city tours, or urgent cab dispatch.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:flex items-center gap-2.5 shrink-0">
        <a
          href={whatsappUrl}
          onClick={(e) => triggerWhatsAppDeepLink(e, prefilledMessage)}
          className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer whitespace-nowrap shadow-xs"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>WhatsApp Book</span>
        </a>
        <a
          href={SAFAR_CONTACT_INFO.telHref}
          className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition whitespace-nowrap"
        >
          <Phone className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Call 24×7</span>
        </a>
      </div>
    </section>
  );
};

interface HomeRoutesAndPartnerHubProps {
  onSelectRoute: (route: PopularRouteDeal) => void;
  onViewAllRoutes: () => void;
  onOpenDriverPartner: () => void;
  onOpenRides: () => void;
  onOpenHelp: () => void;
}

export const HomeRoutesAndPartnerHub: React.FC<HomeRoutesAndPartnerHubProps> = ({
  onSelectRoute,
  onViewAllRoutes,
  onOpenDriverPartner,
  onOpenRides,
  onOpenHelp
}) => {
  const topRoutes = POPULAR_ROUTES.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Top Popular Fixed-Fare Corridors */}
      <section className="space-y-3" aria-label="Popular one-way routes">
        <div className="flex items-end justify-between gap-2 px-0.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Popular One-Way Routes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Zero return fare · Verified AC highway cabs
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAllRoutes}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 whitespace-nowrap shrink-0 flex items-center gap-1 py-1 cursor-pointer"
          >
            <span>All Routes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white border border-slate-200/85 rounded-3xl divide-y divide-slate-100 overflow-hidden shadow-2xs">
          {topRoutes.map((route, idx) => (
            <button
              key={`${route.from}-${route.to}-${idx}`}
              type="button"
              onClick={() => onSelectRoute(route)}
              className="w-full min-h-[64px] px-4 py-3.5 hover:bg-slate-50 active:bg-amber-50/50 transition flex items-center justify-between gap-3 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <span>{route.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{route.to}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono tabular-nums">{route.distanceKm} km</span>
                    <span aria-hidden="true">·</span>
                    <span>{route.duration}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{route.popularCar}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center gap-2">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">From</div>
                  <div className="text-sm font-extrabold text-slate-950 font-mono tabular-nums">
                    {formatINR(route.startingPrice)}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Assurance Strip */}
      <div className="bg-white border border-slate-200/85 rounded-2xl py-4 px-3 sm:px-6 shadow-2xs grid grid-cols-3 gap-2 text-center divide-x divide-slate-100">
        <div className="px-1">
          <div className="text-xs sm:text-sm font-extrabold text-slate-950">Zero Return</div>
          <div className="text-[11px] text-slate-500 mt-0.5">One-way billing</div>
        </div>
        <div className="px-1">
          <div className="text-xs sm:text-sm font-extrabold text-amber-700">20% Advance</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Instant lock</div>
        </div>
        <div className="px-1">
          <div className="text-xs sm:text-sm font-extrabold text-slate-950">Free Cancel</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Up to 6 hrs prior</div>
        </div>
      </div>

      {/* Vendor / Driver Partner & Customer Portal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenDriverPartner}
          className="bg-white border border-slate-200/85 hover:border-amber-400 rounded-2xl p-4 text-left flex items-center justify-between gap-3 transition cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 truncate">
                Driver &amp; Vendor Partner
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                Attach commercial cab · Daily intercity duties
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onOpenRides}
          className="bg-white border border-slate-200/85 hover:border-amber-400 rounded-2xl p-4 text-left flex items-center justify-between gap-3 transition cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900 truncate">
                My Rides &amp; GST Bills
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                Track active duties &amp; download tax invoices
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Compact Help & Trust Footer Note for Mobile Home */}
      <button
        type="button"
        onClick={onOpenHelp}
        className="w-full bg-slate-100/90 hover:bg-slate-200/70 border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-left transition cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 truncate">
            All India Permit Cabs · GST Verified · 24×7 Support &amp; Policies
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
      </button>
    </div>
  );
};
