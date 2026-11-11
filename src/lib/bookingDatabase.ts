import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, defaultDb, handleFirestoreError, OperationType } from './firebase';
import { BookingRecord, PaymentAuditLogRecord } from '../types';

const COUNTER_STORAGE_KEY = 'safar_sic26_confirmed_seq_v2';
const BOOKINGS_STORAGE_KEY = 'safar_bookings';
const PAYMENT_LOGS_STORAGE_KEY = 'safar_payment_audit_logs_v1';
const SERIES_YEAR_CODE = '26';
const SERIES_PREFIX = `SIC${SERIES_YEAR_CODE}`; // 'SIC26'

// Optional Supabase client when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured
const supabaseUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabaseClient: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Normalizes any user-entered Booking ID query into canonical uppercase format (e.g. "sic-2604" or "2604" -> "SIC2604")
 */
export function normalizeBookingIdInput(rawInput: string): string {
  const cleaned = String(rawInput || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('SIC')) {
    return cleaned;
  }
  // If user typed just digits like "2604" or "04"
  if (/^\d{4,6}$/.test(cleaned) && cleaned.startsWith('26')) {
    return `SIC${cleaned}`;
  }
  if (/^\d{1,3}$/.test(cleaned)) {
    return `${SERIES_PREFIX}${cleaned.padStart(2, '0')}`;
  }
  return cleaned;
}

/**
 * Formats a sequence number (1, 2, 3, ...) into the official SafarIndiaCabs
 * sequential Booking ID format: SIC2601, SIC2602, SIC2603, SIC2604, ...
 */
export function formatSequentialBookingId(sequenceNum: number): string {
  const cleanSeq = Math.max(1, Math.floor(Number(sequenceNum) || 1));
  const padded = String(cleanSeq).padStart(2, '0');
  return `${SERIES_PREFIX}${padded}`;
}

/**
 * Extracts the sequential numeric suffix from a Booking ID if it matches SIC26XX
 * e.g. 'SIC2601' -> 1, 'SIC2604' -> 4, 'SIC-2614' -> 14
 */
export function parseSequentialNumberFromBookingId(bookingId: string): number {
  if (!bookingId) return 0;
  const normalized = String(bookingId).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = normalized.match(/^SIC26(\d{1,5})$/);
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  if (!Number.isFinite(val) || val <= 0 || val > 9000) return 0;
  return val;
}

/**
 * Computes the highest existing sequence number across confirmed bookings and localStorage
 */
export function getHighestKnownSequence(bookingsList?: BookingRecord[]): number {
  let maxSeq = 4; // Seeded baseline: SIC2601, SIC2602, SIC2603, SIC2604

  try {
    const savedCounter = Number(localStorage.getItem(COUNTER_STORAGE_KEY) || '0');
    if (Number.isFinite(savedCounter) && savedCounter > maxSeq) {
      maxSeq = savedCounter;
    }
  } catch {}

  const inspectList = (list: BookingRecord[]) => {
    for (const b of list) {
      if (!b || !b.id) continue;
      const seq = parseSequentialNumberFromBookingId(b.id);
      if (seq > maxSeq) {
        maxSeq = seq;
      }
    }
  };

  if (Array.isArray(bookingsList)) {
    inspectList(bookingsList);
  }

  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inspectList(parsed);
      }
    }
  } catch {}

  return maxSeq;
}

/**
 * Synchronously previews what the next sequential Booking ID will be (e.g., SIC2605)
 */
export function peekNextSequentialBookingId(bookingsList?: BookingRecord[]): string {
  const highest = getHighestKnownSequence(bookingsList);
  return formatSequentialBookingId(highest + 1);
}

/**
 * Reserves the next unique sequential Booking ID (e.g., SIC2605, SIC2606)
 * by atomically checking/incrementing Firestore `booking_counters/sic_26_series`
 * with a fast 2.5s timeout fallback so checkout never hangs if offline.
 */
export async function generateNextSequentialBookingId(
  bookingsList?: BookingRecord[]
): Promise<string> {
  const localBaseline = getHighestKnownSequence(bookingsList);

  try {
    const counterRef = doc(db, 'booking_counters', 'sic_26_series');
    const firestorePromise = runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const currentRemote = snap.exists() ? Number(snap.data()?.currentSequence || 4) : 4;
      const nextSeq = Math.max(localBaseline, currentRemote) + 1;
      const nextId = formatSequentialBookingId(nextSeq);
      transaction.set(counterRef, {
        seriesPrefix: SERIES_PREFIX,
        currentSequence: nextSeq,
        lastBookingId: nextId,
        updatedAt: new Date().toISOString()
      });
      return { nextSeq, nextId };
    });

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    const result = await Promise.race([firestorePromise, timeoutPromise]);

    if (result && result.nextId) {
      try {
        localStorage.setItem(COUNTER_STORAGE_KEY, String(result.nextSeq));
      } catch {}
      return result.nextId;
    }
  } catch {}

  const fallbackSeq = localBaseline + 1;
  try {
    localStorage.setItem(COUNTER_STORAGE_KEY, String(fallbackSeq));
  } catch {}
  return formatSequentialBookingId(fallbackSeq);
}

/**
 * Builds uppercase search tokens for fast Firestore search by Booking ID, phone, customer name, or route cities
 */
