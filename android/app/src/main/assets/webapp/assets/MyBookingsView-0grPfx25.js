import { r as __toESM } from "./rolldown-runtime-SbdDWaPq.js";
import { t as require_jsx_runtime } from "./react-vendor-BBjiQENi.js";
import { $ as Clock, E as RefreshCw, F as MessageSquare, H as Lock, J as FileText, M as Phone, N as Navigation, S as Search, W as LoaderCircle, X as Download, a as TriangleAlert, g as ShieldCheck, gt as require_react, i as User, ot as Car, p as Smartphone, pt as ArrowRight, rt as CircleAlert, st as Calendar, tt as CircleCheck, v as Share2 } from "./lucide-icons-CHOsk2xN.js";
import { S as sanitize10DigitPhone, k as formatINR, w as verifyServerOtp, x as requestServerOtp } from "./index-Cw1MAn3l.js";
import { buildServerInvoicePdfUrl, generateBookingInvoicePdf, renderA4GstInvoicePreviewDataUrl, shareBookingInvoicePdf } from "./BookingConfirmationModal-BtNu-uMK.js";
// src/components/MyBookingsView.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var MyBookingsView = ({ currentUser, bookings, onOpenLogin, onLoginSuccess, onSelectBookingForInvoice, onCancelBooking, onNavigateToBooking, onTrackBookingOnMap }) => {
	const [filterStatus, setFilterStatus] = (0, import_react.useState)("all");
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [cancelModalId, setCancelModalId] = (0, import_react.useState)(null);
	const [downloadingBookingId, setDownloadingBookingId] = (0, import_react.useState)(null);
	const [expandedPdfBookingId, setExpandedPdfBookingId] = (0, import_react.useState)(null);
	const [billActionNotice, setBillActionNotice] = (0, import_react.useState)(null);
	const [loginName, setLoginName] = (0, import_react.useState)("");
	const [loginPhone, setLoginPhone] = (0, import_react.useState)("");
	const [loginOtp, setLoginOtp] = (0, import_react.useState)("");
	const [otpToken, setOtpToken] = (0, import_react.useState)("");
	const [otpSent, setOtpSent] = (0, import_react.useState)(false);
	const [isSendingOtp, setIsSendingOtp] = (0, import_react.useState)(false);
	const [isVerifyingOtp, setIsVerifyingOtp] = (0, import_react.useState)(false);
	const [resendCooldown, setResendCooldown] = (0, import_react.useState)(0);
	const [loginError, setLoginError] = (0, import_react.useState)("");
	const [loginNotice, setLoginNotice] = (0, import_react.useState)("");
	const [phoneTouched, setPhoneTouched] = (0, import_react.useState)(false);
	const [nameTouched, setNameTouched] = (0, import_react.useState)(false);
	const [otpTouched, setOtpTouched] = (0, import_react.useState)(false);
	const otpInputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (resendCooldown <= 0) return;
		const t = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1e3);
		return () => clearTimeout(t);
	}, [resendCooldown]);
	const getPhoneError = (rawPhone, force = false) => {
		const digits = (rawPhone || "").replace(/\D/g, "");
		if (!digits) return force ? "Mobile number is required. Please enter your 10-digit mobile number." : "";
		if (!/^[6-9]/.test(digits)) return "Invalid mobile number: Indian numbers must start with 6, 7, 8, or 9.";
		if (digits.length < 10 && (force || phoneTouched || digits.length >= 1)) return `Incomplete mobile number (${digits.length}/10 digits). Please enter all 10 digits.`;
		return "";
	};
	const getOtpError = (rawOtp, force = false) => {
		const digits = (rawOtp || "").replace(/\D/g, "");
		if (!digits) return force ? "Please enter the 4-digit OTP received on your WhatsApp." : "";
		if (digits.length < 4 && (force || otpTouched || digits.length >= 1)) return `Incomplete OTP (${digits.length}/4 digits). Please enter all 4 digits.`;
		return "";
	};
	const handleRequestOtp = async (isResend = false) => {
		setNameTouched(true);
		setPhoneTouched(true);
		setLoginError("");
		const cleanName = loginName.trim();
		if (cleanName.length < 2) {
			setLoginError("Please enter your full name (at least 2 characters) to continue.");
			return;
		}
		const phoneErr = getPhoneError(loginPhone, true);
		const cleanPhone = sanitize10DigitPhone(loginPhone);
		if (phoneErr || cleanPhone.length !== 10) {
			setLoginError(phoneErr || "Please enter a valid 10-digit mobile number.");
			return;
		}
		if (isSendingOtp || isResend && resendCooldown > 0) return;
		setIsSendingOtp(true);
		try {
			const res = await requestServerOtp(cleanPhone, {
				forceNew: isResend,
				customerName: cleanName
			});
			if (res.success && res.token) {
				setOtpToken(res.token);
				setOtpSent(true);
				if (isResend) setLoginOtp("");
				setResendCooldown(30);
				setLoginNotice(`4-Digit OTP sent to +91 ${cleanPhone} on WhatsApp. Enter it below to unlock your ride history.`);
				setTimeout(() => otpInputRef.current?.focus(), 80);
			} else setLoginError(res.message || "Unable to send OTP right now. Please try again.");
		} catch {
			setLoginError("Network error while requesting OTP. Please try again.");
		} finally {
			setIsSendingOtp(false);
		}
	};
	const handleVerifyAndLogin = async (e) => {
		e.preventDefault();
		setNameTouched(true);
		setPhoneTouched(true);
		const cleanName = loginName.trim();
		if (cleanName.length < 2) {
			setLoginError("Please enter your full name (at least 2 characters).");
			return;
		}
		const phoneErr = getPhoneError(loginPhone, true);
		const cleanPhone = sanitize10DigitPhone(loginPhone);
		if (phoneErr || cleanPhone.length !== 10) {
			setLoginError(phoneErr || "Please enter a valid 10-digit mobile number.");
			return;
		}
		if (!otpSent || !otpToken) {
			await handleRequestOtp(false);
			return;
		}
		setOtpTouched(true);
		const otpErr = getOtpError(loginOtp, true);
		const cleanOtp = loginOtp.replace(/\D/g, "").trim();
		if (otpErr || cleanOtp.length !== 4) {
			setLoginError(otpErr || "Please enter the 4-digit OTP.");
			return;
		}
		setIsVerifyingOtp(true);
		setLoginError("");
		const verifyRes = await verifyServerOtp(cleanPhone, cleanOtp, otpToken);
		setIsVerifyingOtp(false);
		if (!verifyRes.success) {
			setLoginError(verifyRes.message || verifyRes.error || `Incorrect OTP entered. Please check your WhatsApp (+91 ${cleanPhone}) and try again.`);
			return;
		}
		const user = {
			id: `CUST-${cleanPhone}`,
			name: cleanName,
			phone: cleanPhone,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		try {
			localStorage.setItem("safar_user", JSON.stringify(user));
			localStorage.setItem("safar_active_session_v1", JSON.stringify(user));
		} catch {}
		if (onLoginSuccess) onLoginSuccess(user);
	};
	const handleDirectDownloadGstBill = async (booking) => {
		setDownloadingBookingId(booking.id);
		setBillActionNotice({
			id: booking.id,
			text: `Downloading Official GST Tax Invoice PDF (${booking.id}.pdf)...`
		});
		try {
			await generateBookingInvoicePdf(booking);
		} finally {
			setTimeout(() => setDownloadingBookingId(null), 650);
		}
	};
	const filteredBookings = bookings.filter((b) => {
		const matchesFilter = filterStatus === "all" || b.status === filterStatus;
		const matchesSearch = b.id.toLowerCase().includes(searchQuery.toLowerCase()) || b.pickupCity.toLowerCase().includes(searchQuery.toLowerCase()) || b.dropCity.toLowerCase().includes(searchQuery.toLowerCase()) || b.customerName.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesFilter && matchesSearch;
	});
	const completedCount = bookings.filter((b) => b.status === "completed").length;
	const activeCount = bookings.filter((b) => b.status === "confirmed").length;
	const handleShareWhatsApp = async (b) => {
		setDownloadingBookingId(b.id);
		setBillActionNotice({
			id: b.id,
			text: `Preparing & opening WhatsApp with Official GST Invoice PDF (${b.id}.pdf)...`
		});
		try {
			await shareBookingInvoicePdf(b);
		} finally {
			setTimeout(() => setDownloadingBookingId(null), 500);
		}
	};
	if (!currentUser) {
		const livePhoneErr = getPhoneError(loginPhone, false);
		const liveOtpErr = otpSent ? getOtpError(loginOtp, false) : "";
		const isNameInvalid = (loginName.length > 0 || nameTouched) && loginName.trim().length < 2;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto space-y-6 shadow-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-7 h-7 text-amber-600" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-3.5 h-3.5" }), " Persistent Customer Session"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-xl sm:text-2xl font-black text-slate-950",
								children: "Login to View Your Rides & GST Bills"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs sm:text-sm text-slate-600 leading-relaxed",
								children: "Enter your mobile number below to fetch your complete past & upcoming ride details and download official GST Tax Invoices. Your login session stays saved automatically."
							})
						]
					})]
				}),
				loginError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					role: "alert",
					className: "p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2 animate-in fade-in",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: loginError })]
				}),
				loginNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-start gap-2 animate-in fade-in",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-emerald-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: loginNotice })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleVerifyAndLogin,
					noValidate: true,
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								htmlFor: "rides-login-name",
								className: "block text-xs font-bold text-slate-700 mb-1.5",
								children: ["Customer Full Name ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-rose-600",
									children: "*"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "rides-login-name",
									type: "text",
									value: loginName,
									onBlur: () => setNameTouched(true),
									onChange: (e) => {
										setLoginName(e.target.value);
										if (loginError) setLoginError("");
									},
									placeholder: "Enter your full name (e.g. Aman Sharma)",
									className: `w-full min-h-[48px] bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-slate-900 text-sm font-semibold focus:outline-none focus:bg-white transition ${isNameInvalid ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/15" : "border-slate-300 focus:border-amber-500"}`
								})]
							}),
							isNameInvalid && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								role: "alert",
								className: "mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Please enter your valid full name (at least 2 characters)." })]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								htmlFor: "rides-login-phone",
								className: "block text-xs font-bold text-slate-700 mb-1.5",
								children: ["Registered Mobile Number (WhatsApp) ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-rose-600",
									children: "*"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: `w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${livePhoneErr ? "text-rose-500" : "text-slate-400"}` }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "absolute left-9 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500",
										children: "+91"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										id: "rides-login-phone",
										type: "tel",
										inputMode: "numeric",
										maxLength: 10,
										value: loginPhone,
										onBlur: () => setPhoneTouched(true),
										onChange: (e) => {
											const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
											setLoginPhone(clean);
											if (loginError) setLoginError("");
											if (clean.length === 10 && !loginName.trim()) try {
												const raw = localStorage.getItem("safar_registered_customers");
												const found = (raw ? JSON.parse(raw) : []).find((u) => sanitize10DigitPhone(u.phone) === clean);
												if (found?.name) setLoginName(found.name);
											} catch {}
										},
										placeholder: "Enter 10-digit mobile number",
										"aria-invalid": Boolean(livePhoneErr),
										className: `w-full min-h-[48px] bg-slate-50 border rounded-xl pl-16 pr-4 py-3 text-slate-900 font-mono text-sm font-bold focus:outline-none focus:bg-white transition ${livePhoneErr ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/15" : "border-slate-300 focus:border-amber-500"}`
									})
								]
							}),
							livePhoneErr && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								role: "alert",
								className: "mt-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-start gap-1.5 animate-in fade-in",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: livePhoneErr })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => handleRequestOtp(false),
								disabled: isSendingOtp || otpSent && resendCooldown > 0,
								className: "mt-3 w-full min-h-[48px] flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/80 text-white font-extrabold text-xs transition shadow-sm cursor-pointer disabled:cursor-not-allowed",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-2",
									children: [isSendingOtp ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isSendingOtp ? "Sending OTP to WhatsApp..." : otpSent && resendCooldown > 0 ? `OTP Sent to +91 ${loginPhone} ✓` : "Get OTP on WhatsApp" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[11px]",
									children: isSendingOtp ? "Sending..." : otpSent && resendCooldown > 0 ? `Wait ${resendCooldown}s` : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Get OTP ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-3 h-3" })] })
								})]
							})
						] }),
						otpSent && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-4 rounded-2xl bg-slate-50 border-2 border-emerald-300 space-y-3 animate-in fade-in",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										htmlFor: "rides-login-otp",
										className: "text-xs font-extrabold text-slate-900",
										children: ["Enter 4-Digit WhatsApp OTP ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-rose-600",
											children: "*"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => handleRequestOtp(true),
										disabled: resendCooldown > 0 || isSendingOtp,
										className: "text-[11px] font-bold text-emerald-700 hover:text-emerald-900 disabled:text-slate-400 flex items-center gap-1 cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `w-3 h-3 ${isSendingOtp ? "animate-spin" : ""}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP" })]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: otpInputRef,
									id: "rides-login-otp",
									type: "text",
									inputMode: "numeric",
									maxLength: 4,
									value: loginOtp,
									onBlur: () => setOtpTouched(true),
									onChange: (e) => {
										setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 4));
										if (loginError) setLoginError("");
									},
									placeholder: "Enter 4-Digit OTP",
									className: `w-full min-h-[50px] bg-white border-2 rounded-xl px-4 py-3 text-center text-xl tracking-[0.35em] font-mono font-extrabold text-slate-900 focus:outline-none placeholder:text-xs placeholder:tracking-normal placeholder:font-sans transition ${liveOtpErr ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/15" : "border-emerald-400 focus:border-emerald-600"}`
								}),
								liveOtpErr && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									role: "alert",
									className: "text-[11px] font-bold text-rose-600 flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: liveOtpErr })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									disabled: isVerifyingOtp,
									className: "w-full min-h-[50px] py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm transition flex items-center justify-center gap-2 shadow-md cursor-pointer",
									children: isVerifyingOtp ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin text-slate-950" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Verifying & Loading Ride History..." })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-slate-950" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Verify OTP & View My Rides" })] })
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Prefer popup login?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onOpenLogin,
						className: "font-bold text-amber-700 hover:underline cursor-pointer",
						children: "Open Full Login Modal →"
					})]
				})
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start sm:items-center gap-3.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shrink-0 shadow-md",
						children: currentUser.name.charAt(0).toUpperCase()
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "text-lg sm:text-xl font-black text-white",
							children: [currentUser.name, "'s Ride History & GST Invoices"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-extrabold",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3 h-3" }),
								" Session Saved (+91 ",
								currentUser.phone,
								")"
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-slate-300 mt-1",
						children: [
							"Showing all past completed trips and active bookings linked to ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
								className: "text-amber-300 font-mono",
								children: ["+91 ", currentUser.phone]
							}),
							". Download official GST Tax Invoices anytime."
						]
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-3 gap-2.5 shrink-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-slate-950/90 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-base sm:text-lg font-black text-white",
								children: bookings.length
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-bold uppercase text-slate-400",
								children: "Total Rides"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-slate-950/90 border border-emerald-500/30 rounded-2xl px-3.5 py-2.5 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-base sm:text-lg font-black text-emerald-400",
								children: completedCount
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-bold uppercase text-emerald-300",
								children: "Completed"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-slate-950/90 border border-amber-500/30 rounded-2xl px-3.5 py-2.5 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-base sm:text-lg font-black text-amber-400",
								children: activeCount
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-bold uppercase text-amber-300",
								children: "Upcoming"
							})]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap items-center gap-1.5",
					children: [
						{
							id: "all",
							label: `All Rides (${bookings.length})`
						},
						{
							id: "completed",
							label: `Completed • GST Bills (${completedCount})`
						},
						{
							id: "confirmed",
							label: `Upcoming (${activeCount})`
						}
					].map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setFilterStatus(tab.id),
						className: `min-h-[42px] px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${filterStatus === tab.id ? "bg-slate-900 text-amber-400 shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`,
						children: tab.label
					}, tab.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1 sm:max-w-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						value: searchQuery,
						onChange: (e) => setSearchQuery(e.target.value),
						placeholder: "Search by Booking ID or City...",
						"aria-label": "Search rides by Booking ID or City",
						className: "w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
					})]
				})]
			}),
			filteredBookings.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 shadow-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto border border-slate-200",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Car, { className: "w-8 h-8" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-sm mx-auto",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-base font-black text-slate-900",
							children: "No Matching Rides Found"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-600 mt-1",
							children: bookings.length === 0 ? `No rides found for +91 ${currentUser.phone}. Book your outstation or local cab now!` : "No rides matched your selected filter or search query."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onNavigateToBooking,
						className: "min-h-[46px] px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition shadow-sm cursor-pointer",
						children: "Book a Cab Now →"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-4",
				children: filteredBookings.map((b) => {
					const isCompleted = b.status === "completed";
					const isDownloading = downloadingBookingId === b.id;
					const gstAmount = b.gstAmount ?? Math.round((b.baseFare || b.totalFare) * .05);
					const rawTolls = b.tollsAndTaxes || 0;
					const highwayToll = b.highwayToll !== void 0 ? b.highwayToll : rawTolls > 0 ? Math.round(rawTolls * .55) : 0;
					const statePermitTax = b.statePermitTax !== void 0 ? b.statePermitTax : Math.max(0, rawTolls - highwayToll);
					const hillStationCharge = b.hillStationCharge || 0;
					const parkingCharge = b.parkingCharge || 0;
					const extraKmDriven = b.extraKmDriven || 0;
					const extraKmCharge = b.extraKmCharge || 0;
					const extraTollCharges = b.extraTollCharges || 0;
					const otherSurcharges = b.otherSurcharges || 0;
					const tripDays = Math.max(1, b.tripDays || 1);
					let driverAllowance = b.driverAllowance || 0;
					let baseFareAmount = b.baseFare || Math.max(0, b.totalFare - gstAmount - rawTolls - parkingCharge - driverAllowance - hillStationCharge - extraKmCharge - extraTollCharges - otherSurcharges);
					if (driverAllowance === 0 && baseFareAmount > 600 && b.tripType !== "local") {
						const separatedBata = 260 * tripDays;
						if (baseFareAmount > separatedBata + 300) {
							driverAllowance = separatedBata;
							baseFareAmount -= separatedBata;
						}
					}
					const cleanIdSuffix = b.id.replace(/^SIC-?/i, "");
					const documentRefNumber = isCompleted ? `INV-SIC${cleanIdSuffix}` : `VCR-SIC${cleanIdSuffix}`;
					const paymentStatusLabel = isCompleted || b.balanceDue === 0 ? "PAID IN FULL (SETTLED)" : `PARTIALLY PAID (20% ADVANCE • ₹${b.advancePaid})`;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 sm:p-6 transition shadow-sm space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-sm sm:text-base font-black text-slate-950 font-mono bg-amber-400/30 border border-amber-400/60 px-3 py-1 rounded-xl",
											children: ["Booking ID: ", b.id]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${isCompleted ? "text-emerald-900 bg-emerald-50 border-emerald-200" : "text-slate-700 bg-slate-100 border-slate-200"}`,
											children: isCompleted ? `Final GST Invoice: ${documentRefNumber}` : `Booking Voucher: ${documentRefNumber}`
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] font-semibold text-slate-500",
											children: [
												"Ride Date: ",
												b.pickupDate,
												" • ",
												b.pickupTime
											]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: `inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${isCompleted || b.balanceDue === 0 ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-blue-50 text-blue-800 border-blue-200"}`,
											children: ["Payment: ", paymentStatusLabel]
										}),
										b.status === "completed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 text-[11px] bg-emerald-600 text-white px-3 py-1 rounded-full font-extrabold shadow-2xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-white" }), "COMPLETED · FINAL GST INVOICE READY"]
										}),
										b.status === "confirmed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 text-[11px] bg-amber-50 text-amber-900 border border-amber-300 px-3 py-1 rounded-full font-extrabold",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5 text-amber-600" }), "CONFIRMED · VOUCHER ISSUED"]
										}),
										b.status === "cancelled" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full font-extrabold",
											children: "CANCELLED"
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 lg:grid-cols-12 gap-4 items-center text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lg:col-span-5 space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 text-sm sm:text-base font-black text-slate-950",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: b.pickupCity }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-400",
													children: "→"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: b.dropCity })
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-slate-600 space-y-1 pl-4",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "text-slate-800",
														children: "Pickup Location:"
													}),
													" ",
													b.pickupAddress || b.pickupCity
												] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "text-slate-800",
														children: "Drop Location:"
													}),
													" ",
													b.dropAddress || b.dropCity
												] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "text-slate-800",
														children: "Vehicle:"
													}),
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-bold text-slate-900",
														children: b.cabName
													}),
													" (",
													b.tripType === "roundtrip" ? `ROUND TRIP • ${tripDays === 1 ? "SAME DAY 1D" : `${tripDays} DAYS`}` : b.tripType.toUpperCase(),
													")"
												] })
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lg:col-span-3 space-y-1.5 lg:border-l lg:border-slate-200 lg:pl-4",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 text-slate-800 font-bold",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "w-4 h-4 text-amber-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Ride Date: ", b.pickupDate] })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 text-slate-800 font-bold",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-4 h-4 text-amber-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Pickup Time: ", b.pickupTime] })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs text-slate-600 font-semibold",
												children: [
													"Billed Distance:",
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
														className: "text-slate-900",
														children: [
															b.distanceKm,
															" KM",
															b.actualOdometerKm && b.actualOdometerKm > b.distanceKm ? ` (Actual Odometer: ${b.actualOdometerKm} KM)` : ""
														]
													})
												]
											}),
											b.driverName && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "pt-1 text-[11px] text-emerald-800 font-bold flex items-center gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-3 h-3 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Driver: ",
													b.driverName,
													" (",
													b.driverVehicleNo || "Verified Cab",
													")"
												] })]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "lg:col-span-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Base Cab Fare (",
													b.distanceKm,
													" KM):"
												] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-slate-900",
													children: formatINR(baseFareAmount)
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Driver Allowance (",
													tripDays === 1 ? "1 Day" : `${tripDays} Days`,
													"):"
												] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-emerald-700",
													children: formatINR(driverAllowance)
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Highway FASTag Toll Tax:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-amber-800",
													children: highwayToll > 0 ? formatINR(highwayToll) : "Extra (As Per Actuals)"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "State Tax & Entry Charges:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `font-mono font-bold ${statePermitTax > 0 ? "text-emerald-700" : "text-slate-700"}`,
													children: statePermitTax > 0 ? `${formatINR(statePermitTax)} (Included)` : "₹0"
												})]
											}),
											parkingCharge > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Parking Charges:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-slate-900",
													children: formatINR(parkingCharge)
												})]
											}),
											hillStationCharge > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Hill Station Charge:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-slate-900",
													children: formatINR(hillStationCharge)
												})]
											}),
											extraKmCharge > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-amber-900 font-semibold",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Extra KM Charge (",
													extraKmDriven,
													" KM):"
												] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono font-bold",
													children: ["+", formatINR(extraKmCharge)]
												})]
											}),
											extraTollCharges > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-amber-900 font-semibold",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Extra Highway Toll Charges:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono font-bold",
													children: ["+", formatINR(extraTollCharges)]
												})]
											}),
											otherSurcharges > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-amber-900 font-semibold",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Other Post-Trip Surcharges:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono font-bold",
													children: ["+", formatINR(otherSurcharges)]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-slate-600",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "GST Tax (5% SAC 996412):" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-bold text-slate-900",
													children: formatINR(gstAmount)
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center border-t border-slate-200 pt-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-extrabold text-slate-950",
													children: isCompleted ? "Final GST Invoice Total:" : "Estimated Total Fare:"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-black font-mono text-slate-950",
													children: formatINR(b.totalFare)
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-[11px] pt-0.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-emerald-700 font-bold",
													children: isCompleted ? `Paid in Full: ${formatINR(b.totalFare)}` : `Advance Paid: ${formatINR(b.advancePaid)}`
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-bold text-amber-800",
													children: isCompleted ? "Balance: ₹0 (Settled)" : `Balance: ${formatINR(b.balanceDue)}`
												})]
											})
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs",
								children: b.driverName ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] font-extrabold uppercase tracking-wider text-emerald-700",
										children: "Live Chauffeur & Cab Assignment Confirmed ✓"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-500 font-semibold",
													children: "Driver Name:"
												}),
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-slate-950 font-black",
													children: b.driverName
												})
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-500 font-semibold",
													children: "Driver Contact:"
												}),
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
													className: "text-emerald-800 font-mono font-black",
													children: ["+91 ", b.driverPhone || "9570571516"]
												})
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-500 font-semibold",
													children: "Vehicle Model:"
												}),
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-slate-900 font-bold",
													children: b.driverVehicleModel || b.cabName
												})
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-500 font-semibold",
													children: "Vehicle Number Plate:"
												}),
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-slate-950 font-mono font-black bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded",
													children: b.driverVehicleNo || "DL 1Z C 4829"
												})
											] })
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2 shrink-0",
									children: [
										onTrackBookingOnMap && b.status !== "cancelled" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => onTrackBookingOnMap(b),
											className: "px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs flex items-center gap-1.5 transition cursor-pointer",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "w-3.5 h-3.5 text-amber-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live Cab Map Tracking" })]
										}),
										b.driverPhone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: `tel:+91${b.driverPhone.replace(/\D/g, "").slice(-10)}`,
											className: "px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Call Driver" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: "tel:+919570571516",
											className: "px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 transition",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "24x7 Emergency Support" })]
										})
									]
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-0.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] font-extrabold uppercase tracking-wider text-amber-700",
										children: "Live Driver & Cab Assignment Status"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-bold text-slate-900",
										children: "Verified Chauffeur & Commercial Cab details are updated here and sent via WhatsApp/SMS before pickup."
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto",
									children: [onTrackBookingOnMap && b.status !== "cancelled" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => onTrackBookingOnMap(b),
										className: "px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs flex items-center gap-1.5 transition cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "w-3.5 h-3.5 text-amber-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live Cab Map Tracking" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: "tel:+919570571516",
										className: "px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 transition shrink-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "24x7 Emergency Support (+91 9570571516)" })]
									})]
								})] })
							}),
							isCompleted && expandedPdfBookingId === b.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3.5 sm:p-4 rounded-2xl bg-slate-100 border-2 border-slate-300 space-y-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-black text-[#0F2958] uppercase tracking-wider",
										children: `📄 Official A4 Final GST Tax Invoice Preview (${b.id}.pdf)`
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: buildServerInvoicePdfUrl(b, "inline"),
											className: "px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px]",
											children: "Open Full PDF ↗"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setExpandedPdfBookingId(null),
											className: "px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] cursor-pointer",
											children: "Hide Preview"
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: renderA4GstInvoicePreviewDataUrl(b),
										alt: `Official Document ${b.id}`,
										className: "w-full h-auto block"
									})
								})]
							}),
							billActionNotice && billActionNotice.id === b.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: billActionNotice.text })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											if (isCompleted) setExpandedPdfBookingId((prev) => prev === b.id ? null : b.id);
											onSelectBookingForInvoice(b);
										},
										className: "min-h-[46px] flex items-center gap-2 text-white bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-xl font-black text-xs transition shadow-sm cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "w-4 h-4 text-amber-400 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isCompleted ? "View Final Tax Invoice" : "View Booking Confirmed Summary" })]
									}), isCompleted && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => handleDirectDownloadGstBill(b),
										disabled: isDownloading,
										className: "min-h-[46px] px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-98 bg-emerald-600 hover:bg-emerald-700 text-white",
										children: isDownloading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Generating PDF..." })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Download Final Tax Invoice (PDF)" })] })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => handleShareWhatsApp(b),
										disabled: isDownloading,
										className: "min-h-[46px] flex items-center gap-2 text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "w-4 h-4 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Share Final Tax Invoice on WhatsApp" })]
									})] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [!isCompleted && b.status === "confirmed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3.5 h-3.5 text-amber-700 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Final Tax Invoice unlocks after Ride is marked COMPLETED" })]
									}), b.status === "confirmed" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setCancelModalId(b.id),
										className: "min-h-[42px] px-3 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition cursor-pointer",
										children: "Cancel Booking"
									})]
								})]
							})
						]
					}, b.id);
				})
			}),
			cancelModalId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-6 h-6" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "text-base font-black text-slate-950",
								children: "Cancel Cab Booking?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-slate-600",
								children: [
									"Booking ID: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-amber-700 font-mono",
										children: cancelModalId
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									"Cancellations made more than 6 hours prior to scheduled pickup are eligible for 100% advance refund."
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setCancelModalId(null),
							className: "flex-1 min-h-[46px] py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer",
							children: "Keep Booking"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								onCancelBooking(cancelModalId);
								setCancelModalId(null);
							},
							className: "flex-1 min-h-[46px] py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer",
							children: "Yes, Cancel Ride"
						})]
					})]
				})
			})
		]
	});
};
export { MyBookingsView };
