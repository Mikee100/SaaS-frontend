"use client";
import { apiGet } from "@/utils/api";
import { getReceiptLogoUrl, getFullAssetUrl } from "@/utils/logoUrl";
import { preparePdfWatermark } from "@/utils/pdfTemplate";
import { DocumentTextIcon, DocumentChartBarIcon, CalendarDaysIcon, UserIcon, CreditCardIcon, XMarkIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useEffect, useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import QRCode from 'qrcode';
import SalesTargetComponent from "@/components/SalesTarget";
import { useTenant } from '@/hooks/useTenant';
import { useBranches } from '@/hooks/useBranches';



type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

type MpesaTransaction = {
  phoneNumber: string;
  amount: number;
  status: string;
  mpesaReceipt?: string;
  checkoutRequestID?: string;
};

type SplitPayment = {
  method: 'cash' | 'mpesa' | 'credit';
  amount: number;
  amountReceived?: number;
  mpesaTransactionId?: string;
  mpesaReceipt?: string;
  creditDueDate?: string;
  creditNotes?: string;
};

type Sale = {
  saleId: string;
  date: string;
  total: number;
  paymentType: string;
  customerName?: string;
  customerPhone?: string;
  cashier?: string;
  items: SaleItem[];
  mpesaTransaction?: MpesaTransaction;
  branch?: {
    id: string;
    name: string;
    address?: string;
  };
  isSplitPayment?: boolean;
  splitPayments?: SplitPayment[];
};

type PdfTemplate = {
  businessName?: boolean;
  businessAddress?: boolean;
  businessPhone?: boolean;
  businessEmail?: boolean;
  branchInfo?: boolean;
  logo?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  fontSize?: string;
  showVat?: boolean;
  showSubtotal?: boolean;
  footerText?: string;
  paperSize?: string;
  orientation?: string;
  margins?: string;
  currency?: string;
};

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const header = columns.join(',');
  const body = rows.map(row => columns.map(col => escape(row[col] ?? '')).join(',')).join('\n');
  return header + '\n' + body;
}

