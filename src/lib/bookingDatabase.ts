import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { BookingRecord, PaymentAuditLogRecord } from '../types';

const COUNTER_STORAGE_KEY = 'safar_sic26_confirmed_seq_v2';
const BOOKINGS_STORAGE_KEY = 'safar_bookings';
const PAYMENT_LOGS_STORAGE_KEY = 'safar_payment_audit_logs_v1';
const SERIES_YEAR_CODE = '26';
const SERIES_PREFIX = `SIC${SERIES_YEAR_CODE}`; // 'SIC26'

export const supabaseClient: SupabaseClient = supabase;

export interface SupabaseBookingRow {
  id?: string;
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  drop_location: string;
  trip_type: string;
  vehicle_type: string;
  trip_date: string;
  trip_time: string;
  total_fare: number;
  advance_paid: number;
  remaining_balance: number;
  toll_charges: number;
  state_tax: number;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_number: string | null;
  status: string;
  created_at: string;
}

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
 * by checking the highest `booking_id` in Supabase `bookings` table
 * with a fast 2.5s timeout fallback so checkout never hangs if offline.
 */
export async function generateNextSequentialBookingId(
  bookingsList?: BookingRecord[]
): Promise<string> {
  const localBaseline = getHighestKnownSequence(bookingsList);

  try {
    const supabasePromise = (async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_id')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error || !Array.isArray(data)) return null;
      let highestRemote = localBaseline;
      for (const row of data) {
        const seq = parseSequentialNumberFromBookingId(String(row?.booking_id || ''));
        if (seq > highestRemote) {
          highestRemote = seq;
        }
      }
      const nextSeq = highestRemote + 1;
      return {
        nextSeq,
        nextId: formatSequentialBookingId(nextSeq)
      };
    })();

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    const result = await Promise.race([supabasePromise, timeoutPromise]);

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
 * Infers cabId from vehicle_type string when hydrating a Supabase row
 */
function inferCabIdFromVehicleType(vehicleType: string): BookingRecord['cabId'] {
  const lower = String(vehicleType || '').toLowerCase();
  if (lower.includes('hatchback') || lower.includes('wagonr') || lower.includes('tiago')) {
    return 'hatchback';
  }
  if (lower.includes('prime') || lower.includes('executive') || lower.includes('city') || lower.includes('ciaz')) {
    return 'exec_sedan';
  }
  if (lower.includes('crysta') || lower.includes('innova')) {
    return 'innova';
  }
  if (lower.includes('ertiga') || lower.includes('suv') || lower.includes('carens')) {
    return 'suv';
  }
  if (lower.includes('tempo') || lower.includes('traveller')) {
    return 'tempo';
  }
  return 'sedan';
}

/**
 * Converts a BookingRecord into the exact Supabase `bookings` table payload requested:
 * `booking_id`, `customer_name`, `customer_phone`, `pickup_location`, `drop_location`,
 * `trip_type`, `vehicle_type`, `trip_date`, `trip_time`, `total_fare`, `advance_paid`,
 * `remaining_balance`, `toll_charges`, `state_tax`, `driver_name`, `driver_phone`,
 * `vehicle_number`, `status`, and `created_at`.
 */
export function mapBookingToSupabaseRow(booking: BookingRecord): SupabaseBookingRow {
  const cleanId =
    normalizeBookingIdInput(booking.id) ||
    formatSequentialBookingId(getHighestKnownSequence() + 1);
  const cleanPhone =
    String(booking.customerPhone || '')
      .replace(/\D/g, '')
      .slice(-10) || '7710080992';

  const pickupLocation = String(booking.pickupAddress || booking.pickupCity || 'Delhi NCR').trim();
  const dropLocation = String(
    booking.dropAddress || booking.dropCity || booking.pickupCity || 'Destination'
  ).trim();
  const vehicleType = String(booking.cabName || 'Sedan AC (Dzire / Etios)').trim();

  const totalFare = Math.max(0, Math.round(Number(booking.totalFare) || 0));
  const advancePaid = Math.max(0, Math.round(Number(booking.advancePaid) || 0));
  const remainingBalance =
    booking.status === 'completed'
      ? 0
      : Math.max(
          0,
          Math.round(
            Number(booking.balanceDue ?? Math.max(0, totalFare - advancePaid))
          )
        );

  const tollCharges = Math.max(
    0,
    Math.round(Number(booking.highwayToll || 0) + Number(booking.extraTollCharges || 0))
  );
  const stateTax = Math.max(0, Math.round(Number(booking.statePermitTax || 0)));

  // Determine canonical Supabase status ('Pending' by default on new booking, 'Confirmed' if driver allotted, 'Completed' when completed, 'Cancelled' when cancelled)
  let supabaseStatus = 'Pending';
  if (booking.status === 'completed' || String(booking.supabaseStatus).toLowerCase() === 'completed') {
    supabaseStatus = 'Completed';
  } else if (booking.status === 'cancelled' || String(booking.supabaseStatus).toLowerCase() === 'cancelled') {
    supabaseStatus = 'Cancelled';
  } else if (
    booking.driverName ||
    String(booking.supabaseStatus).toLowerCase() === 'confirmed'
  ) {
    supabaseStatus = 'Confirmed';
  }

  return {
    booking_id: cleanId,
    customer_name: String(booking.customerName || 'Verified Passenger').trim(),
    customer_phone: cleanPhone,
    pickup_location: pickupLocation,
    drop_location: dropLocation,
    trip_type: String(booking.tripType || 'oneway'),
    vehicle_type: vehicleType,
    trip_date: String(booking.pickupDate || new Date().toISOString().slice(0, 10)),
    trip_time: String(booking.pickupTime || '08:00 AM'),
    total_fare: totalFare,
    advance_paid: advancePaid,
    remaining_balance: remainingBalance,
    toll_charges: tollCharges,
    state_tax: stateTax,
    driver_name: booking.driverName ? String(booking.driverName).trim() : null,
    driver_phone: booking.driverPhone
      ? String(booking.driverPhone).replace(/\D/g, '').slice(-10)
      : null,
    vehicle_number: booking.driverVehicleNo
      ? String(booking.driverVehicleNo).trim().toUpperCase()
      : null,
    status: supabaseStatus,
    created_at: booking.createdAt || new Date().toISOString()
  };
}

/**
 * Normalizes a Supabase `bookings` row (or legacy API/localStorage object) into a complete BookingRecord
 */
export function normalizeFirestoreDocToBooking(
  rawData: Record<string, any> | undefined | null,
  fallbackDocId?: string,
  existingLocal?: BookingRecord | null
): BookingRecord | null {
  if (!rawData || typeof rawData !== 'object') return null;

  // Support both Supabase snake_case (`booking_id`) and camelCase (`id`, `bookingId`)
  const rawId = String(
    rawData.booking_id ||
      rawData.bookingId ||
      rawData.bookingReference ||
      // Only use rawData.id if it's not a UUID (or if booking_id is absent and rawData.id starts with SIC)
      (typeof rawData.id === 'string' && !rawData.id.includes('-') ? rawData.id : '') ||
      (typeof rawData.id === 'string' && rawData.id.toUpperCase().startsWith('SIC') ? rawData.id : '') ||
      fallbackDocId ||
      ''
  ).trim();

  if (!rawId || rawId.includes('DEMO') || rawId.includes('TEST')) return null;

  const cleanId = normalizeBookingIdInput(rawId) || rawId;
  const nowIso = new Date().toISOString();
  const createdAt = String(rawData.created_at || rawData.createdAt || existingLocal?.createdAt || nowIso);

  const rawStatusStr = String(rawData.status || existingLocal?.supabaseStatus || existingLocal?.status || 'Pending').trim();
  const rawStatusLower = rawStatusStr.toLowerCase();

  const status: 'confirmed' | 'completed' | 'cancelled' =
    rawStatusLower === 'completed'
      ? 'completed'
      : rawStatusLower === 'cancelled'
      ? 'cancelled'
      : 'confirmed';

  const supabaseStatus: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' =
    rawStatusLower === 'completed'
      ? 'Completed'
      : rawStatusLower === 'cancelled'
      ? 'Cancelled'
      : rawStatusLower === 'confirmed'
      ? 'Confirmed'
      : 'Pending';

  const totalFare = Math.max(
    0,
    Math.round(Number(rawData.total_fare ?? rawData.totalFare ?? existingLocal?.totalFare ?? 0))
  );
  const advancePaid = Math.max(
    0,
    Math.round(Number(rawData.advance_paid ?? rawData.advancePaid ?? existingLocal?.advancePaid ?? 0))
  );
  const balanceDue =
    status === 'completed'
      ? 0
      : Math.max(
          0,
          Math.round(
            Number(
              rawData.remaining_balance ??
                rawData.balance_due ??
                rawData.balanceDue ??
                existingLocal?.balanceDue ??
                Math.max(0, totalFare - advancePaid)
            )
          )
        );

  const highwayToll = Math.max(
    0,
    Math.round(
      Number(
        rawData.toll_charges ??
          rawData.highwayToll ??
          existingLocal?.highwayToll ??
          0
      )
    )
  );
  const statePermitTax = Math.max(
    0,
    Math.round(
      Number(
        rawData.state_tax ??
          rawData.statePermitTax ??
          existingLocal?.statePermitTax ??
          0
      )
    )
  );
  const tollsAndTaxes =
    highwayToll + statePermitTax > 0
      ? highwayToll + statePermitTax
      : Math.max(0, Math.round(Number(rawData.tolls_and_taxes ?? rawData.tollsAndTaxes ?? existingLocal?.tollsAndTaxes ?? 0)));

  const pickupLocation = String(
    rawData.pickup_location ||
      rawData.pickupCity ||
      rawData.pickup_city ||
      existingLocal?.pickupCity ||
      'Delhi NCR'
  );
  const dropLocation = String(
    rawData.drop_location ||
      rawData.dropCity ||
      rawData.drop_city ||
      existingLocal?.dropCity ||
      'Destination'
  );
  const vehicleType = String(
    rawData.vehicle_type ||
      rawData.cabName ||
      rawData.cab_name ||
      existingLocal?.cabName ||
      'Sedan AC (Maruti Dzire)'
  );
  const cabId = (rawData.cabId ||
    rawData.cab_id ||
    existingLocal?.cabId ||
    inferCabIdFromVehicleType(vehicleType)) as BookingRecord['cabId'];

  const tripDays = Math.max(1, Number(rawData.tripDays ?? existingLocal?.tripDays ?? 1));
  const driverAllowance = Math.max(
    0,
    Math.round(
      Number(
        rawData.driver_allowance ??
          rawData.driverAllowance ??
          existingLocal?.driverAllowance ??
          260 * tripDays
      )
    )
  );
  const gstAmount = Math.max(
    0,
    Math.round(
      Number(
        rawData.gst_amount ??
          rawData.gstAmount ??
          existingLocal?.gstAmount ??
          Math.round((totalFare - tollsAndTaxes) * (5 / 105))
      )
    )
  );
  const baseFare = Math.max(
    0,
    Math.round(
      Number(
        rawData.base_fare ??
          rawData.baseFare ??
          existingLocal?.baseFare ??
          Math.max(0, totalFare - gstAmount - driverAllowance - tollsAndTaxes)
      )
    )
  );

  const driverName =
    rawData.driver_name !== undefined
      ? rawData.driver_name || undefined
      : rawData.driverName || existingLocal?.driverName || undefined;
  const driverPhone =
    rawData.driver_phone !== undefined
      ? rawData.driver_phone || undefined
      : rawData.driverPhone || existingLocal?.driverPhone || undefined;
  const driverVehicleNo =
    rawData.vehicle_number !== undefined
      ? rawData.vehicle_number || undefined
      : rawData.driver_vehicle_no ||
        rawData.driverVehicleNo ||
        existingLocal?.driverVehicleNo ||
        undefined;
  const driverVehicleModel =
    rawData.driver_vehicle_model ||
    rawData.driverVehicleModel ||
    existingLocal?.driverVehicleModel ||
    (driverName ? vehicleType : undefined);

  const rawTripType = String(
    rawData.trip_type || rawData.tripType || existingLocal?.tripType || 'oneway'
  ).toLowerCase();
  const tripType: BookingRecord['tripType'] = ['oneway', 'roundtrip', 'local', 'airport'].includes(rawTripType)
    ? (rawTripType as BookingRecord['tripType'])
    : 'oneway';

  return {
    ...(existingLocal || {}),
    ...(rawData as unknown as Partial<BookingRecord>),
    id: cleanId,
    bookingId: cleanId,
    bookingReference: cleanId,
    tripType,
    tripDays,
    pickupCity: existingLocal?.pickupCity || pickupLocation,
    dropCity: existingLocal?.dropCity || dropLocation,
    pickupAddress: rawData.pickupAddress || rawData.pickup_location || existingLocal?.pickupAddress || pickupLocation,
    dropAddress: rawData.dropAddress || rawData.drop_location || existingLocal?.dropAddress || dropLocation,
    pickupDate: String(
      rawData.trip_date || rawData.pickup_date || rawData.pickupDate || existingLocal?.pickupDate || createdAt.slice(0, 10)
    ),
    pickupTime: String(
      rawData.trip_time || rawData.pickup_time || rawData.pickupTime || existingLocal?.pickupTime || '08:00 AM'
    ),
    cabId,
    cabName: vehicleType,
    distanceKm: Math.max(
      1,
      Number(rawData.distance_km ?? rawData.distanceKm ?? existingLocal?.distanceKm ?? 230)
    ),
    baseFare,
    driverAllowance,
    tollsAndTaxes,
    highwayToll,
    statePermitTax,
    parkingCharge: Number(rawData.parkingCharge ?? existingLocal?.parkingCharge ?? 0),
    hillStationCharge: Number(rawData.hillStationCharge ?? existingLocal?.hillStationCharge ?? 0),
    gstAmount,
    totalFare,
    advancePaid: status === 'completed' ? totalFare : advancePaid,
    balanceDue,
    paymentMode:
      rawData.paymentMode ||
      rawData.payment_mode ||
      existingLocal?.paymentMode ||
      (balanceDue === 0 ? 'full' : 'advance_20'),
    paymentMethod: String(
      rawData.paymentMethod ||
        rawData.payment_method ||
        existingLocal?.paymentMethod ||
        'Razorpay Verified'
    ),
    transactionId: String(
      rawData.transactionId || rawData.transaction_id || existingLocal?.transactionId || ''
    ),
    customerName: String(
      rawData.customer_name || rawData.customerName || existingLocal?.customerName || 'Verified Passenger'
    ),
    customerPhone:
      String(
        rawData.customer_phone ||
          rawData.customerPhone ||
          rawData.customerMobile ||
          existingLocal?.customerPhone ||
          ''
      )
        .replace(/\D/g, '')
        .slice(-10) || '7710080992',
    status,
    supabaseStatus,
    driverName,
    driverPhone,
    driverVehicleModel,
    driverVehicleNo,
    createdAt,
    updatedAt: rawData.updatedAt || existingLocal?.updatedAt || new Date().toISOString(),
    completedAt:
      status === 'completed'
        ? rawData.completedAt || existingLocal?.completedAt || new Date().toISOString()
        : undefined
  };
}

function getLocalBookingsMap(): Map<string, BookingRecord> {
  const map = new Map<string, BookingRecord>();
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.id) {
            const cleanId = normalizeBookingIdInput(item.id) || item.id;
            map.set(cleanId, item);
          }
        }
      }
    }
  } catch {}
  return map;
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
 * Saves or updates a BookingRecord in Supabase (`bookings` table),
 * local storage, and backend API (`/api/bookings`).
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
  }

  // 1. Persist to Supabase `bookings` table
  const supabasePayload = mapBookingToSupabaseRow(normalizedBooking);
  try {
    const { error: upsertErr } = await supabase
      .from('bookings')
      .upsert(supabasePayload, { onConflict: 'booking_id' });

    if (upsertErr) {
      // Fallback: check if record exists by booking_id, then update or insert
      const { data: existingRows } = await supabase
        .from('bookings')
        .select('booking_id')
        .eq('booking_id', cleanId)
        .limit(1);

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        await supabase
          .from('bookings')
          .update(supabasePayload)
          .eq('booking_id', cleanId);
      } else {
        await supabase.from('bookings').insert([supabasePayload]);
      }
    }
  } catch (err) {
    console.warn('Supabase booking persistence notice:', err);
  }

  // 2. Sync with backend /api/bookings best-effort
  try {
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking: normalizedBooking })
    }).catch(() => {});
  } catch {}
}

