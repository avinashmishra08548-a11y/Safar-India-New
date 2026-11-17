// Modular Intelligent Intercity Taxi Pricing Engine - Constants & Configuration
// Preserves all existing State Tax tables, 12 AM rollover rules, ₹100 Delhi MCD toll, and vehicle defaults.

export const LOCATION_CATEGORIES = [
  'metro_city',
  'major_city',
  'normal_city',
  'outer_city',
  'suburban_area',
  'village',
  'remote_area',
  'hill_station',
  'difficult_mountain_road',
  'tourist_destination',
  'event_location'
];

export const LOCATION_CATEGORY_LABELS = {
  metro_city: 'Metro City',
  major_city: 'Major City',
  normal_city: 'Normal City',
  outer_city: 'Outer City',
  suburban_area: 'Suburban Area',
  village: 'Village',
  remote_area: 'Remote Area',
  hill_station: 'Hill Station',
  difficult_mountain_road: 'Difficult Mountain Road',
  tourist_destination: 'Tourist Destination',
  event_location: 'Event Location'
};

// Base operational positioning & return-trip likelihood profiles per category (no arbitrary surcharges)
export const LOCATION_CATEGORY_PROFILES = {
  metro_city: {
    returnProbability: 0.90,
    positioningFreeKm: 25,
    terrainWeight: 1.0,
    ruralAdjustmentPct: 0,
    remoteDispatchAllowed: true
  },
  major_city: {
    returnProbability: 0.80,
    positioningFreeKm: 25,
    terrainWeight: 1.0,
    ruralAdjustmentPct: 0,
    remoteDispatchAllowed: true
  },
  normal_city: {
    returnProbability: 0.65,
    positioningFreeKm: 25,
    terrainWeight: 1.0,
    ruralAdjustmentPct: 0,
    remoteDispatchAllowed: true
  },
  outer_city: {
    returnProbability: 0.55,
    positioningFreeKm: 20,
    terrainWeight: 1.02,
    ruralAdjustmentPct: 0.02,
    remoteDispatchAllowed: true
  },
  suburban_area: {
    returnProbability: 0.52,
    positioningFreeKm: 20,
    terrainWeight: 1.02,
    ruralAdjustmentPct: 0.02,
    remoteDispatchAllowed: true
  },
  village: {
    returnProbability: 0.25,
    positioningFreeKm: 15,
    terrainWeight: 1.06,
    ruralAdjustmentPct: 0.06,
    remoteDispatchAllowed: true
  },
  remote_area: {
    returnProbability: 0.15,
    positioningFreeKm: 15,
    terrainWeight: 1.12,
    ruralAdjustmentPct: 0.10,
    remoteDispatchAllowed: true
  },
  hill_station: {
    returnProbability: 0.42,
    positioningFreeKm: 20,
    terrainWeight: 1.15,
    ruralAdjustmentPct: 0.04,
    remoteDispatchAllowed: true
  },
  difficult_mountain_road: {
    returnProbability: 0.20,
    positioningFreeKm: 15,
    terrainWeight: 1.25,
    ruralAdjustmentPct: 0.12,
    remoteDispatchAllowed: true
  },
  tourist_destination: {
    returnProbability: 0.68,
    positioningFreeKm: 20,
    terrainWeight: 1.03,
    ruralAdjustmentPct: 0.02,
    remoteDispatchAllowed: true
  },
  event_location: {
    returnProbability: 0.50,
    positioningFreeKm: 20,
    terrainWeight: 1.04,
    ruralAdjustmentPct: 0.03,
    remoteDispatchAllowed: true
  }
};

