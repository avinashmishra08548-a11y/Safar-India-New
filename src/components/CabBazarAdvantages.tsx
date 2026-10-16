import React from 'react';
import { 
  ShieldCheck, 
  Banknote, 
  Clock, 
  MapPin, 
  Smile, 
  CheckCircle,
  FileCheck2,
  Award
} from 'lucide-react';

export const CabBazarAdvantages: React.FC = () => {
  const advantages = [
    {
      icon: Banknote,
      title: 'Pay Only One-Way Distance',
      desc: 'No hidden round-trip return fares charged on one-way journeys. Save up to 50% on intercity cab travel.'
    },
    {
      icon: Clock,
      title: 'Zero Cancellation Fee',
      desc: 'Plans changed? Enjoy 100% full refund on advance payment if cancelled up to 6 hours prior to departure.'
    },
    {
      icon: ShieldCheck,
      title: 'Verified Police-Checked Drivers',
      desc: 'All chauffeurs undergo commercial background verification, highway driving tests, and medical fitness checks.'
    },
    {
      icon: FileCheck2,
      title: 'All-Inclusive Transparent Invoices',
      desc: 'Clear breakdown of driver allowance, tolls, state permit tax, and GST with official corporate tax invoices.'
    },
    {
      icon: Award,
      title: 'Spotless AC Commercial Fleet',
      desc: 'High standard sanitization, chilled dual air conditioning, generous luggage space, and mobile USB charging.'
    },
    {
      icon: MapPin,
      title: 'Guaranteed Doorstep Pickup & Drop',
      desc: 'Chauffeur arrives directly at your home, hotel, or airport terminal on time with luggage assistance.'
    }
  ];

  return (
    <section className="space-y-6 py-6" id="why-safar-cabs">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-xl sm:text-2xl font-black text-white">
          Why Travelers Choose Safar India Cabs
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          The reliable, transparent alternative to expensive flight tickets and crowded trains for intercity travel across India.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {advantages.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-2.5"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
