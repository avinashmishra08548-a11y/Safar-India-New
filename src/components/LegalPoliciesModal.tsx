import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileText,
  RefreshCcw,
  Phone,
  Mail,
  MapPin,
  Trash2,
  X,
  CheckCircle2,
  Lock,
  Navigation,
  AlertCircle,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { SAFAR_CONTACT_INFO } from './AboutAndHelpViews';
import { buildWhatsAppSchemeUrl, triggerWhatsAppDeepLink } from '../utils/whatsapp';
import { CustomerUser } from '../types';

export type LegalPolicyTab = 'privacy' | 'terms' | 'refund' | 'contact' | 'delete-account';

interface LegalPoliciesModalProps {
  isOpen: boolean;
  initialTab?: LegalPolicyTab;
  onClose: () => void;
  currentUser?: CustomerUser | null;
  onDeleteAccountData?: (phoneToDelete: string, reason?: string) => void;
}

export const LegalPoliciesModal: React.FC<LegalPoliciesModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
  currentUser,
  onDeleteAccountData
}) => {
  const [activeTab, setActiveTab] = useState<LegalPolicyTab>(initialTab);
  const [deletePhone, setDeletePhone] = useState(currentUser?.phone || '');
  const [deleteName, setDeleteName] = useState(currentUser?.name || '');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (currentUser?.phone && !deletePhone) {
      setDeletePhone(currentUser.phone);
    }
    if (currentUser?.name && !deleteName) {
      setDeleteName(currentUser.name);
    }
  }, [currentUser, deletePhone, deleteName]);

  if (!isOpen) return null;

  const tabs: Array<{
    id: LegalPolicyTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'privacy', label: 'Privacy Policy', shortLabel: 'Privacy', icon: ShieldCheck },
    { id: 'terms', label: 'Terms & Conditions', shortLabel: 'Terms', icon: FileText },
    { id: 'refund', label: 'Cancellation & Refund', shortLabel: 'Refunds', icon: RefreshCcw },
    { id: 'contact', label: 'Contact Us & Support', shortLabel: 'Contact', icon: Phone },
    { id: 'delete-account', label: 'Account & Data Deletion', shortLabel: 'Delete Data', icon: Trash2 }
  ];

  const handleAccountDeletionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = deletePhone.replace(/\D/g, '').slice(-10);
    if (cleanedPhone.length !== 10 || !deleteConfirmed) return;

    if (onDeleteAccountData) {
      onDeleteAccountData(cleanedPhone, deleteReason);
    }

    setDeleteSuccessMessage(
      `Account & personal data deletion request registered for +91 ${cleanedPhone}. Local session and saved device data have been purged immediately, and any server records will be permanently erased within 7 business days.`
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[1000005] flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-policies-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-2 sm:my-6 flex flex-col max-h-[92vh]">
        {/* Sticky Top Header */}
        <div className="bg-[#0B0F19] text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                SafarIndiaCabs · Official Legal &amp; Play Store Compliance
              </div>
              <h2 id="legal-policies-modal-title" className="text-base sm:text-lg font-black truncate">
                Legal Policies, Data Safety &amp; Customer Support
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal policies modal"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((t) => {
            const IconComp = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-2xs'
                    : 'bg-white hover:bg-slate-200/80 text-slate-700 border border-slate-200/80'
                }`}
              >
                <IconComp className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-7 overflow-y-auto space-y-6 text-slate-700 text-xs sm:text-sm leading-relaxed flex-1">
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <article className="space-y-5">
              <div className="border-b border-slate-200 pb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold mb-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Google Play Data Safety &amp; DPDP Act 2023 Compliant</span>
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Privacy Policy — SafarIndiaCabs
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Effective Date: January 1, 2025 | Last Updated: October 25, 2026 | Domain:{' '}
                  <a href="https://safarindiacabs.com" className="text-amber-700 font-bold underline">
                    https://safarindiacabs.com
                  </a>
                </p>
              </div>

              <p>
                Welcome to <strong>SafarIndiaCabs</strong> (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). We operate the website{' '}
                <strong>https://safarindiacabs.com</strong> and the <strong>SafarIndiaCabs mobile application</strong>. We are committed to protecting the privacy, security, and personal data of our passengers, customers, and driver-partners in compliance with the Information Technology Act, 2000, the Digital Personal Data Protection (DPDP) Act, 2023 (India), and Google Play Store User Data policies.
              </p>

              {/* Prominent Location Permission Disclosure Box */}
              <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-950 font-black text-sm">
                  <Navigation className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Prominent Disclosure: Foreground &amp; Background Location Data</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed">
                  <strong>SafarIndiaCabs collects precise and approximate GPS location data:</strong>
                  <br />• <strong>For Passengers (Users):</strong> Location data is collected in the <strong>foreground</strong> when the app is open to automatically detect your pickup point, calculate accurate intercity road distance/fares, and display nearby available cabs.
                  <br />• <strong>For Driver-Partners &amp; Active Trips:</strong> Location data may be collected in the <strong>foreground and background</strong> strictly during active, assigned rides to enable real-time trip tracking, live route navigation, accurate pickup coordination, and emergency passenger safety monitoring. Location tracking stops immediately once a trip is marked completed or cancelled.
                </p>
              </div>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">1. Information We Collect</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Personal Identification Details:</strong> Full Name, Mobile Phone Number (verified via OTP), and Email Address (optional, for GST tax invoices and booking vouchers) provided when creating an account or booking a cab.
                  </li>
                  <li>
                    <strong>Precise &amp; Approximate Location Data (GPS):</strong> Pickup address, drop-off destination, intermediate stops, and GPS coordinates collected via device location sensors or map autocomplete strictly for cab booking, distance computation, and trip tracking.
                  </li>
                  <li>
                    <strong>Payment &amp; Transaction Information:</strong> When you pay the 20% booking advance or full fare online, payments are processed securely through RBI-authorized PCI-DSS compliant payment gateways (<strong>Razorpay / UPI Intent</strong> such as Google Pay, PhonePe, Paytm, or Cards). We store only transaction reference IDs and payment status; we <strong>never</strong> store your credit/debit card numbers, CVV, or UPI PIN on our servers.
                  </li>
                  <li>
                    <strong>Device &amp; Technical Information:</strong> Device model, operating system version, browser user-agent, IP address, crash logs, and network status to ensure seamless app performance, prevent fraud, and support UPI intent checkout on Android/iOS devices.
                  </li>
                  <li>
                    <strong>Driver-Partner KYC Data (For Chauffeurs/Vendors Only):</strong> Driving License, Commercial Vehicle Registration Certificate (RC), All India Tourist Permit (AITP), Insurance, and vehicle photographs for safety verification.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">2. How We Use Your Data</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Completing Cab Bookings &amp; Ride Dispatch:</strong> To register your outstation one-way, round-trip, local hourly rental, or airport transfer booking and share your pickup schedule with your assigned commercial chauffeur.
                  </li>
                  <li>
                    <strong>Driver Assignment &amp; Live Coordination:</strong> To allot a verified AC Hatchback, Sedan, SUV (Ertiga/Marazzo), or Innova Crysta along with driver contact and vehicle registration details via WhatsApp, SMS, and in-app vouchers.
                  </li>
                  <li>
                    <strong>Customer Support &amp; Safety:</strong> To provide 24×7 dispatch helpline assistance, resolve route or billing queries, generate GST tax invoices, and ensure passenger and driver safety during intercity travel.
                  </li>
                  <li>
                    <strong>Transactional Communications:</strong> To send booking confirmations, driver allotment alerts, payment receipts, and post-trip feedback requests. We do not sell or rent your phone number to third-party telemarketers.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">3. Data Sharing &amp; Third-Party Services</h2>
                <p>
                  We do <strong>not</strong> sell, trade, or rent your personal data to any marketing third parties. Data is shared strictly on a need-to-know basis with:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Assigned Chauffeur / Fleet Partner:</strong> Only your Name, Mobile Number, Pickup/Drop location, and balance collectable amount are shared with the verified driver assigned to fulfill your ride.
                  </li>
                  <li>
                    <strong>Payment Processors &amp; Map Providers:</strong> Razorpay (for secure payment processing) and Ola Maps / OpenStreetMap APIs (for road distance and geocoding).
                  </li>
                  <li>
                    <strong>Legal &amp; Law Enforcement Authorities:</strong> Only when required by applicable Indian law, court order, or government transport regulation.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">4. Data Protection Standards &amp; Security</h2>
                <p>
                  All data transmitted between the SafarIndiaCabs app/website and our servers is encrypted in transit using <strong>HTTPS / TLS 1.2+ SSL encryption</strong>. Access to booking records is restricted to authorized dispatch personnel via PIN-protected administrative controls.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">5. User Rights &amp; How to Request Account / Data Deletion</h2>
                <p>
                  You have the right to access, correct, or request complete deletion of your personal data and booking profile at any time:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>In-App Instant Deletion:</strong> Open the <strong>&ldquo;Account &amp; Data Deletion&rdquo;</strong> tab in this Legal Center (or go to <code>https://safarindiacabs.com/delete-account.html</code>) to immediately erase your saved account data and submit a permanent server deletion request.
                  </li>
                  <li>
                    <strong>Via Email or Helpline:</strong> Email us at{' '}
                    <a href="mailto:safarindiacabs01@gmail.com" className="text-amber-700 font-bold underline">
                      safarindiacabs01@gmail.com
                    </a>{' '}
                    or WhatsApp/Call <strong>+91-7710080992</strong> with the subject <em>&ldquo;Account &amp; Data Deletion Request&rdquo;</em>. All personal records are permanently deleted within <strong>7 business days</strong> (except statutory tax invoices required to be retained under Indian GST laws).
                  </li>
                </ul>
              </section>
            </article>
          )}

          {/* TAB 2: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <article className="space-y-5">
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Terms &amp; Conditions — SafarIndiaCabs
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Effective Date: January 1, 2025 | Governing Law: Laws of India (Courts of New Delhi)
                </p>
              </div>

              <p>
                These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the website{' '}
                <strong>https://safarindiacabs.com</strong> and the <strong>SafarIndiaCabs</strong> mobile application operated by SafarIndiaCabs, having its registered office at{' '}
                <strong>H NO 143 STREET NO 4 JHARODA MAJRA NORTH DELHI BURARI 110084</strong>. By booking a cab or using our platform, you agree to be bound by these Terms.
              </p>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">1. Role as a Cab Booking Aggregator</h2>
                <p>
                  SafarIndiaCabs acts as an online cab booking aggregator and dispatch facilitator connecting passengers with independent, commercially licensed taxi operators and verified chauffeurs holding valid All India Tourist Permits (AITP).
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">2. Booking Rules, Fare Estimation &amp; Kilometre Calculation</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>One-Way Intercity Trips:</strong> Fares are calculated strictly for the one-way road distance (subject to a minimum billing of 130 KM). Passengers pay <strong>zero return fare</strong> and zero return driver charges. One-way bookings include 1 pickup point in the origin city and 1 drop point in the destination city.
                  </li>
                  <li>
                    <strong>Outstation Round Trips (Multi-City):</strong> Billed at a minimum package of <strong>250 KM per calendar day</strong> (calculated from 12:00 AM to 11:59 PM). If total kilometres driven exceed the package limit (250 KM × number of days), additional kilometres are billed at the applicable per-KM rate for the chosen vehicle category.
                  </li>
                  <li>
                    <strong>Local Hourly Rentals:</strong> Available in standard packages (4 Hrs / 40 KM, 8 Hrs / 80 KM, and 12 Hrs / 120 KM) within municipal city limits. Extra hours or extra kilometres beyond the package are billed as per the rate card.
                  </li>
                  <li>
                    <strong>Hill Area &amp; Peak/Surge Pricing:</strong> Journeys involving hilly terrains (Himachal Pradesh, Uttarakhand, Jammu &amp; Kashmir, North-East, Ghats) or high-demand festive/night slots include a standard hill/terrain adjustment factored transparently into your upfront fare estimate. In hill regions, vehicle AC may be turned off on steep inclines to prevent engine overheating.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">3. Waiting Charges, Driver Allowance, Tolls &amp; State Taxes</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Waiting &amp; Detour Charges:</strong> For One-Way and Airport trips, up to <strong>30 minutes</strong> of waiting at pickup is complimentary. Beyond 30 minutes, waiting charges of <strong>₹150 per hour</strong> (or ₹2.5/min) apply. Any unscheduled detours or extra city pickups/drops will be billed as per actual extra kilometres.
                  </li>
                  <li>
                    <strong>Tolls, State Border Tax &amp; Parking:</strong> Unless you explicitly select the <em>&ldquo;Include Tolls &amp; State Tax&rdquo;</em> option during booking, highway FASTag tolls, state border entry taxes, airport/hotel parking fees, and green taxes (e.g., Manali/Shimla/Mussoorie entry) are payable directly by the passenger as per actual official receipts.
                  </li>
                  <li>
                    <strong>Driver Allowance &amp; Night Driving Charge:</strong> For One-Way trips, driver allowance is already included. For Round Trips, standard driver allowance (₹300/day for Hatchback/Sedan/SUV; ₹400/day for Innova Crysta) and night driving allowance (₹300/night for driving between 10:00 PM and 06:00 AM) apply as displayed in the fare breakup.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">4. Payment Methods (20% Advance &amp; Balance to Driver)</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    To confirm a cab booking and lock vehicle inventory, passengers may pay a <strong>20% Advance Deposit</strong> (or 100% Full Pre-Payment) online via Razorpay (UPI, GPay, PhonePe, Paytm, Debit/Credit Cards, or NetBanking).
                  </li>
                  <li>
                    The remaining <strong>80% Balance Payable</strong> amount is paid directly to the assigned chauffeur via Cash or UPI during the trip or upon reaching the destination.
                  </li>
                  <li>
                    Promotional discount codes (such as <code>FIRST300</code>) apply to eligible bookings and are deducted transparently in the fare summary prior to payment.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">5. Passenger &amp; Driver Code of Conduct</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Strict Non-Smoking &amp; Zero-Alcohol Policy:</strong> Smoking, consumption of alcohol, or possession of illegal/prohibited substances inside the cab is strictly forbidden for both passengers and drivers. Chauffeurs reserve the right to refuse or terminate a ride if passengers are intoxicated or abusive.
                  </li>
                  <li>
                    <strong>Seating &amp; Luggage Capacity:</strong> Maximum passenger seating is strictly governed by the vehicle RTO permit (4 passengers for Hatchback/Sedan, 6 for Ertiga SUV, 6–7 for Innova Crysta). Rooftop luggage carriers are provided only on request where permitted by state traffic rules.
                  </li>
                  <li>
                    <strong>Chauffeur Discipline:</strong> Our driver-partners are instructed to arrive clean, maintain courteous behavior, follow speed limits, and never demand extra money beyond the official booking voucher and actual toll/parking receipts.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">6. Limitation of Liability</h2>
                <p>
                  While SafarIndiaCabs takes every reasonable measure to ensure timely dispatch and vehicle roadworthiness, we shall not be liable for delays, missed flights/trains, or consequential losses caused by force majeure events including severe traffic congestion, highway blockades, extreme weather, landslides, political rallies, or mechanical breakdowns beyond human control. In the rare event of a vehicle breakdown, our 24×7 dispatch desk will arrange an alternate cab or process a proportionate refund. Our maximum aggregate liability for any claim shall not exceed the total advance amount paid by the customer for the specific booking.
                </p>
              </section>
            </article>
          )}

          {/* TAB 3: CANCELLATION & REFUND POLICY */}
          {activeTab === 'refund' && (
            <article className="space-y-5">
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Cancellation &amp; Refund Policy — SafarIndiaCabs
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Transparent, Customer-First Cancellation &amp; Automated Refund Rules
                </p>
              </div>

              <p>
                At <strong>SafarIndiaCabs</strong>, we understand that travel plans can change unexpectedly. Our Cancellation and Refund Policy is designed to be fair to both passengers and chauffeurs who reserve their schedule and fuel to reach your pickup location.
              </p>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">1. Cancellation By Customer (Before &amp; After Driver Dispatch)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-1">
                    <div className="text-xs font-black text-emerald-900 uppercase">
                      6+ Hours Before Pickup
                    </div>
                    <div className="text-lg font-black text-emerald-700">100% Free Cancel</div>
                    <p className="text-xs text-slate-600">
                      Zero cancellation fee if cancelled at least <strong>6 hours prior</strong> to the scheduled pickup time. 100% of your 20% advance deposit is refunded.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-1">
                    <div className="text-xs font-black text-amber-900 uppercase">
                      Within 6 Hours / Driver Allotted
                    </div>
                    <div className="text-lg font-black text-amber-700">50% Advance Retained</div>
                    <p className="text-xs text-slate-600">
                      If cancelled between 2 to 6 hours before pickup (before driver arrives at gate), 50% of the advance deposit is retained as allocation fee; 50% is refunded or 100% credited toward a rescheduled trip.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-1">
                    <div className="text-xs font-black text-rose-900 uppercase">
                      After Driver Dispatch / No-Show
                    </div>
                    <div className="text-lg font-black text-rose-700">Advance Non-Refundable</div>
                    <p className="text-xs text-slate-600">
                      If cancelled within 2 hours of pickup, after the driver has already dispatched/reached the pickup point, or in case of passenger no-show, the 20% advance deposit is non-refundable to compensate the driver&rsquo;s fuel and time.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">2. Free Trip Rescheduling / Date Modification</h2>
                <p>
                  Passengers may modify their pickup time or travel date <strong>free of charge</strong> up to <strong>4 hours before</strong> the scheduled pickup time by contacting our 24×7 WhatsApp/Call Desk at <strong>+91-7710080992</strong>. Your entire advance deposit is automatically transferred to the rescheduled booking.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">3. Cancellation By Driver / Failed Dispatch Guarantee</h2>
                <p>
                  In the rare event that SafarIndiaCabs or the assigned driver cancels a confirmed booking due to vehicle breakdown, medical emergency, or unavailability, and we are unable to provide an equivalent or upgraded replacement cab within a reasonable window, the customer is entitled to a <strong>100% full refund</strong> of the advance amount paid, with zero deductions.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">4. Failed / Duplicate Online Payments</h2>
                <p>
                  If your bank account or UPI app is debited during checkout on Razorpay, but a booking voucher is not generated due to network drop or timeout, or if a duplicate payment occurs, the excess/failed amount is automatically reconciled and refunded in full (100%).
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-black text-slate-950">5. Refund Processing Timelines</h2>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Initiation:</strong> Approved refunds are initiated by our billing desk within <strong>24 to 48 hours</strong> of cancellation confirmation.
                  </li>
                  <li>
                    <strong>Credit to Original Payment Method:</strong> All refunds are credited strictly back to the <strong>original source of payment</strong> (the same UPI ID, Bank Account, Debit Card, or Credit Card used via Razorpay) within <strong>5 to 7 business days</strong> as per standard RBI and banking settlement timelines.
                  </li>
                  <li>
                    <strong>How to Request a Refund:</strong> You can cancel directly under the <strong>&ldquo;My Rides&rdquo;</strong> section in the app, or send your Booking ID (e.g., <code>SIC-89751</code>) on WhatsApp to <strong>+91-7710080992</strong> or email{' '}
                    <a href="mailto:safarindiacabs01@gmail.com" className="text-amber-700 font-bold underline">
                      safarindiacabs01@gmail.com
                    </a>
                    .
                  </li>
                </ul>
              </section>
            </article>
          )}

          {/* TAB 4: CONTACT US & SUPPORT */}
          {activeTab === 'contact' && (
            <article className="space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Contact Us &amp; Official Support — SafarIndiaCabs
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  24×7 Customer Care, Dispatch Helpline, Grievance Redressal &amp; Registered Office Details
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Phone */}
                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                    Customer Support Phone (24×7)
                  </div>
                  <a
                    href="tel:+917710080992"
                    className="block text-base sm:text-lg font-black text-slate-950 font-mono hover:text-amber-700"
                  >
                    +91-7710080992
                  </a>
                  <p className="text-xs text-slate-500">
                    Available 24 Hours, 7 Days a Week for bookings, live driver tracking &amp; emergency support.
                  </p>
                </div>

                {/* Email */}
                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                    Official Email &amp; Grievance Desk
                  </div>
                  <a
                    href="mailto:safarindiacabs01@gmail.com"
                    className="block text-sm sm:text-base font-black text-slate-950 break-all hover:text-blue-700"
                  >
                    safarindiacabs01@gmail.com
                  </a>
                  <p className="text-xs text-slate-500">
                    For GST invoices, corporate inquiries, refund status, and privacy/data requests.
                  </p>
                </div>

                {/* Address */}
                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                    Official Registered Address
                  </div>
                  <address className="not-italic text-xs sm:text-sm font-black text-slate-950 leading-snug">
                    H NO 143 STREET NO 4 JHARODA MAJRA NORTH DELHI BURARI 110084
                  </address>
                  <p className="text-xs text-slate-500">
                    New Delhi, Delhi – 110084, India
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-3">
                <h2 className="text-base font-black text-amber-400">
                  Grievance Officer &amp; Play Store Developer Compliance Contact
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  In accordance with the Information Technology Act, 2000 and Consumer Protection (E-Commerce) Rules, 2020, the contact details of our Grievance &amp; Compliance Desk are provided below:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-800/90 p-4 rounded-xl border border-slate-700">
                  <div>
                    <span className="text-slate-400 block">Legal Entity / Brand Name:</span>
                    <strong className="text-white">SafarIndiaCabs (safarindiacabs.com)</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Official Support Email:</span>
                    <strong className="text-amber-400">safarindiacabs01@gmail.com</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">24×7 Helpline &amp; WhatsApp:</span>
                    <strong className="text-white font-mono">+91-7710080992</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Registered Office Address:</span>
                    <strong className="text-white">
                      H NO 143 STREET NO 4 JHARODA MAJRA NORTH DELHI BURARI 110084
                    </strong>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <a
                    href={buildWhatsAppSchemeUrl(
                      SAFAR_CONTACT_INFO.whatsappRaw,
                      'Hello SafarIndiaCabs Support, I need assistance regarding my cab booking.'
                    )}
                    onClick={(e) =>
                      triggerWhatsAppDeepLink(
                        e,
                        SAFAR_CONTACT_INFO.whatsappRaw,
                        'Hello SafarIndiaCabs Support, I need assistance regarding my cab booking.'
                      )
                    }
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    <span>Chat on WhatsApp (+91-7710080992)</span>
                  </a>
                  <a
                    href="mailto:safarindiacabs01@gmail.com"
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email safarindiacabs01@gmail.com</span>
                  </a>
                </div>
              </div>
            </article>
          )}

          {/* TAB 5: ACCOUNT & DATA DELETION (GOOGLE PLAY STORE REQUIREMENT) */}
          {activeTab === 'delete-account' && (
            <article className="space-y-5">
              <div className="border-b border-slate-200 pb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-extrabold mb-2">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Google Play Store User Data &amp; Account Deletion Portal</span>
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950">
                  Request Account &amp; Personal Data Deletion
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  In compliance with Google Play Store&rsquo;s Account Deletion Requirement, you can permanently delete your SafarIndiaCabs account and associated personal data below.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <h2 className="font-black text-slate-950 text-sm">What Data Is Deleted vs. Retained:</h2>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>
                    <strong>Permanently Deleted Immediately / Within 7 Days:</strong> Your customer profile (Name, Mobile Number, Email), saved session tokens, saved address preferences, and non-statutory trip history.
                  </li>
                  <li>
                    <strong>Statutory Retention (If Applicable):</strong> Completed GST tax invoices and payment transaction references required for tax/audit compliance under Indian law are retained in anonymized accounting records as mandated by statute.
                  </li>
                </ul>
              </div>

              {deleteSuccessMessage ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-base">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Account &amp; Data Deletion Processed</span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                    {deleteSuccessMessage}
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleAccountDeletionSubmit}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="delete-account-phone"
                      className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Registered 10-Digit Mobile Number *
                    </label>
                    <input
                      id="delete-account-phone"
                      type="tel"
                      required
                      maxLength={10}
                      value={deletePhone}
                      onChange={(e) => setDeletePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter your 10-digit mobile number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="delete-account-name"
                      className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Full Name (Optional)
                    </label>
                    <input
                      id="delete-account-name"
                      type="text"
                      value={deleteName}
                      onChange={(e) => setDeleteName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="delete-account-reason"
                      className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1"
                    >
                      Reason for Account Deletion (Optional)
                    </label>
                    <textarea
                      id="delete-account-reason"
                      rows={2}
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Let us know why you wish to delete your account & data..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                    <input
                      type="checkbox"
                      required
                      checked={deleteConfirmed}
                      onChange={(e) => setDeleteConfirmed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>
                      I confirm that I want to permanently delete my SafarIndiaCabs account and personal data associated with this phone number.
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete My Account &amp; Data Now</span>
                    </button>

                    <a
                      href={`mailto:safarindiacabs01@gmail.com?subject=${encodeURIComponent(
                        'Account & Data Deletion Request - SafarIndiaCabs'
                      )}&body=${encodeURIComponent(
                        `Please delete my SafarIndiaCabs account and personal data.\nRegistered Mobile: +91 ${deletePhone}\nName: ${deleteName}`
                      )}`}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Request via Email</span>
                    </a>
                  </div>
                </form>
              )}
            </article>
          )}
        </div>

        {/* Bottom Bar with Direct Crawlable Static Links for Play Console Reviewers */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700">Direct Web Links:</span>
            <a
              href="/privacy-policy.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-700 underline inline-flex items-center gap-0.5"
            >
              <span>Privacy Policy URL</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="/terms-and-conditions.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-700 underline inline-flex items-center gap-0.5"
            >
              <span>Terms URL</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="/refund-policy.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-700 underline inline-flex items-center gap-0.5"
            >
              <span>Refund Policy URL</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="/delete-account.html"
              target="_blank"
              rel="noreferrer"
              className="hover:text-rose-700 underline inline-flex items-center gap-0.5"
            >
              <span>Account Deletion URL</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
