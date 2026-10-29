import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  MessageSquare,
  User,
  Car,
  IndianRupee,
  Stamp,
  PenTool,
  History,
  ShieldCheck
} from 'lucide-react';
import { BookingRecord } from '../types';
import { triggerWhatsAppDeepLink, buildWhatsAppSchemeUrl } from '../utils/whatsapp';
import {
  OFFICIAL_AMAN_MISHRA_SIGNATURE_DATA_URL,
  OFFICIAL_SAFAR_LOGO_DATA_URL
} from '../utils/officialSignatureData';

export interface CustomBillData {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  bookingRef: string;
  paymentStatus: 'PAID IN FULL' | 'PARTIALLY PAID' | 'CORPORATE CREDIT';
  paymentMode: string;
  transactionRef: string;

  // Company (Seller) Details
  companyName: string;
  companyGstin: string;
  proprietorName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  sacCode: string;

  // Customer / Corporate Claim Details
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCompany: string;
  customerGstin: string;
  employeeIdOrDept: string;
  customerAddress: string;

  // Journey & Vehicle Details
  tripType: string;
  pickupLocation: string;
  dropLocation: string;
  viaRoute: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  vehicleModel: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  totalKm: number;
  totalDays: number;

  // Fare Breakdown
  baseFare: number;
  driverAllowance: number;
  tollStateTax: number;
  parkingCharges: number;
  nightWaitingCharges: number;
  discountAmount: number;
  gstMode: 'included_5' | 'extra_5' | 'exempt_0';
  taxType: 'cgst_sgst' | 'igst';
  advancePaid: number;
  notes: string;
  digitalSignTimestamp: string;
  createdAt: string;
}

const STORAGE_KEY_BILLS = 'safar_custom_generated_bills_v2';
const STORAGE_KEY_SIGNATURE = 'safar_owner_custom_signature_v1';
const STORAGE_KEY_STAMP_STYLE = 'safar_owner_stamp_style_v1';

export const OFFICIAL_COMPANY_DEFAULTS = {
  companyName: 'SafarIndiaCabs',
  companyGstin: '07DQHPA3025F1ZD',
  proprietorName: 'Aman Mishra',
  companyEmail: 'Safarindiacabs01@gmail.com',
  companyPhone: '7710080992',
  companyAddress: 'H NO 143 STREET 4 JHARODA MAJRA NORTH DELHI BURARI 110084',
  sacCode: '996412'
};

export function formatDigitalSignTimestamp(dateObj = new Date()): string {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const ss = String(dateObj.getSeconds()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss} IST`;
}

/**
 * Converts a non-negative integer into Indian English words for GST Invoices
 */
export function numberToIndianWords(amount: number): string {
  const num = Math.round(Math.max(0, amount));
  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o ? ' ' + ones[o] : ''}`;
  };

  const parts: string[] = [];
  let rem = num;

  const crore = Math.floor(rem / 10000000);
  if (crore > 0) {
    parts.push(`${twoDigits(crore)} Crore`);
    rem %= 10000000;
  }

  const lakh = Math.floor(rem / 100000);
  if (lakh > 0) {
    parts.push(`${twoDigits(lakh)} Lakh`);
    rem %= 100000;
  }

  const thousand = Math.floor(rem / 1000);
  if (thousand > 0) {
    parts.push(`${twoDigits(thousand)} Thousand`);
    rem %= 1000;
  }

  const hundred = Math.floor(rem / 100);
  if (hundred > 0) {
    parts.push(`${ones[hundred]} Hundred`);
    rem %= 100;
  }

  if (rem > 0) {
    if (parts.length > 0) parts.push('and');
    parts.push(twoDigits(rem));
  }

  return `Rupees ${parts.join(' ')} Only`;
}

/**
 * Generates a realistic high-DPI PNG data URL of the official SafarIndiaCabs Rubber Stamp ("Mohar")
 */
export function renderOfficialRubberStampDataUrl(
  style: 'circular' | 'rectangular' = 'circular',
  companyName = OFFICIAL_COMPANY_DEFAULTS.companyName,
  gstin = OFFICIAL_COMPANY_DEFAULTS.companyGstin,
  proprietor = OFFICIAL_COMPANY_DEFAULTS.proprietorName
): string {
  const canvas = document.createElement('canvas');
  if (style === 'rectangular') {
    canvas.width = 520;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.save();
    ctx.translate(260, 120);
    ctx.rotate(-0.035);

    const inkColor = '#1E3A8A';
    ctx.strokeStyle = inkColor;
    ctx.fillStyle = inkColor;

    ctx.lineWidth = 6;
    ctx.strokeRect(-235, -95, 470, 190);
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-225, -85, 450, 170);

    ctx.font = '900 26px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`For ${companyName.toUpperCase()}`, 0, -48);

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-200, -34);
    ctx.lineTo(200, -34);
    ctx.stroke();

    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText(`GSTIN: ${gstin}  •  NORTH DELHI - 110084`, 0, -10);

    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText('JHARODA MAJRA, BURARI • MOB: 7710080992', 0, 14);

    ctx.font = '900 17px Arial, sans-serif';
    ctx.fillText(`PROP. ${proprietor.toUpperCase()} (AUTHORISED SIGNATORY)`, 0, 66);

    ctx.restore();
    return canvas.toDataURL('image/png');
  }

  // Circular Indian Official Rubber Stamp ("Gol Mohar")
  canvas.width = 420;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cx = 210;
  const cy = 210;
  const ink = '#1D4ED8';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.07);

  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;

  // Outer thick ring
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 182, 0, Math.PI * 2);
  ctx.stroke();

  // Outer thin ring
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 170, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 118, 0, Math.PI * 2);
  ctx.stroke();

  const drawTopArcText = (text: string, radius: number, startAngle: number, endAngle: number, fontSize: number) => {
    ctx.save();
    ctx.font = `900 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const totalAngle = endAngle - startAngle;
    const step = totalAngle / Math.max(1, text.length - 1);
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + i * step;
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -radius);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  const drawBottomArcText = (
    text: string,
    radius: number,
    startAngle: number,
    endAngle: number,
    fontSize: number
  ) => {
    ctx.save();
    ctx.font = `800 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const totalAngle = endAngle - startAngle;
    const step = totalAngle / Math.max(1, text.length - 1);
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle - i * step;
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, radius);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  drawTopArcText('★ SAFAR INDIA CABS ★', 144, -Math.PI * 0.72, Math.PI * 0.72, 22);
  drawBottomArcText('NORTH DELHI - 110084', 144, Math.PI * 0.66, -Math.PI * 0.66, 18);

  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fillRect(-114, -40, 228, 80);
  ctx.strokeRect(-114, -40, 228, 80);

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = '900 13.5px Arial, sans-serif';
  ctx.fillText(`GSTIN: ${gstin}`, 0, -16);

  ctx.font = 'bold 12.5px Arial, sans-serif';
  ctx.fillText('VERIFIED TAX INVOICE', 0, 5);

  ctx.font = '900 13.5px Arial, sans-serif';
  ctx.fillText(`PROP: ${proprietor.toUpperCase()}`, 0, 26);

  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('A1 CAB SERVICES', 0, -68);
  ctx.fillText('MOB: 7710080992', 0, 76);

  ctx.restore();
  return canvas.toDataURL('image/png');
}

/**
 * Returns the pre-filled authentic handwritten signature of Proprietor Aman Mishra
 */
export function renderDefaultProprietorSignatureDataUrl(_name = 'Aman Mishra'): string {
  return OFFICIAL_AMAN_MISHRA_SIGNATURE_DATA_URL;
}

