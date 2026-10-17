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
  Fuel,
  Navigation,
  ArrowRight,
  Shield,
  FileText,
  Clock
} from 'lucide-react';
import { CabCategoryId, CabVehicle, TripType } from '../types';
import { CABS_FLEET, INCLUSIONS_EXCLUSIONS } from '../data/cabsFleet';
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

  // Format the Route Title: e.g. "Delhi NCR ➔ Agra | Total Distance: 228 KM (Via Ola Maps)"
  const routeTitle = tripType === 'local' 
    ? `Local Rental in ${pickupCity} (${localPackageId === '4h_40k' ? '40 KM / 4 Hrs' : localPackageId === '12h_120k' ? '120 KM / 12 Hrs' : '80 KM / 8 Hrs'})`
    : `${pickupCity} ➔ ${dropCity} | Total Distance: ${distanceKm} KM (Via Ola Maps)`;

  return (
    <div className="space-y-6" id="available-cabs-section">
      
      {/* 1. ROUTE HEADER ABOVE RESULTS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span className="uppercase tracking-wider font-mono">Verified Highway Route</span>
              <span>·</span>
              <span className="text-emerald-400 font-mono">Ola Maps Distance</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>{tripType === 'local' ? pickupCity : `${pickupCity} ➔ ${dropCity}`}</span>
              <span className="text-amber-400 font-mono font-bold text-lg sm:text-xl">
                ({distanceKm} KM{travelDuration ? ` · ~${travelDuration}` : ''})
              </span>
            </h2>

            <p className="text-xs text-slate-400">
              {tripType === 'roundtrip' 
                ? 'Round Trip Billing: Billed on two-way road distance with chauffeur night halt.' 
                : tripType === 'local' 
                ? 'Local City Package: AC sedan or SUV with driver allowance included.'
                : 'One-Way Cab: You pay ONLY for one-way road distance. Zero return fare guaranteed.'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0 bg-slate-950 px-3.5 py-2 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>No Hidden Charges</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sanitized AC Cabs</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. CAB CARDS LIST */}
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

          const strikethroughPrice = Math.round(fare.totalFare * 1.15);

          return (
            <div
              key={cab.id}
              className={`bg-slate-900 border rounded-3xl p-5 sm:p-6 transition-all relative ${
                cab.popular
                  ? 'border-amber-400/60 shadow-xl shadow-amber-500/10 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {cab.popular && (
                <div className="absolute -top-3 left-6 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-950 fill-current" />
                  <span>Most Popular Choice</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                
                {/* Left Column: Vehicle Name, Model, and Specs */}
                <div className="lg:col-span-4 space-y-2.5">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                      <span>{cab.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {cab.models}
                    </p>
                  </div>

                  {/* Clean Metadata Specs */}
                  <div className="flex items-center gap-2.5 text-xs text-slate-300 flex-wrap">
                    <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>{cab.capacityPassengers} Seats</span>
                    </span>
                    <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                      <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                      <span>{cab.capacityLuggage} Bags</span>
                    </span>
                    <span className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-emerald-400">
                      <Snowflake className="w-3.5 h-3.5" />
                      <span>Chilled AC</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 pt-0.5">
                    <span className="font-mono text-amber-400 font-bold">₹{cab.ratePerKm} / KM</span>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCabForInfo({ cab, fare })}
                      className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 flex items-center gap-1 text-[11px]"
                    >
                      <FileText className="w-3 h-3" />
                      <span>View Tax & Fare Breakdown</span>
                    </button>
                  </div>
                </div>

                {/* Center Column: Transparent Inclusions Checklist */}
                <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l lg:border-r border-slate-800 lg:px-5 py-3 lg:py-0 space-y-2 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Transparent Fare Inclusions:
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Fuel charges included ({distanceKm} KM road coverage)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Chauffeur Allowance (DA) included</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{includeTolls ? 'State Highway Taxes & Tolls included' : 'Tolls excluded (pay at toll plaza)'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>5% GST Included · Free cancellation up to 6 hrs</span>
                  </div>
                </div>

                {/* Right Column: Pricing & Book CTA */}
                <div className="lg:col-span-4 flex flex-row lg:flex-col justify-between lg:justify-center lg:items-end items-center gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                  <div className="text-left lg:text-right">
                    <div className="flex items-center gap-2 justify-start lg:justify-end">
                      <span className="text-xs text-slate-500 line-through">
                        {formatINR(strikethroughPrice)}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {formatINR(fare.totalFare)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Total Estimated Price (All Inclusive)
                    </div>

                    {/* 20% Advance Breakdown */}
                    <div className="mt-1 flex items-center gap-1.5 justify-start lg:justify-end text-xs">
                      <span className="text-[11px] text-slate-400">Pay 20% Deposit:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {formatINR(fare.advanceFare)}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Pay rest {formatINR(fare.balanceDue)} to driver on trip
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCab(cab, fare)}
                    className="py-3 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-amber-500/10 flex items-center gap-2 shrink-0 active:scale-95"
                  >
                    <span>Book Cab</span>
                    <ChevronRight className="w-4 h-4 text-slate-950" />
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* 3. TRANSPARENT FARE BREAKDOWN MODAL */}
      {selectedCabForInfo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-white">{selectedCabForInfo.cab.name}</h4>
                <p className="text-xs text-amber-400 font-mono">₹{selectedCabForInfo.cab.ratePerKm}/KM · {routeTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCabForInfo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Itemized Fare Components */}
            <div className="space-y-2 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Base Fare ({selectedCabForInfo.fare.billedDistanceKm} KM × ₹{selectedCabForInfo.cab.ratePerKm}):</span>
                <span className="font-mono font-bold text-white">{formatINR(selectedCabForInfo.fare.baseFare)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">Driver Allowance (DA):</span>
                <span className="font-mono font-bold text-white">{formatINR(selectedCabForInfo.fare.driverAllowance)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">State Highway Taxes & Tolls:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedCabForInfo.fare.tollsAndTaxes > 0 ? formatINR(selectedCabForInfo.fare.tollsAndTaxes) : 'Included / Plaza'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-400">5% Transport GST:</span>
                <span className="font-mono font-bold text-white">{formatINR(selectedCabForInfo.fare.gstAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 pt-2 text-sm font-black border-t border-slate-800">
                <span className="text-white">Total Final Price:</span>
                <span className="font-mono text-amber-400 text-base">{formatINR(selectedCabForInfo.fare.totalFare)}</span>
              </div>
              <div className="flex justify-between py-1 text-xs bg-slate-900/80 p-2 rounded-xl text-slate-300">
                <span>Advance Required to Lock Ride (20%):</span>
                <span className="font-mono font-bold text-amber-400">{formatINR(selectedCabForInfo.fare.advanceFare)}</span>
              </div>
              <div className="flex justify-between py-1 text-xs px-2 text-slate-400">
                <span>Balance Payable to Chauffeur on Drop:</span>
                <span className="font-mono font-bold text-slate-200">{formatINR(selectedCabForInfo.fare.balanceDue)}</span>
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-1.5">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Trip Inclusions:</span>
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed pl-1">
                Fuel, vehicle hire, sanitized AC car, driver allowance, 24/7 highway support, and commercial transport insurance.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCabForInfo(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
