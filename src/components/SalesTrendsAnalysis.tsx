import React, { useState, useMemo } from 'react';
import { FiTrendingUp, FiTrendingDown, FiBarChart2 } from 'react-icons/fi';

import { format, subYears } from 'date-fns';

type TimeRange = '1Y' | '2Y' | '3Y' | 'ALL';
type ViewMode = 'monthly' | 'weekly';

interface SalesData {
  [date: string]: number;
}

interface SalesTrendsAnalysisProps {
  salesData: SalesData;
  title?: string;
  className?: string;
}

const SalesTrendsAnalysis: React.FC<SalesTrendsAnalysisProps> = ({
  salesData = {},
  title = 'Sales Trends Analysis',
  className = ''
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [expanded, setExpanded] = useState(false);

  // Process and filter the sales data based on selected time range
  const { filteredData, summary, bestPeriod, worstPeriod } = useMemo(() => {
    if (!salesData || Object.keys(salesData).length === 0) {
      return { filteredData: {}, summary: null, bestPeriod: null, worstPeriod: null };
    }

    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '1Y':
        startDate = subYears(now, 1);
        break;
      case '2Y':
        startDate = subYears(now, 2);
        break;
      case '3Y':
        startDate = subYears(now, 3);
        break;
      case 'ALL':
      default:
        startDate = new Date(Math.min(...Object.keys(salesData).map(d => new Date(d).getTime())));
    }

    // Filter data based on time range
    const filtered = Object.entries(salesData).reduce((acc, [date, value]) => {
      const saleDate = new Date(date);
      if (saleDate >= startDate && saleDate <= now) {
        acc[date] = value;
      }
      return acc;
    }, {} as SalesData);

    // Calculate summary statistics
    const values = Object.values(filtered);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const max = Math.max(...values, 0);
    const min = Math.min(...values, Infinity);
    
    // Group data by period for trend analysis
    const periodData: {[key: string]: {total: number; count: number}} = {};
    
    Object.entries(filtered).forEach(([dateStr, value]) => {
      const date = new Date(dateStr);
      let periodKey: string;
      
      if (viewMode === 'monthly') {
        periodKey = format(date, 'yyyy-MM');
      } else { // weekly
        const year = date.getFullYear();
        const weekNum = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        periodKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      }
      
      if (!periodData[periodKey]) {
        periodData[periodKey] = { total: 0, count: 0 };
      }
      
      periodData[periodKey].total += value;
      periodData[periodKey].count++;
    });
    
    // Find best and worst periods
    let best = { period: '', value: -Infinity };
    let worst = { period: '', value: Infinity };
    
    Object.entries(periodData).forEach(([period, { total }]) => {
      if (total > best.value) {
        best = { period, value: total };
      }
      if (total < worst.value) {
        worst = { period, value: total };
      }
    });
    
    // Calculate year-over-year growth if we have enough data
    let yoyGrowth = null;
    if (timeRange !== 'ALL' && Object.keys(periodData).length >= 12) {
      const periods = Object.keys(periodData).sort();
      const currentPeriod = periods[periods.length - 1];
      const previousPeriod = periods[periods.length - (viewMode === 'monthly' ? 12 : 52)];
      
      if (periodData[previousPeriod] && periodData[currentPeriod]) {
        yoyGrowth = ((periodData[currentPeriod].total - periodData[previousPeriod].total) / 
                    periodData[previousPeriod].total) * 100;
      }
    }

    return {
      filteredData: periodData,
      summary: {
        total,
        average,
        max,
        min,
        yoyGrowth,
        periodCount: Object.keys(periodData).length
      },
      bestPeriod: best.value !== -Infinity ? best : null,
      worstPeriod: worst.value !== Infinity ? worst : null
    };
  }, [salesData, timeRange, viewMode]);

  // Format currency
  const formatCurrency = (value: number) => {
    return `Ksh ${value.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  // Format period for display
  const formatPeriod = (period: string) => {
    if (viewMode === 'monthly') {
      const [year, month] = period.split('-').map(Number);
      return format(new Date(year, month - 1), 'MMM yyyy');
    } else {
      const [year, week] = period.split('-W').map(Number);
      return `Week ${week}, ${year}`;
    }
  };

  return (
    <div className={`adeera-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 p-5">
        <div className="flex items-center space-x-2">
          <FiBarChart2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-zinc-100">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(prev => prev === 'monthly' ? 'weekly' : 'monthly')}
            className="rounded-md border border-gray-200 dark:border-zinc-800 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-zinc-400 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            {viewMode === 'monthly' ? 'Weekly View' : 'Monthly View'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-md p-1.5 text-gray-500 dark:text-zinc-400 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-100"
            aria-label={expanded ? 'Minimize' : 'Expand'}
          >
            {expanded ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-zinc-800 p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['1Y', '2Y', '3Y', 'ALL'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              {range}
            </button>
          ))}
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/70 p-4">
              <p className="mb-1 text-sm text-gray-500 dark:text-zinc-400">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">{formatCurrency(summary.total)}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {summary.periodCount} {viewMode === 'monthly' ? 'months' : 'weeks'}
              </p>
            </div>
            
            <div className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/70 p-4">
              <p className="mb-1 text-sm text-gray-500 dark:text-zinc-400">Average / {viewMode === 'monthly' ? 'Month' : 'Week'}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">{formatCurrency(summary.average)}</p>
              <div className="flex items-center text-xs">
                {summary.yoyGrowth !== null && (
                  <span className={`flex items-center ${summary.yoyGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {summary.yoyGrowth >= 0 ? (
                      <FiTrendingUp className="mr-1" size={14} />
                    ) : (
                      <FiTrendingDown className="mr-1" size={14} />
                    )}
                    {Math.abs(summary.yoyGrowth).toFixed(1)}% YoY
                  </span>
                )}
              </div>
            </div>

            {bestPeriod && (
              <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-4">
                <p className="mb-1 text-sm text-green-600 dark:text-green-400">Best {viewMode === 'monthly' ? 'Month' : 'Week'}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{formatPeriod(bestPeriod.period)}</p>
                <p className="text-sm text-green-600 dark:text-green-400">{formatCurrency(bestPeriod.value)}</p>
              </div>
            )}

            {worstPeriod && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
                <p className="mb-1 text-sm text-red-600 dark:text-red-400">Worst {viewMode === 'monthly' ? 'Month' : 'Week'}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{formatPeriod(worstPeriod.period)}</p>
                <p className="text-sm text-red-600 dark:text-red-400">{formatCurrency(worstPeriod.value)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  {viewMode === 'monthly' ? 'Month' : 'Week'}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Sales
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {Object.entries(filteredData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([period, { total }]) => (
                  <tr key={period} className="hover:bg-gray-100 dark:hover:bg-zinc-800">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-zinc-100">
                      {formatPeriod(period)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-zinc-100">
                      {formatCurrency(total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-900 dark:text-zinc-100">
                      {summary ? ((total / summary.total) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesTrendsAnalysis;
