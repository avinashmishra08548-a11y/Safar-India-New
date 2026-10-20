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
  hillTier: 'none' | 'one_end_hill' | 'both_hills';
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

// Daily High-Frequency Plains/Metro Hub Cities (Normal Standard Rates apply on these corridors;
// Outer / off-route / interior / hill towns attract higher dispatch rates)
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
  'Uttar Pradesh': { tax: 250, desc: 'UP State Entry Permit Tax' },
  'Uttarakhand': { tax: 300, desc: 'Uttarakhand State Permit & Green Cess' },
  'Haryana': { tax: 200, desc: 'Haryana State Border Permit Tax' },
  'Punjab': { tax: 250, desc: 'Punjab State Entry Permit Tax' },
  'Himachal Pradesh': { tax: 320, desc: 'Himachal State Permit & Green Tax' },
  'Rajasthan': { tax: 280, desc: 'Rajasthan State Border Permit Tax' },
  'Delhi': { tax: 200, desc: 'Delhi MCD Commercial Entry Toll' },
  'Jammu & Kashmir': { tax: 350, desc: 'J&K Lakhanpur Entry Permit Tax' },
  'Madhya Pradesh': { tax: 250, desc: 'MP State Border Permit Tax' },
  'Maharashtra': { tax: 280, desc: 'Maharashtra RTO Border Permit' },
  'Goa': { tax: 350, desc: 'Goa State Entry & Green Cess' },
  'Gujarat': { tax: 280, desc: 'Gujarat RTO Checkpost Permit' },
  'Karnataka': { tax: 300, desc: 'Karnataka State Entry Permit' },
  'Tamil Nadu': { tax: 280, desc: 'Tamil Nadu Border Checkpost Permit' },
  'Kerala': { tax: 320, desc: 'Kerala Walayar/Muthanga State Permit' },
  'Puducherry': { tax: 180, desc: 'Puducherry Entry Permit Tax' },
  'Andhra Pradesh': { tax: 280, desc: 'Andhra Pradesh Border Permit' },
  'Telangana': { tax: 280, desc: 'Telangana RTO Entry Permit' },
  'Bihar': { tax: 250, desc: 'Bihar State Entry Permit Tax' },
  'Jharkhand': { tax: 250, desc: 'Jharkhand Border Permit Tax' },
  'West Bengal': { tax: 280, desc: 'West Bengal State Entry Permit' },
  'Odisha': { tax: 250, desc: 'Odisha State Border Permit' },
  'Chhattisgarh': { tax: 250, desc: 'Chhattisgarh Border Permit' },
  'North East': { tax: 350, desc: 'North-East Inter-State Entry Permit' }
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

export function isDailyRouteCity(locationStr?: string): boolean {
  if (!locationStr) return true;
  const norm = normalizeRouteToken(locationStr);
  if (!norm) return true;
  if (isLocationInHillArea(locationStr)) return false;
  return DAILY_ROUTE_HUB_KEYWORDS.some((kw) => norm.includes(kw));
}

function isPeakOrNightPickupTime(pickupTime?: string): boolean {
  const t = (pickupTime || '').trim().toUpperCase();
  if (!t) return false;
  return (
    t.startsWith('05:') ||
    t.startsWith('06:') ||
    t.startsWith('09:00 PM') ||
    t.startsWith('10:') ||
    t.startsWith('11:')
  );
}

/**
 * Computes Booking Date & Time Multiplier:
 * - Today / Immediate ("At the time"): 1.18x (+18% Urgent Dispatch) or 1.22x (+22% Peak/Night Urgent Dispatch)
 * - Tomorrow ("Kal ki ride"): 1.00x (Average Standard Rate) or 1.05x for early-morning/late-night slot
 * - Advance (2-4 days ahead): 0.93x (7% Advance Discount)
 * - Early Advance (5+ days ahead): 0.90x (10% Early-Bird Advance Discount)
 */
