export type TripType = 'oneway' | 'roundtrip' | 'local' | 'airport';

export type CabCategoryId = 'hatchback' | 'sedan' | 'exec_sedan' | 'suv' | 'innova' | 'tempo';

export interface CabVehicle {
  id: CabCategoryId;
  name: string;
  models: string;
  category: string;
  ratePerKm: number;
  roundTripRatePerKm?: number;
  extraKmRate?: number;
  driverAllowancePerDay?: number;
  statePermitTax?: number;
  hillStationCharge?: number;
  local8Hr80KmFare?: number;
  capacityPassengers: number;
  capacityLuggage: number;
  features: string[];
  popular?: boolean;
  image: string;
  description: string;
}

export interface BookingRecord {
  id: string;
  bookingId?: string;
  bookingReference?: string;
  sequenceNumber?: number;
  searchKeywords?: string[];
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
  tripDays?: number;
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
  highwayToll?: number;
  statePermitTax?: number;
  hillStationCharge?: number;
  nightCharge?: number;
  parkingCharge?: number;
  gstAmount: number;
  discountAmount?: number;
  promoCode?: string;
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
  updatedAt?: string;
  notes?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicleModel?: string;
  driverVehicleNo?: string;
  driverAssignedAt?: string;
  actualOdometerKm?: number;
  extraKmDriven?: number;
  extraKmCharge?: number;
  extraTollCharges?: number;
  otherSurcharges?: number;
  completedAt?: string;
  pickupCoords?: { lat: number; lng: number };
  dropCoords?: { lat: number; lng: number };
  routeProvider?: string;
  routeSummary?: string;
  routeDurationText?: string;
  routeGeometry?: Array<[number, number]>;
  fareSnapshot?: {
    capturedAt: string;
    provider: string;
    actualRoadDistanceKm: number;
    billedDistanceKm: number;
    ratePerKm: number;
    extraKmRate: number;
    baseFare: number;
    driverAllowance: number;
    nightCharges: number;
    highwayToll: number;
    statePermitTax: number;
    hillStationCharge: number;
    gstAmount: number;
    discountAmount: number;
    totalFare: number;
  };
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

export interface PaymentAuditLogRecord {
  id: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  bookingAmount?: number;
  totalBookingAmount?: number;
  advanceAmount: number;
  payableAmount?: number;
  amountInPaise?: number;
  razorpayOrderId: string;
  paymentId?: string;
  razorpayPaymentId?: string;
  qrId?: string;
  paymentMethod: string;
  paymentStatus: string;
  timestamp: string;
  failureReason?: string;
  gatewayResponse?: string;
  gatewayResponseSummary?: string;
  retryAttempts: number;
  webhookVerified?: boolean;
  webhookVerificationStatus?: string;
}


