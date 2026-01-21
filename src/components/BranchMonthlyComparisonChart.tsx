import React, { useState } from 'react';
import { 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  LineChart, 
  Line,
  BarChart,
  Bar,
  ComposedChart,
  CartesianGrid
} from 'recharts';

interface BranchMonthlyComparisonChartProps {
  data: {
    months: string[];
    branches: { branchId: string; branchName: string; data: number[] }[];
    total: number[];
  };
  height?: number;
  chartType?: 'line' | 'bar' | 'combined';
}

export default function BranchMonthlyComparisonChart({ 
  data, 
  height = 400,
  chartType = 'combined'
}: BranchMonthlyComparisonChartProps) {
  const [viewMode, setViewMode] = useState<'line' | 'bar' | 'combined'>(chartType);

  if (!data || !data.months || data.months.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-white rounded-lg p-8">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No branch comparison data available</p>
          <p className="text-xs text-gray-400">Sales data will appear here once transactions are recorded</p>
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.months.map((month, index) => {
    const monthData: Record<string, string | number> = {
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      monthFull: month,
      total: data.total[index] || 0,
    };
    
    // Add each branch's sales
    data.branches.forEach((branch) => {
      monthData[branch.branchName] = branch.data[index] || 0;
    });
    
    return monthData;
  });

  const colors = [
    '#6366f1', // indigo
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#14b8a6', // teal
  ];

  // Calculate summary stats
  const totalSales = data.total.reduce((sum, val) => sum + val, 0);
  const avgMonthlySales = totalSales / data.months.length;
  const topBranch = data.branches.reduce((max, branch) => {
    const branchTotal = branch.data.reduce((sum, val) => sum + val, 0);
    const maxTotal = max.data.reduce((sum, val) => sum + val, 0);
    return branchTotal > maxTotal ? branch : max;
  }, data.branches[0]);

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-700">Branch Sales Comparison</h3>
        <div className="flex space-x-2">
          {[
            { key: 'line', label: 'Line' },
            { key: 'bar', label: 'Bar' },
            { key: 'combined', label: 'Combined' }
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
          {viewMode === 'line' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
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
                formatter={(value: number) => [
                  `Ksh ${value.toLocaleString()}`,
                  'Sales'
                ]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              {data.branches.map((branch, index) => (
                <Line
                  key={branch.branchId}
                  type="monotone"
                  dataKey={branch.branchName}
                  stroke={colors[index % colors.length]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="total"
                stroke="#1f2937"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Total (All Branches)"
              />
            </LineChart>
          ) : viewMode === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
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
                formatter={(value: number) => [
                  `Ksh ${value.toLocaleString()}`,
                  'Sales'
                ]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              {data.branches.map((branch, index) => (
                <Bar
                  key={branch.branchId}
                  dataKey={branch.branchName}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          ) : (
            // Combined: bars for branches, line for total
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `Ksh ${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
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
                formatter={(value: number) => [
                  `Ksh ${value.toLocaleString()}`,
                  'Sales'
                ]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              {data.branches.map((branch, index) => (
                <Bar
                  key={branch.branchId}
                  yAxisId="left"
                  dataKey={branch.branchName}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              ))}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="total"
                stroke="#1f2937"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
                name="Total (All Branches)"
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border border-indigo-200">
          <div className="text-xs text-indigo-600 font-medium mb-1">Total Sales</div>
          <div className="text-lg font-bold text-indigo-900">
            Ksh {totalSales.toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200">
          <div className="text-xs text-emerald-600 font-medium mb-1">Avg Monthly</div>
          <div className="text-lg font-bold text-emerald-900">
            Ksh {Math.round(avgMonthlySales).toLocaleString()}
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 border border-amber-200">
          <div className="text-xs text-amber-600 font-medium mb-1">Top Branch</div>
          <div className="text-lg font-bold text-amber-900 truncate">
            {topBranch?.branchName || 'N/A'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
          <div className="text-xs text-purple-600 font-medium mb-1">Branches</div>
          <div className="text-lg font-bold text-purple-900">
            {data.branches.length}
          </div>
        </div>
      </div>
    </div>
  );
}
















