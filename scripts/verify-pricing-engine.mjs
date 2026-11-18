import assert from 'node:assert/strict';
import {
  calculateIntelligentFare,
  sanitizePublicFareBreakdown,
  validateRouteOverrideProfitability,
  DEFAULT_PRICING_ENGINE_CONFIG
} from '../lib/pricing/index.js';
import { computeServerTripFare } from '../api/bookings.js';

const results = [];
function runScenario(id, title, fn) {
  fn();
  results.push({ id, title, status: 'PASS' });
  console.log(`PASS [${id}/20]: ${title}`);
}

const futureNormalDate = '2026-11-24'; // Weekday, non-Diwali
const diwaliDate = '2026-11-08'; // Matches Diwali Peak 2026 seasonal event

// 1. Delhi -> Chandigarh One-Way
runScenario(1, 'Delhi -> Chandigarh One-Way (Per-KM + Toll Extra Policy)', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Chandigarh',
      distanceKm: 255,
      pickupDate: futureNormalDate,
      pickupTime: '09:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.requiresManualQuote, false);
  assert.equal(res.billedDistanceKm, 255);
  assert.equal(res.tollsExtraActuals, true);
  assert.match(res.tollPolicyText, /TOLL.*PARKING.*EXTRA/i);
  assert.ok(res.totalFare > 2500);
  assert.equal(res.internalCostAndProfit.isProfitProtected, true);
});

// 2. Delhi -> Chandigarh 2-Day Round Trip
runScenario(2, 'Delhi -> Chandigarh 2-Day Round Trip (Min 250 KM/day Floor)', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'roundtrip',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Chandigarh',
      distanceKm: 210, // 2-way = 420km, 2-day min = 500km
      days: 2,
      pickupDate: futureNormalDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.actualRoadDistanceKm, 420);
  assert.equal(res.billedDistanceKm, 500);
  assert.ok(res.driverAllowance >= 500);
  assert.equal(res.internalCostAndProfit.isProfitProtected, true);
});

// 3. Delhi -> Jaipur One-Way (Rajasthan ₹300 State Tax + Long Route Saving)
runScenario(3, 'Delhi -> Jaipur One-Way (Rajasthan ₹300 State Tax + Long Route)', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Jaipur',
      distanceKm: 280,
      pickupDate: futureNormalDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.ok(res.stateRoutePath.includes('Rajasthan'));
  assert.ok(res.statePermitTax >= 300);
  assert.ok(res.competitorBenchmark.targetMinSaving >= 250);
  assert.equal(res.internalCostAndProfit.isProfitProtected, true);
});

// 4. Delhi -> Shimla One-Way Hill Station
runScenario(4, 'Delhi -> Shimla One-Way Hill Station Charge', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'suv',
      pickupCity: 'Delhi',
      dropCity: 'Shimla',
      distanceKm: 345,
      pickupDate: futureNormalDate,
      pickupTime: '07:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.isHillAreaRoute, true);
  assert.equal(res.isDifficultMountainRoute, false);
  assert.ok(res.hillStationCharge > 0);
  assert.equal(res.hillStationCharge, DEFAULT_PRICING_ENGINE_CONFIG.vehicles.suv.hillStationCharge);
});

// 5. Delhi -> Manali One-Way Difficult Mountain Road (Non-Stacking)
runScenario(5, 'Delhi -> Manali Difficult Mountain Road (Non-Stacking Terrain Charge)', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'innova_crysta',
      pickupCity: 'Delhi',
      dropCity: 'Manali',
      distanceKm: 530,
      pickupDate: futureNormalDate,
      pickupTime: '06:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.isDifficultMountainRoute, true);
  assert.equal(
    res.hillStationCharge,
    DEFAULT_PRICING_ENGINE_CONFIG.vehicles.innova_crysta.difficultMountainCharge
  );
  // Ensure hillStationCharge and difficultMountainCharge did not sum together
  assert.ok(
    res.hillStationCharge <
      DEFAULT_PRICING_ENGINE_CONFIG.vehicles.innova_crysta.difficultMountainCharge +
        DEFAULT_PRICING_ENGINE_CONFIG.vehicles.innova_crysta.hillStationCharge
  );
});

// 6. Remote / Village Drop Location (Deadhead & Profit Protection)
runScenario(6, 'Remote / Village Drop Location (Deadhead & Profit Floor)', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Patna',
      dropCity: 'Rampur Gram, Begusarai',
      distanceKm: 135,
      pickupDate: futureNormalDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.locationCategories.dropCategory, 'village');
  assert.equal(res.internalCostAndProfit.isProfitProtected, true);
});

// 7. Outer City Pickup (Zirakpur -> Delhi)
runScenario(7, 'Outer Pickup Zirakpur -> Delhi Classification & Delhi MCD', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'dzire',
      pickupCity: 'Zirakpur',
      dropCity: 'Delhi',
      distanceKm: 245,
      pickupDate: futureNormalDate,
      pickupTime: '09:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.locationCategories.pickupCategory, 'outer_city');
  assert.equal(res.locationCategories.dropCategory, 'metro_city');
  assert.equal(res.delhiMcdToll, 100);
});

