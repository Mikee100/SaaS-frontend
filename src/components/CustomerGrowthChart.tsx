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
    const allData = Object.entries(growthData)
      .map(([date, value]) => ({ date, value }))
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
  }, [growthData, activeFilter]);

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
        className={`adeera-card overflow-hidden transition-all duration-300 ${
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
              className="rounded-full p-2 text-[var(--adeera-text-muted)] hover:bg-[var(--adeera-surface-muted)] hover:text-[var(--adeera-text)]"
              aria-label="Minimize chart"
            >
              <FiMinimize2 size={20} />
            </button>
          </div>
        )}
        <div className="flex min-h-full flex-col items-center justify-center rounded-xl border border-[var(--adeera-border)] bg-[var(--adeera-surface)] p-6 text-center" style={{ minHeight: `${height}px` }}>
          <div className="mb-3 rounded-full bg-[var(--adeera-surface-muted)] p-3">
            <FiUsers className="text-[var(--adeera-text-muted)]" size={24} />
          </div>
          <h3 className="mb-1 font-medium text-[var(--adeera-text)]">No Customer Data</h3>
          <p className="max-w-xs text-sm text-[var(--adeera-text-muted)]">
            There&apos;s no customer data available for the selected time period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`adeera-card overflow-hidden transition-all duration-300 ${
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
            className="rounded-full p-2 text-[var(--adeera-text-muted)] hover:bg-[var(--adeera-surface-muted)] hover:text-[var(--adeera-text)]"
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
            <h3 className="flex items-center text-base font-semibold tracking-tight text-[var(--adeera-text)]">
              <FiUsers className="mr-2 text-[var(--adeera-accent)]" size={20} />
              {title}
              <button
                onClick={() => {}}
                className="ml-2 text-[var(--adeera-text-muted)] hover:text-[var(--adeera-text)]"
                title="More information"
              >
                <FiInfo size={16} />
              </button>
            </h3>
            <p className="mt-1 text-sm text-[var(--adeera-text-muted)]">
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
                    ? 'bg-[var(--adeera-accent)] text-white'
                    : 'border border-[var(--adeera-border)] text-[var(--adeera-text-muted)] hover:bg-[var(--adeera-surface-muted)]'
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
                  ? 'bg-[var(--adeera-accent)] text-white'
                  : 'border border-[var(--adeera-border)] text-[var(--adeera-text-muted)] hover:bg-[var(--adeera-surface-muted)]'
              }`}
              aria-label="Area chart view"
            >
              Area
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartType === 'line'
                  ? 'bg-[var(--adeera-accent)] text-white'
                  : 'border border-[var(--adeera-border)] text-[var(--adeera-text-muted)] hover:bg-[var(--adeera-surface-muted)]'
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
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b6b70' }} tickMargin={8} />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: '#6b6b70' }} tickMargin={8} />
                <CartesianGrid strokeDasharray="2 3" stroke="#e5e5e7" vertical={false} />
                <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                <Area type="monotone" dataKey="value" stroke="#4f46e5" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            ) : (
              <LineChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b6b70' }} tickMargin={8} />
                <YAxis tickFormatter={formatNumber} tick={{ fontSize: 11, fill: '#6b6b70' }} tickMargin={8} />
                <CartesianGrid strokeDasharray="2 3" stroke="#e5e5e7" vertical={false} />
                <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-6">
          <div className="rounded-xl border border-[var(--adeera-border)] bg-[var(--adeera-surface-muted)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--adeera-text-muted)]">Total Customers</p>
                <p className="text-xl font-semibold text-[var(--adeera-text)]">{formatNumber(totalCustomers)}</p>
              </div>
              <div className="rounded-lg bg-[var(--adeera-accent-soft)] p-2">
                <FiUsers className="text-[var(--adeera-accent)]" size={20} />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className={`inline-flex items-center ${growthRate >= 0 ? 'text-[var(--adeera-success)]' : 'text-[var(--adeera-danger)]'}`}>
                {growthRate >= 0 ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                {Math.abs(growthRate).toFixed(1)}% growth
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--adeera-border)] bg-[var(--adeera-surface)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--adeera-text-muted)]">New Customers</p>
                <p className="text-lg font-semibold text-[var(--adeera-text)]">{formatNumber(newCustomers)}</p>
              </div>
              <div className="rounded-lg bg-[var(--adeera-surface-muted)] p-2">
                <FiTrendingUp className="text-[var(--adeera-success)]" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-[var(--adeera-text-muted)]">This period</div>
          </div>

          <div className="rounded-xl border border-[var(--adeera-border)] bg-[var(--adeera-surface)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--adeera-text-muted)]">Avg. Growth</p>
                <p className="text-lg font-semibold text-[var(--adeera-text)]">{formatNumber(avgGrowth)}</p>
              </div>
              <div className="rounded-lg bg-[var(--adeera-surface-muted)] p-2">
                <FiTrendingUp className="text-[var(--adeera-accent)]" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-[var(--adeera-text-muted)]">Per period</div>
          </div>

          <div className="rounded-xl border border-[var(--adeera-border)] bg-[var(--adeera-surface)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--adeera-text-muted)]">Data Points</p>
                <p className="text-lg font-semibold text-[var(--adeera-text)]">{filteredData.length}</p>
              </div>
              <div className="rounded-lg bg-[var(--adeera-surface-muted)] p-2">
                <FiInfo className="text-[var(--adeera-text-muted)]" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-[var(--adeera-text-muted)]">Total periods</div>
          </div>
        </div>
      </div>
    </div>
  );
}
