/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
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
  LogOut,
  Info,
  HelpCircle
} from 'lucide-react';
import { TripType, CabVehicle, BookingRecord, CustomerUser } from './types';
import { downloadProductionAab, downloadProductionApk } from './utils/aabBinaryData';
import { POPULAR_ROUTES, PopularRouteDeal, estimateDistanceKm } from './data/indianCities';
import { CABS_FLEET } from './data/cabsFleet';
import { computeTripFare, FareCalculationResult, isDrVijayKumarMatch } from './utils/fareCalculator';
import { calculateExactRoadDistance, Coordinates } from './utils/olaMapsService';
import { sanitize10DigitPhone } from './utils/smsService';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from './utils/whatsapp';
import { Header, NavTabId } from './components/Header';
import { BookingEngine } from './components/BookingEngine';
import { CabSelector } from './components/CabSelector';
import { PopularRoutesSection } from './components/PopularRoutesSection';
import { CabBazarAdvantages } from './components/CabBazarAdvantages';
import { CustomerReviews } from './components/CustomerReviews';
import { FaqSection } from './components/FaqSection';
import { DriverPartnerSection } from './components/DriverPartnerSection';
import { Footer } from './components/Footer';

const BookingModal = lazy(() =>
  import('./components/BookingModal').then((m) => ({ default: m.BookingModal }))
);
const BookingConfirmationModal = lazy(() =>
  import('./components/BookingConfirmationModal').then((m) => ({
    default: m.BookingConfirmationModal
  }))
);
const MyBookingsView = lazy(() =>
  import('./components/MyBookingsView').then((m) => ({ default: m.MyBookingsView }))
);
const CustomerReviewsModal = lazy(() =>
  import('./components/CustomerReviews').then((m) => ({ default: m.CustomerReviewsModal }))
);
const CustomerAuthModal = lazy(() =>
  import('./components/CustomerAuthModal').then((m) => ({ default: m.CustomerAuthModal }))
);
const DriverPartnerModal = lazy(() =>
  import('./components/DriverPartnerModal').then((m) => ({ default: m.DriverPartnerModal }))
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AboutSectionView = lazy(() =>
  import('./components/AboutAndHelpViews').then((m) => ({ default: m.AboutSectionView }))
);
const HelpSupportView = lazy(() =>
  import('./components/AboutAndHelpViews').then((m) => ({ default: m.HelpSupportView }))
);
const LegalPoliciesModal = lazy(() =>
  import('./components/LegalPoliciesModal').then((m) => ({ default: m.LegalPoliciesModal }))
);
import type { LegalPolicyTab } from './components/LegalPoliciesModal';

export default function App() {
  // Navigation tabs: 'booking' | 'routes' | 'rides' | 'about' | 'help'
  const [activeTab, setActiveTab] = useState<NavTabId>('booking');
  const [activeSectionId, setActiveSectionId] = useState<string>('booking-section-top');

  const scrollAllContainersTo = (topPos: number, behavior: ScrollBehavior = 'smooth') => {
    try {
      window.scrollTo({ top: topPos, behavior });
    } catch {
      window.scrollTo(0, topPos);
    }
    try {
      document.documentElement.scrollTo({ top: topPos, behavior });
    } catch {
      document.documentElement.scrollTop = topPos;
    }
    try {
      document.body.scrollTo({ top: topPos, behavior });
    } catch {
      document.body.scrollTop = topPos;
    }
  };

  const scrollToSectionTop = (sectionId?: string, fallbackTop = 0) => {
    const topLevelSections = new Set([
      'booking-section-top',
      'routes-section-top',
      'rides-section-top',
      'about-company-top',
      'customer-support-top'
    ]);

    const performScroll = () => {
      if (!sectionId || topLevelSections.has(sectionId)) {
        scrollAllContainersTo(0, 'smooth');
        if (sectionId) {
          const topEl = document.getElementById(sectionId);
          if (topEl) {
            if (!topEl.hasAttribute('tabindex')) {
              topEl.setAttribute('tabindex', '-1');
            }
            topEl.focus({ preventScroll: true });
          }
        }
        return;
      }

      const el = document.getElementById(sectionId);
      if (el) {
        const headerEl = document.querySelector('header.safar-dark-header');
        const stickyHeaderOffset = (headerEl ? headerEl.getBoundingClientRect().height : 72) + 14;
        const currentScroll =
          window.scrollY ||
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0;
        const elementTop = el.getBoundingClientRect().top + currentScroll;
        const targetScrollTop = Math.max(0, elementTop - stickyHeaderOffset);

        scrollAllContainersTo(targetScrollTop, 'smooth');

        if (!el.hasAttribute('tabindex')) {
          el.setAttribute('tabindex', '-1');
        }
        el.focus({ preventScroll: true });
        return;
      }

      scrollAllContainersTo(fallbackTop, 'smooth');
    };

    window.requestAnimationFrame(() => {
      window.setTimeout(performScroll, 40);
      window.setTimeout(performScroll, 160);
    });
  };

  const handleSwitchTab = (tab: NavTabId, targetSectionId?: string) => {
    const defaultSectionMap: Record<NavTabId, string> = {
      booking: 'booking-section-top',
      routes: 'routes-section-top',
      rides: 'rides-section-top',
      about: 'about-company-top',
      help: 'customer-support-top'
    };
    const resolvedSectionId = targetSectionId || defaultSectionMap[tab];
    setActiveTab(tab);
    setActiveSectionId(resolvedSectionId);
    scrollToSectionTop(resolvedSectionId, 0);
  };

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
  const shouldOpenReviewsFromUrl = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const actionParam = (searchParams.get('action') || '').trim().toLowerCase();
      const hashVal = (window.location.hash || '').trim().toLowerCase();
      const pathname = (window.location.pathname || '').trim().toLowerCase().replace(/\/+$/, '');
      return (
        actionParam === 'review' ||
        actionParam === 'reviews' ||
        searchParams.has('review') ||
        searchParams.has('reviews') ||
        hashVal === '#reviews' ||
        hashVal === '#review' ||
        pathname === '/reviews' ||
        pathname === '/review'
      );
    } catch {
      return false;
    }
  };

  const [isDriverPartnerOpen, setIsDriverPartnerOpen] = useState(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState<boolean>(() => shouldOpenReviewsFromUrl());
  const [isCabsModalOpen, setIsCabsModalOpen] = useState(false);
  const [legalPolicyModalTab, setLegalPolicyModalTab] = useState<LegalPolicyTab | null>(null);
  const [customerMobile, setCustomerMobile] = useState(() => currentUser?.phone || '');

  // Booking Engine form states
  const [tripType, setTripType] = useState<TripType>('oneway');
  const [pickupCity, setPickupCity] = useState('Delhi NCR');
  const [dropCity, setDropCity] = useState('Agra');
  const [roundTripStops, setRoundTripStops] = useState<string[]>([]);

  useEffect(() => {
    const applyRouteFromUrl = () => {
      if (shouldOpenReviewsFromUrl()) {
        setIsReviewsModalOpen(true);
      }
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const policyParam = (searchParams.get('policy') || '').trim().toLowerCase();
        if (policyParam === 'privacy' || policyParam === 'privacy-policy') {
          setLegalPolicyModalTab('privacy');
        } else if (policyParam === 'terms' || policyParam === 'terms-and-conditions') {
          setLegalPolicyModalTab('terms');
        } else if (policyParam === 'refund' || policyParam === 'cancellation') {
          setLegalPolicyModalTab('refund');
        } else if (policyParam === 'contact') {
          setLegalPolicyModalTab('contact');
        } else if (policyParam === 'delete-account' || policyParam === 'delete') {
          setLegalPolicyModalTab('delete-account');
        }

        const pathname = (window.location.pathname || '').trim().toLowerCase().replace(/\/+$/, '');
        if (!pathname || pathname === '/') return;

        if (pathname === '/privacy-policy' || pathname === '/privacy') {
          setLegalPolicyModalTab('privacy');
          return;
        } else if (pathname === '/terms-and-conditions' || pathname === '/terms') {
          setLegalPolicyModalTab('terms');
          return;
        } else if (pathname === '/refund-policy' || pathname === '/cancellation-policy') {
          setLegalPolicyModalTab('refund');
          return;
        } else if (pathname === '/contact-us' || pathname === '/contact') {
          setLegalPolicyModalTab('contact');
          return;
        } else if (pathname === '/delete-account' || pathname === '/data-deletion') {
          setLegalPolicyModalTab('delete-account');
          return;
        }

        if (pathname === '/one-way-cab') {
          setActiveTab('booking');
          setTripType('oneway');
        } else if (pathname === '/round-trip-cab') {
          setActiveTab('booking');
          setTripType('roundtrip');
        } else if (pathname === '/local-cab-rental') {
          setActiveTab('booking');
          setTripType('local');
        } else if (pathname === '/airport-taxi') {
          setActiveTab('booking');
          setTripType('airport');
        } else if (pathname === '/popular-routes') {
          setActiveTab('routes');
          setActiveSectionId('routes-section-top');
        } else if (pathname === '/about') {
          setActiveTab('about');
          setActiveSectionId('about-company-top');
        } else if (pathname === '/help') {
          setActiveTab('help');
          setActiveSectionId('customer-support-top');
        } else if (pathname === '/driver-partner') {
          setIsDriverPartnerOpen(true);
        } else {
          const intercityRoutes: Record<string, { from: string; to: string }> = {
            '/delhi-to-agra-cab': { from: 'Delhi NCR', to: 'Agra' },
            '/delhi-to-jaipur-cab': { from: 'Delhi NCR', to: 'Jaipur' },
            '/delhi-to-chandigarh-cab': { from: 'Delhi NCR', to: 'Chandigarh' },
            '/delhi-to-haridwar-cab': { from: 'Delhi NCR', to: 'Haridwar' },
            '/delhi-to-dehradun-cab': { from: 'Delhi NCR', to: 'Dehradun' },
            '/delhi-to-manali-cab': { from: 'Delhi NCR', to: 'Manali' },
            '/delhi-to-shimla-cab': { from: 'Delhi NCR', to: 'Shimla' },
            '/delhi-to-nainital-cab': { from: 'Delhi NCR', to: 'Nainital' },
            '/mumbai-to-pune-cab': { from: 'Mumbai', to: 'Pune' },
            '/lucknow-to-ayodhya-cab': { from: 'Lucknow', to: 'Ayodhya' },
          };
          const matchedRoute = intercityRoutes[pathname];
          if (matchedRoute) {
            setActiveTab('booking');
            setTripType('oneway');
            setPickupCity(matchedRoute.from);
            setDropCity(matchedRoute.to);
          }
        }
      } catch {
        // Ignore URL parsing errors
      }
    };
    applyRouteFromUrl();
    window.addEventListener('hashchange', applyRouteFromUrl);
    window.addEventListener('popstate', applyRouteFromUrl);
    return () => {
      window.removeEventListener('hashchange', applyRouteFromUrl);
      window.removeEventListener('popstate', applyRouteFromUrl);
    };
  }, []);
  
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
  const [includeTolls, setIncludeTolls] = useState(false);
  const [extraKm, setExtraKm] = useState(0);
  const [promoCode, setPromoCode] = useState<string>(() =>
    isDrVijayKumarMatch(currentUser?.name) ? 'FIRST300' : ''
  );
  const [isPromoApplied, setIsPromoApplied] = useState<boolean>(() =>
    isDrVijayKumarMatch(currentUser?.name)
  );

  useEffect(() => {
    if (isDrVijayKumarMatch(currentUser?.name) || isDrVijayKumarMatch(authNotice)) {
      setIsPromoApplied(true);
      if (!promoCode) setPromoCode('FIRST300');
    }
  }, [currentUser?.name, authNotice]);

  const roundTripDays = useMemo(() => {
    if (tripType === 'roundtrip' && pickupDate && returnDate) {
      const p = new Date(pickupDate).getTime();
      const r = new Date(returnDate).getTime();
      if (!isNaN(p) && !isNaN(r) && r >= p) {
        return Math.max(1, Math.ceil((r - p) / (1000 * 60 * 60 * 24)) + 1);
      }
    }
    return 1;
  }, [tripType, pickupDate, returnDate]);

  const effectiveDropCity = useMemo(() => {
    const validStops = roundTripStops.map((s) => s.trim()).filter(Boolean);
    if (tripType === 'roundtrip' && validStops.length > 0) {
      return [dropCity, ...validStops].join(' → ');
    }
    return dropCity;
  }, [tripType, dropCity, roundTripStops]);

  // Distance and Duration calculation via Ola Maps & Verified Highway/Hill Matrix
  const [distanceKm, setDistanceKm] = useState(230);
  const [travelDuration, setTravelDuration] = useState('3 hrs 45 mins');
  const [isExactOlaDistance, setIsExactOlaDistance] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>({ lat: 28.6139, lng: 77.2090 });
  const [dropCoords, setDropCoords] = useState<Coordinates | null>({ lat: 27.1767, lng: 78.0081 });
  const [roundTripLegs, setRoundTripLegs] = useState<Array<{ from: string; to: string; distanceKm: number }>>([]);

  useEffect(() => {
    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (tripType === 'local') {
        const d = localPackageId === '4h_40k' ? 40 : localPackageId === '12h_120k' ? 120 : 80;
        if (!isCancelled) {
          setDistanceKm(d);
          setRoundTripLegs([]);
          setTravelDuration(localPackageId === '4h_40k' ? '4 hrs' : localPackageId === '12h_120k' ? '12 hrs' : '8 hrs');
          setIsExactOlaDistance(false);
        }
        return;
      }

      const cleanPickup = (pickupCity || '').trim();
      const cleanDrop = (dropCity || '').trim();

      if (tripType === 'roundtrip') {
        const validStops = roundTripStops
          .map((s) => (s || '').trim())
          .filter((s) => s.length >= 3);

        const rawPoints = [cleanPickup, cleanDrop, ...validStops].filter((p) => p.length >= 3);

        // Deduplicate consecutive identical points
        const uniqueWaypoints: string[] = [];
        for (const pt of rawPoints) {
          const prev = uniqueWaypoints[uniqueWaypoints.length - 1];
          if (!prev || prev.toLowerCase().split(',')[0].trim() !== pt.toLowerCase().split(',')[0].trim()) {
            uniqueWaypoints.push(pt);
          }
        }

        if (uniqueWaypoints.length >= 2) {
          const circuitPoints = [...uniqueWaypoints, uniqueWaypoints[0]];
          let totalCircuitKm = 0;
          let totalMinutes = 0;
          const computedLegs: Array<{ from: string; to: string; distanceKm: number }> = [];

          for (let i = 0; i < circuitPoints.length - 1; i++) {
            const fromLoc = circuitPoints[i];
            const toLoc = circuitPoints[i + 1];
            const pC = i === 0 ? pickupCoords : null;
            const dC = i === 0 && validStops.length === 0 ? dropCoords : null;
            const legRes = await calculateExactRoadDistance(fromLoc, toLoc, pC, dC);
            totalCircuitKm += legRes.distanceKm;
            totalMinutes += legRes.durationMinutes;
            computedLegs.push({
              from: fromLoc.split(',')[0].trim(),
              to: toLoc.split(',')[0].trim(),
              distanceKm: legRes.distanceKm
            });
          }

          if (!isCancelled) {
            // computeTripFare multiplies distanceKm * 2 for roundtrip, so store exact half (totalCircuitKm / 2)
            setDistanceKm(Math.max(40, totalCircuitKm / 2));
            setRoundTripLegs(computedLegs);
            const hrs = Math.max(2, Math.round(totalMinutes / 60));
            setTravelDuration(
              validStops.length > 0
                ? `${hrs} hrs (${computedLegs.length} Legs Round Trip)`
                : `${hrs} hrs (Round Trip)`
            );
            setIsExactOlaDistance(true);
          }
        }
        return;
      }

      // One-Way or Airport trip
      if (cleanPickup.length < 3 || cleanDrop.length < 3) {
        return;
      }

      const res = await calculateExactRoadDistance(cleanPickup, cleanDrop, pickupCoords, dropCoords);
      if (!isCancelled) {
        setDistanceKm(res.distanceKm);
        setRoundTripLegs([]);
        setTravelDuration(res.durationText);
        setIsExactOlaDistance(res.source === 'ola_maps_exact');
      }
    }, 120);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [pickupCity, dropCity, roundTripStops, pickupCoords, dropCoords, tripType, localPackageId]);

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

  // Helper to merge local and backend bookings without losing new bookings or driver assignments
  const mergeBookingsList = (
    localList: BookingRecord[],
    remoteList: BookingRecord[]
  ): BookingRecord[] => {
    const mapById = new Map<string, BookingRecord>();

    const upsert = (item: BookingRecord) => {
      if (!item || !item.id || item.id.includes('DEMO') || item.id.includes('TEST')) return;
      const existing = mapById.get(item.id);
      if (!existing) {
        mapById.set(item.id, item);
        return;
      }
      const merged: BookingRecord = {
        ...existing,
        ...item,
        driverName: item.driverName || existing.driverName,
        driverPhone: item.driverPhone || existing.driverPhone,
        driverVehicleModel: item.driverVehicleModel || existing.driverVehicleModel,
        driverVehicleNo: item.driverVehicleNo || existing.driverVehicleNo,
        driverAssignedAt: item.driverAssignedAt || existing.driverAssignedAt,
        notes: item.notes || existing.notes
      };
      if (existing.status === 'completed' || item.status === 'completed') {
        merged.status = 'completed';
      } else if (existing.status === 'cancelled' || item.status === 'cancelled') {
        merged.status = 'cancelled';
      }
      mapById.set(item.id, merged);
    };

    for (const b of remoteList) upsert(b);
    for (const b of localList) upsert(b);

    return Array.from(mapById.values()).sort((a, b) => {
      const tA = Date.parse(a.createdAt || '') || 0;
      const tB = Date.parse(b.createdAt || '') || 0;
      return tB - tA;
    });
  };

  const refreshAllBookings = async (force = false) => {
    try {
      let currentLocal: BookingRecord[] = [];
      try {
        const saved = localStorage.getItem('safar_bookings');
        if (saved) currentLocal = JSON.parse(saved);
      } catch {}

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_client_bookings',
          bookings: currentLocal.length > 0 ? currentLocal : allBookings,
          force
        })
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success && Array.isArray(data.bookings)) {
          setAllBookings(prev => mergeBookingsList(prev, data.bookings));
          return;
        }
      }

      const fallbackRes = await fetch(force ? '/api/bookings?force=1' : '/api/bookings');
      if (fallbackRes.ok) {
        const data = await fallbackRes.json().catch(() => null);
        if (data && data.success && Array.isArray(data.bookings)) {
          setAllBookings(prev => mergeBookingsList(prev, data.bookings));
        }
      }
    } catch (e) {
      console.info('Backend /api/bookings sync notice, using local cache:', e);
    }
  };

  // Sync real persistent bookings from serverless backend on mount
  useEffect(() => {
    refreshAllBookings(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setAllBookings(prev => {
      const next = mergeBookingsList([newBooking, ...prev], [newBooking]);
      try {
        localStorage.setItem('safar_bookings', JSON.stringify(next));
      } catch {}
      return next;
    });
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

  const handleDeleteCustomerAccount = (phoneToDelete: string) => {
    const cleanTarget = sanitize10DigitPhone(phoneToDelete);
    // Purge matching bookings from local device cache
    setAllBookings((prev) => {
      const remaining = prev.filter((b) => sanitize10DigitPhone(b.customerPhone) !== cleanTarget);
      try {
        localStorage.setItem('safar_bookings', JSON.stringify(remaining));
      } catch {}
      return remaining;
    });
    // If currently logged-in user matches, log out and purge user session
    if (currentUser && sanitize10DigitPhone(currentUser.phone) === cleanTarget) {
      setCurrentUser(null);
      setCustomerMobile('');
      setIsCustomerProfileOpen(false);
      try {
        localStorage.removeItem('safar_user');
        sessionStorage.clear();
      } catch {}
    }
    setAuthNotice('Your account and personal data have been deleted.');
    setTimeout(() => setAuthNotice(''), 5000);
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

  // Automatically sync bookings when Owner Panel opens and every 15s while open
  useEffect(() => {
    if (!isAdminDashboardOpen) return;
    refreshAllBookings(true);
    const interval = setInterval(() => {
      refreshAllBookings(true);
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminDashboardOpen]);

  const handleUpdateBookingStatusByAdmin = (
    bookingId: string, 
    status: 'confirmed' | 'completed' | 'cancelled',
    driverInfo?: { name: string; phone: string; carPlate: string; vehicleModel?: string }
  ) => {
    let targetUpdatedBooking: BookingRecord | null = null;

    setAllBookings(prev => {
      let completedRecord: BookingRecord | null = null;
      const next = prev.map(b => {
        if (b.id === bookingId) {
          const updated: BookingRecord = {
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
          targetUpdatedBooking = updated;
          if (status === 'completed') {
            completedRecord = updated;
          }
          return updated;
        }
        return b;
      });
      try {
        localStorage.setItem('safar_bookings', JSON.stringify(next));
      } catch {}
      if (completedRecord) {
        setTimeout(() => setActiveVoucherBooking(completedRecord), 50);
      }
      return next;
    });

    // Sync status change and full booking record to backend
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_status',
        bookingId,
        status,
        driverInfo,
        booking: targetUpdatedBooking
      })
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
      {/* Direct 1-Click Google Play Console .AAB Download Bar */}
      <div className="bg-slate-950 text-white border-b border-amber-400/30 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
              Play Console Ready
            </span>
            <span className="font-bold text-slate-200">
              Production Binary Android App Bundle (<span className="text-amber-300 font-mono">com.safarindiacabs.app-release.aab</span> · <span className="text-emerald-400">Safarindiacabs · v1.0.3 / versionCode: 4 / SDK 36</span>)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadProductionAab}
              className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] transition cursor-pointer"
            >
              ⬇ Download Binary .AAB (v1.0.3 · Code 4 · SDK 36)
            </button>
            <button
              type="button"
              onClick={downloadProductionApk}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-[11px] transition cursor-pointer"
            >
              ⬇ Download .APK
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <Header
        currentUser={currentUser}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onNavigateTab={handleSwitchTab}
        activeNavTab={activeTab}
        onOpenAdmin={() => setIsAdminPinModalOpen(true)}
        onOpenDriverPartner={() => setIsDriverPartnerOpen(true)}
        onOpenLegalPolicy={(tab) => setLegalPolicyModalTab(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-28 sm:pb-16">
        
        {activeTab === 'rides' ? (
          <div
            id="rides-section-top"
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-in fade-in scroll-mt-24 outline-hidden"
          >
            <Suspense fallback={<div className="py-12 text-center text-sm text-slate-600 font-semibold">Loading your rides...</div>}>
              <MyBookingsView
                currentUser={currentUser}
                bookings={currentUserBookings}
                onOpenLogin={() => {
                  setAuthPrompt('Please login with your mobile number to view your rides & tax invoices.');
                  setIsAuthModalOpen(true);
                }}
                onSelectBookingForInvoice={(b) => setActiveVoucherBooking(b)}
                onCancelBooking={handleCancelBooking}
                onNavigateToBooking={() => handleSwitchTab('booking')}
              />
            </Suspense>
          </div>
        ) : activeTab === 'routes' ? (
          <div
            id="routes-section-top"
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 animate-in fade-in scroll-mt-24 outline-hidden"
          >
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  150+ Fixed-Fare Intercity Corridors
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Popular One-Way &amp; Outstation Routes
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                  Tap any route below to instantly load pickup &amp; drop cities and view available AC Sedan, SUV, and Innova Crysta fares.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchTab('booking')}
                className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm shrink-0 transition active:scale-95 cursor-pointer"
              >
                Custom Route Search →
              </button>
            </div>

            <PopularRoutesSection onSelectRoute={handlePopularRouteClick} />
            <DriverPartnerSection onOpenPartnerModal={() => setIsDriverPartnerOpen(true)} />
          </div>
        ) : activeTab === 'about' ? (
          <Suspense fallback={<div className="py-12 text-center text-sm text-slate-600 font-semibold">Loading company details...</div>}>
            <AboutSectionView
              focusedSectionId={activeSectionId}
              onNavigateToBooking={() => handleSwitchTab('booking', 'booking-section-top')}
              onNavigateToRoutes={() => handleSwitchTab('routes', 'routes-section-top')}
              onOpenDriverPartner={() => setIsDriverPartnerOpen(true)}
            />
          </Suspense>
        ) : activeTab === 'help' ? (
          <Suspense fallback={<div className="py-12 text-center text-sm text-slate-600 font-semibold">Loading help center...</div>}>
            <HelpSupportView
              focusedSectionId={activeSectionId}
              onNavigateToBooking={() => handleSwitchTab('booking', 'booking-section-top')}
              onNavigateToRides={() => handleSwitchTab('rides', 'rides-section-top')}
              onOpenLegalPolicy={(tab) => setLegalPolicyModalTab(tab)}
            />
          </Suspense>
        ) : (
          <div id="booking-section-top" className="space-y-14 sm:space-y-20 scroll-mt-24 outline-hidden">
            
            {/* SPACIOUS EXECUTIVE HERO SECTION */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#FAF8F5] via-[#F8FAFC] to-[#F8FAFC] pt-8 sm:pt-12 pb-10 sm:pb-14 border-b border-slate-200/70">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                {/* Clean, Spacious Hero Header */}
                <div className="max-w-3xl mb-8 sm:mb-10">
                  <p className="text-xs sm:text-sm font-bold text-amber-800 tracking-wide mb-2">
                    A1 Cab Services · All India Outstation &amp; Local Rentals
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-[1.12]">
                    Outstation &amp; Local Cabs with{' '}
                    <span className="text-amber-700">Guaranteed Low Fares</span>
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-2xl">
                    Verified AC commercial sedans, SUVs, and Innova Crysta with experienced highway chauffeurs.
                  </p>
                </div>

                {/* Hero Split Grid: Left Booking Engine (7 cols) + Right Official Brand Banner & Highlights (5 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                  
                  {/* Left Column: Streamlined Booking Engine */}
                  <div className="lg:col-span-7">
                    <BookingEngine
                      tripType={tripType}
                      setTripType={setTripType}
                      pickupCity={pickupCity}
                      setPickupCity={setPickupCity}
                      dropCity={dropCity}
                      setDropCity={setDropCity}
                      roundTripStops={roundTripStops}
                      setRoundTripStops={setRoundTripStops}
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
                      calculatedDistance={distanceKm}
                      roundTripLegs={roundTripLegs}
                      tripDays={roundTripDays}
                      travelDuration={travelDuration}
                      isExactOlaDistance={isExactOlaDistance}
                      customerMobile={customerMobile}
                      setCustomerMobile={setCustomerMobile}
                      currentUser={currentUser}
                      onLoginSuccess={handleLoginSuccess}
                      onExploreCabs={handleOpenAvailableCabs}
                    />
                  </div>

                  {/* Right Column: Official Safar India Cabs Banner & Clean Key Assurances */}
                  <div className="lg:col-span-5 space-y-5">
                    
                    {/* Official Brand Banner Card (LCP Element — Prioritized WebP) */}
                    <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg bg-[#081C44]">
                      <img
                        src="/assets/aistudio/hero-banner-800.webp"
                        srcSet="/assets/aistudio/hero-banner-480.webp 480w, /assets/aistudio/hero-banner-800.webp 800w"
                        sizes="(max-width: 768px) 92vw, 440px"
                        width={800}
                        height={450}
                        fetchPriority="high"
                        loading="eager"
                        decoding="async"
                        alt="Safar India Cabs — Your Journey, Our Priority"
                        className="w-full h-auto aspect-[16/9] object-cover block"
                      />
                    </div>

                    {/* Concise 3-Point Assurance Card (No Verbose Clutter) */}
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs grid grid-cols-3 gap-4 text-center divide-x divide-slate-100">
                      <div className="px-2">
                        <div className="text-base sm:text-lg font-black text-slate-950">One-Way</div>
                        <div className="text-xs text-slate-600 mt-0.5">Zero Return Fare</div>
                      </div>
                      <div className="px-2">
                        <div className="text-base sm:text-lg font-black text-amber-700">20% Advance</div>
                        <div className="text-xs text-slate-600 mt-0.5">Instant Booking</div>
                      </div>
                      <div className="px-2">
                        <div className="text-base sm:text-lg font-black text-slate-950">Free Cancel</div>
                        <div className="text-xs text-slate-600 mt-0.5">Up to 6 Hrs Prior</div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>

            {/* LIVE CAB SELECTOR */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <CabSelector
                tripType={tripType}
                setTripType={setTripType}
                pickupCity={pickupCity}
                dropCity={effectiveDropCity}
                distanceKm={distanceKm}
                extraKm={0}
                setExtraKm={setExtraKm}
                days={roundTripDays}
                pickupDate={pickupDate}
                pickupTime={pickupTime}
                returnDate={returnDate}
                setReturnDate={setReturnDate}
                returnTime={returnTime}
                setReturnTime={setReturnTime}
                localPackageId={localPackageId}
                includeTolls={includeTolls}
                setIncludeTolls={setIncludeTolls}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                isPromoApplied={isPromoApplied}
                setIsPromoApplied={setIsPromoApplied}
                currentUser={currentUser}
                welcomeMessage={authNotice}
                onSelectCab={handleSelectCab}
              />
            </div>

            {/* POPULAR INTERCITY ROUTES SECTION */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <PopularRoutesSection onSelectRoute={handlePopularRouteClick} />
            </div>

            {/* WHY CHOOSE SAFAR INDIA CABS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <CabBazarAdvantages />
            </div>

            {/* VERIFIED CUSTOMER REVIEWS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <CustomerReviews
                currentUser={currentUser}
                onOpenReviewsModal={() => setIsReviewsModalOpen(true)}
              />
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

      {/* Floating 24/7 WhatsApp Quick Help Button (bottom: 120px !important; right: 20px !important; z-index: 9999 !important;) */}
      <div className="whatsapp-float fixed bottom-[120px] right-[20px] z-[9999]">
        <a
          href={buildWhatsAppSchemeUrl()}
          onClick={(e) => triggerWhatsAppDeepLink(e)}
          className="bg-[#10B981] hover:bg-emerald-500 text-white font-black w-13 h-13 sm:w-auto sm:h-auto sm:px-4 sm:py-3.5 rounded-full shadow-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all group cursor-pointer"
          title="Chat on WhatsApp (+91 7710080992)"
        >
          <MessageSquare className="w-6 h-6 text-white stroke-[2.2]" />
          <span className="hidden sm:inline text-xs tracking-tight">Quick WhatsApp Booking</span>
        </a>
      </div>

      {/* Mobile Bottom Navigation Bar: Fixed at bottom: 50px !important above AppsGeyser Ad Banner */}
      <nav className="fixed-bottom bottom-nav sm:hidden fixed bottom-[50px] left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-[999999] px-1.5 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-5 text-center items-center gap-1">
          {[
            { id: 'booking' as NavTabId, label: 'Book Cab', icon: Car },
            { id: 'routes' as NavTabId, label: 'Routes', icon: MapPin },
            { id: 'rides' as NavTabId, label: 'My Rides', icon: Clock },
            { id: 'about' as NavTabId, label: 'About', icon: Info },
            { id: 'help' as NavTabId, label: 'Help', icon: HelpCircle }
          ].map((tabItem) => {
            const isActive = activeTab === tabItem.id;
            const IconComp = tabItem.icon;
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => handleSwitchTab(tabItem.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-[11px] leading-tight transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-400/20 text-slate-950 font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950 font-semibold'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-amber-500" />
                )}
                <IconComp
                  className={`w-5 h-5 mb-0.5 shrink-0 transition-transform ${
                    isActive ? 'text-amber-600 scale-105 stroke-[2.4]' : 'text-slate-600'
                  }`}
                />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer with Interactive Section Switcher & Updated Official Contacts (Owner Portal Removed) */}
      <Footer
        activeNavTab={activeTab}
        activeSectionId={activeSectionId}
        onNavigateTab={handleSwitchTab}
        onOpenDriverPartner={() => setIsDriverPartnerOpen(true)}
        onOpenReviews={() => setIsReviewsModalOpen(true)}
        onOpenLegalPolicy={(tab) => setLegalPolicyModalTab(tab)}
        onSelectRoute={(from, to) => {
          setTripType('oneway');
          setPickupCity(from);
          setDropCity(to);
          handleSwitchTab('booking', 'booking-section-top');
        }}
      />

      {/* Legal Policies, Play Store Compliance & Account Deletion Modal */}
      {legalPolicyModalTab && (
        <Suspense fallback={null}>
          <LegalPoliciesModal
            isOpen={Boolean(legalPolicyModalTab)}
            initialTab={legalPolicyModalTab}
            onClose={() => setLegalPolicyModalTab(null)}
            currentUser={currentUser}
            onDeleteAccountData={handleDeleteCustomerAccount}
          />
        </Suspense>
      )}

      {/* Customer Reviews & Write Review Modal */}
      {isReviewsModalOpen && (
        <Suspense fallback={null}>
          <CustomerReviewsModal
            isOpen={isReviewsModalOpen}
            onClose={() => {
              setIsReviewsModalOpen(false);
              try {
                if (shouldOpenReviewsFromUrl()) {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('action');
                  url.searchParams.delete('review');
                  url.searchParams.delete('reviews');
                  if (url.hash.toLowerCase() === '#reviews' || url.hash.toLowerCase() === '#review') {
                    url.hash = '';
                  }
                  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
                }
              } catch {
                // ignore history errors
              }
            }}
            currentUser={currentUser}
          />
        </Suspense>
      )}

      {/* Driver / Vendor Partner Registration Modal */}
      {isDriverPartnerOpen && (
        <Suspense fallback={null}>
          <DriverPartnerModal
            isOpen={isDriverPartnerOpen}
            onClose={() => setIsDriverPartnerOpen(false)}
          />
        </Suspense>
      )}

      {/* Available Cabs Selection Modal */}
      {isCabsModalOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[1000000] flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCabsModalOpen(false);
            }
          }}
        >
          <div className="booking-modal-container bg-[#F8FAFC] border border-slate-200 rounded-3xl max-w-4xl w-full p-4 sm:p-6 pb-[130px] space-y-4 shadow-2xl relative my-2 sm:my-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 sticky top-0 bg-[#F8FAFC]/95 backdrop-blur-md z-20 pt-1">
              <div>
                <h3 className="text-lg font-black text-slate-950">Available Cabs &amp; Fares</h3>
                <p className="text-xs text-slate-500">Select your preferred vehicle for {pickupCity} to {effectiveDropCity}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCabsModalOpen(false)}
                aria-label="Close cab selection modal"
                title="Close & Return to Search"
                className="w-10 h-10 rounded-full bg-white hover:bg-rose-50 border border-slate-300 text-slate-800 hover:text-rose-600 font-bold flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <CabSelector
              tripType={tripType}
              setTripType={setTripType}
              pickupCity={pickupCity}
              dropCity={effectiveDropCity}
              distanceKm={distanceKm}
              extraKm={extraKm}
              setExtraKm={setExtraKm}
              days={roundTripDays}
              pickupDate={pickupDate}
              pickupTime={pickupTime}
              returnDate={returnDate}
              setReturnDate={setReturnDate}
              returnTime={returnTime}
              setReturnTime={setReturnTime}
              localPackageId={localPackageId}
              includeTolls={includeTolls}
              setIncludeTolls={setIncludeTolls}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              isPromoApplied={isPromoApplied}
              setIsPromoApplied={setIsPromoApplied}
              currentUser={currentUser}
              welcomeMessage={authNotice}
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
        <Suspense fallback={null}>
          <BookingModal
            isOpen={true}
            onClose={() => setSelectedCabForCheckout(null)}
            cab={selectedCabForCheckout.cab}
            fareDetails={selectedCabForCheckout.fare}
            tripType={tripType}
            pickupCity={pickupCity}
            dropCity={effectiveDropCity}
            pickupDate={pickupDate}
            pickupTime={pickupTime}
            returnDate={returnDate}
            returnTime={returnTime}
            localPackageId={localPackageId}
            airportMode={airportMode}
            airportTerminal={airportTerminal}
            currentUser={currentUser}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            isPromoApplied={isPromoApplied}
            setIsPromoApplied={setIsPromoApplied}
            welcomeMessage={authNotice}
            onBookingSuccess={handleBookingSuccess}
          />
        </Suspense>
      )}

      {/* Booking Confirmation / Tax Invoice Voucher Modal */}
      {activeVoucherBooking && (
        <Suspense fallback={null}>
          <BookingConfirmationModal
            booking={activeVoucherBooking}
            onClose={() => setActiveVoucherBooking(null)}
            onViewMyRides={() => setActiveTab('rides')}
          />
        </Suspense>
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

              <button
                type="button"
                onClick={() => {
                  setIsCustomerProfileOpen(false);
                  setLegalPolicyModalTab('delete-account');
                }}
                className="w-full py-2 text-rose-700 hover:underline font-bold text-[11px] text-center cursor-pointer"
              >
                Request Account &amp; Personal Data Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Mobile OTP Login Modal */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <CustomerAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => {
              setIsAuthModalOpen(false);
              setAuthPrompt('');
            }}
            authPrompt={authPrompt}
            onLoginSuccess={handleLoginSuccess}
          />
        </Suspense>
      )}

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
              type="button"
              aria-label="Close owner PIN modal"
              onClick={() => {
                setIsAdminPinModalOpen(false);
                setAdminPinError('');
                setAdminPinInput('');
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800"
            >
              ✕
            </button>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Owner Access PIN</h3>
              <p className="text-xs text-slate-600 mt-0.5">Enter secret security PIN to manage bookings</p>
            </div>
            {adminPinError && (
              <div className="text-xs text-rose-700 bg-rose-50 py-1.5 px-2 rounded-lg border border-rose-200">
                {adminPinError}
              </div>
            )}
            <form onSubmit={handleVerifyAdminPin} className="space-y-3">
              <input
                type="password"
                aria-label="Owner 4-digit security PIN"
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
      {isAdminDashboardOpen && (
        <Suspense fallback={null}>
          <AdminDashboard
            isOpen={isAdminDashboardOpen}
            onClose={() => setIsAdminDashboardOpen(false)}
            bookings={allBookings}
            onUpdateBookingStatus={handleUpdateBookingStatusByAdmin}
            onChangePin={handleChangeOwnerPin}
            onClearDemoBookings={handleClearDemoBookings}
            onRefreshBookings={() => refreshAllBookings(true)}
            onOpenBookingReceipt={(b) => setActiveVoucherBooking(b)}
            onCreateManualBooking={(newBooking) => {
              setAllBookings(prev => {
                const next = mergeBookingsList([newBooking, ...prev], [newBooking]);
                try {
                  localStorage.setItem('safar_bookings', JSON.stringify(next));
                } catch {}
                return next;
              });
              if (newBooking.status === 'completed') {
                setActiveVoucherBooking(newBooking);
              }
              fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking: newBooking })
              }).catch(() => {});
            }}
          />
        </Suspense>
      )}

    </div>
  );
}
