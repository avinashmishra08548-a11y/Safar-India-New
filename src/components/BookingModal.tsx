import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle,
  Building2,
  AlertCircle,
  Car,
  QrCode,
  Loader2,
  Share2,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { CabVehicle, CustomerUser, TripType, BookingRecord } from '../types';
import { formatINR, FareCalculationResult } from '../utils/fareCalculator';
import { sendDualBookingNotifications, sanitize10DigitPhone } from '../utils/smsService';
import { launchRazorpayStandardCheckout } from '../utils/razorpayService';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const payableNowAmount = paymentMode === 'advance_20' ? fareDetails.advanceFare : fareDetails.totalFare;
  const balanceDueAmount = paymentMode === 'advance_20' ? fareDetails.balanceDue : 0;

  // 1. Connect Pay & Confirm button directly to Razorpay Standard Checkout modal
  const handlePayAndConfirm = async () => {
    // Form validation
    if (!customerName.trim()) {
      setErrorMessage('Please enter traveler full name');
      return;
    }
    const cleanPhone = sanitize10DigitPhone(customerPhone);
    if (!customerPhone.trim() || cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number without +91 (e.g. 9876543210)');
      return;
    }
    if (!pickupAddress.trim()) {
      setErrorMessage('Please enter complete doorstep pickup address');
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);

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
      paymentMethod: paymentMode === 'advance_20' ? 'Razorpay (20% Advance)' : 'Razorpay (100% Full Fare)',
      transactionId: '',
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: customerEmail.trim() || undefined,
      customerGst: needGst ? gstNumber.trim().toUpperCase() : undefined,
      gstCompanyName: needGst ? gstCompanyName.trim() : undefined,
      status: 'confirmed', // 3. On payment success, set booking status to "Confirmed"
      createdAt: new Date().toISOString(),
      notes: specialNotes.trim() || undefined
    };

    // Save/update registered customer directory
    try {
      const raw = localStorage.getItem('safar_registered_customers');
      let list: CustomerUser[] = raw ? JSON.parse(raw) : [];
      if (!list.some(c => c.phone === cleanPhone)) {
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

    // 2. Open Razorpay Standard Checkout modal with explicitly enabled Dynamic UPI / QR Code
    launchRazorpayStandardCheckout({
      amountInRupees: payableNowAmount,
      bookingId,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerEmail: customerEmail.trim() || undefined,
      cabName: `${cab.name} (${cab.models})`,
      pickupCity,
      dropCity,
      pickupDate: `${pickupDate} at ${pickupTime}`,
      paymentMode,
      onSuccess: async (paymentId: string) => {
        // 3. Status set to "Confirmed" on payment success
        const confirmedBooking: BookingRecord = {
          ...bookingDraft,
          status: 'confirmed',
          transactionId: paymentId,
          paymentMethod: paymentMode === 'advance_20' 
            ? `Razorpay Dynamic UPI (${paymentId}) - 20% Advance` 
            : `Razorpay Dynamic UPI (${paymentId}) - 100% Full Fare`
        };

        // 2 & 3. Automated Dual SMS Notification System (Customer Confirmation + Admin Fleet Alert)
        // Dispatches in parallel without requiring any manual action from the customer
        try {
          await sendDualBookingNotifications(confirmedBooking);
        } catch (smsError) {
          console.warn('Fast2SMS automated dual notification notice:', smsError);
        }

        setIsProcessing(false);
        onBookingSuccess(confirmedBooking);
      },
      onDismiss: () => {
        setIsProcessing(false);
        setErrorMessage('Payment window was closed before completion. You can click below to try again.');
      },
      onError: (errMsg?: string) => {
        setIsProcessing(false);
        setErrorMessage(errMsg || 'Payment was not completed. Please try again or choose another payment method.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl my-auto p-5 sm:p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Car className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Confirm Cab Booking & Payment
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {cab.name} · {tripType === 'local' ? 'Local Rental' : `${pickupCity} → ${dropCity}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Itinerary Snapshot */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
            1. Passenger & Contact Details
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
                onChange={(e) => setCustomerName(e.target.value)}
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
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
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
            2. Doorstep Pickup & Drop Address
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
                onChange={(e) => setPickupAddress(e.target.value)}
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
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Choose Payment Method
            </h4>
            <span className="text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <QrCode className="w-3 h-3 text-amber-600" />
              <span>Dynamic UPI / QR Enabled</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 20% Advance */}
            <div
              onClick={() => setPaymentMode('advance_20')}
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
                Balance {formatINR(fareDetails.balanceDue)} to be paid to chauffeur at trip completion.
              </p>
            </div>

            {/* 100% Full Payment */}
            <div
              onClick={() => setPaymentMode('full')}
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

          {/* Explicit Dynamic UPI Apps Strip */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                <span>Supported Instant UPI & Gateway Methods:</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                <span>Verified Gateway</span>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="bg-white border border-slate-200 text-slate-800 font-extrabold px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Paytm
              </span>
              <span className="bg-white border border-slate-200 text-slate-800 font-extrabold px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span> PhonePe
              </span>
              <span className="bg-white border border-slate-200 text-slate-800 font-extrabold px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Google Pay
              </span>
              <span className="bg-white border border-slate-200 text-slate-800 font-extrabold px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> BHIM UPI
              </span>
              <span className="bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-slate-600" /> All Cards / NetBanking
              </span>
            </div>

            <p className="text-[10px] text-slate-500 leading-tight pt-0.5">
              Clicking below securely opens the official Razorpay Standard Checkout modal with real-time Dynamic UPI QR code scanning and direct app intent.
            </p>
          </div>

          {/* Primary Action Button: Pay & Confirm -> Razorpay Standard Checkout */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePayAndConfirm}
              className="w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black text-sm sm:text-base transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  <span>Opening Razorpay Checkout Modal...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 text-slate-950" />
                  <span>Pay {formatINR(payableNowAmount)} & Confirm</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Razorpay Standard Checkout 256-Bit SSL Encrypted</span>
            </span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Instant Fast2SMS Confirmation
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
