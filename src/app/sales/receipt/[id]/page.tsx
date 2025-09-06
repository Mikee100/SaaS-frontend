"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";
import { FaPrint, FaArrowLeft, FaDownload } from "react-icons/fa";
import { isAuthenticated } from '@/utils/auth';
import { ReceiptLogo } from '@/components/LogoUsage';

type ReceiptItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type Receipt = {
  id: string;
  saleId: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
  businessInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  branch?: {
    id: string;
    name: string;
    address?: string;
  };
};

type ReceiptPageParams = {
  id: string;
};

export default function ReceiptPage() {
  const params = useParams<ReceiptPageParams>() as ReceiptPageParams | null;
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        if (!params?.id || params.id === 'undefined') {
          setError("Invalid receipt ID");
          setLoading(false);
          return;
        }

        // Check if user is authenticated
        if (!isAuthenticated()) {
          setError("Please log in to view this receipt");
          setLoading(false);
          return;
        }
        
        console.log('Fetching receipt for ID:', params.id);
        const data = await apiGet(`/sales/${params.id}`);
        console.log('Receipt data received:', data);
        
        // Transform the data to match the Receipt type
        const receiptData = {
          id: data.id,
          saleId: data.id, // Use the same ID as saleId if not provided
          date: data.createdAt,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          items: data.items?.map((item: any) => ({
            productId: item.productId,
            name: item.name || `Product ${item.productId}`,
            price: item.price,
            quantity: item.quantity
          })) || [],
          total: data.total,
          paymentMethod: data.paymentType || 'cash',
          amountReceived: data.amountReceived || data.total,
          change: data.change || 0,
          branch: data.branch
        };
        
        setReceipt(receiptData);
      } catch (err: any) {
        console.error('Error fetching receipt:', err);
        if (err.message?.includes('401')) {
          setError("Please log in to view this receipt");
        } else if (err.message?.includes('404')) {
          setError("Receipt not found. The sale may not exist or you may not have permission to view it.");
        } else {
          setError(err.message || "Failed to load receipt. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      fetchReceipt();
    }
  }, [params?.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a PDF or download functionality
    const receiptData = {
      ...receipt,
      printDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(receiptData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receipt?.saleId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-xl shadow-sm max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-700 mb-4">{error || "Receipt not found"}</p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Receipt</h1>
          {/* Add branch name here */}
          {receipt.branch && (
            <div className="mb-2">
              <strong>Branch:</strong> {receipt.branch.name || 'Unknown'}
            </div>
          )}
          {/* ...other header details... */}
        </div>
      </div>

      {/* Receipt Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Receipt Header */}
          <div className="p-8 border-b border-gray-200 text-center">
            <div className="flex justify-center mb-4">
              <ReceiptLogo size="lg" className="h-16 w-auto" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {receipt.businessInfo?.name || 'Business Name'}
            </h1>
            {/* Branch info */}
            {receipt.branch && (
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">{receipt.branch.name}</h3>
                {receipt.branch.address && (
                  <p className="text-sm text-gray-600">{receipt.branch.address}</p>
                )}
              </div>
            )}
            {receipt.businessInfo?.address && (
              <p className="text-gray-600 mb-1">{receipt.businessInfo.address}</p>
            )}
            {receipt.businessInfo?.phone && (
              <p className="text-gray-600 mb-1">Phone: {receipt.businessInfo.phone}</p>
            )}
            {receipt.businessInfo?.email && (
              <p className="text-gray-600 mb-3">Email: {receipt.businessInfo.email}</p>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {new Date(receipt.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(receipt.date).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-lg font-semibold text-gray-800 mt-2">
                Receipt #{receipt.saleId.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Customer Information */}
          {(receipt.customerName || receipt.customerPhone) && (
            <div className="p-8 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receipt.customerName && (
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{receipt.customerName}</p>
                  </div>
                )}
                {receipt.customerPhone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{receipt.customerPhone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          <div className="p-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Items Purchased</h2>
            <div className="space-y-4">
              {receipt.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start py-3 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      {item.quantity} × ${item.price.toFixed(2)} each
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="p-8 bg-gray-50">
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${receipt.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-300">
                <span>Total:</span>
                <span className="text-blue-600">${receipt.total.toFixed(2)}</span>
              </div>
              
              {receipt.paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-gray-600">Cash Received:</span>
                    <span className="font-medium">${receipt.amountReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Change:</span>
                    <span className="font-medium">${receipt.change.toFixed(2)}</span>
                  </div>
                </>
              )}
              
              <div className="pt-3 text-sm">
                <span className="text-gray-600">Payment Method: </span>
                <span className="capitalize font-medium">{receipt.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Receipt Details */}
          <div className="mt-4 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-600">Receipt #:</span>
              <span>{receipt.saleId || receipt.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200">
              <span className="text-gray-600">Date:</span>
              <span>{new Date(receipt.date).toLocaleString()}</span>
            </div>
            {receipt.branch && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Branch:</span>
                <span>{receipt.branch.name}</span>
              </div>
            )}
            {receipt.customerName && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Customer:</span>
                <span>{receipt.customerName}</span>
              </div>
            )}
            {receipt.customerPhone && (
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-600">Phone:</span>
                <span>{receipt.customerPhone}</span>
              </div>
            )}
          </div>

          {/* Thank You Message */}
          <div className="p-8 text-center bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Thank you for your purchase!</h3>
            <p className="text-blue-600">We appreciate your business</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-content, .receipt-content * {
            visibility: visible;
          }
          .receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}