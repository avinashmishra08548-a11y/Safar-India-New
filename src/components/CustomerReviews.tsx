import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle,
  MessageSquarePlus,
  Send,
  X,
  Sparkles,
  User,
  MapPin,
  Car,
  Mail,
  Settings,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { CustomerUser } from '../types';

export interface Review {
  id: string;
  name: string;
  city: string;
  route: string;
  car: string;
  rating: number;
  date: string;
  review: string;
  isLatestUserReview?: boolean;
}

const STORAGE_KEY = 'safar_customer_reviews_v1';
const EMAIL_CONFIG_STORAGE_KEY = 'safar_review_email_config_v1';
const REVIEWS_EVENT = 'safar-reviews-updated';

export const REVIEW_ALERT_RECIPIENT_EMAIL = 'safarindiacabs01@gmail.com';

export interface ReviewEmailConfig {
  resendApiKey: string;
  emailJsServiceId: string;
  emailJsTemplateId: string;
  emailJsPublicKey: string;
}

export function loadReviewEmailConfig(): ReviewEmailConfig {
  try {
    const raw = localStorage.getItem(EMAIL_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        resendApiKey: parsed.resendApiKey || '',
        emailJsServiceId: parsed.emailJsServiceId || '',
        emailJsTemplateId: parsed.emailJsTemplateId || '',
        emailJsPublicKey: parsed.emailJsPublicKey || ''
      };
    }
  } catch {
    // ignore
  }
  return {
    resendApiKey: '',
    emailJsServiceId: '',
    emailJsTemplateId: '',
    emailJsPublicKey: ''
  };
}

export function saveReviewEmailConfig(cfg: ReviewEmailConfig): void {
  try {
    localStorage.setItem(EMAIL_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

const DEFAULT_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    name: 'Vikramjit Singh',
    city: 'New Delhi',
    route: 'Delhi NCR to Chandigarh',
    car: 'Sedan AC (Dzire / Etios)',
    rating: 5,
    date: 'October 2026',
    review:
      'Superb experience on the Delhi-Chandigarh expressway. The driver, Rajesh ji, arrived 15 minutes before scheduled time in a spotless clean Dzire. No haggling or sudden toll demands.'
  },
  {
    id: 'rev-2',
    name: 'Pooja Kulkarni',
    city: 'Pune',
    route: 'Mumbai Airport to Pune',
    car: 'Assured Innova Crysta',
    rating: 5,
    date: 'October 2026',
    review:
      'Booked an Innova Crysta for our family trip straight from Mumbai T2 terminal. Chauffeur helped with all 5 heavy suitcases and drove smoothly through the ghats. Highly recommended!'
  },
  {
    id: 'rev-3',
    name: 'Arun Iyer',
    city: 'Bengaluru',
    route: 'Bangalore to Mysore',
    car: 'Sedan AC (Dzire / Etios)',
    rating: 5,
    date: 'October 2026',
    review:
      'The 20% advance booking system is super convenient. Received instant GST invoice which I submitted for corporate reimbursement. Seamless 10-lane expressway trip.'
  },
  {
    id: 'rev-4',
    name: 'Rohit Verma',
    city: 'Lucknow',
    route: 'Lucknow to Ayodhya Dham',
    car: 'SUV AC (Ertiga / Carens)',
    rating: 5,
    date: 'October 2026',
    review:
      'Took our parents for Ram Mandir Darshan in an AC Ertiga. Very polite driver, clean seat covers, and transparent fixed fare. Best intercity cab service.'
  }
];

const CAB_OPTIONS = [
  'Sedan AC (Dzire / Etios)',
  'Hatchback AC',
  'Prime Executive Sedan',
  'SUV AC (Ertiga / Carens)',
  'Assured Innova Crysta',
  'Tempo Traveller AC (12 Seater)'
];

export function loadStoredReviews(): Review[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_REVIEWS;
}

export function saveNewReview(newRev: Review): Review[] {
  const existing = loadStoredReviews();
  const updated = [newRev, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(REVIEWS_EVENT));
  } catch {
    // ignore storage errors
  }
  return updated;
}

export interface EmailDispatchResult {
  delivered: boolean;
  provider?: string;
  needsActivation?: boolean;
  activationMessage?: string;
  whatsappAlertSent?: boolean;
}

