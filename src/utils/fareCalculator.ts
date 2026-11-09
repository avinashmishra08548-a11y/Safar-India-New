import { CabCategoryId, TripType } from '../types';
import { CABS_FLEET } from '../data/cabsFleet';
import { getAdminPricingConfigSync } from './olaMapsService';

export interface StatePermitBreakdownItem {
  state: string;
  role: 'transit' | 'destination';
  label: string;
  taxAmount: number;
}

export interface CompetitorRateBenchmark {
  cabBazarFare: number;
  gozoCabsFare: number;
  savaariFare: number;
  marketAverageFare: number;
  safarSavingsVsMarket: number;
  bestPriceBadgeText: string;
}

export interface FareCalculationResult {
  distanceKm: number;
  extraKm: number;
  sliderExtraFare: number;
  billedDistanceKm: number;
  baseFare: number;
  driverAllowance: number;
  nightCharges: number;
  highwayToll: number;
  statePermitTax: number;
  stateRoutePath: string[];
  statePermitBreakdown: StatePermitBreakdownItem[];
  estimatedTollsAndTaxes: number;
  tollsAndTaxes: number;
  hillStationCharge: number;
  isHillRoute: boolean;
  pickupIsHill: boolean;
  dropIsHill: boolean;
  hillTier: 'none' | 'foothill_gateway' | 'one_end_hill' | 'both_hills';
  hillRateMultiplier: number;
  hillTierLabel: string;
  isInterState: boolean;
  originState: string;
  destState: string;
  expresswayName: string;
  tollPlazaCount: number;
  tollPlazas: string[];
  extraKmRate: number;
  extraHourRate: number;
  addonsTotal: number;
  gstAmount: number;
  totalFare: number;
  originalMarketFare: number;
  savingsAmount: number;
  savingsPercent: number;
  advanceFare: number;
  balanceDue: number;
  daysCount: number;
  days: number;
  ratePerKm: number;
  leadTimeTier: 'same_day' | 'tomorrow' | 'advance';
  leadTimeMultiplier: number;
  leadTimeLabel: string;
  estimatedDropTime: string;
  isLateNightDrop: boolean;
  isEarlyOrNightPickup: boolean;
  isOuterRoute: boolean;
  pickupIsOuter: boolean;
  dropIsOuter: boolean;
  routeTierMultiplier: number;
  routeTierLabel: string;
  // Compatibility fields for UI views (CabSelector, badges, etc.)
  isHillAreaRoute: boolean;
  effectiveRatePerKm: number;
  isDropHillArea: boolean;
  isPickupHillArea: boolean;
  extraKmRateUsed: number;
  extraKmCharge: number;
  originalFare: number;
  discountAmount: number;
  advanceAmount: number;
  promoDiscount: number;
  promoCodeApplied: string;
  totalFareBeforePromo: number;
  terrainBadge: string;
  routeDemandBadge: string;
  bookingLeadBadge: string;
  competitorRates: CompetitorRateBenchmark;
}

export type FareBreakdown = FareCalculationResult;

export const PROMO_DISCOUNT_AMOUNT = 300;
export const PROMO_SUCCESS_MESSAGE = '₹300 discount applied successfully';

export function isDrVijayKumarMatch(text?: string | null): boolean {
  if (!text) return false;
  const normalized = String(text)
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
  return normalized.includes('dr vijay kumar') || normalized.includes('vijay kumar');
}

export function isValidFirst300Promo(
  codeInput?: string | null,
  customerNameOrWelcome?: string | null
): boolean {
  if (codeInput) {
    const cleanCode = String(codeInput).trim().toUpperCase().replace(/\s+/g, '');
    if (cleanCode === 'FIRST300') return true;
    if (isDrVijayKumarMatch(codeInput)) return true;
  }
  if (customerNameOrWelcome && isDrVijayKumarMatch(customerNameOrWelcome)) {
    return true;
  }
  return false;
}

// Daily High-Frequency Plains/Metro Hub Cities
export const DAILY_ROUTE_HUB_KEYWORDS: string[] = [
  'delhi', 'newdelhi', 'noida', 'greaternoida', 'gurgaon', 'gurugram', 'ghaziabad', 'faridabad',
  'agra', 'mathura', 'vrindavan', 'jaipur', 'chandigarh', 'mohali', 'zirakpur', 'panchkula',
  'ambala', 'panipat', 'karnal', 'sonipat', 'kurukshetra', 'haridwar', 'dehradun',
  'lucknow', 'kanpur', 'ayodhya', 'varanasi', 'prayagraj', 'allahabad', 'amritsar', 'ludhiana',
  'jalandhar', 'patiala', 'pathankot', 'mumbai', 'navimumbai', 'thane', 'pune', 'shirdi', 'nashik',
  'ahmedabad', 'surat', 'vadodara', 'gandhinagar', 'udaipur', 'bangalore', 'bengaluru', 'mysore',
  'mysuru', 'chennai', 'pondicherry', 'puducherry', 'hyderabad', 'secunderabad', 'tirupati',
  'kolkata', 'howrah', 'indore', 'bhopal', 'ujjain', 'patna', 'nagpur', 'coimbatore', 'kochi'
];

// High-Altitude / Deep Mountain Destinations (Including spelling variants like dharmshala/dharmshaala/dharamsala)
export const DEEP_MOUNTAIN_HILL_KEYWORDS: string[] = [
  'manali', 'kullu', 'kasol', 'manikaran', 'tosh', 'malana', 'rohtang', 'sissu', 'keylong', 'jispa',
  'spiti', 'kaza', 'kinnaur', 'kalpa', 'sangla', 'chitkul', 'reckongpeo', 'narkanda', 'kufri',
  'dharamshala', 'dharmshala', 'dharmshaala', 'dharamsala', 'mcleodganj', 'palampur', 'bir', 'barot',
  'jibhi', 'tirthan', 'shoja', 'dalhousie', 'khajjiar', 'chamba', 'rudraprayag', 'karnaprayag',
  'nandaprayag', 'vishnuprayag', 'devprayag', 'sonprayag', 'gaurikund', 'kedarnath', 'badrinath',
  'guptkashi', 'ukhimath', 'chopta', 'joshimath', 'auli', 'chamoli', 'gopeshwar', 'uttarkashi',
  'gangotri', 'yamunotri', 'barkot', 'harsil', 'tehri', 'newtehri', 'pauri', 'srinagargarhwal',
  'almora', 'ranikhet', 'kausani', 'binsar', 'bageshwar', 'pithoragarh', 'champawat', 'lohaghat',
  'munsiyari', 'chaukori', 'dharchula', 'jageshwar', 'mukteshwar', 'chakrata', 'dhanaulti', 'kanatal',
  'srinagar', 'gulmarg', 'pahalgam', 'sonamarg', 'patnitop', 'bhaderwah', 'kishtwar', 'banihal',
  'leh', 'ladakh', 'kargil', 'nubra', 'pangong', 'drass', 'darjeeling', 'gangtok', 'sikkim',
  'pelling', 'lachung', 'lachen', 'nathula', 'tawang', 'bomdila', 'ziro', 'dirang', 'kohima', 'aizawl'
];

// Foothill Gateway / Mountain Approach Towns
export const FOOTHILL_GATEWAY_KEYWORDS: string[] = [
  'dehradun', 'haridwar', 'haldwani', 'kathgodam', 'ramnagar', 'corbett', 'jimcorbett',
  'kotdwar', 'tanakpur', 'kalka', 'parwanoo', 'pathankot', 'kiratpur', 'ropar', 'siliguri', 'jammu'
];

// Comprehensive Indian Hill Station & Mountain District Keywords
export const HILL_STATION_KEYWORDS: string[] = [
  // Uttarakhand (Garhwal & Kumaon Hills)
  'rudraprayag', 'nainital', 'mussoorie', 'rishikesh', 'almora', 'ranikhet', 'badrinath',
  'kedarnath', 'sonprayag', 'gaurikund', 'guptkashi', 'joshimath', 'auli', 'chamoli',
  'gopeshwar', 'karnaprayag', 'nandaprayag', 'vishnuprayag', 'devprayag', 'srinagargarhwal',
  'tehri', 'newtehri', 'uttarkashi', 'pauri', 'lansdowne', 'kotdwar', 'chopta', 'ukhimath',
  'barkot', 'harsil', 'gangotri', 'yamunotri', 'chakrata', 'dhanaulti', 'kanatal', 'chamba',
  'bhimtal', 'sattal', 'naukuchiatal', 'mukteshwar', 'ramgarh', 'bhowali', 'kausani', 'binsar',
  'bageshwar', 'pithoragarh', 'champawat', 'lohaghat', 'munsiyari', 'chaukori', 'dharchula',
  'jageshwar', 'pangot', 'jeolikote', 'garhwal', 'kumaon',
  // Himachal Pradesh
  'shimla', 'manali', 'kullu', 'kasol', 'manikaran', 'tosh', 'malana', 'dharamshala',
  'dharmshala', 'dharmshaala', 'dharamsala', 'mcleodganj', 'dalhousie', 'khajjiar', 'kasauli',
  'solan', 'chail', 'kufri', 'narkanda', 'mashobra', 'mandi', 'palampur', 'bir', 'barot',
  'jibhi', 'tirthan', 'shoja', 'spiti', 'kaza', 'kinnaur', 'kalpa', 'sangla', 'chitkul',
  'reckongpeo', 'keylong', 'jispa', 'sissu', 'rohtang', 'kangra', 'nagrotabagwan', 'nagrota',
  'chamunda', 'baijnath', 'jawalamukhi', 'chintpurni', 'bilaspurhp', 'himachal',
  // Jammu & Kashmir / Ladakh
  'srinagar', 'gulmarg', 'pahalgam', 'sonamarg', 'patnitop', 'katra', 'vaishnodevi',
  'bhaderwah', 'kishtwar', 'banihal', 'leh', 'ladakh', 'kargil', 'nubra', 'pangong', 'drass',
  // North East & Eastern Himalayas
  'darjeeling', 'kalimpong', 'kurseong', 'mirik', 'gangtok', 'sikkim', 'pelling', 'lachung',
  'lachen', 'nathula', 'shillong', 'cherrapunji', 'sohra', 'dawki', 'tawang', 'bomdila',
  'ziro', 'dirang', 'kohima', 'aizawl',
  // South, West & Central India Hills / Ghats
  'ooty', 'udhagamandalam', 'coonoor', 'kotagiri', 'kodaikanal', 'yercaud', 'valparai',
  'yelagiri', 'munnar', 'thekkady', 'vagamon', 'wayanad', 'kalpetta', 'vythiri', 'ponmudi',
  'idukki', 'coorg', 'madikeri', 'kushalnagar', 'chikmagalur', 'sakleshpur', 'kemmanagundi',
  'kudremukh', 'agumbe', 'mahabaleshwar', 'panchgani', 'lonavala', 'khandala', 'matheran',
  'igatpuri', 'bhandardara', 'amboli', 'lavasa', 'malshej', 'saputara', 'mountabu',
  'pachmarhi', 'amarkantak', 'araku', 'lambasingi', 'horsleyhills', 'netarhat'
];

// Verified NHAI Expressway & Highway Toll Table (One-Way Car/Sedan FASTag base in INR with exact counted Toll Plazas)
const VERIFIED_EXPRESSWAY_TOLLS: Record<
  string,
  { toll: number; name: string; plazaCount: number; plazas: string[] }
