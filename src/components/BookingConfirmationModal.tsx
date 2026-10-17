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
  FileText,
  CreditCard,
  MessageSquare
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl my-auto p-5 sm:p-7 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Printable Area */}
        <div id="printable-voucher" className="space-y-4">
          
          {/* Top Banner */}
          <div className="text-center border-b border-slate-100 pb-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
              Payment & Booking Confirmed
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
              Booking Ref #{booking.id}
            </h3>

            {/* Fast2SMS Instant Confirmation Live Notice */}
            <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Instant SMS confirmation sent to <strong className="font-mono font-bold">+91 {booking.customerPhone}</strong> via Fast2SMS</span>
            </div>

            {/* Razorpay Transaction ID Tag */}
            {booking.transactionId && (
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-mono">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                <span>Razorpay Payment ID: <strong className="text-slate-800">{booking.transactionId}</strong></span>
              </div>
            )}
          </div>

          {/* Trip Details Card */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Customer:</span>
              <span className="font-bold text-slate-900">{booking.customerName} (+91 {booking.customerPhone})</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Pickup Date & Time:</span>
              <span className="font-bold text-slate-900">{booking.pickupDate} at {booking.pickupTime}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Vehicle Assigned:</span>
              <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {booking.cabName}
              </span>
            </div>

            <div className="flex justify-between items-start pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Pickup Point:</span>
              <span className="font-bold text-slate-900 text-right max-w-[270px]">
                {booking.pickupAddress}, {booking.pickupCity} {booking.landmark ? `(Near: ${booking.landmark})` : ''}
              </span>
            </div>

            <div className="flex justify-between items-start pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Drop Destination:</span>
              <span className="font-bold text-slate-900 text-right max-w-[270px]">
                {booking.dropAddress || booking.dropCity}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Road Distance:</span>
              <span className="font-bold text-slate-900 font-mono">{booking.distanceKm} KM</span>
            </div>

            {/* Financials Breakdown */}
            <div className="pt-1.5 space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Total Trip Fare:</span>
                <span className="font-bold text-slate-900">{formatINR(booking.totalFare)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">
                  {booking.paymentMode === 'full' ? 'Full Fare Paid Online:' : 'Advance Paid Online (Razorpay):'}
                </span>
                <span className="font-bold text-emerald-700 font-mono">{formatINR(booking.advancePaid)} (Paid ✓)</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-900 font-bold">Balance Payable to Driver:</span>
                <span className="font-black text-amber-700 text-sm font-mono">{formatINR(booking.balanceDue)}</span>
              </div>
            </div>

            {booking.customerGst && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex justify-between">
                <span>GSTIN: <strong>{booking.customerGst}</strong></span>
                <span>{booking.gstCompanyName}</span>
              </div>
            )}
          </div>

          {/* Chauffeur info note */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Chauffeur & Cab Allocation Policy</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Chauffeur contact number, name, and vehicle registration plate will be delivered via SMS & WhatsApp exactly 2 hours prior to your scheduled pickup time.
            </p>
          </div>

        </div>

        {/* Action Buttons (Excluded from print) */}
        <div className="no-print pt-1 space-y-2.5">
          
          {/* WhatsApp Direct Share Button */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span>Send Booking Voucher to WhatsApp (+91 77100 80992)</span>
          </button>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print Tax Invoice</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onViewMyRides();
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition text-center"
            >
              <span>View in My Rides</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