// 8. Urgent Pickup (<2h) vs 10-Day Advance Saver
runScenario(8, 'Urgent Lead-Time (<2h) vs 10-Day Advance Saver', () => {
  const fixedNow = new Date('2026-11-18T08:00:00+05:30');
  const urgent = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Agra',
      distanceKm: 230,
      pickupDate: '2026-11-18',
      pickupTime: '08:30 AM',
      nowDate: fixedNow,
      fleetAvailabilityRatio: 0.3,
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  const advance = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Agra',
      distanceKm: 230,
      pickupDate: '2026-11-29', // 11 days out -> days_10_15
      pickupTime: '08:30 AM',
      nowDate: fixedNow,
      fleetAvailabilityRatio: 0.85,
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.ok(['immediate', 'within_2h'].includes(urgent.leadTime.bucket));
  assert.equal(advance.leadTime.bucket, 'days_10_15');
  assert.equal(advance.leadTime.isAdvanceSaver, true);
  assert.ok(advance.totalFare <= urgent.totalFare);
});

// 9. Festival Diwali Peak Date
runScenario(9, 'Festival Diwali Peak Rule Multiplier Active', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'ertiga',
      pickupCity: 'Delhi',
      dropCity: 'Lucknow',
      distanceKm: 550,
      pickupDate: diwaliDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.ok(res.seasonalEvent.multiplier > 1.0);
  assert.match(res.seasonalEvent.name, /Diwali/i);
});

// 10. Late-Night Pickup 11:00 PM
runScenario(10, 'Late-Night Pickup 11:00 PM Allowance (Non-Stacking)', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Jaipur',
      distanceKm: 280,
      pickupDate: futureNormalDate,
      pickupTime: '11:00 PM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.nightCharge, DEFAULT_PRICING_ENGINE_CONFIG.vehicles.sedan.nightAllowance);
});

// 11. High Demand / Low Supply Surge Clamped <= maxSurgeMultiplier
runScenario(11, 'High Demand / Low Supply Surge Clamped to Cap', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Jaipur',
      distanceKm: 280,
      pickupDate: diwaliDate,
      pickupTime: '09:00 AM',
      fleetAvailabilityRatio: 0.15,
      activeBookingsCount: 45,
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.ok(
    res.dynamicDemand.multiplier <= DEFAULT_PRICING_ENGINE_CONFIG.dynamicPricing.maxSurgeMultiplier
  );
});

// 12. Low Demand / High Supply Saver Respecting Min Profit Floor
runScenario(12, 'Low Demand / High Supply Discount Respecting Min Profit Floor', () => {
  const fixedNow = new Date('2026-11-01T08:00:00+05:30');
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Agra',
      distanceKm: 230,
      pickupDate: '2026-11-25',
      pickupTime: '11:00 AM',
      nowDate: fixedNow,
      fleetAvailabilityRatio: 0.95,
      activeBookingsCount: 2,
      routeDemandScore: 0.3,
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.ok(res.dynamicDemand.multiplier <= 1.0);
  assert.equal(res.internalCostAndProfit.isProfitProtected, true);
});

// 13. Multi-Stop Route (Delhi -> Jaipur via Mathura, Agra)
runScenario(13, 'Multi-Stop Route Charges & Multi-State Permits', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'custom',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Jaipur',
      stops: ['Mathura', 'Agra'],
      distanceKm: 340,
      pickupDate: futureNormalDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.validStopsCount, 2);
  assert.ok(res.extraStopsCharge > 0);
  assert.ok(res.stateRoutePath.includes('Uttar Pradesh'));
  assert.ok(res.stateRoutePath.includes('Rajasthan'));
});

// 14. Waiting 120 Mins (45m Grace -> 75 Billable Mins)
runScenario(14, 'Waiting 120 Mins (45m Free Grace -> 75 Billable Mins)', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Agra',
      distanceKm: 230,
      waitingMinutes: 120,
      pickupDate: futureNormalDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.billableWaitMinutes, 75);
  assert.ok(res.waitingCharge > 0);
});

// 15. Extra KM (+45 KM)
runScenario(15, 'Extra KM (+45 KM) Added Cleanly', () => {
  const base = calculateIntelligentFare({
    tripType: 'oneway',
    cabId: 'sedan',
    pickupCity: 'Delhi',
    dropCity: 'Agra',
    distanceKm: 230,
    extraKm: 0,
    pickupDate: futureNormalDate,
    pickupTime: '08:00 AM',
    routeVerified: true
  });
  const withExtra = calculateIntelligentFare({
    tripType: 'oneway',
    cabId: 'sedan',
    pickupCity: 'Delhi',
    dropCity: 'Agra',
    distanceKm: 230,
    extraKm: 45,
    pickupDate: futureNormalDate,
    pickupTime: '08:00 AM',
    routeVerified: true
  });
  assert.equal(withExtra.billedDistanceKm, base.billedDistanceKm + 45);
  assert.ok(withExtra.totalFare > base.totalFare);
});

