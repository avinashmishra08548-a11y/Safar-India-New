import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRightLeft,
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Plane,
  Car,
  ChevronDown,
  Loader2,
  X,
  Building2,
  Train,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Mountain,
  Plus,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { TripType, CustomerUser } from '../types';
import { searchOlaPlaces, OlaPlacePrediction, Coordinates } from '../utils/olaMapsService';
import {
  requestServerOtp,
  verifyServerOtp,
  retriggerWhatsAppOtpFromToken,
  sanitize10DigitPhone
} from '../utils/smsService';
import { triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { computeTripFare } from '../utils/fareCalculator';

const TIME_SLOTS = [
  '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM',
  '11:00 PM', '11:30 PM'
];

const LOCAL_RENTAL_PACKAGES = [
  { id: '4h_40k', label: '4 Hours / 40 KM', sub: 'Half-Day City Package' },
  { id: '8h_80k', label: '8 Hours / 80 KM', sub: 'Full-Day City Sightseeing' },
  { id: '12h_120k', label: '12 Hours / 120 KM', sub: 'Extended City & NCR Package' }
];

const MAJOR_AIRPORTS = [
  { code: 'DEL', name: 'IGI Airport New Delhi (T1 / T2 / T3)', city: 'Delhi NCR' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Int. Airport (T1 / T2), Mumbai', city: 'Mumbai' },
  { code: 'BLR', name: 'Kempegowda Int. Airport, Bengaluru', city: 'Bangalore (Bengaluru)' },
  { code: 'DED', name: 'Jolly Grant Airport, Dehradun', city: 'Dehradun' },
  { code: 'IXC', name: 'Shaheed Bhagat Singh Airport, Chandigarh', city: 'Chandigarh' },
  { code: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur' },
  { code: 'LKO', name: 'Chaudhary Charan Singh Airport, Lucknow', city: 'Lucknow' },
  { code: 'VNS', name: 'Lal Bahadur Shastri Airport, Varanasi', city: 'Varanasi' },
  { code: 'AYJ', name: 'Maharishi Valmiki Int. Airport, Ayodhya', city: 'Ayodhya' },
  { code: 'HYD', name: 'Rajiv Gandhi Int. Airport, Hyderabad', city: 'Hyderabad' },
  { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai' },
  { code: 'CCU', name: 'Netaji Subhash Chandra Bose Airport, Kolkata', city: 'Kolkata' },
  { code: 'AMD', name: 'Sardar Vallabhbhai Patel Airport, Ahmedabad', city: 'Ahmedabad' },
  { code: 'PNQ', name: 'Pune International Airport', city: 'Pune' },
  { code: 'GOI', name: 'Goa Airport (Dabolim / Mopa)', city: 'Goa (North & South)' }
];

const QUICK_ROUNDTRIP_STOPS = [
  'Mathura, Uttar Pradesh',
  'Vrindavan, Uttar Pradesh',
  'Agra, Uttar Pradesh',
  'Jaipur, Rajasthan',
  'Haridwar, Uttarakhand',
  'Rishikesh, Uttarakhand',
  'Mussoorie, Uttarakhand',
  'Shimla, Himachal Pradesh',
  'Manali, Himachal Pradesh',
  'Nainital, Uttarakhand',
  'Ayodhya, Uttar Pradesh',
  'Varanasi, Uttar Pradesh'
];

interface BookingEngineProps {
  tripType: TripType;
  setTripType: (t: TripType) => void;
  pickupCity: string;
  setPickupCity: (c: string) => void;
  dropCity: string;
  setDropCity: (c: string) => void;
  roundTripStops?: string[];
  setRoundTripStops?: React.Dispatch<React.SetStateAction<string[]>>;
  pickupCoords?: Coordinates | null;
  setPickupCoords?: (c: Coordinates | null) => void;
  dropCoords?: Coordinates | null;
  setDropCoords?: (c: Coordinates | null) => void;
  pickupDate: string;
  setPickupDate: (d: string) => void;
  pickupTime: string;
  setPickupTime: (t: string) => void;
  returnDate: string;
  setReturnDate: (d: string) => void;
  returnTime: string;
  setReturnTime: (t: string) => void;
  localPackageId: string;
  setLocalPackageId: (p: string) => void;
  airportMode: 'pickup' | 'drop';
  setAirportMode: (m: 'pickup' | 'drop') => void;
  airportTerminal: string;
  setAirportTerminal: (t: string) => void;
  calculatedDistance: number;
  roundTripLegs?: Array<{ from: string; to: string; distanceKm: number }>;
  tripDays: number;
  isExactOlaDistance?: boolean;
  travelDuration?: string;
  customerMobile?: string;
  setCustomerMobile?: (m: string) => void;
  currentUser?: CustomerUser | null;
  onLoginSuccess?: (user: CustomerUser) => void;
  onExploreCabs: () => void;
}

function getPlaceIcon(types?: string[], category?: string) {
  const combined = [...(types || []), category || ''].join(' ').toLowerCase();
  if (combined.includes('airport')) return <Plane className="w-4 h-4 text-sky-600 shrink-0" />;
  if (combined.includes('train') || combined.includes('transit') || combined.includes('railway')) {
    return <Train className="w-4 h-4 text-emerald-600 shrink-0" />;
  }
  if (combined.includes('hotel') || combined.includes('lodging') || combined.includes('premise')) {
    return <Building2 className="w-4 h-4 text-purple-600 shrink-0" />;
  }
  return <MapPin className="w-4 h-4 text-amber-600 shrink-0" />;
}

export const BookingEngine: React.FC<BookingEngineProps> = ({
  tripType,
  setTripType,
  pickupCity,
  setPickupCity,
  dropCity,
  setDropCity,
  roundTripStops = [],
  setRoundTripStops,
  pickupCoords,
  setPickupCoords,
  dropCoords,
  setDropCoords,
  pickupDate,
  setPickupDate,
  pickupTime,
  setPickupTime,
  returnDate,
  setReturnDate,
  localPackageId,
  setLocalPackageId,
  airportMode,
  setAirportMode,
  airportTerminal,
  setAirportTerminal,
  calculatedDistance,
  roundTripLegs = [],
  tripDays,
  travelDuration,
  customerMobile = '',
  setCustomerMobile,
  currentUser,
  onLoginSuccess,
  onExploreCabs
}) => {
  const [activeMainCategory, setActiveMainCategory] = useState<'outstation' | 'local' | 'airport'>(
    tripType === 'local' ? 'local' : tripType === 'airport' ? 'airport' : 'outstation'
  );

  const [pickupPredictions, setPickupPredictions] = useState<OlaPlacePrediction[]>([]);
  const [dropPredictions, setDropPredictions] = useState<OlaPlacePrediction[]>([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropDropdown, setShowDropDropdown] = useState(false);
  const [isLoadingPickup, setIsLoadingPickup] = useState(false);
  const [isLoadingDrop, setIsLoadingDrop] = useState(false);

  // Autocomplete states for multi-city round trip stops
  const [activeStopDropdownIndex, setActiveStopDropdownIndex] = useState<number | null>(null);
  const [stopPredictions, setStopPredictions] = useState<OlaPlacePrediction[]>([]);
  const [isLoadingStop, setIsLoadingStop] = useState(false);

  // Secure WhatsApp OTP verification states
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(() => Boolean(currentUser));
  const [showInlineOtpBox, setShowInlineOtpBox] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const prewarmedPhoneRef = useRef<string>('');
  const inlineOtpInputRef = useRef<HTMLInputElement>(null);

  const pickupRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const stopsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser?.phone) {
      setIsPhoneVerified(true);
      setShowInlineOtpBox(false);
      if (setCustomerMobile && !customerMobile) {
        setCustomerMobile(currentUser.phone);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Pre-queue live OTP on the server as soon as 10 digits are entered so "Click Here to Get OTP" works instantaneously
  useEffect(() => {
    const clean = sanitize10DigitPhone(customerMobile);
    if (clean.length === 10 && !isPhoneVerified && prewarmedPhoneRef.current !== clean) {
      prewarmedPhoneRef.current = clean;
      requestServerOtp(clean)
        .then((res) => {
          if (res.success && res.token) {
            setOtpToken(res.token);
          }
        })
        .catch(() => {});
    }
  }, [customerMobile, isPhoneVerified]);

  // Automatically flush pending WhatsApp OTP while waiting for OTP & when customer returns from WhatsApp app
  useEffect(() => {
    const cleanPhone = sanitize10DigitPhone(customerMobile);
    if ((!showOtpModal && !showInlineOtpBox) || cleanPhone.length !== 10) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {});
      }
    };

    const t1 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 2500);
    const t2 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 6000);
    const t3 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 10000);
    const t4 = setTimeout(() => retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {}), 15000);

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [showOtpModal, showInlineOtpBox, customerMobile, otpToken]);

  const handleSelectCategory = (cat: 'outstation' | 'local' | 'airport') => {
    setActiveMainCategory(cat);
    if (cat === 'outstation') {
      if (tripType !== 'oneway' && tripType !== 'roundtrip') {
        setTripType('oneway');
      }
    } else if (cat === 'local') {
      setTripType('local');
    } else if (cat === 'airport') {
      setTripType('airport');
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickupRef.current && !pickupRef.current.contains(e.target as Node)) {
        setShowPickupDropdown(false);
      }
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDropDropdown(false);
      }
      if (stopsContainerRef.current && !stopsContainerRef.current.contains(e.target as Node)) {
        setActiveStopDropdownIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (showPickupDropdown) {
        setIsLoadingPickup(true);
        try {
          const results = await searchOlaPlaces(pickupCity);
          if (active) {
            setPickupPredictions(Array.isArray(results) ? results : []);
          }
        } catch {
          if (active) setPickupPredictions([]);
        } finally {
          if (active) setIsLoadingPickup(false);
        }
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pickupCity, showPickupDropdown]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (showDropDropdown) {
        setIsLoadingDrop(true);
        try {
          const results = await searchOlaPlaces(dropCity);
          if (active) {
            setDropPredictions(Array.isArray(results) ? results : []);
          }
        } catch {
          if (active) setDropPredictions([]);
        } finally {
          if (active) setIsLoadingDrop(false);
        }
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dropCity, showDropDropdown]);

  // Search Ola Places for active round-trip stop input
  const currentActiveStopQuery =
    activeStopDropdownIndex !== null && roundTripStops[activeStopDropdownIndex] !== undefined
      ? roundTripStops[activeStopDropdownIndex]
      : '';

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (activeStopDropdownIndex !== null) {
        setIsLoadingStop(true);
        try {
          const results = await searchOlaPlaces(currentActiveStopQuery);
          if (active) {
            setStopPredictions(Array.isArray(results) ? results : []);
          }
        } catch {
          if (active) setStopPredictions([]);
        } finally {
          if (active) setIsLoadingStop(false);
        }
      }
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentActiveStopQuery, activeStopDropdownIndex]);

  const handleSelectPickup = (item: OlaPlacePrediction) => {
    setPickupCity(item.description);
    if (setPickupCoords) {
      if (item.lat && item.lng) {
        setPickupCoords({ lat: item.lat, lng: item.lng });
      } else {
        setPickupCoords(null);
      }
    }
    setShowPickupDropdown(false);
  };

  const handleSelectDrop = (item: OlaPlacePrediction) => {
    setDropCity(item.description);
    if (setDropCoords) {
      if (item.lat && item.lng) {
        setDropCoords({ lat: item.lat, lng: item.lng });
      } else {
        setDropCoords(null);
      }
    }
    setShowDropDropdown(false);
  };

  const handleAddRoundTripStop = () => {
    if (!setRoundTripStops) return;
    if (roundTripStops.length >= 6) return;
    const nextIdx = roundTripStops.length;
    setRoundTripStops((prev) => [...prev, '']);
    setTimeout(() => {
      setActiveStopDropdownIndex(nextIdx);
    }, 50);
  };

  const handleQuickAddStopCity = (cityStr: string) => {
    if (!setRoundTripStops) return;
    // If there is an empty stop slot, fill it; otherwise append a new stop
    const emptyIdx = roundTripStops.findIndex((s) => !s.trim());
    if (emptyIdx !== -1) {
      setRoundTripStops((prev) => prev.map((s, i) => (i === emptyIdx ? cityStr : s)));
      setActiveStopDropdownIndex(null);
    } else if (roundTripStops.length < 6) {
      setRoundTripStops((prev) => [...prev, cityStr]);
      setActiveStopDropdownIndex(null);
    }
  };

  const handleUpdateRoundTripStop = (index: number, value: string) => {
    if (!setRoundTripStops) return;
    setRoundTripStops((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const handleRemoveRoundTripStop = (index: number) => {
    if (!setRoundTripStops) return;
    setRoundTripStops((prev) => prev.filter((_, i) => i !== index));
    if (activeStopDropdownIndex === index) {
      setActiveStopDropdownIndex(null);
    }
  };

  const handleSwapCities = () => {
    if (tripType === 'local') return;
    const tempName = pickupCity;
    const tempCoords = pickupCoords;
    setPickupCity(dropCity);
    setDropCity(tempName);
    if (setPickupCoords && setDropCoords) {
      setPickupCoords(dropCoords || null);
      setDropCoords(tempCoords || null);
    }
  };

  const handleSendOtp = async () => {
    const cleanNumber = sanitize10DigitPhone(customerMobile);
    if (cleanNumber.length !== 10) {
      setOtpError('Please enter a valid 10-digit WhatsApp mobile number');
      return;
    }

    setShowInlineOtpBox(true);
    setShowOtpModal(true);
    setIsSendingOtp(true);
    setOtpError('');
    setOtpNotice(`Live OTP sent to your WhatsApp (+91 ${cleanNumber}). Enter 4-digit OTP below.`);

    try {
      const res = await requestServerOtp(cleanNumber);
      setIsSendingOtp(false);

      if (res.success && res.token) {
        setOtpToken(res.token);
        setCountdown(25);
      } else {
        setOtpError(res.message || 'Unable to send OTP right now. Please tap Click Here to Get OTP.');
      }
    } catch {
      setIsSendingOtp(false);
    }
  };

  // Direct "Click Here to Get OTP" handler right below the number box
  const handleClickHereToGetOtp = async () => {
    const cleanNumber = sanitize10DigitPhone(customerMobile);
    if (cleanNumber.length !== 10) {
      setOtpError('Please enter your 10-digit WhatsApp mobile number first');
      const mobileEl = document.getElementById('booking-mobile-input');
      if (mobileEl) mobileEl.focus();
      return;
    }

    // Immediately show inline OTP Input & Submit button so customer can enter OTP right away
    setOtpError('');
    setShowInlineOtpBox(true);
    setCountdown(25);
    setOtpNotice(`Live OTP sent to your WhatsApp (+91 ${cleanNumber}). Enter 4-digit OTP & click Submit.`);
    setTimeout(() => inlineOtpInputRef.current?.focus(), 100);

    // Safely open WhatsApp link without crashing or navigating current page away
    triggerWhatsAppDeepLink(
      '919142526791',
      `Hi Safar India Cabs, please send my Login OTP for +91 ${cleanNumber}`
    );

    setIsSendingOtp(true);
    try {
      if (!otpToken || prewarmedPhoneRef.current !== cleanNumber) {
        const res = await requestServerOtp(cleanNumber);
        if (res.success && res.token) {
          setOtpToken(res.token);
        }
      } else {
        retriggerWhatsAppOtpFromToken(cleanNumber, otpToken).catch(() => {});
      }
    } catch {}
    setIsSendingOtp(false);
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = otpInput.trim();
    if (entered.length !== 4) {
      setOtpError('Please enter the 4-digit OTP received on your WhatsApp');
      return;
    }

    const cleanNumber = sanitize10DigitPhone(customerMobile);
    setIsVerifyingOtp(true);
    setOtpError('');
    const verifyRes = await verifyServerOtp(cleanNumber, entered, otpToken);
    setIsVerifyingOtp(false);

    if (verifyRes.success) {
      setIsPhoneVerified(true);
      setShowInlineOtpBox(false);
      setShowOtpModal(false);
      setOtpError('');

      const loggedInCustomer: CustomerUser = {
        id: `CUST-${cleanNumber}`,
        name: currentUser?.name || `Traveler (${cleanNumber.slice(-4)})`,
        phone: cleanNumber,
        createdAt: new Date().toISOString()
      };

      try {
        const raw = localStorage.getItem('safar_registered_customers');
        const list: CustomerUser[] = raw ? JSON.parse(raw) : [];
        if (!list.some((u) => sanitize10DigitPhone(u.phone) === cleanNumber)) {
          list.unshift(loggedInCustomer);
          localStorage.setItem('safar_registered_customers', JSON.stringify(list));
        }
      } catch {}

      if (onLoginSuccess) {
        onLoginSuccess(loggedInCustomer);
      }
    } else {
      setOtpError(
        verifyRes.message ||
          verifyRes.error ||
          `Incorrect OTP. Please check your WhatsApp (+91 ${cleanNumber}) and try again.`
      );
    }
  };

  const handleExploreSubmit = () => {
    const cleanNumber = sanitize10DigitPhone(customerMobile);
    if (cleanNumber.length === 10 && !isPhoneVerified) {
      handleSendOtp();
      return;
    }
    onExploreCabs();
  };

  const today = new Date().toISOString().split('T')[0];

  // Combine dropCity + any roundTripStops so Hill Area detection and Extra KM rate reflect all stops
  const validStops = roundTripStops.map((s) => (s || '').trim()).filter(Boolean);
  const combinedDropRoute =
    tripType === 'roundtrip' && validStops.length > 0
      ? [dropCity, ...validStops].join(' → ')
      : dropCity;

  // Dynamic route preview fare to show Extra KM rate right next to Total KM
  const routePreviewFare = computeTripFare({
    tripType,
    cabId: 'sedan',
    distanceKm: calculatedDistance,
    extraKm: 0,
    pickupCity,
    dropCity: combinedDropRoute,
    pickupDate,
    pickupTime,
    returnDate: tripType === 'roundtrip' ? returnDate : undefined,
    localPackageId,
    includeTolls: true
  });

  const renderAutocompleteDropdown = (
    predictions: OlaPlacePrediction[],
    isLoading: boolean,
    onSelect: (item: OlaPlacePrediction) => void,
    currentQuery: string
  ) => {
    const safePredictions = Array.isArray(predictions) ? predictions : [];
    const safeQuery = (currentQuery || '').trim();

    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
        <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>
            {safeQuery.length >= 2 ? 'Matching Indian Cities & Locations' : 'Popular Indian Cities & Tourist Spots'}
          </span>
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
        </div>

        {safePredictions.length === 0 && !isLoading ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No matching location found. You can type your exact city or address.
          </div>
        ) : (
          safePredictions.map((item, index) => {
            if (!item) return null;
            const mainLabel =
              item.mainText ||
              item.structured_formatting?.main_text ||
              item.description ||
              'Location';
            const subLabel =
              item.secondaryText ||
              item.structured_formatting?.secondary_text ||
              'India';
            const itemKey = item.placeId || item.place_id || `${item.description || mainLabel}-${index}`;

            return (
              <button
                key={itemKey}
                type="button"
                onMouseDown={(e) => {
                  // Prevent input blur before selection completes
                  e.preventDefault();
                  onSelect(item);
                }}
                className="w-full text-left px-4 py-3 hover:bg-amber-50/70 transition flex items-start gap-3 cursor-pointer"
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100">
                  {getPlaceIcon(item.types, item.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {mainLabel}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {subLabel}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] border border-slate-200/90 p-5 sm:p-8 relative z-20">
      
      {/* Primary Category Tabs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-100 p-1.5 rounded-2xl mb-5">
        <button
          type="button"
          onClick={() => handleSelectCategory('outstation')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeMainCategory === 'outstation'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Navigation className="w-4 h-4 shrink-0" />
          <span>Outstation</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectCategory('local')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeMainCategory === 'local'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-4 h-4 shrink-0" />
          <span>Local Rental</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectCategory('airport')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeMainCategory === 'airport'
              ? 'bg-slate-900 text-amber-400 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plane className="w-4 h-4 shrink-0" />
          <span>Airport</span>
        </button>
      </div>

      {/* Sub-selection for Outstation (One-Way vs Round Trip) */}
      {activeMainCategory === 'outstation' && (
        <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTripType('oneway')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer border ${
                tripType === 'oneway'
                  ? 'bg-amber-50 text-amber-900 border-amber-400'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${tripType === 'oneway' ? 'bg-amber-500' : 'bg-slate-300'}`} />
              One Way
            </button>

            <button
              type="button"
              onClick={() => setTripType('roundtrip')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer border ${
                tripType === 'roundtrip'
                  ? 'bg-amber-50 text-amber-900 border-amber-400'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${tripType === 'roundtrip' ? 'bg-amber-500' : 'bg-slate-300'}`} />
              Round Trip (Multi-City)
            </button>
          </div>

          {tripType === 'roundtrip' && (
            <button
              type="button"
              onClick={handleAddRoundTripStop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-700" />
              Add City / Stop
            </button>
          )}
        </div>
      )}

      {/* Sub-selection for Airport */}
      {activeMainCategory === 'airport' && (
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setAirportMode('pickup')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer border ${
              airportMode === 'pickup'
                ? 'bg-amber-50 text-amber-900 border-amber-400'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Pickup from Airport
          </button>
          <button
            type="button"
            onClick={() => setAirportMode('drop')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer border ${
              airportMode === 'drop'
                ? 'bg-amber-50 text-amber-900 border-amber-400'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Drop to Airport
          </button>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        
        {/* Row 1: From & To Locations */}
        <div className="grid grid-cols-1 sm:grid-cols-11 gap-3 items-center">
          
          {/* FROM / PICKUP */}
          <div
            ref={pickupRef}
            className={`${tripType === 'local' ? 'sm:col-span-6' : 'sm:col-span-5'} relative`}
          >
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {tripType === 'airport' && airportMode === 'pickup' ? 'Airport Terminal' : 'From (Pickup City)'}
            </label>

            {tripType === 'airport' && airportMode === 'pickup' ? (
              <div className="relative">
                <select
                  value={airportTerminal}
                  onChange={(e) => {
                    setAirportTerminal(e.target.value);
                    const found = MAJOR_AIRPORTS.find((a) => a.name === e.target.value);
                    if (found) setPickupCity(found.city);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white appearance-none"
                >
                  {MAJOR_AIRPORTS.map((air) => (
                    <option key={air.code} value={air.name}>
                      {air.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div className="relative">
                <MapPin className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pickupCity}
                  onFocus={() => setShowPickupDropdown(true)}
                  onChange={(e) => {
                    setPickupCity(e.target.value);
                    if (setPickupCoords) setPickupCoords(null);
                    setShowPickupDropdown(true);
                  }}
                  placeholder="Enter pickup city or location"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-8 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
                {pickupCity && (
                  <button
                    type="button"
                    onClick={() => {
                      setPickupCity('');
                      if (setPickupCoords) setPickupCoords(null);
                      setShowPickupDropdown(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {showPickupDropdown && !(tripType === 'airport' && airportMode === 'pickup') &&
              renderAutocompleteDropdown(pickupPredictions, isLoadingPickup, handleSelectPickup, pickupCity)}
          </div>

          {/* Swap Button */}
          {tripType !== 'local' && (
            <div className="sm:col-span-1 flex justify-center sm:pt-5">
              <button
                type="button"
                onClick={handleSwapCities}
                title="Swap Pickup & Destination"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-amber-400 text-slate-600 hover:text-slate-950 border border-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TO / DESTINATION OR LOCAL PACKAGE */}
          {tripType === 'local' ? (
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Rental Package
              </label>
              <div className="relative">
                <select
                  value={localPackageId}
                  onChange={(e) => setLocalPackageId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white appearance-none"
                >
                  {LOCAL_RENTAL_PACKAGES.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.label} — {pkg.sub}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div ref={dropRef} className="sm:col-span-5 relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {tripType === 'airport' && airportMode === 'drop'
                  ? 'Destination Airport'
                  : tripType === 'roundtrip' && roundTripStops.length > 0
                  ? 'Stop 1 (First Destination City)'
                  : 'To (Destination City)'}
              </label>

              {tripType === 'airport' && airportMode === 'drop' ? (
                <div className="relative">
                  <select
                    value={airportTerminal}
                    onChange={(e) => {
                      setAirportTerminal(e.target.value);
                      const found = MAJOR_AIRPORTS.find((a) => a.name === e.target.value);
                      if (found) setDropCity(found.city);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3.5 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white appearance-none"
                  >
                    {MAJOR_AIRPORTS.map((air) => (
                      <option key={air.code} value={air.name}>
                        {air.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <div className="relative">
                  <MapPin className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={dropCity}
                    onFocus={() => setShowDropDropdown(true)}
                    onChange={(e) => {
                      setDropCity(e.target.value);
                      if (setDropCoords) setDropCoords(null);
                      setShowDropDropdown(true);
                    }}
                    placeholder="Enter destination city or location"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-8 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                  {dropCity && (
                    <button
                      type="button"
                      onClick={() => {
                        setDropCity('');
                        if (setDropCoords) setDropCoords(null);
                        setShowDropDropdown(true);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {showDropDropdown && !(tripType === 'airport' && airportMode === 'drop') &&
                renderAutocompleteDropdown(dropPredictions, isLoadingDrop, handleSelectDrop, dropCity)}
            </div>
          )}
        </div>

        {/* MULTI-CITY / EXTRA STOPS BUILDER FOR ROUND TRIP */}
        {tripType === 'roundtrip' && (
          <div ref={stopsContainerRef} className="space-y-3 pt-1">
            {roundTripStops.map((stopValue, idx) => (
              <div key={idx} className="relative flex items-center gap-2">
                <div className="flex-1 relative">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                    Stop {idx + 2} (Additional City / Sightseeing Location)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={stopValue || ''}
                      onFocus={() => setActiveStopDropdownIndex(idx)}
                      onChange={(e) => {
                        handleUpdateRoundTripStop(idx, e.target.value);
                        setActiveStopDropdownIndex(idx);
                      }}
                      placeholder={`Type city or tourist spot #${idx + 2} (e.g. Mathura, Jaipur, Manali)`}
                      className="w-full bg-amber-50/40 border border-amber-300 hover:border-amber-400 rounded-xl pl-10 pr-8 py-2.5 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition"
                    />
                    {stopValue && (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateRoundTripStop(idx, '');
                          setActiveStopDropdownIndex(idx);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {activeStopDropdownIndex === idx &&
                    renderAutocompleteDropdown(
                      stopPredictions,
                      isLoadingStop,
                      (item) => {
                        handleUpdateRoundTripStop(idx, item.description);
                        setActiveStopDropdownIndex(null);
                      },
                      stopValue || ''
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveRoundTripStop(idx)}
                  title="Remove this stop"
                  className="mt-5 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {roundTripStops.length < 6 && (
              <div className="bg-slate-50/90 border border-dashed border-slate-300 rounded-2xl p-3 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-slate-700 font-semibold">
                    Going to multiple cities or places on your Round Trip?
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRoundTripStop}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Another City / Location
                  </button>
                </div>

                {/* Quick 1-Tap Popular Stop Chips */}
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                    Quick Add Stop:
                  </span>
                  {QUICK_ROUNDTRIP_STOPS.map((cityStr) => {
                    const shortName = cityStr.split(',')[0];
                    const alreadyAdded = roundTripStops.some((s) =>
                      (s || '').toLowerCase().includes(shortName.toLowerCase())
                    );
                    if (alreadyAdded) return null;
                    return (
                      <button
                        key={cityStr}
                        type="button"
                        onClick={() => handleQuickAddStopCity(cityStr)}
                        className="text-[11px] font-semibold bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        + {shortName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live Round Trip Route & Per-Leg Kilometer Breakdown */}
            {roundTripLegs.length > 0 && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 text-slate-700 font-semibold">
                  <span className="text-emerald-800 font-extrabold">Round Trip Route KM:</span>
                  {roundTripLegs.map((leg, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-emerald-200/80 text-[11px]">
                      <span>{leg.from} → {leg.to}</span>
                      <strong className="text-emerald-700 font-mono">({leg.distanceKm} KM)</strong>
                    </span>
                  ))}
                </div>
                <span className="font-mono font-extrabold text-emerald-900 bg-emerald-200/70 px-2.5 py-1 rounded-lg shrink-0">
                  Total: {routePreviewFare.billedDistanceKm} KM
                </span>
              </div>
            )}
          </div>
        )}

        {/* Row 2: Dates, Times & Mobile Number */}
        <div
          className={`grid grid-cols-1 ${
            tripType === 'roundtrip' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
          } gap-3 pt-1 items-start`}
        >
          {/* Pickup Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Pickup Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                min={today}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-3 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Return Date (only for Round Trip) */}
          {tripType === 'roundtrip' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Return Date ({tripDays} {tripDays === 1 ? 'Day' : 'Days'})
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  min={pickupDate || today}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-3 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Pickup Time */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Pickup Time
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-10 pr-8 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white appearance-none"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Customer WhatsApp Number */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Mobile Number (WhatsApp)
            </label>
            <div className="relative flex items-center">
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <span className="absolute left-9 text-xs font-bold text-slate-400 pointer-events-none">
                +91
              </span>
              <input
                id="booking-mobile-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={customerMobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  if (setCustomerMobile) setCustomerMobile(val);
                  if (currentUser?.phone !== val) {
                    setIsPhoneVerified(false);
                  }
                  setOtpError('');
                }}
                placeholder="10-digit number"
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-16 pr-20 py-3 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500 focus:bg-white"
              />
              {customerMobile.length === 10 && (
                <div className="absolute right-1.5">
                  {isPhoneVerified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClickHereToGetOtp}
                      disabled={isSendingOtp}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      {isSendingOtp ? '...' : 'Get OTP'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* PROMINENT "CLICK HERE TO GET OTP" BUTTON RIGHT BELOW MOBILE NUMBER */}
            {!isPhoneVerified && (
              <button
                type="button"
                onClick={handleClickHereToGetOtp}
                disabled={isSendingOtp}
                className="mt-2 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 transition cursor-pointer group"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-800">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Click Here to Get OTP</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-emerald-600 group-hover:bg-emerald-700 px-2 py-0.5 rounded-md">
                  Receive OTP <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </button>
            )}
          </div>
        </div>

        {/* INLINE 4-DIGIT OTP INPUT & SUBMIT BOX RIGHT BELOW MOBILE NUMBER */}
        {!isPhoneVerified && (showInlineOtpBox || customerMobile.replace(/\D/g, '').length === 10) && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Enter 4-Digit WhatsApp OTP to Verify (+91 {customerMobile})</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {otpNotice || 'Click "Click Here to Get OTP" above, then enter the 4-digit OTP below and click Submit OTP.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={inlineOtpInputRef}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setOtpError('');
                }}
                placeholder="4-Digit OTP"
                className="w-32 bg-white border-2 border-emerald-400 rounded-xl px-3 py-2 text-center text-sm tracking-[0.25em] font-mono font-extrabold text-slate-900 focus:outline-none focus:border-emerald-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-400"
              />
              <button
                type="button"
                disabled={isVerifyingOtp}
                onClick={() => handleVerifyOtp()}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-amber-400 font-extrabold text-xs transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submit OTP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {otpError && !showOtpModal && (
          <div className="text-xs text-rose-600 font-semibold px-1">{otpError}</div>
        )}

        {/* Bottom Bar: Clean Route Distance + Dynamic Extra KM Rate & Primary CTA */}
        <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-slate-600">
            <span className="font-bold text-slate-900">
              Total Distance: {routePreviewFare.billedDistanceKm} KM
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
              Extra KM: ₹{routePreviewFare.extraKmRate}/km
              {routePreviewFare.isHillRoute ? ' (Hill Area Rate)' : ''}
            </span>
            {tripType === 'roundtrip' && validStops.length > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  Route: {(pickupCity || 'Origin').split(',')[0]} → {(dropCity || 'Dest').split(',')[0]} →{' '}
                  {validStops.map((s) => s.split(',')[0]).join(' → ')} → {(pickupCity || 'Origin').split(',')[0]}
                </span>
              </>
            )}
            {routePreviewFare.isHillRoute && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Mountain className="w-3.5 h-3.5" /> Hill Route
              </span>
            )}
            {travelDuration && (
              <>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-500 hidden sm:inline">Est. {travelDuration}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleExploreSubmit}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold px-7 py-3.5 rounded-xl text-sm shadow-sm transition cursor-pointer shrink-0"
          >
            Search Available Cabs →
          </button>
        </div>
      </div>

      {/* Secure Live WhatsApp OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Verify WhatsApp OTP
              </h3>
              <p className="text-xs text-slate-500">
                Enter the 4-digit live OTP sent to your WhatsApp{' '}
                <strong className="text-slate-900">+91 {customerMobile}</strong>
              </p>
            </div>

            {otpNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-semibold text-center">
                {otpNotice}
              </div>
            )}

            <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-300 flex items-center justify-between gap-2">
              <div className="text-[11px] text-emerald-950 font-semibold leading-tight">
                Didn't receive the code yet?
                <span className="block text-[10px] text-emerald-700 font-normal mt-0.5">
                  Tap here to receive OTP on WhatsApp
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = sanitize10DigitPhone(customerMobile);
                  triggerWhatsAppDeepLink(
                    '919142526791',
                    `Hi Safar India Cabs, please send my Login OTP for +91 ${cleanPhone}`
                  );
                  setTimeout(() => {
                    retriggerWhatsAppOtpFromToken(cleanPhone, otpToken).catch(() => {});
                  }, 2500);
                }}
                className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Click Here to Get OTP
              </button>
            </div>

            {otpError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium text-center">
                {otpError}
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={otpInput}
              onChange={(e) => {
                setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                setOtpError('');
              }}
              placeholder="Enter 4-Digit OTP"
              className="w-full bg-slate-50 border-2 border-slate-300 rounded-2xl px-4 py-3 text-center text-2xl tracking-[0.4em] text-slate-900 font-mono font-extrabold focus:outline-none focus:border-emerald-600 focus:bg-white placeholder:text-xs placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400"
            />

            <button
              type="button"
              disabled={isVerifyingOtp}
              onClick={() => handleVerifyOtp()}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black py-3.5 rounded-xl text-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifyingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying OTP...</span>
                </>
              ) : (
                <span>Submit OTP &amp; View Fares</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Change Number
              </button>

              <button
                type="button"
                disabled={countdown > 0 || isSendingOtp}
                onClick={handleSendOtp}
                className="text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 font-bold cursor-pointer"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
