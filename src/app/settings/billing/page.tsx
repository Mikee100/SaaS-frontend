"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { FaCreditCard } from 'react-icons/fa';
import Link from "next/link";

export default function BillingSettings() {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/billing").then((data) => setBilling(data)).catch(() => setError("Failed to load billing info")).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaCreditCard className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Billing</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      <div className="bg-white rounded-xl shadow p-8 w-full">
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        ) : !billing ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No billing info found.</p>
          </div>
        ) : (
          <>
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Current Plan</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                <div>
                  <p className="font-medium">Plan:</p>
                  <p>{billing.plan || '-'}</p>
                </div>
                <div>
                  <p className="font-medium">Status:</p>
                  <p className={`${billing.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                    {billing.status ? billing.status.charAt(0).toUpperCase() + billing.status.slice(1) : '-'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Next Payment:</p>
                  <p>{billing.nextPayment ? new Date(billing.nextPayment).toLocaleDateString() : '-'}</p>
                </div>
              </div>
            </section>
            <hr className="my-6 border-gray-200" />
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Payment Method</h3>
              </div>
              <p className="text-gray-700">{billing.paymentMethod || '-'}</p>
            </section>
            {billing.invoices && billing.invoices.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">Invoices</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {billing.invoices.map((inv: any) => (
                        <tr key={inv.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inv.date ? new Date(inv.date).toLocaleDateString() : '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inv.amount || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`${inv.status === 'Paid' ? 'text-green-600' : 'text-gray-500'}`}>{inv.status}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            <a href={inv.url} target="_blank" rel="noopener noreferrer" className="underline">Download</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
} 