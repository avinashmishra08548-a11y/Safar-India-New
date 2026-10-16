import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRightLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Navigation, 
  Plane, 
  ShieldCheck, 
  Car,
  ChevronDown,
  Info
} from 'lucide-react';
import { TripType } from '../types';
import { POPULAR_INDIAN_CITIES, estimateDistanceKm } from '../data/indianCities';
import { LOCAL_PACKAGES } from '../data/cabsFleet';

interface BookingEngineProps {
  tripType: TripType;
  setTripType: (t: TripType) => void;
  pickupCity: string;
  setPickupCity: (c: string) => void;
  dropCity: string;
  setDropCity: (c: string) => void;
  pickupDate: string;
  setPickupDate: (d: string) => void;
  pickupTime: string;
  setPickupTime: (t: string) => void;
  returnDate: string;
  setReturnDate: (d: string) => void;
  returnTime: string;
  setReturnTime: (t: string) => void;
  localPackageId: string;
  setLocalPackageId: (id: string) => void;
  airportMode: 'pickup' | 'drop';
  setAirportMode: (m: 'pickup' | 'drop') => void;
  airportTerminal: string;
  setAirportTerminal: (t: string) => void;
  includeTolls: boolean;
  setIncludeTolls: (b: boolean) => void;
  distanceKm: number;
  onExploreCabs: () => void;
}

