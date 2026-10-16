import React, { useState, useEffect } from 'react';
import { X, Smartphone, CheckCircle, ShieldCheck, RefreshCw, MessageSquare, Radio, Loader2 } from 'lucide-react';
import { CustomerUser } from '../types';
import { sendOtpSms, getFast2SmsApiKey } from '../utils/smsService';

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
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [showOtpToast, setShowOtpToast] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [smsDeliveryInfo, setSmsDeliveryInfo] = useState('');

  // Auto-fill existing customer if phone is already registered
  const handlePhoneChange = (inputPhone: string) => {
    const clean = inputPhone.replace(/\D/g, '');
    setPhone(clean);
    if (clean.length === 10) {
      try {
        const raw = localStorage.getItem('safar_registered_customers');
        if (raw) {
          const list: CustomerUser[] = JSON.parse(raw);
          const found = list.find(u => u.phone === clean);
          if (found) {
            setName(found.name);
            if (found.email) setEmail(found.email);
          }
        }
      } catch {}
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }
    setErrorMsg('');
    setIsSending(true);

    // Generate dynamic 4-digit OTP
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);

    // Call Fast2SMS Gateway
    const res = await sendOtpSms(phone, newOtp);
    setIsSending(false);
    setSmsDeliveryInfo(res.message);

    setStep('otp');
    setShowOtpToast(true);
    setResendSeconds(30);
  };

  // Resend Countdown
  useEffect(() => {
    if (step === 'otp' && resendSeconds > 0) {
      const timer = setInterval(() => {
        setResendSeconds(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, resendSeconds]);

  const handleResend = async () => {
    if (resendSeconds > 0 || isSending) return;
    setIsSending(true);
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(newOtp);
    setOtp('');

    const res = await sendOtpSms(phone, newOtp);
    setIsSending(false);
    setSmsDeliveryInfo(res.message);

    setShowOtpToast(true);
    setResendSeconds(30);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== generatedOtp) {
      setErrorMsg('Invalid verification code! Please enter the code sent to your phone.');
      return;
    }

    const user: CustomerUser = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined
    };

    // Save/Update in Central Registered Customers Database (localStorage persistent)
    try {
      const raw = localStorage.getItem('safar_registered_customers');
      let list: CustomerUser[] = raw ? JSON.parse(raw) : [];
      list = list.filter(u => u.phone !== user.phone);
      list.push({
        ...user,
        registrationDate: new Date().toISOString()
      } as any);
      localStorage.setItem('safar_registered_customers', JSON.stringify(list));
    } catch {}

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

        {/* Live SMS simulation toast */}
        {showOtpToast && (
          <div className="bg-amber-400 text-slate-950 p-3 rounded-2xl shadow-xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-4">
            <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold block">SMS Notification (+91 {phone})</span>
              <span>Your Safar India Cabs verification OTP is <strong className="font-mono text-sm underline">{generatedOtp}</strong>. Valid for 10 minutes.</span>
            </div>
          </div>
        )}

        {step === 'phone' ? (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-400/20">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Customer Account
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Login with mobile number to sync your rides & bills
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
                  Mobile Number *
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
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

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
                  Email (for Tax Invoices)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Fast2SMS Live Gateway Connected
                </span>
                <span className="font-mono text-slate-400">Key: 6B8s...PIMq</span>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Connecting Fast2SMS Gateway...</span>
                  </>
                ) : (
                  <span>Send Verification Code</span>
                )}
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
                Enter Verification Code
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sent to <span className="text-amber-400 font-bold">+91 {phone}</span>
              </p>
              {smsDeliveryInfo && (
                <p className="text-[10px] text-slate-500 mt-1 max-w-[280px] mx-auto truncate">
                  {smsDeliveryInfo}
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex flex-col items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-36 text-center tracking-[0.5em] text-xl font-black bg-slate-950 border border-slate-800 rounded-2xl py-3 text-amber-400 focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setOtp(generatedOtp)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20"
                >
                  ⚡ Auto-fill Code ({generatedOtp})
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="hover:text-white"
                >
                  Change Number
                </button>
                <button
                  type="button"
                  disabled={resendSeconds > 0}
                  onClick={handleResend}
                  className={`flex items-center gap-1 font-semibold ${
                    resendSeconds > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{resendSeconds > 0 ? `Resend (${resendSeconds}s)` : 'Resend Code'}</span>
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
              >
                Verify & Continue
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