function buildSearchKeywords(booking: BookingRecord, cleanId: string, cleanPhone: string): string[] {
  const tokenSet = new Set<string>();
  tokenSet.add(cleanId);
  const numericSuffix = cleanId.replace(/^SIC/i, '');
  if (numericSuffix) tokenSet.add(numericSuffix);
  const seq = parseSequentialNumberFromBookingId(cleanId);
  if (seq > 0) {
    tokenSet.add(String(seq));
    tokenSet.add(`26${String(seq).padStart(2, '0')}`);
  }
  if (cleanPhone) {
    tokenSet.add(cleanPhone);
  }
  const addWords = (text?: string) => {
    if (!text) return;
    const upper = String(text).toUpperCase().trim();
    if (upper.length >= 2 && upper.length <= 40) {
      tokenSet.add(upper);
    }
    upper
      .split(/[\s,/-]+/)
      .map((w) => w.replace(/[^A-Z0-9]/g, ''))
      .filter((w) => w.length >= 2)
      .slice(0, 8)
      .forEach((w) => tokenSet.add(w));
  };

  addWords(booking.customerName);
  addWords(booking.pickupCity);
  addWords(booking.dropCity);
  if (booking.driverPhone) {
    tokenSet.add(String(booking.driverPhone).replace(/\D/g, '').slice(-10));
  }

  return Array.from(tokenSet).filter(Boolean).slice(0, 35);
}

function validateIndianLatLng(
  coords?: { lat: number; lng: number } | null
): { lat: number; lng: number } | undefined {
  if (!coords || typeof coords !== 'object') return undefined;
  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < 6.0 ||
    lat > 38.5 ||
    lng < 67.0 ||
    lng > 98.5
  ) {
    return undefined;
  }
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6))
  };
}

/**
 * Recursively strips `undefined` values and converts any nested arrays into Firestore-safe objects
 * so `setDoc()` NEVER throws "Nested arrays are not supported" or "Unsupported field value: undefined".
 */
function deepCleanFirestoreValue(val: unknown): unknown {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : 0;
  }
  if (typeof val === 'string' || typeof val === 'boolean') {
    return val;
  }
  if (Array.isArray(val)) {
    const cleanedArr: unknown[] = [];
    for (const item of val) {
      if (item === undefined) continue;
      if (Array.isArray(item)) {
        // Convert [lat, lng] pair into Firestore-safe map { lat, lng }
        if (
          item.length >= 2 &&
          Number.isFinite(Number(item[0])) &&
          Number.isFinite(Number(item[1]))
        ) {
          cleanedArr.push({
            lat: Number(Number(item[0]).toFixed(5)),
            lng: Number(Number(item[1]).toFixed(5))
          });
        }
      } else {
        const cleanedItem = deepCleanFirestoreValue(item);
        if (cleanedItem !== undefined) {
          cleanedArr.push(cleanedItem);
        }
      }
    }
    return cleanedArr;
  }
  if (typeof val === 'object') {
    const cleanedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v === undefined) continue;
      const cleanedVal = deepCleanFirestoreValue(v);
      if (cleanedVal !== undefined) {
        cleanedObj[k] = cleanedVal;
      }
    }
    return cleanedObj;
  }
  return undefined;
}

/**
 * Sanitizes a BookingRecord for Firestore (removes undefined fields, converts nested arrays to object arrays,
 * and adds standard aliases for cross-panel compatibility).
 */
