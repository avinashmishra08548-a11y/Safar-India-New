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
  ShieldCheck,
  Receipt,
  Mountain,
  X
} from 'lucide-react';
import { CabVehicle, TripType } from '../types';
import { CABS_FLEET, INCLUSIONS_EXCLUSIONS } from '../data/cabsFleet';
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
  const [localIncludeTolls, setLocalIncludeTolls] = useState<boolean>(includeTolls);
  const [selectedCabForInfo, setSelectedCabForInfo] = useState<{
    cab: CabVehicle;
    fare: FareCalculationResult;
  } | null>(null);

  const effectiveIncludeTolls =
    onToggleIncludeTolls !== undefined ? includeTolls : localIncludeTolls;

  const handleTollModeChange = (val: boolean) => {
    setLocalIncludeTolls(val);
    if (onToggleIncludeTolls) {
      onToggleIncludeTolls(val);
    }
  };

  // Sample route calculation using Sedan to display route-level highway & state tax intelligence in header
  const sampleRouteFare = computeTripFare({
    tripType,
    cabId: 'sedan',
    distanceKm,
    pickupCity,
    dropCity,
    pickupDate,
    returnDate,
    localPackageId,
    includeTolls: effectiveIncludeTolls
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
      {/* 1. CABBAZAR ROUTE INTELLIGENCE & TOLL MODE BAR */}
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
                      ? 'CabBazar Zero Return Fare (Save up to 42%)'
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
                    🛂 {sampleRouteFare.originState} ➔ {sampleRouteFare.destState} Border Permit
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

        {/* CabBazar Style Pricing Mode Switcher: All-Inclusive vs Base Fare (Tolls at Actuals) */}
        {tripType !== 'local' && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Select CabBazar Toll &amp; State Tax Fare Mode:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleTollModeChange(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  effectiveIncludeTolls
                    ? 'bg-[#F59E0B] text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Best Price (Toll + State Tax Included)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTollModeChange(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  !effectiveIncludeTolls
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Base Fare (Pay Toll at Actuals)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. CABBAZAR-STYLE TRANSPARENT CAB CARDS */}
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
            includeTolls: effectiveIncludeTolls
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
                {/* Left Side: Vehicle Name, Models, Seats/Bags Badges & CabBazar 4-Pillar Fare Specs */}
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

                  {/* Seats | Bags | AC | Fare Breakup Link */}
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

                    <button
                      type="button"
                      onClick={() => setSelectedCabForInfo({ cab, fare })}
                      className="text-xs text-amber-700 hover:text-amber-800 underline underline-offset-4 font-bold ml-1 inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-amber-600" />
                      <span>Fare Breakup &amp; Inclusions</span>
                    </button>
                  </div>

                  {/* CabBazar Signature Spec Grid: Included Km | Extra Fare/Km | Driver Charges | Night & Toll */}
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
                      <span className="text-[10px] text-slate-500 font-semibold block">Driver &amp; Night</span>
                      <span className="text-xs font-extrabold text-emerald-700">
                        Included (₹0 Extra)
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-500 font-semibold block">Toll &amp; State Tax</span>
                      {effectiveIncludeTolls ? (
                        <span className="text-xs font-extrabold text-emerald-700">
                          Included ({formatINR(fare.tollsAndTaxes)})
                        </span>
                      ) : (
                        <span className="text-xs font-extrabold text-amber-700">
                          Extra (Est. {formatINR(fare.estimatedTollsAndTaxes)})
                        </span>
                      )}
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
                        (Incl. 5% GST)
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

      {/* 3. CABBAZAR DETAILED FARE BREAKUP & INCLUSIONS MODAL */}
      {selectedCabForInfo && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCabForInfo(null);
          }}
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-black text-amber-600 block">
                  CabBazar Transparent Fare Sheet
                </span>
                <h4 className="text-base font-extrabold text-[#0F172A]">
                  {selectedCabForInfo.cab.name}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedCabForInfo.cab.models}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCabForInfo(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Itemized CabBazar Fare Components */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">
                  Included Package Distance ({selectedCabForInfo.fare.billedDistanceKm} KM × ₹
                  {selectedCabForInfo.fare.ratePerKm}/km):
                </span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {formatINR(
                    selectedCabForInfo.fare.baseFare - selectedCabForInfo.fare.hillStationCharge
                  )}
                </span>
              </div>

              {selectedCabForInfo.fare.hillStationCharge > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-600">Hill Terrain &amp; Ghat AC Allowance:</span>
                  <span className="font-mono font-bold text-[#0F172A]">
                    {formatINR(selectedCabForInfo.fare.hillStationCharge)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">
                  Driver Allowance / Bata ({selectedCabForInfo.fare.daysCount} Day
                  {selectedCabForInfo.fare.daysCount > 1 ? 's' : ''}):
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  Included ({formatINR(selectedCabForInfo.fare.driverAllowance)})
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Night Driving Charges (10 PM – 6 AM):</span>
                <span className="font-mono font-bold text-emerald-700">₹0 (Included)</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">
                  Highway FASTag Toll ({selectedCabForInfo.fare.expresswayName}):
                </span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {effectiveIncludeTolls
                    ? formatINR(selectedCabForInfo.fare.highwayToll)
                    : `At Actuals (Est. ${formatINR(selectedCabForInfo.fare.highwayToll)})`}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">
                  State Border Entry Permit ({selectedCabForInfo.fare.originState} ➔{' '}
                  {selectedCabForInfo.fare.destState}):
                </span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {selectedCabForInfo.fare.statePermitTax === 0
                    ? '₹0 (Same State)'
                    : effectiveIncludeTolls
                    ? formatINR(selectedCabForInfo.fare.statePermitTax)
                    : `At Actuals (Est. ${formatINR(selectedCabForInfo.fare.statePermitTax)})`}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">5% Commercial Transport GST:</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {formatINR(selectedCabForInfo.fare.gstAmount)}
                </span>
              </div>

              <div className="flex justify-between py-1.5 pt-2 text-sm font-black border-t border-slate-300">
                <span className="text-[#0F172A]">Total Payable Fare:</span>
                <span className="font-mono text-amber-600 text-base">
                  {formatINR(selectedCabForInfo.fare.totalFare)}
                </span>
              </div>

              <div className="flex justify-between py-1.5 text-xs bg-amber-50 p-2.5 rounded-xl text-slate-900 border border-amber-200">
                <span className="font-bold">Pay 20% Advance Now to Confirm:</span>
                <span className="font-mono font-black text-amber-800">
                  {formatINR(selectedCabForInfo.fare.advanceFare)}
                </span>
              </div>

              <div className="flex justify-between py-1 text-xs px-2 text-slate-600">
                <span>Balance Payable to Driver during Trip:</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {formatINR(selectedCabForInfo.fare.balanceDue)}
                </span>
              </div>
            </div>

            {/* Extra KM & Waiting Rules */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 text-xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>CabBazar Extra Usage Policy</span>
              </div>
              <p className="text-[11px] text-slate-600">
                • Extra distance beyond <strong>{selectedCabForInfo.fare.billedDistanceKm} KM</strong> is
                charged at <strong>₹{selectedCabForInfo.fare.extraKmRate}/KM</strong>.
              </p>
              <p className="text-[11px] text-slate-600">
                • Free pickup waiting up to 45 mins; thereafter ₹{selectedCabForInfo.fare.extraHourRate}/hr.
              </p>
            </div>

            {/* Inclusions & Exclusions */}
            <div className="space-y-2 text-xs text-slate-600">
              <div className="font-bold text-[#0F172A] flex items-center gap-1 text-[11px] uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inclusions &amp; Terms</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-600 list-disc pl-4">
                {INCLUSIONS_EXCLUSIONS.inclusions.map((inc, i) => (
                  <li key={i}>{inc}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedCabForInfo(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = selectedCabForInfo;
                  setSelectedCabForInfo(null);
                  onSelectCab(chosen.cab, chosen.fare);
                }}
                className="flex-1 py-2.5 bg-[#F59E0B] hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Proceed to Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
