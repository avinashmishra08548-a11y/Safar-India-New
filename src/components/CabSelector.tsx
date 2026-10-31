import React, { useState, useEffect } from 'react';
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
import { CABS_FLEET } from '../data/cabsFleet';
import { CabVehicle, CustomerUser, TripType } from '../types';
import {
  calculateTripFare,
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
  onSelectCab
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Default selected: PARKING EXTRA IF APPLICABLE = true
  const [localParkingExtra, setLocalParkingExtra] = useState<boolean>(true);
  const activeParkingExtra = externalParkingExtra !== undefined ? externalParkingExtra : localParkingExtra;
  const setActiveParkingExtra = (val: boolean) => {
    setLocalParkingExtra(val);
    setExternalParkingExtra?.(val);
  };

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

  const sampleFare = calculateTripFare(
    'sedan',
    tripType,
    distanceKm,
    days,
    localPackageId,
    pickupCity,
    dropCity,
    includeTolls,
    pickupDate,
    pickupTime,
    0,
    promoDiscountValue
  );

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
                Local Package in <strong className="text-slate-900">{pickupCity}</strong>
              </span>
            ) : (
              <span>
                <strong className="text-slate-900">{pickupCity}</strong> to{' '}
                <strong className="text-slate-900">{dropCity}</strong>
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
            {tripType === 'roundtrip' && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="font-semibold text-slate-700">
                  {days} Day{days > 1 ? 's' : ''} Round Trip
                </span>
              </>
            )}
          </div>
        </div>

        {/* Clean Controls: Return Date (if Round Trip) + Toll Toggle */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {tripType === 'roundtrip' && setReturnDate && (
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 shadow-2xs">
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
            <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-wrap items-center gap-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setIncludeTolls(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  includeTolls
                    ? 'bg-amber-400 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Include Toll</span>
              </button>
              <button
                type="button"
                onClick={() => setIncludeTolls(false)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  !includeTolls
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Toll Extra
              </button>
              <button
                type="button"
                onClick={() => setActiveParkingExtra(!activeParkingExtra)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeParkingExtra
                    ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-500/40'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>PARKING EXTRA IF APPLICABLE</span>
              </button>
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

      {/* Best Price Challenge: Live Aggregator Rate Comparison Strip (CabBazar, Gozo Cabs, Savaari) */}
      <div className="mb-7 bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
            Guaranteed Lowest One-Way &amp; Outstation Fare · Best Price Challenge
          </div>
          <h3 className="text-sm sm:text-base font-black text-white">
            Save ₹{sampleFare.savingsAmount} vs Market Average on{' '}
            {tripType === 'local' ? `${pickupCity} Local Rental` : `${pickupCity} → ${dropCity}`}
          </h3>
          <p className="text-xs text-slate-300">
            100% Transparent Billing: Base Fare, Driver Allowance (DA), {sampleFare.billedDistanceKm} KM, State Permit &amp; 5% GST shown upfront. Zero hidden charges.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 text-xs">
          <div className="bg-amber-400 text-slate-950 rounded-xl px-3.5 py-2.5 font-bold">
            <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-80">
              SafarIndiaCabs
            </div>
            <div className="text-base font-black font-mono tabular-nums">
              ₹{sampleFare.totalFare.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] font-extrabold text-emerald-950">Lowest Guaranteed ✓</div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              CabBazar Avg
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-300 line-through">
              ₹{sampleFare.competitorRates.cabBazarFare.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              You Save ₹{(sampleFare.competitorRates.cabBazarFare - sampleFare.totalFare).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Gozo Cabs Avg
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-300 line-through">
              ₹{sampleFare.competitorRates.gozoCabsFare.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              You Save ₹{(sampleFare.competitorRates.gozoCabsFare - sampleFare.totalFare).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Savaari Avg
            </div>
            <div className="text-sm font-bold font-mono tabular-nums text-slate-300 line-through">
              ₹{sampleFare.competitorRates.savaariFare.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold">
              You Save ₹{(sampleFare.competitorRates.savaariFare - sampleFare.totalFare).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Spacious Cab Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {CABS_FLEET.map((cab) => {
          const fareWithToll = calculateTripFare(
            cab.id,
            tripType,
            distanceKm,
            days,
            localPackageId,
            pickupCity,
            dropCity,
            true,
            pickupDate,
            pickupTime,
            0,
            promoDiscountValue
          );
          const fareWithoutToll = calculateTripFare(
            cab.id,
            tripType,
            distanceKm,
            days,
            localPackageId,
            pickupCity,
            dropCity,
            false,
            pickupDate,
            pickupTime,
            0,
            promoDiscountValue
          );
          const activeFare = includeTolls ? fareWithToll : fareWithoutToll;

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
                    Save ₹{activeFare.savingsAmount} vs Market Average
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
                      Guaranteed Lowest One-Way Fare
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
                      ₹{activeFare.effectiveRatePerKm}/km
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

                {/* Transparent Pre-Booking Fare Breakdown (Zero Hidden Charges Guarantee) */}
                <div className="mb-3 p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between font-extrabold text-slate-900 border-b border-slate-200 pb-1">
                    <span>Transparent Fare Breakdown ({activeFare.billedDistanceKm} KM)</span>
                    <span className="text-emerald-700">Zero Hidden Charges</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Base Fare ({activeFare.billedDistanceKm} KM Included):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{activeFare.baseFare.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Driver Allowance (DA / Bata):</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ₹{activeFare.driverAllowance.toLocaleString('en-IN')} (Included)
                    </span>
                  </div>
                  {tripType !== 'local' && (
                    <div className="flex justify-between text-slate-600">
                      <span>State Toll &amp; Permit Tax:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {includeTolls
                          ? `₹${activeFare.tollsAndTaxes.toLocaleString('en-IN')} (Included)`
                          : `Est. ₹${activeFare.estimatedTollsAndTaxes.toLocaleString('en-IN')} (Extra)`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST (5% SAC 996412) · Extra ₹{activeFare.extraKmRate}/km:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{activeFare.gstAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Market Comparison:</span>
                    <span className="font-mono">
                      CabBazar: <span className="line-through">₹{activeFare.competitorRates.cabBazarFare.toLocaleString('en-IN')}</span>
                      {' · '}
                      Savaari: <span className="line-through">₹{activeFare.competitorRates.savaariFare.toLocaleString('en-IN')}</span>
                    </span>
                  </div>
                </div>

                {/* Clean Fare Selector with Parking Extra If Applicable (Default Selected) */}
                {tripType !== 'local' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIncludeTolls(true)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          includeTolls
                            ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-400/50'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] font-bold text-slate-700">Include Toll</span>
                          {includeTolls && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        </div>
                        <div className="text-base font-black text-slate-950 font-mono tabular-nums">
                          ₹{fareWithToll.totalFare.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Toll &amp; State Tax Included
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIncludeTolls(false)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          !includeTolls
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-[11px] font-bold ${!includeTolls ? 'text-amber-400' : 'text-slate-700'}`}>
                            Toll Extra
                          </span>
                          {!includeTolls && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className={`text-base font-black font-mono tabular-nums ${!includeTolls ? 'text-white' : 'text-slate-950'}`}>
                          ₹{fareWithoutToll.totalFare.toLocaleString('en-IN')}
                        </div>
                        <div className={`text-[10px] font-medium mt-0.5 ${!includeTolls ? 'text-slate-300' : 'text-slate-500'}`}>
                          Toll &amp; State Tax Extra
                        </div>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveParkingExtra(!activeParkingExtra)}
                      className={`w-full px-3 py-2 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                        activeParkingExtra
                          ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-1 ring-emerald-400/40'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            activeParkingExtra ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        />
                        <span>PARKING EXTRA IF APPLICABLE</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          activeParkingExtra
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {activeParkingExtra ? 'Selected ✓' : 'Select'}
                      </span>
                    </button>
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
                        Save ₹{activeFare.discountAmount.toLocaleString('en-IN')} vs Market Average
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
    </section>
  );
};