/**
 * Updates driver assignment details, tolls/taxes, and/or booking status in Supabase `bookings`,
 * backend API, and localStorage.
 */
export async function updateBookingDriverAndStatusInCloud(
  bookingId: string,
  updates: Partial<BookingRecord>,
  existingBooking?: BookingRecord
): Promise<BookingRecord | null> {
  const cleanId = normalizeBookingIdInput(bookingId) || bookingId;
  const localMap = getLocalBookingsMap();
  let targetBooking: BookingRecord | null = existingBooking
    ? { ...existingBooking }
    : localMap.get(cleanId) || null;

  if (!targetBooking) {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_id', cleanId)
        .maybeSingle();
      if (data) {
        targetBooking = normalizeFirestoreDocToBooking(
          data as Record<string, any>,
          cleanId,
          localMap.get(cleanId)
        );
      }
    } catch {}
  }

  if (!targetBooking) return null;

  const nextStatus = updates.status || targetBooking.status;
  const nextSupabaseStatus =
    nextStatus === 'completed'
      ? 'Completed'
      : nextStatus === 'cancelled'
      ? 'Cancelled'
      : updates.driverName || targetBooking.driverName
      ? 'Confirmed'
      : targetBooking.supabaseStatus || 'Pending';

  const merged: BookingRecord = {
    ...targetBooking,
    ...updates,
    id: cleanId,
    bookingId: cleanId,
    bookingReference: cleanId,
    status: nextStatus,
    supabaseStatus: nextSupabaseStatus,
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
 * Dedicated Admin & Customer Supabase Search:
 * Instantly searches Supabase `bookings` table by Booking ID (e.g. SIC2604), phone number, or customer name.
 */
export async function searchBookingInFirestore(searchQuery: string): Promise<BookingRecord[]> {
  const rawQuery = String(searchQuery || '').trim();
  if (!rawQuery) {
    return fetchBookingsFromCloudDatabase();
  }

  const normalizedId = normalizeBookingIdInput(rawQuery);
  const cleanDigits = rawQuery.replace(/\D/g, '');
  const localMap = getLocalBookingsMap();
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

  // 1. Direct lookup in Supabase `bookings` by `booking_id`
  if (normalizedId.startsWith('SIC')) {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .ilike('booking_id', normalizedId)
        .limit(10);
      if (Array.isArray(data)) {
        for (const row of data) {
          const cleanRowId = normalizeBookingIdInput(row.booking_id);
          addRecord(
            normalizeFirestoreDocToBooking(row, cleanRowId, localMap.get(cleanRowId))
          );
        }
      }
    } catch {}
  }

  // 2. Phone number lookup in Supabase `bookings` if 10-digit mobile entered
  if (cleanDigits.length >= 10) {
    const phone10 = cleanDigits.slice(-10);
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .ilike('customer_phone', `%${phone10}%`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (Array.isArray(data)) {
        for (const row of data) {
          const cleanRowId = normalizeBookingIdInput(row.booking_id);
          addRecord(
            normalizeFirestoreDocToBooking(row, cleanRowId, localMap.get(cleanRowId))
          );
        }
      }
    } catch {}
  }

  // 3. Fallback scan across all Supabase + Server + Local bookings
  if (matchedMap.size === 0) {
    try {
      const allCloud = await fetchBookingsFromCloudDatabase();
      const qLower = rawQuery.toLowerCase();
      for (const b of allCloud) {
        const bId = normalizeBookingIdInput(b.id);
        if (
          bId === normalizedId ||
          bId.toLowerCase().includes(qLower) ||
          (b.customerPhone &&
            b.customerPhone.includes(
              cleanDigits && cleanDigits.length >= 4 ? cleanDigits : rawQuery
            )) ||
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

export const searchBookingInSupabase = searchBookingInFirestore;

/**
 * Real-time Supabase listener (`postgres_changes` on `public.bookings`) + periodic Supabase/API sync
 * so the Customer "My Rides" view, "Booking Confirmed Summary" modal, and Admin Console
 * immediately reflect driver assignments and `status = 'Completed'` invoice unlocks in real time.
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
    const existingMs =
      Date.parse(existing.updatedAt || existing.completedAt || existing.createdAt || '') || 0;
    const nextMs = Date.parse(b.updatedAt || b.completedAt || b.createdAt || '') || 0;
    const primary = nextMs >= existingMs ? b : existing;
    const secondary = nextMs >= existingMs ? existing : b;
    combinedMap.set(cleanId, {
      ...secondary,
      ...primary,
      driverName: primary.driverName || secondary.driverName,
      driverPhone: primary.driverPhone || secondary.driverPhone,
      driverVehicleModel: primary.driverVehicleModel || secondary.driverVehicleModel,
      driverVehicleNo: primary.driverVehicleNo || secondary.driverVehicleNo,
      status:
        b.status === 'completed' || existing.status === 'completed'
          ? 'completed'
          : b.status === 'cancelled' || existing.status === 'cancelled'
          ? 'cancelled'
          : primary.status
    });
  };

  // Seed map from localStorage first
  const initialLocalMap = getLocalBookingsMap();
  initialLocalMap.forEach((b) => upsertIntoMap(b));

  // Fetch latest rows from Supabase `bookings` table
  const syncFromSupabaseAndServer = async () => {
    const localMap = getLocalBookingsMap();
    let changed = false;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const cleanId = normalizeBookingIdInput(row.booking_id);
          const parsed = normalizeFirestoreDocToBooking(
            row,
            cleanId,
            localMap.get(cleanId) || combinedMap.get(cleanId)
          );
          if (parsed) {
            upsertIntoMap(parsed);
            upsertBookingInLocalStorage(parsed);
            changed = true;
          }
        }
      }
    } catch {}

    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.bookings)) {
          for (const raw of data.bookings) {
            const cleanId = normalizeBookingIdInput(raw?.id || raw?.booking_id);
            const parsed = normalizeFirestoreDocToBooking(
              raw,
              cleanId,
              localMap.get(cleanId) || combinedMap.get(cleanId)
            );
            if (parsed) {
              const prev = combinedMap.get(parsed.id);
              upsertIntoMap(parsed);
              if (!prev) {
                changed = true;
              }
            }
          }
        }
      }
    } catch {}

    if (changed) {
      emitCombined();
    }
  };

  // 1. Subscribe to Supabase Realtime changes on `public.bookings`
  const channel = supabase
    .channel(`safar-bookings-live-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      (payload) => {
        const row = (payload.new || payload.old) as Record<string, any> | undefined;
        if (!row) return;
        const cleanId = normalizeBookingIdInput(row.booking_id || row.id);
        const localMap = getLocalBookingsMap();
        const parsed = normalizeFirestoreDocToBooking(
          row,
          cleanId,
          localMap.get(cleanId) || combinedMap.get(cleanId)
        );
        if (parsed) {
          upsertIntoMap(parsed);
          upsertBookingInLocalStorage(parsed);
          emitCombined();
        }
      }
    )
    .subscribe();

  // 2. Run initial fetch and poll every 6 seconds as a resilient fallback
  syncFromSupabaseAndServer();
  const pollInterval = setInterval(syncFromSupabaseAndServer, 6000);

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {}
    clearInterval(pollInterval);
  };
}

/**
 * Fetches all bookings from Supabase (`bookings` table), `/api/bookings`, and localStorage.
 */
export async function fetchBookingsFromCloudDatabase(): Promise<BookingRecord[]> {
  const resultsMap = new Map<string, BookingRecord>();
  const localMap = getLocalBookingsMap();

  const addRecord = (rec: BookingRecord | null | undefined) => {
    if (!rec || !rec.id) return;
    const cleanId = normalizeBookingIdInput(rec.id) || rec.id;
    const existing = resultsMap.get(cleanId);
    if (!existing) {
      resultsMap.set(cleanId, rec);
      return;
    }
    const existingMs =
      Date.parse(existing.updatedAt || existing.completedAt || existing.createdAt || '') || 0;
    const nextMs = Date.parse(rec.updatedAt || rec.completedAt || rec.createdAt || '') || 0;
    resultsMap.set(
      cleanId,
      nextMs >= existingMs ? { ...existing, ...rec } : { ...rec, ...existing }
    );
  };

  // 1. Read from Supabase `bookings` table (authoritative cloud source)
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const cleanId = normalizeBookingIdInput(row.booking_id || row.id);
        const parsed = normalizeFirestoreDocToBooking(
          row,
          cleanId,
          localMap.get(cleanId)
        );
        if (parsed) {
          addRecord(parsed);
          upsertBookingInLocalStorage(parsed);
        }
      }
    }
  } catch {}

  // 2. Also read from `/api/bookings`
  try {
    const res = await fetch('/api/bookings');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.bookings)) {
        for (const raw of data.bookings) {
          const cleanId = normalizeBookingIdInput(raw?.id || raw?.booking_id);
          const parsed = normalizeFirestoreDocToBooking(
            raw,
            cleanId,
            localMap.get(cleanId)
          );
          if (parsed && !resultsMap.has(parsed.id)) {
            addRecord(parsed);
          }
        }
      }
    }
  } catch {}

  // 3. Also merge localStorage bookings so local state is never lost
  localMap.forEach((item) => {
    const parsed = normalizeFirestoreDocToBooking(
      item as Record<string, any>,
      item?.id,
      item
    );
    if (parsed && !resultsMap.has(parsed.id)) {
      addRecord(parsed);
    }
  });

  return sortBookingsNewestFirst(Array.from(resultsMap.values()));
}

/**
 * Persists a PaymentAuditLogRecord to localStorage
 */
export async function savePaymentAuditLogToCloud(log: PaymentAuditLogRecord): Promise<void> {
  if (!log || !log.id) return;

  const cleanLog: PaymentAuditLogRecord = {
    id: String(log.id).slice(0, 80),
    bookingId:
      normalizeBookingIdInput(log.bookingId) || String(log.bookingId || 'PENDING').slice(0, 36),
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
}

/**
 * Fetches Payment Audit Logs from `/api/payment-gateway` and localStorage
 */
export async function fetchPaymentAuditLogsFromCloud(
  searchFilter?: string
): Promise<PaymentAuditLogRecord[]> {
  const logsMap = new Map<string, PaymentAuditLogRecord>();

  const addLog = (item?: PaymentAuditLogRecord | null) => {
    if (!item || !item.id) return;
    logsMap.set(item.id, item);
  };

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
        (l.bookingId &&
          (l.bookingId.toLowerCase().includes(qLower) || l.bookingId === normId)) ||
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
