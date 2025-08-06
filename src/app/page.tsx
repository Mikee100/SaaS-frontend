"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import PlanGuard from '@/components/PlanGuard';
import AuthGuard from '@/components/AuthGuard';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import LogoEnforcement from '@/components/LogoEnforcement';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaShare, FaCrown, FaStar, FaArrowUp, FaArrowDown, FaUser, FaBox, FaUsers, FaExclamationTriangle, FaBell, FaPlus, FaUserPlus, FaFileAlt, FaEye, FaShoppingCart, FaDollarSign } from 'react-icons/fa';
import SalesBreakdownChart from '@/components/SalesBreakdownChart';
import CustomerGrowthChart from '@/components/CustomerGrowthChart';
import TopProductsChart from '@/components/TopProductsChart';

interface AnalyticsData {
  totalSales?: number;
  totalRevenue?: number;
  totalProducts?: number;
  salesByMonth?: Record<string, number>;
  topProducts?: Array<{ name: string; sales: number; revenue: number }>;
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

function StatCard({ icon, label, value, trend, trendDirection }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  trend?: string; 
  trendDirection?: 'up' | 'down';
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center text-xs font-medium gap-1 px-2 py-1 rounded-full ${
            trendDirection === 'up' 
              ? 'text-green-600 bg-green-50' 
              : 'text-red-600 bg-red-50'
          }`}>
            {trendDirection === 'up' ? <FaArrowUp className="w-3 h-3" /> : <FaArrowDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <span className="text-gray-500 text-sm font-medium">{label}</span>
        <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      </div>
    </div>
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
    { icon: <FaPlus className="w-4 h-4" />, label: "Add Product", href: "/products", color: "bg-blue-500 hover:bg-blue-600" },
    { icon: <FaUserPlus className="w-4 h-4" />, label: "Add Customer", href: "/users", color: "bg-green-500 hover:bg-green-600" },
    { icon: <FaShoppingCart className="w-4 h-4" />, label: "New Sale", href: "/sales", color: "bg-purple-500 hover:bg-purple-600" },
    { icon: <FaFileAlt className="w-4 h-4" />, label: "Generate Report", href: "/reports", color: "bg-orange-500 hover:bg-orange-600" },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <FaChartLine className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action, i) => (
          <a
            key={i}
            href={action.href}
            className={`${action.color} text-white p-3 rounded-lg flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105`}
          >
            {action.icon}
            <span className="text-xs font-medium text-center">{action.label}</span>
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

export default function AnalyticsPage() {
  const [basicData, setBasicData] = useState<AnalyticsData | null>(null);
  const [advancedData, setAdvancedData] = useState<AnalyticsData | null>(null);
  const [enterpriseData, setEnterpriseData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const { limits, loading: limitsLoading } = usePlanLimits();
  
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
          totalCustomers: stats.totalCustomers,
          averageOrderValue: stats.averageOrderValue,
          conversionRate: stats.conversionRate,
          customerSegments: [{ segment: 'All', count: stats.totalCustomers, revenue: stats.totalRevenue }],
          customerGrowth: stats.customerGrowth,
          topProducts: stats.topProducts,
        });
        
        // Process recent activities
        const activities: Array<{ type: string; description: string; date: string; icon?: React.ReactNode }> = [];
        if (stats.recentActivity?.sales) {
          stats.recentActivity.sales.forEach((sale: any) => {
            activities.push({
              type: 'sale',
              description: `Sale completed: $${sale.amount.toLocaleString()} to ${sale.customer}`,
              date: sale.date,
              icon: <FaChartLine className="text-green-600 w-4 h-4" />,
            });
          });
        }
        if (stats.recentActivity?.products) {
          stats.recentActivity.products.forEach((product: any) => {
            activities.push({
              type: 'product',
              description: `New product added: ${product.name}`,
              date: product.date,
              icon: <FaBox className="text-blue-600 w-4 h-4" />,
            });
          });
        }
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivities(activities);
        
        // Fetch subscription data (with error handling)
        try {
          console.log('Fetching subscription data...');
          const sub = await apiGet('/billing/subscription') as Subscription;
          console.log('Subscription data received:', sub);
          setSubscription(sub);
        } catch (billingError) {
          console.warn('Billing data not available:', billingError);
          // Try the test endpoint to debug
          try {
            const testResult = await apiGet('/billing/test-subscription');
            console.log('Test subscription result:', testResult);
          } catch (testError) {
            console.error('Test subscription also failed:', testError);
          }
          // Set a default subscription or leave as null
          setSubscription(null);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set default data or show error state
        setBasicData({
          totalSales: 0,
          totalRevenue: 0,
          totalProducts: 0,
          totalCustomers: 0,
          averageOrderValue: 0,
          conversionRate: 0,
          customerSegments: [],
          customerGrowth: {},
          topProducts: [],
        });
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Loading data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-3"></div>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
              <p className="text-gray-600">Track your business performance</p>
            </div>
            <div className="flex gap-2">
              {usageLimits.map((u) => (
                <UsageLimitCard key={u.label} {...u} />
              ))}
            </div>
          </div>

          {/* Logo Compliance */}
          <LogoEnforcement showBanner={true} showStats={true} className="mb-6" />

          {/* Stat Cards */}
          {basicData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard 
                icon={<FaDollarSign className="w-5 h-5" />} 
                label="Total Sales" 
                value={basicData.totalSales?.toLocaleString() || 0} 
                trend="+12%" 
                trendDirection="up"
              />
              <StatCard 
                icon={<FaChartBar className="w-5 h-5" />} 
                label="Total Revenue" 
                value={`$${basicData.totalRevenue?.toLocaleString() || 0}`} 
                trend="+8%" 
                trendDirection="up"
              />
              <StatCard 
                icon={<FaBox className="w-5 h-5" />} 
                label="Products" 
                value={basicData.totalProducts || 0} 
                trend="+15%" 
                trendDirection="up"
              />
              <StatCard 
                icon={<FaUsers className="w-5 h-5" />} 
                label="Customers" 
                value={basicData.customerSegments?.reduce((a, c) => a + (c.count || 0), 0) || 0} 
                trend="+5%" 
                trendDirection="up"
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-6">
            <QuickActions />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <SalesBreakdownChart salesData={basicData?.topProducts?.map(p => ({ label: p.name, value: p.sales })) || []} />
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <CustomerGrowthChart growthData={basicData?.customerGrowth || {}} />
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <TopProductsChart products={basicData?.topProducts?.map(p => ({ name: p.name, sales: p.sales })) || []} />
              </div>

              {/* Customer Segments */}
              {basicData?.customerSegments && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FaUsers className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-semibold text-gray-800">Customer Segments</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {basicData.customerSegments.map((seg, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 rounded-full bg-white">
                          <FaUsers className="text-gray-600 w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{seg.segment}</p>
                          <p className="text-xs text-gray-500">{seg.count} customers • ${seg.revenue?.toLocaleString()}</p>
                        </div>
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
    </AuthGuard>
  );
}
