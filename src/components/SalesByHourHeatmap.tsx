import React from 'react';

type HeatPoint = {
  dow: number;
  hour: number;
  orders: number;
  revenue?: number;
};

interface SalesByHourHeatmapProps {
  data: HeatPoint[];
  scopeLabel?: string;
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function intensityClass(value: number): string {
  if (value >= 20) return 'bg-emerald-600 text-white';
  if (value >= 12) return 'bg-emerald-500 text-white';
  if (value >= 6) return 'bg-emerald-300 text-emerald-900';
  if (value >= 1) return 'bg-emerald-100 text-emerald-800';
  return 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500';
}

export default function SalesByHourHeatmap({ data, scopeLabel }: SalesByHourHeatmapProps) {
  const grid = new Map<string, HeatPoint>();
  (data || []).forEach((point) => {
    const key = `${point.dow}-${point.hour}`;
    grid.set(key, point);
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => i);
  const totalOrders = (data || []).reduce((sum, point) => sum + Number(point.orders || 0), 0);
  const activeCells = (data || []).filter((point) => Number(point.orders || 0) > 0).length;

  const dayTotals = new Map<number, number>();
  for (const day of days) dayTotals.set(day, 0);
  (data || []).forEach((point) => {
    const prev = dayTotals.get(point.dow) || 0;
    dayTotals.set(point.dow, prev + Number(point.orders || 0));
  });

  const dayTotalsArr = days.map((d) => ({ day: d, total: dayTotals.get(d) || 0 }));
  const maxDay = dayTotalsArr.reduce((best, curr) => (curr.total > best.total ? curr : best), { day: 0, total: 0 });
  const maxDayShare = totalOrders > 0 ? (maxDay.total / totalOrders) * 100 : 0;
  const isHighlyConcentrated = totalOrders > 0 && maxDayShare >= 80;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Sales by Hour Heatmap</h3>
        <span className="text-[11px] text-gray-500 dark:text-slate-400">Busiest times by weekday</span>
      </div>

      <div className="mb-3 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <span className="font-medium">Last 90 days (local time):</span> {totalOrders.toLocaleString()} orders in {activeCells.toLocaleString()} active time slots.
        {' '}Scope: {scopeLabel || 'Current branch'}.
        {' '}Columns are hours (0-23), not dates. Hour 0 means 12:00 AM.
        {' '}Blank cells mean zero orders.
      </div>

      {isHighlyConcentrated && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
          Most orders are concentrated on {dayLabels[maxDay.day]} ({maxDay.total.toLocaleString()} of {totalOrders.toLocaleString()}, {maxDayShare.toFixed(1)}%).
          {' '}If you expected daily sales across the week, switch to All branches (if available) or verify sale timestamps for this branch.
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-600 dark:text-slate-400">
        <span className="font-medium">Intensity:</span>
        <span className="rounded px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800">0</span>
        <span className="rounded px-1.5 py-0.5 bg-emerald-100 text-emerald-800">1-5</span>
        <span className="rounded px-1.5 py-0.5 bg-emerald-300 text-emerald-900">6-11</span>
        <span className="rounded px-1.5 py-0.5 bg-emerald-500 text-white">12-19</span>
        <span className="rounded px-1.5 py-0.5 bg-emerald-600 text-white">20+</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-190">
          <div className="mb-1 text-[10px] font-medium text-gray-500 dark:text-slate-400">
            Hour of day (24-hour clock)
          </div>
          <div className="mb-1 grid grid-cols-[60px_repeat(24,minmax(24px,1fr))_52px] gap-1 text-[10px] text-gray-500 dark:text-slate-400">
            <span />
            {hours.map((h) => (
              <span key={`h-${h}`} className="text-center">{String(h).padStart(2, '0')}</span>
            ))}
            <span className="text-right font-medium">Total</span>
          </div>

          {days.map((d) => (
            <div key={`d-${d}`} className="mb-1 grid grid-cols-[60px_repeat(24,minmax(24px,1fr))_52px] gap-1">
              <span className="text-[10px] font-medium text-gray-600 dark:text-slate-300">{dayLabels[d]}</span>
              {hours.map((h) => {
                const point = grid.get(`${d}-${h}`);
                const orders = Number(point?.orders || 0);
                return (
                  <div
                    key={`c-${d}-${h}`}
                    className={`flex h-6 items-center justify-center rounded text-[10px] font-medium ${intensityClass(orders)}`}
                    title={`${dayLabels[d]} ${h}:00 • ${orders} order${orders === 1 ? '' : 's'}`}
                  >
                    {orders > 0 ? orders : '·'}
                  </div>
                );
              })}
              <span className="flex items-center justify-end text-[10px] font-semibold text-gray-600 dark:text-slate-300">
                {(dayTotals.get(d) || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
