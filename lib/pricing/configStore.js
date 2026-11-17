// Server-Side Versioned Pricing Configuration, Audit Log & Supabase Persistence Store
import { DEFAULT_PRICING_ENGINE_CONFIG, mergePricingConfig } from './constants.js';
import { validateRouteOverrideProfitability } from './fareEngine.js';

let activeConfig = mergePricingConfig(DEFAULT_PRICING_ENGINE_CONFIG);

const configVersions = [
  {
    version: activeConfig.version || 1,
    versionLabel: activeConfig.versionLabel || 'v1.0-intelligent-engine',
    isActive: true,
    publishedBy: activeConfig.updatedBy || 'System Seed',
    notes: 'Initial Intelligent Intercity Pricing Engine baseline (CabBazar + MakeMyTrip + Savaari calibrated)',
    createdAt: activeConfig.updatedAt || new Date().toISOString(),
    config: activeConfig
  }
];

const auditLogs = [
  {
    id: `AUD-${Date.now()}-INIT`,
    version: 1,
    actor: 'System',
    actionType: 'INITIALIZE_ENGINE',
    summary: 'Initialized Intelligent Intercity Pricing Engine v1.0 with profit floor protection and 10+ vehicle categories.',
    diff: { version: 1 },
    createdAt: new Date().toISOString()
  }
];

const manualQuoteRequests = [];

function getSupabaseCredentials() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  return {
    url: String(url).trim().replace(/\/+$/, ''),
    key: String(key).trim()
  };
}

async function supabaseRest(path, options = {}) {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key || key.includes('your_supabase')) return null;

  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: options.prefer || 'return=representation',
        ...(options.headers || {})
      }
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  }
}

export function getActivePricingConfigSync() {
  return activeConfig;
}

export async function loadActivePricingConfig() {
  const rows = await supabaseRest(
    'pricing_configs?is_active=eq.true&order=version.desc&limit=1',
    { method: 'GET' }
  );
  if (Array.isArray(rows) && rows[0]?.config_json) {
    const merged = mergePricingConfig({
      ...rows[0].config_json,
      version: rows[0].version,
      versionLabel: rows[0].version_label,
      updatedBy: rows[0].published_by,
      updatedAt: rows[0].created_at
    });
    activeConfig = merged;
    if (!configVersions.some((v) => v.version === merged.version)) {
      configVersions.unshift({
        version: merged.version,
        versionLabel: merged.versionLabel,
        isActive: true,
        publishedBy: merged.updatedBy,
        notes: rows[0].notes || 'Loaded from Supabase',
        createdAt: merged.updatedAt,
        config: merged
      });
    }
  }
  return activeConfig;
}

export function validateAllRouteOverrides(configToCheck) {
  const list = Array.isArray(configToCheck?.routeOverrides) ? configToCheck.routeOverrides : [];
  const results = [];
  const invalid = [];

  for (const ov of list) {
    if (!ov || ov.active === false) continue;
    const check = validateRouteOverrideProfitability(ov, configToCheck);
    results.push({ id: ov.id || `${ov.pickupCity}-${ov.dropCity}`, ...check });
    if (!check.isValid) {
      invalid.push({ id: ov.id || `${ov.pickupCity}-${ov.dropCity}`, reason: check.reason });
    }
  }
  return { valid: invalid.length === 0, results, invalid };
}

export async function publishNewPricingConfig(incomingConfig, meta = {}) {
  const nextVersion = Math.max(
    Number(activeConfig.version || 1) + 1,
    ...configVersions.map((v) => Number(v.version || 1) + 1)
  );
  const actor = String(meta.actor || incomingConfig?.updatedBy || 'Admin Control Panel').trim();
  const notes = String(meta.notes || 'Admin pricing rule update').trim();
  const nowIso = new Date().toISOString();

  const merged = mergePricingConfig({
    ...activeConfig,
    ...incomingConfig,
    version: nextVersion,
    versionLabel: `v${nextVersion}.0-${nowIso.slice(0, 10)}`,
    updatedBy: actor,
    updatedAt: nowIso
  });

  // Validate route overrides against profit floor before publishing
  const overrideCheck = validateAllRouteOverrides(merged);
  if (!overrideCheck.valid && !meta.forceSaveFlaggedOverrides) {
    return {
      success: false,
      errorCode: 'OVERRIDE_BELOW_PROFIT_FLOOR',
      message: overrideCheck.invalid[0]?.reason || 'One or more route overrides violate minimum profit protection.',
      invalidOverrides: overrideCheck.invalid
    };
  }

  activeConfig = merged;
  for (const v of configVersions) {
    v.isActive = false;
  }
  const versionEntry = {
    version: nextVersion,
    versionLabel: merged.versionLabel,
    isActive: true,
    publishedBy: actor,
    notes,
    createdAt: nowIso,
    config: merged
  };
  configVersions.unshift(versionEntry);
  if (configVersions.length > 40) configVersions.length = 40;

  const auditEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    version: nextVersion,
    actor,
    actionType: 'PUBLISH_PRICING_CONFIG',
    summary: `Published ${merged.versionLabel} (${notes})`,
    diff: {
      minOneWayBillableKm: merged.minOneWayBillableKm,
      minRoundTripKmPerDay: merged.minRoundTripKmPerDay,
      emergencyFlatRateMode: merged.dynamicDemand?.emergencyFlatRateMode,
      vehiclesCount: Object.keys(merged.vehicles || {}).length,
      overridesCount: (merged.routeOverrides || []).length,
      eventsCount: (merged.seasonalEvents || []).length
    },
    createdAt: nowIso
  };
  auditLogs.unshift(auditEntry);
  if (auditLogs.length > 100) auditLogs.length = 100;

  // Best-effort persistence to Supabase
  await Promise.all([
    supabaseRest('pricing_configs?is_active=eq.true', {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false })
    }),
    supabaseRest('pricing_configs', {
      method: 'POST',
      body: JSON.stringify({
        version: nextVersion,
        version_label: merged.versionLabel,
        is_active: true,
        config_json: merged,
        published_by: actor,
        notes,
        created_at: nowIso
      })
    }),
    supabaseRest('pricing_audit_logs', {
      method: 'POST',
      body: JSON.stringify({
        id: auditEntry.id,
        version: auditEntry.version,
        actor: auditEntry.actor,
        action_type: auditEntry.actionType,
        summary: auditEntry.summary,
        diff: auditEntry.diff,
        created_at: nowIso
      })
    })
  ]);

  return {
    success: true,
    config: activeConfig,
    versionEntry,
    auditEntry,
    overrideValidation: overrideCheck
  };
}

