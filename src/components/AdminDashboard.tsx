import React, { useState, useEffect } from 'react';
import {
  Shield,
  Car,
  Users,
  Phone,
  MessageSquare,
  FileSpreadsheet,
  Search,
  UserCheck,
  X,
  KeyRound,
  Lock,
  Radio,
  Send,
  Globe,
  Download,
  CheckCircle2,
  Loader2,
  CreditCard,
  Trash2,
  Sun,
  Moon,
  Calendar,
  MapPin,
  IndianRupee,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  Star
} from 'lucide-react';
import { BookingRecord, CustomerUser } from '../types';
import { downloadProductionAab, downloadProductionApk, downloadReleaseKeystore } from '../utils/aabBinaryData';
import { generateBookingInvoicePdf } from './BookingConfirmationModal';
import { OwnerBillGenerator } from './OwnerBillGenerator';
import { formatINR } from '../utils/fareCalculator';
import {
  buildWhatsAppSchemeUrl,
  triggerWhatsAppDeepLink,
  buildCustomerReviewWhatsAppUrl,
  triggerCustomerReviewWhatsApp
} from '../utils/whatsapp';
import {
  getTraccarLocalEndpoint,
  getTraccarLocalToken,
  getTraccarToken,
  setTraccarConfig,
  verifyTraccarGateway,
  DEFAULT_LOCAL_ENDPOINT,
  DEFAULT_LOCAL_TOKEN,
  TRACCAR_SMS_ENDPOINT,
  DEFAULT_TRACCAR_TOKEN,
  sanitize10DigitPhone,
  sendDriverAssignmentSms
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
import {
  getRazorpayKeyId,
  setRazorpayKeyId,
  DEFAULT_RAZORPAY_KEY,
  launchRazorpayStandardCheckout
} from '../utils/razorpayService';
import {
  DEFAULT_WHATSAPP_PHONE_ID,
  DEFAULT_WHATSAPP_ACCESS_TOKEN,
  getWhatsAppPhoneId,
  getWhatsAppAccessToken,
  setWhatsAppConfig,
  whatsAppService,
  formatWhatsAppBookingConfirmationMessage,
  formatWhatsAppDriverAllotmentCustomerMessage,
  formatWhatsAppDriverDutyAllotmentMessage
} from '../utils/whatsappService';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: BookingRecord[];
  onUpdateBookingStatus: (
    bookingId: string,
    status: 'confirmed' | 'completed' | 'cancelled',
    driverInfo?: { name: string; phone: string; carPlate: string; vehicleModel?: string }
  ) => void;
  onChangePin: (newPin: string) => void;
  onClearDemoBookings?: () => void;
  onRefreshBookings?: () => Promise<void> | void;
  onOpenBookingReceipt?: (booking: BookingRecord) => void;
  onCreateManualBooking?: (booking: BookingRecord) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  bookings,
  onUpdateBookingStatus,
  onChangePin,
  onClearDemoBookings,
  onRefreshBookings,
  onOpenBookingReceipt,
  onCreateManualBooking
}) => {
  const [activeTab, setActiveTab] = useState<
    'bookings' | 'bill_generator' | 'customers' | 'gateways' | 'security'
  >('bookings');
  const [prefillBillBooking, setPrefillBillBooking] = useState<BookingRecord | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('safar_owner_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('safar_owner_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending_driver' | 'driver_assigned' | 'confirmed' | 'completed' | 'cancelled'
  >('all');
  const [tripTypeFilter, setTripTypeFilter] = useState<'all' | 'oneway' | 'roundtrip' | 'local' | 'airport'>('all');
  const [selectedBookingForDriver, setSelectedBookingForDriver] = useState<BookingRecord | null>(null);
  const [isSyncingBookings, setIsSyncingBookings] = useState(false);
  const [syncSuccessBadge, setSyncSuccessBadge] = useState('');

  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverVehicleModel, setDriverVehicleModel] = useState('');
  const [driverCarPlate, setDriverCarPlate] = useState('');
  const [isSendingDriverSms, setIsSendingDriverSms] = useState(false);
  const [driverSmsSuccessNotice, setDriverSmsSuccessNotice] = useState('');
  const [driverAssignedStepComplete, setDriverAssignedStepComplete] = useState(false);

  // Owner Instant Booking & Receipt Generator Form States
  const [showQuickInvoiceForm, setShowQuickInvoiceForm] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickPickup, setQuickPickup] = useState('Delhi NCR');
  const [quickDrop, setQuickDrop] = useState('Agra');
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickTime, setQuickTime] = useState('07:00 AM');
  const [quickVehicle, setQuickVehicle] = useState('Hatchback AC (WagonR, Celerio, Tiago or equivalent)');
  const [quickDistanceKm, setQuickDistanceKm] = useState('230');
  const [quickTotalFare, setQuickTotalFare] = useState('2457');
  const [quickAdvancePaid, setQuickAdvancePaid] = useState('491');
  const [quickBookingStatus, setQuickBookingStatus] = useState<'confirmed' | 'completed'>('confirmed');
  const [quickFormError, setQuickFormError] = useState('');

  // Traccar Local Service + Cloud Fallback SMS Gateway management states
  const [traccarLocalEndpoint, setTraccarLocalEndpointState] = useState(() => getTraccarLocalEndpoint());
  const [traccarLocalToken, setTraccarLocalTokenState] = useState(() => getTraccarLocalToken());
  const [traccarToken, setTraccarTokenState] = useState(() => getTraccarToken());
  const [traccarSaveMsg, setTraccarSaveMsg] = useState('');
  const [testPhone, setTestPhone] = useState('7710080992');
  const [testStatus, setTestStatus] = useState<{
    running: boolean;
    ok?: boolean;
    message?: string;
    errorCode?: string;
    rawResponse?: any;
  }>({ running: false });

  // Ola Maps API states
  const [olaApiKey, setOlaApiKey] = useState(() => getOlaMapsApiKey());
  const [olaClientId, setOlaClientId] = useState(() => getOlaMapsClientId());
  const [olaClientSecret, setOlaClientSecret] = useState(() => getOlaMapsClientSecret());
  const [olaSaveMsg, setOlaSaveMsg] = useState('');
  const [olaTestStatus, setOlaTestStatus] = useState<{ running: boolean; ok?: boolean; message?: string }>({ running: false });

  // Razorpay Gateway states
  const [razorpayKey, setRazorpayKey] = useState(() => getRazorpayKeyId());
  const [razorpaySaveMsg, setRazorpaySaveMsg] = useState('');
  const [razorpayTestStatus, setRazorpayTestStatus] = useState<string>('');

  // Meta WhatsApp Cloud API states
  const [waPhoneId, setWaPhoneId] = useState(() => getWhatsAppPhoneId());
  const [waAccessToken, setWaAccessToken] = useState(() => getWhatsAppAccessToken());
  const [waSaveMsg, setWaSaveMsg] = useState('');
  const [waTestPhone, setWaTestPhone] = useState('7710080992');
  const [waTestStatus, setWaTestStatus] = useState<{ running: boolean; ok?: boolean; message?: string }>({ running: false });

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
        const map = new Map<string, CustomerUser>();
        bookings.forEach((b) => {
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

  if (!isOpen) return null;

  // Financial & Booking Metrics
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingDriverBookings = bookings.filter((b) => b.status === 'confirmed' && !b.driverName).length;
  const assignedDriverBookings = bookings.filter((b) => b.status !== 'cancelled' && Boolean(b.driverName)).length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled').length;

  const verifiedAdvanceRevenue = bookings.reduce(
    (sum, b) => (b.status === 'confirmed' || b.status === 'completed' ? sum + (Number(b.advancePaid) || 0) : sum),
    0
  );

  const outstandingBalanceDue = bookings.reduce(
    (sum, b) => (b.status === 'confirmed' ? sum + (Number(b.balanceDue) || 0) : sum),
    0
  );

  const totalBookingVolume = bookings.reduce(
    (sum, b) => (b.status !== 'cancelled' ? sum + (Number(b.totalFare) || 0) : sum),
    0
  );

  const filteredBookings = bookings.filter((b) => {
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending_driver'
        ? b.status === 'confirmed' && !b.driverName
        : statusFilter === 'driver_assigned'
        ? b.status !== 'cancelled' && Boolean(b.driverName)
        : b.status === statusFilter;
    const matchTripType = tripTypeFilter === 'all' || b.tripType === tripTypeFilter;
    const matchSearch =
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.customerPhone.includes(search) ||
      b.pickupCity.toLowerCase().includes(search.toLowerCase()) ||
      b.dropCity.toLowerCase().includes(search.toLowerCase()) ||
      (b.driverName && b.driverName.toLowerCase().includes(search.toLowerCase())) ||
      (b.driverVehicleNo && b.driverVehicleNo.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchTripType && matchSearch;
  });

  const handleManualSyncBookings = async () => {
    if (!onRefreshBookings) return;
    setIsSyncingBookings(true);
    try {
      await onRefreshBookings();
      setSyncSuccessBadge('Synced Live!');
      setTimeout(() => setSyncSuccessBadge(''), 3000);
    } finally {
      setIsSyncingBookings(false);
    }
  };

  const handleOpenAssignModal = (b: BookingRecord) => {
    setSelectedBookingForDriver(b);
    setDriverName(b.driverName || '');
    setDriverPhone(b.driverPhone || '');
    setDriverVehicleModel(b.driverVehicleModel || b.cabName || 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)');
    setDriverCarPlate(b.driverVehicleNo || '');
    setDriverSmsSuccessNotice('');
    setDriverAssignedStepComplete(false);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForDriver) return;

    const b = selectedBookingForDriver;
    const cleanDriverPhone = sanitize10DigitPhone(driverPhone);
    const vehicleModel = driverVehicleModel.trim() || b.cabName;
    const vehicleNo = driverCarPlate.trim().toUpperCase().replace(/\s+/g, '');

    setIsSendingDriverSms(true);

    const updatedStatus = b.status === 'cancelled' ? 'confirmed' : b.status;

    onUpdateBookingStatus(b.id, updatedStatus, {
      name: driverName.trim(),
      phone: cleanDriverPhone,
      carPlate: vehicleNo,
      vehicleModel
    });

    // Update modal's active booking snapshot so preview & WhatsApp links have latest driver info
    setSelectedBookingForDriver({
      ...b,
      status: updatedStatus,
      driverName: driverName.trim(),
      driverPhone: cleanDriverPhone,
      driverVehicleModel: vehicleModel,
      driverVehicleNo: vehicleNo
    });

    const travelDate = `${b.pickupDate} at ${b.pickupTime}`;
    try {
      await sendDriverAssignmentSms({
        customerPhone: b.customerPhone,
        customerName: b.customerName,
        bookingId: b.id,
        pickup: b.pickupCity,
        drop: b.dropCity,
        travelDate,
        cabClass: vehicleModel,
        balanceAmount: b.balanceDue,
        driverName: driverName.trim(),
        driverPhone: cleanDriverPhone,
        vehicleModel,
        vehicleNo
      });
    } catch (smsErr) {
      console.warn('Driver assignment SMS dispatch notice:', smsErr);
    }

    setIsSendingDriverSms(false);
    setDriverAssignedStepComplete(true);
    setDriverSmsSuccessNotice(
      `Driver & Vehicle Assigned for Booking #${b.id}! Click below to send or verify WhatsApp messages to Customer (+91 ${b.customerPhone}) and Driver (+91 ${cleanDriverPhone}).`
    );
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
    const headers = [
      'Booking ID',
      'Date',
      'Customer Name',
      'Phone',
      'From',
      'To',
      'Vehicle',
      'Total Fare',
      'Advance Paid',
      'Balance Due',
      'Status'
    ];
    const rows = bookings.map((b) => [
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
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
    const rows = registeredCustomers.map((c) => {
      const userRides = bookings.filter((b) => b.customerPhone === c.phone);
      const userSpend = userRides.reduce((sum, b) => sum + b.totalFare, 0);
      return [`"${c.name}"`, c.phone, `"${c.email || ''}"`, userRides.length, userSpend];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Safar_Cabs_Customer_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveTraccarToken = (e: React.FormEvent) => {
    e.preventDefault();
    setTraccarConfig({
      localEndpoint: traccarLocalEndpoint.trim() || DEFAULT_LOCAL_ENDPOINT,
      localToken: traccarLocalToken.trim() || DEFAULT_LOCAL_TOKEN,
      cloudToken: traccarToken.trim() || DEFAULT_TRACCAR_TOKEN
    });
    setTraccarSaveMsg('Traccar Local Service + Cloud Fallback configuration saved & synced!');
    setTimeout(() => setTraccarSaveMsg(''), 4000);
  };

  const handleResetToOfficialKey = () => {
    setTraccarLocalEndpointState(DEFAULT_LOCAL_ENDPOINT);
    setTraccarLocalTokenState(DEFAULT_LOCAL_TOKEN);
    setTraccarTokenState(DEFAULT_TRACCAR_TOKEN);
    setTraccarConfig({
      localEndpoint: DEFAULT_LOCAL_ENDPOINT,
      localToken: DEFAULT_LOCAL_TOKEN,
      cloudToken: DEFAULT_TRACCAR_TOKEN
    });
    setTraccarSaveMsg('Reset to default Local Service + Cloud Fallback credentials!');
    setTimeout(() => setTraccarSaveMsg(''), 4000);
  };

  const handleTestTraccarSms = async () => {
    const cleanPhone = sanitize10DigitPhone(testPhone);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setTestStatus({
        running: false,
        ok: false,
        message: 'Please enter a valid 10-digit mobile number (e.g. 9876543210)'
      });
      return;
    }
    setTestStatus({ running: true });
    const res = await verifyTraccarGateway(
      {
        localEndpoint: traccarLocalEndpoint.trim() || DEFAULT_LOCAL_ENDPOINT,
        localToken: traccarLocalToken.trim() || DEFAULT_LOCAL_TOKEN,
        cloudToken: traccarToken.trim() || DEFAULT_TRACCAR_TOKEN
      },
      cleanPhone
    );
    setTestStatus({
      running: false,
      ok: res.ok,
      message: res.info,
      errorCode: res.errorCode,
      rawResponse: res.rawResponse
    });
  };

  const handleSaveRazorpayKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!razorpayKey.trim()) return;
    setRazorpayKeyId(razorpayKey.trim());
    setRazorpaySaveMsg('Razorpay Key ID saved and active across customer checkout flows!');
    setTimeout(() => setRazorpaySaveMsg(''), 4000);
  };

  const handleResetRazorpayKey = () => {
    setRazorpayKeyId(DEFAULT_RAZORPAY_KEY);
    setRazorpayKey(DEFAULT_RAZORPAY_KEY);
    setRazorpaySaveMsg('Reset to official Razorpay Standard Checkout test key.');
    setTimeout(() => setRazorpaySaveMsg(''), 4000);
  };

  const handleTestRazorpay = () => {
    setRazorpayTestStatus('Creating server order & launching Razorpay Standard Checkout...');
    const testDate = new Date().toISOString().split('T')[0];
    launchRazorpayStandardCheckout({
      amountInRupees: 432,
      totalFareRupees: 2161,
      bookingId: 'SIC-' + Math.floor(100000 + Math.random() * 900000),
      tripType: 'oneway',
      cabId: 'sedan',
      distanceKm: 130,
      pickupCity: 'Delhi NCR',
      dropCity: 'Agra',
      pickupAddress: 'T3 IGI Airport, New Delhi',
      pickupDate: `${testDate} at 08:00 AM`,
      pickupDateRaw: testDate,
      pickupTimeRaw: '08:00 AM',
      includeTolls: true,
      customerName: 'Admin Test Traveler',
      customerPhone: testPhone || '7710080992',
      customerEmail: 'admin@safarindiacabs.in',
      cabName: 'Sedan AC (Dzire / Etios)',
      paymentMode: 'advance_20',
      onSuccess: (paymentId) => {
        setRazorpayTestStatus(`Razorpay Order & Payment Verified! Payment ID: ${paymentId}`);
      },
      onDismiss: () => {
        setRazorpayTestStatus('Razorpay Checkout modal was dismissed by user.');
      },
      onError: (errMessage) => {
        setRazorpayTestStatus(
          'Razorpay Notice: ' + (typeof errMessage === 'string' ? errMessage : JSON.stringify(errMessage))
        );
      }
    });
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
    setOlaSaveMsg('Reset to official Ola Maps credentials.');
    setTimeout(() => setOlaSaveMsg(''), 4000);
  };

  const handleTestOlaMaps = async () => {
    setOlaTestStatus({ running: true });
    const res = await testOlaMapsCredentials(olaApiKey, olaClientId, olaClientSecret);
    setOlaTestStatus({ running: false, ok: res.ok, message: res.message });
  };

  const handleSaveWhatsAppConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsAppConfig(waPhoneId, waAccessToken);
    setWaSaveMsg(
      'Meta WhatsApp Cloud API credentials saved & active across Login OTP, Booking Confirmation & Driver Assignment!'
    );
    setTimeout(() => setWaSaveMsg(''), 4000);
  };

  const handleResetWhatsAppConfig = () => {
    setWaPhoneId(DEFAULT_WHATSAPP_PHONE_ID);
    setWaAccessToken(DEFAULT_WHATSAPP_ACCESS_TOKEN);
    setWhatsAppConfig(DEFAULT_WHATSAPP_PHONE_ID, DEFAULT_WHATSAPP_ACCESS_TOKEN);
    setWaSaveMsg('Reset to verified Safar India Cabs WhatsApp Phone Number ID & Permanent Token.');
    setTimeout(() => setWaSaveMsg(''), 4000);
  };

  const handleTestWhatsAppMessage = async () => {
    const clean = sanitize10DigitPhone(waTestPhone);
    if (clean.length !== 10) {
      setWaTestStatus({
        running: false,
        ok: false,
        message: 'Please enter a valid 10-digit WhatsApp mobile number.'
      });
      return;
    }
    setWaTestStatus({ running: true });
    setWhatsAppConfig(waPhoneId, waAccessToken);
    let errText = '';
    const sent = await whatsAppService.sendTextMessage(
      clean,
      `✅ *Safar India Cabs - WhatsApp Cloud API Live Test*\n\nPhone Number ID: *${waPhoneId}*\nStatus: *Active & Verified*\n\nAll 5 Automated WhatsApp Flows are ready:\n1️⃣ Customer Login OTP\n2️⃣ Customer Booking Confirmation\n3️⃣ Admin New Booking Alert\n4️⃣ Driver Partner Pickup Duty Alert\n5️⃣ Customer Driver & Vehicle Details`,
      {
        onSuccess: () => {},
        onError: (err) => {
          errText = err.message;
        }
      }
    );
    setWaTestStatus({
      running: false,
      ok: sent,
      message: sent
        ? `Success! Live WhatsApp message dispatched to +91 ${clean} via Meta Graph API (Phone ID: ${waPhoneId}).`
        : `WhatsApp API Notice: ${errText || 'Check Meta Cloud API recipient test whitelist or token.'}`
    });
  };

  // Theme-adaptive surface classes (Default: Clean Light Theme)
  const shellBg = isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-[#F8FAFC] text-slate-900 border-slate-200';
  const headerBg = isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200';
  const cardBg = isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs';
  const subtleBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200/80';
  const inputBg = isDark
    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-amber-400'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const dividerBorder = isDark ? 'border-slate-800' : 'border-slate-200';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        className={`${shellBg} border rounded-3xl w-full max-w-6xl my-auto shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden transition-colors duration-200`}
      >
        {/* Top Header Bar */}
        <div className={`${headerBg} border-b px-5 sm:px-7 py-4 flex items-center justify-between gap-4 shrink-0`}>
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
                <span>Safar India Cabs</span>
                <span aria-hidden="true">·</span>
                <span>Owner Administration</span>
              </div>
              <h2 className={`text-lg sm:text-xl font-black tracking-tight truncate ${textPrimary}`}>
                Owner &amp; Dispatch Control Center
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              <span className="hidden sm:inline">{isDark ? 'Light Theme' : 'Dark Theme'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Owner Panel"
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-rose-50 hover:border-rose-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className={`${headerBg} border-b px-5 sm:px-7 py-2.5 flex items-center justify-between gap-3 overflow-x-auto shrink-0`}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Bookings &amp; Dispatch ({totalBookings})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bill_generator')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'bill_generator'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Bill Generator (Mohar &amp; Sign)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customers ({registeredCustomers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gateways')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'gateways'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Gateways &amp; APIs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Security &amp; App Files (.AAB)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRefreshBookings && (
              <button
                type="button"
                onClick={handleManualSyncBookings}
                disabled={isSyncingBookings}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                title="Sync latest live bookings from Razorpay & server"
              >
                {isSyncingBookings ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{syncSuccessBadge || (isSyncingBookings ? 'Syncing...' : 'Sync Live Bookings')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={downloadProductionAab}
              className="py-1.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
              title="Download signed production Android App Bundle (.aab) for Google Play Console"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>Download Play Store .AAB</span>
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            {onClearDemoBookings && (
              <button
                type="button"
                onClick={onClearDemoBookings}
                className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Clear test bookings from local storage"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Clear Demo Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Scrollable Viewport */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: BOOKINGS & DISPATCH */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              {/* Google Play Console Production .AAB Download Card */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-emerald-500/40 shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      Google Play Console Ready · Signed Release Bundle
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Safarindiacabs (.AAB) — Package: <span className="text-amber-300 font-mono">com.safarindiacabs.app</span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Target SDK 36 (Android 16) · Compile SDK 36 · Min SDK 24 · Version 1.0.5 (Code 6) · Cross-App Scripting Fixed &amp; Upload Key Signed
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={downloadProductionAab}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Production .AAB (v1.0.5 · Code 6 · SDK 36)</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadProductionApk}
                      className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download .APK</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadReleaseKeystore}
                      className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                      <span>Release Keystore</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3-Step Live Booking & WhatsApp Dispatch Workflow Banner */}
              <div className="bg-gradient-to-r from-[#081C44] via-[#0B2559] to-[#0F172A] text-white rounded-2xl p-4 sm:p-5 border border-amber-400/40 shadow-lg">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      Live WhatsApp &amp; Owner Dispatch Workflow
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      3-Step Automated &amp; 1-Tap WhatsApp Dispatch Control
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <div>
                        <div className="font-black text-amber-300">Payment Done</div>
                        <div className="text-[11px] text-slate-200 leading-snug">
                          Customer gets <span className="font-bold text-white">Booking Confirmation</span> on WhatsApp &amp; booking shows below.
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <div>
                        <div className="font-black text-amber-300">Owner Assigns Driver</div>
                        <div className="text-[11px] text-slate-200 leading-snug">
                          Click <span className="font-bold text-white">Assign Driver</span> on any booking to enter Driver Name, Mobile &amp; Vehicle No.
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-sky-400 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                        3
                      </span>
                      <div>
                        <div className="font-black text-amber-300">Dual WhatsApp Sent</div>
                        <div className="text-[11px] text-slate-200 leading-snug">
                          Customer gets <span className="font-bold text-white">Driver Allotment</span> &amp; Driver gets <span className="font-bold text-white">New Pickup Duty</span>!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-Column Financial & Fleet KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className={`${cardBg} p-4 rounded-2xl border`}>
                  <span className={`text-xs font-semibold block ${textSecondary}`}>Total Bookings</span>
                  <div className={`text-2xl font-black font-mono tabular-nums mt-1 ${textPrimary}`}>
                    {totalBookings}
                  </div>
                  <div className={`text-[11px] mt-1 ${textSecondary}`}>
                    All synced trips
                  </div>
                </div>

                <div className={`${cardBg} p-4 rounded-2xl border`}>
                  <span className={`text-xs font-semibold block ${textSecondary}`}>Driver Allotment Status</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black font-mono tabular-nums text-amber-600">
                      {pendingDriverBookings}
                    </span>
                    <span className="text-xs font-bold text-amber-700">Pending</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] mt-1 ${textSecondary}`}>
                    <span className="text-emerald-600 font-bold">{assignedDriverBookings} Driver Allotted</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-600 font-semibold">{completedBookings} Done</span>
                  </div>
                </div>

                <div className={`${cardBg} p-4 rounded-2xl border`}>
                  <span className={`text-xs font-semibold block ${textSecondary}`}>Advance Received</span>
                  <div className="text-2xl font-black font-mono tabular-nums text-emerald-600 mt-1">
                    {formatINR(verifiedAdvanceRevenue)}
                  </div>
                  <div className={`text-[11px] mt-1 ${textSecondary}`}>
                    Online advance paid
                  </div>
                </div>

                <div className={`${cardBg} p-4 rounded-2xl border`}>
                  <span className={`text-xs font-semibold block ${textSecondary}`}>Driver Collect Balance</span>
                  <div className="text-2xl font-black font-mono tabular-nums text-amber-600 mt-1">
                    {formatINR(outstandingBalanceDue)}
                  </div>
                  <div className={`text-[11px] mt-1 ${textSecondary}`}>
                    Payable to driver
                  </div>
                </div>

                <div className={`${cardBg} p-4 rounded-2xl border col-span-2 sm:col-span-1`}>
                  <span className={`text-xs font-semibold block ${textSecondary}`}>Total Booking Value</span>
                  <div className={`text-2xl font-black font-mono tabular-nums mt-1 ${textPrimary}`}>
                    {formatINR(totalBookingVolume)}
                  </div>
                  <div className={`text-[11px] mt-1 ${textSecondary}`}>
                    Gross active &amp; completed
                  </div>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className={`${cardBg} p-3.5 rounded-2xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3`}>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Segmented Filter */}
                  <div className={`flex flex-wrap items-center gap-1 p-1 rounded-xl border ${subtleBg}`}>
                    {(
                      [
                        { id: 'all', label: `All (${totalBookings})` },
                        { id: 'pending_driver', label: `Pending Driver (${pendingDriverBookings})` },
                        { id: 'driver_assigned', label: `Driver Allotted (${assignedDriverBookings})` },
                        { id: 'confirmed', label: `Active (${activeBookings})` },
                        { id: 'completed', label: `Completed (${completedBookings})` },
                        { id: 'cancelled', label: `Cancelled (${cancelledBookings})` }
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                          statusFilter === tab.id
                            ? 'bg-amber-400 text-slate-950 shadow-2xs'
                            : `${textSecondary} hover:${textPrimary}`
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Trip Type Filter */}
                  <div className={`flex items-center gap-1 p-1 rounded-xl border ${subtleBg}`}>
                    {(
                      [
                        { id: 'all', label: 'All Types' },
                        { id: 'oneway', label: 'One-Way' },
                        { id: 'roundtrip', label: 'Round-Trip' },
                        { id: 'local', label: 'Local' },
                        { id: 'airport', label: 'Airport' }
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTripTypeFilter(t.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                          tripTypeFilter === t.id
                            ? isDark
                              ? 'bg-slate-800 text-white'
                              : 'bg-white text-slate-900 shadow-2xs'
                            : `${textSecondary} hover:${textPrimary}`
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Input & Add New Booking Button */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-60">
                    <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search ID, customer, driver, vehicle..."
                      className={`w-full border rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium focus:outline-none ${inputBg}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickInvoiceForm((prev) => !prev)}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>{showQuickInvoiceForm ? 'Close Form' : 'Add New Booking / Receipt'}</span>
                  </button>
                </div>
              </div>

              {/* Owner Instant Booking & PDF Invoice Generator Form */}
              {showQuickInvoiceForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setQuickFormError('');
                    const cleanName = quickCustName.trim();
                    const cleanPhone = sanitize10DigitPhone(quickCustPhone);
                    if (!cleanName) {
                      setQuickFormError('Please enter Customer Name.');
                      return;
                    }
                    if (cleanPhone.length !== 10) {
                      setQuickFormError('Please enter a valid 10-digit Customer Phone number.');
                      return;
                    }
                    const totalVal = Math.max(0, Number(quickTotalFare) || 0);
                    const advanceVal = Math.max(0, Number(quickAdvancePaid) || 0);
                    const remainingVal = Math.max(0, totalVal - advanceVal);
                    const uniqueBookingId = `SIC-${Date.now().toString().slice(-5)}`;

                    const newRecord: BookingRecord = {
                      id: uniqueBookingId,
                      tripType: 'oneway',
                      pickupCity: quickPickup.trim() || 'Delhi NCR',
                      dropCity: quickDrop.trim() || 'Agra',
                      pickupAddress: quickPickup.trim() || 'Delhi NCR',
                      dropAddress: quickDrop.trim() || 'Agra',
                      pickupDate: quickDate || new Date().toISOString().split('T')[0],
                      pickupTime: quickTime || '07:00 AM',
                      cabId: 'hatchback',
                      cabName: quickVehicle,
                      distanceKm: Math.max(10, Number(quickDistanceKm) || 200),
                      baseFare: totalVal,
                      driverAllowance: 0,
                      tollsAndTaxes: 0,
                      gstAmount: 0,
                      totalFare: totalVal,
                      advancePaid: advanceVal,
                      balanceDue: remainingVal,
                      paymentMode: remainingVal === 0 ? 'full' : 'advance_20',
                      paymentMethod: 'Owner Panel Verified Booking',
                      transactionId: `pay_owner_${Date.now().toString().slice(-6)}`,
                      customerName: cleanName,
                      customerPhone: cleanPhone,
                      status: quickBookingStatus,
                      createdAt: new Date().toISOString(),
                      notes:
                        quickBookingStatus === 'confirmed'
                          ? 'Active Confirmed Booking created via Owner Panel — Ready for Driver Allotment'
                          : 'Completed & Verified via Safar India Cabs Owner Panel'
                    };

                    if (onCreateManualBooking) {
                      onCreateManualBooking(newRecord);
                    } else if (onOpenBookingReceipt) {
                      onOpenBookingReceipt(newRecord);
                    }

                    // Also send Booking Confirmation WhatsApp in background if confirmed
                    whatsAppService
                      .sendBookingConfirmationToCustomer(
                        cleanPhone,
                        uniqueBookingId,
                        newRecord.pickupCity,
                        newRecord.dropCity,
                        totalVal,
                        {
                          customerName: cleanName,
                          travelDateTime: `${newRecord.pickupDate} at ${newRecord.pickupTime}`,
                          cabClass: newRecord.cabName,
                          paidAmount: advanceVal,
                          balanceAmount: remainingVal
                        }
                      )
                      .catch(() => {});

                    setShowQuickInvoiceForm(false);
                    setQuickCustName('');
                    setQuickCustPhone('');
                  }}
                  className="bg-gradient-to-br from-[#081C44] to-[#0F172A] text-white border-2 border-amber-400 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/15 pb-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                        Safar India Cabs · Add Active Booking or Instant Receipt
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white">
                        Create Confirmed Booking (For Driver Allotment) or Completed Receipt
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold bg-amber-400 text-slate-950 px-3 py-1 rounded-lg self-start sm:self-auto">
                      Auto ID: SIC-{Date.now().toString().slice(-5)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        value={quickCustName}
                        onChange={(e) => setQuickCustName(e.target.value)}
                        placeholder="e.g. Aman"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-slate-400 font-semibold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Customer Phone (10 Digits) *
                      </label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={quickCustPhone}
                        onChange={(e) => setQuickCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="e.g. 9570571516"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-slate-400 font-mono font-semibold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Pickup Location *
                      </label>
                      <input
                        type="text"
                        value={quickPickup}
                        onChange={(e) => setQuickPickup(e.target.value)}
                        placeholder="e.g. Delhi NCR"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-slate-400 font-semibold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Drop Location *
                      </label>
                      <input
                        type="text"
                        value={quickDrop}
                        onChange={(e) => setQuickDrop(e.target.value)}
                        placeholder="e.g. Agra"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder:text-slate-400 font-semibold focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Trip Date &amp; Time
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="date"
                          value={quickDate}
                          onChange={(e) => setQuickDate(e.target.value)}
                          className="w-3/5 bg-white/10 border border-white/20 rounded-xl px-2.5 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="text"
                          value={quickTime}
                          onChange={(e) => setQuickTime(e.target.value)}
                          placeholder="07:00 AM"
                          className="w-2/5 bg-white/10 border border-white/20 rounded-xl px-2.5 py-2 text-white font-semibold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Cab Category
                      </label>
                      <select
                        value={quickVehicle}
                        onChange={(e) => setQuickVehicle(e.target.value)}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="Hatchback AC (WagonR, Celerio, Tiago or equivalent)">
                          Hatchback AC (WagonR, Celerio, Tiago or equivalent)
                        </option>
                        <option value="Sedan AC (Dzire, Etios, Aura or equivalent)">
                          Sedan AC (Dzire, Etios, Aura or equivalent)
                        </option>
                        <option value="Prime Executive Sedan (City, Ciaz, Verna)">
                          Prime Executive Sedan (City, Ciaz, Verna)
                        </option>
                        <option value="SUV AC (Maruti Ertiga, Kia Carens or equivalent)">
                          SUV AC (Maruti Ertiga, Kia Carens or equivalent)
                        </option>
                        <option value="Assured Innova Crysta (6+1 / 7+1 Luxury)">
                          Assured Innova Crysta (6+1 / 7+1 Luxury)
                        </option>
                        <option value="Tempo Traveller AC (12 Seater)">
                          Tempo Traveller AC (12 Seater)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Total Fare (₹) &amp; Advance Paid (₹)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={quickTotalFare}
                          onChange={(e) => setQuickTotalFare(e.target.value)}
                          placeholder="Total ₹"
                          className="w-1/2 bg-white/10 border border-white/20 rounded-xl px-2.5 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                        <input
                          type="number"
                          value={quickAdvancePaid}
                          onChange={(e) => setQuickAdvancePaid(e.target.value)}
                          placeholder="Advance ₹"
                          className="w-1/2 bg-white/10 border border-white/20 rounded-xl px-2.5 py-2 text-emerald-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">
                        Booking Mode &amp; Balance
                      </label>
                      <select
                        value={quickBookingStatus}
                        onChange={(e) => setQuickBookingStatus(e.target.value as 'confirmed' | 'completed')}
                        className="w-full bg-slate-900 border border-amber-400/60 rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="confirmed">
                          Active Confirmed (Assign Driver Next) — Due:{' '}
                          {formatINR(Math.max(0, (Number(quickTotalFare) || 0) - (Number(quickAdvancePaid) || 0)))}
                        </option>
                        <option value="completed">Completed Trip (Open Final Receipt)</option>
                      </select>
                    </div>
                  </div>

                  {quickFormError && (
                    <div className="text-xs font-bold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-3 py-2 rounded-xl">
                      {quickFormError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowQuickInvoiceForm(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {quickBookingStatus === 'confirmed'
                          ? 'Save Confirmed Booking to Owner Panel'
                          : 'Complete Booking & Open Receipt'}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* Bookings List */}
              <div className="space-y-4">
                {filteredBookings.length === 0 ? (
                  <div className={`${cardBg} p-10 text-center rounded-2xl border space-y-2`}>
                    <Car className={`w-8 h-8 mx-auto ${textMuted}`} />
                    <div className={`text-sm font-bold ${textPrimary}`}>No bookings match your current filter</div>
                    <p className={`text-xs ${textSecondary}`}>
                      Try clearing your search query or switching the status tab above.
                    </p>
                  </div>
                ) : (
                  filteredBookings.map((b) => {
                    const bookingConfirmMsg = formatWhatsAppBookingConfirmationMessage({
                      customerName: b.customerName,
                      bookingId: b.id,
                      pickup: b.pickupCity,
                      drop: b.dropCity,
                      travelDateTime: `${b.pickupDate} at ${b.pickupTime}`,
                      cabCategory: b.cabName,
                      totalFare: b.totalFare,
                      advancePaid: b.advancePaid,
                      balancePayable: b.balanceDue
                    });

                    const customerDriverAllotmentMsg = formatWhatsAppDriverAllotmentCustomerMessage({
                      customerName: b.customerName,
                      bookingId: b.id,
                      pickup: b.pickupCity,
                      drop: b.dropCity,
                      travelDateTime: `${b.pickupDate} at ${b.pickupTime}`,
                      driverName: b.driverName || 'Assigned Driver',
                      driverPhone: b.driverPhone || '',
                      vehicleCategory: b.driverVehicleModel || b.cabName,
                      vehicleNumber: b.driverVehicleNo || 'Assigned'
                    });

                    const driverPickupDutyMsg = formatWhatsAppDriverDutyAllotmentMessage({
                      driverName: b.driverName || 'Driver Partner',
                      bookingId: b.id,
                      customerName: b.customerName,
                      customerPhone: b.customerPhone,
                      pickup: b.pickupCity,
                      drop: b.dropCity,
                      travelDateTime: `${b.pickupDate} at ${b.pickupTime}`,
                      vehicleModel: b.driverVehicleModel || b.cabName,
                      cabClass: b.cabName,
                      vehicleNumber: b.driverVehicleNo || 'Assigned',
                      balanceAmount: b.balanceDue
                    });

                    return (
                      <div
                        key={b.id}
                        className={`${cardBg} border-2 rounded-2xl p-4 sm:p-5 space-y-4 transition ${
                          b.status === 'confirmed' && !b.driverName
                            ? 'border-amber-400/80 shadow-md'
                            : 'hover:border-amber-400/60'
                        }`}
                      >
                        {/* Top Metadata Row */}
                        <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${dividerBorder}`}>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-black text-amber-600 text-sm bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                              {b.id}
                            </span>
                            <span className={`font-extrabold text-sm ${textPrimary}`}>{b.customerName}</span>
                            <span className={textMuted} aria-hidden="true">·</span>
                            <a
                              href={`tel:+91${b.customerPhone}`}
                              className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>+91 {b.customerPhone}</span>
                            </a>
                            <span className={textMuted} aria-hidden="true">·</span>
                            <span className={`font-semibold capitalize ${textSecondary}`}>
                              {b.tripType === 'roundtrip'
                                ? 'Round Trip'
                                : b.tripType === 'oneway'
                                ? 'One-Way'
                                : b.tripType}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {b.driverName ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Driver Allotted: {b.driverName}</span>
                              </span>
                            ) : b.status === 'confirmed' ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1.5">
                                <Car className="w-3.5 h-3.5 text-amber-700" />
                                <span>Pending Driver Allotment</span>
                              </span>
                            ) : null}

                            <span
                              className={`text-xs font-bold flex items-center gap-1 pl-1 ${
                                b.status === 'confirmed'
                                  ? 'text-emerald-600'
                                  : b.status === 'completed'
                                  ? 'text-sky-600'
                                  : 'text-rose-600'
                              }`}
                            >
                              {b.status === 'confirmed' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : b.status === 'completed' ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              <span className="capitalize">
                                {b.status === 'confirmed' ? 'Confirmed' : b.status}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Driver & Vehicle Allotment Banner */}
                        {b.driverName ? (
                          <div
                            className={`rounded-xl px-3.5 py-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                              isDark
                                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                                : 'bg-emerald-50/90 border-emerald-200 text-slate-800'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-bold text-emerald-800">Allotted Driver:</span>
                              <span className="font-black text-sm">{b.driverName}</span>
                              <span aria-hidden="true">·</span>
                              <a
                                href={`tel:+91${b.driverPhone}`}
                                className="font-mono font-bold text-emerald-700 underline"
                              >
                                +91 {b.driverPhone}
                              </a>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 font-medium">
                              <span className="text-slate-600">Vehicle:</span>
                              <span className="font-bold">{b.driverVehicleModel || b.cabName}</span>
                              {b.driverVehicleNo && (
                                <span
                                  className={`px-2.5 py-0.5 rounded-md border font-mono font-black uppercase ${
                                    isDark
                                      ? 'bg-slate-900 border-slate-700 text-amber-300'
                                      : 'bg-white border-emerald-300 text-slate-950 shadow-2xs'
                                  }`}
                                >
                                  {b.driverVehicleNo}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          b.status === 'confirmed' && (
                            <div className="rounded-xl px-3.5 py-2.5 bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
                              <div className="flex items-center gap-2 font-bold">
                                <Car className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                  Step 2 Pending: Payment &amp; Booking Confirmed — Please assign a Driver &amp; Vehicle for this trip.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(b)}
                                className="px-3 py-1.5 rounded-lg bg-[#081C44] hover:bg-slate-800 text-amber-400 font-black text-xs transition cursor-pointer flex items-center gap-1.5"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Assign Driver &amp; Vehicle Now</span>
                              </button>
                            </div>
                          )
                        )}

                        {/* 4-Column Booking Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className={`text-[11px] font-semibold block mb-0.5 ${textSecondary}`}>
                              Journey Route
                            </span>
                            <div className={`font-extrabold text-sm flex items-center gap-1.5 ${textPrimary}`}>
                              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>
                                {b.pickupCity} → {b.dropCity}
                              </span>
                            </div>
                            {b.pickupAddress && (
                              <div className={`text-[11px] mt-0.5 truncate ${textSecondary}`} title={b.pickupAddress}>
                                Pickup: {b.pickupAddress}
                              </div>
                            )}
                          </div>

                          <div>
                            <span className={`text-[11px] font-semibold block mb-0.5 ${textSecondary}`}>
                              Schedule &amp; Vehicle
                            </span>
                            <div className={`font-bold flex items-center gap-1.5 ${textPrimary}`}>
                              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>
                                {b.pickupDate} @ {b.pickupTime}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-amber-600 mt-0.5">
                              {b.cabName} ({b.distanceKm} KM)
                            </div>
                          </div>

                          <div>
                            <span className={`text-[11px] font-semibold block mb-0.5 ${textSecondary}`}>
                              Fare &amp; Payment Breakup
                            </span>
                            <div className={`font-mono font-black text-sm tabular-nums ${textPrimary}`}>
                              Total: {formatINR(b.totalFare)}/-
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums mt-0.5">
                              <span className="text-emerald-600 font-bold">Advance: {formatINR(b.advancePaid)}/-</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-600 font-bold">Balance: {formatINR(b.balanceDue)}/-</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {b.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(b)}
                                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>{b.driverName ? 'Update Driver / Vehicle' : 'Assign Driver & Vehicle'}</span>
                              </button>
                            )}

                            {b.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateBookingStatus(b.id, 'completed');
                                  triggerCustomerReviewWhatsApp({
                                    customerName: b.customerName,
                                    customerPhone: b.customerPhone,
                                    pickupCity: b.pickupCity,
                                    dropCity: b.dropCity,
                                    bookingId: b.id
                                  });
                                }}
                                className="px-3 py-2 rounded-xl bg-[#081C44] hover:bg-slate-800 text-amber-400 border border-amber-400/50 text-xs font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs"
                                title="Mark Booking Completed, Open Receipt & Send WhatsApp Review Request"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                <span>Complete Trip</span>
                              </button>
                            )}

                            {onOpenBookingReceipt && (
                              <button
                                type="button"
                                onClick={() => onOpenBookingReceipt(b)}
                                className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                  isDark
                                    ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                                }`}
                                title="Open Receipt Modal & Share on WhatsApp"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-600" />
                                <span>Receipt</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setPrefillBillBooking(b);
                                setActiveTab('bill_generator');
                              }}
                              className="px-3 py-2 rounded-xl bg-[#081C44] hover:bg-slate-800 text-amber-300 border border-amber-400/40 text-xs font-black transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                              title="Open Custom Bill Generator with Official Rubber Mohar & Sign"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              <span>Custom Bill (Mohar)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => generateBookingInvoicePdf(b)}
                              className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                isDark
                                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                              title="Download PDF Invoice"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>

                        {/* 3-Step Dedicated WhatsApp Message Dispatch Row */}
                        <div
                          className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${dividerBorder}`}
                        >
                          <span className={`text-[11px] font-extrabold uppercase tracking-wider ${textSecondary}`}>
                            1-Tap Formatted WhatsApp Messages:
                          </span>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Message 1: Customer Booking Confirmation */}
                            <a
                              href={buildWhatsAppSchemeUrl(bookingConfirmMsg, b.customerPhone)}
                              onClick={(e) =>
                                triggerWhatsAppDeepLink(e, bookingConfirmMsg, b.customerPhone)
                              }
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                              title={`Send formatted Booking Confirmation to Customer (+91 ${b.customerPhone})`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>1. Booking Confirmation (Customer WA)</span>
                            </a>

                            {/* Message 2: Customer Vehicle & Driver Allotment */}
                            {b.driverName ? (
                              <a
                                href={buildWhatsAppSchemeUrl(customerDriverAllotmentMsg, b.customerPhone)}
                                onClick={(e) =>
                                  triggerWhatsAppDeepLink(e, customerDriverAllotmentMsg, b.customerPhone)
                                }
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                                title={`Send Vehicle & Driver Allotment to Customer (+91 ${b.customerPhone})`}
                              >
                                <UserCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                <span>2. Vehicle &amp; Driver Allotment (Customer WA)</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(b)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                title="Assign driver first to send Driver Allotment message to customer"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>2. Assign Driver for Customer WA</span>
                              </button>
                            )}

                            {/* Message 3: Driver New Pickup Duty Allotment */}
                            {b.driverName && b.driverPhone ? (
                              <a
                                href={buildWhatsAppSchemeUrl(driverPickupDutyMsg, b.driverPhone)}
                                onClick={(e) =>
                                  triggerWhatsAppDeepLink(e, driverPickupDutyMsg, b.driverPhone!)
                                }
                                className="px-3 py-1.5 rounded-xl bg-[#081C44] hover:bg-slate-800 text-amber-400 border border-amber-400/50 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                                title={`Send New Pickup Duty Allotment to Driver ${b.driverName} (+91 ${b.driverPhone})`}
                              >
                                <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>3. New Pickup Duty (Driver WA)</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(b)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                                title="Assign driver first to send Pickup Duty message to driver"
                              >
                                <Car className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>3. Assign Driver for Pickup Duty WA</span>
                              </button>
                            )}

                            {b.status !== 'cancelled' && b.customerPhone && (
                              <a
                                href={buildCustomerReviewWhatsAppUrl({
                                  customerName: b.customerName,
                                  customerPhone: b.customerPhone,
                                  pickupCity: b.pickupCity,
                                  dropCity: b.dropCity,
                                  bookingId: b.id
                                })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                title={`Send WhatsApp Review Request to +91 ${b.customerPhone}`}
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                                <span>Review WA</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: CUSTOM GST BILL GENERATOR (WITH OFFICIAL RUBBER MOHAR & PROPRIETOR SIGN) */}
          {activeTab === 'bill_generator' && (
            <OwnerBillGenerator
              isDark={isDark}
              prefillBooking={prefillBillBooking}
              onClearPrefill={() => setPrefillBillBooking(null)}
            />
          )}

          {/* TAB 2: CUSTOMERS DIRECTORY */}
          {activeTab === 'customers' && (
            <div className="space-y-5">
              <div className={`${cardBg} p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3`}>
                <div>
                  <h3 className={`text-base font-extrabold ${textPrimary}`}>
                    Registered Customer Directory
                  </h3>
                  <p className={`text-xs ${textSecondary}`}>
                    Total {registeredCustomers.length} verified customer profiles with ride history
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search name or mobile..."
                      className={`w-full border rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:outline-none ${inputBg}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={exportCustomersCSV}
                    className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {registeredCustomers
                  .filter(
                    (c) =>
                      !customerSearch ||
                      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.phone.includes(customerSearch)
                  )
                  .map((c, i) => {
                    const userRides = bookings.filter((b) => b.customerPhone === c.phone);
                    const userSpend = userRides.reduce((sum, b) => sum + b.totalFare, 0);
                    return (
                      <div key={i} className={`${cardBg} border rounded-2xl p-4 space-y-3`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className={`font-extrabold text-sm ${textPrimary}`}>{c.name}</div>
                            <div className={`text-xs font-mono font-semibold mt-0.5 ${textSecondary}`}>
                              +91 {c.phone}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-amber-600 font-mono tabular-nums">
                            {userRides.length} {userRides.length === 1 ? 'Ride' : 'Rides'}
                          </span>
                        </div>

                        {c.email && <div className={`text-xs truncate ${textSecondary}`}>{c.email}</div>}

                        <div className={`pt-2.5 border-t flex justify-between items-center text-xs ${dividerBorder}`}>
                          <span className={textSecondary}>Total Booking Value</span>
                          <span className="text-emerald-600 font-black font-mono tabular-nums">
                            {formatINR(userSpend)}
                          </span>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <a
                            href={`tel:+91${c.phone}`}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold text-center border flex items-center justify-center gap-1.5 transition ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-white hover:bg-slate-800'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Call</span>
                          </a>
                          <a
                            href={buildWhatsAppSchemeUrl(
                              `Hello ${c.name}, greetings from Safar India Cabs!`,
                              c.phone
                            )}
                            onClick={(e) =>
                              triggerWhatsAppDeepLink(
                                e,
                                `Hello ${c.name}, greetings from Safar India Cabs!`,
                                c.phone
                              )
                            }
                            className={`flex-1 py-2 rounded-xl text-xs font-bold text-center border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 3: GATEWAYS & APIS */}
          {activeTab === 'gateways' && (
            <div className="space-y-6">
              {/* 1. Razorpay Standard Checkout */}
              <div className={`${cardBg} p-5 rounded-2xl border space-y-4`}>
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 ${dividerBorder}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-extrabold ${textPrimary}`}>
                        Razorpay Standard Checkout &amp; Dynamic UPI QR
                      </h4>
                      <p className={`text-xs ${textSecondary}`}>
                        Accept 20% advance or 100% full fares via UPI QR, Google Pay, PhonePe, Paytm &amp; Cards
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">Active &amp; Enabled</span>
                </div>

                {razorpaySaveMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                    {razorpaySaveMsg}
                  </div>
                )}

                <form onSubmit={handleSaveRazorpayKey} className="space-y-3">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${textSecondary}`}>
                      Razorpay Key ID (rzp_live_... or rzp_test_...)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        required
                        value={razorpayKey}
                        onChange={(e) => setRazorpayKey(e.target.value)}
                        placeholder="Paste Razorpay Key ID"
                        className={`flex-1 min-w-[240px] border rounded-xl px-3.5 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer"
                      >
                        Save Key
                      </button>
                      <button
                        type="button"
                        onClick={handleResetRazorpayKey}
                        className={`px-3.5 py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Reset Default
                      </button>
                      <button
                        type="button"
                        onClick={handleTestRazorpay}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Test Checkout Modal
                      </button>
                    </div>
                  </div>
                </form>

                {razorpayTestStatus && (
                  <div className={`p-3 rounded-xl border text-xs font-mono ${subtleBg}`}>
                    {razorpayTestStatus}
                  </div>
                )}
              </div>

              {/* 2. Meta WhatsApp Cloud API */}
              <div className={`${cardBg} p-5 rounded-2xl border space-y-4`}>
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 ${dividerBorder}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-extrabold ${textPrimary}`}>
                        Meta WhatsApp Cloud API (Automated OTP &amp; Dispatch)
                      </h4>
                      <p className={`text-xs ${textSecondary}`}>
                        Handles single-click Customer Login OTP, Booking Confirmation &amp; Driver Duty Alerts
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600">ID: {waPhoneId}</span>
                </div>

                {waSaveMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                    {waSaveMsg}
                  </div>
                )}

                <form onSubmit={handleSaveWhatsAppConfig} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                        WhatsApp Phone Number ID
                      </label>
                      <input
                        type="text"
                        required
                        value={waPhoneId}
                        onChange={(e) => setWaPhoneId(e.target.value)}
                        className={`w-full border rounded-xl px-3.5 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                        Permanent Meta Access Token
                      </label>
                      <input
                        type="text"
                        required
                        value={waAccessToken}
                        onChange={(e) => setWaAccessToken(e.target.value)}
                        className={`w-full border rounded-xl px-3.5 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Save WhatsApp Credentials
                    </button>
                    <button
                      type="button"
                      onClick={handleResetWhatsAppConfig}
                      className={`px-3.5 py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Reset Default Token
                    </button>
                  </div>
                </form>

                <div className={`${subtleBg} p-4 rounded-xl border space-y-2.5`}>
                  <span className={`text-xs font-bold block ${textPrimary}`}>
                    Send Live Test WhatsApp Message
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <span className={`absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold ${textSecondary}`}>
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={waTestPhone}
                        onChange={(e) => setWaTestPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit WhatsApp number"
                        className={`w-full border rounded-xl pl-11 pr-3 py-2 text-xs font-mono focus:outline-none ${inputBg}`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={waTestStatus.running}
                      onClick={handleTestWhatsAppMessage}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      {waTestStatus.running ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Test WhatsApp</span>
                        </>
                      )}
                    </button>
                  </div>
                  {waTestStatus.message && (
                    <div
                      className={`p-2.5 rounded-lg text-xs font-medium ${
                        waTestStatus.ok
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {waTestStatus.message}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Traccar SMS Gateway */}
              <div className={`${cardBg} p-5 rounded-2xl border space-y-4`}>
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 ${dividerBorder}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-extrabold ${textPrimary}`}>
                        Traccar SMS Gateway (Local Primary + Cloud Fallback)
                      </h4>
                      <p className={`text-xs ${textSecondary}`}>
                        Dispatches transactional SMS alerts alongside WhatsApp notifications
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">Configured</span>
                </div>

                {traccarSaveMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                    {traccarSaveMsg}
                  </div>
                )}

                <form onSubmit={handleSaveTraccarToken} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                        Primary Local Endpoint
                      </label>
                      <input
                        type="text"
                        required
                        value={traccarLocalEndpoint}
                        onChange={(e) => setTraccarLocalEndpointState(e.target.value)}
                        className={`w-full border rounded-xl px-3.5 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                        Primary Local Token
                      </label>
                      <input
                        type="text"
                        required
                        value={traccarLocalToken}
                        onChange={(e) => setTraccarLocalTokenState(e.target.value)}
                        className={`w-full border rounded-xl px-3.5 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                      Cloud Fallback Token ({TRACCAR_SMS_ENDPOINT})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        required
                        value={traccarToken}
                        onChange={(e) => setTraccarTokenState(e.target.value)}
                        className={`flex-1 min-w-[240px] border rounded-xl px-3.5 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer"
                      >
                        Save SMS Config
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToOfficialKey}
                        className={`px-3.5 py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Reset Defaults
                      </button>
                    </div>
                  </div>
                </form>

                <div className={`${subtleBg} p-4 rounded-xl border space-y-2.5`}>
                  <span className={`text-xs font-bold block ${textPrimary}`}>Test Live SMS Dispatch</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <span className={`absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold ${textSecondary}`}>
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                        className={`w-full border rounded-xl pl-11 pr-3 py-2 text-xs font-mono focus:outline-none ${inputBg}`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={testStatus.running}
                      onClick={handleTestTraccarSms}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      {testStatus.running ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-amber-400" />
                          <span>Send Test SMS</span>
                        </>
                      )}
                    </button>
                  </div>
                  {testStatus.message && (
                    <div
                      className={`p-2.5 rounded-lg text-xs font-medium ${
                        testStatus.ok
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {testStatus.message}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Ola Maps Platform Integration */}
              <div className={`${cardBg} p-5 rounded-2xl border space-y-4`}>
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 ${dividerBorder}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-extrabold ${textPrimary}`}>
                        Ola Maps Platform Integration
                      </h4>
                      <p className={`text-xs ${textSecondary}`}>
                        Powers Location Autocomplete &amp; Accurate Road KM Distance Calculation
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">Active &amp; Safeguarded</span>
                </div>

                {olaSaveMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
                    {olaSaveMsg}
                  </div>
                )}

                <form onSubmit={handleSaveOlaMaps} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>Ola Maps API Key</label>
                      <input
                        type="text"
                        required
                        value={olaApiKey}
                        onChange={(e) => setOlaApiKey(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>Client ID</label>
                      <input
                        type="text"
                        value={olaClientId}
                        onChange={(e) => setOlaClientId(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>Client Secret</label>
                      <input
                        type="password"
                        value={olaClientSecret}
                        onChange={(e) => setOlaClientSecret(e.target.value)}
                        className={`w-full border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none ${inputBg}`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer"
                    >
                      Save Ola Maps Credentials
                    </button>
                    <button
                      type="button"
                      onClick={handleResetOlaMaps}
                      className={`px-3.5 py-2 rounded-xl border font-bold text-xs transition cursor-pointer ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      disabled={olaTestStatus.running}
                      onClick={handleTestOlaMaps}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {olaTestStatus.running ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <span>Test Ola Maps Connection</span>
                      )}
                    </button>
                  </div>
                </form>

                {olaTestStatus.message && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      olaTestStatus.ok
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {olaTestStatus.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY PIN & PRIVATE OWNER APP BUNDLE VAULT */}
          {activeTab === 'security' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Private Owner-Only Android App Bundle (.AAB / .APK / Keystore) Vault */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white rounded-2xl p-5 sm:p-6 border border-emerald-500/40 shadow-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    <Lock className="w-3 h-3" />
                    <span>100% Private Owner Vault · Hidden from Public Website</span>
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    PIN Protected Access Only
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Safarindiacabs Confidential App Files (<span className="text-amber-300 font-mono">com.safarindiacabs.app</span>)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    All <code className="text-amber-300">.aab</code>, <code className="text-amber-300">.apk</code>, and <code className="text-amber-300">.keystore</code> files are completely hidden from customers and public URLs. Only you can download them after unlocking this Owner Control Panel with your secret PIN.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={downloadProductionAab}
                    className="py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download Signed .AAB (v1.0.5)</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadProductionApk}
                    className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Download Release .APK</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadReleaseKeystore}
                    className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Download Upload Keystore</span>
                  </button>
                </div>
              </div>

              {/* Change Owner Access PIN Card */}
              <div className={`max-w-md mx-auto ${cardBg} p-6 rounded-2xl border space-y-5`}>
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className={`text-base font-extrabold ${textPrimary}`}>Change Owner Access PIN</h3>
                  <p className={`text-xs ${textSecondary}`}>
                    Update your confidential 4-digit PIN used to unlock this dashboard &amp; private files
                  </p>
                </div>

                {pinChangeMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center font-bold">
                    {pinChangeMsg}
                  </div>
                )}

                {pinErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center font-bold">
                    {pinErrorMsg}
                  </div>
                )}

                <form onSubmit={handleUpdatePin} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>New 4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className={`w-full text-center tracking-[0.5em] text-xl font-black border rounded-xl py-2.5 font-mono focus:outline-none ${inputBg}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>Confirm 4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className={`w-full text-center tracking-[0.5em] text-xl font-black border rounded-xl py-2.5 font-mono focus:outline-none ${inputBg}`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Save New Owner PIN
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Driver Assignment Modal */}
      {selectedBookingForDriver && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`${cardBg} border rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative space-y-4 my-auto`}>
            <div className={`flex items-center justify-between border-b pb-3 ${dividerBorder}`}>
              <div>
                <h4 className={`text-base font-extrabold ${textPrimary}`}>
                  Assign Driver &amp; Vehicle Allotment
                </h4>
                <p className="text-xs text-amber-600 font-bold">
                  Booking #{selectedBookingForDriver.id} · {selectedBookingForDriver.customerName} (+91{' '}
                  {selectedBookingForDriver.customerPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForDriver(null)}
                className={`p-1.5 rounded-xl border ${subtleBg} ${textSecondary} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {driverSmsSuccessNotice && (
              <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 text-xs space-y-3">
                <div className="font-black flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{driverSmsSuccessNotice}</span>
                </div>

                {/* Instant 1-Tap WhatsApp Dispatch Buttons after Driver Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <a
                    href={buildWhatsAppSchemeUrl(
                      formatWhatsAppDriverAllotmentCustomerMessage({
                        customerName: selectedBookingForDriver.customerName,
                        bookingId: selectedBookingForDriver.id,
                        pickup: selectedBookingForDriver.pickupCity,
                        drop: selectedBookingForDriver.dropCity,
                        travelDateTime: `${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}`,
                        driverName: driverName || selectedBookingForDriver.driverName || 'Assigned Driver',
                        driverPhone: driverPhone || selectedBookingForDriver.driverPhone || '',
                        vehicleCategory:
                          driverVehicleModel ||
                          selectedBookingForDriver.driverVehicleModel ||
                          selectedBookingForDriver.cabName,
                        vehicleNumber: driverCarPlate || selectedBookingForDriver.driverVehicleNo || 'Assigned'
                      }),
                      selectedBookingForDriver.customerPhone
                    )}
                    onClick={(e) =>
                      triggerWhatsAppDeepLink(
                        e,
                        formatWhatsAppDriverAllotmentCustomerMessage({
                          customerName: selectedBookingForDriver.customerName,
                          bookingId: selectedBookingForDriver.id,
                          pickup: selectedBookingForDriver.pickupCity,
                          drop: selectedBookingForDriver.dropCity,
                          travelDateTime: `${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}`,
                          driverName: driverName || selectedBookingForDriver.driverName || 'Assigned Driver',
                          driverPhone: driverPhone || selectedBookingForDriver.driverPhone || '',
                          vehicleCategory:
                            driverVehicleModel ||
                            selectedBookingForDriver.driverVehicleModel ||
                            selectedBookingForDriver.cabName,
                          vehicleNumber: driverCarPlate || selectedBookingForDriver.driverVehicleNo || 'Assigned'
                        }),
                        selectedBookingForDriver.customerPhone
                      )
                    }
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>1. Send Driver Allotment to Customer WA</span>
                  </a>

                  <a
                    href={buildWhatsAppSchemeUrl(
                      formatWhatsAppDriverDutyAllotmentMessage({
                        driverName: driverName || selectedBookingForDriver.driverName || 'Partner',
                        bookingId: selectedBookingForDriver.id,
                        customerName: selectedBookingForDriver.customerName,
                        customerPhone: selectedBookingForDriver.customerPhone,
                        pickup: selectedBookingForDriver.pickupCity,
                        drop: selectedBookingForDriver.dropCity,
                        travelDateTime: `${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}`,
                        vehicleModel:
                          driverVehicleModel ||
                          selectedBookingForDriver.driverVehicleModel ||
                          selectedBookingForDriver.cabName,
                        cabClass: selectedBookingForDriver.cabName,
                        vehicleNumber: driverCarPlate || selectedBookingForDriver.driverVehicleNo || 'Assigned',
                        balanceAmount: selectedBookingForDriver.balanceDue
                      }),
                      sanitize10DigitPhone(driverPhone || selectedBookingForDriver.driverPhone || '')
                    )}
                    onClick={(e) => {
                      const targetPhone = sanitize10DigitPhone(
                        driverPhone || selectedBookingForDriver.driverPhone || ''
                      );
                      if (targetPhone.length === 10) {
                        triggerWhatsAppDeepLink(
                          e,
                          formatWhatsAppDriverDutyAllotmentMessage({
                            driverName: driverName || selectedBookingForDriver.driverName || 'Partner',
                            bookingId: selectedBookingForDriver.id,
                            customerName: selectedBookingForDriver.customerName,
                            customerPhone: selectedBookingForDriver.customerPhone,
                            pickup: selectedBookingForDriver.pickupCity,
                            drop: selectedBookingForDriver.dropCity,
                            travelDateTime: `${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}`,
                            vehicleModel:
                              driverVehicleModel ||
                              selectedBookingForDriver.driverVehicleModel ||
                              selectedBookingForDriver.cabName,
                            cabClass: selectedBookingForDriver.cabName,
                            vehicleNumber: driverCarPlate || selectedBookingForDriver.driverVehicleNo || 'Assigned',
                            balanceAmount: selectedBookingForDriver.balanceDue
                          }),
                          targetPhone
                        );
                      } else {
                        e.preventDefault();
                      }
                    }}
                    className="py-2.5 px-3 bg-[#081C44] hover:bg-slate-800 text-amber-400 border border-amber-400/50 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Car className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>2. Send New Pickup Duty to Driver WA</span>
                  </a>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveDriver} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                    Driver Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Dharmendar"
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                    Driver Mobile Number *
                  </label>
                  <div className="relative">
                    <span
                      className={`absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold ${textSecondary}`}
                    >
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="7053441079"
                      className={`w-full border rounded-xl pl-11 pr-3 py-2.5 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                  Vehicle Category / Model *
                </label>
                <input
                  type="text"
                  required
                  value={driverVehicleModel}
                  onChange={(e) => setDriverVehicleModel(e.target.value)}
                  placeholder="e.g. Hatchback AC (WagonR, Celerio, Tiago or equivalent)"
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none ${inputBg}`}
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[
                    {
                      short: 'Hatchback AC',
                      full: 'Hatchback AC (WagonR, Celerio, Tiago or equivalent)'
                    },
                    {
                      short: 'Sedan AC',
                      full: 'Sedan AC (Dzire, Etios, Aura or equivalent)'
                    },
                    {
                      short: 'SUV AC',
                      full: 'SUV AC (Maruti Ertiga, Kia Carens or equivalent)'
                    },
                    {
                      short: 'Innova Crysta',
                      full: 'Assured Innova Crysta (6+1 / 7+1 Luxury)'
                    }
                  ].map((preset) => (
                    <button
                      key={preset.short}
                      type="button"
                      onClick={() => setDriverVehicleModel(preset.full)}
                      className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold cursor-pointer transition"
                    >
                      {preset.short}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${textSecondary}`}>
                  Vehicle Number (Registration Plate) *
                </label>
                <input
                  type="text"
                  required
                  value={driverCarPlate}
                  onChange={(e) => setDriverCarPlate(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="e.g. HR69E4474"
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none ${inputBg}`}
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Formatted Box-Design WhatsApp Messages Ready</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Saving will update the booking in Owner Panel, trigger background WhatsApp/SMS alerts, and allow 1-click WhatsApp dispatch of{' '}
                  <strong>DRIVER ALLOTMENT</strong> to Customer (+91 {selectedBookingForDriver.customerPhone}) and{' '}
                  <strong>DRIVER DUTY ALLOTMENT</strong> to Driver (+91 {driverPhone || 'Driver'}).
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSendingDriverSms}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isSendingDriverSms ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Saving &amp; Dispatching WhatsApp Alerts...</span>
                    </>
                  ) : (
                    <>
                      <Car className="w-4 h-4 text-slate-950" />
                      <span>
                        {driverAssignedStepComplete
                          ? 'Update Driver Details & Re-Send Alerts'
                          : 'Save Driver Allotment & Send WhatsApp + SMS'}
                      </span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={buildWhatsAppSchemeUrl(
                      formatWhatsAppDriverAllotmentCustomerMessage({
                        customerName: selectedBookingForDriver.customerName,
                        bookingId: selectedBookingForDriver.id,
                        pickup: selectedBookingForDriver.pickupCity,
                        drop: selectedBookingForDriver.dropCity,
                        travelDateTime: `${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}`,
                        driverName: driverName || 'Assigned',
                        driverPhone: driverPhone || 'Shared',
                        vehicleCategory: driverVehicleModel || selectedBookingForDriver.cabName,
                        vehicleNumber: driverCarPlate || 'Allocated'
                      }),
                      selectedBookingForDriver.customerPhone
                    )}
                    onClick={(e) =>
                      triggerWhatsAppDeepLink(
                        e,
                        formatWhatsAppDriverAllotmentCustomerMessage({
                          customerName: selectedBookingForDriver.customerName,
                          bookingId: selectedBookingForDriver.id,
                          pickup: selectedBookingForDriver.pickupCity,
                          drop: selectedBookingForDriver.dropCity,
                          travelDateTime: `${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}`,
                          driverName: driverName || 'Assigned',
                          driverPhone: driverPhone || 'Shared',
                          vehicleCategory: driverVehicleModel || selectedBookingForDriver.cabName,
                          vehicleNumber: driverCarPlate || 'Allocated'
                        }),
                        selectedBookingForDriver.customerPhone
                      )
                    }
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Customer: Driver Allotment WA</span>
                  </a>

                  <a
                    href={buildWhatsAppSchemeUrl(
                      formatWhatsAppDriverDutyAllotmentMessage({
                        driverName: driverName || 'Partner',
                        bookingId: selectedBookingForDriver.id,
                        customerName: selectedBookingForDriver.customerName,
                        customerPhone: selectedBookingForDriver.customerPhone,
                        pickup: selectedBookingForDriver.pickupCity,
                        drop: selectedBookingForDriver.dropCity,
                        travelDateTime: `${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}`,
                        vehicleModel: driverVehicleModel || selectedBookingForDriver.cabName,
                        cabClass: selectedBookingForDriver.cabName,
                        vehicleNumber: driverCarPlate || 'Assigned',
                        balanceAmount: selectedBookingForDriver.balanceDue
                      }),
                      sanitize10DigitPhone(driverPhone)
                    )}
                    onClick={(e) => {
                      const targetPhone = sanitize10DigitPhone(driverPhone);
                      if (targetPhone.length === 10) {
                        triggerWhatsAppDeepLink(
                          e,
                          formatWhatsAppDriverDutyAllotmentMessage({
                            driverName: driverName || 'Partner',
                            bookingId: selectedBookingForDriver.id,
                            customerName: selectedBookingForDriver.customerName,
                            customerPhone: selectedBookingForDriver.customerPhone,
                            pickup: selectedBookingForDriver.pickupCity,
                            drop: selectedBookingForDriver.dropCity,
                            travelDateTime: `${selectedBookingForDriver.pickupDate} at ${selectedBookingForDriver.pickupTime}`,
                            vehicleModel: driverVehicleModel || selectedBookingForDriver.cabName,
                            cabClass: selectedBookingForDriver.cabName,
                            vehicleNumber: driverCarPlate || 'Assigned',
                            balanceAmount: selectedBookingForDriver.balanceDue
                          }),
                          targetPhone
                        );
                      } else {
                        e.preventDefault();
                      }
                    }}
                    className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Driver: New Pickup Duty WA</span>
                  </a>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