> = {
  'delhi-agra': {
    toll: 465,
    name: 'Yamuna Expressway FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Jewar Toll Plaza', 'Mathura Toll Plaza', 'Agra Toll Plaza']
  },
  'agra-delhi': {
    toll: 465,
    name: 'Yamuna Expressway FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Agra Toll Plaza', 'Mathura Toll Plaza', 'Jewar Toll Plaza']
  },
  'delhi-mathura': {
    toll: 240,
    name: 'Yamuna / NH-19 FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Srinagar/Faridabad Toll', 'Mahuvan (Mathura) Toll Plaza']
  },
  'mathura-delhi': {
    toll: 240,
    name: 'Yamuna / NH-19 FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Mahuvan (Mathura) Toll Plaza', 'Srinagar/Faridabad Toll']
  },
  'delhi-jaipur': {
    toll: 395,
    name: 'NH-48 / Delhi-Jaipur FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Kherki Daula Toll', 'Shahjahanpur Toll Plaza', 'Manoharpur/Daulatpur Toll']
  },
  'jaipur-delhi': {
    toll: 395,
    name: 'NH-48 / Delhi-Jaipur FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Manoharpur/Daulatpur Toll', 'Shahjahanpur Toll Plaza', 'Kherki Daula Toll']
  },
  'delhi-chandigarh': {
    toll: 390,
    name: 'NH-44 GT Road FASTag (4 Plazas)',
    plazaCount: 4,
    plazas: ['Murthal/Bhalgarh Toll', 'Panipat Toll Plaza', 'Gharaunda (Karnal) Toll', 'Ghaggar (Ambala) Toll']
  },
  'chandigarh-delhi': {
    toll: 390,
    name: 'NH-44 GT Road FASTag (4 Plazas)',
    plazaCount: 4,
    plazas: ['Ghaggar (Ambala) Toll', 'Gharaunda (Karnal) Toll', 'Panipat Toll Plaza', 'Murthal/Bhalgarh Toll']
  },
  'delhi-haridwar': {
    toll: 310,
    name: 'Delhi-Meerut Expwy + NH-334 (3 Plazas)',
    plazaCount: 3,
    plazas: ['Kashi (Meerut Expwy) Toll', 'Saini/Muzaffarnagar Toll', 'Bahadrabad (Haridwar) Toll']
  },
  'haridwar-delhi': {
    toll: 310,
    name: 'Delhi-Meerut Expwy + NH-334 (3 Plazas)',
    plazaCount: 3,
    plazas: ['Bahadrabad (Haridwar) Toll', 'Saini/Muzaffarnagar Toll', 'Kashi (Meerut Expwy) Toll']
  },
  'delhi-rishikesh': {
    toll: 310,
    name: 'Delhi-Meerut Expwy + NH-334 (3 Plazas)',
    plazaCount: 3,
    plazas: ['Kashi (Meerut Expwy) Toll', 'Saini/Muzaffarnagar Toll', 'Bahadrabad Toll']
  },
  'rishikesh-delhi': {
    toll: 310,
    name: 'Delhi-Meerut Expwy + NH-334 (3 Plazas)',
    plazaCount: 3,
    plazas: ['Bahadrabad Toll', 'Saini/Muzaffarnagar Toll', 'Kashi (Meerut Expwy) Toll']
  },
  'delhi-dehradun': {
    toll: 335,
    name: 'Delhi-Dehradun Highway FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Kashi (Meerut Expwy) Toll', 'Saini Toll Plaza', 'Lacchiwala (Dehradun) Toll']
  },
  'dehradun-delhi': {
    toll: 335,
    name: 'Delhi-Dehradun Highway FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Lacchiwala (Dehradun) Toll', 'Saini Toll Plaza', 'Kashi (Meerut Expwy) Toll']
  },
  'delhi-shimla': {
    toll: 510,
    name: 'NH-44 + Himalayan Expwy (6 Plazas)',
    plazaCount: 6,
    plazas: ['Murthal Toll', 'Panipat Toll', 'Gharaunda Toll', 'Ghaggar Toll', 'Chandimandir Toll', 'Sanwara Toll']
  },
  'shimla-delhi': {
    toll: 510,
    name: 'NH-44 + Himalayan Expwy (6 Plazas)',
    plazaCount: 6,
    plazas: ['Sanwara Toll', 'Chandimandir Toll', 'Ghaggar Toll', 'Gharaunda Toll', 'Panipat Toll', 'Murthal Toll']
  },
  'delhi-manali': {
    toll: 580,
    name: 'NH-44 + Kiratpur-Manali Expwy (6 Plazas)',
    plazaCount: 6,
    plazas: ['Murthal Toll', 'Panipat Toll', 'Gharaunda Toll', 'Ghaggar Toll', 'Behrampur/Kiratpur Toll', 'Takoli (Kullu) Toll']
  },
  'manali-delhi': {
    toll: 580,
    name: 'NH-44 + Kiratpur-Manali Expwy (6 Plazas)',
    plazaCount: 6,
    plazas: ['Takoli (Kullu) Toll', 'Behrampur/Kiratpur Toll', 'Ghaggar Toll', 'Gharaunda Toll', 'Panipat Toll', 'Murthal Toll']
  },
  'delhi-amritsar': {
    toll: 610,
    name: 'NH-44 Delhi-Amritsar Expwy (6 Plazas)',
    plazaCount: 6,
    plazas: ['Murthal Toll', 'Panipat Toll', 'Gharaunda Toll', 'Ghaggar Toll', 'Ladowal (Ludhiana) Toll', 'Nijjarpura (Amritsar) Toll']
  },
  'amritsar-delhi': {
    toll: 610,
    name: 'NH-44 Delhi-Amritsar Expwy (6 Plazas)',
    plazaCount: 6,
    plazas: ['Nijjarpura (Amritsar) Toll', 'Ladowal (Ludhiana) Toll', 'Ghaggar Toll', 'Gharaunda Toll', 'Panipat Toll', 'Murthal Toll']
  },
  'delhi-lucknow': {
    toll: 780,
    name: 'Yamuna + Agra-Lucknow Expwy (4 Plazas)',
    plazaCount: 4,
    plazas: ['Jewar Toll', 'Mathura Toll', 'Agra Toll', 'Agra-Lucknow Expressway Toll']
  },
  'lucknow-delhi': {
    toll: 780,
    name: 'Yamuna + Agra-Lucknow Expwy (4 Plazas)',
    plazaCount: 4,
    plazas: ['Agra-Lucknow Expressway Toll', 'Agra Toll', 'Mathura Toll', 'Jewar Toll']
  },
  'delhi-nainital': {
    toll: 345,
    name: 'NH-9 Hapur-Moradabad FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Chhijarsi (Pilkhuwa) Toll', 'Brijghat (Garhmukteshwar) Toll', 'Joya (Amroha) Toll']
  },
  'nainital-delhi': {
    toll: 345,
    name: 'NH-9 Hapur-Moradabad FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Joya (Amroha) Toll', 'Brijghat (Garhmukteshwar) Toll', 'Chhijarsi (Pilkhuwa) Toll']
  },
  'delhi-mussoorie': {
    toll: 335,
    name: 'Delhi-Dehradun Highway FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Kashi (Meerut Expwy) Toll', 'Saini Toll Plaza', 'Lacchiwala (Dehradun) Toll']
  },
  'mussoorie-delhi': {
    toll: 335,
    name: 'Delhi-Dehradun Highway FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Lacchiwala (Dehradun) Toll', 'Saini Toll Plaza', 'Kashi (Meerut Expwy) Toll']
  },
  // Tricity (Chandigarh / Zirakpur / Mohali) to Himachal Corridors (Exact Real Plazas)
  'zirakpur-kangra': {
    toll: 135,
    name: 'NH-503 Kiratpur-Nangal Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza']
  },
  'kangra-zirakpur': {
    toll: 135,
    name: 'NH-503 Kiratpur-Nangal Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza']
  },
  'chandigarh-kangra': {
    toll: 135,
    name: 'NH-503 Kiratpur-Nangal Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza']
  },
  'kangra-chandigarh': {
    toll: 135,
    name: 'NH-503 Kiratpur-Nangal Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza']
  },
  'zirakpur-nagrota': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza']
  },
  'nagrota-zirakpur': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza']
  },
  'chandigarh-nagrota': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza']
  },
  'nagrota-chandigarh': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza']
  },
  'zirakpur-dharamshala': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza']
  },
  'dharamshala-zirakpur': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza']
  },
  'chandigarh-dharamshala': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza']
  },
  'dharamshala-chandigarh': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza']
  },
  'zirakpur-palampur': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza']
  },
  'palampur-zirakpur': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza']
  },
  'chandigarh-palampur': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza']
  },
  'palampur-chandigarh': {
    toll: 135,
    name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza']
  },
  'chandigarh-manali': {
    toll: 210,
    name: 'Kiratpur-Nerchowk-Manali Expwy (3 Plazas)',
    plazaCount: 3,
    plazas: ['Solakhian (Ropar) Toll', 'Behrampur (Kiratpur) Toll', 'Takoli (Kullu) Toll']
  },
  'manali-chandigarh': {
    toll: 210,
    name: 'Kiratpur-Nerchowk-Manali Expwy (3 Plazas)',
    plazaCount: 3,
    plazas: ['Takoli (Kullu) Toll', 'Behrampur (Kiratpur) Toll', 'Solakhian (Ropar) Toll']
  },
  'zirakpur-manali': {
    toll: 210,
    name: 'Kiratpur-Nerchowk-Manali Expwy (3 Plazas)',
    plazaCount: 3,
    plazas: ['Solakhian (Ropar) Toll', 'Behrampur (Kiratpur) Toll', 'Takoli (Kullu) Toll']
  },
  'manali-zirakpur': {
    toll: 210,
    name: 'Kiratpur-Nerchowk-Manali Expwy (3 Plazas)',
    plazaCount: 3,
    plazas: ['Takoli (Kullu) Toll', 'Behrampur (Kiratpur) Toll', 'Solakhian (Ropar) Toll']
  },
  'chandigarh-shimla': {
    toll: 115,
    name: 'Chandimandir-Solan Himalayan Expwy (2 Plazas)',
    plazaCount: 2,
    plazas: ['Chandimandir Toll Plaza', 'Sanwara (Solan) Toll Plaza']
  },
  'shimla-chandigarh': {
    toll: 115,
    name: 'Chandimandir-Solan Himalayan Expwy (2 Plazas)',
    plazaCount: 2,
    plazas: ['Sanwara (Solan) Toll Plaza', 'Chandimandir Toll Plaza']
  },
  'zirakpur-shimla': {
    toll: 115,
    name: 'Chandimandir-Solan Himalayan Expwy (2 Plazas)',
    plazaCount: 2,
    plazas: ['Chandimandir Toll Plaza', 'Sanwara (Solan) Toll Plaza']
  },
  'shimla-zirakpur': {
    toll: 115,
    name: 'Chandimandir-Solan Himalayan Expwy (2 Plazas)',
    plazaCount: 2,
    plazas: ['Sanwara (Solan) Toll Plaza', 'Chandimandir Toll Plaza']
  },
  'chandigarh-amritsar': {
    toll: 265,
    name: 'NH-5 / NH-44 Punjab FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Ladowal (Ludhiana) Toll', 'Chiddan/Dhilwan Toll', 'Nijjarpura (Amritsar) Toll']
  },
  'amritsar-chandigarh': {
    toll: 265,
    name: 'NH-5 / NH-44 Punjab FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Nijjarpura (Amritsar) Toll', 'Chiddan/Dhilwan Toll', 'Ladowal (Ludhiana) Toll']
  },
  // Bihar Verified NHAI Corridors
  'patna-muzaffarpur': {
    toll: 110,
    name: 'NH-22 Hajipur-Muzaffarpur Highway (1 Plaza)',
    plazaCount: 1,
    plazas: ['Goraul (Vaishali) Toll Plaza']
  },
  'muzaffarpur-patna': {
    toll: 110,
    name: 'NH-22 Hajipur-Muzaffarpur Highway (1 Plaza)',
    plazaCount: 1,
    plazas: ['Goraul (Vaishali) Toll Plaza']
  },
  'patna-darbhanga': {
    toll: 195,
    name: 'NH-22 + NH-27 Darbhanga Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Goraul Toll Plaza', 'Maithi (Muzaffarpur-Darbhanga) Toll Plaza']
  },
  'darbhanga-patna': {
    toll: 195,
    name: 'NH-22 + NH-27 Darbhanga Corridor (2 Plazas)',
    plazaCount: 2,
    plazas: ['Maithi (Muzaffarpur-Darbhanga) Toll Plaza', 'Goraul Toll Plaza']
  },
  'patna-gaya': {
    toll: 85,
    name: 'NH-22 Patna-Gaya Highway (1 Plaza)',
    plazaCount: 1,
    plazas: ['Kewali (Jehanabad) Toll Plaza']
  },
  'gaya-patna': {
    toll: 85,
    name: 'NH-22 Patna-Gaya Highway (1 Plaza)',
    plazaCount: 1,
    plazas: ['Kewali (Jehanabad) Toll Plaza']
  },
  'patna-biharsharif': {
    toll: 120,
    name: 'NH-30 / NH-20 Bakhtiyarpur Corridor (1 Plaza)',
    plazaCount: 1,
    plazas: ['Didarganj (Patna-Bakhtiyarpur) Toll Plaza']
  },
  'biharsharif-patna': {
    toll: 120,
    name: 'NH-30 / NH-20 Bakhtiyarpur Corridor (1 Plaza)',
    plazaCount: 1,
    plazas: ['Didarganj (Patna-Bakhtiyarpur) Toll Plaza']
  },
  'patna-rajgir': {
    toll: 120,
    name: 'NH-30 / NH-20 Rajgir Corridor (1 Plaza)',
    plazaCount: 1,
    plazas: ['Didarganj (Patna-Bakhtiyarpur) Toll Plaza']
  },
  'rajgir-patna': {
    toll: 120,
    name: 'NH-30 / NH-20 Rajgir Corridor (1 Plaza)',
    plazaCount: 1,
    plazas: ['Didarganj (Patna-Bakhtiyarpur) Toll Plaza']
  },
  // West, South & East India Expressways
  'mumbai-pune': {
    toll: 320,
    name: 'Mumbai-Pune Expressway (2 Plazas)',
    plazaCount: 2,
    plazas: ['Khalapur Toll Plaza', 'Talegaon Toll Plaza']
  },
  'pune-mumbai': {
    toll: 320,
    name: 'Mumbai-Pune Expressway (2 Plazas)',
    plazaCount: 2,
    plazas: ['Talegaon Toll Plaza', 'Khalapur Toll Plaza']
  },
  'mumbai-lonavala': {
    toll: 240,
    name: 'Mumbai-Pune Expressway (1 Plaza)',
    plazaCount: 1,
    plazas: ['Khalapur Expressway Toll Plaza']
  },
  'lonavala-mumbai': {
    toll: 240,
    name: 'Mumbai-Pune Expressway (1 Plaza)',
    plazaCount: 1,
    plazas: ['Khalapur Expressway Toll Plaza']
  },
  'mumbai-shirdi': {
    toll: 295,
    name: 'NH-160 / Samruddhi FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Argoan/Padgha Toll', 'Ghoti Toll Plaza', 'Sinnar/Shirdi Toll']
  },
  'shirdi-mumbai': {
    toll: 295,
    name: 'NH-160 / Samruddhi FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Sinnar/Shirdi Toll', 'Ghoti Toll Plaza', 'Argoan/Padgha Toll']
  },
  'mumbai-nashik': {
    toll: 235,
    name: 'Mumbai-Nashik NH-160 FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Padgha Toll Plaza', 'Ghoti Toll Plaza']
  },
  'nashik-mumbai': {
    toll: 235,
    name: 'Mumbai-Nashik NH-160 FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Ghoti Toll Plaza', 'Padgha Toll Plaza']
  },
  'mumbai-goa': {
    toll: 520,
    name: 'NH-66 / Expressway FASTag (5 Plazas)',
    plazaCount: 5,
    plazas: ['Khalapur Toll', 'Talegaon Toll', 'Khed Shivapur Toll', 'Anewadi Toll', 'Kini (Kolhapur) Toll']
  },
  'goa-mumbai': {
    toll: 520,
    name: 'NH-66 / Expressway FASTag (5 Plazas)',
    plazaCount: 5,
    plazas: ['Kini (Kolhapur) Toll', 'Anewadi Toll', 'Khed Shivapur Toll', 'Talegaon Toll', 'Khalapur Toll']
  },
  'mumbai-mahabaleshwar': {
    toll: 410,
    name: 'Mumbai-Pune Expwy + NH-48 (3 Plazas)',
    plazaCount: 3,
    plazas: ['Khalapur Toll', 'Talegaon Toll', 'Khed Shivapur Toll']
  },
  'mahabaleshwar-mumbai': {
    toll: 410,
    name: 'Mumbai-Pune Expwy + NH-48 (3 Plazas)',
    plazaCount: 3,
    plazas: ['Khed Shivapur Toll', 'Talegaon Toll', 'Khalapur Toll']
  },
  'pune-shirdi': {
    toll: 195,
    name: 'Pune-Sangamner Highway FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Chakan/Moshi Toll Plaza', 'Chalakhwadi (Alephata) Toll']
  },
  'shirdi-pune': {
    toll: 195,
    name: 'Pune-Sangamner Highway FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Chalakhwadi (Alephata) Toll', 'Chakan/Moshi Toll Plaza']
  },
  'pune-mahabaleshwar': {
    toll: 135,
    name: 'NH-48 Khed-Shivapur FASTag (1 Plaza)',
    plazaCount: 1,
    plazas: ['Khed Shivapur Toll Plaza']
  },
  'mahabaleshwar-pune': {
    toll: 135,
    name: 'NH-48 Khed-Shivapur FASTag (1 Plaza)',
    plazaCount: 1,
    plazas: ['Khed Shivapur Toll Plaza']
  },
  'bangalore-mysore': {
    toll: 335,
    name: 'Bangalore-Mysore Expressway (2 Plazas)',
    plazaCount: 2,
    plazas: ['Kaniminike Toll Plaza', 'Gananguru (Srirangapatna) Toll Plaza']
  },
  'mysore-bangalore': {
    toll: 335,
    name: 'Bangalore-Mysore Expressway (2 Plazas)',
    plazaCount: 2,
    plazas: ['Gananguru (Srirangapatna) Toll Plaza', 'Kaniminike Toll Plaza']
  },
  'bangalore-chennai': {
    toll: 435,
    name: 'NH-48 Krishnagiri-Vellore FASTag (5 Plazas)',
    plazaCount: 5,
    plazas: ['Attibele Toll', 'Krishnagiri Toll', 'Pallikonda Toll', 'Chennasamudram Toll', 'Sriperumbudur Toll']
  },
  'chennai-bangalore': {
    toll: 435,
    name: 'NH-48 Krishnagiri-Vellore FASTag (5 Plazas)',
    plazaCount: 5,
    plazas: ['Sriperumbudur Toll', 'Chennasamudram Toll', 'Pallikonda Toll', 'Krishnagiri Toll', 'Attibele Toll']
  },
  'bangalore-tirupati': {
    toll: 265,
    name: 'NH-75 Mulbagal-Chittoor FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Hoskote Toll Plaza', 'Mulbagal Toll Plaza', 'Gadanki (Tirupati) Toll']
  },
  'tirupati-bangalore': {
    toll: 265,
    name: 'NH-75 Mulbagal-Chittoor FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Gadanki (Tirupati) Toll', 'Mulbagal Toll Plaza', 'Hoskote Toll Plaza']
  },
  'bangalore-ooty': {
    toll: 335,
    name: 'Bangalore-Mysore Expwy (2 Plazas)',
    plazaCount: 2,
    plazas: ['Kaniminike Toll Plaza', 'Gananguru Toll Plaza']
  },
  'ooty-bangalore': {
    toll: 335,
    name: 'Bangalore-Mysore Expwy (2 Plazas)',
    plazaCount: 2,
    plazas: ['Gananguru Toll Plaza', 'Kaniminike Toll Plaza']
  },
  'bangalore-coorg': {
    toll: 265,
    name: 'Bangalore-Mysore Expwy FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Kaniminike Toll Plaza', 'Gananguru Toll Plaza']
  },
  'coorg-bangalore': {
    toll: 265,
    name: 'Bangalore-Mysore Expwy FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Gananguru Toll Plaza', 'Kaniminike Toll Plaza']
  },
  'chennai-pondicherry': {
    toll: 145,
    name: 'East Coast Road (ECR) Toll (2 Plazas)',
    plazaCount: 2,
    plazas: ['Akkarai ECR Toll Plaza', 'Mahabalipuram ECR Toll']
  },
  'pondicherry-chennai': {
    toll: 145,
    name: 'East Coast Road (ECR) Toll (2 Plazas)',
    plazaCount: 2,
    plazas: ['Mahabalipuram ECR Toll', 'Akkarai ECR Toll Plaza']
  },
  'ahmedabad-udaipur': {
    toll: 295,
    name: 'NH-48 Himatnagar-Shamlaji FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Kathpur (Himatnagar) Toll', 'Vantada (Modasa) Toll', 'Khandi Obri (Udaipur) Toll']
  },
  'udaipur-ahmedabad': {
    toll: 295,
    name: 'NH-48 Himatnagar-Shamlaji FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Khandi Obri (Udaipur) Toll', 'Vantada (Modasa) Toll', 'Kathpur (Himatnagar) Toll']
  },
  'jaipur-udaipur': {
    toll: 415,
    name: 'NH-48 Kishangarh-Bhilwara FASTag (4 Plazas)',
    plazaCount: 4,
    plazas: ['Thikariya (Jaipur) Toll', 'Kishangarh Toll', 'Lambiya (Bhilwara) Toll', 'Narayanpura (Udaipur) Toll']
  },
  'udaipur-jaipur': {
    toll: 415,
    name: 'NH-48 Kishangarh-Bhilwara FASTag (4 Plazas)',
    plazaCount: 4,
    plazas: ['Narayanpura (Udaipur) Toll', 'Lambiya (Bhilwara) Toll', 'Kishangarh Toll', 'Thikariya (Jaipur) Toll']
  },
  'jaipur-jodhpur': {
    toll: 315,
    name: 'NH-48 + Beawar-Pali FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Thikariya Toll', 'Kishangarh Toll', 'Raipur/Nimbol (Beawar) Toll']
  },
  'jodhpur-jaipur': {
    toll: 315,
    name: 'NH-48 + Beawar-Pali FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Raipur/Nimbol (Beawar) Toll', 'Kishangarh Toll', 'Thikariya Toll']
  },
  'lucknow-varanasi': {
    toll: 375,
    name: 'Purvanchal / NH-31 FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Dakhina Shekhpur Toll', 'Asoga (Sultanpur) Toll', 'Hauz (Jaunpur) Toll']
  },
  'varanasi-lucknow': {
    toll: 375,
    name: 'Purvanchal / NH-31 FASTag (3 Plazas)',
    plazaCount: 3,
    plazas: ['Hauz (Jaunpur) Toll', 'Asoga (Sultanpur) Toll', 'Dakhina Shekhpur Toll']
  },
  'lucknow-ayodhya': {
    toll: 195,
    name: 'NH-27 Barabanki-Ayodhya FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Ahmadpur (Barabanki) Toll Plaza', 'Ronahi (Ayodhya) Toll Plaza']
  },
  'ayodhya-lucknow': {
    toll: 195,
    name: 'NH-27 Barabanki-Ayodhya FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Ronahi (Ayodhya) Toll Plaza', 'Ahmadpur (Barabanki) Toll Plaza']
  },
  'varanasi-ayodhya': {
    toll: 225,
    name: 'NH-31 / NH-27 Ayodhya FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Hauz (Jaunpur) Toll Plaza', 'Tahapur/Akbarpur Toll Plaza']
  },
  'ayodhya-varanasi': {
    toll: 225,
    name: 'NH-31 / NH-27 Ayodhya FASTag (2 Plazas)',
    plazaCount: 2,
    plazas: ['Tahapur/Akbarpur Toll Plaza', 'Hauz (Jaunpur) Toll Plaza']
  }
};

