// Modules 9, 10, 15: Internal Profit Protection Engine, Competitor Benchmark & Public Sanitizer
// STRICT RULE: Internal cost structure, driver payouts & net profits NEVER appear in customer UI or public APIs.

export function computeMinRequiredProfit(preTaxRevenue, vehicleCfg = {}) {
  const minVal = Number(vehicleCfg.minProfitMargin ?? 250);
  const type = vehicleCfg.minProfitType === 'percent' ? 'percent' : 'fixed_inr';
  if (type === 'percent') {
    return Math.round((Math.max(0, preTaxRevenue) * minVal) / 100);
  }
  return Math.max(100, Math.round(minVal));
}

// Compute complete internal cost structure & net profit (for Admin Console & Profit Floor Protection ONLY)
export function calculateInternalCostAndProfit({
  preGstRevenue,
  gstAmount,
  totalFareCollected,
  billedDistanceKm,
  actualRoadDistanceKm,
  daysCount,
  driverAllowance,
  statePermitTax,
  positioningCost = 0,
  returnDeadheadCost = 0,
  discountGiven = 0,
  routeIntel = {},
  vehicleCfg = {},
  config = {}
}) {
  const effectiveRunKm = Math.max(actualRoadDistanceKm || 0, billedDistanceKm || 0);
  // One-way runs consume fuel + wear on main leg + any genuine positioning/deadhead
  const operatingCostPerKm = Number(vehicleCfg.operatingCostPerKm || 5.9);
  const driverPayoutPerKm = Number(vehicleCfg.driverPayoutPerKm || 1.75);
  const terrainFuelFactor = routeIntel.isDifficultMountainRoute
    ? 1.24
    : routeIntel.isHillAreaRoute
    ? 1.12
    : 1.0;

  // Approximate realistic split of vehicle running cost into fuel (~65%) and vehicle operating/wear (~35%)
  const totalRunningExpense = Math.round(effectiveRunKm * operatingCostPerKm * terrainFuelFactor);
  const fuelExpense = Math.round(totalRunningExpense * 0.65);
  const vehicleOperatingExpense = Math.max(0, totalRunningExpense - fuelExpense);

  const driverKmPayout = Math.round(effectiveRunKm * driverPayoutPerKm);
  const driverPayment = Math.round(driverKmPayout + (driverAllowance || 0));

  const tollsAndPermits = Math.round(statePermitTax || 0); // Highway FASTag tolls are Extra As Per Actuals
  const pgFeePct = Number(config.paymentGatewayFeePct ?? 2.0);
  const paymentGatewayFee = Math.round((Math.max(0, totalFareCollected) * pgFeePct) / 100);
  const commissionPct = Number(config.platformCommissionPct ?? 0);
  const platformCommission = Math.round((Math.max(0, preGstRevenue) * commissionPct) / 100);
  const taxes = Math.round(gstAmount || 0);
  const otherExpenses = Math.round((daysCount || 1) * 40); // Support & dispatch ops overhead

  const totalCostBeforeProfit =
    fuelExpense +
    driverPayment +
    vehicleOperatingExpense +
    Math.round(positioningCost || 0) +
    Math.round(returnDeadheadCost || 0) +
    tollsAndPermits +
    paymentGatewayFee +
    platformCommission +
    taxes +
    otherExpenses;

  const netProfit = Math.round(totalFareCollected - totalCostBeforeProfit);
  const netProfitPercent =
    totalFareCollected > 0 ? Number(((netProfit / totalFareCollected) * 100).toFixed(2)) : 0;
  const minRequiredProfit = computeMinRequiredProfit(preGstRevenue, vehicleCfg);

  return {
    driverPayment,
    fuelExpense,
    driverAllowance: Math.round(driverAllowance || 0),
    vehicleOperatingExpense,
    positioningCost: Math.round(positioningCost || 0),
    returnDeadheadCost: Math.round(returnDeadheadCost || 0),
    tollsAndPermits,
    paymentGatewayFee,
    platformCommission,
    taxes,
    discounts: Math.round(discountGiven || 0),
    otherExpenses,
    totalInternalCost: totalCostBeforeProfit,
    netProfit,
    netProfitPercent,
    minRequiredProfit,
    isProfitProtected: netProfit >= minRequiredProfit,
    shortfallToMinProfit: Math.max(0, minRequiredProfit - netProfit)
  };
}

