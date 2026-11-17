// Module 1 & Module 4: Advanced Route Intelligence, Zone Classification & Operational Positioning
import {
  FLEET_HUBS,
  LOCATION_CATEGORIES,
  LOCATION_CATEGORY_LABELS,
  LOCATION_CATEGORY_PROFILES,
  DIFFICULT_MOUNTAIN_TOKENS,
  HILL_STATION_TOKENS,
  METRO_CITY_TOKENS,
  MAJOR_CITY_TOKENS,
  OUTER_CITY_TOKENS,
  SUBURBAN_AREA_TOKENS,
  VILLAGE_TOKENS,
  REMOTE_AREA_TOKENS,
  TOURIST_DESTINATION_TOKENS,
  EVENT_LOCATION_TOKENS
} from './constants.js';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeText(val) {
  return String(val || '').trim().toLowerCase();
}

function matchesAnyToken(text, tokens) {
  const norm = normalizeText(text);
  if (!norm) return false;
  return tokens.some((token) => {
    const clean = token.toLowerCase();
    // Avoid ultra-short substring collisions like "goa" matching "gaon"
    if (clean.length <= 3) {
      const re = new RegExp(`(^|[^a-z])${clean}([^a-z]|$)`, 'i');
      return re.test(norm);
    }
    return norm.includes(clean);
  });
}

// Classify any city/village/spot into one of the 11 Module-1 Location Categories
export function classifyLocationCategory(locationName, categoryOverrides = {}) {
  const raw = normalizeText(locationName);
  if (!raw || raw.length < 2) {
    return 'normal_city';
  }

  // Check Admin overrides first (keyed by lowercase city token)
  if (categoryOverrides && typeof categoryOverrides === 'object') {
    for (const [pattern, forcedCat] of Object.entries(categoryOverrides)) {
      if (pattern && raw.includes(pattern.toLowerCase()) && LOCATION_CATEGORIES.includes(forcedCat)) {
        return forcedCat;
      }
    }
  }

  // Explicit mountain severity first
  if (matchesAnyToken(raw, DIFFICULT_MOUNTAIN_TOKENS)) {
    return 'difficult_mountain_road';
  }
  if (matchesAnyToken(raw, HILL_STATION_TOKENS)) {
    return 'hill_station';
  }
  if (matchesAnyToken(raw, REMOTE_AREA_TOKENS)) {
    return 'remote_area';
  }
  if (matchesAnyToken(raw, VILLAGE_TOKENS)) {
    return 'village';
  }
  if (matchesAnyToken(raw, EVENT_LOCATION_TOKENS)) {
    return 'event_location';
  }
  if (matchesAnyToken(raw, TOURIST_DESTINATION_TOKENS)) {
    return 'tourist_destination';
  }
  if (matchesAnyToken(raw, OUTER_CITY_TOKENS)) {
    return 'outer_city';
  }
  if (matchesAnyToken(raw, METRO_CITY_TOKENS)) {
    return 'metro_city';
  }
  if (matchesAnyToken(raw, MAJOR_CITY_TOKENS)) {
    return 'major_city';
  }
  if (matchesAnyToken(raw, SUBURBAN_AREA_TOKENS)) {
    return 'suburban_area';
  }
  return 'normal_city';
}

export function findNearestFleetHub(coords, locationName = '') {
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng || coords.lon)) {
    const lonVal = Number.isFinite(coords.lng) ? coords.lng : coords.lon;
    let bestHub = FLEET_HUBS[0];
    let minDist = Infinity;
    for (const hub of FLEET_HUBS) {
      const dist = haversineKm(coords.lat, lonVal, hub.lat, hub.lon);
      if (dist < minDist) {
        minDist = dist;
        bestHub = hub;
      }
    }
    return {
      hub: bestHub,
      straightLineKm: Math.round(minDist),
      estimatedRoadPositioningKm: Math.round(minDist * 1.25)
    };
  }

  // Name-based hub fallback
  const norm = normalizeText(locationName);
  const directMatch = FLEET_HUBS.find((h) => norm.includes(h.id) || norm.includes(h.name.split(' ')[0].toLowerCase()));
  if (directMatch) {
    return {
      hub: directMatch,
      straightLineKm: 5,
      estimatedRoadPositioningKm: 8
    };
  }

  return {
    hub: FLEET_HUBS[0],
    straightLineKm: 18,
    estimatedRoadPositioningKm: 22
  };
}

