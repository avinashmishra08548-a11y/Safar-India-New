import React, { useState } from 'react';
import { 
  Users, 
  Briefcase, 
  Snowflake, 
  CheckCircle2, 
  Info, 
  ShieldCheck, 
  ChevronRight, 
  Sparkles,
  Fuel
} from 'lucide-react';
import { CabCategoryId, CabVehicle, TripType } from '../types';
import { CABS_FLEET, INCLUSIONS_EXCLUSIONS } from '../data/cabsFleet';
import { computeTripFare, formatINR } from '../utils/fareCalculator';

interface CabSelectorProps {
  tripType: TripType;
  pickupCity: string;
  dropCity: string;
  distanceKm: number;
  pickupDate: string;
  returnDate: string;
  localPackageId: string;
  includeTolls: boolean;
  onSelectCab: (cab: CabVehicle, fareDetails: any) => void;
}

export const CabSelector: React.FC<CabSelectorProps> = ({
  tripType,
  pickupCity,
  dropCity,
  distanceKm,
  pickupDate,
  returnDate,
  localPackageId,
  includeTolls,
  onSelectCab
}) => {
  const [selectedCabForInfo, setSelectedCabForInfo] = useState<CabVehicle | null>(null);

  return (
    <div className="space-y-4" id="available-cabs-section">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span>Available Cabs & Instant Fares</span>
            <span className="text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
              {CABS_FLEET.length} Cab Classes
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            {tripType === 'local' ? 'Local City Rental' : `${pickupCity} to ${dropCity} (${distanceKm} KM)`} · All fares include Driver Allowance, Fuel & AC
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> No Hidden Fees
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Sanitized Cabs
          </span>
        </div>
      </div>

      {/* Fleet Cards Grid */}
      <div className="space-y-4">
        {CABS_FLEET.map((cab) => {
          const fare = computeTripFare({
            tripType,
            cabId: cab.id,
            distanceKm,
            pickupDate,
            returnDate,
            localPackageId,
            includeTolls
          });

          // Original strike price ~15% higher for realistic discount demonstration
          const strikethroughPrice = Math.round(fare.totalFare * 1.15);

          return (
            <div
              key={cab.id}
              className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all relative ${
                cab.popular
                  ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 bg-slate-900/90'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {cab.popular && (
                <div className="absolute -top-3 left-4 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Most Popular Choice</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Left: Cab Info & Model Specs */}
                <div className="md:col-span-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{cab.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {cab.models}
                  </p>

                  {/* Badges for Seats & Luggage */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
                    <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>{cab.capacityPassengers} Seats</span>
                    </span>
                    <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                      <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                      <span>{cab.capacityLuggage} Bags</span>
                    </span>
                    <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md border border-slate-800 text-emerald-400">
                      <Snowflake className="w-3.5 h-3.5" />
                      <span>Chilled AC</span>
                    </span>
                  </div>

                  {/* Highlights list */}
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    <span>₹{cab.ratePerKm}/KM Base Rate</span>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCabForInfo(cab)}
                      className="text-amber-400 hover:text-amber-300 underline font-medium"
                    >
                      View Inclusions
                    </button>
                  </div>
                </div>

                {/* Center: Inclusions & CabBazar Guarantees */}
                <div className="md:col-span-4 border-t md:border-t-0 md:border-l md:border-r border-slate-800/80 md:px-4 py-2 md:py-0 space-y-1.5 text-xs text-slate-300">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Fare Includes:
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Fuel charges & Driver Allowance (DA)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{includeTolls ? 'State Taxes & Highway Tolls Included' : 'Tolls excluded (pay at plaza)'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Free cancellation up to 6 hours before pickup</span>
                  </div>
                </div>

                {/* Right: Price & CTA */}
                <div className="md:col-span-4 flex flex-row md:flex-col justify-between md:justify-center md:items-end items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <div className="text-left md:text-right">
                    <div className="flex items-center gap-2 justify-start md:justify-end">
                      <span className="text-xs text-slate-500 line-through">
                        {formatINR(strikethroughPrice)}
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-white">
                        {formatINR(fare.totalFare)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Total Estimated Fare (incl. 5% GST)
                    </div>

                    {/* 20% Advance Highlight */}
                    <div className="mt-1 flex items-center gap-1.5 justify-start md:justify-end">
                      <span className="text-[10px] text-slate-400 uppercase font-medium">Pay 20% Advance:</span>
                      <span className="text-xs font-black text-amber-400">
                        {formatINR(fare.advanceFare)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCab(cab, fare)}
                    className="py-2.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 shrink-0"
                  >
                    <span>Book Cab</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Inclusions / Exclusions Modal */}
      {selectedCabForInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white">{selectedCabForInfo.name}</h4>
                <p className="text-xs text-amber-400 font-medium">₹{selectedCabForInfo.ratePerKm}/KM · {selectedCabForInfo.category}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCabForInfo(null)}
                className="text-slate-400 hover:text-white text-sm bg-slate-800 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Inclusions */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>What is Included in Fare:</span>
              </h5>
              <ul className="text-xs text-slate-300 space-y-1.5 pl-2">
                {INCLUSIONS_EXCLUSIONS.inclusions.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Exclusions */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>Exclusions (Paid as applicable):</span>
              </h5>
              <ul className="text-xs text-slate-300 space-y-1.5 pl-2">
                {INCLUSIONS_EXCLUSIONS.exclusions.map((exc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{exc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCabForInfo(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
