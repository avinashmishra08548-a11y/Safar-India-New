import React, { useState, useEffect } from 'react';
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
  includeTolls,
  onToggleIncludeTolls,
  onSelectCab
}) => {
  const [tollIncludedMode, setTollIncludedMode] = useState<boolean>(includeTolls ?? true);

  useEffect(() => {
    if (typeof includeTolls === 'boolean') {
      setTollIncludedMode(includeTolls);
    }
  }, [includeTolls]);

  const handleTollModeChange = (include: boolean) => {
    setTollIncludedMode(include);
    if (onToggleIncludeTolls) {
      onToggleIncludeTolls(include);
    }
  };

  // Sample route calculation using Sedan for route header summary
  const sampleRouteFare = computeTripFare({
    tripType,
    cabId: 'sedan',
    distanceKm,
    pickupCity,
    dropCity,
    pickupDate,
    returnDate,
    localPackageId,
    includeTolls: tollIncludedMode
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
      {/* 1. SAFARINDIACABS ROUTE HEADER & 2-OPTION TOLL/TAX FARE SWITCHER */}
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

                <span
                  className={`font-bold px-2.5 py-0.5 rounded-md border ${
                    sampleRouteFare.leadTimeTier === 'advance'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : sampleRouteFare.leadTimeTier === 'same_day'
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}
                >
                  {sampleRouteFare.leadTimeLabel}
                </span>

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

        {/* SafarIndiaCabs 2-Option Toggle: Include Toll + State Tax OR Toll + State Tax Extra (Alag Se) */}
        {tripType !== 'local' && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Select Fare Option:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleTollModeChange(true)}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  tollIncludedMode
                    ? 'bg-[#F59E0B] text-slate-950 shadow-2xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Best Price (Toll + State Tax Included)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTollModeChange(false)}
                className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  !tollIncludedMode
                    ? 'bg-[#0F172A] text-white shadow-2xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <span>Base Fare (Toll + State Tax Extra)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. SAFARINDIACABS CAB CARDS (CLEAN DESIGN WITHOUT TOLL/TAX AMOUNT BREAKDOWN) */}
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
            includeTolls: tollIncludedMode
          });

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
                {/* Left Side: Vehicle Name, Models, Seats/Bags Badges & Clean Specs */}
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

                  {/* Seats | Bags | AC | Toll & State Tax Status Badge */}
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

                    {tripType !== 'local' && (
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg border ${
                          tollIncludedMode
                            ? 'text-emerald-900 bg-emerald-50 border-emerald-200'
                            : 'text-amber-900 bg-amber-50 border-amber-200'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            tollIncludedMode ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        />
                        <span>
                          {tollIncludedMode
                            ? 'Best Price (Toll + State Tax Included)'
                            : 'Base Fare (Toll + State Tax Extra)'}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Clean 4-Box Spec Grid (No Toll/Tax ₹ Amount Shown) */}
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
                      <span className="text-[10px] text-slate-500 font-semibold block">Driver Allowance</span>
                      <span className="text-xs font-extrabold text-emerald-700">
                        Included ✓
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold block">
                        Toll &amp; State Tax
                      </span>
                      <span
                        className={`text-xs font-extrabold ${
                          tripType === 'local'
                            ? 'text-slate-700'
                            : tollIncludedMode
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {tripType === 'local'
                          ? 'City Package'
                          : tollIncludedMode
                          ? 'Included ✓'
                          : 'Extra (Alag Se)'}
                      </span>
                    </div>
                  </div>
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
                        {tripType === 'local'
                          ? '(All Inclusive)'
                          : tollIncludedMode
                          ? '(Toll + State Tax Incl.)'
                          : '(Toll + State Tax Extra)'}
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
