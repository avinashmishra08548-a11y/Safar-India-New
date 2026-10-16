import React from 'react';
import { 
  CheckCircle2, 
  Printer, 
  Share2, 
  Phone, 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  X,
  FileText
} from 'lucide-react';
import { BookingRecord } from '../types';
import { formatINR } from '../utils/fareCalculator';

interface BookingConfirmationModalProps {
  booking: BookingRecord | null;
  onClose: () => void;
  onViewMyRides: () => void;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  booking,
  onClose,
  onViewMyRides
}) => {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = 
      `*SAFAR INDIA CABS - BOOKING CONFIRMED!*\n\n` +
      `*Booking ID:* ${booking.id}\n` +
      `*Customer:* ${booking.customerName}\n` +
      `*Contact:* +91 ${booking.customerPhone}\n` +
      `*Trip Type:* ${booking.tripType.toUpperCase()}\n` +
      `*Pickup:* ${booking.pickupCity} (${booking.pickupAddress})\n` +
      `*Drop:* ${booking.dropCity}\n` +
      `*Date & Time:* ${booking.pickupDate} at ${booking.pickupTime}\n` +
      `*Vehicle Class:* ${booking.cabName}\n` +
      `*Est. Distance:* ${booking.distanceKm} KM\n` +
      `---------------------------------\n` +
      `*Total Fare:* ${formatINR(booking.totalFare)}\n` +
      `*Advance Paid:* ${formatINR(booking.advancePaid)} (Txn: ${booking.transactionId})\n` +
      `*Balance Payable to Driver:* ${formatINR(booking.balanceDue)}\n` +
      `---------------------------------\n` +
      `*24/7 Helpline:* +91 77100 80992\n` +
      `_Driver & Cab details will be sent 2 hours before pickup._`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/917710080992?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl my-auto p-5 sm:p-6 shadow-2xl relative space-y-4">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Area */}
        <div id="printable-voucher" className="space-y-4">
          
          {/* Top Banner */}
          <div className="text-center border-b border-slate-800 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white">
              BOOKING CONFIRMED
            </h3>
            <div className="text-xs font-bold text-amber-400 mt-0.5 tracking-wider">
              BOOKING REFERENCE: {booking.id}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Your ride is locked with verified chauffeur dispatch guarantee.
            </p>

            {/* Quick Auto-filled WhatsApp Button right at top */}
            <div className="no-print pt-3">
              <button
                onClick={handleWhatsAppShare}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 active:scale-[0.99] border border-emerald-300/40"
              >
                <Share2 className="w-4 h-4 text-slate-950" />
                <span>Open WhatsApp with Auto-filled Booking Summary</span>
              </button>
            </div>
          </div>

          {/* Trip Details Card */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Customer:</span>
              <span className="font-bold text-white">{booking.customerName} (+91 {booking.customerPhone})</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Pickup Date & Time:</span>
              <span className="font-bold text-white">{booking.pickupDate} at {booking.pickupTime}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Vehicle Assigned:</span>
              <span className="font-bold text-amber-400">{booking.cabName}</span>
            </div>

            <div className="flex justify-between items-start pb-2 border-b border-slate-900">
              <span className="text-slate-400">Pickup Point:</span>
              <span className="font-medium text-slate-200 text-right max-w-[260px]">
                {booking.pickupAddress}, {booking.pickupCity} {booking.landmark ? `(Near: ${booking.landmark})` : ''}
              </span>
            </div>

            <div className="flex justify-between items-start pb-2 border-b border-slate-900">
              <span className="text-slate-400">Drop Point:</span>
              <span className="font-medium text-slate-200 text-right max-w-[260px]">
                {booking.dropAddress || booking.dropCity}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-slate-400">Billed Distance:</span>
              <span className="font-bold text-white">{booking.distanceKm} KM</span>
            </div>

            {/* Financials */}
            <div className="pt-1 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Estimated Fare:</span>
                <span className="font-bold text-white">{formatINR(booking.totalFare)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Advance Paid (20%):</span>
                <span className="font-bold text-emerald-400">{formatINR(booking.advancePaid)} (Success)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Balance to Pay Chauffeur:</span>
                <span className="font-black text-amber-400 text-sm">{formatINR(booking.balanceDue)}</span>
              </div>
            </div>

            {booking.customerGst && (
              <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                <span>GSTIN: {booking.customerGst}</span>
                <span>{booking.gstCompanyName}</span>
              </div>
            )}
          </div>

          {/* Chauffeur info note */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Chauffeur & Car Details Dispatch</span>
            </div>
            <p className="text-slate-300 text-[10px]">
              Driver phone number, name, and car registration plate will be sent via SMS & WhatsApp 2 hours prior to scheduled departure.
            </p>
          </div>

        </div>

        {/* Action Buttons (Excluded from print) */}
        <div className="no-print pt-2 space-y-3">
          
          {/* Prominent Auto-filled WhatsApp Redirect Card */}
          <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 p-4 rounded-2xl space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>Instant WhatsApp Dispatch Confirmation</span>
              </div>
              <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/20 px-2 py-0.5 rounded-md">FREE Auto-fill</span>
            </div>
            
            <p className="text-[11px] text-slate-300 leading-snug">
              Click below to send this complete booking voucher automatically to our 24/7 WhatsApp dispatch desk (+91 7710080992).
            </p>

            <button
              onClick={handleWhatsAppShare}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 active:scale-[0.99]"
            >
              <Share2 className="w-5 h-5 text-slate-950" />
              <span>Send Booking to WhatsApp (+91 77100 80992)</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download Tax Invoice</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onViewMyRides();
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-medium text-xs transition text-center"
            >
              View in My Rides & Bills
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
