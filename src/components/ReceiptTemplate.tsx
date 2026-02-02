"use client";
import { getReceiptLogoUrl } from '@/utils/logoUrl';
import { EtimsQrCode } from './LogoUsage';
import { FaPrint, FaDownload, FaShare } from 'react-icons/fa';

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptProps {
  sale: {
    id: string;
    total: number;
    vatAmount?: number;
    customerName?: string;
    customerPhone?: string;
    createdAt: string;
    paymentMethod: string;
    amountReceived?: number;
    change?: number;
    items: ReceiptItem[];
    branch?: {
      name: string;
      address?: string;
      phone?: string;
    };
  };
  tenant: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    kraPin?: string;
    vatNumber?: string;
    receiptLogo?: string | null;
    logoUrl?: string | null;
  };
}

export default function ReceiptTemplate({ sale, tenant }: ReceiptProps) {
  const subtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = sale.vatAmount || 0;
  const total = sale.total;

  const formattedDate = new Date(sale.createdAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const logoUrl = getReceiptLogoUrl(tenant.receiptLogo, tenant.logoUrl);

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Business Header */}
      <div className="bg-blue-700 text-white p-4 text-center">
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Business Logo"
            className="mx-auto mb-2 max-h-16 w-auto max-w-full object-contain"
          />
        )}
        <h1 className="text-xl font-bold">{tenant.name}</h1>
        <p className="text-sm text-blue-100">{tenant.address}</p>
        <div className="flex flex-wrap justify-center gap-x-4 mt-1 text-xs text-blue-100">
          {tenant.phone && <span>Tel: {tenant.phone}</span>}
          {tenant.email && <span>Email: {tenant.email}</span>}
        </div>
      </div>
      
      {/* Receipt Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="text-center mb-3">
          <h2 className="font-bold text-gray-800">SALES RECEIPT</h2>
          <p className="text-sm text-gray-500">{formattedDate}</p>
        </div>
        
        {/* Receipt Info */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <p className="text-gray-500">Receipt #</p>
            <p className="font-medium">{sale.id}</p>
          </div>
          <div>
            <p className="text-gray-500">Payment Method</p>
            <p className="font-medium capitalize">{sale.paymentMethod || 'Not specified'}</p>
          </div>
        </div>
        
        {/* Branch Info */}
        {sale.branch && (
          <div className="bg-blue-50 p-3 rounded-lg mb-3">
            <h3 className="font-medium text-blue-800 text-sm mb-1">Branch</h3>
            <p className="text-sm">{sale.branch.name}</p>
            {sale.branch.address && <p className="text-xs text-gray-600">{sale.branch.address}</p>}
            {sale.branch.phone && <p className="text-xs text-gray-600">Tel: {sale.branch.phone}</p>}
          </div>
        )}
        
        {/* Customer Info */}
        {(sale.customerName || sale.customerPhone) && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-medium text-gray-800 text-sm mb-1">Customer</h3>
            {sale.customerName && <p className="text-sm">{sale.customerName}</p>}
            {sale.customerPhone && <p className="text-xs text-gray-600">Tel: {sale.customerPhone}</p>}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="p-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
          </div>
          
          {/* Items List */}
          <div className="divide-y divide-gray-100">
            {sale.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 p-3 hover:bg-gray-50">
                <div className="col-span-6">
                  <p className="font-medium text-gray-900">{item.name}</p>
                </div>
                <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
                <div className="col-span-2 text-right text-gray-600">${item.price.toFixed(2)}</div>
                <div className="col-span-2 text-right font-medium">${item.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
      <div className="mt-6 space-y-2 bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">Ksh {subtotal.toFixed(2)}</span>
        </div>
        {vatAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">VAT (16%)</span>
            <span className="font-medium">${vatAmount.toFixed(2)}</span>
          </div>
        )}
        {sale.paymentMethod === 'cash' && sale.amountReceived && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cash Received</span>
              <span className="font-medium">Ksh {sale.amountReceived.toFixed(2)}</span>
            </div>
            {sale.change !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Change</span>
                <span className="font-medium text-green-600">Ksh {sale.change.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-3 mt-2">
          <span>TOTAL</span>
          <span className="text-blue-700">Ksh {total.toFixed(2)}</span>
        </div>
      </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        {/* Business Information */}
        <div className="text-center text-xs text-gray-500 mb-4 space-y-1">
          <p>Thank you for your business!</p>
          <p>For any inquiries, please contact us at:</p>
          <div className="flex flex-col sm:flex-row justify-center gap-2 text-gray-600">
            {tenant.phone && <span>Tel: {tenant.phone}</span>}
            {tenant.email && <span>Email: {tenant.email}</span>}
          </div>
          {(tenant.kraPin || tenant.vatNumber) && (
            <div className="flex flex-wrap justify-center gap-4 mt-2 text-gray-500">
              {tenant.kraPin && <span>KRA: {tenant.kraPin}</span>}
              {tenant.vatNumber && <span>VAT: {tenant.vatNumber}</span>}
            </div>
          )}
        </div>

        {/* QR Code and Receipt ID */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <p>Receipt ID: {sale.id}</p>
            <p>Date: {new Date(sale.createdAt).toLocaleString()}</p>
          </div>
          <EtimsQrCode size="sm" />
        </div>
        
        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <FaPrint className="w-4 h-4" />
            Print
          </button>
          <button 
            className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <FaDownload className="w-4 h-4" />
            PDF
          </button>
          <button 
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <FaShare className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
} 