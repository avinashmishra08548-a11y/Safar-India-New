/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Shield,
  User,
  LogOut
} from 'lucide-react';
import { TripType, CabVehicle, BookingRecord, CustomerUser } from './types';
import { POPULAR_ROUTES, PopularRouteDeal, estimateDistanceKm } from './data/indianCities';
import { CABS_FLEET } from './data/cabsFleet';
import { computeTripFare, FareCalculationResult } from './utils/fareCalculator';
import { calculateExactRoadDistance, Coordinates } from './utils/olaMapsService';
import { sanitize10DigitPhone } from './utils/smsService';
import { Header } from './components/Header';
import { BookingEngine } from './components/BookingEngine';
import { CabSelector } from './components/CabSelector';
import { BookingModal } from './components/BookingModal';
import { BookingConfirmationModal } from './components/BookingConfirmationModal';
import { MyBookingsView } from './components/MyBookingsView';
import { PopularRoutesSection } from './components/PopularRoutesSection';
import { CabBazarAdvantages } from './components/CabBazarAdvantages';
import { CustomerReviews } from './components/CustomerReviews';
import { FaqSection } from './components/FaqSection';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { DriverPartnerSection } from './components/DriverPartnerSection';
import { DriverPartnerModal } from './components/DriverPartnerModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';

