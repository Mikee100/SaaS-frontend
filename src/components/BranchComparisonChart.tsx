import React, { useState } from 'react';
import { XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

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
      <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-white rounded-lg p-8">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No branch data available for comparison</p>
          <p className="text-xs text-gray-400">Sales data will appear here once transactions are recorded</p>
        </div>
      </div>
    );
  }

  // Transform data for bar chart - each branch becomes a data point
  const chartData = branchData.map((branch, index) => ({
    branch: branch.branchName.length > 12 ? branch.branchName.substring(0, 12) + '...' : branch.branchName,
    branchFull: branch.branchName,
    daily: branch.dailySales,
    weekly: branch.weeklySales,
    monthly: branch.monthlySales,
    index, // for consistent coloring
  }));

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

  const topPerformer = chartData.reduce((max, curr) =>
    curr[viewMode] > max[viewMode] ? curr : max
  );
  const totalSales = chartData.reduce((sum, curr) => sum + curr[viewMode], 0);
  const averageSales = totalSales / chartData.length;

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Branch Performance Comparison</h3>
        <div className="flex space-x-2">
          {[
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as typeof viewMode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                viewMode === key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="branch"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `Ksh ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
              formatter={(value) => [
                `Ksh ${Number(value ?? 0).toLocaleString()}`,
                `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Sales`
              ]}
              labelFormatter={(label) => `Branch: ${label}`}
            />
            <Bar
              dataKey={viewMode}
              fill={colors[0]}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border border-indigo-200">
          <div className="text-xs text-indigo-600 font-medium mb-1">Top Performer</div>
          <div className="text-sm font-bold text-indigo-900 truncate" title={topPerformer.branchFull}>
            {topPerformer.branch}
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200">
          <div className="text-xs text-emerald-600 font-medium mb-1">Total Sales</div>
          <div className="text-sm font-bold text-emerald-900">
            Ksh {totalSales.toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 border border-amber-200">
          <div className="text-xs text-amber-600 font-medium mb-1">Average</div>
          <div className="text-sm font-bold text-amber-900">
            Ksh {Math.round(averageSales).toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
          <div className="text-xs text-purple-600 font-medium mb-1">Branches</div>
          <div className="text-sm font-bold text-purple-900">
            {chartData.length}
          </div>
        </div>
      </div>
    </div>
  );
}
