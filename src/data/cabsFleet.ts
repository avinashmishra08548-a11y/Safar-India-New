import { CabVehicle } from '../types';
import heroCabsImg from '../assets/images/hero_cabs_intercity.webp';
import fleetShowcaseImg from '../assets/images/cabs_fleet_showcase.webp';

export const CABS_FLEET: CabVehicle[] = [
  {
    id: 'hatchback',
    name: 'Compact / Hatchback AC',
    models: 'WagonR, Tata Indica, Celerio, Tiago',
    category: 'Pocket Friendly · Best Price',
    ratePerKm: 10.2,
    roundTripRatePerKm: 11.5,
    extraKmRate: 11.5,
    driverAllowancePerDay: 280,
    statePermitTax: 200,
    hillStationCharge: 340,
    local8Hr80KmFare: 1749,
    capacityPassengers: 4,
    capacityLuggage: 2,
    features: ['Chilled Air Conditioning', 'Zero Return Fare', 'Doorstep Pickup & Drop', 'Verified Commercial Driver'],
    popular: false,
    image: heroCabsImg,
    description: 'Budget-friendly compact AC cab (WagonR / Indica / Tiago). Guaranteed ₹200 lower than market aggregators.'
  },
  {
    id: 'sedan',
    name: 'Comfort Sedan AC (Dzire / Etios)',
    models: 'Maruti Suzuki Dzire, Toyota Etios, Hyundai Aura',
    category: 'Best Value · Most Popular',
    ratePerKm: 11.2,
    roundTripRatePerKm: 13,
    extraKmRate: 12.5,
    driverAllowancePerDay: 320,
    statePermitTax: 250,
    hillStationCharge: 420,
    local8Hr80KmFare: 1999,
    capacityPassengers: 4,
    capacityLuggage: 3,
    features: ['Dedicated Boot Space (3 Bags)', 'Zero Return Fare', 'Verified Commercial Chauffeur', 'Highway FASTag Enabled'],
    popular: true,
    image: fleetShowcaseImg,
    description: 'India\'s #1 intercity Comfort Sedan (Dzire / Etios). Spacious for 4 passengers with separate boot luggage space.'
  },
  {
    id: 'suv',
    name: 'Executive SUV AC (Ertiga / Carens)',
    models: 'Maruti Ertiga, Kia Carens, Toyota Rumion (6+1)',
    category: 'Executive Family 6+1 Seater',
    ratePerKm: 14.5,
    roundTripRatePerKm: 17,
    extraKmRate: 16,
    driverAllowancePerDay: 380,
    statePermitTax: 350,
    hillStationCharge: 550,
    local8Hr80KmFare: 2749,
    capacityPassengers: 6,
    capacityLuggage: 4,
    features: ['6+1 Passenger Seating', 'Roof Carrier Available', 'Dual Rear AC Vents', 'Spacious Family Comfort'],
    popular: true,
    image: fleetShowcaseImg,
    description: 'Spacious 6+1 seater Executive SUV (Ertiga / Carens) ideal for family outstation trips, hills, and airport transfers.'
  },
  {
    id: 'innova',
    name: 'Premium SUV (Innova Crysta)',
    models: 'Assured Toyota Innova Crysta (6+1 / 7+1 Luxury)',
    category: 'Premium VIP Highway Cruiser',
    ratePerKm: 18,
    roundTripRatePerKm: 22,
    extraKmRate: 20,
    driverAllowancePerDay: 450,
    statePermitTax: 450,
    hillStationCharge: 700,
    local8Hr80KmFare: 3499,
    capacityPassengers: 7,
    capacityLuggage: 5,
    features: ['Captain Recliner Seats', 'Superior Hill & Highway Stability', 'Dual Zone Climate AC', 'Roof Carrier Included'],
    popular: true,
    image: fleetShowcaseImg,
    description: 'Gold standard Premium SUV (Innova Crysta) for long-distance outstation, corporate travel, and mountain highways.'
  },
  {
    id: 'exec_sedan',
    name: 'Prime Executive Sedan',
    models: 'Honda City, Maruti Ciaz, Hyundai Verna',
    category: 'Corporate Business Class',
    ratePerKm: 13,
    roundTripRatePerKm: 15,
    extraKmRate: 14.5,
    driverAllowancePerDay: 360,
    statePermitTax: 300,
    hillStationCharge: 480,
    local8Hr80KmFare: 2449,
    capacityPassengers: 4,
    capacityLuggage: 4,
    features: ['Extra Rear Legroom', 'Plush Interiors', 'Silent Highway Cabin', 'Uniformed Chauffeur'],
    popular: false,
    image: heroCabsImg,
    description: 'Premium business-class road travel with spacious legroom for corporate meetings and luxury highway trips.'
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller AC (12 Seater)',
    models: 'Force Traveller / Urbania 12+1 Pushback AC',
    category: 'Group & Pilgrimage',
    ratePerKm: 24,
    roundTripRatePerKm: 27,
    extraKmRate: 26,
    driverAllowancePerDay: 550,
    statePermitTax: 650,
    hillStationCharge: 950,
    local8Hr80KmFare: 5299,
    capacityPassengers: 12,
    capacityLuggage: 10,
    features: ['Individual Pushback Recliner Seats', 'High-Roof Standing Aisle', 'Full Luggage Carrier', 'Group Tour Specialist'],
    popular: false,
    image: fleetShowcaseImg,
    description: 'Ideal for family weddings, Char Dham / Ayodhya / Shirdi yatras, corporate offsites, and group excursions.'
  }
];

export const LOCAL_PACKAGES = [
  { id: '4h_40k', name: '4 Hours / 40 KM', description: 'Quick city meetings & half-day errands', multiplier: 0.70 },
  { id: '8h_80k', name: '8 Hours / 80 KM', description: 'Standard full-day city sightseeing & shopping', multiplier: 1.0, isDefault: true },
  { id: '12h_120k', name: '12 Hours / 120 KM', description: 'Extended full-day city & NCR touring', multiplier: 1.35 }
];

export const INCLUSIONS_EXCLUSIONS = {
  inclusions: [
    'Fuel charges (CNG / Diesel / Petrol) for the entire included distance',
    'Driver Allowance (Chauffeur Bata) & food/stay charges included upfront',
    'Pickup Timing, Drop Arrival Timing & Route Terrain factored transparently',
    'One-Way Zero Return Fare (you pay only for one-side distance)',
    'Doorstep pickup from your home/hotel and drop at destination'
  ],
  exclusions: [
    'Toll Taxes & Inter-State Entry Permit Tax (Included in "Include Toll" mode, or paid at actuals at Toll Plaza in "Toll Extra" mode)',
    'Extra KM beyond included package distance (billed transparently at vehicle Extra Fare/Km rate)',
    'Airport / Hotel / Mall parking fees if applicable (paid at actuals against slip)',
    'Waiting charges beyond 45 minutes of free pickup grace period (₹100/hr)'
  ]
};
