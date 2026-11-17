import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Briefcase,
  Snowflake,
  CheckCircle2,
  Mountain,
  Calendar,
  Tag,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { buildDynamicFleetList } from '../data/cabsFleet';
import { getAdminPricingConfigSync, submitManualQuoteRequest } from '../utils/olaMapsService';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { CabVehicle, CustomerUser, TripType } from '../types';
import {
  calculateTripFare,
  computeTripFare,
  FareBreakdown,
  PROMO_DISCOUNT_AMOUNT,
  PROMO_SUCCESS_MESSAGE,
  isDrVijayKumarMatch,
  isValidFirst300Promo
} from '../utils/fareCalculator';

interface CabSelectorProps {
  tripType: TripType;
  setTripType?: (t: TripType) => void;
  pickupCity: string;
  dropCity: string;
  stops?: string[];
  waitingMinutes?: number;
  requiresManualQuote?: boolean;
  routeErrorMessage?: string;
  distanceKm: number;
  extraKm?: number;
  setExtraKm?: (km: number) => void;
  days: number;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  setReturnDate?: (d: string) => void;
  returnTime?: string;
  setReturnTime?: (t: string) => void;
  localPackageId: string;
  includeTolls: boolean;
  setIncludeTolls: (val: boolean) => void;
  parkingExtra?: boolean;
  setParkingExtra?: (val: boolean) => void;
  promoCode?: string;
  setPromoCode?: (code: string) => void;
  isPromoApplied?: boolean;
  setIsPromoApplied?: (applied: boolean) => void;
  currentUser?: CustomerUser | null;
  welcomeMessage?: string;
  routeGeometry?: Array<[number, number]>;
  onSelectCab: (cab: CabVehicle, fare: FareBreakdown) => void;
}

const TIME_SLOTS = [
  '05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
];

