import React, { useState, useEffect } from 'react';
import { X, Smartphone, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { CustomerUser } from '../types';
import { requestServerOtp, verifyServerOtp, sanitize10DigitPhone } from '../utils/smsService';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: CustomerUser) => void;
  authPrompt?: string;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  authPrompt
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState<string>('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [smsDeliveryInfo, setSmsDeliveryInfo] = useState('');
  const [showOtpToast, setShowOtpToast] = useState(false);

  useEffect(() => {
    let timer: any;
    if (resendSeconds > 0) {
      timer = setTimeout(() => setResendSeconds(resendSeconds - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setPhone(clean);
    setErrorMsg('');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    // Secure server-side OTP request
    const res = await requestServerOtp(cleanPhone);
    setIsSending(false);

    if (res.success && res.token) {
      setOtpToken(res.token);
      setOtpExpiresAt(res.expiresAt || Date.now() + 10 * 60 * 1000);
      setFailedAttempts(0);
      setOtp('');
      setSmsDeliveryInfo(res.message || 'Verification OTP has been dispatched to your mobile number');
      setShowOtpToast(true);
      setStep('otp');
      setResendSeconds(30);
    } else {
      setErrorMsg(res.message || 'Unable to dispatch SMS. Please try again.');
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    const cleanPhone = sanitize10DigitPhone(phone);
    setIsSending(true);
    setErrorMsg('');

    const res = await requestServerOtp(cleanPhone);
    setIsSending(false);

    if (res.success && res.token) {
      setOtpToken(res.token);
      setOtpExpiresAt(res.expiresAt || Date.now() + 10 * 60 * 1000);
      setFailedAttempts(0);
      setOtp('');
      setSmsDeliveryInfo('A fresh verification OTP has been sent to your phone');
      setShowOtpToast(true);
      setResendSeconds(30);
    } else {
      setErrorMsg(res.message || 'Unable to resend SMS. Please wait.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 4) {
      setErrorMsg('Please enter the complete 4-digit verification code sent to your phone.');
      return;
    }

    if (Date.now() > otpExpiresAt) {
      setErrorMsg('Verification code has expired. Please click "Resend Code".');
      return;
    }

    if (failedAttempts >= 5) {
      setErrorMsg('Too many invalid attempts. Please request a new verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    const cleanPhone = sanitize10DigitPhone(phone);
    // Server-side verification
    const verifyRes = await verifyServerOtp(cleanPhone, otp, otpToken);
    setIsVerifying(false);

    if (!verifyRes.success) {
      setFailedAttempts(prev => prev + 1);
      const remaining = 4 - failedAttempts;
      setErrorMsg(
        remaining > 0 
          ? `Incorrect verification code. Please check your SMS. (${remaining} attempts remaining)`
          : 'Too many incorrect attempts. Please request a new code.'
      );
      return;
    }

    const user: CustomerUser = {
      name: name.trim(),
      phone: cleanPhone,
      email: email.trim() || undefined
    };

    // Save in persistent customer registry
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live WhatsApp & SMS status toast */}
        {showOtpToast && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl shadow-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-4">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-xs">
              <span className="font-extrabold block">WhatsApp & SMS OTP Sent!</span>
              <span>Verification code sent to your WhatsApp & SMS on <strong className="font-mono text-xs">+91 {phone}</strong>.</span>
            </div>
          </div>
        )}

        {step === 'phone' ? (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200">
                <Smartphone className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Customer WhatsApp & Mobile Login
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Login via instant WhatsApp & SMS OTP to receive live booking & driver updates
              </p>
            </div>

            {authPrompt && (
              <div className="mb-3.5 p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-semibold flex items-center gap-2">
                <span className="text-base">🔒</span>
                <span>{authPrompt}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  WhatsApp / Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email (for Tax Invoices)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  WhatsApp Cloud API + SMS OTP Active
                </span>
                <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Instant OTP</span>
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Sending WhatsApp & SMS OTP...</span>
                  </>
                ) : (
                  <span>Send WhatsApp & SMS OTP</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Enter Verification Code
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sent to WhatsApp & SMS on <span className="text-amber-700 font-bold">+91 {phone}</span>
              </p>
              {smsDeliveryInfo && (
                <div className="mt-1.5 max-w-[290px] mx-auto p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                  {smsDeliveryInfo}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center font-medium">
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
                  className="w-36 text-center tracking-[0.5em] text-xl font-black bg-slate-50 border border-slate-300 rounded-2xl py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
                <p className="text-[11px] text-slate-500 text-center font-medium">
                  Enter the 4-digit OTP received on your WhatsApp or SMS
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="hover:text-slate-900 font-medium"
                >
                  Change Number
                </button>
                <button
                  type="button"
                  disabled={resendSeconds > 0}
                  onClick={handleResend}
                  className={`flex items-center gap-1 font-bold ${
                    resendSeconds > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-amber-700 hover:text-amber-800'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{resendSeconds > 0 ? `Resend (${resendSeconds}s)` : 'Resend Code'}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Secure Code...</span>
                  </>
                ) : (
                  <span>Verify & Continue</span>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
