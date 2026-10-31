import React from 'react';
import {
  ShieldCheck,
  Banknote,
  Clock,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export const CabBazarAdvantages: React.FC = () => {
  const advantages = [
    {
      icon: Banknote,
      title: 'Beat Market Average by ~₹200',
      desc: 'Guaranteed ₹180–₹240 lower one-way fare compared to the market average rate with zero return fare.'
    },
    {
      icon: ShieldCheck,
      title: 'Zero Hidden Charges',
      desc: 'Base Fare, Driver Allowance (DA), Included KMs, State Toll info & 5% GST displayed upfront before booking.'
    },
    {
      icon: Clock,
      title: 'Flexi 20% Advance & Free Cancel',
      desc: 'Book with 20% advance or 100% full payment. Free cancellation up to 6 hours before pickup.'
    },
    {
      icon: MapPin,
      title: 'Doorstep GPS Pickup & 24x7 SOS',
      desc: 'Pinpoint doorstep pickup & drop with instant WhatsApp/SMS confirmation (SIC2601) and 24x7 highway helpline.'
    }
  ];

  const comparisonRows = [
    {
      feature: 'One-Way Per-KM Rate (Hatchback / Sedan / SUV)',
      safar: '₹10.2 / ₹11.2 / ₹14.5 per KM',
      marketAvg: '₹11.8 / ₹12.8 / ₹16.3 per KM'
    },
    {
      feature: 'Average Route Savings (e.g. Delhi → Agra / Jaipur)',
      safar: 'Save ₹185 – ₹245 (Lowest Guaranteed)',
      marketAvg: '₹185 – ₹245 Higher than SafarIndiaCabs'
    },
    {
      feature: 'Driver Allowance (Chauffeur Bata)',
      safar: '100% Included in Upfront Fare',
      marketAvg: 'Often Added Separately at Checkout'
    },
    {
      feature: 'Official GST Tax Invoice (SAC 996412)',
      safar: 'Instant PDF with Digital Sign & Seal',
      marketAvg: 'Delayed / Post-Trip Request'
    },
    {
      feature: 'Flexi Booking Payment',
      safar: '20% Advance or 100% Full Payment',
      marketAvg: '25% – 50% Advance Required'
    }
  ];

  return (
    <section className="space-y-8 py-8" id="why-safar-cabs">
      <div className="max-w-2xl">
        <div className="text-xs font-extrabold uppercase tracking-wider text-amber-600 mb-1">
          Market-Leading Outstation Pricing &amp; Transparency
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Why SafarIndiaCabs Beats the Market Average Rate
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Every outstation one-way and round-trip fare is dynamically calibrated to save you ~₹200 compared to the standard market average rate—with 100% upfront GST billing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {advantages.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-3"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80">
                <Icon className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Market Average Benchmark Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-white">
              SafarIndiaCabs vs Market Average Rate
            </h3>
            <p className="text-xs text-slate-300">
              Transparent rate &amp; feature comparison against standard outstation market rates
            </p>
          </div>
          <span className="text-xs font-extrabold text-amber-400">
            Best Price Challenge · Save ~₹200 Every Trip
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold">
                <th className="py-3.5 px-4">Outstation Parameter</th>
                <th className="py-3.5 px-4 bg-amber-50/80 text-slate-950 font-black">
                  SafarIndiaCabs (Our Rate)
                </th>
                <th className="py-3.5 px-4">Market Average Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {comparisonRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">{row.feature}</td>
                  <td className="py-3 px-4 bg-amber-50/40 font-black text-emerald-800">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{row.safar}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{row.marketAvg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
