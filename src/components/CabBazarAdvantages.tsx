import React from 'react';
import { 
  ShieldCheck, 
  Banknote, 
  Clock, 
  MapPin
} from 'lucide-react';

export const CabBazarAdvantages: React.FC = () => {
  const advantages = [
    {
      icon: Banknote,
      title: 'One-Way Fares Only',
      desc: 'Pay strictly for one-way distance with zero return fare charges.'
    },
    {
      icon: ShieldCheck,
      title: 'Verified AC Cabs',
      desc: 'Clean commercial vehicles with experienced highway chauffeurs.'
    },
    {
      icon: Clock,
      title: 'Free Cancellation',
      desc: '100% advance refund if cancelled up to 6 hours before pickup.'
    },
    {
      icon: MapPin,
      title: 'Doorstep Pickup & Drop',
      desc: 'On-time pickup from your home, hotel, or airport terminal.'
    }
  ];

  return (
    <section className="space-y-8 py-8" id="why-safar-cabs">
      <div className="max-w-xl">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Why Travel With Safar India Cabs
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Comfortable, reliable intercity and airport cab service across India.
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
    </section>
  );
};
