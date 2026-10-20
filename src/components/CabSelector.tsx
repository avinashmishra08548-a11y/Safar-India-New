import React from 'react';
import {
  Users,
  Briefcase,
  Snowflake,
  CheckCircle2,
  Sparkles,
  Tag,
  Mountain,
  SlidersHorizontal,
  Calendar,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
  Clock,
  Navigation
} from 'lucide-react';
import { CABS_FLEET } from '../data/cabsFleet';
import { CabVehicle, TripType } from '../types';
import { calculateTripFare, FareBreakdown, isLocationInHillArea } from '../utils/fareCalculator';

interface CabSelectorProps {
  tripType: TripType;
  setTripType?: (t: TripType) => void;
  pickupCity: string;
  dropCity: string;
  distanceKm: number;
  extraKm: number;
  setExtraKm: (km: number) => void;
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
  onSelectCab: (cab: CabVehicle, fare: FareBreakdown) => void;
}

const TIME_SLOTS = [
  '05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
  '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
];

export const CabSelector: React.FC<CabSelectorProps> = ({
  tripType,
  setTripType,
  pickupCity,
  dropCity,
  distanceKm,
  extraKm,
  setExtraKm,
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
  onSelectCab
}) => {
  const isPickupHill = isLocationInHillArea(pickupCity);
  const isDropHill = isLocationInHillArea(dropCity);
  const isHillRoute = isPickupHill || isDropHill;
  const todayStr = new Date().toISOString().split('T')[0];

  // Sample fare breakdown on Sedan to show route-level dynamic badges
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
    extraKm
  );

  return (
    <section id="available-cabs-section" className="py-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-1.5 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Dynamic Route &amp; Terrain Pricing · Zero Hidden Charges</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Select Your Preferred Cab
          </h2>
          <p className="text-slate-600 text-sm mt-0.5 flex flex-wrap items-center gap-2">
            {tripType === 'local' ? (
              <span>Showing packages for Local Rental in <strong className="text-slate-900">{pickupCity}</strong></span>
            ) : (
              <span>
                Route: <strong className="text-slate-900">{pickupCity}</strong> to{' '}
                <strong className="text-slate-900">{dropCity}</strong> · Map Distance:{' '}
                <strong className="text-amber-700 font-mono">{distanceKm} KM</strong>
                {extraKm > 0 && (
                  <span className="text-emerald-700 font-extrabold">
                    {' '}+ {extraKm} KM Extra = {distanceKm + extraKm} KM Total
                  </span>
                )}
                {tripType === 'roundtrip' && ` (${days} Day${days > 1 ? 's' : ''} Round Trip)`}
              </span>
            )}
          </p>
        </div>

        {/* Clean 2-Option Toll Toggle */}
        {tripType !== 'local' && (
          <div className="bg-white border border-slate-300 rounded-2xl p-2 flex items-center gap-2 self-start shadow-xs">
            <span className="text-[11px] text-slate-700 font-extrabold px-2">Fare Option:</span>
            <button
              type="button"
              onClick={() => setIncludeTolls(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                includeTolls
                  ? 'bg-[#F59E0B] text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Include Toll</span>
            </button>
            <button
              type="button"
              onClick={() => setIncludeTolls(false)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                !includeTolls
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toll Extra
            </button>
          </div>
        )}
      </div>

      {/* INTERACTIVE CONTROLS PANEL:
          1. Extra Kilometer Slider (with Hill-Area & Plain-Area dynamic per-KM calculation)
          2. Round Trip & Return Date / Time Selector Bar */}
      {tripType !== 'local' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          {/* EXTRA KILOMETER SLIDER BOX (7 cols) */}
          <div
            className={`lg:col-span-7 rounded-2xl p-4 border shadow-xs transition ${
              isHillRoute
                ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border-amber-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isHillRoute
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-amber-400'
                  }`}
                >
                  {isHillRoute ? (
                    <Mountain className="w-4 h-4 stroke-[2.4]" />
                  ) : (
                    <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                      Extra Kilometer Slider (Add Buffer / Sightseeing KM)
                    </h3>
                    {isDropHill ? (
                      <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        ⛰️ Hill Drop Rate Active
                      </span>
                    ) : isPickupHill ? (
                      <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        ⛰️ Hill Pickup Rate Active
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-300 px-2 py-0.5 rounded-full font-bold">
                        Standard Highway KM Rate
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isDropHill
                      ? `Drop location (${dropCity}) is in a Hill Area — extra slider KMs are calculated at Hill Terrain / Ghat rates.`
                      : isPickupHill
                        ? `Pickup (${pickupCity}) involves Hill Terrain — extra KMs include mountain gradient fuel adjustment.`
                        : 'Going slightly ahead of map pin, village interior, or local detour? Slide to add extra KMs upfront.'}
                  </p>
                </div>
              </div>

              {/* Live Counter Pill */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setExtraKm(Math.max(0, extraKm - 5))}
                  disabled={extraKm <= 0}
                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-900 font-bold transition cursor-pointer"
                  title="Decrease 5 KM"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="px-2 text-center min-w-[78px]">
                  <div className="text-xs font-black font-mono text-slate-950">
                    +{extraKm} KM
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">
                    Total {distanceKm + extraKm} KM
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExtraKm(Math.min(300, extraKm + 5))}
                  disabled={extraKm >= 300}
                  className="w-6 h-6 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-40 flex items-center justify-center text-slate-950 font-bold transition cursor-pointer"
                  title="Increase 5 KM"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {extraKm > 0 && (
                  <button
                    type="button"
                    onClick={() => setExtraKm(0)}
                    className="ml-1 p-1 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                    title="Reset Extra KM to 0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Range Input Slider */}
            <div className="mt-2">
              <input
                type="range"
                min={0}
                max={250}
                step={5}
                value={extraKm}
                onChange={(e) => setExtraKm(Number(e.target.value))}
                aria-label="Add Extra Kilometers beyond map distance"
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 mt-1.5">
                <span>0 KM (Map Exact: {distanceKm} KM)</span>
                <span>+25 KM</span>
                <span>+50 KM</span>
                <span>+100 KM</span>
                <span>+150 KM</span>
                <span>+250 KM</span>
              </div>
            </div>

            {/* Quick Preset KM Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-200/80">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mr-1">
                Quick Add:
              </span>
              {[0, 10, 20, 35, 50, 75, 100, 150].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setExtraKm(val)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold font-mono transition cursor-pointer ${
                    extraKm === val
                      ? 'bg-slate-900 text-amber-400 shadow-2xs'
                      : 'bg-white hover:bg-amber-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {val === 0 ? 'Map Exact (0 KM)' : `+${val} KM`}
                </button>
              ))}
            </div>
          </div>

          {/* ROUND TRIP & RETURN DATE / TIME CONTROL BOX (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                    <RefreshCw className="w-4 h-4 stroke-[2.3]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                      Trip Mode &amp; Return Date
                    </h3>
                    <p className="text-[11px] text-slate-600">
                      {tripType === 'roundtrip'
                        ? `Round Trip selected (${days} Day${days > 1 ? 's' : ''}) — Cab stays with you & brings you back.`
                        : 'Need return journey cab as well? Switch to Round Trip & pick return date.'}
                    </p>
                  </div>
                </div>

                {setTripType && (
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTripType('oneway')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                        tripType === 'oneway'
                          ? 'bg-white text-slate-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      One-Way
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTripType('roundtrip');
                        if (setReturnDate && (!returnDate || returnDate < (pickupDate || todayStr))) {
                          const base = pickupDate ? new Date(pickupDate) : new Date();
                          base.setDate(base.getDate() + 2);
                          setReturnDate(base.toISOString().split('T')[0]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                        tripType === 'roundtrip'
                          ? 'bg-amber-400 text-slate-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Round Trip
                    </button>
                  </div>
                )}
              </div>

              {tripType === 'roundtrip' && setReturnDate ? (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-700" />
                      <span>Select Return Date &amp; Time</span>
                    </span>
                    <span className="text-[11px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-md">
                      {days} Day{days > 1 ? 's' : ''} Round Trip
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      aria-label="Return Date"
                      min={pickupDate || todayStr}
                      value={returnDate || pickupDate || todayStr}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                    />
                    {setReturnTime && (
                      <select
                        aria-label="Return Time"
                        value={returnTime || '06:00 PM'}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-2 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 cursor-pointer"
                      >
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {[
                      { label: 'Same Day Return', add: 0 },
                      { label: '+1 Day', add: 1 },
                      { label: '+2 Days', add: 2 },
                      { label: '+4 Days', add: 4 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const base = pickupDate ? new Date(pickupDate) : new Date();
                          base.setDate(base.getDate() + preset.add);
                          setReturnDate(base.toISOString().split('T')[0]);
                        }}
                        className="flex-1 py-1 px-1.5 rounded-lg bg-white hover:bg-amber-200/70 text-[10px] font-extrabold text-amber-950 border border-amber-300 transition cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-900 block">Planning to return back to {pickupCity}?</span>
                    <span>Book Round Trip to get 15% lower per-KM rate &amp; dedicated vehicle.</span>
                  </div>
                  {setTripType && (
                    <button
                      type="button"
                      onClick={() => {
                        setTripType('roundtrip');
                        if (setReturnDate && (!returnDate || returnDate < (pickupDate || todayStr))) {
                          const base = pickupDate ? new Date(pickupDate) : new Date();
                          base.setDate(base.getDate() + 2);
                          setReturnDate(base.toISOString().split('T')[0]);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs whitespace-nowrap transition shadow-2xs cursor-pointer"
                    >
                      + Add Return Date
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Active Pricing Factors Strip */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-[10px]">
              {sampleFare.terrainBadge && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 border border-amber-300 font-extrabold flex items-center gap-1">
                  <Mountain className="w-3 h-3 text-amber-700" />
                  <span>{sampleFare.terrainBadge}</span>
                </span>
              )}
              {sampleFare.routeDemandBadge && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300 font-bold flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-slate-700" />
                  <span>{sampleFare.routeDemandBadge}</span>
                </span>
              )}
              {sampleFare.bookingLeadBadge && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-700" />
                  <span>{sampleFare.bookingLeadBadge}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cab Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            extraKm
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
            extraKm
          );
          const activeFare = includeTolls ? fareWithToll : fareWithoutToll;

          return (
            <div
              key={cab.id}
              className={`group relative rounded-3xl bg-white border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                cab.popular
                  ? 'border-amber-400 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/50'
                  : 'border-slate-200/90 hover:border-amber-300 shadow-md hover:shadow-xl'
              }`}
            >
              {/* Top Badges */}
              <div className="px-5 pt-4 flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                  {cab.category}
                </span>
                <div className="flex items-center gap-1.5">
                  {activeFare.isHillAreaRoute && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                      <Mountain className="w-3 h-3 text-amber-700" />
                      <span>Hill Spec</span>
                    </span>
                  )}
                  {cab.popular && (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                      <Tag className="w-3 h-3" />
                      <span>Most Popular</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Cab Image & Title */}
              <div className="p-5 pb-3">
                <div className="relative h-40 w-full rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-200/60">
                  <img
                    src={cab.image}
                    alt={cab.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white drop-shadow-xs">{cab.name}</h3>
                      <p className="text-xs text-amber-300 font-bold drop-shadow-xs">{cab.models}</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white/95 text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                      ₹{activeFare.effectiveRatePerKm}/km
                    </span>
                  </div>
                </div>

                {/* Specs Pills */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-semibold mb-3">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{cab.capacityPassengers} Seats</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{cab.capacityLuggage} Bags</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Snowflake className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Full AC</span>
                  </div>
                </div>

                {/* Extra KM Slider Impact Pill (if extraKm > 0) */}
                {extraKm > 0 && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                      <span>+{extraKm} Extra KM ({activeFare.isDropHillArea || activeFare.isPickupHillArea ? 'Hill Rate' : 'Highway Rate'} @ ₹{activeFare.extraKmRateUsed}/km)</span>
                    </span>
                    <span className="font-mono font-black text-amber-900">
                      +₹{activeFare.extraKmCharge.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* TWO FARE OPTIONS ONLY (Clean design without showing separate tax amounts) */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-500 px-0.5">
                    <span>Select Fare Option</span>
                    <span className="font-mono text-slate-700">
                      {activeFare.billedDistanceKm} KM Billed
                    </span>
                  </div>

                  {tripType !== 'local' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Option 1: Fare With Toll & State Tax Included */}
                      <button
                        type="button"
                        onClick={() => setIncludeTolls(true)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          includeTolls
                            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/40 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Include Toll
                          </span>
                          {includeTolls && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        </div>
                        <div className="text-base font-black text-slate-950 font-mono">
                          ₹{fareWithToll.totalFare.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-600 font-semibold leading-tight mt-0.5">
                          Toll + State Tax Included
                        </div>
                      </button>

                      {/* Option 2: Fare With Toll & State Tax Extra */}
                      <button
                        type="button"
                        onClick={() => setIncludeTolls(false)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          !includeTolls
                            ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900/20 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              !includeTolls ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Toll Extra
                          </span>
                          {!includeTolls && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className={`text-base font-black font-mono ${!includeTolls ? 'text-white' : 'text-slate-950'}`}>
                          ₹{fareWithoutToll.totalFare.toLocaleString('en-IN')}
                        </div>
                        <div className={`text-[10px] font-semibold leading-tight mt-0.5 ${!includeTolls ? 'text-slate-300' : 'text-slate-600'}`}>
                          Toll &amp; State Tax Alag Se
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Local Package Fare
                        </span>
                        <div className="text-[11px] text-slate-600 font-semibold mt-1">
                          Fuel &amp; Driver Included
                        </div>
                      </div>
                      <div className="text-lg font-black text-slate-950 font-mono">
                        ₹{activeFare.totalFare.toLocaleString('en-IN')}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Footer & CTA */}
              <div className="p-5 pt-3 border-t border-slate-200/80 bg-slate-50/70">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500 line-through font-mono">
                        ₹{activeFare.originalFare.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Save ₹{activeFare.discountAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
                      ₹{activeFare.totalFare.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-slate-600 block font-semibold">
                      {includeTolls && tripType !== 'local'
                        ? 'All-Inclusive (With Toll & State Tax)'
                        : 'Base Fare (Toll & State Tax Alag Se)'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block font-medium">Book Now With 20%</span>
                    <span className="text-sm font-extrabold text-amber-700 font-mono">
                      ₹{activeFare.advanceAmount.toLocaleString('en-IN')} Advance
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCab(cab, activeFare)}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                    cab.popular
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15'
                      : 'bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Select {cab.name} ({includeTolls && tripType !== 'local' ? 'Include Toll' : 'Toll Extra'})
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