export function sanitizeBookingForFirestore(booking: BookingRecord): Record<string, unknown> {
  const cleanId = normalizeBookingIdInput(booking.id) || formatSequentialBookingId(getHighestKnownSequence() + 1);
  const sequenceNumber = parseSequentialNumberFromBookingId(cleanId) || booking.sequenceNumber || 1;
  const cleanPhone = String(booking.customerPhone || '').replace(/\D/g, '').slice(-10) || '7710080992';
  const validTripType = ['oneway', 'roundtrip', 'local', 'airport'].includes(booking.tripType)
    ? booking.tripType
    : 'oneway';
  const validStatus = ['confirmed', 'completed', 'cancelled'].includes(booking.status)
    ? booking.status
    : 'confirmed';

  const searchKeywords = buildSearchKeywords(booking, cleanId, cleanPhone);
  const nowIso = new Date().toISOString();

  const validPickupCoords = validateIndianLatLng(booking.pickupCoords);
  const validDropCoords = validateIndianLatLng(booking.dropCoords);

  // Convert nested array routeGeometry [[lat, lng]] into Firestore-supported object array [{ lat, lng }]
  const routeGeometryPoints = Array.isArray(booking.routeGeometry)
    ? booking.routeGeometry
        .filter(
          (pt) =>
            Array.isArray(pt) &&
            pt.length >= 2 &&
            Number.isFinite(Number(pt[0])) &&
            Number.isFinite(Number(pt[1])) &&
            Number(pt[0]) >= 6.0 &&
            Number(pt[0]) <= 38.5 &&
            Number(pt[1]) >= 67.0 &&
            Number(pt[1]) <= 98.5
        )
        .slice(0, 40)
        .map((pt) => ({
          lat: Number(Number(pt[0]).toFixed(5)),
          lng: Number(Number(pt[1]).toFixed(5))
        }))
    : undefined;

  const pickupCityClean = String(booking.pickupCity || 'Delhi NCR').trim().slice(0, 115);
  const dropCityClean = String(booking.dropCity || booking.pickupCity || 'Local / Destination').trim().slice(0, 115);
  const cabNameClean = String(booking.cabName || 'Comfort Sedan AC (Maruti Dzire)').trim().slice(0, 115);
  const totalFareNum = Math.max(0, Math.min(10000000, Math.round(Number(booking.totalFare) || 0)));
  const advancePaidNum = Math.max(0, Math.round(Number(booking.advancePaid) || 0));
  const balanceDueNum = Math.max(0, Math.round(Number(booking.balanceDue) || 0));
  const createdAtIso = String(booking.createdAt || nowIso).trim().slice(0, 58);

  const rawObj: Record<string, unknown> = {
    ...booking,
    id: cleanId.slice(0, 26),
    bookingId: cleanId.slice(0, 26),
    bookingReference: cleanId.slice(0, 26),
    sequenceNumber,
    searchKeywords,
    tripType: validTripType,
    pickupCity: pickupCityClean,
    dropCity: dropCityClean,
    from: pickupCityClean,
    to: dropCityClean,
    pickupAddress: booking.pickupAddress ? String(booking.pickupAddress).trim().slice(0, 240) : pickupCityClean,
    dropAddress: booking.dropAddress ? String(booking.dropAddress).trim().slice(0, 240) : dropCityClean,
    pickupDate: String(booking.pickupDate || nowIso.slice(0, 10)).trim().slice(0, 36),
    pickupTime: String(booking.pickupTime || '08:00 AM').trim().slice(0, 36),
    cabId: String(booking.cabId || 'sedan').trim().slice(0, 38),
    cabName: cabNameClean,
    vehicleType: cabNameClean,
    distanceKm: Math.max(0, Math.min(50000, Number(booking.distanceKm) || 0)),
    baseFare: Math.max(0, Math.min(10000000, Math.round(Number(booking.baseFare) || 0))),
    driverAllowance: Math.max(0, Math.round(Number(booking.driverAllowance) || 0)),
    tollsAndTaxes: Math.max(0, Math.round(Number(booking.tollsAndTaxes) || 0)),
    highwayToll: booking.highwayToll !== undefined ? Math.max(0, Math.round(Number(booking.highwayToll) || 0)) : 0,
    statePermitTax: booking.statePermitTax !== undefined ? Math.max(0, Math.round(Number(booking.statePermitTax) || 0)) : 0,
    parkingCharge: booking.parkingCharge !== undefined ? Math.max(0, Math.round(Number(booking.parkingCharge) || 0)) : 0,
    hillStationCharge: booking.hillStationCharge !== undefined ? Math.max(0, Math.round(Number(booking.hillStationCharge) || 0)) : 0,
    nightCharge: booking.nightCharge !== undefined ? Math.max(0, Math.round(Number(booking.nightCharge) || 0)) : 0,
    actualOdometerKm: booking.actualOdometerKm !== undefined ? Math.max(0, Math.round(Number(booking.actualOdometerKm) || 0)) : undefined,
    extraKmDriven: booking.extraKmDriven !== undefined ? Math.max(0, Math.round(Number(booking.extraKmDriven) || 0)) : undefined,
    extraKmCharge: booking.extraKmCharge !== undefined ? Math.max(0, Math.round(Number(booking.extraKmCharge) || 0)) : undefined,
    extraTollCharges: booking.extraTollCharges !== undefined ? Math.max(0, Math.round(Number(booking.extraTollCharges) || 0)) : undefined,
    otherSurcharges: booking.otherSurcharges !== undefined ? Math.max(0, Math.round(Number(booking.otherSurcharges) || 0)) : undefined,
    completedAt: booking.completedAt ? String(booking.completedAt).trim().slice(0, 58) : undefined,
    gstAmount: Math.max(0, Math.round(Number(booking.gstAmount) || 0)),
    totalFare: totalFareNum,
    advancePaid: advancePaidNum,
    balanceDue: balanceDueNum,
    remainingBalance: balanceDueNum,
    customerName: String(booking.customerName || 'Verified Passenger').trim().slice(0, 115),
    customerPhone: cleanPhone,
    customerMobile: cleanPhone,
    status: validStatus,
    pickupCoords: validPickupCoords,
    dropCoords: validDropCoords,
    routeGeometryPoints,
    createdAt: createdAtIso,
    timestamp: Date.parse(createdAtIso) || Date.now(),
    updatedAt: nowIso
  };

  // Remove nested array `routeGeometry` so Firestore setDoc never fails
  delete rawObj.routeGeometry;

  return (deepCleanFirestoreValue(rawObj) as Record<string, unknown>) || {};
}

/**
 * Normalizes a raw Firestore document (or API object) back into a clean BookingRecord
 */
