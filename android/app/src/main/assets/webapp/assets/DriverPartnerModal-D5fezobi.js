import { r as __toESM } from "./rolldown-runtime-SbdDWaPq.js";
import { t as require_jsx_runtime } from "./react-vendor-BBjiQENi.js";
import { F as MessageSquare, d as Sparkles, g as ShieldCheck, gt as require_react, t as X, tt as CircleCheck, x as Send } from "./lucide-icons-CHOsk2xN.js";
import { h as triggerWhatsAppDeepLink } from "./index-Cw1MAn3l.js";
// src/components/DriverPartnerModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var DriverPartnerModal = ({ isOpen, onClose }) => {
	const [fullName, setFullName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [city, setCity] = (0, import_react.useState)("");
	const [vehicleType, setVehicleType] = (0, import_react.useState)("Sedan (Dzire / Etios)");
	const [vehicleNumber, setVehicleNumber] = (0, import_react.useState)("");
	const [hasCommercialPermit, setHasCommercialPermit] = (0, import_react.useState)(true);
	const [isSubmitted, setIsSubmitted] = (0, import_react.useState)(false);
	const [errorMsg, setErrorMsg] = (0, import_react.useState)("");
	if (!isOpen) return null;
	const handleSubmit = (e) => {
		e.preventDefault();
		const cleanPhone = phone.replace(/\D/g, "");
		if (!fullName.trim()) {
			setErrorMsg("Please enter your full name");
			return;
		}
		if (cleanPhone.length < 10) {
			setErrorMsg("Please enter a valid 10-digit mobile number");
			return;
		}
		if (!city.trim()) {
			setErrorMsg("Please enter your home city");
			return;
		}
		if (!vehicleNumber.trim()) {
			setErrorMsg("Please enter your commercial taxi registration number");
			return;
		}
		const application = {
			id: `DRV-${Date.now().toString().slice(-6)}`,
			fullName: fullName.trim(),
			phone: cleanPhone.slice(-10),
			city: city.trim(),
			vehicleType,
			vehicleNumber: vehicleNumber.trim().toUpperCase(),
			hasCommercialPermit,
			submittedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		try {
			const saved = localStorage.getItem("safar_partner_applications");
			const list = saved ? JSON.parse(saved) : [];
			list.unshift(application);
			localStorage.setItem("safar_partner_applications", JSON.stringify(list));
		} catch {}
		setIsSubmitted(true);
	};
	const handleWhatsAppOnboarding = () => {
		const text = `*SAFAR INDIA CABS - DRIVER/VENDOR PARTNER ONBOARDING*\n\n*Name:* ${fullName}\n*Mobile:* +91 ${phone}\n*Base City:* ${city}\n*Vehicle Type:* ${vehicleType}\n*Taxi Plate No.:* ${vehicleNumber}\n*Commercial Permit (AITP):* ${hasCommercialPermit ? "Yes" : "In Process"}\n\n_I want to join as a driver partner and start taking outstation trips with Safar India Cabs._`;
		triggerWhatsAppDeepLink(void 0, text);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bg-white border border-slate-200 rounded-3xl w-full max-w-lg my-auto p-5 sm:p-7 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: onClose,
				className: "absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl bg-slate-100 transition",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-5 h-5" })
			}), isSubmitted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center py-6 space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-8 h-8" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-xl font-black text-slate-900",
						children: "Application Received!"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-slate-600 mt-1 max-w-sm mx-auto",
						children: [
							"Welcome to Safar India Cabs network, ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-amber-700",
								children: fullName
							}),
							". Our fleet manager will verify your vehicle details and activate your trips within 2 hours."
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between text-slate-600",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Vehicle:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-slate-900",
									children: vehicleType
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between text-slate-600",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Taxi Number:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono font-bold text-amber-700",
									children: vehicleNumber.toUpperCase()
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between text-slate-600",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Base City:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-slate-900",
									children: city
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 pt-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: handleWhatsAppOnboarding,
							className: "w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Instant Onboard via WhatsApp (+91 95705 71516)" })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onClose,
							className: "w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition",
							children: "Close"
						})]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-b border-slate-200 pb-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md mb-2 border border-amber-200",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3.5 h-3.5 text-amber-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Earn ₹45,000 - ₹85,000 / Month" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-lg sm:text-xl font-black text-slate-900",
							children: "Join as Driver / Vendor Partner"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-500 mt-1",
							children: "Partner with Safar India Cabs. Guaranteed return trips, transparent km rates, and daily direct payouts."
						})
					]
				}),
				errorMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs text-center font-medium",
					children: errorMsg
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSubmit,
					className: "mt-4 space-y-3.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1",
							children: "Driver / Owner Full Name *"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							required: true,
							value: fullName,
							onChange: (e) => setFullName(e.target.value),
							placeholder: "e.g. Ramesh Kumar",
							className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1",
								children: "Mobile Number (WhatsApp) *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-bold",
									children: "+91"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "tel",
									required: true,
									maxLength: 10,
									value: phone,
									onChange: (e) => setPhone(e.target.value.replace(/\D/g, "")),
									placeholder: "9876543210",
									className: "w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-3 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
								})]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1",
								children: "Home / Operating City *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								required: true,
								value: city,
								onChange: (e) => setCity(e.target.value),
								placeholder: "e.g. Delhi NCR, Jaipur, Pune",
								className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1",
								children: "Vehicle Type *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: vehicleType,
								onChange: (e) => setVehicleType(e.target.value),
								className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Sedan (Dzire / Etios / Aura)",
										children: "Sedan (Dzire / Etios / Aura)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Executive Sedan (Honda City / Ciaz)",
										children: "Executive Sedan (City / Ciaz)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "SUV (Ertiga / Carens / Triber)",
										children: "SUV (Ertiga / Carens)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Premium MPV (Innova Crysta / Hycross)",
										children: "Innova Crysta / Hycross"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Tempo Traveller (12/17/26 Seater)",
										children: "Tempo Traveller (12-26 Seater)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Hatchback (WagonR / Tiago)",
										children: "Hatchback (WagonR / Tiago)"
									})
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1",
								children: "Taxi Plate Number *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								required: true,
								value: vehicleNumber,
								onChange: (e) => setVehicleNumber(e.target.value),
								placeholder: "e.g. DL 1TA 1234 / MH 02 CR 5678",
								className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono uppercase text-xs focus:outline-none focus:border-amber-500 focus:bg-white font-bold"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-1",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-2 cursor-pointer text-xs text-slate-700",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: hasCommercialPermit,
									onChange: (e) => setHasCommercialPermit(e.target.checked),
									className: "rounded border-slate-300 text-amber-500 focus:ring-amber-400"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "I have Commercial Yellow Board Plate / All India Tourist Permit (AITP)" })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								className: "w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 active:scale-95",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "w-4 h-4 text-slate-950" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Submit Partner Application" })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Zero registration fee · Direct payment to your bank/UPI after each trip" })]
						})
					]
				})
			] })]
		})
	});
};
export { DriverPartnerModal };
