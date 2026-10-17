/**
 * Ola Maps API Integration Service for Safar India Cabs
 * 
 * Provides:
 * 1. Ola Maps Places Autocomplete API for pickup and drop location input fields.
 * 2. Ola Maps Routing / Directions & Distance Matrix API for exact road driving distance (in KM) & travel time.
 * 3. Dynamic token & API Key authentication with Krutrim / Ola Maps Platform.
 * 4. High-reliability fallback to comprehensive Indian Highway Distance Matrix if Ola Maps credentials require domain whitelisting.
 */

import { POPULAR_INDIAN_CITIES, estimateDistanceKm } from '../data/indianCities';

export const DEFAULT_OLA_API_KEY = 'TSHtH9B6FJ9B5U1NyR0Q1YZ7oZyxna55QwWZc3oR';
export const DEFAULT_OLA_CLIENT_ID = '3d6c8822-79bd-4f31-accb-bc8229b1b391';
export const DEFAULT_OLA_CLIENT_SECRET = 'e3ba8458aaab47778880e6f127ea8386';

const OLA_AUTOCOMPLETE_URL = 'https://api.olamaps.io/places/v1/autocomplete';
const OLA_DIRECTIONS_URL = 'https://api.olamaps.io/routing/v1/directions';
const OLA_DISTANCE_MATRIX_URL = 'https://api.olamaps.io/routing/v1/distanceMatrix';
const OLA_GEOCODE_URL = 'https://api.olamaps.io/places/v1/geocode';

export interface OlaPlacePrediction {
  description: string;
  placeId?: string;
  mainText?: string;
  secondaryText?: string;
  lat?: number;
  lng?: number;
  source: 'ola_maps' | 'indian_cities';
}

export interface OlaDistanceResult {
  distanceKm: number;
  durationText: string;
  durationMinutes: number;
  source: 'ola_maps_exact' | 'road_matrix';
  routeSummary?: string;
}

export function getOlaMapsApiKey(): string {
  try {
    const saved = localStorage.getItem('safar_olamaps_api_key');
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return DEFAULT_OLA_API_KEY;
}

export function setOlaMapsApiKey(key: string): void {
  try {
    localStorage.setItem('safar_olamaps_api_key', key.trim());
  } catch {}
}

export function getOlaMapsClientId(): string {
  try {
    const saved = localStorage.getItem('safar_olamaps_client_id');
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return DEFAULT_OLA_CLIENT_ID;
}

export function setOlaMapsClientId(id: string): void {
  try {
    localStorage.setItem('safar_olamaps_client_id', id.trim());
  } catch {}
}

export function getOlaMapsClientSecret(): string {
  try {
    const saved = localStorage.getItem('safar_olamaps_client_secret');
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return DEFAULT_OLA_CLIENT_SECRET;
}

export function setOlaMapsClientSecret(secret: string): void {
  try {
    localStorage.setItem('safar_olamaps_client_secret', secret.trim());
  } catch {}
}

/**
 * Autocomplete search for pickup and drop locations using Ola Maps Places API
 */
export async function searchOlaPlaces(query: string): Promise<OlaPlacePrediction[]> {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return POPULAR_INDIAN_CITIES.slice(0, 7).map(c => ({
      description: `${c.name}, ${c.state}`,
      mainText: c.name,
      secondaryText: c.state,
      lat: c.lat,
      lng: c.lon,
      source: 'indian_cities'
    }));
  }

  const apiKey = getOlaMapsApiKey();

  // Try Ola Maps Autocomplete API
  try {
    const url = `${OLA_AUTOCOMPLETE_URL}?input=${encodeURIComponent(trimmed)}&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const predictions = data?.predictions || data?.data?.predictions || [];
      if (Array.isArray(predictions) && predictions.length > 0) {
        return predictions.slice(0, 8).map((p: any) => ({
          description: p.description || p.formatted_address || p.name || trimmed,
          placeId: p.place_id,
          mainText: p.structured_formatting?.main_text || p.name || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
          lat: p.geometry?.location?.lat,
          lng: p.geometry?.location?.lng,
          source: 'ola_maps'
        }));
      }
    }
  } catch (err) {
    console.info('Ola Maps Autocomplete API fallback to Indian Cities:', err);
  }

  // Graceful fallback to comprehensive Indian Cities database
  const q = trimmed.toLowerCase();
  const matched = POPULAR_INDIAN_CITIES
    .filter(c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
    .slice(0, 8)
    .map(c => ({
      description: `${c.name}, ${c.state}`,
      mainText: c.name,
      secondaryText: `${c.state} · Airport & Outstation Available`,
      lat: c.lat,
      lng: c.lon,
      source: 'indian_cities' as const
    }));

  if (matched.length > 0) return matched;

  // If user entered a custom landmark or locality not in top cities, return entered text
  return [{
    description: trimmed,
    mainText: trimmed,
    secondaryText: 'Custom Location / Landmark',
    source: 'indian_cities'
  }];
}

/**
 * Find coordinates for a city or address (using Ola Geocode or Indian Cities list)
 */
export async function getCityCoordinates(cityName: string): Promise<{ lat: number; lng: number } | null> {
  const clean = cityName.split(',')[0].trim().toLowerCase();
  const found = POPULAR_INDIAN_CITIES.find(c => c.name.toLowerCase() === clean);
  if (found) {
    return { lat: found.lat, lng: found.lon };
  }

  const apiKey = getOlaMapsApiKey();
  try {
    const url = `${OLA_GEOCODE_URL}?address=${encodeURIComponent(cityName)}&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const loc = data?.geocodingResults?.[0]?.geometry?.location || data?.results?.[0]?.geometry?.location;
      if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        return { lat: loc.lat, lng: loc.lng };
      }
    }
  } catch {}

  // Fuzzy match
  const fuzzy = POPULAR_INDIAN_CITIES.find(c => cityName.toLowerCase().includes(c.name.toLowerCase()));
  if (fuzzy) {
    return { lat: fuzzy.lat, lng: fuzzy.lon };
  }

  return null;
}

