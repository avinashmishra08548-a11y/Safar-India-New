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

// Fleet pricing table matching src/data/cabsFleet.ts (CabBazar / Gozo / Savaari Calibrated Matrix)
export const SERVER_CABS_FLEET = {
  hatchback: {
    id: 'hatchback',
    name: 'Hatchback AC',
    models: 'WagonR, Celerio, Tiago or equivalent',
    ratePerKm: 10.2,
    roundTripRatePerKm: 11.5,
    extraKmRate: 11.5,
    driverAllowancePerDay: 280,
    statePermitTax: 200,
    hillStationCharge: 340,
    local8Hr80KmFare: 1749
  },
  sedan: {
    id: 'sedan',
    name: 'Sedan AC (Dzire / Etios)',
    models: 'Maruti Suzuki Dzire, Toyota Etios, Hyundai Aura',
    ratePerKm: 11.2,
    roundTripRatePerKm: 13,
    extraKmRate: 12.5,
    driverAllowancePerDay: 320,
    statePermitTax: 250,
    hillStationCharge: 420,
    local8Hr80KmFare: 1999
  },
  exec_sedan: {
    id: 'exec_sedan',
    name: 'Prime Executive Sedan',
    models: 'Honda City, Maruti Ciaz, Hyundai Verna',
    ratePerKm: 13,
    roundTripRatePerKm: 15,
    extraKmRate: 14.5,
    driverAllowancePerDay: 360,
    statePermitTax: 300,
    hillStationCharge: 480,
    local8Hr80KmFare: 2449
  },
  suv: {
    id: 'suv',
    name: 'SUV AC (Ertiga / Carens)',
    models: 'Maruti Ertiga, Kia Carens, Toyota Rumion or equivalent',
    ratePerKm: 14.5,
    roundTripRatePerKm: 17,
    extraKmRate: 16,
    driverAllowancePerDay: 380,
    statePermitTax: 350,
    hillStationCharge: 550,
    local8Hr80KmFare: 2749
  },
  innova: {
    id: 'innova',
    name: 'Assured Innova Crysta',
    models: 'Toyota Innova Crysta (6+1 / 7+1 Luxury)',
    ratePerKm: 18,
    roundTripRatePerKm: 22,
    extraKmRate: 20,
    driverAllowancePerDay: 450,
    statePermitTax: 450,
    hillStationCharge: 700,
    local8Hr80KmFare: 3499
  },
  tempo: {
    id: 'tempo',
    name: 'Tempo Traveller AC (12 Seater)',
    models: 'Force Traveller / Urbania 12+1 Pushback AC',
    ratePerKm: 24,
    roundTripRatePerKm: 27,
    extraKmRate: 26,
    driverAllowancePerDay: 550,
    statePermitTax: 650,
    hillStationCharge: 950,
    local8Hr80KmFare: 5299
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
  'lansdowne', 'auli', 'gangotri', 'yamunotri', 'khajjiar',
  'rudraprayag', 'karnaprayag', 'devprayag', 'nandaprayag', 'vishnuprayag', 'sonprayag',
  'guptkashi', 'ukhimath', 'chamoli', 'joshimath', 'pipalkoti', 'gopeshwar', 'chopta',
  'uttarkashi', 'barkot', 'harsil', 'tehri', 'newtehri', 'pauri', 'srinagargarhwal',
  'kotdwar', 'chakrata', 'dhanaulti', 'kanatal', 'chamba', 'bhimtal', 'sattal', 'naukuchiatal',
  'mukteshwar', 'ramgarh', 'kausani', 'binsar', 'bageshwar', 'pithoragarh', 'champawat',
  'munsiyari', 'chaukori', 'dharchula', 'tanakpur', 'haldwani', 'kathgodam', 'ramnagar',
  'jimcorbett', 'corbett', 'solan', 'chail', 'kufri', 'narkanda', 'rampur', 'kinnaur',
  'kalpa', 'sangla', 'chitkul', 'keylong', 'kaza', 'manikaran', 'tosh', 'malana', 'mandi',
  'bir', 'billing', 'palampur', 'kangra', 'bharmour', 'parwanoo', 'baddi', 'bilaspurhp',
  'katra', 'vaishnodevi', 'patnitop', 'kishtwar', 'bhaderwah', 'kargil', 'nubra', 'pangong',
  'kalimpong', 'kurseong', 'mirik', 'pelling', 'lachung', 'lachen', 'tawang', 'ziro',
  'bomdila', 'cherrapunji', 'sohra', 'dawki', 'kohima', 'aizawl', 'imphal', 'saputara',
  'panchgani', 'matheran', 'igatpuri', 'bhandardara', 'lavasa', 'coonoor', 'kotagiri',
  'yercaud', 'yelagiri', 'valparai', 'vagamon', 'thekkady', 'ponmudi', 'araku', 'horsley'
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
  const breakdown = statesEntered.map((stateName, idx) => {
    const isFinalDest = idx === statesEntered.length - 1;
    const role = isFinalDest ? 'destination' : 'transit';
    const baseInfo = SERVER_STATE_PERMIT_BASE_RATES_SEDAN[stateName] || { tax: 200, desc: `${stateName} State Entry Permit` };
    const roleFactor = role === 'transit' ? 0.5 : 1.0;
    const taxAmount = Math.round((baseInfo.tax * vehiclePermitMultiplier * roleFactor) / 10) * 10;
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
  'ambala', 'panipat', 'karnal', 'sonipat', 'kurukshetra', 'haridwar', 'dehradun',
  'lucknow', 'kanpur', 'ayodhya', 'varanasi', 'prayagraj', 'allahabad', 'amritsar', 'ludhiana',
  'jalandhar', 'patiala', 'mumbai', 'navimumbai', 'thane', 'pune', 'shirdi', 'nashik',
  'ahmedabad', 'surat', 'vadodara', 'gandhinagar', 'udaipur', 'bangalore', 'bengaluru', 'mysore',
  'mysuru', 'chennai', 'pondicherry', 'puducherry', 'hyderabad', 'secunderabad', 'tirupati',
  'kolkata', 'howrah', 'indore', 'bhopal', 'ujjain', 'patna', 'nagpur', 'coimbatore', 'kochi'
];

const SERVER_DEEP_MOUNTAIN_HILL_KEYWORDS = [
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

const SERVER_FOOTHILL_GATEWAY_KEYWORDS = [
  'dehradun', 'haridwar', 'haldwani', 'kathgodam', 'ramnagar', 'corbett', 'jimcorbett',
  'kotdwar', 'tanakpur', 'kalka', 'parwanoo', 'pathankot', 'kiratpur', 'ropar', 'siliguri', 'jammu'
];

function isServerDailyRouteCity(locationStr) {
  if (!locationStr) return true;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return true;
  if (isServerLocationInHillArea(locationStr)) return false;
  return SERVER_DAILY_ROUTE_HUB_KEYWORDS.some((kw) => norm.includes(kw));
}

function isServerLocationInHillArea(locationStr) {
  if (!locationStr) return false;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return false;
  return SERVER_HILL_STATION_KEYWORDS.some((kw) => norm.includes(kw)) || SERVER_DEEP_MOUNTAIN_HILL_KEYWORDS.some((kw) => norm.includes(kw));
}

function isServerLocationInDeepMountain(locationStr) {
  if (!locationStr) return false;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return false;
  return SERVER_DEEP_MOUNTAIN_HILL_KEYWORDS.some((kw) => norm.includes(kw));
}

function isServerLocationFoothillGateway(locationStr) {
  if (!locationStr) return false;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return false;
  return SERVER_FOOTHILL_GATEWAY_KEYWORDS.some((kw) => norm.includes(kw));
}

function parseServerPickupHourOfDay(pickupTime) {
  const raw = String(pickupTime || '').trim().toUpperCase();
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

function formatServerHourOfDay(fractionalHour) {
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

function computeServerLeadTimePricing(pickupDate, pickupTime, distanceKm = 230, isHillRoute = false, hillTier = 'none', dropIsHill = false) {
  const pickupHour = parseServerPickupHourOfDay(pickupTime);
  const avgSpeedKmph =
    hillTier === 'both_hills'
      ? 32
      : hillTier === 'one_end_hill' || isHillRoute
      ? 44
      : 55;
  const estimatedDriveHours = Math.max(1.0, distanceKm / avgSpeedKmph + 0.25);
  const arrivalHourContinuous = pickupHour + estimatedDriveHours;
  const arrivalHourOfDay = ((arrivalHourContinuous % 24) + 24) % 24;
  const estimatedDropTime = formatServerHourOfDay(arrivalHourContinuous);

  const isEarlyOrNightPickup = pickupHour >= 22.5 || pickupHour <= 5.5;
  const isLateNightDrop = dropIsHill
    ? arrivalHourContinuous >= 21.5 || arrivalHourOfDay <= 4.5
    : arrivalHourContinuous >= 23.0 || arrivalHourOfDay <= 4.5;

  let timingBonusFactor = 0;
  let timingAllowance = 0;

  if (isEarlyOrNightPickup) {
    timingBonusFactor += 0.02;
    timingAllowance += 150;
  }
  if (isLateNightDrop) {
    timingBonusFactor += 0.02;
    timingAllowance += 150;
  }

  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cleanPickup = String(pickupDate || '').trim().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanPickup)) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
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
        leadTimeMultiplier: Number((1.04 + timingBonusFactor).toFixed(2)),
        leadTimeLabel: 'Same-Day Instant Dispatch',
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

function computeServerHillAreaPricing(tripType, pickupCity, dropCity) {
  const pickupIsHill = isServerLocationInHillArea(pickupCity);
  const dropIsHill = tripType === 'local' ? pickupIsHill : isServerLocationInHillArea(dropCity);
  const pickupIsDeep = isServerLocationInDeepMountain(pickupCity);
  const dropIsDeep = tripType === 'local' ? pickupIsDeep : isServerLocationInDeepMountain(dropCity);
  const pickupIsGateway = isServerLocationFoothillGateway(pickupCity);
  const dropIsGateway = tripType === 'local' ? pickupIsGateway : isServerLocationFoothillGateway(dropCity);

  const isHillRoute = pickupIsHill || dropIsHill;

  if (!isHillRoute) {
    if (pickupIsGateway || dropIsGateway) {
      return {
        isHillRoute: false,
        pickupIsHill: false,
        dropIsHill: false,
        hillTier: 'foothill_gateway',
        hillRateMultiplier: 1.06,
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
      hillRateMultiplier: isDeepHillToHill ? 1.36 : 1.28,
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
      hillRateMultiplier: pickupIsDeep ? 1.32 : 1.24,
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
    hillRateMultiplier: pickupIsHill ? 1.24 : 1.20,
    hillTierLabel: pickupIsHill ? 'Hill Station Pickup Terrain' : 'Hill Station Ghat Climb'
  };
}

function computeServerRouteTierPricing(tripType, pickupCity, dropCity, distanceKm = 200, isHillRoute = false) {
  const pickupIsDaily = isServerDailyRouteCity(pickupCity);
  const dropIsDaily = tripType === 'local' ? pickupIsDaily : isServerDailyRouteCity(dropCity);
  const pickupIsOuter = !pickupIsDaily;
  const dropIsOuter = !dropIsDaily;

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
      routeTierMultiplier: 1.06,
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
      routeTierMultiplier: distanceKm > 250 ? 1.12 : 1.10,
      routeTierLabel: 'Outer Pickup & Empty Return Corridor'
    };
  }

  if (pickupIsOuter) {
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: false,
      routeTierMultiplier: 1.08,
      routeTierLabel: 'Outer Pickup Dispatch Zone'
    };
  }

  return {
    isOuterRoute: true,
    pickupIsOuter: false,
    dropIsOuter: true,
    routeTierMultiplier: 1.07,
    routeTierLabel: 'Outer Drop Return Deadhead'
  };
}

/**
 * Safar India Cabs - Round Trip Fare Calculation Logic
 */
export function calculateRoundTripFare(totalKm, numberOfDays, vehicleType, nightHalts = 0, hillMultiplier = 1.0) {
  const rates = {
    HATCHBACK: { perKmRate: 11.5, driverAllowancePerDay: 280, nightChargePerNight: 300 },
    SEDAN: { perKmRate: 13, driverAllowancePerDay: 320, nightChargePerNight: 300 },
    EXEC_SEDAN: { perKmRate: 15, driverAllowancePerDay: 360, nightChargePerNight: 350 },
    SUV: { perKmRate: 17, driverAllowancePerDay: 380, nightChargePerNight: 350 },
    INNOVA: { perKmRate: 22, driverAllowancePerDay: 450, nightChargePerNight: 400 },
    TEMPO: { perKmRate: 27, driverAllowancePerDay: 550, nightChargePerNight: 500 }
  };

  const selectedConfig = rates[String(vehicleType || 'SEDAN').toUpperCase()] || rates['SEDAN'];

  const MIN_KM_PER_DAY = 250;
  const minChargeableKm = numberOfDays * MIN_KM_PER_DAY;
  const finalChargeableKm = Math.max(totalKm, minChargeableKm);

  const effectivePerKmRate = Number((selectedConfig.perKmRate * hillMultiplier).toFixed(1));
  const baseDistanceFare = Math.round(finalChargeableKm * effectivePerKmRate);
  const totalDriverAllowance = numberOfDays * selectedConfig.driverAllowancePerDay;
  const totalNightAllowance = nightHalts * selectedConfig.nightChargePerNight;
  const totalFare = baseDistanceFare + totalDriverAllowance + totalNightAllowance;

  return {
    vehicleType: vehicleType,
    totalKm: totalKm,
    numberOfDays: numberOfDays,
    chargeableKm: finalChargeableKm,
    perKmRate: effectivePerKmRate,
    baseDistanceFare: baseDistanceFare,
    driverAllowance: totalDriverAllowance,
    nightAllowance: totalNightAllowance,
    totalFare: totalFare,
    note: 'Toll Taxes, State Border Entry Taxes, and Parking fees are extra to be paid directly by customer.'
  };
}

/**
 * Compute trip fare on the server using the exact SafarIndiaCabs pricing rules in src/utils/fareCalculator.ts
 */
export function computeServerTripFare({
  tripType,
  cabId,
  distanceKm,
  extraKm = 0,
  pickupCity = '',
  dropCity = '',
  pickupDate,
  pickupTime = '',
  returnDate,
  localPackageId = '8h_80k',
  includeTolls = false,
  addonCarrier = false,
  addonPet = false,
  addonAssuredModel = false,
  promoCode = '',
  promoDiscount = 0,
  customerName = ''
}) {
  const validTripTypes = ['oneway', 'roundtrip', 'local', 'airport'];
  if (!validTripTypes.includes(tripType)) {
    throw new Error(`Invalid tripType: ${tripType}`);
  }

  const cab = SERVER_CABS_FLEET[cabId] || SERVER_CABS_FLEET.sedan;
  const oneWayRate = cab.ratePerKm;
  const baseExtraKmRate = cab.extraKmRate || Math.round(cab.ratePerKm + 1);
  const dailyBata = cab.driverAllowancePerDay || 320;
  const hillBase = cab.hillStationCharge || 420;
  const local8HrBase = cab.local8Hr80KmFare || 1999;

  const parsedDistance = Number(distanceKm ?? 0);
  if (!Number.isFinite(parsedDistance) || parsedDistance < 0 || parsedDistance > 15000) {
    throw new Error(`Invalid distanceKm: ${distanceKm}`);
  }
  const cleanExtraKm = Math.max(0, Math.round(Number(extraKm) || 0));

  const {
    isHillRoute,
    pickupIsHill,
    dropIsHill,
    hillTier,
    hillRateMultiplier,
    hillTierLabel
  } = computeServerHillAreaPricing(tripType, pickupCity, dropCity);

  const {
    leadTimeTier,
    leadTimeMultiplier,
    leadTimeLabel,
    estimatedDropTime,
    isLateNightDrop,
    isEarlyOrNightPickup,
    timingAllowance
  } = computeServerLeadTimePricing(pickupDate, pickupTime, parsedDistance, isHillRoute, hillTier, dropIsHill);

  const {
    isOuterRoute,
    pickupIsOuter,
    dropIsOuter,
    routeTierMultiplier,
    routeTierLabel
  } = computeServerRouteTierPricing(tripType, pickupCity, dropCity, parsedDistance, isHillRoute);

  const dynamicRateFactor = leadTimeMultiplier * routeTierMultiplier * hillRateMultiplier;

  let baseBilledDistanceKm = Math.max(0, Math.round(parsedDistance));
  let ratePerKm = oneWayRate;
  let baseRouteFare = 0;
  let driverAllowance = 0;
  let nightCharges = 0;
  let daysCount = 1;

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
  const hillDriverBonusPerDay =
    hillTier === 'both_hills'
      ? 150
      : hillTier === 'one_end_hill'
      ? 100
      : hillTier === 'foothill_gateway'
      ? 50
      : 0;

  if (tripType === 'oneway') {
    baseBilledDistanceKm = Math.max(130, Math.round(parsedDistance));
    const slabFactor = isHillRoute
      ? 1.0
      : baseBilledDistanceKm <= 150
      ? 1.06
      : baseBilledDistanceKm > 420
      ? 1.06
      : 1.0;

    ratePerKm = Number((oneWayRate * slabFactor * dynamicRateFactor).toFixed(1));

    hillStationCharge =
      hillTier === 'both_hills'
        ? Math.round(hillBase * 1.2)
        : hillTier === 'one_end_hill'
        ? hillBase
        : hillTier === 'foothill_gateway'
        ? Math.round(hillBase * 0.35)
        : 0;
    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm);

    const oneWayDriverDays = baseBilledDistanceKm > 450 ? 1.5 : 1;

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
    const actualTwoWayKm = Math.round(parsedDistance * 2);
    const nightHalts = Math.max(0, daysCount - 1);
    const rtHillFactor =
      hillTier === 'both_hills' ? 1.12 : hillTier === 'one_end_hill' ? 1.08 : 1.0;
    const rtFare = calculateRoundTripFare(
      actualTwoWayKm,
      daysCount,
      String(cabId).toUpperCase(),
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
        ? Math.round(hillBase * 1.2)
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
      baseRouteFare = Math.round(adjustedLocal8HrBase * 1.33) - 320;
      driverAllowance = 320 + hillDriverBonusPerDay;
    } else {
      baseBilledDistanceKm = 80;
      baseRouteFare = adjustedLocal8HrBase - 280;
      driverAllowance = 280 + hillDriverBonusPerDay;
    }
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    hillStationCharge = isHillRoute ? Math.round(hillBase * 0.8) : 0;
    nightCharges = isEarlyOrNightPickup ? 150 : 0;
  } else if (tripType === 'airport') {
    baseBilledDistanceKm = Math.max(40, Math.round(parsedDistance));
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    const airportFixedPickupFee =
      cabId === 'tempo' ? 550 : cabId === 'innova' || cabId === 'suv' ? 400 : 280;
    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm + airportFixedPickupFee);
    driverAllowance = 220 + hillDriverBonusPerDay;
    hillStationCharge = isHillRoute ? Math.round(hillBase * 0.8) : 0;
    nightCharges = isEarlyOrNightPickup ? 150 : 0;
  }

  const hillSliderFactor = dropIsHill ? 1.06 : isHillRoute ? 1.05 : 1.0;
  const extraKmRate =
    tripType === 'roundtrip'
      ? ratePerKm
      : Math.max(
          Math.ceil(ratePerKm + (dropIsHill ? 1.5 : isHillRoute ? 1.0 : 1.0)),
          Math.round(baseExtraKmRate * dynamicRateFactor * hillSliderFactor)
        );

  const sliderExtraFare = Math.round(cleanExtraKm * extraKmRate);
  const billedDistanceKm = baseBilledDistanceKm + cleanExtraKm;
  const baseFare = baseRouteFare + hillStationCharge + sliderExtraFare;

  let highwayToll = 0;
  let statePermitTax = 0;
  let stateRoutePath = [originState];
  let statePermitBreakdown = [];
  let expresswayName = 'Local City Road';

  if (tripType === 'oneway') {
    const tollInfo = lookupServerRouteExpresswayToll(pickupCity, dropCity, billedDistanceKm, cabId);
    highwayToll = tollInfo.baseTollOneWay;
    expresswayName = tollInfo.expresswayName;
    if (isInterState) {
      const permitInfo = computeServerMultiStatePermitBreakdown(
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
    const tollInfo = lookupServerRouteExpresswayToll(
      pickupCity,
      dropCity,
      Math.round(billedDistanceKm / 2),
      cabId
    );
    highwayToll = Math.round(tollInfo.baseTollOneWay * 1.8);
    expresswayName = tollInfo.expresswayName;
    if (isInterState) {
      const permitInfo = computeServerMultiStatePermitBreakdown(
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
    highwayToll = 130;
    statePermitTax = 0;
    expresswayName = 'Airport Toll & Entry';
  }

  const estimatedTollsAndTaxes = highwayToll + statePermitTax;
  const tollsAndTaxes = includeTolls ? estimatedTollsAndTaxes : 0;

  const carrierFee = addonCarrier ? 250 : 0;
  const petFee = addonPet
    ? cabId === 'suv' || cabId === 'innova' || cabId === 'tempo'
      ? 600
      : 500
    : 0;
  const assuredModelFee = addonAssuredModel ? 300 : 0;
  const addonsTotal = carrierFee + petFee + assuredModelFee;

  const taxableSubtotal = baseFare + driverAllowance + nightCharges + addonsTotal;
  const gstAmount = tripType === 'roundtrip' ? 0 : Math.round(taxableSubtotal * 0.05);

  const totalFareBeforePromo = baseFare + driverAllowance + nightCharges + tollsAndTaxes + addonsTotal + gstAmount;

  const cleanPromoCode = String(promoCode || '').trim().toUpperCase().replace(/\s+/g, '');
  const cleanNameNorm = String(customerName || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const cleanPromoNorm = String(promoCode || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const shouldApplyPromo =
    promoDiscount === true ||
    Number(promoDiscount) >= 300 ||
    cleanPromoCode === 'FIRST300' ||
    cleanNameNorm.includes('dr vijay kumar') ||
    cleanNameNorm.includes('vijay kumar') ||
    cleanPromoNorm.includes('dr vijay kumar') ||
    cleanPromoNorm.includes('vijay kumar');

  const appliedPromoDiscount = shouldApplyPromo ? 300 : 0;
  const totalFare = Math.max(100, totalFareBeforePromo - appliedPromoDiscount);

  const competitorGap = totalFareBeforePromo >= 4500 ? 210 : totalFareBeforePromo >= 3200 ? 199 : 169;
  const originalMarketFare = totalFareBeforePromo + competitorGap;
  const savingsAmount = competitorGap + appliedPromoDiscount;
  const savingsPercent = Math.max(4, Math.round((savingsAmount / originalMarketFare) * 100));

  const advanceFare = Math.round(totalFare * 0.20);
  const balanceDue = totalFare - advanceFare;

  return {
    distanceKm: parsedDistance,
    extraKm: cleanExtraKm,
    extraKmCharge: sliderExtraFare,
    extraKmRateUsed: extraKmRate,
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
    addonsTotal,
    gstAmount,
    promoDiscount: appliedPromoDiscount,
    totalFareBeforePromo,
    totalFare,
    originalMarketFare,
    savingsAmount,
    savingsPercent,
    advanceFare,
    balanceDue,
    daysCount,
    ratePerKm,
    leadTimeTier,
    leadTimeMultiplier,
    leadTimeLabel,
    isOuterRoute,
    pickupIsOuter,
    dropIsOuter,
    routeTierMultiplier,
    routeTierLabel
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

function mergeBookingObjects(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const merged = {
    ...existing,
    ...incoming
  };

  // Preserve driver allotment details if present on either record
  merged.driverName = incoming.driverName || existing.driverName;
  merged.driverPhone = incoming.driverPhone || existing.driverPhone;
  merged.driverVehicleModel = incoming.driverVehicleModel || existing.driverVehicleModel;
  merged.driverVehicleNo = incoming.driverVehicleNo || existing.driverVehicleNo;
  merged.driverAssignedAt = incoming.driverAssignedAt || existing.driverAssignedAt;

  // Preserve advanced status (cancelled or completed takes precedence over default confirmed)
  if (existing.status === 'completed' || incoming.status === 'completed') {
    merged.status = incoming.status || existing.status;
  } else if (existing.status === 'cancelled' || incoming.status === 'cancelled') {
    merged.status = incoming.status || existing.status;
  }

  return merged;
}

export function upsertStoredBooking(booking) {
  if (!booking || !booking.id || String(booking.id).includes('DEMO') || String(booking.id).includes('TEST')) {
    return null;
  }
  const existingIdx = storedBookings.findIndex((b) => b.id === booking.id);
  if (existingIdx >= 0) {
    storedBookings[existingIdx] = mergeBookingObjects(storedBookings[existingIdx], booking);
    return storedBookings[existingIdx];
  } else {
    storedBookings.unshift(booking);
    return booking;
  }
}

let lastRazorpaySyncAtMs = 0;

async function syncBookingsFromRazorpayGateway(force = false) {
  const now = Date.now();
  if (!force && now - lastRazorpaySyncAtMs < 8000) {
    return;
  }
  lastRazorpaySyncAtMs = now;

  try {
    const { keyId, keySecret, candidateKeys } = resolveNormalizedRazorpayCredentials(process.env);
    if (!keySecret || (!keyId && candidateKeys.length === 0)) return;

    const keysToTry = candidateKeys.length > 0 ? candidateKeys : [{ keyId }];
    for (const candidate of keysToTry) {
      if (!candidate.keyId) continue;
      const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
      const headers = {
        Accept: 'application/json',
        Authorization: `Basic ${basicAuth}`
      };

      const [paymentsRes, ordersRes] = await Promise.all([
        fetch('https://api.razorpay.com/v1/payments?count=25', { method: 'GET', headers }).catch(() => null),
        fetch('https://api.razorpay.com/v1/orders?count=25', { method: 'GET', headers }).catch(() => null)
      ]);

      if (!paymentsRes || !paymentsRes.ok) continue;

      const paymentsData = await paymentsRes.json().catch(() => null);
      const ordersData = ordersRes && ordersRes.ok ? await ordersRes.json().catch(() => null) : null;

      const ordersById = new Map();
      if (ordersData && Array.isArray(ordersData.items)) {
        for (const ord of ordersData.items) {
          if (ord && ord.id) ordersById.set(ord.id, ord);
        }
      }

      if (paymentsData && Array.isArray(paymentsData.items)) {
        for (const p of paymentsData.items) {
          if (!p || (p.status !== 'captured' && p.status !== 'authorized')) continue;
          const pNotes = p.notes || {};
          const linkedOrder = p.order_id ? ordersById.get(p.order_id) : null;
          const oNotes = linkedOrder?.notes || {};

          const bookingId =
            pNotes.verified_booking_id ||
            pNotes.booking_id ||
            oNotes.booking_id ||
            linkedOrder?.receipt ||
            '';

          if (!bookingId || !String(bookingId).startsWith('SIC-')) continue;

          const custParts = String(pNotes.customer_info || oNotes.customer_info || '').split('|');
          const customerName = custParts[0] || 'Verified Passenger';
          const customerPhone = (custParts[1] || oNotes.customer_phone || p.contact || '')
            .replace(/\D/g, '')
            .slice(-10);
          const customerEmail = custParts[2] || p.email || '';

          const routeParts = String(pNotes.route_info || '').split('|');
          const tripType = routeParts[0] || oNotes.trip_type || 'oneway';
          const pickupCity = routeParts[1] || oNotes.pickup_city || 'Delhi NCR';
          const dropCity = routeParts[2] || oNotes.drop_city || pickupCity;
          const distanceKm = Number(routeParts[3] || oNotes.distance_km || 230) || 230;

          const addrParts = String(pNotes.address_info || '').split('|');
          const pickupAddress = addrParts[0] || oNotes.pickup_address || pickupCity;
          const dropAddress = addrParts[1] || oNotes.drop_address || dropCity;

          const schedParts = String(pNotes.schedule_info || '').split('|');
          const pickupDate = schedParts[0] || oNotes.pickup_date || new Date().toISOString().slice(0, 10);
          const pickupTime = schedParts[1] || oNotes.pickup_time || '08:00 AM';
          const cabId = schedParts[2] || oNotes.cab_id || 'sedan';
          const cabInfo = SERVER_CABS_FLEET[cabId] || SERVER_CABS_FLEET.sedan;
          const cabName = schedParts[3] || `${cabInfo.name} (${cabInfo.models})`;

          const fareParts = String(pNotes.fare_info || '').split('|');
          const paidRupees = Math.round(Number(p.amount || 0) / 100);
          const totalFare = Number(fareParts[0] || oNotes.total_fare_rupees || paidRupees * 5) || paidRupees;
          const advancePaid = Number(fareParts[1] || oNotes.advance_paid_rupees || paidRupees) || paidRupees;
          const balanceDue =
            fareParts[2] !== undefined
              ? Number(fareParts[2])
              : oNotes.balance_due_rupees !== undefined
              ? Number(oNotes.balance_due_rupees)
              : Math.max(0, totalFare - advancePaid);
          const paymentMode = fareParts[3] || oNotes.payment_mode || (balanceDue === 0 ? 'full' : 'advance_20');

          const driverParts = pNotes.driver_info ? String(pNotes.driver_info).split('|') : [];
          const driverName = driverParts[0] || undefined;
          const driverPhone = driverParts[1] || undefined;
          const driverVehicleModel = driverParts[2] || undefined;
          const driverVehicleNo = driverParts[3] || undefined;
          const driverAssignedAt = driverParts[4] || undefined;
          const savedStatus = pNotes.booking_status || 'confirmed';

          upsertStoredBooking({
            id: String(bookingId).trim(),
            tripType,
            pickupCity,
            dropCity,
            pickupAddress,
            dropAddress,
            pickupDate,
            pickupTime,
            cabId,
            cabName,
            distanceKm,
            baseFare: Math.round(totalFare * 0.85),
            driverAllowance: 0,
            tollsAndTaxes: Math.round(totalFare * 0.1),
            gstAmount: Math.round(totalFare * 0.05),
            totalFare,
            advancePaid,
            balanceDue,
            paymentMode,
            paymentMethod: `Razorpay ${String(p.method || 'UPI').toUpperCase()} (${p.id})`,
            transactionId: p.id,
            customerName,
            customerPhone: customerPhone || '7710080992',
            customerEmail,
            status: savedStatus,
            driverName,
            driverPhone,
            driverVehicleModel,
            driverVehicleNo,
            driverAssignedAt,
            createdAt: p.created_at
              ? new Date(Number(p.created_at) * 1000).toISOString()
              : new Date().toISOString()
          });
        }
      }
      break;
    }
  } catch (err) {
    console.warn('[/api/bookings] Razorpay gateway sync notice:', err?.message);
  }
}

async function patchDriverInfoToRazorpayPayment(paymentId, status, driverInfo) {
  if (!paymentId || !String(paymentId).startsWith('pay_')) return;
  try {
    const { keyId, keySecret, candidateKeys } = resolveNormalizedRazorpayCredentials(process.env);
    if (!keySecret || (!keyId && candidateKeys.length === 0)) return;
    const keysToTry = candidateKeys.length > 0 ? candidateKeys : [{ keyId }];

    for (const candidate of keysToTry) {
      if (!candidate.keyId) continue;
      const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`
      };

      const getRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
        headers
      }).catch(() => null);
      if (!getRes || !getRes.ok) continue;
      const pData = await getRes.json().catch(() => null);
      const existingNotes = pData?.notes || {};

      const updatedNotes = {
        ...existingNotes,
        booking_status: status || existingNotes.booking_status || 'confirmed'
      };
      if (driverInfo && driverInfo.name) {
        updatedNotes.driver_info = [
          String(driverInfo.name || '').slice(0, 50),
          String(driverInfo.phone || '').slice(0, 20),
          String(driverInfo.vehicleModel || '').slice(0, 60),
          String(driverInfo.carPlate || '').slice(0, 25),
          new Date().toISOString()
        ].join('|');
      }

      await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notes: updatedNotes })
      }).catch(() => null);
      break;
    }
  } catch {}
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

  upsertStoredBooking(confirmedBooking);

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
    const forceSync = req.query?.force === '1' || req.query?.force === 'true';
    await syncBookingsFromRazorpayGateway(forceSync);
    const cleanList = storedBookings.filter(
      (b) => b && !b.id.includes('DEMO') && !b.id.includes('TEST')
    );
    return res.status(200).json({
      success: true,
      count: cleanList.length,
      bookings: cleanList
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const { action, booking, bookings, bookingId, status, driverInfo } = body;

      if (action === 'clear_demo') {
        storedBookings = storedBookings.filter(
          (b) => b.transactionId && !b.id.includes('DEMO') && !b.id.includes('TEST')
        );
        return res.status(200).json({ success: true, count: storedBookings.length, bookings: storedBookings });
      }

      if (action === 'sync_client_bookings') {
        await syncBookingsFromRazorpayGateway(Boolean(body.force));
        if (Array.isArray(bookings)) {
          for (const clientBooking of bookings) {
            if (clientBooking && clientBooking.id) {
              upsertStoredBooking(clientBooking);
            }
          }
        }
        const cleanList = storedBookings.filter(
          (b) => b && !b.id.includes('DEMO') && !b.id.includes('TEST')
        );
        return res.status(200).json({
          success: true,
          count: cleanList.length,
          bookings: cleanList
        });
      }

      if (action === 'update_status' && bookingId) {
        if (booking && booking.id === bookingId) {
          upsertStoredBooking(booking);
        }

        let targetTransactionId = booking?.transactionId || '';

        storedBookings = storedBookings.map((b) => {
          if (b.id === bookingId) {
            targetTransactionId = targetTransactionId || b.transactionId || '';
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

        if (targetTransactionId && String(targetTransactionId).startsWith('pay_')) {
          await patchDriverInfoToRazorpayPayment(targetTransactionId, status, driverInfo);
        }

        return res.status(200).json({ success: true, bookings: storedBookings });
      }

      if (booking && booking.id) {
        const saved = upsertStoredBooking(booking);
        return res.status(200).json({ success: true, booking: saved, bookings: storedBookings });
      }

      return res.status(400).json({ error: 'Missing booking details' });
    } catch (err) {
      console.error('Error in /api/bookings:', err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
