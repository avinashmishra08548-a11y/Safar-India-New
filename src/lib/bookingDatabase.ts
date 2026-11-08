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
import { db, handleFirestoreError, OperationType } from './firebase';
import { BookingRecord } from '../types';

const COUNTER_STORAGE_KEY = 'safar_sic26_confirmed_seq_v2';
const BOOKINGS_STORAGE_KEY = 'safar_bookings';
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

/**
 * Sanitizes a BookingRecord for Firestore (removes undefined fields and ensures required types & rule bounds)
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

  const rawObj: Record<string, unknown> = {
    ...booking,
    id: cleanId.slice(0, 26),
    bookingId: cleanId.slice(0, 26),
    bookingReference: cleanId.slice(0, 26),
    sequenceNumber,
    searchKeywords,
    tripType: validTripType,
    pickupCity: String(booking.pickupCity || 'Delhi NCR').trim().slice(0, 115),
    dropCity: String(booking.dropCity || booking.pickupCity || 'Agra').trim().slice(0, 115),
    pickupAddress: booking.pickupAddress ? String(booking.pickupAddress).trim().slice(0, 240) : '',
    dropAddress: booking.dropAddress ? String(booking.dropAddress).trim().slice(0, 240) : '',
    pickupDate: String(booking.pickupDate || nowIso.slice(0, 10)).trim().slice(0, 36),
    pickupTime: String(booking.pickupTime || '08:00 AM').trim().slice(0, 36),
    cabId: String(booking.cabId || 'sedan').trim().slice(0, 38),
    cabName: String(booking.cabName || 'Comfort Sedan AC (Maruti Dzire)').trim().slice(0, 115),
    distanceKm: Math.max(0, Math.min(50000, Number(booking.distanceKm) || 0)),
    baseFare: Math.max(0, Math.min(10000000, Math.round(Number(booking.baseFare) || 0))),
    driverAllowance: Math.max(0, Math.round(Number(booking.driverAllowance) || 0)),
    tollsAndTaxes: Math.max(0, Math.round(Number(booking.tollsAndTaxes) || 0)),
    highwayToll: booking.highwayToll !== undefined ? Math.max(0, Math.round(Number(booking.highwayToll) || 0)) : undefined,
    statePermitTax: booking.statePermitTax !== undefined ? Math.max(0, Math.round(Number(booking.statePermitTax) || 0)) : undefined,
    hillStationCharge: booking.hillStationCharge !== undefined ? Math.max(0, Math.round(Number(booking.hillStationCharge) || 0)) : undefined,
    nightCharge: booking.nightCharge !== undefined ? Math.max(0, Math.round(Number(booking.nightCharge) || 0)) : undefined,
    gstAmount: Math.max(0, Math.round(Number(booking.gstAmount) || 0)),
    totalFare: Math.max(0, Math.min(10000000, Math.round(Number(booking.totalFare) || 0))),
    advancePaid: Math.max(0, Math.round(Number(booking.advancePaid) || 0)),
    balanceDue: Math.max(0, Math.round(Number(booking.balanceDue) || 0)),
    customerName: String(booking.customerName || 'Verified Passenger').trim().slice(0, 115),
    customerPhone: cleanPhone,
    status: validStatus,
    createdAt: String(booking.createdAt || nowIso).trim().slice(0, 58),
    updatedAt: nowIso
  };

  // Bound routeGeometry to at most 40 points for compact Firestore document size
  const boundedGeometry = Array.isArray(booking.routeGeometry)
    ? booking.routeGeometry.slice(0, 40)
    : undefined;

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries({ ...rawObj, routeGeometry: boundedGeometry })) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
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

  // 1. Persist to Firebase Firestore immediately
  const docPath = `bookings/${cleanId}`;
  try {
    const cleanData = sanitizeBookingForFirestore(normalizedBooking);
    await setDoc(doc(db, 'bookings', cleanId), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }

  // 2. Sync with backend /api/bookings best-effort
  try {
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedBooking)
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
        targetBooking = snap.data() as unknown as BookingRecord;
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
        addRecord(directSnap.data() as unknown as BookingRecord);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `bookings/${normalizedId}`);
    }

    // Also query `where('bookingId', '==', normalizedId)` and `where('id', '==', normalizedId)`
    try {
      const qByBookingId = query(
        collection(db, 'bookings'),
        where('bookingId', '==', normalizedId),
        limit(10)
      );
      const snapByBookingId = await getDocs(qByBookingId);
      snapByBookingId.forEach((d) => addRecord(d.data() as unknown as BookingRecord));
    } catch {}

    try {
      const qById = query(
        collection(db, 'bookings'),
        where('id', '==', normalizedId),
        limit(10)
      );
      const snapById = await getDocs(qById);
      snapById.forEach((d) => addRecord(d.data() as unknown as BookingRecord));
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
      snapPhone.forEach((d) => addRecord(d.data() as unknown as BookingRecord));
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
      snapKeyword.forEach((d) => addRecord(d.data() as unknown as BookingRecord));
    } catch {}
  }

  // 4. Fallback scan across recent Firestore documents + Backend `/api/bookings` + localStorage
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

  // 5. Also check `/api/bookings` and auto-sync any server record to Firestore
  try {
    const res = await fetch('/api/bookings');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.bookings)) {
        const qLower = rawQuery.toLowerCase();
        for (const b of data.bookings as BookingRecord[]) {
          const bId = normalizeBookingIdInput(b.id);
          if (
            bId === normalizedId ||
            bId.toLowerCase().includes(qLower) ||
            (cleanDigits.length >= 4 && String(b.customerPhone || '').includes(cleanDigits)) ||
            String(b.customerName || '').toLowerCase().includes(qLower)
          ) {
            if (!matchedMap.has(bId)) {
              addRecord(b);
              // Backfill into Firestore so future direct queries hit Firestore immediately
              saveBookingToCloudDatabase(b).catch(() => {});
            }
          }
        }
      }
    }
  } catch {}

  return Array.from(matchedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Real-time Firestore listener (`onSnapshot`) so the Admin Panel and Customer App
 * receive new bookings and status/driver updates immediately without refreshing.
 */
export function subscribeToBookingsFromCloudDatabase(
  onUpdate: (bookings: BookingRecord[]) => void
): () => void {
  const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(150));
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const liveBookings: BookingRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as unknown as BookingRecord;
        if (data && data.id) {
          const cleanId = normalizeBookingIdInput(data.id) || data.id;
          liveBookings.push({
            ...data,
            id: cleanId,
            bookingId: cleanId,
            bookingReference: cleanId
          });
        }
      });
      onUpdate(liveBookings);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    }
  );

  return unsubscribe;
}

/**
 * Fetches all bookings from Firebase Firestore (`bookings` collection) and Supabase (if configured).
 */
export async function fetchBookingsFromCloudDatabase(): Promise<BookingRecord[]> {
  const resultsMap = new Map<string, BookingRecord>();

  // 1. Read from Firebase Firestore
  try {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(150));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as unknown as BookingRecord;
      if (data && data.id) {
        const cleanId = normalizeBookingIdInput(data.id) || data.id;
        resultsMap.set(cleanId, {
          ...data,
          id: cleanId,
          bookingId: cleanId,
          bookingReference: cleanId
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bookings');
  }

  // 2. Read from Supabase if configured
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
            resultsMap.set(cleanId, {
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

  return Array.from(resultsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
