import { CabVehicle } from '../types';
import heroCabsImg from '../assets/images/hero_cabs_intercity_1792165620723.jpg';
import fleetShowcaseImg from '../assets/images/cabs_fleet_showcase_1792165620669.jpg';

export const CABS_FLEET: CabVehicle[] = [
  {
    id: 'hatchback',
    name: 'Hatchback AC',
    models: 'WagonR, Celerio, Tiago or equivalent',
    category: 'Pocket Friendly',
    ratePerKm: 9.5,
    roundTripRatePerKm: 9.5,
    extraKmRate: 10.5,
    driverAllowancePerDay: 250,
    statePermitTax: 200,
    hillStationCharge: 250,
    local8Hr80KmFare: 1599,
    capacityPassengers: 4,
    capacityLuggage: 2,
    features: ['Chilled Air Conditioning', 'Zero Night Charges', 'Verified Commercial Driver', 'Sanitized Cabin'],
    popular: false,
    image: heroCabsImg,
    description: 'SafarIndiaCabs budget-friendly compact AC cab. Ideal for solo travelers, couples, or short intercity drops.'
  },
  {
    id: 'sedan',
    name: 'Sedan AC (Dzire / Etios)',
    models: 'Maruti Suzuki Dzire, Toyota Etios, Hyundai Aura',
    category: 'Best Value · Most Popular',
    ratePerKm: 10.5,
    roundTripRatePerKm: 10.5,
    extraKmRate: 11.5,
    driverAllowancePerDay: 300,
    statePermitTax: 250,
    hillStationCharge: 300,
    local8Hr80KmFare: 1849,
    capacityPassengers: 4,
    capacityLuggage: 3,
    features: ['Dedicated Boot Space (3 Bags)', 'Zero Return Fare', 'Zero Night Charges', 'Highway FASTag Enabled'],
    popular: true,
    image: fleetShowcaseImg,
    description: 'India\'s #1 intercity sedan choice. Comfortable for 4 passengers with separate boot luggage space.'
  },
  {
    id: 'exec_sedan',
    name: 'Prime Executive Sedan',
    models: 'Honda City, Maruti Ciaz, Hyundai Verna',
    category: 'Executive Comfort',
    ratePerKm: 12.5,
    roundTripRatePerKm: 12.5,
    extraKmRate: 13.5,
    driverAllowancePerDay: 350,
    statePermitTax: 300,
    hillStationCharge: 350,
    local8Hr80KmFare: 2299,
    capacityPassengers: 4,
    capacityLuggage: 4,
    features: ['Extra Rear Legroom', 'Plush Interiors', 'Silent Highway Cabin', 'Uniformed Chauffeur'],
    popular: false,
    image: heroCabsImg,
    description: 'Premium business-class road travel with spacious legroom for corporate meetings and luxury highway trips.'
  },
  {
    id: 'suv',
    name: 'SUV AC (Ertiga / Carens)',
    models: 'Maruti Ertiga, Kia Carens, Toyota Rumion or equivalent',
    category: 'Family 6+1 Seater',
    ratePerKm: 13.5,
    roundTripRatePerKm: 13.5,
    extraKmRate: 15,
    driverAllowancePerDay: 350,
    statePermitTax: 350,
    hillStationCharge: 400,
    local8Hr80KmFare: 2599,
    capacityPassengers: 6,
    capacityLuggage: 4,
    features: ['6+1 Passenger Seating', 'Roof Carrier Available', 'Dual Rear AC Vents', 'Zero Night Charges'],
    popular: true,
    image: fleetShowcaseImg,
    description: 'Spacious 6-seater MUV/SUV perfect for families, group pilgrimages, and airport transfers with heavy luggage.'
  },
  {
    id: 'innova',
    name: 'Assured Innova Crysta',
    models: 'Toyota Innova Crysta (6+1 / 7+1 Luxury)',
    category: 'VIP Highway Cruiser',
    ratePerKm: 16.5,
    roundTripRatePerKm: 16.5,
    extraKmRate: 18,
    driverAllowancePerDay: 400,
    statePermitTax: 450,
    hillStationCharge: 500,
    local8Hr80KmFare: 3299,
    capacityPassengers: 7,
    capacityLuggage: 5,
    features: ['Captain Recliner Seats', 'Superior Hill & Highway Stability', 'Dual Zone Climate AC', 'Roof Carrier Included'],
    popular: true,
    image: fleetShowcaseImg,
    description: 'Gold standard for long-distance outstation and hill station travel with unmatched suspension comfort.'
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller AC (12 Seater)',
    models: 'Force Traveller / Urbania 12+1 Pushback AC',
    category: 'Group & Pilgrimage',
    ratePerKm: 22,
    roundTripRatePerKm: 22,
    extraKmRate: 24,
    driverAllowancePerDay: 500,
    statePermitTax: 650,
    hillStationCharge: 700,
    local8Hr80KmFare: 4999,
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
    'Night Driving Charges: ₹0 Extra (100% Included, 24×7 travel)',
    'One-Way Zero Return Fare (you pay only for one-side distance)',
    'Doorstep pickup from your home/hotel and drop at destination'
  ],
  exclusions: [
    'Toll Taxes & Inter-State Entry Permit Tax (Included in "All-Inclusive" mode, or paid at actuals at Toll Plaza in "Base Fare" mode)',
    'Extra KM beyond included package distance (billed transparently at vehicle Extra Fare/Km rate)',
    'Airport / Hotel / Mall parking fees if applicable (paid at actuals against slip)',
    'Waiting charges beyond 45 minutes of free pickup grace period (₹100/hr)'
  ]
};
