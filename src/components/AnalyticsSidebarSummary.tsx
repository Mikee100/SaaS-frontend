// Paused: Analytics logic temporarily disabled for user consistency debugging.
/*
"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { FaChartLine, FaDollarSign } from "react-icons/fa";

export default function AnalyticsSidebarSummary() {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    apiGet('/sales/analytics').then(setAnalytics).catch(() => {});
  }, []);

  if (!analytics) return null;

  return (
    <div className="mt-8 bg-white bg-opacity-20 rounded-lg p-3 text-xs shadow-sm">
      <div className="mb-2 font-semibold text-white/90 text-sm">Quick Analytics</div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FaChartLine className="text-green-300" />
          <span className="text-white/80">Sales:</span>
          <span className="font-bold text-green-100 ml-auto">{analytics.totalSales}</span>
        </div>
        <div className="flex items-center gap-2">
          <FaDollarSign className="text-yellow-300" />
          <span className="text-white/80">Revenue:</span>
          <span className="font-bold text-yellow-100 ml-auto">${analytics.totalRevenue?.toLocaleString()}</span>
        </div>
        <a
          href="/analytics"
          className="mt-2 block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded px-3 py-1 transition"
        >
          View Full Analytics →
        </a>
      </div>
    </div>
  );
}
*/ 