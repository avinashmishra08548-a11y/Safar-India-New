/**
 * Vercel Serverless API Route: /api/bookings
 *
 * Booking Repository & Server-Side Fare / Token Utilities
 *
 * IMPORTANT NOTE ON SERVERLESS STORAGE:
 * - `storedBookings`, `pendingOrdersById`, `verifiedPaymentsById`, and `verifiedOrdersById`
 *   are in-memory structures that only persist within a warm Vercel lambda instance.
 * - Therefore, `/api/create-order` and `/api/verify-payment` DO NOT rely solely on in-memory
 *   Maps across invocations. Instead, they persist booking metadata directly inside Razorpay's
 *   durable Order `receipt` and `notes` via the Razorpay Orders API and verify a timing-safe
 *   HMAC-SHA256 `verificationToken` signed with `RAZORPAY_KEY_SECRET`.
 */

import crypto from 'crypto';

// Fleet pricing table matching src/data/cabsFleet.ts (CabBazar Rate Matrix)
export const SERVER_CABS_FLEET = {
  hatchback: {
    id: 'hatchback',
    name: 'Hatchback AC',
    models: 'WagonR, Celerio, Tiago or equivalent',
    ratePerKm: 9.5,
    roundTripRatePerKm: 9.5,
    extraKmRate: 11,
    driverAllowancePerDay: 300,
    statePermitTax: 250,
    hillStationCharge: 300,
    local8Hr80KmFare: 1699
  },
  sedan: {
    id: 'sedan',
    name: 'Sedan AC (Dzire / Etios)',
    models: 'Maruti Suzuki Dzire, Toyota Etios, Hyundai Aura',
    ratePerKm: 10.5,
    roundTripRatePerKm: 10.5,
    extraKmRate: 12,
    driverAllowancePerDay: 300,
    statePermitTax: 300,
    hillStationCharge: 350,
    local8Hr80KmFare: 1899
  },
  exec_sedan: {
    id: 'exec_sedan',
    name: 'Prime Executive Sedan',
    models: 'Honda City, Maruti Ciaz, Hyundai Verna',
    ratePerKm: 13.5,
    roundTripRatePerKm: 13,
    extraKmRate: 15,
    driverAllowancePerDay: 350,
    statePermitTax: 350,
    hillStationCharge: 400,
    local8Hr80KmFare: 2499
  },
  suv: {
    id: 'suv',
    name: 'SUV AC (Ertiga / Carens)',
    models: 'Maruti Ertiga, Kia Carens, Toyota Rumion or equivalent',
    ratePerKm: 13.5,
    roundTripRatePerKm: 13.5,
    extraKmRate: 15.5,
    driverAllowancePerDay: 350,
    statePermitTax: 450,
    hillStationCharge: 450,
    local8Hr80KmFare: 2599
  },
  innova: {
    id: 'innova',
    name: 'Assured Innova Crysta',
    models: 'Toyota Innova Crysta (6+1 / 7+1 Luxury)',
    ratePerKm: 17.5,
    roundTripRatePerKm: 17,
    extraKmRate: 19.5,
    driverAllowancePerDay: 400,
    statePermitTax: 550,
    hillStationCharge: 550,
    local8Hr80KmFare: 3299
  },
  tempo: {
    id: 'tempo',
    name: 'Tempo Traveller AC (12 Seater)',
    models: 'Force Traveller / Urbania 12+1 Pushback AC',
    ratePerKm: 26,
    roundTripRatePerKm: 25,
    extraKmRate: 28,
    driverAllowancePerDay: 500,
    statePermitTax: 850,
    hillStationCharge: 800,
    local8Hr80KmFare: 5499
  }
};

