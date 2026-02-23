"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/utils/api";
import { getReceiptLogoUrl } from "@/utils/logoUrl";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import { preparePdfWatermark } from "@/utils/pdfTemplate";
import { getFullAssetUrl } from "@/utils/logoUrl";
import { Download, Printer, Share2 } from "lucide-react";

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  cost?: number;
}

interface Receipt {
  saleId: string;
  date: string;
  receiptType?: 'customer' | 'merchant';
  items: ReceiptItem[];
  subtotal?: number;
  vatAmount?: number;
  total?: number;
  totalCost?: number;
  totalProfit?: number;
  paymentMethod?: string;
  amountReceived?: number;
  change?: number;
  customerName?: string;
  customerPhone?: string;
  branch?: {
    id: string;
    name: string;
    address?: string;
  };
  businessInfo?: BusinessInfo;
  mpesaTransaction?: {
    phoneNumber: string;
    amount: number;
    status: string;
    mpesaReceipt?: string;
    message?: string;
    transactionDate?: string;
  };
  // ...other fields
}

interface BusinessInfo {
  logoUrl?: string;
  receiptLogo?: string;
  watermark?: string | null;
  name?: string;
  businessType?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  kraEnabled?: boolean;
  kraPin?: string;
  vatNumber?: string;
  etimsQrUrl?: string | null;
}