// Strict Route Validation (Module 15 + Module 16 #20 Invalid Route Fallback)
export function validateRouteInput(input = {}) {
  const tripType = input.tripType || 'oneway';
  if (tripType === 'local') {
    if (!input.pickupCity || String(input.pickupCity).trim().length < 2) {
      return {
        valid: false,
        requiresManualQuote: true,
        errorCode: 'MISSING_LOCAL_CITY',
        reason: 'Valid pickup city is required for local package calculation.'
      };
    }
    return { valid: true, requiresManualQuote: false };
  }

  const p = String(input.pickupCity || '').trim();
  const d = String(input.dropCity || '').trim();
  const distKm = Number(input.distanceKm);

  const invalidPattern = /^(invalid|unknown|test_invalid|nowhere|xxx|n\/a|null|undefined|\?+)$/i;

  if (p.length < 2 || d.length < 2 || invalidPattern.test(p) || invalidPattern.test(d)) {
    return {
      valid: false,
      requiresManualQuote: true,
      errorCode: 'INVALID_LOCATION_NAME',
      reason: 'Location could not be verified reliably. Manual quotation requested.'
    };
  }

  if (input.routeVerified === false) {
    return {
      valid: false,
      requiresManualQuote: true,
      errorCode: 'UNVERIFIED_ROUTE',
      reason: input.routeErrorReason || 'Routing API could not verify a drivable road path. Request manual quote.'
    };
  }

  if (!Number.isFinite(distKm) || distKm <= 0) {
    return {
      valid: false,
      requiresManualQuote: true,
      errorCode: 'INVALID_DISTANCE',
      reason: 'Actual road distance could not be determined (> 0 km required). Request manual quote.'
    };
  }

  if (distKm > 4500) {
    return {
      valid: false,
      requiresManualQuote: true,
      errorCode: 'IMPOSSIBLE_ROAD_DISTANCE',
      reason: 'Route exceeds verifiable single-trip domestic road distance (4,500 km). Request manual quote.'
    };
  }

  return { valid: true, requiresManualQuote: false };
}

