import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  runTransaction,
  query,
  orderBy,
  limit
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
 * Formats a sequence number (1, 2, 3, ...) into the official SafarIndiaCabs
 * sequential Booking ID format: SIC2601, SIC2602, SIC2603, ...
 */
export function formatSequentialBookingId(sequenceNum: number): string {
  const cleanSeq = Math.max(1, Math.floor(Number(sequenceNum) || 1));
  const padded = String(cleanSeq).padStart(2, '0');
  return `${SERIES_PREFIX}${padded}`;
}

/**
 * Extracts the sequential numeric suffix from a Booking ID if it matches SIC26XX
 * e.g. 'SIC2601' -> 1, 'SIC2614' -> 14, 'SIC-2605' -> 5
 */
export function parseSequentialNumberFromBookingId(bookingId: string): number {
  if (!bookingId) return 0;
  const normalized = String(bookingId).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Match SIC26 followed by 1 to 5 digits (e.g. SIC2601 -> 01, SIC26105 -> 105)
  const match = normalized.match(/^SIC26(\d{1,5})$/);
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  // Ignore random 5-digit timestamps > 9000 if any legacy ID existed
  if (!Number.isFinite(val) || val <= 0 || val > 9000) return 0;
  return val;
}

/**
 * Computes the highest existing sequence number across confirmed bookings and localStorage
 */
export function getHighestKnownSequence(bookingsList?: BookingRecord[]): number {
  let maxSeq = 3; // Seeded baseline: SIC2601, SIC2602, SIC2603

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
 * Synchronously previews what the next sequential Booking ID will be (e.g., SIC2604)
 */
export function peekNextSequentialBookingId(bookingsList?: BookingRecord[]): string {
  const highest = getHighestKnownSequence(bookingsList);
  return formatSequentialBookingId(highest + 1);
}

/**
 * Reserves the next sequential Booking ID (e.g., SIC2604, SIC2605)
 * without blocking payment checkout if offline or slow network.
 */
export async function generateNextSequentialBookingId(
  bookingsList?: BookingRecord[]
): Promise<string> {
  const nextSeq = getHighestKnownSequence(bookingsList) + 1;
  return formatSequentialBookingId(nextSeq);
}

/**
 * Sanitizes a BookingRecord for Firestore (removes undefined fields and ensures required types)
 */
function sanitizeBookingForFirestore(booking: BookingRecord): Record<string, unknown> {
  const sequenceNumber = parseSequentialNumberFromBookingId(booking.id) || 1;
  const rawObj: Record<string, unknown> = {
    ...booking,
    id: String(booking.id).trim(),
    sequenceNumber,
    tripType: booking.tripType || 'oneway',
    pickupCity: String(booking.pickupCity || 'Delhi NCR'),
    dropCity: String(booking.dropCity || booking.pickupCity || 'Agra'),
    pickupDate: String(booking.pickupDate || new Date().toISOString().slice(0, 10)),
    pickupTime: String(booking.pickupTime || '08:00 AM'),
    cabId: String(booking.cabId || 'sedan'),
    cabName: String(booking.cabName || 'Sedan AC (Maruti Dzire)'),
    distanceKm: Number(booking.distanceKm) || 0,
    baseFare: Number(booking.baseFare) || 0,
    driverAllowance: Number(booking.driverAllowance) || 0,
    tollsAndTaxes: Number(booking.tollsAndTaxes) || 0,
    gstAmount: Number(booking.gstAmount) || 0,
    totalFare: Number(booking.totalFare) || 0,
    advancePaid: Number(booking.advancePaid) || 0,
    balanceDue: Number(booking.balanceDue) || 0,
    customerName: String(booking.customerName || 'Verified Passenger'),
    customerPhone: String(booking.customerPhone || '').replace(/\D/g, '').slice(-10) || '7710080992',
    status: booking.status || 'confirmed',
    createdAt: booking.createdAt || new Date().toISOString()
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
   * Saves or updates a BookingRecord in Firebase Firestore (`bookings/{id}`)
   * and Supabase (`bookings` table, if configured), and updates the confirmed sequence counter.
   */
  export async function saveBookingToCloudDatabase(booking: BookingRecord): Promise<void> {
    if (!booking || !booking.id) return;

    const seq = parseSequentialNumberFromBookingId(booking.id);
    if (seq > 0) {
      try {
        const currentSaved = Number(localStorage.getItem(COUNTER_STORAGE_KEY) || '0');
        if (seq > currentSaved) {
          localStorage.setItem(COUNTER_STORAGE_KEY, String(seq));
        }
      } catch {}

      // Also update Firestore counter best-effort
      try {
        const counterRef = doc(db, 'booking_counters', 'sic_26_series');
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(counterRef);
          const currentRemote = snap.exists() ? Number(snap.data()?.currentSequence || 3) : 3;
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

    // 1. Persist to Firebase Firestore
    const docPath = `bookings/${booking.id}`;
    try {
      const cleanData = sanitizeBookingForFirestore(booking);
      await setDoc(doc(db, 'bookings', booking.id), cleanData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }

    // 2. Persist to Supabase `bookings` table if configured
    if (supabaseClient) {
      try {
        await supabaseClient.from('bookings').upsert(
          {
            id: booking.id,
            sequence_number: seq || null,
            trip_type: booking.tripType,
            pickup_city: booking.pickupCity,
            drop_city: booking.dropCity,
            pickup_address: booking.pickupAddress || null,
            drop_address: booking.dropAddress || null,
            pickup_coords: booking.pickupCoords || null,
            drop_coords: booking.dropCoords || null,
            route_provider: booking.routeProvider || null,
            route_summary: booking.routeSummary || null,
            route_duration_text: booking.routeDurationText || null,
            route_geometry: Array.isArray(booking.routeGeometry) ? booking.routeGeometry.slice(0, 40) : null,
            fare_snapshot: booking.fareSnapshot || null,
            pickup_date: booking.pickupDate,
            pickup_time: booking.pickupTime,
            cab_id: booking.cabId,
            cab_name: booking.cabName,
            distance_km: booking.distanceKm,
            base_fare: booking.baseFare,
            driver_allowance: booking.driverAllowance,
            tolls_and_taxes: booking.tollsAndTaxes,
            gst_amount: booking.gstAmount,
            total_fare: booking.totalFare,
            advance_paid: booking.advancePaid,
            balance_due: booking.balanceDue,
            payment_mode: booking.paymentMode,
            payment_method: booking.paymentMethod,
            transaction_id: booking.transactionId || null,
            customer_name: booking.customerName,
            customer_phone: booking.customerPhone,
            customer_email: booking.customerEmail || null,
            status: booking.status,
            driver_name: booking.driverName || null,
            driver_phone: booking.driverPhone || null,
            driver_vehicle_model: booking.driverVehicleModel || null,
            driver_vehicle_no: booking.driverVehicleNo || null,
            notes: booking.notes || null,
            created_at: booking.createdAt
          },
          { onConflict: 'id' }
        );
      } catch (err) {
        console.warn('Supabase upsert notice:', err);
      }
    }
  }

/**
 * Fetches all bookings from Firebase Firestore (`bookings` collection) and Supabase (if configured).
 */
export async function fetchBookingsFromCloudDatabase(): Promise<BookingRecord[]> {
  const results: BookingRecord[] = [];

  // 1. Read from Firebase Firestore
  try {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as unknown as BookingRecord;
      if (data && data.id) {
        results.push(data);
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
          results.push({
            id: row.id,
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
    } catch {}
  }

  return results;
}
