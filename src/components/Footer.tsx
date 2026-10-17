import React from 'react';
import { 
  Car, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  MessageSquare, 
  ChevronRight
} from 'lucide-react';

interface FooterProps {
  onOpenAdmin?: () => void;
  onOpenDriverPartner?: () => void;
  onSelectRoute?: (pickup: string, drop: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  onOpenAdmin, 
  onOpenDriverPartner,
  onSelectRoute 
}) => {
  const popularRoutes = [
    { from: 'Delhi NCR', to: 'Agra', km: 230 },
    { from: 'Delhi NCR', to: 'Jaipur', km: 275 },
    { from: 'Delhi NCR', to: 'Chandigarh', km: 245 },
    { from: 'Delhi NCR', to: 'Haridwar', km: 225 },
    { from: 'Delhi NCR', to: 'Dehradun', km: 255 },
    { from: 'Mumbai', to: 'Pune', km: 150 },
    { from: 'Mumbai', to: 'Goa', km: 585 },
    { from: 'Mumbai', to: 'Nashik', km: 170 },
    { from: 'Mumbai', to: 'Shirdi', km: 240 },
    { from: 'Bangalore', to: 'Mysore', km: 145 },
    { from: 'Bangalore', to: 'Coorg', km: 260 },
    { from: 'Lucknow', to: 'Ayodhya', km: 135 },
    { from: 'Lucknow', to: 'Varanasi', km: 310 },
    { from: 'Jaipur', to: 'Udaipur', km: 395 }
  ];

  return (
    <footer id="footer-contact-section" className="bg-slate-100/80 border-t border-slate-200 pt-14 pb-28 sm:pb-12 text-xs text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid: Brand, Intercity Routes, Customer Guarantees & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Column 1: Brand & Socials (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <Car className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="font-black tracking-tight text-lg text-slate-950 font-sans flex items-center">
                  <span>SAFAR</span>
                  <span className="text-amber-500 mx-0.5 font-mono">.</span>
                  <span>INDIA</span>
                  <span className="text-amber-500 mx-0.5 font-mono">.</span>
                  <span className="text-amber-500">CABS</span>
                </div>
                <div className="text-[10px] tracking-[0.25em] font-extrabold text-amber-600 uppercase -mt-0.5">
                  Travel Smart
                </div>
              </div>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed max-w-sm">
              India's premier outstation taxi network. Providing verified chauffeurs, one-way rides with zero return fare, round trips, local hourly rentals, and airport transfers across 150+ Indian cities.
            </p>

            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All India Tourist Permit (AITP) Verified Fleet</span>
            </div>

            {/* SOCIAL MEDIA LINKS INTEGRATION */}
            <div className="pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Connect With Us
              </span>
              <div className="flex items-center gap-2.5">
                
                {/* WhatsApp */}
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
                  className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 flex items-center justify-center transition-all shadow-xs"
                  title="WhatsApp: +91 77100 80992"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/share/1CAp8b8muP/"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 flex items-center justify-center transition-all shadow-xs"
                  title="Facebook: Safar India Cabs"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/safarindiacabs01"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-xl bg-pink-50 hover:bg-gradient-to-tr hover:from-amber-500 hover:to-pink-500 text-pink-700 hover:text-white border border-pink-200 flex items-center justify-center transition-all shadow-xs"
                  title="Instagram: @safarindiacabs01"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>

              </div>
            </div>
          </div>

          {/* Column 2: Popular Intercity Routes (4 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
              <span>Popular Intercity Routes</span>
              <span className="text-[10px] text-amber-700 lowercase font-mono font-bold">150+ routes active</span>
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              {popularRoutes.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (onSelectRoute) onSelectRoute(r.from, r.to);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left text-slate-600 hover:text-amber-700 transition flex items-center gap-1 group truncate font-medium"
                >
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-amber-600 shrink-0" />
                  <span className="truncate">{r.from} ➔ {r.to}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Column 3: 24/7 Helpline & Direct Dispatch (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              24/7 Booking Helpline
            </h4>
            <div className="space-y-2.5 text-slate-700">
              <a
                href="tel:+917710080992"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 transition text-slate-900 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Toll-Free Helpline</div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900">+91 77100 80992</div>
                </div>
              </a>

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
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 transition text-emerald-700 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 fill-current text-emerald-600" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">WhatsApp Concierge</div>
                  <div className="font-bold text-xs sm:text-sm text-emerald-700">Chat & Get Quote</div>
                </div>
              </a>

              {onOpenDriverPartner && (
                <button
                  type="button"
                  onClick={onOpenDriverPartner}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-slate-800 hover:text-amber-700 font-bold text-xs text-center transition block shadow-xs"
                >
                  Join as Driver / Vendor Partner
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Strip: Copyright & Legal */}
        <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} <strong>Safar India Cabs</strong> (safarindiacabs.com). All rights reserved. Travel Smart.
          </div>

          <div className="flex items-center gap-5 font-medium">
            <span className="hover:text-slate-800 cursor-pointer">Privacy Policy</span>
            <span>·</span>
            <span className="hover:text-slate-800 cursor-pointer">Terms of Service</span>
            <span>·</span>
            <span className="hover:text-slate-800 cursor-pointer">Fare Rules</span>
            {onOpenAdmin && (
              <>
                <span>·</span>
                <button
                  onClick={onOpenAdmin}
                  className="text-slate-500 hover:text-amber-700 transition font-mono font-semibold"
                >
                  Admin Portal
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </footer>
  );
};
