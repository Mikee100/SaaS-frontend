"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { apiGet } from '@/utils/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import BranchSwitcher from '@/components/BranchSwitcher';
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
  FiTrendingDown,
} from 'react-icons/fi';

import AnomalyDetectionPanel from '@/components/AnomalyDetectionPanel';
import CustomerSegmentationPanel from '@/components/CustomerSegmentationPanel';
import ChurnPredictionPanel from '@/components/ChurnPredictionPanel';
import AISummaryPanel from '@/components/AISummaryPanel';

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
  )
};

const {
  CustomerGrowthChart,
  SalesRevenueChart,
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 h-full">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center text-xs font-medium gap-1 px-2 py-1 rounded-full ${
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
        <span className="text-gray-500 text-sm font-medium">{label}</span>
        <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
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
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, i) => (
          <a
            key={i}
            href={action.href}
            className="bg-gray-50 text-gray-700 p-4 rounded-lg flex flex-col items-center gap-3 transition-all duration-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {action.icon}
            </div>
            <span className="text-sm font-medium text-center">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}


function SkeletonLoader() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} loading={true} icon={null} label="" value="" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse h-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse h-48"></div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse h-64"></div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 animate-pulse h-64"></div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, trend }: { title: string; value: number; unit?: string; trend?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-xl font-bold text-gray-900">
          {unit && unit === '$' ? unit : ''}{value.toLocaleString()}{unit && unit !== '$' ? unit : ''}
        </p>
        {trend !== undefined && (
          <span className={`flex items-center text-xs font-medium gap-1 px-2 py-1 rounded-full ${
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

export default function DashboardPage() {

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const {  loading: limitsLoading } = usePlanLimits();
  const [stockThreshold, setStockThreshold] = useState<number>(15);
  const lowStockProducts = (analyticsData?.topProducts || []).filter((p) => (p.sales ?? 0) < stockThreshold);

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
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-80"></div>
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Dashboard</h1>
              <p className="text-gray-600 mt-2 text-lg">
  Welcome back! Here&apos;s what&apos;s happening with your business.
</p>
            </div>
            <div className="flex items-center gap-3">
              <BranchSwitcher />
              <button
                onClick={() => window.location.reload()}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Refresh data"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <QuickActions />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              icon={<FiDollarSign className="w-5 h-5" />}
              label="Total Sales"
              value={analyticsData?.totalSales?.toLocaleString() || '0'}
              trend="12.5%"
              trendDirection="up"
            />
            <StatCard
              icon={<FiTrendingUp className="w-5 h-5" />}
              label="Total Revenue"
              value={`$${analyticsData?.totalRevenue?.toLocaleString() || '0'}`}
              trend="8.2%"
              trendDirection="up"
            />
            <StatCard
              icon={<FiPackage className="w-5 h-5" />}
              label="Products"
              value={analyticsData?.totalProducts?.toLocaleString() || '0'}
              trend="3.1%"
              trendDirection="up"
            />
            <StatCard
              icon={<FiUsers className="w-5 h-5" />}
              label="Customers"
              value={analyticsData?.totalCustomers?.toLocaleString() || '0'}
              trend="5.7%"
              trendDirection="up"
            />
          </div>

          {/* Revenue & Growth Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Revenue & Growth</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SalesRevenueChart
                salesData={analyticsData?.salesByMonth || {}}
                title="Monthly Revenue"
                height={400}
              />
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <CustomerGrowthChart
                  growthData={analyticsData?.customerGrowth || {}}
                  title="Customer Growth"
                  height={400}
                />
              </div>
            </div>

            {/* Full-width Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <motion.div
                whileHover={{ y: -2, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <FiUsers className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-purple-800">Total Customers</h3>
                      <p className="text-xs text-purple-600">Active user base</p>
                    </div>
                  </div>
                  {analyticsData?.customerRetention && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      analyticsData.customerRetention.retentionRate >= 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {analyticsData.customerRetention.retentionRate >= 0 ? (
                        <FiTrendingUp className="w-3 h-3" />
                      ) : (
                        <FiTrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(Math.round(analyticsData.customerRetention.retentionRate * 100))}%
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-purple-900 mb-2">
                  {analyticsData?.totalCustomers?.toLocaleString() || '0'}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-600 font-medium">Registered users</span>
                  <div className="flex items-center gap-1 text-xs text-purple-500">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    Live data
                  </div>
                </div>
              </motion.div>

              {analyticsData?.performanceMetrics && (
                <motion.div
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <FiDollarSign className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-emerald-800">Avg. Customer Value</h3>
                        <p className="text-xs text-emerald-600">Lifetime value</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      <FiTrendingUp className="w-3 h-3" />
                      CLV
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-emerald-900 mb-2">
                    ${Math.round(analyticsData.performanceMetrics.customerLifetimeValue).toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-600 font-medium">Per customer</span>
                    <div className="flex items-center gap-1 text-xs text-emerald-500">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      Calculated
                    </div>
                  </div>
                </motion.div>
              )}

              {analyticsData?.customerRetention && (
                <motion.div
                  whileHover={{ y: -2, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-indigo-200 shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <FiTrendingUp className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-indigo-800">Customer Retention</h3>
                        <p className="text-xs text-indigo-600">Repeat customer rate</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                      Active
                    </div>
                  </div>
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-indigo-900 mb-1">
                        {Math.round(analyticsData.customerRetention.retentionRate * 100)}%
                      </p>
                      <div className="flex items-center gap-2 text-sm text-indigo-700">
                        <span className="font-medium">{analyticsData.customerRetention.repeatCustomers.toLocaleString()}</span>
                        <span>repeat customers</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-indigo-600 font-medium">
                        of {analyticsData.customerRetention.totalCustomers.toLocaleString()} total
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-20 h-2 bg-indigo-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.round(analyticsData.customerRetention.retentionRate * 100)}%`
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-indigo-500 font-medium">
                          {Math.round(analyticsData.customerRetention.retentionRate * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-indigo-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-indigo-600 font-medium">Healthy retention rate</span>
                    </div>
                    <div className="text-xs text-indigo-500">
                      Last 30 days
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Inventory Overview */}
          {analyticsData?.inventoryAnalytics && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Inventory Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

          {/* AI Insights Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Insights</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AISummaryPanel
                summary={analyticsData?.aiSummary || ''}
                loading={loading}
              />
              <AnomalyDetectionPanel
                anomalies={analyticsData?.anomalies || []}
                loading={loading}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CustomerSegmentationPanel
                segments={analyticsData?.customerSegmentsAI || []}
                loading={loading}
              />
              <ChurnPredictionPanel
                predictions={analyticsData?.churnPrediction || []}
                loading={loading}
              />
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}


            {/* Sidebar */}
            <div className="space-y-6">
              {/* Low Stock Notification */}
              {lowStockProducts.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FiAlertCircle className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-gray-800">Low Stock Alert</h2>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} below {stockThreshold} in stock.
                  </p>
                  <div className="space-y-2">
                    {lowStockProducts.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-red-600">{p.sales ?? 0} left</span>
                      </div>
                    ))}
                  </div>
                  {lowStockProducts.length > 3 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{lowStockProducts.length - 3} more products with low stock
                    </p>
                  )}
                  <button className="w-full mt-4 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
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