export function normalizeFirestoreDocToBooking(
  rawData: Record<string, any> | undefined | null,
  fallbackDocId?: string
): BookingRecord | null {
  if (!rawData || typeof rawData !== 'object') return null;
  const rawId = String(rawData.id || rawData.bookingId || rawData.bookingReference || fallbackDocId || '').trim();
  if (!rawId || rawId.includes('DEMO') || rawId.includes('TEST')) return null;

  const cleanId = normalizeBookingIdInput(rawId) || rawId;

  // Convert Firestore Timestamp or numeric timestamp to ISO string if needed
  const resolveIso = (val: any, fallback: string): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val?.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch {
        return fallback;
      }
    }
    if (typeof val?.seconds === 'number') {
      return new Date(val.seconds * 1000).toISOString();
    }
    if (typeof val === 'number') {
      return new Date(val).toISOString();
    }
    return fallback;
  };

  const nowIso = new Date().toISOString();
  const createdAt = resolveIso(rawData.createdAt || rawData.timestamp, nowIso);
  const updatedAt = rawData.updatedAt ? resolveIso(rawData.updatedAt, createdAt) : undefined;
  const completedAt = rawData.completedAt ? resolveIso(rawData.completedAt, createdAt) : undefined;

  const rawStatus = String(rawData.status || 'confirmed').toLowerCase();
  const status: 'confirmed' | 'completed' | 'cancelled' =
    rawStatus === 'completed'
      ? 'completed'
      : rawStatus === 'cancelled'
      ? 'cancelled'
      : 'confirmed';

  // Reconstruct routeGeometry from routeGeometryPoints if present
  let routeGeometry: Array<[number, number]> | undefined = undefined;
  if (Array.isArray(rawData.routeGeometry)) {
    routeGeometry = rawData.routeGeometry.filter(
      (pt: any) => Array.isArray(pt) && pt.length >= 2
    );
  } else if (Array.isArray(rawData.routeGeometryPoints)) {
    routeGeometry = rawData.routeGeometryPoints
      .filter((pt: any) => pt && typeof pt.lat === 'number' && typeof pt.lng === 'number')
      .map((pt: any) => [Number(pt.lat), Number(pt.lng)] as [number, number]);
  }

  const totalFare = Math.max(0, Math.round(Number(rawData.totalFare ?? rawData.fare ?? rawData.amount ?? 0)));
  const advancePaid = Math.max(0, Math.round(Number(rawData.advancePaid ?? rawData.advanceAmount ?? 0)));
  const balanceDue = Math.max(
    0,
    Math.round(
      Number(
        rawData.balanceDue ??
          rawData.remainingBalance ??
          (status === 'completed' ? 0 : Math.max(0, totalFare - advancePaid))
      )
    )
  );

  return {
    ...(rawData as unknown as BookingRecord),
    id: cleanId,
    bookingId: cleanId,
    bookingReference: cleanId,
    tripType: ['oneway', 'roundtrip', 'local', 'airport'].includes(rawData.tripType)
      ? rawData.tripType
      : 'oneway',
    pickupCity: String(rawData.pickupCity || rawData.from || rawData.pickup || 'Delhi NCR'),
    dropCity: String(rawData.dropCity || rawData.to || rawData.drop || rawData.pickupCity || 'Destination'),
    pickupAddress: rawData.pickupAddress || rawData.pickupCity || '',
    dropAddress: rawData.dropAddress || rawData.dropCity || '',
    pickupDate: String(rawData.pickupDate || createdAt.slice(0, 10)),
    pickupTime: String(rawData.pickupTime || '08:00 AM'),
    cabId: String(rawData.cabId || 'sedan') as BookingRecord['cabId'],
    cabName: String(rawData.cabName || rawData.vehicleType || 'Sedan AC'),
    distanceKm: Math.max(0, Number(rawData.distanceKm) || 0),
    baseFare: Math.max(0, Math.round(Number(rawData.baseFare) || 0)),
    driverAllowance: Math.max(0, Math.round(Number(rawData.driverAllowance) || 0)),
    tollsAndTaxes: Math.max(0, Math.round(Number(rawData.tollsAndTaxes) || 0)),
    highwayToll: rawData.highwayToll !== undefined ? Number(rawData.highwayToll) : undefined,
    statePermitTax: rawData.statePermitTax !== undefined ? Number(rawData.statePermitTax) : undefined,
    parkingCharge: rawData.parkingCharge !== undefined ? Number(rawData.parkingCharge) : undefined,
    hillStationCharge: rawData.hillStationCharge !== undefined ? Number(rawData.hillStationCharge) : undefined,
    gstAmount: Math.max(0, Math.round(Number(rawData.gstAmount) || 0)),
    totalFare,
    advancePaid,
    balanceDue,
    paymentMode: rawData.paymentMode || (balanceDue === 0 ? 'full' : 'advance_20'),
    paymentMethod: String(rawData.paymentMethod || 'Razorpay Verified'),
    transactionId: String(rawData.transactionId || ''),
    customerName: String(rawData.customerName || 'Verified Passenger'),
    customerPhone: String(rawData.customerPhone || rawData.customerMobile || rawData.phone || '').replace(/\D/g, '').slice(-10) || '7710080992',
    status,
    driverName: rawData.driverName || rawData.driver?.name || undefined,
    driverPhone: rawData.driverPhone || rawData.driver?.phone || undefined,
    driverVehicleModel: rawData.driverVehicleModel || rawData.driver?.vehicleModel || undefined,
    driverVehicleNo: rawData.driverVehicleNo || rawData.driver?.vehicleNo || rawData.vehicleNumber || undefined,
    routeGeometry,
    createdAt,
    updatedAt,
    completedAt
  };
}

function sortBookingsNewestFirst(list: BookingRecord[]): BookingRecord[] {
  return [...list].sort((a, b) => {
    const seqA = parseSequentialNumberFromBookingId(a.id);
    const seqB = parseSequentialNumberFromBookingId(b.id);
    const tA = Date.parse(a.createdAt || '') || 0;
    const tB = Date.parse(b.createdAt || '') || 0;
    if (tB !== tA) return tB - tA;
    return seqB - seqA;
  });
}

/**
 * Saves a booking to localStorage list cleanly without duplicates
 */
export function upsertBookingInLocalStorage(booking: BookingRecord): void {
  if (!booking || !booking.id) return;
  const cleanId = normalizeBookingIdInput(booking.id) || booking.id;
  const normalizedBooking: BookingRecord = {
    ...booking,
    id: cleanId,
    bookingId: cleanId,
    bookingReference: cleanId
  };
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    const existing: BookingRecord[] = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];
    const idx = list.findIndex((b) => normalizeBookingIdInput(b.id) === cleanId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...normalizedBooking };
    } else {
      list.unshift(normalizedBooking);
    }
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Saves or updates a BookingRecord in Firebase Firestore (`bookings/{id}`),
 * local storage, backend API (`/api/bookings`), and Supabase (`bookings` table, if configured).
 */
