import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle,
  Car,
  QrCode,
  Loader2,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { CabVehicle, CustomerUser, TripType, BookingRecord } from '../types';
import { formatINR, FareCalculationResult } from '../utils/fareCalculator';
import { sendDualBookingNotifications, sanitize10DigitPhone } from '../utils/smsService';
import {
  launchRazorpayStandardCheckout,
  loadRazorpayScript,
  PreferredPaymentMethod
} from '../utils/razorpayService';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  cab: CabVehicle;
  fareDetails: FareCalculationResult;
  tripType: TripType;
  pickupCity: string;
  dropCity: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  localPackageId: string;
  airportMode: 'pickup' | 'drop';
  airportTerminal: string;
  currentUser: CustomerUser | null;
  onBookingSuccess: (booking: BookingRecord) => void;
}

const PAYMENT_GATEWAY_METHODS: {
  id: PreferredPaymentMethod;
  label: string;
  subLabel: string;
  dotColor: string;
  isCard?: boolean;
  isQr?: boolean;
}[] = [
  { id: 'qr', label: 'UPI QR Code', subLabel: 'Scan with any app', dotColor: 'bg-amber-500', isQr: true },
  { id: 'gpay', label: 'Google Pay', subLabel: 'Instant UPI Intent', dotColor: 'bg-emerald-500' },
  { id: 'phonepe', label: 'PhonePe', subLabel: 'Instant UPI Intent', dotColor: 'bg-purple-600' },
  { id: 'paytm', label: 'Paytm UPI', subLabel: 'Paytm / Wallet UPI', dotColor: 'bg-sky-500' },
  { id: 'bhim', label: 'BHIM UPI', subLabel: 'All Bank UPI IDs', dotColor: 'bg-orange-500' },
  { id: 'card_netbanking', label: 'Cards & Banking', subLabel: 'Visa, RuPay, Banks', dotColor: 'bg-slate-700', isCard: true },
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  cab,
  fareDetails,
  tripType,
  pickupCity,
  dropCity,
  pickupDate,
  pickupTime,
  returnDate,
  returnTime,
  localPackageId,
  airportMode,
  airportTerminal,
  currentUser,
  onBookingSuccess
}) => {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [pickupAddress, setPickupAddress] = useState(pickupCity || '');
  const [landmark, setLandmark] = useState('');
  const [dropAddress, setDropAddress] = useState(dropCity || '');
  const [specialNotes, setSpecialNotes] = useState('');

  // GST optional
  const [needGst, setNeedGst] = useState(false);
  const [gstNumber, setGstNumber] = useState(currentUser?.gstNumber || '');
  const [gstCompanyName, setGstCompanyName] = useState(currentUser?.companyName || '');

  // Payment choice: 20% advance or 100% full
  const [paymentMode, setPaymentMode] = useState<'advance_20' | 'full'>('advance_20');
  const [selectedGatewayMethod, setSelectedGatewayMethod] = useState<PreferredPaymentMethod>('qr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Creating secure Razorpay order...');
  const [errorMessage, setErrorMessage] = useState('');

  const bottomAlertRef = useRef<HTMLDivElement | null>(null);

  // Pre-warm Razorpay Checkout SDK as soon as BookingModal opens
  useEffect(() => {
    loadRazorpayScript().catch(() => {});
  }, []);

  // Whenever an error occurs, make sure the error alert right above the Pay button is scrolled into view
  useEffect(() => {
    if (errorMessage && bottomAlertRef.current) {
      bottomAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errorMessage]);

  const payableNowAmount = paymentMode === 'advance_20' ? fareDetails.advanceFare : fareDetails.totalFare;
  const balanceDueAmount = paymentMode === 'advance_20' ? fareDetails.balanceDue : 0;

  const handlePayAndConfirm = async (overrideMethod?: PreferredPaymentMethod) => {
    if (isProcessing) return;

    const activeMethod = overrideMethod || selectedGatewayMethod;
    if (overrideMethod) {
      setSelectedGatewayMethod(overrideMethod);
    }

    // Form validation with immediate visible error feedback both at top and right above Pay button
    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage('Please enter passenger Full Name (at least 2 characters) before proceeding to payment.');
      const nameInput = document.getElementById('traveler-full-name');
      if (nameInput) nameInput.focus();
      return;
    }
    const cleanPhone = sanitize10DigitPhone(customerPhone);
    if (!customerPhone.trim() || cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number without +91 (e.g. 9876543210).');
      const phoneInput = document.getElementById('traveler-phone');
      if (phoneInput) phoneInput.focus();
      return;
    }
    if (!pickupAddress.trim()) {
      setErrorMessage('Please enter your complete doorstep pickup address.');
      const addrInput = document.getElementById('pickup-full-address');
      if (addrInput) addrInput.focus();
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);
    setProcessingStatus('Creating secure Razorpay order...');

    const methodObj = PAYMENT_GATEWAY_METHODS.find((m) => m.id === activeMethod);
    const methodLabel = methodObj ? methodObj.label : 'UPI / QR';

    const bookingId = 'SIC-' + Math.floor(100000 + Math.random() * 900000);
    const bookingDraft: BookingRecord = {
      id: bookingId,
      tripType,
      pickupCity,
      dropCity,
      pickupAddress: pickupAddress.trim(),
      landmark: landmark.trim() || undefined,
      dropAddress: dropAddress.trim() || undefined,
      pickupDate,
      pickupTime,
      returnDate: tripType === 'roundtrip' ? returnDate : undefined,
      returnTime: tripType === 'roundtrip' ? returnTime : undefined,
      localPackage: tripType === 'local' ? localPackageId : undefined,
      airportMode: tripType === 'airport' ? airportMode : undefined,
      airportTerminal: airportTerminal.trim() || undefined,
      cabId: cab.id,
      cabName: `${cab.name} (${cab.models})`,
      distanceKm: fareDetails.billedDistanceKm,
      baseFare: fareDetails.baseFare,
      driverAllowance: fareDetails.driverAllowance,
      tollsAndTaxes: fareDetails.tollsAndTaxes,
      gstAmount: fareDetails.gstAmount,
      totalFare: fareDetails.totalFare,
      advancePaid: payableNowAmount,
      balanceDue: balanceDueAmount,
      paymentMode,
      paymentMethod:
        paymentMode === 'advance_20'
          ? `Razorpay ${methodLabel} (20% Advance)`
          : `Razorpay ${methodLabel} (100% Full Fare)`,
      transactionId: '',
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: customerEmail.trim() || undefined,
      customerGst: needGst ? gstNumber.trim().toUpperCase() : undefined,
      gstCompanyName: needGst ? gstCompanyName.trim() : undefined,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      notes: specialNotes.trim() || undefined
    };

    // Save/update registered customer directory
    try {
      const raw = localStorage.getItem('safar_registered_customers');
      const list: CustomerUser[] = raw ? JSON.parse(raw) : [];
      if (!list.some((c) => c.phone === cleanPhone)) {
        list.push({
          id: `USR-${cleanPhone}`,
          name: customerName.trim(),
          phone: cleanPhone,
          email: customerEmail.trim() || undefined,
          gstNumber: needGst ? gstNumber.trim().toUpperCase() : undefined,
          companyName: needGst ? gstCompanyName.trim() : undefined,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('safar_registered_customers', JSON.stringify(list));
      }
    } catch {}

    // Create server-side Razorpay Order, open Razorpay Standard Checkout, and verify payment on server
    await launchRazorpayStandardCheckout({
      amountInRupees: payableNowAmount,
      totalFareRupees: fareDetails.totalFare,
      bookingId,
      tripType,
      cabId: cab.id,
      distanceKm: fareDetails.distanceKm,
      pickupCity,
      dropCity,
      pickupAddress: pickupAddress.trim(),
      pickupDate: `${pickupDate} at ${pickupTime}`,
      pickupDateRaw: pickupDate,
      pickupTimeRaw: pickupTime,
      returnDateRaw: tripType === 'roundtrip' ? returnDate : undefined,
      localPackageId,
      includeTolls: fareDetails.tollsAndTaxes > 0,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: customerEmail.trim() || undefined,
      cabName: `${cab.name} (${cab.models})`,
      paymentMode,
      preferredMethod: activeMethod,
      bookingDraft,
      onStatusChange: (statusText) => {
        setProcessingStatus(statusText);
      },
      onSuccess: async (paymentId: string, verifiedBooking?: BookingRecord) => {
        const finalConfirmedBooking: BookingRecord = verifiedBooking || {
          ...bookingDraft,
          status: 'confirmed',
          transactionId: paymentId,
          paymentMethod:
            paymentMode === 'advance_20'
              ? `Razorpay ${methodLabel} (${paymentId}) - 20% Advance`
              : `Razorpay ${methodLabel} (${paymentId}) - 100% Full Fare`
        };

        try {
          await sendDualBookingNotifications(finalConfirmedBooking);
        } catch (smsError) {
          console.warn('Traccar Cloud automated dual notification notice:', smsError);
        }

        setIsProcessing(false);
        onBookingSuccess(finalConfirmedBooking);
      },
      onDismiss: () => {
        setIsProcessing(false);
        setErrorMessage('Payment checkout window was closed before completing payment. Your booking is not yet confirmed.');
      },
      onError: (errMsg?: string) => {
        setIsProcessing(false);
        setErrorMessage(
          errMsg || 'Payment could not be completed or verified. Please try again.'
        );
      }
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[1000000] flex items-start sm:items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div className="booking-modal-container bg-white border border-slate-200 rounded-3xl w-full max-w-2xl my-2 sm:my-auto p-4 sm:p-6 pb-[130px] shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Sticky Top Header with Prominent Close (✕) Button */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200 rounded-t-3xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Car className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-extrabold text-slate-950 truncate">
                Confirm Cab Booking &amp; Payment
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                {cab.name} · {tripType === 'local' ? 'Local Rental' : `${pickupCity} → ${dropCity}`}
              </p>
            </div>
          </div>

          {/* 1. Clear, Clickable Close (✕) Button on Top-Right */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            aria-label="Close checkout modal"
            title="Close & Return to Search"
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-rose-100 disabled:opacity-50 text-slate-800 hover:text-rose-600 border border-slate-300 flex items-center justify-center shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Clean Informational Banner at Top */}
        {errorMessage ? (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5 font-semibold shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <div className="p-3.5 bg-[#EFF6FF] border border-blue-200/90 rounded-2xl text-[#1E40AF] text-xs sm:text-[13px] flex items-center gap-2.5 font-semibold shadow-2xs">
            <span className="text-base shrink-0" aria-hidden="true">🚖</span>
            <span>Please complete your advance payment below to confirm your cab booking instantly.</span>
          </div>
        )}

        {/* Itinerary Snapshot */}
        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Pickup Date</span>
            <span className="text-slate-900 font-bold">{pickupDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Pickup Time</span>
            <span className="text-slate-900 font-bold">{pickupTime}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Est. Distance</span>
            <span className="text-amber-700 font-bold">{fareDetails.billedDistanceKm} KM</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Fare</span>
            <span className="text-emerald-700 font-bold">{formatINR(fareDetails.totalFare)}</span>
          </div>
        </div>

        {/* Form Fields: Traveler & Address */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Passenger &amp; Contact Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="traveler-full-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                id="traveler-full-name"
                name="customerName"
                type="text"
                required
                aria-label="Traveler Full Name"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="traveler-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500 font-bold">
                  +91
                </span>
                <input
                  id="traveler-phone"
                  name="customerPhone"
                  type="tel"
                  inputMode="numeric"
                  required
                  maxLength={10}
                  aria-label="Traveler 10-digit mobile number"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value.replace(/\D/g, ''));
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="9876543210"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="traveler-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email (for Invoice)
              </label>
              <input
                id="traveler-email"
                name="customerEmail"
                type="email"
                aria-label="Traveler Email for Invoice"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pt-2">
            2. Doorstep Pickup &amp; Drop Address
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pickup-full-address" className="block text-xs font-semibold text-slate-700 mb-1">
                Complete Pickup Address *
              </label>
              <input
                id="pickup-full-address"
                name="pickupAddress"
                type="text"
                required
                aria-label="Complete Doorstep Pickup Address"
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="House/Office No., Street, Sector, Society Name"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="pickup-landmark" className="block text-xs font-semibold text-slate-700 mb-1">
                Landmark (Optional)
              </label>
              <input
                id="pickup-landmark"
                name="landmark"
                type="text"
                aria-label="Nearby Landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Near Metro Gate, Behind City Hospital"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Optional Drop Address */}
          {tripType !== 'local' && (
            <div>
              <label htmlFor="drop-full-address" className="block text-xs font-semibold text-slate-700 mb-1">
                Drop Address / Hotel / Area (Optional)
              </label>
              <input
                id="drop-full-address"
                name="dropAddress"
                type="text"
                aria-label="Destination Drop Address or Hotel"
                value={dropAddress}
                onChange={(e) => setDropAddress(e.target.value)}
                placeholder={`Destination area in ${dropCity} (e.g. Hotel Radisson / Airport / Cantt)`}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          )}

          {/* GST Input Option */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={needGst}
                onChange={(e) => setNeedGst(e.target.checked)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <span className="font-semibold text-slate-900">Add GST Details for Business Tax Credit</span>
            </label>

            {needGst && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={gstCompanyName}
                    onChange={(e) => setGstCompanyName(e.target.value)}
                    placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="07AAAAA0000A1Z5"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Options: 20% Advance or 100% Full Fare */}
        <div className="space-y-3.5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Pay via Razorpay UPI / QR or Cards
            </h4>
            <span className="text-[11px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <QrCode className="w-3 h-3 text-amber-600" />
              <span>Instant UPI &amp; QR</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 20% Advance */}
            <div
              onClick={() => !isProcessing && setPaymentMode('advance_20')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                paymentMode === 'advance_20'
                  ? 'border-amber-400 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/40'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">Pay 20% Advance Now</span>
                <span className="text-sm font-black text-amber-700">{formatINR(fareDetails.advanceFare)}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Balance {formatINR(fareDetails.balanceDue)} payable to chauffeur at trip completion.
              </p>
            </div>

            {/* 100% Full Payment */}
            <div
              onClick={() => !isProcessing && setPaymentMode('full')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                paymentMode === 'full'
                  ? 'border-amber-400 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/40'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">Pay 100% Full Fare</span>
                <span className="text-sm font-black text-slate-950">{formatINR(fareDetails.totalFare)}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Completely cashless journey. Zero balance payable at drop.
              </p>
            </div>
          </div>

          {/* 3. Interactive UPI Apps & Payment Method Selector */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                <span>Choose Payment Method (1-Tap Checkout):</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>100% Verified</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {PAYMENT_GATEWAY_METHODS.map((method) => {
                const isSelected = selectedGatewayMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setSelectedGatewayMethod(method.id);
                      handlePayAndConfirm(method.id);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-amber-400/20 border-2 border-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400/25'
                        : 'bg-white border border-slate-200 hover:border-amber-400 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {method.isQr ? (
                        <QrCode className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : method.isCard ? (
                        <CreditCard className="w-4 h-4 text-slate-700 shrink-0" />
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full ${method.dotColor} shrink-0`} />
                      )}
                      <span className="min-w-0">
                        <span className="block font-extrabold text-slate-900 truncate leading-tight">
                          {method.label}
                        </span>
                        <span className="block text-[10px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                          {method.subLabel}
                        </span>
                      </span>
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Compact Payable Summary Strip */}
            <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs">
              <div className="text-slate-600 font-medium">
                Payable Now ({paymentMode === 'advance_20' ? '20% Advance' : '100% Full Fare'}):
              </div>
              <div className="font-black text-slate-950 text-sm">
                {formatINR(payableNowAmount)}
              </div>
            </div>
          </div>

          {/* Visible Status / Error Alert Directly Above the Pay Button */}
          <div ref={bottomAlertRef}>
            {isProcessing && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-slate-900 text-xs flex items-center gap-2.5 font-bold shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                <span>{processingStatus}</span>
              </div>
            )}

            {!isProcessing && errorMessage && (
              <div
                role="alert"
                className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5 font-bold shadow-xs"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-extrabold text-rose-800">Payment Action Notice</div>
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button: Pay & Confirm -> Razorpay Standard Checkout */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handlePayAndConfirm()}
              className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black text-sm sm:text-base transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>{processingStatus}</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 text-slate-950" />
                  <span>Pay {formatINR(payableNowAmount)} &amp; Confirm</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Secure Razorpay UPI, QR &amp; Card Gateway</span>
            </span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Instant SMS Confirmation
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
