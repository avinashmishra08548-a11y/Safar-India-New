// Master Intelligent Intercity Taxi Fare Engine (Modules 1 - 15)
import { DEFAULT_PRICING_ENGINE_CONFIG, mergePricingConfig } from './constants.js';
import { analyzeRouteIntelligence, validateRouteInput } from './routeIntelligence.js';
import {
  computeLeadTimeAdjustment,
  evaluateSeasonalEvents,
  computeDemandSupplyMultiplier,
  computeOperationalCharges
} from './dynamicRules.js';
import {
  applyCompetitorAdvantageAndProfitProtection,
  calculateInternalCostAndProfit,
  computeMinRequiredProfit,
  sanitizePublicFareBreakdown
} from './competitorAndProfit.js';

function normalizeCityKey(str) {
  return String(str || '').toLowerCase().split(',')[0].replace(/[^a-z0-9]/g, '');
}

const LOCAL_PACKAGE_MULTIPLIERS = {
  '4h_40k': { multiplier: 0.70, km: 40, label: '4 Hours / 40 KM' },
  '8h_80k': { multiplier: 1.0, km: 80, label: '8 Hours / 80 KM' },
  '12h_120k': { multiplier: 1.35, km: 120, label: '12 Hours / 120 KM' }
};

export function findActiveSmartRouteOverride(input = {}, config = {}) {
  const list = Array.isArray(config.routeOverrides) ? config.routeOverrides : [];
  if (list.length === 0) return null;

  const pTok = normalizeCityKey(input.pickupCity);
  const dTok = normalizeCityKey(input.dropCity);
  const tripType = input.tripType || 'oneway';
  const vehicleId = input.vehicleId || input.cabId || 'sedan';
  const nowIso = new Date().toISOString().slice(0, 10);

  return (
    list.find((ov) => {
      if (!ov || ov.active === false) return false;
      if (ov.expiresAt && ov.expiresAt < nowIso) return false;
      if (ov.startsAt && ov.startsAt > nowIso) return false;
      const op = normalizeCityKey(ov.pickupCity);
      const od = normalizeCityKey(ov.dropCity);
      const matchesDir = (op === pTok && od === dTok) || (ov.bidirectional !== false && op === dTok && od === pTok);
      const matchesTrip = !ov.tripType || ov.tripType === tripType;
      const matchesVeh = !ov.vehicleId || ov.vehicleId === vehicleId;
      return matchesDir && matchesTrip && matchesVeh;
    }) || null
  );
}

export function validateRouteOverrideProfitability(overrideEntry, rawConfig = null) {
  const cfg = rawConfig ? mergePricingConfig(rawConfig) : DEFAULT_PRICING_ENGINE_CONFIG;
  const vehicleId = overrideEntry.vehicleId || 'sedan';
  const vehCfg = cfg.vehicles[vehicleId] || cfg.vehicles.sedan;
  const estKm = Math.max(50, Number(overrideEntry.estimatedDistanceKm || 200));
  const gstRate = Number(cfg.gstRatePct ?? 5) / 100;

  if (Number.isFinite(Number(overrideEntry.fixedTotalFare)) && Number(overrideEntry.fixedTotalFare) > 0) {
    const fixedTotal = Number(overrideEntry.fixedTotalFare);
    const preGst = Math.round(fixedTotal / (1 + gstRate));
    const gst = fixedTotal - preGst;
    const intel = calculateInternalCostAndProfit({
      preGstRevenue: preGst,
      gstAmount: gst,
      totalFareCollected: fixedTotal,
      billedDistanceKm: estKm,
      actualRoadDistanceKm: estKm,
      daysCount: 1,
      driverAllowance: vehCfg.driverAllowancePerDay,
      statePermitTax: 0,
      vehicleCfg: vehCfg,
      config: cfg
    });
    return {
      isValid: intel.isProfitProtected,
      netProfit: intel.netProfit,
      minRequiredProfit: intel.minRequiredProfit,
      reason: intel.isProfitProtected
        ? `Override valid (Net Profit ₹${intel.netProfit} >= Floor ₹${intel.minRequiredProfit}).`
        : `Override rejected/flagged: Net Profit ₹${intel.netProfit} is below minimum floor ₹${intel.minRequiredProfit}.`
    };
  }

  if (Number.isFinite(Number(overrideEntry.ratePerKmOverride)) && Number(overrideEntry.ratePerKmOverride) > 0) {
    const minBreakEvenRate = Number(vehCfg.operatingCostPerKm || 5.9) + Number(vehCfg.driverPayoutPerKm || 1.75) + 0.8;
    const proposedRate = Number(overrideEntry.ratePerKmOverride);
    return {
      isValid: proposedRate >= minBreakEvenRate,
      netProfit: Math.round((proposedRate - minBreakEvenRate) * estKm),
      minRequiredProfit: computeMinRequiredProfit(proposedRate * estKm, vehCfg),
      reason:
        proposedRate >= minBreakEvenRate
          ? `Per-KM override ₹${proposedRate}/km is above operating floor ₹${minBreakEvenRate.toFixed(1)}/km.`
          : `Per-KM override ₹${proposedRate}/km is below operating break-even floor ₹${minBreakEvenRate.toFixed(1)}/km.`
    };
  }

  return { isValid: true, netProfit: 0, minRequiredProfit: 0, reason: 'Dynamic surge cap override validated.' };
}

