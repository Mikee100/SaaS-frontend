'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import PlanGuard from '@/components/PlanGuard';
import AuthGuard from '@/components/AuthGuard';
import LogoEnforcement from '@/components/LogoEnforcement';
import BranchSwitcher from '@/components/BranchSwitcher';
import QuickActions from '../QuickActions';
import {
  FiTrendingUp,
  FiRefreshCw,
  FiDollarSign,
  FiAlertCircle,
  FiUserPlus
} from 'react-icons/fi';

// Dynamically import components with no SSR for better performance
const ChartComponents = {
  CustomerGrowthChart: dynamic(
    () => import('@/components/CustomerGrowthChart'),
    { ssr: false, loading: () => <div className="h-64 flex items-center justify-center">Loading...</div> }
  ),
  SalesRevenueChart: dynamic(
    () => import('@/components/SalesRevenueChart'),
    { ssr: false, loading: () => <div className="h-80 flex items-center justify-center">Loading...</div> }
  ),
  SalesTrendsAnalysis: dynamic(
    () => import('@/components/SalesTrendsAnalysis'),
    { ssr: false, loading: () => <div className="h-96 flex items-center justify-center">Loading...</div> }
  ),
  SalesTrendsChart: dynamic(
    () => import('@/components/SalesTrendsChart'),
    { ssr: false, loading: () => <div className="h-96 flex items-center justify-center">Loading...</div> }
  ),
  MonthlySalesTrends: dynamic(
    () => import('@/components/MonthlySalesTrends'),
    { ssr: false, loading: () => <div className="h-96 flex items-center justify-center">Loading...</div> }
  ),
  CustomerSegmentation: dynamic(
    () => import('@/components/CustomerSegmentation'),
    { ssr: false, loading: () => <div className="h-full flex items-center justify-center">Loading...</div> }
  ),
  SalesTarget: dynamic(
    () => import('@/components/SalesTarget'),
    { ssr: false, loading: () => <div className="h-64 flex items-center justify-center">Loading...</div> }
  )
};

interface AnalyticsData {
  totalSales?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalCustomers?: number;
  salesByMonth?: Record<string, number>;
  customerGrowth?: Record<string, number>;
  customerRetention?: {
    totalCustomers: number;
    repeatCustomers: number;
    retentionRate: number;
  };
}

type SalesTrends = {
  trends: {
    date: string;
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  }[];
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
};

type PriorityItem = {
  id: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  href?: string;
};



