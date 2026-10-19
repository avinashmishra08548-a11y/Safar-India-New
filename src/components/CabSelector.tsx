import React, { useState } from 'react';
import { 
  Users, 
  Briefcase, 
  Snowflake, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  Navigation,
  Receipt,
  Mountain
} from 'lucide-react';
import { CabVehicle, TripType } from '../types';
import { CABS_FLEET } from '../data/cabsFleet';
import { computeTripFare, formatINR, FareCalculationResult } from '../utils/fareCalculator';

interface CabSelectorProps {
  tripType: TripType;
  pickupCity: string;
  dropCity: string;
  distanceKm: number;
  travelDuration?: string;
  pickupDate: string;
  returnDate: string;
  localPackageId: string;
  includeTolls: boolean;
  onToggleIncludeTolls?: (include: boolean) => void;
  onSelectCab: (cab: CabVehicle, fareDetails: FareCalculationResult) => void;
}

export const CabSelector: React.FC<CabSelectorProps> = ({
  tripType,
  pickupCity,
  dropCity,
  distanceKm,
  travelDuration,
  pickupDate,
  returnDate,
  localPackageId,
  onToggleIncludeTolls,
  onSelectCab
}) => {
  // Both modes include Toll + State Tax automatically; mode tab switches between Best Price summary and Base Fare + Toll + State Tax view
  const [selectedFareOption, setSelectedFareOption] = useState<'best_price' | 'base_plus_toll_state'>('best_price');

  const handleSelectFareOption = (mode: 'best_price' | 'base_plus_toll_state') => {
    setSelectedFareOption(mode);
    if (onToggleIncludeTolls) {
      onToggleIncludeTolls(true);
    }
  };

  // Sample route calculation using Sedan to display route-level highway & multi-state tax intelligence in header
  const sampleRouteFare = computeTripFare({
    tripType,
    cabId: 'sedan',
    distanceKm,
    pickupCity,
    dropCity,
    pickupDate,
    returnDate,
    localPackageId,
    includeTolls: true
  });

  const getCategoryTitle = (cab: CabVehicle) => {
    switch (cab.id) {
      case 'sedan':
        return 'Sedan AC - Dzire / Etios';
      case 'hatchback':
        return 'Hatchback AC - WagonR / Celerio';
      case 'suv':
        return 'SUV AC (6+1) - Ertiga / Carens';
      case 'innova':
        return 'Assured Innova Crysta (7+1)';
      case 'exec_sedan':
        return 'Prime Sedan - Honda City / Ciaz';
      case 'tempo':
        return 'Tempo Traveller AC (12+1 Seater)';
      default:
        return cab.name;
    }
  };

  const durationText = travelDuration || '3 hrs 45 mins';
  const routeHeaderTitle =
    tripType === 'local'
      ? `Local Rental in ${pickupCity} | Package: ${
          localPackageId === '4h_40k'
            ? '40 KM · 4 Hrs'
            : localPackageId === '12h_120k'
            ? '120 KM · 12 Hrs'
            : '80 KM · 8 Hrs'
        }`
      : `${pickupCity} ➔ ${dropCity} | Road Distance: ${distanceKm} KM | Est. Time: ${durationText}`;

  return (
    <div className="space-y-5" id="available-cabs-section">
      {/* 1. SAFARINDIACABS ROUTE INTELLIGENCE & TOLL MODE BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <Navigation className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-black text-[#0F172A] tracking-tight">
                {routeHeaderTitle}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap">
                <span className="text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {tripType === 'oneway'
                      ? 'SafarIndiaCabs Zero Return Fare (Save up to 42%)'
                      : tripType === 'roundtrip'
                      ? `Round Trip (${sampleRouteFare.daysCount} Day${sampleRouteFare.daysCount > 1 ? 's' : ''} · Min 250 KM/Day)`
                      : 'All-Inclusive City Package'}
                  </span>
                </span>

                {tripType !== 'local' && (
                  <span className="bg-slate-100 text-slate-800 font-semibold px-2.5 py-0.5 rounded-md border border-slate-200">
                    🛣️ {sampleRouteFare.expresswayName}
                  </span>
                )}

                {sampleRouteFare.isInterState ? (
                  <span className="bg-amber-50 text-amber-900 font-semibold px-2.5 py-0.5 rounded-md border border-amber-200">
                    🛂 {sampleRouteFare.stateRoutePath.join(' ➔ ')} ({sampleRouteFare.statePermitBreakdown.length} State Permit{sampleRouteFare.statePermitBreakdown.length > 1 ? 's' : ''} Auto-Included)
                  </span>
                ) : (
                  tripType !== 'local' && (
                    <span className="bg-blue-50 text-blue-800 font-semibold px-2.5 py-0.5 rounded-md border border-blue-200">
                      ✅ Within {sampleRouteFare.originState} (₹0 State Entry Tax)
                    </span>
                  )
                )}

                {sampleRouteFare.isHillRoute && (
                  <span className="bg-purple-50 text-purple-800 font-semibold px-2.5 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-purple-600" />
                    <span>Hill Station AC Drive Included</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[#0F172A]">Free cancellation up to 6 hrs prior</span>
          </div>
        </div>

        {/* SafarIndiaCabs Fare Options: Best Price (Toll + State Tax Included) & Base Fare + Toll + State Tax */}
        {tripType !== 'local' && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
              <span>SafarIndiaCabs All-Inclusive Fare Option:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleSelectFareOption('best_price')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedFareOption === 'best_price'
                    ? 'bg-[#F59E0B] text-slate-950 shadow-2xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Best Price (Toll + State Tax Included)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectFareOption('base_plus_toll_state')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedFareOption === 'base_plus_toll_state'
                    ? 'bg-[#F59E0B] text-slate-950 shadow-2xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Base Fare + Toll + State Tax</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. SAFARINDIACABS TRANSPARENT CAB CARDS */}
      <div className="space-y-4">
        {CABS_FLEET.map((cab) => {
          const fare = computeTripFare({
            tripType,
            cabId: cab.id,
            distanceKm,
            pickupCity,
            dropCity,
            pickupDate,
            returnDate,
            localPackageId,
            includeTolls: true
          });

          const baseFareWithoutTolls = Math.max(0, fare.totalFare - fare.tollsAndTaxes);

          return (
            <div
              key={cab.id}
              className={`bg-white border rounded-2xl p-5 sm:p-6 transition-all shadow-sm hover:shadow-md relative ${
                cab.popular
                  ? 'border-amber-400 ring-2 ring-amber-400/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {cab.popular && (
                <div className="absolute -top-3 left-6 bg-[#F59E0B] text-slate-950 text-[10px] font-black uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-950 fill-current" />
                  <span>{cab.category}</span>
                </div>
              )}

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Left Side: Vehicle Name, Models, Seats/Bags Badges & SafarIndiaCabs Specs */}
                <div className="space-y-3 flex-1">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-black text-[#0F172A] tracking-tight">
                        {getCategoryTitle(cab)}
                      </h3>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Save {fare.savingsPercent}% ({formatINR(fare.savingsAmount)} OFF)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {cab.models}
                    </p>
                  </div>

                  {/* Seats | Bags | AC | Best Price Toll + State Tax Included Badge */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{cab.capacityPassengers} Seats</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      <span>{cab.capacityLuggage} Bags</span>
                    </span>

                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                      <Snowflake className="w-3.5 h-3.5 text-emerald-600" />
                      <span>AC Cab</span>
                    </span>

                    <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Best Price (Toll + State Tax Included)</span>
                    </span>
                  </div>

                  {/* SafarIndiaCabs Signature Spec Grid: Included Km | Extra Fare/Km | Base Fare | Toll + State Tax */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold block">Included Km</span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {fare.billedDistanceKm} Km
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold block">Extra Fare/Km</span>
                      <span className="text-xs font-extrabold text-slate-900">
                        ₹{fare.extraKmRate}/Km
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold block">Base Fare</span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatINR(baseFareWithoutTolls)}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Toll + State Tax
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700">
                        Included ({formatINR(fare.tollsAndTaxes)})
                      </span>
                    </div>
                  </div>

                  {/* Direct Base Fare + Toll + State Tax & Multi-State Permit Auto-Deduct Strip */}
                  {tripType !== 'local' && (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2 space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900">
                          Base Fare ({formatINR(baseFareWithoutTolls)}) + Toll ({formatINR(fare.highwayToll)}) + State Tax ({formatINR(fare.statePermitTax)})
                        </span>
                        <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          = {formatINR(fare.totalFare)} (All Included ✓)
                        </span>
                      </div>

                      {fare.statePermitBreakdown.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-200/60 text-[11px]">
                          <span className="font-bold text-slate-700">
                            🛂 State Tax Auto-Deducted ({fare.stateRoutePath.join(' ➔ ')}):
                          </span>
                          {fare.statePermitBreakdown.map((perm, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-white border border-amber-200 text-slate-800 px-2 py-0.5 rounded-md font-bold text-[10px]"
                            >
                              <span>
                                {perm.state} ({perm.role === 'transit' ? 'Transit' : 'Destination'}):
                              </span>
                              <span className="font-mono text-emerald-700">{formatINR(perm.taxAmount)} ✓</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Side: Crossed-Out MRP + Final Fare + Per KM Rate + Book Cab CTA */}
                <div className="flex items-center lg:items-end justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  <div className="text-left lg:text-right space-y-0.5">
                    <div className="text-xs text-slate-400 line-through font-mono font-bold">
                      {formatINR(fare.originalMarketFare)}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
                      {formatINR(fare.totalFare)}
                    </div>
                    <div className="flex items-center gap-1.5 lg:justify-end flex-wrap">
                      <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono text-[11px]">
                        ₹{fare.ratePerKm}/km
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        (Toll + State Tax Incl.)
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-bold pt-0.5">
                      Book @ {formatINR(fare.advanceFare)} (20% Advance)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCab(cab, fare)}
                    className="py-3.5 px-6 sm:px-7 rounded-xl bg-[#F59E0B] hover:bg-amber-500 text-slate-950 font-black text-sm sm:text-base tracking-wide transition shadow-sm hover:shadow active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Book Cab</span>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
