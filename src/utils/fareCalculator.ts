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
  ratePerKm: number;
}

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
  { keywords: ['noida', 'greaternoida', 'ghaziabad', 'agra', 'lucknow', 'varanasi', 'ayodhya', 'mathura', 'vrindavan', 'prayagraj', 'allahabad', 'kanpur', 'meerut', 'gorakhpur', 'bareilly', 'aligarh', 'jhansi', 'moradabad', 'muzaffarnagar', 'saharanpur', 'uttarpradesh'], state: 'Uttar Pradesh' },
  { keywords: ['gurgaon', 'gurugram', 'faridabad', 'panipat', 'ambala', 'karnal', 'sonipat', 'rohtak', 'hisar', 'kurukshetra', 'rewari', 'palwal', 'panchkula', 'haryana'], state: 'Haryana' },
  { keywords: ['jaipur', 'udaipur', 'jodhpur', 'ajmer', 'pushkar', 'jaisalmer', 'bikaner', 'kota', 'mountabu', 'alwar', 'bharatpur', 'khatushyam', 'salasar', 'neemrana', 'rajasthan'], state: 'Rajasthan' },
  { keywords: ['chandigarh', 'amritsar', 'ludhiana', 'jalandhar', 'patiala', 'bathinda', 'mohali', 'zirakpur', 'pathankot', 'ropar', 'kiratpur', 'punjab'], state: 'Punjab' },
  { keywords: ['shimla', 'manali', 'dharamshala', 'mcleodganj', 'dalhousie', 'kasauli', 'kullu', 'solan', 'spiti', 'kasol', 'chamba', 'khajjiar', 'mandi', 'bilaspurhp', 'himachal'], state: 'Himachal Pradesh' },
  { keywords: ['dehradun', 'haridwar', 'rishikesh', 'nainital', 'mussoorie', 'haldwani', 'roorkee', 'jimcorbett', 'corbett', 'kedarnath', 'badrinath', 'almora', 'ranikhet', 'gangotri', 'yamunotri', 'lansdowne', 'auil', 'auli', 'uttarakhand', 'uttrakhand'], state: 'Uttarakhand' },
  { keywords: ['mumbai', 'pune', 'lonavala', 'khandala', 'mahabaleshwar', 'shirdi', 'nashik', 'nagpur', 'aurangabad', 'sambhajinagar', 'thane', 'navimumbai', 'andheri', 'bandra', 'dadar', 'borivali', 'kalyan', 'kolhapur', 'solapur', 'maharashtra'], state: 'Maharashtra' },
  { keywords: ['goa', 'panaji', 'margao', 'calangute', 'baga', 'dabolim', 'mopa', 'vasco'], state: 'Goa' },
  { keywords: ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'somnath', 'bhuj', 'kutch', 'gandhinagar', 'statueofunity', 'kevadia', 'vapi', 'valsad', 'gujarat'], state: 'Gujarat' },
  { keywords: ['bangalore', 'bengaluru', 'mysore', 'mysuru', 'coorg', 'madikeri', 'mangalore', 'hubli', 'belgaum', 'chikmagalur', 'hampi', 'udupi', 'gokarna', 'kempegowda', 'whitefield', 'electroniccity', 'karnataka'], state: 'Karnataka' },
  { keywords: ['chennai', 'coimbatore', 'madurai', 'ooty', 'kodaikanal', 'rameswaram', 'kanyakumari', 'vellore', 'salem', 'trichy', 'thanjavur', 'mahabalipuram', 'hosur', 'tamilnadu'], state: 'Tamil Nadu' },
  { keywords: ['pondicherry', 'puducherry'], state: 'Puducherry' },
  { keywords: ['hyderabad', 'secunderabad', 'warangal', 'gachibowli', 'hitec', 'shamshabad', 'telangana'], state: 'Telangana' },
  { keywords: ['tirupati', 'visakhapatnam', 'vizag', 'vijayawada', 'guntur', 'nellore', 'kurnool', 'chittoor', 'andhrapradesh'], state: 'Andhra Pradesh' },
  { keywords: ['kochi', 'cochin', 'munnar', 'thiruvananthapuram', 'trivandrum', 'alleppey', 'alappuzha', 'wayanad', 'kozhikode', 'calicut', 'thekkady', 'kovalam', 'kerala'], state: 'Kerala' },
  { keywords: ['indore', 'bhopal', 'ujjain', 'omkareshwar', 'gwalior', 'jabalpur', 'khajuraho', 'pachmarhi', 'sanchi', 'madhyapradesh'], state: 'Madhya Pradesh' },
  { keywords: ['kolkata', 'howrah', 'darjeeling', 'siliguri', 'digha', 'durgapur', 'asansol', 'westbengal'], state: 'West Bengal' },
  { keywords: ['patna', 'gaya', 'bodhgaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'rajgir', 'nalanda', 'bihar'], state: 'Bihar' },
  { keywords: ['ranchi', 'jamshedpur', 'deoghar', 'dhanbad', 'bokaro', 'jharkhand'], state: 'Jharkhand' },
  { keywords: ['bhubaneswar', 'puri', 'konark', 'cuttack', 'rourkela', 'odisha'], state: 'Odisha' },
  { keywords: ['raipur', 'bilaspur', 'bhilai', 'durg', 'chhattisgarh'], state: 'Chhattisgarh' },
  { keywords: ['guwahati', 'shillong', 'kaziranga', 'gangtok', 'sikkim', 'assam', 'meghalaya'], state: 'North East' },
  { keywords: ['jammu', 'srinagar', 'katra', 'vaishnodevi', 'gulmarg', 'pahalgam', 'sonamarg', 'leh', 'ladakh', 'kashmir'], state: 'Jammu & Kashmir' }
];

const HILL_STATION_KEYWORDS = [
  'shimla', 'manali', 'mussoorie', 'nainital', 'dharamshala', 'mcleodganj', 'dalhousie',
  'kasauli', 'kullu', 'kasol', 'spiti', 'ooty', 'kodaikanal', 'munnar', 'wayanad',
  'coorg', 'madikeri', 'chikmagalur', 'mahabaleshwar', 'lonavala', 'khandala',
  'mountabu', 'pachmarhi', 'darjeeling', 'gangtok', 'shillong', 'gulmarg', 'pahalgam',
  'sonamarg', 'leh', 'ladakh', 'almora', 'ranikhet', 'badrinath', 'kedarnath', 'rishikesh',
  'lansdowne', 'auli', 'gangotri', 'yamunotri', 'khajjiar'
];

// Northern हिमाचल destinations that cross both Haryana AND Punjab (via Ambala-Ropar-Kiratpur/Pathankot)
const PUNJAB_TRANSIT_HIMACHAL_CITIES = [
  'manali', 'kullu', 'kasol', 'spiti', 'dharamshala', 'mcleodganj', 'dalhousie', 'chamba', 'khajjiar', 'mandi'
];

// Explicit High-Frequency Multi-State Highway Corridors in India (OriginState|DestState -> Full State Sequence)
const EXPLICIT_HIGHWAY_STATE_CORRIDORS: Record<string, string[]> = {
  // Delhi to Uttarakhand passes through Uttar Pradesh (Meerut/Muzaffarnagar/Moradabad NH-334/NH-9)
  'Delhi|Uttarakhand': ['Delhi', 'Uttar Pradesh', 'Uttarakhand'],
  'Uttarakhand|Delhi': ['Uttarakhand', 'Uttar Pradesh', 'Delhi'],

  // Delhi to Himachal Pradesh passes through Haryana (and Punjab for Manali/Dharamshala, handled dynamically)
  'Delhi|Himachal Pradesh': ['Delhi', 'Haryana', 'Himachal Pradesh'],
  'Himachal Pradesh|Delhi': ['Himachal Pradesh', 'Haryana', 'Delhi'],

  // Delhi to Punjab / Chandigarh passes through Haryana (NH-44 Panipat-Karnal-Ambala)
  'Delhi|Punjab': ['Delhi', 'Haryana', 'Punjab'],
  'Punjab|Delhi': ['Punjab', 'Haryana', 'Delhi'],

  // Delhi to Jammu & Kashmir passes through Haryana and Punjab (NH-44)
  'Delhi|Jammu & Kashmir': ['Delhi', 'Haryana', 'Punjab', 'Jammu & Kashmir'],
  'Jammu & Kashmir|Delhi': ['Jammu & Kashmir', 'Punjab', 'Haryana', 'Delhi'],

  // Delhi to Rajasthan passes through Haryana (NH-48 Gurgaon-Dharuhera-Bawal / Delhi-Mumbai Expwy)
  'Delhi|Rajasthan': ['Delhi', 'Haryana', 'Rajasthan'],
  'Rajasthan|Delhi': ['Rajasthan', 'Haryana', 'Delhi'],

  // Delhi to Madhya Pradesh passes through Uttar Pradesh (Agra/Jhansi)
  'Delhi|Madhya Pradesh': ['Delhi', 'Uttar Pradesh', 'Madhya Pradesh'],
  'Madhya Pradesh|Delhi': ['Madhya Pradesh', 'Uttar Pradesh', 'Delhi'],

  // Delhi to Bihar passes through Uttar Pradesh (Yamuna + Purvanchal Expwy)
  'Delhi|Bihar': ['Delhi', 'Uttar Pradesh', 'Bihar'],
  'Bihar|Delhi': ['Bihar', 'Uttar Pradesh', 'Delhi'],

  // Haryana (Gurgaon/Faridabad) to Uttarakhand passes through Delhi & Uttar Pradesh
  'Haryana|Uttarakhand': ['Haryana', 'Delhi', 'Uttar Pradesh', 'Uttarakhand'],
  'Uttarakhand|Haryana': ['Uttarakhand', 'Uttar Pradesh', 'Delhi', 'Haryana'],

  // Uttar Pradesh (Noida/Ghaziabad/Agra) to Himachal Pradesh
  'Uttar Pradesh|Himachal Pradesh': ['Uttar Pradesh', 'Delhi', 'Haryana', 'Himachal Pradesh'],
  'Himachal Pradesh|Uttar Pradesh': ['Himachal Pradesh', 'Haryana', 'Delhi', 'Uttar Pradesh'],

  // Uttar Pradesh to Punjab
  'Uttar Pradesh|Punjab': ['Uttar Pradesh', 'Delhi', 'Haryana', 'Punjab'],
  'Punjab|Uttar Pradesh': ['Punjab', 'Haryana', 'Delhi', 'Uttar Pradesh'],

  // Maharashtra (Mumbai/Pune) to Goa via NH-48 (Belgaum/Nipani Karnataka border)
  'Maharashtra|Goa': ['Maharashtra', 'Karnataka', 'Goa'],
  'Goa|Maharashtra': ['Goa', 'Karnataka', 'Maharashtra']
};

// Indian State Border Adjacency Graph for automatic multi-state transit discovery on any route
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

// State Commercial Cab Entry Permit Tax Rates per State (Sedan Base in INR; scales by vehicle category)
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
  const combined = normalizeRouteToken(pickupCity) + ' ' + normalizeRouteToken(dropCity);
  return HILL_STATION_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * Computes the complete sequence of Indian states traversed from pickupCity to dropCity,
 * including all intermediate transit states (e.g. Delhi -> Uttar Pradesh -> Uttarakhand for Delhi to Mussoorie).
 */
export function computeMultiStateRouteCorridor(
  originState: string,
  destState: string,
  pickupCity = '',
  dropCity = ''
): string[] {
  if (!originState || !destState) return [originState || 'Delhi'];
  if (originState === destState) return [originState];

  const combinedCities = normalizeRouteToken(pickupCity) + ' ' + normalizeRouteToken(dropCity);

  // Special check: Delhi / Haryana / UP to Manali / Dharamshala / Dalhousie / Kullu / Kasol crosses Punjab too
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

  // Special check: Uttar Pradesh (Noida / Ghaziabad) to Rajasthan passes through Delhi & Haryana
  if (
    originState === 'Uttar Pradesh' &&
    destState === 'Rajasthan' &&
    (combinedCities.includes('noida') || combinedCities.includes('ghaziabad') || combinedCities.includes('meerut'))
  ) {
    return ['Uttar Pradesh', 'Delhi', 'Haryana', 'Rajasthan'];
  }

  // Check explicit highway corridor table
  const pairKey = `${originState}|${destState}`;
  if (EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey]) {
    return EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey];
  }

  // BFS Shortest Path on India State Adjacency Graph to find intermediate transit states
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

