import React, { useState } from 'react';
import { 
  Users, 
  Briefcase, 
  Snowflake, 
  CheckCircle2, 
  Info, 
  ChevronRight, 
  Sparkles,
  Navigation,
  X
} from 'lucide-react';
import { CabVehicle, TripType } from '../types';
import { CABS_FLEET } from '../data/cabsFleet';
import { computeTripFare, formatINR } from '../utils/fareCalculator';

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
  onSelectCab: (cab: CabVehicle, fareDetails: any) => void;
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
  onSelectCab
}) => {
  const [selectedCabForInfo, setSelectedCabForInfo] = useState<{ cab: CabVehicle; fare: any } | null>(null);

  // Format clean vehicle category titles as requested (e.g., "Sedan AC - Dzire / Etios")
  const getCategoryTitle = (cab: CabVehicle) => {
    switch (cab.id) {
      case 'sedan':
        return 'Sedan AC - Dzire / Etios';
      case 'hatchback':
        return 'Hatchback AC - WagonR / Swift';
      case 'suv':
        return 'SUV AC - Ertiga / Carens';
      case 'innova':
        return 'Innova Crysta - Luxury 6/7 Seater';
      case 'exec_sedan':
        return 'Executive Sedan - City / Ciaz';
      default:
        return cab.name;
    }
  };

  // Format the Route Title
  const durationText = travelDuration || '4 hrs 29 mins';
  const routeHeaderTitle = tripType === 'local' 
    ? `Local Rental in ${pickupCity} | Package: ${localPackageId === '4h_40k' ? '40 KM · 4 Hrs' : localPackageId === '12h_120k' ? '120 KM · 12 Hrs' : '80 KM · 8 Hrs'}`
    : `${pickupCity} ➔ ${dropCity} | Total Distance: ${distanceKm} KM | Est. Time: ${durationText}`;

  return (
    <div className="space-y-6" id="available-cabs-section">
      
      {/* 1. PROMINENT ROUTE HEADER CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg lg:text-xl font-black text-[#0F172A] tracking-tight">
                {routeHeaderTitle}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Powered by Ola Maps API</span>
                </span>
                <span>·</span>
                <span>{tripType === 'roundtrip' ? 'Round Trip Billing' : tripType === 'local' ? 'Local City Rental' : 'Zero Return Fare'}</span>
                <span>·</span>
                <span>{includeTolls ? 'Tolls & State Taxes Included' : 'Tolls at Plaza'}</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[#0F172A]">Free cancellation up to 6 hrs prior</span>
          </div>
        </div>
      </div>

      {/* 2. SIMPLIFIED & KHULLA-KHULLA CAB CARDS */}
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

          return (
            <div
              key={cab.id}
              className={`bg-white border rounded-2xl p-6 sm:p-7 transition-all shadow-sm hover:shadow-md relative ${
                cab.popular
                  ? 'border-amber-400 ring-2 ring-amber-400/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {cab.popular && (
                <div className="absolute -top-3 left-6 bg-[#F59E0B] text-slate-950 text-[10px] font-black uppercase tracking-wider px-3.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-950 fill-current" />
                  <span>Most Popular Choice</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                
                {/* Left Side: Car Category Title + Key Badges */}
                <div className="space-y-2.5">
                  <h3 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">
                    {getCategoryTitle(cab)}
                  </h3>

                  {/* Clean Key Badges: "4 Seats | 3 Bags | AC" */}
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>{cab.capacityPassengers} Seats</span>
                    </span>

                    <span className="text-slate-300 font-bold">|</span>

                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                      <Briefcase className="w-4 h-4 text-slate-500" />
                      <span>{cab.capacityLuggage} Bags</span>
                    </span>

                    <span className="text-slate-300 font-bold">|</span>

                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/60">
                      <Snowflake className="w-4 h-4 text-emerald-600" />
                      <span>AC</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedCabForInfo({ cab, fare })}
                      className="text-xs text-slate-500 hover:text-amber-700 underline underline-offset-4 font-semibold ml-2 inline-flex items-center gap-1 transition"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      <span>Inclusions</span>
                    </button>
                  </div>
                </div>

                {/* Right Side: Price + Per KM + Single CTA Button: "Book Cab" */}
                <div className="flex items-center sm:items-end justify-between sm:justify-end gap-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right space-y-1">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F172A] tracking-tight">
                      {formatINR(fare.totalFare)}
                    </div>

                    <div className="flex items-center gap-1.5 sm:justify-end">
                      <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200/80 font-mono text-xs">
                        ₹{cab.ratePerKm}/km
                      </span>
                    </div>
                  </div>

                  {/* Single CTA Button: "Book Cab" in taxi gold/amber */}
                  <button
                    type="button"
                    onClick={() => onSelectCab(cab, fare)}
                    className="py-3 sm:py-3.5 px-6 sm:px-8 rounded-xl bg-[#F59E0B] hover:bg-amber-500 text-slate-950 font-black text-sm sm:text-base tracking-wide transition shadow-sm hover:shadow active:scale-95 flex items-center gap-1.5 shrink-0"
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

      {/* 3. OPTIONAL CLEAN INCLUSIONS MODAL */}
      {selectedCabForInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-[#0F172A]">{selectedCabForInfo.cab.name}</h4>
                <p className="text-xs text-amber-700 font-semibold font-mono">₹{selectedCabForInfo.cab.ratePerKm}/KM · {selectedCabForInfo.cab.models}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCabForInfo(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Itemized Fare Components */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Base Fare ({selectedCabForInfo.fare.billedDistanceKm} KM × ₹{selectedCabForInfo.cab.ratePerKm}):</span>
                <span className="font-mono font-bold text-[#0F172A]">{formatINR(selectedCabForInfo.fare.baseFare)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Chauffeur Allowance (DA):</span>
                <span className="font-mono font-bold text-[#0F172A]">{formatINR(selectedCabForInfo.fare.driverAllowance)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">State Highway Taxes & Tolls:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {selectedCabForInfo.fare.tollsAndTaxes > 0 ? formatINR(selectedCabForInfo.fare.tollsAndTaxes) : 'Included / Toll Plaza'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">5% Transport GST:</span>
                <span className="font-mono font-bold text-[#0F172A]">{formatINR(selectedCabForInfo.fare.gstAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 pt-2 text-sm font-black border-t border-slate-300">
                <span className="text-[#0F172A]">Total Price:</span>
                <span className="font-mono text-amber-600 text-base">{formatINR(selectedCabForInfo.fare.totalFare)}</span>
              </div>
              <div className="flex justify-between py-1 text-xs bg-white p-2 rounded-xl text-slate-700 border border-slate-200">
                <span>Pay 20% Advance to Lock Ride:</span>
                <span className="font-mono font-bold text-amber-700">{formatINR(selectedCabForInfo.fare.advanceFare)}</span>
              </div>
              <div className="flex justify-between py-1 text-xs px-2 text-slate-500">
                <span>Pay remaining on drop:</span>
                <span className="font-mono font-bold text-[#0F172A]">{formatINR(selectedCabForInfo.fare.balanceDue)}</span>
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="font-bold text-[#0F172A] flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inclusions</span>
              </div>
              <p className="text-[12px] leading-relaxed">
                Fuel, vehicle hire, sanitized AC car, verified driver, highway support, commercial permit & insurance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCabForInfo(null)}
              className="w-full py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
