import { r as __toESM } from "./rolldown-runtime-SbdDWaPq.js";
import { t as require_jsx_runtime } from "./react-vendor-BBjiQENi.js";
import { $ as Clock, E as RefreshCw, O as QrCode, Q as CreditCard, W as LoaderCircle, g as ShieldCheck, gt as require_react, l as Tag, nt as CircleCheckBig, ot as Car, p as Smartphone, rt as CircleAlert, t as X } from "./lucide-icons-CHOsk2xN.js";
import { A as isDrVijayKumarMatch, C as sendDualBookingNotifications, D as buildBookingFareSnapshot, E as PROMO_SUCCESS_MESSAGE, O as computeTripFare, S as sanitize10DigitPhone, a as generateNextSequentialBookingId, b as markBookingNotificationDispatched, c as saveBookingToCloudDatabase, j as isValidFirst300Promo, k as formatINR, l as savePaymentAuditLogToCloud, s as peekNextSequentialBookingId } from "./index-Cw1MAn3l.js";
// src/utils/razorpayService.ts
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
function cleanClientKey(val) {
	if (!val || typeof val !== "string") return "";
	return val.replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/g, "").replace(/\s+/g, "").replace(/['"`“”‘’]+/g, "").trim();
}
cleanClientKey("rzp_live_Toeop58v6czvrR");
/**
* Retrieve configured public Razorpay Key ID from Vite environment or localStorage
*/
function getRazorpayKeyId() {
	try {
		const viteEnvKey = cleanClientKey("rzp_live_Toeop58v6czvrR");
		if (viteEnvKey && (viteEnvKey.startsWith("rzp_live_") || viteEnvKey.startsWith("rzp_test_"))) return viteEnvKey;
		const saved = cleanClientKey(localStorage.getItem("safar_razorpay_key"));
		if (saved && (saved.startsWith("rzp_live_") || saved.startsWith("rzp_test_"))) return saved;
	} catch {}
	return "";
}
function setRazorpayKeyId(key) {
	try {
		const cleaned = cleanClientKey(key);
		if (cleaned && cleaned.startsWith("rzp_")) localStorage.setItem("safar_razorpay_key", cleaned);
		else localStorage.removeItem("safar_razorpay_key");
	} catch {}
}
var UPI_PACKAGE_MAP = {
	gpay: {
		razorpayCode: "google_pay",
		packageName: "com.google.android.apps.nbu.paisa.user",
		label: "Google Pay"
	},
	phonepe: {
		razorpayCode: "phonepe",
		packageName: "com.phonepe.app",
		label: "PhonePe"
	},
	paytm: {
		razorpayCode: "paytm",
		packageName: "net.one97.paytm",
		label: "Paytm"
	},
	bhim: {
		razorpayCode: "bhim",
		packageName: "in.org.npci.upiapp",
		label: "BHIM UPI"
	}
};
/**
* Detects current device platform accurately without any User-Agent spoofing
*/
function detectDevicePlatform() {
	if (typeof navigator === "undefined") return "desktop";
	const ua = navigator.userAgent || "";
	if (/Android/i.test(ua)) return "android";
	if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
	return "desktop";
}
/**
* Normalizes Android WebView User-Agent token (`; wv`) so Razorpay checkout.js
* enables native UPI Intent (`upi://pay`) inside Android WebViews without ever
* spoofing Desktop/Win32 or breaking mobile UPI app launching.
*/
function ensureAndroidWebViewUpiSupport() {
	if (typeof window === "undefined" || !window.navigator) return;
	try {
		const win = window;
		const currentUa = window.navigator.userAgent || "";
		if (!/Android/i.test(currentUa)) return;
		if (!win.__SAFAR_ORIGINAL_UA__) win.__SAFAR_ORIGINAL_UA__ = currentUa;
		const origUa = win.__SAFAR_ORIGINAL_UA__;
		if (/;\s*wv\b/i.test(origUa) || /\bwv\)/i.test(origUa) || /Version\/\d+\.\d+/i.test(origUa)) {
			const cleanMobileUa = origUa.replace(/;\s*wv\)/gi, ")").replace(/;\s*wv;/gi, ";").replace(/\bwv\b/gi, "").replace(/Version\/\d+\.\d+\s*/gi, "");
			Object.defineProperty(window.navigator, "userAgent", {
				get: () => cleanMobileUa,
				configurable: true
			});
			Object.defineProperty(window.navigator, "appVersion", {
				get: () => cleanMobileUa.replace(/^Mozilla\//i, ""),
				configurable: true
			});
			win.__SAFAR_ANDROID_WEBVIEW__ = true;
		}
	} catch {}
}
/**
* Detects installed UPI apps on Android 11+ (API Level 30+) via the native SafarUpiBridge
* (backed by <queries> in AndroidManifest.xml), or determines browser capability per platform.
*/
function detectInstalledUpiApps() {
	const platform = detectDevicePlatform();
	const defaultInfo = {
		gpay: true,
		phonepe: true,
		paytm: true,
		bhim: true,
		hasAnyUpiApp: true,
		installedRazorpayAppCodes: [
			"google_pay",
			"phonepe",
			"paytm",
			"bhim"
		],
		platform,
		supportsNativeUpiIntent: platform === "android" || platform === "ios"
	};
	if (typeof window === "undefined") return defaultInfo;
	try {
		const bridge = window.SafarUpiBridge;
		if (bridge && typeof bridge.getInstalledUpiAppsJson === "function") {
			const rawJson = bridge.getInstalledUpiAppsJson();
			const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
			if (parsed && typeof parsed === "object") {
				const codes = [];
				if (parsed.gpay) codes.push("google_pay");
				if (parsed.phonepe) codes.push("phonepe");
				if (parsed.paytm) codes.push("paytm");
				if (parsed.bhim) codes.push("bhim");
				const finalCodes = codes.length > 0 ? codes : [
					"google_pay",
					"phonepe",
					"paytm",
					"bhim"
				];
				return {
					gpay: parsed.gpay !== false,
					phonepe: parsed.phonepe !== false,
					paytm: parsed.paytm !== false,
					bhim: parsed.bhim !== false,
					cred: false,
					amazon_pay: false,
					hasAnyUpiApp: Boolean(parsed.hasAnyUpiApp ?? true),
					installedRazorpayAppCodes: finalCodes,
					platform,
					supportsNativeUpiIntent: true
				};
			}
		}
	} catch (err) {
		console.warn("[Razorpay Checkout] SafarUpiBridge detection fallback:", err);
	}
	return defaultInfo;
}
/**
* Fetch helper with strict AbortController timeout so requests never hang indefinitely
*/
async function fetchWithTimeout(url, options, timeoutMs = 14e3) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, {
			...options,
			signal: controller.signal
		});
	} finally {
		clearTimeout(timer);
	}
}
/**
* Ensure Razorpay checkout.js script is loaded in document with timeout protection.
* Never deletes window.Razorpay mid-session or spoofs Desktop UA.
*/
function loadRazorpayScript(timeoutMs = 1e4) {
	return new Promise((resolve) => {
		if (typeof window === "undefined") return resolve(false);
		ensureAndroidWebViewUpiSupport();
		const win = window;
		if (typeof win.Razorpay === "function") return resolve(true);
		let settled = false;
		const finish = (ok) => {
			if (!settled) {
				settled = true;
				clearTimeout(timer);
				resolve(ok);
			}
		};
		const timer = setTimeout(() => {
			finish(typeof win.Razorpay === "function");
		}, timeoutMs);
		const existingScript = document.getElementById("razorpay-checkout-js");
		if (existingScript) {
			if (typeof win.Razorpay === "function") return finish(true);
			existingScript.addEventListener("load", () => finish(typeof win.Razorpay === "function"));
			existingScript.addEventListener("error", () => {
				existingScript.remove();
				finish(false);
			});
			return;
		}
		const script = document.createElement("script");
		script.id = "razorpay-checkout-js";
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.async = true;
		script.onload = () => finish(typeof win.Razorpay === "function");
		script.onerror = () => {
			script.remove();
			finish(false);
		};
		document.body.appendChild(script);
	});
}
/**
* Ensure Razorpay iframe/modal container stays above bottom ad banner and bottom nav
*/
function applyRazorpayModalOverlapFix() {
	const adjustContainer = () => {
		document.querySelectorAll(".razorpay-container").forEach((container) => {
			container.style.setProperty("z-index", "2147483647", "important");
			container.style.setProperty("padding-bottom", "56px", "important");
			container.style.setProperty("box-sizing", "border-box", "important");
		});
		document.querySelectorAll(".razorpay-checkout-frame, .razorpay-container iframe").forEach((frame) => {
			frame.style.setProperty("z-index", "2147483647", "important");
			frame.style.setProperty("max-height", "calc(100% - 56px)", "important");
			frame.style.setProperty("margin-bottom", "52px", "important");
		});
	};
	adjustContainer();
	setTimeout(adjustContainer, 150);
	setTimeout(adjustContainer, 450);
	setTimeout(adjustContainer, 900);
}
/**
* Helper to record a client-side payment lifecycle event to `/api/payment-gateway` and Firestore `payment_logs`
*/
async function logClientPaymentEvent(event) {
	try {
		const res = await fetchWithTimeout("/api/payment-gateway", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "log_event",
				...event
			})
		}, 6e3);
		if (res.ok) {
			const data = await res.json().catch(() => null);
			if (data?.entry) {
				await savePaymentAuditLogToCloud(data.entry);
				return;
			}
		}
	} catch {}
	if (event.bookingId && event.paymentStatus) await savePaymentAuditLogToCloud({
		id: `PAYLOG-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
		bookingId: event.bookingId,
		customerName: event.customerName || "Guest Passenger",
		customerPhone: event.customerPhone || "",
		bookingAmount: Number(event.bookingAmount) || 0,
		advanceAmount: Number(event.advanceAmount) || 0,
		payableAmount: Number(event.payableAmount) || 0,
		razorpayOrderId: event.razorpayOrderId || "",
		paymentId: event.paymentId || "",
		qrId: event.qrId || "",
		paymentMethod: event.paymentMethod || "upi",
		paymentStatus: event.paymentStatus,
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		failureReason: event.failureReason || "",
		gatewayResponseSummary: event.gatewayResponseSummary || "",
		retryAttempts: Number(event.retryAttempts) || 0,
		webhookVerified: Boolean(event.webhookVerified)
	});
}
/**
* Step 1: Validate booking & create Razorpay Order on the server (/api/create-order)
*/
async function createRazorpayOrderOnServer(payload) {
	let response;
	try {
		response = await fetchWithTimeout("/api/payment-gateway?endpoint=create-order", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify({
				action: "create_order",
				endpoint: "create-order",
				...payload
			})
		}, 14e3);
	} catch (networkErr) {
		const isTimeout = networkErr?.name === "AbortError";
		throw new Error(isTimeout ? "Payment server request timed out. Please check your internet connection and retry." : "Network error while connecting to payment server. Please check your internet connection and try again.");
	}
	const rawText = await response.text().catch(() => "");
	let data = null;
	try {
		data = rawText ? JSON.parse(rawText) : null;
	} catch {
		throw new Error(`Server endpoint /api/payment-gateway?endpoint=create-order returned an invalid response (HTTP ${response.status}).`);
	}
	if (data?.alreadyPaid && data?.verifiedBooking) return data;
	if (!response.ok || !data || !data.success || !data.keyId) throw new Error(data?.error || `Unable to initialize payment order (HTTP ${response.status}). Please verify Razorpay credentials.`);
	return data;
}
/**
* Official Server-Side Razorpay Dynamic UPI QR Code Creation (`POST /api/payment-gateway` -> `/v1/payments/qr_codes`)
* Never generates a static or fake UPI QR code.
*/
async function createDynamicQrOnServer(payload) {
	try {
		const response = await fetchWithTimeout("/api/payment-gateway", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify({
				action: "create_qr",
				...payload
			})
		}, 15e3);
		const data = await response.json().catch(() => null);
		if (!data) return {
			success: false,
			canUseCheckoutQr: true,
			error: `Unexpected response from QR gateway (HTTP ${response.status}).`
		};
		return data;
	} catch (err) {
		return {
			success: false,
			canUseCheckoutQr: true,
			error: err?.name === "AbortError" ? "Dynamic QR generation timed out. You can retry or open Razorpay Checkout QR." : err?.message || "Unable to reach Razorpay QR gateway."
		};
	}
}
/**
* Checks real-time payment status on the server across QR ID, Order ID, and Payment ID
*/
async function checkPaymentStatusOnServer(params) {
	try {
		const response = await fetchWithTimeout("/api/payment-gateway", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify({
				action: "check_status",
				...params
			})
		}, 12e3);
		const data = await response.json().catch(() => null);
		if (!data) return {
			success: false,
			status: "pending",
			error: `Invalid response from status verification endpoint (HTTP ${response.status}).`
		};
		return data;
	} catch (err) {
		return {
			success: false,
			status: "pending",
			error: err?.message || "Network timeout while checking payment status."
		};
	}
}
/**
* Closes an active Razorpay Dynamic UPI QR code when user switches payment method or closes modal
*/
async function closeDynamicQrOnServer(params) {
	if (!params.qrId) return;
	try {
		await fetchWithTimeout("/api/payment-gateway", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "close_qr",
				...params
			})
		}, 6e3);
	} catch {}
}
/**
* Step 2: Verify Razorpay Payment on the server (/api/verify-payment)
* Strictly validates payment status & signature on backend. Never confirms unverified payments.
*/
async function verifyRazorpayPaymentOnServer(params) {
	let lastError = null;
	for (let attempt = 1; attempt <= 2; attempt++) try {
		const response = await fetchWithTimeout("/api/payment-gateway?endpoint=verify-payment", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json"
			},
			body: JSON.stringify({
				action: "verify_payment",
				endpoint: "verify-payment",
				...params
			})
		}, 14e3);
		const data = await response.json().catch(() => null);
		if (response.ok && data && data.success && data.verified && data.booking) return {
			verified: true,
			status: "paid",
			booking: data.booking,
			notificationsDispatched: Boolean(data.notificationsDispatched || data.notifications?.customer?.whatsappDispatched || data.notifications?.customer?.dispatched)
		};
		if (response.status === 202 || data?.status === "processing") return {
			verified: false,
			status: "processing",
			message: data?.error || "Payment is still being processed by your bank/UPI app. Your booking will confirm automatically once verified."
		};
		if (data?.status === "failed") throw new Error(data?.error || "Payment failed or was declined by your bank/UPI app.");
		lastError = new Error(data?.error || `Payment verification failed on server (HTTP ${response.status}). Booking could not be confirmed.`);
	} catch (err) {
		lastError = err instanceof Error ? err : new Error(String(err));
		if (lastError.message.includes("Payment failed or was declined")) throw lastError;
		if (attempt === 1) await new Promise((r) => setTimeout(r, 900));
	}
	throw lastError || /* @__PURE__ */ new Error("Unable to verify payment status with server right now. Please tap \"Verify Payment Status\" to check your payment.");
}
/**
* Builds a resilient Razorpay Checkout display config that prioritizes the customer's selected
* payment option at the top while ALWAYS keeping default fallback methods enabled
* (`show_default_blocks: true`). This permanently prevents "No appropriate payment method found."
*/
function buildCheckoutDisplayConfig(preferredMethod) {
	const installedUpi = detectInstalledUpiApps();
	const allowedCoreUpiApps = [
		"google_pay",
		"phonepe",
		"paytm",
		"bhim"
	];
	const baseApps = installedUpi.installedRazorpayAppCodes.filter((c) => allowedCoreUpiApps.includes(c)).length > 0 ? installedUpi.installedRazorpayAppCodes.filter((c) => allowedCoreUpiApps.includes(c)) : allowedCoreUpiApps;
	const preferredAppCode = preferredMethod && UPI_PACKAGE_MAP[preferredMethod] ? UPI_PACKAGE_MAP[preferredMethod].razorpayCode : null;
	const orderedUpiApps = preferredAppCode ? [preferredAppCode, ...baseApps.filter((app) => app !== preferredAppCode)] : baseApps;
	const isAndroid = installedUpi.platform === "android";
	if (preferredMethod === "qr") return { display: {
		blocks: { preferred_qr: {
			name: "UPI QR Code & Instant UPI",
			instruments: [{
				method: "upi",
				flows: isAndroid ? [
					"qr",
					"intent",
					"collect"
				] : ["qr", "collect"]
			}]
		} },
		sequence: ["block.preferred_qr"],
		preferences: { show_default_blocks: true }
	} };
	if (preferredMethod === "card_netbanking") return { display: {
		blocks: {
			cards_banks: {
				name: "Debit / Credit Cards & NetBanking",
				instruments: [{ method: "card" }, { method: "netbanking" }]
			},
			upi_fallback: {
				name: "UPI (Google Pay, PhonePe, Paytm, BHIM & QR)",
				instruments: [{
					method: "upi",
					flows: isAndroid ? [
						"intent",
						"collect",
						"qr"
					] : [
						"qr",
						"collect",
						"intent"
					],
					apps: orderedUpiApps
				}]
			}
		},
		sequence: ["block.cards_banks", "block.upi_fallback"],
		preferences: { show_default_blocks: true }
	} };
	return { display: {
		blocks: { upi_preferred: {
			name: preferredAppCode ? `Pay via ${UPI_PACKAGE_MAP[preferredMethod]?.label || "UPI"} & Instant UPI` : "Pay via UPI (Google Pay, PhonePe, Paytm, BHIM)",
			instruments: [{
				method: "upi",
				flows: isAndroid ? [
					"intent",
					"collect",
					"qr"
				] : [
					"qr",
					"collect",
					"intent"
				],
				apps: orderedUpiApps
			}]
		} },
		sequence: ["block.upi_preferred"],
		preferences: { show_default_blocks: true }
	} };
}
/**
* Open official Razorpay Standard Checkout and verify payment on server
*/
async function launchRazorpayStandardCheckout(checkoutParams) {
	try {
		ensureAndroidWebViewUpiSupport();
		const tripType = checkoutParams.tripType || "oneway";
		const cabId = checkoutParams.cabId || "sedan";
		const distanceKm = checkoutParams.distanceKm ?? 130;
		const extraKm = checkoutParams.extraKm ?? 0;
		const pickupDateRaw = checkoutParams.pickupDateRaw || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		const pickupTimeRaw = checkoutParams.pickupTimeRaw || "08:00 AM";
		const includeTolls = false;
		const totalFareRupees = checkoutParams.totalFareRupees ?? (checkoutParams.paymentMode === "full" ? checkoutParams.amountInRupees : Math.round(checkoutParams.amountInRupees * 5));
		const clientPublicKeyId = getRazorpayKeyId();
		checkoutParams.onStatusChange?.("Initializing secure Razorpay order...");
		const [orderData, isSdkLoaded] = await Promise.all([createRazorpayOrderOnServer({
			bookingId: checkoutParams.bookingId,
			tripType,
			cabId,
			distanceKm,
			extraKm,
			stops: checkoutParams.stops,
			waitingMinutes: checkoutParams.waitingMinutes,
			tripDays: checkoutParams.tripDays,
			routeVerified: checkoutParams.routeVerified ?? true,
			pickupCity: checkoutParams.pickupCity || "Delhi NCR",
			dropCity: checkoutParams.dropCity || checkoutParams.pickupCity || "Delhi NCR",
			pickupAddress: checkoutParams.pickupAddress || checkoutParams.pickupCity || "Doorstep Pickup",
			pickupDate: pickupDateRaw,
			pickupTime: pickupTimeRaw,
			returnDate: checkoutParams.returnDateRaw,
			returnTime: checkoutParams.returnTimeRaw,
			routeGeometry: checkoutParams.routeGeometry,
			localPackageId: checkoutParams.localPackageId || "8h_80k",
			includeTolls,
			addonCarrier: Boolean(checkoutParams.addonCarrier),
			addonPet: Boolean(checkoutParams.addonPet),
			addonAssuredModel: Boolean(checkoutParams.addonAssuredModel),
			promoCode: checkoutParams.promoCode,
			promoDiscount: checkoutParams.promoDiscount,
			paymentMode: checkoutParams.paymentMode,
			customerName: checkoutParams.customerName,
			customerPhone: checkoutParams.customerPhone,
			customerEmail: checkoutParams.customerEmail,
			clientExpectedAmountRupees: checkoutParams.amountInRupees,
			clientTotalFareRupees: totalFareRupees,
			clientPublicKeyId,
			forceNewOrder: checkoutParams.forceNewOrder
		}), loadRazorpayScript(1e4)]);
		if (orderData.alreadyPaid && orderData.verifiedBooking) {
			checkoutParams.onSuccess(orderData.verifiedBooking.transactionId || "VERIFIED_PAID", orderData.verifiedBooking, true);
			return;
		}
		const RazorpayConstructor = typeof window !== "undefined" ? window.Razorpay : null;
		if (!isSdkLoaded || typeof RazorpayConstructor !== "function") {
			await logClientPaymentEvent({
				bookingId: checkoutParams.bookingId,
				customerName: checkoutParams.customerName,
				customerPhone: checkoutParams.customerPhone,
				bookingAmount: totalFareRupees,
				advanceAmount: checkoutParams.amountInRupees,
				payableAmount: checkoutParams.amountInRupees,
				paymentMethod: checkoutParams.preferredMethod || "upi",
				paymentStatus: "failed",
				failureReason: "Razorpay checkout.js SDK failed to load (network or ad-blocker)"
			});
			checkoutParams.onError?.("Unable to load Razorpay Checkout SDK (https://checkout.razorpay.com/v1/checkout.js). Please check your internet connection or disable any ad-blocker.");
			return;
		}
		const serverKeyId = cleanClientKey(orderData.keyId) || clientPublicKeyId;
		if (!serverKeyId || !serverKeyId.startsWith("rzp_")) {
			checkoutParams.onError?.("Razorpay Key ID is not configured properly. Please verify RAZORPAY_KEY_ID / VITE_RAZORPAY_KEY_ID in environment settings.");
			return;
		}
		setRazorpayKeyId(serverKeyId);
		const resolvedBookingId = (orderData.bookingId || checkoutParams.bookingId).trim().replace(/^#/, "").toUpperCase();
		const resolvedTotalFare = orderData.fareSummary?.totalFare ?? totalFareRupees;
		const resolvedAdvancePaid = orderData.amountInRupees ?? checkoutParams.amountInRupees;
		const resolvedBalanceDue = orderData.fareSummary?.balanceDue ?? (checkoutParams.paymentMode === "full" ? 0 : Math.max(0, resolvedTotalFare - resolvedAdvancePaid));
		const customerPhone = (checkoutParams.customerPhone || "").replace(/\D/g, "").slice(-10);
		const customerEmail = checkoutParams.customerEmail || "booking@safarindiacabs.in";
		const synchronizedDraft = {
			...checkoutParams.bookingDraft || {
				id: resolvedBookingId,
				tripType,
				pickupCity: checkoutParams.pickupCity,
				dropCity: checkoutParams.dropCity,
				pickupAddress: checkoutParams.pickupAddress || checkoutParams.pickupCity,
				pickupDate: pickupDateRaw,
				pickupTime: pickupTimeRaw,
				cabId,
				cabName: checkoutParams.cabName,
				distanceKm,
				baseFare: orderData.fareSummary?.baseFare ?? resolvedAdvancePaid,
				driverAllowance: orderData.fareSummary?.driverAllowance ?? 0,
				tollsAndTaxes: orderData.fareSummary?.tollsAndTaxes ?? 0,
				gstAmount: orderData.fareSummary?.gstAmount ?? 0,
				totalFare: resolvedTotalFare,
				advancePaid: resolvedAdvancePaid,
				balanceDue: resolvedBalanceDue,
				paymentMode: checkoutParams.paymentMode,
				paymentMethod: "Razorpay",
				transactionId: "",
				customerName: checkoutParams.customerName,
				customerPhone,
				customerEmail,
				status: "confirmed",
				createdAt: (/* @__PURE__ */ new Date()).toISOString()
			},
			id: resolvedBookingId,
			totalFare: resolvedTotalFare,
			advancePaid: resolvedAdvancePaid,
			balanceDue: resolvedBalanceDue,
			paymentMode: checkoutParams.paymentMode,
			customerPhone
		};
		const hasServerOrderId = typeof orderData.orderId === "string" && orderData.orderId.startsWith("order_");
		let paymentCompletedOrHandled = false;
		const rzp = new RazorpayConstructor({
			key: serverKeyId,
			...hasServerOrderId ? { order_id: orderData.orderId } : {},
			amount: orderData.amount,
			currency: orderData.currency || "INR",
			name: "Safar India Cabs",
			description: checkoutParams.paymentMode === "full" ? `Full Cab Booking Payment (${resolvedBookingId})` : `20% Advance Cab Booking (${resolvedBookingId})`,
			image: "https://safarindiacabs.com/logo.png",
			method: {
				upi: true,
				card: true,
				netbanking: true,
				wallet: true,
				emi: false,
				paylater: false
			},
			config: buildCheckoutDisplayConfig(checkoutParams.preferredMethod),
			prefill: {
				name: checkoutParams.customerName,
				contact: customerPhone,
				email: customerEmail
			},
			notes: {
				booking_id: resolvedBookingId,
				verified_booking_id: resolvedBookingId,
				route: `${checkoutParams.pickupCity} -> ${checkoutParams.dropCity}`,
				pickup_date: checkoutParams.pickupDate,
				customer_info: `${String(checkoutParams.customerName || "Traveler").slice(0, 70)}|${customerPhone}|${String(customerEmail || "").slice(0, 70)}`,
				route_info: `${String(tripType || "oneway")}|${String(checkoutParams.pickupCity || "").slice(0, 80)}|${String(checkoutParams.dropCity || "").slice(0, 80)}|${String(synchronizedDraft.distanceKm || distanceKm || 130)}`,
				address_info: `${String(synchronizedDraft.pickupAddress || checkoutParams.pickupCity || "").slice(0, 110)}|${String(synchronizedDraft.dropAddress || checkoutParams.dropCity || "").slice(0, 110)}`,
				schedule_info: `${String(pickupDateRaw || "")}|${String(pickupTimeRaw || "")}|${String(cabId || "sedan")}|${String(checkoutParams.cabName || "Sedan AC").slice(0, 60)}`,
				fare_info: `${resolvedTotalFare}|${resolvedAdvancePaid}|${resolvedBalanceDue}|${checkoutParams.paymentMode}`
			},
			theme: { color: "#F59E0B" },
			modal: {
				confirm_close: true,
				backdropclose: false,
				animation: true,
				ondismiss: async function() {
					if (paymentCompletedOrHandled) return;
					if (hasServerOrderId) {
						checkoutParams.onStatusChange?.("Checking if payment was completed...");
						const statusCheck = await checkPaymentStatusOnServer({
							bookingId: resolvedBookingId,
							orderId: orderData.orderId,
							bookingDraft: synchronizedDraft
						});
						if (statusCheck.status === "paid" && statusCheck.verified && statusCheck.booking) {
							paymentCompletedOrHandled = true;
							checkoutParams.onSuccess(statusCheck.paymentId || statusCheck.booking.transactionId, statusCheck.booking, true);
							return;
						}
						if (statusCheck.status === "processing") {
							paymentCompletedOrHandled = true;
							checkoutParams.onVerificationPending?.({
								paymentId: statusCheck.paymentId || "",
								orderId: orderData.orderId,
								bookingId: resolvedBookingId,
								message: "Your payment is currently being processed by your bank/UPI app. We are monitoring its status."
							});
							return;
						}
					}
					await logClientPaymentEvent({
						bookingId: resolvedBookingId,
						customerName: checkoutParams.customerName,
						customerPhone,
						bookingAmount: resolvedTotalFare,
						advanceAmount: resolvedAdvancePaid,
						payableAmount: resolvedAdvancePaid,
						razorpayOrderId: orderData.orderId || "",
						paymentMethod: checkoutParams.preferredMethod || "upi",
						paymentStatus: "cancelled",
						failureReason: "Customer closed Razorpay Checkout modal before completing payment"
					});
					checkoutParams.onDismiss?.();
				}
			},
			handler: async function(response) {
				paymentCompletedOrHandled = true;
				if (!response || !response.razorpay_payment_id) {
					checkoutParams.onError?.("Payment response from Razorpay is incomplete. Booking could not be verified.");
					return;
				}
				const cleanPaymentId = String(response.razorpay_payment_id).trim();
				const resolvedOrderId = response.razorpay_order_id || (hasServerOrderId ? orderData.orderId : "");
				try {
					checkoutParams.onStatusChange?.("Verifying payment signature & status with server...");
					const verificationResult = await verifyRazorpayPaymentOnServer({
						razorpay_order_id: resolvedOrderId,
						razorpay_payment_id: cleanPaymentId,
						razorpay_signature: response.razorpay_signature || "",
						bookingId: resolvedBookingId,
						verificationToken: orderData.verificationToken,
						bookingDraft: synchronizedDraft,
						clientPublicKeyId: serverKeyId
					});
					if (verificationResult.status === "processing") {
						checkoutParams.onVerificationPending?.({
							paymentId: cleanPaymentId,
							orderId: resolvedOrderId,
							bookingId: resolvedBookingId,
							message: verificationResult.message || "Payment is currently processing. Tap \"Verify Payment Status\" in a moment to confirm."
						});
						return;
					}
					if (verificationResult.verified && verificationResult.booking) {
						await logClientPaymentEvent({
							bookingId: resolvedBookingId,
							customerName: checkoutParams.customerName,
							customerPhone,
							bookingAmount: resolvedTotalFare,
							advanceAmount: resolvedAdvancePaid,
							payableAmount: resolvedAdvancePaid,
							razorpayOrderId: resolvedOrderId,
							paymentId: cleanPaymentId,
							paymentMethod: verificationResult.booking.paymentMethod || checkoutParams.preferredMethod || "upi",
							paymentStatus: "paid",
							gatewayResponseSummary: "Verified via /api/verify-payment"
						});
						checkoutParams.onSuccess(cleanPaymentId, verificationResult.booking, verificationResult.notificationsDispatched);
						return;
					}
					checkoutParams.onError?.("Payment could not be verified on the server. Please tap \"Verify Payment Status\" if money was debited.");
				} catch (verifyErr) {
					const errMessage = String(verifyErr?.message || "");
					if (errMessage.includes("Payment failed or was declined")) {
						checkoutParams.onError?.(errMessage);
						return;
					}
					checkoutParams.onVerificationPending?.({
						paymentId: cleanPaymentId,
						orderId: resolvedOrderId,
						bookingId: resolvedBookingId,
						message: errMessage || `Payment Reference ${cleanPaymentId} received, awaiting server verification. Tap "Verify Payment Status" to complete confirmation.`
					});
				}
			}
		});
		rzp.on("payment.failed", async function(errResp) {
			const errObj = errResp?.error || {};
			const reason = errObj.description || errObj.reason || "Payment failed or was declined by your bank/UPI app. Please try again.";
			const failedPaymentId = errObj?.metadata?.payment_id || "";
			await logClientPaymentEvent({
				bookingId: resolvedBookingId,
				customerName: checkoutParams.customerName,
				customerPhone,
				bookingAmount: resolvedTotalFare,
				advanceAmount: resolvedAdvancePaid,
				payableAmount: resolvedAdvancePaid,
				razorpayOrderId: orderData.orderId || "",
				paymentId: failedPaymentId,
				paymentMethod: checkoutParams.preferredMethod || "upi",
				paymentStatus: "failed",
				failureReason: `${errObj.code || "PAYMENT_FAILED"}: ${reason}`,
				gatewayResponseSummary: JSON.stringify({
					code: errObj.code,
					step: errObj.step,
					source: errObj.source,
					reason: errObj.reason
				})
			});
			checkoutParams.onError?.(reason);
		});
		checkoutParams.onStatusChange?.("Opening Razorpay Checkout...");
		rzp.open();
		applyRazorpayModalOverlapFix();
	} catch (err) {
		console.error("[Razorpay Checkout] Exception in launchRazorpayStandardCheckout:", err);
		await logClientPaymentEvent({
			bookingId: checkoutParams.bookingId,
			customerName: checkoutParams.customerName,
			customerPhone: checkoutParams.customerPhone,
			bookingAmount: checkoutParams.totalFareRupees || checkoutParams.amountInRupees,
			advanceAmount: checkoutParams.amountInRupees,
			payableAmount: checkoutParams.amountInRupees,
			paymentMethod: checkoutParams.preferredMethod || "upi",
			paymentStatus: "failed",
			failureReason: err?.message || "Unable to start Razorpay checkout"
		});
		checkoutParams.onError?.(err?.message || "Unable to start Razorpay checkout. Please try again.");
	}
}
// src/components/BookingModal.tsx
var import_jsx_runtime = require_jsx_runtime();
var PAYMENT_GATEWAY_METHODS = [
	{
		id: "gpay",
		label: "Google Pay",
		subLabel: "Instant UPI Intent",
		dotColor: "bg-emerald-500"
	},
	{
		id: "phonepe",
		label: "PhonePe",
		subLabel: "Instant UPI Intent",
		dotColor: "bg-purple-600"
	},
	{
		id: "paytm",
		label: "Paytm UPI",
		subLabel: "Instant UPI Intent",
		dotColor: "bg-sky-500"
	},
	{
		id: "bhim",
		label: "BHIM UPI",
		subLabel: "All Bank UPI Apps",
		dotColor: "bg-orange-500"
	},
	{
		id: "qr",
		label: "UPI QR Code",
		subLabel: "Official Dynamic QR",
		dotColor: "bg-amber-500",
		isQr: true
	},
	{
		id: "card_netbanking",
		label: "Cards & Banking",
		subLabel: "Visa, RuPay, Banks",
		dotColor: "bg-slate-700",
		isCard: true
	}
];
var BookingModal = ({ isOpen, onClose, cab, fareDetails, tripType, pickupCity, dropCity, stops = [], waitingMinutes = 0, tripDays = 1, routeVerified = true, pickupDate, pickupTime, returnDate, returnTime, localPackageId, airportMode, airportTerminal, currentUser, parkingExtra: externalParkingExtra, setParkingExtra: setExternalParkingExtra, promoCode: externalPromoCode, setPromoCode: setExternalPromoCode, isPromoApplied: externalIsPromoApplied, setIsPromoApplied: setExternalIsPromoApplied, welcomeMessage, pickupCoords, dropCoords, routeProvider, routeSummary, routeDurationText, routeGeometry, onBookingSuccess }) => {
	const [customerName, setCustomerName] = (0, import_react.useState)(currentUser?.name || "");
	const [customerPhone, setCustomerPhone] = (0, import_react.useState)(currentUser?.phone || "");
	const [customerEmail, setCustomerEmail] = (0, import_react.useState)(currentUser?.email || "");
	const [pickupAddress, setPickupAddress] = (0, import_react.useState)(pickupCity || "");
	const [landmark, setLandmark] = (0, import_react.useState)("");
	const [dropAddress, setDropAddress] = (0, import_react.useState)(dropCity || "");
	const [specialNotes] = (0, import_react.useState)("");
	const [needGst, setNeedGst] = (0, import_react.useState)(false);
	const [gstNumber, setGstNumber] = (0, import_react.useState)(currentUser?.gstNumber || "");
	const [gstCompanyName, setGstCompanyName] = (0, import_react.useState)(currentUser?.companyName || "");
	const [includeTollsState, setIncludeTollsState] = (0, import_react.useState)(false);
	const [extraKmState] = (0, import_react.useState)(fareDetails.extraKm || 0);
	const [returnDateState, setReturnDateState] = (0, import_react.useState)(returnDate || pickupDate);
	const [returnTimeState, setReturnTimeState] = (0, import_react.useState)(returnTime || "06:00 PM");
	const [addonCarrier, setAddonCarrier] = (0, import_react.useState)(false);
	const [addonAssuredModel, setAddonAssuredModel] = (0, import_react.useState)(false);
	const [addonPet, setAddonPet] = (0, import_react.useState)(false);
	const initialPromoApplied = Boolean(externalIsPromoApplied || fareDetails.promoDiscount >= 300 || isValidFirst300Promo(externalPromoCode, `${currentUser?.name || ""} ${welcomeMessage || ""}`));
	const [promoCodeInput, setPromoCodeInput] = (0, import_react.useState)(externalPromoCode || (initialPromoApplied ? "FIRST300" : ""));
	const [promoApplied, setPromoApplied] = (0, import_react.useState)(initialPromoApplied);
	const [promoStatus, setPromoStatus] = (0, import_react.useState)(initialPromoApplied ? {
		type: "success",
		message: PROMO_SUCCESS_MESSAGE
	} : null);
	const [sessionBookingId, setSessionBookingId] = (0, import_react.useState)(() => peekNextSequentialBookingId());
	const hasReservedSessionIdRef = (0, import_react.useRef)(false);
	const [paymentMode, setPaymentMode] = (0, import_react.useState)("advance_20");
	const [selectedGatewayMethod, setSelectedGatewayMethod] = (0, import_react.useState)("gpay");
	const [isProcessing, setIsProcessing] = (0, import_react.useState)(false);
	const [processingStatus, setProcessingStatus] = (0, import_react.useState)("Creating secure Razorpay order...");
	const [errorMessage, setErrorMessage] = (0, import_react.useState)("");
	const [activeDynamicQr, setActiveDynamicQr] = (0, import_react.useState)(null);
	const [qrSecondsRemaining, setQrSecondsRemaining] = (0, import_react.useState)(0);
	const [isCheckingStatus, setIsCheckingStatus] = (0, import_react.useState)(false);
	const [pendingVerification, setPendingVerification] = (0, import_react.useState)(null);
	const bottomAlertRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (isOpen) {
			if (currentUser?.name) setCustomerName(currentUser.name);
			if (currentUser?.phone) setCustomerPhone(currentUser.phone);
			if (currentUser?.email) setCustomerEmail(currentUser.email);
			setPickupAddress(pickupCity || "");
			setDropAddress(dropCity || "");
			setIncludeTollsState(false);
			setReturnDateState(returnDate || pickupDate);
			setReturnTimeState(returnTime || "06:00 PM");
			setErrorMessage("");
			setIsProcessing(false);
			setActiveDynamicQr(null);
			setPendingVerification(null);
			hasReservedSessionIdRef.current = false;
			setSessionBookingId(peekNextSequentialBookingId());
		}
	}, [
		isOpen,
		currentUser,
		pickupCity,
		dropCity,
		tripType,
		fareDetails.tollsAndTaxes,
		returnDate,
		pickupDate,
		returnTime
	]);
	(0, import_react.useEffect)(() => {
		const combinedWelcomeOrName = `${customerName || ""} ${currentUser?.name || ""} ${welcomeMessage || ""}`.trim();
		if (isDrVijayKumarMatch(combinedWelcomeOrName)) {
			setPromoApplied(true);
			setExternalIsPromoApplied?.(true);
			if (!promoCodeInput.trim()) {
				setPromoCodeInput("FIRST300");
				setExternalPromoCode?.("FIRST300");
			}
			setPromoStatus({
				type: "success",
				message: PROMO_SUCCESS_MESSAGE
			});
		} else if (externalIsPromoApplied || fareDetails.promoDiscount >= 300) {
			setPromoApplied(true);
			if (!promoCodeInput.trim()) setPromoCodeInput(externalPromoCode || "FIRST300");
			setPromoStatus({
				type: "success",
				message: PROMO_SUCCESS_MESSAGE
			});
		}
	}, [
		customerName,
		currentUser?.name,
		welcomeMessage,
		externalIsPromoApplied,
		fareDetails.promoDiscount
	]);
	const handleApplyPromo = (codeOverride) => {
		const rawCode = (codeOverride !== void 0 ? codeOverride : promoCodeInput).trim();
		const combinedWelcomeOrName = `${customerName || ""} ${currentUser?.name || ""} ${welcomeMessage || ""}`.trim();
		if (isValidFirst300Promo(rawCode, combinedWelcomeOrName)) {
			const normalizedDisplayCode = rawCode.toUpperCase() === "FIRST300" || !rawCode ? "FIRST300" : rawCode;
			setPromoCodeInput(normalizedDisplayCode);
			setExternalPromoCode?.(normalizedDisplayCode);
			setPromoApplied(true);
			setExternalIsPromoApplied?.(true);
			setPromoStatus({
				type: "success",
				message: PROMO_SUCCESS_MESSAGE
			});
		} else {
			setPromoApplied(false);
			setExternalIsPromoApplied?.(false);
			setPromoStatus({
				type: "error",
				message: "Invalid promo code. Please enter a valid code."
			});
		}
	};
	(0, import_react.useEffect)(() => {
		if (isOpen) {
			ensureAndroidWebViewUpiSupport();
			const installed = detectInstalledUpiApps();
			if (installed.platform === "desktop") setSelectedGatewayMethod("qr");
			else if (installed.gpay) setSelectedGatewayMethod("gpay");
			else if (installed.phonepe) setSelectedGatewayMethod("phonepe");
			else if (installed.paytm) setSelectedGatewayMethod("paytm");
			else if (installed.bhim) setSelectedGatewayMethod("bhim");
			loadRazorpayScript().catch(() => {});
		}
	}, [isOpen]);
	(0, import_react.useEffect)(() => {
		if (isOpen && (errorMessage || pendingVerification) && bottomAlertRef.current) bottomAlertRef.current.scrollIntoView({
			behavior: "smooth",
			block: "nearest"
		});
	}, [
		isOpen,
		errorMessage,
		pendingVerification
	]);
	const activeFare = computeTripFare({
		tripType,
		cabId: cab.id,
		distanceKm: fareDetails.distanceKm,
		extraKm: extraKmState,
		pickupCity,
		dropCity,
		stops,
		waitingMinutes,
		days: tripDays,
		pickupDate,
		pickupTime,
		returnDate: tripType === "roundtrip" || tripType === "multiday" ? returnDateState : void 0,
		returnTime: tripType === "roundtrip" || tripType === "multiday" ? returnTimeState : void 0,
		localPackageId,
		includeTolls: includeTollsState,
		addonCarrier,
		addonPet,
		addonAssuredModel,
		promoCode: promoApplied ? "FIRST300" : "",
		promoDiscount: promoApplied ? 300 : 0,
		customerName,
		routeGeometry,
		routeVerified
	});
	const payableNowAmount = paymentMode === "advance_20" ? activeFare.advanceFare : activeFare.totalFare;
	const balanceDueAmount = paymentMode === "advance_20" ? activeFare.balanceDue : 0;
	(0, import_react.useEffect)(() => {
		if (activeDynamicQr && activeDynamicQr.amountInRupees !== payableNowAmount) {
			closeDynamicQrOnServer({
				qrId: activeDynamicQr.qrId,
				bookingId: activeDynamicQr.bookingId,
				paymentMode
			}).catch(() => {});
			setActiveDynamicQr(null);
		}
	}, [
		payableNowAmount,
		activeDynamicQr,
		paymentMode
	]);
	const buildCurrentBookingDraft = (0, import_react.useCallback)((resolvedBookingId, activeMethod) => {
		const cleanPhone = sanitize10DigitPhone(customerPhone) || "9570571516";
		const methodObj = PAYMENT_GATEWAY_METHODS.find((m) => m.id === activeMethod);
		const methodLabel = methodObj ? methodObj.label : "UPI / QR";
		const boundedGeometry = Array.isArray(routeGeometry) ? routeGeometry.slice(0, 40) : void 0;
		const fareSnapshot = buildBookingFareSnapshot(activeFare, routeProvider || "google_maps");
		return {
			id: resolvedBookingId,
			tripType,
			pickupCity,
			dropCity,
			stops: stops.map((s) => s.trim()).filter(Boolean),
			waitingMinutes,
			pickupCoords: pickupCoords || void 0,
			dropCoords: dropCoords || void 0,
			routeProvider: routeProvider || "google_maps",
			routeSummary: routeSummary || `${pickupCity} → ${dropCity} Highway`,
			routeDurationText: routeDurationText || void 0,
			routeGeometry: boundedGeometry,
			pricingVersion: activeFare.pricingVersion || 1,
			locationCategories: activeFare.locationCategories,
			competitorBenchmark: activeFare.competitorBenchmark,
			requiresManualQuote: Boolean(activeFare.requiresManualQuote),
			fareSnapshot,
			pickupAddress: pickupAddress.trim() || pickupCity,
			landmark: landmark.trim() || void 0,
			dropAddress: dropAddress.trim() || void 0,
			pickupDate,
			pickupTime,
			returnDate: tripType === "roundtrip" || tripType === "multiday" ? returnDateState : void 0,
			returnTime: tripType === "roundtrip" || tripType === "multiday" ? returnTimeState : void 0,
			tripDays: activeFare.daysCount || tripDays || 1,
			localPackage: tripType === "local" ? localPackageId : void 0,
			airportMode: tripType === "airport" ? airportMode : void 0,
			airportTerminal: airportTerminal.trim() || void 0,
			cabId: cab.id,
			cabName: `${cab.name} (${cab.models})`,
			distanceKm: activeFare.billedDistanceKm,
			baseFare: activeFare.baseFare + activeFare.addonsTotal,
			driverAllowance: activeFare.driverAllowance,
			tollsAndTaxes: activeFare.tollsAndTaxes,
			highwayToll: 0,
			statePermitTax: activeFare.statePermitTax,
			hillStationCharge: activeFare.hillStationCharge || 0,
			nightCharge: activeFare.nightCharges || 0,
			gstAmount: activeFare.gstAmount,
			discountAmount: activeFare.promoDiscount > 0 ? activeFare.promoDiscount : void 0,
			promoCode: activeFare.promoCodeApplied || void 0,
			totalFare: activeFare.totalFare,
			advancePaid: payableNowAmount,
			balanceDue: balanceDueAmount,
			paymentMode,
			paymentMethod: paymentMode === "advance_20" ? `Razorpay ${methodLabel} (20% Advance)` : `Razorpay ${methodLabel} (100% Full Fare)`,
			transactionId: "",
			customerName: customerName.trim() || "Guest Passenger",
			customerPhone: cleanPhone,
			customerEmail: customerEmail.trim() || void 0,
			customerGst: needGst ? gstNumber.trim().toUpperCase() : void 0,
			gstCompanyName: needGst ? gstCompanyName.trim() : void 0,
			status: "confirmed",
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			notes: [
				specialNotes.trim(),
				"TOLL & PARKING EXTRA AS PER ACTUALS",
				activeFare.promoDiscount > 0 ? `Promo Applied: FIRST300 (-₹${activeFare.promoDiscount})` : "",
				extraKmState > 0 ? `Extra Slider KM Included: +${extraKmState} KM` : "",
				addonCarrier ? "Add-on: Roof Carrier" : "",
				addonAssuredModel ? "Add-on: Assured New Model" : "",
				addonPet ? "Add-on: Pet Travel" : ""
			].filter(Boolean).join(" | ") || void 0
		};
	}, [
		customerPhone,
		routeGeometry,
		activeFare,
		routeProvider,
		tripType,
		pickupCity,
		dropCity,
		stops,
		waitingMinutes,
		tripDays,
		pickupCoords,
		dropCoords,
		routeSummary,
		routeDurationText,
		pickupAddress,
		landmark,
		dropAddress,
		pickupDate,
		pickupTime,
		returnDateState,
		returnTimeState,
		localPackageId,
		airportMode,
		airportTerminal,
		cab.id,
		cab.name,
		cab.models,
		includeTollsState,
		payableNowAmount,
		balanceDueAmount,
		paymentMode,
		customerName,
		customerEmail,
		needGst,
		gstNumber,
		gstCompanyName,
		specialNotes,
		extraKmState,
		addonCarrier,
		addonAssuredModel,
		addonPet
	]);
	const finalizeVerifiedBookingSuccess = (0, import_react.useCallback)(async (paymentId, bookingDraft, verifiedBooking, serverNotificationsDispatched) => {
		const finalConfirmedBooking = verifiedBooking ? {
			...bookingDraft,
			...verifiedBooking,
			highwayToll: verifiedBooking.highwayToll ?? bookingDraft.highwayToll,
			statePermitTax: verifiedBooking.statePermitTax ?? bookingDraft.statePermitTax,
			hillStationCharge: verifiedBooking.hillStationCharge ?? bookingDraft.hillStationCharge,
			nightCharge: verifiedBooking.nightCharge ?? bookingDraft.nightCharge,
			tripDays: verifiedBooking.tripDays ?? bookingDraft.tripDays
		} : {
			...bookingDraft,
			status: "confirmed",
			transactionId: paymentId
		};
		try {
			await saveBookingToCloudDatabase(finalConfirmedBooking);
		} catch (dbErr) {
			console.warn("Cloud booking database persistence notice:", dbErr);
		}
		if (serverNotificationsDispatched) markBookingNotificationDispatched(finalConfirmedBooking.id);
		else try {
			await sendDualBookingNotifications(finalConfirmedBooking);
		} catch (smsError) {
			console.warn("Traccar Cloud automated dual notification notice:", smsError);
		}
		setIsProcessing(false);
		setIsCheckingStatus(false);
		setActiveDynamicQr(null);
		setPendingVerification(null);
		onBookingSuccess(finalConfirmedBooking);
	}, [onBookingSuccess]);
	(0, import_react.useEffect)(() => {
		if (!isOpen || !activeDynamicQr || activeDynamicQr.status !== "active") return;
		const updateTimer = () => {
			const nowSec = Math.floor(Date.now() / 1e3);
			const remaining = Math.max(0, activeDynamicQr.closeBy - nowSec);
			setQrSecondsRemaining(remaining);
			if (remaining <= 0) setActiveDynamicQr((prev) => prev ? {
				...prev,
				status: "expired"
			} : null);
		};
		updateTimer();
		const timerInterval = setInterval(updateTimer, 1e3);
		const pollInterval = setInterval(async () => {
			const draft = buildCurrentBookingDraft(activeDynamicQr.bookingId, "qr");
			const statusRes = await checkPaymentStatusOnServer({
				bookingId: activeDynamicQr.bookingId,
				qrId: activeDynamicQr.qrId,
				bookingDraft: draft
			});
			if (statusRes.status === "paid" && statusRes.verified && statusRes.booking) {
				clearInterval(pollInterval);
				clearInterval(timerInterval);
				await finalizeVerifiedBookingSuccess(statusRes.paymentId || statusRes.booking.transactionId, draft, statusRes.booking, true);
			} else if (statusRes.status === "expired") setActiveDynamicQr((prev) => prev ? {
				...prev,
				status: "expired"
			} : null);
		}, 4e3);
		return () => {
			clearInterval(timerInterval);
			clearInterval(pollInterval);
		};
	}, [
		isOpen,
		activeDynamicQr,
		buildCurrentBookingDraft,
		finalizeVerifiedBookingSuccess
	]);
	if (!isOpen) return null;
	const validatePassengerForm = () => {
		if (!customerName.trim() || customerName.trim().length < 2) {
			setErrorMessage("Please enter passenger Full Name (at least 2 characters) before proceeding to payment.");
			const nameInput = document.getElementById("traveler-full-name");
			if (nameInput) nameInput.focus();
			return null;
		}
		const cleanPhone = sanitize10DigitPhone(customerPhone);
		if (!customerPhone.trim() || cleanPhone.length !== 10) {
			setErrorMessage("Please enter a valid 10-digit mobile number without +91 (e.g. 9876543210).");
			const phoneInput = document.getElementById("traveler-phone");
			if (phoneInput) phoneInput.focus();
			return null;
		}
		if (!pickupAddress.trim()) {
			setErrorMessage("Please enter your complete doorstep pickup address.");
			const addrInput = document.getElementById("pickup-full-address");
			if (addrInput) addrInput.focus();
			return null;
		}
		if (!activeFare || activeFare.billedDistanceKm <= 0 || activeFare.totalFare <= 0) {
			setErrorMessage("Route distance and fare validation failed. Please re-select your pickup and drop cities.");
			return null;
		}
		return cleanPhone;
	};
	const getOrReserveSessionBookingId = async () => {
		if (hasReservedSessionIdRef.current && sessionBookingId) return sessionBookingId;
		const reservedId = await generateNextSequentialBookingId();
		hasReservedSessionIdRef.current = true;
		setSessionBookingId(reservedId);
		return reservedId;
	};
	const handleManualStatusCheck = async () => {
		if (isCheckingStatus) return;
		setIsCheckingStatus(true);
		setErrorMessage("");
		try {
			const targetBookingId = pendingVerification?.bookingId || activeDynamicQr?.bookingId || sessionBookingId;
			const draft = buildCurrentBookingDraft(targetBookingId, selectedGatewayMethod);
			const res = await checkPaymentStatusOnServer({
				bookingId: targetBookingId,
				qrId: activeDynamicQr?.qrId || pendingVerification?.qrId,
				orderId: pendingVerification?.orderId,
				paymentId: pendingVerification?.paymentId,
				bookingDraft: draft
			});
			if (res.status === "paid" && res.verified && res.booking) {
				await finalizeVerifiedBookingSuccess(res.paymentId || res.booking.transactionId, draft, res.booking, true);
				return;
			}
			if (res.status === "processing") setErrorMessage("Your payment is still being processed by your bank/UPI app. Please wait 10–15 seconds and tap \"Verify Payment Status\" again.");
			else if (res.status === "failed") {
				setPendingVerification(null);
				setErrorMessage(res.error || "The previous payment attempt failed or was declined. No amount was captured — you can safely retry.");
			} else setErrorMessage("No completed payment was found yet for this booking. If you have not paid yet, please scan the QR or tap Pay below.");
		} finally {
			setIsCheckingStatus(false);
		}
	};
	const handleGenerateOfficialDynamicQr = async (forceNewQr = false) => {
		if (isProcessing) return;
		const cleanPhone = validatePassengerForm();
		if (!cleanPhone) return;
		setSelectedGatewayMethod("qr");
		setErrorMessage("");
		setIsProcessing(true);
		setProcessingStatus("Generating official Razorpay Dynamic UPI QR Code...");
		try {
			const bookingId = await getOrReserveSessionBookingId();
			const draft = buildCurrentBookingDraft(bookingId, "qr");
			const qrRes = await createDynamicQrOnServer({
				bookingId,
				tripType,
				cabId: cab.id,
				distanceKm: fareDetails.distanceKm,
				extraKm: extraKmState,
				stops,
				waitingMinutes,
				tripDays: activeFare.daysCount || tripDays || 1,
				routeVerified,
				pickupCity,
				dropCity,
				pickupAddress: pickupAddress.trim(),
				pickupDate,
				pickupTime,
				returnDate: tripType === "roundtrip" || tripType === "multiday" ? returnDateState : void 0,
				returnTime: tripType === "roundtrip" || tripType === "multiday" ? returnTimeState : void 0,
				routeGeometry,
				localPackageId,
				includeTolls: includeTollsState,
				addonCarrier,
				addonPet,
				addonAssuredModel,
				promoCode: activeFare.promoCodeApplied || void 0,
				promoDiscount: activeFare.promoDiscount || 0,
				paymentMode,
				customerName: customerName.trim(),
				customerPhone: cleanPhone,
				customerEmail: customerEmail.trim() || void 0,
				clientExpectedAmountRupees: payableNowAmount,
				clientTotalFareRupees: activeFare.totalFare,
				forceNewQr
			});
			if (qrRes.alreadyPaid && qrRes.verifiedBooking) {
				await finalizeVerifiedBookingSuccess(qrRes.verifiedBooking.transactionId || "VERIFIED_PAID", draft, qrRes.verifiedBooking, true);
				return;
			}
			if (qrRes.success && qrRes.imageUrl && qrRes.qrId) {
				setActiveDynamicQr({
					qrId: qrRes.qrId,
					imageUrl: qrRes.imageUrl,
					amountInRupees: qrRes.amountInRupees || payableNowAmount,
					bookingId: qrRes.bookingId || bookingId,
					closeBy: qrRes.closeBy || Math.floor(Date.now() / 1e3) + 600,
					status: "active"
				});
				setIsProcessing(false);
				return;
			}
			setIsProcessing(false);
			await handlePayAndConfirm("qr", true);
		} catch (err) {
			setIsProcessing(false);
			setErrorMessage(err?.message || "Unable to generate Dynamic UPI QR Code. Please try again.");
		}
	};
	const handlePayAndConfirm = async (overrideMethod, bypassStandaloneQr = false) => {
		if (isProcessing) return;
		const activeMethod = overrideMethod || selectedGatewayMethod;
		if (overrideMethod) setSelectedGatewayMethod(overrideMethod);
		if (activeMethod === "qr" && !bypassStandaloneQr) {
			await handleGenerateOfficialDynamicQr(false);
			return;
		}
		const cleanPhone = validatePassengerForm();
		if (!cleanPhone) return;
		setErrorMessage("");
		setIsProcessing(true);
		setProcessingStatus("Verifying booking status & creating secure Razorpay order...");
		const bookingId = await getOrReserveSessionBookingId();
		const bookingDraft = buildCurrentBookingDraft(bookingId, activeMethod);
		try {
			const raw = localStorage.getItem("safar_registered_customers");
			const list = raw ? JSON.parse(raw) : [];
			if (!list.some((c) => c.phone === cleanPhone)) {
				list.push({
					id: `USR-${cleanPhone}`,
					name: customerName.trim(),
					phone: cleanPhone,
					email: customerEmail.trim() || void 0,
					gstNumber: needGst ? gstNumber.trim().toUpperCase() : void 0,
					companyName: needGst ? gstCompanyName.trim() : void 0,
					createdAt: (/* @__PURE__ */ new Date()).toISOString()
				});
				localStorage.setItem("safar_registered_customers", JSON.stringify(list));
			}
		} catch {}
		if (activeDynamicQr?.qrId || pendingVerification?.orderId || pendingVerification?.paymentId) {
			const preCheck = await checkPaymentStatusOnServer({
				bookingId,
				qrId: activeDynamicQr?.qrId || pendingVerification?.qrId,
				orderId: pendingVerification?.orderId,
				paymentId: pendingVerification?.paymentId,
				bookingDraft
			});
			if (preCheck.status === "paid" && preCheck.verified && preCheck.booking) {
				await finalizeVerifiedBookingSuccess(preCheck.paymentId || preCheck.booking.transactionId, bookingDraft, preCheck.booking, true);
				return;
			}
		}
		await launchRazorpayStandardCheckout({
			amountInRupees: payableNowAmount,
			totalFareRupees: activeFare.totalFare,
			bookingId,
			tripType,
			cabId: cab.id,
			distanceKm: fareDetails.distanceKm,
			extraKm: extraKmState,
			stops,
			waitingMinutes,
			tripDays: activeFare.daysCount || tripDays || 1,
			routeVerified,
			pickupCity,
			dropCity,
			pickupAddress: pickupAddress.trim(),
			pickupDate: `${pickupDate} at ${pickupTime}`,
			pickupDateRaw: pickupDate,
			pickupTimeRaw: pickupTime,
			returnDateRaw: tripType === "roundtrip" || tripType === "multiday" ? returnDateState : void 0,
			returnTimeRaw: tripType === "roundtrip" || tripType === "multiday" ? returnTimeState : void 0,
			routeGeometry,
			localPackageId,
			includeTolls: includeTollsState,
			addonCarrier,
			addonPet,
			addonAssuredModel,
			promoCode: activeFare.promoCodeApplied || void 0,
			promoDiscount: activeFare.promoDiscount || 0,
			customerName: customerName.trim(),
			customerPhone: cleanPhone,
			customerEmail: customerEmail.trim() || void 0,
			cabName: `${cab.name} (${cab.models})`,
			paymentMode,
			preferredMethod: activeMethod,
			bookingDraft,
			onStatusChange: (statusText) => {
				setProcessingStatus(statusText);
			},
			onSuccess: async (paymentId, verifiedBooking, serverNotificationsDispatched) => {
				await finalizeVerifiedBookingSuccess(paymentId, bookingDraft, verifiedBooking, serverNotificationsDispatched);
			},
			onVerificationPending: (info) => {
				setIsProcessing(false);
				setPendingVerification(info);
				setErrorMessage("");
			},
			onDismiss: () => {
				setIsProcessing(false);
				setErrorMessage("Payment checkout was closed before completing payment. Your booking is not yet confirmed — you can safely retry below.");
			},
			onError: (errMsg) => {
				setIsProcessing(false);
				setErrorMessage(errMsg || "Payment could not be completed or verified. Please try again.");
			}
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[1000000] flex items-start sm:items-center justify-center p-2.5 sm:p-5 overflow-y-auto",
		onClick: (e) => {
			if (e.target === e.currentTarget && !isProcessing) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "booking-modal-container bg-white border border-slate-200 rounded-3xl w-full max-w-2xl my-2 sm:my-auto p-4 sm:p-6 pb-[130px] shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "sticky top-0 z-30 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200 rounded-t-3xl flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Car, { className: "w-5 h-5 text-slate-950" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm sm:text-lg font-extrabold text-slate-950 truncate",
									children: "Confirm Cab Booking & Payment"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 font-mono font-black text-[11px]",
									children: ["ID: ", peekNextSequentialBookingId()]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] sm:text-xs text-slate-500 font-medium truncate",
								children: [
									cab.name,
									" · ",
									tripType === "local" ? "Local Rental" : `${pickupCity} → ${dropCity}`
								]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: isProcessing,
						onClick: onClose,
						"aria-label": "Close checkout modal",
						title: "Close & Return to Search",
						className: "w-10 h-10 rounded-full bg-slate-100 hover:bg-rose-100 disabled:opacity-50 text-slate-800 hover:text-rose-600 border border-slate-300 flex items-center justify-center shadow-xs transition active:scale-95 shrink-0 cursor-pointer",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-5 h-5 stroke-[2.5]" })
					})]
				}),
				errorMessage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5 font-semibold shadow-2xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: errorMessage })]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-3.5 bg-[#EFF6FF] border border-blue-200/90 rounded-2xl text-[#1E40AF] text-xs sm:text-[13px] flex items-center gap-2.5 font-semibold shadow-2xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-base shrink-0",
						"aria-hidden": "true",
						children: "🚖"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Please complete your advance payment below to confirm your cab booking instantly." })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3 text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 sm:grid-cols-4 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-slate-500 uppercase font-bold block",
									children: "Pickup Date & Time"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-slate-900 font-bold",
									children: [
										pickupDate,
										" · ",
										pickupTime
									]
								})] }),
								tripType === "roundtrip" || tripType === "multiday" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex items-center justify-between gap-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] text-amber-800 uppercase font-bold block",
											children: [
												"Return Date (",
												activeFare.days === 1 ? "Same Day · 1 Day" : `${activeFare.days} Days`,
												")"
											]
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "date",
										min: pickupDate,
										value: returnDateState,
										onChange: (e) => setReturnDateState(e.target.value),
										className: "bg-white border border-amber-300 rounded-lg px-2 py-0.5 text-slate-900 font-bold text-xs mt-0.5 w-full"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap items-center gap-1 mt-1",
										children: [
											{
												label: "Same Day (1D)",
												addDays: 0
											},
											{
												label: "2 Days",
												addDays: 1
											},
											{
												label: "3 Days",
												addDays: 2
											}
										].map((opt) => {
											const baseP = pickupDate ? new Date(pickupDate) : /* @__PURE__ */ new Date();
											if (!isNaN(baseP.getTime())) baseP.setDate(baseP.getDate() + opt.addDays);
											const targetDateStr = !isNaN(baseP.getTime()) ? baseP.toISOString().split("T")[0] : pickupDate;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setReturnDateState(targetDateStr),
												className: `px-1.5 py-0.5 rounded text-[9px] font-extrabold border transition cursor-pointer ${returnDateState === targetDateStr ? "bg-amber-400 text-slate-950 border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"}`,
												children: opt.label
											}, opt.label);
										})
									})
								] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-slate-500 uppercase font-bold block",
									children: "Route Type"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-slate-900 font-bold",
									children: activeFare.isHillAreaRoute ? "⛰️ Hill Area Route" : "Highway Route"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-slate-500 uppercase font-bold block",
									children: "Total Distance"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-slate-900 font-bold font-mono",
									children: [
										activeFare.billedDistanceKm,
										" KM · Extra: ₹",
										activeFare.extraKmRate,
										"/km",
										activeFare.isHillAreaRoute ? " (Hill)" : ""
									]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-slate-500 uppercase font-bold block",
									children: "Total Fare"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5 flex-wrap",
									children: [activeFare.promoDiscount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-slate-400 line-through font-mono",
										children: formatINR(activeFare.totalFareBeforePromo)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-emerald-700 font-black text-sm",
										children: formatINR(activeFare.totalFare)
									})]
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-xl border border-slate-200/90 p-3 space-y-1.5 text-[11px]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between font-extrabold text-slate-900 border-b border-slate-100 pb-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										"Transparent Itemized Fare Breakdown (",
										activeFare.billedDistanceKm,
										" KM)"
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-emerald-700 font-bold",
										children: "100% Honest Pricing"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"Base Cab Fare (",
												activeFare.billedDistanceKm,
												" KM):"
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold text-slate-900",
												children: formatINR(Math.max(0, activeFare.baseFare - (activeFare.hillStationCharge || 0)))
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Driver Allowance (Daily Bata):" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono font-bold text-emerald-700",
												children: [formatINR(activeFare.driverAllowance), " (Included)"]
											})]
										}),
										activeFare.hillStationCharge > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: activeFare.isDifficultMountainRoute ? "Mountain Drive Charge:" : "Hill Station Climb Charge:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono font-bold text-slate-900",
												children: [formatINR(activeFare.hillStationCharge), " (Included)"]
											})]
										}),
										(activeFare.extraStopsCharge || 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"Multi-City Stops (",
												activeFare.validStopsCount || 1,
												"):"
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono font-bold text-slate-900",
												children: [formatINR(activeFare.extraStopsCharge || 0), " (Included)"]
											})]
										}),
										(activeFare.waitingCharge || 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"Waiting Beyond 45m Grace (",
												activeFare.billableWaitMinutes,
												"m):"
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold text-slate-900",
												children: formatINR(activeFare.waitingCharge || 0)
											})]
										}),
										(activeFare.positioningCharge || 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"Fleet Positioning (",
												activeFare.positioningDistanceKm,
												" KM):"
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold text-slate-900",
												children: formatINR(activeFare.positioningCharge || 0)
											})]
										}),
										tripType !== "local" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Highway Toll:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-amber-800",
													children: "Extra (As per actuals)"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Parking Charges:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-amber-800",
													children: "Extra (As per actuals)"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"State Tax",
													(activeFare.stateTaxDays || 1) > 1 ? ` (${activeFare.stateTaxDays} Days)` : "",
													(activeFare.delhiMcdToll || 0) > 0 ? " + Delhi MCD" : "",
													":"
												] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `font-mono font-bold ${activeFare.statePermitTax > 0 ? "text-emerald-700" : "text-slate-700"}`,
													children: activeFare.statePermitTax > 0 ? `${formatINR(activeFare.statePermitTax)} (Included)` : "₹0"
												})]
											})
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "GST (5% SAC 996412):" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold text-slate-900",
												children: formatINR(activeFare.gstAmount)
											})]
										}),
										activeFare.addonsTotal > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-slate-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Selected Add-Ons:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-bold text-slate-900",
												children: formatINR(activeFare.addonsTotal)
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "pt-1 border-t border-slate-100 text-[10px] font-semibold text-emerald-700",
									children: activeFare.cancellationPolicy || "Free cancellation up to 6 hours before pickup"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pt-2.5 border-t border-slate-200/80 space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									htmlFor: "booking-promo-code-input",
									className: "font-bold text-slate-800 flex items-center gap-1.5 text-[11px] sm:text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { className: "w-3.5 h-3.5 text-amber-500 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Have a Promo Code?" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										id: "booking-promo-code-input",
										name: "promoCode",
										type: "text",
										value: promoCodeInput,
										onChange: (e) => {
											setPromoCodeInput(e.target.value);
											if (promoStatus?.type === "error") setPromoStatus(null);
										},
										onKeyDown: (e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleApplyPromo();
											}
										},
										placeholder: "Enter promo code",
										"aria-label": "Promo code",
										className: "flex-1 sm:w-48 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 uppercase placeholder:normal-case placeholder:font-sans placeholder:font-medium focus:outline-none focus:border-amber-500"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => handleApplyPromo(),
										className: "px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950 font-black text-xs transition cursor-pointer shrink-0",
										children: "Apply"
									})]
								})]
							}), promoStatus && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								role: "status",
								className: `p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${promoStatus.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-700"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1.5",
									children: [promoStatus.type === "success" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-4 h-4 text-emerald-600 shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: promoStatus.message })]
								}), promoStatus.type === "success" && activeFare.promoDiscount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200",
									children: ["-₹", activeFare.promoDiscount]
								})]
							})]
						}),
						tripType !== "local" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-[11px]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "w-full px-3.5 py-2 rounded-xl text-[11px] font-extrabold bg-emerald-50 text-emerald-950 border border-emerald-200 flex items-center justify-between gap-2 select-none",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-3.5 h-3.5 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "TOLL & PARKING EXTRA" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-emerald-800 font-bold whitespace-nowrap",
									children: "As Per Actuals"
								})]
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
							className: "text-xs font-bold uppercase tracking-wider text-slate-700",
							children: "1. Passenger & Contact Details"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-3 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									htmlFor: "traveler-full-name",
									className: "block text-xs font-semibold text-slate-700 mb-1",
									children: "Full Name *"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "traveler-full-name",
									name: "customerName",
									type: "text",
									required: true,
									"aria-label": "Traveler Full Name",
									value: customerName,
									onChange: (e) => {
										setCustomerName(e.target.value);
										if (errorMessage) setErrorMessage("");
									},
									placeholder: "e.g. Rahul Sharma",
									className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									htmlFor: "traveler-phone",
									className: "block text-xs font-semibold text-slate-700 mb-1",
									children: "Mobile Number *"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500 font-bold",
										children: "+91"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										id: "traveler-phone",
										name: "customerPhone",
										type: "tel",
										inputMode: "numeric",
										required: true,
										maxLength: 10,
										"aria-label": "Traveler 10-digit mobile number",
										value: customerPhone,
										onChange: (e) => {
											setCustomerPhone(e.target.value.replace(/\D/g, ""));
											if (errorMessage) setErrorMessage("");
										},
										placeholder: "9876543210",
										className: "w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-amber-500 focus:bg-white"
									})]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									htmlFor: "traveler-email",
									className: "block text-xs font-semibold text-slate-700 mb-1",
									children: "Email (for Invoice)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "traveler-email",
									name: "customerEmail",
									type: "email",
									"aria-label": "Traveler Email for Invoice",
									value: customerEmail,
									onChange: (e) => setCustomerEmail(e.target.value),
									placeholder: "name@gmail.com",
									className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
							className: "text-xs font-bold uppercase tracking-wider text-slate-700 pt-2",
							children: "2. Doorstep Pickup & Drop Address"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "pickup-full-address",
								className: "block text-xs font-semibold text-slate-700 mb-1",
								children: "Complete Pickup Address *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "pickup-full-address",
								name: "pickupAddress",
								type: "text",
								required: true,
								"aria-label": "Complete Doorstep Pickup Address",
								value: pickupAddress,
								onChange: (e) => {
									setPickupAddress(e.target.value);
									if (errorMessage) setErrorMessage("");
								},
								placeholder: "House/Office No., Street, Sector, Society Name",
								className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "pickup-landmark",
								className: "block text-xs font-semibold text-slate-700 mb-1",
								children: "Landmark (Optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "pickup-landmark",
								name: "landmark",
								type: "text",
								"aria-label": "Nearby Landmark",
								value: landmark,
								onChange: (e) => setLandmark(e.target.value),
								placeholder: "Near Metro Gate, Behind City Hospital",
								className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
							})] })]
						}),
						tripType !== "local" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "drop-full-address",
							className: "block text-xs font-semibold text-slate-700 mb-1",
							children: "Drop Address / Hotel / Area (Optional)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "drop-full-address",
							name: "dropAddress",
							type: "text",
							"aria-label": "Destination Drop Address or Hotel",
							value: dropAddress,
							onChange: (e) => setDropAddress(e.target.value),
							placeholder: `Destination area in ${dropCity} (e.g. Hotel Radisson / Airport / Cantt)`,
							className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pt-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2 cursor-pointer text-xs text-slate-700",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: needGst,
									onChange: (e) => setNeedGst(e.target.checked),
									className: "rounded border-slate-300 text-amber-500 focus:ring-amber-400"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold text-slate-900",
									children: "Add GST Details for Business Tax Credit"
								})]
							}), needGst && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "block text-[10px] font-semibold text-slate-500 mb-1",
									children: "Company Name"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: gstCompanyName,
									onChange: (e) => setGstCompanyName(e.target.value),
									placeholder: "e.g. Acme Tech Solutions Pvt Ltd",
									className: "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "block text-[10px] font-semibold text-slate-500 mb-1",
									children: "GSTIN (15 Digits)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									maxLength: 15,
									value: gstNumber,
									onChange: (e) => setGstNumber(e.target.value.toUpperCase()),
									placeholder: "07AAAAA0000A1Z5",
									className: "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-mono font-bold"
								})] })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pt-2 space-y-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "text-xs font-bold uppercase tracking-wider text-slate-700",
								children: "SafarIndiaCabs Fare Mode & Optional Trip Add-Ons"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs",
								children: [
									tripType !== "local" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 select-none sm:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-3.5 h-3.5 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-extrabold text-emerald-950",
												children: "TOLL & PARKING EXTRA"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-[11px] text-emerald-700 whitespace-nowrap",
											children: "As Per Actuals"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-amber-400 transition",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: addonCarrier,
												onChange: (e) => setAddonCarrier(e.target.checked),
												className: "rounded border-slate-300 text-amber-500 focus:ring-amber-400"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold text-slate-800",
												children: "Roof Luggage Carrier"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono font-bold text-slate-700",
											children: "+₹300"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-amber-400 transition",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: addonAssuredModel,
												onChange: (e) => setAddonAssuredModel(e.target.checked),
												className: "rounded border-slate-300 text-amber-500 focus:ring-amber-400"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold text-slate-800",
												children: "Assured Diesel / New Model"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono font-bold text-slate-700",
											children: "+₹400"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-amber-400 transition",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: addonPet,
												onChange: (e) => setAddonPet(e.target.checked),
												className: "rounded border-slate-300 text-amber-500 focus:ring-amber-400"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold text-slate-800",
												children: "Traveling with Pet"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono font-bold text-slate-700",
											children: ["+", cab.id === "suv" || cab.id === "innova" || cab.id === "tempo" ? "₹1,000" : "₹800"]
										})]
									})
								]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3.5 border-t border-slate-100 pt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "text-xs font-bold uppercase tracking-wider text-slate-700",
								children: "3. Pay via Razorpay UPI / QR or Cards"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[11px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "w-3 h-3 text-amber-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Instant UPI & QR" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onClick: () => !isProcessing && setPaymentMode("advance_20"),
								className: `p-3.5 rounded-2xl border cursor-pointer transition ${paymentMode === "advance_20" ? "border-amber-400 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/40" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between mb-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-bold text-slate-900",
										children: "Pay 20% Advance Now"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-black text-amber-700",
										children: formatINR(activeFare.advanceFare)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[11px] text-slate-500",
									children: [
										"Balance ",
										formatINR(activeFare.balanceDue),
										" payable to chauffeur at trip completion."
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onClick: () => !isProcessing && setPaymentMode("full"),
								className: `p-3.5 rounded-2xl border cursor-pointer transition ${paymentMode === "full" ? "border-amber-400 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/40" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between mb-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-bold text-slate-900",
										children: "Pay 100% Full Fare"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-black text-slate-950",
										children: formatINR(activeFare.totalFare)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-slate-500",
									children: "Completely cashless journey. Zero balance payable at drop."
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-bold text-slate-800 flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "w-3.5 h-3.5 text-amber-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Choose Payment Method (UPI App, Dynamic QR, or Cards):" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-3 h-3 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Official Razorpay Gateway" })]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs",
									children: PAYMENT_GATEWAY_METHODS.map((method) => {
										const isSelected = selectedGatewayMethod === method.id;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: isProcessing,
											onClick: () => {
												setSelectedGatewayMethod(method.id);
												if (method.id !== "qr" && activeDynamicQr) {
													closeDynamicQrOnServer({
														qrId: activeDynamicQr.qrId,
														bookingId: activeDynamicQr.bookingId,
														paymentMode
													}).catch(() => {});
													setActiveDynamicQr(null);
												}
												handlePayAndConfirm(method.id);
											},
											className: `px-3 py-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2 cursor-pointer active:scale-95 ${isSelected ? "bg-amber-400/20 border-2 border-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400/25" : "bg-white border border-slate-200 hover:border-amber-400 text-slate-800 shadow-2xs"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-2 min-w-0",
												children: [method.isQr ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "w-4 h-4 text-amber-600 shrink-0" }) : method.isCard ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "w-4 h-4 text-slate-700 shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `w-2.5 h-2.5 rounded-full ${method.dotColor} shrink-0` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "block font-extrabold text-slate-900 truncate leading-tight",
														children: method.label
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "block text-[10px] font-medium text-slate-500 truncate leading-tight mt-0.5",
														children: method.subLabel
													})]
												})]
											}), isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-3.5 h-3.5 text-amber-700 shrink-0" })]
										}, method.id);
									})
								}),
								selectedGatewayMethod === "qr" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-white border-2 border-amber-400 rounded-2xl p-4 shadow-xs space-y-3.5 animate-in fade-in",
									children: activeDynamicQr ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col items-center text-center space-y-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "w-full flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-left",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-xs font-black text-slate-950 flex items-center gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "w-4 h-4 text-amber-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Official Razorpay Dynamic UPI QR" })]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-[11px] text-slate-600",
													children: [
														"Locked Amount",
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
															className: "text-slate-950",
															children: formatINR(activeDynamicQr.amountInRupees)
														}),
														" · Booking ID",
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
															className: "font-mono text-slate-950",
															children: activeDynamicQr.bookingId
														})
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-black text-xs font-mono",
												children: formatINR(activeDynamicQr.amountInRupees)
											})]
										}), activeDynamicQr.status === "active" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-xs inline-flex flex-col items-center",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
													src: activeDynamicQr.imageUrl,
													alt: `Razorpay Dynamic UPI QR for ${activeDynamicQr.bookingId}`,
													className: "w-52 h-52 sm:w-56 sm:h-56 object-contain rounded-lg",
													onError: () => {
														setActiveDynamicQr(null);
														handlePayAndConfirm("qr", true);
													}
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
														"Valid for ",
														Math.floor(qrSecondsRemaining / 60),
														":",
														String(qrSecondsRemaining % 60).padStart(2, "0"),
														" · Auto-verifying payment..."
													] })]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-xs text-slate-600 max-w-md",
												children: [
													"Scan with ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Google Pay, PhonePe, Paytm, or BHIM" }),
													". Your booking will confirm automatically as soon as payment succeeds."
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-center justify-center gap-2 w-full pt-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													disabled: isCheckingStatus,
													onClick: handleManualStatusCheck,
													className: "px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs",
													children: [isCheckingStatus ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "I Have Paid — Verify Status Now" })]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													disabled: isProcessing,
													onClick: () => handlePayAndConfirm("qr", true),
													className: "px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open in Razorpay Checkout" })]
												})]
											})
										] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "py-4 space-y-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl",
												children: "This Dynamic QR Code has expired. Please generate a fresh QR code to pay."
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												disabled: isProcessing,
												onClick: () => handleGenerateOfficialDynamicQr(true),
												className: "px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition inline-flex items-center gap-2 cursor-pointer shadow-xs",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Generate Fresh Razorpay QR (",
													formatINR(payableNowAmount),
													")"
												] })]
											})]
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-0.5 text-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-black text-slate-950 flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "w-4 h-4 text-amber-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Official Razorpay Dynamic UPI QR Code (",
													formatINR(payableNowAmount),
													")"
												] })]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[11px] text-slate-600",
												children: [
													"Generates a verified single-use Razorpay Merchant QR for Booking ID",
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "font-mono text-slate-900",
														children: sessionBookingId
													}),
													" — works with Paytm, PhonePe, Google Pay & BHIM."
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: isProcessing,
											onClick: () => handleGenerateOfficialDynamicQr(false),
											className: "px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QrCode, { className: "w-4 h-4 text-amber-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"Generate Razorpay QR (",
												formatINR(payableNowAmount),
												")"
											] })]
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-slate-600 font-medium",
										children: [
											"Payable Now (",
											paymentMode === "advance_20" ? "20% Advance" : "100% Full Fare",
											"):"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-black text-slate-950 text-sm",
										children: formatINR(payableNowAmount)
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							ref: bottomAlertRef,
							className: "space-y-2.5",
							children: [
								isProcessing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-slate-900 text-xs flex items-center justify-between gap-2.5 font-bold shadow-2xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin text-amber-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: processingStatus })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setIsProcessing(false);
											setErrorMessage("Payment attempt was reset. You can safely retry or verify status below.");
										},
										className: "px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 text-[11px] font-extrabold transition shrink-0 cursor-pointer",
										children: "Cancel / Reset"
									})]
								}),
								!isProcessing && pendingVerification && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3.5 bg-blue-50 border-2 border-blue-300 rounded-2xl text-blue-950 text-xs space-y-2.5 shadow-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start gap-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-4 h-4 text-blue-700 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-0.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-extrabold text-blue-900",
												children: [
													"PAYMENT PROCESSING — VERIFY STATUS (",
													pendingVerification.bookingId,
													")"
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "leading-relaxed text-blue-800",
												children: pendingVerification.message
											})]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-2 pt-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: isCheckingStatus,
											onClick: handleManualStatusCheck,
											className: "px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer",
											children: [isCheckingStatus ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Verify Payment Status Now" })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => handlePayAndConfirm(),
											className: "px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-blue-300 font-bold text-xs transition cursor-pointer",
											children: "Retry Payment"
										})]
									})]
								}),
								!isProcessing && errorMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									role: "alert",
									className: "p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs space-y-2.5 font-bold shadow-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-start gap-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-0.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-extrabold text-rose-800",
												children: "Payment Action Notice"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "leading-relaxed",
												children: errorMessage
											})]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-2 pt-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => handlePayAndConfirm(),
											className: "px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[11px] transition flex items-center gap-1 cursor-pointer",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"Retry Payment (",
												formatINR(payableNowAmount),
												")"
											] })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: isCheckingStatus,
											onClick: handleManualStatusCheck,
											className: "px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-rose-300 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer",
											children: [isCheckingStatus ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-3 h-3 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Already Paid? Verify Status" })]
										})]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-1",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: isProcessing,
								onClick: () => handlePayAndConfirm(),
								className: "w-full py-4 px-6 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black text-sm sm:text-base transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-98 cursor-pointer",
								children: isProcessing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-5 h-5 animate-spin text-slate-950" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: processingStatus })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: "w-5 h-5 text-slate-950" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Pay ",
									formatINR(payableNowAmount),
									" & Confirm"
								] })] })
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between text-[10px] text-slate-500 pt-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1 font-medium",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "100% Secure Razorpay UPI, QR & Card Gateway" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200",
								children: "Instant SMS Confirmation"
							})]
						})
					]
				})
			]
		})
	});
};
export { BookingModal };
