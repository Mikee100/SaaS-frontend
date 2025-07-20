"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";

export default function Home() {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet('/tenant/me')
      .then(setBusiness)
      .catch((err) => setError(err.message || "Failed to load business info"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full rounded-2xl shadow p-10 flex flex-col items-center border border-gray-100 bg-white">
        {loading ? (
          <div className="text-gray-400 text-center">Loading business info...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-2 text-center">{business?.name || 'Business Dashboard'}</h1>
            <div className="text-gray-500 text-center mb-6">{business?.businessType}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full mb-8">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">Contact Email</span>
                <span className="font-medium">{business?.contactEmail || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">Contact Phone</span>
                <span className="font-medium">{business?.contactPhone || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">Address</span>
                <span className="font-medium">{business?.address || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">Currency</span>
                <span className="font-medium">{business?.currency || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">Timezone</span>
                <span className="font-medium">{business?.timezone || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">KRA PIN</span>
                <span className="font-medium">{business?.kraPin || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-400">VAT Number</span>
                <span className="font-medium">{business?.vatNumber || '-'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full justify-center mb-8">
              <a href="/products" className="border border-gray-200 rounded-lg px-6 py-3 text-center hover:shadow transition font-medium">Products</a>
              <a href="/sales" className="border border-gray-200 rounded-lg px-6 py-3 text-center hover:shadow transition font-medium">Sales/POS</a>
              <a href="/reports" className="border border-gray-200 rounded-lg px-6 py-3 text-center hover:shadow transition font-medium">Reports</a>
              <a href="/settings" className="border border-gray-200 rounded-lg px-6 py-3 text-center hover:shadow transition font-medium">Settings</a>
            </div>
            <div className="w-full border-t border-dashed my-4"></div>
            <div className="text-xs text-gray-400 text-center w-full">&copy; {new Date().getFullYear()} SaaS POS. All rights reserved.</div>
          </>
        )}
      </div>
    </div>
  );
}