// Fleet Dispatch Hubs across India for accurate vehicle positioning calculation
export const FLEET_HUBS = [
  { id: 'delhi', name: 'Delhi NCR Hub', state: 'Delhi', lat: 28.6139, lon: 77.2090, tier: 'metro_city' },
  { id: 'chandigarh', name: 'Chandigarh / Zirakpur Hub', state: 'Chandigarh', lat: 30.7333, lon: 76.7794, tier: 'major_city' },
  { id: 'jaipur', name: 'Jaipur Hub', state: 'Rajasthan', lat: 26.9124, lon: 75.7873, tier: 'major_city' },
  { id: 'agra', name: 'Agra Hub', state: 'Uttar Pradesh', lat: 27.1767, lon: 78.0081, tier: 'major_city' },
  { id: 'haridwar', name: 'Haridwar / Dehradun Hub', state: 'Uttarakhand', lat: 29.9457, lon: 78.1642, tier: 'major_city' },
  { id: 'lucknow', name: 'Lucknow Hub', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462, tier: 'major_city' },
  { id: 'varanasi', name: 'Varanasi Hub', state: 'Uttar Pradesh', lat: 25.3176, lon: 82.9739, tier: 'major_city' },
  { id: 'patna', name: 'Patna Hub', state: 'Bihar', lat: 25.5941, lon: 85.1376, tier: 'major_city' },
  { id: 'ranchi', name: 'Ranchi Hub', state: 'Jharkhand', lat: 23.3441, lon: 85.3096, tier: 'major_city' },
  { id: 'amritsar', name: 'Amritsar Hub', state: 'Punjab', lat: 31.6340, lon: 74.8723, tier: 'major_city' },
  { id: 'jammu', name: 'Jammu Hub', state: 'Jammu & Kashmir', lat: 32.7266, lon: 74.8570, tier: 'major_city' },
  { id: 'mumbai', name: 'Mumbai Hub', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, tier: 'metro_city' },
  { id: 'pune', name: 'Pune Hub', state: 'Maharashtra', lat: 18.5204, lon: 73.8567, tier: 'metro_city' },
  { id: 'ahmedabad', name: 'Ahmedabad Hub', state: 'Gujarat', lat: 23.0225, lon: 72.5714, tier: 'metro_city' },
  { id: 'bengaluru', name: 'Bengaluru Hub', state: 'Karnataka', lat: 12.9716, lon: 77.5946, tier: 'metro_city' },
  { id: 'chennai', name: 'Chennai Hub', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, tier: 'metro_city' },
  { id: 'hyderabad', name: 'Hyderabad Hub', state: 'Telangana', lat: 17.3850, lon: 78.4867, tier: 'metro_city' },
  { id: 'kolkata', name: 'Kolkata Hub', state: 'West Bengal', lat: 22.5726, lon: 88.3639, tier: 'metro_city' },
  { id: 'bhopal', name: 'Bhopal / Indore Hub', state: 'Madhya Pradesh', lat: 23.2599, lon: 77.4126, tier: 'major_city' },
  { id: 'bhubaneswar', name: 'Bhubaneswar Hub', state: 'Odisha', lat: 20.2961, lon: 85.8245, tier: 'major_city' }
];

// Preserved Fixed Per-Day Inter-State Commercial Permit Tax (expires 12:00 AM midnight daily)
export const FIXED_STATE_TAX_RATES = {
  uttar_pradesh: 150,
  rajasthan: 300,
  andhra_pradesh: 250,
  maharashtra: 200,
  gujarat: 100,
  tamil_nadu: 100,
  bihar: 325,
  assam: 250,
  chhattisgarh: 160,
  himachal_pradesh: 250,
  haryana: 120,
  jharkhand: 300,
  karnataka: 100,
  kerala: 250,
  madhya_pradesh: 283,
  mizoram: 250,
  odisha: 475,
  punjab: 0,
  pondicherry: 230,
  sikkim: 250,
  tripura: 250,
  telangana: 350,
  dadra_daman_diu: 100,
  uttarakhand: 290,
  west_bengal: 800,
  delhi: 0
};

export const DELHI_MCD_TOLL_AMOUNT = 100;

export const DIFFICULT_MOUNTAIN_TOKENS = [
  'badrinath', 'kedarnath', 'sonprayag', 'guptkashi', 'joshimath', 'auli', 'gangotri',
  'yamunotri', 'harsil', 'barkot', 'jankichatti', 'chopta', 'tungnath', 'munsiyari',
  'dharchula', 'spiti', 'kaza', 'kinnaur', 'kalpa', 'sangla', 'chitkul', 'keylong',
  'jispa', 'rohtang', 'atal tunnel', 'manali', 'solang', 'leh', 'ladakh', 'kargil',
  'nubra', 'pangong', 'zanskar', 'sonamarg', 'pahalgam', 'gulmarg', 'tawang',
  'lachung', 'lachen', 'nathula', 'pelling', 'narkanda', 'kufri'
];

