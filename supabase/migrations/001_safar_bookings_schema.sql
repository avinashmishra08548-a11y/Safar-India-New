-- =============================================================================
-- SafarIndiaCabs Booking ID Generation & GST Billing Schema (Supabase / PostgreSQL)
-- Generates sequential Booking IDs: SIC2601, SIC2602, SIC2603, ...
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.safar_booking_sic26_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

-- Function to automatically generate sequential Booking ID (e.g. SIC2601, SIC2602, SIC2603)
CREATE OR REPLACE FUNCTION public.generate_next_sic_booking_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('public.safar_booking_sic26_seq');
  RETURN 'SIC26' || LPAD(next_val::TEXT, 2, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY DEFAULT public.generate_next_sic_booking_id(),
  sequence_number INTEGER,
  trip_type TEXT NOT NULL DEFAULT 'oneway',
  pickup_city TEXT NOT NULL,
  drop_city TEXT NOT NULL,
  pickup_address TEXT,
  drop_address TEXT,
  pickup_date TEXT NOT NULL,
  pickup_time TEXT NOT NULL,
  cab_id TEXT NOT NULL DEFAULT 'sedan',
  cab_name TEXT NOT NULL,
  distance_km NUMERIC NOT NULL DEFAULT 0,
  base_fare NUMERIC NOT NULL DEFAULT 0,
  driver_allowance NUMERIC NOT NULL DEFAULT 0,
  tolls_and_taxes NUMERIC NOT NULL DEFAULT 0,
  gst_amount NUMERIC NOT NULL DEFAULT 0,
  total_fare NUMERIC NOT NULL DEFAULT 0,
  advance_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'advance_20',
  payment_method TEXT,
  transaction_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  driver_name TEXT,
  driver_phone TEXT,
  driver_vehicle_model TEXT,
  driver_vehicle_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON public.bookings (customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);
