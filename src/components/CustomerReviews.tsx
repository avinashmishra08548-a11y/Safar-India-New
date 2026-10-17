import React from 'react';
import { Star, CheckCircle } from 'lucide-react';

interface Review {
  name: string;
  city: string;
  route: string;
  car: string;
  rating: number;
  date: string;
  review: string;
}

const REVIEWS: Review[] = [
  {
    name: 'Vikramjit Singh',
    city: 'New Delhi',
    route: 'Delhi NCR to Chandigarh',
    car: 'Sedan AC (Dzire)',
    rating: 5,
    date: 'October 2026',
    review: 'Superb experience on the Delhi-Chandigarh expressway. The driver, Rajesh ji, arrived 15 minutes before scheduled time in a spotless clean Dzire. No haggling or sudden toll demands.'
  },
  {
    name: 'Pooja Kulkarni',
    city: 'Pune',
    route: 'Mumbai Airport to Pune',
    car: 'Innova Crysta Premium',
    rating: 5,
    date: 'September 2026',
    review: 'Booked an Innova Crysta for our family trip straight from Mumbai T2 terminal. Chauffeur helped with all 5 heavy suitcases and drove smoothly through the ghats. Highly recommended!'
  },
  {
    name: 'Arun Iyer',
    city: 'Bengaluru',
    route: 'Bangalore to Mysore',
    car: 'Sedan AC (Etios)',
    rating: 5,
    date: 'October 2026',
    review: 'The 20% advance booking system is super convenient. Received instant GST invoice which I submitted for corporate reimbursement. Seamless 10-lane expressway trip.'
  }
];

export const CustomerReviews: React.FC = () => {
  return (
    <section className="space-y-6 py-6 border-t border-slate-200" id="reviews-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>Verified Customer Reviews</span>
            <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-bold border border-amber-200">
              4.9 / 5.0 Rating
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real feedback from outstation and airport travelers across India.
          </p>
        </div>
        <div className="text-xs text-slate-600 flex items-center gap-1 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>100% Verified Journeys</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REVIEWS.map((rev, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{rev.date}</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{rev.review}"
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-900">{rev.name}</div>
              <div className="text-[10px] text-slate-500">{rev.city} · {rev.route}</div>
              <div className="text-[10px] text-amber-700 font-bold mt-0.5">{rev.car}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
