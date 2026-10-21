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
  sanitize10DigitPhone
} from '../utils/smsService';

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

  const sendingLockRef = useRef<boolean>(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for Resend OTP (prevents repeated accidental OTP dispatches)
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  // Reset modal state cleanly when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      sendingLockRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    const clean = sanitize10DigitPhone(val);
    setPhone(clean);
    setErrorMsg('');

    // If phone number changes after requesting OTP, reset OTP session for the new number
    if (clean.length < 10) {
      setOtpRequested(false);
      setOtpToken('');
      setSmsDeliveryInfo('');
      setResendSeconds(0);
    } else if (clean.length === 10) {
      // Auto-fill returning customer's saved name if available
      try {
        const raw = localStorage.getItem('safar_registered_customers');
        const list: CustomerUser[] = raw ? JSON.parse(raw) : [];
        const existing = list.find((u) => sanitize10DigitPhone(u.phone) === clean);
        if (existing?.name && !name.trim()) {
          setName(existing.name);
        }
      } catch {}
    }
  };

  // Single-dispatch "Get OTP on WhatsApp" handler — sends strictly 1 OTP to the customer's entered number
  const handleGetOtpOnWhatsApp = async (isResend: boolean = false) => {
    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter your valid 10-digit WhatsApp mobile number first.');
      return;
    }

    // Block concurrent or cooldown clicks so multiple OTPs are never sent
    if (sendingLockRef.current || isSending) return;
    if (isResend && resendSeconds > 0) return;
    if (!isResend && otpRequested && resendSeconds > 0 && otpToken) {
      otpInputRef.current?.focus();
      return;
    }

    sendingLockRef.current = true;
    setIsSending(true);
    setErrorMsg('');
    setOtpRequested(true);
    setFailedAttempts(0);

    try {
      const res = await requestServerOtp(cleanPhone, {
        forceNew: isResend,
        customerName: name.trim() || 'Traveler'
      });

      if (res.success && res.token) {
        setOtpToken(res.token);
        setOtpExpiresAt(res.expiresAt || Date.now() + 10 * 60 * 1000);
        if (isResend) setOtp('');
        setSmsDeliveryInfo(
          `4-digit OTP sent to your WhatsApp number +91 ${cleanPhone}. Please enter it below.`
        );
        setResendSeconds(30);
        setTimeout(() => otpInputRef.current?.focus(), 80);
      } else {
        setErrorMsg(res.message || 'Could not send OTP right now. Please try again.');
      }
    } catch {
      setErrorMsg('Network issue while sending OTP. Please try again.');
    } finally {
      setIsSending(false);
      sendingLockRef.current = false;
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = sanitize10DigitPhone(phone);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp mobile number.');
      return;
    }

    // If user pressed Enter before requesting OTP, trigger Get OTP first
    if (!otpRequested || !otpToken) {
      await handleGetOtpOnWhatsApp(false);
      return;
    }

    const cleanOtp = otp.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 4) {
      setErrorMsg('Please enter the 4-digit OTP sent to your WhatsApp.');
      otpInputRef.current?.focus();
      return;
    }

    if (otpExpiresAt > 0 && Date.now() > otpExpiresAt) {
      setErrorMsg('OTP has expired. Please click "Resend OTP" to get a fresh code.');
      return;
    }

    if (failedAttempts >= 5) {
      setErrorMsg('Too many incorrect attempts. Please click "Resend OTP".');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    const verifyRes = await verifyServerOtp(cleanPhone, cleanOtp, otpToken);
    setIsVerifying(false);

    if (!verifyRes.success) {
      setFailedAttempts((prev) => prev + 1);
      const remaining = Math.max(0, 4 - failedAttempts);
      setErrorMsg(
        remaining > 0
          ? `Incorrect OTP. Please check your WhatsApp (+91 ${cleanPhone}). (${remaining} attempts left)`
          : 'Too many incorrect attempts. Please click "Resend OTP".'
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
  const isOtpCooldownActive = otpRequested && resendSeconds > 0;

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
            Customer WhatsApp Login
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your WhatsApp number and tap Get OTP to receive a single 4-digit verification code
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
          {/* 1. WHATSAPP MOBILE NUMBER INPUT */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. Your WhatsApp Number *
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

            {/* PROMINENT "GET OTP ON WHATSAPP" BUTTON (Protected against duplicate clicks) */}
            <button
              type="button"
              onClick={() => handleGetOtpOnWhatsApp(false)}
              disabled={isSending || cleanPhoneLen !== 10 || isOtpCooldownActive}
              className={`mt-2.5 w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-white transition shadow-sm ${
                isSending || cleanPhoneLen !== 10 || isOtpCooldownActive
                  ? 'bg-emerald-600/80 opacity-90 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer active:scale-99'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-extrabold">
                <MessageSquare className="w-4 h-4 text-white shrink-0" />
                <span>
                  {isSending
                    ? 'Sending OTP to your WhatsApp...'
                    : isOtpCooldownActive
                    ? `OTP Sent to +91 ${phone} ✓`
                    : 'Get OTP on WhatsApp'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-950 bg-amber-400 px-2.5 py-1 rounded-lg">
                {isSending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Sending
                  </>
                ) : isOtpCooldownActive ? (
                  `Wait ${resendSeconds}s`
                ) : (
                  <>
                    Get OTP <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </span>
            </button>
          </div>

          {/* 2. FULL NAME (OPTIONAL) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          {/* 3. 4-DIGIT OTP INPUT & SUBMIT BUTTON */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-900">
                2. Enter 4-Digit WhatsApp OTP *
              </label>
              {otpRequested && (
                <button
                  type="button"
                  onClick={() => handleGetOtpOnWhatsApp(true)}
                  disabled={resendSeconds > 0 || isSending}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                  {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : 'Resend OTP'}
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
              disabled={isVerifying || isSending}
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
                  <span>Verify OTP &amp; Login</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