// State detection map for Indian cities & regions
const CITY_STATE_KEYWORDS: Array<{ keywords: string[]; state: string }> = [
  { keywords: ['delhi', 'newdelhi', 'burari', 'dwarka', 'rohini', 'connaught', 'igi', 'aerocity', 'saket', 'vasantkunj', 'karolbagh', 'lajpat'], state: 'Delhi' },
  { keywords: ['noida', 'greaternoida', 'ghaziabad', 'agra', 'lucknow', 'varanasi', 'ayodhya', 'mathura', 'vrindavan', 'prayagraj', 'allahabad', 'kanpur', 'meerut', 'gorakhpur', 'bareilly', 'aligarh', 'jhansi', 'moradabad', 'muzaffarnagar', 'saharanpur', 'bijnor', 'rampur', 'uttarpradesh'], state: 'Uttar Pradesh' },
  { keywords: ['gurgaon', 'gurugram', 'faridabad', 'panipat', 'ambala', 'karnal', 'sonipat', 'rohtak', 'hisar', 'kurukshetra', 'rewari', 'palwal', 'panchkula', 'haryana'], state: 'Haryana' },
  { keywords: ['jaipur', 'udaipur', 'jodhpur', 'ajmer', 'pushkar', 'jaisalmer', 'bikaner', 'kota', 'mountabu', 'alwar', 'bharatpur', 'khatushyam', 'salasar', 'neemrana', 'sikar', 'jhunjhunu', 'rajasthan'], state: 'Rajasthan' },
  { keywords: ['chandigarh', 'amritsar', 'srigururamdas', 'rajasansi', 'ludhiana', 'jalandhar', 'patiala', 'bathinda', 'mohali', 'zirakpur', 'pathankot', 'ropar', 'kiratpur', 'punjab'], state: 'Punjab' },
  { keywords: ['shimla', 'manali', 'dharamshala', 'dharmshala', 'dharmshaala', 'dharamsala', 'mcleodganj', 'dalhousie', 'kasauli', 'kullu', 'solan', 'spiti', 'kasol', 'chamba', 'khajjiar', 'mandi', 'bilaspurhp', 'palampur', 'kangra', 'nagrotabagwan', 'nagrota', 'chamunda', 'baijnath', 'jawalamukhi', 'chintpurni', 'kinnaur', 'kalpa', 'kufri', 'narkanda', 'himachal'], state: 'Himachal Pradesh' },
  { keywords: ['dehradun', 'haridwar', 'rishikesh', 'nainital', 'mussoorie', 'rudraprayag', 'haldwani', 'kathgodam', 'roorkee', 'jimcorbett', 'corbett', 'ramnagar', 'kedarnath', 'badrinath', 'sonprayag', 'guptkashi', 'joshimath', 'chamoli', 'karnaprayag', 'devprayag', 'tehri', 'uttarkashi', 'pauri', 'kotdwar', 'almora', 'ranikhet', 'kausani', 'bageshwar', 'pithoragarh', 'champawat', 'bhimtal', 'mukteshwar', 'gangotri', 'yamunotri', 'lansdowne', 'auil', 'auli', 'chopta', 'chakrata', 'dhanaulti', 'uttarakhand', 'uttrakhand'], state: 'Uttarakhand' },
  { keywords: ['mumbai', 'pune', 'lonavala', 'khandala', 'mahabaleshwar', 'panchgani', 'shirdi', 'nashik', 'nagpur', 'aurangabad', 'sambhajinagar', 'thane', 'navimumbai', 'andheri', 'bandra', 'dadar', 'borivali', 'kalyan', 'kolhapur', 'solapur', 'maharashtra'], state: 'Maharashtra' },
  { keywords: ['goa', 'panaji', 'margao', 'calangute', 'baga', 'dabolim', 'mopa', 'vasco'], state: 'Goa' },
  { keywords: ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'somnath', 'bhuj', 'kutch', 'gandhinagar', 'statueofunity', 'kevadia', 'vapi', 'valsad', 'saputara', 'gujarat'], state: 'Gujarat' },
  { keywords: ['bangalore', 'bengaluru', 'mysore', 'mysuru', 'coorg', 'madikeri', 'mangalore', 'hubli', 'belgaum', 'chikmagalur', 'sakleshpur', 'hampi', 'udupi', 'gokarna', 'kempegowda', 'whitefield', 'electroniccity', 'karnataka'], state: 'Karnataka' },
  { keywords: ['chennai', 'coimbatore', 'madurai', 'ooty', 'coonoor', 'kodaikanal', 'yercaud', 'rameswaram', 'kanyakumari', 'vellore', 'salem', 'trichy', 'thanjavur', 'mahabalipuram', 'hosur', 'tamilnadu'], state: 'Tamil Nadu' },
  { keywords: ['pondicherry', 'puducherry'], state: 'Puducherry' },
  { keywords: ['hyderabad', 'secunderabad', 'warangal', 'gachibowli', 'hitec', 'shamshabad', 'telangana'], state: 'Telangana' },
  { keywords: ['tirupati', 'visakhapatnam', 'vizag', 'vijayawada', 'guntur', 'nellore', 'kurnool', 'chittoor', 'araku', 'andhrapradesh'], state: 'Andhra Pradesh' },
  { keywords: ['kochi', 'cochin', 'munnar', 'thiruvananthapuram', 'trivandrum', 'alleppey', 'alappuzha', 'wayanad', 'kozhikode', 'calicut', 'thekkady', 'kovalam', 'kerala'], state: 'Kerala' },
  { keywords: ['indore', 'bhopal', 'ujjain', 'omkareshwar', 'gwalior', 'jabalpur', 'khajuraho', 'pachmarhi', 'sanchi', 'madhyapradesh'], state: 'Madhya Pradesh' },
  { keywords: ['kolkata', 'howrah', 'darjeeling', 'kalimpong', 'siliguri', 'digha', 'durgapur', 'asansol', 'westbengal'], state: 'West Bengal' },
  { keywords: ['patna', 'hajipur', 'sonepur', 'sonpur', 'danapur', 'bihta', 'gaya', 'bodhgaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'samastipur', 'begusarai', 'ara', 'arrah', 'chhapra', 'chapra', 'biharsharif', 'rajgir', 'nalanda', 'sitamarhi', 'motihari', 'buxar', 'sasaram', 'purnia', 'vaishali', 'saran', 'bihar'], state: 'Bihar' },
  { keywords: ['ranchi', 'jamshedpur', 'deoghar', 'dhanbad', 'bokaro', 'hazaribagh', 'jharkhand'], state: 'Jharkhand' },
  { keywords: ['bhubaneswar', 'puri', 'konark', 'cuttack', 'rourkela', 'odisha'], state: 'Odisha' },
  { keywords: ['raipur', 'bilaspur', 'bhilai', 'durg', 'chhattisgarh'], state: 'Chhattisgarh' },
  { keywords: ['guwahati', 'shillong', 'cherrapunji', 'kaziranga', 'gangtok', 'sikkim', 'tawang', 'assam', 'meghalaya'], state: 'North East' },
  { keywords: ['jammu', 'srinagar', 'katra', 'vaishnodevi', 'gulmarg', 'pahalgam', 'sonamarg', 'patnitop', 'leh', 'ladakh', 'kashmir'], state: 'Jammu & Kashmir' }
];

const PUNJAB_TRANSIT_HIMACHAL_CITIES = [
  'manali', 'kullu', 'kasol', 'spiti', 'kangra', 'nagrotabagwan', 'nagrota', 'palampur', 'dharamshala', 'dharmshala', 'dharmshaala', 'dharamsala', 'mcleodganj', 'dalhousie', 'chamba', 'khajjiar', 'mandi'
];

const EXPLICIT_HIGHWAY_STATE_CORRIDORS: Record<string, string[]> = {
  'Delhi|Uttarakhand': ['Delhi', 'Uttar Pradesh', 'Uttarakhand'],
  'Uttarakhand|Delhi': ['Uttarakhand', 'Uttar Pradesh', 'Delhi'],
  'Delhi|Himachal Pradesh': ['Delhi', 'Haryana', 'Himachal Pradesh'],
  'Himachal Pradesh|Delhi': ['Himachal Pradesh', 'Haryana', 'Delhi'],
  'Delhi|Punjab': ['Delhi', 'Haryana', 'Punjab'],
  'Punjab|Delhi': ['Punjab', 'Haryana', 'Delhi'],
  'Delhi|Jammu & Kashmir': ['Delhi', 'Haryana', 'Punjab', 'Jammu & Kashmir'],
  'Jammu & Kashmir|Delhi': ['Jammu & Kashmir', 'Punjab', 'Haryana', 'Delhi'],
  'Delhi|Rajasthan': ['Delhi', 'Haryana', 'Rajasthan'],
  'Rajasthan|Delhi': ['Rajasthan', 'Haryana', 'Delhi'],
  'Delhi|Madhya Pradesh': ['Delhi', 'Uttar Pradesh', 'Madhya Pradesh'],
  'Madhya Pradesh|Delhi': ['Madhya Pradesh', 'Uttar Pradesh', 'Delhi'],
  'Delhi|Bihar': ['Delhi', 'Uttar Pradesh', 'Bihar'],
  'Bihar|Delhi': ['Bihar', 'Uttar Pradesh', 'Delhi'],
  'Haryana|Uttarakhand': ['Haryana', 'Delhi', 'Uttar Pradesh', 'Uttarakhand'],
  'Uttarakhand|Haryana': ['Uttarakhand', 'Uttar Pradesh', 'Delhi', 'Haryana'],
  'Uttar Pradesh|Himachal Pradesh': ['Uttar Pradesh', 'Delhi', 'Haryana', 'Himachal Pradesh'],
  'Himachal Pradesh|Uttar Pradesh': ['Himachal Pradesh', 'Haryana', 'Delhi', 'Uttar Pradesh'],
  'Uttar Pradesh|Punjab': ['Uttar Pradesh', 'Delhi', 'Haryana', 'Punjab'],
  'Punjab|Uttar Pradesh': ['Punjab', 'Haryana', 'Delhi', 'Uttar Pradesh'],
  'Maharashtra|Goa': ['Maharashtra', 'Karnataka', 'Goa'],
  'Goa|Maharashtra': ['Goa', 'Karnataka', 'Maharashtra']
};

const INDIA_STATE_ADJACENCY: Record<string, string[]> = {
  'Delhi': ['Uttar Pradesh', 'Haryana'],
  'Haryana': ['Delhi', 'Punjab', 'Himachal Pradesh', 'Rajasthan', 'Uttar Pradesh'],
  'Punjab': ['Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Rajasthan'],
  'Himachal Pradesh': ['Haryana', 'Punjab', 'Uttarakhand', 'Jammu & Kashmir'],
  'Jammu & Kashmir': ['Punjab', 'Himachal Pradesh'],
  'Uttarakhand': ['Uttar Pradesh', 'Himachal Pradesh'],
  'Uttar Pradesh': ['Delhi', 'Uttarakhand', 'Haryana', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Jharkhand', 'Chhattisgarh'],
  'Rajasthan': ['Haryana', 'Punjab', 'Uttar Pradesh', 'Madhya Pradesh', 'Gujarat'],
  'Gujarat': ['Rajasthan', 'Madhya Pradesh', 'Maharashtra'],
  'Madhya Pradesh': ['Uttar Pradesh', 'Rajasthan', 'Gujarat', 'Maharashtra', 'Chhattisgarh'],
  'Maharashtra': ['Gujarat', 'Madhya Pradesh', 'Chhattisgarh', 'Telangana', 'Karnataka', 'Goa'],
  'Goa': ['Maharashtra', 'Karnataka'],
  'Karnataka': ['Maharashtra', 'Goa', 'Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Kerala'],
  'Kerala': ['Karnataka', 'Tamil Nadu'],
  'Tamil Nadu': ['Karnataka', 'Kerala', 'Andhra Pradesh', 'Puducherry'],
  'Puducherry': ['Tamil Nadu'],
  'Andhra Pradesh': ['Tamil Nadu', 'Karnataka', 'Telangana', 'Odisha', 'Chhattisgarh'],
  'Telangana': ['Maharashtra', 'Karnataka', 'Andhra Pradesh', 'Chhattisgarh'],
  'Chhattisgarh': ['Madhya Pradesh', 'Uttar Pradesh', 'Jharkhand', 'Odisha', 'Telangana', 'Maharashtra'],
  'Odisha': ['West Bengal', 'Jharkhand', 'Chhattisgarh', 'Andhra Pradesh'],
  'Bihar': ['Uttar Pradesh', 'Jharkhand', 'West Bengal'],
  'Jharkhand': ['Bihar', 'Uttar Pradesh', 'Chhattisgarh', 'Odisha', 'West Bengal'],
  'West Bengal': ['Bihar', 'Jharkhand', 'Odisha', 'North East'],
  'North East': ['West Bengal']
};

const STATE_PERMIT_BASE_RATES_SEDAN: Record<string, { tax: number; desc: string }> = {
  'Uttar Pradesh': { tax: 200, desc: 'UP State Entry Permit Tax' },
  'Uttarakhand': { tax: 250, desc: 'Uttarakhand State Permit & Green Cess' },
  'Haryana': { tax: 150, desc: 'Haryana State Border Permit Tax' },
  'Punjab': { tax: 200, desc: 'Punjab State Entry Permit Tax' },
  'Himachal Pradesh': { tax: 250, desc: 'Himachal State Permit & Green Tax' },
  'Rajasthan': { tax: 220, desc: 'Rajasthan State Border Permit Tax' },
  'Delhi': { tax: 150, desc: 'Delhi MCD Commercial Entry Toll' },
  'Jammu & Kashmir': { tax: 280, desc: 'J&K Lakhanpur Entry Permit Tax' },
  'Madhya Pradesh': { tax: 200, desc: 'MP State Border Permit Tax' },
  'Maharashtra': { tax: 220, desc: 'Maharashtra RTO Border Permit' },
  'Goa': { tax: 280, desc: 'Goa State Entry & Green Cess' },
  'Gujarat': { tax: 220, desc: 'Gujarat RTO Checkpost Permit' },
  'Karnataka': { tax: 240, desc: 'Karnataka State Entry Permit' },
  'Tamil Nadu': { tax: 220, desc: 'Tamil Nadu Border Checkpost Permit' },
  'Kerala': { tax: 250, desc: 'Kerala Walayar/Muthanga State Permit' },
  'Puducherry': { tax: 150, desc: 'Puducherry Entry Permit Tax' },
  'Andhra Pradesh': { tax: 220, desc: 'Andhra Pradesh Border Permit' },
  'Telangana': { tax: 220, desc: 'Telangana RTO Entry Permit' },
  'Bihar': { tax: 200, desc: 'Bihar State Entry Permit Tax' },
  'Jharkhand': { tax: 200, desc: 'Jharkhand Border Permit Tax' },
  'West Bengal': { tax: 220, desc: 'West Bengal State Entry Permit' },
  'Odisha': { tax: 200, desc: 'Odisha State Border Permit' },
  'Chhattisgarh': { tax: 200, desc: 'Chhattisgarh Border Permit' },
  'North East': { tax: 280, desc: 'North-East Inter-State Entry Permit' }
};

function normalizeRouteToken(str?: string): string {
  return (str || '').toLowerCase().replace(/[^a-z]/g, '');
}

export function isLocationInHillArea(locationStr?: string): boolean {
  if (!locationStr) return false;
  const norm = normalizeRouteToken(locationStr);
  if (!norm) return false;
  return HILL_STATION_KEYWORDS.some((kw) => norm.includes(kw));
}

export function isLocationInDeepMountain(locationStr?: string): boolean {
  if (!locationStr) return false;
  const norm = normalizeRouteToken(locationStr);
  if (!norm) return false;
  return DEEP_MOUNTAIN_HILL_KEYWORDS.some((kw) => norm.includes(kw));
}

export function isLocationFoothillGateway(locationStr?: string): boolean {
  if (!locationStr) return false;
  const norm = normalizeRouteToken(locationStr);
  if (!norm) return false;
  return FOOTHILL_GATEWAY_KEYWORDS.some((kw) => norm.includes(kw));
}

export function isDailyRouteCity(locationStr?: string): boolean {
  if (!locationStr) return true;
  const norm = normalizeRouteToken(locationStr);
  if (!norm) return true;
  if (isLocationInHillArea(locationStr)) return false;
  return DAILY_ROUTE_HUB_KEYWORDS.some((kw) => norm.includes(kw));
}

/**
 * Parses a pickup time string (e.g., "07:00 AM", "03:00 PM", "18:00") into fractional hours (0 - 23.99)
 */
export function parsePickupHourOfDay(pickupTime?: string): number {
  const raw = (pickupTime || '').trim().toUpperCase();
  if (!raw) return 7.0;

  const amPmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (amPmMatch) {
    let hr = parseInt(amPmMatch[1], 10);
    const min = parseInt(amPmMatch[2], 10) || 0;
    const period = amPmMatch[3];
    if (period === 'PM' && hr < 12) hr += 12;
    if (period === 'AM' && hr === 12) hr = 0;
    return hr + min / 60;
  }

  const h24Match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (h24Match) {
    const hr = parseInt(h24Match[1], 10);
    const min = parseInt(h24Match[2], 10) || 0;
    if (hr >= 0 && hr < 24) return hr + min / 60;
  }

  return 7.0;
}

/**
 * Formats fractional hour of day (can exceed 24 for next-day arrival) into "HH:MM AM/PM"
 */
export function formatHourOfDay(fractionalHour: number): string {
  const totalMinutes = Math.round(((fractionalHour % 24) + 24) % 24 * 60);
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const padH = String(h12).padStart(2, '0');
  const padM = String(mins).padStart(2, '0');
  const nextDaySuffix = fractionalHour >= 24 ? ' (+1 Day)' : '';
  return `${padH}:${padM} ${period}${nextDaySuffix}`;
}

/**
 * Computes Pickup Timing, Drop Timing (Estimated Arrival Time at Drop Location), and Lead-Time Pricing:
 * - Realistic highway speed: 55 km/h plains, 44 km/h one-end hill (half highway + half hill), 32 km/h hill-to-hill.
 * - Night Pickup only triggers for late-night/dawn pickups (10:30 PM to 05:30 AM).
 * - Late Night Drop only triggers if the cab arrives at a Hill Drop after 09:30 PM (21.5) or Plains Drop after 11:00 PM (23.0).
 *   (e.g., 3:00 PM pickup from Dharamshala to Amritsar 200 km arrives at ~07:45 PM in Amritsar -> 0 night surcharge!)
 */
export function computeLeadTimePricing(
  pickupDate?: string,
  pickupTime?: string,
  distanceKm = 230,
  isHillRoute = false,
  hillTier: 'none' | 'foothill_gateway' | 'one_end_hill' | 'both_hills' = 'none',
  dropIsHill = false
): {
  leadTimeTier: 'same_day' | 'tomorrow' | 'advance';
  leadTimeMultiplier: number;
  leadTimeLabel: string;
  estimatedDropTime: string;
  isLateNightDrop: boolean;
  isEarlyOrNightPickup: boolean;
  timingAllowance: number;
} {
  const pickupHour = parsePickupHourOfDay(pickupTime);
  const avgSpeedKmph =
    hillTier === 'both_hills'
      ? 32
      : hillTier === 'one_end_hill' || isHillRoute
      ? 44
      : 55;
  const estimatedDriveHours = Math.max(1.0, distanceKm / avgSpeedKmph + 0.25);
  const arrivalHourContinuous = pickupHour + estimatedDriveHours;
  const arrivalHourOfDay = ((arrivalHourContinuous % 24) + 24) % 24;
  const estimatedDropTime = formatHourOfDay(arrivalHourContinuous);

  // Night / Early Dawn Pickup: 10:30 PM (22.5) to 5:30 AM (5.5)
  const isEarlyOrNightPickup = pickupHour >= 22.5 || pickupHour <= 5.5;

  // Late Night Drop: Only when dropping in Hills after 9:30 PM (21.5) or dropping in Plains after 11:00 PM (23.0)
  const isLateNightDrop = dropIsHill
    ? arrivalHourContinuous >= 21.5 || arrivalHourOfDay <= 4.5
    : arrivalHourContinuous >= 23.0 || arrivalHourOfDay <= 4.5;

  let timingBonusFactor = 0;
  let timingAllowance = 0;

  // Keep Night & Driver charges included in standard one-way/outstation fares (matching CabBazar's Included policy)
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cleanPickup = (pickupDate || '').trim().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanPickup)) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: 1.0,
        leadTimeLabel: isLateNightDrop
          ? `Late Drop (${estimatedDropTime})`
          : isEarlyOrNightPickup
          ? 'Night/Dawn Pickup Slot'
          : 'Standard Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }

    const pickupMs = Date.parse(`${cleanPickup}T00:00:00Z`);
    const todayMs = Date.parse(`${todayIST}T00:00:00Z`);
    if (!Number.isFinite(pickupMs) || !Number.isFinite(todayMs)) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: 1.0,
        leadTimeLabel: 'Standard Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }

    const daysAhead = Math.round((pickupMs - todayMs) / 86400000);
    if (daysAhead <= 0) {
      return {
        leadTimeTier: 'same_day',
        leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
        leadTimeLabel: 'Same-Day Assured Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }
    if (daysAhead === 1) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
        leadTimeLabel: 'Next-Day Assured Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }
    return {
      leadTimeTier: 'advance',
      leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
      leadTimeLabel: 'Advance Assured Rate',
      estimatedDropTime,
      isLateNightDrop,
      isEarlyOrNightPickup,
      timingAllowance
    };
  } catch {
    return {
      leadTimeTier: 'tomorrow',
      leadTimeMultiplier: 1.0,
      leadTimeLabel: 'Standard Rate',
      estimatedDropTime,
      isLateNightDrop,
      isEarlyOrNightPickup,
      timingAllowance
    };
  }
}

/**
 * Computes Hill Station & Mountain Terrain Pricing (Calibrated ₹150–₹200 below CabBazar):
 * - Example: Dharamshala to Amritsar Airport (200 km, Deep Hill Pickup to Plains):
 *   11.2 * 1.32 = ₹14.8/km -> 200 * 14.8 (₹2,960) + ₹420 hill + ₹420 bata + 5% GST = ₹3,990 (CabBazar is ₹4,200!)
 * - Both Pickup & Drop in Hills (e.g. Rudraprayag to Nainital 223 km): 1.36x
 * - One End in Deep Mountain Hills: 1.32x (Hill Pickup) / 1.24x (Hill Drop)
 * - One End in Standard Hill Station: 1.24x (Hill Pickup) / 1.20x (Hill Drop)
 * - Foothill Gateway Corridor (Dehradun, Haridwar, Haldwani, Kathgodam, Corbett, Pathankot): 1.06x
 */
export function computeHillTerrainPricing(
  tripType: TripType,
  pickupCity?: string,
  dropCity?: string
): {
  isHillRoute: boolean;
  pickupIsHill: boolean;
  dropIsHill: boolean;
  hillTier: 'none' | 'foothill_gateway' | 'one_end_hill' | 'both_hills';
  hillRateMultiplier: number;
  hillTierLabel: string;
} {
  const pickupIsHill = isLocationInHillArea(pickupCity);
  const dropIsHill = tripType === 'local' ? pickupIsHill : isLocationInHillArea(dropCity);
  const pickupIsDeep = isLocationInDeepMountain(pickupCity);
  const dropIsDeep = tripType === 'local' ? pickupIsDeep : isLocationInDeepMountain(dropCity);
  const pickupIsGateway = isLocationFoothillGateway(pickupCity);
  const dropIsGateway = tripType === 'local' ? pickupIsGateway : isLocationFoothillGateway(dropCity);

  const isHillRoute = pickupIsHill || dropIsHill;

  if (!isHillRoute) {
    if (pickupIsGateway || dropIsGateway) {
      return {
        isHillRoute: false,
        pickupIsHill: false,
        dropIsHill: false,
        hillTier: 'foothill_gateway',
        hillRateMultiplier: 1.0,
        hillTierLabel: 'Foothill Gateway Corridor'
      };
    }
    return {
      isHillRoute: false,
      pickupIsHill: false,
      dropIsHill: false,
      hillTier: 'none',
      hillRateMultiplier: 1.0,
      hillTierLabel: ''
    };
  }

  if (pickupIsHill && dropIsHill && tripType !== 'local') {
    const isDeepHillToHill = pickupIsDeep || dropIsDeep;
    return {
      isHillRoute: true,
      pickupIsHill: true,
      dropIsHill: true,
      hillTier: 'both_hills',
      hillRateMultiplier: isDeepHillToHill ? 1.30 : 1.26,
      hillTierLabel: isDeepHillToHill
        ? 'Deep Himalayan Hill-to-Hill Terrain'
        : 'Mountain Hill-to-Hill Terrain'
    };
  }

  if (pickupIsDeep || dropIsDeep) {
    return {
      isHillRoute: true,
      pickupIsHill,
      dropIsHill,
      hillTier: 'one_end_hill',
      hillRateMultiplier: 1.26,
      hillTierLabel: pickupIsDeep
        ? 'Hill Station Pickup Terrain'
        : 'Mountain Hill Climb'
    };
  }

  return {
    isHillRoute: true,
    pickupIsHill,
    dropIsHill,
    hillTier: 'one_end_hill',
    hillRateMultiplier: 1.24,
    hillTierLabel: pickupIsHill ? 'Hill Station Pickup Terrain' : 'Hill Station Ghat Climb'
  };
}

/**
 * Computes Pickup & Drop Area Tier Multiplier (Plains Hub vs Outer/Interior Empty Return):
 * - Hill Routes already include hillRateMultiplier so routeTierMultiplier stays 1.00x
 * - Daily Hub Cities: 1.00x
 * - Outer Pickup + Outer Drop: 1.03x
 */
export function computeRouteTierPricing(
  tripType: TripType,
  pickupCity?: string,
  dropCity?: string,
  distanceKm = 200,
  isHillRoute = false
): {
  isOuterRoute: boolean;
  pickupIsOuter: boolean;
  dropIsOuter: boolean;
  routeTierMultiplier: number;
  routeTierLabel: string;
} {
  const pickupIsDaily = isDailyRouteCity(pickupCity);
  const dropIsDaily = tripType === 'local' ? pickupIsDaily : isDailyRouteCity(dropCity);
  const pickupIsOuter = !pickupIsDaily;
  const dropIsOuter = !dropIsDaily;

  // Never stack outer route multiplier on top of hill terrain multiplier
  if (isHillRoute) {
    return {
      isOuterRoute: false,
      pickupIsOuter,
      dropIsOuter,
      routeTierMultiplier: 1.0,
      routeTierLabel: 'Hill Highway Corridor'
    };
  }

  if (tripType === 'local' || tripType === 'airport') {
    if (pickupIsDaily) {
      return {
        isOuterRoute: false,
        pickupIsOuter: false,
        dropIsOuter: false,
        routeTierMultiplier: 1.0,
        routeTierLabel: 'Daily City Hub (Standard Rate)'
      };
    }
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: true,
      routeTierMultiplier: 1.02,
      routeTierLabel: 'Outer City Pickup Zone'
    };
  }

  if (pickupIsDaily && dropIsDaily) {
    return {
      isOuterRoute: false,
      pickupIsOuter: false,
      dropIsOuter: false,
      routeTierMultiplier: 1.0,
      routeTierLabel: 'Daily Highway Corridor'
    };
  }

  if (pickupIsOuter && dropIsOuter) {
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: true,
      routeTierMultiplier: distanceKm > 250 ? 1.03 : 1.02,
      routeTierLabel: 'Outer Pickup & Empty Return Corridor'
    };
  }

  if (pickupIsOuter) {
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: false,
      routeTierMultiplier: 1.02,
      routeTierLabel: 'Outer Pickup Dispatch Zone'
    };
  }

  return {
    isOuterRoute: true,
    pickupIsOuter: false,
    dropIsOuter: true,
    routeTierMultiplier: 1.0,
    routeTierLabel: 'Standard Highway Corridor'
  };
}