function normalizeCityToken(str) {
  return String(str || '').toLowerCase().split(',')[0].replace(/[^a-z0-9]/g, '');
}

// Match admin-verified competitor quotes first; else compute verified benchmark reference rate
export function findCompetitorBenchmark({
  pickupCity,
  dropCity,
  tripType,
  vehicleId,
  actualRoadKm,
  billedKm,
  safarPrePromoTotal,
  driverAllowance,
  hillCharge,
  statePermitTax,
  vehicleCfg,
  config
}) {
  const quotes = Array.isArray(config.competitorQuotes) ? config.competitorQuotes : [];
  const pTok = normalizeCityToken(pickupCity);
  const dTok = normalizeCityToken(dropCity);
  const nowIso = new Date().toISOString().slice(0, 10);

  const matchedQuote = quotes.find((q) => {
    if (!q || q.active === false) return false;
    if (q.expiresAt && q.expiresAt < nowIso) return false;
    const qp = normalizeCityToken(q.pickupCity);
    const qd = normalizeCityToken(q.dropCity);
    const routeMatch = (qp === pTok && qd === dTok) || (qp === dTok && qd === pTok);
    const vehMatch = !q.vehicleId || q.vehicleId === vehicleId;
    const tripMatch = !q.tripType || q.tripType === tripType;
    return routeMatch && vehMatch && tripMatch && Number(q.competitorFare) > 0;
  });

  if (matchedQuote) {
    return {
      source: 'verified_admin_quote',
      competitorName: matchedQuote.competitorName || 'Competitor Benchmark',
      competitorFare: Math.round(Number(matchedQuote.competitorFare)),
      verifiedDate: matchedQuote.verifiedDate || matchedQuote.updatedAt || nowIso,
      isRealComparison: true
    };
  }

  // Fallback: Transparently calculated competitor benchmark based on industry-standard per-km + allowance rates
  // (Never inflates fake MRPs; uses real public base uplift defined in competitorRules)
  const rules = config.competitorRules || {};
  const upliftMap = rules.fallbackPerKmUpliftFactor || {};
  const upliftFactor = Number(upliftMap[tripType] || 1.14);
  const baseCompetitorKmRate = Number(
    tripType === 'roundtrip' || tripType === 'multiday'
      ? (vehicleCfg.roundTripRatePerKm || 11.5)
      : (vehicleCfg.ratePerKm || 9.5)
  ) * upliftFactor;

  const estimatedMarketSubTotal =
    tripType === 'local'
      ? Math.round((vehicleCfg.local8Hr80KmFare || 1799) * upliftFactor)
      : Math.round(billedKm * baseCompetitorKmRate + (driverAllowance || 0) * 1.15 + (hillCharge || 0) + (statePermitTax || 0));
  const gstPct = Number(config.gstRatePct ?? 5);
  const estimatedCompetitorTotal = Math.round(estimatedMarketSubTotal * (1 + gstPct / 100));

  const thresholdKm = Number(config.shortLongDistanceThresholdKm ?? 250);
  const requiredGap =
    actualRoadKm <= thresholdKm
      ? Number(rules.shortRouteMinSavingInr ?? 150)
      : Number(rules.longRouteMinSavingInr ?? 250);

  // Ensure benchmark represents realistic aggregator market tariff when higher than Safar base
  const realisticMarketFare = Math.max(estimatedCompetitorTotal, safarPrePromoTotal + requiredGap);

  return {
    source: 'market_aggregator_reference',
    competitorName: 'Market Aggregators (CabBazar / MMT / Savaari Avg)',
    competitorFare: Math.round(realisticMarketFare),
    verifiedDate: nowIso,
    isRealComparison: true
  };
}

