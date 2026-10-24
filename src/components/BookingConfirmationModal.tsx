import React, { useState } from 'react';
import {
  CheckCircle2,
  Printer,
  Share2,
  Car,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  X,
  Download,
  CreditCard,
  MessageSquare,
  User,
  Phone,
  FileText,
  Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { BookingRecord } from '../types';
import { formatINR } from '../utils/fareCalculator';
import { triggerWhatsAppDeepLink } from '../utils/whatsapp';

export const OFFICIAL_WHATSAPP_NUMBER = '917710080992';

export function buildFormattedReceiptWhatsAppMessage(booking: BookingRecord): string {
  const isCompleted = booking.status === 'completed';
  const headerLine = isCompleted
    ? `*SAFAR INDIA CABS - COMPLETED TRIP RECEIPT & INVOICE*`
    : `*SAFAR INDIA CABS - OFFICIAL BOOKING RECEIPT*`;

  const lines = [
    headerLine,
    `----------------------------------`,
    `*Booking ID:* ${booking.id}`,
    `*Status:* ${booking.status.toUpperCase()}`,
    `*Customer Name:* ${booking.customerName}`,
    `*Phone:* +91 ${booking.customerPhone}`,
    `*Trip Type:* ${booking.tripType.toUpperCase()}`,
    `*Pickup Location:* ${booking.pickupAddress ? `${booking.pickupAddress}, ${booking.pickupCity}` : booking.pickupCity}${booking.landmark ? ` (Near: ${booking.landmark})` : ''}`,
    `*Drop Location:* ${booking.dropAddress ? `${booking.dropAddress}, ${booking.dropCity}` : booking.dropCity}`,
    `*Trip Date & Time:* ${booking.pickupDate} at ${booking.pickupTime}`,
    ...(booking.returnDate ? [`*Return Date:* ${booking.returnDate} ${booking.returnTime || ''}`] : []),
    `*Vehicle Type:* ${booking.cabName}`,
    `*Est. Distance:* ${booking.distanceKm} KM`,
    ...(booking.driverName
      ? [
          `*Assigned Driver:* ${booking.driverName} (+91 ${booking.driverPhone || ''})`,
          `*Vehicle Plate:* ${booking.driverVehicleNo || 'Commercial AITP'}`
        ]
      : []),
    `----------------------------------`,
    `*Estimated Total Fare:* Rs. ${Number(booking.totalFare || 0).toLocaleString('en-IN')}`,
    `*Advance Paid:* Rs. ${Number(booking.advancePaid || 0).toLocaleString('en-IN')}`,
    `*Remaining Amount:* Rs. ${Number(booking.balanceDue || 0).toLocaleString('en-IN')}`,
    `----------------------------------`,
    `*24x7 Helpline:* +91 77100 80992`,
    `*Web:* https://safarindiacabs.com`
  ];

  return lines.join('\n');
}

/**
 * Generates and downloads an executive Navy Blue & Golden PDF Invoice for a BookingRecord using jsPDF
 */
export function generateBookingInvoicePdf(booking: BookingRecord): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Brand Colors: Navy Blue (#081C44) & Golden (#F59E0B / #FBBF24)
  const navyR = 8,
    navyG = 28,
    navyB = 68;
  const goldR = 245,
    goldG = 158,
    goldB = 11;

  // 1. Top Executive Navy Blue Header Banner
  doc.setFillColor(navyR, navyG, navyB);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Golden Accent Stripe below Header
  doc.setFillColor(goldR, goldG, goldB);
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // Company Title in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('SAFAR INDIA CABS', margin, 18);

  doc.setTextColor(251, 191, 36); // Golden subtitle
  doc.setFontSize(9.5);
  doc.text('TRAVEL SMART  |  ALL INDIA OUTSTATION & LOCAL AC CAB RENTALS', margin, 25);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('24x7 Helpline: +91 77100 80992  |  Email: safarindiacabs01@gmail.com  |  safarindiacabs.com', margin, 32);

  // Right side of Header: Tax Invoice & Booking ID Badge
  doc.setFillColor(goldR, goldG, goldB);
  doc.roundedRect(pageWidth - margin - 58, 10, 58, 22, 3, 3, 'F');
  doc.setTextColor(8, 28, 68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(
    booking.status === 'completed' ? 'COMPLETED TRIP INVOICE' : 'BOOKING RECEIPT',
    pageWidth - margin - 29,
    17,
    { align: 'center' }
  );
  doc.setFontSize(12);
  doc.text(booking.id, pageWidth - margin - 29, 25.5, { align: 'center' });

  let y = 54;

  // 2. Booking Status & Timestamp Strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 14, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const statusLabel =
    booking.status === 'completed'
      ? 'STATUS: COMPLETED & VERIFIED'
      : booking.status === 'cancelled'
      ? 'STATUS: CANCELLED'
      : 'STATUS: CONFIRMED BOOKING';
  doc.text(statusLabel, margin + 5, y + 8.8);

  const invoiceDateStr = new Date(booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Issued Date: ${invoiceDateStr}`, pageWidth - margin - 5, y + 8.8, { align: 'right' });

  y += 21;

  // 3. Two-Column Customer & Vehicle Summary
  const colWidth = (contentWidth - 6) / 2;

  // Left Box: Customer Details
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, colWidth, 34, 2.5, 2.5, 'FD');

  doc.setFillColor(navyR, navyG, navyB);
  doc.roundedRect(margin, y, colWidth, 7.5, 2, 2, 'F');
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PASSENGER DETAILS', margin + 4, y + 5.2);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.text(booking.customerName || 'Verified Passenger', margin + 4, y + 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Mobile: +91 ${booking.customerPhone}`, margin + 4, y + 21);
  if (booking.customerEmail) {
    doc.text(`Email: ${booking.customerEmail}`, margin + 4, y + 26.5);
  } else if (booking.customerGst) {
    doc.text(`GSTIN: ${booking.customerGst} (${booking.gstCompanyName || ''})`, margin + 4, y + 26.5);
  } else {
    doc.text(`Payment Ref: ${booking.transactionId || 'Verified Booking'}`, margin + 4, y + 26.5);
  }

  // Right Box: Vehicle & Trip Classification
  const rightX = margin + colWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, y, colWidth, 34, 2.5, 2.5, 'FD');

  doc.setFillColor(navyR, navyG, navyB);
  doc.roundedRect(rightX, y, colWidth, 7.5, 2, 2, 'F');
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('VEHICLE & SCHEDULE', rightX + 4, y + 5.2);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  const cleanVehicleName = (booking.cabName || 'Sedan AC').slice(0, 38);
  doc.text(cleanVehicleName, rightX + 4, y + 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Trip Date: ${booking.pickupDate} at ${booking.pickupTime}`, rightX + 4, y + 21);
  doc.text(
    `Trip Type: ${booking.tripType.toUpperCase()}  |  Distance: ${booking.distanceKm} KM`,
    rightX + 4,
    y + 26.5
  );

  y += 41;

  // 4. Route & Location Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 34, 2.5, 2.5, 'FD');

  doc.setFillColor(navyR, navyG, navyB);
  doc.roundedRect(margin, y, contentWidth, 7.5, 2, 2, 'F');
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('JOURNEY PICKUP & DROP ITINERARY', margin + 4, y + 5.2);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Pickup Location:', margin + 4, y + 15);
  doc.setFont('helvetica', 'normal');
  const fullPickup = `${booking.pickupAddress ? booking.pickupAddress + ', ' : ''}${booking.pickupCity}${
    booking.landmark ? ` (Near: ${booking.landmark})` : ''
  }`;
  const splitPickup = doc.splitTextToSize(fullPickup, contentWidth - 38);
  doc.text(splitPickup.slice(0, 2), margin + 35, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.text('Drop Location:', margin + 4, y + 26);
  doc.setFont('helvetica', 'normal');
  const fullDrop = `${booking.dropAddress ? booking.dropAddress + ', ' : ''}${booking.dropCity}`;
  const splitDrop = doc.splitTextToSize(fullDrop, contentWidth - 38);
  doc.text(splitDrop.slice(0, 2), margin + 35, y + 26);

  y += 41;

  // Optional Assigned Driver Box if driver is assigned
  if (booking.driverName) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(margin, y, contentWidth, 16, 2.5, 2.5, 'FD');

    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      `ASSIGNED CHAUFFEUR: ${booking.driverName} (+91 ${booking.driverPhone || '-'})`,
      margin + 4,
      y + 6.8
    );
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Vehicle Model: ${booking.driverVehicleModel || booking.cabName}   |   Reg Plate: ${
        booking.driverVehicleNo || 'Commercial AITP'
      }`,
      margin + 4,
      y + 12.8
    );

    y += 22;
  }

  // 5. Executive Fare & Payment Summary Table (Navy Blue & Gold Highlight)
  doc.setFillColor(navyR, navyG, navyB);
  doc.roundedRect(margin, y, contentWidth, 8.5, 2, 2, 'F');
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FARE & PAYMENT BREAKDOWN', margin + 4, y + 5.8);
  doc.text('AMOUNT (INR)', pageWidth - margin - 4, y + 5.8, { align: 'right' });

  y += 8.5;

  const rows: Array<{ label: string; value: string; bold?: boolean; highlight?: 'gold' | 'green' }> = [
    {
      label: `Base Trip Fare & Fuel (${booking.distanceKm} KM Included)`,
      value: `Rs. ${Number(booking.baseFare || booking.totalFare).toLocaleString('en-IN')}`
    },
    ...(booking.driverAllowance
      ? [
          {
            label: 'Chauffeur / Driver Allowance',
            value: `Rs. ${Number(booking.driverAllowance).toLocaleString('en-IN')}`
          }
        ]
      : []),
    ...(booking.tollsAndTaxes
      ? [
          {
            label: 'Highway Toll & State Entry Permit Tax',
            value: `Rs. ${Number(booking.tollsAndTaxes).toLocaleString('en-IN')}`
          }
        ]
      : []),
    ...(booking.gstAmount
      ? [
          {
            label: 'GST (5% Commercial Passenger Transport)',
            value: `Rs. ${Number(booking.gstAmount).toLocaleString('en-IN')}`
          }
        ]
      : []),
    {
      label: 'Estimated Total Fare',
      value: `Rs. ${Number(booking.totalFare || 0).toLocaleString('en-IN')}`,
      bold: true
    },
    {
      label: 'Advance Paid Online',
      value: `Rs. ${Number(booking.advancePaid || 0).toLocaleString('en-IN')} (PAID)`,
      bold: true,
      highlight: 'green'
    },
    {
      label:
        booking.status === 'completed'
          ? 'Remaining Amount (Collected at Trip Completion)'
          : 'Remaining Amount (Payable to Driver during Trip)',
      value: `Rs. ${Number(booking.balanceDue || 0).toLocaleString('en-IN')}`,
      bold: true,
      highlight: 'gold'
    }
  ];

  for (const r of rows) {
    if (r.highlight === 'gold') {
      doc.setFillColor(254, 243, 199); // soft gold background
    } else if (r.highlight === 'green') {
      doc.setFillColor(236, 253, 245); // soft emerald background
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 9.5, 'FD');

    if (r.highlight === 'gold') {
      doc.setTextColor(146, 64, 14);
    } else if (r.highlight === 'green') {
      doc.setTextColor(4, 120, 87);
    } else {
      doc.setTextColor(15, 23, 42);
    }

    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(r.bold ? 9.5 : 9);
    doc.text(r.label, margin + 4, y + 6.3);
    doc.text(r.value, pageWidth - margin - 4, y + 6.3, { align: 'right' });

    y += 9.5;
  }

  y += 10;

  // 6. Footer Assurance & Authorized Signatory
  doc.setFillColor(navyR, navyG, navyB);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('THANK YOU FOR RIDING WITH SAFAR INDIA CABS!', margin + 5, y + 7.5);

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    '• Zero Night Driving Charges   • Verified Commercial Chauffeurs   • 24x7 Highway Assistance',
    margin + 5,
    y + 13.5
  );
  doc.text(
    'For support, invoice queries, or return cab bookings, WhatsApp or Call +91 77100 80992.',
    margin + 5,
    y + 19
  );

  doc.save(`SafarIndiaCabs_Invoice_${booking.id}.pdf`);
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
      <div className="booking-modal-container bg-white border-2 border-amber-400/80 rounded-3xl w-full max-w-xl my-2 sm:my-auto overflow-hidden shadow-2xl relative pb-[110px] sm:pb-0 animate-in zoom-in-95">
        {/* Top Close (✕) Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close booking receipt"
          title="Close Receipt"
          className="no-print absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/15 hover:bg-rose-500 text-white border border-white/25 flex items-center justify-center transition active:scale-95 cursor-pointer z-20"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Printable Receipt Card */}
        <div id="printable-voucher">
          {/* Executive Navy Blue & Golden Header */}
          <div className="bg-gradient-to-br from-[#081C44] via-[#0B2559] to-[#0F172A] text-white px-5 sm:px-7 pt-6 pb-5 border-b-4 border-amber-400 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
              {/* Company Logo & Brand Name */}
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/25 shrink-0 border-2 border-white/20 overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="Safar India Cabs Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <Car className="w-6 h-6 text-slate-950 absolute opacity-0" />
                </div>
                <div>
                  <div className="font-black tracking-tight text-lg sm:text-xl text-white flex items-center">
                    <span>SAFAR</span>
                    <span className="text-amber-400 mx-0.5 font-mono">.</span>
                    <span>INDIA</span>
                    <span className="text-amber-400 mx-0.5 font-mono">.</span>
                    <span className="text-amber-400">CABS</span>
                  </div>
                  <div className="text-[10px] tracking-[0.22em] font-extrabold text-amber-300 uppercase">
                    Official Tax Invoice &amp; Receipt
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Helpline: +91 77100 80992 · safarindiacabs.com
                  </div>
                </div>
              </div>

              {/* Unique Booking ID Pill */}
              <div className="bg-amber-400 text-slate-950 px-3.5 py-2 rounded-2xl shadow-md self-start sm:self-auto text-left sm:text-right shrink-0">
                <span className="text-[9px] font-black uppercase tracking-wider block text-slate-800">
                  Unique Booking ID
                </span>
                <span className="text-sm sm:text-base font-black font-mono tracking-tight">
                  {booking.id}
                </span>
              </div>
            </div>

            {/* Confirmation Status Bar */}
            <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-extrabold text-amber-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {isCompleted
                    ? 'Booking Completed · Final Tax Invoice Ready'
                    : 'Booking Confirmed · Instant Receipt Generated'}
                </span>
              </span>
              <span className="text-[11px] text-slate-300 font-mono">
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-amber-600" />
                  <span>Customer Details</span>
                </span>
                <div className="text-sm font-black text-slate-950">{booking.customerName}</div>
                <div className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>+91 {booking.customerPhone}</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Car className="w-3 h-3 text-amber-600" />
                  <span>Vehicle Type &amp; Trip</span>
                </span>
                <div className="text-sm font-black text-[#081C44]">{booking.cabName}</div>
                <div className="text-xs font-bold text-amber-700">
                  {booking.tripType.toUpperCase()} · {booking.distanceKm} KM
                </div>
              </div>
            </div>

            {/* Pickup, Drop & Date/Time Details Card */}
            <div className="bg-[#081C44]/[0.03] border border-slate-200/90 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-200/80">
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

              <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-200/80">
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
                  <Calendar className="w-3.5 h-3.5 text-[#081C44] shrink-0" />
                  <span>Trip Date &amp; Time:</span>
                </span>
                <span className="font-black text-slate-950 font-mono">
                  {booking.pickupDate} at {booking.pickupTime}
                </span>
              </div>

              {booking.driverName && (
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-emerald-900 bg-emerald-50/80 -mx-2 px-3 py-2 rounded-xl">
                  <span className="font-bold">
                    Chauffeur: <strong>{booking.driverName}</strong> (+91 {booking.driverPhone})
                  </span>
                  {booking.driverVehicleNo && (
                    <span className="font-mono font-black bg-white px-2 py-0.5 rounded border border-emerald-300 text-xs">
                      {booking.driverVehicleNo}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Executive Navy & Gold Fare Summary Box */}
            <div className="rounded-2xl overflow-hidden border-2 border-[#081C44]">
              <div className="bg-[#081C44] text-amber-400 px-4 py-2 text-[11px] font-black uppercase tracking-wider flex items-center justify-between">
                <span>Fare &amp; Payment Summary</span>
                <span>Verified Receipt</span>
              </div>

              <div className="p-4 bg-white space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-semibold">Estimated Total Fare:</span>
                  <span className="text-base font-black text-slate-950 font-mono">
                    {formatINR(booking.totalFare)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-emerald-700 bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200">
                  <span className="font-bold">Advance Paid:</span>
                  <span className="font-black font-mono text-sm">
                    {formatINR(booking.advancePaid)} ✓
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-950 bg-amber-50 px-3 py-2.5 rounded-xl border border-amber-300">
                  <span className="font-black text-[#081C44]">
                    {isCompleted ? 'Remaining Amount (Settled):' : 'Remaining Amount (Payable to Driver):'}
                  </span>
                  <span className="font-black text-amber-800 text-base font-mono">
                    {formatINR(booking.balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Bar (Excluded from print) */}
        <div className="no-print px-5 sm:px-6 pb-6 pt-1 bg-white space-y-2.5">
          {/* Primary Row: Download PDF Invoice + Share Receipt on WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-950 shrink-0" />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF Invoice'}</span>
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

          {/* Secondary Row: Send to Customer WhatsApp, Print, or View Rides */}
          <div className="flex flex-wrap items-center gap-2">
            {booking.customerPhone && (
              <button
                type="button"
                onClick={handleWhatsAppShareToCustomer}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp to Customer (+91 {booking.customerPhone})</span>
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
