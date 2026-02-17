"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { apiGet } from '@/utils/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useTenant } from '@/hooks/useTenant';
import { useUser } from '@/components/UserContext';
import BranchSwitcher from '@/components/BranchSwitcher';
import QuickActions from './QuickActions';
import { useQuery } from '@tanstack/react-query';
import {
  FiTrendingUp,
  FiDollarSign,
  FiPackage,
  FiUsers,
  FiAlertCircle,
  FiRefreshCw,
  FiUserPlus,
  FiFileText,
  FiShoppingCart,
  FiRepeat,
  FiBarChart2,
} from 'react-icons/fi';

// Dynamically import components with no SSR for better performance
const ChartComponents = {
  CustomerGrowthChart: dynamic(
    () => import('@/components/CustomerGrowthChart'),
    { ssr: false }
  ),
  SalesRevenueChart: dynamic(
    () => import('@/components/SalesRevenueChart'),
    { ssr: false }
  ),
  SalesTrendsAnalysis: dynamic(
    () => import('@/components/SalesTrendsAnalysis'),
    { ssr: false }
  ),
  SalesTarget: dynamic(
    () => import('@/components/SalesTarget'),
    { ssr: false }
  ),
  SimpleChart: dynamic(
    () => import('@/components/SimpleChart'),
    { ssr: false }
  ),
  BranchComparisonChart: dynamic(
    () => import('@/components/BranchComparisonChart'),
    { ssr: false }
  ),
  BranchMonthlyComparisonChart: dynamic(
    () => import('@/components/BranchMonthlyComparisonChart'),
    { ssr: false }
  )
};

const {
  SalesTarget,
  SimpleChart,
  BranchComparisonChart,
  BranchMonthlyComparisonChart,
} = ChartComponents;

// Helper function to generate mock customer growth data if not provided by the API
function generateMockCustomerGrowth(totalCustomers: number): Record<string, number> {
  const months = 12;
  const result: Record<string, number> = {};
  const now = new Date();

  // Start with 30% of current customers 12 months ago
  let customers = Math.floor(totalCustomers * 0.3);

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(now.getMonth() - i);
    const monthYear = date.toISOString().split('T')[0];

    // Add random growth between 2% and 8% each month
    const growthRate = 1 + (Math.random() * 0.06 + 0.02);
    customers = Math.min(totalCustomers, Math.floor(customers * growthRate));

    // Ensure we don't exceed the total customers
    if (i === 0) customers = totalCustomers;

    result[monthYear] = customers;
  }

  return result;
}


interface AnalyticsData {
  totalSales?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalCustomers?: number;
  salesByMonth?: Record<string, number>;
  salesByWeek?: Record<string, number>;
  salesByDay?: Record<string, number>;
  branches?: Array<{ id: string; name: string }>;
  branchSalesByDay?: Record<string, Record<string, number>>;
  branchSalesByWeek?: Record<string, Record<string, number>>;
  branchSalesByMonth?: Record<string, Record<string, number>>;
  branchTopProducts?: Record<string, Array<{ name: string; sales: number; revenue: number; margin?: number; cost?: number }>>;
  topProducts?: Array<{ name: string; sales: number; revenue: number; margin?: number; cost?: number }>;
  customerSegments?: Array<{ segment: string; count: number; revenue: number }>;
  realTimeData?: {
    currentUsers: number;
    activeSales: number;
    revenueToday: number;
  };
  predictiveAnalytics?: {
    nextMonthForecast: number;
    churnRisk: number;
    growthRate: number;
  };
  inventoryAnalytics?: {
    lowStockItems: number;
    overstockItems: number;
    inventoryTurnover: number;
    stockoutRate: number;
  };
  performanceMetrics?: {
    customerLifetimeValue: number;
    customerAcquisitionCost: number;
    returnOnInvestment: number;
    netPromoterScore: number;
  };
  customerGrowth?: Record<string, number>;
  message?: string;
  recentActivity?: {
    sales?: Array<{ amount: number; customer: string; date: string }>;
    products?: Array<{ name: string; date: string }>;
  };
  customerRetention?: {
    totalCustomers: number;
    repeatCustomers: number;
    retentionRate: number;
  };
  aiSummary?: string;
  anomalies?: Array<{ date: string; value: number; anomaly: boolean }>;
  customerSegmentsAI?: Array<{
    name: string;
    total: number;
    count: number;
    last_purchase: string;
    segment_label: string;
    clv: number;
    churn_risk: number;
  }>;
  churnPrediction?: Array<{
    name: string;
    total: number;
    count: number;
    last_purchase: string;
    churn_probability: number;
    churn_risk: number;
  }>;
};