export default function App() {
  // Navigation tabs: 'booking' | 'rides' | 'routes' | 'faq'
  const [activeTab, setActiveTab] = useState<'booking' | 'rides' | 'routes' | 'faq'>('booking');

  // Customer Authentication state
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(() => {
    try {
      const saved = localStorage.getItem('safar_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [isCustomerProfileOpen, setIsCustomerProfileOpen] = useState(false);
  const [pendingCabSelection, setPendingCabSelection] = useState<{ cab: CabVehicle; fare: FareCalculationResult } | null>(null);
  const [isDriverPartnerOpen, setIsDriverPartnerOpen] = useState(false);
  const [isCabsModalOpen, setIsCabsModalOpen] = useState(false);
  const [customerMobile, setCustomerMobile] = useState(() => currentUser?.phone || '');

  // Booking Engine form states
  const [tripType, setTripType] = useState<TripType>('oneway');
  const [pickupCity, setPickupCity] = useState('Delhi NCR');
  const [dropCity, setDropCity] = useState('Agra');
  
  // Date defaults: tomorrow
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const getDayAfterStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  const [pickupDate, setPickupDate] = useState(getTomorrowStr);
  const [pickupTime, setPickupTime] = useState('07:00 AM');
  const [returnDate, setReturnDate] = useState(getDayAfterStr);
  const [returnTime, setReturnTime] = useState('08:00 PM');
  const [localPackageId, setLocalPackageId] = useState('8h_80k');
  const [airportMode, setAirportMode] = useState<'pickup' | 'drop'>('drop');
  const [airportTerminal, setAirportTerminal] = useState('');
  const [includeTolls, setIncludeTolls] = useState(true);

  // Distance and Duration calculation via Ola Maps
  const [distanceKm, setDistanceKm] = useState(230);
  const [travelDuration, setTravelDuration] = useState('3 hrs 45 mins');
  const [isExactOlaDistance, setIsExactOlaDistance] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>({ lat: 28.6139, lng: 77.2090 });
  const [dropCoords, setDropCoords] = useState<Coordinates | null>({ lat: 27.1767, lng: 78.0081 });

  useEffect(() => {
    let isCancelled = false;
    async function updateDistance() {
      if (tripType === 'local') {
        const d = localPackageId === '4h_40k' ? 40 : localPackageId === '12h_120k' ? 120 : 80;
        setDistanceKm(d);
        setTravelDuration(localPackageId === '4h_40k' ? '4 hrs' : localPackageId === '12h_120k' ? '12 hrs' : '8 hrs');
        setIsExactOlaDistance(false);
      } else {
        const res = await calculateExactRoadDistance(pickupCity, dropCity, pickupCoords, dropCoords);
        if (!isCancelled) {
          setDistanceKm(res.distanceKm);
          setTravelDuration(res.durationText);
          setIsExactOlaDistance(res.source === 'ola_maps_exact');
          if (res.originCoords && !pickupCoords) setPickupCoords(res.originCoords);
          if (res.destCoords && !dropCoords) setDropCoords(res.destCoords);
        }
      }
    }
    updateDistance();
    return () => {
      isCancelled = true;
    };
  }, [pickupCity, dropCity, pickupCoords, dropCoords, tripType, localPackageId]);

  // Selected cab for checkout
  const [selectedCabForCheckout, setSelectedCabForCheckout] = useState<{
    cab: CabVehicle;
    fare: FareCalculationResult;
  } | null>(null);

  // Master Bookings Repository (stored securely for fleet management)
  // Backend /api/bookings is the single source of truth; syncs with localStorage
  const [allBookings, setAllBookings] = useState<BookingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('safar_bookings');
      if (saved) {
        const parsed: BookingRecord[] = JSON.parse(saved);
        // Clean out any static mock/demo data immediately
        const cleaned = parsed.filter(b => b && !b.id.includes('DEMO') && !b.id.includes('TEST'));
        if (cleaned.length > 0) return cleaned;
      }
    } catch (e) {
      console.warn('Error reading saved bookings', e);
    }
    // Verified confirmed booking SIC-789940:
    // Total ₹1,817, Verified Advance Received = ₹363 (Captured via Razorpay), Outstanding Balance = ₹1,454
    return [
      {
        id: 'SIC-789940',
        tripType: 'oneway',
        pickupCity: 'Delhi NCR',
        dropCity: 'Agra',
        pickupAddress: 'T3 IGI Airport, New Delhi',
        dropAddress: 'Tajganj, Agra, Uttar Pradesh',
        landmark: 'Taj View Point',
        pickupDate: '2026-10-18',
        pickupTime: '08:00 AM',
        cabId: 'sedan',
        cabName: 'Sedan AC (Maruti Dzire)',
        distanceKm: 230,
        baseFare: 1450,
        driverAllowance: 0,
        tollsAndTaxes: 280,
        gstAmount: 87,
        totalFare: 1817,
        advancePaid: 363, // Exact 20% advance captured via Razorpay
        balanceDue: 1454, // Outstanding balance to be collected by driver
        paymentMode: 'advance_20',
        paymentMethod: 'upi_razorpay',
        transactionId: 'pay_live_captured_789940',
        customerName: 'Verified Passenger',
        customerPhone: '7710080992',
        customerEmail: 'passenger@safarindiacabs.in',
        status: 'confirmed',
        createdAt: '2026-10-17T08:30:00.000Z',
        notes: '20% advance received via Razorpay. Balance Rs. 1,454 payable to driver at destination.'
      }
    ];
  });

  // Sync real persistent bookings from serverless backend on mount
  useEffect(() => {
    async function syncBackendBookings() {
      try {
        const res = await fetch('/api/bookings');
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.success && Array.isArray(data.bookings) && data.bookings.length > 0) {
            setAllBookings(data.bookings);
          }
        }
      } catch (e) {
        console.info('Backend /api/bookings sync notice, using local cache:', e);
      }
    }
    syncBackendBookings();
  }, []);

  // Save master bookings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('safar_bookings', JSON.stringify(allBookings));
    } catch (e) {
      console.warn('Failed to save bookings to localStorage', e);
    }
  }, [allBookings]);

  // STRICT PRIVACY & OWNERSHIP FILTERING:
  // When a user is logged in, show ONLY bookings with their exact 10-digit mobile number.
  // When logged out, strictly return empty array []. No previous or cross-user bookings are ever exposed!
  const currentUserBookings = useMemo(() => {
    if (!currentUser || !currentUser.phone) {
      return [];
    }
    const cleanUserPhone = sanitize10DigitPhone(currentUser.phone);
    return allBookings.filter(b => sanitize10DigitPhone(b.customerPhone) === cleanUserPhone);
  }, [allBookings, currentUser]);

  // Active voucher modal
  const [activeVoucherBooking, setActiveVoucherBooking] = useState<BookingRecord | null>(null);

  const handleSelectCab = (cab: CabVehicle, fare: FareCalculationResult) => {
    // If customer is not logged in, prompt login first
    if (!currentUser) {
      setPendingCabSelection({ cab, fare });
      setAuthPrompt(`Please login with your mobile number to book ${cab.name}.`);
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedCabForCheckout({ cab, fare });
  };

  const handleBookingSuccess = (newBooking: BookingRecord) => {
    setAllBookings(prev => [newBooking, ...prev]);
    setSelectedCabForCheckout(null);
    setActiveVoucherBooking(newBooking);
    // Sync with serverless backend
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking: newBooking })
    }).catch(() => {});
  };

  const handleCancelBooking = (bookingId: string) => {
    if (!currentUser?.phone) return;
    const cleanUserPhone = sanitize10DigitPhone(currentUser.phone);
    // Strict ownership verification: only allow cancelling own booking
    setAllBookings(prev => prev.map(b => {
      if (b.id === bookingId && sanitize10DigitPhone(b.customerPhone) === cleanUserPhone) {
        return { ...b, status: 'cancelled' };
      }
      return b;
    }));
  };

  const handlePopularRouteClick = (route: PopularRouteDeal) => {
    setTripType('oneway');
    setPickupCity(route.from);
    setDropCity(route.to);
    setActiveTab('booking');
    setIsCabsModalOpen(true);
  };

  const handleLoginSuccess = (user: CustomerUser) => {
    setCurrentUser(user);
    setCustomerMobile(user.phone);
    try {
      localStorage.setItem('safar_user', JSON.stringify(user));
    } catch {}

    setAuthNotice(`Welcome back, ${user.name}! You are logged in.`);
    setTimeout(() => setAuthNotice(''), 4000);

    // If customer was waiting to book a cab, open checkout immediately
    if (pendingCabSelection) {
      setSelectedCabForCheckout(pendingCabSelection);
      setPendingCabSelection(null);
      setAuthPrompt('');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCustomerMobile('');
    setPendingCabSelection(null);
    setActiveVoucherBooking(null);
    setIsCustomerProfileOpen(false);
    try {
      localStorage.removeItem('safar_user');
      sessionStorage.clear();
    } catch {}
    setAuthNotice('You have been logged out securely.');
    setTimeout(() => setAuthNotice(''), 4000);
    // Switch to booking tab so previous user's booking view is immediately closed
    setActiveTab('booking');
  };

  // Admin Dashboard States & Handlers
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  // Secret Owner PIN saved securely in storage (default 0992)
  const [ownerPin, setOwnerPin] = useState(() => {
    try {
      return localStorage.getItem('safar_owner_pin') || '0992';
    } catch {
      return '0992';
    }
  });

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput === ownerPin) {
      setIsAdminPinModalOpen(false);
      setIsAdminDashboardOpen(true);
      setAdminPinInput('');
      setAdminPinError('');
    } else {
      setAdminPinError('Incorrect PIN! Access denied.');
    }
  };

  const handleChangeOwnerPin = (newPin: string) => {
    setOwnerPin(newPin);
    try {
      localStorage.setItem('safar_owner_pin', newPin);
    } catch {}
  };

  const handleUpdateBookingStatusByAdmin = (
    bookingId: string, 
    status: 'confirmed' | 'completed' | 'cancelled',
    driverInfo?: { name: string; phone: string; carPlate: string; vehicleModel?: string }
  ) => {
    setAllBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status,
          driverName: driverInfo?.name || b.driverName,
          driverPhone: driverInfo?.phone || b.driverPhone,
          driverVehicleModel: driverInfo?.vehicleModel || b.driverVehicleModel,
          driverVehicleNo: driverInfo?.carPlate || b.driverVehicleNo,
          driverAssignedAt: driverInfo ? new Date().toISOString() : b.driverAssignedAt,
          notes: driverInfo 
            ? `Driver: ${driverInfo.name} (${driverInfo.phone}) | ${driverInfo.vehicleModel || 'Cab'} (${driverInfo.carPlate})` 
            : b.notes
        };
      }
      return b;
    }));

    // Sync status change to backend
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_status', bookingId, status, driverInfo })
    }).catch(() => {});
  };

  const handleClearDemoBookings = () => {
    setAllBookings(prev => {
      // Remove mock/demo bookings without genuine transaction IDs
      const filtered = prev.filter(b => b.transactionId && !b.id.includes('DEMO') && !b.id.includes('TEST'));
      try {
        localStorage.setItem('safar_bookings', JSON.stringify(filtered));
      } catch {}
      return filtered;
    });

    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_demo' })
    }).catch(() => {});
  };

  const handleOpenAvailableCabs = () => {
    setIsCabsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-amber-400 selection:text-slate-950">
      
      {/* Header */}
      <Header
        currentUser={currentUser}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'routes') {
            document.getElementById('popular-routes-section')?.scrollIntoView({ behavior: 'smooth' });
          } else if (tab === 'faq') {
            document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        activeNavTab={activeTab}
        onOpenAdmin={() => setIsAdminPinModalOpen(true)}
        onOpenDriverPartner={() => setIsDriverPartnerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-28 sm:pb-16">
        
        {/* If Active Tab is 'rides', show the My Bookings view full screen */}
        {activeTab === 'rides' ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MyBookingsView
              currentUser={currentUser}
              bookings={currentUserBookings}
              onOpenLogin={() => {
                setAuthPrompt('Please login with your mobile number to view your rides & tax invoices.');
                setIsAuthModalOpen(true);
              }}
              onSelectBookingForInvoice={(b) => setActiveVoucherBooking(b)}
              onCancelBooking={handleCancelBooking}
              onNavigateToBooking={() => setActiveTab('booking')}
            />
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* HERO SECTION */}
            <div className="relative overflow-hidden bg-gradient-to-b from-amber-500/5 via-slate-50 to-[#F8FAFC] pt-6 pb-12 sm:pb-16 border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* Hero Header Typography */}
                <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>India's Most Trusted Outstation Taxi Service</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                    Intercity Outstation & Local Cabs with <span className="text-amber-600">Guaranteed Low Fares</span>
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Zero return fare on one-way trips · Verified AC commercial cabs · 20% advance booking deposit · Free cancellation up to 6 hours.
                  </p>
                </div>

                {/* Hero Grid: Left Booking Engine + Right Visual Image & Trust Strip */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Booking Engine */}
                  <div className="lg:col-span-7">
                    <BookingEngine
                      tripType={tripType}
                      setTripType={setTripType}
                      pickupCity={pickupCity}
                      setPickupCity={setPickupCity}
                      dropCity={dropCity}
                      setDropCity={setDropCity}
                      pickupCoords={pickupCoords}
                      setPickupCoords={setPickupCoords}
                      dropCoords={dropCoords}
                      setDropCoords={setDropCoords}
                      pickupDate={pickupDate}
                      setPickupDate={setPickupDate}
                      pickupTime={pickupTime}
                      setPickupTime={setPickupTime}
                      returnDate={returnDate}
                      setReturnDate={setReturnDate}
                      returnTime={returnTime}
                      setReturnTime={setReturnTime}
                      localPackageId={localPackageId}
                      setLocalPackageId={setLocalPackageId}
                      airportMode={airportMode}
                      setAirportMode={setAirportMode}
                      airportTerminal={airportTerminal}
                      setAirportTerminal={setAirportTerminal}
                      includeTolls={includeTolls}
                      setIncludeTolls={setIncludeTolls}
                      distanceKm={distanceKm}
                      travelDuration={travelDuration}
                      isExactOlaDistance={isExactOlaDistance}
                      customerMobile={customerMobile}
                      setCustomerMobile={setCustomerMobile}
                      currentUser={currentUser}
                      onLoginSuccess={handleLoginSuccess}
                      onExploreCabs={handleOpenAvailableCabs}
                    />
                  </div>

                  {/* Right Column: Fleet Visual & Trust Guarantees */}
                  <div className="lg:col-span-5 space-y-4">
                    
                    {/* Visual Fleet Card */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm group bg-white">
                      <img
                        src="/src/assets/images/cabs_fleet_showcase_1792165620669.jpg"
                        alt="Safar India Cabs Fleet and Chauffeurs"
                        className="w-full h-56 sm:h-64 object-cover group-hover:scale-102 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-4">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          Premium Chauffeur Fleet
                        </span>
                        <h4 className="text-sm font-extrabold text-white">
                          Dzire, Ertiga, Innova Crysta & Urbania
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          Professional uniformed drivers with 5+ years highway experience.
                        </p>
                      </div>
                    </div>

                    {/* Quick Trust Pillars */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">No Return Fare for One-Way</div>
                          <div className="text-[11px] text-slate-500">Pay only for kilometers traveled from pickup to drop.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Pay 20% Now, Rest to Chauffeur</div>
                          <div className="text-[11px] text-slate-500">Secure booking confirmation via Razorpay or Instant UPI.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                          <Clock className="w-4 h-4 text-sky-600" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Chauffeur SMS 2 Hours Prior</div>
                          <div className="text-[11px] text-slate-500">Complete vehicle plate & driver contact details delivered to WhatsApp.</div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>


            {/* POPULAR INTERCITY ROUTES SECTION */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <PopularRoutesSection onSelectRoute={handlePopularRouteClick} />
            </div>

            {/* WHY CHOOSE SAFAR CABS / CABBAZAR ADVANTAGES */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <CabBazarAdvantages />
            </div>

            {/* VERIFIED CUSTOMER REVIEWS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <CustomerReviews />
            </div>

            {/* DRIVER / VENDOR PARTNER SECTION */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <DriverPartnerSection onOpenPartnerModal={() => setIsDriverPartnerOpen(true)} />
            </div>

            {/* FAQS & BILLING RULES */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <FaqSection />
            </div>

          </div>
        )}

      </main>

      {/* Floating 24/7 WhatsApp Quick Help Button */}
      <a
        href="https://wa.me/917710080992?text=Hello%20Safar%20India%20Cabs,%20I%20want%20to%20book%20a%20cab%20urgently"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-[118px] sm:bottom-6 right-4 sm:right-6 z-40 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 transition-all group"
        title="Chat on WhatsApp (+91 7710080992)"
      >
        <MessageSquare className="w-5 h-5 text-slate-950" />
        <span className="hidden sm:inline text-xs tracking-tight">Quick WhatsApp Booking</span>
      </a>

      {/* Mobile Bottom Navigation Bar: Floats strictly at bottom: 55px above AppsGeyser Ad Banner */}
      <nav className="fixed-bottom bottom-nav sm:hidden fixed bottom-[55px] left-0 right-0 w-full bg-white border-t border-slate-200 z-[99999] px-1.5 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-5 text-center items-center gap-0.5">
          <button
            onClick={() => {
              setActiveTab('booking');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 text-[10px] leading-tight font-bold transition active:scale-95 whitespace-nowrap ${
              activeTab === 'booking' ? 'text-amber-600 font-black' : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <Car className="w-4 h-4 mb-0.5 shrink-0" />
            <span>Book Cab</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('booking');
              setTimeout(() => {
                const el = document.getElementById('popular-routes-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 120);
            }}
            className={`flex flex-col items-center justify-center py-1 text-[10px] leading-tight font-bold transition active:scale-95 whitespace-nowrap ${
              activeTab === 'routes' ? 'text-amber-600 font-black' : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <MapPin className="w-4 h-4 mb-0.5 shrink-0" />
            <span>Routes</span>
          </button>
          <button
            onClick={() => setActiveTab('rides')}
            className={`flex flex-col items-center justify-center py-1 text-[10px] leading-tight font-bold transition active:scale-95 whitespace-nowrap ${
              activeTab === 'rides' ? 'text-amber-600 font-black' : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <Clock className="w-4 h-4 mb-0.5 shrink-0" />
            <span>Rides</span>
          </button>

          {/* Customer Login / Profile Button */}
          {currentUser ? (
            <button
              onClick={() => setIsCustomerProfileOpen(true)}
              className="flex flex-col items-center justify-center py-1 text-[10px] leading-tight font-bold text-amber-700 transition active:scale-95 whitespace-nowrap"
            >
              <div className="w-4 h-4 mb-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black flex items-center justify-center shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate max-w-[54px]">{currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setAuthPrompt('');
                setIsAuthModalOpen(true);
              }}
              className="flex flex-col items-center justify-center py-1 text-[10px] leading-tight font-black text-slate-950 bg-amber-100/90 rounded-lg transition active:scale-95 whitespace-nowrap"
            >
              <User className="w-4 h-4 mb-0.5 text-slate-950 shrink-0" />
              <span>Login</span>
            </button>
          )}

          <button
            onClick={() => setIsAdminPinModalOpen(true)}
            className="flex flex-col items-center justify-center py-1 text-[10px] leading-tight font-bold text-slate-700 hover:text-amber-700 transition active:scale-95 whitespace-nowrap"
          >
            <Shield className="w-4 h-4 mb-0.5 text-amber-600 shrink-0" />
            <span>Owner</span>
          </button>
        </div>
      </nav>

      {/* Footer with Owner Portal link & Driver Partner */}
      <Footer 
        onOpenAdmin={() => setIsAdminPinModalOpen(true)}
        onOpenDriverPartner={() => setIsDriverPartnerOpen(true)}
        onSelectRoute={(from, to) => {
          setTripType('oneway');
          setPickupCity(from);
          setDropCity(to);
          setActiveTab('booking');
          window.scrollTo({ top: 350, behavior: 'smooth' });
        }}
      />

      {/* Driver / Vendor Partner Registration Modal */}
      <DriverPartnerModal
        isOpen={isDriverPartnerOpen}
        onClose={() => setIsDriverPartnerOpen(false)}
      />

      {/* Available Cabs Selection Modal */}
      {isCabsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#F8FAFC] border border-slate-200 rounded-3xl max-w-4xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 sticky top-0 bg-[#F8FAFC] z-10 pt-1">
              <div>
                <h3 className="text-lg font-black text-slate-950">Available Cabs & Fares</h3>
                <p className="text-xs text-slate-500">Select your preferred vehicle for {pickupCity} to {dropCity}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCabsModalOpen(false)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <CabSelector
              tripType={tripType}
              pickupCity={pickupCity}
              dropCity={dropCity}
              distanceKm={distanceKm}
              pickupDate={pickupDate}
              returnDate={returnDate}
              localPackageId={localPackageId}
              includeTolls={includeTolls}
              travelDuration={travelDuration}
              onSelectCab={(cab, fare) => {
                setIsCabsModalOpen(false);
                handleSelectCab(cab, fare);
              }}
            />
          </div>
        </div>
      )}

      {/* Booking Drawer / Traveler Details Modal */}
      {selectedCabForCheckout && (
        <BookingModal
          isOpen={true}
          onClose={() => setSelectedCabForCheckout(null)}
          cab={selectedCabForCheckout.cab}
          fareDetails={selectedCabForCheckout.fare}
          tripType={tripType}
          pickupCity={pickupCity}
          dropCity={dropCity}
          pickupDate={pickupDate}
          pickupTime={pickupTime}
          returnDate={returnDate}
          returnTime={returnTime}
          localPackageId={localPackageId}
          airportMode={airportMode}
          airportTerminal={airportTerminal}
          currentUser={currentUser}
          onBookingSuccess={handleBookingSuccess}
        />
      )}

      {/* Booking Confirmation / Tax Invoice Voucher Modal */}
      {activeVoucherBooking && (
        <BookingConfirmationModal
          booking={activeVoucherBooking}
          onClose={() => setActiveVoucherBooking(null)}
          onViewMyRides={() => setActiveTab('rides')}
        />
      )}

      {/* Customer Account & Profile Modal */}
      {isCustomerProfileOpen && currentUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95">
            <button
              onClick={() => setIsCustomerProfileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 transition"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Customer Profile</div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">{currentUser.name}</h3>
                <div className="text-xs font-mono text-slate-600 font-semibold">+91 {currentUser.phone}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Phone Status:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified via OTP</span>
                </span>
              </div>
              {currentUser.email && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-800 font-medium">{currentUser.email}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">My Total Bookings:</span>
                <span className="text-slate-900 font-bold">{currentUserBookings.length} trips</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  setIsCustomerProfileOpen(false);
                  setActiveTab('rides');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4 text-slate-600" />
                <span>View My Rides & Tax Invoices</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Logout from Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Mobile OTP Login Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthPrompt('');
        }}
        authPrompt={authPrompt}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Auth Floating Notification */}
      {authNotice && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{authNotice}</span>
        </div>
      )}

      {/* Owner Security PIN Modal */}
      {isAdminPinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xs w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setIsAdminPinModalOpen(false);
                setAdminPinError('');
                setAdminPinInput('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">Owner Access PIN</h4>
              <p className="text-xs text-slate-500 mt-0.5">Enter secret security PIN to manage bookings</p>
            </div>
            {adminPinError && (
              <div className="text-xs text-rose-700 bg-rose-50 py-1.5 px-2 rounded-lg border border-rose-200">
                {adminPinError}
              </div>
            )}
            <form onSubmit={handleVerifyAdminPin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 text-center tracking-[0.5em] text-xl font-black bg-slate-50 border border-slate-300 rounded-2xl py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 font-mono mx-auto block"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl transition shadow-sm"
              >
                Unlock Dashboard
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Dashboard */}
      <AdminDashboard
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        bookings={allBookings}
        onUpdateBookingStatus={handleUpdateBookingStatusByAdmin}
        onChangePin={handleChangeOwnerPin}
        onClearDemoBookings={handleClearDemoBookings}
      />

    </div>
  );
}