const SERVER_EXPRESSWAY_TOLLS = {
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

const SERVER_CITY_STATE_KEYWORDS = [
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

const SERVER_HILL_STATION_KEYWORDS = [
  'shimla', 'manali', 'mussoorie', 'nainital', 'dharamshala', 'mcleodganj', 'dalhousie',
  'kasauli', 'kullu', 'kasol', 'spiti', 'ooty', 'kodaikanal', 'munnar', 'wayanad',
  'coorg', 'madikeri', 'chikmagalur', 'mahabaleshwar', 'lonavala', 'khandala',
  'mountabu', 'pachmarhi', 'darjeeling', 'gangtok', 'shillong', 'gulmarg', 'pahalgam',
  'sonamarg', 'leh', 'ladakh', 'almora', 'ranikhet', 'badrinath', 'kedarnath', 'rishikesh',
  'lansdowne', 'auli', 'gangotri', 'yamunotri', 'khajjiar'
];

const SERVER_PUNJAB_TRANSIT_HIMACHAL_CITIES = [
  'manali', 'kullu', 'kasol', 'spiti', 'dharamshala', 'mcleodganj', 'dalhousie', 'chamba', 'khajjiar', 'mandi'
];

const SERVER_EXPLICIT_HIGHWAY_STATE_CORRIDORS = {
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

const SERVER_INDIA_STATE_ADJACENCY = {
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

const SERVER_STATE_PERMIT_BASE_RATES_SEDAN = {
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

function normalizeServerRouteToken(str) {
  return String(str || '').toLowerCase().replace(/[^a-z]/g, '');
}

function detectServerLocationState(locationStr, fallbackState = 'Delhi') {
  if (!locationStr) return fallbackState;
  const norm = normalizeServerRouteToken(locationStr);
  for (const entry of SERVER_CITY_STATE_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (norm.includes(kw)) return entry.state;
    }
  }
  return fallbackState;
}

function isServerHillStationRoute(pickupCity, dropCity) {
  const combined = normalizeServerRouteToken(pickupCity) + ' ' + normalizeServerRouteToken(dropCity);
  return SERVER_HILL_STATION_KEYWORDS.some((kw) => combined.includes(kw));
}

function computeServerMultiStateRouteCorridor(originState, destState, pickupCity = '', dropCity = '') {
  if (!originState || !destState) return [originState || 'Delhi'];
  if (originState === destState) return [originState];

  const combinedCities = normalizeServerRouteToken(pickupCity) + ' ' + normalizeServerRouteToken(dropCity);

  if (
    (originState === 'Delhi' || originState === 'Haryana' || originState === 'Uttar Pradesh') &&
    destState === 'Himachal Pradesh' &&
    SERVER_PUNJAB_TRANSIT_HIMACHAL_CITIES.some((city) => combinedCities.includes(city))
  ) {
    if (originState === 'Uttar Pradesh') return ['Uttar Pradesh', 'Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh'];
    if (originState === 'Delhi') return ['Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh'];
    return ['Haryana', 'Punjab', 'Himachal Pradesh'];
  }

  if (
    destState === 'Delhi' &&
    originState === 'Himachal Pradesh' &&
    SERVER_PUNJAB_TRANSIT_HIMACHAL_CITIES.some((city) => combinedCities.includes(city))
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
  if (SERVER_EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey]) {
    return SERVER_EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey];
  }

  const queue = [[originState]];
  const visited = new Set([originState]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    if (current === destState) return path;
    const neighbors = SERVER_INDIA_STATE_ADJACENCY[current] || [];
    for (const nextState of neighbors) {
      if (!visited.has(nextState)) {
        visited.add(nextState);
        queue.push([...path, nextState]);
      }
    }
  }

  return [originState, destState];
}

function computeServerMultiStatePermitBreakdown(originState, destState, pickupCity = '', dropCity = '', cabId = 'sedan') {
  const stateRoutePath = computeServerMultiStateRouteCorridor(originState, destState, pickupCity, dropCity);
  if (stateRoutePath.length <= 1) {
    return { stateRoutePath, statePermitBreakdown: [], totalStatePermitTax: 0 };
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
  const breakdown = statesEntered.map((stateName, idx) => {
    const isFinalDest = idx === statesEntered.length - 1;
    const role = isFinalDest ? 'destination' : 'transit';
    const baseInfo = SERVER_STATE_PERMIT_BASE_RATES_SEDAN[stateName] || { tax: 280, desc: `${stateName} State Entry Permit` };
    const taxAmount = Math.round((baseInfo.tax * vehiclePermitMultiplier) / 10) * 10;
    const label = role === 'transit'
      ? `${stateName} (En-Route Transit State Permit)`
      : `${stateName} (Destination State Entry Permit)`;
    return { state: stateName, role, label, taxAmount };
  });

  const totalStatePermitTax = breakdown.reduce((sum, item) => sum + item.taxAmount, 0);
  return { stateRoutePath, statePermitBreakdown: breakdown, totalStatePermitTax };
}

function lookupServerRouteExpresswayToll(pickupCity, dropCity, distanceKm = 230, cabId = 'sedan') {
  const nFrom = normalizeServerRouteToken(pickupCity);
  const nTo = normalizeServerRouteToken(dropCity);

  let matchedToll = null;
  let matchedName = 'NHAI Highway FASTag';

  if (nFrom && nTo) {
    for (const [pairKey, info] of Object.entries(SERVER_EXPRESSWAY_TOLLS)) {
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
 * Strip all whitespace, invisible Unicode characters (zero-width spaces, BOM, non-breaking spaces,
 * directional marks, control characters), and accidental surrounding quotes from credentials/env vars.
 */
export function cleanEnvVar(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .replace(/['"`“”‘’]+/g, '')
    .trim();
}

/**
 * Resolve and normalize Razorpay credentials with automatic fallback across RAZORPAY_KEY_ID,
 * VITE_RAZORPAY_KEY_ID, NEXT_PUBLIC_RAZORPAY_KEY_ID, and optional clientPublicKeyId.
 */
export function resolveNormalizedRazorpayCredentials(env = process.env, clientPublicKeyId = '') {
  const rawServerKeyId = typeof env?.RAZORPAY_KEY_ID === 'string' ? env.RAZORPAY_KEY_ID : '';
  const rawViteKeyId = typeof env?.VITE_RAZORPAY_KEY_ID === 'string' ? env.VITE_RAZORPAY_KEY_ID : '';
  const rawNextKeyId =
    typeof env?.NEXT_PUBLIC_RAZORPAY_KEY_ID === 'string' ? env.NEXT_PUBLIC_RAZORPAY_KEY_ID : '';
  const rawKeySecret = typeof env?.RAZORPAY_KEY_SECRET === 'string' ? env.RAZORPAY_KEY_SECRET : '';

  const serverKeyId = cleanEnvVar(rawServerKeyId);
  const vitePublicKeyId = cleanEnvVar(rawViteKeyId) || cleanEnvVar(rawNextKeyId);
  const normalizedClientKeyId = cleanEnvVar(clientPublicKeyId);
  const keySecret = cleanEnvVar(rawKeySecret);

  const isValidKeyFormat = (k) =>
    Boolean(k) && (k.startsWith('rzp_live_') || k.startsWith('rzp_test_'));

  // Build ordered list of unique valid-format candidate Key IDs to try against Razorpay API
  const candidateKeys = [];
  const addCandidate = (k, source) => {
    if (isValidKeyFormat(k) && !candidateKeys.some((item) => item.keyId === k)) {
      candidateKeys.push({ keyId: k, source });
    }
  };

  addCandidate(serverKeyId, 'RAZORPAY_KEY_ID');
  addCandidate(vitePublicKeyId, 'VITE_RAZORPAY_KEY_ID');
  addCandidate(normalizedClientKeyId, 'client_VITE_RAZORPAY_KEY_ID');

  let keyId = '';
  let keySource = 'none';

  if (candidateKeys.length > 0) {
    keyId = candidateKeys[0].keyId;
    keySource =
      candidateKeys[0].source === 'RAZORPAY_KEY_ID'
        ? 'RAZORPAY_KEY_ID'
        : `${candidateKeys[0].source} (fallback)`;
  } else if (serverKeyId) {
    keyId = serverKeyId;
    keySource = 'RAZORPAY_KEY_ID';
  } else if (vitePublicKeyId) {
    keyId = vitePublicKeyId;
    keySource = 'VITE_RAZORPAY_KEY_ID (fallback)';
  } else if (normalizedClientKeyId) {
    keyId = normalizedClientKeyId;
    keySource = 'client_VITE_RAZORPAY_KEY_ID (fallback)';
  }

  // Deterministic HMAC signing secret for order/direct verification tokens
  const signingSecret =
    keySecret ||
    cleanEnvVar(env?.OTP_SECRET) ||
    (keyId ? `safar_token_secret_${keyId}` : 'safar_default_token_secret');

  const keyPrefix = keyId ? keyId.slice(0, 9) : 'MISSING';
  const keyMaskedPreview =
    keyId.length >= 13
      ? `${keyId.slice(0, 9)}***${keyId.slice(-4)}`
      : keyId
      ? `${keyId.slice(0, 5)}***`
      : 'MISSING';
  const keyMode = keyId.startsWith('rzp_live_')
    ? 'live'
    : keyId.startsWith('rzp_test_')
    ? 'test'
    : keyId
    ? 'invalid_prefix'
    : 'missing';

  return {
    keyId,
    keySecret,
    signingSecret,
    serverKeyId,
    vitePublicKeyId,
    candidateKeys,
    keySource,
    diagnostics: {
      keySource,
      keyPrefix,
      keyMaskedPreview,
      keyMode,
      keyLength: keyId.length,
      candidateKeysCount: candidateKeys.length,
      hasRazorpayKeyIdEnv: Boolean(serverKeyId),
      hasViteRazorpayKeyIdEnv: Boolean(vitePublicKeyId),
      usedFallbackToViteKey: keySource.includes('VITE_RAZORPAY_KEY_ID'),
      keyHadHiddenOrWhitespaceChars:
        (Boolean(rawServerKeyId) && rawServerKeyId !== serverKeyId) ||
        (Boolean(rawViteKeyId) && rawViteKeyId !== vitePublicKeyId),
      hasRazorpayKeySecretEnv: Boolean(keySecret),
      secretLength: keySecret.length,
      secretHadHiddenOrWhitespaceChars:
        Boolean(rawKeySecret) && rawKeySecret !== keySecret
    }
  };
}

const SERVER_DAILY_ROUTE_HUB_KEYWORDS = [
  'delhi', 'newdelhi', 'noida', 'greaternoida', 'gurgaon', 'gurugram', 'ghaziabad', 'faridabad',
  'agra', 'mathura', 'vrindavan', 'jaipur', 'chandigarh', 'mohali', 'zirakpur', 'panchkula',
  'ambala', 'panipat', 'karnal', 'sonipat', 'kurukshetra', 'haridwar', 'rishikesh', 'dehradun',
  'lucknow', 'kanpur', 'ayodhya', 'varanasi', 'prayagraj', 'allahabad', 'amritsar', 'ludhiana',
  'jalandhar', 'patiala', 'mumbai', 'navimumbai', 'thane', 'pune', 'lonavala', 'shirdi', 'nashik',
  'ahmedabad', 'surat', 'vadodara', 'gandhinagar', 'udaipur', 'bangalore', 'bengaluru', 'mysore',
  'mysuru', 'chennai', 'pondicherry', 'puducherry', 'hyderabad', 'secunderabad', 'tirupati',
  'kolkata', 'howrah', 'indore', 'bhopal', 'ujjain', 'patna', 'nagpur', 'coimbatore', 'kochi'
];

function isServerDailyRouteCity(locationStr) {
  if (!locationStr) return true;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return true;
  return SERVER_DAILY_ROUTE_HUB_KEYWORDS.some((kw) => norm.includes(kw));
}

function computeServerLeadTimePricing(pickupDate) {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cleanPickup = String(pickupDate || '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanPickup)) {
      return { leadTimeTier: 'tomorrow', leadTimeMultiplier: 1.0 };
    }
    const pickupMs = Date.parse(`${cleanPickup}T00:00:00Z`);
    const todayMs = Date.parse(`${todayIST}T00:00:00Z`);
    if (!Number.isFinite(pickupMs) || !Number.isFinite(todayMs)) {
      return { leadTimeTier: 'tomorrow', leadTimeMultiplier: 1.0 };
    }
    const daysAhead = Math.round((pickupMs - todayMs) / 86400000);
    if (daysAhead <= 0) {
      return { leadTimeTier: 'same_day', leadTimeMultiplier: 1.14 };
    }
    if (daysAhead === 1) {
      return { leadTimeTier: 'tomorrow', leadTimeMultiplier: 1.0 };
    }
    if (daysAhead >= 5) {
      return { leadTimeTier: 'advance', leadTimeMultiplier: 0.90 };
    }
    return { leadTimeTier: 'advance', leadTimeMultiplier: 0.93 };
  } catch {
    return { leadTimeTier: 'tomorrow', leadTimeMultiplier: 1.0 };
  }
}

function computeServerRouteTierPricing(tripType, pickupCity, dropCity) {
  const pickupIsDaily = isServerDailyRouteCity(pickupCity);
  if (tripType === 'local' || tripType === 'airport') {
    if (pickupIsDaily) {
      return { isOuterRoute: false, routeTierMultiplier: 1.0 };
    }
    return { isOuterRoute: true, routeTierMultiplier: 1.12 };
  }
  const dropIsDaily = isServerDailyRouteCity(dropCity);
  if (pickupIsDaily && dropIsDaily) {
    return { isOuterRoute: false, routeTierMultiplier: 1.0 };
  }
  if (!pickupIsDaily && !dropIsDaily) {
    return { isOuterRoute: true, routeTierMultiplier: 1.18 };
  }
  return { isOuterRoute: true, routeTierMultiplier: 1.12 };
}

/**
 * Compute trip fare on the server using the exact SafarIndiaCabs pricing rules in src/utils/fareCalculator.ts
 */
export function computeServerTripFare({
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
}) {
  const validTripTypes = ['oneway', 'roundtrip', 'local', 'airport'];
  if (!validTripTypes.includes(tripType)) {
    throw new Error(`Invalid tripType: ${tripType}`);
  }

  const cab = SERVER_CABS_FLEET[cabId] || SERVER_CABS_FLEET.sedan;
  const oneWayRate = cab.ratePerKm;
  const roundTripRate = cab.roundTripRatePerKm || cab.ratePerKm;
  const dailyBata = cab.driverAllowancePerDay || 300;
  const hillBase = cab.hillStationCharge || 350;
  const local8HrBase = cab.local8Hr80KmFare || 1899;

  const { leadTimeMultiplier } = computeServerLeadTimePricing(pickupDate);
  const { routeTierMultiplier } = computeServerRouteTierPricing(tripType, pickupCity, dropCity);
  const dynamicRateFactor = leadTimeMultiplier * routeTierMultiplier;

  const parsedDistance = Number(distanceKm ?? 0);
  if (!Number.isFinite(parsedDistance) || parsedDistance < 0 || parsedDistance > 15000) {
    throw new Error(`Invalid distanceKm: ${distanceKm}`);
  }

  let billedDistanceKm = Math.max(0, Math.round(parsedDistance));
  let ratePerKm = oneWayRate;
  let baseFare = 0;
  let driverAllowance = 0;
  let daysCount = 1;

  const isHillRoute = tripType !== 'local' && isServerHillStationRoute(pickupCity, dropCity);
  const originState = detectServerLocationState(pickupCity, 'Delhi');
  const destState =
    tripType === 'local'
      ? originState
      : detectServerLocationState(dropCity, pickupCity ? originState : 'Uttar Pradesh');
  const isInterState =
    tripType !== 'local' &&
    tripType !== 'airport' &&
    Boolean(originState && destState && originState !== destState);

  let hillStationCharge = 0;

  if (tripType === 'oneway') {
    billedDistanceKm = Math.max(130, Math.round(parsedDistance));
    const slabFactor = billedDistanceKm <= 150 ? 1.04 : billedDistanceKm > 350 ? 0.96 : 1.0;
    ratePerKm = Number((oneWayRate * slabFactor * dynamicRateFactor).toFixed(1));
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
    const minKmForDays = daysCount * 250;
    const actualTwoWayKm = Math.round(parsedDistance * 2);
    billedDistanceKm = Math.max(minKmForDays, actualTwoWayKm);
    ratePerKm = Number((roundTripRate * dynamicRateFactor).toFixed(1));
    hillStationCharge = isHillRoute ? Math.round(hillBase * 1.4) : 0;
    baseFare = Math.round(billedDistanceKm * ratePerKm) + hillStationCharge;
    driverAllowance = daysCount * dailyBata;
  } else if (tripType === 'local') {
    const adjustedLocal8HrBase = Math.round(local8HrBase * dynamicRateFactor);
    if (localPackageId === '4h_40k') {
      billedDistanceKm = 40;
      baseFare = Math.round(adjustedLocal8HrBase * 0.66) - 150;
      driverAllowance = 150;
    } else if (localPackageId === '12h_120k') {
      billedDistanceKm = 120;
      baseFare = Math.round(adjustedLocal8HrBase * 1.34) - 300;
      driverAllowance = 300;
    } else {
      billedDistanceKm = 80;
      baseFare = adjustedLocal8HrBase - 250;
      driverAllowance = 250;
    }
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
  } else if (tripType === 'airport') {
    billedDistanceKm = Math.max(40, Math.round(parsedDistance));
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    const airportFixedPickupFee = cabId === 'tempo' ? 650 : cabId === 'innova' || cabId === 'suv' ? 450 : 350;
    baseFare = Math.round(billedDistanceKm * ratePerKm + airportFixedPickupFee);
    driverAllowance = 200;
  }

  let highwayToll = 0;
  let statePermitTax = 0;
  let stateRoutePath = [originState];
  let statePermitBreakdown = [];

  if (tripType === 'oneway') {
    const tollInfo = lookupServerRouteExpresswayToll(pickupCity, dropCity, billedDistanceKm, cabId);
    highwayToll = tollInfo.baseTollOneWay;
    if (isInterState) {
      const permitInfo = computeServerMultiStatePermitBreakdown(originState, destState, pickupCity, dropCity, cabId);
      stateRoutePath = permitInfo.stateRoutePath;
      statePermitBreakdown = permitInfo.statePermitBreakdown;
      statePermitTax = permitInfo.totalStatePermitTax;
    }
  } else if (tripType === 'roundtrip') {
    const tollInfo = lookupServerRouteExpresswayToll(pickupCity, dropCity, Math.round(billedDistanceKm / 2), cabId);
    highwayToll = Math.round(tollInfo.baseTollOneWay * 1.85);
    if (isInterState) {
      const permitInfo = computeServerMultiStatePermitBreakdown(originState, destState, pickupCity, dropCity, cabId);
      stateRoutePath = permitInfo.stateRoutePath;
      statePermitBreakdown = permitInfo.statePermitBreakdown;
      statePermitTax = permitInfo.totalStatePermitTax;
    }
  } else if (tripType === 'airport') {
    highwayToll = 120;
    statePermitTax = 0;
  }

  const estimatedTollsAndTaxes = highwayToll + statePermitTax;
  const tollsAndTaxes = includeTolls ? estimatedTollsAndTaxes : 0;

  const carrierFee = addonCarrier ? 300 : 0;
  const petFee = addonPet ? (cabId === 'suv' || cabId === 'innova' || cabId === 'tempo' ? 1000 : 800) : 0;
  const assuredModelFee = addonAssuredModel ? 400 : 0;
  const addonsTotal = carrierFee + petFee + assuredModelFee;

  const taxableSubtotal = baseFare + driverAllowance + addonsTotal;
  const gstAmount = Math.round(taxableSubtotal * 0.05);

  const totalFare = baseFare + driverAllowance + tollsAndTaxes + addonsTotal + gstAmount;
  const advanceFare = Math.round(totalFare * 0.20);
  const balanceDue = totalFare - advanceFare;

  return {
    distanceKm: parsedDistance,
    billedDistanceKm,
    baseFare,
    driverAllowance,
    highwayToll,
    statePermitTax,
    estimatedTollsAndTaxes,
    tollsAndTaxes,
    addonsTotal,
    gstAmount,
    totalFare,
    advanceFare,
    balanceDue,
    daysCount,
    ratePerKm
  };
}

/**
 * Create a timing-safe HMAC verification token that binds the Razorpay order and booking parameters
 * so verification works reliably across separate Vercel serverless invocations.
 */
export function signOrderVerificationToken(payload, secret) {
  const canonical = [
    payload.bookingId,
    payload.orderId,
    payload.amountInPaise,
    payload.totalFare,
    payload.advancePaid,
    payload.balanceDue,
    payload.paymentMode,
    payload.customerPhone,
    payload.tripType,
    payload.cabId
  ].join('|');

  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

export function verifyOrderVerificationToken(payload, token, secret) {
  if (!token || typeof token !== 'string' || !secret) return false;
  const expected = signOrderVerificationToken(payload, secret);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(token.trim(), 'utf8');
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// In-memory cache for warm serverless invocations
let storedBookings = [
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
    advancePaid: 363,
    balanceDue: 1454,
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

const pendingOrdersById = new Map();
const verifiedPaymentsById = new Map();
const verifiedOrdersById = new Map();

export function registerPendingOrderRecord(orderRecord) {
  if (!orderRecord || !orderRecord.orderId || !orderRecord.bookingId) return;
  pendingOrdersById.set(orderRecord.orderId, {
    ...orderRecord,
    status: 'created',
    createdAt: new Date().toISOString()
  });
}

export function getPendingOrderRecord(orderId) {
  return pendingOrdersById.get(orderId) || null;
}

export function getVerifiedPaymentRecord(paymentId) {
  return verifiedPaymentsById.get(paymentId) || null;
}

export function getVerifiedOrderRecord(orderId) {
  return verifiedOrdersById.get(orderId) || null;
}

export function saveVerifiedBookingRecord({ booking, orderId, paymentId }) {
  if (!booking || !booking.id) {
    throw new Error('Cannot save verified booking without booking.id');
  }

  const confirmedBooking = {
    ...booking,
    status: 'confirmed',
    transactionId: paymentId
  };

  const existingIdx = storedBookings.findIndex(b => b.id === confirmedBooking.id);
  if (existingIdx >= 0) {
    storedBookings[existingIdx] = { ...storedBookings[existingIdx], ...confirmedBooking };
  } else {
    storedBookings.unshift(confirmedBooking);
  }

  const record = {
    bookingId: confirmedBooking.id,
    orderId,
    paymentId,
    verifiedAt: new Date().toISOString(),
    booking: confirmedBooking
  };

  if (paymentId) {
    verifiedPaymentsById.set(paymentId, record);
  }
  if (orderId) {
    verifiedOrdersById.set(orderId, record);
    const pending = pendingOrdersById.get(orderId);
    if (pending) {
      pendingOrdersById.set(orderId, { ...pending, status: 'verified', paymentId });
    }
  }

  return confirmedBooking;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const cleanList = storedBookings.filter(
      b => b && !b.id.includes('DEMO') && !b.id.includes('TEST')
    );
    return res.status(200).json({
      success: true,
      count: cleanList.length,
      bookings: cleanList
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { action, booking, bookingId, status, driverInfo } = body || {};

      if (action === 'clear_demo') {
        storedBookings = storedBookings.filter(
          b => b.transactionId && !b.id.includes('DEMO') && !b.id.includes('TEST')
        );
        return res.status(200).json({ success: true, count: storedBookings.length, bookings: storedBookings });
      }

      if (action === 'update_status' && bookingId) {
        storedBookings = storedBookings.map(b => {
          if (b.id === bookingId) {
            return {
              ...b,
              status: status || b.status,
              driverName: driverInfo?.name || b.driverName,
              driverPhone: driverInfo?.phone || b.driverPhone,
              driverVehicleModel: driverInfo?.vehicleModel || b.driverVehicleModel,
              driverVehicleNo: driverInfo?.carPlate || b.driverVehicleNo,
              driverAssignedAt: driverInfo ? new Date().toISOString() : b.driverAssignedAt
            };
          }
          return b;
        });
        return res.status(200).json({ success: true, bookings: storedBookings });
      }

      if (booking && booking.id) {
        if (
          booking.status === 'confirmed' &&
          (!booking.transactionId || !String(booking.transactionId).startsWith('pay_'))
        ) {
          return res.status(400).json({
            success: false,
            error: 'Bookings cannot be marked confirmed without a verified Razorpay payment.'
          });
        }

        const existingIdx = storedBookings.findIndex(b => b.id === booking.id);
        if (existingIdx >= 0) {
          storedBookings[existingIdx] = { ...storedBookings[existingIdx], ...booking };
        } else {
          storedBookings.unshift(booking);
        }
        return res.status(200).json({ success: true, booking, bookings: storedBookings });
      }

      return res.status(400).json({ error: 'Missing booking details' });
    } catch (err) {
      console.error('Error in /api/bookings:', err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