/**
 * Processes an uploaded signature photo/scan to make light/white paper background transparent
 */
function processUploadedSignatureImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 500;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;
          if (brightness > 215) {
            data[i + 3] = 0;
          } else if (brightness > 185) {
            data[i + 3] = Math.round(((215 - brightness) / 30) * 255);
          }
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function calculateBillTotals(bill: CustomBillData) {
  const grossItems =
    Number(bill.baseFare || 0) +
    Number(bill.driverAllowance || 0) +
    Number(bill.tollStateTax || 0) +
    Number(bill.parkingCharges || 0) +
    Number(bill.nightWaitingCharges || 0);

  const discount = Number(bill.discountAmount || 0);
  const netBeforeTax = Math.max(0, grossItems - discount);

  let taxableAmount = netBeforeTax;
  let totalGst = 0;
  let grandTotal = netBeforeTax;

  if (bill.gstMode === 'extra_5') {
    taxableAmount = netBeforeTax;
    totalGst = Math.round(netBeforeTax * 0.05);
    grandTotal = taxableAmount + totalGst;
  } else if (bill.gstMode === 'included_5') {
    grandTotal = netBeforeTax;
    taxableAmount = Math.round(grandTotal / 1.05);
    totalGst = grandTotal - taxableAmount;
  } else {
    taxableAmount = netBeforeTax;
    totalGst = 0;
    grandTotal = netBeforeTax;
  }

  const cgst = bill.taxType === 'cgst_sgst' ? Math.floor(totalGst / 2) : 0;
  const sgst = bill.taxType === 'cgst_sgst' ? totalGst - cgst : 0;
  const igst = bill.taxType === 'igst' ? totalGst : 0;

  const advance =
    bill.paymentStatus === 'PAID IN FULL'
      ? grandTotal
      : Math.min(grandTotal, Math.max(0, Number(bill.advancePaid || 0)));
  const balanceDue = Math.max(0, grandTotal - advance);

  return {
    grossItems,
    discount,
    taxableAmount,
    totalGst,
    cgst,
    sgst,
    igst,
    grandTotal,
    advance,
    balanceDue,
    amountInWords: numberToIndianWords(grandTotal)
  };
}

/**
 * Generates and downloads a clean, professional Light-Theme Corporate A4 GST Tax Invoice PDF
 * featuring the SafarIndiaCabs Logo, Itemized Table, "Digitally signed by..." block,
 * Official Blue Rubber Mohar, and Proprietor Aman Mishra's Handwritten Signature.
 */
