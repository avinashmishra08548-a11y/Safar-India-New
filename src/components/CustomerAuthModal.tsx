import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  CheckCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
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
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpToken, setOtpToken] = useState<string>('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [smsDeliveryInfo, setSmsDeliveryInfo] = useState('');
  const prewarmedPhoneRef = useRef<string>('');
  const otpInputRef = useRef<HTMLInputElement>(null);

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
    const cleanPhone = sanitize10DigitPhone(phone);
    if (!isOpen || cleanPhone.length !== 10 || !otpRequested) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {});
      }
    };

    const t1 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 2500);
    const t2 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 6000);
    const t3 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 10000);
    const t4 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 15000);

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
  }, [isOpen, otpRequested, phone, otpToken]);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    const clean = sanitize10DigitPhone(val);
    setPhone(clean);
    setErrorMsg('');
    if (clean.length < 10) {
      setSmsDeliveryInfo('');
    }
  };

  // Direct "Click Here to Get OTP" handler right below the number box
  const handleClickHereToGetOtp = async () => {
    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter your 10-digit WhatsApp mobile number first');
      return;
    }

    // Immediately show OTP Input & Submit button first so UI never waits or blocks
    setErrorMsg('');
    setOtpRequested(true);
    setFailedAttempts(0);
    setSmsDeliveryInfo(`Live OTP dispatched to your WhatsApp (+91 ${cleanPhone}). Enter the 4-digit OTP below & click Submit.`);
    setResendSeconds(25);
    setTimeout(() => otpInputRef.current?.focus(), 100);

    // Trigger WhatsApp bot link safely
    triggerWhatsAppDeepLink(
      '919142526791',
      `Hi Safar India Cabs, please send my Login OTP for +91 ${cleanPhone}`
    );

    setIsSending(true);
    try {
      if (!otpToken || prewarmedPhoneRef.current !== cleanPhone) {
        const res = await requestServerOtp(cleanPhone);
        if (res.success && res.token) {
          setOtpToken(res.token);
          setOtpExpiresAt(res.expiresAt || Date.now() + 10 * 60 * 1000);
        }
      } else {
        retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {});
      }
    } catch {}
    setIsSending(false);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp mobile number');
      return;
    }

    // Immediately reveal the OTP input & Submit button
    setOtpRequested(true);
    setIsSending(true);
    setErrorMsg('');

    try {
      const res = await requestServerOtp(cleanPhone);
      setIsSending(false);

      if (res.success && res.token) {
        setOtpToken(res.token);
        setOtpExpiresAt(res.expiresAt || Date.now() + 10 * 60 * 1000);
        setFailedAttempts(0);
        setSmsDeliveryInfo(`Live OTP sent to your WhatsApp (+91 ${cleanPhone}). Enter the 4-digit OTP below.`);
        setResendSeconds(25);
        setTimeout(() => otpInputRef.current?.focus(), 100);
      } else {
        setErrorMsg(res.message || 'Unable to dispatch OTP. Please tap Click Here to Get OTP.');
      }
    } catch {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) return;
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
      setErrorMsg(res.message || 'Unable to resend OTP. Please tap Click Here to Get OTP.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp mobile number.');
      return;
    }

    if (!otp || otp.trim().length !== 4) {
      setErrorMsg('Please enter the 4-digit OTP received on your WhatsApp.');
      otpInputRef.current?.focus();
      return;
    }

    if (otpExpiresAt > 0 && Date.now() > otpExpiresAt) {
      setErrorMsg('Verification code has expired. Please tap Click Here to Get OTP.');
      return;
    }

    if (failedAttempts >= 5) {
      setErrorMsg('Too many invalid attempts. Please tap Click Here to Get OTP for a fresh code.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    const verifyRes = await verifyServerOtp(cleanPhone, otp.trim(), otpToken);
    setIsVerifying(false);

    if (!verifyRes.success) {
      setFailedAttempts((prev) => prev + 1);
      const remaining = Math.max(0, 4 - failedAttempts);
      setErrorMsg(
        remaining > 0
          ? `Incorrect OTP. Please check your WhatsApp (+91 ${cleanPhone}). (${remaining} attempts left)`
          : 'Too many incorrect attempts. Please tap Click Here to Get OTP.'
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
      list = list.filter((u) => sanitize10DigitPhone(u.phone) !== user.phone);
      list.push({
        ...user,
        registrationDate: new Date().toISOString()
      } as any);
      localStorage.setItem('safar_registered_customers', JSON.stringify(list));
    } catch {}

    onLoginSuccess(user);
    onClose();
  };

  const cleanPhoneLen = sanitize10DigitPhone(phone).length;
  const showOtpBox = otpRequested || cleanPhoneLen === 10;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 border border-emerald-200">
            <Smartphone className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Customer WhatsApp OTP Login
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your WhatsApp number, click to get OTP, and submit the 4-digit OTP below
          </p>
        </div>

        {authPrompt && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{authPrompt}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center font-semibold">
            {errorMsg}
          </div>
        )}

        {smsDeliveryInfo && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{smsDeliveryInfo}</span>
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {/* 1. MOBILE NUMBER INPUT */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. WhatsApp Mobile Number *
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
                placeholder="Enter 10-digit WhatsApp number"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-3 py-3 text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* PROMINENT "CLICK HERE TO GET OTP" BUTTON RIGHT BELOW MOBILE NUMBER */}
            <button
              type="button"
              onClick={handleClickHereToGetOtp}
              disabled={isSending}
              className="mt-2.5 w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-sm active:scale-99"
            >
              <span className="flex items-center gap-2 text-xs font-extrabold">
                <MessageSquare className="w-4 h-4 text-white shrink-0" />
                <span>Click Here to Get OTP on WhatsApp</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-950 bg-amber-400 px-2.5 py-1 rounded-lg">
                {isSending ? 'Sending...' : 'Get OTP'} <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          </div>

          {/* 2. FULL NAME (OPTIONAL) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
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

          {/* 3. ALWAYS-VISIBLE 4-DIGIT OTP INPUT & SUBMIT BUTTON */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-900">
                2. Enter 4-Digit OTP Received on WhatsApp *
              </label>
              {showOtpBox && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendSeconds > 0 || isSending}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend OTP'}
                </button>
              )}
            </div>

            <input
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 4));
                setErrorMsg('');
              }}
              placeholder="Enter 4-Digit OTP (e.g. 1234)"
              className="w-full bg-white border-2 border-slate-300 rounded-xl px-4 py-3 text-center text-xl tracking-[0.35em] text-slate-900 font-mono font-extrabold focus:outline-none focus:border-emerald-600 placeholder:text-xs placeholder:tracking-normal placeholder:font-sans placeholder:font-semibold placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black py-3.5 rounded-xl text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Verifying OTP...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-slate-950" />
                  <span>Submit OTP &amp; Login</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
