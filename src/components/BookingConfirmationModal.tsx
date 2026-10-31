import React, { useState } from 'react';
import {
  CheckCircle2,
  Printer,
  Share2,
  Car,
  MapPin,
  Calendar,
  X,
  Download,
  MessageSquare,
  User,
  Phone,
  Star
} from 'lucide-react';
import { BookingRecord } from '../types';
import { formatINR } from '../utils/fareCalculator';
import { triggerWhatsAppDeepLink, buildCustomerReviewWhatsAppUrl } from '../utils/whatsapp';
import { formatWhatsAppBookingConfirmationMessage } from '../utils/whatsappService';
import {
  renderOfficialRubberStampDataUrl,
  renderDefaultProprietorSignatureDataUrl,
  formatDigitalSignTimestamp
} from './OwnerBillGenerator';
import { OFFICIAL_SAFAR_LOGO_DATA_URL } from '../utils/officialSignatureData';

export const OFFICIAL_WHATSAPP_NUMBER = '917710080992';

export function buildFormattedReceiptWhatsAppMessage(booking: BookingRecord): string {
  return formatWhatsAppBookingConfirmationMessage({
    customerName: booking.customerName,
    bookingId: booking.id,
    pickup: booking.pickupCity,
    drop: booking.dropCity,
    travelDateTime: `${booking.pickupDate} at ${booking.pickupTime}`,
    cabCategory: booking.cabName,
    totalFare: booking.totalFare || 0,
    advancePaid: booking.advancePaid || 0,
    balancePayable: booking.balanceDue || 0
  });
}

/**
 * Generates and downloads a Clean Light-Theme Corporate GST Tax Invoice PDF for a BookingRecord using jsPDF
 * Includes Official SafarIndiaCabs Logo, "Digitally signed by SAFARINDIACABS..." block, Rubber Mohar & Aman Mishra Signature.
 */