export function detectLocationState(locationStr?: string, fallbackState = 'Delhi'): string {
  if (!locationStr) return fallbackState;
  const norm = normalizeRouteToken(locationStr);
  for (const entry of CITY_STATE_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (norm.includes(kw)) {
        return entry.state;
      }
    }
  }
  return fallbackState;
}

export function isHillStationRoute(pickupCity?: string, dropCity?: string): boolean {
  return isLocationInHillArea(pickupCity) || isLocationInHillArea(dropCity);
}

export function computeMultiStateRouteCorridor(
  originState: string,
  destState: string,
  pickupCity = '',
  dropCity = ''
): string[] {
  if (!originState || !destState) return [originState || 'Delhi'];
  if (originState === destState) return [originState];

  const combinedCities = normalizeRouteToken(pickupCity) + ' ' + normalizeRouteToken(dropCity);

  if (
    (originState === 'Delhi' || originState === 'Haryana' || originState === 'Uttar Pradesh') &&
    destState === 'Himachal Pradesh' &&
    PUNJAB_TRANSIT_HIMACHAL_CITIES.some((city) => combinedCities.includes(city))
  ) {
    if (originState === 'Uttar Pradesh') {
      return ['Uttar Pradesh', 'Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh'];
    }
    if (originState === 'Delhi') {
      return ['Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh'];
    }
    return ['Haryana', 'Punjab', 'Himachal Pradesh'];
  }

  if (
    destState === 'Delhi' &&
    originState === 'Himachal Pradesh' &&
    PUNJAB_TRANSIT_HIMACHAL_CITIES.some((city) => combinedCities.includes(city))
  ) {
    return ['Himachal Pradesh', 'Punjab', 'Haryana', 'Delhi'];
  }

  if (
    originState === 'Uttar Pradesh' &&
    destState === 'Rajasthan' &&
    (combinedCities.includes('noida') || combinedCities.includes('ghaziabad') || combinedCities.includes('meerut'))
  ) {
    return ['Uttar Pradesh', 'Delhi', 'Haryana', 'Rajasthan'];
  }

  const pairKey = `${originState}|${destState}`;
  if (EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey]) {
    return EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey];
  }

  const queue: string[][] = [[originState]];
  const visited = new Set<string>([originState]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (current === destState) {
      return path;
    }
    const neighbors = INDIA_STATE_ADJACENCY[current] || [];
    for (const nextState of neighbors) {
      if (!visited.has(nextState)) {
        visited.add(nextState);
        queue.push([...path, nextState]);
      }
    }
  }

  return [originState, destState];
}

