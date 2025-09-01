import React from 'react';

interface TopProductsChartProps {
  products: Array<{ name: string; sales: number }>;
}

export default function TopProductsChart({ products }: TopProductsChartProps) {
  if (!products || products.length === 0) return <div className="text-gray-400">No top products data</div>;
  const max = Math.max(...products.map(p => p.sales), 1);
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg font-semibold text-gray-800">Top Products</span>
      </div>
      <div className="flex flex-col gap-2">
        {products.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-32 text-sm text-gray-700 truncate">{p.name}</span>
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-3 bg-purple-500 rounded-full" style={{ width: `${(p.sales / max) * 100}%` }} />
            </div>
            <span className="ml-2 text-xs text-gray-500">{p.sales}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 