export function computeLeadTimePricing(
  pickupDate?: string,
  pickupTime?: string
): {
  leadTimeTier: 'same_day' | 'tomorrow' | 'advance';
  leadTimeMultiplier: number;
  leadTimeLabel: string;
} {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cleanPickup = (pickupDate || '').trim().slice(0, 10);
    const isPeakSlot = isPeakOrNightPickupTime(pickupTime);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanPickup)) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: isPeakSlot ? 1.05 : 1.0,
        leadTimeLabel: isPeakSlot ? 'Peak Time Slot (+5%)' : 'Standard Rate'
      };
    }
    const pickupMs = Date.parse(`${cleanPickup}T00:00:00Z`);
    const todayMs = Date.parse(`${todayIST}T00:00:00Z`);
    if (!Number.isFinite(pickupMs) || !Number.isFinite(todayMs)) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: 1.0,
        leadTimeLabel: 'Standard Rate'
      };
    }

    const daysAhead = Math.round((pickupMs - todayMs) / 86400000);
    if (daysAhead <= 0) {
      return {
        leadTimeTier: 'same_day',
        leadTimeMultiplier: isPeakSlot ? 1.22 : 1.18,
        leadTimeLabel: isPeakSlot
          ? 'At-Time Urgent Night/Peak Dispatch'
          : 'At-Time Instant Dispatch'
      };
    }
    if (daysAhead === 1) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: isPeakSlot ? 1.05 : 1.0,
        leadTimeLabel: isPeakSlot ? 'Next-Day Peak Slot' : 'Next-Day Standard Rate'
      };
    }
    if (daysAhead >= 5) {
      return {
        leadTimeTier: 'advance',
        leadTimeMultiplier: 0.90,
        leadTimeLabel: 'Advance Booking Saver (10% OFF)'
      };
    }
    return {
      leadTimeTier: 'advance',
      leadTimeMultiplier: 0.93,
      leadTimeLabel: 'Advance Booking Saver (7% OFF)'
    };
  } catch {
    return {
      leadTimeTier: 'tomorrow',
      leadTimeMultiplier: 1.0,
      leadTimeLabel: 'Standard Rate'
    };
  }
}

/**
 * Computes Hill Station Terrain Pricing (Highest Priority: Fuel & Driver Effort in Hills)
 * - Both Pickup & Drop in Hills (e.g. Rudraprayag to Nainital): 1.32x Hill Terrain Rate
 * - Either Pickup OR Drop in Hills (e.g. Delhi to Mussoorie / Nainital): 1.22x Hill Climb Rate
 * - Plains Route: 1.00x
 */
export function computeHillTerrainPricing(
  tripType: TripType,
  pickupCity?: string,
  dropCity?: string
): {
  isHillRoute: boolean;
  pickupIsHill: boolean;
  dropIsHill: boolean;
  hillTier: 'none' | 'one_end_hill' | 'both_hills';
  hillRateMultiplier: number;
  hillTierLabel: string;
} {
  const pickupIsHill = isLocationInHillArea(pickupCity);
  const dropIsHill = tripType === 'local' ? pickupIsHill : isLocationInHillArea(dropCity);
  const isHillRoute = pickupIsHill || dropIsHill;

  if (!isHillRoute) {
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
    return {
      isHillRoute: true,
      pickupIsHill: true,
      dropIsHill: true,
      hillTier: 'both_hills',
      hillRateMultiplier: 1.32,
      hillTierLabel: 'Deep Mountain Hill-to-Hill Terrain'
    };
  }

  return {
    isHillRoute: true,
    pickupIsHill,
    dropIsHill,
    hillTier: 'one_end_hill',
    hillRateMultiplier: 1.22,
    hillTierLabel: pickupIsHill ? 'Hill Station Pickup Terrain' : 'Hill Station Drop Terrain'
  };
}

