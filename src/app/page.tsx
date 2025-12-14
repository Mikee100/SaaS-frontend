"use client";
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { apiGet } from '@/utils/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useTenant } from '@/hooks/useTenant';
import BranchSwitcher from '@/components/BranchSwitcher';
import { useUser } from '@/components/UserContext';
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
  FiTarget,
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

interface Tenant {
  name: string;
  logoUrl?: string;
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
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600',
      value: 'text-indigo-900',
      border: 'border-indigo-200'
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      value: 'text-emerald-900',
      border: 'border-emerald-200'
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      value: 'text-amber-900',
      border: 'border-amber-200'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      value: 'text-purple-900',
      border: 'border-purple-200'
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      value: 'text-blue-900',
      border: 'border-blue-200'
    },
    pink: {
      bg: 'bg-pink-50',
      icon: 'text-pink-600',
      value: 'text-pink-900',
      border: 'border-pink-200'
    }
  };

  const colors = colorClasses[color];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
        <div className="animate-pulse space-y-2">
          <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  const gradientClasses = {
    indigo: 'bg-gradient-to-br from-white to-indigo-50 border-indigo-200',
    emerald: 'bg-gradient-to-br from-white to-emerald-50 border-emerald-200',
    amber: 'bg-gradient-to-br from-white to-amber-50 border-amber-200',
    purple: 'bg-gradient-to-br from-white to-purple-50 border-purple-200',
    blue: 'bg-gradient-to-br from-white to-blue-50 border-blue-200',
    pink: 'bg-gradient-to-br from-white to-pink-50 border-pink-200'
  };

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`${gradientClasses[color]} rounded-lg shadow-md border p-4 h-full hover:shadow-lg transition-shadow duration-200`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.icon} shadow-sm`}>
          {icon}
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
        <span className="text-gray-600 text-xs font-medium uppercase tracking-wide">{label}</span>
        <div className={`text-xl font-bold ${colors.value} mt-1`}>{value}</div>
      </div>
    </motion.div>
  );
}

function QuickActions() {
  const actions = [
    {
      label: "Add Product",
      href: "/products/unified",
      icon: <FiPackage className="w-5 h-5" />,
    },
    {
      label: "Add Customer",
      href: "/users",
      icon: <FiUserPlus className="w-5 h-5" />,
    },
    {
      label: "New Sale",
      href: "/sales",
      icon: <FiShoppingCart className="w-5 h-5" />,
    },
    {
      label: "Generate Report",
      href: "/reports",
      icon: <FiFileText className="w-5 h-5" />,
    },
  ];

  return (
    <div className="bg-white rounded-md shadow-sm p-3 border border-gray-200">
      <h2 className="text-base font-semibold text-gray-800 mb-2">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {actions.map((action, i) => (
          <a
            key={i}
            href={action.href}
            className="bg-gray-50 text-gray-700 p-2 rounded-md flex flex-col items-center gap-2 transition-all duration-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <div className="p-1 bg-white rounded-md shadow-sm">
              {action.icon}
            </div>
            <span className="text-xs font-medium text-center">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
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
      className="bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-lg font-bold text-gray-900">
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
  const userContext = useUser();
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  const { loading: limitsLoading } = usePlanLimits();

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

  const loading = tenantLoading || analyticsLoading || limitsLoading;

  if (loading || limitsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-2 sm:px-3 lg:px-4">
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

  // Log chart data to debug
  console.log("Daily:", formatChartData(salesByDay));
  console.log("Weekly:", formatChartData(salesByWeek));
  console.log("Monthly:", formatChartData(salesByMonth));

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="max-w-5xl mx-auto px-2 sm:px-3 lg:px-4 py-4">
          {/* Header */}
          <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{tenant?.name || 'Business'} Dashboard</h1>
              <p className="text-gray-600 mt-1 text-base">
                Welcome back! Here&apos;s what&apos;s happening with your business.
              </p>
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

          {/* Quick Actions */}
          <div className="mb-4">
            <QuickActions />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard
              icon={<FiDollarSign className="w-5 h-5" />}
              label="Total Sales"
              value={analyticsData?.totalSales?.toLocaleString() || '0'}
              trend="12.5%"
              trendDirection="up"
              color="indigo"
            />
            <StatCard
              icon={<FiTrendingUp className="w-5 h-5" />}
              label="Total Revenue"
              value={`Ksh ${analyticsData?.totalRevenue?.toLocaleString() || '0'}`}
              trend="8.2%"
              trendDirection="up"
              color="emerald"
            />
            <StatCard
              icon={<FiPackage className="w-5 h-5" />}
              label="Products"
              value={analyticsData?.totalProducts?.toLocaleString() || '0'}
              trend="3.1%"
              trendDirection="up"
              color="amber"
            />
            <StatCard
              icon={<FiUsers className="w-5 h-5" />}
              label="Customers"
              value={analyticsData?.totalCustomers?.toLocaleString() || '0'}
              trend="5.7%"
              trendDirection="up"
              color="purple"
            />
          </div>

          {/* Additional Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
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

          {/* Revenue & Growth Section */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiTrendingUp className="w-5 h-5 text-indigo-600" />
              Sales Trends by Branch
            </h2>
            {analyticsData?.branches && analyticsData.branches.length > 0 ? (
              analyticsData.branches.map((branch) => (
                <div key={branch.id} className="mb-8">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">{branch.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Daily Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col bg-gradient-to-br from-white to-indigo-50 rounded-xl border border-indigo-200 shadow-md p-5 min-h-[240px] hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                          Daily Sales
                        </span>
                        <span className="text-[10px] text-gray-500 bg-indigo-100 px-2 py-1 rounded-full">
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
                        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
                          No daily sales data available
                        </div>
                      )}
                    </motion.div>
                    {/* Weekly Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-col bg-gradient-to-br from-white to-emerald-50 rounded-xl border border-emerald-200 shadow-md p-5 min-h-[240px] hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          Weekly Sales
                        </span>
                        <span className="text-[10px] text-gray-500 bg-emerald-100 px-2 py-1 rounded-full">
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
                        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
                          No weekly sales data available
                        </div>
                      )}
                    </motion.div>
                    {/* Monthly Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col bg-gradient-to-br from-white to-purple-50 rounded-xl border border-purple-200 shadow-md p-5 min-h-[240px] hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-purple-700 flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          Monthly Sales
                        </span>
                        <span className="text-[10px] text-gray-500 bg-purple-100 px-2 py-1 rounded-full">
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
                        <div className="flex-1 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
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
                <h3 className="text-lg font-bold text-gray-800 mb-4">Overall Sales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Daily Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col bg-gradient-to-br from-white to-indigo-50 rounded-xl border border-indigo-200 shadow-md p-5 min-h-[240px] hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        Daily Sales
                      </span>
                      <span className="text-[10px] text-gray-500 bg-indigo-100 px-2 py-1 rounded-full">
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
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
                        No daily sales data available
                      </div>
                    )}
                  </motion.div>
                  {/* Weekly Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col bg-gradient-to-br from-white to-emerald-50 rounded-xl border border-emerald-200 shadow-md p-5 min-h-[240px] hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        Weekly Sales
                      </span>
                      <span className="text-[10px] text-gray-500 bg-emerald-100 px-2 py-1 rounded-full">
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
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
                        No weekly sales data available
                      </div>
                    )}
                  </motion.div>
                  {/* Monthly Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col bg-gradient-to-br from-white to-purple-50 rounded-xl border border-purple-200 shadow-md p-5 min-h-[240px] hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-purple-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Monthly Sales
                      </span>
                      <span className="text-[10px] text-gray-500 bg-purple-100 px-2 py-1 rounded-full">
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
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
                        No monthly sales data available
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </div>

          {/* Inventory Overview */}
          {analyticsData?.inventoryAnalytics && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-5 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiPackage className="w-5 h-5 text-amber-600" />
                Inventory Overview
              </h2>
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

          {/* Sales Targets Section */}
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
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiPackage className="w-5 h-5 text-purple-600" />
                Top Products by Branch
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
                          <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900 mb-1">{product.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>{product.sales} units sold</span>
                                {product.margin !== undefined && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-medium">
                                    {(product.margin * 100).toFixed(1)}% margin
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-base font-bold text-emerald-600">Ksh {product.revenue.toLocaleString()}</div>
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
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Branch Comparison</h2>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
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
              <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
                <BranchMonthlyComparisonChart
                  data={branchMonthlyComparison}
                  height={400}
                  chartType="combined"
                />
              </div>
            </div>
          ) : null}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Main Content Area */}


            {/* Sidebar */}
            <div className="space-y-3">
              {/* Low Stock Notification */}
              {lowStockProducts.length > 0 && (
                <div className="bg-white rounded-md border border-gray-200 p-3">
                  <div className="flex items-center gap-1 mb-2">
                    <FiAlertCircle className="w-4 h-4 text-amber-500" />
                    <h2 className="text-base font-semibold text-gray-800">Low Stock Alert</h2>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} below {stockThreshold} in stock.
                  </p>
                  <div className="space-y-1">
                    {lowStockProducts.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-red-600">{p.sales ?? 0} left</span>
                      </div>
                    ))}
                  </div>
                  {lowStockProducts.length > 3 && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      +{lowStockProducts.length - 3} more products with low stock
                    </p>
                  )}
                  <button className="w-full mt-2 px-2 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-xs">
                    Manage Inventory
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