export function computeMultiStatePermitBreakdown(
  originState: string,
  destState: string,
  pickupCity = '',
  dropCity = '',
  cabId: CabCategoryId = 'sedan'
): {
  stateRoutePath: string[];
  statePermitBreakdown: StatePermitBreakdownItem[];
  totalStatePermitTax: number;
} {
  const stateRoutePath = computeMultiStateRouteCorridor(originState, destState, pickupCity, dropCity);

  if (stateRoutePath.length <= 1) {
    return {
      stateRoutePath,
      statePermitBreakdown: [],
      totalStatePermitTax: 0
    };
  }

  const vehiclePermitMultiplier =
    cabId === 'hatchback'
      ? 0.8
      : cabId === 'sedan'
      ? 1.0
      : cabId === 'exec_sedan'
      ? 1.1
      : cabId === 'suv'
      ? 1.25
      : cabId === 'innova'
      ? 1.4
      : 1.9;

  const statesEntered = stateRoutePath.slice(1);
  const breakdown: StatePermitBreakdownItem[] = statesEntered.map((stateName, idx) => {
    const isFinalDest = idx === statesEntered.length - 1;
    const role: 'transit' | 'destination' = isFinalDest ? 'destination' : 'transit';
    const baseInfo = STATE_PERMIT_BASE_RATES_SEDAN[stateName] || {
      tax: 200,
      desc: `${stateName} State Entry Permit`
    };
    const roleFactor = role === 'transit' ? 0.5 : 1.0;
    const taxAmount = Math.round((baseInfo.tax * vehiclePermitMultiplier * roleFactor) / 10) * 10;

    const label =
      role === 'transit'
        ? `${stateName} (En-Route Transit State Permit)`
        : `${stateName} (Destination State Entry Permit)`;

    return {
      state: stateName,
      role,
      label,
      taxAmount
    };
  });

  const totalStatePermitTax = breakdown.reduce((sum, item) => sum + item.taxAmount, 0);

  return {
    stateRoutePath,
    statePermitBreakdown: breakdown,
    totalStatePermitTax
  };
}

const VERIFIED_TOLL_FREE_CORRIDORS: string[] = [
  'patna-hajipur',
  'hajipur-patna',
  'patna-sonepur',
  'sonepur-patna',
  'patna-sonpur',
  'sonpur-patna',
  'patna-danapur',
  'danapur-patna',
  'patna-bihta',
  'bihta-patna',
  'patna-arrah',
  'arrah-patna',
  'patna-ara',
  'ara-patna',
  'patna-chhapra',
  'chhapra-patna',
  'patna-chapra',
  'chapra-patna',
  'hajipur-sonepur',
  'sonepur-hajipur',
  'hajipur-danapur',
  'danapur-hajipur',
  'hajipur-bihta',
  'bihta-hajipur',
  'gaya-bodhgaya',
  'bodhgaya-gaya',
  'rajgir-nalanda',
  'nalanda-rajgir',
  'biharsharif-rajgir',
  'rajgir-biharsharif',
  'biharsharif-nalanda',
  'nalanda-biharsharif',
  'delhi-noida',
  'noida-delhi',
  'delhi-greaternoida',
  'greaternoida-delhi',
  'delhi-gurgaon',
  'gurgaon-delhi',
  'delhi-gurugram',
  'gurugram-delhi',
  'delhi-ghaziabad',
  'ghaziabad-delhi',
  'delhi-faridabad',
  'faridabad-delhi',
  'noida-ghaziabad',
  'ghaziabad-noida',
  'noida-greaternoida',
  'greaternoida-noida',
  'gurgaon-faridabad',
  'faridabad-gurgaon',
  'chandigarh-mohali',
  'mohali-chandigarh',
  'chandigarh-panchkula',
  'panchkula-chandigarh',
  'chandigarh-zirakpur',
  'zirakpur-chandigarh',
  'zirakpur-mohali',
  'mohali-zirakpur',
  'zirakpur-panchkula',
  'panchkula-zirakpur',
  'mohali-panchkula',
  'panchkula-mohali',
  'mathura-vrindavan',
  'vrindavan-mathura',
  'agra-fatehpursikri',
  'fatehpursikri-agra',
  'haridwar-rishikesh',
  'rishikesh-haridwar',
  'dehradun-mussoorie',
  'mussoorie-dehradun',
  'dehradun-rishikesh',
  'rishikesh-dehradun',
  'haldwani-nainital',
  'nainital-haldwani',
  'kathgodam-nainital',
  'nainital-kathgodam',
  'nainital-bhimtal',
  'bhimtal-nainital',
  'nainital-almora',
  'almora-nainital',
  'shimla-kufri',
  'kufri-shimla',
  'shimla-narkanda',
  'narkanda-shimla',
  'shimla-chail',
  'chail-shimla',
  'kullu-manali',
  'manali-kullu',
  'kullu-kasol',
  'kasol-kullu',
  'manali-kasol',
  'kasol-manali',
  'dharamshala-mcleodganj',
  'mcleodganj-dharamshala',
  'dharamshala-kangra',
  'kangra-dharamshala',
  'dharamshala-palampur',
  'palampur-dharamshala',
  'kangra-palampur',
  'palampur-kangra',
  'kangra-nagrota',
  'nagrota-kangra',
  'dalhousie-khajjiar',
  'khajjiar-dalhousie',
  'kolkata-howrah',
  'howrah-kolkata',
  'mumbai-thane',
  'thane-mumbai',
  'mumbai-navimumbai',
  'navimumbai-mumbai',
  'pune-lonavala',
  'lonavala-pune',
  'lonavala-khandala',
  'khandala-lonavala',
  'mahabaleshwar-panchgani',
  'panchgani-mahabaleshwar',
  'hyderabad-secunderabad',
  'secunderabad-hyderabad',
  'ahmedabad-gandhinagar',
  'gandhinagar-ahmedabad',
  'ajmer-pushkar',
  'pushkar-ajmer',
  'puri-konark',
  'konark-puri',
  'ooty-coonoor',
  'coonoor-ooty',
  'guwahati-shillong',
  'shillong-guwahati',
  'shillong-cherrapunji',
  'cherrapunji-shillong',
  'siliguri-darjeeling',
  'darjeeling-siliguri',
  'siliguri-gangtok',
  'gangtok-siliguri'
];