export const BookingEngine: React.FC<BookingEngineProps> = ({
  tripType,
  setTripType,
  pickupCity,
  setPickupCity,
  dropCity,
  setDropCity,
  pickupDate,
  setPickupDate,
  pickupTime,
  setPickupTime,
  returnDate,
  setReturnDate,
  returnTime,
  setReturnTime,
  localPackageId,
  setLocalPackageId,
  airportMode,
  setAirportMode,
  airportTerminal,
  setAirportTerminal,
  includeTolls,
  setIncludeTolls,
  distanceKm,
  onExploreCabs
}) => {
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<string[]>([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropDropdown, setShowDropDropdown] = useState(false);

  const pickupRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickupRef.current && !pickupRef.current.contains(e.target as Node)) {
        setShowPickupDropdown(false);
      }
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDropDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filterSuggestions = (query: string): string[] => {
    if (!query || query.trim().length === 0) {
      return POPULAR_INDIAN_CITIES.slice(0, 7).map(c => c.name);
    }
    const q = query.toLowerCase();
    return POPULAR_INDIAN_CITIES
      .filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
      .slice(0, 7)
      .map(c => c.name);
  };

  const handleSwapCities = () => {
    if (tripType === 'local') return;
    const temp = pickupCity;
    setPickupCity(dropCity);
    setDropCity(temp);
  };

  // Quick Time Slots
  const timeSlots = [
    '05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', 
    '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', 
    '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM', '11:00 PM'
  ];

  // Calculate day difference for round trip
  let roundTripDays = 1;
  if (tripType === 'roundtrip' && pickupDate && returnDate) {
    const p = new Date(pickupDate).getTime();
    const r = new Date(returnDate).getTime();
    roundTripDays = Math.max(1, Math.ceil((r - p) / (1000 * 60 * 60 * 24)) + 1);
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl relative">
      
      {/* Trip Type Tabs (Segmented Control) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950 rounded-xl mb-5 border border-slate-800/80">
        <button
          type="button"
          onClick={() => setTripType('oneway')}
          className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center ${
            tripType === 'oneway'
              ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          One-Way Outstation
        </button>
        <button
          type="button"
          onClick={() => setTripType('roundtrip')}
          className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center ${
            tripType === 'roundtrip'
              ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Round-Trip
        </button>
        <button
          type="button"
          onClick={() => setTripType('local')}
          className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center ${
            tripType === 'local'
              ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Local Hourly Rental
        </button>
        <button
          type="button"
          onClick={() => setTripType('airport')}
          className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap text-center ${
            tripType === 'airport'
              ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Airport Transfer
        </button>
      </div>

      {/* Airport Sub-selector if airport tab */}
      {tripType === 'airport' && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setAirportMode('drop')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              airportMode === 'drop' ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Going to Airport (Drop)
          </button>
          <button
            type="button"
            onClick={() => setAirportMode('pickup')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              airportMode === 'pickup' ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            Arriving at Airport (Pickup)
          </button>
        </div>
      )}

      {/* Main Location & Date Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Pickup Location */}
        <div className="relative" ref={pickupRef}>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {tripType === 'airport' && airportMode === 'pickup' ? 'Airport Terminal Pickup' : 'Pickup City / Address'}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-amber-400 pointer-events-none">
              <Navigation className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={pickupCity}
              onChange={(e) => {
                setPickupCity(e.target.value);
                setPickupSuggestions(filterSuggestions(e.target.value));
                setShowPickupDropdown(true);
              }}
              onFocus={() => {
                setPickupSuggestions(filterSuggestions(pickupCity));
                setShowPickupDropdown(true);
              }}
              placeholder="e.g. Delhi NCR, Mumbai, Jaipur"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showPickupDropdown && pickupSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
              {pickupSuggestions.map((city) => (
                <div
                  key={city}
                  onClick={() => {
                    setPickupCity(city);
                    setShowPickupDropdown(false);
                  }}
                  className="px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-900 hover:text-amber-400 cursor-pointer flex items-center gap-2 border-b border-slate-900 last:border-b-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{city}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drop Location or Package selector */}
        {tripType === 'local' ? (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Hourly Package
            </label>
            <div className="relative">
              <select
                value={localPackageId}
                onChange={(e) => setLocalPackageId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 appearance-none cursor-pointer"
              >
                {LOCAL_PACKAGES.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.description})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        ) : (
          <div className="relative" ref={dropRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {tripType === 'airport' && airportMode === 'drop' ? 'Airport Destination' : 'Destination / Drop City'}
              </label>
              <button
                type="button"
                onClick={handleSwapCities}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Swap</span>
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-rose-400 pointer-events-none">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={dropCity}
                onChange={(e) => {
                  setDropCity(e.target.value);
                  setDropSuggestions(filterSuggestions(e.target.value));
                  setShowDropDropdown(true);
                }}
                onFocus={() => {
                  setDropSuggestions(filterSuggestions(dropCity));
                  setShowDropDropdown(true);
                }}
                placeholder="e.g. Agra, Pune, Mysore"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Drop Suggestions */}
            {showDropDropdown && dropSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                {dropSuggestions.map((city) => (
                  <div
                    key={city}
                    onClick={() => {
                      setDropCity(city);
                      setShowDropDropdown(false);
                    }}
                    className="px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-900 hover:text-amber-400 cursor-pointer flex items-center gap-2 border-b border-slate-900 last:border-b-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{city}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Date and Time Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        
        {/* Pickup Date */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Pickup Date
          </label>
          <div className="relative">
            <input
              type="date"
              min={todayStr}
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition"
            />
          </div>
        </div>

        {/* Pickup Time */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Pickup Time
          </label>
          <select
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition cursor-pointer"
          >
            {timeSlots.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>

        {/* Return Date (if roundtrip) */}
        {tripType === 'roundtrip' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Return Date
                </label>
                <span className="text-[10px] text-amber-400 font-semibold">{roundTripDays} Day{roundTripDays > 1 ? 's' : ''}</span>
              </div>
              <input
                type="date"
                min={pickupDate || todayStr}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Return Time
              </label>
              <select
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition cursor-pointer"
              >
                {timeSlots.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Airport Terminal info if airport */}
        {tripType === 'airport' && (
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Airport Terminal / Flight No.
            </label>
            <input
              type="text"
              value={airportTerminal}
              onChange={(e) => setAirportTerminal(e.target.value)}
              placeholder="e.g. Terminal 3 (T3), Flight 6E-204"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition"
            />
          </div>
        )}

      </div>

      {/* Distance and Route Information Bar */}
      <div className="mt-5 p-3.5 bg-slate-950 rounded-xl border border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">
              {tripType === 'local' ? 'City Rental Package' : 'Estimated One-Way Route Distance'}
            </div>
            <div className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>{tripType === 'local' ? (localPackageId === '4h_40k' ? '40 KM' : localPackageId === '12h_120k' ? '120 KM' : '80 KM') : `${distanceKm} KM`}</span>
              {tripType === 'roundtrip' && (
                <span className="text-xs text-slate-400 font-normal">
                  (Billed min {roundTripDays * 250} KM for {roundTripDays} days or actual 2-way)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tolls Inclusive Toggle (CabBazar benchmark transparency) */}
        <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition">
          <input
            type="checkbox"
            checked={includeTolls}
            onChange={(e) => setIncludeTolls(e.target.checked)}
            className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950"
          />
          <span className="font-semibold text-white">Include Highway Tolls & State Tax</span>
        </label>
      </div>

      {/* CTA Button */}
      <div className="mt-5">
        <button
          type="button"
          onClick={onExploreCabs}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm sm:text-base tracking-wide transition shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2"
        >
          <Car className="w-5 h-5 text-slate-950" />
          <span>Check Cab Rates & Availability</span>
        </button>
      </div>

    </div>
  );
};
