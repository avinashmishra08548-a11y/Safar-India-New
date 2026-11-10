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
  // Bihar & Jharkhand Regional Pricing Engine metadata
  isRegionalPricingActive?: boolean;
  isRegionalFixedRoute?: boolean;
  regionalEngineName?: string;
  regionalCorridorName?: string;
  regionalTollPolicyNote?: string;
  regionalCompetitorLabel?: string;
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
  { keywords: ['patna', 'hajipur', 'sonepur', 'sonpur', 'danapur', 'bihta', 'gaya', 'bodhgaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'samastipur', 'begusarai', 'barauni', 'ara', 'arrah', 'bhojpur', 'chhapra', 'chapra', 'biharsharif', 'rajgir', 'nalanda', 'sitamarhi', 'motihari', 'champaran', 'bettiah', 'raxaul', 'buxar', 'sasaram', 'rohtas', 'dehri', 'bhabua', 'kaimur', 'purnia', 'purnea', 'katihar', 'kishanganj', 'araria', 'forbesganj', 'supaul', 'saharsa', 'madhepura', 'khagaria', 'munger', 'jamalpur', 'lakhisarai', 'sheikhpura', 'jamui', 'nawada', 'jehanabad', 'arwal', 'aurangabadbihar', 'siwan', 'gopalganj', 'madhubani', 'jhanjharpur', 'mokama', 'barh', 'bakhtiyarpur', 'fatuha', 'vaishali', 'saran', 'bihar'], state: 'Bihar' },
  { keywords: ['ranchi', 'jamshedpur', 'tatanagar', 'deoghar', 'baidyanathdham', 'jasidih', 'madhupur', 'dhanbad', 'jharia', 'bokaro', 'chas', 'phusro', 'hazaribagh', 'barhi', 'giridih', 'parasnath', 'shikharji', 'ramgarhjharkhand', 'patratu', 'medininagar', 'daltonganj', 'palamu', 'garhwa', 'latehar', 'dumka', 'basukinath', 'jamtara', 'koderma', 'jhumritelaiya', 'chatra', 'chaibasa', 'chakradharpur', 'saraikela', 'gumla', 'lohardaga', 'simdega', 'khunti', 'godda', 'sahibganj', 'pakur', 'jharkhand'], state: 'Jharkhand' },
  { keywords: ['bhubaneswar', 'puri', 'konark', 'cuttack', 'rourkela', 'odisha'], state: 'Odisha' },
  { keywords: ['raipur', 'bilaspur', 'bhilai', 'durg', 'chhattisgarh'], state: 'Chhattisgarh' },
  { keywords: ['guwahati', 'shillong', 'cherrapunji', 'kaziranga', 'gangtok', 'sikkim', 'tawang', 'assam', 'meghalaya'], state: 'North East' },
  { keywords: ['jammu', 'srinagar', 'katra', 'vaishnodevi', 'gulmarg', 'pahalgam', 'sonamarg', 'patnitop', 'leh', 'ladakh', 'kashmir'], state: 'Jammu & Kashmir' }
];

export interface RegionalFixedRouteEntry {
  routeKey: string;
  corridorName: string;
  km: number;
  tollRule: 'toll_free' | 'intra_state_nhai' | 'inter_state_border';
  tollPolicyNote: string;
  marketBeat: number; // Strictly ₹150 to ₹200 cheaper than PatnaGo / RP Shakti local market
  rates: Record<CabCategoryId, number>;
}

const REGIONAL_CITY_TOKEN_MAP: Array<{ key: string; tokens: string[] }> = [
  { key: 'patna', tokens: ['patna', 'patnajunction', 'patnasaheb', 'jayprakashnarayan', 'kankarbagh', 'boringroad', 'baileyroad', 'phulwarisharif', 'patliputra', 'rajendranagarpatna'] },
  { key: 'hajipur', tokens: ['hajipur', 'vaishalihajipur', 'vaishali', 'ramashishchowk'] },
  { key: 'sonepur', tokens: ['sonepur', 'sonpur', 'hariharkshetra'] },
  { key: 'danapur', tokens: ['danapur', 'khagaul'] },
  { key: 'bihta', tokens: ['bihta', 'iitpatna'] },
  { key: 'ara', tokens: ['arrah', 'ara', 'bhojpur'] },
  { key: 'jehanabad', tokens: ['jehanabad', 'arwal'] },
  { key: 'chhapra', tokens: ['chhapra', 'chapra', 'saran'] },
  { key: 'muzaffarpur', tokens: ['muzaffarpur', 'motijheel'] },
  { key: 'biharsharif', tokens: ['biharsharif', 'pawapuri', 'harnaut'] },
  { key: 'nalanda', tokens: ['nalanda'] },
  { key: 'mokama', tokens: ['mokama', 'barh', 'bakhtiyarpur', 'fatuha'] },
  { key: 'samastipur', tokens: ['samastipur', 'dalsinghsarai'] },
  { key: 'rajgir', tokens: ['rajgir'] },
  { key: 'gaya', tokens: ['bodhgaya', 'gaya', 'mahabodhi'] },
  { key: 'nawada', tokens: ['nawada'] },
  { key: 'lakhisarai', tokens: ['lakhisarai', 'sheikhpura'] },
  { key: 'begusarai', tokens: ['begusarai', 'barauni'] },
  { key: 'buxar', tokens: ['buxar', 'dumraon'] },
  { key: 'siwan', tokens: ['siwan'] },
  { key: 'sitamarhi', tokens: ['sitamarhi', 'sheohar'] },
  { key: 'darbhanga', tokens: ['darbhanga', 'laheriasarai'] },
  { key: 'aurangabadbihar', tokens: ['aurangabadbihar', 'daudnagar'] },
  { key: 'gopalganj', tokens: ['gopalganj'] },
  { key: 'motihari', tokens: ['motihari', 'eastchamparan', 'champaran'] },
  { key: 'sasaram', tokens: ['sasaram', 'rohtas', 'dehrionsone', 'dehri', 'bhabua', 'kaimur'] },
  { key: 'jamui', tokens: ['jamui'] },
  { key: 'khagaria', tokens: ['khagaria'] },
  { key: 'madhubani', tokens: ['madhubani', 'jhanjharpur', 'jaynagar'] },
  { key: 'munger', tokens: ['munger', 'jamalpur'] },
  { key: 'bettiah', tokens: ['bettiah', 'westchamparan', 'bagaha'] },
  { key: 'raxaul', tokens: ['raxaul'] },
  { key: 'saharsa', tokens: ['saharsa'] },
  { key: 'supaul', tokens: ['supaul'] },
  { key: 'madhepura', tokens: ['madhepura'] },
  { key: 'bhagalpur', tokens: ['bhagalpur', 'kahalgaon', 'naugachia', 'sultanganj'] },
  { key: 'katihar', tokens: ['katihar'] },
  { key: 'purnia', tokens: ['purnia', 'purnea'] },
  { key: 'araria', tokens: ['araria', 'forbesganj'] },
  { key: 'kishanganj', tokens: ['kishanganj'] },
  { key: 'ranchi', tokens: ['ranchi', 'birsamunda', 'hatia', 'doranda'] },
  { key: 'deoghar', tokens: ['deoghar', 'baidyanathdham', 'jasidih', 'madhupur'] },
  { key: 'dhanbad', tokens: ['dhanbad', 'jharia', 'katras', 'gomoh'] },
  { key: 'jamshedpur', tokens: ['jamshedpur', 'tatanagar', 'sakchi', 'bistupur', 'adityapur'] },
  { key: 'bokaro', tokens: ['bokaro', 'bokarosteelcity', 'chas', 'phusro', 'bermo'] },
  { key: 'hazaribagh', tokens: ['hazaribagh', 'barhi'] },
  { key: 'giridih', tokens: ['giridih', 'parasnath', 'shikharji', 'isri'] },
  { key: 'ramgarh', tokens: ['ramgarhjharkhand', 'ramgarh', 'patratu'] },
  { key: 'daltonganj', tokens: ['medininagar', 'daltonganj', 'palamu', 'garhwa', 'latehar'] },
  { key: 'dumka', tokens: ['dumka', 'basukinath', 'jamtara'] },
  { key: 'koderma', tokens: ['koderma', 'jhumritelaiya'] },
  { key: 'chatra', tokens: ['chatra'] },
  { key: 'chaibasa', tokens: ['chaibasa', 'chakradharpur', 'saraikela'] },
  { key: 'gumla', tokens: ['gumla', 'simdega', 'khunti'] },
  { key: 'lohardaga', tokens: ['lohardaga'] }
];

/**
 * Predefined Fixed Route-Rate Table for Bihar & Jharkhand Regional Pricing Engine.
 * Calibrated against PatnaGo & RP Shakti local competitor benchmarks so every route
 * automatically beats local competitor market rates by strictly ₹150 to ₹200.
 */
export const BIHAR_JHARKHAND_FIXED_ROUTES: Record<string, RegionalFixedRouteEntry> = {
  'patna-danapur': {
    routeKey: 'patna-danapur',
    corridorName: 'Patna ↔ Danapur Local-Intercity Corridor',
    km: 14,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Urban Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 150,
    rates: { hatchback: 549, sedan: 599, exec_sedan: 699, suv: 799, innova: 999, tempo: 1499 }
  },
  'patna-sonepur': {
    routeKey: 'patna-sonepur',
    corridorName: 'Patna ↔ Sonepur (JP Setu Corridor)',
    km: 25,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Ganga Bridge Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 160,
    rates: { hatchback: 680, sedan: 740, exec_sedan: 860, suv: 999, innova: 1250, tempo: 1799 }
  },
  'patna-hajipur': {
    routeKey: 'patna-hajipur',
    corridorName: 'Patna ↔ Hajipur (MG Setu / JP Setu Corridor)',
    km: 27,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 170,
    rates: { hatchback: 699, sedan: 780, exec_sedan: 899, suv: 1050, innova: 1299, tempo: 1850 }
  },
  'patna-bihta': {
    routeKey: 'patna-bihta',
    corridorName: 'Patna ↔ Bihta / IIT Patna Corridor',
    km: 32,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 160,
    rates: { hatchback: 760, sedan: 840, exec_sedan: 960, suv: 1120, innova: 1399, tempo: 1950 }
  },
  'patna-jehanabad': {
    routeKey: 'patna-jehanabad',
    corridorName: 'Patna ↔ Jehanabad (NH-22 Corridor)',
    km: 52,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Intra-State Bihar Corridor (₹0 State Border Tax · Toll Extra As Per Actuals)',
    marketBeat: 170,
    rates: { hatchback: 980, sedan: 1080, exec_sedan: 1220, suv: 1420, innova: 1780, tempo: 2450 }
  },
  'patna-ara': {
    routeKey: 'patna-ara',
    corridorName: 'Patna ↔ Ara / Bhojpur (Koilwar Corridor)',
    km: 55,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 180,
    rates: { hatchback: 1020, sedan: 1120, exec_sedan: 1280, suv: 1480, innova: 1850, tempo: 2550 }
  },
  'patna-chhapra': {
    routeKey: 'patna-chhapra',
    corridorName: 'Patna ↔ Chhapra / Saran (JP Setu Highway)',
    km: 72,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 180,
    rates: { hatchback: 1240, sedan: 1370, exec_sedan: 1550, suv: 1790, innova: 2250, tempo: 3050 }
  },
  'patna-muzaffarpur': {
    routeKey: 'patna-muzaffarpur',
    corridorName: 'Patna ↔ Muzaffarpur (NH-22 Fixed Corridor)',
    km: 74,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-22 Corridor (₹0 State Tax · 1 NHAI Toll Plaza Extra)',
    marketBeat: 180,
    rates: { hatchback: 1250, sedan: 1420, exec_sedan: 1599, suv: 1850, innova: 2299, tempo: 3150 }
  },
  'patna-biharsharif': {
    routeKey: 'patna-biharsharif',
    corridorName: 'Patna ↔ Bihar Sharif (NH-20 Bakhtiyarpur Four-Lane)',
    km: 75,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-20 Corridor (₹0 State Tax · 1 NHAI Toll Plaza Extra)',
    marketBeat: 180,
    rates: { hatchback: 1260, sedan: 1420, exec_sedan: 1599, suv: 1850, innova: 2299, tempo: 3150 }
  },
  'patna-nalanda': {
    routeKey: 'patna-nalanda',
    corridorName: 'Patna ↔ Nalanda University Corridor',
    km: 88,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 180,
    rates: { hatchback: 1420, sedan: 1570, exec_sedan: 1780, suv: 2050, innova: 2550, tempo: 3450 }
  },
  'patna-mokama': {
    routeKey: 'patna-mokama',
    corridorName: 'Patna ↔ Barh / Mokama (NH-31 Four-Lane)',
    km: 92,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-31 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 180,
    rates: { hatchback: 1460, sedan: 1620, exec_sedan: 1820, suv: 2120, innova: 2620, tempo: 3550 }
  },
  'patna-samastipur': {
    routeKey: 'patna-samastipur',
    corridorName: 'Patna ↔ Samastipur Regional Corridor',
    km: 95,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · Toll Extra As Per Actuals)',
    marketBeat: 180,
    rates: { hatchback: 1499, sedan: 1670, exec_sedan: 1880, suv: 2199, innova: 2699, tempo: 3650 }
  },
  'patna-rajgir': {
    routeKey: 'patna-rajgir',
    corridorName: 'Patna ↔ Rajgir (Glass Bridge / Tourist Corridor)',
    km: 102,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-20 Corridor (₹0 State Tax · 1 NHAI Toll Plaza Extra)',
    marketBeat: 190,
    rates: { hatchback: 1590, sedan: 1760, exec_sedan: 1990, suv: 2299, innova: 2850, tempo: 3850 }
  },
  'patna-gaya': {
    routeKey: 'patna-gaya',
    corridorName: 'Patna ↔ Gaya & Bodh Gaya (NH-22 Fixed Corridor)',
    km: 105,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-22 Corridor (₹0 State Tax · 1 NHAI Toll Plaza Extra)',
    marketBeat: 190,
    rates: { hatchback: 1650, sedan: 1810, exec_sedan: 2050, suv: 2380, innova: 2950, tempo: 3950 }
  },
  'patna-nawada': {
    routeKey: 'patna-nawada',
    corridorName: 'Patna ↔ Nawada (NH-20 Fixed Corridor)',
    km: 112,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 1740, sedan: 1910, exec_sedan: 2160, suv: 2499, innova: 3099, tempo: 4150 }
  },
  'patna-lakhisarai': {
    routeKey: 'patna-lakhisarai',
    corridorName: 'Patna ↔ Lakhisarai / Sheikhpura Corridor',
    km: 122,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 1880, sedan: 2060, exec_sedan: 2320, suv: 2680, innova: 3320, tempo: 4450 }
  },
  'patna-begusarai': {
    routeKey: 'patna-begusarai',
    corridorName: 'Patna ↔ Begusarai / Barauni (Simaria Setu Corridor)',
    km: 125,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 1920, sedan: 2110, exec_sedan: 2380, suv: 2750, innova: 3399, tempo: 4550 }
  },
  'patna-buxar': {
    routeKey: 'patna-buxar',
    corridorName: 'Patna ↔ Buxar (NH-922 Four-Lane Expressway)',
    km: 125,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-922 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 1920, sedan: 2110, exec_sedan: 2380, suv: 2750, innova: 3399, tempo: 4550 }
  },
  'patna-siwan': {
    routeKey: 'patna-siwan',
    corridorName: 'Patna ↔ Siwan Regional Corridor',
    km: 132,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · Toll Extra As Per Actuals)',
    marketBeat: 190,
    rates: { hatchback: 1999, sedan: 2210, exec_sedan: 2490, suv: 2880, innova: 3550, tempo: 4750 }
  },
  'patna-sitamarhi': {
    routeKey: 'patna-sitamarhi',
    corridorName: 'Patna ↔ Sitamarhi (Janaki Mandir Corridor)',
    km: 135,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 2050, sedan: 2260, exec_sedan: 2550, suv: 2950, innova: 3650, tempo: 4850 }
  },
  'patna-darbhanga': {
    routeKey: 'patna-darbhanga',
    corridorName: 'Patna ↔ Darbhanga / Mithila (NH-22 + NH-27 Fixed Corridor)',
    km: 138,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-27 Corridor (₹0 State Tax · 2 NHAI Toll Plazas Extra)',
    marketBeat: 200,
    rates: { hatchback: 1999, sedan: 2299, exec_sedan: 2599, suv: 2999, innova: 3699, tempo: 4950 }
  },
  'patna-aurangabadbihar': {
    routeKey: 'patna-aurangabadbihar',
    corridorName: 'Patna ↔ Aurangabad (Bihar) Corridor',
    km: 145,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 2140, sedan: 2360, exec_sedan: 2660, suv: 3080, innova: 3799, tempo: 5099 }
  },
  'patna-gopalganj': {
    routeKey: 'patna-gopalganj',
    corridorName: 'Patna ↔ Gopalganj Highway Corridor',
    km: 150,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 2220, sedan: 2460, exec_sedan: 2780, suv: 3199, innova: 3950, tempo: 5250 }
  },
  'patna-motihari': {
    routeKey: 'patna-motihari',
    corridorName: 'Patna ↔ Motihari (East Champaran Corridor)',
    km: 152,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-27 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 2250, sedan: 2490, exec_sedan: 2810, suv: 3240, innova: 3999, tempo: 5320 }
  },
  'patna-sasaram': {
    routeKey: 'patna-sasaram',
    corridorName: 'Patna ↔ Sasaram / Dehri-on-Sone Corridor',
    km: 156,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 2310, sedan: 2550, exec_sedan: 2880, suv: 3320, innova: 4099, tempo: 5450 }
  },
  'patna-jamui': {
    routeKey: 'patna-jamui',
    corridorName: 'Patna ↔ Jamui Highway Corridor',
    km: 162,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 2399, sedan: 2650, exec_sedan: 2990, suv: 3450, innova: 4250, tempo: 5650 }
  },
  'patna-khagaria': {
    routeKey: 'patna-khagaria',
    corridorName: 'Patna ↔ Khagaria (NH-31 Corridor)',
    km: 165,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-31 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 2440, sedan: 2690, exec_sedan: 3040, suv: 3499, innova: 4320, tempo: 5750 }
  },
  'patna-madhubani': {
    routeKey: 'patna-madhubani',
    corridorName: 'Patna ↔ Madhubani / Jhanjharpur (NH-27 Corridor)',
    km: 172,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-27 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 2520, sedan: 2790, exec_sedan: 3150, suv: 3640, innova: 4490, tempo: 5950 }
  },
  'patna-munger': {
    routeKey: 'patna-munger',
    corridorName: 'Patna ↔ Munger / Jamalpur Corridor',
    km: 180,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 2620, sedan: 2900, exec_sedan: 3280, suv: 3780, innova: 4650, tempo: 6190 }
  },
  'patna-bettiah': {
    routeKey: 'patna-bettiah',
    corridorName: 'Patna ↔ Bettiah (West Champaran Corridor)',
    km: 195,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 2850, sedan: 3150, exec_sedan: 3550, suv: 4099, innova: 5050, tempo: 6690 }
  },
  'patna-raxaul': {
    routeKey: 'patna-raxaul',
    corridorName: 'Patna ↔ Raxaul (Indo-Nepal Border Corridor)',
    km: 205,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 2990, sedan: 3300, exec_sedan: 3720, suv: 4290, innova: 5290, tempo: 6990 }
  },
  'patna-saharsa': {
    routeKey: 'patna-saharsa',
    corridorName: 'Patna ↔ Saharsa (Kosi Regional Corridor)',
    km: 215,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 3120, sedan: 3450, exec_sedan: 3890, suv: 4490, innova: 5520, tempo: 7290 }
  },
  'patna-supaul': {
    routeKey: 'patna-supaul',
    corridorName: 'Patna ↔ Supaul (Kosi Mahasetu Corridor)',
    km: 225,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 3250, sedan: 3600, exec_sedan: 4060, suv: 4680, innova: 5760, tempo: 7590 }
  },
  'patna-madhepura': {
    routeKey: 'patna-madhepura',
    corridorName: 'Patna ↔ Madhepura Regional Corridor',
    km: 230,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 3320, sedan: 3680, exec_sedan: 4150, suv: 4790, innova: 5890, tempo: 7750 }
  },
  'patna-bhagalpur': {
    routeKey: 'patna-bhagalpur',
    corridorName: 'Patna ↔ Bhagalpur (Silk City Fixed Corridor)',
    km: 235,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 3390, sedan: 3750, exec_sedan: 4240, suv: 4890, innova: 5999, tempo: 7890 }
  },
  'patna-hazaribagh': {
    routeKey: 'patna-hazaribagh',
    corridorName: 'Patna ↔ Hazaribagh (Bihar–Jharkhand NH-20 Corridor)',
    km: 235,
    tollRule: 'inter_state_border',
    tollPolicyNote: 'Bihar–Jharkhand Inter-State Corridor (FASTag Toll & State Border Tax Extra)',
    marketBeat: 200,
    rates: { hatchback: 3420, sedan: 3790, exec_sedan: 4280, suv: 4940, innova: 6050, tempo: 7950 }
  },
  'patna-deoghar': {
    routeKey: 'patna-deoghar',
    corridorName: 'Patna ↔ Deoghar / Baidyanath Dham Corridor',
    km: 255,
    tollRule: 'inter_state_border',
    tollPolicyNote: 'Bihar–Jharkhand Pilgrimage Corridor (FASTag Toll & State Border Tax Extra)',
    marketBeat: 200,
    rates: { hatchback: 3660, sedan: 4050, exec_sedan: 4580, suv: 5280, innova: 6490, tempo: 8550 }
  },
  'patna-katihar': {
    routeKey: 'patna-katihar',
    corridorName: 'Patna ↔ Katihar (Seemanchal NH-31 Corridor)',
    km: 295,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-31 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 4199, sedan: 4650, exec_sedan: 5250, suv: 6050, innova: 7450, tempo: 9790 }
  },
  'patna-purnia': {
    routeKey: 'patna-purnia',
    corridorName: 'Patna ↔ Purnia (Seemanchal Express Corridor)',
    km: 305,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 4320, sedan: 4790, exec_sedan: 5390, suv: 6240, innova: 7680, tempo: 10090 }
  },
  'patna-dhanbad': {
    routeKey: 'patna-dhanbad',
    corridorName: 'Patna ↔ Dhanbad (Bihar–Jharkhand GT Road Corridor)',
    km: 310,
    tollRule: 'inter_state_border',
    tollPolicyNote: 'Bihar–Jharkhand Inter-State Corridor (FASTag Toll & State Border Tax Extra)',
    marketBeat: 200,
    rates: { hatchback: 4420, sedan: 4900, exec_sedan: 5520, suv: 6380, innova: 7850, tempo: 10290 }
  },
  'patna-bokaro': {
    routeKey: 'patna-bokaro',
    corridorName: 'Patna ↔ Bokaro Steel City Corridor',
    km: 315,
    tollRule: 'inter_state_border',
    tollPolicyNote: 'Bihar–Jharkhand Inter-State Corridor (FASTag Toll & State Border Tax Extra)',
    marketBeat: 200,
    rates: { hatchback: 4490, sedan: 4980, exec_sedan: 5620, suv: 6490, innova: 7980, tempo: 10450 }
  },
  'patna-araria': {
    routeKey: 'patna-araria',
    corridorName: 'Patna ↔ Araria / Forbesganj (NH-27 Corridor)',
    km: 315,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-27 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 4460, sedan: 4950, exec_sedan: 5580, suv: 6440, innova: 7920, tempo: 10390 }
  },
  'patna-ranchi': {
    routeKey: 'patna-ranchi',
    corridorName: 'Patna ↔ Ranchi (Capital-to-Capital NH-20 Corridor)',
    km: 325,
    tollRule: 'inter_state_border',
    tollPolicyNote: 'Bihar–Jharkhand Inter-State Corridor (FASTag Toll & State Border Tax Extra)',
    marketBeat: 200,
    rates: { hatchback: 4650, sedan: 5150, exec_sedan: 5790, suv: 6690, innova: 8250, tempo: 10850 }
  },
  'patna-kishanganj': {
    routeKey: 'patna-kishanganj',
    corridorName: 'Patna ↔ Kishanganj (NH-27 East-West Corridor)',
    km: 375,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-27 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 5320, sedan: 5900, exec_sedan: 6650, suv: 7680, innova: 9450, tempo: 12390 }
  },
  'patna-jamshedpur': {
    routeKey: 'patna-jamshedpur',
    corridorName: 'Patna ↔ Jamshedpur / Tatanagar Corridor',
    km: 445,
    tollRule: 'inter_state_border',
    tollPolicyNote: 'Bihar–Jharkhand Inter-State Corridor (FASTag Toll & State Border Tax Extra)',
    marketBeat: 200,
    rates: { hatchback: 6280, sedan: 6950, exec_sedan: 7850, suv: 9050, innova: 11120, tempo: 14590 }
  },
  'hajipur-muzaffarpur': {
    routeKey: 'hajipur-muzaffarpur',
    corridorName: 'Hajipur ↔ Muzaffarpur (NH-22 Four-Lane)',
    km: 54,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-22 Corridor (₹0 State Tax · 1 NHAI Toll Plaza Extra)',
    marketBeat: 170,
    rates: { hatchback: 980, sedan: 1080, exec_sedan: 1220, suv: 1420, innova: 1760, tempo: 2420 }
  },
  'hajipur-darbhanga': {
    routeKey: 'hajipur-darbhanga',
    corridorName: 'Hajipur ↔ Darbhanga Corridor',
    km: 115,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 1780, sedan: 1960, exec_sedan: 2210, suv: 2560, innova: 3160, tempo: 4250 }
  },
  'muzaffarpur-samastipur': {
    routeKey: 'muzaffarpur-samastipur',
    corridorName: 'Muzaffarpur ↔ Samastipur (NH-28 Corridor)',
    km: 55,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 170,
    rates: { hatchback: 999, sedan: 1110, exec_sedan: 1250, suv: 1450, innova: 1790, tempo: 2480 }
  },
  'muzaffarpur-sitamarhi': {
    routeKey: 'muzaffarpur-sitamarhi',
    corridorName: 'Muzaffarpur ↔ Sitamarhi (NH-22 Corridor)',
    km: 62,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State Corridor (₹0 State Tax · Toll Extra As Per Actuals)',
    marketBeat: 170,
    rates: { hatchback: 1090, sedan: 1210, exec_sedan: 1360, suv: 1580, innova: 1950, tempo: 2680 }
  },
  'muzaffarpur-darbhanga': {
    routeKey: 'muzaffarpur-darbhanga',
    corridorName: 'Muzaffarpur ↔ Darbhanga (NH-27 East-West Four-Lane)',
    km: 68,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-27 Corridor (₹0 State Tax · 1 NHAI Toll Plaza Extra)',
    marketBeat: 170,
    rates: { hatchback: 1150, sedan: 1280, exec_sedan: 1440, suv: 1660, innova: 2060, tempo: 2820 }
  },
  'muzaffarpur-motihari': {
    routeKey: 'muzaffarpur-motihari',
    corridorName: 'Muzaffarpur ↔ Motihari (NH-27 Corridor)',
    km: 82,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Bihar Intra-State NH-27 Corridor (₹0 State Tax · NHAI FASTag Toll Extra)',
    marketBeat: 180,
    rates: { hatchback: 1350, sedan: 1499, exec_sedan: 1690, suv: 1950, innova: 2410, tempo: 3280 }
  },
  'darbhanga-madhubani': {
    routeKey: 'darbhanga-madhubani',
    corridorName: 'Darbhanga ↔ Madhubani Mithila Corridor',
    km: 36,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Mithila Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 160,
    rates: { hatchback: 799, sedan: 890, exec_sedan: 999, suv: 1160, innova: 1450, tempo: 1999 }
  },
  'darbhanga-samastipur': {
    routeKey: 'darbhanga-samastipur',
    corridorName: 'Darbhanga ↔ Samastipur Corridor',
    km: 42,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 160,
    rates: { hatchback: 860, sedan: 960, exec_sedan: 1080, suv: 1250, innova: 1560, tempo: 2150 }
  },
  'gaya-rajgir': {
    routeKey: 'gaya-rajgir',
    corridorName: 'Gaya / Bodh Gaya ↔ Rajgir Buddhist Circuit',
    km: 65,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Buddhist Circuit Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 170,
    rates: { hatchback: 1120, sedan: 1250, exec_sedan: 1410, suv: 1630, innova: 2020, tempo: 2760 }
  },
  'gaya-nalanda': {
    routeKey: 'gaya-nalanda',
    corridorName: 'Gaya / Bodh Gaya ↔ Nalanda Corridor',
    km: 78,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Heritage Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 180,
    rates: { hatchback: 1299, sedan: 1440, exec_sedan: 1620, suv: 1880, innova: 2320, tempo: 3180 }
  },
  'gaya-deoghar': {
    routeKey: 'gaya-deoghar',
    corridorName: 'Gaya ↔ Deoghar / Baidyanath Dham Corridor',
    km: 210,
    tollRule: 'inter_state_border',
    tollPolicyNote: 'Bihar–Jharkhand Inter-State Corridor (FASTag Toll & State Border Tax Extra)',
    marketBeat: 200,
    rates: { hatchback: 3060, sedan: 3400, exec_sedan: 3840, suv: 4420, innova: 5450, tempo: 7190 }
  },
  'gaya-ranchi': {
    routeKey: 'gaya-ranchi',
    corridorName: 'Gaya ↔ Ranchi (NH-19 + NH-20 Corridor)',
    km: 220,
    tollRule: 'inter_state_border',
    tollPolicyNote: 'Bihar–Jharkhand Inter-State Corridor (FASTag Toll & State Border Tax Extra)',
    marketBeat: 200,
    rates: { hatchback: 3199, sedan: 3550, exec_sedan: 3990, suv: 4620, innova: 5690, tempo: 7490 }
  },
  'ranchi-ramgarh': {
    routeKey: 'ranchi-ramgarh',
    corridorName: 'Ranchi ↔ Ramgarh / Patratu Valley Corridor',
    km: 46,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · Toll Extra As Per Actuals)',
    marketBeat: 170,
    rates: { hatchback: 880, sedan: 980, exec_sedan: 1110, suv: 1280, innova: 1590, tempo: 2190 }
  },
  'ranchi-hazaribagh': {
    routeKey: 'ranchi-hazaribagh',
    corridorName: 'Ranchi ↔ Hazaribagh (NH-20 Four-Lane Corridor)',
    km: 93,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State NH-20 Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 180,
    rates: { hatchback: 1499, sedan: 1670, exec_sedan: 1880, suv: 2180, innova: 2690, tempo: 3650 }
  },
  'ranchi-bokaro': {
    routeKey: 'ranchi-bokaro',
    corridorName: 'Ranchi ↔ Bokaro Steel City Fixed Corridor',
    km: 112,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 1760, sedan: 1960, exec_sedan: 2210, suv: 2560, innova: 3150, tempo: 4250 }
  },
  'ranchi-jamshedpur': {
    routeKey: 'ranchi-jamshedpur',
    corridorName: 'Ranchi ↔ Jamshedpur / Tatanagar (NH-33 Four-Lane)',
    km: 130,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State NH-33 Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 1999, sedan: 2199, exec_sedan: 2480, suv: 2860, innova: 3520, tempo: 4750 }
  },
  'ranchi-dhanbad': {
    routeKey: 'ranchi-dhanbad',
    corridorName: 'Ranchi ↔ Dhanbad Coal Capital Fixed Corridor',
    km: 150,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 2250, sedan: 2499, exec_sedan: 2820, suv: 3250, innova: 3999, tempo: 5350 }
  },
  'ranchi-daltonganj': {
    routeKey: 'ranchi-daltonganj',
    corridorName: 'Ranchi ↔ Daltonganj / Medininagar (Palamu Corridor)',
    km: 172,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · Toll Extra As Per Actuals)',
    marketBeat: 190,
    rates: { hatchback: 2520, sedan: 2799, exec_sedan: 3160, suv: 3650, innova: 4490, tempo: 5950 }
  },
  'ranchi-giridih': {
    routeKey: 'ranchi-giridih',
    corridorName: 'Ranchi ↔ Giridih / Parasnath Shikharji Corridor',
    km: 185,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 2699, sedan: 2999, exec_sedan: 3380, suv: 3899, innova: 4799, tempo: 6350 }
  },
  'ranchi-deoghar': {
    routeKey: 'ranchi-deoghar',
    corridorName: 'Ranchi ↔ Deoghar / Baidyanath Dham Fixed Corridor',
    km: 250,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 3590, sedan: 3990, exec_sedan: 4490, suv: 5190, innova: 6390, tempo: 8390 }
  },
  'ranchi-dumka': {
    routeKey: 'ranchi-dumka',
    corridorName: 'Ranchi ↔ Dumka / Basukinath Corridor',
    km: 285,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 200,
    rates: { hatchback: 4050, sedan: 4490, exec_sedan: 5060, suv: 5850, innova: 7190, tempo: 9450 }
  },
  'dhanbad-bokaro': {
    routeKey: 'dhanbad-bokaro',
    corridorName: 'Dhanbad ↔ Bokaro Steel City Twin-City Corridor',
    km: 44,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 170,
    rates: { hatchback: 850, sedan: 950, exec_sedan: 1080, suv: 1240, innova: 1540, tempo: 2120 }
  },
  'dhanbad-giridih': {
    routeKey: 'dhanbad-giridih',
    corridorName: 'Dhanbad ↔ Giridih / Parasnath Corridor',
    km: 66,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 170,
    rates: { hatchback: 1150, sedan: 1280, exec_sedan: 1440, suv: 1660, innova: 2060, tempo: 2820 }
  },
  'dhanbad-hazaribagh': {
    routeKey: 'dhanbad-hazaribagh',
    corridorName: 'Dhanbad ↔ Hazaribagh (NH-19 GT Road Corridor)',
    km: 125,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State GT Road Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 1910, sedan: 2110, exec_sedan: 2380, suv: 2750, innova: 3390, tempo: 4550 }
  },
  'dhanbad-deoghar': {
    routeKey: 'dhanbad-deoghar',
    corridorName: 'Dhanbad ↔ Deoghar / Baidyanath Dham Corridor',
    km: 130,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · Toll Extra As Per Actuals)',
    marketBeat: 190,
    rates: { hatchback: 1990, sedan: 2199, exec_sedan: 2480, suv: 2860, innova: 3520, tempo: 4750 }
  },
  'dhanbad-jamshedpur': {
    routeKey: 'dhanbad-jamshedpur',
    corridorName: 'Dhanbad ↔ Jamshedpur Industrial Corridor',
    km: 145,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 2160, sedan: 2399, exec_sedan: 2710, suv: 3120, innova: 3850, tempo: 5150 }
  },
  'bokaro-jamshedpur': {
    routeKey: 'bokaro-jamshedpur',
    corridorName: 'Bokaro ↔ Jamshedpur / Tatanagar Corridor',
    km: 132,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · NHAI Toll Extra)',
    marketBeat: 190,
    rates: { hatchback: 2010, sedan: 2230, exec_sedan: 2520, suv: 2899, innova: 3580, tempo: 4790 }
  },
  'bokaro-deoghar': {
    routeKey: 'bokaro-deoghar',
    corridorName: 'Bokaro ↔ Deoghar / Baidyanath Dham Corridor',
    km: 165,
    tollRule: 'intra_state_nhai',
    tollPolicyNote: 'Jharkhand Intra-State Corridor (₹0 State Border Tax · Toll Extra As Per Actuals)',
    marketBeat: 200,
    rates: { hatchback: 2430, sedan: 2690, exec_sedan: 3040, suv: 3499, innova: 4320, tempo: 5750 }
  },
  'deoghar-dumka': {
    routeKey: 'deoghar-dumka',
    corridorName: 'Deoghar (Baidyanath) ↔ Dumka (Basukinath) Yatra Corridor',
    km: 68,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Baidyanath–Basukinath Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 170,
    rates: { hatchback: 1150, sedan: 1280, exec_sedan: 1440, suv: 1660, innova: 2060, tempo: 2820 }
  },
  'deoghar-giridih': {
    routeKey: 'deoghar-giridih',
    corridorName: 'Deoghar ↔ Giridih / Parasnath Corridor',
    km: 68,
    tollRule: 'toll_free',
    tollPolicyNote: 'Zero-Toll Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)',
    marketBeat: 170,
    rates: { hatchback: 1150, sedan: 1280, exec_sedan: 1440, suv: 1660, innova: 2060, tempo: 2820 }
  }
};