export function calculateIntelligentFare(input = {}, rawConfig = null, options = {}) {
  const cfg = rawConfig ? mergePricingConfig(rawConfig) : DEFAULT_PRICING_ENGINE_CONFIG;
  const includeInternal = Boolean(options.includeInternal);
  const tripType = input.tripType || 'oneway';
  const vehicleId = input.cabId || input.vehicleId || 'sedan';
  const vehicleCfg = cfg.vehicles[vehicleId] || cfg.vehicles.sedan;

  // Step 1: Route Validation (Module 15 + Module 16 #20 Fallback)
  const validation = validateRouteInput({ ...input, tripType });
  if (!validation.valid) {
    return {
      requiresManualQuote: true,
      routeVerified: false,
      errorCode: validation.errorCode,
      errorMessage: validation.reason,
      vehicleId,
      vehicleName: vehicleCfg.name,
      tripType,
      pickupCity: input.pickupCity || '',
      dropCity: input.dropCity || '',
      totalFare: 0,
      baseFare: 0,
      gstAmount: 0,
      advanceAmount: 0,
      balanceDue: 0,
      billedDistanceKm: 0,
      actualRoadDistanceKm: 0,
      pricingVersion: cfg.version || 1
    };
  }

  // Step 2: Route Intelligence & Zone Classification
  const routeIntel = analyzeRouteIntelligence(input, cfg);
  const activeOverride = findActiveSmartRouteOverride({ ...input, tripType, vehicleId }, cfg);

  // Step 3: Lead Time, Seasonal Events & Dynamic Demand
  const leadTimeResult = computeLeadTimeAdjustment(input, cfg);
  const eventResult = evaluateSeasonalEvents(input, cfg);
  const demandResult = computeDemandSupplyMultiplier(input, leadTimeResult, eventResult, activeOverride, cfg);

  // Step 4: Operational Charges (Night, Hill/Mountain, Waiting, Extra Stops, Positioning, Empty Return, State Tax + MCD)
  const ops = computeOperationalCharges(input, routeIntel, vehicleCfg, cfg);

  // Step 5: Distance & Base Rate Calculation per Trip Type (Module 2)
  const rawDistanceKm = Math.max(0, Number(input.distanceKm || 0));
  const extraKm = Math.max(0, Number(input.extraKm || 0));
  const days = Math.max(1, Math.round(Number(input.days || 1)));
  const tripOverride = cfg.tripTypeOverrides?.[tripType] || {};
  const tripTypeMultiplier = Number(tripOverride.baseMultiplier || 1.0);

  let actualRoadDistanceKm = rawDistanceKm;
  let billedDistanceKm = rawDistanceKm;
  let perKmRate = Number(vehicleCfg.ratePerKm || 9.5);
  let driverAllowance = Number(vehicleCfg.driverAllowancePerDay || 260);
  let baseDistanceFare = 0;

  if (tripType === 'local') {
    const pkg = LOCAL_PACKAGE_MULTIPLIERS[input.localPackageId || '8h_80k'] || LOCAL_PACKAGE_MULTIPLIERS['8h_80k'];
    actualRoadDistanceKm = pkg.km + extraKm;
    billedDistanceKm = pkg.km + extraKm;
    driverAllowance = 0;
    const basePkg = Math.round((vehicleCfg.local8Hr80KmFare || 1799) * pkg.multiplier);
    const extraCharge = extraKm * Number(vehicleCfg.extraKmRate || perKmRate);
    baseDistanceFare = Math.round((basePkg + extraCharge) * demandResult.multiplier * tripTypeMultiplier);
  } else if (tripType === 'roundtrip' || tripType === 'multiday') {
    const twoWayActual = rawDistanceKm * 2 + extraKm;
    const minPerDay = Number(
      activeOverride?.minKmOverride ||
        tripOverride.minKmPerDayOverride ||
        vehicleCfg.minRoundTripKmPerDay ||
        cfg.minRoundTripKmPerDay ||
        250
    );
    const minTotalKm = days * minPerDay;
    actualRoadDistanceKm = twoWayActual;
    billedDistanceKm = Math.max(minTotalKm, twoWayActual);
    perKmRate = Number(activeOverride?.ratePerKmOverride || vehicleCfg.roundTripRatePerKm || 11.5);
    driverAllowance = Number(vehicleCfg.driverAllowancePerDay || 260) * days;

    // Slight mountain fuel adjustment on base per-km only if not already accounted cleanly
    const terrainKmUplift = routeIntel.isDifficultMountainRoute ? 1.12 : routeIntel.isHillAreaRoute ? 1.05 : 1.0;
    const dynamicKmRate = Number((perKmRate * terrainKmUplift * demandResult.multiplier * tripTypeMultiplier).toFixed(2));
    baseDistanceFare = Math.round(billedDistanceKm * dynamicKmRate);
    perKmRate = dynamicKmRate;
  } else if (tripType === 'airport') {
    const minKm = Number(tripOverride.minKmOverride || 40);
    actualRoadDistanceKm = rawDistanceKm + extraKm;
    billedDistanceKm = Math.max(minKm, actualRoadDistanceKm);
    perKmRate = Number(activeOverride?.ratePerKmOverride || vehicleCfg.ratePerKm || 9.5);
    const pickupFee = Number(tripOverride.pickupFee ?? 100);
    driverAllowance = Number(vehicleCfg.driverAllowancePerDay || 260);
    const dynamicKmRate = Number((perKmRate * demandResult.multiplier * tripTypeMultiplier).toFixed(2));
    baseDistanceFare = Math.round(billedDistanceKm * dynamicKmRate + pickupFee);
    perKmRate = dynamicKmRate;
  } else {
    // One-Way or Custom Intercity Journey
    const minKm = Number(
      activeOverride?.minKmOverride || tripOverride.minKmOverride || vehicleCfg.minKm || cfg.minOneWayBillableKm || 130
    );
    actualRoadDistanceKm = rawDistanceKm + extraKm;
    billedDistanceKm = Math.max(minKm, actualRoadDistanceKm);
    perKmRate = Number(activeOverride?.ratePerKmOverride || vehicleCfg.ratePerKm || 9.5);
    driverAllowance = Number(vehicleCfg.driverAllowancePerDay || 260) * (ops.stateTaxDays > 1 ? ops.stateTaxDays : 1);

    const terrainKmUplift = routeIntel.isDifficultMountainRoute
      ? 1.18
      : routeIntel.isHillAreaRoute
      ? 1.08
      : 1 + Number(routeIntel.ruralAdjustmentPct || 0) * 0.5;
    const dynamicKmRate = Number((perKmRate * terrainKmUplift * demandResult.multiplier * tripTypeMultiplier).toFixed(2));
    baseDistanceFare = Math.round(billedDistanceKm * dynamicKmRate);
    perKmRate = dynamicKmRate;
  }

  // Apply explicit Admin Fixed Route Override if defined
  if (activeOverride && Number.isFinite(Number(activeOverride.fixedTotalFare)) && Number(activeOverride.fixedTotalFare) > 0) {
    const gstPct = Number(cfg.gstRatePct ?? 5);
    const targetPreGst = Math.round(Number(activeOverride.fixedTotalFare) / (1 + gstPct / 100));
    baseDistanceFare = Math.max(0, targetPreGst - driverAllowance - ops.statePermitTax - ops.hillCharge - ops.nightCharge);
  }

  // Step 6: Aggregate Pre-Discount Taxable Subtotal (Non-duplicate charges)
  const baseFareCombined = Math.round(baseDistanceFare + ops.hillCharge + ops.positioningCharge + ops.emptyReturnCost);
  const preDiscountSubTotal =
    baseFareCombined +
    driverAllowance +
    ops.nightCharge +
    ops.waitingCharge +
    ops.extraStopsCharge +
    ops.statePermitTax;

  // Step 7: Competitor Comparison & Strict Minimum Profit Protection Floor
  const requestedPromo = Math.max(0, Number(input.promoDiscount || 0));
  const gstPct = Number(cfg.gstRatePct ?? 5);

  const guarded = applyCompetitorAdvantageAndProfitProtection({
    preDiscountSubTotal,
    promoDiscountRequested: requestedPromo,
    gstPct,
    billedDistanceKm,
    actualRoadDistanceKm,
    daysCount: Math.max(days, ops.stateTaxDays),
    driverAllowance,
    statePermitTax: ops.statePermitTax,
    hillCharge: ops.hillCharge,
    positioningCost: ops.positioningCharge,
    returnDeadheadCost: ops.emptyReturnCost,
    pickupCity: input.pickupCity,
    dropCity: input.dropCity,
    tripType,
    vehicleId,
    routeIntel,
    vehicleCfg,
    config: cfg
  });

  const advanceAmount = Math.round(guarded.totalFare * 0.2);
  const balanceDue = Math.max(0, guarded.totalFare - advanceAmount);
  const highwayToll = 0; // Highway FASTag Toll is always Extra As Per Actuals
  const tollsAndTaxes = ops.statePermitTax;

  const fullResult = {
    requiresManualQuote: false,
    routeVerified: true,
    pricingVersion: cfg.version || 1,
    pricingVersionLabel: cfg.versionLabel || 'v1.0-intelligent-engine',
    vehicleId,
    vehicleName: vehicleCfg.name,
    tripType,
    pickupCity: input.pickupCity || '',
    dropCity: input.dropCity || '',
    distanceKm: rawDistanceKm,
    actualRoadDistanceKm: Math.round(actualRoadDistanceKm),
    billedDistanceKm: Math.round(billedDistanceKm),
    effectiveRatePerKm: Number(perKmRate.toFixed(1)),
    extraKmRate: Number(vehicleCfg.extraKmRate || perKmRate),
    baseDistanceFare,
    baseFare: baseFareCombined,
    driverAllowance,
    nightCharge: ops.nightCharge,
    hillStationCharge: ops.hillCharge,
    waitingCharge: ops.waitingCharge,
    billableWaitMinutes: ops.billableWaitMinutes,
    extraStopsCharge: ops.extraStopsCharge,
    validStopsCount: ops.validStopsCount,
    positioningDistanceKm: ops.positioningDistanceKm,
    positioningCharge: ops.positioningCharge,
    emptyReturnDeadheadKm: ops.emptyReturnDeadheadKm,
    emptyReturnCost: ops.emptyReturnCost,
    highwayToll,
    statePermitTax: ops.statePermitTax,
    delhiMcdToll: ops.delhiMcdToll,
    tollsAndTaxes,
    tollsExtraActuals: true,
    tollPolicyText: 'TOLL EXTRA (As Per Actuals)',
    stateRoutePath: ops.stateRoutePath,
    statePermitBreakdown: ops.statePermitBreakdown,
    stateTaxDays: ops.stateTaxDays,
    originState: ops.originState,
    destState: ops.destState,
    estimatedDropTime: ops.estimatedDropTime,
    isLateNightDrop: ops.isLateNightDrop,
    isEarlyOrNightPickup: ops.isEarlyOrNightPickup,
    locationCategories: {
      pickupCategory: routeIntel.pickupCategory,
      pickupCategoryLabel: routeIntel.pickupCategoryLabel,
      dropCategory: routeIntel.dropCategory,
      dropCategoryLabel: routeIntel.dropCategoryLabel,
      stopCategories: routeIntel.stopCategories,
      terrainType: routeIntel.terrainType,
      roadMix: routeIntel.roadMix,
      nearestPickupHub: routeIntel.nearestPickupHub,
      nearestDropHub: routeIntel.nearestDropHub,
      returnProbability: routeIntel.returnProbability
    },
    isHillAreaRoute: routeIntel.isHillAreaRoute,
    isDifficultMountainRoute: routeIntel.isDifficultMountainRoute,
    isOuterRoute: routeIntel.isOuterCityRoute,
    leadTime: leadTimeResult,
    seasonalEvent: eventResult,
    dynamicDemand: demandResult,
    activeRouteOverrideId: activeOverride ? activeOverride.id || activeOverride.name || 'custom_override' : null,
    subTotalPreTax: guarded.taxableAmount,
    promoDiscount: guarded.appliedPromoDiscount,
    discountAmount: guarded.appliedPromoDiscount,
    gstAmount: guarded.gstAmount,
    totalFare: guarded.totalFare,
    advanceAmount,
    balanceDue,
    profitFloorProtected: guarded.profitFloorProtected,
    profitFloorClampedReason: guarded.profitFloorClampedReason,
    competitorBenchmark: guarded.competitorBenchmark,
    competitorRates: {
      cabbazarFare: Math.round(guarded.competitorBenchmark.competitorFare * 1.01),
      savaariFare: Math.round(guarded.competitorBenchmark.competitorFare * 1.03),
      makemytripFare: Math.round(guarded.competitorBenchmark.competitorFare * 0.99),
      marketAverageFare: guarded.competitorBenchmark.competitorFare
    },
    originalFare: guarded.competitorBenchmark.competitorFare,
    savingsAmount: guarded.competitorBenchmark.actualSaving,
    cancellationPolicy: 'Free cancellation up to 6 hours before pickup',
    internalCostAndProfit: guarded.internalCostAndProfit
  };

  return includeInternal ? fullResult : sanitizePublicFareBreakdown(fullResult);
}