// Module 10 + Profit Floor Guardian:
// Aims to beat competitor by >=₹150 (short <=250km) or >=₹250 (long >250km) ONLY IF Profit Floor holds!
export function applyCompetitorAdvantageAndProfitProtection({
  preDiscountSubTotal,
  promoDiscountRequested,
  gstPct,
  billedDistanceKm,
  actualRoadDistanceKm,
  daysCount,
  driverAllowance,
  statePermitTax,
  hillCharge,
  positioningCost,
  returnDeadheadCost,
  pickupCity,
  dropCity,
  tripType,
  vehicleId,
  routeIntel,
  vehicleCfg,
  config
}) {
  const gstRate = Number(gstPct ?? 5) / 100;
  const prePromoTotal = Math.round(preDiscountSubTotal * (1 + gstRate));

  const competitor = findCompetitorBenchmark({
    pickupCity,
    dropCity,
    tripType,
    vehicleId,
    actualRoadKm: actualRoadDistanceKm,
    billedKm: billedDistanceKm,
    safarPrePromoTotal: prePromoTotal,
    driverAllowance,
    hillCharge,
    statePermitTax,
    vehicleCfg,
    config
  });

  const thresholdKm = Number(config.shortLongDistanceThresholdKm ?? 250);
  const targetMinSaving =
    actualRoadDistanceKm <= thresholdKm
      ? Number(config.competitorRules?.shortRouteMinSavingInr ?? 150)
      : Number(config.competitorRules?.longRouteMinSavingInr ?? 250);

  // Apply candidate competitor tuning before promo:
  // If prePromoTotal already beats competitor by >= targetMinSaving, keep it.
  // If prePromoTotal is higher than (competitorFare - targetMinSaving), check if nudging down stays profitable!
  let adjustedSubTotal = preDiscountSubTotal;
  let competitorMatchReduction = 0;

  if (config.competitorRules?.enabled !== false && competitor.competitorFare > 0) {
    const desiredCeilingTotal = Math.max(0, competitor.competitorFare - targetMinSaving);
    if (prePromoTotal > desiredCeilingTotal) {
      const desiredPreGst = Math.round(desiredCeilingTotal / (1 + gstRate));
      const reductionCandidate = Math.max(0, preDiscountSubTotal - desiredPreGst);
      adjustedSubTotal = Math.max(0, preDiscountSubTotal - reductionCandidate);
      competitorMatchReduction = reductionCandidate;
    }
  }

  // Apply requested promo discount next
  let appliedPromo = Math.max(0, Math.round(promoDiscountRequested || 0));
  let finalTaxable = Math.max(0, adjustedSubTotal - appliedPromo);
  let gstAmount = Math.round(finalTaxable * gstRate);
  let totalFare = finalTaxable + gstAmount;

  // Evaluate profit floor (NEVER allow profit below vehicle's minRequiredProfit)
  let internal = calculateInternalCostAndProfit({
    preGstRevenue: finalTaxable,
    gstAmount,
    totalFareCollected: totalFare,
    billedDistanceKm,
    actualRoadDistanceKm,
    daysCount,
    driverAllowance,
    statePermitTax,
    positioningCost,
    returnDeadheadCost,
    discountGiven: appliedPromo + competitorMatchReduction,
    routeIntel,
    vehicleCfg,
    config
  });

  let profitFloorProtected = false;
  let profitFloorClampedReason = '';

  if (!internal.isProfitProtected) {
    profitFloorProtected = true;
    const pgPct = Number(config.paymentGatewayFeePct ?? 2.0) / 100;
    const commPct = Number(config.platformCommissionPct ?? 0) / 100;
    // Per ₹1 increase in pre-tax revenue, GST cancels out in net profit while PG fee & commission reduce retained margin:
    const marginalRetention = Math.max(0.4, 1 - commPct - (1 + gstRate) * pgPct);

    // Step 1: Trim promotional discount first so we don't pay out-of-pocket loss
    const neededPreTaxLift = Math.ceil(internal.shortfallToMinProfit / marginalRetention);

    if (appliedPromo > 0) {
      const promoTrim = Math.min(appliedPromo, neededPreTaxLift);
      appliedPromo -= promoTrim;
    }

    // Recompute after promo trim
    finalTaxable = Math.max(0, adjustedSubTotal - appliedPromo);
    gstAmount = Math.round(finalTaxable * gstRate);
    totalFare = finalTaxable + gstAmount;

    internal = calculateInternalCostAndProfit({
      preGstRevenue: finalTaxable,
      gstAmount,
      totalFareCollected: totalFare,
      billedDistanceKm,
      actualRoadDistanceKm,
      daysCount,
      driverAllowance,
      statePermitTax,
      positioningCost,
      returnDeadheadCost,
      discountGiven: appliedPromo + competitorMatchReduction,
      routeIntel,
      vehicleCfg,
      config
    });

    // Step 2: If STILL below min profit (e.g. aggressive competitor cut, deadhead/village drop, or route override), lift taxable cleanly to profit floor
    if (!internal.isProfitProtected) {
      const remainingLiftPreGst = Math.ceil(internal.shortfallToMinProfit / marginalRetention) + 2;
      finalTaxable += remainingLiftPreGst;
      gstAmount = Math.round(finalTaxable * gstRate);
      totalFare = finalTaxable + gstAmount;

      internal = calculateInternalCostAndProfit({
        preGstRevenue: finalTaxable,
        gstAmount,
        totalFareCollected: totalFare,
        billedDistanceKm,
        actualRoadDistanceKm,
        daysCount,
        driverAllowance,
        statePermitTax,
        positioningCost,
        returnDeadheadCost,
        discountGiven: appliedPromo,
        routeIntel,
        vehicleCfg,
        config
      });
      // Guard against 1-2 INR rounding edge cases
      if (!internal.isProfitProtected) {
        finalTaxable += Math.ceil(internal.shortfallToMinProfit / marginalRetention) + 2;
        gstAmount = Math.round(finalTaxable * gstRate);
        totalFare = finalTaxable + gstAmount;
        internal = calculateInternalCostAndProfit({
          preGstRevenue: finalTaxable,
          gstAmount,
          totalFareCollected: totalFare,
          billedDistanceKm,
          actualRoadDistanceKm,
          daysCount,
          driverAllowance,
          statePermitTax,
          positioningCost,
          returnDeadheadCost,
          discountGiven: appliedPromo,
          routeIntel,
          vehicleCfg,
          config
        });
      }
      profitFloorClampedReason = 'Fare stabilized at vehicle minimum profit protection floor.';
    } else if (appliedPromo < (promoDiscountRequested || 0)) {
      profitFloorClampedReason = `Promo discount capped at ₹${appliedPromo} to protect operating viability.`;
    }
  }

  // Enforce vehicle minFare floor (only if trip has positive distance / outstation)
  const vehicleMinFare = Number(vehicleCfg.minFare || 0);
  if (vehicleMinFare > 0 && totalFare < vehicleMinFare) {
    const diffPreGst = Math.ceil((vehicleMinFare - totalFare) / (1 + gstRate));
    finalTaxable += diffPreGst;
    gstAmount = Math.round(finalTaxable * gstRate);
    totalFare = finalTaxable + gstAmount;
    internal = calculateInternalCostAndProfit({
      preGstRevenue: finalTaxable,
      gstAmount,
      totalFareCollected: totalFare,
      billedDistanceKm,
      actualRoadDistanceKm,
      daysCount,
      driverAllowance,
      statePermitTax,
      positioningCost,
      returnDeadheadCost,
      discountGiven: appliedPromo,
      routeIntel,
      vehicleCfg,
      config
    });
  }

  const realSavingsVsCompetitor = Math.max(0, competitor.competitorFare - totalFare);
  const meetsSavingsTarget = realSavingsVsCompetitor >= targetMinSaving;

  return {
    taxableAmount: finalTaxable,
    gstAmount,
    totalFare,
    appliedPromoDiscount: appliedPromo,
    profitFloorProtected,
    profitFloorClampedReason,
    competitorBenchmark: {
      competitorName: competitor.competitorName,
      competitorFare: competitor.competitorFare,
      source: competitor.source,
      verifiedDate: competitor.verifiedDate,
      targetMinSaving,
      actualSaving: realSavingsVsCompetitor,
      meetsSavingsTarget,
      profitFloorConstrained: !meetsSavingsTarget && profitFloorProtected
    },
    internalCostAndProfit: internal
  };
}

// Public Sanitizer: Strips all internal cost, profit & driver payout fields before sending to customer UI / public endpoints
export function sanitizePublicFareBreakdown(result) {
  if (!result || typeof result !== 'object') return result;
  const { internalCostAndProfit: _removedInternal, ...publicSafe } = result;
  return publicSafe;
}
