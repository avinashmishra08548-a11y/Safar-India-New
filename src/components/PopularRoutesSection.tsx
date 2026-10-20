import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { POPULAR_ROUTES, PopularRouteDeal } from '../data/indianCities';
import { formatINR } from '../utils/fareCalculator';

interface PopularRoutesSectionProps {
  onSelectRoute: (route: PopularRouteDeal) => void;
}

export const PopularRoutesSection: React.FC<PopularRoutesSectionProps> = ({ onSelectRoute }) => {
  return (
    <section className="space-y-6 py-8" id="popular-routes-section">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Popular Outstation Routes
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tap any route for instant one-way and round-trip fares.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {POPULAR_ROUTES.map((route, idx) => (
          <div
            key={idx}
            onClick={() => onSelectRoute(route)}
            className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span className="text-amber-700 font-bold">{route.badge}</span>
                <span className="flex items-center gap-1 text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {route.duration}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="text-base font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors flex items-center gap-2">
                  <span>{route.from}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  <span>{route.to}</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                  <span className="font-mono">{route.distanceKm} KM</span>
                  <span>·</span>
                  <span>{route.popularCar}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Starting From</span>
                <span className="text-lg font-black text-slate-950 font-mono tabular-nums">{formatINR(route.startingPrice)}</span>
              </div>
              <span className="text-xs font-bold text-slate-900 group-hover:text-amber-600 flex items-center gap-1 transition">
                <span>Book</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
