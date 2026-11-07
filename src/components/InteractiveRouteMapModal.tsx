import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  X,
  MapPin,
  Navigation,
  Crosshair,
  Car,
  Clock,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Route,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import {
  Coordinates,
  RouteAlternative,
  reverseGeocodeCoordinates,
  detectCurrentGpsLocation,
  fetchLiveDriverTelemetry,
  LiveDriverTelemetry,
  resolveLocalCoordsSync
} from '../utils/olaMapsService';
import { BookingRecord } from '../types';

export type MapModalMode = 'route_preview' | 'pin_pickup' | 'pin_drop' | 'live_tracking';

interface InteractiveRouteMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: MapModalMode;
  pickupCity: string;
  dropCity: string;
  pickupCoords?: Coordinates | null;
  dropCoords?: Coordinates | null;
  distanceKm: number;
  durationText?: string;
  routeSummary?: string;
  routeProvider?: string;
  routeGeometry?: Array<[number, number]>;
  alternatives?: RouteAlternative[];
  selectedRouteId?: string;
  onSelectAlternativeRoute?: (route: RouteAlternative) => void;
  onApplyPickupPin?: (address: string, coords: Coordinates) => void;
  onApplyDropPin?: (address: string, coords: Coordinates) => void;
  trackingBooking?: BookingRecord | null;
}