export function extractRegionalCanonicalCity(locationStr?: string): string | null {
  if (!locationStr) return null;
  const parts = locationStr
    .split(',')
    .map((p) => p.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(Boolean);
  if (parts.length === 0) return null;

  for (const part of parts) {
    for (const entry of REGIONAL_CITY_TOKEN_MAP) {
      if (entry.tokens.some((tok) => part === tok)) {
        return entry.key;
      }
    }
  }

  for (const part of parts) {
    if (part.length < 3) continue;
    for (const entry of REGIONAL_CITY_TOKEN_MAP) {
      if (entry.tokens.some((tok) => part.includes(tok))) {
        return entry.key;
      }
    }
  }

  return null;
}

export function lookupBiharJharkhandFixedRoute(
  pickupCity?: string,
  dropCity?: string
): RegionalFixedRouteEntry | null {
  if (!pickupCity || !dropCity) return null;
  const cityA = extractRegionalCanonicalCity(pickupCity);
  const cityB = extractRegionalCanonicalCity(dropCity);
  if (!cityA || !cityB || cityA === cityB) return null;

  const directKey = `${cityA}-${cityB}`;
  if (BIHAR_JHARKHAND_FIXED_ROUTES[directKey]) {
    return BIHAR_JHARKHAND_FIXED_ROUTES[directKey];
  }
  const reverseKey = `${cityB}-${cityA}`;
  if (BIHAR_JHARKHAND_FIXED_ROUTES[reverseKey]) {
    return BIHAR_JHARKHAND_FIXED_ROUTES[reverseKey];
  }
  return null;
}

export function isBiharJharkhandRegionalTrip(
  pickupCity?: string,
  dropCity?: string,
  originState?: string,
  destState?: string
): boolean {
  if (
    originState === 'Bihar' ||
    originState === 'Jharkhand' ||
    destState === 'Bihar' ||
    destState === 'Jharkhand'
  ) {
    return true;
  }
  return Boolean(
    extractRegionalCanonicalCity(pickupCity) || extractRegionalCanonicalCity(dropCity)
  );
}

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

  // High-Priority Bihar & Jharkhand Regional Pricing Engine Override
  const isRegionalTrip = isBiharJharkhandRegionalTrip(pickupCity, dropCity, originState, destState);
  const fixedRegionalRoute =
    tripType === 'oneway' || tripType === 'roundtrip'
      ? lookupBiharJharkhandFixedRoute(pickupCity, dropCity)
      : null;

  let isRegionalFixedRoute = false;
  let regionalEngineName = '';
  let regionalCorridorName = '';
  let regionalTollPolicyNote = '';
  let regionalCompetitorLabel = '';
  let regionalMarketBeatOverride: number | null = null;
  let fixedOneWayGstOverride: number | null = null;

  if (tripType === 'oneway') {
    const actualRoundedKm = Math.max(
      1,
      fixedRegionalRoute ? fixedRegionalRoute.km : Math.round(distanceKm)
    );
    baseBilledDistanceKm = actualRoundedKm;

    if (fixedRegionalRoute) {
      // 1A. BIHAR & JHARKHAND FIXED ROUTE-RATE TABLE OVERRIDE (PatnaGo & RP Shakti Benchmark Beat)
      isRegionalFixedRoute = true;
      regionalEngineName = 'Bihar & Jharkhand Fixed Route Special';
      regionalCorridorName = fixedRegionalRoute.corridorName;
      regionalTollPolicyNote = fixedRegionalRoute.tollPolicyNote;
      regionalCompetitorLabel = 'PatnaGo / RP Shakti Local Market';
      regionalMarketBeatOverride = fixedRegionalRoute.marketBeat; // Strictly ₹150 to ₹200 cheaper

      const targetFixedTotal =
        fixedRegionalRoute.rates[cabId] ?? fixedRegionalRoute.rates.sedan;
      const regionalDriverBata =
        cabId === 'tempo'
          ? 380
          : cabId === 'innova'
          ? 300
          : cabId === 'suv'
          ? 260
          : fixedRegionalRoute.km < 60
          ? 180
          : 220;

      const preTaxTarget = Math.round(targetFixedTotal / 1.05);
      fixedOneWayGstOverride = targetFixedTotal - preTaxTarget;
      driverAllowance = regionalDriverBata;
      baseRouteFare = Math.max(250, preTaxTarget - driverAllowance);
      ratePerKm = Number((baseRouteFare / Math.max(1, baseBilledDistanceKm)).toFixed(1));
      hillStationCharge = 0;
      nightCharges = timingAllowance;
    } else if (isRegionalTrip) {
      // 1B. BIHAR & JHARKHAND REGIONAL FALLBACK ENGINE (Unlisted regional routes)
      regionalEngineName = 'Bihar & Jharkhand Regional Rate Card';
      regionalCorridorName = `${originState === 'Jharkhand' || destState === 'Jharkhand' ? 'Bihar–Jharkhand' : 'Bihar'} Regional Highway Corridor`;
      regionalTollPolicyNote = isInterState
        ? 'Bihar–Jharkhand Inter-State Corridor (FASTag Toll & State Border Tax Extra As Per Actuals)'
        : baseBilledDistanceKm <= 65
        ? 'Short Regional Corridor (0 Toll Plazas · ₹0 Highway Toll)'
        : `Intra-State ${originState} Corridor (₹0 State Border Tax · NHAI Toll Extra As Per Actuals)`;
      regionalCompetitorLabel = 'PatnaGo / RP Shakti Local Market';
      regionalMarketBeatOverride = baseBilledDistanceKm >= 140 ? 190 : 175;

      const regionalPerKmRates: Record<CabCategoryId, number> = {
        hatchback: 8.5,
        sedan: 9.2,
        exec_sedan: 10.6,
        suv: 12.2,
        innova: 15.2,
        tempo: 20.8
      };
      const regionalBataMap: Record<CabCategoryId, number> = {
        hatchback: 210,
        sedan: 230,
        exec_sedan: 270,
        suv: 290,
        innova: 350,
        tempo: 440
      };

      ratePerKm = regionalPerKmRates[cabId] ?? 9.2;
      const shortTripMinBase =
        cabId === 'hatchback'
          ? 450
          : cabId === 'sedan'
          ? 510
          : cabId === 'exec_sedan'
          ? 620
          : cabId === 'suv'
          ? 720
          : cabId === 'innova'
          ? 900
          : 1280;

      baseRouteFare =
        baseBilledDistanceKm < 55
          ? Math.max(shortTripMinBase, Math.round(baseBilledDistanceKm * ratePerKm))
          : Math.round(baseBilledDistanceKm * ratePerKm);
      const oneWayDriverDays = baseBilledDistanceKm > 500 ? 1.5 : 1;
      driverAllowance = Math.round((regionalBataMap[cabId] ?? 230) * oneWayDriverDays);
      hillStationCharge = 0;
      nightCharges = timingAllowance;
    } else {
      // Standard National One-Way Pricing
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
    }
  } else if (tripType === 'roundtrip') {
    if (pickupDate && returnDate) {
      const p = new Date(pickupDate).getTime();
      const r = new Date(returnDate).getTime();
      if (Number.isFinite(p) && Number.isFinite(r)) {
        const diffDays = Math.ceil((r - p) / (1000 * 60 * 60 * 24));
        daysCount = Math.max(1, diffDays + 1);
      }
    }
    const baseOneWayKm = fixedRegionalRoute ? fixedRegionalRoute.km : distanceKm;
    const actualTwoWayKm = Math.round(baseOneWayKm * 2);
    const nightHalts = Math.max(0, daysCount - 1);

    if (isRegionalTrip) {
      // 3. BIHAR & JHARKHAND REGIONAL ROUND-TRIP PACKAGE LOGIC
      regionalCompetitorLabel = 'PatnaGo / RP Shakti Local Market';
      regionalMarketBeatOverride = 190;

      const regionalRoundTripRates: Record<
        CabCategoryId,
        { perKm: number; bataPerDay: number; nightPerHalt: number }
      > = {
        hatchback: { perKm: 9.8, bataPerDay: 220, nightPerHalt: 200 },
        sedan: { perKm: 10.8, bataPerDay: 250, nightPerHalt: 220 },
        exec_sedan: { perKm: 12.2, bataPerDay: 280, nightPerHalt: 250 },
        suv: { perKm: 13.8, bataPerDay: 300, nightPerHalt: 260 },
        innova: { perKm: 17.5, bataPerDay: 350, nightPerHalt: 300 },
        tempo: { perKm: 23.0, bataPerDay: 450, nightPerHalt: 400 }
      };
      const rCfg = regionalRoundTripRates[cabId] || regionalRoundTripRates.sedan;

      if (fixedRegionalRoute && daysCount === 1 && actualTwoWayKm <= 260) {
        // Same-Day Return Fixed Corridor Package (1.75x of fixed one-way fare)
        isRegionalFixedRoute = true;
        regionalEngineName = 'Bihar & Jharkhand Same-Day Return Package';
        regionalCorridorName = `${fixedRegionalRoute.corridorName} (2-Way Return)`;
        regionalTollPolicyNote = fixedRegionalRoute.tollPolicyNote;
        const oneWayFixed =
          fixedRegionalRoute.rates[cabId] ?? fixedRegionalRoute.rates.sedan;
        const returnPackageTotal = Math.round(oneWayFixed * 1.75);
        baseBilledDistanceKm = actualTwoWayKm;
        driverAllowance = rCfg.bataPerDay;
        nightCharges = 0;
        baseRouteFare = Math.max(400, returnPackageTotal - driverAllowance);
        ratePerKm = Number((baseRouteFare / Math.max(1, baseBilledDistanceKm)).toFixed(1));
        hillStationCharge = 0;
      } else {
        // Multi-day or longer Bihar/Jharkhand Regional Round Trip (200 KM/day regional slab)
        isRegionalFixedRoute = Boolean(fixedRegionalRoute);
        regionalEngineName = 'Bihar & Jharkhand Regional Round-Trip Package';
        regionalCorridorName = fixedRegionalRoute
          ? `${fixedRegionalRoute.corridorName} (${daysCount}-Day Package)`
          : `Bihar & Jharkhand ${daysCount}-Day Round-Trip Package`;
        regionalTollPolicyNote = isInterState
          ? 'Bihar–Jharkhand Inter-State Round Trip (FASTag Toll & State Border Tax Extra)'
          : `Intra-State ${originState} Round Trip (₹0 State Border Tax · NHAI Toll Extra As Per Actuals)`;

        const regionalMinSlabKm = daysCount * 200; // 200 KM/day regional slab instead of 250 KM/day
        baseBilledDistanceKm = Math.max(actualTwoWayKm, regionalMinSlabKm);
        ratePerKm = rCfg.perKm;
        baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm);
        driverAllowance = daysCount * rCfg.bataPerDay;
        nightCharges = nightHalts * rCfg.nightPerHalt;
        hillStationCharge = 0;
      }
    } else {
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
    }
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
    expresswayName = regionalCorridorName || tollInfo.expresswayName;
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
    expresswayName = regionalCorridorName || tollInfo.expresswayName;
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

  // GST: 0 for roundtrip, 5% for other trip types (uses exact fixedOneWayGstOverride on fixed regional routes so total equals exact fixed route price)
  const taxableSubtotal = baseFare + driverAllowance + nightCharges + addonsTotal;
  const extraTaxableOverFixed = sliderExtraFare + hillStationCharge + nightCharges + addonsTotal;
  const gstAmount =
    tripType === 'roundtrip'
      ? 0
      : fixedOneWayGstOverride !== null
      ? fixedOneWayGstOverride + Math.round(extraTaxableOverFixed * 0.05)
      : Math.round(taxableSubtotal * 0.05);

  const totalFareBeforePromo =
    baseFare + driverAllowance + nightCharges + tollsAndTaxes + addonsTotal + gstAmount;

  const shouldApplyPromo =
    promoDiscount === true ||
    Number(promoDiscount) >= PROMO_DISCOUNT_AMOUNT ||
    isValidFirst300Promo(promoCode, customerName);

  const appliedPromoDiscount = shouldApplyPromo ? PROMO_DISCOUNT_AMOUNT : 0;
  const promoCodeApplied = shouldApplyPromo ? 'FIRST300' : '';
  const totalFare = Math.max(100, totalFareBeforePromo - appliedPromoDiscount);

  // Competitor Market Comparison Fare:
  // For Bihar & Jharkhand Regional trips, beat local competitor market rates (PatnaGo / RP Shakti) by strictly ₹150 to ₹200!
  const cabBazarGap =
    regionalMarketBeatOverride !== null
      ? regionalMarketBeatOverride
      : totalFareBeforePromo >= 4500
      ? 195
      : totalFareBeforePromo >= 2800
      ? 185
      : 175;
  const gozoCabsGap =
    regionalMarketBeatOverride !== null
      ? regionalMarketBeatOverride
      : totalFareBeforePromo >= 4500
      ? 215
      : totalFareBeforePromo >= 2800
      ? 200
      : 190;
  const savaariGap =
    regionalMarketBeatOverride !== null
      ? regionalMarketBeatOverride
      : totalFareBeforePromo >= 4500
      ? 245
      : totalFareBeforePromo >= 2800
      ? 225
      : 215;

  const cabBazarFare = totalFareBeforePromo + cabBazarGap;
  const gozoCabsFare = totalFareBeforePromo + gozoCabsGap;
  const savaariFare = totalFareBeforePromo + savaariGap;
  const competitorGap =
    regionalMarketBeatOverride !== null
      ? regionalMarketBeatOverride
      : Math.round((cabBazarGap + gozoCabsGap + savaariGap) / 3);
  const originalMarketFare = totalFareBeforePromo + competitorGap;
  const savingsAmount = competitorGap + appliedPromoDiscount;
  const savingsPercent = Math.max(5, Math.round((savingsAmount / originalMarketFare) * 100));

  const competitorRates: CompetitorRateBenchmark = {
    cabBazarFare,
    gozoCabsFare,
    savaariFare,
    marketAverageFare: originalMarketFare,
    safarSavingsVsMarket: savingsAmount,
    bestPriceBadgeText: isRegionalTrip
      ? `Save ₹${savingsAmount} vs PatnaGo / Local Market`
      : `Save ₹${savingsAmount} vs Market Average`
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
    routeDemandBadge: regionalEngineName || routeTierLabel,
    bookingLeadBadge: leadTimeLabel,
    competitorRates,
    isRegionalPricingActive: isRegionalTrip,
    isRegionalFixedRoute,
    regionalEngineName,
    regionalCorridorName,
    regionalTollPolicyNote,
    regionalCompetitorLabel
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

