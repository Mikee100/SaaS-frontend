import React from 'react';

interface CustomerGrowthChartProps {
  growthData: Record<string, number>;
}

export default function CustomerGrowthChart({ growthData }: CustomerGrowthChartProps) {
  const dates = Object.keys(growthData || {});
  const values = Object.values(growthData || {});
  if (!dates.length) return <div className="text-gray-400">No customer growth data</div>;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 80}`).join(' ');
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg font-semibold text-gray-800">Customer Growth</span>
      </div>
      <svg viewBox="0 0 100 100" className="w-full h-24">
        <polyline fill="none" stroke="#10B981" strokeWidth="2" points={points} />
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {dates.map((d, i) => <span key={i}>{d}</span>)}
      </div>
    </div>
  );
} 