export async function saveBookingToCloudDatabase(booking: BookingRecord): Promise<void> {
  if (!booking || !booking.id) return;

  const cleanId = normalizeBookingIdInput(booking.id) || booking.id;
  const normalizedBooking: BookingRecord = {
    ...booking,
    id: cleanId,
    bookingId: cleanId,
    bookingReference: cleanId
  };

  // Always persist immediately to localStorage as well
  upsertBookingInLocalStorage(normalizedBooking);

  const seq = parseSequentialNumberFromBookingId(cleanId);
  if (seq > 0) {
    try {
      const currentSaved = Number(localStorage.getItem(COUNTER_STORAGE_KEY) || '0');
      if (seq > currentSaved) {
        localStorage.setItem(COUNTER_STORAGE_KEY, String(seq));
      }
    } catch {}

    // Update Firestore counter best-effort
    try {
      const counterRef = doc(db, 'booking_counters', 'sic_26_series');
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(counterRef);
        const currentRemote = snap.exists() ? Number(snap.data()?.currentSequence || 4) : 4;
        const resolvedSeq = Math.max(seq, currentRemote);
        transaction.set(counterRef, {
          seriesPrefix: SERIES_PREFIX,
          currentSequence: resolvedSeq,
          lastBookingId: formatSequentialBookingId(resolvedSeq),
          updatedAt: new Date().toISOString()
        });
      });
    } catch {}
  }

  // 1. Persist to Firebase Firestore immediately (both named db and defaultDb if present)
  const docPath = `bookings/${cleanId}`;
  const cleanData = sanitizeBookingForFirestore(normalizedBooking);
  try {
    await setDoc(doc(db, 'bookings', cleanId), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }

  if (defaultDb) {
    setDoc(doc(defaultDb, 'bookings', cleanId), cleanData, { merge: true }).catch(() => {});
  }

  // 2. Sync with backend /api/bookings best-effort
  try {
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking: normalizedBooking })
    }).catch(() => {});
  } catch {}

  // 3. Persist to Supabase `bookings` table if configured
  if (supabaseClient) {
    try {
      await supabaseClient.from('bookings').upsert(
        {
          id: cleanId,
          sequence_number: seq || null,
          trip_type: normalizedBooking.tripType,
          pickup_city: normalizedBooking.pickupCity,
          drop_city: normalizedBooking.dropCity,
          pickup_address: normalizedBooking.pickupAddress || null,
          drop_address: normalizedBooking.dropAddress || null,
          pickup_coords: normalizedBooking.pickupCoords || null,
          drop_coords: normalizedBooking.dropCoords || null,
          route_provider: normalizedBooking.routeProvider || null,
          route_summary: normalizedBooking.routeSummary || null,
          route_duration_text: normalizedBooking.routeDurationText || null,
          route_geometry: Array.isArray(normalizedBooking.routeGeometry)
            ? normalizedBooking.routeGeometry.slice(0, 40)
            : null,
          fare_snapshot: normalizedBooking.fareSnapshot || null,
          pickup_date: normalizedBooking.pickupDate,
          pickup_time: normalizedBooking.pickupTime,
          cab_id: normalizedBooking.cabId,
          cab_name: normalizedBooking.cabName,
          distance_km: normalizedBooking.distanceKm,
          base_fare: normalizedBooking.baseFare,
          driver_allowance: normalizedBooking.driverAllowance,
          tolls_and_taxes: normalizedBooking.tollsAndTaxes,
          gst_amount: normalizedBooking.gstAmount,
          total_fare: normalizedBooking.totalFare,
          advance_paid: normalizedBooking.advancePaid,
          balance_due: normalizedBooking.balanceDue,
          payment_mode: normalizedBooking.paymentMode,
          payment_method: normalizedBooking.paymentMethod,
          transaction_id: normalizedBooking.transactionId || null,
          customer_name: normalizedBooking.customerName,
          customer_phone: normalizedBooking.customerPhone,
          customer_email: normalizedBooking.customerEmail || null,
          status: normalizedBooking.status,
          driver_name: normalizedBooking.driverName || null,
          driver_phone: normalizedBooking.driverPhone || null,
          driver_vehicle_model: normalizedBooking.driverVehicleModel || null,
          driver_vehicle_no: normalizedBooking.driverVehicleNo || null,
          notes: normalizedBooking.notes || null,
          created_at: normalizedBooking.createdAt
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.warn('Supabase upsert notice:', err);
    }
  }
}

/**
 * Updates driver assignment details and/or booking status in Firestore, backend API, and localStorage
 */
export async function updateBookingDriverAndStatusInCloud(
  bookingId: string,
  updates: Partial<BookingRecord>,
  existingBooking?: BookingRecord
): Promise<BookingRecord | null> {
  const cleanId = normalizeBookingIdInput(bookingId) || bookingId;
  let targetBooking: BookingRecord | null = existingBooking ? { ...existingBooking } : null;

  if (!targetBooking) {
    try {
      const snap = await getDoc(doc(db, 'bookings', cleanId));
      if (snap.exists()) {
        targetBooking = normalizeFirestoreDocToBooking(
          snap.data() as Record<string, any>,
          snap.id
        );
      }
    } catch {}
  }

  if (!targetBooking) {
    try {
      const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
      if (raw) {
        const list: BookingRecord[] = JSON.parse(raw);
        const found = list.find((b) => normalizeBookingIdInput(b.id) === cleanId);
        if (found) targetBooking = found;
      }
    } catch {}
  }

  if (!targetBooking) return null;

  const merged: BookingRecord = {
    ...targetBooking,
    ...updates,
    id: cleanId,
    bookingId: cleanId,
    bookingReference: cleanId,
    updatedAt: new Date().toISOString()
  };

  await saveBookingToCloudDatabase(merged);

  try {
    await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cleanId,
        ...updates
      })
    });
  } catch {}

  return merged;
}

/**
 * Dedicated Admin & Customer Firestore Search:
 * Instantly searches Firestore by Booking ID (e.g. SIC2604), phone number, or customer name.
 */
