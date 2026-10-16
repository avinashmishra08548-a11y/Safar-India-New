import React, { useState } from 'react';
import { X, Smartphone, CheckCircle, ShieldCheck } from 'lucide-react';
import { CustomerUser } from '../types';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: CustomerUser) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    setErrorMsg('');
    setStep('otp');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '1234' && otp.length < 4) {
      setErrorMsg('Invalid OTP! Please enter default verification code 1234');
      return;
    }
    const user: CustomerUser = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined
    };
    onLoginSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'phone' ? (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-400/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Customer Login / Register
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage your cab bookings, invoices & chauffeur status.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  10-Digit Mobile Number *
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
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
              >
                Send Verification OTP
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Enter 4-Digit OTP
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sent to <span className="text-amber-400 font-bold">+91 {phone}</span>
              </p>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="1234"
                  className="w-36 text-center tracking-[0.5em] text-xl font-black bg-slate-950 border border-slate-800 rounded-2xl py-3 text-amber-400 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Demo Verification Code: <strong className="text-amber-400">1234</strong>
              </p>

              <button
                type="submit"
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
              >
                Verify & Continue
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-center text-xs text-slate-400 hover:text-white"
              >
                Change Mobile Number
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
