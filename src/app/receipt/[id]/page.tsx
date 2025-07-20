"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/utils/api";
import Barcode from "react-barcode";
import { QRCodeCanvas } from "qrcode.react";

export default function DigitalReceiptPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState<any>(null);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [receiptData, business] = await Promise.all([
          apiGet(`/sales/${id}`),
          apiGet('/tenant/me'),
        ]);
        setReceipt(receiptData);
        setBusinessInfo(business);
      } catch (e: any) {
        setError(e?.message || "Failed to load receipt");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchData();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error || !receipt) return <div className="p-8 text-center text-red-600">{error || "Receipt not found."}</div>;

  const receiptUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com') + `/receipt/${receipt.saleId}`;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${receipt.saleId.slice(0, 8)}`,
          text: 'View your digital receipt',
          url: receiptUrl,
        });
      } catch (e) {
        // Optionally handle error
      }
    } else {
      alert('Sharing is not supported on this device/browser.');
    }
  };

  // VAT/subtotal calculation
  const isVatRegistered = !!businessInfo?.vatNumber;
  const total = receipt.total;
  const vat = isVatRegistered ? receipt.vatAmount ?? 0 : 0;
  const subtotal = isVatRegistered ? total - vat : total;

  return (
    <div className="print-receipt max-w-sm mx-auto p-6 bg-white rounded shadow-none border-none font-mono text-xs" style={{ width: 340 }}>
      {/* Download/Share Buttons (hidden in print) */}
      <div className="flex gap-2 mb-4 no-print">
        <button onClick={handlePrint} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Download PDF</button>
        <button onClick={handleShare} className="flex-1 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium">Share</button>
      </div>
      {/* Header */}
      <div className="text-center mb-2">
        {/* KRA Details */}
        {businessInfo?.kraPin && (
          <div className="text-xs font-mono text-center mb-1">
            <span className="font-semibold">KRA PIN:</span> {businessInfo.kraPin}
          </div>
        )}
        {businessInfo?.vatNumber && (
          <div className="text-xs font-mono text-center mb-1">
            <span className="font-semibold">VAT No:</span> {businessInfo.vatNumber}
          </div>
        )}
        <div className="text-xs font-mono text-center mb-1">
          <span className="font-semibold">Tax Invoice No:</span> {receipt.saleId.slice(0, 8)}
        </div>
        <div className="text-xs font-mono text-center mb-1">
          <span className="font-semibold">This is a tax invoice</span>
        </div>
        {businessInfo?.logoUrl && (
          <img src={businessInfo.logoUrl} alt="Business Logo" className="mx-auto mb-2 max-h-16" style={{ objectFit: 'contain' }} />
        )}
        {businessInfo && (
          <>
            <div className="font-bold text-lg tracking-wide">{businessInfo.name}</div>
            <div className="text-xs">{businessInfo.businessType}</div>
            {businessInfo.address && <div className="text-xs">{businessInfo.address}</div>}
            {businessInfo.contactPhone && <div className="text-xs">Phone: {businessInfo.contactPhone}</div>}
            {businessInfo.contactEmail && <div className="text-xs mb-1">Email: {businessInfo.contactEmail}</div>}
          </>
        )}
        {/* Barcode for receipt number */}
        <div className="flex justify-center my-2">
          <Barcode value={receipt.saleId} width={1.2} height={32} fontSize={10} />
        </div>
        <div className="border-t border-dashed my-2"></div>
        <div className="flex justify-between">
          <span>Receipt:</span>
          <span className="font-bold">#{receipt.saleId.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{new Date(receipt.date).toLocaleString()}</span>
        </div>
        {receipt.customerName && (
          <div className="flex justify-between">
            <span>Customer:</span>
            <span>{receipt.customerName}</span>
          </div>
        )}
        {receipt.customerPhone && (
          <div className="flex justify-between">
            <span>Phone:</span>
            <span>{receipt.customerPhone}</span>
          </div>
        )}
        <div className="border-t border-dashed my-2"></div>
      </div>

      {/* Items */}
      <div>
        {receipt.items.map((item: any) => (
          <div key={item.productId} className="flex justify-between mb-1">
            <span>
              {item.quantity} x {item.name}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-dashed my-2"></div>

      {/* Totals */}
      {isVatRegistered && (
        <>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>KES {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (16%):</span>
            <span>KES {vat.toFixed(2)}</span>
          </div>
        </>
      )}
      <div className="flex justify-between font-bold">
        <span>Total:</span>
        <span>KES {total.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Payment:</span>
        <span className="capitalize">{receipt.paymentMethod}</span>
      </div>
      {receipt.paymentMethod === "cash" && (
        <>
          <div className="flex justify-between">
            <span>Received:</span>
            <span>KES {receipt.amountReceived.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Change:</span>
            <span>KES {receipt.change.toFixed(2)}</span>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-dashed my-2"></div>
      <div className="text-center mt-2">
        <div className="font-semibold">Thank you for your business!</div>
        <div className="text-xs mt-1">No returns without receipt. Earn loyalty points with every purchase!</div>
        <div className="text-xs mt-1">Return policy: Items can be returned within 14 days with receipt.</div>
        {/* QR Code for digital receipt at the bottom */}
        <div className="flex justify-center my-4">
          <QRCodeCanvas value={receiptUrl} size={64} />
        </div>
      </div>
    </div>
  );
} 