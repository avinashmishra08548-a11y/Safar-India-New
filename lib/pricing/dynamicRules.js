// Modules 5, 6, 7, 8: Lead-Time Pricing, Festival/Event Calendar, Demand/Supply Engine & Operational Charges
// Plus exact State Permit Tax, 12:00 AM Midnight Rollover & ₹100 Delhi MCD Toll Rules

const CITY_STATE_KEYWORDS = [
  { keywords: ['delhi', 'newdelhi', 'burari', 'dwarka', 'rohini', 'connaught', 'igi', 'aerocity', 'saket', 'vasantkunj', 'karolbagh', 'lajpat'], state: 'Delhi' },
  { keywords: ['noida', 'greaternoida', 'ghaziabad', 'agra', 'lucknow', 'varanasi', 'ayodhya', 'mathura', 'vrindavan', 'prayagraj', 'allahabad', 'kanpur', 'meerut', 'gorakhpur', 'bareilly', 'aligarh', 'jhansi', 'moradabad', 'muzaffarnagar', 'saharanpur', 'bijnor', 'rampur', 'hapur', 'modinagar', 'uttarpradesh'], state: 'Uttar Pradesh' },
  { keywords: ['gurgaon', 'gurugram', 'faridabad', 'panipat', 'ambala', 'karnal', 'sonipat', 'rohtak', 'hisar', 'kurukshetra', 'rewari', 'palwal', 'panchkula', 'bahadurgarh', 'yamunanagar', 'pinjore', 'kalka', 'haryana'], state: 'Haryana' },
  { keywords: ['jaipur', 'udaipur', 'jodhpur', 'ajmer', 'pushkar', 'jaisalmer', 'bikaner', 'kota', 'mountabu', 'alwar', 'bharatpur', 'khatushyam', 'salasar', 'neemrana', 'sikar', 'jhunjhunu', 'rajasthan'], state: 'Rajasthan' },
  { keywords: ['chandigarh', 'amritsar', 'srigururamdas', 'rajasansi', 'ludhiana', 'jalandhar', 'patiala', 'bathinda', 'mohali', 'zirakpur', 'pathankot', 'ropar', 'kiratpur', 'punjab'], state: 'Punjab' },
  { keywords: ['shimla', 'manali', 'dharamshala', 'dharmshala', 'dharmshaala', 'dharamsala', 'mcleodganj', 'dalhousie', 'kasauli', 'kullu', 'solan', 'spiti', 'kasol', 'chamba', 'khajjiar', 'mandi', 'bilaspurhp', 'palampur', 'kangra', 'nagrotabagwan', 'nagrota', 'chamunda', 'baijnath', 'jawalamukhi', 'chintpurni', 'kinnaur', 'kalpa', 'kufri', 'narkanda', 'chitkul', 'sangla', 'kaza', 'himachal'], state: 'Himachal Pradesh' },
  { keywords: ['dehradun', 'haridwar', 'rishikesh', 'nainital', 'mussoorie', 'rudraprayag', 'haldwani', 'kathgodam', 'roorkee', 'jimcorbett', 'corbett', 'ramnagar', 'kedarnath', 'badrinath', 'sonprayag', 'guptkashi', 'joshimath', 'chamoli', 'karnaprayag', 'devprayag', 'tehri', 'uttarkashi', 'pauri', 'kotdwar', 'almora', 'ranikhet', 'kausani', 'bageshwar', 'pithoragarh', 'champawat', 'bhimtal', 'mukteshwar', 'gangotri', 'yamunotri', 'lansdowne', 'auli', 'chopta', 'chakrata', 'dhanaulti', 'uttarakhand', 'uttrakhand'], state: 'Uttarakhand' },
  { keywords: ['mumbai', 'pune', 'lonavala', 'khandala', 'mahabaleshwar', 'panchgani', 'shirdi', 'nashik', 'nagpur', 'aurangabad', 'sambhajinagar', 'thane', 'navimumbai', 'andheri', 'bandra', 'dadar', 'borivali', 'kalyan', 'kolhapur', 'solapur', 'maharashtra'], state: 'Maharashtra' },
  { keywords: ['goa', 'panaji', 'margao', 'calangute', 'baga', 'dabolim', 'mopa', 'vasco'], state: 'Goa' },
  { keywords: ['daman', 'diu', 'silvassa', 'dadra', 'nagarhaveli', 'navarhaveli', 'damandiu'], state: 'Dadra and Nagar Haveli and Daman and Diu' },
  { keywords: ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'somnath', 'bhuj', 'kutch', 'gandhinagar', 'statueofunity', 'kevadia', 'vapi', 'valsad', 'saputara', 'gujarat', 'gujrat'], state: 'Gujarat' },
  { keywords: ['bangalore', 'bengaluru', 'mysore', 'mysuru', 'coorg', 'madikeri', 'mangalore', 'hubli', 'belgaum', 'chikmagalur', 'sakleshpur', 'hampi', 'udupi', 'gokarna', 'kempegowda', 'whitefield', 'electroniccity', 'karnataka', 'karnatka'], state: 'Karnataka' },
  { keywords: ['chennai', 'coimbatore', 'madurai', 'ooty', 'coonoor', 'kodaikanal', 'yercaud', 'rameswaram', 'kanyakumari', 'vellore', 'salem', 'trichy', 'thanjavur', 'mahabalipuram', 'hosur', 'tamilnadu'], state: 'Tamil Nadu' },
  { keywords: ['pondicherry', 'puducherry', 'karaikal', 'yanam', 'mahe', 'auroville'], state: 'Puducherry' },
  { keywords: ['hyderabad', 'secunderabad', 'warangal', 'gachibowli', 'hitec', 'shamshabad', 'telangana'], state: 'Telangana' },
  { keywords: ['tirupati', 'visakhapatnam', 'vizag', 'vijayawada', 'guntur', 'nellore', 'kurnool', 'chittoor', 'araku', 'andhrapradesh'], state: 'Andhra Pradesh' },
  { keywords: ['kochi', 'cochin', 'munnar', 'thiruvananthapuram', 'trivandrum', 'alleppey', 'alappuzha', 'wayanad', 'kozhikode', 'calicut', 'thekkady', 'kovalam', 'kerala', 'kerla'], state: 'Kerala' },
  { keywords: ['indore', 'bhopal', 'ujjain', 'omkareshwar', 'gwalior', 'jabalpur', 'khajuraho', 'pachmarhi', 'sanchi', 'madhyapradesh'], state: 'Madhya Pradesh' },
  { keywords: ['kolkata', 'howrah', 'darjeeling', 'kalimpong', 'siliguri', 'digha', 'durgapur', 'asansol', 'westbengal'], state: 'West Bengal' },
  { keywords: ['patna', 'hajipur', 'sonepur', 'sonpur', 'danapur', 'bihta', 'gaya', 'bodhgaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'samastipur', 'begusarai', 'barauni', 'ara', 'arrah', 'bhojpur', 'chhapra', 'chapra', 'biharsharif', 'rajgir', 'nalanda', 'sitamarhi', 'motihari', 'champaran', 'bettiah', 'raxaul', 'buxar', 'sasaram', 'rohtas', 'dehri', 'bhabua', 'kaimur', 'purnia', 'purnea', 'katihar', 'kishanganj', 'araria', 'forbesganj', 'supaul', 'saharsa', 'madhepura', 'khagaria', 'munger', 'jamalpur', 'lakhisarai', 'sheikhpura', 'jamui', 'nawada', 'jehanabad', 'arwal', 'aurangabadbihar', 'siwan', 'gopalganj', 'madhubani', 'jhanjharpur', 'mokama', 'barh', 'bakhtiyarpur', 'fatuha', 'vaishali', 'saran', 'bihar'], state: 'Bihar' },
  { keywords: ['ranchi', 'jamshedpur', 'tatanagar', 'deoghar', 'baidyanathdham', 'jasidih', 'madhupur', 'dhanbad', 'jharia', 'bokaro', 'chas', 'phusro', 'hazaribagh', 'barhi', 'giridih', 'parasnath', 'shikharji', 'ramgarhjharkhand', 'patratu', 'medininagar', 'daltonganj', 'palamu', 'garhwa', 'latehar', 'dumka', 'basukinath', 'jamtara', 'koderma', 'jhumritelaiya', 'chatra', 'chaibasa', 'chakradharpur', 'saraikela', 'gumla', 'lohardaga', 'simdega', 'khunti', 'godda', 'sahibganj', 'pakur', 'jharkhand'], state: 'Jharkhand' },
  { keywords: ['bhubaneswar', 'puri', 'konark', 'cuttack', 'rourkela', 'odisha'], state: 'Odisha' },
  { keywords: ['raipur', 'bilaspur', 'bhilai', 'durg', 'korba', 'jagdalpur', 'ambikapur', 'chhattisgarh', 'chattishgarh', 'chhatisgarh'], state: 'Chhattisgarh' },
  { keywords: ['guwahati', 'kaziranga', 'dibrugarh', 'jorhat', 'silchar', 'tezpur', 'nagaon', 'tinsukia', 'assam', 'aasam'], state: 'Assam' },
  { keywords: ['gangtok', 'pelling', 'namchi', 'lachung', 'lachen', 'nathula', 'sikkim'], state: 'Sikkim' },
  { keywords: ['agartala', 'dharmanagar', 'udaipurtripura', 'tripura'], state: 'Tripura' },
  { keywords: ['aizawl', 'lunglei', 'champhai', 'mizoram'], state: 'Mizoram' },
  { keywords: ['shillong', 'cherrapunji', 'tawang', 'itanagar', 'arunachal', 'meghalaya', 'kohima', 'dimapur', 'nagaland', 'imphal', 'manipur'], state: 'North East' },
  { keywords: ['jammu', 'srinagar', 'katra', 'vaishnodevi', 'gulmarg', 'pahalgam', 'sonamarg', 'patnitop', 'leh', 'ladakh', 'kashmir'], state: 'Jammu & Kashmir' }
];

const STATE_PERMIT_RATES = {
  'Uttar Pradesh': 150,
  'Rajasthan': 300,
  'Andhra Pradesh': 250,
  'Maharashtra': 200,
  'Gujarat': 100,
  'Tamil Nadu': 100,
  'Bihar': 325,
  'Assam': 250,
  'Chhattisgarh': 160,
  'Himachal Pradesh': 250,
  'Haryana': 120,
  'Jharkhand': 300,
  'Karnataka': 100,
  'Kerala': 250,
  'Madhya Pradesh': 283,
  'Mizoram': 250,
  'Odisha': 475,
  'Punjab': 200,
  'Puducherry': 230,
  'Sikkim': 250,
  'Tripura': 250,
  'Telangana': 350,
  'Dadra and Nagar Haveli and Daman and Diu': 100,
  'Uttarakhand': 290,
  'West Bengal': 800,
  'Delhi': 100,
  'Goa': 280,
  'Jammu & Kashmir': 280,
  'North East': 250
};

const PUNJAB_TRANSIT_HIMACHAL_CITIES = [
  'manali', 'kullu', 'kasol', 'spiti', 'chitkul', 'kangra', 'nagrotabagwan', 'nagrota', 'palampur', 'dharamshala', 'dharmshala', 'dharmshaala', 'dharamsala', 'mcleodganj', 'dalhousie', 'chamba', 'khajjiar', 'mandi'
];

const EXPLICIT_HIGHWAY_STATE_CORRIDORS = {
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

const INDIA_STATE_ADJACENCY = {
  'Delhi': ['Uttar Pradesh', 'Haryana'],
  'Haryana': ['Delhi', 'Punjab', 'Himachal Pradesh', 'Rajasthan', 'Uttar Pradesh'],
  'Punjab': ['Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Rajasthan'],
  'Himachal Pradesh': ['Haryana', 'Punjab', 'Uttarakhand', 'Jammu & Kashmir'],
  'Jammu & Kashmir': ['Punjab', 'Himachal Pradesh'],
  'Uttarakhand': ['Uttar Pradesh', 'Himachal Pradesh'],
  'Uttar Pradesh': ['Delhi', 'Uttarakhand', 'Haryana', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Jharkhand', 'Chhattisgarh'],
  'Rajasthan': ['Haryana', 'Punjab', 'Uttar Pradesh', 'Madhya Pradesh', 'Gujarat'],
  'Gujarat': ['Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Dadra and Nagar Haveli and Daman and Diu'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Gujarat', 'Maharashtra'],
  'Madhya Pradesh': ['Uttar Pradesh', 'Rajasthan', 'Gujarat', 'Maharashtra', 'Chhattisgarh'],
  'Maharashtra': ['Gujarat', 'Dadra and Nagar Haveli and Daman and Diu', 'Madhya Pradesh', 'Chhattisgarh', 'Telangana', 'Karnataka', 'Goa'],
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
  'West Bengal': ['Bihar', 'Jharkhand', 'Odisha', 'Sikkim', 'Assam', 'North East'],
  'Sikkim': ['West Bengal'],
  'Assam': ['West Bengal', 'Tripura', 'Mizoram', 'North East'],
  'Tripura': ['Assam', 'Mizoram'],
  'Mizoram': ['Assam', 'Tripura'],
  'North East': ['West Bengal', 'Assam']
};

function normalizeToken(str) {
  return String(str || '').toLowerCase().replace(/[^a-z]/g, '');
}

export function detectLocationState(locationStr, fallbackState = 'Delhi') {
  if (!locationStr) return fallbackState;
  const norm = normalizeToken(locationStr);
  for (const entry of CITY_STATE_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (norm.includes(kw)) return entry.state;
    }
  }
  return fallbackState;
}

export function parsePickupHourOfDay(pickupTime) {
  const raw = String(pickupTime || '').trim().toUpperCase();
  if (!raw) return 8.0;
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
  return 8.0;
}

export function formatHourOfDay(fractionalHour) {
  const totalMinutes = Math.round((((fractionalHour % 24) + 24) % 24) * 60);
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const nextDaySuffix = fractionalHour >= 24 ? ' (+1 Day)' : '';
  return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}${nextDaySuffix}`;
}

export function doesRouteGeometryCrossDelhi(routeGeometry) {
  if (!Array.isArray(routeGeometry) || routeGeometry.length < 2) return false;
  return routeGeometry.some(([lng, lat]) => lat >= 28.515 && lat <= 28.845 && lng >= 76.96 && lng <= 77.295);
}

export function computeStateTaxCalendarDays({
  tripType,
  distanceKm,
  pickupTime = '',
  returnTime = '',
  daysCount = 1,
  terrainType = 'highway'
}) {
  if (tripType === 'local') return 1;
  const avgSpeedKmph =
    terrainType === 'difficult_mountain'
      ? 30
      : terrainType === 'hill_station'
      ? 42
      : 55;
  const pickupHour = parsePickupHourOfDay(pickupTime);

  if (tripType === 'roundtrip' || tripType === 'multiday') {
    if (daysCount > 1) return Math.max(1, daysCount);
    const twoWayDriveHours = Math.max(1.5, (distanceKm * 2) / avgSpeedKmph + 0.5);
    const twoWayEndHour = pickupHour + twoWayDriveHours;
    if (twoWayEndHour >= 24.0) {
      return Math.max(2, 1 + Math.floor(twoWayEndHour / 24));
    }
    if (returnTime) {
      const returnHour = parsePickupHourOfDay(returnTime);
      if (returnHour < pickupHour && (returnHour < 6 || pickupHour >= 12)) {
        return 2;
      }
    }
    return 1;
  }

  const estimatedDriveHours = Math.max(1.0, distanceKm / avgSpeedKmph + 0.25);
  const arrivalHourContinuous = pickupHour + estimatedDriveHours;
  return Math.max(1, 1 + Math.floor(arrivalHourContinuous / 24));
}

export function computeMultiStateCorridor(originState, destState, pickupCity = '', dropCity = '', routeGeometry = []) {
  if (!originState || !destState) return [originState || 'Delhi'];
  const geometryCrossesDelhi = originState !== 'Delhi' && doesRouteGeometryCrossDelhi(routeGeometry);
  if (originState === destState) {
    return geometryCrossesDelhi ? [originState, 'Delhi', destState] : [originState];
  }

  const combinedCities = normalizeToken(pickupCity) + ' ' + normalizeToken(dropCity);
  const northHaryanaBypassDelhi = ['ambala', 'panchkula', 'kurukshetra', 'karnal', 'yamunanagar', 'kalka', 'pinjore'];
  const ncrHaryanaCities = ['gurgaon', 'gurugram', 'faridabad', 'sonipat', 'rohtak', 'rewari', 'bahadurgarh', 'hisar', 'palwal', 'jhajjar'];
  const westUpNcrCities = ['noida', 'greaternoida', 'ghaziabad', 'meerut', 'hapur', 'modinagar', 'muzaffarnagar', 'moradabad', 'bijnor', 'rampur', 'lucknow', 'bareilly'];

  let resolvedPath = null;

  if (
    (originState === 'Delhi' || originState === 'Haryana' || originState === 'Uttar Pradesh') &&
    destState === 'Himachal Pradesh' &&
    PUNJAB_TRANSIT_HIMACHAL_CITIES.some((city) => combinedCities.includes(city))
  ) {
    if (originState === 'Uttar Pradesh') {
      resolvedPath = ['Uttar Pradesh', 'Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh'];
    } else if (originState === 'Delhi') {
      resolvedPath = ['Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh'];
    } else {
      resolvedPath = ['Haryana', 'Punjab', 'Himachal Pradesh'];
    }
  } else if (
    destState === 'Delhi' &&
    originState === 'Himachal Pradesh' &&
    PUNJAB_TRANSIT_HIMACHAL_CITIES.some((city) => combinedCities.includes(city))
  ) {
    resolvedPath = ['Himachal Pradesh', 'Punjab', 'Haryana', 'Delhi'];
  } else if (
    ((originState === 'Haryana' && destState === 'Uttarakhand') ||
      (originState === 'Uttarakhand' && destState === 'Haryana')) &&
    northHaryanaBypassDelhi.some((c) => combinedCities.includes(c)) &&
    !geometryCrossesDelhi
  ) {
    resolvedPath =
      originState === 'Haryana'
        ? ['Haryana', 'Uttar Pradesh', 'Uttarakhand']
        : ['Uttarakhand', 'Uttar Pradesh', 'Haryana'];
  } else if (
    (originState === 'Haryana' && destState === 'Uttar Pradesh') ||
    (originState === 'Uttar Pradesh' && destState === 'Haryana')
  ) {
    const usesDelhiNcr =
      geometryCrossesDelhi ||
      (ncrHaryanaCities.some((c) => combinedCities.includes(c)) &&
        westUpNcrCities.some((c) => combinedCities.includes(c)));
    resolvedPath = usesDelhiNcr
      ? originState === 'Haryana'
        ? ['Haryana', 'Delhi', 'Uttar Pradesh']
        : ['Uttar Pradesh', 'Delhi', 'Haryana']
      : [originState, destState];
  } else if (
    ((originState === 'Uttar Pradesh' && destState === 'Rajasthan') ||
      (originState === 'Rajasthan' && destState === 'Uttar Pradesh')) &&
    (geometryCrossesDelhi || combinedCities.includes('noida') || combinedCities.includes('ghaziabad') || combinedCities.includes('meerut'))
  ) {
    resolvedPath =
      originState === 'Uttar Pradesh'
        ? ['Uttar Pradesh', 'Delhi', 'Haryana', 'Rajasthan']
        : ['Rajasthan', 'Haryana', 'Delhi', 'Uttar Pradesh'];
  } else {
    const pairKey = `${originState}|${destState}`;
    if (EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey]) {
      resolvedPath = EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey];
    } else {
      const queue = [[originState]];
      const visited = new Set([originState]);
      while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];
        if (current === destState) {
          resolvedPath = path;
          break;
        }
        const neighbors = INDIA_STATE_ADJACENCY[current] || [];
        for (const nextState of neighbors) {
          if (!visited.has(nextState)) {
            visited.add(nextState);
            queue.push([...path, nextState]);
          }
        }
      }
    }
  }

  const basePath = resolvedPath || [originState, destState];
  if (geometryCrossesDelhi && !basePath.includes('Delhi')) {
    return [basePath[0], 'Delhi', ...basePath.slice(1)];
  }
  return basePath;
}

export function computeMultiStatePermitBreakdown(
  originState,
  destState,
  pickupCity = '',
  dropCity = '',
  stateTaxDays = 1,
  routeGeometry = [],
  stops = []
) {
  let stateRoutePath = computeMultiStateCorridor(originState, destState, pickupCity, dropCity, routeGeometry);

  // Include any intermediate multi-stop states visited after origin
  if (Array.isArray(stops) && stops.length > 0) {
    const extraStates = stops
      .map((s) => detectLocationState(typeof s === 'string' ? s : s?.location, originState))
      .filter((st) => st && st !== originState && !stateRoutePath.includes(st));
    if (extraStates.length > 0) {
      stateRoutePath = [...stateRoutePath.slice(0, -1), ...extraStates, stateRoutePath[stateRoutePath.length - 1]];
    }
  }

  const chargeableStates = stateRoutePath
    .slice(1)
    .filter((stateName, idx, arr) => stateName !== originState && arr.indexOf(stateName) === idx);

  if (chargeableStates.length === 0) {
    return { stateRoutePath, statePermitBreakdown: [], totalStatePermitTax: 0, delhiMcdToll: 0 };
  }

  const effectiveDays = Math.max(1, Math.round(stateTaxDays || 1));
  let delhiMcdToll = 0;

  const statePermitBreakdown = chargeableStates.map((stateName, idx) => {
    const isFinalDest = stateName === destState || idx === chargeableStates.length - 1;
    const role = isFinalDest ? 'destination' : 'transit';

    if (stateName === 'Delhi') {
      const mcdFee = 100;
      delhiMcdToll += mcdFee;
      return {
        state: 'Delhi',
        role,
        label: destState === 'Delhi' ? 'Delhi MCD Entry Toll' : 'Delhi Transit MCD Entry Toll',
        taxAmount: mcdFee
      };
    }

    const perDayTax = STATE_PERMIT_RATES[stateName] ?? 200;
    const taxAmount = perDayTax * effectiveDays;
    return {
      state: stateName,
      role,
      label: effectiveDays > 1 ? `${stateName} State Tax (${effectiveDays} Days)` : `${stateName} State Tax`,
      taxAmount
    };
  });

  const totalStatePermitTax = statePermitBreakdown.reduce((sum, item) => sum + item.taxAmount, 0);
  return { stateRoutePath, statePermitBreakdown, totalStatePermitTax, delhiMcdToll };
}

// Module 5: Lead-Time 8-Bucket Analysis (never penalizes early bookers)
export function computeLeadTimeAdjustment(input = {}, config = {}) {
  const rules = config.leadTimeRules || {};
  const fleetAvail =
    Number.isFinite(input.fleetAvailabilityRatio)
      ? Math.max(0.05, Math.min(1.0, Number(input.fleetAvailabilityRatio)))
      : (config.dynamicPricing?.fleetAvailabilityRatioDefault ?? 0.72);

  const pickupHour = parsePickupHourOfDay(input.pickupTime);
  const nowDate = input.nowDate ? new Date(input.nowDate) : new Date();
  let hoursAhead = 30; // Default next-day neutral if date blank

  const cleanDate = String(input.pickupDate || '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const hrInt = Math.floor(pickupHour);
    const minInt = Math.round((pickupHour - hrInt) * 60);
    // Construct IST timestamp for accurate lead-time difference
    const isoIst = `${cleanDate}T${String(hrInt).padStart(2, '0')}:${String(minInt).padStart(2, '0')}:00+05:30`;
    const pickupTs = Date.parse(isoIst);
    if (Number.isFinite(pickupTs)) {
      hoursAhead = (pickupTs - nowDate.getTime()) / (1000 * 60 * 60);
    }
  }

  let bucketKey = 'next_day';
  if (hoursAhead <= 1.0) bucketKey = 'immediate';
  else if (hoursAhead <= 2.5) bucketKey = 'within_2h';
  else if (hoursAhead <= 14.0) bucketKey = 'same_day';
  else if (hoursAhead <= 36.0) bucketKey = 'next_day';
  else if (hoursAhead <= 84.0) bucketKey = 'days_2_3';
  else if (hoursAhead <= 192.0) bucketKey = 'days_5_7';
  else if (hoursAhead <= 384.0) bucketKey = 'days_10_15';
  else bucketKey = 'days_30_plus';

  const rule = rules[bucketKey] || { label: 'Next Day', baseMultiplier: 1.0, tightAvailabilityBoost: 0 };

  // Tight availability adds tiny boost only for last-minute urgent buckets when fleet availability < 40%
  const isTightFleet = fleetAvail < 0.4;
  const tightnessScale = isTightFleet ? Math.min(1, (0.4 - fleetAvail) / 0.35) : 0;
  let multiplier = Number(rule.baseMultiplier || 1.0);

  // Advance booking incentive boost if abundance of fleet (> 75% free)
  if (['days_5_7', 'days_10_15', 'days_30_plus'].includes(bucketKey)) {
    multiplier = Math.min(1.0, multiplier); // Never penalize early bookings
  } else if (isTightFleet && (rule.tightAvailabilityBoost || 0) > 0) {
    multiplier += Number(rule.tightAvailabilityBoost) * tightnessScale;
  }

  return {
    bucket: bucketKey,
    label: rule.label || bucketKey,
    hoursAhead: Math.round(Math.max(0, hoursAhead) * 10) / 10,
    multiplier: Number(multiplier.toFixed(4)),
    isAdvanceSaver: multiplier < 1.0,
    isUrgentWindow: ['immediate', 'within_2h', 'same_day'].includes(bucketKey)
  };
}

// Module 6: Seasonal / Festival / Event Calendar Evaluation
export function evaluateSeasonalEvents(input = {}, config = {}) {
  const events = Array.isArray(config.seasonalEvents) ? config.seasonalEvents : [];
  const cleanDate = String(input.pickupDate || '').trim().slice(0, 10);
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(cleanDate)
    ? cleanDate
    : new Date().toISOString().slice(0, 10);

  const pNorm = normalizeToken(input.pickupCity);
  const dNorm = normalizeToken(input.dropCity);

  let highestEvent = null;
  for (const evt of events) {
    if (!evt || evt.active === false) continue;
    if (!evt.startDate || !evt.endDate) continue;
    if (targetDate >= evt.startDate && targetDate <= evt.endDate) {
      const cityList = Array.isArray(evt.cities) ? evt.cities.filter(Boolean) : [];
      const matchesCity =
        cityList.length === 0 ||
        cityList.some((c) => pNorm.includes(normalizeToken(c)) || dNorm.includes(normalizeToken(c)));
      if (matchesCity) {
        const m = Number(evt.multiplier || 1.0);
        if (!highestEvent || m > highestEvent.multiplier) {
          highestEvent = {
            id: evt.id,
            name: evt.name,
            multiplier: m
          };
        }
      }
    }
  }

  return highestEvent || { id: null, name: 'Regular Season', multiplier: 1.0 };
}

// Module 7: Dynamic Demand & Supply Engine (Protected by Min/Max Bounds & Emergency Override)
export function computeDemandSupplyMultiplier(input = {}, leadTimeResult, eventResult, routeOverride = null, config = {}) {
  const dyn = config.dynamicPricing || {};
  if (dyn.enabled === false || dyn.emergencyDisableSurge === true) {
    return {
      multiplier: 1.0,
      surgeDisabled: true,
      factors: ['Flat-Rate / Dynamic Surge Paused by Admin'],
      isWeekend: false,
      isPeakHour: false
    };
  }

  const fleetAvail =
    Number.isFinite(input.fleetAvailabilityRatio)
      ? Math.max(0.05, Math.min(1.0, Number(input.fleetAvailabilityRatio)))
      : (dyn.fleetAvailabilityRatioDefault ?? 0.72);
  const activeBookings = Math.max(0, Number(input.activeBookingsCount || 0));
  const routeDemandScore =
    Number.isFinite(input.routeDemandScore) ? Math.max(0, Math.min(1.5, Number(input.routeDemandScore))) : 0.5;

  // Weekend check (Fri evening / Sat / Sun)
  let isWeekend = false;
  const cleanDate = String(input.pickupDate || '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const dayIdx = new Date(`${cleanDate}T08:00:00+05:30`).getDay();
    isWeekend = dayIdx === 0 || dayIdx === 6;
  }

  // Peak hour check (7–10 AM or 5–9 PM)
  const hr = parsePickupHourOfDay(input.pickupTime);
  const isPeakHour = (hr >= 7 && hr <= 10) || (hr >= 17 && hr <= 21);

  let rawMultiplier = Number(leadTimeResult.multiplier || 1.0);
  const factors = [];
  if (leadTimeResult.multiplier !== 1.0) {
    factors.push(`${leadTimeResult.label} (${leadTimeResult.multiplier}x)`);
  }

  if (eventResult && eventResult.multiplier > 1.0) {
    rawMultiplier *= eventResult.multiplier;
    factors.push(`${eventResult.name} (${eventResult.multiplier}x)`);
  }

  // Fleet supply vs demand
  if (fleetAvail <= 0.25 || activeBookings >= 35) {
    const lowAvailFactor = Number(dyn.lowAvailabilityMultiplier || 1.10);
    rawMultiplier *= lowAvailFactor;
    factors.push(`High Demand / Low Fleet Supply (${lowAvailFactor}x)`);
  } else if (fleetAvail >= 0.85 && activeBookings <= 5 && routeDemandScore <= 0.45 && (!eventResult || eventResult.multiplier <= 1.0)) {
    const highAvailDiscount = Number(dyn.highAvailabilityDiscountMultiplier || 0.96);
    rawMultiplier *= highAvailDiscount;
    factors.push(`High Fleet Availability Saver (${highAvailDiscount}x)`);
  }

  if (isWeekend && (eventResult?.multiplier || 1.0) <= 1.0) {
    const wk = Number(dyn.weekendMultiplier || 1.04);
    rawMultiplier *= wk;
    factors.push(`Weekend Travel Demand (${wk}x)`);
  }

  if (isPeakHour && fleetAvail < 0.65) {
    const pk = Number(dyn.peakHourMultiplier || 1.03);
    rawMultiplier *= pk;
    factors.push(`Peak Commute Hour (${pk}x)`);
  }

  const minBound = Number(dyn.minSurgeMultiplier || 0.90);
  const routeCap =
    routeOverride && Number.isFinite(Number(routeOverride.maxSurgeMultiplier))
      ? Number(routeOverride.maxSurgeMultiplier)
      : Number(dyn.maxSurgeMultiplier || 1.25);
  const maxBound = Math.min(Number(dyn.maxSurgeMultiplier || 1.25), routeCap);

  const clamped = Math.max(minBound, Math.min(maxBound, rawMultiplier));
  return {
    multiplier: Number(clamped.toFixed(4)),
    unclampedMultiplier: Number(rawMultiplier.toFixed(4)),
    minBound,
    maxBound,
    surgeDisabled: false,
    factors,
    isWeekend,
    isPeakHour
  };
}

// Module 8: Non-Stacking Terrain, Night, Waiting & Multi-Stop Operational Charges
export function computeOperationalCharges(input = {}, routeIntel = {}, vehicleCfg = {}, config = {}) {
  const tripType = input.tripType || 'oneway';
  const actualKm = Math.max(0, Number(input.distanceKm || 0));
  const pickupHour = parsePickupHourOfDay(input.pickupTime);

  const avgSpeedKmph =
    routeIntel.terrainType === 'difficult_mountain'
      ? 30
      : routeIntel.terrainType === 'hill_station'
      ? 42
      : 55;
  const estHours = tripType === 'local' ? 8 : Math.max(1.0, actualKm / avgSpeedKmph + 0.25);
  const arrivalHour = pickupHour + estHours;
  const arrivalMod = ((arrivalHour % 24) + 24) % 24;
  const estimatedDropTime = formatHourOfDay(arrivalHour);

  const isNightPickup = pickupHour >= 22.0 || pickupHour < 5.0;
  const isLateNightDrop =
    tripType !== 'local' &&
    (routeIntel.isHillAreaRoute
      ? arrivalHour >= 21.5 || arrivalMod < 4.5
      : arrivalHour >= 23.0 || arrivalMod < 4.5);

  // Night charge applies ONCE per qualifying night trip/day (never stacked twice on one leg)
  const nightSlotRate = Number(vehicleCfg.nightAllowance ?? config.nightChargePerSlot ?? 150);
  const nightCharge =
    tripType === 'local'
      ? 0
      : isNightPickup || isLateNightDrop
      ? nightSlotRate
      : 0;

  // Hill / Difficult Mountain Charge (Strictly Non-Stacking: either Difficult Mountain OR Standard Hill)
  let hillCharge = 0;
  if (tripType !== 'local') {
    if (routeIntel.isDifficultMountainRoute) {
      hillCharge = Number(vehicleCfg.difficultMountainCharge || 750);
    } else if (routeIntel.isHillAreaRoute) {
      hillCharge = Number(vehicleCfg.hillStationCharge || 340);
    }
  }

  // Waiting Charges (Pickup waiting + intermediate stop halt waiting beyond free grace period)
  const stops = Array.isArray(input.stops) ? input.stops : [];
  const totalStopHaltMinutes = stops.reduce((sum, s) => {
    if (s && typeof s === 'object' && Number.isFinite(Number(s.haltMinutes))) {
      return sum + Math.max(0, Number(s.haltMinutes));
    }
    return sum;
  }, 0);
  const rawWaitMin = Math.max(0, Number(input.waitingMinutes || 0)) + totalStopHaltMinutes;
  const freeGrace = Number(vehicleCfg.freeWaitingMinutes ?? 45);
  const billableWaitMinutes = rawWaitMin > freeGrace ? rawWaitMin - freeGrace : 0;
  const waitingRatePerHr = Number(vehicleCfg.waitingChargePerHour ?? 120);
  const waitingCharge =
    billableWaitMinutes > 0 ? Math.round((billableWaitMinutes / 60) * waitingRatePerHr) : 0;

  // Extra Stops Halt / Coordination Charge (beyond 0 on oneway/custom, modest fee per additional halt)
  const extraStopFeePerStop = Number(config.extraStopChargePerStop ?? 120);
  const validStopsCount = stops.filter((s) => (typeof s === 'string' ? s.trim().length >= 2 : Boolean(s?.location))).length;
  const extraStopsCharge = validStopsCount > 0 ? validStopsCount * extraStopFeePerStop : 0;

  // Vehicle Positioning & Empty Return Deadhead Charges (genuine operational costs only)
  const posKm = Math.max(0, Number(routeIntel.positioningDistanceKm || 0));
  const deadheadKm = Math.max(0, Number(routeIntel.emptyReturnDeadheadKm || 0));
  const opRatePerKm = Number(vehicleCfg.operatingCostPerKm || 6.0);
  const positioningCharge = posKm > 0 ? Math.round(posKm * (opRatePerKm * 0.75)) : 0;
  const emptyReturnCost = deadheadKm > 0 ? Math.round(deadheadKm * (opRatePerKm * 0.85)) : 0;

  // State Tax & Delhi MCD
  const originState = detectLocationState(input.pickupCity, 'Delhi');
  const destState = tripType === 'local' ? originState : detectLocationState(input.dropCity, 'Delhi');
  const stateTaxDays = computeStateTaxCalendarDays({
    tripType,
    distanceKm: actualKm,
    pickupTime: input.pickupTime,
    returnTime: input.returnTime,
    daysCount: Number(input.days || 1),
    terrainType: routeIntel.terrainType
  });

  const multiState =
    tripType === 'local'
      ? { stateRoutePath: [originState], statePermitBreakdown: [], totalStatePermitTax: 0, delhiMcdToll: 0 }
      : computeMultiStatePermitBreakdown(
          originState,
          destState,
          input.pickupCity,
          input.dropCity,
          stateTaxDays,
          input.routeGeometry,
          stops
        );

  return {
    estimatedDropTime,
    isNightPickup,
    isLateNightDrop,
    nightCharge,
    hillCharge,
    waitingMinutesTotal: rawWaitMin,
    billableWaitMinutes,
    waitingCharge,
    validStopsCount,
    extraStopsCharge,
    positioningDistanceKm: posKm,
    positioningCharge,
    emptyReturnDeadheadKm: deadheadKm,
    emptyReturnCost,
    originState,
    destState,
    stateTaxDays,
    stateRoutePath: multiState.stateRoutePath,
    statePermitBreakdown: multiState.statePermitBreakdown,
    statePermitTax: multiState.totalStatePermitTax,
    delhiMcdToll: multiState.delhiMcdToll
  };
}
