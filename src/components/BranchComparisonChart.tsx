import React, { useState } from 'react';
import {  XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';

interface BranchComparisonChartProps {
  branchData: {
    branchName: string;
    dailySales: number;
    weeklySales: number;
    monthlySales: number;
  }[];
  height?: number;
}

export default function BranchComparisonChart({ branchData, height = 300 }: BranchComparisonChartProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  if (!branchData || branchData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No branch data available for comparison
      </div>
    );
  }

  // Transform data for line chart - each branch becomes a data point
  const chartData = branchData.map((branch, index) => ({
    branch: branch.branchName,
    daily: branch.dailySales,
    weekly: branch.weeklySales,
    monthly: branch.monthlySales,
    index, // for consistent coloring
  }));

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex justify-center space-x-2">
        {[
          { key: 'daily', label: 'Daily Sales' },
          { key: 'weekly', label: 'Weekly Sales' },
          { key: 'monthly', label: 'Monthly Sales' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setViewMode(key as typeof viewMode)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === key
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis
            dataKey="branch"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number) => [
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(value),
              `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Sales`
            ]}
            labelFormatter={(label) => `Branch: ${label}`}
          />
          <Area
            type="monotone"
            dataKey={viewMode}
            stroke={colors[0]}
            fill={colors[0]}
            fillOpacity={0.3}
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Top Performer</div>
          <div className="text-sm font-semibold text-gray-900">
            {chartData.reduce((max, curr) =>
              curr[viewMode] > max[viewMode] ? curr : max
            ).branch}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Total Sales</div>
          <div className="text-sm font-semibold text-gray-900">
            ${chartData.reduce((sum, curr) => sum + curr[viewMode], 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Average</div>
          <div className="text-sm font-semibold text-gray-900">
            ${(chartData.reduce((sum, curr) => sum + curr[viewMode], 0) / chartData.length).toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Branches</div>
          <div className="text-sm font-semibold text-gray-900">
            {chartData.length}
          </div>
        </div>
      </div>
    </div>
  );
}
