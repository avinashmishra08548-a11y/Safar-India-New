import { r as __toESM } from "./rolldown-runtime-SbdDWaPq.js";
import { t as require_jsx_runtime } from "./react-vendor-BBjiQENi.js";
import { E as RefreshCw, F as MessageSquare, W as LoaderCircle, g as ShieldCheck, gt as require_react, i as User, nt as CircleCheckBig, p as Smartphone, pt as ArrowRight, rt as CircleAlert, t as X } from "./lucide-icons-CHOsk2xN.js";
import { S as sanitize10DigitPhone, w as verifyServerOtp, x as requestServerOtp } from "./index-Cw1MAn3l.js";
// src/components/CustomerAuthModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CustomerAuthModal = ({ isOpen, onClose, onLoginSuccess, authPrompt }) => {
	const [name, setName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [otp, setOtp] = (0, import_react.useState)("");
	const [otpRequested, setOtpRequested] = (0, import_react.useState)(false);
	const [otpToken, setOtpToken] = (0, import_react.useState)("");
	const [otpExpiresAt, setOtpExpiresAt] = (0, import_react.useState)(0);
	const [failedAttempts, setFailedAttempts] = (0, import_react.useState)(0);
	const [isSending, setIsSending] = (0, import_react.useState)(false);
	const [isVerifying, setIsVerifying] = (0, import_react.useState)(false);
	const [errorMsg, setErrorMsg] = (0, import_react.useState)("");
	const [nameTouched, setNameTouched] = (0, import_react.useState)(false);
	const [phoneTouched, setPhoneTouched] = (0, import_react.useState)(false);
	const [otpTouched, setOtpTouched] = (0, import_react.useState)(false);
	const [resendSeconds, setResendSeconds] = (0, import_react.useState)(0);
	const [smsDeliveryInfo, setSmsDeliveryInfo] = (0, import_react.useState)("");
	const sendingLockRef = (0, import_react.useRef)(false);
	const nameInputRef = (0, import_react.useRef)(null);
	const phoneInputRef = (0, import_react.useRef)(null);
	const otpInputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (resendSeconds <= 0) return;
		const timer = setTimeout(() => setResendSeconds((prev) => Math.max(0, prev - 1)), 1e3);
		return () => clearTimeout(timer);
	}, [resendSeconds]);
	(0, import_react.useEffect)(() => {
		if (isOpen) {
			setErrorMsg("");
			sendingLockRef.current = false;
			setTimeout(() => {
				if (!name.trim()) nameInputRef.current?.focus();
			}, 60);
		}
	}, [isOpen]);
	if (!isOpen) return null;
	const isValidCustomerName = (val) => {
		const trimmed = val.trim();
		return trimmed.length >= 2 && /[a-zA-Z\u0900-\u097F]/.test(trimmed);
	};
	const getPhoneInlineError = (rawVal, forceCheck = false) => {
		const digits = (rawVal || "").replace(/\D/g, "");
		if (!digits) return forceCheck ? "Mobile number is required. Please enter your 10-digit WhatsApp number." : "";
		if (!/^[6-9]/.test(digits)) return "Invalid mobile number: Indian mobile numbers must start with 6, 7, 8, or 9.";
		if (digits.length < 10 && (forceCheck || phoneTouched || digits.length >= 1)) return `Incomplete mobile number (${digits.length}/10 digits). Please enter all 10 digits.`;
		return "";
	};
	const getOtpInlineError = (rawOtp, forceCheck = false) => {
		const digits = (rawOtp || "").replace(/\D/g, "");
		if (!digits) return forceCheck ? "OTP is required. Please enter the 4-digit OTP sent to your WhatsApp." : "";
		if (digits.length < 4 && (forceCheck || otpTouched || digits.length >= 1)) return `Incomplete OTP (${digits.length}/4 digits). Please enter all 4 digits.`;
		return "";
	};
	const handleNameChange = (val) => {
		setName(val);
		if (errorMsg) setErrorMsg("");
	};
	const handlePhoneChange = (val) => {
		const clean = val.replace(/\D/g, "").slice(0, 10);
		setPhone(clean);
		if (errorMsg) setErrorMsg("");
		if (clean.length < 10) {
			setOtpRequested(false);
			setOtpToken("");
			setSmsDeliveryInfo("");
			setResendSeconds(0);
		} else if (clean.length === 10) try {
			const raw = localStorage.getItem("safar_registered_customers");
			const existing = (raw ? JSON.parse(raw) : []).find((u) => sanitize10DigitPhone(u.phone) === clean);
			if (existing?.name && !name.trim() && !existing.name.startsWith("Traveler")) setName(existing.name);
		} catch {}
	};
	const handleGetOtpOnWhatsApp = async (isResend = false) => {
		setNameTouched(true);
		setPhoneTouched(true);
		const cleanName = name.trim();
		if (!isValidCustomerName(cleanName)) {
			setErrorMsg("Customer Name is mandatory. Please enter your valid full name (at least 2 characters) to request an OTP.");
			nameInputRef.current?.focus();
			return;
		}
		const phoneErr = getPhoneInlineError(phone, true);
		const cleanPhone = sanitize10DigitPhone(phone);
		if (phoneErr || cleanPhone.length !== 10) {
			setErrorMsg(phoneErr || "Please enter your valid 10-digit WhatsApp mobile number.");
			phoneInputRef.current?.focus();
			return;
		}
		if (sendingLockRef.current || isSending) return;
		if (isResend && resendSeconds > 0) return;
		if (!isResend && otpRequested && resendSeconds > 0 && otpToken) {
			otpInputRef.current?.focus();
			return;
		}
		sendingLockRef.current = true;
		setIsSending(true);
		setErrorMsg("");
		setOtpRequested(true);
		setFailedAttempts(0);
		try {
			const res = await requestServerOtp(cleanPhone, {
				forceNew: isResend,
				customerName: cleanName
			});
			if (res.success && res.token) {
				setOtpToken(res.token);
				setOtpExpiresAt(res.expiresAt || Date.now() + 6e5);
				if (isResend) setOtp("");
				setSmsDeliveryInfo(`Hello ${cleanName}, a 4-digit OTP has been sent to your WhatsApp (+91 ${cleanPhone}). Please enter it below.`);
				setResendSeconds(30);
				setTimeout(() => otpInputRef.current?.focus(), 80);
			} else setErrorMsg(res.message || "Could not send OTP right now. Please try again.");
		} catch {
			setErrorMsg("Network issue while sending OTP. Please try again.");
		} finally {
			setIsSending(false);
			sendingLockRef.current = false;
		}
	};
	const handleVerifyOtp = async (e) => {
		e.preventDefault();
		setNameTouched(true);
		setPhoneTouched(true);
		setOtpTouched(true);
		const cleanName = name.trim();
		if (!isValidCustomerName(cleanName)) {
			setErrorMsg("Customer Name is mandatory. Please enter your valid full name before logging in.");
			nameInputRef.current?.focus();
			return;
		}
		const phoneErr = getPhoneInlineError(phone, true);
		const cleanPhone = sanitize10DigitPhone(phone);
		if (phoneErr || cleanPhone.length !== 10) {
			setErrorMsg(phoneErr || "Please enter a valid 10-digit WhatsApp mobile number.");
			phoneInputRef.current?.focus();
			return;
		}
		if (!otpRequested || !otpToken) {
			await handleGetOtpOnWhatsApp(false);
			return;
		}
		const cleanOtp = otp.replace(/\D/g, "").trim();
		const otpErr = getOtpInlineError(cleanOtp, true);
		if (otpErr || cleanOtp.length !== 4) {
			setErrorMsg(otpErr || "Please enter the 4-digit OTP sent to your WhatsApp.");
			otpInputRef.current?.focus();
			return;
		}
		if (otpExpiresAt > 0 && Date.now() > otpExpiresAt) {
			setErrorMsg("OTP has expired. Please tap \"Resend OTP\" to get a fresh code.");
			return;
		}
		if (failedAttempts >= 5) {
			setErrorMsg("Too many incorrect attempts. Please tap \"Resend OTP\".");
			return;
		}
		setIsVerifying(true);
		setErrorMsg("");
		const verifyRes = await verifyServerOtp(cleanPhone, cleanOtp, otpToken);
		setIsVerifying(false);
		if (!verifyRes.success) {
			setFailedAttempts((prev) => prev + 1);
			const remaining = Math.max(0, 4 - failedAttempts);
			setErrorMsg(remaining > 0 ? `Incorrect OTP entered. Please check your WhatsApp (+91 ${cleanPhone}). (${remaining} attempts left)` : "Too many incorrect attempts. Please tap \"Resend OTP\".");
			return;
		}
		const user = {
			id: `CUST-${cleanPhone}`,
			name: cleanName,
			phone: cleanPhone,
			email: email.trim() || void 0,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		try {
			const raw = localStorage.getItem("safar_registered_customers");
			let list = raw ? JSON.parse(raw) : [];
			list = list.filter((u) => sanitize10DigitPhone(u.phone) !== user.phone);
			list.unshift(user);
			localStorage.setItem("safar_registered_customers", JSON.stringify(list));
		} catch {}
		onLoginSuccess(user);
		onClose();
	};
	const cleanPhoneLen = sanitize10DigitPhone(phone).length;
	const nameIsValid = isValidCustomerName(name);
	const livePhoneErr = getPhoneInlineError(phone, false);
	const liveOtpErr = otpRequested ? getOtpInlineError(otp, false) : "";
	const isOtpCooldownActive = otpRequested && resendSeconds > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4 overflow-y-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 my-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					className: "absolute top-4 right-4 min-w-[40px] min-h-[40px] text-slate-500 hover:text-slate-800 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer flex items-center justify-center",
					"aria-label": "Close login modal",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-5 h-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 border border-emerald-200",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "w-6 h-6 text-emerald-600" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-lg font-extrabold text-slate-900",
							children: "Customer Login / Persistent Session"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-500 mt-0.5",
							children: "Login once with your mobile number to keep your ride history & GST bills synced"
						})
					]
				}),
				authPrompt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-4 h-4 text-amber-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: authPrompt })]
				}),
				errorMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					role: "alert",
					className: "p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2 font-bold animate-in fade-in",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: errorMsg })]
				}),
				smsDeliveryInfo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-semibold",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-4 h-4 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: smsDeliveryInfo })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleVerifyOtp,
					noValidate: true,
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								htmlFor: "auth-customer-name",
								className: "block text-xs font-bold text-slate-700 mb-1.5",
								children: ["1. Customer Full Name ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-rose-600",
									children: "*"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: nameInputRef,
									id: "auth-customer-name",
									name: "customerName",
									type: "text",
									required: true,
									value: name,
									onBlur: () => setNameTouched(true),
									onChange: (e) => handleNameChange(e.target.value),
									placeholder: "Enter your full name (e.g. Aman Kumar)",
									className: `w-full min-h-[48px] bg-slate-50 border rounded-xl pl-10 pr-3.5 py-3 text-slate-900 text-sm font-semibold focus:outline-none focus:bg-white transition ${(name.length > 0 || nameTouched) && !nameIsValid ? "border-rose-500 bg-rose-50/40 focus:border-rose-600 ring-2 ring-rose-500/15" : "border-slate-300 focus:border-emerald-600"}`
								})]
							}),
							(name.length > 0 || nameTouched) && !nameIsValid && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								role: "alert",
								className: "mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Please enter your full name (minimum 2 letters)." })]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								htmlFor: "auth-customer-phone",
								className: "block text-xs font-bold text-slate-700 mb-1.5",
								children: ["2. Your WhatsApp Number ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-rose-600",
									children: "*"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs text-slate-500 font-bold",
									children: "+91"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: phoneInputRef,
									id: "auth-customer-phone",
									name: "customerPhone",
									type: "tel",
									inputMode: "numeric",
									required: true,
									maxLength: 10,
									value: phone,
									onBlur: () => setPhoneTouched(true),
									onChange: (e) => handlePhoneChange(e.target.value),
									placeholder: "Enter 10-digit WhatsApp number",
									"aria-invalid": Boolean(livePhoneErr),
									className: `w-full min-h-[48px] bg-slate-50 border rounded-xl pl-11 pr-3 py-3 text-slate-900 text-sm font-mono font-bold focus:outline-none focus:bg-white transition ${livePhoneErr ? "border-rose-500 bg-rose-50/40 focus:border-rose-600 ring-2 ring-rose-500/15" : "border-slate-300 focus:border-emerald-600"}`
								})]
							}),
							livePhoneErr && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								role: "alert",
								className: "mt-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-start gap-1.5 animate-in fade-in",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: livePhoneErr })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => handleGetOtpOnWhatsApp(false),
								disabled: isSending || isOtpCooldownActive,
								className: `mt-3 w-full min-h-[48px] flex items-center justify-between px-4 py-3 rounded-xl text-white transition shadow-sm ${isSending || isOtpCooldownActive ? "bg-emerald-600/80 opacity-90 cursor-not-allowed" : nameIsValid && cleanPhoneLen === 10 ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer active:scale-99" : "bg-slate-700 hover:bg-slate-800 cursor-pointer"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-2 text-xs font-extrabold",
									children: [isSending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 text-white animate-spin shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "w-4 h-4 text-white shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isSending ? "Sending OTP to your WhatsApp..." : isOtpCooldownActive ? `OTP Sent to +91 ${phone} ✓` : "Get OTP on WhatsApp" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "inline-flex items-center gap-1 text-[11px] font-black text-slate-950 bg-amber-400 px-3 py-1 rounded-lg",
									children: isSending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }), " Sending"] }) : isOtpCooldownActive ? `Wait ${resendSeconds}s` : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Get OTP ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-3 h-3" })] })
								})]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-4 rounded-2xl bg-slate-50 border-2 border-emerald-200 space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										htmlFor: "auth-otp-input",
										className: "block text-xs font-extrabold text-slate-900",
										children: ["3. Enter 4-Digit WhatsApp OTP ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-rose-600",
											children: "*"
										})]
									}), otpRequested && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => handleGetOtpOnWhatsApp(true),
										disabled: resendSeconds > 0 || isSending,
										className: "text-[11px] font-bold text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 flex items-center gap-1 cursor-pointer",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `w-3 h-3 ${isSending ? "animate-spin" : ""}` }), resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: otpInputRef,
									id: "auth-otp-input",
									type: "text",
									inputMode: "numeric",
									autoComplete: "one-time-code",
									maxLength: 4,
									value: otp,
									onBlur: () => setOtpTouched(true),
									onChange: (e) => {
										setOtp(e.target.value.replace(/\D/g, "").slice(0, 4));
										setErrorMsg("");
									},
									placeholder: "Enter 4-Digit OTP (e.g. 1234)",
									"aria-invalid": Boolean(liveOtpErr),
									className: `w-full min-h-[50px] bg-white border-2 rounded-xl px-4 py-3 text-center text-xl tracking-[0.35em] text-slate-900 font-mono font-extrabold focus:outline-none placeholder:text-xs placeholder:tracking-normal placeholder:font-sans placeholder:font-semibold placeholder:text-slate-400 transition ${liveOtpErr ? "border-rose-500 bg-rose-50/40 focus:border-rose-600 ring-2 ring-rose-500/15" : "border-slate-300 focus:border-emerald-600"}`
								}),
								liveOtpErr && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									role: "alert",
									className: "text-[11px] font-bold text-rose-600 flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: liveOtpErr })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									disabled: isVerifying || isSending,
									className: "w-full min-h-[50px] bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black py-3.5 rounded-xl text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2",
									children: isVerifying ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin text-slate-950" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Verifying OTP & Saving Session..." })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheckBig, { className: "w-4 h-4 text-slate-950" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Verify OTP & Login" })] })
								})
							]
						})
					]
				})
			]
		})
	});
};
export { CustomerAuthModal };
