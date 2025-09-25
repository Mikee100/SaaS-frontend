"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { apiGet } from '@/utils/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import LogoEnforcement from '@/components/LogoEnforcement';
import BranchSwitcher from '@/components/BranchSwitcher';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import { 
  FiTrendingUp, 
  FiDollarSign, 
  FiPackage, 
  FiUsers, 
  FiAlertCircle, 
  FiRefreshCw, 
  FiBell, 
  FiUserPlus, 
  FiFileText, 
  FiShoppingCart,
  FiTrendingDown,
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
  )
};

const { 
  CustomerGrowthChart, 
  SalesRevenueChart, 
  SalesTrendsAnalysis 
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
};

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
}

interface Subscription {
  id: string;
  status: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
}

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

function UsageLimitCard({ label, value, limit }: { label: string; value: number; limit: number }) {
  const percent = Math.min(100, (value / limit) * 100);
  const over = value > limit;
  
  return (
    <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className={`text-xs font-medium ${over ? 'text-red-600' : 'text-gray-700'}`}>
          {value}/{limit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-1.5 rounded-full ${over ? 'bg-red-400' : 'bg-indigo-500'}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
      {over && (
        <span className="text-xs text-red-600 flex items-center gap-1">
          <FiAlertCircle className="w-3 h-3" />
          Limit exceeded
        </span>
      )}
    </div>
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

function RecentActivities({ activities }: { activities: Array<{ type: string; description: string; date: string }> }) {
  if (!activities || activities.length === 0) return null;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FiBell className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Recent Activities</h2>
      </div>
      <div className="space-y-3">
        {activities.slice(0, 5).map((a, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600 mt-1">
              <FiBell className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{a.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(a.date).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionCard({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) return null;
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-semibold text-gray-800">Current Plan: {subscription.plan.name}</span>
        <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium capitalize">
          {subscription.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Price</p>
          <p className="text-sm font-semibold text-gray-900">
            ${subscription.plan.price}/{subscription.plan.interval}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Next Billing</p>
          <p className="text-sm font-semibold text-gray-900">
            {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>
      <button className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
        Manage Subscription
      </button>
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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const { limits, loading: limitsLoading } = usePlanLimits();
  const [stockThreshold, setStockThreshold] = useState<number>(15);
  const lowStockProducts = (analyticsData?.topProducts || []).filter((p) => (p.sales ?? 0) < stockThreshold);

  const usageLimits = [
    { label: 'Users', value: limits?.usage?.users?.current || 0, limit: limits?.usage?.users?.limit || 1 },
    { label: 'Products', value: limits?.usage?.products?.current || 0, limit: limits?.usage?.products?.limit || 1 },
    { label: 'Sales', value: limits?.usage?.sales?.current || 0, limit: limits?.usage?.sales?.limit || 1 },
  ];

  const [recentActivities, setRecentActivities] = useState<Array<{ type: string; description: string; date: string }>>([]);

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
          topProducts: stats.topProducts?.map((p: any) => ({
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
          stats.recentActivity.sales.forEach((sale: any) => {
            activities.push({
              type: 'sale',
              description: `Sale: $${sale.amount.toLocaleString()} to ${sale.customer}`,
              date: sale.date,
            });
          });
        }
        if (stats.recentActivity?.products) {
          stats.recentActivity.products.forEach((product: any) => {
            activities.push({
              type: 'product',
              description: `New product: ${product.name}`,
              date: product.date,
            });
          });
        }
        setRecentActivities(activities);
        
        try {
          // Use the correct endpoint with permissions
          const sub = await apiGet('/billing/subscription-with-permissions') as Subscription;
          setSubscription(sub);
        } catch (billingError) {
          console.error('Error fetching subscription:', billingError);
          setSubscription(null);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setAnalyticsData(null);
        setRecentActivities([]);
        setSubscription(null);
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back! Here's what's happening with your business.
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

          {/* Logo Compliance */}
          <LogoEnforcement showBanner={true} showStats={true} className="mb-8" />

          {/* Quick Actions */}
          <div className="mb-8">
            <QuickActions />
          </div>

          {/* Usage Limits */}
          <div className="mb-8 flex flex-wrap gap-3">
            {usageLimits.map((u) => (
              <UsageLimitCard key={u.label} {...u} />
            ))}
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
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <CustomerGrowthChart 
                    growthData={analyticsData?.customerGrowth || {}} 
                    title="Customer Growth"
                    height={400}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FiUsers className="w-5 h-5 text-purple-500" />
                      <h3 className="text-sm font-medium text-gray-700">Total Customers</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {analyticsData?.totalCustomers?.toLocaleString() || '0'}
                    </p>
                    {analyticsData?.customerRetention && (
                      <div className="mt-2 flex items-center text-sm">
                        <span className={`inline-flex items-center ${analyticsData.customerRetention.retentionRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analyticsData.customerRetention.retentionRate >= 0 ? (
                            <FiTrendingUp className="mr-1" />
                          ) : (
                            <FiTrendingDown className="mr-1" />
                          )}
                          {Math.abs(Math.round(analyticsData.customerRetention.retentionRate * 100))}% from last period
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {analyticsData?.performanceMetrics && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <FiDollarSign className="w-5 h-5 text-purple-500" />
                        <h3 className="text-sm font-medium text-gray-700">Avg. Value</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${Math.round(analyticsData.performanceMetrics.customerLifetimeValue).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        per customer
                      </p>
                    </div>
                  )}
                </div>
                
                {analyticsData?.customerRetention && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                    <h3 className="text-sm font-medium text-purple-800 mb-2">Customer Retention</h3>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold text-purple-900">
                          {Math.round(analyticsData.customerRetention.retentionRate * 100)}%
                        </p>
                        <p className="text-xs text-purple-700">
                          {analyticsData.customerRetention.repeatCustomers.toLocaleString()} repeat customers
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-purple-600">
                          of {analyticsData.customerRetention.totalCustomers.toLocaleString()} total
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sales Trends Analysis Section */}
          <div className="mb-8">
            <SalesTrendsAnalysis 
              salesData={analyticsData?.salesByMonth || {}}
              title="Sales Trends & Performance Analysis"
              className="mb-8"
            />
          </div>

          {/* Additional Analytics Charts */}
          <div className="mb-8">
            <AnalyticsCharts 
              salesData={analyticsData?.salesByMonth}
              productData={analyticsData?.topProducts?.map(p => ({
                name: p.name,
                unitsSold: p.sales ?? 0,
                revenue: p.revenue ?? 0,
                margin: p.margin ?? 0,
                cost: p.cost ?? 0
              }))}
              inventoryAnalytics={analyticsData?.inventoryAnalytics}
              customerRetention={analyticsData?.customerRetention}
            />
          </div>

          {/* Additional Metrics */}
          {(analyticsData?.inventoryAnalytics || analyticsData?.performanceMetrics) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {analyticsData.inventoryAnalytics && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Inventory Overview</h2>
                  <div className="grid grid-cols-2 gap-4">
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

              {analyticsData.performanceMetrics && (
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard 
                      title="Customer Lifetime Value" 
                      value={Math.round(analyticsData.performanceMetrics.customerLifetimeValue)} 
                      unit="$"
                    />
                    <MetricCard 
                      title="Acquisition Cost" 
                      value={Math.round(analyticsData.performanceMetrics.customerAcquisitionCost)} 
                      unit="$"
                    />
                    <MetricCard 
                      title="Return on Investment" 
                      value={Math.round(analyticsData.performanceMetrics.returnOnInvestment * 100)} 
                      unit="%"
                    />
                    <MetricCard 
                      title="Net Promoter Score" 
                      value={Math.round(analyticsData.performanceMetrics.netPromoterScore)} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Activities */}
              <RecentActivities activities={recentActivities} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <SubscriptionCard subscription={subscription} />
              
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
