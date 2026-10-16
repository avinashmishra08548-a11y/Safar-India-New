import { CabCategoryId, TripType } from '../types';
import { CABS_FLEET } from '../data/cabsFleet';

export interface FareCalculationResult {
  distanceKm: number;
  billedDistanceKm: number;
  baseFare: number;
  driverAllowance: number;
  tollsAndTaxes: number;
  gstAmount: number;
  totalFare: number;
  advanceFare: number;
  balanceDue: number;
  daysCount: number;
  ratePerKm: number;
}

export function computeTripFare(params: {
  tripType: TripType;
  cabId: CabCategoryId;
  distanceKm: number;
  pickupDate: string;
  returnDate?: string;
  localPackageId?: string;
  includeTolls?: boolean;
}): FareCalculationResult {
  const {
    tripType,
    cabId,
    distanceKm,
    pickupDate,
    returnDate,
    localPackageId = '8h_80k',
    includeTolls = true
  } = params;

  const cab = CABS_FLEET.find(c => c.id === cabId) || CABS_FLEET[1];
  const ratePerKm = cab.ratePerKm;

  let billedDistanceKm = distanceKm;
  let baseFare = 0;
  let driverAllowance = 0;
  let daysCount = 1;

  if (tripType === 'oneway') {
    // Standard intercity rule: minimum 130 km billing
    billedDistanceKm = Math.max(130, distanceKm);
    baseFare = billedDistanceKm * ratePerKm;
    driverAllowance = 300;
  } else if (tripType === 'roundtrip') {
    // Calculate number of days
    if (pickupDate && returnDate) {
      const p = new Date(pickupDate).getTime();
      const r = new Date(returnDate).getTime();
      const diffDays = Math.ceil((r - p) / (1000 * 60 * 60 * 24));
      daysCount = Math.max(1, diffDays + 1);
    } else {
      daysCount = 1;
    }
    // Round trip minimum rule: 250 km per day or two-way actual
    const minKmForDays = daysCount * 250;
    const actualTwoWayKm = distanceKm * 2;
    billedDistanceKm = Math.max(minKmForDays, actualTwoWayKm);
    baseFare = billedDistanceKm * ratePerKm;
    driverAllowance = daysCount * 350;
  } else if (tripType === 'local') {
    if (localPackageId === '4h_40k') {
      billedDistanceKm = 40;
      baseFare = Math.round(40 * ratePerKm + 550);
      driverAllowance = 150;
    } else if (localPackageId === '12h_120k') {
      billedDistanceKm = 120;
      baseFare = Math.round(120 * ratePerKm + 950);
      driverAllowance = 300;
    } else {
      // 8h_80k default
      billedDistanceKm = 80;
      baseFare = Math.round(80 * ratePerKm + 750);
      driverAllowance = 250;
    }
  } else if (tripType === 'airport') {
    billedDistanceKm = Math.max(45, distanceKm);
    baseFare = Math.round(billedDistanceKm * ratePerKm + 450);
    driverAllowance = 200;
  }

  // Toll taxes & state tax estimate for highway route
  let tollsAndTaxes = 0;
  if (includeTolls) {
    if (tripType === 'oneway') {
      tollsAndTaxes = Math.round(billedDistanceKm * 1.6);
    } else if (tripType === 'roundtrip') {
      tollsAndTaxes = Math.round(billedDistanceKm * 1.4);
    } else {
      tollsAndTaxes = 120; // Airport/city parking and toll
    }
  }

  // 5% GST for commercial transport
  const taxableSubtotal = baseFare + driverAllowance;
  const gstAmount = Math.round(taxableSubtotal * 0.05);

  const totalFare = baseFare + driverAllowance + tollsAndTaxes + gstAmount;
  const advanceFare = Math.round(totalFare * 0.20);
  const balanceDue = totalFare - advanceFare;

  return {
    distanceKm,
    billedDistanceKm,
    baseFare,
    driverAllowance,
    tollsAndTaxes,
    gstAmount,
    totalFare,
    advanceFare,
    balanceDue,
    daysCount,
    ratePerKm
  };
}

export function formatINR(val: number): string {
  return '₹' + val.toLocaleString('en-IN');
}