// Real Geolocation Database of Active Indian NHAI / Expressway Toll Plazas for Polyline Spatial Counting
export interface NhaiTollPlazaPoint {
  id: string;
  name: string;
  highway: string;
  lat: number;
  lng: number;
  carRate: number;
}

export const VERIFIED_NHAI_TOLL_PLAZAS: NhaiTollPlazaPoint[] = [
  // NH-44 North (Delhi - Panipat - Karnal - Ambala - Ludhiana - Jalandhar - Amritsar)
  { id: 'murthal_nh44', name: 'Murthal / Bhagan Toll Plaza', highway: 'NH-44', lat: 29.064, lng: 77.068, carRate: 105 },
  { id: 'panipat_nh44', name: 'Panipat Elevated Toll Plaza', highway: 'NH-44', lat: 29.392, lng: 76.969, carRate: 40 },
  { id: 'gharaunda_nh44', name: 'Gharaunda (Karnal) Toll Plaza', highway: 'NH-44', lat: 29.538, lng: 76.971, carRate: 145 },
  { id: 'ghaggar_nh44', name: 'Ghaggar (Ambala) Toll Plaza', highway: 'NH-44', lat: 30.398, lng: 76.775, carRate: 95 },
  { id: 'ladowal_nh44', name: 'Ladowal (Ludhiana) Toll Plaza', highway: 'NH-44', lat: 30.978, lng: 75.792, carRate: 150 },
  { id: 'nijjarpura_nh44', name: 'Nijjarpura (Amritsar) Toll Plaza', highway: 'NH-44', lat: 31.592, lng: 75.012, carRate: 115 },
  // Punjab - Himachal Gateways (NH-5, NH-205, NH-503)
  { id: 'chandimandir_nh5', name: 'Chandimandir (Himalayan Expwy) Toll', highway: 'NH-5', lat: 30.752, lng: 76.895, carRate: 40 },
  { id: 'sanwara_nh5', name: 'Sanwara (Solan) Toll Plaza', highway: 'NH-5', lat: 30.875, lng: 76.985, carRate: 75 },
  { id: 'solakhian_nh205', name: 'Solakhian (Ropar) Toll Plaza', highway: 'NH-205', lat: 30.922, lng: 76.565, carRate: 65 },
  { id: 'behrampur_nh205', name: 'Behrampur (Kiratpur) Toll Plaza', highway: 'NH-205', lat: 31.158, lng: 76.578, carRate: 70 },
  { id: 'takoli_nh21', name: 'Takoli (Kullu-Manali) Toll Plaza', highway: 'NH-3', lat: 31.832, lng: 77.175, carRate: 75 },
  // Yamuna Expressway & Agra - Lucknow
  { id: 'jewar_yeida', name: 'Jewar (Yamuna Expwy) Toll Plaza', highway: 'Yamuna Expwy', lat: 28.148, lng: 77.588, carRate: 165 },
  { id: 'mathura_yeida', name: 'Mathura (Yamuna Expwy) Toll Plaza', highway: 'Yamuna Expwy', lat: 27.585, lng: 77.742, carRate: 155 },
  { id: 'agra_yeida', name: 'Agra (Yamuna Expwy) Toll Plaza', highway: 'Yamuna Expwy', lat: 27.232, lng: 78.082, carRate: 145 },
  { id: 'mahuvan_nh19', name: 'Mahuvan (Mathura NH-19) Toll Plaza', highway: 'NH-19', lat: 27.412, lng: 77.721, carRate: 125 },
  { id: 'fatehabad_ale', name: 'Agra-Lucknow Expressway Toll Plaza', highway: 'Agra-Lucknow Expwy', lat: 27.032, lng: 78.312, carRate: 315 },
  // Delhi - Meerut - Haridwar - Dehradun & Delhi - Moradabad (NH-9)
  { id: 'kashi_dme', name: 'Kashi (Delhi-Meerut Expwy) Toll', highway: 'NE-3', lat: 28.912, lng: 77.672, carRate: 155 },
  { id: 'saini_nh334', name: 'Saini (Muzaffarnagar) Toll Plaza', highway: 'NH-334', lat: 29.365, lng: 77.715, carRate: 90 },
  { id: 'bahadrabad_nh334', name: 'Bahadrabad (Haridwar) Toll Plaza', highway: 'NH-334', lat: 29.918, lng: 78.038, carRate: 65 },
  { id: 'lacchiwala_nh7', name: 'Lacchiwala (Dehradun) Toll Plaza', highway: 'NH-7', lat: 30.215, lng: 78.132, carRate: 95 },
  { id: 'chhijarsi_nh9', name: 'Chhijarsi (Pilkhuwa) Toll Plaza', highway: 'NH-9', lat: 28.705, lng: 77.612, carRate: 155 },
  { id: 'brijghat_nh9', name: 'Brijghat (Garhmukteshwar) Toll Plaza', highway: 'NH-9', lat: 28.775, lng: 78.135, carRate: 105 },
  { id: 'joya_nh9', name: 'Joya (Moradabad) Toll Plaza', highway: 'NH-9', lat: 28.838, lng: 78.512, carRate: 85 },
  // Delhi - Jaipur - Udaipur - Ahmedabad (NH-48)
  { id: 'kherki_nh48', name: 'Kherki Daula (Gurugram) Toll Plaza', highway: 'NH-48', lat: 28.395, lng: 76.982, carRate: 85 },
  { id: 'shahjahanpur_nh48', name: 'Shahjahanpur (NH-48) Toll Plaza', highway: 'NH-48', lat: 27.985, lng: 76.432, carRate: 165 },
  { id: 'manoharpur_nh48', name: 'Manoharpur (Jaipur) Toll Plaza', highway: 'NH-48', lat: 27.305, lng: 75.948, carRate: 85 },
  { id: 'thikariya_nh48', name: 'Thikariya (Jaipur-Ajmer) Toll Plaza', highway: 'NH-48', lat: 26.822, lng: 75.612, carRate: 110 },
  { id: 'kishangarh_nh48', name: 'Kishangarh (Ajmer) Toll Plaza', highway: 'NH-48', lat: 26.585, lng: 74.885, carRate: 95 },
  // Bihar NHAI Plazas (Patna - Muzaffarpur - Darbhanga - Gaya - Bakhtiyarpur)
  { id: 'goraul_nh22', name: 'Goraul (Hajipur-Muzaffarpur) Toll Plaza', highway: 'NH-22', lat: 25.925, lng: 85.325, carRate: 110 },
  { id: 'maithi_nh27', name: 'Maithi (Muzaffarpur-Darbhanga) Toll', highway: 'NH-27', lat: 26.155, lng: 85.645, carRate: 85 },
  { id: 'didarganj_nh30', name: 'Didarganj (Patna-Bakhtiyarpur) Toll', highway: 'NH-30', lat: 25.568, lng: 85.248, carRate: 120 },
  { id: 'kewali_nh22', name: 'Kewali (Patna-Gaya) Toll Plaza', highway: 'NH-22', lat: 25.185, lng: 85.005, carRate: 85 },
  // UP East (Lucknow - Ayodhya - Varanasi)
  { id: 'ahmadpur_nh27', name: 'Ahmadpur (Barabanki) Toll Plaza', highway: 'NH-27', lat: 26.865, lng: 81.465, carRate: 105 },
  { id: 'ronahi_nh27', name: 'Ronahi (Ayodhya) Toll Plaza', highway: 'NH-27', lat: 26.765, lng: 81.985, carRate: 90 },
  { id: 'hauz_nh31', name: 'Hauz (Jaunpur-Varanasi) Toll Plaza', highway: 'NH-31', lat: 25.675, lng: 82.735, carRate: 115 },
  // Maharashtra (Mumbai - Pune - Nashik - Satara)
  { id: 'khalapur_mpew', name: 'Khalapur (Mumbai-Pune Expwy) Toll', highway: 'MPEW', lat: 18.815, lng: 73.295, carRate: 240 },
  { id: 'talegaon_mpew', name: 'Talegaon (Mumbai-Pune Expwy) Toll', highway: 'MPEW', lat: 18.715, lng: 73.685, carRate: 80 },
  { id: 'khedshivapur_nh48', name: 'Khed Shivapur (Pune-Satara) Toll', highway: 'NH-48', lat: 18.338, lng: 73.848, carRate: 135 },
  { id: 'padgha_nh160', name: 'Padgha (Mumbai-Nashik) Toll Plaza', highway: 'NH-160', lat: 19.355, lng: 73.175, carRate: 120 },
  { id: 'ghoti_nh160', name: 'Ghoti (Igatpuri-Nashik) Toll Plaza', highway: 'NH-160', lat: 19.725, lng: 73.625, carRate: 115 },
  // South India (Bangalore - Mysore - Chennai - Tirupati)
  { id: 'kaniminike_nh275', name: 'Kaniminike (Bangalore-Mysore Expwy) Toll', highway: 'NH-275', lat: 12.878, lng: 77.445, carRate: 170 },
  { id: 'gananguru_nh275', name: 'Gananguru (Srirangapatna) Toll Plaza', highway: 'NH-275', lat: 12.448, lng: 76.725, carRate: 165 },
  { id: 'attibele_nh48', name: 'Attibele (Bangalore-Hosur) Toll Plaza', highway: 'NH-48', lat: 12.778, lng: 77.772, carRate: 35 },
  { id: 'krishnagiri_nh48', name: 'Krishnagiri (NH-48) Toll Plaza', highway: 'NH-48', lat: 12.532, lng: 78.215, carRate: 95 },
  { id: 'pallikonda_nh48', name: 'Pallikonda (Vellore) Toll Plaza', highway: 'NH-48', lat: 12.905, lng: 78.945, carRate: 105 }
];

function haversineDistanceKmPoints(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentDistanceKm(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  if (dx === 0 && dy === 0) {
    return haversineDistanceKmPoints(pLat, pLng, aLat, aLng);
  }
  const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)));
  const projLng = aLng + t * dx;
  const projLat = aLat + t * dy;
  return haversineDistanceKmPoints(pLat, pLng, projLat, projLng);
}

/**
 * Count actual NHAI Toll Plazas along a route polyline (Array of [lng, lat] coordinates).
 */
export function countTollPlazasAlongPolyline(
  routeGeometry?: Array<[number, number]>,
  corridorThresholdKm = 11
): { tollPlazas: string[]; totalCarToll: number; plazaCount: number } {
  if (!Array.isArray(routeGeometry) || routeGeometry.length < 2) {
    return { tollPlazas: [], totalCarToll: 0, plazaCount: 0 };
  }

  const matchedPlazas: NhaiTollPlazaPoint[] = [];

  for (const plaza of VERIFIED_NHAI_TOLL_PLAZAS) {
    let minDistanceKm = Infinity;
    for (let i = 0; i < routeGeometry.length - 1; i++) {
      const [lng1, lat1] = routeGeometry[i];
      const [lng2, lat2] = routeGeometry[i + 1];
      if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
        continue;
      }
      const dist = pointToSegmentDistanceKm(plaza.lat, plaza.lng, lat1, lng1, lat2, lng2);
      if (dist < minDistanceKm) {
        minDistanceKm = dist;
        if (minDistanceKm <= corridorThresholdKm) break;
      }
    }
    if (minDistanceKm <= corridorThresholdKm) {
      matchedPlazas.push(plaza);
    }
  }

  const totalCarToll = matchedPlazas.reduce((sum, p) => sum + p.carRate, 0);
  return {
    tollPlazas: matchedPlazas.map((p) => p.name),
    totalCarToll,
    plazaCount: matchedPlazas.length
  };
}

