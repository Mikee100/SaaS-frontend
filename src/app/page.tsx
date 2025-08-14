"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import PlanGuard from '@/components/PlanGuard';
import AuthGuard from '@/components/AuthGuard';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import LogoEnforcement from '@/components/LogoEnforcement';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaShare, FaCrown, FaStar, FaArrowUp, FaArrowDown, FaUser, FaBox, FaUsers, FaExclamationTriangle, FaBell, FaPlus, FaUserPlus, FaFileAlt, FaEye, FaShoppingCart, FaDollarSign } from 'react-icons/fa';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrendingUp, FiDollarSign, FiPackage, FiUsers, FiAlertCircle, FiClock, FiRefreshCw } from 'react-icons/fi';

interface AnalyticsData {
  totalSales?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalCustomers?: number;
  averageOrderValue?: number;
  conversionRate?: number;
  salesByMonth?: Record<string, number>;
  topProducts?: Array<{ name: string; sales: number; revenue: number }>;
  customerSegments?: Array<{ segment: string; count: number; revenue: number }>;
  realTimeData?: {
    currentUsers: number;
    activeSales: number;
    revenueToday: number;
    ordersInProgress?: number;
    averageSessionDuration?: number;
    bounceRate?: number;
  };
  predictiveAnalytics?: {
    nextMonthForecast: number;
    churnRisk: number;
    growthRate: number;
    seasonalTrend?: number;
    marketTrend?: number;
    demandForecast?: Record<string, number>;
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
  advancedSegments?: {
    byLocation: Array<{ location: string; revenue: number; customers: number }>;
    byAge: Array<{ age: string; revenue: number; customers: number }>;
    byDevice: Array<{ device: string; revenue: number; customers: number }>;
  };
  customReports?: Array<{ name: string; data: string; lastUpdated: string }>;
  aiInsights?: {
    recommendations: string[];
    anomalies: string[];
  };
  message?: string;
  recentActivity?: {
    sales?: Array<{ amount: number; customer: string; date: string }>;
    products?: Array<{ name: string; date: string }>;
  };
  customerGrowth?: Record<string, number>;
}

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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 h-full">
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
      whileHover={{ y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 h-full"
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

function UsageLimitCard({ label, value, limit, color }: { label: string; value: number; limit: number; color: string }) {
  const percent = Math.min(100, (value / limit) * 100);
  const over = value > limit;
  return (
    <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className={`text-xs font-medium ${over ? 'text-red-600' : 'text-gray-700'}`}>{value}/{limit}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full ${over ? 'bg-red-400' : color}`} style={{ width: `${percent}%` }} />
      </div>
      {over && <span className="text-xs text-red-600 flex items-center gap-1"><FaExclamationTriangle className="w-3 h-3" />Limit exceeded</span>}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { 
    
      label: "Add Product", 
      href: "/products", 
      color: "from-blue-500 to-blue-600" 
    },
    { 
    
      label: "Add Customer", 
      href: "/users", 
      color: "from-green-500 to-green-600" 
    },
    { 
      
      label: "New Sale", 
      href: "/sales", 
      color: "from-purple-500 to-purple-600" 
    },
    { 
     
      label: "Generate Report", 
      href: "/reports", 
      color: "from-orange-500 to-orange-600" 
    },
  ];

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl shadow-sm p-6 border border-blue-50">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white shadow-sm">
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, i) => (
          <a
            key={i}
            href={action.href}
            className={`bg-gradient-to-r ${action.color} text-white p-4 rounded-xl flex flex-col items-center gap-3 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
          >
            <div className="p-2 bg-white/20 rounded-lg">
              {action.icon}
            </div>
            <span className="text-sm font-medium text-center">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function RecentActivities({ activities }: { activities: Array<{ type: string; description: string; date: string; icon?: React.ReactNode }> }) {
  if (!activities || activities.length === 0) return null;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FaBell className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Recent Activities</h2>
      </div>
      <div className="space-y-3">
        {activities.slice(0, 5).map((a, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600">
              {a.icon || <FaBell className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{a.description}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <FaEye className="w-3 h-3" />
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
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        {subscription.plan.name === 'Enterprise' ? <FaCrown className="w-5 h-5 text-yellow-600" /> : subscription.plan.name === 'Pro' ? <FaStar className="w-5 h-5 text-purple-600" /> : <FaStar className="w-5 h-5 text-blue-600" />}
        <span className="text-lg font-semibold text-gray-800">Current Plan: {subscription.plan.name}</span>
        <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium capitalize">{subscription.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Price</p>
          <p className="text-sm font-semibold text-gray-900">${subscription.plan.price}/{subscription.plan.interval}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Next Billing</p>
          <p className="text-sm font-semibold text-gray-900">{subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>
      <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
        Upgrade Plan
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
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse h-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse h-48"></div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse h-64"></div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse h-64"></div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  // Low stock notification state for dashboard
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const [basicData, setBasicData] = useState<AnalyticsData | null>(null);
  const [advancedData, setAdvancedData] = useState<AnalyticsData | null>(null);
  const [enterpriseData, setEnterpriseData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const { limits, loading: limitsLoading } = usePlanLimits();

  // Find low stock products (stock <= 10)
  const LOW_STOCK_THRESHOLD = 10;
  const lowStockProducts = (basicData?.topProducts || []).filter((p: { name: string; sales: number; revenue: number }) => (p.sales ?? 0) <= LOW_STOCK_THRESHOLD && (p.sales ?? 0) > 0);

  // Show notification alert automatically when low stock detected
  useEffect(() => {
    if (lowStockProducts.length > 0) {
      setShowLowStockAlert(true);
    }
  }, [lowStockProducts.length]);
  
  const usageLimits = [
    { label: 'Users', value: limits?.usage?.users?.current || 0, limit: limits?.usage?.users?.limit || 1, color: 'bg-blue-500' },
    { label: 'Products', value: limits?.usage?.products?.current || 0, limit: limits?.usage?.products?.limit || 1, color: 'bg-green-500' },
    { label: 'Sales', value: limits?.usage?.sales?.current || 0, limit: limits?.usage?.sales?.limit || 1, color: 'bg-purple-500' },
  ];

  const [recentActivities, setRecentActivities] = useState<Array<{ type: string; description: string; date: string; icon?: React.ReactNode }>>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        
        // Fetch analytics data
        const stats = await apiGet('/analytics/dashboard');
        setBasicData({
          totalSales: stats.totalSales,
          totalRevenue: stats.totalRevenue,
          totalProducts: stats.totalProducts,
          salesByMonth: stats.salesByMonth,
          topProducts: stats.topProducts,
          customerSegments: stats.customerSegments,
          realTimeData: stats.realTimeData,
          predictiveAnalytics: stats.predictiveAnalytics,
          message: stats.message,
          recentActivity: stats.recentActivity,
          customerGrowth: stats.customerGrowth,
        });
        
        // Process recent activities from API only
        const activities: Array<{ type: string; description: string; date: string; icon?: React.ReactNode }> = [];
        if (stats.recentActivity?.sales) {
          stats.recentActivity.sales.forEach((sale: any) => {
            activities.push({
              type: 'sale',
              description: `Sale completed: $${sale.amount.toLocaleString()} to ${sale.customer}`,
              date: sale.date,
            
            });
          });
        }
        if (stats.recentActivity?.products) {
          stats.recentActivity.products.forEach((product: any) => {
            activities.push({
              type: 'product',
              description: `New product added: ${product.name}`,
              date: product.date,
           
            });
          });
        }
        // Add more activity types if available from API
        setRecentActivities(activities);
        
        // Fetch subscription data (with error handling)
        try {
          const sub = await apiGet('/billing/subscription') as Subscription;
          setSubscription(sub);
        } catch (billingError) {
          setSubscription(null);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
  // Show error state only if API fails
  setBasicData(null);
  setRecentActivities([]);
  setSubscription(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  // Find low stock products (stock <= 10)
  // (removed duplicate declaration)

  // Show notification alert automatically when low stock detected
  useEffect(() => {
    if (lowStockProducts.length > 0) {
      setShowLowStockAlert(true);
    }
  }, [lowStockProducts.length]);

  if (loading || limitsLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-80"></div>
            </div>
            <SkeletonLoader />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Low Stock Notification */}
        <AnimatePresence>
          {showLowStockAlert && lowStockProducts.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 sm:px-6 lg:px-8 pt-6"
            >
              <div className="bg-gradient-to-r from-red-500 to-amber-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="w-6 h-6 text-white" />
                  <div>
                    <p className="font-bold">Low Stock Alert!</p>
                    <p className="text-sm opacity-90">
                      {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} need{lowStockProducts.length === 1 ? 's' : ''} restocking.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLowStockAlert(false)}
                  className="ml-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <span>Welcome back! Here's what's happening with your business.</span>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    title="Refresh data"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                  </button>
                </p>
                {basicData?.message && (
                  <div className="mt-2 text-blue-700 text-sm font-medium flex items-center gap-2">
                    
                    {basicData.message}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {usageLimits.map((u) => (
                  <UsageLimitCard key={u.label} {...u} />
                ))}
              </div>
            </div>

            {/* Logo Compliance */}
            <LogoEnforcement showBanner={true} showStats={true} className="mb-8" />

            {/* Quick Actions */}
            <div className="mb-8">
              <QuickActions />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard 
                icon={<FiDollarSign className="w-5 h-5" />}
                label="Total Sales"
                value={basicData?.totalSales?.toLocaleString() || '0'}
                trend="12.5%"
                trendDirection="up"
              />
              <StatCard 
                icon={<FiTrendingUp className="w-5 h-5" />}
                label="Total Revenue"
                value={`$${basicData?.totalRevenue?.toLocaleString() || '0'}`}
                trend="8.2%"
                trendDirection="up"
              />
              <StatCard 
                icon={<FiPackage className="w-5 h-5" />}
                label="Products"
                value={basicData?.totalProducts?.toLocaleString() || '0'}
                trend="3.1%"
                trendDirection="up"
              />
              <StatCard 
                icon={<FiUsers className="w-5 h-5" />}
                label="Customers"
                value={basicData?.totalCustomers?.toLocaleString() || '0'}
                trend="5.7%"
                trendDirection="up"
              />
            </div>

            {/* Rest of your dashboard content */}
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Charts & Visualizations */}
                <div className="mb-6">
                  <AnalyticsCharts 
                    salesData={basicData?.salesByMonth}
                    productData={basicData?.topProducts?.map(p => ({
                      name: p.name,
                      unitsSold: p.sales,
                      revenue: p.revenue
                    }))}
                  />
                </div>

                {/* Inventory Analytics */}
                {basicData?.inventoryAnalytics && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Inventory Analytics</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Low Stock Items</p>
                        <p className="text-xl font-bold text-red-600">{basicData.inventoryAnalytics.lowStockItems}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Overstock Items</p>
                        <p className="text-xl font-bold text-yellow-600">{basicData.inventoryAnalytics.overstockItems}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Inventory Turnover</p>
                        <p className="text-xl font-bold text-blue-600">{basicData.inventoryAnalytics.inventoryTurnover}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Stockout Rate</p>
                        <p className="text-xl font-bold text-purple-600">{(basicData.inventoryAnalytics.stockoutRate * 100).toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Metrics */}
                {basicData?.performanceMetrics && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Customer Lifetime Value</p>
                        <p className="text-xl font-bold text-green-600">${basicData.performanceMetrics.customerLifetimeValue}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Customer Acquisition Cost</p>
                        <p className="text-xl font-bold text-red-600">${basicData.performanceMetrics.customerAcquisitionCost}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Return on Investment</p>
                        <p className="text-xl font-bold text-blue-600">{(basicData.performanceMetrics.returnOnInvestment * 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Net Promoter Score</p>
                        <p className="text-xl font-bold text-purple-600">{basicData.performanceMetrics.netPromoterScore}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Segments */}
                {basicData?.advancedSegments && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Advanced Segments</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">By Location</h3>
                        {basicData.advancedSegments.byLocation.map((loc, i) => (
                          <div key={i} className="mb-1 flex justify-between">
                            <span>{loc.location}</span>
                            <span className="font-bold">${loc.revenue}</span>
                            <span className="text-xs text-gray-500">{loc.customers} customers</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">By Age</h3>
                        {basicData.advancedSegments.byAge.map((age, i) => (
                          <div key={i} className="mb-1 flex justify-between">
                            <span>{age.age}</span>
                            <span className="font-bold">${age.revenue}</span>
                            <span className="text-xs text-gray-500">{age.customers} customers</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">By Device</h3>
                        {basicData.advancedSegments.byDevice.map((dev, i) => (
                          <div key={i} className="mb-1 flex justify-between">
                            <span>{dev.device}</span>
                            <span className="font-bold">${dev.revenue}</span>
                            <span className="text-xs text-gray-500">{dev.customers} customers</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                {basicData?.aiInsights && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Insights</h2>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Recommendations</h3>
                      <ul className="list-disc pl-5">
                        {basicData.aiInsights.recommendations.map((rec, i) => (
                          <li key={i} className="text-green-700">{rec}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Anomalies</h3>
                      <ul className="list-disc pl-5">
                        {basicData.aiInsights.anomalies.map((anom, i) => (
                          <li key={i} className="text-red-700">{anom}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Custom Reports */}
                {basicData?.customReports && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Custom Reports</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {basicData.customReports.map((report, i) => (
                        <div key={i} className="border rounded-lg p-3 bg-gray-50">
                          <h3 className="text-sm font-semibold text-gray-700 mb-1">{report.name}</h3>
                          <p className="text-xs text-gray-500">Last Updated: {report.lastUpdated}</p>
                          <p className="text-sm text-gray-800 mt-2">{report.data}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <RecentActivities activities={recentActivities} />
                <SubscriptionCard subscription={subscription} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
