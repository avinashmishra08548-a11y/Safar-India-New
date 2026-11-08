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
import { buildCustomerReviewWhatsAppUrl } from '../utils/whatsapp';
import { formatWhatsAppBookingConfirmationMessage } from '../utils/whatsappService';
import {
  OFFICIAL_SAFAR_LOGO_DATA_URL,
  renderOfficialRubberStampDataUrl,
  renderDefaultProprietorSignatureDataUrl,
  formatDigitalSignTimestamp
} from '../utils/officialSignatureData';
import { jsPDF } from 'jspdf';

export const OFFICIAL_WHATSAPP_NUMBER = '917710080992';

export interface ItemizedInvoiceBreakup {
  tripDays: number;
  tripTypeBadge: string;
  baseCabFare: number;
  driverAllowance: number;
  highwayToll: number;
  statePermitTax: number;
  hillStationCharge: number;
  nightCharge: number;
  extraKmDriven: number;
  extraKmCharge: number;
  extraTollCharges: number;
  otherSurcharges: number;
  taxableValue: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  totalFare: number;
}

/**
 * Resolves a transparent, itemized fare breakup for any booking so Base Fare,
 * Driver Allowance (Bata), Highway FASTag Toll Tax, State Border Entry Permit Tax,
 * Hill Station Surcharge, Post-Trip Admin Adjustments, and GST are always displayed as separate line items.
 */
export function resolveItemizedInvoiceBreakup(booking: BookingRecord): ItemizedInvoiceBreakup {
  const tripDays = Math.max(1, Number(booking.tripDays || 1));
  const tripTypeBadge =
    booking.tripType === 'roundtrip'
      ? `Round Trip (${tripDays === 1 ? 'Same Day Return • 1 Day' : `${tripDays} Days`})`
      : booking.tripType === 'local'
      ? 'Local Rental (8Hr / 80KM)'
      : 'One-Way Outstation';

  const totalFare = Math.max(0, Number(booking.totalFare || 0));
  const gstAmount = Number(booking.gstAmount ?? Math.round((booking.baseFare || totalFare) * 0.05));
  const cgst = Math.floor(gstAmount / 2);
  const sgst = gstAmount - cgst;

  const rawTolls = Math.max(0, Number(booking.tollsAndTaxes || 0));
  const highwayToll =
    booking.highwayToll !== undefined
      ? Math.max(0, Number(booking.highwayToll))
      : rawTolls > 0
      ? Math.round(rawTolls * 0.55)
      : 0;
  const statePermitTax =
    booking.statePermitTax !== undefined
      ? Math.max(0, Number(booking.statePermitTax))
      : Math.max(0, rawTolls - highwayToll);

  const hillStationCharge = Math.max(0, Number(booking.hillStationCharge || 0));
  const nightCharge = Math.max(0, Number(booking.nightCharge || 0));
  const extraKmDriven = Math.max(0, Number(booking.extraKmDriven || 0));
  const extraKmCharge = Math.max(0, Number(booking.extraKmCharge || 0));
  const extraTollCharges = Math.max(0, Number(booking.extraTollCharges || 0));
  const otherSurcharges = Math.max(0, Number(booking.otherSurcharges || 0));

  let driverAllowance = Math.max(0, Number(booking.driverAllowance || 0));
  const combinedTolls = highwayToll + statePermitTax;
  let baseCabFare =
    Number(booking.baseFare || 0) ||
    Math.max(
      0,
      totalFare -
        gstAmount -
        combinedTolls -
        driverAllowance -
        hillStationCharge -
        nightCharge -
        extraKmCharge -
        extraTollCharges -
        otherSurcharges
    );

  // If driverAllowance was previously 0 (lumped into baseFare), split out ₹260/day so Base Fare doesn't look inflated
  if (driverAllowance === 0 && baseCabFare > 600 && booking.tripType !== 'local') {
    const separatedBata = 260 * tripDays;
    if (baseCabFare > separatedBata + 300) {
      driverAllowance = separatedBata;
      baseCabFare = baseCabFare - separatedBata;
    }
  }

  // If baseCabFare still had hillStationCharge lumped in, ensure taxable sum matches totalFare - gstAmount
  const expectedTaxable = Math.max(0, totalFare - gstAmount);
  const currentSum =
    baseCabFare +
    driverAllowance +
    highwayToll +
    statePermitTax +
    hillStationCharge +
    nightCharge +
    extraKmCharge +
    extraTollCharges +
    otherSurcharges;
  if (expectedTaxable > 0 && currentSum > expectedTaxable && baseCabFare > currentSum - expectedTaxable + 200) {
    baseCabFare -= currentSum - expectedTaxable;
  }

  const taxableValue =
    baseCabFare +
    driverAllowance +
    highwayToll +
    statePermitTax +
    hillStationCharge +
    nightCharge +
    extraKmCharge +
    extraTollCharges +
    otherSurcharges;

  return {
    tripDays,
    tripTypeBadge,
    baseCabFare,
    driverAllowance,
    highwayToll,
    statePermitTax,
    hillStationCharge,
    nightCharge,
    extraKmDriven,
    extraKmCharge,
    extraTollCharges,
    otherSurcharges,
    taxableValue,
    gstAmount,
    cgst,
    sgst,
    totalFare
  };
}

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
 * Synchronously builds a Clean Light-Theme Corporate GST Tax Invoice PDF for a BookingRecord using jsPDF
 * Includes Official SafarIndiaCabs Logo, "Digitally signed by SAFARINDIACABS..." block, Rubber Mohar & Aman Mishra Signature.
 */
