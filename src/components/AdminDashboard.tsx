import React, { useState } from 'react';
import { 
  Shield, 
  Car, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Phone, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  FileSpreadsheet, 
  Search,
  Filter,
  UserCheck,
  X,
  AlertCircle
} from 'lucide-react';
import { BookingRecord } from '../types';
import { formatINR } from '../utils/fareCalculator';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: BookingRecord[];
  onUpdateBookingStatus: (bookingId: string, status: 'confirmed' | 'completed' | 'cancelled', driverInfo?: { name: string; phone: string; carPlate: string }) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  bookings,
  onUpdateBookingStatus
}) => {
  if (!isOpen) return null;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedBookingForDriver, setSelectedBookingForDriver] = useState<BookingRecord | null>(null);

  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverCarPlate, setDriverCarPlate] = useState('');

  // Metrics
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'confirmed').length;
  const totalRevenueAdvance = bookings.reduce((sum, b) => b.status !== 'cancelled' ? sum + b.advancePaid : sum, 0);
  const totalBalancePending = bookings.reduce((sum, b) => b.status === 'confirmed' ? sum + b.balanceDue : sum, 0);

  const filteredBookings = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchSearch = 
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.customerPhone.includes(search) ||
      b.pickupCity.toLowerCase().includes(search.toLowerCase()) ||
      b.dropCity.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForDriver) return;
    onUpdateBookingStatus(selectedBookingForDriver.id, 'confirmed', {
      name: driverName,
      phone: driverPhone,
      carPlate: driverCarPlate
    });

    // Send WhatsApp dispatch notification to customer
    const dispatchText = 
      `*SAFAR INDIA CABS - DRIVER ALLOCATED*\n\n` +
      `Hello ${selectedBookingForDriver.customerName},\n` +
      `Your chauffeur for Booking *#${selectedBookingForDriver.id}* has been assigned:\n\n` +
      `*Chauffeur Name:* ${driverName}\n` +
      `*Chauffeur Phone:* +91 ${driverPhone}\n` +
      `*Vehicle Plate No:* ${driverCarPlate.toUpperCase()}\n` +
      `*Car Model:* ${selectedBookingForDriver.cabName}\n` +
      `*Pickup Time:* ${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}\n` +
      `*Balance to Pay Driver:* ${formatINR(selectedBookingForDriver.balanceDue)}\n\n` +
      `_Driver will call you 30 minutes before arrival._\n` +
      `*24/7 Helpline:* +91 77100 80992`;

    const encoded = encodeURIComponent(dispatchText);
    window.open(`https://wa.me/91${selectedBookingForDriver.customerPhone}?text=${encoded}`, '_blank');

    setSelectedBookingForDriver(null);
    setDriverName('');
    setDriverPhone('');
    setDriverCarPlate('');
  };

  const exportCSV = () => {
    const headers = ['Booking ID', 'Date', 'Customer Name', 'Phone', 'From', 'To', 'Vehicle', 'Total Fare', 'Advance Paid', 'Balance Due', 'Status'];
    const rows = bookings.map(b => [
      b.id,
      b.pickupDate,
      `"${b.customerName}"`,
      b.customerPhone,
      `"${b.pickupCity}"`,
      `"${b.dropCity}"`,
      `"${b.cabName}"`,
      b.totalFare,
      b.advancePaid,
      b.balanceDue,
      b.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Safar_Cabs_Bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl my-auto p-5 sm:p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>Owner & Dispatch Control Center</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Live Online
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Safar India Cabs · Real-time customer bookings, advance revenue & chauffeur assignment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Rides</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">{totalBookings}</div>
            <span className="text-[10px] text-emerald-400 font-medium">{activeBookings} Active Scheduled</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">20% Advance Collected</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{formatINR(totalRevenueAdvance)}</div>
            <span className="text-[10px] text-slate-500">Credited to Razorpay</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Payable at Drop</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{formatINR(totalBalancePending)}</div>
            <span className="text-[10px] text-slate-500">Collected by Chauffeurs</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Quick Action</span>
            <button
              onClick={exportCSV}
              className="mt-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Bookings CSV</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'all' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
            >
              All ({totalBookings})
            </button>
            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'confirmed' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
            >
              Active ({activeBookings})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${statusFilter === 'completed' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'}`}
            >
              Completed
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Customer, City or ID..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Bookings Table / Cards */}
        <div className="space-y-3">
          {filteredBookings.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800">
              No bookings found matching your criteria.
            </div>
          ) : (
            filteredBookings.map((b) => (
              <div
                key={b.id}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 text-xs">{b.id}</span>
                    <span className="text-slate-500 text-[10px]">·</span>
                    <span className="text-white text-xs font-bold">{b.customerName}</span>
                    <span className="text-slate-400 text-xs">(+91 {b.customerPhone})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:+91${b.customerPhone}`}
                      className="p-1.5 bg-slate-900 text-slate-300 hover:text-white rounded-lg border border-slate-800"
                      title="Call Customer"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                    <a
                      href={`https://wa.me/91${b.customerPhone}?text=Hello%20${encodeURIComponent(b.customerName)},%20this%20is%20Safar%20India%20Cabs%20regarding%20your%20booking%20${b.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-slate-900 text-slate-300 hover:text-emerald-400 rounded-lg border border-slate-800"
                      title="WhatsApp Customer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                    {b.status === 'confirmed' ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        {b.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Journey Route</span>
                    <div className="font-semibold text-white">{b.pickupCity} → {b.dropCity}</div>
                    <div className="text-[10px] text-slate-400 truncate">{b.pickupAddress}</div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Date & Cab Class</span>
                    <div className="font-semibold text-slate-200">{b.pickupDate} at {b.pickupTime}</div>
                    <div className="text-[10px] text-amber-400 font-medium">{b.cabName}</div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Fares & Payments</span>
                    <div className="text-white font-bold">Total: {formatINR(b.totalFare)}</div>
                    <div className="text-[10px] text-emerald-400">Advance Paid: {formatINR(b.advancePaid)}</div>
                    <div className="text-[10px] text-amber-400">Driver Balance: {formatINR(b.balanceDue)}</div>
                  </div>

                  <div className="flex sm:flex-col justify-end items-end gap-1.5">
                    {b.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => setSelectedBookingForDriver(b)}
                          className="py-1.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Assign Chauffeur</span>
                        </button>

                        <button
                          onClick={() => onUpdateBookingStatus(b.id, 'completed')}
                          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl transition"
                        >
                          Mark Completed
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

      {/* Driver Assignment Modal */}
      {selectedBookingForDriver && (
        <div className="fixed inset-0 bg-slate-950/90 z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white">Assign Chauffeur & Vehicle</h4>
                <p className="text-xs text-amber-400 font-medium">Booking #{selectedBookingForDriver.id} · {selectedBookingForDriver.customerName}</p>
              </div>
              <button
                onClick={() => setSelectedBookingForDriver(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Chauffeur / Driver Name *</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Chauffeur Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Vehicle Registration Plate *</label>
                <input
                  type="text"
                  required
                  value={driverCarPlate}
                  onChange={(e) => setDriverCarPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. DL 01 CA 1234 / HR 26 DQ 5602"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
                Saving will automatically format and open WhatsApp to dispatch driver details to the customer (+91 {selectedBookingForDriver.customerPhone})!
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBookingForDriver(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4 text-slate-950" />
                  <span>Assign & Send WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
