-- =============================================================================
-- SafarIndiaCabs Intelligent Pricing Engine Schema (Supabase / PostgreSQL)
-- Versioned Pricing Configs, Audit Logs, Smart Route Overrides, Seasonal Events,
-- Verified Competitor Quotes, Manual Quote Requests, and Bookings Extensions
-- =============================================================================

-- 1. Extend existing bookings table for multi-stop, waiting time, and pricing version tracking
ALTER TABLE IF EXISTS public.bookings
  ADD COLUMN IF NOT EXISTS stops JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS waiting_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extra_km INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pricing_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS location_categories JSONB,
  ADD COLUMN IF NOT EXISTS competitor_benchmark JSONB;

-- 2. Versioned Admin Pricing Configurations (with single active row & rollback support)
CREATE TABLE IF NOT EXISTS public.pricing_configs (
  version INTEGER PRIMARY KEY,
  version_label TEXT NOT NULL DEFAULT 'v1.0',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  config_json JSONB NOT NULL,
  published_by TEXT NOT NULL DEFAULT 'Admin Control Panel',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_configs_active
  ON public.pricing_configs (is_active, version DESC);

-- 3. Immutable Pricing Audit Logs
CREATE TABLE IF NOT EXISTS public.pricing_audit_logs (
  id TEXT PRIMARY KEY,
  version INTEGER,
  actor TEXT NOT NULL DEFAULT 'Admin',
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_logs_created_at
  ON public.pricing_audit_logs (created_at DESC);

-- 4. Smart Route Overrides (with profit floor validation & expiration dates)
CREATE TABLE IF NOT EXISTS public.smart_route_overrides (
  id TEXT PRIMARY KEY,
  name TEXT,
  pickup_city TEXT NOT NULL,
  drop_city TEXT NOT NULL,
  trip_type TEXT,
  vehicle_id TEXT,
  bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
  fixed_total_fare NUMERIC,
  rate_per_km_override NUMERIC,
  min_km_override INTEGER,
  max_surge_multiplier NUMERIC,
  starts_at DATE,
  expires_at DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  profit_validated BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_route_overrides_active
  ON public.smart_route_overrides (active, expires_at);

-- 5. Seasonal & Festival Event Calendar
CREATE TABLE IF NOT EXISTS public.seasonal_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1.10,
  applicable_zones JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Verified Competitor Quotes (Used for Short <=250km >=₹150 & Long >250km >=₹250 Benchmarking)
CREATE TABLE IF NOT EXISTS public.competitor_quotes (
  id TEXT PRIMARY KEY,
  pickup_city TEXT NOT NULL,
  drop_city TEXT NOT NULL,
  trip_type TEXT NOT NULL DEFAULT 'oneway',
  vehicle_id TEXT NOT NULL DEFAULT 'sedan',
  competitor_name TEXT NOT NULL,
  competitor_fare NUMERIC NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_quotes_route
  ON public.competitor_quotes (pickup_city, drop_city, trip_type, vehicle_id);

-- 7. Manual Quotation Fallback Requests (When road routing cannot be verified)
CREATE TABLE IF NOT EXISTS public.manual_quote_requests (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  pickup_city TEXT NOT NULL,
  drop_city TEXT NOT NULL,
  stops JSONB DEFAULT '[]'::jsonb,
  trip_type TEXT NOT NULL DEFAULT 'oneway',
  cab_id TEXT NOT NULL DEFAULT 'sedan',
  pickup_date TEXT,
  pickup_time TEXT,
  return_date TEXT,
  error_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  quoted_fare NUMERIC,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_quote_requests_status
  ON public.manual_quote_requests (status, created_at DESC);
