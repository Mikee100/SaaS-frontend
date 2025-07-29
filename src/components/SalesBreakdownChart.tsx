import React from 'react';

interface SalesBreakdownChartProps {
  salesData: Array<{ label: string; value: number }>;
}

export default function SalesBreakdownChart({ salesData }: SalesBreakdownChartProps) {
  if (!salesData || salesData.length === 0) return <div className="text-gray-400">No sales breakdown data</div>;
  const max = Math.max(...salesData.map(d => d.value), 1);
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg font-semibold text-gray-800">Sales Breakdown</span>
      </div>
      <div className="flex flex-col gap-2">
        {salesData.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-24 text-sm text-gray-700">{d.label}</span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-3 bg-blue-500 rounded-full" style={{ width: `${(d.value / max) * 100}%` }} />
            </div>
            <span className="ml-2 text-xs text-gray-500">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 