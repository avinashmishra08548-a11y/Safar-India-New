import { r as __toESM } from "./rolldown-runtime-SbdDWaPq.js";
import { t as require_jsx_runtime } from "./react-vendor-BBjiQENi.js";
import { B as Mail, D as RefreshCcw, F as MessageSquare, H as Lock, J as FileText, M as Phone, N as Navigation, Y as ExternalLink, g as ShieldCheck, gt as require_react, s as Trash2, t as X, tt as CircleCheck, z as MapPin } from "./lucide-icons-CHOsk2xN.js";
import { h as triggerWhatsAppDeepLink, m as buildWhatsAppSchemeUrl, n as SAFAR_CONTACT_INFO } from "./index-Cw1MAn3l.js";
// src/components/LegalPoliciesModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var LegalPoliciesModal = ({ isOpen, initialTab = "privacy", onClose, currentUser, onDeleteAccountData }) => {
	const [activeTab, setActiveTab] = (0, import_react.useState)(initialTab);
	const [deletePhone, setDeletePhone] = (0, import_react.useState)(currentUser?.phone || "");
	const [deleteName, setDeleteName] = (0, import_react.useState)(currentUser?.name || "");
	const [deleteReason, setDeleteReason] = (0, import_react.useState)("");
	const [deleteConfirmed, setDeleteConfirmed] = (0, import_react.useState)(false);
	const [deleteSuccessMessage, setDeleteSuccessMessage] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setActiveTab(initialTab);
	}, [initialTab]);
	(0, import_react.useEffect)(() => {
		if (currentUser?.phone && !deletePhone) setDeletePhone(currentUser.phone);
		if (currentUser?.name && !deleteName) setDeleteName(currentUser.name);
	}, [
		currentUser,
		deletePhone,
		deleteName
	]);
	if (!isOpen) return null;
	const tabs = [
		{
			id: "privacy",
			label: "Privacy Policy",
			shortLabel: "Privacy",
			icon: ShieldCheck
		},
		{
			id: "terms",
			label: "Terms & Conditions",
			shortLabel: "Terms",
			icon: FileText
		},
		{
			id: "refund",
			label: "Cancellation & Refund",
			shortLabel: "Refunds",
			icon: RefreshCcw
		},
		{
			id: "contact",
			label: "Contact Us & Support",
			shortLabel: "Contact",
			icon: Phone
		},
		{
			id: "delete-account",
			label: "Account & Data Deletion",
			shortLabel: "Delete Data",
			icon: Trash2
		}
	];
	const handleAccountDeletionSubmit = (e) => {
		e.preventDefault();
		const cleanedPhone = deletePhone.replace(/\D/g, "").slice(-10);
		if (cleanedPhone.length !== 10 || !deleteConfirmed) return;
		if (onDeleteAccountData) onDeleteAccountData(cleanedPhone, deleteReason);
		setDeleteSuccessMessage(`Account & personal data deletion request registered for +91 ${cleanedPhone}. Local session and saved device data have been purged immediately, and any server records will be permanently erased within 7 business days.`);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[1000005] flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto animate-in fade-in",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "legal-policies-modal-title",
		onClick: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bg-white border border-slate-200 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-2 sm:my-6 flex flex-col max-h-[92vh]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-[#0B0F19] text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-5 h-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-extrabold uppercase tracking-wider text-amber-400",
								children: "SafarIndiaCabs · Official Legal & Play Store Compliance"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								id: "legal-policies-modal-title",
								className: "text-base sm:text-lg font-black truncate",
								children: "Legal Policies, Data Safety & Customer Support"
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						"aria-label": "Close legal policies modal",
						className: "w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-5 h-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-slate-100 border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0",
					children: tabs.map((t) => {
						const IconComp = t.icon;
						const isActive = activeTab === t.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setActiveTab(t.id),
							className: `px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${isActive ? "bg-amber-400 text-slate-950 shadow-2xs" : "bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200/80"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconComp, { className: "w-3.5 h-3.5 shrink-0" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hidden sm:inline",
									children: t.label
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sm:hidden",
									children: t.shortLabel
								})
							]
						}, t.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 sm:p-7 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed flex-1",
					children: [
						activeTab === "privacy" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "space-y-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "border-b border-slate-200 pb-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold mb-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3.5 h-3.5 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Google Play Data Safety & DPDP Act 2023 Compliant" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
											className: "text-xl sm:text-2xl font-black text-slate-950",
											children: "Privacy Policy — SafarIndiaCabs"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-slate-500 mt-1",
											children: [
												"Effective Date: January 1, 2025 | Last Updated: October 25, 2026 | Domain:",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: "https://safarindiacabs.com",
													className: "text-amber-700 font-bold underline",
													children: "https://safarindiacabs.com"
												})
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"Welcome to ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "SafarIndiaCabs" }),
									" (“we,” “our,” or “us”). We operate the website",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "https://safarindiacabs.com" }),
									" and the ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "SafarIndiaCabs mobile application" }),
									". We are committed to protecting the privacy, security, and personal data of our passengers, customers, and driver-partners in compliance with the Information Technology Act, 2000, the Digital Personal Data Protection (DPDP) Act, 2023 (India), and Google Play Store User Data policies."
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 text-slate-950 font-black text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, { className: "w-4 h-4 text-amber-700 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Prominent Disclosure: Foreground & Background Location Data" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-slate-800 leading-relaxed",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "SafarIndiaCabs collects precise and approximate GPS location data:" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
											"• ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "For Passengers (Users):" }),
											" Location data is collected in the ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "foreground" }),
											" when the app is open to automatically detect your pickup point, calculate accurate intercity road distance/fares, and display nearby available cabs.",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
											"• ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "For Driver-Partners & Active Trips:" }),
											" Location data may be collected in the ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "foreground and background" }),
											" strictly during active, assigned rides to enable real-time trip tracking, live route navigation, accurate pickup coordination, and emergency passenger safety monitoring. Location tracking stops immediately once a trip is marked completed or cancelled."
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "1. Information We Collect"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "list-disc pl-5 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Personal Identification Details:" }), " Full Name, Mobile Phone Number (verified via OTP), and Email Address (optional, for GST tax invoices and booking vouchers) provided when creating an account or booking a cab."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Precise & Approximate Location Data (GPS):" }), " Pickup address, drop-off destination, intermediate stops, and GPS coordinates collected via device location sensors or map autocomplete strictly for cab booking, distance computation, and trip tracking."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Payment & Transaction Information:" }),
												" When you pay the 20% booking advance or full fare online, payments are processed securely through RBI-authorized PCI-DSS compliant payment gateways (",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Razorpay / UPI Intent" }),
												" such as Google Pay, PhonePe, Paytm, or Cards). We store only transaction reference IDs and payment status; we ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "never" }),
												" store your credit/debit card numbers, CVV, or UPI PIN on our servers."
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Device & Technical Information:" }), " Device model, operating system version, browser user-agent, IP address, crash logs, and network status to ensure seamless app performance, prevent fraud, and support UPI intent checkout on Android/iOS devices."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Driver-Partner KYC Data (For Chauffeurs/Vendors Only):" }), " Driving License, Commercial Vehicle Registration Certificate (RC), All India Tourist Permit (AITP), Insurance, and vehicle photographs for safety verification."] })
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "2. How We Use Your Data"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "list-disc pl-5 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Completing Cab Bookings & Ride Dispatch:" }), " To register your outstation one-way, round-trip, local hourly rental, or airport transfer booking and share your pickup schedule with your assigned commercial chauffeur."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Driver Assignment & Live Coordination:" }), " To allot a verified AC Hatchback, Sedan, SUV (Ertiga/Marazzo), or Innova Crysta along with driver contact and vehicle registration details via WhatsApp, SMS, and in-app vouchers."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Customer Support & Safety:" }), " To provide 24×7 dispatch helpline assistance, resolve route or billing queries, generate GST tax invoices, and ensure passenger and driver safety during intercity travel."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Transactional Communications:" }), " To send booking confirmations, driver allotment alerts, payment receipts, and post-trip feedback requests. We do not sell or rent your phone number to third-party telemarketers."] })
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "text-base font-black text-slate-950",
											children: "3. Data Sharing & Third-Party Services"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
											"We do ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "not" }),
											" sell, trade, or rent your personal data to any marketing third parties. Data is shared strictly on a need-to-know basis with:"
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
											className: "list-disc pl-5 space-y-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Assigned Chauffeur / Fleet Partner:" }), " Only your Name, Mobile Number, Pickup/Drop location, and balance collectable amount are shared with the verified driver assigned to fulfill your ride."] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Payment Processors & Map Providers:" }), " Razorpay (for secure payment processing) and Ola Maps / OpenStreetMap APIs (for road distance and geocoding)."] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Legal & Law Enforcement Authorities:" }), " Only when required by applicable Indian law, court order, or government transport regulation."] })
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "4. Data Protection Standards & Security"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
										"All data transmitted between the SafarIndiaCabs app/website and our servers is encrypted in transit using ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "HTTPS / TLS 1.2+ SSL encryption" }),
										". Access to booking records is restricted to authorized dispatch personnel via PIN-protected administrative controls."
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "text-base font-black text-slate-950",
											children: "5. User Rights & How to Request Account / Data Deletion"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "You have the right to access, correct, or request complete deletion of your personal data and booking profile at any time:" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
											className: "list-disc pl-5 space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "In-App Instant Deletion:" }),
												" Open the ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "“Account & Data Deletion”" }),
												" tab in this Legal Center (or go to ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "https://safarindiacabs.com/delete-account.html" }),
												") to immediately erase your saved account data and submit a permanent server deletion request."
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Via Email or Helpline:" }),
												" Email us at",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: "mailto:safarindiacabs01@gmail.com",
													className: "text-amber-700 font-bold underline",
													children: "safarindiacabs01@gmail.com"
												}),
												" ",
												"or WhatsApp/Call ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "+91-9570571516" }),
												" with the subject ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "“Account & Data Deletion Request”" }),
												". All personal records are permanently deleted within ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "7 business days" }),
												" (except statutory tax invoices required to be retained under Indian GST laws)."
											] })]
										})
									]
								})
							]
						}),
						activeTab === "terms" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "space-y-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "border-b border-slate-200 pb-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										className: "text-xl sm:text-2xl font-black text-slate-950",
										children: "Terms & Conditions — SafarIndiaCabs"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-slate-500 mt-1",
										children: "Effective Date: January 1, 2025 | Governing Law: Laws of India (Courts of New Delhi)"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"These Terms & Conditions (“Terms”) govern your access to and use of the website",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "https://safarindiacabs.com" }),
									" and the ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "SafarIndiaCabs" }),
									" mobile application operated by SafarIndiaCabs, having its registered office at",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "H NO 143 STREET NO 4 JHARODA MAJRA NORTH DELHI BURARI 110084" }),
									". By booking a cab or using our platform, you agree to be bound by these Terms."
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "1. Role as a Cab Booking Aggregator"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "SafarIndiaCabs acts as an online cab booking aggregator and dispatch facilitator connecting passengers with independent, commercially licensed taxi operators and verified chauffeurs holding valid All India Tourist Permits (AITP)." })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "2. Booking Rules, Fare Estimation & Kilometre Calculation"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "list-disc pl-5 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "One-Way Intercity Trips:" }),
												" Fares are calculated strictly for the one-way road distance (subject to a minimum billing of 130 KM). Passengers pay ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "zero return fare" }),
												" and zero return driver charges. One-way bookings include 1 pickup point in the origin city and 1 drop point in the destination city."
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Outstation Round Trips (Multi-City):" }),
												" Billed at a minimum package of ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "250 KM per calendar day" }),
												" (calculated from 12:00 AM to 11:59 PM). If total kilometres driven exceed the package limit (250 KM × number of days), additional kilometres are billed at the applicable per-KM rate for the chosen vehicle category."
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Local Hourly Rentals:" }), " Available in standard packages (4 Hrs / 40 KM, 8 Hrs / 80 KM, and 12 Hrs / 120 KM) within municipal city limits. Extra hours or extra kilometres beyond the package are billed as per the rate card."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Hill Area & Peak/Surge Pricing:" }), " Journeys involving hilly terrains (Himachal Pradesh, Uttarakhand, Jammu & Kashmir, North-East, Ghats) or high-demand festive/night slots include a standard hill/terrain adjustment factored transparently into your upfront fare estimate. In hill regions, vehicle AC may be turned off on steep inclines to prevent engine overheating."] })
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "3. Waiting Charges, Driver Allowance, Tolls & State Taxes"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "list-disc pl-5 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Waiting & Detour Charges:" }),
												" For One-Way and Airport trips, up to ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "30 minutes" }),
												" of waiting at pickup is complimentary. Beyond 30 minutes, waiting charges of ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "₹150 per hour" }),
												" (or ₹2.5/min) apply. Any unscheduled detours or extra city pickups/drops will be billed as per actual extra kilometres."
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Highway Tolls & State Entry Taxes:" }), " Applicable State Entry Taxes for transit and destination states (charged per calendar day expiring at 12:00 AM midnight, plus ₹100 Delhi MCD toll for non-Delhi pickups entering or crossing Delhi) are calculated transparently upfront. Highway FASTag tolls and optional parking fees are extra as per actual receipts."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Driver Allowance & Night Driving Charge:" }), " For One-Way trips, driver allowance is already included. For Round Trips, standard driver allowance (₹300/day for Hatchback/Sedan/SUV; ₹400/day for Innova Crysta) and night driving allowance (₹300/night for driving between 10:00 PM and 06:00 AM) apply as displayed in the fare breakup."] })
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "4. Payment Methods (20% Advance & Balance to Driver)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "list-disc pl-5 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												"To confirm a cab booking and lock vehicle inventory, passengers may pay a ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "20% Advance Deposit" }),
												" (or 100% Full Pre-Payment) online via Razorpay (UPI, GPay, PhonePe, Paytm, Debit/Credit Cards, or NetBanking)."
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												"The remaining ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "80% Balance Payable" }),
												" amount is paid directly to the assigned chauffeur via Cash or UPI during the trip or upon reaching the destination."
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												"Promotional discount codes (such as ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "FIRST300" }),
												") apply to eligible bookings and are deducted transparently in the fare summary prior to payment."
											] })
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "5. Passenger & Driver Code of Conduct"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "list-disc pl-5 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Strict Non-Smoking & Zero-Alcohol Policy:" }), " Smoking, consumption of alcohol, or possession of illegal/prohibited substances inside the cab is strictly forbidden for both passengers and drivers. Chauffeurs reserve the right to refuse or terminate a ride if passengers are intoxicated or abusive."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Seating & Luggage Capacity:" }), " Maximum passenger seating is strictly governed by the vehicle RTO permit (4 passengers for Hatchback/Sedan, 6 for Ertiga SUV, 6–7 for Innova Crysta). Rooftop luggage carriers are provided only on request where permitted by state traffic rules."] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Chauffeur Discipline:" }), " Our driver-partners are instructed to arrive clean, maintain courteous behavior, follow speed limits, and never demand extra money beyond the official booking voucher and actual toll/parking receipts."] })
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "6. Limitation of Liability"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "While SafarIndiaCabs takes every reasonable measure to ensure timely dispatch and vehicle roadworthiness, we shall not be liable for delays, missed flights/trains, or consequential losses caused by force majeure events including severe traffic congestion, highway blockades, extreme weather, landslides, political rallies, or mechanical breakdowns beyond human control. In the rare event of a vehicle breakdown, our 24×7 dispatch desk will arrange an alternate cab or process a proportionate refund. Our maximum aggregate liability for any claim shall not exceed the total advance amount paid by the customer for the specific booking." })]
								})
							]
						}),
						activeTab === "refund" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "space-y-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "border-b border-slate-200 pb-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										className: "text-xl sm:text-2xl font-black text-slate-950",
										children: "Cancellation & Refund Policy — SafarIndiaCabs"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-slate-500 mt-1",
										children: "Transparent, Customer-First Cancellation & Automated Refund Rules"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"At ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "SafarIndiaCabs" }),
									", we understand that travel plans can change unexpectedly. Our Cancellation and Refund Policy is designed to be fair to both passengers and chauffeurs who reserve their schedule and fuel to reach your pickup location."
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "1. Cancellation By Customer (Before & After Driver Dispatch)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-xs font-black text-emerald-900 uppercase",
														children: "6+ Hours Before Pickup"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-lg font-black text-emerald-700",
														children: "100% Free Cancel"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
														className: "text-xs text-slate-600",
														children: [
															"Zero cancellation fee if cancelled at least ",
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "6 hours prior" }),
															" to the scheduled pickup time. 100% of your 20% advance deposit is refunded."
														]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-xs font-black text-amber-900 uppercase",
														children: "Within 6 Hours / Driver Allotted"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-lg font-black text-amber-700",
														children: "50% Advance Retained"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "text-xs text-slate-600",
														children: "If cancelled between 2 to 6 hours before pickup (before driver arrives at gate), 50% of the advance deposit is retained as allocation fee; 50% is refunded or 100% credited toward a rescheduled trip."
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-1",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-xs font-black text-rose-900 uppercase",
														children: "After Driver Dispatch / No-Show"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-lg font-black text-rose-700",
														children: "Advance Non-Refundable"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "text-xs text-slate-600",
														children: "If cancelled within 2 hours of pickup, after the driver has already dispatched/reached the pickup point, or in case of passenger no-show, the 20% advance deposit is non-refundable to compensate the driver’s fuel and time."
													})
												]
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "2. Free Trip Rescheduling / Date Modification"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
										"Passengers may modify their pickup time or travel date ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "free of charge" }),
										" up to ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "4 hours before" }),
										" the scheduled pickup time by contacting our 24×7 WhatsApp/Call Desk at ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "+91-9570571516" }),
										". Your entire advance deposit is automatically transferred to the rescheduled booking."
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "3. Cancellation By Driver / Failed Dispatch Guarantee"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
										"In the rare event that SafarIndiaCabs or the assigned driver cancels a confirmed booking due to vehicle breakdown, medical emergency, or unavailability, and we are unable to provide an equivalent or upgraded replacement cab within a reasonable window, the customer is entitled to a ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "100% full refund" }),
										" of the advance amount paid, with zero deductions."
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "4. Failed / Duplicate Online Payments"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "If your bank account or UPI app is debited during checkout on Razorpay, but a booking voucher is not generated due to network drop or timeout, or if a duplicate payment occurs, the excess/failed amount is automatically reconciled and refunded in full (100%)." })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-black text-slate-950",
										children: "5. Refund Processing Timelines"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "list-disc pl-5 space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Initiation:" }),
												" Approved refunds are initiated by our billing desk within ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "24 to 48 hours" }),
												" of cancellation confirmation."
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Credit to Original Payment Method:" }),
												" All refunds are credited strictly back to the ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "original source of payment" }),
												" (the same UPI ID, Bank Account, Debit Card, or Credit Card used via Razorpay) within ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "5 to 7 business days" }),
												" as per standard RBI and banking settlement timelines."
											] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "How to Request a Refund:" }),
												" You can cancel directly under the ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "“My Rides”" }),
												" section in the app, or send your Booking ID (e.g., ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "SIC-89751" }),
												") on WhatsApp to ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "+91-9570571516" }),
												" or email",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: "mailto:safarindiacabs01@gmail.com",
													className: "text-amber-700 font-bold underline",
													children: "safarindiacabs01@gmail.com"
												}),
												"."
											] })
										]
									})]
								})
							]
						}),
						activeTab === "contact" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "space-y-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "border-b border-slate-200 pb-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										className: "text-xl sm:text-2xl font-black text-slate-950",
										children: "Contact Us & Official Support — SafarIndiaCabs"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-slate-500 mt-1",
										children: "24×7 Customer Care, Dispatch Helpline, Grievance Redressal & Registered Office Details"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 md:grid-cols-3 gap-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 space-y-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-5 h-5" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[11px] font-extrabold uppercase tracking-wider text-amber-700",
													children: "Customer Support Phone (24×7)"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: "tel:+919570571516",
													className: "block text-base sm:text-lg font-black text-slate-950 font-mono hover:text-amber-700",
													children: "+91-9570571516"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-slate-500",
													children: "Available 24 Hours, 7 Days a Week for bookings, live driver tracking & emergency support."
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 space-y-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "w-5 h-5" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[11px] font-extrabold uppercase tracking-wider text-blue-700",
													children: "Official Email & Grievance Desk"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: "mailto:safarindiacabs01@gmail.com",
													className: "block text-sm sm:text-base font-black text-slate-950 break-all hover:text-blue-700",
													children: "safarindiacabs01@gmail.com"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-slate-500",
													children: "For GST invoices, corporate inquiries, refund status, and privacy/data requests."
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 space-y-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "w-5 h-5" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-[11px] font-extrabold uppercase tracking-wider text-emerald-700",
													children: "Official Registered Address"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("address", {
													className: "not-italic text-xs sm:text-sm font-black text-slate-950 leading-snug",
													children: "H NO 143 STREET NO 4 JHARODA MAJRA NORTH DELHI BURARI 110084"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-slate-500",
													children: "New Delhi, Delhi – 110084, India"
												})
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "text-base font-black text-amber-400",
											children: "Grievance Officer & Play Store Developer Compliance Contact"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs sm:text-sm text-slate-300 leading-relaxed",
											children: "In accordance with the Information Technology Act, 2000 and Consumer Protection (E-Commerce) Rules, 2020, the contact details of our Grievance & Compliance Desk are provided below:"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-800/90 p-4 rounded-xl border border-slate-700",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-400 block",
													children: "Legal Entity / Brand Name:"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-white",
													children: "SafarIndiaCabs (safarindiacabs.com)"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-400 block",
													children: "Official Support Email:"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-amber-400",
													children: "safarindiacabs01@gmail.com"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-400 block",
													children: "24×7 Helpline & WhatsApp:"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-white font-mono",
													children: "+91-9570571516"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-slate-400 block",
													children: "Registered Office Address:"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-white",
													children: "H NO 143 STREET NO 4 JHARODA MAJRA NORTH DELHI BURARI 110084"
												})] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap gap-2.5 pt-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
												href: buildWhatsAppSchemeUrl(SAFAR_CONTACT_INFO.whatsappRaw, "Hello SafarIndiaCabs Support, I need assistance regarding my cab booking."),
												onClick: (e) => triggerWhatsAppDeepLink(e, SAFAR_CONTACT_INFO.whatsappRaw, "Hello SafarIndiaCabs Support, I need assistance regarding my cab booking."),
												className: "px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-1.5 transition cursor-pointer",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "w-4 h-4 fill-current" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Chat on WhatsApp (+91-9570571516)" })]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
												href: "mailto:safarindiacabs01@gmail.com",
												className: "px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 transition",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email safarindiacabs01@gmail.com" })]
											})]
										})
									]
								})
							]
						}),
						activeTab === "delete-account" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "space-y-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "border-b border-slate-200 pb-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-extrabold mb-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5 text-rose-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Google Play Store User Data & Account Deletion Portal" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
											className: "text-xl sm:text-2xl font-black text-slate-950",
											children: "Request Account & Personal Data Deletion"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-slate-500 mt-1",
											children: "In compliance with Google Play Store’s Account Deletion Requirement, you can permanently delete your SafarIndiaCabs account and associated personal data below."
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "font-black text-slate-950 text-sm",
										children: "What Data Is Deleted vs. Retained:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
										className: "list-disc pl-5 space-y-1 text-slate-700",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Permanently Deleted Immediately / Within 7 Days:" }), " Your customer profile (Name, Mobile Number, Email), saved session tokens, saved address preferences, and non-statutory trip history."] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Statutory Retention (If Applicable):" }), " Completed GST tax invoices and payment transaction references required for tax/audit compliance under Indian law are retained in anonymized accounting records as mandated by statute."] })]
									})]
								}),
								deleteSuccessMessage ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 space-y-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 text-emerald-900 font-black text-base",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-5 h-5 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Account & Data Deletion Processed" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs sm:text-sm text-emerald-800 leading-relaxed",
										children: deleteSuccessMessage
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: handleAccountDeletionSubmit,
									className: "bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											htmlFor: "delete-account-phone",
											className: "block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1",
											children: "Registered 10-Digit Mobile Number *"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											id: "delete-account-phone",
											type: "tel",
											required: true,
											maxLength: 10,
											value: deletePhone,
											onChange: (e) => setDeletePhone(e.target.value.replace(/\D/g, "").slice(0, 10)),
											placeholder: "Enter your 10-digit mobile number",
											className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											htmlFor: "delete-account-name",
											className: "block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1",
											children: "Full Name (Optional)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											id: "delete-account-name",
											type: "text",
											value: deleteName,
											onChange: (e) => setDeleteName(e.target.value),
											placeholder: "Enter your name",
											className: "w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											htmlFor: "delete-account-reason",
											className: "block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1",
											children: "Reason for Account Deletion (Optional)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											id: "delete-account-reason",
											rows: 2,
											value: deleteReason,
											onChange: (e) => setDeleteReason(e.target.value),
											placeholder: "Let us know why you wish to delete your account & data...",
											className: "w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex items-start gap-2.5 cursor-pointer text-xs text-slate-700",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												required: true,
												checked: deleteConfirmed,
												onChange: (e) => setDeleteConfirmed(e.target.checked),
												className: "mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "I confirm that I want to permanently delete my SafarIndiaCabs account and personal data associated with this phone number." })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-3 pt-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "submit",
												className: "px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-xs",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delete My Account & Data Now" })]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
												href: `mailto:safarindiacabs01@gmail.com?subject=${encodeURIComponent("Account & Data Deletion Request - SafarIndiaCabs")}&body=${encodeURIComponent(`Please delete my SafarIndiaCabs account and personal data.\nRegistered Mobile: +91 ${deletePhone}\nName: ${deleteName}`)}`,
												className: "px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Request via Email" })]
											})]
										})
									]
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold text-slate-700",
								children: "Direct Web Links:"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: "/privacy-policy.html",
								target: "_blank",
								rel: "noreferrer",
								className: "hover:text-amber-700 underline inline-flex items-center gap-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Privacy Policy URL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-2.5 h-2.5" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: "/terms-and-conditions.html",
								target: "_blank",
								rel: "noreferrer",
								className: "hover:text-amber-700 underline inline-flex items-center gap-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Terms URL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-2.5 h-2.5" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: "/refund-policy.html",
								target: "_blank",
								rel: "noreferrer",
								className: "hover:text-amber-700 underline inline-flex items-center gap-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Refund Policy URL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-2.5 h-2.5" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: "/delete-account.html",
								target: "_blank",
								rel: "noreferrer",
								className: "hover:text-rose-700 underline inline-flex items-center gap-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Account Deletion URL" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-2.5 h-2.5" })]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer",
						children: "Close"
					})]
				})
			]
		})
	});
};
export { LegalPoliciesModal };