export const HILL_STATION_TOKENS = [
  'shimla', 'kasauli', 'solan', 'chail', 'kullu', 'kasol', 'manikaran', 'dharamshala',
  'mcleodganj', 'dalhousie', 'khajjiar', 'palampur', 'kangra', 'nagrota', 'bir',
  'nainital', 'mussoorie', 'almora', 'ranikhet', 'kausani', 'bhimtal', 'mukteshwar',
  'lansdowne', 'dhanaulti', 'kanatal', 'tehri', 'dehradun', 'rishikesh', 'rudraprayag',
  'chamoli', 'pauri', 'bageshwar', 'pithoragarh', 'chakrata', 'ooty', 'coonoor',
  'kodaikanal', 'munnar', 'wayanad', 'coorg', 'madikeri', 'chikmagalur', 'mahabaleshwar',
  'panchgani', 'lonavala', 'khandala', 'mount abu', 'mountabu', 'darjeeling', 'kalimpong',
  'gangtok', 'shillong', 'cherrapunji', 'pachmarhi', 'saputara', 'araku', 'katra', 'patnitop'
];

export const METRO_CITY_TOKENS = [
  'delhi', 'new delhi', 'delhi ncr', 'mumbai', 'navi mumbai', 'thane', 'bengaluru',
  'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad'
];

export const MAJOR_CITY_TOKENS = [
  'chandigarh', 'jaipur', 'agra', 'lucknow', 'kanpur', 'varanasi', 'prayagraj',
  'ayodhya', 'haridwar', 'patna', 'ranchi', 'jamshedpur', 'dhanbad', 'amritsar',
  'ludhiana', 'jalandhar', 'jammu', 'srinagar', 'bhopal', 'indore', 'gwalior',
  'udaipur', 'jodhpur', 'bikaner', 'ajmer', 'surat', 'vadodara', 'rajkot',
  'nagpur', 'nashik', 'aurangabad', 'mysore', 'mysuru', 'kochi', 'cochin',
  'coimbatore', 'madurai', 'tirupati', 'visakhapatnam', 'vijayawada', 'bhubaneswar',
  'guwahati', 'raipur', 'faridabad', 'noida', 'gurugram', 'gurgaon', 'ghaziabad',
  'meerut', 'muzaffarpur', 'gaya', 'darbhanga', 'bhagalpur', 'deoghar', 'bokaro'
];

export const OUTER_CITY_TOKENS = [
  'zirakpur', 'dera bassi', 'derabassi', 'kharar', 'mohali', 'panchkula', 'manesar',
  'bhiwadi', 'neemrana', 'greater noida', 'jewar', 'kundli', 'bahadurgarh', 'ballabgarh',
  'danapur', 'bihta', 'hajipur', 'sonepur', 'fatuha', 'phulwari', 'barhi', 'ramgarh',
  'haldwani', 'kathgodam', 'kotdwar', 'roorkee', 'sonipat', 'panipat', 'karnal', 'ambala'
];

export const SUBURBAN_AREA_TOKENS = [
  'sector', 'extension', 'phase', 'enclave', 'vihar', 'colony', 'nagar', 'puram',
  'township', 'industrial area', 'estate', 'bypass', 'mod', 'more', 'chauraha', 'suburb'
];

export const VILLAGE_TOKENS = [
  'village', 'gaon', 'gram', 'panchayat', 'tehsil', 'taluka', 'block', 'kasba',
  'khera', 'kalan', 'khurd', 'chak', 'purwa', 'basti', 'tola', 'majra', 'dhani'
];

export const REMOTE_AREA_TOKENS = [
  'remote', 'forest', 'wildlife', 'sanctuary', 'reserve', 'camp', 'valley', 'border',
  'checkpost', 'pass', 'glacier', 'zero point', 'base camp', 'dam', 'project site',
  'corbett', 'jim corbett', 'ranthambore', 'sariska', 'sundarban', 'kutch'
];

