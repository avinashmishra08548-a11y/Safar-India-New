import React from 'react';
import { Car, DollarSign, ShieldCheck, Phone, CheckCircle2, ArrowRight, Award, Users } from 'lucide-react';

interface DriverPartnerSectionProps {
  onOpenPartnerModal: () => void;
}

export const DriverPartnerSection: React.FC<DriverPartnerSectionProps> = ({ onOpenPartnerModal }) => {
  return (
    <section id="driver-partner-section" className="scroll-mt-20">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        
        {/* Subtle accent light */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Safar India Driver & Vendor Network</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight leading-tight">
              Join as Driver / Vendor Partner. <br className="hidden sm:inline" />
              <span className="text-amber-600">Earn ₹45,000 – ₹85,000+ Every Month.</span>
            </h2>

            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl">
              Are you a professional commercial driver or taxi fleet vendor? Partner with Safar India Cabs across Delhi NCR, Mumbai, Pune, Jaipur, Bangalore, and 150+ Indian cities. Get verified highway bookings with zero dead kilometers.
            </p>

            {/* 4 Value Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-900 block font-bold">Daily Direct Payouts</strong>
                  <span className="text-slate-500 text-[11px]">Advance payment settled immediately via UPI / IMPS.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-900 block font-bold">Guaranteed Return Loads</strong>
                  <span className="text-slate-500 text-[11px]">Connecting highway one-way drops to minimize empty runs.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-900 block font-bold">Transparent Per-KM Rates</strong>
                  <span className="text-slate-500 text-[11px]">Clear ₹10 - ₹28/km rates plus driver allowance on outstation.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-slate-900 block font-bold">24x7 Fleet Helpline</strong>
                  <span className="text-slate-500 text-[11px]">Dedicated highway breakdown & emergency dispatch support.</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                onClick={onOpenPartnerModal}
                className="py-3 px-6 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition shadow-sm flex items-center gap-2 group active:scale-95"
              >
                <span>Join as Driver / Vendor Partner</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <a
                href="https://wa.me/917710080992?text=Hello%20Safar%20India%20Cabs,%20I%20need%20cab%20booking%20assistance"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (/; wv\)|AppsGeyser|WebView/i.test(navigator.userAgent)) {
                    e.preventDefault();
                    window.location.href = 'https://wa.me/917710080992?text=Hello%20Safar%20India%20Cabs,%20I%20need%20cab%20booking%20assistance';
                  }
                }}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 transition flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Helpdesk (+91 77100 80992)</span>
              </a>
            </div>

          </div>

          {/* Right Fleet Badge & Highlights */}
          <div className="lg:col-span-5 bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Accepted Vehicle Classes</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                Commercial Yellow Board
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="font-bold text-slate-900">Sedan (Dzire, Etios, Aura, Tigor)</span>
                <span className="text-amber-700 font-mono font-bold">₹10 - ₹12 / KM</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="font-bold text-slate-900">SUV (Ertiga, Carens, Triber)</span>
                <span className="text-amber-700 font-mono font-bold">₹14 - ₹16 / KM</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="font-bold text-slate-900">Premium (Innova Crysta, Hycross)</span>
                <span className="text-amber-700 font-mono font-bold">₹18 - ₹22 / KM</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                <span className="font-bold text-slate-900">Tempo Traveller (12, 17, 26 Seater)</span>
                <span className="text-amber-700 font-mono font-bold">₹24 - ₹32 / KM</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-medium">
              ⚡ Over <strong>1,200+ active partner drivers</strong> across Delhi NCR, Rajasthan, Maharashtra, Uttar Pradesh & Karnataka. Zero joining or registration fees.
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
