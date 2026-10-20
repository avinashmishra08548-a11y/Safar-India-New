import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, CheckCircle, Loader2, RefreshCw, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';
import { CustomerUser } from '../types';
import {
  requestServerOtp,
  verifyServerOtp,
  retriggerWhatsAppOtpFromToken,
  sanitize10DigitPhone
} from '../utils/smsService';
import { triggerWhatsAppDeepLink } from '../utils/whatsapp';

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
  const prewarmedPhoneRef = useRef<string>('');

  useEffect(() => {
    let timer: any;
    if (resendSeconds > 0) {
      timer = setTimeout(() => setResendSeconds(resendSeconds - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  // Pre-queue live OTP on the server as soon as 10 digits are entered so "Click Here to Get OTP" works instantaneously
  useEffect(() => {
    if (!isOpen) return;
    const clean = sanitize10DigitPhone(phone);
    if (clean.length === 10 && prewarmedPhoneRef.current !== clean) {
      prewarmedPhoneRef.current = clean;
      requestServerOtp(clean)
        .then((res) => {
          if (res.success && res.token) {
            setOtpToken(res.token);
            setOtpExpiresAt(res.expiresAt || Date.now() + 10 * 60 * 1000);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, phone]);

  // Automatically flush live WhatsApp OTP while waiting for OTP & when user returns from WhatsApp chat
  useEffect(() => {
    if (!isOpen || step !== 'otp' || !phone) return;
    const cleanPhone = sanitize10DigitPhone(phone);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {});
      }
    };

    // Scheduled background flushes so OTP arrives while customer is inside WhatsApp
    const t1 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 3000);
    const t2 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 6500);
    const t3 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 11000);
    const t4 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 16000);

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [isOpen, step, phone, otpToken]);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    const clean = sanitize10DigitPhone(val);
    setPhone(clean);
    setErrorMsg('');
  };

  // Direct "Click Here to Get OTP" handler right below the number box
  const handleClickHereToGetOtp = async () => {
    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter your 10-digit WhatsApp mobile number first');
      return;
    }

    setErrorMsg('');
    setIsSending(true);

    // Trigger WhatsApp bot link synchronously on user tap so mobile browsers never block it
    triggerWhatsAppDeepLink(
      '919142526791',
      `Hi Safar India Cabs, please send my Login OTP for +91 ${cleanPhone}`
    );

    if (!otpToken || prewarmedPhoneRef.current !== cleanPhone) {
      const res = await requestServerOtp(cleanPhone);
      if (res.success && res.token) {
        setOtpToken(res.token);
        setOtpExpiresAt(res.expiresAt || Date.now() + 10 * 60 * 1000);
      }
    } else {
      retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {});
    }

    setIsSending(false);
    setFailedAttempts(0);
    setOtp('');
    setSmsDeliveryInfo(`Live OTP dispatched to your WhatsApp (+91 ${cleanPhone})`);
    setStep('otp');
    setResendSeconds(25);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp mobile number');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    const res = await requestServerOtp(cleanPhone);
    setIsSending(false);

    if (res.success && res.token) {
      setOtpToken(res.token);
      setOtpExpiresAt(res.expiresAt || Date.now() + 10 * 60 * 1000);
      setFailedAttempts(0);
      setOtp('');
      setSmsDeliveryInfo(`Live OTP dispatched to your WhatsApp (+91 ${cleanPhone})`);
      setStep('otp');
      setResendSeconds(25);
    } else {
      setErrorMsg(res.message || 'Unable to dispatch OTP. Please try again.');
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
      setSmsDeliveryInfo(`Fresh live OTP sent to your WhatsApp (+91 ${cleanPhone})`);
      setResendSeconds(25);
    } else {
      setErrorMsg(res.message || 'Unable to resend OTP. Please wait.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 4) {
      setErrorMsg('Please enter the 4-digit OTP received on your WhatsApp.');
      return;
    }

    if (Date.now() > otpExpiresAt) {
      setErrorMsg('Verification code has expired. Please tap Click Here to Get OTP.');
      return;
    }

    if (failedAttempts >= 5) {
      setErrorMsg('Too many invalid attempts. Please request a new OTP.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    const cleanPhone = sanitize10DigitPhone(phone);
    const verifyRes = await verifyServerOtp(cleanPhone, otp, otpToken);
    setIsVerifying(false);

    if (!verifyRes.success) {
      setFailedAttempts((prev) => prev + 1);
      const remaining = 4 - failedAttempts;
      setErrorMsg(
        remaining > 0
          ? `Incorrect OTP. Please check your WhatsApp (+91 ${cleanPhone}). (${remaining} attempts left)`
          : 'Too many incorrect attempts. Please tap Resend OTP.'
      );
      return;
    }

    let resolvedName = name.trim();
    if (!resolvedName) {
      try {
        const raw = localStorage.getItem('safar_registered_customers');
        const list: CustomerUser[] = raw ? JSON.parse(raw) : [];
        const existing = list.find((u) => sanitize10DigitPhone(u.phone) === cleanPhone);
        if (existing?.name) resolvedName = existing.name;
      } catch {}
    }

    const user: CustomerUser = {
      name: resolvedName || `Traveler (${cleanPhone.slice(-4)})`,
      phone: cleanPhone,
      email: email.trim() || undefined
    };

    try {
      const raw = localStorage.getItem('safar_registered_customers');
      let list: CustomerUser[] = raw ? JSON.parse(raw) : [];
      list = list.filter((u) => u.phone !== user.phone);
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
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'phone' ? (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <Smartphone className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">
                Customer WhatsApp Login
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter your WhatsApp number below and click to receive your live OTP
              </p>
            </div>

            {authPrompt && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{authPrompt}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  WhatsApp Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs text-slate-500 font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-3 py-3 text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {/* CLICK HERE TO GET OTP DIRECT BAR RIGHT BELOW MOBILE NUMBER */}
                <button
                  type="button"
                  onClick={handleClickHereToGetOtp}
                  disabled={isSending}
                  className="mt-2.5 w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 transition cursor-pointer group shadow-2xs"
                >
                  <span className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
                    <MessageSquare className="w-4 h-4 text-emerald-600 fill-emerald-600/15 shrink-0" />
                    <span>Click Here to Get OTP on WhatsApp</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-emerald-600 group-hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition">
                    Get OTP <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Live OTP...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Send OTP & Continue
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Enter WhatsApp OTP</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter the 4-digit OTP sent to{' '}
                <span className="text-slate-900 font-bold">+91 {phone}</span>
              </p>
            </div>

            {smsDeliveryInfo && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{smsDeliveryInfo}</span>
              </div>
            )}

            {/* Prominent Click Here to Get OTP button on OTP step as well */}
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-300 flex items-center justify-between gap-2">
              <div className="text-[11px] text-emerald-950 font-semibold leading-tight">
                Didn't receive the code yet?
                <span className="block text-[10px] text-emerald-700 font-normal mt-0.5">
                  Tap to get instant live OTP on your WhatsApp
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = sanitize10DigitPhone(phone);
                  triggerWhatsAppDeepLink(
                    '919142526791',
                    `Hi Safar India Cabs, please send my Login OTP for +91 ${cleanPhone}`
                  );
                  setTimeout(() => {
                    retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {});
                  }, 2500);
                }}
                className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Click Here to Get OTP
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  required
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    setErrorMsg('');
                  }}
                  placeholder="• • • •"
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3.5 text-center text-2xl tracking-[0.5em] text-slate-900 font-mono font-extrabold focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying OTP...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setErrorMsg('');
                  }}
                  className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  ← Change Number
                </button>

                <button
                  type="button"
                  disabled={resendSeconds > 0 || isSending}
                  onClick={handleResend}
                  className="text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