export async function downloadCustomBillPdf(
  bill: CustomBillData,
  signatureDataUrl?: string,
  stampStyle: 'circular' | 'rectangular' = 'circular'
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const totals = calculateBillTotals(bill);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Outer clean corporate page border on crisp white sheet
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(margin - 2, 8, contentWidth + 4, pageHeight - 16);

  // Top Amber-Gold & Royal Blue Accent Hairline at very top of invoice box
  doc.setFillColor(15, 23, 42);
  doc.rect(margin - 2, 8, (contentWidth + 4) * 0.68, 2.2, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(margin - 2 + (contentWidth + 4) * 0.68, 8, (contentWidth + 4) * 0.32, 2.2, 'F');

  let y = 14;

  // 1. LIGHT-THEME EXECUTIVE HEADER: Official Logo (Left) + Company Details (Center-Left) + Tax Invoice Box (Right)
  try {
    if (OFFICIAL_SAFAR_LOGO_DATA_URL) {
      doc.addImage(OFFICIAL_SAFAR_LOGO_DATA_URL, 'PNG', margin, y, 28, 28);
    }
  } catch {}

  const compX = margin + 31;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17.5);
  doc.text(bill.companyName.toUpperCase(), compX, y + 6.5);

  doc.setTextColor(180, 83, 9);
  doc.setFontSize(8.2);
  doc.text('A1 COMMERCIAL CAB & CORPORATE TRAVEL SERVICES • NORTH INDIA', compX, y + 11.2);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);
  doc.text(`GSTIN: ${bill.companyGstin}   |   Proprietor: ${bill.proprietorName}`, compX, y + 16.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(`Regd. Address: ${bill.companyAddress}`, compX, y + 21.3);
  doc.text(
    `Phone / WhatsApp: +91 ${bill.companyPhone}   |   Email: ${bill.companyEmail}   |   Web: www.safarindiacabs.com`,
    compX,
    y + 26
  );

  // Right Box: Light-Themed "TAX INVOICE" Metadata Card
  const invBoxW = 60;
  const invBoxX = pageWidth - margin - invBoxW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(invBoxX, y, invBoxW, 28, 2, 2, 'FD');

  doc.setFillColor(254, 243, 199);
  doc.roundedRect(invBoxX, y, invBoxW, 7.5, 2, 2, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text('GST TAX INVOICE', invBoxX + invBoxW / 2, y + 5.1, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(`Invoice No: ${bill.invoiceNo}`, invBoxX + 3, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Invoice Date: ${bill.invoiceDate}`, invBoxX + 3, y + 18);
  doc.text(`Duty / Ref ID: ${bill.bookingRef}`, invBoxX + 3, y + 22.5);
  doc.text(`SAC Code: ${bill.sacCode} (Cab Service)`, invBoxX + 3, y + 26.5);

  y += 32;

  // Horizontal Separator
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // 2. Two-Column Light-Theme Cards: Billed To (Customer/Company) & Trip / Vehicle Details
  const colW = (contentWidth - 4) / 2;

  // Left Box: Billed To
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, colW, 38, 1.8, 1.8, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, colW, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 7, margin + colW, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('BILLED TO (PASSENGER / CORPORATE DETAILS)', margin + 3, y + 4.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.8);
  doc.text(bill.customerName || 'Valued Passenger', margin + 3, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.1);
  doc.setTextColor(51, 65, 85);
  let custY = y + 18;
  if (bill.customerCompany) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Company: ${bill.customerCompany}`, margin + 3, custY);
    doc.setFont('helvetica', 'normal');
    custY += 4.8;
  }
  if (bill.customerGstin) {
    doc.text(`Customer GSTIN: ${bill.customerGstin}`, margin + 3, custY);
    custY += 4.8;
  }
  if (bill.employeeIdOrDept) {
    doc.text(`Employee ID / Dept: ${bill.employeeIdOrDept}`, margin + 3, custY);
    custY += 4.8;
  }
  doc.text(
    `Mobile: ${bill.customerPhone ? '+91 ' + bill.customerPhone : 'N/A'}${
      bill.customerEmail ? '  |  ' + bill.customerEmail : ''
    }`,
    margin + 3,
    custY
  );
  if (bill.customerAddress && custY + 4.8 <= y + 36) {
    const addrLines = doc.splitTextToSize(`Address: ${bill.customerAddress}`, colW - 6);
    doc.text(addrLines[0], margin + 3, custY + 4.8);
  }

  // Right Box: Vehicle & Trip Details
  const rightX = margin + colW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, y, colW, 38, 1.8, 1.8, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(rightX, y, colW, 7, 'F');
  doc.line(rightX, y + 7, rightX + colW, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('VEHICLE, CHAUFFEUR & JOURNEY SUMMARY', rightX + 3, y + 4.8);

  doc.setFontSize(9.2);
  doc.text(`Vehicle: ${(bill.vehicleModel || 'Sedan AC').slice(0, 38)}`, rightX + 3, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.1);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Vehicle Reg. No: ${bill.vehicleNumber || 'Commercial Cab'}   |   Duty: ${bill.tripType}`,
    rightX + 3,
    y + 18
  );
  doc.text(
    `Chauffeur: ${bill.driverName || 'Verified Chauffeur'}${
      bill.driverPhone ? ' (+91 ' + bill.driverPhone + ')' : ''
    }`,
    rightX + 3,
    y + 22.8
  );
  doc.text(
    `Travel Date: ${bill.pickupDate}${bill.pickupTime ? ' at ' + bill.pickupTime : ''}${
      bill.returnDate ? ' to ' + bill.returnDate : ''
    }`,
    rightX + 3,
    y + 27.6
  );
  doc.text(
    `Total Distance: ${bill.totalKm || 0} KM   |   Duration: ${bill.totalDays || 1} Day(s)`,
    rightX + 3,
    y + 32.4
  );

  y += 42;

  // 3. Light-Themed Route Itinerary Strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 16, 1.8, 1.8, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('PICKUP LOCATION:', margin + 3, y + 6.2);
  doc.setFont('helvetica', 'normal');
  doc.text((bill.pickupLocation || '-').slice(0, 82), margin + 34, y + 6.2);

  doc.setFont('helvetica', 'bold');
  doc.text('DROP LOCATION:', margin + 3, y + 12.2);
  doc.setFont('helvetica', 'normal');
  const dropWithVia = `${bill.dropLocation || '-'}${bill.viaRoute ? ` (Via: ${bill.viaRoute})` : ''}`;
  doc.text(dropWithVia.slice(0, 82), margin + 34, y + 12.2);

  y += 20;

  // 4. Clean Light-Themed Itemized GST Invoice Table
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, y, contentWidth, 8, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text('S.NO', margin + 3, y + 5.3);
  doc.text('DESCRIPTION OF CAB / TRAVEL SERVICE', margin + 15, y + 5.3);
  doc.text('SAC CODE', pageWidth - margin - 52, y + 5.3);
  doc.text('AMOUNT (INR)', pageWidth - margin - 3.5, y + 5.3, { align: 'right' });

  y += 8;

  const lineItems: Array<{ desc: string; amount: number }> = [
    {
      desc: `Cab Hire / Trip Charges (${bill.tripType} — ${bill.pickupLocation} to ${bill.dropLocation}, ${bill.totalKm} KM, ${bill.totalDays} Day${bill.totalDays > 1 ? 's' : ''})`,
      amount:
        bill.gstMode === 'included_5'
          ? Math.max(
              0,
              totals.taxableAmount -
                Number(bill.driverAllowance || 0) -
                Number(bill.tollStateTax || 0) -
                Number(bill.parkingCharges || 0) -
                Number(bill.nightWaitingCharges || 0) +
                Number(bill.discountAmount || 0)
            )
          : Number(bill.baseFare || 0)
    }
  ];

  if (Number(bill.driverAllowance) > 0) {
    lineItems.push({
      desc: 'Chauffeur / Driver Allowance (Bhatta)',
      amount: Number(bill.driverAllowance)
    });
  }
  if (Number(bill.tollStateTax) > 0) {
    lineItems.push({
      desc: 'Highway Toll Tax & Inter-State Entry Permit Charges',
      amount: Number(bill.tollStateTax)
    });
  }
  if (Number(bill.parkingCharges) > 0) {
    lineItems.push({
      desc: 'Airport / Station / Commercial Parking Charges',
      amount: Number(bill.parkingCharges)
    });
  }
  if (Number(bill.nightWaitingCharges) > 0) {
    lineItems.push({
      desc: 'Waiting / Extra Duty / Night Halt Charges',
      amount: Number(bill.nightWaitingCharges)
    });
  }
  if (Number(bill.discountAmount) > 0) {
    lineItems.push({
      desc: 'Special Corporate / Promotional Discount',
      amount: -Number(bill.discountAmount)
    });
  }

  lineItems.forEach((item, idx) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 8, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.text(String(idx + 1), margin + 4, y + 5.3);
    doc.text(item.desc.slice(0, 74), margin + 15, y + 5.3);
    doc.text(bill.sacCode, pageWidth - margin - 48, y + 5.3);

    doc.setFont('helvetica', 'bold');
    const formattedAmt =
      item.amount < 0
        ? `- INR ${Math.abs(item.amount).toLocaleString('en-IN')}.00`
        : `INR ${item.amount.toLocaleString('en-IN')}.00`;
    doc.text(formattedAmt, pageWidth - margin - 3.5, y + 5.3, { align: 'right' });
    y += 8;
  });

  // Tax & Summary Rows
  const summaryRows: Array<{ label: string; value: string; bold?: boolean; highlight?: 'total' | 'paid' }> = [
    {
      label: 'Taxable Service Value',
      value: `INR ${totals.taxableAmount.toLocaleString('en-IN')}.00`,
      bold: true
    }
  ];

  if (bill.gstMode !== 'exempt_0') {
    if (bill.taxType === 'cgst_sgst') {
      summaryRows.push(
        {
          label: 'CGST @ 2.5% (Central Goods & Services Tax)',
          value: `INR ${totals.cgst.toLocaleString('en-IN')}.00`
        },
        {
          label: 'SGST @ 2.5% (State Goods & Services Tax)',
          value: `INR ${totals.sgst.toLocaleString('en-IN')}.00`
        }
      );
    } else {
      summaryRows.push({
        label: 'IGST @ 5.0% (Integrated Goods & Services Tax)',
        value: `INR ${totals.igst.toLocaleString('en-IN')}.00`
      });
    }
  }

  summaryRows.push(
    {
      label: 'TOTAL INVOICE AMOUNT',
      value: `INR ${totals.grandTotal.toLocaleString('en-IN')}.00`,
      bold: true,
      highlight: 'total'
    },
    {
      label: `Amount Settled (${bill.paymentMode}${bill.transactionRef ? ' - Ref: ' + bill.transactionRef : ''})`,
      value: `INR ${totals.advance.toLocaleString('en-IN')}.00 (${bill.paymentStatus})`,
      bold: true,
      highlight: 'paid'
    },
    {
      label: 'Balance Payable',
      value:
        totals.balanceDue === 0
          ? 'INR 0.00 (NIL - PAID IN FULL)'
          : `INR ${totals.balanceDue.toLocaleString('en-IN')}.00`,
      bold: true
    }
  );

  for (const row of summaryRows) {
    if (row.highlight === 'total') {
      doc.setFillColor(248, 250, 252);
    } else if (row.highlight === 'paid') {
      doc.setFillColor(240, 253, 244);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 7.8, 'FD');

    if (row.highlight === 'paid') {
      doc.setTextColor(21, 128, 61);
    } else {
      doc.setTextColor(15, 23, 42);
    }

    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(row.highlight === 'total' ? 9.5 : row.bold ? 8.6 : 8.2);
    doc.text(row.label, margin + 15, y + 5.2);
    doc.text(row.value, pageWidth - margin - 3.5, y + 5.2, { align: 'right' });
    y += 7.8;
  }

  // Amount in Words Bar
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 8, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.text(`Amount in Words: ${totals.amountInWords}`, margin + 3.5, y + 5.3);

  y += 11;

  // 5. THREE-COLUMN CORPORATE VERIFICATION FOOTER:
  // Col 1: Reimbursement Declaration | Col 2: "Digitally signed by..." Block | Col 3: Official Rubber Mohar + Signature
  const signBoxHeight = 52;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, signBoxHeight, 2, 2, 'FD');

  const col1W = contentWidth * 0.37;
  const col2W = contentWidth * 0.31;
  const split1X = margin + col1W;
  const split2X = split1X + col2W;

  doc.line(split1X, y, split1X, y + signBoxHeight);
  doc.line(split2X, y, split2X, y + signBoxHeight);

  // Column 1: Terms & Declaration
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DECLARATION & TERMS:', margin + 3, y + 6.5);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  const terms = [
    '1. Certified that the particulars given above are true and correct for corporate travel claim.',
    `2. Regd. Office: ${bill.companyAddress}.`,
    `3. GSTIN: ${bill.companyGstin} | SAC: ${bill.sacCode}.`,
    '4. Subject to North Delhi Jurisdiction. E. & O.E.',
    bill.notes ? `5. ${bill.notes}` : '5. Thank you for riding with SafarIndiaCabs!'
  ];
  let termY = y + 12;
  terms.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, col1W - 5);
    doc.text(wrapped.slice(0, 2), margin + 3, termY);
    termY += wrapped.length > 1 ? 7.2 : 5.2;
  });

  // Column 2: Exact Corporate "Digitally signed by..." Block (as requested from screenshot)
  const digX = split1X + 3.5;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  const digitalTimestamp = bill.digitalSignTimestamp || formatDigitalSignTimestamp();
  const digLines = [
    `Digitally signed by ${bill.companyName.toUpperCase()}`,
    `(${bill.proprietorName.toUpperCase()})`,
    `GSTIN: ${bill.companyGstin}`,
    `Date: ${digitalTimestamp}`,
    'Location: IN (North Delhi)'
  ];
  let digY = y + 12;
  digLines.forEach((dl) => {
    const wrapped = doc.splitTextToSize(dl, col2W - 6);
    doc.text(wrapped, digX, digY);
    digY += wrapped.length * 4.5 + 1.2;
  });

  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.text('✓ Digitally Verified Tax Invoice', digX, y + 46.5);

  // Column 3: Official Rubber Mohar + Proprietor Aman Mishra Handwritten Signature
  const rightCenter = split2X + (contentWidth - col1W - col2W) / 2;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.text(`For ${bill.companyName.toUpperCase()}`, rightCenter, y + 6, { align: 'center' });

  try {
    const stampUrl = renderOfficialRubberStampDataUrl(
      stampStyle,
      bill.companyName,
      bill.companyGstin,
      bill.proprietorName
    );
    if (stampUrl) {
      if (stampStyle === 'circular') {
        doc.addImage(stampUrl, 'PNG', split2X + 3, y + 8.5, 29, 29);
      } else {
        doc.addImage(stampUrl, 'PNG', split2X + 3, y + 12, 42, 20);
      }
    }

    const sigUrl = signatureDataUrl || renderDefaultProprietorSignatureDataUrl(bill.proprietorName);
    if (sigUrl) {
      doc.addImage(sigUrl, 'PNG', split2X + 20, y + 14.5, 36, 14);
    }
  } catch {}

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Prop. ${bill.proprietorName}`, rightCenter, y + 43.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Authorised Signatory & Seal', rightCenter, y + 48, { align: 'center' });

  doc.save(`SafarIndiaCabs_GST_Invoice_${bill.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}

interface OwnerBillGeneratorProps {
  isDark?: boolean;
  prefillBooking?: BookingRecord | null;
  onClearPrefill?: () => void;
}

export const OwnerBillGenerator: React.FC<OwnerBillGeneratorProps> = ({
  isDark = false,
  prefillBooking,
  onClearPrefill
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const createFreshBill = (booking?: BookingRecord | null): CustomBillData => {
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const nowStamp = formatDigitalSignTimestamp();
    if (booking) {
      return {
        id: `BILL-${Date.now()}`,
        invoiceNo: `SIC-2026-${booking.id.replace('SIC-', '')}`,
        invoiceDate: todayStr,
        bookingRef: booking.id,
        paymentStatus: 'PAID IN FULL',
        paymentMode: 'UPI / Online Verified',
        transactionRef: booking.transactionId || '',
        ...OFFICIAL_COMPANY_DEFAULTS,
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        customerEmail: booking.customerEmail || '',
        customerCompany: booking.gstCompanyName || '',
        customerGstin: booking.customerGst || '',
        employeeIdOrDept: '',
        customerAddress: booking.pickupAddress || '',
        tripType:
          booking.tripType === 'roundtrip'
            ? 'Round-Trip Outstation'
            : booking.tripType === 'airport'
            ? 'Airport Transfer'
            : booking.tripType === 'local'
            ? 'Local Rental'
            : 'One-Way Outstation',
        pickupLocation: `${booking.pickupAddress ? booking.pickupAddress + ', ' : ''}${booking.pickupCity}`,
        dropLocation: `${booking.dropAddress ? booking.dropAddress + ', ' : ''}${booking.dropCity}`,
        viaRoute: '',
        pickupDate: booking.pickupDate || todayStr,
        pickupTime: booking.pickupTime || '09:00 AM',
        returnDate: booking.returnDate || '',
        returnTime: booking.returnTime || '',
        vehicleModel: booking.driverVehicleModel || booking.cabName || 'Sedan AC (Dzire / Etios)',
        vehicleNumber: booking.driverVehicleNo || 'DL1ZC-4474',
        driverName: booking.driverName || 'Verified Chauffeur',
        driverPhone: booking.driverPhone || '',
        totalKm: booking.distanceKm || 250,
        totalDays: booking.days || 1,
        baseFare: booking.baseFare || booking.totalFare || 3500,
        driverAllowance: booking.driverAllowance || 0,
        tollStateTax: booking.tollsAndTaxes || 0,
        parkingCharges: 0,
        nightWaitingCharges: 0,
        discountAmount: booking.discountAmount || 0,
        gstMode: 'included_5',
        taxType: 'cgst_sgst',
        advancePaid: booking.totalFare || 3500,
        notes: 'Official GST Tax Invoice issued for corporate travel reimbursement.',
        digitalSignTimestamp: nowStamp,
        createdAt: new Date().toISOString()
      };
    }

    return {
      id: `BILL-${Date.now()}`,
      invoiceNo: `SIC-2026-${randSuffix}`,
      invoiceDate: todayStr,
      bookingRef: `SIC-${randSuffix}`,
      paymentStatus: 'PAID IN FULL',
      paymentMode: 'UPI / Cash / Online',
      transactionRef: '',
      ...OFFICIAL_COMPANY_DEFAULTS,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerCompany: '',
      customerGstin: '',
      employeeIdOrDept: '',
      customerAddress: '',
      tripType: 'One-Way Outstation',
      pickupLocation: 'New Delhi',
      dropLocation: 'Chandigarh',
      viaRoute: '',
      pickupDate: todayStr,
      pickupTime: '08:00 AM',
      returnDate: '',
      returnTime: '',
      vehicleModel: 'Sedan AC (Swift Dzire / Toyota Etios)',
      vehicleNumber: 'DL1ZC-8492',
      driverName: '',
      driverPhone: '',
      totalKm: 250,
      totalDays: 1,
      baseFare: 3500,
      driverAllowance: 0,
      tollStateTax: 0,
      parkingCharges: 0,
      nightWaitingCharges: 0,
      discountAmount: 0,
      gstMode: 'included_5',
      taxType: 'cgst_sgst',
      advancePaid: 3500,
      notes: 'Official Tax Invoice for Official / Personal Travel Claim & Company Reimbursement.',
      digitalSignTimestamp: nowStamp,
      createdAt: new Date().toISOString()
    };
  };

  const [bill, setBill] = useState<CustomBillData>(() => createFreshBill(prefillBooking));
  const [savedBills, setSavedBills] = useState<CustomBillData[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BILLS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [customSignatureUrl, setCustomSignatureUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SIGNATURE) || '';
    } catch {
      return '';
    }
  });

  const [stampStyle, setStampStyle] = useState<'circular' | 'rectangular'>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_STAMP_STYLE);
      return s === 'rectangular' ? 'rectangular' : 'circular';
    } catch {
      return 'circular';
    }
  });

  const [stampPreviewUrl, setStampPreviewUrl] = useState<string>('');
  const [defaultSigPreviewUrl, setDefaultSigPreviewUrl] = useState<string>('');
  const [statusBanner, setStatusBanner] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefillBooking) {
      setBill(createFreshBill(prefillBooking));
      setStatusBanner(`Loaded details from Booking #${prefillBooking.id} (${prefillBooking.customerName})!`);
      setTimeout(() => setStatusBanner(''), 4000);
      if (onClearPrefill) onClearPrefill();
    }
  }, [prefillBooking]);

  useEffect(() => {
    setStampPreviewUrl(
      renderOfficialRubberStampDataUrl(
        stampStyle,
        bill.companyName,
        bill.companyGstin,
        bill.proprietorName
      )
    );
    setDefaultSigPreviewUrl(renderDefaultProprietorSignatureDataUrl(bill.proprietorName));
  }, [stampStyle, bill.companyName, bill.companyGstin, bill.proprietorName]);

  const activeSignatureUrl = customSignatureUrl || defaultSigPreviewUrl;
  const totals = calculateBillTotals(bill);

  const handleFieldChange = <K extends keyof CustomBillData>(key: K, value: CustomBillData[K]) => {
    setBill((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await processUploadedSignatureImage(file);
      setCustomSignatureUrl(processed);
      localStorage.setItem(STORAGE_KEY_SIGNATURE, processed);
      setStatusBanner('Custom signature uploaded & applied!');
      setTimeout(() => setStatusBanner(''), 4000);
    } catch {
      setStatusBanner('Could not process signature image. Using official Aman Mishra signature.');
    }
  };

  const handleResetToDefaultSignature = () => {
    setCustomSignatureUrl('');
    try {
      localStorage.removeItem(STORAGE_KEY_SIGNATURE);
    } catch {}
    setStatusBanner('Reset to pre-filled Aman Mishra official signature.');
    setTimeout(() => setStatusBanner(''), 3000);
  };

  const handleToggleStampStyle = (nextStyle: 'circular' | 'rectangular') => {
    setStampStyle(nextStyle);
    try {
      localStorage.setItem(STORAGE_KEY_STAMP_STYLE, nextStyle);
    } catch {}
  };

  const handleSaveBillToHistory = () => {
    const updated = [bill, ...savedBills.filter((b) => b.invoiceNo !== bill.invoiceNo)].slice(0, 50);
    setSavedBills(updated);
    try {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(updated));
    } catch {}
    setStatusBanner(`Bill ${bill.invoiceNo} saved to Owner Bill History!`);
    setTimeout(() => setStatusBanner(''), 3500);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      handleSaveBillToHistory();
      await downloadCustomBillPdf(bill, activeSignatureUrl, stampStyle);
      setStatusBanner(
        `Downloaded Light-Theme Professional GST Invoice (${bill.invoiceNo}) with Logo, Digital Sign, Mohar & Signature!`
      );
      setTimeout(() => setStatusBanner(''), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintInvoice = () => {
    handleSaveBillToHistory();
    window.print();
  };

  const handleDeleteSavedBill = (invoiceNo: string) => {
    const updated = savedBills.filter((b) => b.invoiceNo !== invoiceNo);
    setSavedBills(updated);
    try {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(updated));
    } catch {}
  };

  const buildWhatsAppBillMessage = () => {
    return (
      `🧾 *SAFARINDIACABS | OFFICIAL GST TAX INVOICE*\n\n` +
      `Dear *${bill.customerName || 'Sir/Madam'}*,\n` +
      `Please find your verified travel bill details for company reimbursement:\n\n` +
      `┌──────────────────────────┐\n` +
      `• *Invoice No:* ${bill.invoiceNo}\n` +
      `• *Invoice Date:* ${bill.invoiceDate}\n` +
      `• *GSTIN:* ${bill.companyGstin}\n` +
      `• *Proprietor:* ${bill.proprietorName}\n` +
      (bill.customerCompany ? `• *Billed To:* ${bill.customerCompany}\n` : '') +
      `├──────────────────────────┤\n` +
      `• *Route:* ${bill.pickupLocation} to ${bill.dropLocation}\n` +
      `• *Travel Date:* ${bill.pickupDate} (${bill.tripType})\n` +
      `• *Vehicle:* ${bill.vehicleModel} (${bill.vehicleNumber})\n` +
      `• *Total Distance:* ${bill.totalKm} KM\n` +
      `├──────────────────────────┤\n` +
      `• *Grand Total:* INR ${totals.grandTotal.toLocaleString('en-IN')}.00 (${bill.paymentStatus})\n` +
      `• *In Words:* ${totals.amountInWords}\n` +
      `└──────────────────────────┘\n\n` +
      `✓ *Digitally Signed by ${bill.companyName.toUpperCase()} (${bill.digitalSignTimestamp})*\n` +
      `📍 *Regd Office:* ${bill.companyAddress}\n` +
      `📞 *Helpline:* +91-${bill.companyPhone} | ✉️ ${bill.companyEmail}`
    );
  };

  const cardBg = isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const inputBg = isDark
    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-amber-400'
    : 'bg-slate-50/70 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white';
  const labelText = isDark ? 'text-slate-300' : 'text-slate-700';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6">
      {/* Clean Light-Themed Top Action Header */}
      <div className="bg-white text-slate-900 rounded-2xl p-5 border-2 border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/assets/aistudio/file_0000000069908211adc71b630e4b7dee_2c93ef6f.png"
            alt="SafarIndiaCabs Official Logo"
            className="w-16 h-16 rounded-2xl object-contain border border-slate-200 bg-white p-1 shrink-0 shadow-2xs"
          />
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-amber-700 text-xs font-extrabold tracking-wide uppercase">
              <Stamp className="w-4 h-4 text-amber-600" />
              <span>Light-Theme Professional GST Tax Invoice Generator</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-950">
              SafarIndiaCabs — Corporate Reimbursement Bill (Logo + Digital Sign + Rubber Mohar + Signature)
            </h3>
            <p className="text-xs text-slate-600">
              GSTIN: <span className="font-mono font-bold text-slate-900">{bill.companyGstin}</span> · Proprietor:{' '}
              <span className="font-bold text-slate-900">{bill.proprietorName}</span> · Pre-filled Signature, Stamp &amp; Digital Verification
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setBill(createFreshBill(null))}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-700" />
            <span>New Blank Bill</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Light-Theme PDF Bill'}</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {/* Main 2-Column Workspace: Left Form Controls | Right Live Light-Theme A4 Invoice Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: BILL INPUT FORM (6 Cols) */}
        <div className="xl:col-span-6 space-y-5">
          {/* 1. Customer & Corporate Claim Details */}
          <div className={`${cardBg} border rounded-2xl p-5 space-y-4 shadow-2xs`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold">1. Customer &amp; Corporate Claim Details</h4>
                  <p className={`text-[11px] ${subText}`}>
                    Enter passenger &amp; company details for corporate travel reimbursement
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-600">{bill.invoiceNo}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Invoice Number *</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={bill.invoiceNo}
                    onChange={(e) => handleFieldChange('invoiceNo', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleFieldChange('invoiceNo', `SIC-2026-${Math.floor(1000 + Math.random() * 9000)}`)
                    }
                    title="Generate new invoice number"
                    className="px-2.5 rounded-xl bg-slate-100 hover:bg-amber-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Invoice Date *</label>
                <input
                  type="date"
                  value={bill.invoiceDate}
                  onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Booking / Duty Slip ID</label>
                <input
                  type="text"
                  value={bill.bookingRef}
                  onChange={(e) => handleFieldChange('bookingRef', e.target.value)}
                  placeholder="SIC-8492"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>
                  Customer / Passenger Full Name *
                </label>
                <input
                  type="text"
                  value={bill.customerName}
                  onChange={(e) => handleFieldChange('customerName', e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Customer Mobile Number *</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={bill.customerPhone}
                  onChange={(e) => handleFieldChange('customerPhone', e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>
                  Company / Organization Name (For Claim)
                </label>
                <input
                  type="text"
                  value={bill.customerCompany}
                  onChange={(e) => handleFieldChange('customerCompany', e.target.value)}
                  placeholder="e.g. Tata Consultancy Services / HDFC Bank Ltd."
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>
                  Customer / Company GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={bill.customerGstin}
                  onChange={(e) => handleFieldChange('customerGstin', e.target.value.toUpperCase())}
                  placeholder="e.g. 07AAAC..."
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono uppercase focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>
                  Employee ID / Department (Optional)
                </label>
                <input
                  type="text"
                  value={bill.employeeIdOrDept}
                  onChange={(e) => handleFieldChange('employeeIdOrDept', e.target.value)}
                  placeholder="e.g. EMP-40921 / Sales Dept"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Customer Email (Optional)</label>
                <input
                  type="email"
                  value={bill.customerEmail}
                  onChange={(e) => handleFieldChange('customerEmail', e.target.value)}
                  placeholder="customer@company.com"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none ${inputBg}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>
                  Customer / Company Billing Address (Optional)
                </label>
                <input
                  type="text"
                  value={bill.customerAddress}
                  onChange={(e) => handleFieldChange('customerAddress', e.target.value)}
                  placeholder="e.g. Cyber City, DLF Phase 2, Gurugram / Connaught Place, New Delhi"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none ${inputBg}`}
                />
              </div>
            </div>
          </div>

          {/* 2. Journey, Route, Vehicle & Driver Details */}
          <div className={`${cardBg} border rounded-2xl p-5 space-y-4 shadow-2xs`}>
            <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-black">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold">2. Journey Route, Vehicle &amp; Chauffeur Details</h4>
                <p className={`text-[11px] ${subText}`}>
                  Complete pickup, drop, date, vehicle number &amp; KM details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Duty / Trip Type</label>
                <select
                  value={bill.tripType}
                  onChange={(e) => handleFieldChange('tripType', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${inputBg}`}
                >
                  <option value="One-Way Outstation">One-Way Outstation</option>
                  <option value="Round-Trip Outstation">Round-Trip Outstation</option>
                  <option value="Airport Transfer">Airport Pickup / Drop</option>
                  <option value="Local Rental (8Hrs/80Km)">Local Rental (8Hrs/80Km)</option>
                  <option value="Local Rental (12Hrs/120Km)">Local Rental (12Hrs/120Km)</option>
                  <option value="Corporate Direct Duty">Corporate Direct Duty</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Pickup Date</label>
                <input
                  type="date"
                  value={bill.pickupDate}
                  onChange={(e) => handleFieldChange('pickupDate', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Pickup Time</label>
                <input
                  type="text"
                  value={bill.pickupTime}
                  onChange={(e) => handleFieldChange('pickupTime', e.target.value)}
                  placeholder="08:30 AM"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${inputBg}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Pickup City / Full Address *</label>
                <input
                  type="text"
                  value={bill.pickupLocation}
                  onChange={(e) => handleFieldChange('pickupLocation', e.target.value)}
                  placeholder="e.g. IGI Airport Terminal 3, New Delhi"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Drop City / Full Address *</label>
                <input
                  type="text"
                  value={bill.dropLocation}
                  onChange={(e) => handleFieldChange('dropLocation', e.target.value)}
                  placeholder="e.g. Sector 17, Chandigarh"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Vehicle Category &amp; Model *</label>
                <input
                  type="text"
                  value={bill.vehicleModel}
                  onChange={(e) => handleFieldChange('vehicleModel', e.target.value)}
                  placeholder="Sedan AC (Swift Dzire / Toyota Etios)"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none ${inputBg}`}
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    'Sedan AC (Swift Dzire / Etios)',
                    'SUV AC (Maruti Ertiga / Kia Carens)',
                    'Innova Crysta AC (6+1 Luxury)',
                    'Hatchback AC (WagonR / Celerio)'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleFieldChange('vehicleModel', preset)}
                      className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold cursor-pointer"
                    >
                      {preset.split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>
                  Vehicle Registration Number *
                </label>
                <input
                  type="text"
                  value={bill.vehicleNumber}
                  onChange={(e) => handleFieldChange('vehicleNumber', e.target.value.toUpperCase())}
                  placeholder="e.g. DL1ZC-8492 / HR69E-4474"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Driver / Chauffeur Name</label>
                <input
                  type="text"
                  value={bill.driverName}
                  onChange={(e) => handleFieldChange('driverName', e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Driver Mobile Number</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={bill.driverPhone}
                  onChange={(e) => handleFieldChange('driverPhone', e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9811000000"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${labelText}`}>Total Distance (KM)</label>
                  <input
                    type="number"
                    min={1}
                    value={bill.totalKm}
                    onChange={(e) => handleFieldChange('totalKm', Number(e.target.value))}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${labelText}`}>Total Trip Days</label>
                  <input
                    type="number"
                    min={1}
                    value={bill.totalDays}
                    onChange={(e) => handleFieldChange('totalDays', Number(e.target.value))}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Fare, Toll, Parking & GST Calculation */}
          <div className={`${cardBg} border rounded-2xl p-5 space-y-4 shadow-2xs`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold">3. Fare Breakdown, Taxes &amp; Payment Status</h4>
                  <p className={`text-[11px] ${subText}`}>
                    Customize base fare, toll, parking, driver allowance &amp; GST mode
                  </p>
                </div>
              </div>
              <span className="text-sm font-black font-mono text-emerald-600">
                INR {totals.grandTotal.toLocaleString('en-IN')}.00
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Base Trip Fare (₹) *</label>
                <input
                  type="number"
                  min={0}
                  value={bill.baseFare}
                  onChange={(e) => handleFieldChange('baseFare', Number(e.target.value))}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Driver Bhatta / Allowance (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={bill.driverAllowance}
                  onChange={(e) => handleFieldChange('driverAllowance', Number(e.target.value))}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Toll &amp; State Tax (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={bill.tollStateTax}
                  onChange={(e) => handleFieldChange('tollStateTax', Number(e.target.value))}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Airport / Parking Charges (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={bill.parkingCharges}
                  onChange={(e) => handleFieldChange('parkingCharges', Number(e.target.value))}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Waiting / Night Charges (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={bill.nightWaitingCharges}
                  onChange={(e) => handleFieldChange('nightWaitingCharges', Number(e.target.value))}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Discount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={bill.discountAmount}
                  onChange={(e) => handleFieldChange('discountAmount', Number(e.target.value))}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${inputBg}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>GST Calculation Mode</label>
                <select
                  value={bill.gstMode}
                  onChange={(e) => handleFieldChange('gstMode', e.target.value as CustomBillData['gstMode'])}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${inputBg}`}
                >
                  <option value="included_5">5% GST Included in Total</option>
                  <option value="extra_5">Add 5% GST Extra on Top</option>
                  <option value="exempt_0">No GST Split (Consolidated Bill)</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Payment Settlement Status</label>
                <select
                  value={bill.paymentStatus}
                  onChange={(e) =>
                    handleFieldChange('paymentStatus', e.target.value as CustomBillData['paymentStatus'])
                  }
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${inputBg}`}
                >
                  <option value="PAID IN FULL">PAID IN FULL (100% Settled)</option>
                  <option value="PARTIALLY PAID">PARTIALLY PAID</option>
                  <option value="CORPORATE CREDIT">CORPORATE BILL TO COMPANY</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Payment Mode</label>
                <input
                  type="text"
                  value={bill.paymentMode}
                  onChange={(e) => handleFieldChange('paymentMode', e.target.value)}
                  placeholder="UPI / Cash / Bank Transfer"
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${inputBg}`}
                />
              </div>
            </div>
          </div>

          {/* 4. Official Company Info, Digital Sign Timestamp, Rubber Mohar & Signature Customizer */}
          <div className={`${cardBg} border rounded-2xl p-5 space-y-4 shadow-2xs`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-black">
                  <Stamp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold">
                    4. SafarIndiaCabs Details, Digital Sign, Rubber Mohar &amp; Signature
                  </h4>
                  <p className={`text-[11px] ${subText}`}>
                    Pre-configured with GSTIN 07DQHPA3025F1ZD, Digital Signature Block, Rubber Mohar &amp; Aman Mishra Sign
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Company Name</label>
                <input
                  type="text"
                  value={bill.companyName}
                  onChange={(e) => handleFieldChange('companyName', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Company GSTIN</label>
                <input
                  type="text"
                  value={bill.companyGstin}
                  onChange={(e) => handleFieldChange('companyGstin', e.target.value.toUpperCase())}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Proprietor Name</label>
                <input
                  type="text"
                  value={bill.proprietorName}
                  onChange={(e) => handleFieldChange('proprietorName', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Digital Signature Date/Time</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={bill.digitalSignTimestamp}
                    onChange={(e) => handleFieldChange('digitalSignTimestamp', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleFieldChange('digitalSignTimestamp', formatDigitalSignTimestamp())}
                    title="Refresh Digital Signature Timestamp"
                    className="px-2.5 rounded-xl bg-slate-100 hover:bg-amber-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold mb-1 ${labelText}`}>Registered Office Address</label>
                <input
                  type="text"
                  value={bill.companyAddress}
                  onChange={(e) => handleFieldChange('companyAddress', e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none ${inputBg}`}
                />
              </div>
            </div>

            {/* Stamp Style & Signature Upload Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-amber-600" />
                  <span>Rubber Mohar Style &amp; Signature Controls</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStampStyle('circular')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      stampStyle === 'circular'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Round Rubber Mohar (Gol Stamp)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStampStyle('rectangular')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      stampStyle === 'rectangular'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    Rectangular Proprietor Stamp
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadSignature}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Change Sign Photo</span>
                </button>
                {customSignatureUrl && (
                  <button
                    type="button"
                    onClick={handleResetToDefaultSignature}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs cursor-pointer"
                  >
                    Use Default Aman Mishra Sign
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE LIGHT-THEME A4 CORPORATE TAX INVOICE PREVIEW (6 Cols) */}
        <div className="xl:col-span-6 space-y-4 sticky top-4">
          <div className="bg-white text-slate-900 border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden print:shadow-none print:border-slate-300">
            {/* Top Corporate Accent Bar */}
            <div className="h-2 w-full flex">
              <div className="w-2/3 bg-[#081C44]" />
              <div className="w-1/3 bg-amber-400" />
            </div>

            {/* LIGHT-THEME EXECUTIVE HEADER WITH OFFICIAL SAFARINDIACABS LOGO */}
            <div className="bg-white px-5 pt-5 pb-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <img
                    src="/assets/aistudio/file_0000000069908211adc71b630e4b7dee_2c93ef6f.png"
                    alt="SafarIndiaCabs Official Logo"
                    className="w-20 h-20 rounded-2xl object-contain bg-white border border-slate-200 p-1 shrink-0 shadow-2xs"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xl font-black tracking-tight text-slate-950">
                      <span className="text-[#081C44]">Safar</span>
                      <span className="text-amber-500">India</span>
                      <span className="text-[#081C44]">Cabs</span>
                    </div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                      A1 Cab Services • North India
                    </div>
                    <div className="text-[11px] font-bold text-slate-900 pt-0.5">
                      GSTIN: <span className="font-mono text-[#081C44]">{bill.companyGstin}</span> · Prop:{' '}
                      <span>{bill.proprietorName}</span>
                    </div>
                    <div className="text-[10px] text-slate-600 leading-snug max-w-xs">
                      {bill.companyAddress}
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium">
                      Mob: +91 {bill.companyPhone} · {bill.companyEmail}
                    </div>
                  </div>
                </div>

                {/* Light-Theme Invoice Badge */}
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-left sm:text-right shrink-0 min-w-[165px]">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded inline-block mb-1">
                    GST TAX INVOICE
                  </div>
                  <div className="text-xs font-black font-mono text-slate-950">{bill.invoiceNo}</div>
                  <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                    Date: {bill.invoiceDate}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Ref: {bill.bookingRef} | SAC: {bill.sacCode}
                  </div>
                </div>
              </div>
            </div>

            {/* INVOICE BODY (CLEAN WHITE PAPER THEME) */}
            <div className="p-5 space-y-4 text-xs bg-white">
              {/* Customer & Vehicle Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase text-slate-700 border-b border-slate-200">
                    Billed To (Customer / Corporate Claim)
                  </div>
                  <div className="p-3 space-y-0.5">
                    <div className="font-extrabold text-slate-950 text-xs">
                      {bill.customerName || 'Valued Passenger'}
                    </div>
                    {bill.customerCompany && (
                      <div className="text-[11px] font-bold text-slate-800">
                        Company: {bill.customerCompany}
                      </div>
                    )}
                    {bill.customerGstin && (
                      <div className="text-[10px] font-mono text-slate-600">
                        Customer GSTIN: {bill.customerGstin}
                      </div>
                    )}
                    {bill.employeeIdOrDept && (
                      <div className="text-[10px] text-slate-600">
                        Emp ID / Dept: {bill.employeeIdOrDept}
                      </div>
                    )}
                    <div className="text-[11px] font-mono text-slate-600">
                      {bill.customerPhone ? `Mob: +91 ${bill.customerPhone}` : ''}
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase text-slate-700 border-b border-slate-200">
                    Vehicle &amp; Chauffeur Particulars
                  </div>
                  <div className="p-3 space-y-0.5">
                    <div className="font-extrabold text-slate-950 text-xs">{bill.vehicleModel}</div>
                    <div className="text-[11px] font-mono font-bold text-slate-800">
                      Reg. No: {bill.vehicleNumber || 'Commercial Cab'}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Duty: {bill.tripType} · {bill.totalKm} KM · {bill.totalDays} Day(s)
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Date: {bill.pickupDate} at {bill.pickupTime}
                    </div>
                  </div>
                </div>
              </div>

              {/* Light-Theme Route Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="truncate">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Pickup: </span>
                  <span className="font-bold text-slate-900">{bill.pickupLocation}</span>
                </div>
                <span className="text-amber-600 font-black">→</span>
                <div className="truncate">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Drop: </span>
                  <span className="font-bold text-slate-900">{bill.dropLocation}</span>
                </div>
              </div>

              {/* Clean Light-Theme Itemized Fare Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3.5 py-2 flex justify-between text-[10px] font-black uppercase text-slate-700 border-b border-slate-300">
                  <span>Description of Cab Service (SAC: {bill.sacCode})</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="divide-y divide-slate-200 text-[11px] bg-white">
                  <div className="px-3.5 py-2 flex justify-between">
                    <span>Base Trip &amp; Cab Hire Charges ({bill.totalKm} KM)</span>
                    <span className="font-mono font-bold">
                      INR {Number(bill.baseFare || 0).toLocaleString('en-IN')}.00
                    </span>
                  </div>
                  {Number(bill.driverAllowance) > 0 && (
                    <div className="px-3.5 py-1.5 flex justify-between">
                      <span>Chauffeur / Driver Allowance (Bhatta)</span>
                      <span className="font-mono font-bold">
                        INR {Number(bill.driverAllowance).toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  )}
                  {Number(bill.tollStateTax) > 0 && (
                    <div className="px-3.5 py-1.5 flex justify-between">
                      <span>Highway Toll &amp; State Entry Permit Tax</span>
                      <span className="font-mono font-bold">
                        INR {Number(bill.tollStateTax).toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  )}
                  {Number(bill.parkingCharges) > 0 && (
                    <div className="px-3.5 py-1.5 flex justify-between">
                      <span>Airport / Commercial Parking Charges</span>
                      <span className="font-mono font-bold">
                        INR {Number(bill.parkingCharges).toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  )}
                  {Number(bill.nightWaitingCharges) > 0 && (
                    <div className="px-3.5 py-1.5 flex justify-between">
                      <span>Waiting / Extra Duty Charges</span>
                      <span className="font-mono font-bold">
                        INR {Number(bill.nightWaitingCharges).toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  )}
                  {Number(bill.discountAmount) > 0 && (
                    <div className="px-3.5 py-1.5 flex justify-between text-emerald-700">
                      <span>Less: Promotional / Corporate Discount</span>
                      <span className="font-mono font-bold">
                        - INR {Number(bill.discountAmount).toLocaleString('en-IN')}.00
                      </span>
                    </div>
                  )}
                  {bill.gstMode !== 'exempt_0' && (
                    <div className="px-3.5 py-1.5 flex justify-between text-slate-600 bg-slate-50/70">
                      <span>GST (5.0% — CGST 2.5% + SGST 2.5%)</span>
                      <span className="font-mono font-semibold">
                        INR {totals.totalGst.toLocaleString('en-IN')}.00 (
                        {bill.gstMode === 'included_5' ? 'Incl.' : 'Extra'})
                      </span>
                    </div>
                  )}
                  <div className="px-3.5 py-2.5 bg-slate-50 flex justify-between items-center font-black text-slate-950 text-xs border-t border-slate-300">
                    <span>TOTAL ({bill.paymentStatus})</span>
                    <span className="font-mono text-sm text-slate-950">
                      INR {totals.grandTotal.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10.5px] font-bold text-slate-600 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
                Amount in Words: <span className="text-slate-950">{totals.amountInWords}</span>
              </div>

              {/* DUAL CORPORATE AUTHENTICATION FOOTER:
                  LEFT: "Digitally signed by..." (Exact Screenshot Style)
                  RIGHT: Official Blue Rubber Mohar + Handwritten Aman Mishra Signature */}
              <div className="border border-slate-300 bg-white rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Left: Corporate Digital Signature Block */}
                <div className="space-y-1 sm:border-r border-slate-200 sm:pr-3">
                  <div className="font-sans text-[11px] leading-snug text-slate-900 font-medium space-y-0.5">
                    <div>
                      Digitally signed by{' '}
                      <span className="font-bold">{bill.companyName.toUpperCase()}</span>
                    </div>
                    <div>({bill.proprietorName.toUpperCase()})</div>
                    <div>GSTIN: {bill.companyGstin}</div>
                    <div>Date: {bill.digitalSignTimestamp}</div>
                    <div>Location: IN</div>
                  </div>
                  <div className="pt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Digitally Verified for Company Reimbursement</span>
                  </div>
                </div>

                {/* Right: Official Rubber Mohar + Handwritten Aman Mishra Signature */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-[10px] font-black text-slate-900 uppercase tracking-wider mb-0.5">
                    For {bill.companyName}
                  </div>
                  <div className="relative flex items-center justify-center h-24 w-48">
                    {stampPreviewUrl && (
                      <img
                        src={stampPreviewUrl}
                        alt="Official Rubber Mohar"
                        className={`${
                          stampStyle === 'circular' ? 'w-24 h-24 left-1' : 'w-40 h-20 left-0'
                        } absolute object-contain opacity-90 select-none pointer-events-none`}
                      />
                    )}
                    {activeSignatureUrl && (
                      <img
                        src={activeSignatureUrl}
                        alt="Proprietor Aman Mishra Signature"
                        className="relative z-10 ml-10 w-36 h-14 object-contain select-none pointer-events-none"
                      />
                    )}
                  </div>
                  <div className="text-[10px] font-extrabold text-slate-900 border-t border-slate-300 pt-1 w-full text-center">
                    Prop. {bill.proprietorName} (Authorised Signatory)
                  </div>
                </div>
              </div>

              {/* Action Buttons Under Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 print:hidden">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Light-Theme PDF Bill</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Print / Save as PDF</span>
                </button>

                <a
                  href={buildWhatsAppSchemeUrl(buildWhatsAppBillMessage(), bill.customerPhone)}
                  onClick={(e) => {
                    handleSaveBillToHistory();
                    triggerWhatsAppDeepLink(e, buildWhatsAppBillMessage(), bill.customerPhone);
                  }}
                  className="sm:col-span-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-amber-300" />
                  <span>
                    Send Bill Details on Customer WhatsApp{' '}
                    {bill.customerPhone ? `(+91 ${bill.customerPhone})` : ''}
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Bills History Section */}
      {savedBills.length > 0 && (
        <div className={`${cardBg} border rounded-2xl p-5 space-y-4 shadow-2xs print:hidden`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-extrabold">
                Generated Bills History ({savedBills.length})
              </h4>
            </div>
            <span className={`text-xs ${subText}`}>Click any bill to reload, edit or re-download PDF</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedBills.map((item) => {
              const itemTotals = calculateBillTotals(item);
              return (
                <div
                  key={item.invoiceNo}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-amber-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-amber-600">{item.invoiceNo}</span>
                    <span className="text-[11px] font-mono text-slate-500">{item.invoiceDate}</span>
                  </div>
                  <div className="font-extrabold text-xs truncate">
                    {item.customerName || 'Walk-in Customer'}{' '}
                    {item.customerCompany ? `(${item.customerCompany})` : ''}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {item.pickupLocation} → {item.dropLocation}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-mono font-black text-xs text-emerald-600">
                      INR {itemTotals.grandTotal.toLocaleString('en-IN')}.00
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBill(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-800 font-bold text-[11px] cursor-pointer"
                      >
                        Load / Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadCustomBillPdf(item, activeSignatureUrl, stampStyle)}
                        className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] cursor-pointer"
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedBill(item.invoiceNo)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Delete saved bill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
