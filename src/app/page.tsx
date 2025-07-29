"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import PlanGuard from '@/components/PlanGuard';
import { usePlanLimits } from '@/hooks/usePlanLimits';
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
  customerGrowth?: Record<string, number>; // Added for CustomerGrowthChart
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

function StatCard({ icon, label, value, trend, color, bg }: { icon: React.ReactNode; label: string; value: string | number; trend?: string; color: string; bg: string }) {
  return (
    <div className={`rounded-2xl shadow-lg border-0 p-6 flex flex-col gap-3 ${bg} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded-xl ${color} bg-opacity-20 shadow-sm`}>{icon}</div>
        {trend && (
          <span className="flex items-center text-sm font-bold text-green-600 gap-1 bg-green-50 px-2 py-1 rounded-full">
            <FaArrowUp className="inline w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-gray-600 text-sm font-medium uppercase tracking-wide">{label}</span>
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
}

function UsageLimitCard({ label, value, limit, color }: { label: string; value: number; limit: number; color: string }) {
  const percent = Math.min(100, (value / limit) * 100);
  const over = value > limit;
  return (
    <div className="flex flex-col gap-1 p-3 bg-white rounded-xl border shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className={`text-xs font-bold ${over ? 'text-red-600' : 'text-gray-700'}`}>{value}/{limit}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${over ? 'bg-red-400' : color}`} style={{ width: `${percent}%` }} />
      </div>
      {over && <span className="text-xs text-red-600 flex items-center gap-1 mt-1"><FaExclamationTriangle className="w-3 h-3" />Limit exceeded</span>}
    </div>
  );
}

function SalesTrendChart({ salesByMonth }: { salesByMonth?: Record<string, number> }) {
  if (!salesByMonth) return null;
  const months = Object.keys(salesByMonth);
  const values = Object.values(salesByMonth);
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - (v / max) * 80}`).join(' ');
  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border-0 shadow-lg p-6 flex flex-col gap-4 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-100">
            <FaChartLine className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Sales Trend</h3>
            <p className="text-sm text-gray-600">Monthly performance overview</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            <FaDownload className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            <FaShare className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-full h-32">
          <defs>
            <linearGradient id="salesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          <polyline fill="none" stroke="#3B82F6" strokeWidth="3" points={points} />
          <polygon fill="url(#salesGradient)" points={`0,100 ${points} 100,100`} />
        </svg>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        {months.slice(0, 6).map((month, i) => (
          <span key={i}>{month.slice(0, 3)}</span>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { icon: <FaPlus className="w-5 h-5" />, label: "Add Product", href: "/products", color: "bg-blue-500 hover:bg-blue-600" },
    { icon: <FaUserPlus className="w-5 h-5" />, label: "Add Customer", href: "/users", color: "bg-green-500 hover:bg-green-600" },
    { icon: <FaShoppingCart className="w-5 h-5" />, label: "New Sale", href: "/sales", color: "bg-purple-500 hover:bg-purple-600" },
    { icon: <FaFileAlt className="w-5 h-5" />, label: "Generate Report", href: "/reports", color: "bg-orange-500 hover:bg-orange-600" },
  ];

  return (
    <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-lg border-0 p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-indigo-100">
          <FaChartLine className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
          <p className="text-sm text-gray-600">Streamline your workflow</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, i) => (
          <a
            key={i}
            href={action.href}
            className={`${action.color} text-white p-4 rounded-xl flex flex-col items-center gap-2 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg`}
          >
            {action.icon}
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
    <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg border-0 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-purple-100">
          <FaBell className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Recent Activities</h2>
          <p className="text-sm text-gray-600">Latest updates and actions</p>
        </div>
      </div>
      <div className="space-y-4">
        {activities.slice(0, 5).map((a, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-100 to-purple-100 shadow-sm">
              {a.icon || <FaBell className="text-blue-600 w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 mb-1">{a.description}</p>
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
    <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8 flex flex-col gap-4">
      <div className="flex items-center gap-3 mb-2">
        {subscription.plan.name === 'Enterprise' ? <FaCrown className="w-6 h-6 text-yellow-600" /> : subscription.plan.name === 'Pro' ? <FaStar className="w-6 h-6 text-purple-600" /> : <FaStar className="w-6 h-6 text-blue-600" />}
        <span className="text-lg font-semibold text-gray-800">Current Plan: {subscription.plan.name}</span>
        <span className="ml-auto px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium capitalize">{subscription.status}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <p className="text-sm text-gray-600">Plan</p>
          <p className="text-lg font-semibold text-gray-900">{subscription.plan.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Price</p>
          <p className="text-lg font-semibold text-gray-900">${subscription.plan.price}/{subscription.plan.interval}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Next Billing</p>
          <p className="text-lg font-semibold text-gray-900">{subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-lg font-semibold text-gray-900 capitalize">{subscription.status}</p>
        </div>
      </div>
      <div className="mt-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Upgrade Plan</button>
      </div>
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
  // Remove placeholder notifications
  // Remove placeholder activities
  // Example usage limits (replace with real data if available)
  const usageLimits = [
    { label: 'Users', value: limits?.usage?.users?.current || 0, limit: limits?.usage?.users?.limit || 1, color: 'bg-blue-500' },
    { label: 'Products', value: limits?.usage?.products?.current || 0, limit: limits?.usage?.products?.limit || 1, color: 'bg-green-500' },
    { label: 'Sales', value: limits?.usage?.sales?.current || 0, limit: limits?.usage?.sales?.limit || 1, color: 'bg-purple-500' },
  ];

  // Real recent activities state
  const [recentActivities, setRecentActivities] = useState<Array<{ type: string; description: string; date: string; icon?: React.ReactNode }>>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        // Fetch dashboard stats (includes recent sales/products)
        const stats = await apiGet('/dashboard/stats');
        setBasicData({
          totalSales: stats.totalSales,
          totalRevenue: stats.totalRevenue,
          totalProducts: stats.totalProducts,
          customerSegments: [{ segment: 'All', count: stats.totalCustomers, revenue: 0 }],
        });
        // Build real recent activities from sales and products
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
        // Sort by date, most recent first
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivities(activities);
        // Fetch subscription info
        const sub = await apiGet('/billing') as Subscription;
        setSubscription(sub);
      } catch {}
      finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading || limitsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
              <FaChartLine className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 text-lg">Track your business performance and insights</p>
            </div>
          </div>
          <div className="flex gap-3">
            {usageLimits.map((u) => (
              <UsageLimitCard key={u.label} {...u} />
            ))}
          </div>
              </div>

        {/* Enhanced Stat Cards */}
        {basicData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              icon={<FaDollarSign className="w-7 h-7 text-blue-600" />} 
              label="Total Sales" 
              value={basicData.totalSales?.toLocaleString() || 0} 
              trend="+12%" 
              color="text-blue-600" 
              bg="bg-gradient-to-br from-blue-50 to-blue-100" 
            />
            <StatCard 
              icon={<FaChartBar className="w-7 h-7 text-green-600" />} 
              label="Total Revenue" 
              value={`$${basicData.totalRevenue?.toLocaleString() || 0}`} 
              trend="+8%" 
              color="text-green-600" 
              bg="bg-gradient-to-br from-green-50 to-green-100" 
            />
            <StatCard 
              icon={<FaBox className="w-7 h-7 text-purple-600" />} 
              label="Products" 
              value={basicData.totalProducts || 0} 
              trend="+15%" 
              color="text-purple-600" 
              bg="bg-gradient-to-br from-purple-50 to-purple-100" 
            />
            <StatCard 
              icon={<FaUsers className="w-7 h-7 text-orange-600" />} 
              label="Customers" 
              value={basicData.customerSegments?.reduce((a, c) => a + (c.count || 0), 0) || 0} 
              trend="+5%" 
              color="text-orange-600" 
              bg="bg-gradient-to-br from-orange-50 to-orange-100" 
            />
                </div>
        )}

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Analytics Area (2/3 width) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <SalesTrendChart salesByMonth={basicData?.salesByMonth} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-all duration-300">
                <SalesBreakdownChart salesData={basicData?.topProducts?.map(p => ({ label: p.name, value: p.sales })) || []} />
              </div>
              <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-all duration-300">
                <CustomerGrowthChart growthData={basicData?.customerGrowth || {}} />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-white to-indigo-50 rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-all duration-300">
              <TopProductsChart products={basicData?.topProducts?.map(p => ({ name: p.name, sales: p.sales })) || []} />
        </div>

            {/* Enhanced Customer Segments */}
            {basicData?.customerSegments && (
              <div className="bg-gradient-to-br from-white to-pink-50 rounded-2xl shadow-lg border-0 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-pink-100">
                    <FaUsers className="w-6 h-6 text-pink-600" />
                    </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Customer Segments</h2>
                    <p className="text-sm text-gray-600">Analyze your customer base</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {basicData.customerSegments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100">
                      <div className="p-2 rounded-full bg-gradient-to-r from-pink-100 to-purple-100">
                        <FaUsers className="text-pink-600 w-5 h-5" />
                      </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{seg.segment}</p>
                        <p className="text-xs text-gray-500">{seg.count} customers • ${seg.revenue?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </div>

          {/* Sidebar (1/3 width) - Only ONE Recent Activities section */}
          <div className="flex flex-col gap-6">
            <RecentActivities activities={recentActivities} />
            <SubscriptionCard subscription={subscription} />
          </div>
        </div>
      </div>
    </div>
  );
}
