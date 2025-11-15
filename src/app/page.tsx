"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { apiGet } from '@/utils/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import BranchSwitcher from '@/components/BranchSwitcher';
import { useUser } from '@/components/UserContext';
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
  )
};

const {
  SalesTarget,
  SimpleChart,
  BranchComparisonChart,
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





function StatCard({ icon, label, value, trend, trendDirection, loading = false }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down';
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-md shadow-sm border border-gray-200 p-3 h-full">
        <div className="animate-pulse space-y-2">
          <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="bg-white rounded-md shadow-sm border border-gray-200 p-3 h-full"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center text-[11px] font-medium gap-1 px-1.5 py-0.5 rounded ${
            trendDirection === 'up'
              ? 'text-green-600 bg-green-50'
              : 'text-red-600 bg-red-50'
          }`}>
            {trendDirection === 'up' ? <FiTrendingUp className="w-3 h-3" /> : ""}
            {trend}
          </span>
        )}
      </div>
      <div>
        <span className="text-gray-500 text-xs font-medium">{label}</span>
        <div className="text-lg font-bold text-gray-900 mt-0.5">{value}</div>
      </div>
    </motion.div>
  );
}

function QuickActions() {
  const actions = [
    {
      label: "Add Product",
      href: "/products",
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
    <div className="bg-white rounded-md border border-gray-200 p-2">
      <p className="text-[11px] text-gray-500 mb-0.5">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-base font-bold text-gray-900">
          {unit && unit === '$' ? unit : ''}{value.toLocaleString()}{unit && unit !== '$' ? unit : ''}
        </p>
        {trend !== undefined && (
          <span className={`flex items-center text-[11px] font-medium gap-1 px-1 py-0.5 rounded ${
            trend >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
          }`}>
            {trend >= 0 ? <FiTrendingUp className="w-3 h-3" /> : ''}
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
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
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const {  loading: limitsLoading } = usePlanLimits();
  const [stockThreshold, setStockThreshold] = useState<number>(15);
  const [salesByDay, setSalesByDay] = useState<Record<string, number>>({});
  const [salesByWeek, setSalesByWeek] = useState<Record<string, number>>({});
  const [salesByMonth, setSalesByMonth] = useState<Record<string, number>>({});
  const [branchMonthlyComparison, setBranchMonthlyComparison] = useState<{
    months: string[];
    branches: { branchId: string; branchName: string; data: number[] }[];
    total: number[];
  } | null>(null);
  const lowStockProducts = (analyticsData?.topProducts || []).filter((p) => (p.sales ?? 0) < stockThreshold);

  // Fetch tenant data
  useEffect(() => {
    const fetchTenant = async () => {
      if (!userContext.user?.tenantId) return;

      try {
        const tenantData = await apiGet('/tenant/me');
        setTenant(tenantData as Tenant);
      } catch (error) {
        console.error('Error fetching tenant:', error);
      }
    };

    if (userContext.user) {
      fetchTenant();
    }
  }, [userContext.user]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const config = await apiGet<{ value?: number | string }>('/tenant/configurations/stockThreshold');
        setStockThreshold(config?.value ? Number(config.value) : 15);

        const stats = await apiGet('/analytics/dashboard') as AnalyticsData;
        setAnalyticsData({
          totalSales: stats.totalSales,
          totalRevenue: stats.totalRevenue,
          totalProducts: stats.totalProducts,
          totalCustomers: stats.totalCustomers,
          salesByMonth: stats.salesByMonth,
          salesByWeek: stats.salesByWeek,
          salesByDay: stats.salesByDay,
          branches: stats.branches,
          branchSalesByDay: stats.branchSalesByDay,
          branchSalesByWeek: stats.branchSalesByWeek,
          branchSalesByMonth: stats.branchSalesByMonth,
          branchTopProducts: stats.branchTopProducts,
          topProducts: stats.topProducts?.map((p: { name: string; sales: number; revenue: number; margin?: number; cost?: number }) => ({
            name: p.name,
            sales: p.sales,
            revenue: p.revenue,
            margin: p.margin,
            cost: p.cost
          })),
          customerSegments: stats.customerSegments,
          realTimeData: stats.realTimeData,
          predictiveAnalytics: stats.predictiveAnalytics,
          message: stats.message,
          recentActivity: stats.recentActivity,
          customerRetention: stats.customerRetention,
          customerGrowth: stats.customerGrowth || generateMockCustomerGrowth(stats.totalCustomers || 0),
          inventoryAnalytics: stats.inventoryAnalytics,
          performanceMetrics: stats.performanceMetrics,
        });

        // Fetch sales data for graphs if not present or if you want more detail
        // If your /analytics/dashboard already provides these, you can skip these fetches
        const dayData = stats.salesByDay || {};
        const weekData = stats.salesByWeek || {};
        const monthData = stats.salesByMonth || {};

        setSalesByDay(dayData);
        setSalesByWeek(weekData);
        setSalesByMonth(monthData);

        const activities: Array<{ type: string; description: string; date: string }> = [];
        if (stats.recentActivity?.sales) {
          stats.recentActivity.sales.forEach((sale: { amount: number; customer: string; date: string }) => {
            activities.push({
              type: 'sale',
              description: `Sale: $${sale.amount.toLocaleString()} to ${sale.customer}`,
              date: sale.date,
            });
          });
        }
        if (stats.recentActivity?.products) {
          stats.recentActivity.products.forEach((product: { name: string; date: string }) => {
            activities.push({
              type: 'product',
              description: `New product: ${product.name}`,
              date: product.date,
            });
          });
        }
        // Fetch branch monthly sales comparison
        apiGet('/analytics/branch-monthly-sales-comparison')
          .then((data) => setBranchMonthlyComparison(data as {
            months: string[];
            branches: { branchId: string; branchName: string; data: number[] }[];
            total: number[];
          }))
          .catch(() => setBranchMonthlyComparison(null));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setAnalyticsData(null);
        
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <StatCard
              icon={<FiDollarSign className="w-4 h-4" />}
              label="Total Sales"
              value={analyticsData?.totalSales?.toLocaleString() || '0'}
              trend="12.5%"
              trendDirection="up"
            />
            <StatCard
              icon={<FiTrendingUp className="w-4 h-4" />}
              label="Total Revenue"
              value={`$${analyticsData?.totalRevenue?.toLocaleString() || '0'}`}
              trend="8.2%"
              trendDirection="up"
            />
            <StatCard
              icon={<FiPackage className="w-4 h-4" />}
              label="Products"
              value={analyticsData?.totalProducts?.toLocaleString() || '0'}
              trend="3.1%"
              trendDirection="up"
            />
            <StatCard
              icon={<FiUsers className="w-4 h-4" />}
              label="Customers"
              value={analyticsData?.totalCustomers?.toLocaleString() || '0'}
              trend="5.7%"
              trendDirection="up"
            />
          </div>

          {/* Revenue & Growth Section */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Sales Trends by Branch</h2>
            {analyticsData?.branches && analyticsData.branches.length > 0 ? (
              analyticsData.branches.map((branch) => (
                <div key={branch.id} className="mb-8">
                  <h3 className="text-md font-semibold text-gray-700 mb-3">{branch.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Daily Sales Chart */}
                    <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-lg p-4 min-h-[220px] hover:shadow-xl transition-shadow duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-indigo-700">Daily Sales</span>
                        <span className="text-[10px] text-gray-400">{Object.keys(analyticsData.branchSalesByDay?.[branch.id] || {}).length} days</span>
                      </div>
                      {analyticsData.branchSalesByDay && analyticsData.branchSalesByDay[branch.id] && Object.keys(analyticsData.branchSalesByDay[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByDay[branch.id]}
                          height={140}
                          type="line"
                        />
                      ) : (
                        <div className="text-xs text-gray-400 text-center py-8">No daily sales data</div>
                      )}
                    </div>
                    {/* Weekly Sales Chart */}
                    <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-lg p-4 min-h-[220px] hover:shadow-xl transition-shadow duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-emerald-700">Weekly Sales</span>
                        <span className="text-[10px] text-gray-400">{Object.keys(analyticsData.branchSalesByWeek?.[branch.id] || {}).length} weeks</span>
                      </div>
                      {analyticsData.branchSalesByWeek && analyticsData.branchSalesByWeek[branch.id] && Object.keys(analyticsData.branchSalesByWeek[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByWeek[branch.id]}
                          height={140}
                          type="line"
                        />
                      ) : (
                        <div className="text-xs text-gray-400 text-center py-8">No weekly sales data</div>
                      )}
                    </div>
                    {/* Monthly Sales Chart */}
                    <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-lg p-4 min-h-[220px] hover:shadow-xl transition-shadow duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-purple-700">Monthly Sales</span>
                        <span className="text-[10px] text-gray-400">{Object.keys(analyticsData.branchSalesByMonth?.[branch.id] || {}).length} months</span>
                      </div>
                      {analyticsData.branchSalesByMonth && analyticsData.branchSalesByMonth[branch.id] && Object.keys(analyticsData.branchSalesByMonth[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByMonth[branch.id]}
                          height={140}
                          type="line"
                        />
                      ) : (
                        <div className="text-xs text-gray-400 text-center py-8">No monthly sales data</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback to overall sales if no branches
              <div className="mb-8">
                <h3 className="text-md font-semibold text-gray-700 mb-3">Overall Sales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Daily Sales Chart */}
                  <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-lg p-4 min-h-[220px] hover:shadow-xl transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-indigo-700">Daily Sales</span>
                      <span className="text-[10px] text-gray-400">{Object.keys(salesByDay).length} days</span>
                    </div>
                    {Object.keys(salesByDay).length > 0 ? (
                      <SimpleChart
                        data={salesByDay}
                        height={140}
                        type="line"
                      />
                    ) : (
                      <div className="text-xs text-gray-400 text-center py-8">No daily sales data</div>
                    )}
                  </div>
                  {/* Weekly Sales Chart */}
                  <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-lg p-4 min-h-[220px] hover:shadow-xl transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-emerald-700">Weekly Sales</span>
                      <span className="text-[10px] text-gray-400">{Object.keys(salesByWeek).length} weeks</span>
                    </div>
                    {Object.keys(salesByWeek).length > 0 ? (
                      <SimpleChart
                        data={salesByWeek}
                        height={140}
                        type="line"
                      />
                    ) : (
                      <div className="text-xs text-gray-400 text-center py-8">No weekly sales data</div>
                    )}
                  </div>
                  {/* Monthly Sales Chart */}
                  <div className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-lg p-4 min-h-[220px] hover:shadow-xl transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-purple-700">Monthly Sales</span>
                      <span className="text-[10px] text-gray-400">{Object.keys(salesByMonth).length} months</span>
                    </div>
                    {Object.keys(salesByMonth).length > 0 ? (
                      <SimpleChart
                        data={salesByMonth}
                        height={140}
                        type="line"
                      />
                    ) : (
                      <div className="text-xs text-gray-400 text-center py-8">No monthly sales data</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Inventory Overview */}
          {analyticsData?.inventoryAnalytics && (
            <div className="bg-white rounded-md border border-gray-200 p-3 mb-4">
              <h2 className="text-base font-semibold text-gray-800 mb-2">Inventory Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
          <div className="mb-4">
            <SalesTarget
              currentRevenue={analyticsData?.totalRevenue || 0}
              totalSales={analyticsData?.totalSales || 0}
              filteredSales={analyticsData?.recentActivity?.sales || []}
            />
          </div>

          {/* Branch Top Products Section */}
          {analyticsData?.branches && analyticsData.branches.length > 0 && analyticsData.branchTopProducts && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Top Products by Branch</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analyticsData.branches.map((branch) => (
                  <div key={branch.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-3">{branch.name}</h3>
                    {analyticsData.branchTopProducts?.[branch.id] && analyticsData.branchTopProducts[branch.id].length > 0 ? (
                      <div className="space-y-2">
                        {analyticsData.branchTopProducts[branch.id].slice(0, 3).map((product, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-xs text-gray-500">{product.sales} units sold</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-green-600">${product.revenue.toLocaleString()}</div>
                              {product.margin !== undefined && (
                                <div className="text-xs text-gray-500">{(product.margin * 100).toFixed(1)}% margin</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 text-center py-4">No product data available</div>
                    )}
                  </div>
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
          {branchMonthlyComparison && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Branch Sales Comparison (Monthly)
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-4">
             
<BranchComparisonChart
  branchData={branchMonthlyComparison.branches.map(b => ({
    branchName: b.branchName,
    dailySales: b.data[0],
    weeklySales: b.data[1],
    monthlySales: b.data[2],
  }))}
  height={320}
/>

              </div>
            </div>
          )}

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