export const CabSelector: React.FC<CabSelectorProps> = ({
  tripType,
  pickupCity,
  dropCity,
  stops = [],
  waitingMinutes = 0,
  requiresManualQuote = false,
  routeErrorMessage = '',
  distanceKm,
  days,
  pickupDate,
  pickupTime,
  returnDate,
  setReturnDate,
  returnTime,
  setReturnTime,
  localPackageId,
  includeTolls,
  setIncludeTolls,
  parkingExtra: externalParkingExtra,
  setParkingExtra: setExternalParkingExtra,
  promoCode: externalPromoCode,
  setPromoCode: setExternalPromoCode,
  isPromoApplied: externalIsPromoApplied,
  setIsPromoApplied: setExternalIsPromoApplied,
  currentUser,
  welcomeMessage,
  routeGeometry,
  onSelectCab
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [manualPhone, setManualPhone] = useState(currentUser?.phone || '');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualResult, setManualResult] = useState('');

  const dynamicFleet = useMemo(
    () => buildDynamicFleetList(getAdminPricingConfigSync()),
    []
  );

  // Pre-filled by default (non-toggleable): TOLL TAX, STATE TAX & PARKING EXTRA (AS PER ACTUALS)
  useEffect(() => {
    setIncludeTolls(false);
    setExternalParkingExtra?.(true);
  }, []);

  const [localPromoInput, setLocalPromoInput] = useState(externalPromoCode || '');
  const [localPromoApplied, setLocalPromoApplied] = useState(Boolean(externalIsPromoApplied));
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    externalIsPromoApplied ? { type: 'success', text: PROMO_SUCCESS_MESSAGE } : null
  );

  const activePromoInput = externalPromoCode !== undefined ? externalPromoCode : localPromoInput;
  const setActivePromoInput = (val: string) => {
    setLocalPromoInput(val);
    setExternalPromoCode?.(val);
  };

  const activePromoApplied = externalIsPromoApplied !== undefined ? externalIsPromoApplied : localPromoApplied;
  const setActivePromoApplied = (val: boolean) => {
    setLocalPromoApplied(val);
    setExternalIsPromoApplied?.(val);
  };

  // Automatically apply ₹300 discount if currentUser or welcomeMessage matches Dr. Vijay Kumar
  useEffect(() => {
    const welcomeOrUserText = `${currentUser?.name || ''} ${welcomeMessage || ''}`.trim();
    if (isDrVijayKumarMatch(welcomeOrUserText)) {
      if (!activePromoApplied) {
        setActivePromoApplied(true);
        if (!activePromoInput) {
          setActivePromoInput('FIRST300');
        }
      }
      setPromoFeedback({ type: 'success', text: PROMO_SUCCESS_MESSAGE });
    } else if (externalIsPromoApplied) {
      setPromoFeedback({ type: 'success', text: PROMO_SUCCESS_MESSAGE });
    }
  }, [currentUser?.name, welcomeMessage, externalIsPromoApplied]);

  const handleApplyPromoCode = (overrideCode?: string) => {
    const candidate = (overrideCode !== undefined ? overrideCode : activePromoInput).trim();
    const welcomeOrUserText = `${currentUser?.name || ''} ${welcomeMessage || ''}`.trim();

    if (isValidFirst300Promo(candidate, welcomeOrUserText)) {
      setActivePromoInput(candidate.toUpperCase() === 'FIRST300' || !candidate ? 'FIRST300' : candidate);
      setActivePromoApplied(true);
      setPromoFeedback({ type: 'success', text: PROMO_SUCCESS_MESSAGE });
    } else {
      setActivePromoApplied(false);
      setPromoFeedback({
        type: 'error',
        text: 'Invalid promo code. Please enter a valid code.'
      });
    }
  };

  const promoDiscountValue = activePromoApplied ? PROMO_DISCOUNT_AMOUNT : 0;

  const sampleFare = useMemo(
    () =>
      computeTripFare({
        tripType,
        cabId: 'sedan',
        distanceKm,
        extraKm: 0,
        pickupCity,
        dropCity,
        stops,
        waitingMinutes,
        days,
        pickupDate,
        pickupTime,
        returnDate,
        returnTime,
        localPackageId,
        includeTolls,
        promoDiscount: promoDiscountValue,
        routeGeometry,
        routeVerified: !requiresManualQuote
      }),
    [
      tripType,
      distanceKm,
      days,
      localPackageId,
      pickupCity,
      dropCity,
      stops,
      waitingMinutes,
      includeTolls,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      promoDiscountValue,
      routeGeometry,
      requiresManualQuote
    ]
  );

  const computedFleetFares = useMemo(
    () =>
      dynamicFleet.map((cab) => {
        const fareWithoutToll = computeTripFare({
          tripType,
          cabId: cab.id,
          distanceKm,
          extraKm: 0,
          pickupCity,
          dropCity,
          stops,
          waitingMinutes,
          days,
          pickupDate,
          pickupTime,
          returnDate,
          returnTime,
          localPackageId,
          includeTolls: false,
          promoDiscount: promoDiscountValue,
          routeGeometry,
          routeVerified: !requiresManualQuote
        });
        return { cab, fareWithoutToll };
      }),
    [
      dynamicFleet,
      tripType,
      distanceKm,
      days,
      localPackageId,
      pickupCity,
      dropCity,
      stops,
      waitingMinutes,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      promoDiscountValue,
      routeGeometry,
      requiresManualQuote
    ]
  );

  const isManualQuoteRequired =
    tripType !== 'local' && (requiresManualQuote || sampleFare.requiresManualQuote || distanceKm <= 0);

  return (
    <section id="available-cabs-section" className="py-8">
      {/* Clean, Spacious Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Select Your Preferred Cab
          </h2>
          <div className="text-slate-600 text-sm mt-2 flex flex-wrap items-center gap-2.5">
            {tripType === 'local' ? (
              <span>
                Local Package in <strong className="text-slate-900">{pickupCity || 'Your City'}</strong>
              </span>
            ) : pickupCity && dropCity ? (
              <span>
                <strong className="text-slate-900">{pickupCity}</strong> to{' '}
                <strong className="text-slate-900">{dropCity}</strong>
              </span>
            ) : (
              <span>
                <strong className="text-slate-900">All India Outstation &amp; One-Way Cabs</strong>
              </span>
            )}
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="font-mono font-bold text-slate-900">
              Total: {sampleFare.billedDistanceKm} KM
            </span>
            {tripType === 'oneway' && sampleFare.estimatedDropTime && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="font-semibold text-slate-700">
                  Est. Drop: <strong className="text-slate-900">{sampleFare.estimatedDropTime}</strong>
                  {sampleFare.isLateNightDrop ? ' (Night Drop)' : ''}
                </span>
              </>
            )}
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-800">
              {sampleFare.isHillAreaRoute && <Mountain className="w-3.5 h-3.5 text-amber-600" />}
              <span>
                Extra KM: <strong className="font-mono text-slate-950">₹{sampleFare.extraKmRate}/km</strong>
                {sampleFare.isHillAreaRoute ? ` (${sampleFare.hillTierLabel || 'Hill Rate'})` : sampleFare.isOuterRoute ? ` (${sampleFare.routeTierLabel})` : ''}
              </span>
            </span>
              {tripType === 'roundtrip' || tripType === 'multiday' ? (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-700">
                    {days} Day{days > 1 ? 's' : ''} {tripType === 'multiday' ? 'Tour' : 'Round Trip'}
                  </span>
                </>
              ) : null}
              {sampleFare.locationCategories && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                    {sampleFare.locationCategories.pickupCategoryLabel} → {sampleFare.locationCategories.dropCategoryLabel}
                  </span>
                </>
              )}
              {sampleFare.isRegionalPricingActive && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-xs font-extrabold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      {sampleFare.regionalEngineName || 'Bihar & Jharkhand Fixed Route Special'}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Clean Controls: Return Date (if Round Trip / Multi-Day) + Toll Toggle */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {(tripType === 'roundtrip' || tripType === 'multiday') && setReturnDate && (
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 flex flex-wrap items-center gap-2 shadow-2xs">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Return:</span>
              <input
                type="date"
                aria-label="Return Date"
                min={pickupDate || todayStr}
                value={returnDate || pickupDate || todayStr}
                onChange={(e) => setReturnDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center gap-1">
                {[
                  { label: 'Same Day (1D)', addDays: 0 },
                  { label: '2 Days', addDays: 1 },
                  { label: '3 Days', addDays: 2 }
                ].map((opt) => {
                  const baseDate = pickupDate || todayStr;
                  const d = new Date(baseDate);
                  if (!isNaN(d.getTime())) d.setDate(d.getDate() + opt.addDays);
                  const targetStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : baseDate;
                  const active = (returnDate || pickupDate || todayStr) === targetStr;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setReturnDate(targetStr)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition cursor-pointer ${
                        active
                          ? 'bg-amber-400 text-slate-950 border-amber-500'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {setReturnTime && (
                <select
                  aria-label="Return Time"
                  value={returnTime || '06:00 PM'}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {tripType !== 'local' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-2xs select-none">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-extrabold text-emerald-950 tracking-wide">
                TOLL EXTRA (AS PER ACTUALS)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Promo Code & Welcome Offer Strip on Booking Summary */}
      <div className="mb-7 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-slate-900">
            <Tag className="w-4 h-4 text-amber-600 shrink-0" />
            <label htmlFor="booking-summary-promo-input" className="cursor-pointer">
              {currentUser?.name
                ? `Welcome, ${currentUser.name}! Have a Promo Code?`
                : 'Have a Promo Code?'}
            </label>
          </div>
          {promoFeedback && (
            <div
              className={`text-xs font-bold flex items-center gap-1.5 ${
                promoFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {promoFeedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              )}
              <span>{promoFeedback.text}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            id="booking-summary-promo-input"
            type="text"
            value={activePromoInput}
            onChange={(e) => {
              setActivePromoInput(e.target.value);
              if (promoFeedback?.type === 'error') setPromoFeedback(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyPromoCode();
              }
            }}
            placeholder="Enter promo code"
            aria-label="Enter promo code"
            className="flex-1 sm:w-52 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 uppercase placeholder:normal-case placeholder:font-sans placeholder:font-medium placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => handleApplyPromoCode()}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950 font-black text-xs transition cursor-pointer shrink-0"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Manual Quote Gate (Prevents misleading ₹0 or fabricated fares) */}
      {isManualQuoteRequired ? (
        <div className="rounded-3xl bg-amber-50 border-2 border-amber-300 p-6 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-lg font-black text-amber-950">
                Custom Route Verification Required — Request Instant Manual Quote
              </h3>
              <p className="text-xs sm:text-sm text-amber-900">
                {routeErrorMessage ||
                  sampleFare.errorMessage ||
                  `Road distance for "${pickupCity} → ${dropCity}" requires dispatch verification to ensure honest pricing without inflated estimates.`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="tel"
              maxLength={10}
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit WhatsApp number"
              className="bg-white border border-amber-300 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-900 sm:w-56"
            />
            <button
              type="button"
              disabled={manualSubmitting}
              onClick={async () => {
                if (manualPhone.length !== 10) {
                  setManualResult('Please enter a valid 10-digit mobile number.');
                  return;
                }
                setManualSubmitting(true);
                const r = await submitManualQuoteRequest({
                  pickupCity,
                  dropCity,
                  tripType,
                  pickupDate,
                  pickupTime,
                  customerName: currentUser?.name,
                  customerPhone: manualPhone,
                  stops,
                  reason: routeErrorMessage || sampleFare.errorMessage
                });
                setManualSubmitting(false);
                setManualResult(
                  r.message || (r.success ? `Ticket ${r.ticketId || ''} created!` : 'Please tap WhatsApp Desk.')
                );
              }}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs transition cursor-pointer"
            >
              {manualSubmitting ? 'Sending...' : 'Submit Instant Quote Request'}
            </button>
            <a
              href={buildWhatsAppSchemeUrl(`Hi SafarIndiaCabs, please quote ${pickupCity} to ${dropCity} (${tripType}).`)}
              onClick={(e) =>
                triggerWhatsAppDeepLink(e, `Hi SafarIndiaCabs, please quote ${pickupCity} to ${dropCity}.`)
              }
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs text-center transition"
            >
              WhatsApp +91 9570571516
            </a>
          </div>
          {manualResult && (
            <div className="text-xs font-bold text-emerald-900 bg-white border border-emerald-300 rounded-xl px-3.5 py-2">
              {manualResult}
            </div>
          )}
        </div>
      ) : (
        /* Spacious Cab Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {computedFleetFares.map(({ cab, fareWithoutToll }) => {
          const activeFare = fareWithoutToll;

          return (
            <div
              key={cab.id}
              className={`group relative rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                cab.popular
                  ? 'border-amber-400 shadow-lg shadow-amber-500/5 ring-1 ring-amber-400/40'
                  : 'border-slate-200/90 hover:border-amber-300 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Cab Image & Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-3">
                  <span>{cab.category}</span>
                  <span className="text-emerald-700 font-extrabold">
                    Save ₹{activeFare.savingsAmount} vs{' '}
                    {activeFare.isRegionalPricingActive ? 'PatnaGo / Local Market' : 'Market Average'}
                  </span>
                </div>

                <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-200/60">
                  <img
                    src={cab.image}
                    alt={cab.name}
                    width={360}
                    height={201}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-950/85 text-amber-400 px-2.5 py-1 rounded-lg">
                      {activeFare.isRegionalFixedRoute
                        ? 'Bihar–Jharkhand Fixed Route Fare'
                        : activeFare.isRegionalPricingActive
                        ? 'Bihar–Jharkhand Regional Special'
                        : 'Guaranteed Lowest One-Way Fare'}
                    </span>
                    {activeFare.isHillAreaRoute && (
                      <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Mountain className="w-3 h-3" />
                        <span>Hill Ready</span>
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white">{cab.name}</h3>
                      <p className="text-xs text-amber-300 font-semibold">{cab.models}</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white/95 text-slate-900 px-2.5 py-1 rounded-lg">
                      {activeFare.isRegionalFixedRoute && tripType === 'oneway'
                        ? 'Fixed Route Rate'
                        : `₹${activeFare.effectiveRatePerKm}/km`}
                    </span>
                  </div>
                </div>

                {/* Clean Unboxed Specs */}
                <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-slate-50 text-xs text-slate-700 font-semibold mb-3">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>{cab.capacityPassengers} Seats</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                    <span>{cab.capacityLuggage} Bags</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                    <span>Full AC</span>
                  </span>
                </div>

                {/* Transparent Pre-Booking Fare Breakdown (Itemized Separate Breakup) */}
                <div className="mb-3 p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between font-extrabold text-slate-900 border-b border-slate-200 pb-1">
                    <span>Itemized Fare Breakup ({activeFare.billedDistanceKm} KM)</span>
                    <span className="text-emerald-700">100% Honest Pricing</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Base Cab Fare ({activeFare.billedDistanceKm} KM):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{Math.max(0, activeFare.baseFare - (activeFare.hillStationCharge || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Driver Allowance (Daily Bata):</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹{activeFare.driverAllowance.toLocaleString('en-IN')} (Included)
                    </span>
                  </div>
                  {activeFare.hillStationCharge > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>{activeFare.isDifficultMountainRoute ? 'Mountain Drive Charge:' : 'Hill Station Drive Charge:'}</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{activeFare.hillStationCharge.toLocaleString('en-IN')} (Included)
                      </span>
                    </div>
                  )}
                  {(activeFare.extraStopsCharge || 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Multi-City Stops ({activeFare.validStopsCount || 1}):</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{(activeFare.extraStopsCharge || 0).toLocaleString('en-IN')} (Included)
                      </span>
                    </div>
                  )}
                  {(activeFare.waitingCharge || 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Waiting Beyond 45m Grace ({activeFare.billableWaitMinutes}m):</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{(activeFare.waitingCharge || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {(activeFare.positioningCharge || 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Fleet Dispatch Positioning ({activeFare.positioningDistanceKm} KM):</span>
                      <span className="font-mono font-bold text-slate-900">
                        ₹{(activeFare.positioningCharge || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  {tripType !== 'local' && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Highway Toll:</span>
                        <span className="font-mono font-bold text-amber-800">
                          Extra (As per actuals)
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>
                          State Tax{(activeFare.stateTaxDays || 1) > 1 ? ` (${activeFare.stateTaxDays} Days)` : ''}
                          {(activeFare.delhiMcdToll || 0) > 0 ? ' + Delhi MCD' : ''}:
                        </span>
                        <span className={`font-mono font-bold ${activeFare.statePermitTax > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {activeFare.statePermitTax > 0
                            ? `₹${activeFare.statePermitTax.toLocaleString('en-IN')} (Included)`
                            : '₹0'}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST (5% SAC 996412) · Extra ₹{activeFare.extraKmRate}/km:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{activeFare.gstAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      {activeFare.competitorBenchmark?.competitorName
                        ? `${activeFare.competitorBenchmark.competitorName} Rate:`
                        : activeFare.isRegionalPricingActive
                        ? 'PatnaGo / RP Shakti Rate:'
                        : 'Market Average Rate:'}
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      <span className="line-through text-slate-400">
                        ₹{(activeFare.competitorBenchmark?.competitorFare || activeFare.competitorRates.marketAverageFare).toLocaleString('en-IN')}
                      </span>
                      {' · '}
                      <span className="text-emerald-700">
                        You Save ₹{activeFare.savingsAmount.toLocaleString('en-IN')}
                      </span>
                    </span>
                  </div>
                  {activeFare.isRegionalPricingActive && activeFare.regionalTollPolicyNote && (
                    <div className="pt-1 border-t border-slate-200/70 text-[10px] font-bold text-amber-900 flex items-center justify-between gap-2">
                      <span>Corridor Rule:</span>
                      <span className="text-right text-slate-700 font-semibold">
                        {activeFare.regionalTollPolicyNote}
                      </span>
                    </div>
                  )}
                  <div className="pt-1 text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>{activeFare.cancellationPolicy || 'Free cancellation up to 6 hours before pickup'}</span>
                  </div>
                </div>

                {/* Clean Fare Selector with Parking Extra If Applicable (Default Selected) */}
                {tripType !== 'local' ? (
                  <div className="w-full px-3.5 py-2.5 rounded-xl border bg-emerald-50/90 border-emerald-200 text-emerald-950 flex items-center justify-between gap-2 select-none">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>TOLL EXTRA</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 whitespace-nowrap">
                      As Per Actuals
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Local Rental Package</span>
                      <span className="text-[11px] text-slate-500">Fuel &amp; Chauffeur Included</span>
                    </div>
                    <div className="text-lg font-black text-slate-950 font-mono tabular-nums">
                      ₹{activeFare.totalFare.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>

              {/* Clean Footer & CTA */}
              <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 line-through font-mono tabular-nums">
                        ₹{activeFare.originalFare.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-extrabold text-emerald-700">
                        Save ₹{activeFare.discountAmount.toLocaleString('en-IN')} vs{' '}
                        {activeFare.isRegionalPricingActive ? 'Local Market' : 'Market Average'}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono tabular-nums tracking-tight">
                      ₹{activeFare.totalFare.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-600 block">Flexi 20% Advance</span>
                    <span className="text-sm font-black text-amber-700 font-mono tabular-nums">
                      ₹{activeFare.advanceAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCab(cab, activeFare)}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                    cab.popular
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950'
                  }`}
                >
                  <span>Book {cab.name}</span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </section>
  );
};