export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('30d');

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', dateRange],
    queryFn: async () => {
      // Fetch sales trends
      let trends: { data: SalesTrends | null } = { data: null };
      try {
        const response = await fetch('/api/sales-trends');
        if (response.ok) {
          trends = await response.json();
        }
      } catch {
        // ignore, handled with fallback below
      }

      // Fetch analytics overview
      let analytics: AnalyticsData = {};
      try {
        const response = await fetch('/api/analytics/overview');
        if (response.ok) {
          analytics = await response.json();
        }
      } catch {
        // ignore, leave analytics as empty object
      }

      // Fallback mock trends only if API did not return any data
      let salesTrends: SalesTrends | null = trends.data;
      if (!salesTrends) {
        const mockTrends: SalesTrends = {
          trends: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            totalSales: Math.floor(Math.random() * 10000) + 1000,
            totalOrders: Math.floor(Math.random() * 50) + 5,
            averageOrderValue: Math.floor(Math.random() * 200) + 50,
          })).reverse(),
          summary: {
            totalSales: 150000,
            totalOrders: 1500,
            averageOrderValue: 100,
          },
        };
        salesTrends = mockTrends;
      }

      return { analyticsData: analytics, salesTrends };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const analyticsData: AnalyticsData = data?.analyticsData || {};
  const salesTrends: SalesTrends | null = data?.salesTrends || null;
  const isRefreshing = isFetching && !!data;

  // Derive "today" ops metrics from sales trends (latest day)
  const todaySummary = (() => {
    if (!salesTrends || !salesTrends.trends || salesTrends.trends.length === 0) {
      return null;
    }

    const sorted = [...salesTrends.trends].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const latest = sorted[sorted.length - 1];
    const previous = sorted.slice(-8, -1);

    const previousRevenueTotal = previous.reduce(
      (sum, item) => sum + (typeof item.totalSales === 'number' ? item.totalSales : 0),
      0
    );
    const previousOrdersTotal = previous.reduce(
      (sum, item) => sum + (typeof item.totalOrders === 'number' ? item.totalOrders : 0),
      0
    );

    const previousCount = previous.length || 1;
    const previousRevenueAvg = previousRevenueTotal / previousCount;
    const previousOrdersAvg = previousOrdersTotal / previousCount;

    const revenueTrendPercent =
      previousRevenueAvg > 0
        ? ((latest.totalSales - previousRevenueAvg) / previousRevenueAvg) * 100
        : 0;

    const ordersTrendPercent =
      previousOrdersAvg > 0
        ? ((latest.totalOrders - previousOrdersAvg) / previousOrdersAvg) * 100
        : 0;

    const hasRevenueTrend = Math.abs(revenueTrendPercent) >= 0.5 && previousRevenueAvg > 0;

    const revenueTrendDirection: 'up' | 'down' | 'flat' =
      !hasRevenueTrend
        ? 'flat'
        : revenueTrendPercent > 0
        ? 'up'
        : 'down';

    return {
      revenueToday: latest.totalSales,
      ordersToday: latest.totalOrders,
      averageOrderValueToday: latest.averageOrderValue,
      revenueTrendPercent,
      revenueTrendDirection,
      ordersTrendPercent,
    };
  })();

  const retentionRate =
    analyticsData.customerRetention?.retentionRate ?? null;

  const priorities: PriorityItem[] = [];

  if (todaySummary && todaySummary.revenueTrendDirection === 'down' && todaySummary.revenueTrendPercent <= -10) {
    priorities.push({
      id: 'boost-sales-today',
      title: 'Boost sales today',
      description: `Revenue is ${todaySummary.revenueTrendPercent.toFixed(1)}% below your recent average`,
      severity: 'high',
      href: '/analytics',
    });
  }

  if (retentionRate !== null && retentionRate < 40) {
    priorities.push({
      id: 'improve-retention',
      title: 'Improve customer retention',
      description: `${retentionRate.toFixed(1)}% repeat rate across customers`,
      severity: 'medium',
      href: '/analytics',
    });
  }

  if ((analyticsData.totalProducts ?? 0) === 0) {
    priorities.push({
      id: 'add-products',
      title: 'Add your products',
      description: 'Start by adding products so you can record sales',
      severity: 'medium',
      href: '/products/unified',
    });
  }

  if ((analyticsData.totalCustomers ?? 0) === 0) {
    priorities.push({
      id: 'add-customers',
      title: 'Add customers',
      description: 'Create customer profiles to track repeat buyers',
      severity: 'low',
      href: '/settings/users',
    });
  }

  const showPriorities = priorities.length > 0;

  if (isLoading && !data) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
          <div className="mx-auto max-w-7xl">
            <div className="h-8 w-64 animate-pulse rounded-md bg-gray-200"></div>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <PlanGuard requiredFeature="advanced_analytics">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:bg-slate-900 dark:from-slate-900 dark:to-slate-900">
          <LogoEnforcement />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent dark:text-indigo-300">
                    Operations dashboard
                  </h1>
                  <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-300">
                    {dateRange === '7d' ? '7D' : dateRange === '30d' ? '30D' : dateRange === '90d' ? '90D' : '12M'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Live metrics and priorities for running today. Use Analytics for deeper reports.
                </p>
              </div>
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                <div className="relative w-full sm:w-48">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="block w-full rounded-lg border-0 bg-white dark:bg-slate-800 py-2.5 pl-4 pr-10 text-sm shadow-sm ring-1 ring-gray-200 dark:ring-slate-600 text-gray-900 dark:text-slate-100 transition-all hover:ring-gray-300 dark:hover:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="12m">Last 12 months</option>
                  </select>
                </div>
                <BranchSwitcher />
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isRefreshing}
                  className={`inline-flex w-full items-center justify-center rounded-lg border-0 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium shadow-sm text-gray-900 dark:text-slate-100 transition-all hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 sm:w-auto ${
                    isRefreshing ? 'cursor-not-allowed opacity-70' : ''
                  }`}
                >
                  <FiRefreshCw
                    className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>

            {/* Hero: primary KPI + secondary KPIs */}
            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Primary KPI - Today’s revenue */}
              <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                      <FiDollarSign className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Today&apos;s Revenue
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-500">
                        Compared to your recent daily average
                      </p>
                    </div>
                  </div>
                  {todaySummary && todaySummary.revenueTrendDirection !== 'flat' && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        todaySummary.revenueTrendDirection === 'up'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {todaySummary.revenueTrendDirection === 'up' ? '▲' : '▼'}
                      {`${todaySummary.revenueTrendPercent > 0 ? '+' : ''}${todaySummary.revenueTrendPercent.toFixed(1)}%`}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="text-3xl font-semibold text-gray-900 dark:text-slate-50">
                    {todaySummary
                      ? `Ksh ${Math.round(todaySummary.revenueToday).toLocaleString()}`
                      : '—'}
                  </p>
                  {!todaySummary && (
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                      Today&apos;s figures will appear as you record sales.
                    </span>
                  )}
                </div>
              </div>

              {/* Secondary KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Orders Today
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                    {todaySummary ? todaySummary.ordersToday.toLocaleString() : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Avg Order Value (Today)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                    {todaySummary
                      ? `Ksh ${todaySummary.averageOrderValueToday.toFixed(2)}`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Customers (All time)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                    {analyticsData.totalCustomers?.toLocaleString() ?? '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Products (All time)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                    {analyticsData.totalProducts?.toLocaleString() ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Today’s priorities */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                  Today&apos;s priorities
                </span>
                {showPriorities ? (
                  priorities.slice(0, 3).map((item) => {
                    const severityClasses =
                      item.severity === 'high'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : item.severity === 'medium'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700';

                    const content = (
                      <>
                        <span className="text-xs font-semibold">{item.title}</span>
                        <span className="text-[11px] text-gray-600 dark:text-slate-400">
                          · {item.description}
                        </span>
                      </>
                    );

                    return item.href ? (
                      <a
                        key={item.id}
                        href={item.href}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${severityClasses}`}
                      >
                        {content}
                      </a>
                    ) : (
                      <span
                        key={item.id}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${severityClasses}`}
                      >
                        {content}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    No urgent issues detected – focus on serving customers.
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6 space-y-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                Quick Actions
              </h2>
              <QuickActions />
            </div>

            {/* Charts Section */}
            {/* Sales Trends Chart */}
            {salesTrends && (
              <div className="mb-6">
                <ChartComponents.SalesTrendsChart data={salesTrends} />
              </div>
            )}

            {/* Customer Segmentation Section */}
            <div className="mb-6">
<div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Customer Segmentation</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <ChartComponents.CustomerSegmentation />
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-800">Top Spending Segment</p>
                          <p className="text-lg font-bold text-blue-600">Champions</p>
                          <p className="text-xs text-blue-600">15% of customers, 45% of revenue</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full">
                          <FiDollarSign className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-amber-800">Growth Opportunity</p>
                          <p className="text-lg font-bold text-amber-600">Potential Loyalists</p>
                          <p className="text-xs text-amber-600">30% of customers, 25% of revenue</p>
                        </div>
                        <div className="p-2 bg-amber-100 rounded-full">
                          <FiTrendingUp className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-rose-800">At Risk</p>
                          <p className="text-lg font-bold text-rose-600">18% of customers</p>
                          <p className="text-xs text-rose-600">Last purchase 30-60 days ago</p>
                        </div>
                        <div className="p-2 bg-rose-100 rounded-full">
                          <FiAlertCircle className="w-4 h-4 text-rose-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Sales Chart */}
              <div className="lg:col-span-2">
                <div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Sales Overview</h3>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <FiTrendingUp className="mr-1 h-3 w-3" />
                        12.5% from last month
                      </span>
                    </div>
                  </div>
                  <div className="h-72">
                    <ChartComponents.SalesTrendsAnalysis salesData={analyticsData.salesByMonth || {}} />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Customer Growth */}
                <div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                  <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Customer Growth</h3>
                  <div className="h-56">
                    <ChartComponents.CustomerGrowthChart growthData={analyticsData?.customerGrowth || {}} />
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Recent Activities</h3>
                    <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <FiUserPlus className="h-4 w-4 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-2">
                          <p className="text-sm font-medium text-gray-900">New customer registered</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Trends Analysis */}
            <div className="mb-6">
              <div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Sales Trends Analysis</h3>
                <div className="grid grid-cols-1 gap-4">
                  <ChartComponents.MonthlySalesTrends />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PlanGuard>
    </AuthGuard>
  );
}