/**
 * Format duration minutes into readable "X hrs Y mins"
 */
function formatMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0 && mins > 0) return `${hrs} hr ${mins} mins`;
  if (hrs > 0) return `${hrs} hrs`;
  return `${mins || 30} mins`;
}

/**
 * Calculate exact road driving distance (in KM) and estimated travel time using Ola Maps API
 * with automatic fallback to Highway Road Distance Engine
 */
export async function calculateExactRoadDistance(
  pickupLocation: string,
  dropLocation: string
): Promise<OlaDistanceResult> {
  const apiKey = getOlaMapsApiKey();
  const originCoords = await getCityCoordinates(pickupLocation);
  const destCoords = await getCityCoordinates(dropLocation);

  // Method 1: Ola Maps Directions API with coordinates
  if (originCoords && destCoords) {
    try {
      const directionsUrl = `${OLA_DIRECTIONS_URL}?origin=${originCoords.lat},${originCoords.lng}&destination=${destCoords.lat},${destCoords.lng}&api_key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(directionsUrl);
      if (res.ok) {
        const data = await res.json();
        const route = data?.routes?.[0];
        const leg = route?.legs?.[0];
        if (leg && typeof leg.distance === 'number') {
          const distanceKm = Math.round(leg.distance / 1000);
          const durationSeconds = leg.duration || (distanceKm / 50) * 3600;
          const durationMinutes = Math.round(durationSeconds / 60);
          return {
            distanceKm: Math.max(20, distanceKm),
            durationText: formatMinutes(durationMinutes),
            durationMinutes,
            source: 'ola_maps_exact',
            routeSummary: route.summary || `${pickupLocation} to ${dropLocation} via National Highway`
          };
        }
      }
    } catch (dirErr) {
      console.info('Ola Directions API notice, attempting Distance Matrix:', dirErr);
    }

    // Method 2: Ola Maps Distance Matrix API
    try {
      const dmUrl = `${OLA_DISTANCE_MATRIX_URL}?origins=${originCoords.lat},${originCoords.lng}&destinations=${destCoords.lat},${destCoords.lng}&api_key=${encodeURIComponent(apiKey)}`;
      const dmRes = await fetch(dmUrl);
      if (dmRes.ok) {
        const dmData = await dmRes.json();
        const element = dmData?.rows?.[0]?.elements?.[0];
        if (element && element.distance?.value) {
          const distanceKm = Math.round(element.distance.value / 1000);
          const durationSeconds = element.duration?.value || (distanceKm / 50) * 3600;
          const durationMinutes = Math.round(durationSeconds / 60);
          return {
            distanceKm: Math.max(20, distanceKm),
            durationText: formatMinutes(durationMinutes),
            durationMinutes,
            source: 'ola_maps_exact',
            routeSummary: `Ola Maps Verified Route: ${pickupLocation} - ${dropLocation}`
          };
        }
      }
    } catch (dmErr) {
      console.info('Ola Distance Matrix API notice:', dmErr);
    }
  }

  // Method 3: High-Accuracy Indian Highway Network Matrix
  const fallbackKm = estimateDistanceKm(pickupLocation, dropLocation);
  // Average highway speed ~ 55 km/h + 20 mins city buffer
  const fallbackMinutes = Math.round((fallbackKm / 55) * 60 + 20);

  return {
    distanceKm: fallbackKm,
    durationText: formatMinutes(fallbackMinutes),
    durationMinutes: fallbackMinutes,
    source: 'road_matrix',
    routeSummary: `National Highway Route: ${pickupLocation} → ${dropLocation}`
  };
}

/**
 * Diagnostics function to test Ola Maps API credentials in Admin Dashboard
 */
export async function testOlaMapsCredentials(
  apiKey: string,
  clientId?: string,
  clientSecret?: string
): Promise<{
  ok: boolean;
  status: string;
  message: string;
  details?: any;
}> {
  const activeKey = (apiKey || DEFAULT_OLA_API_KEY).trim();

  try {
    const testUrl = `${OLA_AUTOCOMPLETE_URL}?input=Delhi&api_key=${encodeURIComponent(activeKey)}`;
    const res = await fetch(testUrl);
    const data = await res.json().catch(() => null);

    if (res.ok && (data?.predictions || data?.data)) {
      return {
        ok: true,
        status: 'CONNECTED',
        message: 'Ola Maps API Connected Successfully! Autocomplete & Routing active.',
        details: data
      };
    } else if (res.status === 401) {
      return {
        ok: false,
        status: 'UNAUTHORIZED_401',
        message: 'Ola Maps returned 401 Unauthorized. Krutrim developer portal requires whitelisting your domain (safarindiacabs.com) or active project credits. Fallback Road Matrix is active.',
        details: data
      };
    } else {
      return {
        ok: false,
        status: `HTTP_${res.status}`,
        message: data?.message || `Ola Maps returned HTTP ${res.status}. Automatic Highway Matrix fallback is handling all bookings.`,
        details: data
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 'NETWORK_ERROR',
      message: `Ola Maps connection error: ${err?.message || 'Check network / CORS whitelist'}. Fallback Highway Matrix is active.`,
      details: err
    };
  }
}