export async function dispatchReviewEmailAlert(rev: Review): Promise<EmailDispatchResult> {
  const submittedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const savedCfg = loadReviewEmailConfig();
  const emailJsServiceId = (
    savedCfg.emailJsServiceId ||
    import.meta.env.VITE_EMAILJS_SERVICE_ID ||
    ''
  ).trim();
  const emailJsTemplateId = (
    savedCfg.emailJsTemplateId ||
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID ||
    ''
  ).trim();
  const emailJsPublicKey = (
    savedCfg.emailJsPublicKey ||
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY ||
    ''
  ).trim();
  const resendApiKey = (savedCfg.resendApiKey || '').trim();

  const emailSubject = `★ New ${rev.rating}-Star Review from ${rev.name} (${rev.city}) - Safar India Cabs`;
  let clientDelivered = false;
  let clientProvider = '';
  let needsActivation = false;
  let activationMessage = '';

  // 1. Direct Client-side EmailJS API call if EmailJS keys are configured
  if (
    emailJsServiceId &&
    emailJsTemplateId &&
    emailJsPublicKey &&
    emailJsServiceId !== 'your_emailjs_service_id'
  ) {
    try {
      const ejsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: emailJsServiceId,
          template_id: emailJsTemplateId,
          user_id: emailJsPublicKey,
          template_params: {
            to_email: REVIEW_ALERT_RECIPIENT_EMAIL,
            customer_name: rev.name,
            from_name: rev.name,
            city: rev.city,
            route: rev.route,
            car: rev.car,
            star_rating: `${rev.rating} / 5 Stars`,
            rating: String(rev.rating),
            review_message: rev.review,
            message: rev.review,
            submitted_at: submittedAt,
            subject: emailSubject
          }
        })
      });
      if (ejsRes.ok) {
        clientDelivered = true;
        clientProvider = 'emailjs';
      }
    } catch {
      // Fall through to browser FormSubmit & backend Resend API
    }
  }

  // 2. Direct Browser-Side FormSubmit AJAX Call (includes genuine Browser Origin & Referer headers)
  if (!clientDelivered && !resendApiKey) {
    try {
      const formData = new FormData();
      formData.append('_subject', emailSubject);
      formData.append('_template', 'table');
      formData.append('_captcha', 'false');
      formData.append('Customer_Name', rev.name);
      formData.append('City', rev.city);
      formData.append('Trip_Route', rev.route);
      formData.append('Cab_Category', rev.car);
      formData.append('Star_Rating', `${rev.rating} / 5 Stars`);
      formData.append('Review_Message', rev.review);
      formData.append('Submitted_At', submittedAt);

      const fsRes = await fetch(`https://formsubmit.co/ajax/${REVIEW_ALERT_RECIPIENT_EMAIL}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: formData
      });
      const fsData = await fsRes.json().catch(() => null);
      const isFsSuccess =
        fsRes.ok &&
        (fsData?.success === true || String(fsData?.success).toLowerCase() === 'true');
      const msg = String(fsData?.message || '');

      if (isFsSuccess) {
        clientDelivered = true;
        clientProvider = 'formsubmit_browser';
      } else if (
        msg.toLowerCase().includes('activate') ||
        msg.toLowerCase().includes('activation') ||
        msg.toLowerCase().includes('confirm')
      ) {
        needsActivation = true;
        activationMessage = msg;
      }
    } catch {
      // Fall through to backend
    }
  }

  // 3. Serverless Backend API (/api/send-review-email -> Resend API / EmailJS / Admin WhatsApp Alert)
  try {
    const apiRes = await fetch('/api/send-review-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: REVIEW_ALERT_RECIPIENT_EMAIL,
        customerName: rev.name,
        city: rev.city,
        route: rev.route,
        car: rev.car,
        rating: rev.rating,
        reviewMessage: rev.review,
        date: submittedAt,
        resendApiKey: resendApiKey || undefined,
        emailJsServiceId: emailJsServiceId || undefined,
        emailJsTemplateId: emailJsTemplateId || undefined,
        emailJsPublicKey: emailJsPublicKey || undefined
      })
    });
    const apiData = await apiRes.json().catch(() => null);
    if (apiData?.success && apiData?.provider) {
      return {
        delivered: true,
        provider: apiData.provider,
        whatsappAlertSent: apiData.whatsappAlertSent
      };
    }
    if (apiData?.needsFormSubmitActivation) {
      needsActivation = true;
      activationMessage = apiData.activationMessage || activationMessage;
    }
    return {
      delivered: clientDelivered,
      provider: clientProvider || undefined,
      needsActivation,
      activationMessage,
      whatsappAlertSent: Boolean(apiData?.whatsappAlertSent)
    };
  } catch {
    return {
      delivered: clientDelivered,
      provider: clientProvider || undefined,
      needsActivation,
      activationMessage
    };
  }
}

export function buildDirectMailtoReviewUrl(rev: Review): string {
  const subject = encodeURIComponent(
    `★ New ${rev.rating}-Star Review from ${rev.name} (${rev.city}) - Safar India Cabs`
  );
  const body = encodeURIComponent(
    [
      `Safar India Cabs - Customer Review Alert`,
      `----------------------------------------`,
      `Customer Name: ${rev.name}`,
      `City: ${rev.city}`,
      `Trip Route: ${rev.route}`,
      `Cab Travelled In: ${rev.car}`,
      `Star Rating: ${rev.rating} / 5 Stars`,
      ``,
      `Review Message:`,
      `"${rev.review}"`
    ].join('\n')
  );
  return `mailto:${REVIEW_ALERT_RECIPIENT_EMAIL}?subject=${subject}&body=${body}`;
}

interface ReviewFormProps {
  currentUser?: CustomerUser | null;
  onReviewSubmitted?: (rev: Review) => void;
  compact?: boolean;
}

export const WriteReviewForm: React.FC<ReviewFormProps> = ({
  currentUser,
  onReviewSubmitted,
  compact = false
}) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [city, setCity] = useState('');
  const [route, setRoute] = useState('');
  const [car, setCar] = useState(CAB_OPTIONS[0]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activationNotice, setActivationNotice] = useState('');
  const [lastSubmittedReview, setLastSubmittedReview] = useState<Review | null>(null);

  // Optional EmailJS / Resend Settings panel for Owner
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [emailConfig, setEmailConfig] = useState<ReviewEmailConfig>(() => loadReviewEmailConfig());
  const [configSavedNotice, setConfigSavedNotice] = useState('');

  useEffect(() => {
    if (currentUser?.name && !name) {
      setName(currentUser.name);
    }
  }, [currentUser, name]);

  const ratingLabels: Record<number, string> = {
    1: '1/5 · Poor',
    2: '2/5 · Fair',
    3: '3/5 · Good',
    4: '4/5 · Very Good',
    5: '5/5 · Excellent Service!'
  };

  const handleSaveEmailConfig = () => {
    saveReviewEmailConfig(emailConfig);
    setConfigSavedNotice('Email API settings saved! Future reviews will use these credentials.');
    setTimeout(() => setConfigSavedNotice(''), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setActivationNotice('');

    const cleanName = name.trim();
    const cleanReview = reviewText.trim();
    if (!cleanName) {
      setErrorMsg('Kripya apna naam darj karein (Please enter your name).');
      return;
    }
    if (cleanReview.length < 8) {
      setErrorMsg('Kripya apna experience likhein (Please write a short review of at least 8 characters).');
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const newReview: Review = {
      id: 'rev-' + Date.now(),
      name: cleanName,
      city: city.trim() || 'India',
      route: route.trim() || 'Outstation / Local Trip',
      car,
      rating,
      date: `Latest · ${formattedDate}`,
      review: cleanReview,
      isLatestUserReview: true
    };

    setIsSubmitting(true);
    saveNewReview(newReview);
    setLastSubmittedReview(newReview);
    setReviewText('');
    setRoute('');

    if (onReviewSubmitted) {
      onReviewSubmitted(newReview);
    }

    const emailResult = await dispatchReviewEmailAlert(newReview);
    setIsSubmitting(false);

    if (emailResult.delivered) {
      setSuccessMsg(
        `Dhanyawad! Aapka review live ho gaya hai aur ${REVIEW_ALERT_RECIPIENT_EMAIL} par email alert bhej diya gaya hai.`
      );
    } else if (emailResult.needsActivation) {
      setSuccessMsg('Dhanyawad! Aapka review Latest Reviews me sabse upar add ho gaya hai.');
      setActivationNotice(
        `Important (One-Time Gmail Activation): FormSubmit ne ${REVIEW_ALERT_RECIPIENT_EMAIL} ke Inbox / Spam folder me ek "Activate Form" email bheja hai. Kripya apna Gmail khol kar ek baar "Activate Form" button dabayein, ya Resend / EmailJS API key set karein.`
      );
    } else {
      setSuccessMsg(
        `Dhanyawad! Aapka review Latest Reviews me sabse upar add ho gaya hai${
          emailResult.whatsappAlertSent ? ' aur Admin WhatsApp par alert bhej diya gaya hai.' : '.'
        }`
      );
    }
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmit}
        className={`bg-white border border-amber-200/90 rounded-2xl ${
          compact ? 'p-4' : 'p-5 sm:p-6'
        } shadow-xs space-y-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4 text-amber-600" />
              <span>Write a Customer Review (Apna Review Dein)</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Share your experience · Auto-notifies{' '}
              <span className="font-semibold text-slate-700">{REVIEW_ALERT_RECIPIENT_EMAIL}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Interactive Star Selector */}
            <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200 px-3 py-1.5 rounded-xl">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const active = (hoverRating || rating) >= starVal;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`Rate ${starVal} stars`}
                      className="p-0.5 transition transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] font-extrabold text-amber-900 ml-1">
                {ratingLabels[hoverRating || rating]}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowEmailSettings((prev) => !prev)}
              title="Configure EmailJS / Resend API Key for safarindiacabs01@gmail.com"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible EmailJS / Resend Configuration Box */}
        {showEmailSettings && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-amber-600" />
                <span>Email Notification Setup ({REVIEW_ALERT_RECIPIENT_EMAIL})</span>
              </div>
              <span className="text-[10px] text-slate-500">Resend API or EmailJS</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Enter either your <strong>Resend API Key</strong> OR your{' '}
              <strong>EmailJS Service ID, Template ID &amp; Public Key</strong> below to send instant
              emails directly via your account:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  Resend API Key (Optional: re_...)
                </label>
                <input
                  type="password"
                  value={emailConfig.resendApiKey}
                  onChange={(e) =>
                    setEmailConfig((prev) => ({ ...prev, resendApiKey: e.target.value }))
                  }
                  placeholder="re_123456789..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  EmailJS Service ID (Optional)
                </label>
                <input
                  type="text"
                  value={emailConfig.emailJsServiceId}
                  onChange={(e) =>
                    setEmailConfig((prev) => ({ ...prev, emailJsServiceId: e.target.value }))
                  }
                  placeholder="service_xxxxxxx"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  EmailJS Template ID (Optional)
                </label>
                <input
                  type="text"
                  value={emailConfig.emailJsTemplateId}
                  onChange={(e) =>
                    setEmailConfig((prev) => ({ ...prev, emailJsTemplateId: e.target.value }))
                  }
                  placeholder="template_xxxxxxx"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  EmailJS Public Key (Optional)
                </label>
                <input
                  type="text"
                  value={emailConfig.emailJsPublicKey}
                  onChange={(e) =>
                    setEmailConfig((prev) => ({ ...prev, emailJsPublicKey: e.target.value }))
                  }
                  placeholder="Public Key"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {configSavedNotice ? (
                <span className="text-[11px] font-bold text-emerald-700">{configSavedNotice}</span>
              ) : (
                <span className="text-[10px] text-slate-500">
                  Without keys, FormSubmit free email relay &amp; WhatsApp Admin alert are used automatically.
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveEmailConfig}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition cursor-pointer"
              >
                Save Email Settings
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Your Name *
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Your City
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Delhi NCR / Mumbai"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Trip Route (From - To)
            </label>
            <input
              type="text"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
              placeholder="e.g. Delhi to Agra"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Cab Travelled In
            </label>
            <div className="relative">
              <Car className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={car}
                onChange={(e) => setCar(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer"
              >
                {CAB_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            Your Review / Experience *
          </label>
          <textarea
            rows={3}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Tell other travelers about cab cleanliness, driver behavior, on-time pickup, or fare transparency..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white resize-none"
          />
        </div>

        {errorMsg && (
          <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            {lastSubmittedReview && (
              <a
                href={buildDirectMailtoReviewUrl(lastSubmittedReview)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-[11px] font-extrabold shrink-0 transition"
              >
                <Mail className="w-3 h-3" />
                <span>Send Copy via Gmail App</span>
              </a>
            )}
          </div>
        )}

        {activationNotice && (
          <div className="text-xs bg-amber-50 border border-amber-300 text-amber-950 p-3 rounded-xl space-y-2">
            <div className="flex items-start gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{activationNotice}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-6">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] transition"
              >
                <span>Open Gmail ({REVIEW_ALERT_RECIPIENT_EMAIL})</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => setShowEmailSettings(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold text-[11px] transition cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Or Enter Resend / EmailJS Key</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Instant publish + Email Alert to {REVIEW_ALERT_RECIPIENT_EMAIL}</span>
          </span>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Posting & Sending Email...' : 'Post Review'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

interface CustomerReviewsProps {
  currentUser?: CustomerUser | null;
  onOpenReviewsModal?: () => void;
}

export const CustomerReviews: React.FC<CustomerReviewsProps> = ({
  currentUser,
  onOpenReviewsModal
}) => {
  const [reviews, setReviews] = useState<Review[]>(() => loadStoredReviews());
  const [showInlineForm, setShowInlineForm] = useState(false);

  useEffect(() => {
    const syncReviews = () => setReviews(loadStoredReviews());
    window.addEventListener(REVIEWS_EVENT, syncReviews);
    return () => window.removeEventListener(REVIEWS_EVENT, syncReviews);
  }, []);

  const averageRating = (
    reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / Math.max(1, reviews.length)
  ).toFixed(1);

  return (
    <section className="space-y-6 py-6 border-t border-slate-200" id="reviews-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
            <span>Verified Customer Reviews</span>
            <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-bold border border-amber-200 inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {averageRating} / 5.0 ({reviews.length} Reviews)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest feedback from outstation, local rental, and airport travelers across India.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowInlineForm((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>{showInlineForm ? 'Hide Review Form' : 'Write a Review'}</span>
          </button>

          {onOpenReviewsModal && (
            <button
              type="button"
              onClick={onOpenReviewsModal}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>View All Latest Reviews</span>
            </button>
          )}
        </div>
      </div>

      {showInlineForm && (
        <WriteReviewForm
          currentUser={currentUser}
          onReviewSubmitted={() => {
            setReviews(loadStoredReviews());
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reviews.slice(0, 6).map((rev) => (
          <div
            key={rev.id}
            className={`bg-white border rounded-2xl p-5 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all ${
              rev.isLatestUserReview
                ? 'border-amber-400 ring-1 ring-amber-400/30'
                : 'border-slate-200'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    rev.isLatestUserReview
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-slate-400 font-medium'
                  }`}
                >
                  {rev.date}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed italic">"{rev.review}"</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <span>{rev.name}</span>
                  <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-500">
                  {rev.city} · {rev.route}
                </div>
                <div className="text-[10px] text-amber-700 font-bold mt-0.5">{rev.car}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

interface CustomerReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: CustomerUser | null;
}

export const CustomerReviewsModal: React.FC<CustomerReviewsModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [reviews, setReviews] = useState<Review[]>(() => loadStoredReviews());

  useEffect(() => {
    if (isOpen) {
      setReviews(loadStoredReviews());
    }
  }, [isOpen]);

  useEffect(() => {
    const syncReviews = () => setReviews(loadStoredReviews());
    window.addEventListener(REVIEWS_EVENT, syncReviews);
    return () => window.removeEventListener(REVIEWS_EVENT, syncReviews);
  }, []);

  if (!isOpen) return null;

  const averageRating = (
    reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / Math.max(1, reviews.length)
  ).toFixed(1);

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[1000000] flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-[#F8FAFC] border border-slate-200 rounded-3xl max-w-4xl w-full p-4 sm:p-6 pb-24 sm:pb-6 space-y-6 shadow-2xl relative my-2 sm:my-6 max-h-[92vh] overflow-y-auto">
        {/* Sticky Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 sticky top-0 bg-[#F8FAFC]/95 backdrop-blur-md z-20 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs shrink-0">
              <Star className="w-5 h-5 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-950">
                  Customer Latest Reviews &amp; Feedback
                </h3>
                <span className="text-[11px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-extrabold border border-amber-300">
                  ★ {averageRating} / 5.0 ({reviews.length} Verified)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Read latest traveler experiences or submit your own review below
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close reviews modal"
            className="w-9 h-9 rounded-full bg-white hover:bg-rose-50 border border-slate-300 text-slate-700 hover:text-rose-600 font-bold flex items-center justify-center shadow-2xs transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Write a Review right inside the modal */}
        <WriteReviewForm
          currentUser={currentUser}
          compact
          onReviewSubmitted={() => {
            setReviews(loadStoredReviews());
          }}
        />

        {/* Section 2: Latest Customer Reviews List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Latest Customer Reviews ({reviews.length})</span>
            </h4>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Real Verified Travelers</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className={`bg-white border rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs ${
                  rev.isLatestUserReview
                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rev.isLatestUserReview
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {rev.date}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    "{rev.review}"
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <span>{rev.name}</span>
                      <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {rev.city} · {rev.route}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg">
                    {rev.car}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