export default function DigitalReceiptPage() {
  const params = useParams();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptType, setReceiptType] = useState<'customer' | 'merchant'>('customer');
  const [isPrinting, setIsPrinting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;

  // Print styles for the receipt
  const printStyles = `
    @media print {
      @page {
        margin: 0;
        size: auto;
      }

      html, body {
        height: auto;
        overflow: visible !important;
      }

      body * {
        visibility: hidden;
      }

      #receipt-container {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        visibility: visible !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }

      #receipt-container * {
        visibility: visible !important;
      }

      .no-print {
        display: none !important;
      }

      /* Force all text to black for printing */
      #receipt-container {
        color: black !important;
      }

      #receipt-container * {
        color: black !important;
        background: transparent !important;
        border-color: black !important;
      }

      /* Specific overrides for colored elements */
      .bg-blue-600 {
        background-color: white !important;
        color: black !important;
      }

      .text-white {
        color: black !important;
      }

      .bg-white {
        background-color: white !important;
      }

      .text-gray-500, .text-gray-600, .text-gray-700,
      .text-blue-600, .text-blue-700, .text-blue-900 {
        color: black !important;
      }

      /* Hide action buttons and other non-receipt elements */
      button, .no-print, .flex.gap-3.mb-6 {
        display: none !important;
      }
    }
  `;

  // Add print styles to the document head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [printStyles]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const receiptDataRaw = await apiGet(`/sales/${id}/receipt?type=${receiptType}`);
        const receiptData = receiptDataRaw as Receipt;
        const vatRate = 0.16;
        let subtotal = receiptData.subtotal;
        let vatAmount = receiptData.vatAmount;

        if (!subtotal && receiptData.total) {
          subtotal = receiptData.total / (1 + vatRate);
        }

        if (!vatAmount && receiptData.total && subtotal) {
          vatAmount = receiptData.total - subtotal;
        }

        const processedReceipt: Receipt = {
          ...receiptData,
          receiptType: receiptType,
          vatAmount: vatAmount,
          subtotal: subtotal,
          items: receiptData.items?.map((item: ReceiptItem) => ({
            ...item,
            price: item.price || 0,
            quantity: item.quantity || 1,
            cost: item.cost,
          })) || []
        };
        setReceipt(processedReceipt);
        setBusinessInfo((receiptData.businessInfo as BusinessInfo) || null);
      } catch (error: unknown) {
        if (error instanceof Error) {
          setError(error.message || "Failed to load receipt");
        } else {
          setError("Failed to load receipt");
        }
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
  }, [id, receiptType]);

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">Receipt ID is missing</div>;
  }

  const receiptUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + `/receipt/${receipt?.saleId}`;

  const handlePrint = () => {
    setIsPrinting(true);

    // Create a temporary print-friendly version
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for printing');
      setIsPrinting(false);
      return;
    }

    // Get the receipt content
    const receiptElement = document.getElementById('receipt-container');
    if (!receiptElement) {
      alert('Receipt content not found');
      setIsPrinting(false);
      return;
    }

    // Clone the receipt content
    const receiptClone = receiptElement.cloneNode(true) as HTMLElement;

    // Remove action buttons and other non-print elements
    const buttons = receiptClone.querySelectorAll('button, .no-print');
    buttons.forEach(button => button.remove());

    // Create print HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt?.saleId?.slice(0, 8) || 'Unknown'}</title>
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
          </style>
        </head>
        <body>
          <div class="receipt">
            ${receiptClone.innerHTML}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 500);
    };
  };

  const handleDownloadPDF = async () => {
    if (!receipt) return;

    try {
      setIsPrinting(true);

      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297] // 80mm width (thermal receipt standard)
      });
      await preparePdfWatermark(pdf, getFullAssetUrl(businessInfo?.watermark));

      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 10;

      // Set font
      pdf.setFont('helvetica', 'normal');

      // Header - Business Info
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      if (businessInfo?.name) {
        pdf.text(businessInfo.name, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 6;
      }

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      if (businessInfo?.businessType) {
        pdf.text(businessInfo.businessType, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 4;
      }

      if (businessInfo?.address) {
        pdf.text(businessInfo.address, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 4;
      }

      if (businessInfo?.contactPhone) {
        pdf.text(`Phone: ${businessInfo.contactPhone}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 4;
      }

      if (businessInfo?.kraEnabled && businessInfo?.kraPin) {
        pdf.text(`KRA PIN: ${businessInfo.kraPin}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 4;
      }

      if (businessInfo?.kraEnabled && businessInfo?.vatNumber) {
        pdf.text(`VAT No: ${businessInfo.vatNumber}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 6;
      }

      // Separator line
      pdf.line(5, yPosition, pageWidth - 5, yPosition);
      yPosition += 6;

      // Receipt title
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TAX INVOICE', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;

      // Receipt details
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Receipt No: #${receipt.saleId?.slice(0, 8) || 'N/A'}`, 5, yPosition);
      pdf.text(`Date: ${new Date(receipt.date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, pageWidth - 5, yPosition, { align: 'right' });
      yPosition += 6;

      // Customer info
      if (receipt.customerName || receipt.customerPhone) {
        pdf.text('Customer:', 5, yPosition);
        yPosition += 4;
        if (receipt.customerName) {
          pdf.text(`Name: ${receipt.customerName}`, 8, yPosition);
          yPosition += 4;
        }
        if (receipt.customerPhone) {
          pdf.text(`Phone: ${receipt.customerPhone}`, 8, yPosition);
          yPosition += 4;
        }
        yPosition += 2;
      }

      // Branch info
      if (receipt.branch) {
        pdf.text('Branch:', 5, yPosition);
        yPosition += 4;
        pdf.text(`${receipt.branch.name}`, 8, yPosition);
        yPosition += 4;
        if (receipt.branch.address) {
          pdf.text(`${receipt.branch.address}`, 8, yPosition);
          yPosition += 4;
        }
        yPosition += 2;
      }

      // Items header
      pdf.setFont('helvetica', 'bold');
      pdf.text('ITEM', 5, yPosition);
      pdf.text('QTY', pageWidth - 25, yPosition);
      pdf.text('AMOUNT', pageWidth - 5, yPosition, { align: 'right' });
      yPosition += 2;

      // Separator line
      pdf.line(5, yPosition, pageWidth - 5, yPosition);
      yPosition += 4;

      // Items
      pdf.setFont('helvetica', 'normal');
      const vatRate = 0.16;
      const calculatedSubtotal = receipt.items?.reduce((sum: number, item: ReceiptItem) => {
        return sum + (Number(item.price) * (Number(item.quantity) || 1));
      }, 0) || 0;

      const subtotal = receipt.subtotal ?? calculatedSubtotal;
      const total = receipt.total ?? subtotal * (1 + vatRate);
      const vatAmount = receipt.vatAmount ?? (total - subtotal);

      receipt.items?.forEach((item: ReceiptItem) => {
        const itemName = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name;
        pdf.text(itemName, 5, yPosition);
        pdf.text(`x${item.quantity}`, pageWidth - 25, yPosition);
        pdf.text(`KES ${(item.price * item.quantity).toFixed(2)}`, pageWidth - 5, yPosition, { align: 'right' });
        yPosition += 4;

        if (item.price > 0) {
          pdf.setFontSize(6);
          pdf.text(`@ KES ${item.price.toFixed(2)} each`, 8, yPosition);
          yPosition += 3;
          pdf.setFontSize(8);
        }
      });

      yPosition += 2;

      // Totals section
      pdf.line(5, yPosition, pageWidth - 5, yPosition);
      yPosition += 4;

      pdf.text('Subtotal:', 5, yPosition);
      pdf.text(`KES ${subtotal.toFixed(2)}`, pageWidth - 5, yPosition, { align: 'right' });
      yPosition += 4;

      pdf.text(`VAT @ ${(vatRate * 100).toFixed(0)}%:`, 5, yPosition);
      pdf.text(`KES ${vatAmount.toFixed(2)}`, pageWidth - 5, yPosition, { align: 'right' });
      yPosition += 4;

      // Total
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.line(5, yPosition, pageWidth - 5, yPosition);
      yPosition += 5;

      pdf.text('TOTAL:', 5, yPosition);
      pdf.text(`KES ${total.toFixed(2)}`, pageWidth - 5, yPosition, { align: 'right' });
      yPosition += 6;

      // Payment details
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Payment Method: ${receipt.paymentMethod || 'N/A'}`, 5, yPosition);
      yPosition += 4;

      if (receipt.paymentMethod === "cash" && (receipt.amountReceived ?? 0) > 0) {
        pdf.text(`Amount Tendered: KES ${(receipt.amountReceived ?? 0).toFixed(2)}`, 5, yPosition);
        yPosition += 4;
        pdf.text(`Change: KES ${receipt.change?.toFixed(2) || '0.00'}`, 5, yPosition);
        yPosition += 6;
      }

      if (receipt.paymentMethod === "mpesa" && receipt.mpesaTransaction?.mpesaReceipt) {
        pdf.text(`M-Pesa Receipt: ${receipt.mpesaTransaction.mpesaReceipt}`, 5, yPosition);
        yPosition += 6;
      }

      // Footer
      pdf.setFontSize(8);
      pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;

      pdf.setFontSize(6);
      pdf.text('No returns without receipt. Items can be returned within 14 days.', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 3;

      if (businessInfo?.contactPhone) {
        pdf.text(`For inquiries: ${businessInfo.contactPhone}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 3;
      }

      pdf.text('Created by Adeera Unitech Company', pageWidth / 2, yPosition, { align: 'center' });

      pdf.save(`receipt-${receipt.saleId?.slice(0, 8) || 'unknown'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

const handleShare = async () => {
  try {
    if (!receipt) return;

    // Create a new PDF document for sharing
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297]
    });
    await preparePdfWatermark(pdf, getFullAssetUrl(businessInfo?.watermark));

    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 10;

    // Set font
    pdf.setFont('helvetica', 'normal');

    // Header - Business Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    if (businessInfo?.name) {
      pdf.text(businessInfo.name, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
    }

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    if (businessInfo?.businessType) {
      pdf.text(businessInfo.businessType, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }

    if (businessInfo?.address) {
      pdf.text(businessInfo.address, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }

    if (businessInfo?.contactPhone) {
      pdf.text(`Phone: ${businessInfo.contactPhone}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }

    if (businessInfo?.kraEnabled && businessInfo?.kraPin) {
      pdf.text(`KRA PIN: ${businessInfo.kraPin}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }

    if (businessInfo?.kraEnabled && businessInfo?.vatNumber) {
      pdf.text(`VAT No: ${businessInfo.vatNumber}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
    }

    // Separator line
    pdf.line(5, yPosition, pageWidth - 5, yPosition);
    yPosition += 6;

    // Receipt title
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TAX INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;

    // Receipt details
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Receipt No: #${receipt.saleId?.slice(0, 8) || 'N/A'}`, 5, yPosition);
    pdf.text(`Date: ${new Date(receipt.date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, pageWidth - 5, yPosition, { align: 'right' });
    yPosition += 6;

    // Customer info
    if (receipt.customerName || receipt.customerPhone) {
      pdf.text('Customer:', 5, yPosition);
      yPosition += 4;
      if (receipt.customerName) {
        pdf.text(`Name: ${receipt.customerName}`, 8, yPosition);
        yPosition += 4;
      }
      if (receipt.customerPhone) {
        pdf.text(`Phone: ${receipt.customerPhone}`, 8, yPosition);
        yPosition += 4;
      }
      yPosition += 2;
    }

    // Branch info
    if (receipt.branch) {
      pdf.text('Branch:', 5, yPosition);
      yPosition += 4;
      pdf.text(`${receipt.branch.name}`, 8, yPosition);
      yPosition += 4;
      if (receipt.branch.address) {
        pdf.text(`${receipt.branch.address}`, 8, yPosition);
        yPosition += 4;
      }
      yPosition += 2;
    }

    // Items header
    pdf.setFont('helvetica', 'bold');
    pdf.text('ITEM', 5, yPosition);
    pdf.text('QTY', pageWidth - 25, yPosition);
    pdf.text('AMOUNT', pageWidth - 5, yPosition, { align: 'right' });
    yPosition += 2;

    // Separator line
    pdf.line(5, yPosition, pageWidth - 5, yPosition);
    yPosition += 4;

    // Items
    pdf.setFont('helvetica', 'normal');
    const vatRate = 0.16;
    const calculatedSubtotal = receipt.items?.reduce((sum: number, item: ReceiptItem) => {
      return sum + (Number(item.price) * (Number(item.quantity) || 1));
    }, 0) || 0;

    const subtotal = receipt.subtotal ?? calculatedSubtotal;
    const total = receipt.total ?? subtotal * (1 + vatRate);
    const vatAmount = receipt.vatAmount ?? (total - subtotal);

    receipt.items?.forEach((item: ReceiptItem) => {
      const itemName = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name;
      pdf.text(itemName, 5, yPosition);
      pdf.text(`x${item.quantity}`, pageWidth - 25, yPosition);
      pdf.text(`KES ${(item.price * item.quantity).toFixed(2)}`, pageWidth - 5, yPosition, { align: 'right' });
      yPosition += 4;

      if (item.price > 0) {
        pdf.setFontSize(6);
        pdf.text(`@ KES ${item.price.toFixed(2)} each`, 8, yPosition);
        yPosition += 3;
        pdf.setFontSize(8);
      }
    });

    yPosition += 2;

    // Totals section
    pdf.line(5, yPosition, pageWidth - 5, yPosition);
    yPosition += 4;

    pdf.text('Subtotal:', 5, yPosition);
    pdf.text(`KES ${subtotal.toFixed(2)}`, pageWidth - 5, yPosition, { align: 'right' });
    yPosition += 4;

    pdf.text(`VAT @ ${(vatRate * 100).toFixed(0)}%:`, 5, yPosition);
    pdf.text(`KES ${vatAmount.toFixed(2)}`, pageWidth - 5, yPosition, { align: 'right' });
    yPosition += 4;

    // Total
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.line(5, yPosition, pageWidth - 5, yPosition);
    yPosition += 5;

    pdf.text('TOTAL:', 5, yPosition);
    pdf.text(`KES ${total.toFixed(2)}`, pageWidth - 5, yPosition, { align: 'right' });
    yPosition += 6;

    // Payment details
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(`Payment Method: ${receipt.paymentMethod || 'N/A'}`, 5, yPosition);
    yPosition += 4;

    if (receipt.paymentMethod === "cash" && (receipt.amountReceived ?? 0) > 0) {
      pdf.text(`Amount Tendered: KES ${(receipt.amountReceived ?? 0).toFixed(2)}`, 5, yPosition);
      yPosition += 4;
      pdf.text(`Change: KES ${receipt.change?.toFixed(2) || '0.00'}`, 5, yPosition);
      yPosition += 6;
    }

    // Footer
    pdf.setFontSize(8);
    pdf.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;

    pdf.setFontSize(6);
    pdf.text('No returns without receipt. Items can be returned within 14 days.', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 3;

    if (businessInfo?.contactPhone) {
      pdf.text(`For inquiries: ${businessInfo.contactPhone}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 3;
    }

    pdf.text('Created by Adeera Unitech Company', pageWidth / 2, yPosition, { align: 'center' });

    // Convert PDF to blob for sharing
    const pdfBlob = pdf.output('blob');
    const file = new File([pdfBlob], `receipt-${receipt.saleId?.slice(0, 8) || 'unknown'}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Share the PDF file directly
      await navigator.share({
        title: `Receipt #${receipt.saleId?.slice(0, 8) || ''}`,
        text: 'Digital receipt PDF',
        files: [file],
      });
    } else if (navigator.share) {
      // Fallback to sharing URL if file sharing not supported
      await navigator.share({
        title: `Receipt #${receipt.saleId?.slice(0, 8) || ''}`,
        text: 'View your digital receipt',
        url: receiptUrl,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      // Download the PDF instead
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt.saleId?.slice(0, 8) || 'unknown'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('PDF downloaded! Sharing not supported in this browser.');
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    // Fallback to copying link
    navigator.clipboard.writeText(receiptUrl);
    alert('Sharing failed. Link copied to clipboard instead.');
  }
};

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error || !receipt) return (
    <div className="min-h-screen flex items-center justify-center text-red-600">
      {error || "Receipt not found."}
    </div>
  );

  const vatRate = 0.16;
  const calculatedSubtotal = receipt.items?.reduce((sum: number, item: ReceiptItem) => {
    return sum + (Number(item.price) * (Number(item.quantity) || 1));
  }, 0) || 0;
  
  const subtotal = receipt.subtotal ?? calculatedSubtotal;
  const total = receipt.total ?? subtotal * (1 + vatRate);
  const vatAmount = receipt.vatAmount ?? (total - subtotal);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <style jsx global>{`
        @media print {
          body > *:not(#receipt-container) {
            display: none !important;
          }
        }

        /* Replace problematic CSS with standard values */
        .bg-blue-50 {
          background-color: #eff6ff !important;
        }

        .border-yellow-100 {
          border-color: #fef9c3 !important;
        }

        .bg-yellow-50 {
          background-color: #fffbeb !important;
        }
      `}</style>
      
      <div className="max-w-md mx-auto">
        {/* Receipt type: Customer | Merchant */}
        <div className="flex items-center gap-2 mb-4 no-print">
          <span className="text-sm font-medium text-gray-700">Receipt:</span>
          <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
            <button
              type="button"
              onClick={() => setReceiptType('customer')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                receiptType === 'customer'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setReceiptType('merchant')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                receiptType === 'merchant'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Merchant
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 no-print">
          <button 
            onClick={handleDownloadPDF}
            disabled={isPrinting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isPrinting ? 'Generating...' : 'Download PDF'}
          </button>
          <button 
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <button 
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>
        
        {/* Receipt Container */}
        <div 
          ref={receiptRef}
          id="receipt-container"
          className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${isPrinting ? 'scale-100' : 'hover:shadow-xl'}`}
          style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}
        >
          {/* Receipt Header */}
          <div className="bg-blue-600 text-white p-4 text-center">
            <div className="mb-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                receiptType === 'merchant' ? 'bg-amber-500/90 text-white' : 'bg-white/20 text-blue-100'
              }`}>
                {receiptType === 'merchant' ? 'MERCHANT COPY' : 'CUSTOMER COPY'}
              </span>
            </div>
            {(businessInfo?.receiptLogo || businessInfo?.logoUrl) && (
              <img
                src={getReceiptLogoUrl(businessInfo.receiptLogo, businessInfo.logoUrl)}
                alt="Business Logo"
                className="mx-auto mb-2 max-h-16 w-auto max-w-full object-contain"
              />
            )}
            <h1 className="text-xl font-bold tracking-wide">{businessInfo?.name || 'Business Name'}</h1>
            <p className="text-blue-100 text-sm">{businessInfo?.businessType || 'Retail'}</p>
            
            <div className="mt-2 text-xs text-blue-100 space-y-0.5">
              {businessInfo?.address && <div>{businessInfo.address}</div>}
              {businessInfo?.contactPhone && <div>Phone: {businessInfo.contactPhone}</div>}
              {businessInfo?.contactEmail && <div>Email: {businessInfo.contactEmail}</div>}
            </div>
            
            {/* KRA and VAT Info (only when KRA compliance is enabled) */}
            {businessInfo?.kraEnabled && (businessInfo?.kraPin || businessInfo?.vatNumber) && (
              <div className="mt-3 pt-2 border-t border-blue-500/30">
                {businessInfo?.kraPin && (
                  <div className="text-xs">
                    <span className="font-semibold">KRA PIN:</span> {businessInfo.kraPin}
                  </div>
                )}
                {businessInfo?.vatNumber && (
                  <div className="text-xs">
                    <span className="font-semibold">VAT No:</span> {businessInfo.vatNumber}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Receipt Body */}
          <div className="p-4">
            {/* Receipt Header */}
            <div className="text-center mb-4">
              <div className="text-sm text-gray-500 mb-1">TAX INVOICE</div>
              <div className="flex justify-between text-sm border-b border-dashed border-gray-200 pb-2 mb-3">
                <span>No:</span>
                <span className="font-medium">#{receipt.saleId?.slice(0, 8) || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Date:</span>
                <span>{new Date(receipt.date).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              
              {/* Barcode */}
              <div className="mt-3 flex justify-center">
                <Barcode 
                  value={receipt.saleId} 
                  width={1.2} 
                  height={32} 
                  fontSize={10} 
                  background="transparent"
                  lineColor="#374151"
                />
              </div>
            </div>
            
            {/* Customer Info */}
            {(receipt.customerName || receipt.customerPhone) && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                <h3 className="font-medium text-gray-700 mb-1">Customer</h3>
                {receipt.customerName && <div>Name: {receipt.customerName}</div>}
                {receipt.customerPhone && <div>Phone: {receipt.customerPhone}</div>}
              </div>
            )}

            {/* Branch Info */}
            {receipt.branch && (
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                <h3 className="font-medium text-blue-700 mb-1">Branch</h3>
                <div className="font-semibold text-blue-900">{receipt.branch.name}</div>
                {receipt.branch.address && <div className="text-blue-600">{receipt.branch.address}</div>}
              </div>
            )}
            
            {/* Items List */}
            <div className="mb-4">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1 mb-2">
                <div className="col-span-7">ITEM</div>
                <div className="col-span-2 text-right">QTY</div>
                <div className="col-span-3 text-right">AMOUNT</div>
              </div>
              
              <div className="space-y-2">
                {receipt.items.map((item: ReceiptItem, index: number) => (
                  <div key={index} className="grid grid-cols-12 gap-2 text-sm">
                    <div className="col-span-7 font-medium">{item.name}</div>
                    <div className="col-span-2 text-right text-gray-600">×{item.quantity}</div>
                    <div className="col-span-3 text-right font-medium">
                      KES {(item.price * item.quantity).toFixed(2)}
                    </div>
                    {item.price > 0 && (
                      <div className="col-span-12 text-xs text-gray-500 -mt-1">
                        @ KES {item.price.toFixed(2)} each
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>KES {subtotal.toFixed(2)}</span>
                </div>
                
                <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT @ ${(vatRate * 100).toFixed(0)}%:</span>
                    <span className="font-medium">
                      KES {vatAmount.toFixed(2)}
                    </span>
                  </div>
                  {!businessInfo?.vatNumber && (
                    <div className="text-xs text-yellow-700 mt-1">
                      VAT not registered
                    </div>
                  )}
                </div>
                
                <div className="border-t border-dashed border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>TOTAL:</span>
                    <span className="text-lg">KES {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Payment Details */}
              <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="capitalize font-medium">{receipt.paymentMethod || 'N/A'}</span>
                  </div>
                  
                  {receipt.paymentMethod === "cash" && (receipt.amountReceived ?? 0) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount Tendered:</span>
                        <span>KES {(receipt.amountReceived ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Change:</span>
                        <span>KES {receipt.change?.toFixed(2) || '0.00'}</span>
                      </div>
                    </>
                  )}

                  {receipt.paymentMethod === "mpesa" && receipt.mpesaTransaction?.mpesaReceipt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">M-Pesa Receipt:</span>
                      <span className="font-medium">{receipt.mpesaTransaction.mpesaReceipt}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="text-center text-xs text-gray-500 space-y-2">
              <div className="flex justify-center mb-2">
                <QRCodeCanvas
                  value={receiptUrl}
                  size={80}
                />
              </div>
              
              <div className="font-medium text-gray-700">Thank you for your business!</div>
              <p>Scan the QR code to verify this receipt</p>
              
              <div className="mt-3 pt-2 border-t border-dashed border-gray-200 text-[11px] text-gray-400">
                <p>No returns without receipt. Items can be returned within 14 days with receipt.</p>
                <p className="mt-1">For inquiries, contact: {businessInfo?.contactPhone || 'N/A'}</p>
                <p className="mt-2 text-center font-medium text-gray-500">Created by Adeera Unitech Company</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}