export const TOURIST_DESTINATION_TOKENS = [
  'taj mahal', 'tajganj', 'amber fort', 'amer fort', 'fatehpur sikri', 'vrindavan',
  'mathura', 'gokul', 'barsana', 'khatu shyam', 'khatushyam', 'salasar', 'mehandipur',
  'pushkar', 'vaishno devi', 'golden temple', 'wagah', 'shirdi', 'dwarka', 'somnath',
  'puri', 'jagannath', 'konark', 'mahakaleshwar', 'ujjain', 'hawa mahal', 'chittorgarh',
  'kumbhalgarh', 'pondicherry', 'goa', 'calangute', 'baga', 'statue of unity'
];

export const EVENT_LOCATION_TOKENS = [
  'stadium', 'convention', 'expo', 'fairground', 'pragati maidan', 'yashobhoomi',
  'bharat mandapam', 'mela', 'kumbh', 'magh mela', 'banquet', 'resort', 'farmhouse',
  'auditorium', 'racecourse', 'fest'
];

export const STATE_NAME_DISPLAY = {
  uttar_pradesh: 'Uttar Pradesh',
  rajasthan: 'Rajasthan',
  andhra_pradesh: 'Andhra Pradesh',
  maharashtra: 'Maharashtra',
  gujarat: 'Gujarat',
  tamil_nadu: 'Tamil Nadu',
  bihar: 'Bihar',
  assam: 'Assam',
  chhattisgarh: 'Chhattisgarh',
  himachal_pradesh: 'Himachal Pradesh',
  haryana: 'Haryana',
  jharkhand: 'Jharkhand',
  karnataka: 'Karnataka',
  kerala: 'Kerala',
  madhya_pradesh: 'Madhya Pradesh',
  mizoram: 'Mizoram',
  odisha: 'Odisha',
  punjab: 'Punjab',
  pondicherry: 'Pondicherry',
  sikkim: 'Sikkim',
  tripura: 'Tripura',
  telangana: 'Telangana',
  dadra_daman_diu: 'Dadra & Nagar Haveli and Daman & Diu',
  uttarakhand: 'Uttarakhand',
  west_bengal: 'West Bengal',
  delhi: 'Delhi NCR'
};

