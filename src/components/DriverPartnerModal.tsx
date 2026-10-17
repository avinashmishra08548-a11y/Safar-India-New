import React, { useState } from 'react';
import { X, CheckCircle2, Phone, ShieldCheck, Car, MapPin, FileText, Send, Sparkles, MessageSquare } from 'lucide-react';

interface DriverPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface DriverPartnerApplication {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  vehicleType: string;
  vehicleNumber: string;
  hasCommercialPermit: boolean;
  submittedAt: string;
}

export const DriverPartnerModal: React.FC<DriverPartnerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan (Dzire / Etios)');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [hasCommercialPermit, setHasCommercialPermit] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please enter your home city');
      return;
    }
    if (!vehicleNumber.trim()) {
      setErrorMsg('Please enter your commercial taxi registration number');
      return;
    }

    const application: DriverPartnerApplication = {
      id: `DRV-${Date.now().toString().slice(-6)}`,
      fullName: fullName.trim(),
      phone: cleanPhone.slice(-10),
      city: city.trim(),
      vehicleType,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      hasCommercialPermit,
      submittedAt: new Date().toISOString()
    };

    // Store in localStorage for admin management
    try {
      const saved = localStorage.getItem('safar_partner_applications');
      const list: DriverPartnerApplication[] = saved ? JSON.parse(saved) : [];
      list.unshift(application);
      localStorage.setItem('safar_partner_applications', JSON.stringify(list));
    } catch {}

    setIsSubmitted(true);
  };

  const handleWhatsAppOnboarding = () => {
    const text = 
      `*SAFAR INDIA CABS - DRIVER/VENDOR PARTNER ONBOARDING*\n\n` +
      `*Name:* ${fullName}\n` +
      `*Mobile:* +91 ${phone}\n` +
      `*Base City:* ${city}\n` +
      `*Vehicle Type:* ${vehicleType}\n` +
      `*Taxi Plate No.:* ${vehicleNumber}\n` +
      `*Commercial Permit (AITP):* ${hasCommercialPermit ? 'Yes' : 'In Process'}\n\n` +
      `_I want to join as a driver partner and start taking outstation trips with Safar India Cabs._`;

    window.open(`https://wa.me/917710080992?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg my-auto p-5 sm:p-7 shadow-2xl relative space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Application Received!</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                Welcome to Safar India Cabs network, <strong className="text-amber-400">{fullName}</strong>. Our fleet manager will verify your vehicle details and activate your trips within 2 hours.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Vehicle:</span>
                <span className="font-bold text-white">{vehicleType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Taxi Number:</span>
                <span className="font-mono font-bold text-amber-400">{vehicleNumber.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Base City:</span>
                <span className="font-bold text-white">{city}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleWhatsAppOnboarding}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Instant Onboard via WhatsApp (+91 77100 80992)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="border-b border-slate-800 pb-4">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Earn ₹45,000 - ₹85,000 / Month</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Join as Driver / Vendor Partner
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Attach your commercial taxi with Safar India Cabs. Guaranteed return trips, transparent km rates, and daily direct payouts.
              </p>
            </div>

            {errorMsg && (
              <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Driver / Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500 font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Home / Operating City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Delhi NCR, Jaipur, Pune"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Vehicle Type *
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="Sedan (Dzire / Etios / Aura)">Sedan (Dzire / Etios / Aura)</option>
                    <option value="Executive Sedan (Honda City / Ciaz)">Executive Sedan (City / Ciaz)</option>
                    <option value="SUV (Ertiga / Carens / Triber)">SUV (Ertiga / Carens)</option>
                    <option value="Premium MPV (Innova Crysta / Hycross)">Innova Crysta / Hycross</option>
                    <option value="Tempo Traveller (12/17/26 Seater)">Tempo Traveller (12-26 Seater)</option>
                    <option value="Hatchback (WagonR / Tiago)">Hatchback (WagonR / Tiago)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Taxi Plate Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. DL 1TA 1234 / MH 02 CR 5678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={hasCommercialPermit}
                    onChange={(e) => setHasCommercialPermit(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950"
                  />
                  <span>I have All India Tourist Permit (AITP) / Commercial Yellow Board Plate</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-slate-950" />
                  <span>Submit Partner Application</span>
                </button>
              </div>

              <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero registration fee · Direct payment to your bank/UPI after each trip</span>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
