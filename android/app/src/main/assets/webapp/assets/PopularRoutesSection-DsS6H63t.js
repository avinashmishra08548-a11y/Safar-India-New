import "./rolldown-runtime-SbdDWaPq.js";
import { t as require_jsx_runtime } from "./react-vendor-BBjiQENi.js";
import { $ as Clock, gt as require_react, pt as ArrowRight } from "./lucide-icons-CHOsk2xN.js";
import { K as POPULAR_ROUTES, k as formatINR } from "./index-Cw1MAn3l.js";
require_react();
var import_jsx_runtime = require_jsx_runtime();
var PopularRoutesSection = ({ onSelectRoute }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "space-y-6 py-8",
		id: "popular-routes-section",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-col sm:flex-row sm:items-end justify-between gap-2",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl sm:text-3xl font-black text-slate-900 tracking-tight",
				children: "Popular Outstation Routes"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-slate-500 mt-1",
				children: "Tap any route for instant one-way and round-trip fares."
			})] })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5",
			children: POPULAR_ROUTES.map((route, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				role: "button",
				tabIndex: 0,
				onClick: () => onSelectRoute(route),
				onKeyDown: (e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onSelectRoute(route);
					}
				},
				"aria-label": `Book cab from ${route.from} to ${route.to}, starting from ${formatINR(route.startingPrice)}`,
				className: "bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md group flex flex-col justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between text-xs text-slate-600 mb-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-amber-700 font-bold",
						children: route.badge
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1 text-slate-600 font-medium",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5" }), route.duration]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-base font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: route.from }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: route.to })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-slate-600 flex items-center gap-2 font-medium",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono",
								children: [route.distanceKm, " KM"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: route.popularCar })
						]
					})]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] text-slate-600 block font-medium",
						children: "Starting From"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-lg font-black text-slate-950 font-mono tabular-nums",
						children: formatINR(route.startingPrice)
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs font-bold text-slate-900 group-hover:text-amber-700 flex items-center gap-1 transition",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Book" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-3.5 h-3.5" })]
					})]
				})]
			}, idx))
		})]
	});
};
export { PopularRoutesSection };