// Independent Vehicle Configuration Registry (Module 3)
// Supports all 9 required distinct vehicles + backward-compatible exec_sedan + custom admin vehicles
export const DEFAULT_VEHICLES_CONFIG = {
  hatchback: {
    id: 'hatchback',
    name: 'Compact / Hatchback AC',
    models: 'WagonR, Tata Indica, Celerio, Tiago',
    category: 'Pocket Friendly · Best Price',
    ratePerKm: 8.8,
    roundTripRatePerKm: 10.5,
    extraKmRate: 9.5,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 1299,
    driverAllowancePerDay: 240,
    waitingChargePerHour: 100,
    freeWaitingMinutes: 45,
    nightAllowance: 150,
    hillStationCharge: 280,
    difficultMountainCharge: 650,
    statePermitTax: 200,
    local8Hr80KmFare: 1599,
    operatingCostPerKm: 5.4,
    driverPayoutPerKm: 1.6,
    minProfitMargin: 220,
    minProfitType: 'fixed_inr',
    capacityPassengers: 4,
    capacityLuggage: 2,
    popular: false,
    enabled: true,
    isCustom: false
  },
  sedan: {
    id: 'sedan',
    name: 'Comfort Sedan AC (Etios / Aura)',
    models: 'Toyota Etios, Hyundai Aura, Honda Amaze',
    category: 'Best Value · Most Popular',
    ratePerKm: 9.5,
    roundTripRatePerKm: 11.5,
    extraKmRate: 10.2,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 1450,
    driverAllowancePerDay: 260,
    waitingChargePerHour: 120,
    freeWaitingMinutes: 45,
    nightAllowance: 150,
    hillStationCharge: 340,
    difficultMountainCharge: 780,
    statePermitTax: 250,
    local8Hr80KmFare: 1799,
    operatingCostPerKm: 5.9,
    driverPayoutPerKm: 1.75,
    minProfitMargin: 260,
    minProfitType: 'fixed_inr',
    capacityPassengers: 4,
    capacityLuggage: 3,
    popular: true,
    enabled: true,
    isCustom: false
  },
  dzire: {
    id: 'dzire',
    name: 'Maruti Suzuki Dzire AC',
    models: 'Assured Maruti Dzire VXi / Tour S CNG+Petrol',
    category: 'India #1 Highway Sedan',
    ratePerKm: 9.8,
    roundTripRatePerKm: 11.8,
    extraKmRate: 10.5,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 1499,
    driverAllowancePerDay: 260,
    waitingChargePerHour: 120,
    freeWaitingMinutes: 45,
    nightAllowance: 150,
    hillStationCharge: 350,
    difficultMountainCharge: 800,
    statePermitTax: 250,
    local8Hr80KmFare: 1849,
    operatingCostPerKm: 6.0,
    driverPayoutPerKm: 1.8,
    minProfitMargin: 280,
    minProfitType: 'fixed_inr',
    capacityPassengers: 4,
    capacityLuggage: 3,
    popular: true,
    enabled: true,
    isCustom: false
  },
  exec_sedan: {
    id: 'exec_sedan',
    name: 'Prime Executive Sedan',
    models: 'Honda City, Maruti Ciaz, Hyundai Verna',
    category: 'Corporate Business Class',
    ratePerKm: 11.0,
    roundTripRatePerKm: 13.0,
    extraKmRate: 11.8,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 1699,
    driverAllowancePerDay: 300,
    waitingChargePerHour: 150,
    freeWaitingMinutes: 45,
    nightAllowance: 200,
    hillStationCharge: 390,
    difficultMountainCharge: 880,
    statePermitTax: 300,
    local8Hr80KmFare: 2199,
    operatingCostPerKm: 6.9,
    driverPayoutPerKm: 2.0,
    minProfitMargin: 320,
    minProfitType: 'fixed_inr',
    capacityPassengers: 4,
    capacityLuggage: 4,
    popular: false,
    enabled: true,
    isCustom: false
  },
  ertiga: {
    id: 'ertiga',
    name: 'Maruti Ertiga AC (6+1)',
    models: 'Assured Maruti Suzuki Ertiga ZXi / Tour M',
    category: 'Family Value 6+1 MPV',
    ratePerKm: 12.2,
    roundTripRatePerKm: 14.5,
    extraKmRate: 13.2,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 1999,
    driverAllowancePerDay: 320,
    waitingChargePerHour: 150,
    freeWaitingMinutes: 45,
    nightAllowance: 200,
    hillStationCharge: 420,
    difficultMountainCharge: 950,
    statePermitTax: 350,
    local8Hr80KmFare: 2399,
    operatingCostPerKm: 7.8,
    driverPayoutPerKm: 2.1,
    minProfitMargin: 350,
    minProfitType: 'fixed_inr',
    capacityPassengers: 6,
    capacityLuggage: 4,
    popular: true,
    enabled: true,
    isCustom: false
  },
  suv: {
    id: 'suv',
    name: 'Executive SUV AC (Carens / Rumion)',
    models: 'Kia Carens, Toyota Rumion, Mahindra Marazzo (6+1)',
    category: 'Executive Family 6+1 Seater',
    ratePerKm: 12.6,
    roundTripRatePerKm: 15.0,
    extraKmRate: 13.5,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 2099,
    driverAllowancePerDay: 320,
    waitingChargePerHour: 160,
    freeWaitingMinutes: 45,
    nightAllowance: 200,
    hillStationCharge: 440,
    difficultMountainCharge: 980,
    statePermitTax: 350,
    local8Hr80KmFare: 2499,
    operatingCostPerKm: 8.1,
    driverPayoutPerKm: 2.2,
    minProfitMargin: 380,
    minProfitType: 'fixed_inr',
    capacityPassengers: 6,
    capacityLuggage: 4,
    popular: false,
    enabled: true,
    isCustom: false
  },
  innova: {
    id: 'innova',
    name: 'Toyota Innova AC (7+1)',
    models: 'Toyota Innova Touring Diesel (6+1 / 7+1)',
    category: 'Trusted Highway Tourer',
    ratePerKm: 14.5,
    roundTripRatePerKm: 17.5,
    extraKmRate: 15.5,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 2399,
    driverAllowancePerDay: 360,
    waitingChargePerHour: 180,
    freeWaitingMinutes: 45,
    nightAllowance: 250,
    hillStationCharge: 500,
    difficultMountainCharge: 1150,
    statePermitTax: 450,
    local8Hr80KmFare: 2999,
    operatingCostPerKm: 9.2,
    driverPayoutPerKm: 2.5,
    minProfitMargin: 450,
    minProfitType: 'fixed_inr',
    capacityPassengers: 7,
    capacityLuggage: 5,
    popular: false,
    enabled: true,
    isCustom: false
  },
  innova_crysta: {
    id: 'innova_crysta',
    name: 'Toyota Innova Crysta (VIP)',
    models: 'Assured Toyota Innova Crysta 2.4 Captain Seats',
    category: 'Premium VIP Highway Cruiser',
    ratePerKm: 15.8,
    roundTripRatePerKm: 19.0,
    extraKmRate: 17.0,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 2699,
    driverAllowancePerDay: 380,
    waitingChargePerHour: 200,
    freeWaitingMinutes: 45,
    nightAllowance: 250,
    hillStationCharge: 550,
    difficultMountainCharge: 1250,
    statePermitTax: 450,
    local8Hr80KmFare: 3199,
    operatingCostPerKm: 10.1,
    driverPayoutPerKm: 2.75,
    minProfitMargin: 520,
    minProfitType: 'fixed_inr',
    capacityPassengers: 7,
    capacityLuggage: 5,
    popular: true,
    enabled: true,
    isCustom: false
  },
  premium_suv: {
    id: 'premium_suv',
    name: 'Premium SUV (Hycross / Fortuner)',
    models: 'Toyota Innova Hycross Hybrid, Fortuner, Scorpio-N',
    category: 'Ultra Luxury & Mountain Beast',
    ratePerKm: 18.8,
    roundTripRatePerKm: 22.0,
    extraKmRate: 20.0,
    minKm: 130,
    minRoundTripKmPerDay: 250,
    minFare: 3299,
    driverAllowancePerDay: 450,
    waitingChargePerHour: 250,
    freeWaitingMinutes: 45,
    nightAllowance: 300,
    hillStationCharge: 680,
    difficultMountainCharge: 1500,
    statePermitTax: 550,
    local8Hr80KmFare: 3899,
    operatingCostPerKm: 11.8,
    driverPayoutPerKm: 3.1,
    minProfitMargin: 650,
    minProfitType: 'fixed_inr',
    capacityPassengers: 7,
    capacityLuggage: 6,
    popular: false,
    enabled: true,
    isCustom: false
  },
  tempo: {
    id: 'tempo',
    name: 'Tempo Traveller AC (12 Seater)',
    models: 'Force Traveller / Urbania 12+1 Pushback AC',
    category: 'Group & Pilgrimage',
    ratePerKm: 21.5,
    roundTripRatePerKm: 24.5,
    extraKmRate: 23.0,
    minKm: 150,
    minRoundTripKmPerDay: 250,
    minFare: 4299,
    driverAllowancePerDay: 480,
    waitingChargePerHour: 300,
    freeWaitingMinutes: 45,
    nightAllowance: 350,
    hillStationCharge: 750,
    difficultMountainCharge: 1750,
    statePermitTax: 650,
    local8Hr80KmFare: 4799,
    operatingCostPerKm: 13.6,
    driverPayoutPerKm: 3.6,
    minProfitMargin: 800,
    minProfitType: 'fixed_inr',
    capacityPassengers: 12,
    capacityLuggage: 10,
    popular: false,
    enabled: true,
    isCustom: false
  }
};

