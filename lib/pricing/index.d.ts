// Type declarations for /lib/pricing ESM engine (compatible with TypeScript + Node serverless ESM)

export type LocationCategory =
  | 'metro_city'
  | 'major_city'
  | 'normal_city'
  | 'outer_city'
  | 'suburban_area'
  | 'village'
  | 'remote_area'
  | 'hill_station'
  | 'difficult_mountain_road'
  | 'tourist_destination'
  | 'event_location';

export type LeadTimeBucket =
  | 'immediate'
  | 'within_2h'
  | 'same_day'
  | 'next_day'
  | 'days_2_3'
  | 'days_5_7'
  | 'days_10_15'
  | 'days_30_plus';

export interface VehicleEngineConfig {
  id: string;
  name: string;
  models: string;
  category: string;
  ratePerKm: number;
  roundTripRatePerKm: number;
  extraKmRate: number;
  minKm: number;
  minRoundTripKmPerDay: number;
  minFare: number;
  driverAllowancePerDay: number;
  waitingChargePerHour: number;
  freeWaitingMinutes: number;
  nightAllowance: number;
  hillStationCharge: number;
  difficultMountainCharge: number;
  statePermitTax: number;
  local8Hr80KmFare: number;
  operatingCostPerKm: number;
  driverPayoutPerKm: number;
  minProfitMargin: number;
  minProfitType: 'fixed_inr' | 'percent';
  capacityPassengers: number;
  capacityLuggage: number;
  popular: boolean;
  enabled: boolean;
  isCustom: boolean;
}

export interface SmartRouteOverride {
  id: string;
  name?: string;
  pickupCity: string;
  dropCity: string;
  tripType?: string;
  vehicleId?: string;
  bidirectional?: boolean;
  fixedTotalFare?: number | null;
  ratePerKmOverride?: number | null;
  minKmOverride?: number | null;
  maxSurgeMultiplier?: number | null;
  startsAt?: string;
  expiresAt?: string;
  active: boolean;
}

export interface SeasonalEventRule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  multiplier: number;
  cities: string[];
  active: boolean;
}

export interface VerifiedCompetitorQuote {
  id: string;
  competitorName: string;
  pickupCity: string;
  dropCity: string;
  tripType: string;
  vehicleId: string;
  competitorFare: number;
  verifiedDate: string;
  expiresAt?: string;
  active: boolean;
}

export interface PricingEngineConfig {
  version: number;
  versionLabel: string;
  updatedAt: string;
  minOneWayBillableKm: number;
  minRoundTripKmPerDay: number;
  nightChargePerSlot: number;
  defaultParkingCharge: number;
  gstRatePct: number;
  paymentGatewayFeePct: number;
  platformCommissionPct: number;
  extraStopChargePerStop: number;
  shortLongDistanceThresholdKm: number;
  competitorRules: {
    enabled: boolean;
    shortRouteMinSavingInr: number;
    longRouteMinSavingInr: number;
    benchmarkAggregators: string[];
    fallbackPerKmUpliftFactor: Record<string, number>;
  };
  dynamicPricing: {
    enabled: boolean;
    emergencyDisableSurge: boolean;
    minSurgeMultiplier: number;
    maxSurgeMultiplier: number;
    weekendMultiplier: number;
    peakHourMultiplier: number;
    lowAvailabilityMultiplier: number;
    highAvailabilityDiscountMultiplier: number;
    fleetAvailabilityRatioDefault: number;
  };
  leadTimeRules: Record<
    LeadTimeBucket,
    { label: string; maxHours: number; baseMultiplier: number; tightAvailabilityBoost: number }
  >;
  seasonalEvents: SeasonalEventRule[];
  routeOverrides: SmartRouteOverride[];
  competitorQuotes: VerifiedCompetitorQuote[];
  locationCategoryOverrides: Record<string, LocationCategory>;
  tripTypeOverrides: Record<string, { baseMultiplier: number; minKmOverride?: number | null; minKmPerDayOverride?: number | null; pickupFee?: number }>;
  vehicles: Record<string, VehicleEngineConfig>;
}