export function lookupRouteExpresswayToll(
  pickupCity?: string,
  dropCity?: string,
  distanceKm = 230,
  cabId: CabCategoryId = 'sedan',
  routeGeometry?: Array<[number, number]>
): {
  baseTollOneWay: number;
  expresswayName: string;
  tollPlazaCount: number;
  tollPlazas: string[];
} {
  const nFrom = normalizeRouteToken(pickupCity);
  const nTo = normalizeRouteToken(dropCity);
  const vehicleTollMultiplier = cabId === 'tempo' ? 1.45 : 1.0;

  // 1. Same-city or verified toll-free corridor (e.g., Patna to Hajipur via Gandhi Setu / JP Setu, NCR hops, Tricity hops, Hill-to-Hill)
  if (nFrom && nTo) {
    if (nFrom === nTo) {
      return {
        baseTollOneWay: 0,
        expresswayName: 'Intra-City Route (0 Toll Plazas · ₹0 Toll)',
        tollPlazaCount: 0,
        tollPlazas: []
      };
    }

    for (const pairKey of VERIFIED_TOLL_FREE_CORRIDORS) {
      const [c1, c2] = pairKey.split('-');
      if (nFrom.includes(c1) && nTo.includes(c2)) {
        return {
          baseTollOneWay: 0,
          expresswayName: 'Toll-Free Corridor (0 Toll Plazas · ₹0 Toll)',
          tollPlazaCount: 0,
          tollPlazas: []
        };
      }
    }
  }

  // 2. Check Verified Expressway / National Highway Corridor Table with exact counted plazas
  if (nFrom && nTo) {
    for (const [pairKey, info] of Object.entries(VERIFIED_EXPRESSWAY_TOLLS)) {
      const [c1, c2] = pairKey.split('-');
      if (nFrom.includes(c1) && nTo.includes(c2)) {
        return {
          baseTollOneWay: Math.round(info.toll * vehicleTollMultiplier),
          expresswayName: info.name,
          tollPlazaCount: info.plazaCount,
          tollPlazas: info.plazas
        };
      }
    }
  }

  // 3. Zero Toll on Short Inter-City Routes (<= 65 KM) without a dedicated tolled expressway
  if (distanceKm <= 65) {
    return {
      baseTollOneWay: 0,
      expresswayName: 'Short Inter-City Route (0 Toll Plazas · ₹0 Toll)',
      tollPlazaCount: 0,
      tollPlazas: []
    };
  }

  // 4. Mountain Hill-to-Hill Routes (e.g., inside Himachal, Uttarakhand, Kashmir, Sikkim): Mountain roads have 0 NHAI toll plazas
  const pickupIsHill = isLocationInHillArea(pickupCity);
  const dropIsHill = isLocationInHillArea(dropCity);
  if (pickupIsHill && dropIsHill) {
    return {
      baseTollOneWay: 0,
      expresswayName: 'Mountain Hill Road (0 Toll Plazas · ₹0 Toll)',
      tollPlazaCount: 0,
      tollPlazas: []
    };
  }

  // 5. Real Polyline Spatial Check against NHAI Toll Plaza Coordinates
  if (Array.isArray(routeGeometry) && routeGeometry.length >= 2) {
    const polyToll = countTollPlazasAlongPolyline(routeGeometry, 11);
    if (polyToll.plazaCount > 0) {
      return {
        baseTollOneWay: Math.round(polyToll.totalCarToll * vehicleTollMultiplier),
        expresswayName: `NHAI FASTag (${polyToll.plazaCount} Counted Toll Plaza${polyToll.plazaCount > 1 ? 's' : ''})`,
        tollPlazaCount: polyToll.plazaCount,
        tollPlazas: polyToll.tollPlazas
      };
    }
  }

  // 6. Realistic Discrete Toll Plaza Counting (No blind per-KM buffer inflation!)
  // If one end is in the hills (e.g., Plains to Hill Station), only the foothills/plains approach leg has NHAI plazas
  if (pickupIsHill || dropIsHill) {
    const plainsSegmentKm = Math.max(0, Math.round(distanceKm * 0.42));
    const hillApproachPlazas = plainsSegmentKm < 60 ? 0 : Math.min(3, Math.floor(plainsSegmentKm / 65));
    if (hillApproachPlazas === 0) {
      return {
        baseTollOneWay: 0,
        expresswayName: 'Foothill-to-Hill Route (0 Toll Plazas · ₹0 Toll)',
        tollPlazaCount: 0,
        tollPlazas: []
      };
    }
    const perPlazaRate = Math.round(70 * vehicleTollMultiplier);
    const plazaLabels = Array.from({ length: hillApproachPlazas }, (_, i) => `NHAI Foothill Plaza #${i + 1}`);
    return {
      baseTollOneWay: hillApproachPlazas * perPlazaRate,
      expresswayName: `NHAI Foothill Approach (${hillApproachPlazas} Toll Plaza${hillApproachPlazas > 1 ? 's' : ''})`,
      tollPlazaCount: hillApproachPlazas,
      tollPlazas: plazaLabels
    };
  }

  // Standard National Highway discrete plaza spacing (~1 NHAI plaza every 80 KM after initial 30 KM urban exit)
  const countedPlazas = distanceKm < 75 ? 0 : Math.max(1, Math.floor((distanceKm - 20) / 80));
  if (countedPlazas === 0) {
    return {
      baseTollOneWay: 0,
      expresswayName: 'Regional Highway (0 Toll Plazas · ₹0 Toll)',
      tollPlazaCount: 0,
      tollPlazas: []
    };
  }

  const avgPlazaRate = Math.round(75 * vehicleTollMultiplier);
  const plazaNames = Array.from({ length: countedPlazas }, (_, i) => `NHAI Highway Plaza #${i + 1}`);
  return {
    baseTollOneWay: countedPlazas * avgPlazaRate,
    expresswayName: `NHAI Highway FASTag (${countedPlazas} Toll Plaza${countedPlazas > 1 ? 's' : ''})`,
    tollPlazaCount: countedPlazas,
    tollPlazas: plazaNames
  };
}

export interface RoundTripFareBreakdown {
  vehicleType: string;
  totalKm: number;
  numberOfDays: number;
  chargeableKm: number;
  perKmRate: number;
  baseDistanceFare: number;
  driverAllowance: number;
  nightAllowance: number;
  totalFare: number;
  note: string;
}

/**
 * Safar India Cabs - Round Trip Fare Calculation Logic
 */
export function calculateRoundTripFare(
  totalKm: number,
  numberOfDays: number,
  vehicleType: string,
  nightHalts = 0,
  hillMultiplier = 1.0
): RoundTripFareBreakdown {
  const adminCfg = getAdminPricingConfigSync();
  const vKey = String(vehicleType || 'sedan').toLowerCase() as CabCategoryId;
  const adminVeh = adminCfg.vehicles?.[vKey] || adminCfg.vehicles?.sedan;

  const rates: Record<
    string,
    { perKmRate: number; driverAllowancePerDay: number; nightChargePerNight: number }
  > = {
    HATCHBACK: {
      perKmRate: adminCfg.vehicles?.hatchback?.roundTripRatePerKm ?? 10.5,
      driverAllowancePerDay: adminCfg.vehicles?.hatchback?.driverAllowancePerDay ?? 240,
      nightChargePerNight: adminCfg.vehicles?.hatchback?.nightChargePerNight ?? 250
    },
    SEDAN: {
      perKmRate: adminCfg.vehicles?.sedan?.roundTripRatePerKm ?? 11.5,
      driverAllowancePerDay: adminCfg.vehicles?.sedan?.driverAllowancePerDay ?? 260,
      nightChargePerNight: adminCfg.vehicles?.sedan?.nightChargePerNight ?? 250
    },
    EXEC_SEDAN: {
      perKmRate: adminCfg.vehicles?.exec_sedan?.roundTripRatePerKm ?? 13.0,
      driverAllowancePerDay: adminCfg.vehicles?.exec_sedan?.driverAllowancePerDay ?? 300,
      nightChargePerNight: adminCfg.vehicles?.exec_sedan?.nightChargePerNight ?? 300
    },
    SUV: {
      perKmRate: adminCfg.vehicles?.suv?.roundTripRatePerKm ?? 15.0,
      driverAllowancePerDay: adminCfg.vehicles?.suv?.driverAllowancePerDay ?? 320,
      nightChargePerNight: adminCfg.vehicles?.suv?.nightChargePerNight ?? 300
    },
    INNOVA: {
      perKmRate: adminCfg.vehicles?.innova?.roundTripRatePerKm ?? 19.0,
      driverAllowancePerDay: adminCfg.vehicles?.innova?.driverAllowancePerDay ?? 380,
      nightChargePerNight: adminCfg.vehicles?.innova?.nightChargePerNight ?? 350
    },
    TEMPO: {
      perKmRate: adminCfg.vehicles?.tempo?.roundTripRatePerKm ?? 24.5,
      driverAllowancePerDay: adminCfg.vehicles?.tempo?.driverAllowancePerDay ?? 480,
      nightChargePerNight: adminCfg.vehicles?.tempo?.nightChargePerNight ?? 450
    }
  };

  const selectedConfig =
    rates[String(vehicleType || 'SEDAN').toUpperCase()] ||
    (adminVeh
      ? {
          perKmRate: adminVeh.roundTripRatePerKm,
          driverAllowancePerDay: adminVeh.driverAllowancePerDay,
          nightChargePerNight: adminVeh.nightChargePerNight
        }
      : rates['SEDAN']);

  // Minimum KM Rule (Admin-configurable, default 250 KM per day)
  const MIN_KM_PER_DAY = adminCfg.minRoundTripKmPerDay || 250;
  const minChargeableKm = numberOfDays * MIN_KM_PER_DAY;
  const finalChargeableKm = Math.max(totalKm, minChargeableKm);

  const effectivePerKmRate = Number((selectedConfig.perKmRate * hillMultiplier).toFixed(1));
  const baseDistanceFare = Math.round(finalChargeableKm * effectivePerKmRate);
  const totalDriverAllowance = numberOfDays * selectedConfig.driverAllowancePerDay;
  const totalNightAllowance = nightHalts * selectedConfig.nightChargePerNight;
  const totalFare = baseDistanceFare + totalDriverAllowance + totalNightAllowance;

  return {
    vehicleType,
    totalKm,
    numberOfDays,
    chargeableKm: finalChargeableKm,
    perKmRate: effectivePerKmRate,
    baseDistanceFare,
    driverAllowance: totalDriverAllowance,
    nightAllowance: totalNightAllowance,
    totalFare,
    note: 'Toll Taxes, State Border Entry Taxes, and Parking fees are extra to be paid directly by customer.'
  };
}

/**
 * SafarIndiaCabs Dynamic Fare Engine (Calibrated ₹150–₹200 below CabBazar / Gozo / Savaari)
 * Evaluates Pickup Location, Drop Location, Pickup Timing, Drop Arrival Timing, and Hill Station Tiers.
 * (100% synchronized with computeServerTripFare in /api/bookings.js)
 */