// Lead-Time 8-Tier Multipliers (Module 5)
// Early bookings never penalized; urgent bookings adjust moderately only when availability is tight
export const DEFAULT_LEAD_TIME_RULES = {
  immediate: { label: 'Immediate (< 1 hr)', maxHours: 1, baseMultiplier: 1.06, tightAvailabilityBoost: 0.06 },
  within_2h: { label: 'Within 2 Hours', maxHours: 2.5, baseMultiplier: 1.04, tightAvailabilityBoost: 0.05 },
  same_day: { label: 'Same Day', maxHours: 14, baseMultiplier: 1.02, tightAvailabilityBoost: 0.04 },
  next_day: { label: 'Next Day', maxHours: 36, baseMultiplier: 1.0, tightAvailabilityBoost: 0.02 },
  days_2_3: { label: '2–3 Days Advance', maxHours: 84, baseMultiplier: 0.99, tightAvailabilityBoost: 0 },
  days_5_7: { label: '5–7 Days Advance', maxHours: 192, baseMultiplier: 0.97, tightAvailabilityBoost: 0 },
  days_10_15: { label: '10–15 Days Advance', maxHours: 384, baseMultiplier: 0.95, tightAvailabilityBoost: 0 },
  days_30_plus: { label: '30+ Days Advance', maxHours: 99999, baseMultiplier: 0.94, tightAvailabilityBoost: 0 }
};

