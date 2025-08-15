"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import PlanGuard from '@/components/PlanGuard';
import AuthGuard from '@/components/AuthGuard';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import LogoEnforcement from '@/components/LogoEnforcement';
import { 
  FiTrendingUp, FiDollarSign, FiPackage, FiUsers, 
  FiAlertCircle, FiClock, FiRefreshCw, FiArrowUp, FiArrowDown,
  FiBarChart2, FiPieChart, FiShoppingCart, FiUser, FiPlus
} from 'react-icons/fi';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '@/components/Tooltip';

interface AnalyticsData {
  // ... (keep your existing interface)
}

// Improved StatCard component
function StatCard({ icon, label, value, trend, trendDirection, loading = false, onClick }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  trend?: string; 
  trendDirection?: 'up' | 'down';
  loading?: boolean;
  onClick?: () => void;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-5 h-full">
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
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={`bg-white rounded-xl shadow-xs border border-gray-100 p-5 h-full transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-sm hover:border-gray-200' : ''
      }`}
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
            {trendDirection === 'up' ? <FiArrowUp className="w-3 h-3" /> : <FiArrowDown className="w-3 h-3" />}
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

// Enhanced UsageLimitCard with tooltip
function UsageLimitCard({ label, value, limit, color, description }: { 
  label: string; 
  value: number; 
  limit: number; 
  color: string;
  description?: string;
}) {
  const percent = Math.min(100, (value / limit) * 100);
  const over = value > limit;
  
  return (
    <Tooltip content={description || `${label} usage`}>
      <div className="flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">{label}</span>
          <span className={`text-xs font-medium ${over ? 'text-red-600' : 'text-gray-700'}`}>
            {value}/{limit}
          </span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-1.5 rounded-full transition-all duration-500 ${
              over ? 'bg-red-400' : color
            }`} 
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
    </Tooltip>
  );
}

// Improved QuickActions with better hover effects
function QuickActions() {
  const actions = [
    { 
      icon: <FiPlus className="w-5 h-5" />,
      label: "Add Product", 
      href: "/products", 
      color: "bg-blue-500 hover:bg-blue-600" 
    },
    { 
      icon: <FiUser className="w-5 h-5" />,
      label: "Add Customer", 
      href: "/users", 
      color: "bg-green-500 hover:bg-green-600" 
    },
    { 
      icon: <FiShoppingCart className="w-5 h-5" />,
      label: "New Sale", 
      href: "/sales", 
      color: "bg-purple-500 hover:bg-purple-600" 
    },
    { 
      icon: <FiBarChart2 className="w-5 h-5" />,
      label: "Generate Report", 
      href: "/reports", 
      color: "bg-orange-500 hover:bg-orange-600" 
    },
  ];

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl shadow-xs p-6 border border-blue-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white shadow-xs">
          <FiTrendingUp className="w-5 h-5 text-indigo-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, i) => (
          <a
            key={i}
            href={action.href}
            className={`${action.color} text-white p-4 rounded-xl flex flex-col items-center gap-3 transition-all duration-300 hover:shadow-sm transform hover:-translate-y-0.5`}
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

// Enhanced RecentActivities with better animations
function RecentActivities({ activities }: { activities: Array<{ type: string; description: string; date: string; icon?: React.ReactNode }> }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-4">
          <FiClock className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Recent Activities</h2>
        </div>
        <p className="text-sm text-gray-500">No recent activities to show</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FiClock className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Recent Activities</h2>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {activities.slice(0, 5).map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600 shadow-xs">
                {a.icon || <FiClock className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{a.description}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {new Date(a.date).toLocaleString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Enhanced SubscriptionCard with better visual cues
function SubscriptionCard({ subscription }: { subscription: Subscription | null }) {
  if (!subscription) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FiTrendingUp className="w-5 h-5 text-gray-600" />
          <span className="text-lg font-semibold text-gray-800">Subscription</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">No active subscription found</p>
        <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
          Subscribe Now
        </button>
      </div>
    );
  }

  const isPro = subscription.plan.name.includes('Pro');
  const isEnterprise = subscription.plan.name.includes('Enterprise');
  
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        {isEnterprise ? (
          <div className="text-yellow-600 bg-yellow-50 p-1 rounded-full">
            <FiTrendingUp className="w-5 h-5" />
          </div>
        ) : isPro ? (
          <div className="text-purple-600 bg-purple-50 p-1 rounded-full">
            <FiTrendingUp className="w-5 h-5" />
          </div>
        ) : (
          <div className="text-blue-600 bg-blue-50 p-1 rounded-full">
            <FiTrendingUp className="w-5 h-5" />
          </div>
        )}
        <span className="text-lg font-semibold text-gray-800">Current Plan: {subscription.plan.name}</span>
        <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium capitalize ${
          subscription.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
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
      <button className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium shadow-xs hover:shadow-sm">
        Upgrade Plan
      </button>
    </div>
  );
}

// Improved AnalyticsPage with better layout
export default function AnalyticsPage() {
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const [basicData, setBasicData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const { limits, loading: limitsLoading } = usePlanLimits();

  const LOW_STOCK_THRESHOLD = 10;
  const lowStockProducts = (basicData?.topProducts || []).filter(
    (p: { name: string; sales: number; revenue: number }) => 
      (p.sales ?? 0) <= LOW_STOCK_THRESHOLD && (p.sales ?? 0) > 0
  );

  const usageLimits = [
    { 
      label: 'Users', 
      value: limits?.usage?.users?.current || 0, 
      limit: limits?.usage?.users?.limit || 1, 
      color: 'bg-blue-500',
      description: 'Number of active users in your account'
    },
    { 
      label: 'Products', 
      value: limits?.usage?.products?.current || 0, 
      limit: limits?.usage?.products?.limit || 1, 
      color: 'bg-green-500',
      description: 'Number of products in your inventory'
    },
    { 
      label: 'Sales', 
      value: limits?.usage?.sales?.current || 0, 
      limit: limits?.usage?.sales?.limit || 1, 
      color: 'bg-purple-500',
      description: 'Monthly sales transactions'
    },
  ];

  const [recentActivities, setRecentActivities] = useState<
    Array<{ type: string; description: string; date: string; icon?: React.ReactNode }>
  >([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        
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
        
        const activities: Array<{ type: string; description: string; date: string; icon?: React.ReactNode }> = [];
        if (stats.recentActivity?.sales) {
          stats.recentActivity.sales.forEach((sale: any) => {
            activities.push({
              type: 'sale',
              description: `Sale completed: $${sale.amount.toLocaleString()} to ${sale.customer}`,
              date: sale.date,
              icon: <FiShoppingCart className="w-4 h-4" />
            });
          });
        }
        if (stats.recentActivity?.products) {
          stats.recentActivity.products.forEach((product: any) => {
            activities.push({
              type: 'product',
              description: `New product added: ${product.name}`,
              date: product.date,
              icon: <FiPackage className="w-4 h-4" />
            });
          });
        }
        setRecentActivities(activities);
        
        try {
          const sub = await apiGet('/billing/subscription') as Subscription;
          setSubscription(sub);
        } catch (billingError) {
          setSubscription(null);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setBasicData(null);
        setRecentActivities([]);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

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
              <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-80 animate-pulse"></div>
            </div>
            <SkeletonLoader />
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Low Stock Notification */}
        <AnimatePresence>
          {showLowStockAlert && lowStockProducts.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 sm:px-6 lg:px-8 pt-6"
            >
              <div className="bg-gradient-to-r from-red-500 to-amber-500 text-white px-6 py-4 rounded-xl shadow-sm flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                  <FiAlertCircle className="w-5 h-5 text-white" />
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Charts & Visualizations */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
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
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Inventory Analytics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard 
                        icon={<FiPackage className="w-5 h-5 text-red-600" />}
                        label="Low Stock Items"
                        value={basicData.inventoryAnalytics.lowStockItems}
                      />
                      <StatCard 
                        icon={<FiPackage className="w-5 h-5 text-yellow-600" />}
                        label="Overstock Items"
                        value={basicData.inventoryAnalytics.overstockItems}
                      />
                      <StatCard 
                        icon={<FiTrendingUp className="w-5 h-5 text-blue-600" />}
                        label="Inventory Turnover"
                        value={basicData.inventoryAnalytics.inventoryTurnover}
                      />
                      <StatCard 
                        icon={<FiAlertCircle className="w-5 h-5 text-purple-600" />}
                        label="Stockout Rate"
                        value={`${(basicData.inventoryAnalytics.stockoutRate * 100).toFixed(2)}%`}
                      />
                    </div>
                  </div>
                )}

                {/* Performance Metrics */}
                {basicData?.performanceMetrics && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard 
                        icon={<FiDollarSign className="w-5 h-5 text-green-600" />}
                        label="Customer Lifetime Value"
                        value={`$${basicData.performanceMetrics.customerLifetimeValue.toLocaleString()}`}
                      />
                      <StatCard 
                        icon={<FiDollarSign className="w-5 h-5 text-red-600" />}
                        label="Customer Acquisition Cost"
                        value={`$${basicData.performanceMetrics.customerAcquisitionCost.toLocaleString()}`}
                      />
                      <StatCard 
                        icon={<FiTrendingUp className="w-5 h-5 text-blue-600" />}
                        label="Return on Investment"
                        value={`${(basicData.performanceMetrics.returnOnInvestment * 100).toFixed(2)}%`}
                      />
                      <StatCard 
                        icon={<FiUsers className="w-5 h-5 text-purple-600" />}
                        label="Net Promoter Score"
                        value={basicData.performanceMetrics.netPromoterScore}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <RecentActivities activities={recentActivities} />
                <SubscriptionCard subscription={subscription} />
                
                {/* Customer Segments */}
                {basicData?.customerSegments && (
                  <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Customer Segments</h2>
                    <div className="space-y-4">
                      {basicData.customerSegments.map((segment, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <FiUser className="w-4 h-4" />
                            </div>
                            <span className="font-medium">{segment.segment}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${segment.revenue.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{segment.count} customers</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}