const INDIA_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm_india_tiles: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© Ola Maps / MapLibre GL / OpenStreetMap India'
    }
  },
  layers: [
    {
      id: 'osm-india-layer',
      type: 'raster',
      source: 'osm_india_tiles',
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

export const InteractiveRouteMapModal: React.FC<InteractiveRouteMapModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'route_preview',
  pickupCity,
  dropCity,
  pickupCoords,
  dropCoords,
  distanceKm,
  durationText,
  routeSummary,
  routeProvider = 'ola_maps',
  routeGeometry = [],
  alternatives = [],
  selectedRouteId,
  onSelectAlternativeRoute,
  onApplyPickupPin,
  onApplyDropPin,
  trackingBooking
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropMarkerRef = useRef<maplibregl.Marker | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [activeMode, setActiveMode] = useState<MapModalMode>(
    trackingBooking ? 'live_tracking' : initialMode
  );
  const [pinTarget, setPinTarget] = useState<'pickup' | 'drop'>(
    initialMode === 'pin_drop' ? 'drop' : 'pickup'
  );

  const resolvedInitialPickup =
    pickupCoords ||
    trackingBooking?.pickupCoords ||
    resolveLocalCoordsSync(trackingBooking?.pickupCity || pickupCity) || {
      lat: 28.6139,
      lng: 77.209
    };

  const resolvedInitialDrop =
    dropCoords ||
    trackingBooking?.dropCoords ||
    resolveLocalCoordsSync(trackingBooking?.dropCity || dropCity) || {
      lat: 27.1767,
      lng: 78.0081
    };

  const [localPickupCoords, setLocalPickupCoords] = useState<Coordinates>(resolvedInitialPickup);
  const [localDropCoords, setLocalDropCoords] = useState<Coordinates>(resolvedInitialDrop);
  const [localPickupAddress, setLocalPickupAddress] = useState<string>(
    trackingBooking?.pickupCity || pickupCity || 'Delhi NCR'
  );
  const [localDropAddress, setLocalDropAddress] = useState<string>(
    trackingBooking?.dropCity || dropCity || 'Agra, Uttar Pradesh'
  );

  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [pinNotice, setPinNotice] = useState('');
  const [pinError, setPinError] = useState('');

  // Live Driver Tracking Telemetry state
  const [telemetryData, setTelemetryData] = useState<LiveDriverTelemetry | null>(null);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(trackingBooking ? 'live_tracking' : initialMode);
      if (initialMode === 'pin_drop') setPinTarget('drop');
      if (initialMode === 'pin_pickup') setPinTarget('pickup');
      setLocalPickupCoords(resolvedInitialPickup);
      setLocalDropCoords(resolvedInitialDrop);
      setLocalPickupAddress(trackingBooking?.pickupCity || pickupCity || 'Delhi NCR');
      setLocalDropAddress(trackingBooking?.dropCity || dropCity || 'Agra, Uttar Pradesh');
      setPinNotice('');
      setPinError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode, trackingBooking?.id]);

  // Poll Live Driver Telemetry when in live_tracking mode
  const loadDriverTelemetry = async () => {
    setIsRefreshingTelemetry(true);
    try {
      const data = await fetchLiveDriverTelemetry({
        bookingId: trackingBooking?.id || 'SIC2603',
        pickupCity: trackingBooking?.pickupCity || localPickupAddress,
        dropCity: trackingBooking?.dropCity || localDropAddress,
        distanceKm: trackingBooking?.distanceKm || distanceKm,
        driverName: trackingBooking?.driverName || 'Dharmendar Sharma',
        driverPhone: trackingBooking?.driverPhone || '7053441079',
        vehicleNo: trackingBooking?.driverVehicleNo || 'DL 1Z C 4829',
        vehicleModel: trackingBooking?.driverVehicleModel || trackingBooking?.cabName || 'Sedan AC',
        originCoords: localPickupCoords,
        destCoords: localDropCoords,
        geometry: trackingBooking?.routeGeometry || routeGeometry
      });
      if (data) {
        setTelemetryData(data);
      }
    } finally {
      setIsRefreshingTelemetry(false);
    }
  };

  useEffect(() => {
    if (!isOpen || activeMode !== 'live_tracking') return;
    loadDriverTelemetry();
    const interval = window.setInterval(loadDriverTelemetry, 4500);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeMode, trackingBooking?.id]);

  // Initialize MapLibre GL JS Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: INDIA_MAP_STYLE,
      center: [
        (localPickupCoords.lng + localDropCoords.lng) / 2,
        (localPickupCoords.lat + localDropCoords.lat) / 2
      ],
      zoom: 6.5
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapInstanceRef.current = map;

    map.on('load', () => {
      // Source for Alternative Routes
      map.addSource('alt-route-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'alt-route-line',
        type: 'line',
        source: 'alt-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#64748B',
          'line-width': 4,
          'line-dasharray': [2, 2],
          'line-opacity': 0.75
        }
      });

      // Source for Primary Active Route Polyline
      map.addSource('primary-route-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'primary-route-casing',
        type: 'line',
        source: 'primary-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#0F172A',
          'line-width': 8,
          'line-opacity': 0.85
        }
      });

      map.addLayer({
        id: 'primary-route-line',
        type: 'line',
        source: 'primary-route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#F59E0B',
          'line-width': 5
        }
      });

      updateMapPolylinesAndMarkers(map);
    });

    // Click handler for manual map pin placement
    map.on('click', async (e: maplibregl.MapMouseEvent) => {
      const clickedLat = Number(e.lngLat.lat.toFixed(5));
      const clickedLng = Number(e.lngLat.lng.toFixed(5));
      await handleMapPinDrop(clickedLat, clickedLng);
    });

    return () => {
      pickupMarkerRef.current?.remove();
      dropMarkerRef.current?.remove();
      driverMarkerRef.current?.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleMapPinDrop = async (lat: number, lng: number, targetOverride?: 'pickup' | 'drop') => {
    const target = targetOverride || pinTarget;
    setIsReverseGeocoding(true);
    setPinError('');
    try {
      const rev = await reverseGeocodeCoordinates(lat, lng);
      if (!rev.success && rev.errorMessage) {
        setPinError(rev.errorMessage);
      }
      if (target === 'pickup') {
        setLocalPickupCoords({ lat, lng });
        setLocalPickupAddress(rev.formattedAddress);
        setPinNotice(`Pickup Pin set: ${rev.formattedAddress}`);
        if (onApplyPickupPin) {
          onApplyPickupPin(rev.formattedAddress, { lat, lng });
        }
      } else {
        setLocalDropCoords({ lat, lng });
        setLocalDropAddress(rev.formattedAddress);
        setPinNotice(`Drop Pin set: ${rev.formattedAddress}`);
        if (onApplyDropPin) {
          onApplyDropPin(rev.formattedAddress, { lat, lng });
        }
      }
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleUseCurrentGps = async () => {
    setIsDetectingGps(true);
    setPinError('');
    try {
      const gpsRes = await detectCurrentGpsLocation();
      if (gpsRes.success && gpsRes.coords && gpsRes.address) {
        if (pinTarget === 'pickup') {
          setLocalPickupCoords(gpsRes.coords);
          setLocalPickupAddress(gpsRes.address);
          setPinNotice(`GPS Pickup Detected: ${gpsRes.address}`);
          onApplyPickupPin?.(gpsRes.address, gpsRes.coords);
        } else {
          setLocalDropCoords(gpsRes.coords);
          setLocalDropAddress(gpsRes.address);
          setPinNotice(`GPS Drop Detected: ${gpsRes.address}`);
          onApplyDropPin?.(gpsRes.address, gpsRes.coords);
        }
        mapInstanceRef.current?.flyTo({
          center: [gpsRes.coords.lng, gpsRes.coords.lat],
          zoom: 12
        });
      } else {
        setPinError(gpsRes.errorMessage || 'Could not detect current GPS location.');
      }
    } finally {
      setIsDetectingGps(false);
    }
  };

  const updateMapPolylinesAndMarkers = (map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return;

    const activeGeometry =
      telemetryData?.geometry && telemetryData.geometry.length >= 2
        ? telemetryData.geometry
        : routeGeometry && routeGeometry.length >= 2
        ? routeGeometry
        : [
            [localPickupCoords.lng, localPickupCoords.lat],
            [localDropCoords.lng, localDropCoords.lat]
          ];

    const primarySource = map.getSource('primary-route-source') as maplibregl.GeoJSONSource | undefined;
    if (primarySource) {
      primarySource.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: activeGeometry
            }
          }
        ]
      });
    }

    const altSource = map.getSource('alt-route-source') as maplibregl.GeoJSONSource | undefined;
    if (altSource) {
      const otherRoutes = (alternatives || []).filter(
        (alt) => alt.routeId !== selectedRouteId && Array.isArray(alt.geometry) && alt.geometry.length >= 2
      );
      altSource.setData({
        type: 'FeatureCollection',
        features: otherRoutes.map((alt) => ({
          type: 'Feature',
          properties: { routeId: alt.routeId, summary: alt.summary },
          geometry: {
            type: 'LineString',
            coordinates: alt.geometry
          }
        }))
      });
    }

    // Pickup Marker (Green)
    if (!pickupMarkerRef.current) {
      const el = document.createElement('div');
      el.className =
        'px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black shadow-lg border-2 border-white flex items-center gap-1 cursor-grab';
      el.innerHTML = '<span>● PICKUP</span>';
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([localPickupCoords.lng, localPickupCoords.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        handleMapPinDrop(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)), 'pickup');
      });
      pickupMarkerRef.current = marker;
    } else {
      pickupMarkerRef.current.setLngLat([localPickupCoords.lng, localPickupCoords.lat]);
    }

    // Drop Marker (Rose/Red)
    if (!dropMarkerRef.current) {
      const el = document.createElement('div');
      el.className =
        'px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black shadow-lg border-2 border-white flex items-center gap-1 cursor-grab';
      el.innerHTML = '<span>⚑ DROP</span>';
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([localDropCoords.lng, localDropCoords.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        handleMapPinDrop(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)), 'drop');
      });
      dropMarkerRef.current = marker;
    } else {
      dropMarkerRef.current.setLngLat([localDropCoords.lng, localDropCoords.lat]);
    }

    // Live Driver Cab Marker (when in live_tracking mode)
    if (activeMode === 'live_tracking' && telemetryData?.telemetry) {
      const { lng, lat, speedKmh } = telemetryData.telemetry;
      if (!driverMarkerRef.current) {
        const cabEl = document.createElement('div');
        cabEl.className =
          'px-3 py-1.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-2xl border-2 border-slate-950 flex items-center gap-1.5 animate-pulse';
        cabEl.innerHTML = `<span>🚕 LIVE CAB (${speedKmh} km/h)</span>`;
        driverMarkerRef.current = new maplibregl.Marker({ element: cabEl })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        driverMarkerRef.current.setLngLat([lng, lat]);
        const el = driverMarkerRef.current.getElement();
        if (el) {
          el.innerHTML = `<span>🚕 LIVE CAB (${speedKmh} km/h)</span>`;
        }
      }
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }

    // Fit map bounds to route
    try {
      const bounds = new maplibregl.LngLatBounds();
      activeGeometry.forEach((pt) => {
        if (Array.isArray(pt) && pt.length === 2) {
          bounds.extend([pt[0], pt[1]]);
        }
      });
      bounds.extend([localPickupCoords.lng, localPickupCoords.lat]);
      bounds.extend([localDropCoords.lng, localDropCoords.lat]);
      map.fitBounds(bounds, { padding: 54, maxZoom: 11, duration: 600 });
    } catch {}
  };

  useEffect(() => {
    if (mapInstanceRef.current && mapInstanceRef.current.isStyleLoaded()) {
      updateMapPolylinesAndMarkers(mapInstanceRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    localPickupCoords,
    localDropCoords,
    routeGeometry,
    alternatives,
    selectedRouteId,
    activeMode,
    telemetryData
  ]);

  if (!isOpen) return null;

  const providerBadgeText =
    routeProvider === 'ola_maps'
      ? 'Ola Maps Routing v1'
      : routeProvider === 'mappls'
      ? 'Mappls (Fallback Verified)'
      : 'Ola Maps + NHAI Highway Network';

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[1000005] flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-[#0B0F19] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
              <Route className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
                  {activeMode === 'live_tracking'
                    ? `Live Cab & Trip Tracking — Booking #${trackingBooking?.id || 'SIC2603'}`
                    : 'SafarIndiaCabs Interactive Road Map & Pin Selector'}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold">
                  {providerBadgeText}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {localPickupAddress.split(',')[0]} → {localDropAddress.split(',')[0]} • Actual Road Distance:{' '}
                <strong className="text-amber-400">{trackingBooking?.distanceKm || distanceKm} KM</strong>
                {durationText ? ` • Est. ${durationText}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close map modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher & Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveMode('route_preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'route_preview'
                  ? 'bg-slate-900 text-amber-400 shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Route & Polylines</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('pin_pickup');
                setPinTarget('pickup');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'pin_pickup' || (activeMode !== 'live_tracking' && pinTarget === 'pickup')
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tap Map for Pickup Pin</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMode('pin_drop');
                setPinTarget('drop');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'pin_drop' || (activeMode !== 'live_tracking' && pinTarget === 'drop')
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-rose-50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tap Map for Drop Pin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('live_tracking')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'live_tracking'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Live Driver GPS Tracking</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isDetectingGps}
            onClick={handleUseCurrentGps}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
          >
            {isDetectingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5" />
            )}
            <span>Use Current GPS for {pinTarget === 'pickup' ? 'Pickup' : 'Drop'}</span>
          </button>
        </div>

        {/* Main Body: Map Canvas + Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto lg:overflow-hidden">
          {/* MapLibre GL JS Interactive Map Canvas */}
          <div className="lg:col-span-8 relative min-h-[320px] sm:min-h-[420px] bg-slate-200">
            <div ref={mapContainerRef} className="w-full h-full min-h-[320px] sm:min-h-[420px]" />

            {/* Floating Overlay Info on Map */}
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-slate-950/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl border border-slate-800 shadow-xl text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isReverseGeocoding
                      ? 'Reverse Geocoding Pin Coordinates...'
                      : `Click anywhere on map or drag markers to set ${pinTarget.toUpperCase()}`}
                  </span>
                </span>
              </div>
              <div className="text-[11px] text-slate-300 truncate">
                Pickup: {localPickupCoords.lat.toFixed(4)}°N, {localPickupCoords.lng.toFixed(4)}°E • Drop:{' '}
                {localDropCoords.lat.toFixed(4)}°N, {localDropCoords.lng.toFixed(4)}°E
              </div>
            </div>
          </div>

          {/* Right Sidebar: Route Details, Alternative Routes, or Live Driver Telemetry */}
          <div className="lg:col-span-4 p-4 sm:p-5 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto space-y-4">
            {pinNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{pinNotice}</span>
              </div>
            )}

            {pinError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{pinError}</span>
              </div>
            )}

            {activeMode === 'live_tracking' ? (
              /* LIVE DRIVER & TRIP TRACKING PANEL */
              <div className="space-y-4">
                <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ● LIVE GPS TELEMETRY ACTIVE
                    </span>
                    <button
                      type="button"
                      onClick={loadDriverTelemetry}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTelemetry ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Current Highway Status</div>
                    <div className="text-sm font-black text-amber-400 mt-0.5">
                      {telemetryData?.telemetry?.statusText || 'Cruising on National Highway Corridor'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="bg-slate-800/90 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Speed</div>
                      <div className="text-sm font-black text-white">
                        {telemetryData?.telemetry?.speedKmh || 62} km/h
                      </div>
                    </div>
                    <div className="bg-slate-800/90 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Remaining</div>
                      <div className="text-sm font-black text-amber-400">
                        {telemetryData?.telemetry?.distanceRemainingKm ?? Math.round(distanceKm * 0.65)} KM
                      </div>
                    </div>
                    <div className="bg-slate-800/90 rounded-xl p-2">
                      <div className="text-[10px] text-slate-400">Live ETA</div>
                      <div className="text-sm font-black text-emerald-400">
                        {telemetryData?.telemetry?.etaText || durationText || '2 hr 40 mins'}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-300 font-semibold">
                      <span>Covered: {telemetryData?.telemetry?.distanceCoveredKm ?? Math.round(distanceKm * 0.35)} KM</span>
                      <span>Total: {telemetryData?.telemetry?.totalDistanceKm || distanceKm} KM</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(12, Math.round((telemetryData?.telemetry?.fractionCompleted || 0.35) * 100))
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Assigned Driver Details Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Assigned Chauffeur & Cab
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        {telemetryData?.driver?.name || trackingBooking?.driverName || 'Dharmendar Sharma'}
                      </div>
                      <div className="text-xs text-slate-600 font-semibold">
                        {telemetryData?.driver?.vehicleModel || trackingBooking?.driverVehicleModel || 'Maruti Dzire AC'} •{' '}
                        <span className="font-mono font-bold text-slate-900">
                          {telemetryData?.driver?.vehicleNo || trackingBooking?.driverVehicleNo || 'DL 1Z C 4829'}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`tel:+91${telemetryData?.driver?.phone || trackingBooking?.driverPhone || '7053441079'}`}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Driver</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* ROUTE GEOMETRY, PIN COORDINATES & ALTERNATIVE ROUTES PANEL */
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Pinned Route Coordinates
                  </div>

                  <div
                    onClick={() => setPinTarget('pickup')}
                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                      pinTarget === 'pickup'
                        ? 'bg-emerald-50/70 border-emerald-400'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                      <span>● PICKUP LOCATION PIN</span>
                      <span className="font-mono">
                        {localPickupCoords.lat.toFixed(4)}°N, {localPickupCoords.lng.toFixed(4)}°E
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">
                      {localPickupAddress}
                    </div>
                  </div>

                  <div
                    onClick={() => setPinTarget('drop')}
                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                      pinTarget === 'drop'
                        ? 'bg-rose-50/70 border-rose-400'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-rose-800">
                      <span>⚑ DROP LOCATION PIN</span>
                      <span className="font-mono">
                        {localDropCoords.lat.toFixed(4)}°N, {localDropCoords.lng.toFixed(4)}°E
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">
                      {localDropAddress}
                    </div>
                  </div>
                </div>

                {/* Alternative Routes Selector */}
                <div className="space-y-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Available Highway Routes ({alternatives.length > 0 ? alternatives.length : 1})
                  </div>

                  {alternatives && alternatives.length > 0 ? (
                    <div className="space-y-2">
                      {alternatives.map((alt, idx) => {
                        const isSelected = selectedRouteId
                          ? alt.routeId === selectedRouteId
                          : idx === 0;
                        return (
                          <button
                            key={alt.routeId}
                            type="button"
                            onClick={() => onSelectAlternativeRoute?.(alt)}
                            className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer ${
                              isSelected
                                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {idx === 0 ? 'Primary Recommended Route' : `Alternative Route #${idx + 1}`}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-400 font-mono text-xs font-black">
                                {alt.distanceKm} KM
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 font-semibold mt-1">
                              {alt.summary}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Est. {alt.durationText}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">Actual Road Distance</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">
                          {routeSummary || 'Primary National Highway Corridor'}
                        </span>
                        <span className="font-mono text-xs font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md">
                          {distanceKm} KM
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Estimated Travel Duration: {durationText || 'Calculated via Ola Maps Road Network'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs transition cursor-pointer shadow-sm"
            >
              Confirm Route & Return to Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