// Default Seasonal / Festival / Event Calendar (Module 6)
export const DEFAULT_SEASONAL_EVENTS = [
  {
    id: 'evt_diwali_peak',
    name: 'Diwali Festive Rush',
    startDate: '2026-11-05',
    endDate: '2026-11-12',
    multiplier: 1.16,
    cities: [],
    active: true
  },
  {
    id: 'evt_holi_peak',
    name: 'Holi Festive Travel',
    startDate: '2026-03-01',
    endDate: '2026-03-06',
    multiplier: 1.14,
    cities: [],
    active: true
  },
  {
    id: 'evt_newyear_hills',
    name: 'Christmas & New Year Peak',
    startDate: '2026-12-23',
    endDate: '2027-01-03',
    multiplier: 1.15,
    cities: [],
    active: true
  },
  {
    id: 'evt_summer_hills',
    name: 'Summer Hill Station Peak',
    startDate: '2026-05-15',
    endDate: '2026-06-30',
    multiplier: 1.10,
    cities: ['shimla', 'manali', 'nainital', 'mussoorie', 'dharamshala', 'ooty', 'munnar', 'darjeeling'],
    active: true
  }
];

export const DEFAULT_PRICING_ENGINE_CONFIG = {
  version: 1,
  versionLabel: 'v1.0-intelligent-engine',
  updatedAt: '2026-11-15T00:00:00.000Z',
  minOneWayBillableKm: 130,
  minRoundTripKmPerDay: 250,
  nightChargePerSlot: 150,
  defaultParkingCharge: 150,
  gstRatePct: 5,
  paymentGatewayFeePct: 2.0,
  platformCommissionPct: 0,
  extraStopChargePerStop: 120,
  shortLongDistanceThresholdKm: 250,
  competitorRules: {
    enabled: true,
    shortRouteMinSavingInr: 150,
    longRouteMinSavingInr: 250,
    benchmarkAggregators: ['CabBazar', 'MakeMyTrip', 'Savaari'],
    fallbackPerKmUpliftFactor: {
      oneway: 1.14,
      roundtrip: 1.12,
      multiday: 1.12,
      airport: 1.15,
      local: 1.14,
      custom: 1.13
    }
  },
  dynamicPricing: {
    enabled: true,
    emergencyDisableSurge: false,
    minSurgeMultiplier: 0.90,
    maxSurgeMultiplier: 1.25,
    weekendMultiplier: 1.04,
    peakHourMultiplier: 1.03,
    lowAvailabilityMultiplier: 1.10,
    highAvailabilityDiscountMultiplier: 0.96,
    fleetAvailabilityRatioDefault: 0.72
  },
  leadTimeRules: DEFAULT_LEAD_TIME_RULES,
  seasonalEvents: DEFAULT_SEASONAL_EVENTS,
  routeOverrides: [],
  competitorQuotes: [],
  locationCategoryOverrides: {},
  tripTypeOverrides: {
    oneway: { baseMultiplier: 1.0, minKmOverride: null },
    roundtrip: { baseMultiplier: 1.0, minKmPerDayOverride: null },
    multiday: { baseMultiplier: 0.98, minKmPerDayOverride: 250 },
    airport: { baseMultiplier: 1.0, pickupFee: 100 },
    local: { baseMultiplier: 1.0 },
    custom: { baseMultiplier: 1.0, minKmOverride: 130 }
  },
  vehicles: DEFAULT_VEHICLES_CONFIG
};

