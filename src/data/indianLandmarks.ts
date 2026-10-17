/**
 * Comprehensive Indian Localities, Airport Terminals, Railway Stations, and Sectors
 * Provides instant real-time autocomplete matches and exact coordinates for India.
 */

export interface LandmarkLocation {
  name: string;
  category: 'locality' | 'airport' | 'railway' | 'sector' | 'metro';
  city: string;
  state: string;
  lat: number;
  lng: number;
  pincode?: string;
  aliases?: string[];
}

export const POPULAR_INDIAN_LANDMARKS: LandmarkLocation[] = [
  // --- DELHI NCR ---
  {
    name: 'Burari',
    category: 'locality',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.7536,
    lng: 77.2017,
    pincode: '110084',
    aliases: ['Burari Delhi', 'Burari Transport Authority', 'Sant Nagar Burari', 'Burari Chowk']
  },
  {
    name: 'Terminal 3, Indira Gandhi International Airport (IGI T3)',
    category: 'airport',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.5549,
    lng: 77.0842,
    pincode: '110037',
    aliases: ['Terminal 3 Delhi Airport', 'IGI T3', 'Delhi Airport Terminal 3', 'T3 IGI']
  },
  {
    name: 'Terminal 1, Indira Gandhi International Airport (IGI T1)',
    category: 'airport',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.5684,
    lng: 77.1126,
    pincode: '110037',
    aliases: ['Terminal 1 Delhi Airport', 'IGI T1 Domestic', 'Delhi Airport T1']
  },
  {
    name: 'Terminal 2, Indira Gandhi International Airport (IGI T2)',
    category: 'airport',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.5582,
    lng: 77.0911,
    pincode: '110037',
    aliases: ['Terminal 2 Delhi Airport', 'IGI T2', 'Delhi Airport T2']
  },
  {
    name: 'New Delhi Railway Station (NDLS)',
    category: 'railway',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6430,
    lng: 77.2197,
    pincode: '110055',
    aliases: ['NDLS', 'Paharganj Railway Station', 'Ajmeri Gate NDLS', 'New Delhi Station']
  },
  {
    name: 'Old Delhi Railway Station (DLI)',
    category: 'railway',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6619,
    lng: 77.2280,
    pincode: '110006',
    aliases: ['DLI', 'Purani Dilli Railway Station', 'Chandni Chowk Railway Station']
  },
  {
    name: 'Hazrat Nizamuddin Railway Station (NZM)',
    category: 'railway',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.5888,
    lng: 77.2534,
    pincode: '110013',
    aliases: ['NZM', 'Nizamuddin Station', 'Sarai Kale Khan Station']
  },
  {
    name: 'Anand Vihar Terminal (ANVT) & ISBT',
    category: 'railway',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6508,
    lng: 77.3153,
    pincode: '110092',
    aliases: ['ANVT', 'Anand Vihar Railway Station', 'Anand Vihar Bus Stand']
  },
  {
    name: 'Connaught Place (CP)',
    category: 'locality',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6315,
    lng: 77.2167,
    pincode: '110001',
    aliases: ['CP Delhi', 'Rajiv Chowk', 'Connaught Circus', 'Inner Circle CP']
  },
  {
    name: 'Rohini (Sector 1 to 24)',
    category: 'sector',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.7166,
    lng: 77.1177,
    pincode: '110085',
    aliases: ['Rohini West', 'Rohini East', 'Sector 3 Rohini', 'Sector 9 Rohini', 'Sector 16 Rohini']
  },
  {
    name: 'Pitampura & Netaji Subhash Place (NSP)',
    category: 'locality',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.6990,
    lng: 77.1384,
    pincode: '110034',
    aliases: ['Pitampura Delhi', 'NSP Complex', 'TV Tower Pitampura']
  },
  {
    name: 'Dwarka (Sector 1 to 23)',
    category: 'sector',
    city: 'Delhi NCR',
    state: 'Delhi',
    lat: 28.5921,
    lng: 77.0460,
    pincode: '110075',
    aliases: ['Dwarka Mor', 'Dwarka Sector 21', 'Dwarka Sector 12', 'Dwarka Expressway']
  },
  {
    name: 'Cyber City, DLF Phase 2 & 3',
    category: 'locality',
    city: 'Gurugram',
    state: 'Haryana',
    lat: 28.4950,
    lng: 77.0895,
    pincode: '122002',
    aliases: ['Cyber City Gurgaon', 'Cyber Hub', 'DLF Cyber City', 'DLF Phase 2 Gurugram']
  },
  {
    name: 'Sohna Road & Golf Course Extension',
    category: 'locality',
    city: 'Gurugram',
    state: 'Haryana',
    lat: 28.4060,
    lng: 77.0422,
    pincode: '122018',
    aliases: ['Sohna Road Gurgaon', 'Badshahpur', 'Golf Course Ext Road']
  },
  {
    name: 'Noida Sector 18 (Atta Market & Mall of India)',
    category: 'sector',
    city: 'Noida',
    state: 'Uttar Pradesh',
    lat: 28.5708,
    lng: 77.3271,
    pincode: '201301',
    aliases: ['Sector 18 Noida', 'DLF Mall of India', 'Atta Market Noida']
  },
  {
    name: 'Noida Sector 62 (Electronic City)',
    category: 'sector',
    city: 'Noida',
    state: 'Uttar Pradesh',
    lat: 28.6258,
    lng: 77.3628,
    pincode: '201309',
    aliases: ['Sector 62 Noida', 'Noida Electronic City Metro', 'Fortis Hospital Sector 62']
  },
  {
    name: 'Noida Sector 128 / Noida-Greater Noida Expressway',
    category: 'sector',
    city: 'Noida',
    state: 'Uttar Pradesh',
    lat: 28.5135,
    lng: 77.3800,
    pincode: '201304',
    aliases: ['Sector 128 Noida', 'Jaypee Hospital Sector 128', 'Noida Expressway']
  },
  {
    name: 'Pari Chowk, Greater Noida',
    category: 'locality',
    city: 'Greater Noida',
    state: 'Uttar Pradesh',
    lat: 28.4744,
    lng: 77.5040,
    pincode: '201310',
    aliases: ['Pari Chowk', 'Knowledge Park Greater Noida', 'Alpha Greater Noida']
  },
  {
    name: 'Indirapuram & Shipra Mall',
    category: 'locality',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    lat: 28.6415,
    lng: 77.3714,
    pincode: '201014',
    aliases: ['Indirapuram Ghaziabad', 'Vaibhav Khand', 'Ahinsa Khand', 'Shipra Sun City']
  },

  // --- MUMBAI MMR ---
  {
    name: 'Andheri West',
    category: 'locality',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.1172,
    lng: 72.8340,
    pincode: '400058',
    aliases: ['Andheri West Mumbai', 'Lokhandwala Andheri', 'Versova Andheri', 'Infinity Mall Andheri']
  },
  {
    name: 'Andheri East',
    category: 'locality',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.1158,
    lng: 72.8565,
    pincode: '400069',
    aliases: ['Andheri East Mumbai', 'MIDC Andheri East', 'Chakala Andheri East', 'Sakinaka']
  },
  {
    name: 'Terminal 2, Chhatrapati Shivaji Maharaj Airport (BOM T2)',
    category: 'airport',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0886,
    lng: 72.8679,
    pincode: '400099',
    aliases: ['BOM T2', 'Mumbai Airport Terminal 2', 'CSMIA T2', 'Sahar International Airport']
  },
  {
    name: 'Terminal 1, Domestic Airport (BOM T1)',
    category: 'airport',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0988,
    lng: 72.8515,
    pincode: '400099',
    aliases: ['BOM T1', 'Santacruz Airport', 'Mumbai Airport Terminal 1']
  },
  {
    name: 'Bandra Kurla Complex (BKC)',
    category: 'locality',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0657,
    lng: 72.8687,
    pincode: '400051',
    aliases: ['BKC Mumbai', 'G Block BKC', 'Jio World Convention Centre']
  },
  {
    name: 'Bandra West (Linking Road & Bandstand)',
    category: 'locality',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0596,
    lng: 72.8295,
    pincode: '400050',
    aliases: ['Bandra West', 'Hill Road Bandra', 'Carter Road Bandra', 'Bandstand']
  },
  {
    name: 'Juhu & Juhu Beach',
    category: 'locality',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.1075,
    lng: 72.8263,
    pincode: '400049',
    aliases: ['Juhu Tara Road', 'Juhu Circle', 'JW Marriott Juhu']
  },
  {
    name: 'Borivali (West & East)',
    category: 'locality',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.2307,
    lng: 72.8567,
    pincode: '400092',
    aliases: ['Borivali Station', 'IC Colony Borivali', 'National Park Borivali']
  },
  {
    name: 'Powai (Hiranandani Gardens & IIT Bombay)',
    category: 'locality',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.1176,
    lng: 72.9060,
    pincode: '400076',
    aliases: ['Powai Mumbai', 'Hiranandani Powai', 'IIT Powai']
  },
  {
    name: 'Mumbai Central Railway Station (MMCT)',
    category: 'railway',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 18.9696,
    lng: 72.8193,
    pincode: '400008',
    aliases: ['MMCT', 'Bombay Central', 'Mumbai Central Terminus']
  },
  {
    name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
    category: 'railway',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 18.9401,
    lng: 72.8355,
    pincode: '400001',
    aliases: ['CSMT', 'VT Station', 'Victoria Terminus']
  },
  {
    name: 'Thane West & Ghodbunder Road',
    category: 'locality',
    city: 'Thane',
    state: 'Maharashtra',
    lat: 19.2183,
    lng: 72.9781,
    pincode: '400601',
    aliases: ['Thane Station', 'Viviana Mall Thane', 'Majiwada Thane', 'Ghodbunder Road']
  },
  {
    name: 'Vashi, Navi Mumbai',
    category: 'locality',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    lat: 19.0771,
    lng: 72.9986,
    pincode: '400703',
    aliases: ['Vashi Station', 'Sector 17 Vashi', 'Inorbit Mall Vashi']
  },

  // --- BANGALORE ---
  {
    name: 'Kempegowda International Airport (BLR T1/T2)',
    category: 'airport',
    city: 'Bangalore (Bengaluru)',
    state: 'Karnataka',
    lat: 13.1986,
    lng: 77.7066,
    pincode: '560300',
    aliases: ['BLR Airport', 'Bangalore Airport T1', 'Bangalore Airport T2', 'Devanahalli Airport']
  },
  {
    name: 'Whitefield (ITPL & EPIP Zone)',
    category: 'locality',
    city: 'Bangalore (Bengaluru)',
    state: 'Karnataka',
    lat: 12.9698,
    lng: 77.7499,
    pincode: '560066',
    aliases: ['Whitefield Bangalore', 'ITPL Whitefield', 'Hope Farm Whitefield', 'Kadugodi']
  },
  {
    name: 'Electronic City (Phase 1 & 2)',
    category: 'locality',
    city: 'Bangalore (Bengaluru)',
    state: 'Karnataka',
    lat: 12.8452,
    lng: 77.6602,
    pincode: '560100',
    aliases: ['Electronic City Bangalore', 'E-City Phase 1', 'Infosys Electronic City']
  },
  {
    name: 'Koramangala',
    category: 'locality',
    city: 'Bangalore (Bengaluru)',
    state: 'Karnataka',
    lat: 12.9352,
    lng: 77.6245,
    pincode: '560034',
    aliases: ['Koramangala Bangalore', 'Forum Mall Koramangala', 'Sony World Signal Koramangala']
  },
  {
    name: 'Indiranagar & 100ft Road',
    category: 'locality',
    city: 'Bangalore (Bengaluru)',
    state: 'Karnataka',
    lat: 12.9784,
    lng: 77.6408,
    pincode: '560038',
    aliases: ['Indiranagar Bangalore', '100 Feet Road Indiranagar', 'CMH Road Indiranagar']
  },
  {
    name: 'Krantivira Sangolli Rayanna (Majestic) Railway Station (SBC)',
    category: 'railway',
    city: 'Bangalore (Bengaluru)',
    state: 'Karnataka',
    lat: 12.9778,
    lng: 77.5713,
    pincode: '560023',
    aliases: ['SBC', 'Bangalore City Railway Station', 'Majestic Railway Station']
  },

  // --- PUNE ---
  {
    name: 'Pune International Airport (PNQ), Lohegaon',
    category: 'airport',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5822,
    lng: 73.9197,
    pincode: '411032',
    aliases: ['PNQ', 'Pune Airport', 'Lohegaon Airport']
  },
  {
    name: 'Hinjewadi IT Park (Phase 1, 2 & 3)',
    category: 'locality',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5913,
    lng: 73.7389,
    pincode: '411057',
    aliases: ['Hinjewadi Pune', 'Phase 1 Hinjewadi', 'Phase 2 Hinjewadi', 'Phase 3 Hinjewadi', 'Wipro Circle Hinjewadi']
  },
  {
    name: 'Koregaon Park & Kalyani Nagar',
    category: 'locality',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5362,
    lng: 73.8940,
    pincode: '411001',
    aliases: ['Koregaon Park Pune', 'North Main Road KP', 'Kalyani Nagar Pune']
  },
  {
    name: 'Pune Junction Railway Station',
    category: 'railway',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5284,
    lng: 73.8744,
    pincode: '411001',
    aliases: ['Pune Station', 'Pune Railway Station']
  },

  // --- JAIPUR ---
  {
    name: 'Jaipur International Airport (JAI), Sanganer',
    category: 'airport',
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.8289,
    lng: 75.8056,
    pincode: '302029',
    aliases: ['JAI Airport', 'Jaipur Airport Terminal 2', 'Sanganer Airport']
  },
  {
    name: 'Jaipur Junction Railway Station (JP)',
    category: 'railway',
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9196,
    lng: 75.7878,
    pincode: '302006',
    aliases: ['JP Station', 'Jaipur Railway Station', 'Sindhi Camp Jaipur']
  },
  {
    name: 'Vaishali Nagar, Jaipur',
    category: 'locality',
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9060,
    lng: 75.7428,
    pincode: '302021',
    aliases: ['Vaishali Nagar Jaipur', 'Amrapali Circle']
  },

  // --- AGRA ---
  {
    name: 'Agra Cantt Railway Station (AGC)',
    category: 'railway',
    city: 'Agra',
    state: 'Uttar Pradesh',
    lat: 27.1580,
    lng: 77.9906,
    pincode: '282001',
    aliases: ['AGC', 'Agra Cantt', 'Agra Railway Station']
  },
  {
    name: 'Taj Mahal (East & West Gate), Tajganj',
    category: 'locality',
    city: 'Agra',
    state: 'Uttar Pradesh',
    lat: 27.1751,
    lng: 78.0421,
    pincode: '282001',
    aliases: ['Taj Mahal Agra', 'Tajganj', 'Fatehabad Road Agra']
  },

  // --- LUCKNOW ---
  {
    name: 'Chaudhary Charan Singh Airport (LKO), Amausi',
    category: 'airport',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.7606,
    lng: 80.8893,
    pincode: '226009',
    aliases: ['LKO Airport', 'Amausi Airport', 'Lucknow Airport T3']
  },
  {
    name: 'Lucknow Charbagh Railway Station (LKO/LJN)',
    category: 'railway',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.8322,
    lng: 80.9181,
    pincode: '226004',
    aliases: ['Charbagh Station', 'Lucknow Railway Station', 'LJN Station']
  },
  {
    name: 'Gomti Nagar & Vibhuti Khand',
    category: 'locality',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.8530,
    lng: 80.9984,
    pincode: '226010',
    aliases: ['Gomti Nagar Lucknow', 'Patrakarpuram', 'Vibhuti Khand']
  },

  // --- CHANDIGARH ---
  {
    name: 'Shaheed Bhagat Singh International Airport (IXC), Mohali',
    category: 'airport',
    city: 'Chandigarh',
    state: 'Punjab/Haryana',
    lat: 30.6735,
    lng: 76.7885,
    pincode: '160004',
    aliases: ['IXC Airport', 'Chandigarh Airport', 'Mohali Airport']
  },
  {
    name: 'Sector 17 Plaza, Chandigarh',
    category: 'sector',
    city: 'Chandigarh',
    state: 'Punjab/Haryana',
    lat: 30.7415,
    lng: 76.7797,
    pincode: '160017',
    aliases: ['Sector 17 Chandigarh', 'City Center Chandigarh', 'Sector 17 ISBT']
  },

  // --- HYDERABAD ---
  {
    name: 'Rajiv Gandhi International Airport (HYD), Shamshabad',
    category: 'airport',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.2403,
    lng: 78.4294,
    pincode: '500409',
    aliases: ['HYD Airport', 'Shamshabad Airport', 'Hyderabad International Airport']
  },
  {
    name: 'HITEC City & Gachibowli (Cyberabad)',
    category: 'locality',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.4474,
    lng: 78.3762,
    pincode: '500081',
    aliases: ['HITEC City Hyderabad', 'Gachibowli', 'Madhapur', 'Mindspace HITEC City']
  },

  // --- KOLKATA ---
  {
    name: 'Netaji Subhash Chandra Bose Airport (CCU), Dum Dum',
    category: 'airport',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.6547,
    lng: 88.4467,
    pincode: '700052',
    aliases: ['CCU Airport', 'Kolkata Airport', 'Dum Dum Airport']
  },
  {
    name: 'Howrah Junction Railway Station (HWH)',
    category: 'railway',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5839,
    lng: 88.3426,
    pincode: '711101',
    aliases: ['HWH', 'Howrah Station', 'Howrah Bridge']
  },
  {
    name: 'Salt Lake City (Sector 1 to 5) & New Town',
    category: 'sector',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5804,
    lng: 88.4190,
    pincode: '700091',
    aliases: ['Salt Lake Kolkata', 'Sector 5 Salt Lake', 'New Town Kolkata', 'Rajarhat']
  }
];

/**
 * Fast search in the Indian Landmarks database
 */
export function searchIndianLandmarks(query: string): LandmarkLocation[] {
  const q = (query || '').toLowerCase().trim();
  if (!q) return [];

  return POPULAR_INDIAN_LANDMARKS.filter(item => {
    if (item.name.toLowerCase().includes(q)) return true;
    if (item.city.toLowerCase().includes(q)) return true;
    if (item.pincode && item.pincode.includes(q)) return true;
    if (item.aliases && item.aliases.some(a => a.toLowerCase().includes(q))) return true;
    return false;
  }).slice(0, 8);
}
