"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiGet } from "@/utils/api";
import { getReceiptLogoUrl, getFullAssetUrl } from "@/utils/logoUrl";
import { useAppPreferences } from "@/hooks/useAppPreferences";
import { formatDate as formatDateLocale } from "@/utils/localeFormat";
import { preparePdfWatermark } from "@/utils/pdfTemplate";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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
  const searchParams = useSearchParams();
  const receiptRef = useRef<HTMLDivElement>(null);
  const hasAutoPrinted = useRef(false);
  const [receiptType, setReceiptType] = useState<'customer' | 'merchant'>('customer');
  const [isPrinting, setIsPrinting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
  const { preferences: appPrefs } = useAppPreferences();

  // Print styles for the receipt
  const printStyles = `
    @media print {
      body > *:not(#receipt-container) {
        display: none !important;
      }
      #receipt-container {
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .no-print {
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

  // Auto-print when opened with ?print=1 (e.g. after POS sale with "auto-print receipt" preference)
  useEffect(() => {
    if (!receipt || hasAutoPrinted.current) return;
    if (!searchParams || searchParams.get("print") !== "1") return;
    hasAutoPrinted.current = true;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [receipt, searchParams]);

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">Receipt ID is missing</div>;
  }

  const receiptUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + `/receipt/${receipt?.saleId}`;

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    
    try {
      setIsPrinting(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 297] // A4 width, auto height
      });
      await preparePdfWatermark(pdf, getFullAssetUrl(receipt?.businessInfo?.watermark));

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = 80; // mm
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`receipt-${receipt?.saleId?.slice(0, 8) || 'unknown'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsPrinting(false);
    }
  };

const handleShare = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Receipt #${receipt?.saleId?.slice(0, 8) || ''}`,
        text: 'View your digital receipt',
        url: receiptUrl,
      });
    } catch {
      // Sharing was cancelled
    }
  } else {
    // Fallback for browsers that don't support Web Share API
    navigator.clipboard.writeText(receiptUrl);
    alert('Link copied to clipboard!');
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

        /* Replace oklch with standard color values */
        .bg-gradient-to-br {
          background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
        }
        
        .from-blue-600 {
          --tw-gradient-from: #2563eb;
          --tw-gradient-to: rgba(37, 99, 235, 0);
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);
        }
        
        .to-blue-800 {
          --tw-gradient-to: #1e40af;
        }
        
        .bg-blue-50 {
          background-color: #eff6ff;
        }
        
        .border-yellow-100 {
          border-color: #fef9c3;
        }
        
        .bg-yellow-50 {
          background-color: #fffbeb;
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
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-4 text-center">
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
                <span>{formatDateLocale(receipt.date, appPrefs.language, appPrefs.region, {
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
                {receipt.receiptType === 'merchant' && receipt.items.some(i => i.cost != null) ? (
                  <>
                    <div className="col-span-2 text-right">AMOUNT</div>
                    <div className="col-span-1 text-right">COST</div>
                  </>
                ) : (
                  <div className="col-span-3 text-right">AMOUNT</div>
                )}
              </div>
              
              <div className="space-y-2">
                {receipt.items.map((item: ReceiptItem, index: number) => (
                  <div key={index} className="grid grid-cols-12 gap-2 text-sm">
                    <div className="col-span-7 font-medium">{item.name}</div>
                    <div className="col-span-2 text-right text-gray-600">×{item.quantity}</div>
                    {receipt.receiptType === 'merchant' && receipt.items.some(i => i.cost != null) ? (
                      <>
                        <div className="col-span-2 text-right font-medium">
                          KES {(item.price * item.quantity).toFixed(2)}
                        </div>
                        <div className="col-span-1 text-right text-gray-600 text-xs">
                          {item.cost != null ? `KES ${(item.cost * item.quantity).toFixed(2)}` : '—'}
                        </div>
                      </>
                    ) : (
                      <div className="col-span-3 text-right font-medium">
                        KES {(item.price * item.quantity).toFixed(2)}
                      </div>
                    )}
                    {item.price > 0 && !(receipt.receiptType === 'merchant' && receipt.items.some(i => i.cost != null)) && (
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
                    <span className="text-gray-600">VAT @ {(vatRate * 100).toFixed(0)}%:</span>
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
                </div>
              </div>
            </div>

            {/* Merchant-only: Cost & Profit */}
            {receipt.receiptType === 'merchant' && (receipt.totalCost != null || receipt.totalProfit != null) && (
              <div className="bg-amber-50 rounded-lg p-3 mb-4 border border-amber-200">
                <div className="text-xs font-semibold text-amber-800 mb-2">Internal (Merchant)</div>
                <div className="space-y-1 text-sm">
                  {receipt.totalCost != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-medium">KES {(receipt.totalCost as number).toFixed(2)}</span>
                    </div>
                  )}
                  {receipt.totalProfit != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Profit:</span>
                      <span className={`font-bold ${(receipt.totalProfit as number) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        KES {(receipt.totalProfit as number).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}