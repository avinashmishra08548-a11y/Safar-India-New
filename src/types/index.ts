export type TripType = 'oneway' | 'roundtrip' | 'local' | 'airport';

export type CabCategoryId = 'hatchback' | 'sedan' | 'exec_sedan' | 'suv' | 'innova' | 'tempo';

export interface CabVehicle {
  id: CabCategoryId;
  name: string;
  models: string;
  category: string;
  ratePerKm: number;
  capacityPassengers: number;
  capacityLuggage: number;
  features: string[];
  popular?: boolean;
  image: string;
  description: string;
}

export interface BookingRecord {
  id: string;
  tripType: TripType;
  pickupCity: string;
  dropCity: string;
  pickupAddress: string;
  dropAddress?: string;
  landmark?: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string;
  returnTime?: string;
  localPackage?: string;
  airportMode?: 'pickup' | 'drop';
  airportTerminal?: string;
  flightNumber?: string;
  cabId: CabCategoryId;
  cabName: string;
  distanceKm: number;
  baseFare: number;
  driverAllowance: number;
  tollsAndTaxes: number;
  gstAmount: number;
  totalFare: number;
  advancePaid: number;
  balanceDue: number;
  paymentMode: 'advance_20' | 'full';
  paymentMethod: string;
  transactionId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerGst?: string;
  gstCompanyName?: string;
  status: 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  notes?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicleModel?: string;
  driverVehicleNo?: string;
  driverAssignedAt?: string;
}

export interface CustomerUser {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  companyName?: string;
  createdAt?: string;
}

export interface CityData {
  name: string;
  state: string;
  isPopular?: boolean;
  airportName?: string;
  lat: number;
  lon: number;
}