export default function SalesHistoryPage() {
  // Use cached tenant data hook at component level
  const { data: tenantData } = useTenant();
  const { data: branchesData = [], isLoading: branchesLoading } = useBranches();
  
  // Convert branches data format
  const branches = branchesData.map(b => ({ id: b.id, name: b.name }));

  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  // Filter state
  const [filterCashier, setFilterCashier] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state - server-side
  const [page, setPage] = useState(1);
  const perPage = 20; // Increased from 10 for better performance

  // Build query parameters for server-side filtering and pagination
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', perPage.toString());
    
    if (selectedBranchId && selectedBranchId !== "all") {
      params.set('branchId', selectedBranchId);
    }
    if (filterStart) {
      params.set('startDate', filterStart);
    }
    if (filterEnd) {
      params.set('endDate', filterEnd);
    }
    if (filterCashier) {
      params.set('cashier', filterCashier);
    }
    if (filterPayment) {
      params.set('paymentType', filterPayment);
    }
    
    return params.toString();
  }, [page, perPage, selectedBranchId, filterStart, filterEnd, filterCashier, filterPayment]);

  // Fetch sales with server-side pagination and filtering
  const { 
    data: salesData, 
    isLoading: loading, 
    error: salesError 
  } = useQuery({
    queryKey: ['sales', 'history', selectedBranchId, page, filterStart, filterEnd, filterCashier, filterPayment],
    queryFn: async () => {
      const headers = selectedBranchId && selectedBranchId !== "all" 
        ? { 'x-branch-id': selectedBranchId } 
        : undefined;
      
      const response = await apiGet<{ 
        sales: Sale[]; 
        pagination?: { total: number; page: number; limit: number; pageCount: number };
      }>(`/sales?${queryParams}`, headers);
      
      // Handle both array response and object with sales property
      if (Array.isArray(response)) {
        return { sales: response, pagination: null };
      }
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - sales history changes frequently
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData, // Keep previous page while loading new page
  });

  const sales = useMemo(() => salesData?.sales || [], [salesData?.sales]);
  const pagination = salesData?.pagination;
  
  // Client-side filtering for remaining filters (if server doesn't support them)
  const filteredSales = useMemo(() => sales.filter((sale) => {
    const saleDate = new Date(sale.date);
    const startOk = !filterStart || saleDate >= new Date(filterStart);
    const endOk = !filterEnd || saleDate <= new Date(filterEnd + 'T23:59:59');
    const cashierOk = !filterCashier || sale.cashier === filterCashier;
    const paymentOk = !filterPayment || sale.paymentType === filterPayment;
    return startOk && endOk && cashierOk && paymentOk;
  }), [sales, filterStart, filterEnd, filterCashier, filterPayment]);

  // Use server pagination if available, otherwise client-side
  const pageCount = pagination?.pageCount || Math.ceil(filteredSales.length / perPage);
  const pagedSales = filteredSales;
  const error = salesError ? 'Failed to load sales data. Please try again.' : "";
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedBranchId, filterStart, filterEnd, filterCashier, filterPayment]);

  // Summary calculations - memoized
  const { totalRevenue, totalSales: totalSalesCount, avgSaleValue } = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const count = filteredSales.length;
    const avg = count > 0 ? revenue / count : 0;
    return { totalRevenue: revenue, totalSales: count, avgSaleValue: avg };
  }, [filteredSales]);

  // Unique values for filters - memoized
  // Note: These may be limited by pagination, consider fetching separately if needed
  const allCashiers = useMemo(() => unique(sales.map(s => s.cashier).filter(Boolean)), [sales]);
  const allPayments = useMemo(() => unique(sales.map(s => s.paymentType).filter(Boolean)), [sales]);

  // Export CSV handler
  function handleExportCSV() {
    if (!filteredSales.length) return;
    const columns = [
      'saleId', 'date', 'total', 'paymentType', 'customerName', 'customerPhone', 'branch', 'cashier'
    ];
    const rows = filteredSales.map(sale => ({
      ...sale,
      date: new Date(sale.date).toLocaleString(),
      total: sale.total.toFixed(2),
      branch: sale.branch?.name || 'Unknown',
    }));
    const csv = toCSV(rows, columns);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Excel export handler
  function handleExportExcel() {
    if (!filteredSales.length) return;
    const ws = XLSX.utils.json_to_sheet(filteredSales.map(sale => ({
      ...sale,
      date: new Date(sale.date).toLocaleString(),
      total: sale.total.toFixed(2),
      branch: sale.branch?.name || 'Unknown',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, 'sales-history.xlsx');
  }

  // PDF export handler
  async function handleExportPDF() {
    if (!filteredSales.length) return;

    try {
      // Use tenant data from hook (already available at component level)
      const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
      const currency = (tenantData as { currency?: string })?.currency || pdfTemplate.currency || 'KES';

      // Set up PDF document with template settings
      const doc = new jsPDF({
        orientation: (pdfTemplate.orientation || 'portrait') as 'portrait' | 'landscape',
        unit: 'mm',
        format: (pdfTemplate.paperSize?.toLowerCase() || 'a4') as 'a4' | 'letter' | string
      });
      await preparePdfWatermark(doc, getFullAssetUrl((tenantData as { watermark?: string })?.watermark));

      // Calculate margins based on template
      const marginMap: { [key: string]: number } = {
        'normal': 20,
        'narrow': 10,
        'wide': 30
      };
      const margin = marginMap[pdfTemplate.margins as string] || 20;

      // Apply font size from template
      const fontSize = parseInt(pdfTemplate.fontSize ?? "12") || 12;
      doc.setFontSize(fontSize);

      // Header with business info (if enabled)
      let yPosition = margin;

      if (pdfTemplate.businessName && tenantData?.name) {
        doc.setFontSize(fontSize + 6);
        doc.setTextColor(pdfTemplate.primaryColor?.replace('#', '') || '000000');
        doc.text(tenantData.name, margin, yPosition);
        yPosition += 10;
      }

      if (pdfTemplate.businessAddress && tenantData?.address) {
        doc.setFontSize(fontSize);
        doc.setTextColor(pdfTemplate.secondaryColor?.replace('#', '') || '666666');
        doc.text(tenantData.address, margin, yPosition);
        yPosition += 6;
      }

      if (pdfTemplate.businessPhone && (tenantData as { contactPhone?: string })?.contactPhone) {
        doc.setFontSize(fontSize);
        doc.text(`Phone: ${(tenantData as { contactPhone?: string }).contactPhone}`, margin, yPosition);
        yPosition += 6;
      }

      if (pdfTemplate.businessEmail && (tenantData as { contactEmail?: string })?.contactEmail) {
        doc.setFontSize(fontSize);
        doc.text(`Email: ${(tenantData as { contactEmail?: string }).contactEmail}`, margin, yPosition);
        yPosition += 6;
      }

      // Report title
      doc.setFontSize(fontSize + 4);
      doc.setTextColor(pdfTemplate.primaryColor?.replace('#', '') || '000000');
      doc.text('Sales History Report', margin, yPosition + 10);
      yPosition += 8;

      // Generation date
      doc.setFontSize(fontSize - 2);
      doc.setTextColor('666666');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 15;

      // Table columns - filter based on template visibility settings
      const tableColumn = ['Date', 'Sale ID', `${currency} Total`, 'Payment'];
      if (pdfTemplate.businessName) tableColumn.push('Customer');
      if (pdfTemplate.branchInfo) tableColumn.push('Branch');
      tableColumn.push('Cashier');

      const tableRows = filteredSales.map(sale => {
        const row = [
          new Date(sale.date).toLocaleString(),
          sale.saleId.slice(0, 8),
          `${currency} ${sale.total.toFixed(2)}`,
          sale.paymentType
        ];

        if (pdfTemplate.businessName) row.push(sale.customerName || '-');
        if (pdfTemplate.branchInfo) row.push(sale.branch?.name || 'Unknown');
        row.push(sale.cashier || '-');

        return row;
      });

      // Convert hex colors to RGB for jsPDF
      const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ] : [37, 99, 235]; // Default blue
      };

      const primaryRgb = hexToRgb(pdfTemplate.primaryColor || '#2563eb');
      const secondaryRgb = hexToRgb(pdfTemplate.secondaryColor || '#e0e7ff');

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: yPosition,
        styles: {
          fontSize: fontSize - 3,
          cellPadding: 3
        },
        headStyles: {
          fillColor: primaryRgb,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: secondaryRgb
        },
        margin: { left: margin, right: margin },
      });

      // Footer text from template
      if (pdfTemplate.footerText) {
        const pageHeight = doc.internal.pageSize.height;
        const footerY = pageHeight - margin;

        doc.setFontSize(fontSize - 2);
        doc.setTextColor('666666');
        doc.text(pdfTemplate.footerText, margin, footerY);
      }

      // Page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(fontSize - 2);
        doc.setTextColor('999999');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - margin / 2);
        doc.text('SaaS POS • Sales Report', margin, pageHeight - margin / 2);
      }

      doc.save('sales-history.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }

  const clearFilters = () => {
    setFilterStart("");
    setFilterEnd("");
    setFilterCashier("");
    setFilterPayment("");
    setPage(1);
  };

  // Print receipt function
  const handlePrintReceipt = async (sale: Sale) => {
    setIsPrinting(true);

    try {
      // Create a temporary print-friendly version
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups for printing');
        setIsPrinting(false);
        return;
      }

      // Get business info (you might need to fetch this or pass it as prop)
      let businessInfo: {
        name: string;
        businessType: string;
        address: string;
        contactPhone: string;
        kraEnabled?: boolean;
        kraPin: string;
        vatNumber: string;
        currency: string;
      } = {
        name: "Business Name",
        businessType: "Retail",
        address: "Business Address",
        contactPhone: "Phone Number",
        kraPin: "KRA PIN",
        vatNumber: "VAT Number",
        currency: "KES"
      };

      try {
        type BusinessData = {
          name?: string;
          businessType?: string;
          address?: string;
          contactPhone?: string;
          kraEnabled?: boolean;
          kraPin?: string;
          vatNumber?: string;
          currency?: string;
          pdfTemplate?: {
            currency?: string;
            [key: string]: unknown;
          };
        };
        // Use tenant data from hook (already available at component level)
        const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
        businessInfo = {
          name: tenantData?.name || "Business Name",
          businessType: (tenantData as BusinessData)?.businessType || "Retail",
          address: tenantData?.address || "Business Address",
          contactPhone: (tenantData as BusinessData)?.contactPhone || tenantData?.phone || "Phone Number",
          kraEnabled: (tenantData as BusinessData)?.kraEnabled,
          kraPin: (tenantData as BusinessData)?.kraPin || "KRA PIN",
          vatNumber: (tenantData as BusinessData)?.vatNumber || "VAT Number",
          currency: (tenantData as BusinessData)?.currency || pdfTemplate.currency || "KES"
        };
      } catch (error) {
        console.warn('Could not fetch business info, using defaults:', error);
      }

      const receiptUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + `/receipt/${sale.saleId}`;
      const receiptLogoUrl = getReceiptLogoUrl((tenantData as { receiptLogo?: string; logoUrl?: string })?.receiptLogo, (tenantData as { receiptLogo?: string; logoUrl?: string })?.logoUrl);

      // Create print HTML
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${sale.saleId?.slice(0, 8) || 'Unknown'}</title>
            <style>
              @page {
                margin: 0.5cm;
                size: auto;
              }

              body {
                font-family: 'Courier New', monospace;
                margin: 0;
                padding: 10px;
                background: white;
                color: black;
                line-height: 1.4;
              }

              .receipt {
                max-width: 80mm;
                margin: 0 auto;
                font-size: 12px;
              }

              .text-center {
                text-align: center;
              }

              .text-right {
                text-align: right;
              }

              .font-bold {
                font-weight: bold;
              }

              .mb-2 {
                margin-bottom: 8px;
              }

              .mb-4 {
                margin-bottom: 16px;
              }

              .border-b {
                border-bottom: 1px solid black;
              }

              .pb-2 {
                padding-bottom: 8px;
              }

              .space-y-2 > * + * {
                margin-top: 8px;
              }

              .flex {
                display: flex;
              }

              .justify-between {
                justify-content: space-between;
              }

              .grid {
                display: grid;
              }

              .grid-cols-12 {
                grid-template-columns: repeat(12, 1fr);
              }

              .gap-2 {
                gap: 8px;
              }

              .col-span-7 {
                grid-column: span 7;
              }

              .col-span-2 {
                grid-column: span 2;
              }

              .col-span-3 {
                grid-column: span 3;
              }

              .text-sm {
                font-size: 12px;
              }

              .text-xs {
                font-size: 10px;
              }

              .text-lg {
                font-size: 16px;
              }

              /* Force black text */
              * {
                color: black !important;
                background: white !important;
              }

              /* QR Code styles */
              #qrcode-${sale.saleId} {
                display: inline-block;
                margin: 0 auto;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <!-- Header -->
              <div class="text-center mb-4">
                ${receiptLogoUrl ? `<img src="${receiptLogoUrl}" alt="Logo" style="max-height: 48px; width: auto; margin: 0 auto 8px; display: block;" />` : ''}
                <div class="font-bold text-lg mb-2">${businessInfo.name}</div>
                <div class="text-sm mb-1">${businessInfo.businessType}</div>
                <div class="text-xs mb-1">${businessInfo.address}</div>
                <div class="text-xs mb-2">Phone: ${businessInfo.contactPhone}</div>
                ${businessInfo.kraEnabled ? `<div class="text-xs mb-1">KRA PIN: ${businessInfo.kraPin}</div><div class="text-xs mb-4">VAT No: ${businessInfo.vatNumber}</div>` : ''}
              </div>

              <!-- Receipt Title -->
              <div class="text-center mb-4">
                <div class="font-bold">TAX INVOICE</div>
              </div>

              <!-- Receipt Details -->
              <div class="mb-4">
                <div class="flex justify-between text-sm mb-1">
                  <span>Receipt No:</span>
                  <span class="font-bold">#${sale.saleId?.slice(0, 8) || 'N/A'}</span>
                </div>
                <div class="flex justify-between text-sm mb-1">
                  <span>Date:</span>
                  <span>${new Date(sale.date).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                ${sale.customerName ? `
                <div class="flex justify-between text-sm mb-1">
                  <span>Customer:</span>
                  <span>${sale.customerName}</span>
                </div>
                ` : ''}
                ${sale.customerPhone ? `
                <div class="flex justify-between text-sm mb-1">
                  <span>Phone:</span>
                  <span>${sale.customerPhone}</span>
                </div>
                ` : ''}
                ${sale.branch ? `
                <div class="flex justify-between text-sm mb-1">
                  <span>Branch:</span>
                  <span>${sale.branch.name}</span>
                </div>
                ` : ''}
              </div>

              <!-- Items Header -->
              <div class="grid grid-cols-12 gap-2 text-xs font-bold border-b pb-1 mb-2">
                <div class="col-span-7">ITEM</div>
                <div class="col-span-2 text-right">QTY</div>
                <div class="col-span-3 text-right">AMOUNT</div>
              </div>

              <!-- Items -->
              <div class="space-y-2 mb-4">
                ${sale.items.map(item => `
                  <div class="grid grid-cols-12 gap-2 text-sm">
                    <div class="col-span-7">${item.name}</div>
                    <div class="col-span-2 text-right">×${item.quantity}</div>
                    <div class="col-span-3 text-right">${businessInfo.currency} ${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                `).join('')}
              </div>

              <!-- Totals -->
              <div class="border-b mb-2"></div>
              <div class="flex justify-between font-bold text-sm mb-1">
                <span>TOTAL:</span>
                <span>${businessInfo.currency} ${sale.total.toFixed(2)}</span>
              </div>

              <!-- Payment Details -->
              <div class="mb-4">
                <div class="flex justify-between text-sm">
                  <span>Payment Method:</span>
                  <span class="capitalize">${sale.paymentType || 'N/A'}</span>
                </div>
                ${sale.mpesaTransaction ? `
                <div class="mt-2 text-xs">
                  <div>M-Pesa: ${sale.mpesaTransaction.phoneNumber}</div>
                  <div>Receipt: ${sale.mpesaTransaction.mpesaReceipt || 'N/A'}</div>
                </div>
                ` : ''}
              </div>

              <!-- Footer -->
              <div class="text-center text-xs">
                <div class="font-bold mb-2">Thank you for your business!</div>
                <p>Scan the QR code to verify this receipt</p>
                <div class="mt-2 mb-2" style="text-align: center;">
                  <div id="qrcode-${sale.saleId}" style="display: inline-block;"></div>
                </div>
                <p class="mb-1">No returns without receipt.</p>
                <p class="mb-2">Items can be returned within 14 days.</p>
                <p>For inquiries: ${businessInfo.contactPhone}</p>
                <p class="mt-2 font-bold">Created by Adeera Unitech Company</p>
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Wait for content to load then generate QR code and print
      printWindow.onload = () => {
        setTimeout(async () => {
          try {
            // Generate QR code in the main window
            const qrContainer = printWindow.document.getElementById(`qrcode-${sale.saleId}`);
            if (qrContainer) {
              // Use QRCode library to generate data URL
              const qrDataURL = await QRCode.toDataURL(receiptUrl, {
                width: 60,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                },
                errorCorrectionLevel: 'H'
              });

              const qrImage = printWindow.document.createElement('img');
              qrImage.src = qrDataURL;
              qrImage.style.width = '60px';
              qrImage.style.height = '60px';
              qrContainer.appendChild(qrImage);

              // Now print
              printWindow.print();
              printWindow.close();
              setIsPrinting(false);
            } else {
              // Fallback if QR code container not found
              printWindow.print();
              printWindow.close();
              setIsPrinting(false);
            }
          } catch (error: unknown) {
            console.warn('QR code generation failed, printing without it:', error);
            printWindow.print();
            printWindow.close();
            setIsPrinting(false);
          }
        }, 500);
      };
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Failed to print receipt. Please try again.');
      setIsPrinting(false);
    }
  };

  // Add modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 font-medium text-lg mb-2">Error Loading Sales Data</div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 py-4">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Title and subtitle */}
        <div className="flex flex-col justify-center md:justify-start">
          <h1 className="text-2xl font-bold text-gray-900 mb-0 animate-fade-in">Sales History</h1>
          <p className="text-gray-600 text-sm mt-0.5">Track and analyze your sales performance</p>
        </div>
        {/* Right: Controls */}
        <div className="flex flex-row items-center gap-4 mt-2 md:mt-0">
          {/* Branch Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-700" htmlFor="branch-select">Branch:</label>
            {branchesLoading ? (
              <div className="text-gray-500 text-xs">Loading...</div>
            ) : (
              <select
                id="branch-select"
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-xs min-w-[120px]"
              >
                <option value="all">All Branches</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            )}
          </div>
          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-1 rounded font-medium transition-colors shadow-sm text-xs ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Show/Hide Filters"
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {(filterStart || filterEnd || filterCashier || filterPayment) && (
              <span className="bg-blue-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center animate-bounce ml-1">
                {[filterStart, filterEnd, filterCashier, filterPayment].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div
        className={`overflow-hidden transition-all duration-300 ${showFilters ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'} mb-3`}
        aria-expanded={showFilters}
      >
        {showFilters && (
          <div className="bg-white rounded border border-gray-200 p-3 shadow-sm animate-slide-down">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Filter Sales</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <CalendarDaysIcon className="w-4 h-4" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={filterStart}
                  onChange={e => setFilterStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <CalendarDaysIcon className="w-4 h-4" />
                  End Date
                </label>
                <input
                  type="date"
                  value={filterEnd}
                  onChange={e => setFilterEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <UserIcon className="w-4 h-4" />
                  Cashier
                </label>
                <select
                  value={filterCashier}
                  onChange={e => setFilterCashier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Cashiers</option>
                  {allCashiers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <CreditCardIcon className="w-4 h-4" />
                  Payment Method
                </label>
                <select
                  value={filterPayment}
                  onChange={e => setFilterPayment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Methods</option>
                  {allPayments.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Clear Filters
              </button>

              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sales Target Component */}
      <SalesTargetComponent
        currentRevenue={totalRevenue}
        totalSales={totalSalesCount}
        filteredSales={filteredSales}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-2">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-2 rounded border border-blue-100 shadow-sm animate-fade-in">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="p-0.5 bg-blue-200 rounded">
              <DocumentTextIcon className="w-3 h-3 text-blue-700" />
            </div>
            <div>
              <p className="text-[10px] text-blue-700 font-medium leading-tight">Total Sales</p>
              <p className="text-base font-bold text-blue-900 leading-tight">{totalSalesCount}</p>
            </div>
          </div>
          <p className="text-[9px] text-blue-600 mt-0.5 leading-tight">Completed transactions</p>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 p-2 rounded border border-green-100 shadow-sm animate-fade-in">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="p-0.5 bg-green-200 rounded">
              <DocumentChartBarIcon className="w-3 h-3 text-green-700" />
            </div>
            <div>
              <p className="text-[10px] text-green-700 font-medium leading-tight">Total Revenue</p>
              <p className="text-base font-bold text-green-900 leading-tight">${totalRevenue.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
            </div>
          </div>
          <p className="text-[9px] text-green-600 mt-0.5 leading-tight">Sum of values</p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-2 rounded border border-purple-100 shadow-sm animate-fade-in">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="p-0.5 bg-purple-200 rounded">
              <CreditCardIcon className="w-3 h-3 text-purple-700" />
            </div>
            <div>
              <p className="text-[10px] text-purple-700 font-medium leading-tight">Average Sale</p>
              <p className="text-base font-bold text-purple-900 leading-tight">${avgSaleValue.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
            </div>
          </div>
          <p className="text-[9px] text-purple-600 mt-0.5 leading-tight">Avg per transaction</p>
        </div>
      </div>

      {/* Export Dropdown */}
      <div className="flex items-center gap-2 mb-3">
        <label htmlFor="export-action" className="text-xs font-medium text-gray-700">Export / Print:</label>
        <select
          id="export-action"
          className="px-3 py-1 border border-gray-300 rounded text-xs bg-white shadow-sm"
          defaultValue=""
          onChange={e => {
            if (e.target.value === "csv") handleExportCSV();
            if (e.target.value === "excel") handleExportExcel();
            if (e.target.value === "pdf") handleExportPDF();
            if (e.target.value === "print") window.print();
            e.target.value = "";
          }}
        >
          <option value="" disabled>Select action</option>
          <option value="csv">Export CSV</option>
          <option value="excel">Export Excel</option>
          <option value="pdf">Export PDF</option>
          <option value="print">Print Report</option>
        </select>
      </div>

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded border border-gray-200 p-6 text-center flex flex-col items-center animate-fade-in">
          <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
          <p className="text-gray-500 mb-4">
            {sales.length === 0
              ? "No sales have been recorded yet."
              : "No sales match your current filters."}
          </p>
          {(filterStart || filterEnd || filterCashier || filterPayment) ? (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="bg-white rounded border border-gray-200 overflow-hidden shadow-sm mb-3 animate-fade-in">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Date & Time</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Sale ID</th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-600">Total</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Payment</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Customer</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Branch</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600">Cashier</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedSales.map((sale) => (
                    <tr
                      key={sale.saleId}
                      className="hover:bg-blue-50 transition-colors duration-150"
                    >
                      <td className="py-3 px-4">{new Date(sale.date).toLocaleString()}</td>
                      <td className="py-3 px-4">{sale.saleId.slice(0, 8)}</td>
                      <td className="py-3 px-4 text-right">{sale.total.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        {sale.isSplitPayment && sale.splitPayments ? (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-purple-600">💳 SPLIT PAYMENT</div>
                            {sale.splitPayments.map((payment, idx) => (
                              <div key={idx} className="text-xs text-gray-600">
                                {payment.method === 'cash' && (
                                  <span>💵 CASH: Ksh {payment.amount.toFixed(2)}</span>
                                )}
                                {payment.method === 'mpesa' && (
                                  <span>
                                    📱 MPESA: Ksh {payment.amount.toFixed(2)}
                                    {payment.mpesaTransactionId && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        Transaction: {payment.mpesaTransactionId}
                                      </div>
                                    )}
                                  </span>
                                )}
                                {payment.method === 'credit' && (
                                  <span>💳 CREDIT: Ksh {payment.amount.toFixed(2)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="capitalize">{sale.paymentType || 'N/A'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{sale.customerName || '-'}</td>
                      <td className="py-3 px-4">{sale.branch?.name || '-'}</td>
                      <td className="py-3 px-4">{sale.cashier || '-'}</td>
                      <td className="py-3 px-4 text-center flex gap-1 justify-center">
                        <button
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-600 hover:text-white text-xs transition-colors duration-150 shadow-sm"
                          onClick={() => handlePrintReceipt(sale)}
                          disabled={isPrinting}
                          title="Print Receipt"
                        >
                          Print Receipt
                        </button>
                        <button
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-300 text-xs transition-colors duration-150 shadow-sm"
                          onClick={() => { setSelectedSale(sale); setShowDetailsModal(true); }}
                          title="View Details"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 mb-4 animate-fade-in">
              <div className="text-sm text-gray-700">
                Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, filteredSales.length)} of {filteredSales.length} results
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  title="First Page"
                >
                  First
                </button>
                <button
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  title="Previous Page"
                >
                  Previous
                </button>
                <span className="px-3 py-2 text-gray-600 font-semibold">{page} / {pageCount}</span>
                <button
                  onClick={() => setPage(prev => Math.min(prev + 1, pageCount))}
                  disabled={page === pageCount}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  title="Next Page"
                >
                  Next
                </button>
                <button
                  onClick={() => setPage(pageCount)}
                  disabled={page === pageCount}
                  className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  title="Last Page"
                >
                  Last
                </button>
              </div>
            </div>
          )}

          {/* Sale Details Modal */}
          {showDetailsModal && selectedSale && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative animate-fade-in">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                  onClick={() => setShowDetailsModal(false)}
                  title="Close"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold mb-2 text-gray-900">Sale Details</h2>
                <div className="text-xs text-gray-700 space-y-2">
                  <div><span className="font-semibold">Sale ID:</span> {selectedSale.saleId}</div>
                  <div><span className="font-semibold">Date:</span> {new Date(selectedSale.date).toLocaleString()}</div>
                  <div><span className="font-semibold">Total:</span> {selectedSale.total.toFixed(2)}</div>
                  <div><span className="font-semibold">Payment:</span> {selectedSale.paymentType}</div>
                  {selectedSale.isSplitPayment && selectedSale.splitPayments && (
                    <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="font-semibold text-purple-700 mb-2">💳 Split Payment Details:</div>
                      <div className="space-y-2">
                        {selectedSale.splitPayments.map((payment, idx) => (
                          <div key={idx} className="text-sm border-l-2 border-purple-300 pl-2">
                            {payment.method === 'cash' && (
                              <div>
                                <span className="font-semibold">💵 Cash:</span> Ksh {payment.amount.toFixed(2)}
                                {payment.amountReceived && payment.amountReceived > payment.amount && (
                                  <div className="text-xs text-gray-600 ml-4">
                                    Received: Ksh {payment.amountReceived.toFixed(2)} 
                                    (Change: Ksh {(payment.amountReceived - payment.amount).toFixed(2)})
                                  </div>
                                )}
                              </div>
                            )}
                            {payment.method === 'mpesa' && (
                              <div>
                                <span className="font-semibold">📱 M-Pesa:</span> Ksh {payment.amount.toFixed(2)}
                                {payment.mpesaTransactionId && (
                                  <div className="text-xs text-gray-600 ml-4 mt-1">
                                    Transaction: {payment.mpesaTransactionId}
                                  </div>
                                )}
                                {payment.mpesaReceipt && (
                                  <div className="text-xs text-gray-600 ml-4">
                                    Receipt: {payment.mpesaReceipt}
                                  </div>
                                )}
                              </div>
                            )}
                            {payment.method === 'credit' && (
                              <div>
                                <span className="font-semibold">💳 Credit:</span> Ksh {payment.amount.toFixed(2)}
                                {payment.creditDueDate && (
                                  <div className="text-xs text-gray-600 ml-4">
                                    Due Date: {new Date(payment.creditDueDate).toLocaleDateString()}
                                  </div>
                                )}
                                {payment.creditNotes && (
                                  <div className="text-xs text-gray-600 ml-4">
                                    Notes: {payment.creditNotes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div><span className="font-semibold">Customer:</span> {selectedSale.customerName || '-'}</div>
                  <div><span className="font-semibold">Phone:</span> {selectedSale.customerPhone || '-'}</div>
                  <div><span className="font-semibold">Branch:</span> {selectedSale.branch?.name || '-'}</div>
                  <div><span className="font-semibold">Cashier:</span> {selectedSale.cashier || '-'}</div>
                  {selectedSale.mpesaTransaction && !selectedSale.isSplitPayment && (
                    <div>
                      <span className="font-semibold">Mpesa:</span> {selectedSale.mpesaTransaction.phoneNumber} <br />
                      <span className="font-semibold">Mpesa Receipt:</span> {selectedSale.mpesaTransaction.mpesaReceipt || '-'}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Items:</span>
                    <ul className="list-disc ml-4 mt-1">
                      {selectedSale.items.map((item) => (
                        <li key={item.name}>
                          {item.name} &times; {item.quantity} @ {item.price.toFixed(2)} = {(item.price * item.quantity).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Add some simple animation classes (can be in your global CSS or Tailwind config)
// .animate-fade-in { animation: fadeIn 0.5s ease; }
// .animate-slide-down { animation: slideDown 0.4s ease; }
// .animate-pulse { animation: pulse 1.5s infinite; }
// .animate-bounce { animation: bounce 1s infinite; }
