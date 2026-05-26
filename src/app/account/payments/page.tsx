'use client';

import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/utils/api';

type PaymentHistoryItem = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  type: 'payment' | 'invoice';
};

type PaymentHistoryResponse = {
  success: boolean;
  history?: PaymentHistoryItem[];
  error?: string;
};

const formatAmount = (amount: number, currency: string) => {
  if ((currency || '').toUpperCase() === 'KES') {
    return `Ksh ${amount.toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${(currency || 'USD').toUpperCase()} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        try {
          await apiPost('/billing/sync-records', {});
        } catch (syncError) {
          console.warn('Billing sync before payment history load failed:', syncError);
        }

        const data = await apiGet<PaymentHistoryResponse>('/payments/history');

        if (data?.success && Array.isArray(data.history)) {
          setItems(data.history);
          return;
        }

        setError(data?.error || 'Failed to load payment history');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div className="p-8">Loading payment history...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-xl font-bold mb-4">Payments</h3>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {items.length === 0 ? (
        <p>No payment records found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Description</th>
              <th className="py-2 text-left">Amount</th>
              <th className="py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="py-2 uppercase">{item.type}</td>
                <td className="py-2">{item.description || '-'}</td>
                <td className="py-2">{formatAmount(item.amount, item.currency)}</td>
                <td className="py-2">{item.status || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
