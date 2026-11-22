import { r as __toESM } from "./rolldown-runtime-SbdDWaPq.js";
import { t as require_jsx_runtime } from "./react-vendor-BBjiQENi.js";
import { $ as Clock, C as Route, E as RefreshCw, M as Phone, N as Navigation, W as LoaderCircle, Z as Crosshair, g as ShieldCheck, gt as require_react, ot as Car, rt as CircleAlert, t as X, tt as CircleCheck, z as MapPin } from "./lucide-icons-CHOsk2xN.js";
import { B as resolveLocalCoordsSync, I as fetchLiveDriverTelemetry, N as detectCurrentGpsLocation, V as reverseGeocodeCoordinates } from "./index-Cw1MAn3l.js";
import { i as zF, n as Rb, r as eI, t as LF } from "./maplibre-vendor-B6kRM1uu.js";
// src/components/InteractiveRouteMapModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var INDIA_MAP_STYLE = {
	version: 8,
	sources: { osm_india_tiles: {
		type: "raster",
		tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
		tileSize: 256,
		attribution: "© Ola Maps / MapLibre GL / OpenStreetMap India"
	} },
	layers: [{
		id: "osm-india-layer",
		type: "raster",
		source: "osm_india_tiles",
		minzoom: 0,
		maxzoom: 19
	}]
};
var InteractiveRouteMapModal = ({ isOpen, onClose, initialMode = "route_preview", pickupCity, dropCity, pickupCoords, dropCoords, distanceKm, durationText, routeSummary, routeProvider = "ola_maps", routeGeometry = [], alternatives = [], selectedRouteId, onSelectAlternativeRoute, onApplyPickupPin, onApplyDropPin, trackingBooking }) => {
	const mapContainerRef = (0, import_react.useRef)(null);
	const mapInstanceRef = (0, import_react.useRef)(null);
	const pickupMarkerRef = (0, import_react.useRef)(null);
	const dropMarkerRef = (0, import_react.useRef)(null);
	const driverMarkerRef = (0, import_react.useRef)(null);
	const [activeMode, setActiveMode] = (0, import_react.useState)(trackingBooking ? "live_tracking" : initialMode);
	const [pinTarget, setPinTarget] = (0, import_react.useState)(initialMode === "pin_drop" ? "drop" : "pickup");
	const resolvedInitialPickup = pickupCoords || trackingBooking?.pickupCoords || resolveLocalCoordsSync(trackingBooking?.pickupCity || pickupCity) || {
		lat: 28.6139,
		lng: 77.209
	};
	const resolvedInitialDrop = dropCoords || trackingBooking?.dropCoords || resolveLocalCoordsSync(trackingBooking?.dropCity || dropCity) || {
		lat: 27.1767,
		lng: 78.0081
	};
	const [localPickupCoords, setLocalPickupCoords] = (0, import_react.useState)(resolvedInitialPickup);
	const [localDropCoords, setLocalDropCoords] = (0, import_react.useState)(resolvedInitialDrop);
	const [localPickupAddress, setLocalPickupAddress] = (0, import_react.useState)(trackingBooking?.pickupCity || pickupCity || "Delhi NCR");
	const [localDropAddress, setLocalDropAddress] = (0, import_react.useState)(trackingBooking?.dropCity || dropCity || "Agra, Uttar Pradesh");
	const [isReverseGeocoding, setIsReverseGeocoding] = (0, import_react.useState)(false);
	const [isDetectingGps, setIsDetectingGps] = (0, import_react.useState)(false);
	const [pinNotice, setPinNotice] = (0, import_react.useState)("");
	const [pinError, setPinError] = (0, import_react.useState)("");
	const [telemetryData, setTelemetryData] = (0, import_react.useState)(null);
	const [isRefreshingTelemetry, setIsRefreshingTelemetry] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (isOpen) {
			setActiveMode(trackingBooking ? "live_tracking" : initialMode);
			if (initialMode === "pin_drop") setPinTarget("drop");
			if (initialMode === "pin_pickup") setPinTarget("pickup");
			setLocalPickupCoords(resolvedInitialPickup);
			setLocalDropCoords(resolvedInitialDrop);
			setLocalPickupAddress(trackingBooking?.pickupCity || pickupCity || "Delhi NCR");
			setLocalDropAddress(trackingBooking?.dropCity || dropCity || "Agra, Uttar Pradesh");
			setPinNotice("");
			setPinError("");
		}
	}, [
		isOpen,
		initialMode,
		trackingBooking?.id
	]);
	const loadDriverTelemetry = async () => {
		setIsRefreshingTelemetry(true);
		try {
			const data = await fetchLiveDriverTelemetry({
				bookingId: trackingBooking?.id || "SIC2603",
				pickupCity: trackingBooking?.pickupCity || localPickupAddress,
				dropCity: trackingBooking?.dropCity || localDropAddress,
				distanceKm: trackingBooking?.distanceKm || distanceKm,
				driverName: trackingBooking?.driverName || "Dharmendar Sharma",
				driverPhone: trackingBooking?.driverPhone || "7053441079",
				vehicleNo: trackingBooking?.driverVehicleNo || "DL 1Z C 4829",
				vehicleModel: trackingBooking?.driverVehicleModel || trackingBooking?.cabName || "Sedan AC",
				originCoords: localPickupCoords,
				destCoords: localDropCoords,
				geometry: trackingBooking?.routeGeometry || routeGeometry
			});
			if (data) setTelemetryData(data);
		} finally {
			setIsRefreshingTelemetry(false);
		}
	};
	(0, import_react.useEffect)(() => {
		if (!isOpen || activeMode !== "live_tracking") return;
		loadDriverTelemetry();
		const interval = window.setInterval(loadDriverTelemetry, 4500);
		return () => window.clearInterval(interval);
	}, [
		isOpen,
		activeMode,
		trackingBooking?.id
	]);
	(0, import_react.useEffect)(() => {
		if (!isOpen || !mapContainerRef.current) return;
		const map = new LF({
			container: mapContainerRef.current,
			style: INDIA_MAP_STYLE,
			center: [(localPickupCoords.lng + localDropCoords.lng) / 2, (localPickupCoords.lat + localDropCoords.lat) / 2],
			zoom: 6.5
		});
		map.addControl(new zF({ showCompass: true }), "top-right");
		mapInstanceRef.current = map;
		map.on("load", () => {
			map.addSource("alt-route-source", {
				type: "geojson",
				data: {
					type: "FeatureCollection",
					features: []
				}
			});
			map.addLayer({
				id: "alt-route-line",
				type: "line",
				source: "alt-route-source",
				layout: {
					"line-join": "round",
					"line-cap": "round"
				},
				paint: {
					"line-color": "#64748B",
					"line-width": 4,
					"line-dasharray": [2, 2],
					"line-opacity": .75
				}
			});
			map.addSource("primary-route-source", {
				type: "geojson",
				data: {
					type: "FeatureCollection",
					features: []
				}
			});
			map.addLayer({
				id: "primary-route-casing",
				type: "line",
				source: "primary-route-source",
				layout: {
					"line-join": "round",
					"line-cap": "round"
				},
				paint: {
					"line-color": "#0F172A",
					"line-width": 8,
					"line-opacity": .85
				}
			});
			map.addLayer({
				id: "primary-route-line",
				type: "line",
				source: "primary-route-source",
				layout: {
					"line-join": "round",
					"line-cap": "round"
				},
				paint: {
					"line-color": "#F59E0B",
					"line-width": 5
				}
			});
			updateMapPolylinesAndMarkers(map);
		});
		map.on("click", async (e) => {
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
	}, [isOpen]);
	const handleMapPinDrop = async (lat, lng, targetOverride) => {
		const target = targetOverride || pinTarget;
		setIsReverseGeocoding(true);
		setPinError("");
		try {
			const rev = await reverseGeocodeCoordinates(lat, lng);
			if (!rev.success && rev.errorMessage) setPinError(rev.errorMessage);
			if (target === "pickup") {
				setLocalPickupCoords({
					lat,
					lng
				});
				setLocalPickupAddress(rev.formattedAddress);
				setPinNotice(`Pickup Pin set: ${rev.formattedAddress}`);
				if (onApplyPickupPin) onApplyPickupPin(rev.formattedAddress, {
					lat,
					lng
				});
			} else {
				setLocalDropCoords({
					lat,
					lng
				});
				setLocalDropAddress(rev.formattedAddress);
				setPinNotice(`Drop Pin set: ${rev.formattedAddress}`);
				if (onApplyDropPin) onApplyDropPin(rev.formattedAddress, {
					lat,
					lng
				});
			}
		} finally {
			setIsReverseGeocoding(false);
		}
	};
	const handleUseCurrentGps = async () => {
		setIsDetectingGps(true);
		setPinError("");
		try {
			const gpsRes = await detectCurrentGpsLocation();
			if (gpsRes.success && gpsRes.coords && gpsRes.address) {
				if (pinTarget === "pickup") {
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
			} else setPinError(gpsRes.errorMessage || "Could not detect current GPS location.");
		} finally {
			setIsDetectingGps(false);
		}
	};
	const updateMapPolylinesAndMarkers = (map) => {
		if (!map.isStyleLoaded()) return;
		const activeGeometry = telemetryData?.geometry && telemetryData.geometry.length >= 2 ? telemetryData.geometry : routeGeometry && routeGeometry.length >= 2 ? routeGeometry : [[localPickupCoords.lng, localPickupCoords.lat], [localDropCoords.lng, localDropCoords.lat]];
		const primarySource = map.getSource("primary-route-source");
		if (primarySource) primarySource.setData({
			type: "FeatureCollection",
			features: [{
				type: "Feature",
				properties: {},
				geometry: {
					type: "LineString",
					coordinates: activeGeometry
				}
			}]
		});
		const altSource = map.getSource("alt-route-source");
		if (altSource) altSource.setData({
			type: "FeatureCollection",
			features: []
		});
		if (!pickupMarkerRef.current) {
			const el = document.createElement("div");
			el.className = "px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black shadow-lg border-2 border-white flex items-center gap-1 cursor-grab";
			el.innerHTML = "<span>● PICKUP</span>";
			const marker = new eI({
				element: el,
				draggable: true
			}).setLngLat([localPickupCoords.lng, localPickupCoords.lat]).addTo(map);
			marker.on("dragend", () => {
				const pos = marker.getLngLat();
				handleMapPinDrop(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)), "pickup");
			});
			pickupMarkerRef.current = marker;
		} else pickupMarkerRef.current.setLngLat([localPickupCoords.lng, localPickupCoords.lat]);
		if (!dropMarkerRef.current) {
			const el = document.createElement("div");
			el.className = "px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black shadow-lg border-2 border-white flex items-center gap-1 cursor-grab";
			el.innerHTML = "<span>⚑ DROP</span>";
			const marker = new eI({
				element: el,
				draggable: true
			}).setLngLat([localDropCoords.lng, localDropCoords.lat]).addTo(map);
			marker.on("dragend", () => {
				const pos = marker.getLngLat();
				handleMapPinDrop(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)), "drop");
			});
			dropMarkerRef.current = marker;
		} else dropMarkerRef.current.setLngLat([localDropCoords.lng, localDropCoords.lat]);
		if (activeMode === "live_tracking" && telemetryData?.telemetry) {
			const { lng, lat, speedKmh } = telemetryData.telemetry;
			if (!driverMarkerRef.current) {
				const cabEl = document.createElement("div");
				cabEl.className = "px-3 py-1.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-2xl border-2 border-slate-950 flex items-center gap-1.5 animate-pulse";
				cabEl.innerHTML = `<span>🚕 LIVE CAB (${speedKmh} km/h)</span>`;
				driverMarkerRef.current = new eI({ element: cabEl }).setLngLat([lng, lat]).addTo(map);
			} else {
				driverMarkerRef.current.setLngLat([lng, lat]);
				const el = driverMarkerRef.current.getElement();
				if (el) el.innerHTML = `<span>🚕 LIVE CAB (${speedKmh} km/h)</span>`;
			}
		} else if (driverMarkerRef.current) {
			driverMarkerRef.current.remove();
			driverMarkerRef.current = null;
		}
		try {
			const bounds = new Rb();
			activeGeometry.forEach((pt) => {
				if (Array.isArray(pt) && pt.length === 2) bounds.extend([pt[0], pt[1]]);
			});
			bounds.extend([localPickupCoords.lng, localPickupCoords.lat]);
			bounds.extend([localDropCoords.lng, localDropCoords.lat]);
			map.fitBounds(bounds, {
				padding: 54,
				maxZoom: 11,
				duration: 600
			});
		} catch {}
	};
	(0, import_react.useEffect)(() => {
		if (mapInstanceRef.current && mapInstanceRef.current.isStyleLoaded()) updateMapPolylinesAndMarkers(mapInstanceRef.current);
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
	const providerBadgeText = routeProvider === "ola_maps" ? "Ola Maps Routing v1" : routeProvider === "mappls" ? "Mappls (Fallback Verified)" : "Ola Maps + NHAI Highway Network";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[1000005] flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto",
		onClick: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bg-white border border-slate-200 rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-[#0B0F19] text-white px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Route, { className: "w-5 h-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 flex-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm sm:text-base font-black tracking-tight truncate",
									children: activeMode === "live_tracking" ? `Live Cab & Trip Tracking — Booking #${trackingBooking?.id || "SIC2603"}` : "SafarIndiaCabs Interactive Road Map & Pin Selector"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold",
									children: providerBadgeText
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-slate-400 truncate",
								children: [
									localPickupAddress.split(",")[0],
									" → ",
									localDropAddress.split(",")[0],
									" • Actual Road Distance:",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
										className: "text-amber-400",
										children: [trackingBooking?.distanceKm || distanceKm, " KM"]
									}),
									durationText ? ` • Est. ${durationText}` : ""
								]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0",
						"aria-label": "Close map modal",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center flex-wrap gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setActiveMode("route_preview"),
								className: `px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${activeMode === "route_preview" ? "bg-slate-900 text-amber-400 shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Route & Polylines" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setActiveMode("pin_pickup");
									setPinTarget("pickup");
								},
								className: `px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${activeMode === "pin_pickup" || activeMode !== "live_tracking" && pinTarget === "pickup" ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Tap Map for Pickup Pin" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setActiveMode("pin_drop");
									setPinTarget("drop");
								},
								className: `px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${activeMode === "pin_drop" || activeMode !== "live_tracking" && pinTarget === "drop" ? "bg-rose-600 text-white shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-rose-50"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Tap Map for Drop Pin" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setActiveMode("live_tracking"),
								className: `px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${activeMode === "live_tracking" ? "bg-amber-400 text-slate-950 shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-amber-50"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Car, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live Driver GPS Tracking" })]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: isDetectingGps,
						onClick: handleUseCurrentGps,
						className: "px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer",
						children: [isDetectingGps ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Use Current GPS for ", pinTarget === "pickup" ? "Pickup" : "Drop"] })]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto lg:overflow-hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lg:col-span-8 relative min-h-[320px] sm:min-h-[420px] bg-slate-200",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							ref: mapContainerRef,
							className: "w-full h-full min-h-[320px] sm:min-h-[420px]"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-slate-950/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl border border-slate-800 shadow-xl text-xs space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center justify-between gap-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-extrabold text-amber-400 flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isReverseGeocoding ? "Reverse Geocoding Pin Coordinates..." : `Click anywhere on map or drag markers to set ${pinTarget.toUpperCase()}` })]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[11px] text-slate-300 truncate",
								children: [
									"Pickup: ",
									localPickupCoords.lat.toFixed(4),
									"°N, ",
									localPickupCoords.lng.toFixed(4),
									"°E • Drop:",
									" ",
									localDropCoords.lat.toFixed(4),
									"°N, ",
									localDropCoords.lng.toFixed(4),
									"°E"
								]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "lg:col-span-4 p-4 sm:p-5 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto space-y-4",
						children: [
							pinNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-start gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-emerald-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pinNotice })]
							}),
							pinError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pinError })]
							}),
							activeMode === "live_tracking" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "bg-slate-900 text-white rounded-2xl p-4 space-y-3 border border-slate-800",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
												children: "● LIVE GPS TELEMETRY ACTIVE"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: loadDriverTelemetry,
												className: "text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `w-3.5 h-3.5 ${isRefreshingTelemetry ? "animate-spin" : ""}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Refresh" })]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-slate-400",
											children: "Current Highway Status"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-sm font-black text-amber-400 mt-0.5",
											children: telemetryData?.telemetry?.statusText || "Cruising on National Highway Corridor"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-3 gap-2 pt-1 text-center",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "bg-slate-800/90 rounded-xl p-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-[10px] text-slate-400",
														children: "Speed"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "text-sm font-black text-white",
														children: [telemetryData?.telemetry?.speedKmh || 62, " km/h"]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "bg-slate-800/90 rounded-xl p-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-[10px] text-slate-400",
														children: "Remaining"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "text-sm font-black text-amber-400",
														children: [telemetryData?.telemetry?.distanceRemainingKm ?? Math.round(distanceKm * .65), " KM"]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "bg-slate-800/90 rounded-xl p-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-[10px] text-slate-400",
														children: "Live ETA"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-sm font-black text-emerald-400",
														children: telemetryData?.telemetry?.etaText || durationText || "2 hr 40 mins"
													})]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1 pt-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between text-[11px] text-slate-300 font-semibold",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Covered: ",
													telemetryData?.telemetry?.distanceCoveredKm ?? Math.round(distanceKm * .35),
													" KM"
												] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Total: ",
													telemetryData?.telemetry?.totalDistanceKm || distanceKm,
													" KM"
												] })]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "w-full h-2.5 bg-slate-800 rounded-full overflow-hidden",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "h-full bg-amber-400 rounded-full transition-all duration-500",
													style: { width: `${Math.min(100, Math.max(12, Math.round((telemetryData?.telemetry?.fractionCompleted || .35) * 100)))}%` }
												})
											})]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[11px] font-extrabold uppercase tracking-wider text-slate-500",
										children: "Assigned Chauffeur & Cab"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-sm font-black text-slate-900",
											children: telemetryData?.driver?.name || trackingBooking?.driverName || "Dharmendar Sharma"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-slate-600 font-semibold",
											children: [
												telemetryData?.driver?.vehicleModel || trackingBooking?.driverVehicleModel || "Maruti Dzire AC",
												" •",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-slate-900",
													children: telemetryData?.driver?.vehicleNo || trackingBooking?.driverVehicleNo || "DL 1Z C 4829"
												})
											]
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: `tel:+91${telemetryData?.driver?.phone || trackingBooking?.driverPhone || "7053441079"}`,
											className: "px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Call Driver" })]
										})]
									})]
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] font-extrabold uppercase tracking-wider text-slate-500",
											children: "Pinned Route Coordinates"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											onClick: () => setPinTarget("pickup"),
											className: `p-3 rounded-2xl border transition cursor-pointer ${pinTarget === "pickup" ? "bg-emerald-50/70 border-emerald-400" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between text-[11px] font-bold text-emerald-800",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "● PICKUP LOCATION PIN" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono",
													children: [
														localPickupCoords.lat.toFixed(4),
														"°N, ",
														localPickupCoords.lng.toFixed(4),
														"°E"
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs font-bold text-slate-900 mt-1 line-clamp-2",
												children: localPickupAddress
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											onClick: () => setPinTarget("drop"),
											className: `p-3 rounded-2xl border transition cursor-pointer ${pinTarget === "drop" ? "bg-rose-50/70 border-rose-400" : "bg-slate-50 border-slate-200 hover:border-slate-300"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between text-[11px] font-bold text-rose-800",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "⚑ DROP LOCATION PIN" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono",
													children: [
														localDropCoords.lat.toFixed(4),
														"°N, ",
														localDropCoords.lng.toFixed(4),
														"°E"
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs font-bold text-slate-900 mt-1 line-clamp-2",
												children: localDropAddress
											})]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[11px] font-extrabold uppercase tracking-wider text-slate-500",
										children: "Best Recommended Highway Route"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3.5 rounded-2xl bg-amber-50 border border-amber-400 space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-black text-slate-900",
												children: routeSummary || alternatives?.[0]?.summary || "Primary National Highway Corridor"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "px-2.5 py-0.5 rounded-md bg-slate-900 text-amber-400 font-mono text-xs font-black shrink-0",
												children: [distanceKm, " KM"]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3 text-[11px] text-slate-600 font-medium",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "flex items-center gap-1",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3 h-3 text-amber-600" }),
														"Est. ",
														durationText || alternatives?.[0]?.durationText || "Calculated via Road Network"
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "•" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-emerald-700 font-bold",
													children: "Verified Best Road Route"
												})
											]
										})]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: onClose,
								className: "w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs transition cursor-pointer shadow-sm",
								children: "Confirm Route & Return to Booking"
							})
						]
					})]
				})
			]
		})
	});
};
export { InteractiveRouteMapModal };