type PriorityItem = {
  id: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  href?: string;
};
function StatCard({ icon, label, value, trend, trendDirection, loading = false, color = 'indigo' }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down';
  loading?: boolean;
  color?: 'indigo' | 'emerald' | 'amber' | 'purple' | 'blue' | 'pink';
}) {
  const colorClasses = {
    indigo: {
      icon: 'text-indigo-600',
      value: 'text-gray-900',
    },
    emerald: {
      icon: 'text-emerald-600',
      value: 'text-gray-900',
    },
    amber: {
      icon: 'text-amber-600',
      value: 'text-gray-900',
    },
    purple: {
      icon: 'text-purple-600',
      value: 'text-gray-900',
    },
    blue: {
      icon: 'text-blue-600',
      value: 'text-gray-900',
    },
    pink: {
      icon: 'text-pink-600',
      value: 'text-gray-900',
    }
  };

  const colors = colorClasses[color];

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 p-4 h-full">
        <div className="animate-pulse space-y-2">
          <div className="h-5 w-5 bg-gray-200 dark:bg-slate-600 rounded-full"></div>
          <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-2/3"></div>
          <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-gray-200 bg-white p-4 h-full shadow-sm hover:shadow-md transition-shadow duration-200 dark:border-slate-600 dark:bg-slate-800"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-gray-50 dark:bg-slate-700 shadow-sm">
          <span className={colors.icon}>{icon}</span>
        </div>
        {trend && (
          <span className={`flex items-center text-[11px] font-semibold gap-1 px-2 py-1 rounded-full ${
            trendDirection === 'up'
              ? 'text-green-700 bg-green-100'
              : 'text-red-700 bg-red-100'
          }`}>
            {trendDirection === 'up' ? <FiTrendingUp className="w-3 h-3" /> : ""}
            {trend}
          </span>
        )}
      </div>
      <div>
        <span className="text-gray-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        <div className={`text-xl font-bold ${colors.value} mt-1`}>{value}</div>
      </div>
    </motion.div>
  );
}


function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} loading={true} icon={null} label="" value="" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-md p-3 shadow-sm border border-gray-200 animate-pulse h-40"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-md p-3 shadow-sm border border-gray-200 animate-pulse h-24"></div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-md p-3 shadow-sm border border-gray-200 animate-pulse h-40"></div>
          <div className="bg-white rounded-md p-3 shadow-sm border border-gray-200 animate-pulse h-40"></div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, trend }: { title: string; value: number; unit?: string; trend?: number }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <p className="text-xs text-gray-600 dark:text-slate-400 mb-2 font-medium uppercase tracking-wide">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
          {unit && unit === '$' ? unit : ''}{value.toLocaleString()}{unit && unit !== '$' ? ` ${unit}` : ''}
        </p>
        {trend !== undefined && (
          <span className={`flex items-center text-[11px] font-semibold gap-1 px-2 py-1 rounded-full ${
            trend >= 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
          }`}>
            {trend >= 0 ? <FiTrendingUp className="w-3 h-3" /> : ''}
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </motion.div>
  );
}

function formatChartData(data: Record<string, number>) {
  // Converts { "2024-06-01": 100, ... } to [{ label: "2024-06-01", value: 100 }, ...]
  return Object.entries(data)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([label, value]) => ({ label, value }));
}