// 16. Promo FIRST300 (₹300) Protected by Min Profit Floor
runScenario(16, 'Promo FIRST300 Protected by Min Profit Floor', () => {
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Chandigarh',
      distanceKm: 255,
      promoDiscount: 300,
      pickupDate: futureNormalDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    null,
    { includeInternal: true }
  );
  assert.equal(res.internalCostAndProfit.isProfitProtected, true);
  assert.ok(res.promoDiscount >= 0 && res.promoDiscount <= 300);
});

// 17. Verified Competitor Short Route (<= 250 km -> >= ₹150 Savings)
runScenario(17, 'Verified Competitor Short Route (<=250 km -> >= ₹150 Savings)', () => {
  const customCfg = {
    competitorQuotes: [
      {
        id: 'test_cmp_short',
        competitorName: 'CabBazar Verified',
        pickupCity: 'Delhi',
        dropCity: 'Agra',
        tripType: 'oneway',
        vehicleId: 'sedan',
        competitorFare: 3650,
        verifiedDate: '2026-11-01',
        active: true
      }
    ]
  };
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Agra',
      distanceKm: 230,
      pickupDate: futureNormalDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    customCfg,
    { includeInternal: true }
  );
  assert.equal(res.competitorBenchmark.targetMinSaving, 150);
  assert.ok(res.competitorBenchmark.actualSaving >= 150);
  assert.equal(res.internalCostAndProfit.isProfitProtected, true);
});

// 18. Verified Competitor Long Route (> 250 km -> >= ₹250 Savings)
runScenario(18, 'Verified Competitor Long Route (>250 km -> >= ₹250 Savings)', () => {
  const customCfg = {
    competitorQuotes: [
      {
        id: 'test_cmp_long',
        competitorName: 'Savaari Verified',
        pickupCity: 'Delhi',
        dropCity: 'Jaipur',
        tripType: 'oneway',
        vehicleId: 'sedan',
        competitorFare: 4450,
        verifiedDate: '2026-11-01',
        active: true
      }
    ]
  };
  const res = calculateIntelligentFare(
    {
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Jaipur',
      distanceKm: 280,
      pickupDate: futureNormalDate,
      pickupTime: '08:00 AM',
      routeVerified: true
    },
    customCfg,
    { includeInternal: true }
  );
  assert.equal(res.competitorBenchmark.targetMinSaving, 250);
  assert.ok(res.competitorBenchmark.actualSaving >= 250);
  assert.equal(res.internalCostAndProfit.isProfitProtected, true);
});

// 19. Unprofitable Route Override Guard & Public Sanitizer Stripping
runScenario(19, 'Unprofitable Override Rejection & Public Sanitizer Strip', () => {
  const check = validateRouteOverrideProfitability({
    pickupCity: 'Delhi',
    dropCity: 'Jaipur',
    vehicleId: 'sedan',
    fixedTotalFare: 800,
    estimatedDistanceKm: 280
  });
  assert.equal(check.isValid, false);

  const pub = calculateIntelligentFare({
    tripType: 'oneway',
    cabId: 'sedan',
    pickupCity: 'Delhi',
    dropCity: 'Jaipur',
    distanceKm: 280,
    routeVerified: true
  });
  assert.equal('internalCostAndProfit' in pub, false);

  const stripped = sanitizePublicFareBreakdown({ totalFare: 3000, internalCostAndProfit: { netProfit: 900 } });
  assert.equal('internalCostAndProfit' in stripped, false);
});

// 20. Invalid / Unverified Route Fail-Closed & Backend Rejection
runScenario(20, 'Invalid / Unverified Route Fails Closed & Server Rejects', () => {
  const pub = calculateIntelligentFare({
    tripType: 'oneway',
    cabId: 'sedan',
    pickupCity: 'UnknownTown',
    dropCity: 'NowhereLand',
    distanceKm: 0,
    routeVerified: false
  });
  assert.equal(pub.requiresManualQuote, true);
  assert.equal(pub.totalFare, 0);

  const serverFailClosed = computeServerTripFare({
    tripType: 'oneway',
    cabId: 'sedan',
    pickupCity: 'UnknownTown',
    dropCity: 'NowhereLand',
    distanceKm: 0,
    routeVerified: false
  });
  assert.equal(serverFailClosed.requiresManualQuote, true);
  assert.equal(serverFailClosed.totalFare, 0);
  assert.equal(serverFailClosed.advanceFare, 0);

  assert.throws(() =>
    computeServerTripFare({
      tripType: 'oneway',
      cabId: 'sedan',
      pickupCity: 'Delhi',
      dropCity: 'Agra',
      distanceKm: -10
    })
  );
});

console.log(`\nALL ${results.length}/20 MODULE-16 VERIFICATION SCENARIOS PASSED!`);
