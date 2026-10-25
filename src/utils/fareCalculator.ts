import { CabCategoryId, TripType } from '../types';
import { CABS_FLEET } from '../data/cabsFleet';

export interface StatePermitBreakdownItem {
  state: string;
  role: 'transit' | 'destination';
  label: string;
  taxAmount: number;
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
  terrainBadge: string;
  routeDemandBadge: string;
  bookingLeadBadge: string;
}

export type FareBreakdown = FareCalculationResult;

// Daily High-Frequency Plains/Metro Hub Cities (Standard Highway Corridor Rates;
// Outer / off-route / interior / tehsil towns attract dispatch & empty-return deadhead rates)
export const DAILY_ROUTE_HUB_KEYWORDS: string[] = [
  'delhi', 'newdelhi', 'noida', 'greaternoida', 'gurgaon', 'gurugram', 'ghaziabad', 'faridabad',
  'agra', 'mathura', 'vrindavan', 'jaipur', 'chandigarh', 'mohali', 'zirakpur', 'panchkula',
  'ambala', 'panipat', 'karnal', 'sonipat', 'kurukshetra', 'haridwar', 'dehradun',
  'lucknow', 'kanpur', 'ayodhya', 'varanasi', 'prayagraj', 'allahabad', 'amritsar', 'ludhiana',
  'jalandhar', 'patiala', 'mumbai', 'navimumbai', 'thane', 'pune', 'shirdi', 'nashik',
  'ahmedabad', 'surat', 'vadodara', 'gandhinagar', 'udaipur', 'bangalore', 'bengaluru', 'mysore',
  'mysuru', 'chennai', 'pondicherry', 'puducherry', 'hyderabad', 'secunderabad', 'tirupati',
  'kolkata', 'howrah', 'indore', 'bhopal', 'ujjain', 'patna', 'nagpur', 'coimbatore', 'kochi'
];

