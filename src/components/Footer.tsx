import React from 'react';
import { Car, Phone, Mail, MapPin, ShieldCheck, MessageSquare } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 pt-10 pb-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                <Car className="w-4 h-4" />
              </div>
              <span className="font-black text-white text-base tracking-tight">
                SAFAR INDIA <span className="text-amber-400">CABS</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              India's premier outstation taxi network. Providing verified chauffeurs, one-way rides, round trips, local hourly rentals, and airport transfers across 150+ cities.
            </p>
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All India Tourist Taxi Permit (AITP)</span>
            </div>
          </div>

          {/* Quick Hubs */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Major Outstation Hubs
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>Delhi NCR · Agra · Jaipur · Chandigarh</li>
              <li>Mumbai · Pune · Nashik · Shirdi · Goa</li>
              <li>Bangalore · Mysore · Coorg · Ooty</li>
              <li>Lucknow · Ayodhya · Varanasi · Prayagraj</li>
              <li>Ahmedabad · Vadodara · Surat · Udaipur</li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Fare Guarantee & Safety
            </h4>
            <ul className="space-y-1.5 text-slate-400">
              <li>• Pay Only One-Way Distance</li>
              <li>• Zero Hidden Surge Fares</li>
              <li>• Free Cancellation up to 6 Hours</li>
              <li>• 24x7 Roadside & GPS Tracking</li>
              <li>• GST Tax Invoices for Business Travel</li>
            </ul>
          </div>

          {/* 24x7 Contact & WhatsApp */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              24x7 Chauffeur Helpline
            </h4>
            <div className="space-y-2 text-slate-300">
              <a
                href="tel:+917710080992"
                className="flex items-center gap-2 hover:text-amber-400 transition"
              >
                <Phone className="w-4 h-4 text-amber-400" />
                <span className="font-bold">+91 77100 80992</span>
              </a>

              <a
                href="https://wa.me/917710080992?text=Hello%20Safar%20India%20Cabs,%20I%20need%20assistance%20with%20cab%20booking"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold transition"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp Customer Care</span>
              </a>

              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>support@safarindiacabs.in</span>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} Safar India Cabs. All rights reserved. Built for reliable intercity mobility.
          </div>
          <div className="flex items-center gap-4">
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Terms of Service</span>
            <span>·</span>
            <span>Refund Policy</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
