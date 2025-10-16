import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, LineChart } from 'recharts';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiMinimize2, FiInfo } from 'react-icons/fi';

interface SalesRevenueChartProps {
  salesData: Record<string, number>;
  title?: string;
  height?: number;
  className?: string;
}



const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: value < 1 ? 2 : 0
  }).format(value);
};

export default function SalesRevenueChart({
  salesData = {},
  title = 'Sales Revenue',
  height = 400,
  className = ''
}: SalesRevenueChartProps) {
  const [activeFilter, setActiveFilter] = useState<string>('1M');
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  const filteredData = useMemo(() => {
    const allData = Object.entries(salesData)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (activeFilter === 'ALL') {
      return allData;
    }

    const now = new Date();
    let cutoffDate: Date;

    switch (activeFilter) {
      case '1W':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1M':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3M':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1Y':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return allData;
    }

    return allData.filter(item => new Date(item.date) >= cutoffDate);
  }, [salesData, activeFilter]);

  const totalRevenue = useMemo(() => filteredData.reduce((sum, item) => sum + item.amount, 0), [filteredData]);
  const maxRevenue = useMemo(() => Math.max(...filteredData.map(item => item.amount), 0), [filteredData]);
  const minRevenue = useMemo(() => Math.min(...filteredData.map(item => item.amount), 0), [filteredData]);
  const avgRevenue = useMemo(() => (filteredData.length > 0 ? totalRevenue / filteredData.length : 0), [totalRevenue, filteredData]);

  const percentChange = useMemo(() => {
    if (filteredData.length < 2) return 0;
    const last = filteredData[filteredData.length - 1].amount;
    const prev = filteredData[filteredData.length - 2].amount;
    return prev ? ((last - prev) / prev) * 100 : 0;
  }, [filteredData]);

  if (!salesData || Object.keys(salesData).length === 0) {
    return (
      <div
        className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300 ${
          isExpanded ? 'fixed inset-4 z-50 m-auto max-w-6xl max-h-[90vh]' : 'h-full'
        } ${className}`}
        style={{
          height: isExpanded ? '90vh' : `${height}px`,
          width: isExpanded ? '90vw' : '100%',
          maxWidth: isExpanded ? '1200px' : 'none',
        }}
      >
        {isExpanded && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              aria-label="Minimize chart"
            >
              <FiMinimize2 size={20} />
            </button>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center flex flex-col items-center justify-center" style={{ minHeight: `${height}px` }}>
          <div className="bg-gray-100 p-3 rounded-full mb-3">
            <FiDollarSign className="text-gray-400" size={24} />
          </div>
          <h3 className="text-gray-700 font-medium mb-1">No Sales Data</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            There&apos;s no sales data available for the selected time period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 m-auto max-w-6xl max-h-[90vh]' : 'h-full'
      } ${className}`}
      style={{
        height: isExpanded ? '90vh' : `${height}px`,
        width: isExpanded ? '90vw' : '100%',
        maxWidth: isExpanded ? '1200px' : 'none',
      }}
    >
      {isExpanded && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            aria-label="Minimize chart"
          >
            <FiMinimize2 size={20} />
          </button>
        </div>
      )}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 px-6 pt-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiDollarSign className="mr-2 text-indigo-500" size={20} />
              {title}
              <button
                onClick={() => {}}
                className="ml-2 text-gray-400 hover:text-gray-600"
                title="More information"
              >
                <FiInfo size={16} />
              </button>
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeFilter === '1W' ? 'Last 7 days' :
                activeFilter === '1M' ? 'Last 30 days' :
                activeFilter === '3M' ? 'Last 90 days' :
                activeFilter === '1Y' ? 'Last 12 months' : 'All time'}
            </p>
          </div>
          <div className="flex items-center mt-3 sm:mt-0 space-x-1">
            {['1W', '1M', '3M', '1Y', 'ALL'].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="ml-4 flex items-center space-x-2 mt-3 sm:mt-0">
            <button
              onClick={() => setChartType('area')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartType === 'area'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Area chart view"
            >
              Area
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartType === 'line'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Line chart view"
            >
              Line
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 px-6">
          <ResponsiveContainer width="100%" height={height - 150}>
            {chartType === 'area' ? (
              <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            ) : (
              <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-6">
          <div className="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-600">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FiDollarSign className="text-indigo-600" size={20} />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className={`inline-flex items-center ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {percentChange >= 0 ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                {Math.abs(percentChange).toFixed(1)}% from last period
              </span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Avg. Daily</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(avgRevenue)}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <FiTrendingUp className="text-gray-600" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Based on {filteredData.length} days</div>
          </div>

          <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Peak Day</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(maxRevenue)}</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <FiTrendingUp className="text-amber-500" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Highest single day</div>
          </div>

          <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Lowest Day</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(minRevenue)}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FiTrendingDown className="text-blue-500" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Lowest single day</div>
          </div>
        </div>
      </div>
    </div>
  );
}
