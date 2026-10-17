import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'Are there any hidden charges or do I pay only one-way for One-Way trips?',
    answer: 'You pay strictly for the one-way trip distance. We do NOT charge any return kilometers or return driver charges for one-way bookings. The base rate, fuel, and driver allowance are completely covered in your quote.'
  },
  {
    question: 'How does the 20% advance payment work?',
    answer: 'To guarantee your cab dispatch, you pay a 20% advance booking deposit securely via Razorpay (UPI, GPay, PhonePe, Cards, NetBanking). The remaining 80% balance is payable directly to your chauffeur in cash or UPI at the completion of your journey.'
  },
  {
    question: 'What is the cancellation and refund policy?',
    answer: 'We offer zero cancellation fees if you cancel your booking up to 6 hours prior to your scheduled pickup time. In this case, 100% of your advance deposit is refunded back to your original payment method within 2-4 business days.'
  },
  {
    question: 'When will I receive driver and cab registration details?',
    answer: 'Your assigned chauffeur name, mobile number, and car registration number are dispatched directly via SMS and WhatsApp exactly 2 hours prior to your scheduled pickup time. The driver will also call you 30 minutes before arrival to confirm the exact doorstep landmark.'
  },
  {
    question: 'Can I claim GST input tax credit for corporate reimbursement?',
    answer: 'Yes! Simply check the "Add GST Details" box during booking and enter your company name and 15-digit GSTIN. An official GST tax invoice with SAC Code 9964 (Passenger Transport) will be generated and downloadable immediately.'
  },
  {
    question: 'Are tolls and state entry taxes included in the total quote?',
    answer: 'When you select "Include Highway Tolls & State Tax" in the booking form, your total fare incorporates all estimated FASTag tolls and interstate taxes for the route. Parking fees (if incurred at private airports or monuments) are payable against physical receipt.'
  }
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="space-y-5 py-6 border-t border-slate-200" id="faq-section">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <HelpCircle className="w-5 h-5 text-amber-500" />
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Frequently Asked Questions & Fare Rules
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent policies, booking procedures, and billing guidelines.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition"
            >
              <button
                type="button"
                onClick={() => toggleIndex(idx)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
              >
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-amber-600 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