export function computeTripFare(params: {
  tripType: TripType;
  cabId: CabCategoryId;
  distanceKm: number;
  extraKm?: number;
  pickupCity?: string;
  dropCity?: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  localPackageId?: string;
  includeTolls?: boolean;
  addonCarrier?: boolean;
  addonPet?: boolean;
  addonAssuredModel?: boolean;
  promoCode?: string;
  promoDiscount?: number | boolean;
  customerName?: string;
  routeGeometry?: Array<[number, number]>;
}): FareCalculationResult {
  const {
    tripType,
    cabId,
    distanceKm,
    extraKm = 0,
    pickupCity = '',
    dropCity = '',
    pickupDate = '',
    pickupTime = '',
    returnDate,
    localPackageId = '8h_80k',
    includeTolls = false,
    addonCarrier = false,
    addonPet = false,
    addonAssuredModel = false,
    promoCode = '',
    promoDiscount = 0,
    customerName = '',
    routeGeometry
  } = params;

  const cab = CABS_FLEET.find((c) => c.id === cabId) || CABS_FLEET[0];
  const adminCfg = getAdminPricingConfigSync();
  const adminVehicle = adminCfg.vehicles?.[cabId];

  const oneWayRate = adminVehicle?.ratePerKm ?? cab.ratePerKm;
  const baseExtraKmRate = adminVehicle?.extraKmRate ?? (cab.extraKmRate || Math.round(cab.ratePerKm + 1));
  const dailyBata = adminVehicle?.driverAllowancePerDay ?? (cab.driverAllowancePerDay || 320);
  const hillBase = adminVehicle?.hillStationCharge ?? (cab.hillStationCharge || 420);
  const local8HrBase = adminVehicle?.local8Hr80KmFare ?? (cab.local8Hr80KmFare || 1999);
  const minOneWaySlabKm = adminCfg.minOneWayBillableKm || 130;

  const cleanExtraKm = Math.max(0, Math.round(Number(extraKm || 0)));

  // 1. Hill Station, Deep Mountain & Foothill Gateway Pricing
  const {
    isHillRoute,
    pickupIsHill,
    dropIsHill,
    hillTier,
    hillRateMultiplier,
    hillTierLabel
  } = computeHillTerrainPricing(tripType, pickupCity, dropCity);

  // 2. Pickup Timing, Drop Arrival Timing & Booking Lead-Time Pricing
  const {
    leadTimeTier,
    leadTimeMultiplier,
    leadTimeLabel,
    estimatedDropTime,
    isLateNightDrop,
    isEarlyOrNightPickup,
    timingAllowance
  } = computeLeadTimePricing(pickupDate, pickupTime, distanceKm, isHillRoute, hillTier, dropIsHill);

  // 3. Pickup Area & Drop Area (Outer / Empty Return Deadhead) Pricing
  const {
    isOuterRoute,
    pickupIsOuter,
    dropIsOuter,
    routeTierMultiplier,
    routeTierLabel
  } = computeRouteTierPricing(tripType, pickupCity, dropCity, distanceKm, isHillRoute);

  const dynamicRateFactor = leadTimeMultiplier * routeTierMultiplier * hillRateMultiplier;

  const extraHourRate =
    cabId === 'hatchback'
      ? 130
      : cabId === 'sedan'
      ? 150
      : cabId === 'exec_sedan'
      ? 180
      : cabId === 'suv'
      ? 200
      : cabId === 'innova'
      ? 260
      : 350;

  let baseBilledDistanceKm = Math.max(0, Math.round(distanceKm));
  let ratePerKm = oneWayRate;
  let baseRouteFare = 0;
  let driverAllowance = 0;
  let nightCharges = 0;
  let daysCount = 1;

  const originState = detectLocationState(pickupCity, 'Delhi');
  const destState =
    tripType === 'local'
      ? originState
      : detectLocationState(dropCity, pickupCity ? originState : 'Uttar Pradesh');
  const isInterState =
    tripType !== 'local' &&
    tripType !== 'airport' &&
    Boolean(originState && destState && originState !== destState);

  let hillStationCharge = 0;
  const hillDriverBonusPerDay = 0;

  if (tripType === 'oneway') {
    // Do NOT force a 130 KM minimum slab on short routes (e.g., Patna to Hajipur ~27 KM).
    // Always preserve the actual road distance on cab cards and billing.
    const actualRoundedKm = Math.max(1, Math.round(distanceKm));
    baseBilledDistanceKm = actualRoundedKm;

    // Keep slab factor flat (1.0x) on standard intercity routes so prices remain ₹200 below market
    const slabFactor = isHillRoute
      ? 1.0
      : baseBilledDistanceKm <= 130
      ? 1.02
      : 1.0;

    ratePerKm = Number((oneWayRate * slabFactor * dynamicRateFactor).toFixed(1));

    hillStationCharge =
      hillTier === 'both_hills'
        ? Math.round(hillBase * 1.15)
        : hillTier === 'one_end_hill'
        ? hillBase
        : 0;

    // For short inter-city hops (< 55 KM), apply a fair minimum dispatch base fare while keeping billedDistanceKm = actual KM
    const shortTripMinBase =
      cab.id === 'hatchback'
        ? 480
        : cab.id === 'sedan'
        ? 540
        : cab.id === 'exec_sedan'
        ? 660
        : cab.id === 'suv'
        ? 760
        : cab.id === 'innova'
        ? 950
        : 1350;

    baseRouteFare =
      baseBilledDistanceKm < 55
        ? Math.max(shortTripMinBase, Math.round(baseBilledDistanceKm * ratePerKm))
        : Math.round(baseBilledDistanceKm * ratePerKm);

    const oneWayDriverDays = baseBilledDistanceKm > 500 ? 1.5 : 1;

    driverAllowance = Math.round((dailyBata + hillDriverBonusPerDay) * oneWayDriverDays);
    nightCharges = timingAllowance;
  } else if (tripType === 'roundtrip') {
    if (pickupDate && returnDate) {
      const p = new Date(pickupDate).getTime();
      const r = new Date(returnDate).getTime();
      if (Number.isFinite(p) && Number.isFinite(r)) {
        const diffDays = Math.ceil((r - p) / (1000 * 60 * 60 * 24));
        daysCount = Math.max(1, diffDays + 1);
      }
    }
    const actualTwoWayKm = Math.round(distanceKm * 2);
    const nightHalts = Math.max(0, daysCount - 1);
    const rtHillFactor =
      hillTier === 'both_hills' ? 1.12 : hillTier === 'one_end_hill' ? 1.08 : 1.0;
    const rtFare = calculateRoundTripFare(
      actualTwoWayKm,
      daysCount,
      cabId.toUpperCase(),
      nightHalts,
      rtHillFactor
    );

    baseBilledDistanceKm = rtFare.chargeableKm;
    ratePerKm = rtFare.perKmRate;
    baseRouteFare = rtFare.baseDistanceFare;
    driverAllowance = rtFare.driverAllowance + hillDriverBonusPerDay * daysCount;
    nightCharges = rtFare.nightAllowance;
    hillStationCharge =
      hillTier === 'both_hills'
        ? Math.round(hillBase * 1.15)
        : hillTier === 'one_end_hill'
        ? hillBase
        : 0;
  } else if (tripType === 'local') {
    const adjustedLocal8HrBase = Math.round(local8HrBase * dynamicRateFactor);
    if (localPackageId === '4h_40k') {
      baseBilledDistanceKm = 40;
      baseRouteFare = Math.round(adjustedLocal8HrBase * 0.70) - 200;
      driverAllowance = 200 + hillDriverBonusPerDay;
    } else if (localPackageId === '12h_120k') {
      baseBilledDistanceKm = 120;
      baseRouteFare = Math.round(adjustedLocal8HrBase * 1.33) - 260;
      driverAllowance = 260 + hillDriverBonusPerDay;
    } else {
      baseBilledDistanceKm = 80;
      baseRouteFare = adjustedLocal8HrBase - 240;
      driverAllowance = 240 + hillDriverBonusPerDay;
    }
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    hillStationCharge = isHillRoute ? Math.round(hillBase * 0.8) : 0;
    nightCharges = 0;
  } else if (tripType === 'airport') {
    baseBilledDistanceKm = Math.max(40, Math.round(distanceKm));
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    const airportFixedPickupFee =
      cabId === 'tempo' ? 500 : cabId === 'innova' || cabId === 'suv' ? 350 : 240;
    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm + airportFixedPickupFee);
    driverAllowance = 200 + hillDriverBonusPerDay;
    hillStationCharge = isHillRoute ? Math.round(hillBase * 0.8) : 0;
    nightCharges = 0;
  }

  // 4. Extra KM Rate (Matches CabBazar standard vehicle extra KM rate: e.g., ₹10.2/km for Sedan)
  const extraKmRate =
    tripType === 'roundtrip'
      ? ratePerKm
      : Number(baseExtraKmRate.toFixed(1));

  const sliderExtraFare = Math.round(cleanExtraKm * extraKmRate);
  const billedDistanceKm = baseBilledDistanceKm + cleanExtraKm;
  const baseFare = baseRouteFare + hillStationCharge + sliderExtraFare;

  // 5. NHAI FASTag Highway Toll (Real Counted Plazas) + Multi-State Entry Permit Calculation
  let highwayToll = 0;
  let statePermitTax = 0;
  let stateRoutePath: string[] = [originState];
  let statePermitBreakdown: StatePermitBreakdownItem[] = [];
  let expresswayName = 'Local City Road (0 Toll Plazas)';
  let tollPlazaCount = 0;
  let tollPlazas: string[] = [];

  if (tripType === 'oneway') {
    const tollInfo = lookupRouteExpresswayToll(
      pickupCity,
      dropCity,
      billedDistanceKm,
      cabId,
      routeGeometry
    );
    highwayToll = tollInfo.baseTollOneWay;
    expresswayName = tollInfo.expresswayName;
    tollPlazaCount = tollInfo.tollPlazaCount;
    tollPlazas = tollInfo.tollPlazas;

    if (isInterState) {
      const permitInfo = computeMultiStatePermitBreakdown(
        originState,
        destState,
        pickupCity,
        dropCity,
        cabId
      );
      stateRoutePath = permitInfo.stateRoutePath;
      statePermitBreakdown = permitInfo.statePermitBreakdown;
      statePermitTax = permitInfo.totalStatePermitTax;
    }
  } else if (tripType === 'roundtrip') {
    const tollInfo = lookupRouteExpresswayToll(
      pickupCity,
      dropCity,
      Math.round(billedDistanceKm / 2),
      cabId,
      routeGeometry
    );
    highwayToll = tollInfo.baseTollOneWay > 0 ? Math.round(tollInfo.baseTollOneWay * 1.8) : 0;
    expresswayName = tollInfo.expresswayName;
    tollPlazaCount = tollInfo.tollPlazaCount > 0 ? tollInfo.tollPlazaCount * 2 : 0;
    tollPlazas = tollInfo.tollPlazas;

    if (isInterState) {
      const permitInfo = computeMultiStatePermitBreakdown(
        originState,
        destState,
        pickupCity,
        dropCity,
        cabId
      );
      stateRoutePath = permitInfo.stateRoutePath;
      statePermitBreakdown = permitInfo.statePermitBreakdown;
      statePermitTax = permitInfo.totalStatePermitTax;
    }
  } else if (tripType === 'airport') {
    const tollInfo = lookupRouteExpresswayToll(
      pickupCity,
      dropCity,
      billedDistanceKm,
      cabId,
      routeGeometry
    );
    highwayToll = tollInfo.baseTollOneWay;
    statePermitTax = 0;
    expresswayName = tollInfo.tollPlazaCount > 0 ? tollInfo.expresswayName : 'Airport Approach Road (0 Toll Plazas)';
    tollPlazaCount = tollInfo.tollPlazaCount;
    tollPlazas = tollInfo.tollPlazas;
  } else {
    highwayToll = 0;
    statePermitTax = 0;
    expresswayName = 'City Limits (0 Toll Plazas)';
    tollPlazaCount = 0;
    tollPlazas = [];
  }

  // Toll Tax, State Tax & Parking are ALWAYS extra as per actuals in customer online booking fares
  const effectiveIncludeTolls = false;
  const estimatedTollsAndTaxes = highwayToll + statePermitTax;
  const tollsAndTaxes = effectiveIncludeTolls ? estimatedTollsAndTaxes : 0;
  highwayToll = 0;
  statePermitTax = 0;

  // Optional SafarIndiaCabs Add-Ons
  const carrierFee = addonCarrier ? 250 : 0;
  const petFee = addonPet
    ? cabId === 'suv' || cabId === 'innova' || cabId === 'tempo'
      ? 600
      : 500
    : 0;
  const assuredModelFee = addonAssuredModel ? 300 : 0;
  const addonsTotal = carrierFee + petFee + assuredModelFee;

  // GST: 0 for roundtrip, 5% for other trip types
  const taxableSubtotal = baseFare + driverAllowance + nightCharges + addonsTotal;
  const gstAmount = tripType === 'roundtrip' ? 0 : Math.round(taxableSubtotal * 0.05);

  const totalFareBeforePromo =
    baseFare + driverAllowance + nightCharges + tollsAndTaxes + addonsTotal + gstAmount;

  const shouldApplyPromo =
    promoDiscount === true ||
    Number(promoDiscount) >= PROMO_DISCOUNT_AMOUNT ||
    isValidFirst300Promo(promoCode, customerName);

  const appliedPromoDiscount = shouldApplyPromo ? PROMO_DISCOUNT_AMOUNT : 0;
  const promoCodeApplied = shouldApplyPromo ? 'FIRST300' : '';
  const totalFare = Math.max(100, totalFareBeforePromo - appliedPromoDiscount);

  // Competitor Market Comparison Fare (CabBazar / Gozo Cabs / Savaari benchmark: ~₹180 to ₹240 higher, avg ₹200 savings)
  const cabBazarGap = totalFareBeforePromo >= 4500 ? 195 : totalFareBeforePromo >= 2800 ? 185 : 175;
  const gozoCabsGap = totalFareBeforePromo >= 4500 ? 215 : totalFareBeforePromo >= 2800 ? 200 : 190;
  const savaariGap = totalFareBeforePromo >= 4500 ? 245 : totalFareBeforePromo >= 2800 ? 225 : 215;

  const cabBazarFare = totalFareBeforePromo + cabBazarGap;
  const gozoCabsFare = totalFareBeforePromo + gozoCabsGap;
  const savaariFare = totalFareBeforePromo + savaariGap;
  const competitorGap = Math.round((cabBazarGap + gozoCabsGap + savaariGap) / 3); // ~₹200 average market beat
  const originalMarketFare = totalFareBeforePromo + competitorGap;
  const savingsAmount = competitorGap + appliedPromoDiscount;
  const savingsPercent = Math.max(5, Math.round((savingsAmount / originalMarketFare) * 100));

  const competitorRates: CompetitorRateBenchmark = {
    cabBazarFare,
    gozoCabsFare,
    savaariFare,
    marketAverageFare: originalMarketFare,
    safarSavingsVsMarket: savingsAmount,
    bestPriceBadgeText: `Save ₹${savingsAmount} vs Market Average`
  };

  const advanceFare = Math.round(totalFare * 0.20);
  const balanceDue = totalFare - advanceFare;

  return {
    distanceKm,
    extraKm: cleanExtraKm,
    sliderExtraFare,
    billedDistanceKm,
    baseFare,
    driverAllowance,
    nightCharges,
    highwayToll,
    statePermitTax,
    stateRoutePath,
    statePermitBreakdown,
    estimatedTollsAndTaxes,
    tollsAndTaxes,
    hillStationCharge,
    isHillRoute,
    pickupIsHill,
    dropIsHill,
    hillTier,
    hillRateMultiplier,
    hillTierLabel,
    isInterState,
    originState,
    destState,
    expresswayName,
    tollPlazaCount,
    tollPlazas,
    extraKmRate,
    extraHourRate,
    addonsTotal,
    gstAmount,
    totalFare,
    originalMarketFare,
    savingsAmount,
    savingsPercent,
    advanceFare,
    balanceDue,
    daysCount,
    days: daysCount,
    ratePerKm,
    leadTimeTier,
    leadTimeMultiplier,
    leadTimeLabel,
    estimatedDropTime,
    isLateNightDrop,
    isEarlyOrNightPickup,
    isOuterRoute,
    pickupIsOuter,
    dropIsOuter,
    routeTierMultiplier,
    routeTierLabel,
    // Compatibility fields for UI views (CabSelector, badges, etc.)
    isHillAreaRoute: isHillRoute,
    effectiveRatePerKm: ratePerKm,
    isDropHillArea: dropIsHill,
    isPickupHillArea: pickupIsHill,
    extraKmRateUsed: extraKmRate,
    extraKmCharge: sliderExtraFare,
    originalFare: originalMarketFare,
    discountAmount: savingsAmount,
    advanceAmount: advanceFare,
    promoDiscount: appliedPromoDiscount,
    promoCodeApplied,
    totalFareBeforePromo,
    terrainBadge: hillTier !== 'none' ? hillTierLabel : '',
    routeDemandBadge: routeTierLabel,
    bookingLeadBadge: leadTimeLabel,
    competitorRates
  };
}

/**
 * Universal calculateTripFare function supporting both positional arguments
 * (used in CabSelector.tsx) and object-based arguments (used elsewhere).
 */
export function calculateTripFare(
  cabIdOrParams:
    | CabCategoryId
    | {
        tripType: TripType;
        cabId: CabCategoryId;
        distanceKm: number;
        extraKm?: number;
        pickupCity?: string;
        dropCity?: string;
        pickupDate?: string;
        pickupTime?: string;
        returnDate?: string;
        localPackageId?: string;
        includeTolls?: boolean;
        addonCarrier?: boolean;
        addonPet?: boolean;
        addonAssuredModel?: boolean;
        days?: number;
        promoCode?: string;
        promoDiscount?: number | boolean;
        customerName?: string;
        routeGeometry?: Array<[number, number]>;
      },
  tripType?: TripType,
  distanceKm?: number,
  days?: number,
  localPackageId?: string,
  pickupCity?: string,
  dropCity?: string,
  includeTolls?: boolean,
  pickupDate?: string,
  pickupTime?: string,
  extraKm?: number,
  promoDiscount?: number | boolean,
  routeGeometry?: Array<[number, number]>
): FareCalculationResult {
  if (typeof cabIdOrParams === 'object' && cabIdOrParams !== null) {
    return computeTripFare(cabIdOrParams);
  }

  const cabId = cabIdOrParams as CabCategoryId;
  let computedReturnDate: string | undefined = undefined;
  if (tripType === 'roundtrip' && days && days > 1 && pickupDate) {
    try {
      const p = new Date(pickupDate);
      if (!isNaN(p.getTime())) {
        p.setDate(p.getDate() + (days - 1));
        computedReturnDate = p.toISOString().split('T')[0];
      }
    } catch {
      // fallback
    }
  }

  return computeTripFare({
    cabId,
    tripType: tripType || 'oneway',
    distanceKm: Number(distanceKm || 0),
    extraKm: Number(extraKm || 0),
    pickupCity: pickupCity || '',
    dropCity: dropCity || '',
    pickupDate: pickupDate || new Date().toISOString().split('T')[0],
    pickupTime: pickupTime || '',
    returnDate: computedReturnDate,
    localPackageId: localPackageId || '8h_80k',
    includeTolls: includeTolls !== undefined ? includeTolls : false,
    promoDiscount: promoDiscount || 0,
    routeGeometry
  });
}

export function formatINR(val: number): string {
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

export function buildBookingFareSnapshot(
  fare: FareCalculationResult,
  provider = 'ola_maps'
) {
  return {
    capturedAt: new Date().toISOString(),
    provider,
    actualRoadDistanceKm: fare.distanceKm,
    billedDistanceKm: fare.billedDistanceKm,
    ratePerKm: fare.ratePerKm,
    extraKmRate: fare.extraKmRate,
    baseFare: fare.baseFare,
    driverAllowance: fare.driverAllowance,
    nightCharges: fare.nightCharges,
    highwayToll: fare.highwayToll,
    statePermitTax: fare.statePermitTax,
    hillStationCharge: fare.hillStationCharge,
    gstAmount: fare.gstAmount,
    discountAmount: fare.promoDiscount,
    totalFare: fare.totalFare
  };
}

