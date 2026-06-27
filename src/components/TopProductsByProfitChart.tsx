import React from 'react';

type ProfitProduct = {
  name: string;
  revenue?: number;
  cost?: number;
  sales?: number;
};

interface TopProductsByProfitChartProps {
  products: ProfitProduct[];
}

export default function TopProductsByProfitChart({ products }: TopProductsByProfitChartProps) {
  const rows = (products || [])
    .map((item) => {
      const revenue = Number(item.revenue || 0);
      const cost = Number(item.cost || 0);
      const profit = revenue - cost;
      return {
        name: item.name || 'Unknown Product',
        revenue,
        cost,
        sales: Number(item.sales || 0),
        profit,
      };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  const maxProfit = Math.max(...rows.map((r) => r.profit), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Top Products by Profit</h3>
        <span className="text-[11px] text-gray-500 dark:text-slate-400">Gross profit contribution</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-slate-400">No product profit data available yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => {
            const width = Math.max(6, Math.round((row.profit / maxProfit) * 100));
            const itemKey = `${row.name}-${index}-${Math.round(row.profit)}`;
            return (
              <div key={itemKey}>
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <span className="truncate pr-2 font-medium text-gray-700 dark:text-slate-200" title={row.name}>{row.name}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Ksh {Math.round(row.profit).toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-800">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                  <span>Rev Ksh {Math.round(row.revenue).toLocaleString()} • Cost Ksh {Math.round(row.cost).toLocaleString()}</span>
                  <span>{row.sales.toLocaleString()} units</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
