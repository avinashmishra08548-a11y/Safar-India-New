import React, { useState, useEffect } from 'react';
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
  KeyRound,
  Lock,
  Radio,
  Send,
  Server,
  Globe,
  Download,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { BookingRecord, CustomerUser } from '../types';
import { formatINR } from '../utils/fareCalculator';
import { 
  getFast2SmsApiKey, 
  setFast2SmsApiKey, 
  verifyFast2SmsKey, 
  FAST2SMS_ENDPOINT, 
  DEFAULT_FAST2SMS_KEY, 
  sanitize10DigitPhone 
} from '../utils/smsService';
import {
  getOlaMapsApiKey,
  setOlaMapsApiKey,
  getOlaMapsClientId,
  setOlaMapsClientId,
  getOlaMapsClientSecret,
  setOlaMapsClientSecret,
  DEFAULT_OLA_API_KEY,
  DEFAULT_OLA_CLIENT_ID,
  DEFAULT_OLA_CLIENT_SECRET,
  testOlaMapsCredentials
} from '../utils/olaMapsService';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: BookingRecord[];
  onUpdateBookingStatus: (bookingId: string, status: 'confirmed' | 'completed' | 'cancelled', driverInfo?: { name: string; phone: string; carPlate: string }) => void;
  onChangePin: (newPin: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  bookings,
  onUpdateBookingStatus,
  onChangePin
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'bookings' | 'customers' | 'gateways' | 'security'>('bookings');
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [selectedBookingForDriver, setSelectedBookingForDriver] = useState<BookingRecord | null>(null);

  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverCarPlate, setDriverCarPlate] = useState('');

  // Fast2SMS API management states
  const [fast2smsKey, setFast2smsKey] = useState(() => getFast2SmsApiKey());
  const [fast2smsSaveMsg, setFast2smsSaveMsg] = useState('');
  const [testPhone, setTestPhone] = useState('7710080992');
  const [testStatus, setTestStatus] = useState<{ running: boolean; ok?: boolean; message?: string }>({ running: false });

  // Ola Maps API states
  const [olaApiKey, setOlaApiKey] = useState(() => getOlaMapsApiKey());
  const [olaClientId, setOlaClientId] = useState(() => getOlaMapsClientId());
  const [olaClientSecret, setOlaClientSecret] = useState(() => getOlaMapsClientSecret());
  const [olaSaveMsg, setOlaSaveMsg] = useState('');
  const [olaTestStatus, setOlaTestStatus] = useState<{ running: boolean; ok?: boolean; message?: string }>({ running: false });

  // Change PIN states
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');

  // Registered customers loaded from storage
  const [registeredCustomers, setRegisteredCustomers] = useState<CustomerUser[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('safar_registered_customers');
      if (raw) {
        setRegisteredCustomers(JSON.parse(raw));
      } else {
        // Collect unique customers from bookings
        const map = new Map<string, CustomerUser>();
        bookings.forEach(b => {
          if (!map.has(b.customerPhone)) {
            map.set(b.customerPhone, {
              name: b.customerName,
              phone: b.customerPhone,
              email: b.customerEmail
            });
          }
        });
        setRegisteredCustomers(Array.from(map.values()));
      }
    } catch {}
  }, [bookings]);

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

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      setPinErrorMsg('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinErrorMsg('New PIN and Confirm PIN do not match');
      return;
    }
    onChangePin(newPin);
    setPinErrorMsg('');
    setPinChangeMsg('Owner Security PIN updated successfully!');
    setNewPin('');
    setConfirmPin('');
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

  const exportCustomersCSV = () => {
    const headers = ['Customer Name', 'Mobile Number', 'Email', 'Total Rides', 'Total Spend (INR)'];
    const rows = registeredCustomers.map(c => {
      const userRides = bookings.filter(b => b.customerPhone === c.phone);
      const userSpend = userRides.reduce((sum, b) => sum + b.totalFare, 0);
      return [
        `"${c.name}"`,
        c.phone,
        `"${c.email || ''}"`,
        userRides.length,
        userSpend
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Safar_Cabs_Customer_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveFast2SmsKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fast2smsKey.trim()) return;
    setFast2SmsApiKey(fast2smsKey.trim());
    setFast2smsSaveMsg('Fast2SMS API Key updated & active across all customer login/OTP flows!');
    setTimeout(() => setFast2smsSaveMsg(''), 4000);
  };

  const handleResetToOfficialKey = () => {
    setFast2smsKey(DEFAULT_FAST2SMS_KEY);
    setFast2SmsApiKey(DEFAULT_FAST2SMS_KEY);
    setFast2smsSaveMsg('Reset to official 84-character Fast2SMS Key! Old/corrupted keys cleared.');
    setTimeout(() => setFast2smsSaveMsg(''), 4000);
  };

  const handleTestFast2Sms = async () => {
    const cleanPhone = sanitize10DigitPhone(testPhone);
    if (!fast2smsKey.trim() || !cleanPhone || cleanPhone.length !== 10) {
      setTestStatus({ running: false, ok: false, message: 'Please enter a valid 10-digit mobile number without +91 (e.g. 9876543210)' });
      return;
    }
    setTestStatus({ running: true });
    const res = await verifyFast2SmsKey(fast2smsKey.trim(), cleanPhone);
    setTestStatus({ running: false, ok: res.ok, message: res.info });
  };

  const handleSaveOlaMaps = (e: React.FormEvent) => {
    e.preventDefault();
    setOlaMapsApiKey(olaApiKey);
    setOlaMapsClientId(olaClientId);
    setOlaMapsClientSecret(olaClientSecret);
    setOlaSaveMsg('Ola Maps Credentials saved & applied across Autocomplete and Dynamic Fare routing!');
    setTimeout(() => setOlaSaveMsg(''), 4000);
  };

  const handleResetOlaMaps = () => {
    setOlaApiKey(DEFAULT_OLA_API_KEY);
    setOlaClientId(DEFAULT_OLA_CLIENT_ID);
    setOlaClientSecret(DEFAULT_OLA_CLIENT_SECRET);
    setOlaMapsApiKey(DEFAULT_OLA_API_KEY);
    setOlaMapsClientId(DEFAULT_OLA_CLIENT_ID);
    setOlaMapsClientSecret(DEFAULT_OLA_CLIENT_SECRET);
    setOlaSaveMsg('Reset to official Ola Maps credentials provided by owner.');
    setTimeout(() => setOlaSaveMsg(''), 4000);
  };

  const handleTestOlaMaps = async () => {
    setOlaTestStatus({ running: true });
    const res = await testOlaMapsCredentials(olaApiKey, olaClientId, olaClientSecret);
    setOlaTestStatus({ running: false, ok: res.ok, message: res.message });
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
                  Confidential
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Safar India Cabs · Real-time bookings, advance revenue, customers & chauffeur management
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bookings' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>All Bookings ({totalBookings})</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'customers' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Directory ({registeredCustomers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gateways')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'gateways' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>SMS & Free APIs</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'security' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security PIN</span>
          </button>
        </div>

        {activeTab === 'bookings' && (
          <div className="space-y-4">
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
                <span className="text-[10px] text-slate-500">Credited via Razorpay</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Payable at Drop</span>
                <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{formatINR(totalBalancePending)}</div>
                <span className="text-[10px] text-slate-500">To be collected by Drivers</span>
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

            {/* Bookings List */}
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
        )}

        {/* Tab 2: Registered Customers Directory */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-white">Registered Customer Profiles & Ride Records</h4>
                <p className="text-xs text-slate-400">Total {registeredCustomers.length} saved customer contacts stored securely in system</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search name or mobile..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  onClick={exportCustomersCSV}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {registeredCustomers
                .filter(c => 
                  !customerSearch || 
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                  c.phone.includes(customerSearch)
                )
                .map((c, i) => {
                  const userRides = bookings.filter(b => b.customerPhone === c.phone);
                  const userSpend = userRides.reduce((sum, b) => sum + b.totalFare, 0);
                  return (
                    <div key={i} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-sm">{c.name}</div>
                        <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                          {userRides.length} Ride{userRides.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>+91 {c.phone}</span>
                      </div>

                      {c.email && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {c.email}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                        <span className="text-slate-500 text-[10px]">Total Booking Value:</span>
                        <span className="text-emerald-400 font-bold">{formatINR(userSpend)}</span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <a
                          href={`tel:+91${c.phone}`}
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold text-center border border-slate-800 flex items-center justify-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/91${c.phone}?text=Hello%20${encodeURIComponent(c.name)},%20greetings%20from%20Safar%20India%20Cabs!`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-lg text-xs font-bold text-center border border-slate-800 flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 3: SMS Gateway & Free APIs Configuration */}
        {activeTab === 'gateways' && (
          <div className="space-y-6">
            
            {/* Fast2SMS Panel */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Fast2SMS Live OTP Gateway</h4>
                    <p className="text-xs text-slate-400">Official SMS gateway for sending instant verification codes to customer phones</p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                  Integrated & Ready
                </span>
              </div>

              {fast2smsSaveMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold">
                  {fast2smsSaveMsg}
                </div>
              )}

              <form onSubmit={handleSaveFast2SmsKey} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Fast2SMS Authorization API Key
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      required
                      value={fast2smsKey}
                      onChange={(e) => setFast2smsKey(e.target.value)}
                      placeholder="Paste your Fast2SMS API Key"
                      className="flex-1 min-w-[260px] bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition"
                    >
                      Save Key
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToOfficialKey}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition"
                      title="Clear local cache and restore verified 84-char key"
                    >
                      Reset Official Key
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Complete Active Key: <span className="font-mono text-emerald-400 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded break-all">6B8sTgArm4kSQUaZC9iNhVdFEf3IPlMqoRDeuYjwGHvtnpXW51IKdZWsjBgMr2wl54C0JOYh9nuiVxcz</span>
                  </p>
                </div>
              </form>

              {/* Technical Specifications Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-[11px]">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">API Endpoint</span>
                  <span className="font-mono text-emerald-400 font-bold break-all">{FAST2SMS_ENDPOINT}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Active Delivery Route</span>
                  <span className="font-mono text-emerald-400 font-bold">Route 'q' (Wallet ₹150)</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Phone Sanitization</span>
                  <span className="text-slate-300 font-medium">Strict 10-digit without +91</span>
                </div>
              </div>

              {/* Test Live SMS Tool */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white block">Test Live Fast2SMS Dispatch</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500 font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter mobile number to test"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={testStatus.running}
                    onClick={handleTestFast2Sms}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    {testStatus.running ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Test SMS...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span>Send Test Live SMS</span>
                      </>
                    )}
                  </button>
                </div>

                {testStatus.message && (
                  <div className={`p-3 rounded-xl text-xs font-medium ${
                    testStatus.ok 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}>
                    <div className="font-bold">{testStatus.ok ? 'Fast2SMS Server Status:' : 'Fast2SMS Gateway Report:'}</div>
                    <div className="mt-0.5">{testStatus.message}</div>
                    <div className="text-[10px] text-slate-300 mt-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <p className="font-bold text-amber-400">💡 Fast2SMS Live Activation Guide (Step-by-Step):</p>
                      <p>1. Aapka complete 84-character API key verify ho gaya hai.</p>
                      <p>2. Fast2SMS ke official niyam ke mutabiq, external mobile numbers par SMS delivery ke liye aapke Fast2SMS wallet me <strong className="text-white">kam se kam ₹100 ka 1st transaction / recharge</strong> hona chahiye, ya phir fast2sms.com ke OTP menu me website domain verify hona chahiye.</p>
                      <p>3. Website me humne <strong className="text-emerald-400">Smart Instant OTP</strong> laga rakha hai taaki agar Fast2SMS wallet pending ho, tab bhi customer on-screen code se instantly verify hokar direct WhatsApp summary par redirect ho sake!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OLA MAPS API INTEGRATION CARD */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">
                      Ola Maps Platform Integration
                    </h4>
                    <p className="text-xs text-slate-400">
                      Exact Location Search (Autocomplete) & Accurate Road KM Driving Distance / Dynamic Fare
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                  Active & Safeguarded
                </span>
              </div>

              {olaSaveMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold">
                  {olaSaveMsg}
                </div>
              )}

              <form onSubmit={handleSaveOlaMaps} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Ola Maps API Key
                    </label>
                    <input
                      type="text"
                      required
                      value={olaApiKey}
                      onChange={(e) => setOlaApiKey(e.target.value)}
                      placeholder="Paste Ola Maps API Key"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={olaClientId}
                      onChange={(e) => setOlaClientId(e.target.value)}
                      placeholder="Ola Maps Client ID"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={olaClientSecret}
                      onChange={(e) => setOlaClientSecret(e.target.value)}
                      placeholder="Ola Maps Client Secret"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition"
                  >
                    Save Ola Maps Credentials
                  </button>
                  <button
                    type="button"
                    onClick={handleResetOlaMaps}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
                  >
                    Reset to Default Credentials
                  </button>
                  <button
                    type="button"
                    disabled={olaTestStatus.running}
                    onClick={handleTestOlaMaps}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-emerald-500/30"
                  >
                    {olaTestStatus.running ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Test Ola Maps Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {olaTestStatus.message && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  olaTestStatus.ok
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                }`}>
                  <div className="font-bold">{olaTestStatus.ok ? 'Ola Maps Connected:' : 'Ola Maps Diagnostic:'}</div>
                  <div className="mt-0.5">{olaTestStatus.message}</div>
                </div>
              )}

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-[11px]">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">1. Autocomplete API</span>
                  <span className="font-mono text-emerald-400 font-bold">places/v1/autocomplete</span>
                  <div className="text-[10px] text-slate-400">Pickup & Drop location suggestions</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">2. Driving Directions</span>
                  <span className="font-mono text-emerald-400 font-bold">routing/v1/directions</span>
                  <div className="text-[10px] text-slate-400">Exact highway road driving distance & travel time</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">3. Fallback Engine</span>
                  <span className="font-mono text-emerald-400 font-bold">National Highway Matrix</span>
                  <div className="text-[10px] text-slate-400">Ensures 100% booking continuity even if offline</div>
                </div>
              </div>
            </div>

            {/* Zero Cost Free APIs Architecture Card */}
            <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
              <div className="border-b border-slate-900 pb-3">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>100% Zero Monthly Cost Solutions (Permanent Savings)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  You requested to avoid expensive Google Maps and Meta WhatsApp APIs. Here is how your website achieves top performance for ₹0:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-400">OpenStreetMap & OSRM Engine</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold text-[10px]">₹0 Free Forever</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Instead of paying Google Maps $200+/month with mandatory foreign credit card billing, we use open highway coordinates and OSRM distance engine covering 80+ Indian cities and major airport hubs.
                  </p>
                  <div className="text-[10px] text-slate-500 font-medium">✓ No Google billing · No monthly quotas · Instant calculation</div>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-400">WhatsApp Click-to-Chat (wa.me)</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold text-[10px]">₹0 Free Forever</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Instead of paying Meta WhatsApp Business APIs (which charge ₹0.40 - ₹0.80 per message plus ₹2,000/month SaaS platforms like Interakt/Wati), we generate auto-filled dispatch messages directly to your number (+91 7710080992) for FREE.
                  </p>
                  <div className="text-[10px] text-slate-500 font-medium">✓ Auto-filled voucher · Direct to owner · Zero platform fees</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 4: Security & PIN Management */}
        {activeTab === 'security' && (
          <div className="max-w-md mx-auto bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-400/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-white">Change Owner Access PIN</h4>
              <p className="text-xs text-slate-400">Set a confidential 4-digit PIN for your control center</p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400 leading-relaxed">
              <span className="font-bold text-amber-400 block mb-0.5">Strict Confidentiality Notice:</span>
              Your Owner PIN is never displayed, hinted, or suggested anywhere on the public website. Only someone who enters your secret PIN can access customer records or dispatch bookings.
            </div>

            {pinChangeMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs text-center font-bold">
                {pinChangeMsg}
              </div>
            )}

            {pinErrorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs text-center font-bold">
                {pinErrorMsg}
              </div>
            )}

            <form onSubmit={handleUpdatePin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">New 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.5em] text-xl font-black bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-amber-400 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Confirm 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.5em] text-xl font-black bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-amber-400 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow transition"
              >
                Save New PIN
              </button>
            </form>
          </div>
        )}

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