export async function searchBookingInFirestore(searchQuery: string): Promise<BookingRecord[]> {
  const rawQuery = String(searchQuery || '').trim();
  if (!rawQuery) {
    return fetchBookingsFromCloudDatabase();
  }

  const normalizedId = normalizeBookingIdInput(rawQuery);
  const cleanDigits = rawQuery.replace(/\D/g, '');
  const upperToken = rawQuery.toUpperCase().trim();
  const matchedMap = new Map<string, BookingRecord>();

  const addRecord = (rec: BookingRecord | undefined | null) => {
    if (!rec || !rec.id) return;
    const key = normalizeBookingIdInput(rec.id) || rec.id;
    matchedMap.set(key, {
      ...rec,
      id: key,
      bookingId: key,
      bookingReference: key
    });
  };

  // 1. Direct O(1) Document lookup in Firestore `bookings/{normalizedId}`
  if (normalizedId.startsWith('SIC')) {
    try {
      const directSnap = await getDoc(doc(db, 'bookings', normalizedId));
      if (directSnap.exists()) {
        addRecord(normalizeFirestoreDocToBooking(directSnap.data() as Record<string, any>, directSnap.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `bookings/${normalizedId}`);
    }

    try {
      const qByBookingId = query(
        collection(db, 'bookings'),
        where('bookingId', '==', normalizedId),
        limit(10)
      );
      const snapByBookingId = await getDocs(qByBookingId);
      snapByBookingId.forEach((d) =>
        addRecord(normalizeFirestoreDocToBooking(d.data() as Record<string, any>, d.id))
      );
    } catch {}

    try {
      const qById = query(
        collection(db, 'bookings'),
        where('id', '==', normalizedId),
        limit(10)
      );
      const snapById = await getDocs(qById);
      snapById.forEach((d) =>
        addRecord(normalizeFirestoreDocToBooking(d.data() as Record<string, any>, d.id))
      );
    } catch {}
  }

  // 2. Phone number lookup if 10-digit mobile entered
  if (cleanDigits.length >= 10) {
    const phone10 = cleanDigits.slice(-10);
    try {
      const qPhone = query(
        collection(db, 'bookings'),
        where('customerPhone', '==', phone10),
        limit(25)
      );
      const snapPhone = await getDocs(qPhone);
      snapPhone.forEach((d) =>
        addRecord(normalizeFirestoreDocToBooking(d.data() as Record<string, any>, d.id))
      );
    } catch {}
  }

  // 3. Keyword array lookup (`searchKeywords` array-contains)
  if (upperToken.length >= 2) {
    try {
      const qKeyword = query(
        collection(db, 'bookings'),
        where('searchKeywords', 'array-contains', normalizedId.startsWith('SIC') ? normalizedId : upperToken),
        limit(25)
      );
      const snapKeyword = await getDocs(qKeyword);
      snapKeyword.forEach((d) =>
        addRecord(normalizeFirestoreDocToBooking(d.data() as Record<string, any>, d.id))
      );
    } catch {}
  }

  // 4. Fallback scan across all Firestore documents + Backend `/api/bookings` + localStorage
  if (matchedMap.size === 0) {
    try {
      const allCloud = await fetchBookingsFromCloudDatabase();
      const qLower = rawQuery.toLowerCase();
      for (const b of allCloud) {
        const bId = normalizeBookingIdInput(b.id);
        if (
          bId === normalizedId ||
          bId.toLowerCase().includes(qLower) ||
          (b.customerPhone && b.customerPhone.includes(cleanDigits && cleanDigits.length >= 4 ? cleanDigits : rawQuery)) ||
          (b.customerName && b.customerName.toLowerCase().includes(qLower)) ||
          (b.pickupCity && b.pickupCity.toLowerCase().includes(qLower)) ||
          (b.dropCity && b.dropCity.toLowerCase().includes(qLower))
        ) {
          addRecord(b);
        }
      }
    } catch {}
  }

  return sortBookingsNewestFirst(Array.from(matchedMap.values()));
}

/**
 * Real-time Firestore listener (`onSnapshot`) on the entire `bookings` collection
 * (without restrictive orderBy filters that could omit documents) + periodic `/api/bookings` sync
 * so the Admin Panel and Customer App receive all incoming bookings in real time.
 */
export function subscribeToBookingsFromCloudDatabase(
  onUpdate: (bookings: BookingRecord[]) => void
): () => void {
  const combinedMap = new Map<string, BookingRecord>();

  const emitCombined = () => {
    const sorted = sortBookingsNewestFirst(Array.from(combinedMap.values()));
    onUpdate(sorted);
  };

  const upsertIntoMap = (b: BookingRecord | null | undefined) => {
    if (!b || !b.id) return;
    const cleanId = normalizeBookingIdInput(b.id) || b.id;
    const existing = combinedMap.get(cleanId);
    if (!existing) {
      combinedMap.set(cleanId, b);
      return;
    }
    const existingMs = Date.parse(existing.updatedAt || existing.completedAt || existing.createdAt || '') || 0;
    const nextMs = Date.parse(b.updatedAt || b.completedAt || b.createdAt || '') || 0;
    const primary = nextMs >= existingMs ? b : existing;
    const secondary = nextMs >= existingMs ? existing : b;
    combinedMap.set(cleanId, {
      ...secondary,
      ...primary,
      status:
        existing.status === 'completed' || b.status === 'completed'
          ? 'completed'
          : existing.status === 'cancelled' || b.status === 'cancelled'
          ? 'cancelled'
          : primary.status
    });
  };

  // Listen to primary Firestore database (`bookings` collection)
  const bookingsRef = collection(db, 'bookings');
  const unsubscribePrimary = onSnapshot(
    bookingsRef,
    (snapshot) => {
      snapshot.forEach((docSnap) => {
        const parsed = normalizeFirestoreDocToBooking(
          docSnap.data() as Record<string, any>,
          docSnap.id
        );
        if (parsed) {
          upsertIntoMap(parsed);
          upsertBookingInLocalStorage(parsed);
        }
      });
      emitCombined();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    }
  );

  // Also listen to defaultDb if distinct
  let unsubscribeDefault: (() => void) | null = null;
  if (defaultDb) {
    try {
      unsubscribeDefault = onSnapshot(
        collection(defaultDb, 'bookings'),
        (snapshot) => {
          snapshot.forEach((docSnap) => {
            const parsed = normalizeFirestoreDocToBooking(
              docSnap.data() as Record<string, any>,
              docSnap.id
            );
            if (parsed) {
              upsertIntoMap(parsed);
              upsertBookingInLocalStorage(parsed);
            }
          });
          emitCombined();
        },
        () => {}
      );
    } catch {}
  }

  // Also sync with backend `/api/bookings` on subscribe and every 8 seconds
  const syncFromServer = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.bookings)) {
          let changed = false;
          for (const raw of data.bookings) {
            const parsed = normalizeFirestoreDocToBooking(raw, raw?.id);
            if (parsed) {
              const prev = combinedMap.get(parsed.id);
              upsertIntoMap(parsed);
              if (!prev) {
                changed = true;
                // Backfill server booking into Firestore so all listeners see it
                const cleanData = sanitizeBookingForFirestore(parsed);
                setDoc(doc(db, 'bookings', parsed.id), cleanData, { merge: true }).catch(() => {});
              }
            }
          }
          if (changed) emitCombined();
        }
      }
    } catch {}
  };

  syncFromServer();
  const pollInterval = setInterval(syncFromServer, 8000);

  return () => {
    unsubscribePrimary();
    if (unsubscribeDefault) unsubscribeDefault();
    clearInterval(pollInterval);
  };
}

