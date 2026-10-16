import React from 'react';
import { ArrowRight, MapPin, Clock, Fuel, Sparkles } from 'lucide-react';
import { POPULAR_ROUTES, PopularRouteDeal } from '../data/indianCities';
import { formatINR } from '../utils/fareCalculator';

interface PopularRoutesSectionProps {
  onSelectRoute: (route: PopularRouteDeal) => void;
}

export const PopularRoutesSection: React.FC<PopularRoutesSectionProps> = ({ onSelectRoute }) => {
  return (
    <section className="space-y-4 py-4" id="popular-routes-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
            <span>Popular Intercity Cab Routes</span>
            <span className="text-[11px] bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
              Guaranteed Low Fares
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Book verified one-way and round-trip outstation cabs with zero return fare.
          </p>
        </div>
        <div className="text-xs text-slate-400 hidden sm:block">
          Click any route to instantly get cab quotes
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {POPULAR_ROUTES.map((route, idx) => (
          <div
            key={idx}
            onClick={() => onSelectRoute(route)}
            className="bg-slate-900 border border-slate-800 hover:border-amber-400/60 rounded-2xl p-4 transition-all duration-200 cursor-pointer hover:shadow-xl hover:shadow-amber-500/5 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                <span className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-amber-400 font-semibold">
                  {route.badge}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {route.duration}
                </span>
              </div>

              {/* Route */}
              <div className="space-y-1">
                <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>{route.from}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                  <span>{route.to}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>{route.distanceKm} KM Highway Route</span>
                  <span>·</span>
                  <span>{route.popularCar}</span>
                </div>
              </div>
            </div>

            {/* Price row */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Fares Starting From</span>
                <span className="text-base font-black text-amber-400">{formatINR(route.startingPrice)}</span>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-slate-200 group-hover:text-amber-400 flex items-center gap-1 transition"
              >
                <span>Book Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