// High-Altitude / Deep Mountain Destinations (Higher fuel burn, steep ghats, 100% empty return deadhead)
export const DEEP_MOUNTAIN_HILL_KEYWORDS: string[] = [
  'manali', 'kullu', 'kasol', 'manikaran', 'tosh', 'malana', 'rohtang', 'sissu', 'keylong', 'jispa',
  'spiti', 'kaza', 'kinnaur', 'kalpa', 'sangla', 'chitkul', 'reckongpeo', 'narkanda', 'kufri',
  'dharamshala', 'mcleodganj', 'palampur', 'bir', 'barot', 'jibhi', 'tirthan', 'shoja',
  'dalhousie', 'khajjiar', 'chamba', 'rudraprayag', 'karnaprayag', 'nandaprayag', 'vishnuprayag',
  'devprayag', 'sonprayag', 'gaurikund', 'kedarnath', 'badrinath', 'guptkashi', 'ukhimath',
  'chopta', 'joshimath', 'auli', 'chamoli', 'gopeshwar', 'uttarkashi', 'gangotri', 'yamunotri',
  'barkot', 'harsil', 'tehri', 'newtehri', 'pauri', 'srinagargarhwal', 'almora', 'ranikhet',
  'kausani', 'binsar', 'bageshwar', 'pithoragarh', 'champawat', 'lohaghat', 'munsiyari',
  'chaukori', 'dharchula', 'jageshwar', 'mukteshwar', 'chakrata', 'dhanaulti', 'kanatal',
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
  'mcleodganj', 'dalhousie', 'khajjiar', 'kasauli', 'solan', 'chail', 'kufri', 'narkanda',
  'mashobra', 'mandi', 'palampur', 'bir', 'barot', 'jibhi', 'tirthan', 'shoja', 'spiti',
  'kaza', 'kinnaur', 'kalpa', 'sangla', 'chitkul', 'reckongpeo', 'keylong', 'jispa', 'sissu',
  'rohtang', 'kangra', 'bilaspurhp', 'himachal',
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

// Verified NHAI Expressway & Highway Toll Table (One-Way Car/Sedan FASTag base in INR)
const VERIFIED_EXPRESSWAY_TOLLS: Record<string, { toll: number; name: string }> = {
  'delhi-agra': { toll: 515, name: 'Yamuna Expressway FASTag' },
  'agra-delhi': { toll: 515, name: 'Yamuna Expressway FASTag' },
  'delhi-mathura': { toll: 320, name: 'Yamuna / NH-19 FASTag' },
  'mathura-delhi': { toll: 320, name: 'Yamuna / NH-19 FASTag' },
  'delhi-jaipur': { toll: 475, name: 'NH-48 / Delhi-Mumbai Expwy' },
  'jaipur-delhi': { toll: 475, name: 'NH-48 / Delhi-Mumbai Expwy' },
  'delhi-chandigarh': { toll: 445, name: 'NH-44 GT Road FASTag' },
  'chandigarh-delhi': { toll: 445, name: 'NH-44 GT Road FASTag' },
  'delhi-haridwar': { toll: 385, name: 'Delhi-Meerut Expwy + NH-334' },
  'haridwar-delhi': { toll: 385, name: 'Delhi-Meerut Expwy + NH-334' },
  'delhi-rishikesh': { toll: 410, name: 'Delhi-Meerut Expwy + NH-334' },
  'rishikesh-delhi': { toll: 410, name: 'Delhi-Meerut Expwy + NH-334' },
  'delhi-dehradun': { toll: 430, name: 'Delhi-Dehradun Highway FASTag' },
  'dehradun-delhi': { toll: 430, name: 'Delhi-Dehradun Highway FASTag' },
  'delhi-shimla': { toll: 560, name: 'NH-44 + Himalayan Expwy' },
  'shimla-delhi': { toll: 560, name: 'NH-44 + Himalayan Expwy' },
  'delhi-manali': { toll: 720, name: 'NH-44 + Kiratpur-Manali Expwy' },
  'manali-delhi': { toll: 720, name: 'NH-44 + Kiratpur-Manali Expwy' },
  'delhi-amritsar': { toll: 690, name: 'NH-44 Delhi-Amritsar Expwy' },
  'amritsar-delhi': { toll: 690, name: 'NH-44 Delhi-Amritsar Expwy' },
  'delhi-lucknow': { toll: 840, name: 'Yamuna + Agra-Lucknow Expwy' },
  'lucknow-delhi': { toll: 840, name: 'Yamuna + Agra-Lucknow Expwy' },
  'delhi-nainital': { toll: 420, name: 'NH-9 Moradabad-Rampur FASTag' },
  'nainital-delhi': { toll: 420, name: 'NH-9 Moradabad-Rampur FASTag' },
  'delhi-mussoorie': { toll: 450, name: 'Delhi-Dehradun Expwy FASTag' },
  'mussoorie-delhi': { toll: 450, name: 'Delhi-Dehradun Expwy FASTag' },
  'mumbai-pune': { toll: 320, name: 'Mumbai-Pune Expressway' },
  'pune-mumbai': { toll: 320, name: 'Mumbai-Pune Expressway' },
  'mumbai-lonavala': { toll: 240, name: 'Mumbai-Pune Expressway' },
  'lonavala-mumbai': { toll: 240, name: 'Mumbai-Pune Expressway' },
  'mumbai-shirdi': { toll: 360, name: 'Samruddhi / NH-160 FASTag' },
  'shirdi-mumbai': { toll: 360, name: 'Samruddhi / NH-160 FASTag' },
  'mumbai-nashik': { toll: 265, name: 'Mumbai-Nashik NH-160 FASTag' },
  'nashik-mumbai': { toll: 265, name: 'Mumbai-Nashik NH-160 FASTag' },
  'mumbai-goa': { toll: 640, name: 'NH-66 / Atal Setu FASTag' },
  'goa-mumbai': { toll: 640, name: 'NH-66 / Atal Setu FASTag' },
  'mumbai-mahabaleshwar': { toll: 410, name: 'Mumbai-Pune Expwy + NH-48' },
  'mahabaleshwar-mumbai': { toll: 410, name: 'Mumbai-Pune Expwy + NH-48' },
  'pune-shirdi': { toll: 240, name: 'Pune-Sangamner Highway FASTag' },
  'shirdi-pune': { toll: 240, name: 'Pune-Sangamner Highway FASTag' },
  'pune-mahabaleshwar': { toll: 165, name: 'NH-48 Khed-Shivapur FASTag' },
  'mahabaleshwar-pune': { toll: 165, name: 'NH-48 Khed-Shivapur FASTag' },
  'bangalore-mysore': { toll: 335, name: 'Bangalore-Mysore Expressway' },
  'mysore-bangalore': { toll: 335, name: 'Bangalore-Mysore Expressway' },
  'bangalore-chennai': { toll: 465, name: 'NH-48 Krishnagiri-Vellore FASTag' },
  'chennai-bangalore': { toll: 465, name: 'NH-48 Krishnagiri-Vellore FASTag' },
  'bangalore-tirupati': { toll: 315, name: 'NH-75 Mulbagal-Chittoor FASTag' },
  'tirupati-bangalore': { toll: 315, name: 'NH-75 Mulbagal-Chittoor FASTag' },
  'bangalore-ooty': { toll: 340, name: 'Bangalore-Mysore Expwy + Nilgiri' },
  'ooty-bangalore': { toll: 340, name: 'Bangalore-Mysore Expwy + Nilgiri' },
  'bangalore-coorg': { toll: 290, name: 'Bangalore-Mysore Expwy FASTag' },
  'coorg-bangalore': { toll: 290, name: 'Bangalore-Mysore Expwy FASTag' },
  'chennai-pondicherry': { toll: 195, name: 'East Coast Road (ECR) Toll' },
  'pondicherry-chennai': { toll: 195, name: 'East Coast Road (ECR) Toll' },
  'ahmedabad-udaipur': { toll: 355, name: 'NH-48 Himatnagar-Shamlaji FASTag' },
  'udaipur-ahmedabad': { toll: 355, name: 'NH-48 Himatnagar-Shamlaji FASTag' },
  'jaipur-udaipur': { toll: 460, name: 'NH-48 Kishangarh-Bhilwara FASTag' },
  'udaipur-jaipur': { toll: 460, name: 'NH-48 Kishangarh-Bhilwara FASTag' },
  'jaipur-jodhpur': { toll: 375, name: 'NH-48 + Beawar-Pali FASTag' },
  'jodhpur-jaipur': { toll: 375, name: 'NH-48 + Beawar-Pali FASTag' },
  'lucknow-varanasi': { toll: 410, name: 'Purvanchal / NH-31 FASTag' },
  'varanasi-lucknow': { toll: 410, name: 'Purvanchal / NH-31 FASTag' },
  'lucknow-ayodhya': { toll: 225, name: 'NH-27 Barabanki-Ayodhya FASTag' },
  'ayodhya-lucknow': { toll: 225, name: 'NH-27 Barabanki-Ayodhya FASTag' },
  'varanasi-ayodhya': { toll: 295, name: 'Purvanchal Expwy FASTag' },
  'ayodhya-varanasi': { toll: 295, name: 'Purvanchal Expwy FASTag' },
  'chandigarh-manali': { toll: 380, name: 'Kiratpur-Nerchowk-Manali Expwy' },
  'manali-chandigarh': { toll: 380, name: 'Kiratpur-Nerchowk-Manali Expwy' },
  'chandigarh-shimla': { toll: 185, name: 'Chandimandir-Solan Himalayan Expwy' },
  'shimla-chandigarh': { toll: 185, name: 'Chandimandir-Solan Himalayan Expwy' },
  'chandigarh-amritsar': { toll: 330, name: 'NH-5 / NH-44 Punjab FASTag' },
  'amritsar-chandigarh': { toll: 330, name: 'NH-5 / NH-44 Punjab FASTag' }
};

// State detection map for Indian cities & regions (for Multi-State Permit Tax calculation)
const CITY_STATE_KEYWORDS: Array<{ keywords: string[]; state: string }> = [
  { keywords: ['delhi', 'newdelhi', 'burari', 'dwarka', 'rohini', 'connaught', 'igi', 'aerocity', 'saket', 'vasantkunj', 'karolbagh', 'lajpat'], state: 'Delhi' },
  { keywords: ['noida', 'greaternoida', 'ghaziabad', 'agra', 'lucknow', 'varanasi', 'ayodhya', 'mathura', 'vrindavan', 'prayagraj', 'allahabad', 'kanpur', 'meerut', 'gorakhpur', 'bareilly', 'aligarh', 'jhansi', 'moradabad', 'muzaffarnagar', 'saharanpur', 'bijnor', 'rampur', 'uttarpradesh'], state: 'Uttar Pradesh' },
  { keywords: ['gurgaon', 'gurugram', 'faridabad', 'panipat', 'ambala', 'karnal', 'sonipat', 'rohtak', 'hisar', 'kurukshetra', 'rewari', 'palwal', 'panchkula', 'haryana'], state: 'Haryana' },
  { keywords: ['jaipur', 'udaipur', 'jodhpur', 'ajmer', 'pushkar', 'jaisalmer', 'bikaner', 'kota', 'mountabu', 'alwar', 'bharatpur', 'khatushyam', 'salasar', 'neemrana', 'sikar', 'jhunjhunu', 'rajasthan'], state: 'Rajasthan' },
  { keywords: ['chandigarh', 'amritsar', 'ludhiana', 'jalandhar', 'patiala', 'bathinda', 'mohali', 'zirakpur', 'pathankot', 'ropar', 'kiratpur', 'punjab'], state: 'Punjab' },
  { keywords: ['shimla', 'manali', 'dharamshala', 'mcleodganj', 'dalhousie', 'kasauli', 'kullu', 'solan', 'spiti', 'kasol', 'chamba', 'khajjiar', 'mandi', 'bilaspurhp', 'palampur', 'kinnaur', 'kalpa', 'kufri', 'narkanda', 'himachal'], state: 'Himachal Pradesh' },
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
  { keywords: ['patna', 'gaya', 'bodhgaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'rajgir', 'nalanda', 'bihar'], state: 'Bihar' },
  { keywords: ['ranchi', 'jamshedpur', 'deoghar', 'dhanbad', 'bokaro', 'jharkhand'], state: 'Jharkhand' },
  { keywords: ['bhubaneswar', 'puri', 'konark', 'cuttack', 'rourkela', 'odisha'], state: 'Odisha' },
  { keywords: ['raipur', 'bilaspur', 'bhilai', 'durg', 'chhattisgarh'], state: 'Chhattisgarh' },
  { keywords: ['guwahati', 'shillong', 'cherrapunji', 'kaziranga', 'gangtok', 'sikkim', 'tawang', 'assam', 'meghalaya'], state: 'North East' },
  { keywords: ['jammu', 'srinagar', 'katra', 'vaishnodevi', 'gulmarg', 'pahalgam', 'sonamarg', 'patnitop', 'leh', 'ladakh', 'kashmir'], state: 'Jammu & Kashmir' }
];

const PUNJAB_TRANSIT_HIMACHAL_CITIES = [
  'manali', 'kullu', 'kasol', 'spiti', 'dharamshala', 'mcleodganj', 'dalhousie', 'chamba', 'khajjiar', 'mandi'
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
 * Parses a pickup time string (e.g., "07:00 AM", "09:30 PM", "18:00") into fractional hours (0 - 23.99)
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
 * - Analyzes when the cab starts (Pickup Timing) AND when the cab reaches the destination (Drop Timing).
 * - If Pickup is in Night / Early Dawn (09:00 PM to 06:00 AM), applies Night/Dawn Dispatch factor.
 * - If Drop Arrival falls late at night (>= 09:00 PM in plains or >= 07:30 PM in hills), driver cannot
 *   get a return ride or drive back the same night, so Late Drop / Overnight Return Halt applies.
 */
export function computeLeadTimePricing(
  pickupDate?: string,
  pickupTime?: string,
  distanceKm = 230,
  isHillRoute = false,
  hillTier: 'none' | 'foothill_gateway' | 'one_end_hill' | 'both_hills' = 'none'
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
      ? 28
      : hillTier === 'one_end_hill' || isHillRoute
      ? 34
      : 52;
  const estimatedDriveHours = Math.max(1.0, distanceKm / avgSpeedKmph + 0.5);
  const arrivalHourContinuous = pickupHour + estimatedDriveHours;
  const arrivalHourOfDay = ((arrivalHourContinuous % 24) + 24) % 24;
  const estimatedDropTime = formatHourOfDay(arrivalHourContinuous);

  // Pickup timing: 9:00 PM (21.0) to 6:00 AM (6.0)
  const isEarlyOrNightPickup = pickupHour >= 21.0 || pickupHour <= 6.0;

  // Drop timing: Late evening/night drop where driver cannot return same night
  const isLateNightDrop = isHillRoute
    ? arrivalHourContinuous >= 19.5 || arrivalHourOfDay <= 5.5
    : arrivalHourContinuous >= 21.5 || arrivalHourOfDay <= 5.0;

  let timingBonusFactor = 0;
  let timingAllowance = 0;

  if (isEarlyOrNightPickup) {
    timingBonusFactor += 0.03;
    timingAllowance += 150;
  }
  if (isLateNightDrop) {
    timingBonusFactor += isHillRoute ? 0.04 : 0.03;
    timingAllowance += isHillRoute ? 250 : 200;
  }

  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cleanPickup = (pickupDate || '').trim().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanPickup)) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
        leadTimeLabel: isLateNightDrop
          ? `Late Drop (${estimatedDropTime})`
          : isEarlyOrNightPickup
          ? 'Early/Night Pickup Slot'
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
        leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
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
        leadTimeMultiplier: Number((1.05 + timingBonusFactor).toFixed(2)),
        leadTimeLabel: isLateNightDrop
          ? `Same-Day + Late Drop (${estimatedDropTime})`
          : 'Same-Day Instant Dispatch',
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
        leadTimeLabel: isLateNightDrop
          ? `Late Night Drop (${estimatedDropTime})`
          : isEarlyOrNightPickup
          ? 'Early/Night Pickup Slot'
          : 'Next-Day Assured Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }
    return {
      leadTimeTier: 'advance',
      leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
      leadTimeLabel: isLateNightDrop
        ? `Late Night Drop (${estimatedDropTime})`
        : 'Advance Assured Rate',
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
 * Computes Hill Station & Mountain Terrain Pricing (Savaari / Gozo / CabBazar Benchmark):
 * - Both Pickup & Drop in Hills (e.g. Rudraprayag to Nainital, Shimla to Manali):
 *   1.26x (Deep Himalayan Hill-to-Hill) or 1.20x (Standard Hill-to-Hill)
 * - One End in Deep Mountain Hills (e.g. Delhi to Manali/Kasol/Kedarnath/Badrinath/Rudraprayag/Almora):
 *   1.22x if Pickup is Deep Hill (Hill Union Dispatch), 1.19x if Drop is Deep Hill
 * - One End in Standard Hill Station (e.g. Delhi to Nainital/Mussoorie/Shimla, Mumbai to Mahabaleshwar):
 *   1.17x if Pickup is Hill Station, 1.14x if Drop is Hill Station
 * - Foothill Gateway Corridor (e.g. Dehradun, Haldwani, Kathgodam, Ramnagar/Corbett, Kotdwar):
 *   1.07x Gateway Approach Rate
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
        hillRateMultiplier: 1.07,
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
      hillRateMultiplier: isDeepHillToHill ? 1.26 : 1.20,
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
      hillRateMultiplier: pickupIsDeep ? 1.22 : 1.19,
      hillTierLabel: pickupIsDeep
        ? 'High-Altitude Hill Pickup Terrain'
        : 'High-Altitude Mountain Climb'
    };
  }

  return {
    isHillRoute: true,
    pickupIsHill,
    dropIsHill,
    hillTier: 'one_end_hill',
    hillRateMultiplier: pickupIsHill ? 1.17 : 1.14,
    hillTierLabel: pickupIsHill ? 'Hill Station Pickup Terrain' : 'Hill Station Ghat Climb'
  };
}

/**
 * Computes Pickup & Drop Area Tier Multiplier (Hub vs Outer/Interior Empty Return Deadhead):
 * - Hill Routes already include hillRateMultiplier so routeTierMultiplier stays 1.00x
 * - Daily Hub Cities (both ends): 1.00x
 * - Outer Pickup + Outer Drop: 1.14x to 1.16x (Garage Dispatch + Empty Return Deadhead)
 * - Outer Pickup -> Hub Drop: 1.10x (Outer Pickup Dispatch)
 * - Hub Pickup -> Outer Drop: 1.09x (Empty Return Deadhead from Interior Drop)
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

  // Do not stack outer route multiplier on top of hill terrain multiplier
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
      routeTierMultiplier: 1.08,
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
      routeTierMultiplier: distanceKm > 250 ? 1.16 : 1.14,
      routeTierLabel: 'Outer Pickup & Empty Return Corridor'
    };
  }

  if (pickupIsOuter) {
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: false,
      routeTierMultiplier: 1.10,
      routeTierLabel: 'Outer Pickup Dispatch Zone'
    };
  }

  return {
    isOuterRoute: true,
    pickupIsOuter: false,
    dropIsOuter: true,
    routeTierMultiplier: 1.09,
    routeTierLabel: 'Outer Drop Return Deadhead'
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

export function lookupRouteExpresswayToll(
  pickupCity?: string,
  dropCity?: string,
  distanceKm = 230,
  cabId: CabCategoryId = 'sedan'
): { baseTollOneWay: number; expresswayName: string } {
  const nFrom = normalizeRouteToken(pickupCity);
  const nTo = normalizeRouteToken(dropCity);

  let matchedToll: number | null = null;
  let matchedName = 'NHAI Highway FASTag';

  if (nFrom && nTo) {
    for (const [pairKey, info] of Object.entries(VERIFIED_EXPRESSWAY_TOLLS)) {
      const [c1, c2] = pairKey.split('-');
      if (nFrom.includes(c1) && nTo.includes(c2)) {
        matchedToll = info.toll;
        matchedName = info.name;
        break;
      }
    }
  }

  const vehicleTollMultiplier = cabId === 'tempo' ? 1.45 : 1.0;

  if (matchedToll !== null) {
    return {
      baseTollOneWay: Math.round(matchedToll * vehicleTollMultiplier),
      expresswayName: matchedName
    };
  }

  const highwayBillableKm = Math.max(40, Math.round(distanceKm * 0.8));
  const nhaiRatePerKm = cabId === 'tempo' ? 1.55 : cabId === 'innova' || cabId === 'suv' ? 1.05 : 0.95;
  return {
    baseTollOneWay: Math.round(highwayBillableKm * nhaiRatePerKm),
    expresswayName: 'NHAI National Highway FASTag'
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
 * Safar India Cabs - Round Trip Fare Calculation Logic (Savaari / Gozo / CabBazar Benchmark)
 */
export function calculateRoundTripFare(
  totalKm: number,
  numberOfDays: number,
  vehicleType: string,
  nightHalts = 0,
  hillMultiplier = 1.0
): RoundTripFareBreakdown {
  const rates: Record<
    string,
    { perKmRate: number; driverAllowancePerDay: number; nightChargePerNight: number }
  > = {
    HATCHBACK: { perKmRate: 12, driverAllowancePerDay: 300, nightChargePerNight: 300 },
    SEDAN: { perKmRate: 13.5, driverAllowancePerDay: 350, nightChargePerNight: 300 },
    EXEC_SEDAN: { perKmRate: 15.5, driverAllowancePerDay: 400, nightChargePerNight: 350 },
    SUV: { perKmRate: 17.5, driverAllowancePerDay: 400, nightChargePerNight: 350 },
    INNOVA: { perKmRate: 22.5, driverAllowancePerDay: 500, nightChargePerNight: 400 },
    TEMPO: { perKmRate: 28, driverAllowancePerDay: 600, nightChargePerNight: 500 }
  };

  const selectedConfig = rates[String(vehicleType || 'SEDAN').toUpperCase()] || rates['SEDAN'];

  // Minimum KM Rule (250 KM per day)
  const MIN_KM_PER_DAY = 250;
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
 * SafarIndiaCabs Dynamic Fare Engine (Benchmarked to Savaari, Gozo Cabs & CabBazar within ₹100–₹200)
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
    includeTolls = true,
    addonCarrier = false,
    addonPet = false,
    addonAssuredModel = false
  } = params;

  const cab = CABS_FLEET.find((c) => c.id === cabId) || CABS_FLEET[0];

  const oneWayRate = cab.ratePerKm;
  const baseExtraKmRate = cab.extraKmRate || Math.round(cab.ratePerKm + 1);
  const dailyBata = cab.driverAllowancePerDay || 350;
  const hillBase = cab.hillStationCharge || 450;
  const local8HrBase = cab.local8Hr80KmFare || 2199;

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
  } = computeLeadTimePricing(pickupDate, pickupTime, distanceKm, isHillRoute, hillTier);

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
      ? 140
      : cabId === 'sedan'
      ? 160
      : cabId === 'exec_sedan'
      ? 200
      : cabId === 'suv'
      ? 220
      : cabId === 'innova'
      ? 280
      : 380;

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
  const hillDriverBonusPerDay =
    hillTier === 'both_hills'
      ? 300
      : hillTier === 'one_end_hill'
      ? 200
      : hillTier === 'foothill_gateway'
      ? 100
      : 0;

  if (tripType === 'oneway') {
    // Minimum 135 KM outstation one-way billable slab (Savaari / Gozo / CabBazar standard)
    baseBilledDistanceKm = Math.max(135, Math.round(distanceKm));

    // Distance slab factor:
    // - Short drops (<= 155 km): 1.10x turnaround overhead
    // - Standard highway (156 - 285 km): 1.00x
    // - Medium-long one-way (286 - 420 km): 1.05x partial empty return recovery
    // - Long-haul one-way (> 420 km): 1.10x multi-day empty return deadhead
    const slabFactor =
      baseBilledDistanceKm <= 155
        ? 1.10
        : baseBilledDistanceKm > 420
        ? 1.10
        : baseBilledDistanceKm > 285
        ? 1.05
        : 1.0;

    ratePerKm = Number((oneWayRate * slabFactor * dynamicRateFactor).toFixed(1));

    hillStationCharge =
      hillTier === 'both_hills'
        ? Math.round(hillBase * 1.45)
        : hillTier === 'one_end_hill'
        ? hillBase
        : hillTier === 'foothill_gateway'
        ? Math.round(hillBase * 0.45)
        : 0;

    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm);

    // Multi-shift driver allowance for long one-way or deep mountain routes
    const oneWayDriverDays =
      baseBilledDistanceKm > 450 || (isHillRoute && baseBilledDistanceKm > 320)
        ? 2
        : baseBilledDistanceKm > 320 || (hillTier === 'both_hills' && baseBilledDistanceKm > 200)
        ? 1.5
        : 1;

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
      hillTier === 'both_hills' ? 1.16 : hillTier === 'one_end_hill' ? 1.10 : 1.0;
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
        ? Math.round(hillBase * 1.3)
        : hillTier === 'one_end_hill'
        ? hillBase
        : 0;
  } else if (tripType === 'local') {
    const adjustedLocal8HrBase = Math.round(local8HrBase * dynamicRateFactor);
    if (localPackageId === '4h_40k') {
      baseBilledDistanceKm = 40;
      baseRouteFare = Math.round(adjustedLocal8HrBase * 0.70) - 220;
      driverAllowance = 220 + hillDriverBonusPerDay;
    } else if (localPackageId === '12h_120k') {
      baseBilledDistanceKm = 120;
      baseRouteFare = Math.round(adjustedLocal8HrBase * 1.34) - 350;
      driverAllowance = 350 + hillDriverBonusPerDay;
    } else {
      baseBilledDistanceKm = 80;
      baseRouteFare = adjustedLocal8HrBase - 300;
      driverAllowance = 300 + hillDriverBonusPerDay;
    }
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    hillStationCharge = isHillRoute ? Math.round(hillBase * 0.85) : 0;
    nightCharges = isEarlyOrNightPickup ? 150 : 0;
  } else if (tripType === 'airport') {
    baseBilledDistanceKm = Math.max(40, Math.round(distanceKm));
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    const airportFixedPickupFee =
      cabId === 'tempo' ? 600 : cabId === 'innova' || cabId === 'suv' ? 450 : 320;
    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm + airportFixedPickupFee);
    driverAllowance = 250 + hillDriverBonusPerDay;
    hillStationCharge = isHillRoute ? Math.round(hillBase * 0.85) : 0;
    nightCharges = isEarlyOrNightPickup ? 150 : 0;
  }

  // 4. Extra KM Rate
  const hillSliderFactor = dropIsHill ? 1.10 : isHillRoute ? 1.08 : 1.0;
  const extraKmRate =
    tripType === 'roundtrip'
      ? ratePerKm
      : Math.max(
          Math.ceil(ratePerKm + (dropIsHill ? 2.0 : isHillRoute ? 1.5 : 1.0)),
          Math.round(baseExtraKmRate * dynamicRateFactor * hillSliderFactor)
        );

  const sliderExtraFare = Math.round(cleanExtraKm * extraKmRate);
  const billedDistanceKm = baseBilledDistanceKm + cleanExtraKm;
  const baseFare = baseRouteFare + hillStationCharge + sliderExtraFare;

  // 5. NHAI FASTag Highway Toll + Multi-State Entry Permit Calculation
  let highwayToll = 0;
  let statePermitTax = 0;
  let stateRoutePath: string[] = [originState];
  let statePermitBreakdown: StatePermitBreakdownItem[] = [];
  let expresswayName = 'Local City Road';

  if (tripType === 'oneway') {
    const tollInfo = lookupRouteExpresswayToll(pickupCity, dropCity, billedDistanceKm, cabId);
    highwayToll = tollInfo.baseTollOneWay;
    expresswayName = tollInfo.expresswayName;

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
      cabId
    );
    highwayToll = Math.round(tollInfo.baseTollOneWay * 1.85);
    expresswayName = tollInfo.expresswayName;

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
    highwayToll = 150;
    statePermitTax = 0;
    expresswayName = 'Airport Toll & Entry';
  } else {
    highwayToll = 0;
    statePermitTax = 0;
    expresswayName = 'City Limits';
  }

  const estimatedTollsAndTaxes = highwayToll + statePermitTax;
  const tollsAndTaxes = includeTolls ? estimatedTollsAndTaxes : 0;

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

  const totalFare = baseFare + driverAllowance + nightCharges + tollsAndTaxes + addonsTotal + gstAmount;

  // Competitor Market Comparison Fare (Savaari / Gozo / CabBazar benchmark: ₹150 to ₹200 higher)
  const competitorGap = totalFare >= 5000 ? 199 : totalFare >= 3000 ? 179 : 149;
  const originalMarketFare = totalFare + competitorGap;
  const savingsAmount = competitorGap;
  const savingsPercent = Math.max(3, Math.round((savingsAmount / originalMarketFare) * 100));

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
    terrainBadge: hillTier !== 'none' ? hillTierLabel : '',
    routeDemandBadge: routeTierLabel,
    bookingLeadBadge: leadTimeLabel
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
  extraKm?: number
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
    includeTolls: includeTolls !== undefined ? includeTolls : true
  });
}

export function formatINR(val: number): string {
  return '₹' + Math.round(val).toLocaleString('en-IN');
}