/**
 * Fetches all bookings from Firebase Firestore (`bookings` collection), `/api/bookings`, and Supabase.
 */
export async function fetchBookingsFromCloudDatabase(): Promise<BookingRecord[]> {
  const resultsMap = new Map<string, BookingRecord>();

  const addRecord = (rec: BookingRecord | null | undefined) => {
    if (!rec || !rec.id) return;
    const cleanId = normalizeBookingIdInput(rec.id) || rec.id;
    const existing = resultsMap.get(cleanId);
    if (!existing) {
      resultsMap.set(cleanId, rec);
      return;
    }
    const existingMs = Date.parse(existing.updatedAt || existing.completedAt || existing.createdAt || '') || 0;
    const nextMs = Date.parse(rec.updatedAt || rec.completedAt || rec.createdAt || '') || 0;
    resultsMap.set(cleanId, nextMs >= existingMs ? { ...existing, ...rec } : { ...rec, ...existing });
  };

  // 1. Read all documents from Firebase Firestore `bookings` collection (no orderBy filter so no docs are skipped)
  try {
    const snap = await getDocs(collection(db, 'bookings'));
    snap.forEach((docSnap) => {
      const parsed = normalizeFirestoreDocToBooking(
        docSnap.data() as Record<string, any>,
        docSnap.id
      );
      if (parsed) {
        addRecord(parsed);
        upsertBookingInLocalStorage(parsed);
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bookings');
  }

  // 1b. Also check defaultDb if available
  if (defaultDb) {
    try {
      const snapDefault = await getDocs(collection(defaultDb, 'bookings'));
      snapDefault.forEach((docSnap) => {
        const parsed = normalizeFirestoreDocToBooking(
          docSnap.data() as Record<string, any>,
          docSnap.id
        );
        if (parsed) {
          addRecord(parsed);
          upsertBookingInLocalStorage(parsed);
        }
      });
    } catch {}
  }

  // 2. Also read from `/api/bookings` and backfill to Firestore
  try {
    const res = await fetch('/api/bookings');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.bookings)) {
        for (const raw of data.bookings) {
          const parsed = normalizeFirestoreDocToBooking(raw, raw?.id);
          if (parsed) {
            const wasInFirestore = resultsMap.has(parsed.id);
            addRecord(parsed);
            if (!wasInFirestore) {
              const cleanData = sanitizeBookingForFirestore(parsed);
              setDoc(doc(db, 'bookings', parsed.id), cleanData, { merge: true }).catch(() => {});
            }
          }
        }
      }
    }
  } catch {}

  // 3. Read from Supabase if configured
  if (supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (Array.isArray(data)) {
        for (const row of data) {
          const cleanId = normalizeBookingIdInput(row.id) || row.id;
          if (!resultsMap.has(cleanId)) {
            addRecord({
              id: cleanId,
              bookingId: cleanId,
              bookingReference: cleanId,
              tripType: row.trip_type || 'oneway',
              pickupCity: row.pickup_city,
              dropCity: row.drop_city,
              pickupAddress: row.pickup_address || undefined,
              dropAddress: row.drop_address || undefined,
              pickupDate: row.pickup_date,
              pickupTime: row.pickup_time,
              cabId: row.cab_id || 'sedan',
              cabName: row.cab_name || 'Sedan AC',
              distanceKm: Number(row.distance_km) || 0,
              baseFare: Number(row.base_fare) || 0,
              driverAllowance: Number(row.driver_allowance) || 0,
              tollsAndTaxes: Number(row.tolls_and_taxes) || 0,
              gstAmount: Number(row.gst_amount) || 0,
              totalFare: Number(row.total_fare) || 0,
              advancePaid: Number(row.advance_paid) || 0,
              balanceDue: Number(row.balance_due) || 0,
              paymentMode: row.payment_mode || 'advance_20',
              paymentMethod: row.payment_method || 'upi_razorpay',
              transactionId: row.transaction_id || '',
              customerName: row.customer_name,
              customerPhone: row.customer_phone,
              customerEmail: row.customer_email || undefined,
              status: row.status || 'confirmed',
              driverName: row.driver_name || undefined,
              driverPhone: row.driver_phone || undefined,
              driverVehicleModel: row.driver_vehicle_model || undefined,
              driverVehicleNo: row.driver_vehicle_no || undefined,
              notes: row.notes || undefined,
              createdAt: row.created_at || new Date().toISOString()
            });
          }
        }
      }
    } catch {}
  }

  // 4. Also merge localStorage bookings so local state is never lost
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (raw) {
      const localList: BookingRecord[] = JSON.parse(raw);
      if (Array.isArray(localList)) {
        for (const item of localList) {
          const parsed = normalizeFirestoreDocToBooking(item as Record<string, any>, item?.id);
          if (parsed && !resultsMap.has(parsed.id)) {
            addRecord(parsed);
          }
        }
      }
    }
  } catch {}

  return sortBookingsNewestFirst(Array.from(resultsMap.values()));
}