export function analyzeRouteIntelligence(input = {}, config = {}) {
  const tripType = input.tripType || 'oneway';
  const pickupCity = String(input.pickupCity || '').trim();
  const dropCity = String(input.dropCity || '').trim();
  const stopsList = Array.isArray(input.stops) ? input.stops : [];
  const categoryOverrides = config.locationCategoryOverrides || {};

  const pickupCategory = classifyLocationCategory(pickupCity, categoryOverrides);
  const dropCategory = tripType === 'local' ? pickupCategory : classifyLocationCategory(dropCity, categoryOverrides);
  const stopCategories = stopsList.map((s) => {
    const label = typeof s === 'string' ? s : s?.location || '';
    return {
      location: label,
      category: classifyLocationCategory(label, categoryOverrides)
    };
  });

  const allCategories = [pickupCategory, dropCategory, ...stopCategories.map((x) => x.category)];
  const hasDifficultMountain = allCategories.includes('difficult_mountain_road');
  const hasHillStation = hasDifficultMountain || allCategories.includes('hill_station');
  const hasRemoteOrVillage = allCategories.includes('remote_area') || allCategories.includes('village');

  let terrainType = 'highway';
  if (tripType === 'local') {
    terrainType = 'urban';
  } else if (hasDifficultMountain) {
    terrainType = 'difficult_mountain';
  } else if (hasHillStation) {
    terrainType = 'hill_station';
  } else if (hasRemoteOrVillage) {
    terrainType = 'rural';
  } else if (Number(input.distanceKm || 0) <= 55 && dropCategory === 'metro_city') {
    terrainType = 'urban';
  }

  // Approximate road mix percentages for transparency & costing
  let roadMix = { highwayPct: 80, urbanPct: 18, ruralPct: 2, hillPct: 0 };
  if (terrainType === 'urban') {
    roadMix = { highwayPct: 15, urbanPct: 85, ruralPct: 0, hillPct: 0 };
  } else if (terrainType === 'rural') {
    roadMix = { highwayPct: 55, urbanPct: 10, ruralPct: 35, hillPct: 0 };
  } else if (terrainType === 'hill_station') {
    roadMix = { highwayPct: 48, urbanPct: 12, ruralPct: 5, hillPct: 35 };
  } else if (terrainType === 'difficult_mountain') {
    roadMix = { highwayPct: 30, urbanPct: 5, ruralPct: 10, hillPct: 55 };
  }

  const pickupProfile = LOCATION_CATEGORY_PROFILES[pickupCategory] || LOCATION_CATEGORY_PROFILES.normal_city;
  const dropProfile = LOCATION_CATEGORY_PROFILES[dropCategory] || LOCATION_CATEGORY_PROFILES.normal_city;

  // Nearest fleet dispatch hub for pickup & drop positioning analysis
  const pickupHubMatch = findNearestFleetHub(input.pickupCoords, pickupCity);
  const dropHubMatch = findNearestFleetHub(input.dropCoords, dropCity);

  // Genuine vehicle positioning distance beyond free operational radius
  // Only applies when dispatch origin is rural/remote/outer outside normal hub coverage
  const freeRadius = pickupProfile.positioningFreeKm || 25;
  let positioningDistanceKm = 0;
  if (
    tripType !== 'local' &&
    (pickupCategory === 'remote_area' ||
      pickupCategory === 'village' ||
      pickupCategory === 'difficult_mountain_road' ||
      pickupCategory === 'outer_city')
  ) {
    const rawPos = pickupHubMatch.estimatedRoadPositioningKm;
    if (rawPos > freeRadius) {
      positioningDistanceKm = Math.min(85, rawPos - freeRadius);
    }
  }

  // Return-customer probability & empty return cost (Module 4)
  // Applied ONLY for one-way/custom drop trips to genuinely low-return remote/village/difficult-mountain drops
  const returnProbability = dropProfile.returnProbability;
  const isOneWayLike = tripType === 'oneway' || tripType === 'custom' || tripType === 'airport';
  const needsEmptyReturnDeadhead =
    isOneWayLike &&
    (dropCategory === 'remote_area' ||
      dropCategory === 'village' ||
      dropCategory === 'difficult_mountain_road');

  // Deadhead back to nearest commercial hub (capped reasonably so fares stay fair)
  const rawDeadheadToHubKm = needsEmptyReturnDeadhead
    ? Math.min(90, Math.max(15, dropHubMatch.estimatedRoadPositioningKm))
    : 0;

  return {
    pickupCategory,
    pickupCategoryLabel: LOCATION_CATEGORY_LABELS[pickupCategory] || 'Normal City',
    dropCategory,
    dropCategoryLabel: LOCATION_CATEGORY_LABELS[dropCategory] || 'Normal City',
    stopCategories,
    terrainType,
    roadMix,
    isDifficultMountainRoute: hasDifficultMountain,
    isHillAreaRoute: hasHillStation,
    isRuralOrRemote: hasRemoteOrVillage,
    isOuterCityRoute: pickupCategory === 'outer_city' || dropCategory === 'outer_city',
    pickupZone: pickupCategory,
    dropZone: dropCategory,
    nearestPickupHub: pickupHubMatch.hub.name,
    nearestDropHub: dropHubMatch.hub.name,
    positioningDistanceKm,
    returnProbability,
    needsEmptyReturnDeadhead,
    emptyReturnDeadheadKm: rawDeadheadToHubKm,
    ruralAdjustmentPct: Math.max(pickupProfile.ruralAdjustmentPct || 0, dropProfile.ruralAdjustmentPct || 0)
  };
}
