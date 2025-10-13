import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, LineChart } from 'recharts';
import { FiUsers, FiTrendingUp, FiTrendingDown, FiInfo, FiMinimize2 } from 'react-icons/fi';

interface CustomerGrowthChartProps {
  growthData: Record<string, number>;
  title?: string;
  height?: number;
  className?: string;
}



const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: value < 1 ? 2 : 0
  }).format(value);
};

export default function CustomerGrowthChart({
  growthData = {},
  title = 'Customer Growth',
  height = 400,
  className = ''
}: CustomerGrowthChartProps) {
  const [activeFilter, setActiveFilter] = useState<string>('1M');
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartType, setChartType] = useState<'area' | 'line'>('area');

  const filteredData = useMemo(() => {
    // For simplicity, no actual filtering logic implemented here
    return Object.entries(growthData)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [growthData]);

  const totalCustomers = useMemo(() => filteredData.length > 0 ? filteredData[filteredData.length - 1].value : 0, [filteredData]);
  const newCustomers = useMemo(() => {
    if (filteredData.length < 2) return 0;
    return filteredData[filteredData.length - 1].value - filteredData[0].value;
  }, [filteredData]);
  const growthRate = useMemo(() => {
    if (filteredData.length < 2) return 0;
    const first = filteredData[0].value;
    const last = filteredData[filteredData.length - 1].value;
    return first ? ((last - first) / first) * 100 : 0;
  }, [filteredData]);
  const avgGrowth = useMemo(() => {
    if (filteredData.length < 2) return 0;
    let totalGrowth = 0;
    for (let i = 1; i < filteredData.length; i++) {
      totalGrowth += filteredData[i].value - filteredData[i - 1].value;
    }
    return filteredData.length > 1 ? totalGrowth / (filteredData.length - 1) : 0;
  }, [filteredData]);

  if (!growthData || Object.keys(growthData).length === 0) {
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center flex flex-col items-center justify-center" style={{ minHeight: `${height}px` }}>
          <div className="bg-gray-100 p-3 rounded-full mb-3">
            <FiUsers className="text-gray-400" size={24} />
          </div>
          <h3 className="text-gray-700 font-medium mb-1">No Customer Data</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            There&apos;s no customer data available for the selected time period.
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
              <FiUsers className="mr-2 text-purple-500" size={20} />
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
                    ? 'bg-purple-600 text-white'
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
                  ? 'bg-purple-600 text-white'
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
                  ? 'bg-purple-600 text-white'
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
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip formatter={(value: number) => formatNumber(value)} />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            ) : (
              <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip formatter={(value: number) => formatNumber(value)} />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-6">
          <div className="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600">Total Customers</p>
                <p className="text-xl font-bold text-gray-900">{formatNumber(totalCustomers)}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiUsers className="text-purple-600" size={20} />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className={`inline-flex items-center ${growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthRate >= 0 ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                {Math.abs(growthRate).toFixed(1)}% growth
              </span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">New Customers</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(newCustomers)}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <FiTrendingUp className="text-green-500" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">This period</div>
          </div>

          <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Avg. Growth</p>
                <p className="text-lg font-semibold text-gray-900">{formatNumber(avgGrowth)}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FiTrendingUp className="text-blue-500" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Per period</div>
          </div>

          <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Data Points</p>
                <p className="text-lg font-semibold text-gray-900">{filteredData.length}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <FiInfo className="text-gray-600" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Total periods</div>
          </div>
        </div>
      </div>
    </div>
  );
}