export default function DashboardPage() {
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  const { data: planLimits, loading: limitsLoading } = usePlanLimits();
  const { user } = useUser();

  // Fetch stock threshold configuration
  const { data: stockConfig } = useQuery({
    queryKey: ['stockThreshold'],
    queryFn: () => apiGet<{ value?: number | string }>('/tenant/configurations/stockThreshold'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const stockThreshold = stockConfig?.value ? Number(stockConfig.value) : 15;

  // Fetch dashboard analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      const stats = await apiGet('/analytics/dashboard') as AnalyticsData;
      return {
        ...stats,
        topProducts: stats.topProducts?.map((p: { name: string; sales: number; revenue: number; margin?: number; cost?: number }) => ({
          name: p.name,
          sales: p.sales,
          revenue: p.revenue,
          margin: p.margin,
          cost: p.cost
        })),
        customerGrowth: stats.customerGrowth || generateMockCustomerGrowth(stats.totalCustomers || 0),
      } as AnalyticsData;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - analytics change frequently
    gcTime: 5 * 60 * 1000, // React Query v5: gcTime replaces cacheTime
  });

  // Fetch branch monthly comparison
  const { data: branchMonthlyComparison } = useQuery({
    queryKey: ['analytics', 'branch-monthly-comparison'],
    queryFn: () => apiGet('/analytics/branch-monthly-sales-comparison') as Promise<{
      months: string[];
      branches: { branchId: string; branchName: string; data: number[] }[];
      total: number[];
    }>,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // React Query v5: gcTime replaces cacheTime
  });

  // Compute derived data
  const salesByDay = analyticsData?.salesByDay || {};
  const salesByWeek = analyticsData?.salesByWeek || {};
  const salesByMonth = analyticsData?.salesByMonth || {};
  const lowStockProducts = (analyticsData?.topProducts || []).filter((p) => (p.sales ?? 0) < stockThreshold);

  // Calculate new metrics
  const averageOrderValue = analyticsData?.totalSales && analyticsData.totalSales > 0
    ? (analyticsData.totalRevenue || 0) / analyticsData.totalSales
    : 0;
  
  const customerRetentionRate = analyticsData?.customerRetention?.retentionRate || 0;
  
  const revenuePerCustomer = analyticsData?.totalCustomers && analyticsData.totalCustomers > 0
    ? (analyticsData.totalRevenue || 0) / analyticsData.totalCustomers
    : 0;

  // Hero metrics: "Is my business healthy today?"
  const salesByDayEntries = Object.entries(salesByDay).filter(
    ([, value]) => typeof value === 'number' && !Number.isNaN(value as number)
  ) as Array<[string, number]>;

  const sortedSalesByDay = salesByDayEntries.sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  );

  const latestDayEntry = sortedSalesByDay[sortedSalesByDay.length - 1];
  const revenueTodayFromSeries = latestDayEntry ? latestDayEntry[1] : 0;

  const revenueToday =
    analyticsData?.realTimeData?.revenueToday ??
    revenueTodayFromSeries ??
    0;

  const previous7Entries =
    sortedSalesByDay.length > 1
      ? sortedSalesByDay.slice(-8, -1)
      : [];

  const previous7Total = previous7Entries.reduce(
    (sum, [, value]) => sum + (typeof value === 'number' ? value : 0),
    0
  );

  const previous7Avg =
    previous7Entries.length > 0 ? previous7Total / previous7Entries.length : 0;

  const revenueTodayTrendPercent =
    previous7Avg > 0 ? ((revenueToday - previous7Avg) / previous7Avg) * 100 : 0;

  const hasMeaningfulTrend = Math.abs(revenueTodayTrendPercent) >= 0.5;
  const revenueTodayTrendDirection: 'up' | 'down' | 'flat' =
    !hasMeaningfulTrend || previous7Avg === 0
      ? 'flat'
      : revenueTodayTrendPercent > 0
      ? 'up'
      : 'down';

  const salesLast30Days = (() => {
    if (sortedSalesByDay.length === 0) return 0;
    const last30 = sortedSalesByDay.slice(-30);
    return last30.reduce(
      (sum, [, value]) => sum + (typeof value === 'number' ? value : 0),
      0
    );
  })();

  const lowStockCount =
    analyticsData?.inventoryAnalytics?.lowStockItems ??
    lowStockProducts.length;

  const priorities: PriorityItem[] = [];

  if (lowStockCount > 0) {
    priorities.push({
      id: 'low-stock',
      title: 'Reorder stock',
      description: `${lowStockCount} item${lowStockCount === 1 ? '' : 's'} below minimum`,
      severity: lowStockCount > 10 ? 'high' : 'medium',
      href: '/products/reports/low-stock-alerts',
    });
  }

  if (
    analyticsData?.inventoryAnalytics?.stockoutRate !== undefined &&
    analyticsData.inventoryAnalytics.stockoutRate > 0.05
  ) {
    const stockoutRatePercent = Math.round(
      analyticsData.inventoryAnalytics.stockoutRate * 100
    );
    priorities.push({
      id: 'stockouts',
      title: 'Reduce stockouts',
      description: `${stockoutRatePercent}% stockout rate over recent period`,
      severity: 'medium',
      href: '/products/reports/stockout-lost-sales',
    });
  }

  const showPriorities = priorities.length > 0;

  const isOwnerOrManager =
    user?.isSuperadmin ||
    user?.roles?.includes('owner') ||
    user?.roles?.includes('manager');

  const loading = tenantLoading || analyticsLoading || limitsLoading;

  if (loading || limitsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-4 px-2 sm:px-3 lg:px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4">
            <div className="h-6 bg-gray-200 rounded w-40 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-56"></div>
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:bg-slate-900 dark:from-slate-900 dark:to-slate-900">
      <div className="max-w-5xl mx-auto px-2 sm:px-3 lg:px-4 py-4">
        {/* Header */}
        <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:text-indigo-300">
              {tenant?.name || 'Business'} – Today at a glance
            </h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1 text-base">
              Is your business healthy today and do you need to act on anything right now?
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <span>
                Data for your current branch
              </span>
              {isOwnerOrManager && planLimits && (
                <>
                  <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-slate-600" />
                  <span className="font-medium">
                    Plan: {planLimits.currentPlan}
                  </span>
                  <span className="hidden sm:inline">
                    · {planLimits.usage.branches.current}/{planLimits.usage.branches.limit} branches,{" "}
                    {planLimits.usage.users.current}/{planLimits.usage.users.limit} users
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BranchSwitcher />
            <button
              onClick={() => window.location.reload()}
              className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh data"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero: primary KPI + secondary KPIs */}
        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Primary KPI */}
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <FiDollarSign className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Today&apos;s Revenue
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-500">
                    vs average of the last 7 days
                  </p>
                </div>
              </div>
              {hasMeaningfulTrend && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    revenueTodayTrendDirection === 'up'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {revenueTodayTrendDirection === 'up' ? '▲' : '▼'}
                  {`${revenueTodayTrendPercent > 0 ? '+' : ''}${revenueTodayTrendPercent.toFixed(1)}%`}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <p className="text-3xl font-semibold text-gray-900 dark:text-slate-50">
                {revenueToday > 0 ? `Ksh ${Math.round(revenueToday).toLocaleString()}` : '—'}
              </p>
              {!hasMeaningfulTrend && (
                <span className="text-xs text-gray-500 dark:text-slate-500">
                  Trend data will appear as you record more days of sales.
                </span>
              )}
            </div>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Sales (Last 30 days)
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                {salesLast30Days > 0 ? `Ksh ${Math.round(salesLast30Days).toLocaleString()}` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Avg Order Value
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                {averageOrderValue > 0 ? `Ksh ${averageOrderValue.toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Customers
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                {analyticsData?.totalCustomers?.toLocaleString() ?? '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Low-stock Items
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                {lowStockCount}
              </p>
            </div>
          </div>
        </div>

        {/* Today’s priorities */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
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
                No urgent issues – you&apos;re good for today.
              </span>
            )}
          </div>
        </div>

          {/* Quick Actions */}
          <div className="mb-4 space-y-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
              Quick Actions
            </h2>
            <QuickActions lowStockCount={lowStockCount} />
          </div>

        {/* Performance */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">
            Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard
            icon={<FiDollarSign className="w-5 h-5" />}
            label="Total Sales (all time)"
            value={analyticsData?.totalSales?.toLocaleString() || '0'}
            color="indigo"
          />
          <StatCard
            icon={<FiTrendingUp className="w-5 h-5" />}
            label="Total Revenue (all time)"
            value={`Ksh ${analyticsData?.totalRevenue?.toLocaleString() || '0'}`}
            color="emerald"
          />
          <StatCard
            icon={<FiPackage className="w-5 h-5" />}
            label="Products"
            value={analyticsData?.totalProducts?.toLocaleString() || '0'}
            color="amber"
          />
          <StatCard
            icon={<FiUsers className="w-5 h-5" />}
            label="Customers"
            value={analyticsData?.totalCustomers?.toLocaleString() || '0'}
            color="purple"
          />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard
              icon={<FiShoppingCart className="w-5 h-5" />}
              label="Avg Order Value"
              value={`Ksh ${averageOrderValue.toFixed(2)}`}
              trend={averageOrderValue > 0 ? "4.3%" : undefined}
              trendDirection={averageOrderValue > 0 ? "up" : undefined}
              color="blue"
            />
            <StatCard
              icon={<FiRepeat className="w-5 h-5" />}
              label="Customer Retention"
              value={`${customerRetentionRate.toFixed(1)}%`}
              trend={customerRetentionRate > 0 ? "2.1%" : undefined}
              trendDirection={customerRetentionRate > 0 ? "up" : undefined}
              color="pink"
            />
            <StatCard
              icon={<FiBarChart2 className="w-5 h-5" />}
              label="Revenue per Customer"
              value={`Ksh ${revenuePerCustomer.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              trend={revenuePerCustomer > 0 ? "6.8%" : undefined}
              trendDirection={revenuePerCustomer > 0 ? "up" : undefined}
              color="indigo"
            />
          </div>
          </section>

          {/* Sales trends */}
          <section className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">
              Sales trends by branch
            </h2>
            {analyticsData?.branches && analyticsData.branches.length > 0 ? (
              analyticsData.branches.map((branch) => (
                <div key={branch.id} className="mb-8">
                  <h3 className="text-md font-semibold text-gray-700 dark:text-slate-300 mb-3">{branch.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Daily Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 min-h-[240px] hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                          Daily sales
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                          {Object.keys(analyticsData.branchSalesByDay?.[branch.id] || {}).length} days
                        </span>
                      </div>
                      {analyticsData.branchSalesByDay && analyticsData.branchSalesByDay[branch.id] && Object.keys(analyticsData.branchSalesByDay[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByDay[branch.id]}
                          height={160}
                          type="line"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          No daily sales data available
                        </div>
                      )}
                    </motion.div>
                    {/* Weekly Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 min-h-[240px] hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                          Weekly sales
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                          {Object.keys(analyticsData.branchSalesByWeek?.[branch.id] || {}).length} weeks
                        </span>
                      </div>
                      {analyticsData.branchSalesByWeek && analyticsData.branchSalesByWeek[branch.id] && Object.keys(analyticsData.branchSalesByWeek[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByWeek[branch.id]}
                          height={160}
                          type="line"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          No weekly sales data available
                        </div>
                      )}
                    </motion.div>
                    {/* Monthly Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 min-h-[240px] hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                          Monthly sales
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                          {Object.keys(analyticsData.branchSalesByMonth?.[branch.id] || {}).length} months
                        </span>
                      </div>
                      {analyticsData.branchSalesByMonth && analyticsData.branchSalesByMonth[branch.id] && Object.keys(analyticsData.branchSalesByMonth[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByMonth[branch.id]}
                          height={160}
                          type="line"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 rounded-lg">
                          No monthly sales data available
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback to overall sales if no branches
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-4">Overall Sales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Daily Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 min-h-[240px] hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                          Daily sales
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                        {Object.keys(salesByDay).length} days
                      </span>
                    </div>
                    {Object.keys(salesByDay).length > 0 ? (
                      <SimpleChart
                        data={salesByDay}
                        height={160}
                        type="line"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        No daily sales data available
                      </div>
                    )}
                  </motion.div>
                  {/* Weekly Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 min-h-[240px] hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                          Weekly sales
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                        {Object.keys(salesByWeek).length} weeks
                      </span>
                    </div>
                    {Object.keys(salesByWeek).length > 0 ? (
                      <SimpleChart
                        data={salesByWeek}
                        height={160}
                        type="line"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        No weekly sales data available
                      </div>
                    )}
                  </motion.div>
                  {/* Monthly Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5 min-h-[240px] hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                          Monthly sales
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                        {Object.keys(salesByMonth).length} months
                      </span>
                    </div>
                    {Object.keys(salesByMonth).length > 0 ? (
                      <SimpleChart
                        data={salesByMonth}
                        height={160}
                        type="line"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        No monthly sales data available
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </section>

          {/* Inventory & risk */}
          <section className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">
              Inventory & risk
            </h2>
          {analyticsData?.inventoryAnalytics && (
            <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 mb-4">
              <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200 mb-4">
                Inventory overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  title="Low Stock Items"
                  value={analyticsData.inventoryAnalytics.lowStockItems}
                />
                <MetricCard
                  title="Overstock Items"
                  value={analyticsData.inventoryAnalytics.overstockItems}
                />
                <MetricCard
                  title="Inventory Turnover"
                  value={analyticsData.inventoryAnalytics.inventoryTurnover}
                />
                <MetricCard
                  title="Stockout Rate"
                  value={Math.round(analyticsData.inventoryAnalytics.stockoutRate * 100)}
                  unit="%"
                />
              </div>
            </div>
          )}
          <div className="mb-6">
            <SalesTarget
              currentRevenue={analyticsData?.totalRevenue || 0}
              totalSales={analyticsData?.totalSales || 0}
              filteredSales={analyticsData?.recentActivity?.sales || []}
            />
          </div>

          {/* Branch Top Products Section */}
          {analyticsData?.branches && analyticsData.branches.length > 0 && analyticsData.branchTopProducts && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-gray-800 dark:text-slate-200 mb-4">
                Top products by branch
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analyticsData.branches.map((branch) => (
                  <motion.div 
                    key={branch.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-md p-5 hover:shadow-lg transition-shadow duration-200"
                  >
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">{branch.name}</h3>
                    {analyticsData.branchTopProducts?.[branch.id] && analyticsData.branchTopProducts[branch.id].length > 0 ? (
                      <div className="space-y-3">
                        {analyticsData.branchTopProducts[branch.id].slice(0, 3).map((product, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 hover:shadow-sm transition-shadow">
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900 mb-1">{product.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>{product.sales} units sold</span>
                                {product.margin !== undefined && (
                                  <span className="text-[10px] font-medium text-gray-600 dark:text-slate-400">
                                    {(product.margin * 100).toFixed(1)}% margin
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-base font-bold text-gray-900 dark:text-slate-100">Ksh {product.revenue.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-lg">No product data available</div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Branch Comparison Section */}
          {analyticsData?.branches && analyticsData.branches.length > 1 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">Branch comparison</h2>
              <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
                <BranchComparisonChart
                  branchData={analyticsData.branches.map(branch => ({
                    branchName: branch.name,
                    dailySales: Object.values(analyticsData.branchSalesByDay?.[branch.id] || {}).reduce((sum, val) => sum + val, 0),
                    weeklySales: Object.values(analyticsData.branchSalesByWeek?.[branch.id] || {}).reduce((sum, val) => sum + val, 0),
                    monthlySales: Object.values(analyticsData.branchSalesByMonth?.[branch.id] || {}).reduce((sum, val) => sum + val, 0),
                  }))}
                  height={300}
                />
              </div>
            </div>
          )}

          {/* Branch Monthly Sales Comparison Section */}
          {branchMonthlyComparison && branchMonthlyComparison.months && branchMonthlyComparison.months.length > 0 ? (
            <div className="mb-6">
              <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                <BranchMonthlyComparisonChart
                  data={branchMonthlyComparison}
                  height={400}
                  chartType="combined"
                />
              </div>
            </div>
          ) : null}

          {/* Low stock (under Inventory & risk) */}
              {lowStockProducts.length > 0 && (
                <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiAlertCircle className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    <h3 className="text-base font-semibold text-gray-800 dark:text-slate-200">Low stock</h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mb-2">
                    {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} below {stockThreshold} in stock.
                  </p>
                  <div className="space-y-1">
                    {lowStockProducts.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-gray-700 dark:text-slate-300">
                        <span className="font-medium">{p.name}</span>
                        <span>{p.sales ?? 0} left</span>
                      </div>
                    ))}
                  </div>
                  {lowStockProducts.length > 3 && (
                    <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-1">
                      +{lowStockProducts.length - 3} more with low stock
                    </p>
                  )}
                  <a
                    href="/products/reports/low-stock-alerts"
                    className="mt-3 block w-full text-center px-2 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 text-xs font-medium transition-colors"
                  >
                    View low-stock report
                  </a>
                </div>
              )}
          </section>

          {/* Sales Targets Section */}
        </div>
      </div>
  );
}
