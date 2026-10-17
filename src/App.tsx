/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Shield
} from 'lucide-react';
import { TripType, CabVehicle, BookingRecord, CustomerUser } from './types';
import { POPULAR_ROUTES, PopularRouteDeal, estimateDistanceKm } from './data/indianCities';
import { CABS_FLEET } from './data/cabsFleet';
import { computeTripFare, FareCalculationResult } from './utils/fareCalculator';
import { calculateExactRoadDistance, Coordinates } from './utils/olaMapsService';
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

  // Completed / Active Bookings list
  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('safar_bookings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved bookings', e);
    }
    // Default demo booking so customer can inspect invoice immediately
    return [
      {
        id: 'SIC-784912',
        tripType: 'oneway',
        pickupCity: 'Delhi NCR',
        dropCity: 'Agra',
        pickupAddress: 'Tower B, Cyber City, Phase 2, Gurugram',
        dropAddress: 'Taj East Gate Road, Tajganj, Agra',
        landmark: 'Near DLF Cyber Hub',
        pickupDate: '2026-10-20',
        pickupTime: '06:30 AM',
        cabId: 'sedan',
        cabName: 'Sedan AC (Dzire / Etios)',
        distanceKm: 230,
        baseFare: 2760,
        driverAllowance: 300,
        tollsAndTaxes: 368,
        gstAmount: 153,
        totalFare: 3581,
        advancePaid: 716,
        balanceDue: 2865,
        paymentMode: 'advance_20',
        paymentMethod: 'Razorpay UPI',
        transactionId: 'TXN_PAY_982401',
        customerName: 'Avinash Mishra',
        customerPhone: '7710080992',
        customerEmail: 'avinashmishra08548@gmail.com',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Save bookings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('safar_bookings', JSON.stringify(bookings));
    } catch (e) {
      console.warn('Failed to save bookings to localStorage', e);
    }
  }, [bookings]);

  // Active voucher modal
  const [activeVoucherBooking, setActiveVoucherBooking] = useState<BookingRecord | null>(null);

  const handleSelectCab = (cab: CabVehicle, fare: FareCalculationResult) => {
    setSelectedCabForCheckout({ cab, fare });
  };

  const handleBookingSuccess = (newBooking: BookingRecord) => {
    setBookings(prev => [newBooking, ...prev]);
    setSelectedCabForCheckout(null);
    setActiveVoucherBooking(newBooking);
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
  };

  const handlePopularRouteClick = (route: PopularRouteDeal) => {
    setTripType('oneway');
    setPickupCity(route.from);
    setDropCity(route.to);
    setActiveTab('booking');
    // Scroll smoothly to available cabs
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: CustomerUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('safar_user', JSON.stringify(user));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('safar_user');
    } catch {}
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
    driverInfo?: { name: string; phone: string; carPlate: string }
  ) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status,
          notes: driverInfo ? `Driver: ${driverInfo.name} (${driverInfo.phone}) | Plate: ${driverInfo.carPlate}` : b.notes
        };
      }
      return b;
    }));
  };

  const scrollToAvailableCabs = () => {
    const el = document.getElementById('available-cabs-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
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
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        
        {/* If Active Tab is 'rides', show the My Bookings view full screen */}
        {activeTab === 'rides' ? (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <MyBookingsView
              bookings={bookings}
              onSelectBookingForInvoice={(b) => setActiveVoucherBooking(b)}
              onCancelBooking={handleCancelBooking}
              onNavigateToBooking={() => setActiveTab('booking')}
            />
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* HERO SECTION */}
            <div className="relative overflow-hidden bg-slate-950 pt-6 pb-12 sm:pb-16 border-b border-slate-900">
              {/* Subtle ambient lighting */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* Hero Header Typography */}
                <div className="text-center max-w-3xl mx-auto mb-8 space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1.5 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>India's Most Trusted Outstation Taxi Service</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                    Intercity Outstation & Local Cabs with <span className="text-amber-400">Guaranteed Low Fares</span>
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
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
                      onExploreCabs={scrollToAvailableCabs}
                    />
                  </div>

                  {/* Right Column: Fleet Visual & Trust Guarantees */}
                  <div className="lg:col-span-5 space-y-4">
                    
                    {/* Visual Fleet Card */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl group">
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
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">No Return Fare for One-Way</div>
                          <div className="text-[11px] text-slate-400">Pay only for kilometers traveled from pickup to drop.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Pay 20% Now, Rest to Chauffeur</div>
                          <div className="text-[11px] text-slate-400">Secure booking confirmation via Razorpay or Instant UPI.</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Chauffeur SMS 2 Hours Prior</div>
                          <div className="text-[11px] text-slate-400">Complete vehicle plate & driver contact details delivered to WhatsApp.</div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>

            {/* CAB FLEET SELECTION SECTION */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <CabSelector
                tripType={tripType}
                pickupCity={pickupCity}
                dropCity={dropCity}
                distanceKm={distanceKm}
                pickupDate={pickupDate}
                returnDate={returnDate}
                localPackageId={localPackageId}
                includeTolls={includeTolls}
                onSelectCab={handleSelectCab}
              />
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
        className="fixed bottom-20 sm:bottom-6 right-5 z-40 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-full shadow-2xl flex items-center gap-2 hover:scale-105 transition-all group"
        title="Chat on WhatsApp (+91 7710080992)"
      >
        <MessageSquare className="w-5 h-5 text-slate-950" />
        <span className="hidden sm:inline text-xs tracking-tight">Quick WhatsApp Booking</span>
      </a>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-40 px-3 py-2">
        <div className="grid grid-cols-4 text-center">
          <button
            onClick={() => setActiveTab('booking')}
            className={`flex flex-col items-center py-1 text-[10px] font-bold ${
              activeTab === 'booking' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Car className="w-4 h-4 mb-0.5" />
            <span>Book Cab</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('booking');
              setTimeout(() => {
                document.getElementById('popular-routes-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className={`flex flex-col items-center py-1 text-[10px] font-bold ${
              activeTab === 'routes' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <MapPin className="w-4 h-4 mb-0.5" />
            <span>Routes</span>
          </button>
          <button
            onClick={() => setActiveTab('rides')}
            className={`flex flex-col items-center py-1 text-[10px] font-bold ${
              activeTab === 'rides' ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            <Clock className="w-4 h-4 mb-0.5" />
            <span>Rides</span>
          </button>
          <button
            onClick={() => setIsAdminPinModalOpen(true)}
            className="flex flex-col items-center py-1 text-[10px] font-bold text-amber-400"
          >
            <Shield className="w-4 h-4 mb-0.5" />
            <span>Owner</span>
          </button>
        </div>
      </nav>

      {/* Footer with Owner Portal link */}
      <Footer onOpenAdmin={() => setIsAdminPinModalOpen(true)} />

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

      {/* Customer Mobile OTP Login Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Owner Security PIN Modal */}
      {isAdminPinModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xs w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setIsAdminPinModalOpen(false);
                setAdminPinError('');
                setAdminPinInput('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-400/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-white">Owner Access PIN</h4>
              <p className="text-xs text-slate-400 mt-0.5">Enter secret security PIN to manage bookings</p>
            </div>
            {adminPinError && (
              <div className="text-xs text-rose-400 bg-rose-500/10 py-1.5 px-2 rounded-lg border border-rose-500/20">
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
                className="w-32 text-center tracking-[0.5em] text-xl font-black bg-slate-950 border border-slate-800 rounded-2xl py-2.5 text-amber-400 focus:outline-none focus:border-amber-400 font-mono mx-auto block"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition shadow"
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
        bookings={bookings}
        onUpdateBookingStatus={handleUpdateBookingStatusByAdmin}
        onChangePin={handleChangeOwnerPin}
      />

    </div>
  );
}