// Deep merge helper so legacy saved server/local configs smoothly adopt newly added vehicles & rules
export function mergePricingConfig(partialConfig) {
  const base = JSON.parse(JSON.stringify(DEFAULT_PRICING_ENGINE_CONFIG));
  if (!partialConfig || typeof partialConfig !== 'object') {
    return base;
  }

  const mergedVehicles = { ...base.vehicles };
  if (partialConfig.vehicles && typeof partialConfig.vehicles === 'object') {
    for (const [vehId, vehCfg] of Object.entries(partialConfig.vehicles)) {
      if (!vehCfg || typeof vehCfg !== 'object') continue;
      if (mergedVehicles[vehId]) {
        mergedVehicles[vehId] = { ...mergedVehicles[vehId], ...vehCfg, id: vehId };
      } else {
        // Custom admin-added vehicle
        mergedVehicles[vehId] = {
          id: vehId,
          name: vehCfg.name || vehId,
          models: vehCfg.models || 'Custom AC Vehicle',
          category: vehCfg.category || 'Custom Fleet Category',
          ratePerKm: Number(vehCfg.ratePerKm) || 12,
          roundTripRatePerKm: Number(vehCfg.roundTripRatePerKm) || 14,
          extraKmRate: Number(vehCfg.extraKmRate) || 13,
          minKm: Number(vehCfg.minKm) || 130,
          minRoundTripKmPerDay: Number(vehCfg.minRoundTripKmPerDay) || 250,
          minFare: Number(vehCfg.minFare) || 1800,
          driverAllowancePerDay: Number(vehCfg.driverAllowancePerDay) || 300,
          waitingChargePerHour: Number(vehCfg.waitingChargePerHour) || 150,
          freeWaitingMinutes: Number(vehCfg.freeWaitingMinutes) || 45,
          nightAllowance: Number(vehCfg.nightAllowance) || 150,
          hillStationCharge: Number(vehCfg.hillStationCharge) || 400,
          difficultMountainCharge: Number(vehCfg.difficultMountainCharge) || 900,
          statePermitTax: Number(vehCfg.statePermitTax) || 250,
          local8Hr80KmFare: Number(vehCfg.local8Hr80KmFare) || 2200,
          operatingCostPerKm: Number(vehCfg.operatingCostPerKm) || 7.5,
          driverPayoutPerKm: Number(vehCfg.driverPayoutPerKm) || 2.0,
          minProfitMargin: Number(vehCfg.minProfitMargin) || 300,
          minProfitType: vehCfg.minProfitType === 'percent' ? 'percent' : 'fixed_inr',
          capacityPassengers: Number(vehCfg.capacityPassengers) || 4,
          capacityLuggage: Number(vehCfg.capacityLuggage) || 3,
          popular: Boolean(vehCfg.popular),
          enabled: vehCfg.enabled !== false,
          isCustom: true
        };
      }
    }
  }

  return {
    ...base,
    ...partialConfig,
    competitorRules: {
      ...base.competitorRules,
      ...(partialConfig.competitorRules || {}),
      fallbackPerKmUpliftFactor: {
        ...base.competitorRules.fallbackPerKmUpliftFactor,
        ...((partialConfig.competitorRules && partialConfig.competitorRules.fallbackPerKmUpliftFactor) || {})
      }
    },
    dynamicPricing: {
      ...base.dynamicPricing,
      ...(partialConfig.dynamicPricing || {})
    },
    leadTimeRules: {
      ...base.leadTimeRules,
      ...(partialConfig.leadTimeRules || {})
    },
    tripTypeOverrides: {
      ...base.tripTypeOverrides,
      ...(partialConfig.tripTypeOverrides || {})
    },
    seasonalEvents: Array.isArray(partialConfig.seasonalEvents)
      ? partialConfig.seasonalEvents
      : base.seasonalEvents,
    routeOverrides: Array.isArray(partialConfig.routeOverrides)
      ? partialConfig.routeOverrides
      : [],
    competitorQuotes: Array.isArray(partialConfig.competitorQuotes)
      ? partialConfig.competitorQuotes
      : [],
    locationCategoryOverrides: {
      ...base.locationCategoryOverrides,
      ...(partialConfig.locationCategoryOverrides || {})
    },
    vehicles: mergedVehicles
  };
}
