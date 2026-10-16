import React, { useState } from 'react';
import { 
  Car, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Share2, 
  XCircle, 
  Search, 
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { BookingRecord } from '../types';
import { formatINR } from '../utils/fareCalculator';

interface MyBookingsViewProps {
  bookings: BookingRecord[];
  onSelectBookingForInvoice: (booking: BookingRecord) => void;
  onCancelBooking: (bookingId: string) => void;
  onNavigateToBooking: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  bookings,
  onSelectBookingForInvoice,
  onCancelBooking,
  onNavigateToBooking
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);

  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch = 
      b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.pickupCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.dropCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleShareWhatsApp = (b: BookingRecord) => {
    const text = 
      `*SAFAR INDIA CABS - BOOKING DETAILS*\n` +
      `Booking ID: ${b.id}\n` +
      `Route: ${b.pickupCity} -> ${b.dropCity}\n` +
      `Date: ${b.pickupDate} at ${b.pickupTime}\n` +
      `Car: ${b.cabName}\n` +
      `Total Fare: ${formatINR(b.totalFare)}\n` +
      `Advance Paid: ${formatINR(b.advancePaid)}\n` +
      `Balance Due to Driver: ${formatINR(b.balanceDue)}\n` +
      `Status: ${b.status.toUpperCase()}`;
    window.open(`https://wa.me/917710080992?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-5">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>My Rides & Invoices</span>
            <span className="text-xs bg-slate-800 text-amber-400 px-2.5 py-0.5 rounded-full border border-slate-700 font-bold">
              {bookings.length} Bookings
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Access trip receipts, download official GST vouchers, and track chauffeur status.
          </p>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterStatus === 'all' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('confirmed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterStatus === 'confirmed' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterStatus === 'completed' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID or City..."
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-950 text-slate-600 flex items-center justify-center mx-auto border border-slate-800">
            <Car className="w-8 h-8" />
          </div>
          <div className="max-w-sm mx-auto">
            <h3 className="text-base font-bold text-white">No Bookings Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {bookings.length === 0 
                ? "You haven't booked any rides yet. Book your first outstation or local cab now!"
                : "No rides matched your active filter or search query."}
            </p>
          </div>
          {bookings.length === 0 && (
            <button
              onClick={onNavigateToBooking}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition shadow-md"
            >
              Book a Cab Now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition shadow-lg space-y-3.5"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-amber-400 tracking-wider">
                    {b.id}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Booked on {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {b.status === 'confirmed' && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      CONFIRMED & SCHEDULED
                    </span>
                  )}
                  {b.status === 'completed' && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      COMPLETED
                    </span>
                  )}
                  {b.status === 'cancelled' && (
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      CANCELLED
                    </span>
                  )}
                </div>
              </div>

              {/* Journey Details */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                
                <div className="sm:col-span-5 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                    <span>{b.pickupCity}</span>
                    <span className="text-slate-500">→</span>
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                    <span>{b.dropCity}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pl-4">
                    Pickup: {b.pickupAddress}
                  </div>
                  <div className="text-[11px] text-slate-400 pl-4">
                    Vehicle: <strong className="text-slate-200">{b.cabName}</strong> ({b.tripType.toUpperCase()})
                  </div>
                </div>

                <div className="sm:col-span-3 space-y-1 sm:border-l sm:border-slate-800 sm:pl-4">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{b.pickupDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{b.pickupTime}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Distance: {b.distanceKm} KM
                  </div>
                </div>

                <div className="sm:col-span-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Total Fare</div>
                    <div className="text-sm font-black text-white">{formatINR(b.totalFare)}</div>
                    <div className="text-[10px] text-emerald-400">Advance: {formatINR(b.advancePaid)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase">Balance Due</div>
                    <div className="text-sm font-black text-amber-400">{formatINR(b.balanceDue)}</div>
                    <div className="text-[10px] text-slate-400">to driver</div>
                  </div>
                </div>

              </div>

              {/* Bottom Actions Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectBookingForInvoice(b)}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Invoice / Voucher</span>
                  </button>

                  <button
                    onClick={() => handleShareWhatsApp(b)}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-emerald-400 bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg transition"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                {b.status === 'confirmed' && (
                  <button
                    onClick={() => setCancelModalId(b.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium transition"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Cancel Cab Booking?</h4>
              <p className="text-xs text-slate-400">
                Booking ID: <strong className="text-amber-400">{cancelModalId}</strong>
                <br />
                As per CabBazar policy, cancellations made more than 6 hours prior to departure are eligible for 100% advance refund.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCancelModalId(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Keep Booking
              </button>
              <button
                onClick={() => {
                  onCancelBooking(cancelModalId);
                  setCancelModalId(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
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