/**
 * Calculates itemized State Border Entry Permit Tax for EVERY state entered after Origin State
 * (both intermediate Transit States like UP on Delhi->Mussoorie, and the Destination State like Uttarakhand).
 */
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

  // Vehicle class multiplier for State RTO Border Permits
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
      : 2.65; // Tempo Traveller

  // Every state entered after the starting state (index 1 .. length-1) requires its State Entry Permit
  const statesEntered = stateRoutePath.slice(1);
  const breakdown: StatePermitBreakdownItem[] = statesEntered.map((stateName, idx) => {
    const isFinalDest = idx === statesEntered.length - 1;
    const role: 'transit' | 'destination' = isFinalDest ? 'destination' : 'transit';
    const baseInfo = STATE_PERMIT_BASE_RATES_SEDAN[stateName] || {
      tax: 280,
      desc: `${stateName} State Entry Permit`
    };
    // Round to nearest ₹10 for clean RTO permit slab
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

  // Vehicle class multiplier on NHAI Toll Plazas (Cars/Jeeps/Vans = 1.0x, Tempo Traveller LCV/Minibus = 1.6x)
  const vehicleTollMultiplier = cabId === 'tempo' ? 1.6 : 1.0;

  if (matchedToll !== null) {
    return {
      baseTollOneWay: Math.round(matchedToll * vehicleTollMultiplier),
      expresswayName: matchedName
    };
  }

  // Fallback NHAI FASTag formula: ~85% of intercity route is tolled national highway @ ₹1.15/km for Cars
  const highwayBillableKm = Math.max(40, Math.round(distanceKm * 0.85));
  const nhaiRatePerKm = cabId === 'tempo' ? 1.85 : cabId === 'innova' || cabId === 'suv' ? 1.20 : 1.15;
  return {
    baseTollOneWay: Math.round(highwayBillableKm * nhaiRatePerKm),
    expresswayName: 'NHAI National Highway FASTag'
  };
}

/**
 * SafarIndiaCabs Comprehensive Fare, NHAI FASTag Toll & Multi-State Permit Calculation Engine
 * (100% synchronized with computeServerTripFare in /api/bookings.js)
 */
export function computeTripFare(params: {
  tripType: TripType;
  cabId: CabCategoryId;
  distanceKm: number;
  pickupCity?: string;
  dropCity?: string;
  pickupDate: string;
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
    pickupCity = '',
    dropCity = '',
    pickupDate,
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
  const extraKmRate = cab.extraKmRate || Math.round(cab.ratePerKm + 1.5);
  const dailyBata = cab.driverAllowancePerDay || 300;
  const hillBase = cab.hillStationCharge || 350;
  const local8HrBase = cab.local8Hr80KmFare || 1899;

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

  let billedDistanceKm = Math.max(0, Math.round(distanceKm));
  let ratePerKm = oneWayRate;
  let baseFare = 0;
  let driverAllowance = 0;
  let daysCount = 1;

  // Detect Hill Station Terrain & Multi-State Crossing
  const isHillRoute = tripType !== 'local' && isHillStationRoute(pickupCity, dropCity);
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

  if (tripType === 'oneway') {
    // SafarIndiaCabs One-Way Rule: Minimum 130 KM billing, Zero Return Fare
    billedDistanceKm = Math.max(130, Math.round(distanceKm));

    // Distance Slab Optimization:
    // Short routes (<=150 km) have a 1.04x dispatch factor; Long expressway routes (>350 km) get 0.96x efficiency rate
    const slabFactor = billedDistanceKm <= 150 ? 1.04 : billedDistanceKm > 350 ? 0.96 : 1.0;
    ratePerKm = Number((oneWayRate * slabFactor).toFixed(1));

    hillStationCharge = isHillRoute ? hillBase : 0;
    baseFare = Math.round(billedDistanceKm * ratePerKm) + hillStationCharge;
    driverAllowance = dailyBata;
  } else if (tripType === 'roundtrip') {
    if (pickupDate && returnDate) {
      const p = new Date(pickupDate).getTime();
      const r = new Date(returnDate).getTime();
      if (Number.isFinite(p) && Number.isFinite(r)) {
        const diffDays = Math.ceil((r - p) / (1000 * 60 * 60 * 24));
        daysCount = Math.max(1, diffDays + 1);
      }
    }
    // SafarIndiaCabs Round-Trip Rule: Minimum 250 KM per day OR actual two-way distance
    const minKmForDays = daysCount * 250;
    const actualTwoWayKm = Math.round(distanceKm * 2);
    billedDistanceKm = Math.max(minKmForDays, actualTwoWayKm);
    ratePerKm = roundTripRate;

    hillStationCharge = isHillRoute ? Math.round(hillBase * 1.4) : 0;
    baseFare = Math.round(billedDistanceKm * ratePerKm) + hillStationCharge;
    driverAllowance = daysCount * dailyBata;
  } else if (tripType === 'local') {
    // SafarIndiaCabs Local Hourly Packages (4hr/40km, 8hr/80km, 12hr/120km)
    if (localPackageId === '4h_40k') {
      billedDistanceKm = 40;
      baseFare = Math.round(local8HrBase * 0.66) - 150;
      driverAllowance = 150;
    } else if (localPackageId === '12h_120k') {
      billedDistanceKm = 120;
      baseFare = Math.round(local8HrBase * 1.34) - 300;
      driverAllowance = 300;
    } else {
      billedDistanceKm = 80;
      baseFare = local8HrBase - 250;
      driverAllowance = 250;
    }
  } else if (tripType === 'airport') {
    // SafarIndiaCabs Airport Pickup/Drop Transfer
    billedDistanceKm = Math.max(40, Math.round(distanceKm));
    const airportFixedPickupFee = cabId === 'tempo' ? 650 : cabId === 'innova' || cabId === 'suv' ? 450 : 350;
    baseFare = Math.round(billedDistanceKm * oneWayRate + airportFixedPickupFee);
    driverAllowance = 200;
  }

  // NHAI FASTag Highway Toll + Multi-State Entry Permit Calculation
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
      const permitInfo = computeMultiStatePermitBreakdown(originState, destState, pickupCity, dropCity, cabId);
      stateRoutePath = permitInfo.stateRoutePath;
      statePermitBreakdown = permitInfo.statePermitBreakdown;
      statePermitTax = permitInfo.totalStatePermitTax;
    }
  } else if (tripType === 'roundtrip') {
    const tollInfo = lookupRouteExpresswayToll(pickupCity, dropCity, Math.round(billedDistanceKm / 2), cabId);
    // NHAI Return Pass FASTag is ~1.85x of single journey toll
    highwayToll = Math.round(tollInfo.baseTollOneWay * 1.85);
    expresswayName = tollInfo.expresswayName;

    if (isInterState) {
      const permitInfo = computeMultiStatePermitBreakdown(originState, destState, pickupCity, dropCity, cabId);
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
  const petFee = addonPet ? (cabId === 'suv' || cabId === 'innova' || cabId === 'tempo' ? 1000 : 800) : 0;
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
    ratePerKm
  };
}

export function formatINR(val: number): string {
  return '₹' + Math.round(val).toLocaleString('en-IN');
}
