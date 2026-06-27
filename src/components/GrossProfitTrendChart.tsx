import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

type GrossProfitPoint = {
  day: string;
  revenue: number;
  cost: number;
  profit: number;
};

interface GrossProfitTrendChartProps {
  data: GrossProfitPoint[];
}

export default function GrossProfitTrendChart({ data }: GrossProfitTrendChartProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <p className="text-xs text-gray-500 dark:text-slate-400">No gross profit trend data available yet.</p>
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    label: point.day.slice(5),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Gross Profit Trend</h3>
        <span className="text-[11px] text-gray-500 dark:text-slate-400">Revenue vs Cost vs Profit</span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(value) => `Ksh ${Math.round(Number(value ?? 0)).toLocaleString()}`} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Revenue" />
            <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cost" />
            <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={false} name="Gross Profit" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