export interface StopWaypointInput {
  location: string;
  haltMinutes?: number;
}

export interface IntelligentFareInput {
  tripType?: 'oneway' | 'roundtrip' | 'multiday' | 'airport' | 'local' | 'custom' | string;
  cabId?: string;
  vehicleId?: string;
  pickupCity?: string;
  dropCity?: string;
  distanceKm?: number;
  extraKm?: number;
  days?: number;
  localPackageId?: string;
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
  waitingMinutes?: number;
  stops?: Array<string | StopWaypointInput>;
  promoDiscount?: number;
  routeGeometry?: Array<[number, number]>;
  pickupCoords?: { lat: number; lng: number; lon?: number } | null;
  dropCoords?: { lat: number; lng: number; lon?: number } | null;
  fleetAvailabilityRatio?: number;
  activeBookingsCount?: number;
  routeDemandScore?: number;
  routeVerified?: boolean;
  routeErrorReason?: string;
  nowDate?: string | Date;
}

export interface InternalCostAndProfitReport {
  driverPayment: number;
  fuelExpense: number;
  driverAllowance: number;
  vehicleOperatingExpense: number;
  positioningCost: number;
  returnDeadheadCost: number;
  tollsAndPermits: number;
  paymentGatewayFee: number;
  platformCommission: number;
  taxes: number;
  discounts: number;
  otherExpenses: number;
  totalInternalCost: number;
  netProfit: number;
  netProfitPercent: number;
  minRequiredProfit: number;
  isProfitProtected: boolean;
  shortfallToMinProfit: number;
}

export interface IntelligentFareResult {
  requiresManualQuote: boolean;
  routeVerified: boolean;
  errorCode?: string;
  errorMessage?: string;
  pricingVersion: number;
  pricingVersionLabel?: string;
  vehicleId: string;
  vehicleName: string;
  tripType: string;
  pickupCity: string;
  dropCity: string;
  distanceKm?: number;
  actualRoadDistanceKm: number;
  billedDistanceKm: number;
  effectiveRatePerKm?: number;
  extraKmRate?: number;
  baseDistanceFare?: number;
  baseFare: number;
  driverAllowance?: number;
  nightCharge?: number;
  hillStationCharge?: number;
  waitingCharge?: number;
  billableWaitMinutes?: number;
  extraStopsCharge?: number;
  validStopsCount?: number;
  positioningDistanceKm?: number;
  positioningCharge?: number;
  emptyReturnDeadheadKm?: number;
  emptyReturnCost?: number;
  highwayToll?: number;
  statePermitTax?: number;
  delhiMcdToll?: number;
  tollsAndTaxes?: number;
  tollsExtraActuals?: boolean;
  tollPolicyText?: string;
  stateRoutePath?: string[];
  statePermitBreakdown?: Array<{ state: string; role: 'transit' | 'destination'; label: string; taxAmount: number }>;
  stateTaxDays?: number;
  originState?: string;
  destState?: string;
  estimatedDropTime?: string;
  isLateNightDrop?: boolean;
  isEarlyOrNightPickup?: boolean;
  locationCategories?: {
    pickupCategory: LocationCategory;
    pickupCategoryLabel: string;
    dropCategory: LocationCategory;
    dropCategoryLabel: string;
    stopCategories: Array<{ location: string; category: LocationCategory }>;
    terrainType: string;
    roadMix: { highwayPct: number; urbanPct: number; ruralPct: number; hillPct: number };
    nearestPickupHub: string;
    nearestDropHub: string;
    returnProbability: number;
  };
  isHillAreaRoute?: boolean;
  isDifficultMountainRoute?: boolean;
  isOuterRoute?: boolean;
  leadTime?: {
    bucket: LeadTimeBucket;
    label: string;
    hoursAhead: number;
    multiplier: number;
    isAdvanceSaver: boolean;
    isUrgentWindow: boolean;
  };
  seasonalEvent?: { id: string | null; name: string; multiplier: number };
  dynamicDemand?: {
    multiplier: number;
    unclampedMultiplier?: number;
    minBound?: number;
    maxBound?: number;
    surgeDisabled: boolean;
    factors: string[];
    isWeekend: boolean;
    isPeakHour: boolean;
  };
  activeRouteOverrideId?: string | null;
  subTotalPreTax?: number;
  promoDiscount?: number;
  discountAmount?: number;
  gstAmount: number;
  totalFare: number;
  advanceAmount: number;
  balanceDue: number;
  profitFloorProtected?: boolean;
  profitFloorClampedReason?: string;
  competitorBenchmark?: {
    competitorName: string;
    competitorFare: number;
    source: string;
    verifiedDate: string;
    targetMinSaving: number;
    actualSaving: number;
    meetsSavingsTarget: boolean;
    profitFloorConstrained: boolean;
  };
  competitorRates?: {
    cabbazarFare: number;
    savaariFare: number;
    makemytripFare: number;
    marketAverageFare: number;
  };
  originalFare?: number;
  savingsAmount?: number;
  cancellationPolicy?: string;
  internalCostAndProfit?: InternalCostAndProfitReport;
}