/**
 * Persists a PaymentAuditLogRecord to Firestore (`payment_logs/{id}`) and localStorage
 */
export async function savePaymentAuditLogToCloud(log: PaymentAuditLogRecord): Promise<void> {
  if (!log || !log.id) return;

  const cleanLog: PaymentAuditLogRecord = {
    id: String(log.id).slice(0, 80),
    bookingId: normalizeBookingIdInput(log.bookingId) || String(log.bookingId || 'PENDING').slice(0, 36),
    customerName: String(log.customerName || 'Guest Passenger').slice(0, 110),
    customerPhone: String(log.customerPhone || '').replace(/\D/g, '').slice(-10),
    bookingAmount: Math.max(0, Math.round(Number(log.bookingAmount) || 0)),
    advanceAmount: Math.max(0, Math.round(Number(log.advanceAmount) || 0)),
    payableAmount: Math.max(0, Math.round(Number(log.payableAmount) || 0)),
    razorpayOrderId: String(log.razorpayOrderId || '').slice(0, 80),
    paymentId: String(log.paymentId || '').slice(0, 80),
    qrId: String(log.qrId || '').slice(0, 80),
    paymentMethod: String(log.paymentMethod || 'upi').slice(0, 60),
    paymentStatus: log.paymentStatus || 'order_created',
    timestamp: String(log.timestamp || new Date().toISOString()).slice(0, 60),
    failureReason: String(log.failureReason || '').slice(0, 240),
    gatewayResponseSummary: String(log.gatewayResponseSummary || '').slice(0, 280),
    retryAttempts: Math.max(0, Math.round(Number(log.retryAttempts) || 0)),
    webhookVerified: Boolean(log.webhookVerified)
  };

  try {
    const raw = localStorage.getItem(PAYMENT_LOGS_STORAGE_KEY);
    const list: PaymentAuditLogRecord[] = raw ? JSON.parse(raw) : [];
    const safeList = Array.isArray(list) ? list : [];
    const filtered = safeList.filter((item) => item && item.id !== cleanLog.id);
    filtered.unshift(cleanLog);
    localStorage.setItem(PAYMENT_LOGS_STORAGE_KEY, JSON.stringify(filtered.slice(0, 200)));
  } catch {}

  try {
    await setDoc(doc(db, 'payment_logs', cleanLog.id), cleanLog as unknown as Record<string, unknown>, {
      merge: true
    });
  } catch {}
}

/**
 * Fetches Payment Audit Logs from `/api/payment-gateway`, Firestore (`payment_logs`), and localStorage
 */
export async function fetchPaymentAuditLogsFromCloud(
  searchFilter?: string
): Promise<PaymentAuditLogRecord[]> {
  const logsMap = new Map<string, PaymentAuditLogRecord>();

  const addLog = (item?: PaymentAuditLogRecord | null) => {
    if (!item || !item.id) return;
    logsMap.set(item.id, item);
  };

  // 1. Fetch from server `/api/payment-gateway`
  try {
    const res = await fetch('/api/payment-gateway');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        for (const item of data.logs as PaymentAuditLogRecord[]) {
          addLog(item);
        }
      }
    }
  } catch {}

  // 2. Fetch from Firestore `payment_logs`
  try {
    const q = query(collection(db, 'payment_logs'), orderBy('timestamp', 'desc'), limit(120));
    const snap = await getDocs(q);
    snap.forEach((d) => addLog(d.data() as unknown as PaymentAuditLogRecord));
  } catch {}

  // 3. Merge local storage payment logs
  try {
    const raw = localStorage.getItem(PAYMENT_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed as PaymentAuditLogRecord[]) {
          if (!logsMap.has(item.id)) {
            addLog(item);
          }
        }
      }
    }
  } catch {}

  let allLogs = Array.from(logsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (searchFilter && searchFilter.trim()) {
    const qLower = searchFilter.trim().toLowerCase();
    const normId = normalizeBookingIdInput(searchFilter);
    allLogs = allLogs.filter(
      (l) =>
        (l.bookingId && (l.bookingId.toLowerCase().includes(qLower) || l.bookingId === normId)) ||
        (l.razorpayOrderId && l.razorpayOrderId.toLowerCase().includes(qLower)) ||
        (l.paymentId && l.paymentId.toLowerCase().includes(qLower)) ||
        (l.qrId && l.qrId.toLowerCase().includes(qLower)) ||
        (l.customerPhone && l.customerPhone.toLowerCase().includes(qLower)) ||
        (l.customerName && l.customerName.toLowerCase().includes(qLower)) ||
        (l.paymentStatus && l.paymentStatus.toLowerCase().includes(qLower))
    );
  }

  return allLogs;
}