export async function generateBookingInvoicePdf(booking: BookingRecord): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Clean Light Theme Corporate Border
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, 'F');

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.rect(margin - 2, 8, contentWidth + 4, 281);

  // Top Dual Accent Line (Navy & Gold)
  doc.setFillColor(15, 41, 88);
  doc.rect(margin - 2, 8, (contentWidth + 4) * 0.72, 2.2, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(margin - 2 + (contentWidth + 4) * 0.72, 8, (contentWidth + 4) * 0.28, 2.2, 'F');

  let y = 14;

  // 1. Official Logo on Left + Company Info in Center + Invoice Box on Right
  try {
    if (OFFICIAL_SAFAR_LOGO_DATA_URL) {
      doc.addImage(OFFICIAL_SAFAR_LOGO_DATA_URL, 'PNG', margin, y - 1, 27, 27);
    }
  } catch {
    // fallback if logo fails
  }

  const companyX = margin + 30;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SafarIndiaCabs', companyX, y + 5.5);

  doc.setTextColor(180, 83, 9);
  doc.setFontSize(7.5);
  doc.text('A1 CAB SERVICES  •  ALL INDIA COMMERCIAL TOUR & TRAVELS', companyX, y + 10);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.2);
  doc.text('GSTIN: 07DQHPA3025F1ZD   |   Proprietor: Aman Mishra', companyX, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.6);
  doc.text('Regd. Add: H NO 143 STREET 4 JHARODA MAJRA NORTH DELHI BURARI 110084', companyX, y + 19.5);
  doc.text('Email: Safarindiacabs01@gmail.com   |   Mob: +91 7710080992', companyX, y + 23.8);

  // Right Side Tax Invoice Box (Light Theme)
  const cleanIdSuffix = booking.id.replace(/^SIC-?/i, '');
  const invoiceNo = `INV-SIC${cleanIdSuffix}`;
  const invoiceDateStr = new Date(booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const badgeW = 54;
  const badgeX = pageWidth - margin - badgeW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(badgeX, y, badgeW, 25, 2, 2, 'FD');

  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('TAX INVOICE', badgeX + badgeW - 3, y + 5.5, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('ORIGINAL FOR RECIPIENT', badgeX + badgeW - 3, y + 9.2, { align: 'right' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Inv No: ${invoiceNo}`, badgeX + badgeW - 3, y + 14.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Date: ${invoiceDateStr}`, badgeX + badgeW - 3, y + 18.8, { align: 'right' });
  doc.text(`Booking ID: ${booking.id}`, badgeX + badgeW - 3, y + 22.8, { align: 'right' });

  y += 29;

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // 2. Booking Status & SAC Strip (Light Slate)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  const statusLabel =
    booking.status === 'completed'
      ? 'STATUS: COMPLETED & SETTLED'
      : booking.status === 'cancelled'
      ? 'STATUS: CANCELLED'
      : 'STATUS: CONFIRMED BOOKING';
  doc.text(statusLabel, margin + 3.5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('SAC Code: 996412 (Passenger Transport by Cab)', pageWidth - margin - 3.5, y + 6, {
    align: 'right'
  });

  y += 12.5;

  // 3. Two-Column Customer & Vehicle Summary (Light Theme)
  const colWidth = (contentWidth - 5) / 2;

  // Left Box: Billed To Customer
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, colWidth, 31, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin + 0.2, y + 0.2, colWidth - 0.4, 6.8, 'F');
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLED TO (CUSTOMER / CORPORATE DETAILS)', margin + 3.5, y + 4.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(booking.customerName || 'Valued Passenger', margin + 3.5, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(`Mobile: +91 ${booking.customerPhone}`, margin + 3.5, y + 18);
  if (booking.customerGst) {
    doc.text(
      `Company: ${booking.gstCompanyName || '-'} | GSTIN: ${booking.customerGst}`,
      margin + 3.5,
      y + 23.2
    );
  } else if (booking.customerEmail) {
    doc.text(`Email: ${booking.customerEmail}`, margin + 3.5, y + 23.2);
  } else {
    doc.text(`Payment Ref: ${booking.transactionId || 'Verified Online/Cash'}`, margin + 3.5, y + 23.2);
  }
  doc.text(`Place of Supply: North India / Delhi (07)`, margin + 3.5, y + 28.2);

  // Right Box: Vehicle & Schedule
  const rightX = margin + colWidth + 5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, y, colWidth, 31, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(rightX + 0.2, y + 0.2, colWidth - 0.4, 6.8, 'F');
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TRIP & VEHICLE PARTICULARS', rightX + 3.5, y + 4.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text((booking.cabName || 'Sedan AC').slice(0, 38), rightX + 3.5, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(`Travel Date: ${booking.pickupDate} at ${booking.pickupTime}`, rightX + 3.5, y + 18);
  doc.text(
    `Trip Type: ${booking.tripType.toUpperCase()}  |  Billed Dist: ${booking.distanceKm} KM`,
    rightX + 3.5,
    y + 23.2
  );
  doc.text(
    `Chauffeur: ${booking.driverName || 'Verified Safar Chauffeur'} (${booking.driverVehicleNo || 'Commercial Cab'})`,
    rightX + 3.5,
    y + 28.2
  );

  y += 35;

  // 4. Route & Location Details Box (Light Theme)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin + 0.2, y + 0.2, contentWidth - 0.4, 6.5, 'F');
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('JOURNEY PICKUP & DROP ITINERARY', margin + 3.5, y + 4.6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.2);
  doc.text('Pickup Location:', margin + 3.5, y + 12.5);
  doc.setFont('helvetica', 'normal');
  const fullPickup = `${booking.pickupAddress ? booking.pickupAddress + ', ' : ''}${booking.pickupCity}${
    booking.landmark ? ` (Near: ${booking.landmark})` : ''
  }`;
  doc.text(doc.splitTextToSize(fullPickup, contentWidth - 34)[0] || '', margin + 31, y + 12.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Drop Location:', margin + 3.5, y + 19.5);
  doc.setFont('helvetica', 'normal');
  const fullDrop = `${booking.dropAddress ? booking.dropAddress + ', ' : ''}${booking.dropCity}`;
  doc.text(doc.splitTextToSize(fullDrop, contentWidth - 34)[0] || '', margin + 31, y + 19.5);

  y += 28;

  // 5. Clean Light-Theme Tax Invoice Fare Table
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7.5, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('DESCRIPTION OF PASSENGER CAB SERVICES (SAC: 996412)', margin + 3.5, y + 5);
  doc.text('AMOUNT (INR)', pageWidth - margin - 3.5, y + 5, { align: 'right' });

  y += 7.5;

  const computedGst = booking.gstAmount || Math.round((booking.baseFare || booking.totalFare) * 0.05);
  const cgstAmt = Math.floor(computedGst / 2);
  const sgstAmt = computedGst - cgstAmt;

  const rows: Array<{ label: string; value: string; bold?: boolean; highlight?: 'gold' | 'green' }> = [
    {
      label: `Base Trip Fare & Fuel Charges (${booking.distanceKm} KM Included)`,
      value: `INR ${Number(booking.baseFare || booking.totalFare - computedGst).toLocaleString('en-IN')}.00`
    },
    ...(booking.driverAllowance
      ? [
          {
            label: 'Chauffeur / Driver Allowance (Bhatta)',
            value: `INR ${Number(booking.driverAllowance).toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    ...(booking.tollsAndTaxes
      ? [
          {
            label: 'Highway Toll, Parking & State Entry Permit Tax',
            value: `INR ${Number(booking.tollsAndTaxes).toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    {
      label: 'CGST @ 2.5% (SAC 996412 - Commercial Cab Service)',
      value: `INR ${Number(cgstAmt).toLocaleString('en-IN')}.00`
    },
    {
      label: 'SGST @ 2.5% (SAC 996412 - Commercial Cab Service)',
      value: `INR ${Number(sgstAmt).toLocaleString('en-IN')}.00`
    },
    {
      label: 'TOTAL INVOICE AMOUNT (Inclusive of GST)',
      value: `INR ${Number(booking.totalFare || 0).toLocaleString('en-IN')}.00`,
      bold: true
    },
    {
      label: booking.status === 'completed' ? 'Total Amount Paid (100% Settled)' : 'Advance Paid',
      value:
        booking.status === 'completed'
          ? `INR ${Number(booking.totalFare || 0).toLocaleString('en-IN')}.00 (PAID)`
          : `INR ${Number(booking.advancePaid || 0).toLocaleString('en-IN')}.00`,
      bold: true,
      highlight: 'green'
    },
    {
      label:
        booking.status === 'completed'
          ? 'Balance Due (Settled)'
          : 'Balance Payable to Chauffeur during Trip',
      value:
        booking.status === 'completed'
          ? 'INR 0.00 (NIL)'
          : `INR ${Number(booking.balanceDue || 0).toLocaleString('en-IN')}.00`,
      bold: true,
      highlight: 'gold'
    }
  ];

  for (const r of rows) {
    if (r.highlight === 'gold') {
      doc.setFillColor(254, 243, 199);
    } else if (r.highlight === 'green') {
      doc.setFillColor(236, 253, 245);
    } else if (r.bold) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 8.2, 'FD');

    if (r.highlight === 'gold') {
      doc.setTextColor(146, 64, 14);
    } else if (r.highlight === 'green') {
      doc.setTextColor(4, 120, 87);
    } else {
      doc.setTextColor(15, 23, 42);
    }

    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(r.bold ? 8.8 : 8.2);
    doc.text(r.label, margin + 3.5, y + 5.5);
    doc.text(r.value, pageWidth - margin - 3.5, y + 5.5, { align: 'right' });

    y += 8.2;
  }

  y += 6;

  // 6. Three-Column Footer: Terms | "Digitally signed by..." Block | Official Rubber Mohar & Aman Mishra Signature
  const footerH = 44;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, footerH, 2, 2, 'FD');

  // Left: Company & Reimbursement Note
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text('OFFICIAL CORPORATE REIMBURSEMENT TAX INVOICE', margin + 3.5, y + 6);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('• Valid GST Invoice for Corporate Travel Claim.', margin + 3.5, y + 11.5);
  doc.text('• GSTIN: 07DQHPA3025F1ZD  |  Prop: Aman Mishra', margin + 3.5, y + 16);
  doc.text('• Regd: H NO 143 ST 4 JHARODA MAJRA BURARI 110084', margin + 3.5, y + 20.5);
  doc.text('• Support: Safarindiacabs01@gmail.com | 7710080992', margin + 3.5, y + 25);

  // Center: "Digitally signed by..." Verification Block (matching user's reference screenshot)
  const digX = margin + 68;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(digX, y + 4, 58, 35, 1.5, 1.5, 'FD');

  const digitalTimestamp = formatDigitalSignTimestamp(booking.pickupDate);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('Digitally signed by', digX + 3, y + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('SAFARINDIACABS', digX + 3, y + 13.8);
  doc.text('(AMAN MISHRA)', digX + 3, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('GSTIN: 07DQHPA3025F1ZD', digX + 3, y + 22.5);
  doc.text(`Date: ${digitalTimestamp}`, digX + 3, y + 27);
  doc.text('Location: IN (New Delhi)', digX + 3, y + 31.5);

  // Right: Official Rubber Mohar + Handwritten Aman Mishra Signature
  const signCenterX = pageWidth - margin - 29;
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('For SafarIndiaCabs', signCenterX, y + 5.5, { align: 'center' });

  try {
    const stampUrl = renderOfficialRubberStampDataUrl('circular', 'SafarIndiaCabs', '07DQHPA3025F1ZD', 'Aman Mishra');
    if (stampUrl) {
      doc.addImage(stampUrl, 'PNG', pageWidth - margin - 55, y + 7, 26, 26);
    }
    const customSig = localStorage.getItem('safar_owner_custom_signature_v1');
    const sigUrl = customSig || renderDefaultProprietorSignatureDataUrl('Aman Mishra');
    if (sigUrl) {
      doc.addImage(sigUrl, 'PNG', pageWidth - margin - 38, y + 13, 33, 14);
    }
  } catch {
    // ignore image errors
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(pageWidth - margin - 54, y + 34.5, pageWidth - margin - 4, y + 34.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Prop. Aman Mishra (Signatory)', signCenterX, y + 38.5, { align: 'center' });

  doc.save(`SafarIndiaCabs_GST_Invoice_${booking.id}.pdf`);
}

interface BookingConfirmationModalProps {
  booking: BookingRecord | null;
  onClose: () => void;
  onViewMyRides: () => void;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  booking,
  onClose,
  onViewMyRides
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!booking) return null;

  const isCompleted = booking.status === 'completed';
  const digitalTimestamp = formatDigitalSignTimestamp(booking.pickupDate);

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    try {
      generateBookingInvoicePdf(booking);
    } finally {
      setTimeout(() => setIsDownloadingPdf(false), 600);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShareToOfficial = () => {
    const text = buildFormattedReceiptWhatsAppMessage(booking);
    triggerWhatsAppDeepLink(undefined, text, OFFICIAL_WHATSAPP_NUMBER);
  };

  const handleWhatsAppShareToCustomer = () => {
    if (!booking.customerPhone) return;
    const text = buildFormattedReceiptWhatsAppMessage(booking);
    triggerWhatsAppDeepLink(undefined, text, booking.customerPhone);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[1000000] flex items-start sm:items-center justify-center p-2.5 sm:p-5 overflow-y-auto animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="booking-modal-container bg-white border-2 border-slate-200 rounded-3xl w-full max-w-xl my-2 sm:my-auto overflow-hidden shadow-2xl relative pb-[110px] sm:pb-0 animate-in zoom-in-95">
        {/* Top Close (✕) Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close booking receipt"
          title="Close Receipt"
          className="no-print absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-700 border border-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer z-20"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Printable Receipt Card (Clean Light Corporate Theme) */}
        <div id="printable-voucher" className="bg-white text-slate-900">
          {/* Top Corporate Accent Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-[#0F2958] via-[#1E3A8A] to-amber-500" />

          {/* Clean White Corporate Header with Official Logo */}
          <div className="bg-white px-5 sm:px-6 pt-5 pb-4 border-b-2 border-slate-200 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
              {/* Official SafarIndiaCabs Logo & Company Details */}
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 shrink-0 overflow-hidden">
                  <img
                    src={OFFICIAL_SAFAR_LOGO_DATA_URL}
                    alt="SafarIndiaCabs Official Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="font-black tracking-tight text-xl text-[#0F2958] leading-none">
                    Safar<span className="text-amber-500">India</span>Cabs
                  </div>
                  <div className="text-[10px] tracking-[0.16em] font-extrabold text-amber-600 uppercase mt-1">
                    A1 Cab Services • Official GST Tax Invoice
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                    GSTIN: <span className="font-mono text-[#0F2958]">07DQHPA3025F1ZD</span> · Prop: Aman Mishra
                  </div>
                  <div className="text-[10.5px] text-slate-500">
                    Helpline: +91 7710080992 · Safarindiacabs01@gmail.com
                  </div>
                </div>
              </div>

              {/* Unique Booking ID Badge (Light Theme) */}
              <div className="bg-slate-50 border border-slate-200 text-slate-900 px-3.5 py-2 rounded-xl self-start sm:self-auto text-left sm:text-right shrink-0">
                <span className="text-[9px] font-extrabold uppercase tracking-wider block text-[#0F2958]">
                  TAX INVOICE / ID
                </span>
                <span className="text-sm sm:text-base font-black font-mono tracking-tight text-slate-950">
                  {booking.id}
                </span>
              </div>
            </div>

            {/* Confirmation Status Bar */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isCompleted
                    ? 'Booking Completed · Verified GST Tax Invoice'
                    : 'Booking Confirmed · Official GST Voucher'}
                </span>
              </span>
              <span className="text-[11px] text-slate-600 font-mono font-bold">
                Date:{' '}
                {new Date(booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Receipt Body */}
          <div className="p-5 sm:p-6 space-y-4 bg-white">
            {/* Customer & Vehicle Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#0F2958]" />
                  <span>Billed To Customer</span>
                </span>
                <div className="text-sm font-black text-slate-950">{booking.customerName}</div>
                <div className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>+91 {booking.customerPhone}</span>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Car className="w-3 h-3 text-[#0F2958]" />
                  <span>Vehicle Type &amp; Trip</span>
                </span>
                <div className="text-sm font-black text-[#0F2958]">{booking.cabName}</div>
                <div className="text-xs font-bold text-amber-700">
                  {booking.tripType.toUpperCase()} · {booking.distanceKm} KM (SAC: 996412)
                </div>
              </div>
            </div>

            {/* Pickup, Drop & Date/Time Details Card */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Pickup Location:</span>
                </span>
                <span className="font-bold text-slate-900 text-right">
                  {booking.pickupAddress
                    ? `${booking.pickupAddress}, ${booking.pickupCity}`
                    : booking.pickupCity}
                  {booking.landmark ? ` (Near: ${booking.landmark})` : ''}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Drop Location:</span>
                </span>
                <span className="font-bold text-slate-900 text-right">
                  {booking.dropAddress
                    ? `${booking.dropAddress}, ${booking.dropCity}`
                    : booking.dropCity}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0F2958] shrink-0" />
                  <span>Trip Date &amp; Time:</span>
                </span>
                <span className="font-black text-slate-950 font-mono">
                  {booking.pickupDate} at {booking.pickupTime}
                </span>
              </div>

              {/* Live Driver & Cab Assignment Card + Direct Driver Call Connection */}
              <div className="pt-2.5 border-t border-slate-200">
                {booking.driverName ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-emerald-950 bg-emerald-50/90 border border-emerald-200 p-3 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                        Live Chauffeur &amp; Cab Assigned ✓
                      </div>
                      <div className="text-xs font-black text-slate-950">
                        {booking.driverName}{' '}
                        {booking.driverVehicleModel ? `· ${booking.driverVehicleModel}` : ''}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-slate-700">
                        Cab No: {booking.driverVehicleNo || 'DL 1Z C 4474'} · Mob: +91 {booking.driverPhone}
                      </div>
                    </div>
                    {booking.driverPhone && (
                      <a
                        href={`tel:+91${booking.driverPhone.replace(/\D/g, '').slice(-10)}`}
                        className="no-print inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Driver</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/80 border border-amber-200 p-3 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                        Live Driver &amp; Cab Assignment Tracker
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        Verified Commercial Chauffeur &amp; Vehicle No. shared via WhatsApp/SMS prior to pickup
                      </div>
                    </div>
                    <a
                      href="tel:+917710080992"
                      className="no-print inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-[11px] transition shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Dispatch Desk</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Clean Light-Theme Fare Summary Box */}
            <div className="rounded-xl overflow-hidden border border-slate-300">
              <div className="bg-slate-100 text-[#0F2958] px-4 py-2 text-[11px] font-black uppercase tracking-wider flex items-center justify-between border-b border-slate-300">
                <span>Fare &amp; Tax Breakdown (Zero Hidden Charges)</span>
                <span>Amount (INR)</span>
              </div>

              <div className="p-4 bg-white space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Base Fare ({booking.distanceKm} KM Included):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatINR(
                      booking.baseFare ||
                        Math.max(
                          0,
                          booking.totalFare -
                            (booking.gstAmount || 0) -
                            (booking.tollsAndTaxes || 0) -
                            (booking.driverAllowance || 0)
                        )
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>Driver Allowance (DA / Chauffeur Bata):</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {booking.driverAllowance ? `${formatINR(booking.driverAllowance)} (Included)` : 'Included ✓'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>State Toll &amp; Permit Tax:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {booking.tollsAndTaxes ? formatINR(booking.tollsAndTaxes) : 'As Applicable'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700 pb-1.5 border-b border-slate-200">
                  <span>GST Tax (5% SAC 996412):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatINR(booking.gstAmount || Math.round(booking.totalFare * 0.05))}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-800 pt-0.5">
                  <span className="font-bold">Total Invoice Amount (Incl. GST):</span>
                  <span className="text-base font-black text-slate-950 font-mono">
                    INR {Number(booking.totalFare || 0).toLocaleString('en-IN')}.00
                  </span>
                </div>

                <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/80 px-3 py-2 rounded-lg border border-emerald-200">
                  <span className="font-bold">Advance Paid:</span>
                  <span className="font-black font-mono text-sm">
                    {formatINR(booking.advancePaid)} ✓
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-950 bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-300">
                  <span className="font-black text-[#0F2958]">
                    {isCompleted ? 'Remaining Balance (Settled):' : 'Remaining Balance (Payable to Driver):'}
                  </span>
                  <span className="font-black text-amber-900 text-sm font-mono">
                    {formatINR(booking.balanceDue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Verification Footer: Digital Signature Block + Official Rubber Mohar & Aman Mishra Signature */}
            <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Company Info */}
              <div className="sm:col-span-4 space-y-0.5 text-[9.5px] text-slate-600">
                <div className="font-black uppercase text-[#0F2958] text-[10.5px]">
                  SafarIndiaCabs
                </div>
                <div className="font-bold text-slate-900">GSTIN: 07DQHPA3025F1ZD</div>
                <div>Prop: Aman Mishra</div>
                <div className="leading-snug text-[9px]">
                  H NO 143 STREET 4 JHARODA MAJRA NORTH DELHI BURARI 110084
                </div>
              </div>

              {/* Digitally Signed Block (matching reference screenshot) */}
              <div className="sm:col-span-4 bg-white border border-slate-200 rounded-lg p-2.5 font-sans text-[9.5px] text-slate-800 leading-snug">
                <div>
                  Digitally signed by <strong className="font-black text-slate-950">SAFARINDIACABS (AMAN MISHRA)</strong>
                </div>
                <div className="font-mono text-[8.5px] text-slate-600 mt-0.5">
                  GSTIN: 07DQHPA3025F1ZD
                </div>
                <div className="font-mono text-[8.5px] text-slate-700">
                  Date: {digitalTimestamp}
                </div>
                <div className="font-mono text-[8.5px] text-slate-700">
                  Location: IN
                </div>
              </div>

              {/* Official Rubber Mohar & Aman Mishra Pre-filled Signature */}
              <div className="sm:col-span-4 flex flex-col items-center justify-center shrink-0">
                <div className="text-[9px] font-black uppercase text-[#0F2958] tracking-wider">
                  For SafarIndiaCabs
                </div>
                <div className="relative flex items-center justify-center h-18 w-36">
                  <img
                    src={renderOfficialRubberStampDataUrl('circular', 'SafarIndiaCabs', '07DQHPA3025F1ZD', 'Aman Mishra')}
                    alt="SafarIndiaCabs Official Rubber Mohar"
                    className="w-18 h-18 object-contain opacity-95 select-none pointer-events-none"
                  />
                  <img
                    src={renderDefaultProprietorSignatureDataUrl('Aman Mishra')}
                    alt="Aman Mishra Signature"
                    className="absolute right-0 bottom-0.5 w-24 h-11 object-contain select-none pointer-events-none"
                  />
                </div>
                <div className="text-[9px] font-extrabold text-slate-900 border-t border-slate-300 pt-0.5 w-full text-center">
                  Prop. Aman Mishra (Signatory)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar (Excluded from print) */}
        <div className="no-print px-5 sm:px-6 pb-6 pt-1 bg-white space-y-2.5">
          {/* 24x7 Emergency Support & Direct Driver Call Connection Bar */}
          <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-xs">
              <div className="font-extrabold text-rose-900">
                24x7 Highway Emergency Support &amp; Driver Connect
              </div>
              <div className="text-[11px] text-rose-700">
                Instant SOS helpline &amp; live chauffeur coordination for Booking ID {booking.id}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {booking.driverPhone && (
                <a
                  href={`tel:+91${booking.driverPhone.replace(/\D/g, '').slice(-10)}`}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Driver</span>
                </a>
              )}
              <a
                href="tel:+917710080992"
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>24x7 Emergency (+91 7710080992)</span>
              </a>
            </div>
          </div>

          {/* Primary Row: Download PDF Invoice + Share Receipt on WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-950 shrink-0" />
              <span>{isDownloadingPdf ? 'Generating GST Invoice PDF...' : 'Download GST Bill / Invoice (PDF)'}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShareToOfficial}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-white shrink-0" />
              <span>Share Receipt on WhatsApp</span>
            </button>
          </div>

          {/* Secondary Row: Send Review Request, Send Receipt to Customer WhatsApp, Print, or View Rides */}
          <div className="flex flex-wrap items-center gap-2">
            {booking.customerPhone && (
              <a
                href={buildCustomerReviewWhatsAppUrl({
                  customerName: booking.customerName,
                  customerPhone: booking.customerPhone,
                  pickupCity: booking.pickupCity,
                  dropCity: booking.dropCity,
                  bookingId: booking.id
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                <span>Send Review Request (+91 {booking.customerPhone})</span>
              </a>
            )}

            {booking.customerPhone && (
              <button
                type="button"
                onClick={handleWhatsAppShareToCustomer}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Receipt</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onViewMyRides();
              }}
              className="py-2.5 px-4 rounded-xl bg-[#081C44] hover:bg-slate-800 text-amber-400 font-bold text-xs transition text-center cursor-pointer"
            >
              <span>My Rides</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