export function buildBookingInvoicePdfDocument(booking: BookingRecord): {
  doc: jsPDF;
  fileName: string;
  getPdfFile: () => File;
} {
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

  // Right Side Voucher / Final Tax Invoice Box (Light Theme)
  const isCompletedInvoice = booking.status === 'completed';
  const cleanIdSuffix = booking.id.replace(/^SIC-?/i, '');
  const invoiceNo = isCompletedInvoice ? `INV-SIC${cleanIdSuffix}` : `VCR-SIC${cleanIdSuffix}`;
  const invoiceDateStr = new Date(booking.completedAt || booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const badgeW = 56;
  const badgeX = pageWidth - margin - badgeW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(badgeX, y, badgeW, 25, 2, 2, 'FD');

  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text(
    isCompletedInvoice ? 'FINAL TAX INVOICE' : 'BOOKING VOUCHER',
    badgeX + badgeW - 3,
    y + 5.5,
    { align: 'right' }
  );

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.text(
    isCompletedInvoice ? 'ORIGINAL FOR RECIPIENT' : 'ADVANCE CONFIRMATION VOUCHER',
    badgeX + badgeW - 3,
    y + 9.2,
    { align: 'right' }
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text(
    `${isCompletedInvoice ? 'Inv No' : 'Voucher No'}: ${invoiceNo}`,
    badgeX + badgeW - 3,
    y + 14.5,
    { align: 'right' }
  );

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
      ? 'STATUS: COMPLETED & FINAL GST TAX INVOICE SETTLED'
      : booking.status === 'cancelled'
      ? 'STATUS: CANCELLED'
      : 'STATUS: CONFIRMED BOOKING (FINAL INVOICE AFTER TRIP COMPLETION)';
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

  // 5. Clean Light-Theme Itemized Tax Invoice Fare Table
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7.2, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.text('ITEMIZED FARE & TAX BREAKUP (SAC: 996412)', margin + 3.5, y + 4.9);
  doc.text('AMOUNT (INR)', pageWidth - margin - 3.5, y + 4.9, { align: 'right' });

  y += 7.2;

  const breakup = resolveItemizedInvoiceBreakup(booking);

  const rows: Array<{ label: string; value: string; bold?: boolean; highlight?: 'gold' | 'green' }> = [
    {
      label: `1. Base Cab & Fuel Charges (${breakup.tripTypeBadge} • ${booking.distanceKm} KM Included)`,
      value: `INR ${breakup.baseCabFare.toLocaleString('en-IN')}.00`
    },
    {
      label: `2. Chauffeur / Driver Allowance (Daily Bata • ${breakup.tripDays} ${breakup.tripDays === 1 ? 'Day' : 'Days'})`,
      value: `INR ${breakup.driverAllowance.toLocaleString('en-IN')}.00`
    },
    {
      label: '3. Highway FASTag Toll Tax',
      value:
        breakup.highwayToll > 0
          ? `INR ${breakup.highwayToll.toLocaleString('en-IN')}.00`
          : 'INR 0.00 (As Applicable)'
    },
    {
      label: '4. State Border Entry Permit Tax',
      value:
        breakup.statePermitTax > 0
          ? `INR ${breakup.statePermitTax.toLocaleString('en-IN')}.00`
          : 'INR 0.00 (Included)'
    },
    ...(breakup.hillStationCharge > 0
      ? [
          {
            label: '5. Hill Station / Mountain Drive Allowance',
            value: `INR ${breakup.hillStationCharge.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    ...(breakup.nightCharge > 0
      ? [
          {
            label: 'Night / Dawn Chauffeur Allowance',
            value: `INR ${breakup.nightCharge.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    ...(breakup.extraKmCharge > 0
      ? [
          {
            label: `Post-Trip Extra Distance Charge (${breakup.extraKmDriven} Extra KM Driven)`,
            value: `INR ${breakup.extraKmCharge.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    ...(breakup.extraTollCharges > 0
      ? [
          {
            label: 'Post-Trip Extra Highway Toll / FASTag Charges',
            value: `INR ${breakup.extraTollCharges.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    ...(breakup.otherSurcharges > 0
      ? [
          {
            label: 'Other Post-Trip Surcharges (Parking / Waiting / Detour)',
            value: `INR ${breakup.otherSurcharges.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    {
      label: 'CGST @ 2.5% (SAC 996412 - Commercial Cab Service)',
      value: `INR ${breakup.cgst.toLocaleString('en-IN')}.00`
    },
    {
      label: 'SGST @ 2.5% (SAC 996412 - Commercial Cab Service)',
      value: `INR ${breakup.sgst.toLocaleString('en-IN')}.00`
    },
    {
      label: isCompletedInvoice
        ? 'FINAL TAX INVOICE AMOUNT (Inclusive of 5% GST)'
        : 'ESTIMATED TOTAL TRIP FARE (Inclusive of 5% GST)',
      value: `INR ${breakup.totalFare.toLocaleString('en-IN')}.00`,
      bold: true
    },
    {
      label: booking.status === 'completed' ? 'Total Amount Paid (100% Settled)' : 'Advance Paid Online',
      value:
        booking.status === 'completed'
          ? `INR ${breakup.totalFare.toLocaleString('en-IN')}.00 (PAID)`
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

  const pdfRowH = rows.length > 9 ? 6.1 : rows.length > 8 ? 6.8 : 7.5;
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
    doc.rect(margin, y, contentWidth, pdfRowH, 'FD');

    if (r.highlight === 'gold') {
      doc.setTextColor(146, 64, 14);
    } else if (r.highlight === 'green') {
      doc.setTextColor(4, 120, 87);
    } else {
      doc.setTextColor(15, 23, 42);
    }

    doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
    doc.setFontSize(r.bold ? 8.3 : 7.8);
    doc.text(r.label, margin + 3.5, y + pdfRowH - 2.0);
    doc.text(r.value, pageWidth - margin - 3.5, y + pdfRowH - 2.0, { align: 'right' });

    y += pdfRowH;
  }

  y += 4;

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

  const fileName = isCompletedInvoice
    ? `SafarIndiaCabs_Final_GST_Invoice_${booking.id}.pdf`
    : `SafarIndiaCabs_Booking_Voucher_${booking.id}.pdf`;
  return {
    doc,
    fileName,
    getPdfFile: () => {
      const pdfBlob = doc.output('blob');
      return new File([pdfBlob], fileName, {
        type: 'application/pdf',
        lastModified: Date.now()
      });
    }
  };
}

/**
 * Builds a direct HTTPS server endpoint URL (/api/bookings?action=invoice_pdf&...)
 * that returns the real binary application/pdf GST Invoice with Content-Disposition headers.
 * This works natively inside the Android WebView app (MainActivity.java DownloadListener)
 * as well as Chrome Android, iOS Safari, and Desktop browsers.
 */
export function buildServerInvoicePdfUrl(
  booking: BookingRecord,
  mode: 'download' | 'inline' = 'download'
): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://safarindiacabs.com';
  const params = new URLSearchParams();
  params.set('action', 'invoice_pdf');
  params.set('mode', mode);
  params.set('id', booking.id || 'SIC2601');
  if (booking.customerName) params.set('customerName', booking.customerName);
  if (booking.customerPhone) params.set('customerPhone', booking.customerPhone);
  if (booking.customerEmail) params.set('customerEmail', booking.customerEmail);
  if (booking.customerGst) params.set('customerGst', booking.customerGst);
  if (booking.gstCompanyName) params.set('gstCompanyName', booking.gstCompanyName);
  if (booking.tripType) params.set('tripType', booking.tripType);
  if (booking.pickupCity) params.set('pickupCity', booking.pickupCity);
  if (booking.dropCity) params.set('dropCity', booking.dropCity);
  if (booking.pickupAddress) params.set('pickupAddress', booking.pickupAddress);
  if (booking.dropAddress) params.set('dropAddress', booking.dropAddress);
  if (booking.landmark) params.set('landmark', booking.landmark);
  if (booking.pickupDate) params.set('pickupDate', booking.pickupDate);
  if (booking.pickupTime) params.set('pickupTime', booking.pickupTime);
  if (booking.cabName) params.set('cabName', booking.cabName);
  const breakup = resolveItemizedInvoiceBreakup(booking);
  params.set('distanceKm', String(booking.distanceKm || 230));
  params.set('tripDays', String(breakup.tripDays));
  params.set('baseFare', String(breakup.baseCabFare));
  params.set('driverAllowance', String(breakup.driverAllowance));
  params.set('tollsAndTaxes', String(breakup.highwayToll + breakup.statePermitTax));
  params.set('highwayToll', String(breakup.highwayToll));
  params.set('statePermitTax', String(breakup.statePermitTax));
  params.set('hillStationCharge', String(breakup.hillStationCharge));
  if (breakup.extraKmDriven > 0) params.set('extraKmDriven', String(breakup.extraKmDriven));
  if (breakup.extraKmCharge > 0) params.set('extraKmCharge', String(breakup.extraKmCharge));
  if (breakup.extraTollCharges > 0) params.set('extraTollCharges', String(breakup.extraTollCharges));
  if (breakup.otherSurcharges > 0) params.set('otherSurcharges', String(breakup.otherSurcharges));
  params.set('gstAmount', String(breakup.gstAmount));
  params.set('totalFare', String(breakup.totalFare));
  params.set('advancePaid', String(booking.advancePaid || 0));
  params.set('balanceDue', String(booking.balanceDue || 0));
  params.set('status', booking.status || 'confirmed');
  if (booking.paymentMethod) params.set('paymentMethod', booking.paymentMethod);
  if (booking.transactionId) params.set('transactionId', booking.transactionId);
  if (booking.driverName) params.set('driverName', booking.driverName);
  if (booking.driverPhone) params.set('driverPhone', booking.driverPhone);
  if (booking.driverVehicleNo) params.set('driverVehicleNo', booking.driverVehicleNo);
  if (booking.createdAt) params.set('createdAt', booking.createdAt);

  return `${origin}/api/bookings?${params.toString()}`;
}

function isAndroidOrWebViewEnvironment(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const win = window as any;
  if (win.__SAFAR_ANDROID_WEBVIEW__ || win.SafarUpiBridge) return true;
  if (/Android/i.test(ua)) return true;
  return false;
}

/**
 * Renders a high-resolution A4 portrait GST Tax Invoice image (data:image/png;base64,...)
 * on an HTML5 <canvas> so that Android WebView (which cannot render <iframe src="blob:..."> PDFs)
 * and mobile browsers display the exact A4 GST Invoice sheet with Logo, Rubber Mohar & Signature.
 */
export function renderA4GstInvoicePreviewDataUrl(booking: BookingRecord): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const W = 1050;
  const H = 1485;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const s = 5; // 210mm * 5 = 1050px, 297mm * 5 = 1485px
  const margin = 12 * s;
  const contentW = W - margin * 2;

  // White A4 background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Outer Corporate Border
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(margin - 10, 40, contentW + 20, 1405);

  // Top Dual Accent Line (Navy & Gold)
  ctx.fillStyle = '#0F2958';
  ctx.fillRect(margin - 10, 40, (contentW + 20) * 0.72, 11);
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(margin - 10 + (contentW + 20) * 0.72, 40, (contentW + 20) * 0.28, 11);

  let y = 70;

  // Left Crest Box
  ctx.fillStyle = '#0F2958';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.fillRect(margin, y, 125, 125);
  ctx.strokeRect(margin, y, 125, 125);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAFAR', margin + 62.5, y + 42);
  ctx.fillStyle = '#FBBF24';
  ctx.font = '900 20px Arial, sans-serif';
  ctx.fillText('INDIA', margin + 62.5, y + 68);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 18px Arial, sans-serif';
  ctx.fillText('CABS', margin + 62.5, y + 92);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('A1 CAB SERVICE', margin + 62.5, y + 113);

  // Company Header Info
  const compX = margin + 145;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 32px Arial, sans-serif';
  ctx.fillText('SafarIndiaCabs', compX, y + 30);

  ctx.fillStyle = '#B45309';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('A1 CAB SERVICES  •  ALL INDIA COMMERCIAL TOUR & TRAVELS', compX, y + 52);

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText('GSTIN: 07DQHPA3025F1ZD   |   Proprietor: Aman Mishra', compX, y + 76);

  ctx.fillStyle = '#475569';
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('Regd. Add: H NO 143 STREET 4 JHARODA MAJRA NORTH DELHI BURARI 110084', compX, y + 98);
  ctx.fillText('Email: Safarindiacabs01@gmail.com   |   Mob: +91 7710080992', compX, y + 119);

  // Right Voucher / Final Tax Invoice Badge
  const isCompletedInvoice = booking.status === 'completed';
  const cleanIdSuffix = booking.id.replace(/^SIC-?/i, '');
  const invoiceNo = isCompletedInvoice ? `INV-SIC${cleanIdSuffix}` : `VCR-SIC${cleanIdSuffix}`;
  const invoiceDateStr = new Date(booking.completedAt || booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const badgeW = 275;
  const badgeX = W - margin - badgeW;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.fillRect(badgeX, y, badgeW, 125);
  ctx.strokeRect(badgeX, y, badgeW, 125);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0F2958';
  ctx.font = '900 18px Arial, sans-serif';
  ctx.fillText(isCompletedInvoice ? 'FINAL TAX INVOICE' : 'BOOKING VOUCHER', badgeX + badgeW - 14, y + 28);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11.5px Arial, sans-serif';
  ctx.fillText(
    isCompletedInvoice ? 'ORIGINAL FOR RECIPIENT' : 'ADVANCE CONFIRMATION VOUCHER',
    badgeX + badgeW - 14,
    y + 46
  );
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14.5px monospace';
  ctx.fillText(
    `${isCompletedInvoice ? 'Inv No' : 'Voucher No'}: ${invoiceNo}`,
    badgeX + badgeW - 14,
    y + 72
  );
  ctx.fillStyle = '#334155';
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText(`Date: ${invoiceDateStr}`, badgeX + badgeW - 14, y + 94);
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`Booking ID: ${booking.id}`, badgeX + badgeW - 14, y + 114);

  y += 145;

  // Status & SAC Strip
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#E2E8F0';
  ctx.fillRect(margin, y, contentW, 44);
  ctx.strokeRect(margin, y, contentW, 44);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#047857';
  ctx.font = '900 14.5px Arial, sans-serif';
  const statusLabel =
    booking.status === 'completed'
      ? '✓ STATUS: COMPLETED & FINAL GST TAX INVOICE SETTLED'
      : booking.status === 'cancelled'
      ? '✕ STATUS: CANCELLED'
      : '✓ STATUS: CONFIRMED BOOKING VOUCHER (FINAL INVOICE ON COMPLETION)';
  ctx.fillText(statusLabel, margin + 16, y + 28);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('SAC Code: 996412 (Passenger Transport by Cab)', W - margin - 16, y + 28);

  y += 62;

  // Two-column Customer & Trip Boxes
  const colW = (contentW - 24) / 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.fillRect(margin, y, colW, 155);
  ctx.strokeRect(margin, y, colW, 155);
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(margin + 1, y + 1, colW - 2, 34);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F2958';
  ctx.font = '900 14px Arial, sans-serif';
  ctx.fillText('BILLED TO (CUSTOMER / CORPORATE DETAILS)', margin + 16, y + 23);

  ctx.fillStyle = '#0F172A';
  ctx.font = '900 18px Arial, sans-serif';
  ctx.fillText((booking.customerName || 'Valued Passenger').slice(0, 32), margin + 16, y + 62);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText(`Mobile: +91 ${booking.customerPhone}`, margin + 16, y + 89);
  ctx.font = '14px Arial, sans-serif';
  if (booking.customerGst) {
    ctx.fillText(`Company: ${booking.gstCompanyName || '-'} | GST: ${booking.customerGst}`, margin + 16, y + 115);
  } else {
    ctx.fillText(`Payment Ref: ${booking.transactionId || 'Verified Online/Cash'}`, margin + 16, y + 115);
  }
  ctx.fillText('Place of Supply: North India / Delhi (07)', margin + 16, y + 140);

  const rightX = margin + colW + 24;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.fillRect(rightX, y, colW, 155);
  ctx.strokeRect(rightX, y, colW, 155);
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(rightX + 1, y + 1, colW - 2, 34);
  ctx.fillStyle = '#0F2958';
  ctx.font = '900 14px Arial, sans-serif';
  ctx.fillText('TRIP & VEHICLE PARTICULARS', rightX + 16, y + 23);

  ctx.fillStyle = '#0F172A';
  ctx.font = '900 17px Arial, sans-serif';
  ctx.fillText((booking.cabName || 'Sedan AC').slice(0, 34), rightX + 16, y + 62);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText(`Travel Date: ${booking.pickupDate} at ${booking.pickupTime}`, rightX + 16, y + 89);
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText(`Trip Type: ${booking.tripType.toUpperCase()}  |  Billed Dist: ${booking.distanceKm} KM`, rightX + 16, y + 115);
  ctx.fillText(
    `Chauffeur: ${booking.driverName || 'Verified Safar Chauffeur'} (${booking.driverVehicleNo || 'Commercial Cab'})`,
    rightX + 16,
    y + 140
  );

  y += 175;

  // Route Itinerary Box
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.fillRect(margin, y, contentW, 120);
  ctx.strokeRect(margin, y, contentW, 120);
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(margin + 1, y + 1, contentW - 2, 32);
  ctx.fillStyle = '#0F2958';
  ctx.font = '900 14px Arial, sans-serif';
  ctx.fillText('JOURNEY PICKUP & DROP ITINERARY', margin + 16, y + 22);

  const pickupFull = booking.pickupAddress
    ? `${booking.pickupAddress}, ${booking.pickupCity}${booking.landmark ? ` (Landmark: ${booking.landmark})` : ''}`
    : booking.pickupCity;
  const dropFull = booking.dropAddress
    ? `${booking.dropAddress}, ${booking.dropCity}`
    : booking.dropCity;

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('Pickup Location:', margin + 16, y + 64);
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText(pickupFull.slice(0, 78), margin + 150, y + 64);

  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('Drop Location:', margin + 16, y + 98);
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText(dropFull.slice(0, 78), margin + 150, y + 98);

  y += 140;

  // Itemized Fare & GST Tax Table (Separated rows)
  const breakup = resolveItemizedInvoiceBreakup(booking);

  ctx.fillStyle = '#F1F5F9';
  ctx.strokeStyle = '#CBD5E1';
  ctx.fillRect(margin, y, contentW, 38);
  ctx.strokeRect(margin, y, contentW, 38);
  ctx.fillStyle = '#0F2958';
  ctx.font = '900 14.5px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ITEMIZED FARE & TAX BREAKUP (SAC: 996412)', margin + 16, y + 25);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT (INR)', W - margin - 16, y + 25);

  y += 38;

  const rows = [
    {
      label: `1. Base Cab & Fuel Charges (${breakup.tripTypeBadge} • ${booking.distanceKm} KM)`,
      value: `INR ${breakup.baseCabFare.toLocaleString('en-IN')}.00`,
      bold: false
    },
    {
      label: `2. Chauffeur / Driver Allowance (Daily Bata • ${breakup.tripDays} ${breakup.tripDays === 1 ? 'Day' : 'Days'})`,
      value: `INR ${breakup.driverAllowance.toLocaleString('en-IN')}.00`,
      bold: false
    },
    {
      label: '3. Highway FASTag Toll Tax',
      value:
        breakup.highwayToll > 0
          ? `INR ${breakup.highwayToll.toLocaleString('en-IN')}.00`
          : 'INR 0.00 (As Applicable)',
      bold: false
    },
    {
      label: '4. State Border Entry Permit Tax',
      value:
        breakup.statePermitTax > 0
          ? `INR ${breakup.statePermitTax.toLocaleString('en-IN')}.00`
          : 'INR 0.00 (Included)',
      bold: false
    },
    ...(breakup.hillStationCharge > 0
      ? [
          {
            label: '5. Hill Station / Mountain Drive Allowance',
            value: `INR ${breakup.hillStationCharge.toLocaleString('en-IN')}.00`,
            bold: false
          }
        ]
      : []),
    ...(breakup.extraKmCharge > 0
      ? [
          {
            label: `Post-Trip Extra Distance Charge (${breakup.extraKmDriven} Extra KM Driven)`,
            value: `INR ${breakup.extraKmCharge.toLocaleString('en-IN')}.00`,
            bold: false
          }
        ]
      : []),
    ...(breakup.extraTollCharges > 0
      ? [
          {
            label: 'Post-Trip Extra Highway Toll / FASTag Charges',
            value: `INR ${breakup.extraTollCharges.toLocaleString('en-IN')}.00`,
            bold: false
          }
        ]
      : []),
    ...(breakup.otherSurcharges > 0
      ? [
          {
            label: 'Other Post-Trip Surcharges (Parking / Waiting / Detour)',
            value: `INR ${breakup.otherSurcharges.toLocaleString('en-IN')}.00`,
            bold: false
          }
        ]
      : []),
    {
      label: 'Total Taxable Value',
      value: `INR ${breakup.taxableValue.toLocaleString('en-IN')}.00`,
      bold: true
    },
    {
      label: 'Add: Central GST (CGST @ 2.5% under SAC 996412)',
      value: `INR ${breakup.cgst.toLocaleString('en-IN')}.00`,
      bold: false
    },
    {
      label: 'Add: State GST (SGST @ 2.5% under SAC 996412)',
      value: `INR ${breakup.sgst.toLocaleString('en-IN')}.00`,
      bold: false
    }
  ];

  const canvasRowH = rows.length > 8 ? 28 : rows.length > 7 ? 31 : 34;
  rows.forEach((r, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.strokeStyle = '#E2E8F0';
    ctx.fillRect(margin, y, contentW, canvasRowH);
    ctx.strokeRect(margin, y, contentW, canvasRowH);
    ctx.fillStyle = '#0F172A';
    ctx.font = `${r.bold ? 'bold ' : ''}14px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(r.label, margin + 16, y + canvasRowH - 10);
    ctx.textAlign = 'right';
    ctx.font = `${r.bold ? 'bold ' : ''}14px monospace`;
    ctx.fillText(r.value, W - margin - 16, y + canvasRowH - 10);
    y += canvasRowH;
  });

  // Grand Total Row
  ctx.fillStyle = '#FEF3C7';
  ctx.strokeStyle = '#F59E0B';
  ctx.fillRect(margin, y, contentW, 46);
  ctx.strokeRect(margin, y, contentW, 46);
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 18px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    isCompletedInvoice
      ? 'FINAL TAX INVOICE VALUE (INCLUSIVE OF 5% GST)'
      : 'ESTIMATED TOTAL TRIP FARE (INCLUSIVE OF 5% GST)',
    margin + 16,
    y + 30
  );
  ctx.textAlign = 'right';
  ctx.font = '900 19px monospace';
  ctx.fillText(`INR ${Number(booking.totalFare || 0).toLocaleString('en-IN')}.00`, W - margin - 16, y + 30);

  y += 58;

  // Payment Settlement Strip
  const isSettled = booking.status === 'completed' || booking.balanceDue === 0;
  ctx.fillStyle = '#F0FDF4';
  ctx.strokeStyle = '#BBF7D0';
  ctx.fillRect(margin, y, contentW, 70);
  ctx.strokeRect(margin, y, contentW, 70);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#15803D';
  ctx.font = '900 15px Arial, sans-serif';
  ctx.fillText(
    isSettled
      ? `PAYMENT STATUS: 100% PAID & SETTLED (INR ${booking.totalFare.toLocaleString('en-IN')}.00)`
      : `ADVANCE PAID: INR ${Number(booking.advancePaid || 0).toLocaleString('en-IN')}.00`,
    margin + 16,
    y + 28
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = '#B45309';
  ctx.fillText(
    isSettled
      ? 'REMAINING BALANCE DUE: INR 0.00 (NIL)'
      : `BALANCE PAYABLE TO CHAUFFEUR: INR ${Number(booking.balanceDue || 0).toLocaleString('en-IN')}.00`,
    W - margin - 16,
    y + 28
  );
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillText(
    `Payment Mode: ${(booking.paymentMethod || 'Online / UPI / Cash').toUpperCase()}   |   Transaction Ref: ${booking.transactionId || booking.id}`,
    margin + 16,
    y + 54
  );

  y += 90;

  // Bottom Verification Footer
  const footerH = 210;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#CBD5E1';
  ctx.fillRect(margin, y, contentW, footerH);
  ctx.strokeRect(margin, y, contentW, footerH);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F2958';
  ctx.font = '900 14px Arial, sans-serif';
  ctx.fillText('TERMS & JURISDICTION:', margin + 16, y + 30);
  ctx.fillStyle = '#475569';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillText('1. Certified that particulars given above are true & correct.', margin + 16, y + 55);
  ctx.fillText('2. Extra KM/Hour or parking if applicable as per tariff.', margin + 16, y + 78);
  ctx.fillText('3. Subject to North Delhi Jurisdiction only.', margin + 16, y + 101);
  ctx.fillText('4. 24x7 Helpline: +91 7710080992 | Safarindiacabs01@gmail.com', margin + 16, y + 124);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('Regd. Office: H NO 143 Street 4 Jharoda Majra Burari Delhi 110084', margin + 16, y + 152);

  // Digital Signature Box
  const digX = margin + 375;
  const digW = 265;
  ctx.fillStyle = '#F8FAFC';
  ctx.strokeStyle = '#CBD5E1';
  ctx.fillRect(digX, y + 24, digW, 155);
  ctx.strokeRect(digX, y + 24, digW, 155);

  const digitalTimestamp = formatDigitalSignTimestamp(booking.pickupDate);
  ctx.fillStyle = '#0F172A';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillText('Digitally signed by', digX + 14, y + 50);
  ctx.font = '900 14px Arial, sans-serif';
  ctx.fillText('SAFARINDIACABS', digX + 14, y + 72);
  ctx.fillText('(AMAN MISHRA)', digX + 14, y + 92);
  ctx.fillStyle = '#334155';
  ctx.font = '12.5px monospace';
  ctx.fillText('GSTIN: 07DQHPA3025F1ZD', digX + 14, y + 116);
  ctx.fillText(`Date: ${digitalTimestamp}`, digX + 14, y + 138);
  ctx.fillText('Location: IN (Verified)', digX + 14, y + 160);

  // Right Side Stamp & Signatory
  const signCenterX = W - margin - 145;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F2958';
  ctx.font = '900 14px Arial, sans-serif';
  ctx.fillText('For SafarIndiaCabs', signCenterX, y + 28);

  // Draw Circular Rubber Mohar directly on canvas
  const stampCx = W - margin - 190;
  const stampCy = y + 102;
  ctx.strokeStyle = '#1D4ED8';
  ctx.fillStyle = '#1D4ED8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(stampCx, stampCy, 56, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(stampCx, stampCy, 50, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(stampCx, stampCy, 35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '900 9px Arial, sans-serif';
  ctx.fillText('★ SAFAR INDIA CABS ★', stampCx, stampCy - 38);
  ctx.font = 'bold 8.5px Arial, sans-serif';
  ctx.fillText('GST: 07DQHPA3025F1ZD', stampCx, stampCy - 8);
  ctx.fillText('VERIFIED TAX INVOICE', stampCx, stampCy + 5);
  ctx.fillText('PROP: AMAN MISHRA', stampCx, stampCy + 18);
  ctx.fillText('NORTH DELHI - 110084', stampCx, stampCy + 42);

  // Cursive Signature Stroke
  ctx.save();
  ctx.translate(W - margin - 105, y + 112);
  ctx.rotate(-0.08);
  ctx.font = 'italic bold 26px Georgia, serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Aman Mishra', 0, 0);
  ctx.restore();

  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W - margin - 265, y + 172);
  ctx.lineTo(W - margin - 20, y + 172);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = '900 13px Arial, sans-serif';
  ctx.fillText('Prop. Aman Mishra (Signatory)', signCenterX, y + 192);

  return canvas.toDataURL('image/png');
}

export async function generateBookingInvoicePdf(booking: BookingRecord): Promise<void> {
  const { doc, fileName } = buildBookingInvoicePdfDocument(booking);
  const serverDownloadUrl = buildServerInvoicePdfUrl(booking, 'download');

  // 1. Check if Native Android Bridge supports direct Base64 PDF download
  const win = typeof window !== 'undefined' ? (window as any) : null;
  if (win?.SafarUpiBridge && typeof win.SafarUpiBridge.downloadPdfBase64 === 'function') {
    try {
      const dataUri = doc.output('datauristring');
      const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
      const handled = win.SafarUpiBridge.downloadPdfBase64(base64, fileName);
      if (handled) return;
    } catch {
      // Fallback to HTTPS download URL below
    }
  }

  // 2. Inside Android App WebView or Android device:
  // Android WebView blocks `blob:` URLs in DownloadListener (`!isSafeHttpsUrl`),
  // whereas navigating to our HTTPS `/api/bookings?action=invoice_pdf` endpoint triggers
  // MainActivity.java's DownloadListener.onDownloadStart with a safe HTTPS URL (and downloads in Chrome Android without leaving the page).
  if (isAndroidOrWebViewEnvironment()) {
    window.location.assign(serverDownloadUrl);
    return;
  }

  // 3. Standard Desktop / iOS Browsers: trigger jsPDF save, with fallback to server PDF URL
  try {
    doc.save(fileName);
  } catch {
    window.location.assign(serverDownloadUrl);
  }
}

/**
 * Generates the official GST Tax Invoice PDF File and shares it on WhatsApp.
 * - Priority 1: Native Android Bridge (`window.SafarUpiBridge.sharePdfBase64`) if available.
 * - Priority 2: Web Share API Level 2 (`navigator.share({ files: [pdfFile] })`) on mobile browsers that support file sharing.
 * - Priority 3: Inside the Android WebView Phone App (where `navigator.share` is unavailable and `window.open` is disabled by `setSupportMultipleWindows(false)`),
 *   launches the native WhatsApp app via `https://api.whatsapp.com/send?text=...` (which `MainActivity.java` natively intercepts via `Intent.ACTION_VIEW`)
 *   with the formatted GST Invoice and direct clickable Official PDF Bill download link!
 */
export async function shareBookingInvoicePdf(
  booking: BookingRecord
): Promise<'shared' | 'whatsapp_opened' | 'downloaded' | 'cancelled'> {
  const { doc, fileName, getPdfFile } = buildBookingInvoicePdfDocument(booking);
  const serverDownloadUrl = buildServerInvoicePdfUrl(booking, 'download');
  const receiptText = buildFormattedReceiptWhatsAppMessage(booking);
  const whatsappTextWithPdfLink = `${receiptText}\n\n📄 *Download Official GST Tax Invoice (PDF):*\n${serverDownloadUrl}`;

  // 1. Native Android Bridge (if present in updated APK)
  const win = typeof window !== 'undefined' ? (window as any) : null;
  if (win?.SafarUpiBridge && typeof win.SafarUpiBridge.sharePdfBase64 === 'function') {
    try {
      const dataUri = doc.output('datauristring');
      const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
      const handled = win.SafarUpiBridge.sharePdfBase64(base64, fileName, whatsappTextWithPdfLink);
      if (handled) return 'shared';
    } catch {
      // Fallback below
    }
  }

  // 2. Native Web Share API with File attachment (Chrome Android / iOS Safari)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      const pdfFile = getPdfFile();
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: fileName,
          text: `SafarIndiaCabs Official GST Invoice (${booking.id})`
        });
        return 'shared';
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  // 3. Direct WhatsApp Launch with Official GST Bill PDF Link
  // Note: MainActivity.java intercepts `https://api.whatsapp.com/send?...` in `shouldOverrideUrlLoading`
  // and launches the native WhatsApp app via Intent.ACTION_VIEW without leaving the current WebView page!
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    whatsappTextWithPdfLink
  )}`;

  if (isAndroidOrWebViewEnvironment()) {
    window.location.href = whatsappShareUrl;
    return 'whatsapp_opened';
  }

  // On Desktop browsers: save the PDF file locally AND open WhatsApp Web
  try {
    doc.save(fileName);
  } catch {
    // ignore
  }
  const popup = window.open(whatsappShareUrl, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.href = whatsappShareUrl;
  }
  return 'downloaded';
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
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [shareStatusNote, setShareStatusNote] = useState<string>('');
  const [showA4PdfSheet, setShowA4PdfSheet] = useState<boolean>(true);
  const [showBillEditor, setShowBillEditor] = useState<boolean>(false);
  const [customBillOverrides, setCustomBillOverrides] = useState<Partial<BookingRecord>>({});

  if (!booking) return null;

  const effectiveBooking: BookingRecord = {
    ...booking,
    ...customBillOverrides
  };
  const itemizedBreakup = resolveItemizedInvoiceBreakup(effectiveBooking);

  const isCompleted = effectiveBooking.status === 'completed';
  const digitalTimestamp = formatDigitalSignTimestamp(effectiveBooking.pickupDate);
  const a4PreviewDataUrl = renderA4GstInvoicePreviewDataUrl(effectiveBooking);
  const directServerPdfDownloadUrl = buildServerInvoicePdfUrl(effectiveBooking, 'download');
  const directServerPdfViewUrl = buildServerInvoicePdfUrl(effectiveBooking, 'inline');

  const updateBillBreakupField = (
    field:
      | 'baseFare'
      | 'driverAllowance'
      | 'highwayToll'
      | 'statePermitTax'
      | 'hillStationCharge'
      | 'gstAmount'
      | 'advancePaid'
      | 'distanceKm',
    val: number
  ) => {
    const cleanVal = Math.max(0, Math.round(Number(val) || 0));
    const nextBase = field === 'baseFare' ? cleanVal : itemizedBreakup.baseCabFare;
    const nextDa = field === 'driverAllowance' ? cleanVal : itemizedBreakup.driverAllowance;
    const nextHwyToll = field === 'highwayToll' ? cleanVal : itemizedBreakup.highwayToll;
    const nextStateTax = field === 'statePermitTax' ? cleanVal : itemizedBreakup.statePermitTax;
    const nextHill = field === 'hillStationCharge' ? cleanVal : itemizedBreakup.hillStationCharge;
    const nextTaxable = nextBase + nextDa + nextHwyToll + nextStateTax + nextHill;
    const nextGst = field === 'gstAmount' ? cleanVal : Math.round(nextTaxable * 0.05);
    const nextTotal = nextTaxable + nextGst;
    const nextAdv =
      field === 'advancePaid'
        ? cleanVal
        : effectiveBooking.status === 'completed'
        ? nextTotal
        : Number(effectiveBooking.advancePaid || 0);
    const nextBal = effectiveBooking.status === 'completed' ? 0 : Math.max(0, nextTotal - nextAdv);

    setCustomBillOverrides((prev) => ({
      ...prev,
      ...(field === 'distanceKm' ? { distanceKm: cleanVal } : {}),
      baseFare: nextBase,
      driverAllowance: nextDa,
      highwayToll: nextHwyToll,
      statePermitTax: nextStateTax,
      tollsAndTaxes: nextHwyToll + nextStateTax,
      hillStationCharge: nextHill,
      gstAmount: nextGst,
      totalFare: nextTotal,
      advancePaid: nextAdv,
      balanceDue: nextBal
    }));
  };

  const handleSelectTripModeAndDays = (nextTripType: 'oneway' | 'roundtrip' | 'local', days: number) => {
    const cleanDays = Math.max(1, days);
    const nextDa = nextTripType === 'local' ? 0 : 260 * cleanDays;
    const nextDist =
      nextTripType === 'roundtrip'
        ? Math.max(booking.distanceKm || 250, cleanDays * 250)
        : booking.distanceKm || 230;
    const nextBase = itemizedBreakup.baseCabFare;
    const nextHwy = itemizedBreakup.highwayToll;
    const nextState = itemizedBreakup.statePermitTax;
    const nextHill = itemizedBreakup.hillStationCharge;
    const nextTaxable = nextBase + nextDa + nextHwy + nextState + nextHill;
    const nextGst = Math.round(nextTaxable * 0.05);
    const nextTotal = nextTaxable + nextGst;
    const nextAdv =
      effectiveBooking.status === 'completed' ? nextTotal : Number(effectiveBooking.advancePaid || 0);

    setCustomBillOverrides((prev) => ({
      ...prev,
      tripType: nextTripType,
      tripDays: cleanDays,
      distanceKm: nextDist,
      baseFare: nextBase,
      driverAllowance: nextDa,
      highwayToll: nextHwy,
      statePermitTax: nextState,
      tollsAndTaxes: nextHwy + nextState,
      hillStationCharge: nextHill,
      gstAmount: nextGst,
      totalFare: nextTotal,
      advancePaid: nextAdv,
      balanceDue: effectiveBooking.status === 'completed' ? 0 : Math.max(0, nextTotal - nextAdv)
    }));
  };

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    setShareStatusNote('');
    try {
      generateBookingInvoicePdf(effectiveBooking);
      setShareStatusNote(
        `Downloading Official GST Tax Invoice PDF (${effectiveBooking.id}.pdf)...`
      );
    } finally {
      setTimeout(() => setIsDownloadingPdf(false), 800);
    }
  };

  const handlePrint = () => {
    if (isAndroidOrWebViewEnvironment()) {
      handleDownloadPdf();
      return;
    }
    window.print();
  };

  const handleSharePdfOnWhatsApp = async () => {
    if (isSharingPdf) return;
    setIsSharingPdf(true);
    setShareStatusNote('');
    try {
      const result = await shareBookingInvoicePdf(effectiveBooking);
      if (result === 'downloaded') {
        setShareStatusNote(
          `GST Bill PDF (${effectiveBooking.id}.pdf) downloaded & WhatsApp opened with direct PDF Invoice link!`
        );
      } else if (result === 'whatsapp_opened') {
        setShareStatusNote(
          `Opening WhatsApp with your Official GST Invoice & PDF Bill link (${effectiveBooking.id})...`
        );
      }
    } finally {
      setIsSharingPdf(false);
    }
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
                    {isCompleted
                      ? 'A1 Cab Services • Final GST Tax Invoice'
                      : 'A1 Cab Services • Booking Confirmation Voucher'}
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
                  {isCompleted ? 'FINAL TAX INVOICE / ID' : 'BOOKING VOUCHER / ID'}
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
                    ? 'Trip Completed · Official Final GST Tax Invoice Generated'
                    : 'Booking Confirmed · Advance Confirmation Voucher (Final GST Invoice issued upon trip completion)'}
                </span>
              </span>
              <span className="text-[11px] text-slate-600 font-mono font-bold">
                Date:{' '}
                {new Date(booking.completedAt || booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Quick Top Action Bar for Mobile App & Browser: Toggle A4 PDF Sheet, Customize Bill & Round Trip Same Day, Download PDF, WhatsApp Share */}
            <div className="no-print mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1">
                <button
                  type="button"
                  onClick={() => setShowA4PdfSheet(true)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                    showA4PdfSheet
                      ? 'bg-[#0F2958] text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {isCompleted ? '📄 A4 Final GST Invoice' : '📄 A4 Booking Voucher'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowA4PdfSheet(false)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                    !showA4PdfSheet
                      ? 'bg-[#0F2958] text-white shadow-2xs'
                      : 'text-slate-700 hover:text-slate-950'
                  }`}
                >
                  📋 Breakup View
                </button>
                <button
                  type="button"
                  onClick={() => setShowBillEditor((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                    showBillEditor
                      ? 'bg-amber-400 text-slate-950 shadow-2xs'
                      : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300'
                  }`}
                >
                  ⚙️ Edit Bill / Round Trip (Same Day 1D)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={directServerPdfDownloadUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownloadPdf();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save PDF</span>
                </a>
                <button
                  type="button"
                  onClick={handleSharePdfOnWhatsApp}
                  disabled={isSharingPdf}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp PDF</span>
                </button>
              </div>
            </div>

            {/* Interactive Bill Customizer & Round-Trip Same Day (1 Day) Selector */}
            {showBillEditor && (
              <div className="no-print mt-3 p-3.5 rounded-2xl bg-slate-50 border-2 border-amber-300 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-black text-[#0F2958] uppercase tracking-wider text-[11px]">
                    Bill Section Generator &amp; Breakup Editor (Instant Live PDF Update)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomBillOverrides({})}
                    className="text-[10px] font-extrabold text-rose-700 hover:underline cursor-pointer"
                  >
                    Reset Original Values
                  </button>
                </div>

                {/* Trip Type & Round Trip Duration (Same Day 1D / 2D / 3D+) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
                    Select Trip Mode &amp; Round-Trip Duration (Same Day 1 Day Supported):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectTripModeAndDays('oneway', 1)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                        effectiveBooking.tripType === 'oneway'
                          ? 'bg-[#0F2958] text-white border-[#0F2958]'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      One-Way Drop (1 Day)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTripModeAndDays('roundtrip', 1)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                        effectiveBooking.tripType === 'roundtrip' && itemizedBreakup.tripDays === 1
                          ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400'
                      }`}
                    >
                      ★ Round Trip — Same Day Return (1 Day)
                    </button>
                    {[2, 3, 4, 5].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelectTripModeAndDays('roundtrip', d)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition cursor-pointer ${
                          effectiveBooking.tripType === 'roundtrip' && itemizedBreakup.tripDays === d
                            ? 'bg-[#0F2958] text-white border-[#0F2958]'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        Round Trip ({d} Days)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable Itemized Fare Breakup Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      1. Base Cab Fare (₹)
                    </label>
                    <input
                      type="number"
                      value={itemizedBreakup.baseCabFare}
                      onChange={(e) => updateBillBreakupField('baseFare', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      2. Driver Allowance / Bata (₹)
                    </label>
                    <input
                      type="number"
                      value={itemizedBreakup.driverAllowance}
                      onChange={(e) => updateBillBreakupField('driverAllowance', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      3. Highway FASTag Toll (₹)
                    </label>
                    <input
                      type="number"
                      value={itemizedBreakup.highwayToll}
                      onChange={(e) => updateBillBreakupField('highwayToll', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      4. State Entry Permit Tax (₹)
                    </label>
                    <input
                      type="number"
                      value={itemizedBreakup.statePermitTax}
                      onChange={(e) => updateBillBreakupField('statePermitTax', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      5. Hill Station Charge (₹)
                    </label>
                    <input
                      type="number"
                      value={itemizedBreakup.hillStationCharge}
                      onChange={(e) => updateBillBreakupField('hillStationCharge', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      Billed Distance (KM)
                    </label>
                    <input
                      type="number"
                      value={effectiveBooking.distanceKm}
                      onChange={(e) => updateBillBreakupField('distanceKm', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live High-DPI A4 GST Invoice PDF Sheet Preview (Works 100% inside Android WebView & Browsers) */}
          {showA4PdfSheet && a4PreviewDataUrl && (
            <div className="no-print px-4 sm:px-6 pt-4 pb-2 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F2958]">
                  {isCompleted
                    ? `Official A4 Final GST Tax Invoice Sheet (${booking.id}.pdf)`
                    : `Booking Confirmation Voucher Sheet (${booking.id}.pdf)`}
                </span>
                <a
                  href={directServerPdfViewUrl}
                  className="text-[11px] font-black text-blue-700 hover:underline flex items-center gap-1"
                >
                  <span>Open Full PDF File ↗</span>
                </a>
              </div>
              <div className="rounded-xl overflow-hidden border-2 border-slate-300 shadow-md bg-white">
                <img
                  src={a4PreviewDataUrl}
                  alt={`SafarIndiaCabs Official GST Invoice ${booking.id}`}
                  className="w-full h-auto block select-none"
                />
              </div>
            </div>
          )}

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

            {/* Clean Light-Theme Itemized Fare & Tax Breakup Box (Separated Rows) */}
            <div className="rounded-xl overflow-hidden border border-slate-300">
              <div className="bg-slate-100 text-[#0F2958] px-4 py-2 text-[11px] font-black uppercase tracking-wider flex items-center justify-between border-b border-slate-300">
                <span>Itemized Fare &amp; Tax Breakup ({itemizedBreakup.tripTypeBadge})</span>
                <span>Amount (INR)</span>
              </div>

              <div className="p-4 bg-white space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span>1. Base Cab &amp; Fuel Charges ({effectiveBooking.distanceKm} KM Included):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatINR(itemizedBreakup.baseCabFare)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>
                    2. Chauffeur / Driver Allowance (Daily Bata • {itemizedBreakup.tripDays}{' '}
                    {itemizedBreakup.tripDays === 1 ? 'Day' : 'Days'}):
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatINR(itemizedBreakup.driverAllowance)} (Included)
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>3. Highway FASTag Toll Tax:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {itemizedBreakup.highwayToll > 0
                      ? `${formatINR(itemizedBreakup.highwayToll)} (Included)`
                      : '₹0 (As Applicable)'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>4. State Border Entry Permit Tax:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {itemizedBreakup.statePermitTax > 0
                      ? `${formatINR(itemizedBreakup.statePermitTax)} (Included)`
                      : '₹0 (Included)'}
                  </span>
                </div>

                {itemizedBreakup.hillStationCharge > 0 && (
                  <div className="flex justify-between items-center text-slate-700">
                    <span>5. Hill Station / Mountain Drive Allowance:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatINR(itemizedBreakup.hillStationCharge)} (Included)
                    </span>
                  </div>
                )}

                {itemizedBreakup.extraKmCharge > 0 && (
                  <div className="flex justify-between items-center text-amber-900 bg-amber-50/70 px-2 py-1 rounded">
                    <span className="font-semibold">
                      Post-Trip Extra Distance ({itemizedBreakup.extraKmDriven} Extra KM Driven):
                    </span>
                    <span className="font-mono font-bold">
                      + {formatINR(itemizedBreakup.extraKmCharge)}
                    </span>
                  </div>
                )}

                {itemizedBreakup.extraTollCharges > 0 && (
                  <div className="flex justify-between items-center text-amber-900 bg-amber-50/70 px-2 py-1 rounded">
                    <span className="font-semibold">Post-Trip Extra Highway Toll Charges:</span>
                    <span className="font-mono font-bold">
                      + {formatINR(itemizedBreakup.extraTollCharges)}
                    </span>
                  </div>
                )}

                {itemizedBreakup.otherSurcharges > 0 && (
                  <div className="flex justify-between items-center text-amber-900 bg-amber-50/70 px-2 py-1 rounded">
                    <span className="font-semibold">Other Post-Trip Surcharges (Parking / Waiting):</span>
                    <span className="font-mono font-bold">
                      + {formatINR(itemizedBreakup.otherSurcharges)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-100">
                  <span>CGST @ 2.5% + SGST @ 2.5% (SAC 996412):</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatINR(itemizedBreakup.cgst)} + {formatINR(itemizedBreakup.sgst)} ={' '}
                    {formatINR(itemizedBreakup.gstAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-800 pt-1.5 border-t border-slate-200">
                  <span className="font-bold">
                    {isCompleted
                      ? 'Final GST Tax Invoice Total (Incl. 5% GST):'
                      : 'Estimated Total Trip Fare (Incl. 5% GST):'}
                  </span>
                  <span className="text-base font-black text-slate-950 font-mono">
                    INR {Number(itemizedBreakup.totalFare || 0).toLocaleString('en-IN')}.00
                  </span>
                </div>

                <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/80 px-3 py-2 rounded-lg border border-emerald-200">
                  <span className="font-bold">
                    {isCompleted ? 'Total Amount Paid (100% Settled):' : 'Advance Paid Online:'}
                  </span>
                  <span className="font-black font-mono text-sm">
                    {formatINR(isCompleted ? itemizedBreakup.totalFare : effectiveBooking.advancePaid)} ✓
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-950 bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-300">
                  <span className="font-black text-[#0F2958]">
                    {isCompleted ? 'Remaining Balance (Settled):' : 'Remaining Balance (Payable to Driver):'}
                  </span>
                  <span className="font-black text-amber-900 text-sm font-mono">
                    {formatINR(effectiveBooking.balanceDue)}
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

          {shareStatusNote && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{shareStatusNote}</span>
            </div>
          )}

          {/* Primary Row: Download PDF Invoice + Share Receipt PDF on WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                {isDownloadingPdf
                  ? 'Generating PDF...'
                  : isCompleted
                  ? 'Download Final GST Tax Invoice (PDF)'
                  : 'Download Booking Voucher (PDF)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSharePdfOnWhatsApp}
              disabled={isSharingPdf}
              className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-white shrink-0" />
              <span>
                {isSharingPdf
                  ? 'Preparing PDF...'
                  : isCompleted
                  ? 'Share Final GST Invoice on WhatsApp'
                  : 'Share Booking Voucher on WhatsApp'}
              </span>
            </button>
          </div>

          {/* Secondary Row: Send Review Request, Share PDF Receipt, Print, or View Rides */}
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
                onClick={(e) => {
                  if (isAndroidOrWebViewEnvironment()) {
                    e.preventDefault();
                    window.location.href = buildCustomerReviewWhatsAppUrl({
                      customerName: booking.customerName,
                      customerPhone: booking.customerPhone,
                      pickupCity: booking.pickupCity,
                      dropCity: booking.dropCity,
                      bookingId: booking.id
                    });
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                <span>Send Review Request (+91 {booking.customerPhone})</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleSharePdfOnWhatsApp}
              disabled={isSharingPdf}
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isSharingPdf ? 'Sharing PDF...' : 'WhatsApp PDF Receipt'}</span>
            </button>

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
