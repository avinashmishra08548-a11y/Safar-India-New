import React, { useState, useRef, useEffect } from 'react';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Share2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  User,
  Download,
  Loader2,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Phone
} from 'lucide-react';
import { BookingRecord, CustomerUser } from '../types';
import { formatINR } from '../utils/fareCalculator';
import { triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { generateBookingInvoicePdf } from './BookingConfirmationModal';
import {
  requestServerOtp,
  verifyServerOtp,
  sanitize10DigitPhone
} from '../utils/smsService';

interface MyBookingsViewProps {
  currentUser: CustomerUser | null;
  bookings: BookingRecord[];
  onOpenLogin: () => void;
  onLoginSuccess?: (user: CustomerUser) => void;
  onSelectBookingForInvoice: (booking: BookingRecord) => void;
  onCancelBooking: (bookingId: string) => void;
  onNavigateToBooking: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  currentUser,
  bookings,
  onOpenLogin,
  onLoginSuccess,
  onSelectBookingForInvoice,
  onCancelBooking,
  onNavigateToBooking
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [downloadingBookingId, setDownloadingBookingId] = useState<string | null>(null);

  // Inline Login States for My Rides
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [otpTouched, setOtpTouched] = useState(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const getPhoneError = (rawPhone: string, force = false): string => {
    const digits = (rawPhone || '').replace(/\D/g, '');
    if (!digits) {
      return force ? 'Mobile number is required. Please enter your 10-digit mobile number.' : '';
    }
    if (!/^[6-9]/.test(digits)) {
      return 'Invalid mobile number: Indian numbers must start with 6, 7, 8, or 9.';
    }
    if (digits.length < 10 && (force || phoneTouched || digits.length >= 1)) {
      return `Incomplete mobile number (${digits.length}/10 digits). Please enter all 10 digits.`;
    }
    return '';
  };

  const getOtpError = (rawOtp: string, force = false): string => {
    const digits = (rawOtp || '').replace(/\D/g, '');
    if (!digits) {
      return force ? 'Please enter the 4-digit OTP received on your WhatsApp.' : '';
    }
    if (digits.length < 4 && (force || otpTouched || digits.length >= 1)) {
      return `Incomplete OTP (${digits.length}/4 digits). Please enter all 4 digits.`;
    }
    return '';
  };

  const handleRequestOtp = async (isResend = false) => {
    setNameTouched(true);
    setPhoneTouched(true);
    setLoginError('');

    const cleanName = loginName.trim();
    if (cleanName.length < 2) {
      setLoginError('Please enter your full name (at least 2 characters) to continue.');
      return;
    }

    const phoneErr = getPhoneError(loginPhone, true);
    const cleanPhone = sanitize10DigitPhone(loginPhone);
    if (phoneErr || cleanPhone.length !== 10) {
      setLoginError(phoneErr || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (isSendingOtp || (isResend && resendCooldown > 0)) return;

    setIsSendingOtp(true);
    try {
      const res = await requestServerOtp(cleanPhone, {
        forceNew: isResend,
        customerName: cleanName
      });
      if (res.success && res.token) {
        setOtpToken(res.token);
        setOtpSent(true);
        if (isResend) setLoginOtp('');
        setResendCooldown(30);
        setLoginNotice(`4-Digit OTP sent to +91 ${cleanPhone} on WhatsApp. Enter it below to unlock your ride history.`);
        setTimeout(() => otpInputRef.current?.focus(), 80);
      } else {
        setLoginError(res.message || 'Unable to send OTP right now. Please try again.');
      }
    } catch {
      setLoginError('Network error while requesting OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    setPhoneTouched(true);

    const cleanName = loginName.trim();
    if (cleanName.length < 2) {
      setLoginError('Please enter your full name (at least 2 characters).');
      return;
    }

    const phoneErr = getPhoneError(loginPhone, true);
    const cleanPhone = sanitize10DigitPhone(loginPhone);
    if (phoneErr || cleanPhone.length !== 10) {
      setLoginError(phoneErr || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!otpSent || !otpToken) {
      await handleRequestOtp(false);
      return;
    }

    setOtpTouched(true);
    const otpErr = getOtpError(loginOtp, true);
    const cleanOtp = loginOtp.replace(/\D/g, '').trim();
    if (otpErr || cleanOtp.length !== 4) {
      setLoginError(otpErr || 'Please enter the 4-digit OTP.');
      return;
    }

    setIsVerifyingOtp(true);
    setLoginError('');
    const verifyRes = await verifyServerOtp(cleanPhone, cleanOtp, otpToken);
    setIsVerifyingOtp(false);

    if (!verifyRes.success) {
      setLoginError(
        verifyRes.message ||
          verifyRes.error ||
          `Incorrect OTP entered. Please check your WhatsApp (+91 ${cleanPhone}) and try again.`
      );
      return;
    }

    const user: CustomerUser = {
      id: `CUST-${cleanPhone}`,
      name: cleanName,
      phone: cleanPhone,
      createdAt: new Date().toISOString()
    };

    try {
      localStorage.setItem('safar_user', JSON.stringify(user));
      localStorage.setItem('safar_active_session_v1', JSON.stringify(user));
    } catch {}

    if (onLoginSuccess) {
      onLoginSuccess(user);
    }
  };

  const handleDirectDownloadGstBill = async (booking: BookingRecord) => {
    setDownloadingBookingId(booking.id);
    try {
      await generateBookingInvoicePdf(booking);
    } finally {
      setTimeout(() => setDownloadingBookingId(null), 650);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.pickupCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.dropCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const activeCount = bookings.filter((b) => b.status === 'confirmed').length;

  const handleShareWhatsApp = (b: BookingRecord) => {
    const text =
      `*SAFAR INDIA CABS - RIDE & GST INVOICE DETAILS*\n` +
      `Booking ID: ${b.id}\n` +
      `Invoice No: INV-${b.id.replace('SIC-', '')}\n` +
      `Route: ${b.pickupCity} -> ${b.dropCity}\n` +
      `Date: ${b.pickupDate} at ${b.pickupTime}\n` +
      `Car: ${b.cabName}\n` +
      `Total Fare (Incl. GST): ${formatINR(b.totalFare)}\n` +
      `Advance Paid: ${formatINR(b.advancePaid)}\n` +
      `Balance: ${b.status === 'completed' ? 'Rs. 0 (Settled)' : formatINR(b.balanceDue)}\n` +
      `Status: ${b.status.toUpperCase()}`;
    triggerWhatsAppDeepLink(undefined, text);
  };

  // PRIVACY & SESSION GATE: If not logged in, render Inline Mobile Login Card
  if (!currentUser) {
    const livePhoneErr = getPhoneError(loginPhone, false);
    const liveOtpErr = otpSent ? getOtpError(loginOtp, false) : '';
    const isNameInvalid = (loginName.length > 0 || nameTouched) && loginName.trim().length < 2;

    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto space-y-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
            <Lock className="w-7 h-7 text-amber-600" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" /> Persistent Customer Session
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">
              Login to View Your Rides &amp; GST Bills
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Enter your mobile number below to fetch your complete past &amp; upcoming ride details and download official GST Tax Invoices. Your login session stays saved automatically.
            </p>
          </div>
        </div>

        {loginError && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{loginError}</span>
          </div>
        )}

        {loginNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{loginNotice}</span>
          </div>
        )}

        <form onSubmit={handleVerifyAndLogin} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="rides-login-name"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Customer Full Name <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="rides-login-name"
                type="text"
                value={loginName}
                onBlur={() => setNameTouched(true)}
                onChange={(e) => {
                  setLoginName(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="Enter your full name (e.g. Aman Sharma)"
                className={`w-full min-h-[48px] bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-slate-900 text-sm font-semibold focus:outline-none focus:bg-white transition ${
                  isNameInvalid
                    ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/15'
                    : 'border-slate-300 focus:border-amber-500'
                }`}
              />
            </div>
            {isNameInvalid && (
              <p role="alert" className="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Please enter your valid full name (at least 2 characters).</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="rides-login-phone"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Registered Mobile Number (WhatsApp) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Smartphone className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${livePhoneErr ? 'text-rose-500' : 'text-slate-400'}`} />
              <span className="absolute left-9 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                +91
              </span>
              <input
                id="rides-login-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={loginPhone}
                onBlur={() => setPhoneTouched(true)}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setLoginPhone(clean);
                  if (loginError) setLoginError('');
                  if (clean.length === 10 && !loginName.trim()) {
                    try {
                      const raw = localStorage.getItem('safar_registered_customers');
                      const list: CustomerUser[] = raw ? JSON.parse(raw) : [];
                      const found = list.find((u) => sanitize10DigitPhone(u.phone) === clean);
                      if (found?.name) setLoginName(found.name);
                    } catch {}
                  }
                }}
                placeholder="Enter 10-digit mobile number"
                aria-invalid={Boolean(livePhoneErr)}
                className={`w-full min-h-[48px] bg-slate-50 border rounded-xl pl-16 pr-4 py-3 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:bg-white transition ${
                  livePhoneErr
                    ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/15'
                    : 'border-slate-300 focus:border-amber-500'
                }`}
              />
            </div>

            {livePhoneErr && (
              <div
                role="alert"
                className="mt-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-start gap-1.5 animate-in fade-in"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{livePhoneErr}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleRequestOtp(false)}
              disabled={isSendingOtp || (otpSent && resendCooldown > 0)}
              className="mt-3 w-full min-h-[48px] flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/80 text-white font-extrabold text-xs transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                {isSendingOtp ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <MessageSquare className="w-4 h-4 shrink-0" />
                )}
                <span>
                  {isSendingOtp
                    ? 'Sending OTP to WhatsApp...'
                    : otpSent && resendCooldown > 0
                    ? `OTP Sent to +91 ${loginPhone} ✓`
                    : 'Get OTP on WhatsApp'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px]">
                {isSendingOtp ? (
                  'Sending...'
                ) : otpSent && resendCooldown > 0 ? (
                  `Wait ${resendCooldown}s`
                ) : (
                  <>
                    Get OTP <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </span>
            </button>
          </div>

          {otpSent && (
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-emerald-300 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label htmlFor="rides-login-otp" className="text-xs font-extrabold text-slate-900">
                  Enter 4-Digit WhatsApp OTP <span className="text-rose-600">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleRequestOtp(true)}
                  disabled={resendCooldown > 0 || isSendingOtp}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 disabled:text-slate-400 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</span>
                </button>
              </div>

              <input
                ref={otpInputRef}
                id="rides-login-otp"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={loginOtp}
                onBlur={() => setOtpTouched(true)}
                onChange={(e) => {
                  setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 4));
                  if (loginError) setLoginError('');
                }}
                placeholder="Enter 4-Digit OTP"
                className={`w-full min-h-[50px] bg-white border-2 rounded-xl px-4 py-3 text-center text-xl tracking-[0.35em] font-mono font-extrabold text-slate-900 focus:outline-none placeholder:text-xs placeholder:tracking-normal placeholder:font-sans transition ${
                  liveOtpErr
                    ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/15'
                    : 'border-emerald-400 focus:border-emerald-600'
                }`}
              />

              {liveOtpErr && (
                <p role="alert" className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{liveOtpErr}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={isVerifyingOtp}
                className="w-full min-h-[50px] py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verifying &amp; Loading Ride History...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Verify OTP &amp; View My Rides</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Prefer popup login?</span>
          <button
            type="button"
            onClick={onOpenLogin}
            className="font-bold text-amber-700 hover:underline cursor-pointer"
          >
            Open Full Login Modal →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Persistent Customer Account & Ride Summary Banner */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 shadow-md">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white">
                {currentUser.name}&apos;s Ride History &amp; GST Invoices
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-extrabold">
                <CheckCircle2 className="w-3 h-3" /> Session Saved (+91 {currentUser.phone})
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Showing all past completed trips and active bookings linked to <strong className="text-amber-300 font-mono">+91 {currentUser.phone}</strong>. Download official GST Tax Invoices anytime.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 shrink-0">
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-center">
            <div className="text-base sm:text-lg font-black text-white">{bookings.length}</div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Rides</div>
          </div>
          <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl px-3.5 py-2.5 text-center">
            <div className="text-base sm:text-lg font-black text-emerald-400">{completedCount}</div>
            <div className="text-[10px] font-bold uppercase text-emerald-300">Completed</div>
          </div>
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl px-3.5 py-2.5 text-center">
            <div className="text-base sm:text-lg font-black text-amber-400">{activeCount}</div>
            <div className="text-[10px] font-bold uppercase text-amber-300">Upcoming</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar with Spacious Mobile Touch Targets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all' as const, label: `All Rides (${bookings.length})` },
            { id: 'completed' as const, label: `Completed • GST Bills (${completedCount})` },
            { id: 'confirmed' as const, label: `Upcoming (${activeCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-amber-400 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Booking ID or City..."
            aria-label="Search rides by Booking ID or City"
            className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto border border-slate-200">
            <Car className="w-8 h-8" />
          </div>
          <div className="max-w-sm mx-auto">
            <h3 className="text-base font-black text-slate-900">No Matching Rides Found</h3>
            <p className="text-xs text-slate-600 mt-1">
              {bookings.length === 0
                ? `No rides found for +91 ${currentUser.phone}. Book your outstation or local cab now!`
                : 'No rides matched your selected filter or search query.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToBooking}
            className="min-h-[46px] px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition shadow-sm cursor-pointer"
          >
            Book a Cab Now →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const isCompleted = b.status === 'completed';
            const isDownloading = downloadingBookingId === b.id;
            const gstAmount = b.gstAmount || Math.round((b.baseFare || b.totalFare) * 0.05);
            const invoiceNumber = `INV-GST-${b.id.replace('SIC-', '')}`;

            return (
              <div
                key={b.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 sm:p-6 transition shadow-sm space-y-4"
              >
                {/* Top Row: Booking ID, GST Invoice Number & Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm sm:text-base font-black text-slate-950 font-mono bg-amber-400/25 border border-amber-400/50 px-3 py-1 rounded-xl">
                      {b.id}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      GST Bill: {invoiceNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Booked on {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.status === 'completed' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full font-extrabold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        COMPLETED • GST BILL READY
                      </span>
                    )}
                    {b.status === 'confirmed' && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-extrabold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        CONFIRMED &amp; SCHEDULED
                      </span>
                    )}
                    {b.status === 'cancelled' && (
                      <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full font-extrabold">
                        CANCELLED
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: Route, Schedule, Chauffeur & GST Fare Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center text-xs">
                  {/* Route & Vehicle Details */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="flex items-center gap-2 text-sm sm:text-base font-black text-slate-950">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{b.pickupCity}</span>
                      <span className="text-slate-400">→</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span>{b.dropCity}</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1 pl-4">
                      <div>
                        <strong className="text-slate-800">Pickup:</strong> {b.pickupAddress || b.pickupCity}
                      </div>
                      {b.dropAddress && (
                        <div>
                          <strong className="text-slate-800">Drop:</strong> {b.dropAddress}
                        </div>
                      )}
                      <div>
                        <strong className="text-slate-800">Vehicle:</strong>{' '}
                        <span className="font-bold text-slate-900">{b.cabName}</span> ({b.tripType.toUpperCase()})
                      </div>
                    </div>
                  </div>

                  {/* Schedule & Chauffeur Info */}
                  <div className="lg:col-span-3 space-y-1.5 lg:border-l lg:border-slate-200 lg:pl-4">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{b.pickupDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{b.pickupTime}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                      Billed Distance: <strong>{b.distanceKm} KM</strong>
                    </div>
                    {b.driverName && (
                      <div className="pt-1 text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>
                          Driver: {b.driverName} ({b.driverVehicleNo || 'Verified Cab'})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Fare & GST Breakdown Box */}
                  <div className="lg:col-span-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Base Fare + Tolls:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatINR(Math.max(0, b.totalFare - gstAmount))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>GST (5% SAC 996412):</span>
                      <span className="font-mono font-bold text-slate-900">{formatINR(gstAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
                      <span className="font-extrabold text-slate-950">Total Invoice Fare:</span>
                      <span className="text-sm font-black font-mono text-slate-950">{formatINR(b.totalFare)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] pt-0.5">
                      <span className="text-emerald-700 font-bold">
                        {isCompleted ? `Paid in Full: ${formatINR(b.totalFare)}` : `Advance Paid: ${formatINR(b.advancePaid)}`}
                      </span>
                      <span className="font-bold text-amber-800">
                        {isCompleted ? 'Balance: ₹0' : `Balance: ${formatINR(b.balanceDue)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons: Prominent Download GST Bill / Invoice CTA */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleDirectDownloadGstBill(b)}
                      disabled={isDownloading}
                      className={`min-h-[46px] px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-98 ${
                        isCompleted
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
                      }`}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span>Generating GST Invoice PDF...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 shrink-0" />
                          <span>
                            {isCompleted ? 'Download GST Bill / Invoice (PDF)' : 'Download Booking GST Invoice'}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectBookingForInvoice(b)}
                      className="min-h-[46px] flex items-center gap-2 text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>View &amp; Print GST Bill</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(b)}
                      className="min-h-[46px] flex items-center gap-2 text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Share on WhatsApp</span>
                    </button>
                  </div>

                  {b.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => setCancelModalId(b.id)}
                      className="min-h-[42px] px-3 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition cursor-pointer"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-black text-slate-950">Cancel Cab Booking?</h4>
              <p className="text-xs text-slate-600">
                Booking ID: <strong className="text-amber-700 font-mono">{cancelModalId}</strong>
                <br />
                Cancellations made more than 6 hours prior to scheduled pickup are eligible for 100% advance refund.
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setCancelModalId(null)}
                className="flex-1 min-h-[46px] py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={() => {
                  onCancelBooking(cancelModalId);
                  setCancelModalId(null);
                }}
                className="flex-1 min-h-[46px] py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Yes, Cancel Ride
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