export async function rollbackPricingConfigVersion(targetVersion, actor = 'Admin Control Panel') {
  const verNum = Number(targetVersion);
  let found = configVersions.find((v) => v.version === verNum);

  if (!found) {
    const rows = await supabaseRest(`pricing_configs?version=eq.${verNum}&limit=1`, { method: 'GET' });
    if (Array.isArray(rows) && rows[0]?.config_json) {
      found = {
        version: rows[0].version,
        versionLabel: rows[0].version_label,
        isActive: false,
        publishedBy: rows[0].published_by,
        notes: rows[0].notes,
        createdAt: rows[0].created_at,
        config: mergePricingConfig(rows[0].config_json)
      };
    }
  }

  if (!found) {
    return { success: false, errorCode: 'VERSION_NOT_FOUND', message: `Pricing version v${verNum} not found.` };
  }

  return await publishNewPricingConfig(found.config, {
    actor,
    notes: `Rollback to ${found.versionLabel || `v${verNum}`}`,
    forceSaveFlaggedOverrides: true
  });
}

export async function listPricingVersionsAndAudit() {
  const [sbVersions, sbLogs] = await Promise.all([
    supabaseRest('pricing_configs?select=version,version_label,is_active,published_by,notes,created_at&order=version.desc&limit=25', {
      method: 'GET'
    }),
    supabaseRest('pricing_audit_logs?order=created_at.desc&limit=40', { method: 'GET' })
  ]);

  const versions = Array.isArray(sbVersions) && sbVersions.length > 0
    ? sbVersions.map((r) => ({
        version: r.version,
        versionLabel: r.version_label,
        isActive: r.is_active,
        publishedBy: r.published_by,
        notes: r.notes,
        createdAt: r.created_at
      }))
    : configVersions.map(({ config: _c, ...rest }) => rest);

  const logs = Array.isArray(sbLogs) && sbLogs.length > 0
    ? sbLogs.map((l) => ({
        id: l.id,
        version: l.version,
        actor: l.actor,
        actionType: l.action_type,
        summary: l.summary,
        diff: l.diff,
        createdAt: l.created_at
      }))
    : auditLogs;

  return { versions, auditLogs: logs };
}

export async function recordManualQuoteRequest(payload = {}) {
  const nowIso = new Date().toISOString();
  const entry = {
    id: `MQR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    customerName: String(payload.customerName || 'Traveler').trim(),
    customerPhone: String(payload.customerPhone || '').replace(/\D/g, '').slice(-10),
    customerEmail: String(payload.customerEmail || '').trim(),
    pickupCity: String(payload.pickupCity || '').trim(),
    dropCity: String(payload.dropCity || '').trim(),
    stops: Array.isArray(payload.stops) ? payload.stops : [],
    tripType: String(payload.tripType || 'oneway'),
    cabId: String(payload.cabId || 'sedan'),
    pickupDate: String(payload.pickupDate || ''),
    pickupTime: String(payload.pickupTime || ''),
    returnDate: String(payload.returnDate || ''),
    errorReason: String(payload.errorReason || 'Route could not be automatically verified'),
    status: 'pending',
    createdAt: nowIso
  };
  manualQuoteRequests.unshift(entry);
  if (manualQuoteRequests.length > 100) manualQuoteRequests.length = 100;

  await supabaseRest('manual_quote_requests', {
    method: 'POST',
    body: JSON.stringify({
      id: entry.id,
      customer_name: entry.customerName,
      customer_phone: entry.customerPhone,
      customer_email: entry.customerEmail,
      pickup_city: entry.pickupCity,
      drop_city: entry.dropCity,
      stops: entry.stops,
      trip_type: entry.tripType,
      cab_id: entry.cabId,
      pickup_date: entry.pickupDate,
      pickup_time: entry.pickupTime,
      return_date: entry.returnDate,
      error_reason: entry.errorReason,
      status: entry.status,
      created_at: nowIso
    })
  });

  return entry;
}

export async function listManualQuoteRequests() {
  const rows = await supabaseRest('manual_quote_requests?order=created_at.desc&limit=40', { method: 'GET' });
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((r) => ({
      id: r.id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      customerEmail: r.customer_email,
      pickupCity: r.pickup_city,
      dropCity: r.drop_city,
      stops: r.stops || [],
      tripType: r.trip_type,
      cabId: r.cab_id,
      pickupDate: r.pickup_date,
      pickupTime: r.pickup_time,
      returnDate: r.return_date,
      errorReason: r.error_reason,
      status: r.status,
      quotedFare: r.quoted_fare,
      adminNotes: r.admin_notes,
      createdAt: r.created_at
    }));
  }
  return manualQuoteRequests;
}