/**
 * Computes Pickup & Route Outer Tier Multiplier:
 * - Daily Hub Cities: 1.00x (or 1.06x on long 400+ KM corridors)
 * - Outer Pickup to Hub: 1.16x to 1.20x (Empty cab dispatch to outer pickup)
 * - Hub to Outer Drop: 1.12x to 1.16x (Outer drop return deadhead)
 * - Both Pickup & Drop in Outer Areas ("kaafi outer trips"): 1.22x to 1.26x
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

  // When hill route is already active, apply a dedicated outer-hill dispatch factor if pickup is outer or trip is long
  if (isHillRoute) {
    if (pickupIsOuter && dropIsOuter) {
      return {
        isOuterRoute: true,
        pickupIsOuter,
        dropIsOuter,
        routeTierMultiplier: distanceKm > 200 ? 1.10 : 1.08,
        routeTierLabel: 'Outer Hill Corridor'
      };
    }
    if (pickupIsOuter) {
      return {
        isOuterRoute: true,
        pickupIsOuter,
        dropIsOuter,
        routeTierMultiplier: 1.08,
        routeTierLabel: 'Outer Hill Pickup Dispatch'
      };
    }
    return {
      isOuterRoute: dropIsOuter,
      pickupIsOuter,
      dropIsOuter,
      routeTierMultiplier: distanceKm > 280 ? 1.06 : 1.04,
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
        routeTierLabel: 'Daily City Hub (Normal Rate)'
      };
    }
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: true,
      routeTierMultiplier: 1.16,
      routeTierLabel: 'Outer City Pickup Zone'
    };
  }

  if (pickupIsDaily && dropIsDaily) {
    if (distanceKm > 400) {
      return {
        isOuterRoute: true,
        pickupIsOuter: false,
        dropIsOuter: false,
        routeTierMultiplier: 1.06,
        routeTierLabel: 'Long Outstation Corridor'
      };
    }
    return {
      isOuterRoute: false,
      pickupIsOuter: false,
      dropIsOuter: false,
      routeTierMultiplier: 1.0,
      routeTierLabel: 'Daily Highway Route (Normal Rate)'
    };
  }

  if (pickupIsOuter && dropIsOuter) {
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: true,
      routeTierMultiplier: distanceKm > 200 ? 1.25 : 1.20,
      routeTierLabel: 'Deep Outer Corridor'
    };
  }

  if (pickupIsOuter) {
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: false,
      routeTierMultiplier: distanceKm > 250 ? 1.19 : 1.16,
      routeTierLabel: 'Outer Pickup Dispatch'
    };
  }

  return {
    isOuterRoute: true,
    pickupIsOuter: false,
    dropIsOuter: true,
    routeTierMultiplier: distanceKm > 250 ? 1.16 : 1.12,
    routeTierLabel: 'Outer Drop Corridor'
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
      ? 0.85
      : cabId === 'sedan'
      ? 1.0
      : cabId === 'exec_sedan'
      ? 1.15
      : cabId === 'suv'
      ? 1.45
      : cabId === 'innova'
      ? 1.75
      : 2.65;

  const statesEntered = stateRoutePath.slice(1);
  const breakdown: StatePermitBreakdownItem[] = statesEntered.map((stateName, idx) => {
    const isFinalDest = idx === statesEntered.length - 1;
    const role: 'transit' | 'destination' = isFinalDest ? 'destination' : 'transit';
    const baseInfo = STATE_PERMIT_BASE_RATES_SEDAN[stateName] || {
      tax: 280,
      desc: `${stateName} State Entry Permit`
    };
    const taxAmount = Math.round((baseInfo.tax * vehiclePermitMultiplier) / 10) * 10;

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

  const vehicleTollMultiplier = cabId === 'tempo' ? 1.6 : 1.0;

  if (matchedToll !== null) {
    return {
      baseTollOneWay: Math.round(matchedToll * vehicleTollMultiplier),
      expresswayName: matchedName
    };
  }

  const highwayBillableKm = Math.max(40, Math.round(distanceKm * 0.85));
  const nhaiRatePerKm = cabId === 'tempo' ? 1.85 : cabId === 'innova' || cabId === 'suv' ? 1.20 : 1.15;
  return {
    baseTollOneWay: Math.round(highwayBillableKm * nhaiRatePerKm),
    expresswayName: 'NHAI National Highway FASTag'
  };
}

/**
 * SafarIndiaCabs Dynamic Fare, Hill Terrain, Outer Route, Lead-Time & Extra KM Slider Calculation Engine
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

  const cab = CABS_FLEET.find((c) => c.id === cabId) || CABS_FLEET[1];

  const oneWayRate = cab.ratePerKm;
  const roundTripRate = cab.roundTripRatePerKm || cab.ratePerKm;
  const baseExtraKmRate = cab.extraKmRate || Math.round(cab.ratePerKm + 1.5);
  const dailyBata = cab.driverAllowancePerDay || 300;
  const hillBase = cab.hillStationCharge || 350;
  const local8HrBase = cab.local8Hr80KmFare || 1899;

  const cleanExtraKm = Math.max(0, Math.round(Number(extraKm || 0)));

  // 1. Hill Station & Mountain Terrain Pricing (Highest Priority: Steep Climb Fuel & Driver Effort)
  const {
    isHillRoute,
    pickupIsHill,
    dropIsHill,
    hillTier,
    hillRateMultiplier,
    hillTierLabel
  } = computeHillTerrainPricing(tripType, pickupCity, dropCity);

  // 2. Booking Date & Time Multiplier (At-the-time Urgent = High, Tomorrow = Standard, Advance = Discounted)
  const { leadTimeTier, leadTimeMultiplier, leadTimeLabel } = computeLeadTimePricing(
    pickupDate,
    pickupTime
  );

  // 3. Pickup Location & Outer Corridor Multiplier (Outer Pickup & Deep Outer Trips = Higher)
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
      ? 120
      : cabId === 'sedan'
      ? 150
      : cabId === 'exec_sedan'
      ? 180
      : cabId === 'suv'
      ? 200
      : cabId === 'innova'
      ? 250
      : 350;

  let baseBilledDistanceKm = Math.max(0, Math.round(distanceKm));
  let ratePerKm = oneWayRate;
  let baseRouteFare = 0;
  let driverAllowance = 0;
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
    hillTier === 'both_hills' ? 250 : hillTier === 'one_end_hill' ? 150 : 0;

  if (tripType === 'oneway') {
    baseBilledDistanceKm = Math.max(130, Math.round(distanceKm));
    const slabFactor =
      baseBilledDistanceKm <= 150 ? 1.04 : baseBilledDistanceKm > 350 ? 0.98 : 1.0;
    ratePerKm = Number((oneWayRate * slabFactor * dynamicRateFactor).toFixed(1));

    hillStationCharge =
      hillTier === 'both_hills'
        ? Math.round(hillBase * 2.0)
        : hillTier === 'one_end_hill'
        ? Math.round(hillBase * 1.45)
        : 0;
    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm);
    driverAllowance = dailyBata + hillDriverBonusPerDay;
  } else if (tripType === 'roundtrip') {
    if (pickupDate && returnDate) {
      const p = new Date(pickupDate).getTime();
      const r = new Date(returnDate).getTime();
      if (Number.isFinite(p) && Number.isFinite(r)) {
        const diffDays = Math.ceil((r - p) / (1000 * 60 * 60 * 24));
        daysCount = Math.max(1, diffDays + 1);
      }
    }
    const minKmForDays = daysCount * 250;
    const actualTwoWayKm = Math.round(distanceKm * 2);
    baseBilledDistanceKm = Math.max(minKmForDays, actualTwoWayKm);
    ratePerKm = Number((roundTripRate * dynamicRateFactor).toFixed(1));

    hillStationCharge =
      hillTier === 'both_hills'
        ? Math.round(hillBase * 2.4)
        : hillTier === 'one_end_hill'
        ? Math.round(hillBase * 1.8)
        : 0;
    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm);
    driverAllowance = daysCount * (dailyBata + hillDriverBonusPerDay);
  } else if (tripType === 'local') {
    const adjustedLocal8HrBase = Math.round(local8HrBase * dynamicRateFactor);
    if (localPackageId === '4h_40k') {
      baseBilledDistanceKm = 40;
      baseRouteFare = Math.round(adjustedLocal8HrBase * 0.66) - 150;
      driverAllowance = 150 + hillDriverBonusPerDay;
    } else if (localPackageId === '12h_120k') {
      baseBilledDistanceKm = 120;
      baseRouteFare = Math.round(adjustedLocal8HrBase * 1.34) - 300;
      driverAllowance = 300 + hillDriverBonusPerDay;
    } else {
      baseBilledDistanceKm = 80;
      baseRouteFare = adjustedLocal8HrBase - 250;
      driverAllowance = 250 + hillDriverBonusPerDay;
    }
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    hillStationCharge = isHillRoute ? hillBase : 0;
  } else if (tripType === 'airport') {
    baseBilledDistanceKm = Math.max(40, Math.round(distanceKm));
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    const airportFixedPickupFee =
      cabId === 'tempo' ? 650 : cabId === 'innova' || cabId === 'suv' ? 450 : 350;
    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm + airportFixedPickupFee);
    driverAllowance = 200 + hillDriverBonusPerDay;
    hillStationCharge = isHillRoute ? hillBase : 0;
  }

  // 4. Extra KM Slider Rate (Higher when Drop/Route is in Hill Area due to mountain fuel & gradient)
  const hillSliderFactor = dropIsHill ? 1.12 : isHillRoute ? 1.06 : 1.0;
  const extraKmRate = Math.max(
    Math.ceil(ratePerKm + (dropIsHill ? 3.0 : isHillRoute ? 2.5 : 1.5)),
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
    highwayToll = 120;
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
  const carrierFee = addonCarrier ? 300 : 0;
  const petFee = addonPet
    ? cabId === 'suv' || cabId === 'innova' || cabId === 'tempo'
      ? 1000
      : 800
    : 0;
  const assuredModelFee = addonAssuredModel ? 400 : 0;
  const addonsTotal = carrierFee + petFee + assuredModelFee;

  // 5% Commercial Passenger Transport GST
  const taxableSubtotal = baseFare + driverAllowance + addonsTotal;
  const gstAmount = Math.round(taxableSubtotal * 0.05);

  const totalFare = baseFare + driverAllowance + tollsAndTaxes + addonsTotal + gstAmount;

  // Strikethrough MRP (Traditional 2-way operator comparison)
  const mrpMultiplier = tripType === 'oneway' ? 1.42 : 1.18;
  const originalMarketFare = Math.round((totalFare * mrpMultiplier) / 10) * 10 - 1;
  const savingsAmount = Math.max(0, originalMarketFare - totalFare);
  const savingsPercent = Math.round((savingsAmount / originalMarketFare) * 100);

  const advanceFare = Math.round(totalFare * 0.20);
  const balanceDue = totalFare - advanceFare;

  return {
    distanceKm,
    extraKm: cleanExtraKm,
    sliderExtraFare,
    billedDistanceKm,
    baseFare,
    driverAllowance,
    nightCharges: 0,
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
