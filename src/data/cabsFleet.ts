import { CabVehicle } from '../types';

export const CABS_FLEET: CabVehicle[] = [
  {
    id: 'hatchback',
    name: 'Hatchback AC',
    models: 'WagonR, Swift, Tiago or equivalent',
    category: 'Budget Friendly',
    ratePerKm: 11,
    capacityPassengers: 4,
    capacityLuggage: 2,
    features: ['Chilled Air Conditioning', 'Clean Sanitized Seats', 'Music System', 'GPS Tracking'],
    popular: false,
    image: '/src/assets/images/hero_cabs_intercity_1792165620723.jpg',
    description: 'Best for solo travelers, couples, or small families looking for comfortable budget travel.'
  },
  {
    id: 'sedan',
    name: 'Sedan AC (Dzire / Etios)',
    models: 'Maruti Suzuki Dzire, Toyota Etios, Hyundai Aura',
    category: 'Most Popular',
    ratePerKm: 12,
    capacityPassengers: 4,
    capacityLuggage: 3,
    features: ['Generous Boot Space (3 Bags)', 'Superior Highway Stability', 'Smooth Rear Suspension', 'Rear AC Vents'],
    popular: true,
    image: '/src/assets/images/cabs_fleet_showcase_1792165620669.jpg',
    description: 'India\'s #1 choice for intercity travel. Highly comfortable for 4 passengers with dedicated boot luggage.'
  },
  {
    id: 'exec_sedan',
    name: 'Executive Sedan',
    models: 'Honda City, Maruti Ciaz, Hyundai Verna',
    category: 'Executive Comfort',
    ratePerKm: 15,
    capacityPassengers: 4,
    capacityLuggage: 4,
    features: ['Plush Leather Seats', 'Extra Legroom', 'Silent Highway Cabin', 'Chauffeur in Uniform'],
    popular: false,
    image: '/src/assets/images/hero_cabs_intercity_1792165620723.jpg',
    description: 'Premium business class road travel. Ample legroom, top-tier comfort for meetings or luxury trips.'
  },
  {
    id: 'suv',
    name: 'SUV (Ertiga / Carens)',
    models: 'Maruti Ertiga, Kia Carens, Triber',
    category: 'Family Friendly',
    ratePerKm: 16,
    capacityPassengers: 6,
    capacityLuggage: 4,
    features: ['6-7 Passenger Seating', 'Roof Luggage Carrier', 'Dual AC Cooling', 'USB Fast Charging'],
    popular: false,
    image: '/src/assets/images/cabs_fleet_showcase_1792165620669.jpg',
    description: 'Perfect for joint families, groups, or travelers carrying multiple suitcases.'
  },
  {
    id: 'innova',
    name: 'Innova Crysta Premium',
    models: 'Toyota Innova Crysta Luxury',
    category: 'VIP Luxury Ride',
    ratePerKm: 21,
    capacityPassengers: 7,
    capacityLuggage: 5,
    features: ['Captain Recliner Seats', 'Unmatched Highway Safety', 'Dual Zone Climate AC', 'Senior Citizen Friendly'],
    popular: true,
    image: '/src/assets/images/cabs_fleet_showcase_1792165620669.jpg',
    description: 'Gold standard for long distance outstation travel. Supreme comfort on hills and expressways.'
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller (12 Seater)',
    models: 'Force Urbania / Traveller 12-17 Seater',
    category: 'Group & Corporate',
    ratePerKm: 29,
    capacityPassengers: 12,
    capacityLuggage: 10,
    features: ['Individual Pushback Seats', 'Spacious Center Aisle', 'Surround Sound Audio', 'Dedicated Rear Boot'],
    popular: false,
    image: '/src/assets/images/cabs_fleet_showcase_1792165620669.jpg',
    description: 'Spacious transport for wedding parties, pilgrimages, college trips, or corporate offsites.'
  }
];

export const LOCAL_PACKAGES = [
  { id: '4h_40k', name: '4 Hours / 40 KM', description: 'Quick errands & airport runs', multiplier: 0.6 },
  { id: '8h_80k', name: '8 Hours / 80 KM', description: 'Full day city sightseeing & shopping', multiplier: 1.0, isDefault: true },
  { id: '12h_120k', name: '12 Hours / 120 KM', description: 'Extended full day city touring', multiplier: 1.45 }
];

export const INCLUSIONS_EXCLUSIONS = {
  inclusions: [
    'Vehicle rental with dedicated commercial AC cab',
    'Chauffeur charges & driver allowance (DA)',
    'Fuel charges (Diesel/CNG/Petrol) throughout route',
    'Complimentary bottle of mineral water',
    'Doorstep pickup from your home/hotel and drop at destination'
  ],
  exclusions: [
    'Toll taxes & State entry permits (can be pre-included or paid at toll plazas)',
    'Parking fees (to be paid directly at actuals against parking slip)',
    'Night driving allowance (₹250 only if traveling between 10:00 PM and 6:00 AM)',
    'Extra km charge beyond package limit (at car per-km rate)'
  ]
};
