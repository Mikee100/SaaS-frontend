/**
 * Shared PDF template utilities — used by all PDF exports so the owner's
 * design (Settings → Report / PDF Design) is applied consistently.
 * Import tenant via useTenant() and pass tenant + tenant.pdfTemplate here.
 */

import type { jsPDF } from 'jspdf';

export type HeaderAlignment = 'left' | 'center' | 'right';

export type PdfTemplate = {
  businessName?: boolean;
  businessAddress?: boolean;
  businessPhone?: boolean;
  businessEmail?: boolean;
  branchInfo?: boolean;
  logo?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  fontSize?: string;
  /** Font size for business name / header block (defaults to body + 6 if unset) */
  headerFontSize?: string;
  /** Font size for body text (address, phone, etc.). Defaults to fontSize. */
  bodyFontSize?: string;
  /** Font size for report title and section headings. Defaults to body + 4. */
  titleFontSize?: string;
  /** Alignment of business header: left, center, or right */
  headerAlignment?: HeaderAlignment;
  footerText?: string;
  paperSize?: string;
  orientation?: string;
  margins?: string;
  currency?: string;
  showVat?: boolean;
  showSubtotal?: boolean;
  [key: string]: unknown;
};

export type TenantForPdf = {
  name?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  currency?: string;
  [key: string]: unknown;
};

const MARGIN_MAP: Record<string, number> = {
  normal: 20,
  narrow: 10,
  wide: 30,
};

/** Options for new jsPDF({ ... }) from template */
export function getPdfDocOptions(template: PdfTemplate | null | undefined) {
  const t = template || {};
  return {
    orientation: (t.orientation || 'portrait') as 'portrait' | 'landscape',
    unit: 'mm' as const,
    format: (t.paperSize?.toLowerCase() || 'a4') as 'a4' | 'letter' | string,
  };
}

export function getPdfMargin(template: PdfTemplate | null | undefined): number {
  const m = (template?.margins as string) || 'normal';
  return MARGIN_MAP[m] ?? 20;
}

export function getPdfFontSize(template: PdfTemplate | null | undefined): number {
  return parseInt(String(template?.fontSize ?? '12'), 10) || 12;
}

/** Font size for business name in header. */
export function getPdfHeaderFontSize(template: PdfTemplate | null | undefined): number {
  const t = template || {};
  if (t.headerFontSize != null && t.headerFontSize !== '') {
    const n = parseInt(String(t.headerFontSize), 10);
    if (!isNaN(n)) return n;
  }
  return getPdfFontSize(template) + 6;
}

/** Font size for body text (address, phone, paragraphs). */
export function getPdfBodyFontSize(template: PdfTemplate | null | undefined): number {
  const t = template || {};
  if (t.bodyFontSize != null && t.bodyFontSize !== '') {
    const n = parseInt(String(t.bodyFontSize), 10);
    if (!isNaN(n)) return n;
  }
  return getPdfFontSize(template);
}

/** Font size for report title and section headings. */
export function getPdfTitleFontSize(template: PdfTemplate | null | undefined): number {
  const t = template || {};
  if (t.titleFontSize != null && t.titleFontSize !== '') {
    const n = parseInt(String(t.titleFontSize), 10);
    if (!isNaN(n)) return n;
  }
  return getPdfFontSize(template) + 4;
}

/** Header alignment: left, center, or right. */
export function getPdfHeaderAlignment(template: PdfTemplate | null | undefined): HeaderAlignment {
  const a = (template?.headerAlignment as HeaderAlignment);
  return a === 'center' || a === 'right' ? a : 'left';
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [37, 99, 235];
}

/** Get x position and align for header based on template alignment. */
function getHeaderXAlign(
  template: PdfTemplate | null | undefined,
  pageWidth: number,
  margin: number
): { x: number; align: 'left' | 'center' | 'right' } {
  const align = getPdfHeaderAlignment(template);
  if (align === 'center') return { x: pageWidth / 2, align: 'center' };
  if (align === 'right') return { x: pageWidth - margin, align: 'right' };
  return { x: margin, align: 'left' };
}

/** Apply business header from template; returns y position after header. */
export function applyPdfBusinessHeader(
  doc: jsPDF,
  tenant: TenantForPdf | null | undefined,
  template: PdfTemplate | null | undefined,
  startY: number
): number {
  const t = template || {};
  const margin = getPdfMargin(template);
  const pageWidth = doc.internal.pageSize.width;
  const { x: headerX, align: headerAlign } = getHeaderXAlign(template, pageWidth, margin);
  const headerFontSize = getPdfHeaderFontSize(template);
  const bodyFontSize = getPdfBodyFontSize(template);
  let y = startY;

  if (t.businessName && tenant?.name) {
    doc.setFontSize(headerFontSize);
    doc.setTextColor((t.primaryColor || '#000000').replace('#', '') || '000000');
    doc.text(tenant.name, headerX, y, { align: headerAlign });
    y += 10;
  }
  if (t.businessAddress && tenant?.address) {
    doc.setFontSize(bodyFontSize);
    doc.setTextColor((t.secondaryColor || '#666666').replace('#', '') || '666666');
    doc.text(tenant.address, headerX, y, { align: headerAlign });
    y += 6;
  }
  if (t.businessPhone && tenant?.contactPhone) {
    doc.setFontSize(bodyFontSize);
    doc.setTextColor('333333');
    doc.text(`Phone: ${tenant.contactPhone}`, headerX, y, { align: headerAlign });
    y += 6;
  }
  if (t.businessEmail && tenant?.contactEmail) {
    doc.setFontSize(bodyFontSize);
    doc.setTextColor('333333');
    doc.text(`Email: ${tenant.contactEmail}`, headerX, y, { align: headerAlign });
    y += 6;
  }
  return y;
}

/** Apply footer text (from template) and page numbers on every page. */
export function applyPdfFooterAndPageNumbers(
  doc: jsPDF,
  template: PdfTemplate | null | undefined,
  brandLabel: string = 'SaaS POS'
): void {
  const t = template || {};
  const margin = getPdfMargin(template);
  const fontSize = getPdfFontSize(template);
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const pageCount = doc.getNumberOfPages();

  const footerFontSize = Math.max(8, getPdfBodyFontSize(template) - 2);
  if (t.footerText) {
    doc.setFontSize(footerFontSize);
    doc.setTextColor('666666');
    doc.text(String(t.footerText), margin, pageHeight - margin);
  }

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(footerFontSize);
    doc.setTextColor('999999');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 22, pageHeight - margin / 2);
    doc.text(`${brandLabel}`, margin, pageHeight - margin / 2);
  }
}

/** Get primary/secondary RGB for autoTable from template */
export function getPdfTableColors(template: PdfTemplate | null | undefined) {
  const t = template || {};
  return {
    primaryRgb: hexToRgb(t.primaryColor || '#2563eb'),
    secondaryRgb: hexToRgb(t.secondaryColor || '#e0e7ff'),
  };
}

/** Currency symbol/code for reports (tenant or template) */
export function getPdfCurrency(tenant: TenantForPdf | null | undefined, template: PdfTemplate | null | undefined): string {
  return (tenant as TenantForPdf)?.currency || (template?.currency as string) || 'KES';
}
