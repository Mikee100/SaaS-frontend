"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/utils/api";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Download, Printer, Share2 } from "lucide-react";
import Image from "next/image";

// Add this CSS for better print styling
const printStyles = `
  @media print {
    @page { margin: 0; size: auto; }
    body { -webkit-print-color-adjust: exact; }
    .no-print { display: none !important; }
    .print-receipt { 
      box-shadow: none !important;
      border: none !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .receipt-container { 
      box-shadow: none !important;
      border: none !important;
    }
  }
`;

export default function DigitalReceiptPage() {
  const params = useParams();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [receipt, setReceipt] = useState<{
    saleId: string;
    date: string;
    subtotal?: number;
    total?: number;
    vatAmount?: number;
    paymentMethod?: string;
    amountReceived?: number;
    change?: number;
    customerName?: string;
    customerPhone?: string;
    items: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
  } | null>(null);
  const [businessInfo, setBusinessInfo] = useState<{
    name?: string;
    businessType?: string;
    address?: string;
    contactPhone?: string;
    contactEmail?: string;
    logoUrl?: string;
    kraPin?: string;
    vatNumber?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;

  // Add print styles to the document head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = printStyles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [receiptDataRaw, business] = await Promise.all([
          apiGet(`/sales/${id}`),
          apiGet('/tenant/me'),
        ]);

        // Type assertion for receiptData
        const receiptData = receiptDataRaw as {
          saleId: string;
          date: string;
          subtotal?: number;
          total?: number;
          vatAmount?: number;
          paymentMethod?: string;
          amountReceived?: number;
          change?: number;
          customerName?: string;
          customerPhone?: string;
          items: Array<{
            name: string;
            price: number;
            quantity: number;
          }>;
        };

        const vatRate = 0.16;
        let subtotal = receiptData.subtotal;
        let vatAmount = receiptData.vatAmount;

        if (!subtotal && receiptData.total) {
          subtotal = receiptData.total / (1 + vatRate);
        }

        if (!vatAmount && receiptData.total && subtotal) {
          vatAmount = receiptData.total - subtotal;
        }

        const processedReceipt = {
          ...receiptData,
          vatRate: vatRate,
          vatAmount: vatAmount,
          subtotal: subtotal,
          items: receiptData.items?.map((item: { name: string; price: number; quantity: number }) => ({
            ...item,
            price: item.price || 0,
            quantity: item.quantity || 1
          })) || []
        };

        setReceipt(processedReceipt);
        setBusinessInfo(business as {
          name?: string;
          businessType?: string;
          address?: string;
          contactPhone?: string;
          contactEmail?: string;
          logoUrl?: string;
          kraPin?: string;
          vatNumber?: string;
        } | null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load receipt");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
  }, [id]);

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
  const calculatedSubtotal = receipt.items?.reduce((sum: number, item: { name: string; price: number; quantity: number }) => {
    return sum + (Number(item.price) * (Number(item.quantity) || 1));
  }, 0) || 0;
  
  const subtotal = receipt.subtotal ?? calculatedSubtotal;
  const total = receipt.total ?? subtotal * (1 + vatRate);
  const vatAmount = receipt.vatAmount ?? (total - subtotal);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <style jsx global>{`
        @media print {
          body > *:not(#receipt-container) {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="max-w-md mx-auto">
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
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 text-center">
              {businessInfo?.logoUrl && (
              <Image
                src={businessInfo.logoUrl}
                alt="Business Logo"
                width={128}
                height={64}
                className="mx-auto mb-2 max-h-16 w-auto max-w-full"
                style={{ objectFit: 'contain' }}
                priority
              />
            )}
            <h1 className="text-xl font-bold tracking-wide">{businessInfo?.name || 'Business Name'}</h1>
            <p className="text-blue-100 text-sm">{businessInfo?.businessType || 'Retail'}</p>
            
            <div className="mt-2 text-xs text-blue-100 space-y-0.5">
              {businessInfo?.address && <div>{businessInfo.address}</div>}
              {businessInfo?.contactPhone && <div>Phone: {businessInfo.contactPhone}</div>}
              {businessInfo?.contactEmail && <div>Email: {businessInfo.contactEmail}</div>}
            </div>
            
            {/* KRA and VAT Info */}
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
            
            {/* Items List */}
            <div className="mb-4">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 border-b border-gray-200 pb-1 mb-2">
                <div className="col-span-7">ITEM</div>
                <div className="col-span-2 text-right">QTY</div>
                <div className="col-span-3 text-right">AMOUNT</div>
              </div>
              
              <div className="space-y-2">
                {receipt.items.map((item: { name: string; price: number; quantity: number }, index: number) => (
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
                  
                  {receipt.paymentMethod === "cash" && receipt.amountReceived && receipt.amountReceived > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount Tendered:</span>
                        <span>KES {receipt.amountReceived.toFixed(2)}</span>
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