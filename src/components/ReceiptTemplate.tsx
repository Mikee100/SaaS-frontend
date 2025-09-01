"use client";
import { ReceiptLogo, EtimsQrCode } from './LogoUsage';
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
    items: ReceiptItem[];
  };
  tenant: {
    name: string;
    address?: string;
    phone?: string;
    kraPin?: string;
    vatNumber?: string;
  };
}

export default function ReceiptTemplate({ sale, tenant }: ReceiptProps) {
  const subtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = sale.vatAmount || 0;
  const total = sale.total;

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <ReceiptLogo size="md" />
          <div className="text-right">
            <h2 className="text-lg font-bold text-gray-900">{tenant.name}</h2>
            {tenant.address && <p className="text-sm text-gray-600">{tenant.address}</p>}
            {tenant.phone && <p className="text-sm text-gray-600">{tenant.phone}</p>}
          </div>
        </div>
        
        {/* Receipt Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Receipt #</p>
            <p className="font-medium">{sale.id}</p>
          </div>
          <div>
            <p className="text-gray-500">Date</p>
            <p className="font-medium">{new Date(sale.createdAt).toLocaleDateString()}</p>
          </div>
          {sale.customerName && (
            <div>
              <p className="text-gray-500">Customer</p>
              <p className="font-medium">{sale.customerName}</p>
            </div>
          )}
          {sale.customerPhone && (
            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium">{sale.customerPhone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="p-6">
        <div className="space-y-3">
          {sale.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} × ${item.price.toFixed(2)}
                </p>
              </div>
              <p className="font-medium text-gray-900">${item.total.toFixed(2)}</p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          {vatAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (16%)</span>
              <span className="font-medium">${vatAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {tenant.kraPin && <p>KRA PIN: {tenant.kraPin}</p>}
            {tenant.vatNumber && <p>VAT: {tenant.vatNumber}</p>}
          </div>
          <EtimsQrCode size="sm" />
        </div>
        
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <FaPrint className="w-4 h-4" />
            Print
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
            <FaDownload className="w-4 h-4" />
            Download
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            <FaShare className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
} 