export const LOCATION_CATEGORIES: LocationCategory[];
export const LOCATION_CATEGORY_LABELS: Record<LocationCategory, string>;
export const DEFAULT_PRICING_ENGINE_CONFIG: PricingEngineConfig;
export function mergePricingConfig(partialConfig: Partial<PricingEngineConfig> | null | undefined): PricingEngineConfig;
export function classifyLocationCategory(locationName: string, categoryOverrides?: Record<string, LocationCategory>): LocationCategory;
export function detectLocationState(locationStr?: string, fallbackState?: string): string;
export function computeMultiStatePermitBreakdown(
  originState: string,
  destState: string,
  pickupCity?: string,
  dropCity?: string,
  stateTaxDays?: number,
  routeGeometry?: Array<[number, number]>,
  stops?: Array<string | StopWaypointInput>
): {
  stateRoutePath: string[];
  statePermitBreakdown: Array<{ state: string; role: 'transit' | 'destination'; label: string; taxAmount: number }>;
  totalStatePermitTax: number;
  delhiMcdToll: number;
};
export function computeStateTaxCalendarDays(params: {
  tripType: string;
  distanceKm: number;
  pickupTime?: string;
  returnTime?: string;
  daysCount?: number;
  terrainType?: string;
}): number;
export function validateRouteOverrideProfitability(
  overrideEntry: Partial<SmartRouteOverride> & { estimatedDistanceKm?: number },
  rawConfig?: Partial<PricingEngineConfig> | null
): { isValid: boolean; netProfit: number; minRequiredProfit: number; reason: string };
export function calculateIntelligentFare(
  input: IntelligentFareInput,
  rawConfig?: Partial<PricingEngineConfig> | null,
  options?: { includeInternal?: boolean }
): IntelligentFareResult;
export function applyCompetitorAdvantageAndProfitProtection(params: {
  preDiscountSubTotal: number;
  promoDiscountRequested: number;
  gstPct: number;
  billedDistanceKm: number;
  actualRoadDistanceKm: number;
  daysCount: number;
  driverAllowance: number;
  statePermitTax: number;
  hillCharge?: number;
  positioningCost?: number;
  returnDeadheadCost?: number;
  pickupCity?: string;
  dropCity?: string;
  tripType?: string;
  vehicleId?: string;
  routeIntel?: any;
  vehicleCfg?: VehicleEngineConfig;
  config?: Partial<PricingEngineConfig>;
}): {
  taxableAmount: number;
  gstAmount: number;
  totalFare: number;
  appliedPromoDiscount: number;
  profitFloorProtected: boolean;
  profitFloorClampedReason: string;
  competitorBenchmark: NonNullable<IntelligentFareResult['competitorBenchmark']>;
  internalCostAndProfit: InternalCostAndProfitReport;
};
export function sanitizePublicFareBreakdown<T extends { internalCostAndProfit?: unknown }>(result: T): Omit<T, 'internalCostAndProfit'>;
