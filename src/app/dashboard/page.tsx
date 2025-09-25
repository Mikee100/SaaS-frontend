'use client';
import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import PlanGuard from '@/components/PlanGuard';
import AuthGuard from '@/components/AuthGuard';
import LogoEnforcement from '@/components/LogoEnforcement';
import BranchSwitcher from '@/components/BranchSwitcher';
import {
  FiTrendingUp,
  FiRefreshCw,
  FiTrendingDown,
  FiUserPlus,
  FiPlus,
  FiFileText,
  FiPackage,
  FiDollarSign,
  FiAlertCircle
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

interface UsageLimit {
  label: string;
  value: number;
  limit: number;
}

const colors = {
  primary: 'rgba(99, 102, 241, 1)',
  success: 'rgba(16, 185, 129, 1)',
  warning: 'rgba(245, 158, 11, 1)',
  danger: 'rgba(239, 68, 68, 1)',
  info: 'rgba(59, 130, 246, 1)',
};

function StatCard({
  icon,
  label,
  value,
  trend,
  trendDirection = 'up',
  color = 'primary'
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down';
  color?: keyof typeof colors;
}) {
  return (
    <motion.div
      className="bg-white rounded-xl p-6 shadow-sm ring-1 ring-gray-200"
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: `${colors[color]}10` }}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <span className={`flex items-center text-sm font-medium ${
            trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trendDirection === 'up' ? (
              <FiTrendingUp className="mr-1 h-4 w-4" />
            ) : (
              <FiTrendingDown className="mr-1 h-4 w-4" />
            )}
            {trend}
          </span>
          <span className="ml-2 text-sm text-gray-500">vs last period</span>
        </div>
      )}
    </motion.div>
  );
}

function UsageLimitCard({ label, value, limit }: { label: string; value: number; limit: number }) {
  const percentage = Math.min(Math.round((value / limit) * 100), 100);
  const isOverLimit = value > limit;

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-900">
          {value} / {limit}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full ${isOverLimit ? 'bg-red-500' : 'bg-indigo-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className={`mt-1 text-xs ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
        {isOverLimit ? 'Limit exceeded' : `${percentage}% of limit`}
      </p>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[
        { icon: <FiPlus className="h-5 w-5" />, label: 'New Sale', onClick: () => {} },
        { icon: <FiUserPlus className="h-5 w-5" />, label: 'Add Customer', onClick: () => {} },
        { icon: <FiPackage className="h-5 w-5" />, label: 'Add Product', onClick: () => {} },
        { icon: <FiFileText className="h-5 w-5" />, label: 'Generate Report', onClick: () => {} },
      ].map((action, index) => (
        <motion.button
          key={index}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 text-center transition-colors hover:bg-gray-50"
        >
          <div className="mb-2 rounded-lg bg-indigo-50 p-2 text-indigo-600">
            {action.icon}
          </div>
          <span className="text-sm font-medium text-gray-700">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}



export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({});
  const [salesTrends, setSalesTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { limits } = usePlanLimits();
  const { currentPlan, usage, features } = limits || {};

  // Mock data for demonstration
  const recentActivities = [
    { type: 'sale', description: 'New sale to John Doe', date: '2 min ago' },
    { type: 'customer', description: 'New customer registered', date: '1 hour ago' },
    { type: 'sale', description: 'Order #1234 completed', date: '3 hours ago' },
  ];

  const usageLimits: UsageLimit[] = [
    { label: 'Users', value: usage.users.current, limit: usage.users.limit },
    { label: 'Products', value: usage.products?.current || 0, limit: usage.products?.limit || 100 },
    { label: 'Sales', value: usage.sales.current, limit: usage.sales.limit },
  ];

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching analytics and sales trends...');
      
      // First try to get sales trends directly
      let trends = { data: null };
      try {
        const response = await fetch('/api/sales-trends');
        if (response.ok) {
          trends = await response.json();
          console.log('Sales trends API response:', trends);
        } else {
          console.error('Sales trends API error:', response.status, response.statusText);
        }
      } catch (e) {
        console.error('Error fetching sales trends:', e);
      }

      // Then get analytics
      let analytics = {};
      try {
        const response = await fetch('/api/analytics/overview');
        if (response.ok) {
          analytics = await response.json();
          console.log('Analytics API response:', analytics);
        } else {
          console.error('Analytics API error:', response.status, response.statusText);
        }
      } catch (e) {
        console.error('Error fetching analytics:', e);
      }
      
      console.log('Setting state with:', { analytics, trends });
      
      setAnalyticsData(analytics);
      
      // If no trends from API, use mock data
      if (!trends?.data) {
        console.log('Using mock data for sales trends');
        const mockTrends = {
          trends: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
            totalSales: Math.floor(Math.random() * 10000) + 1000,
            totalOrders: Math.floor(Math.random() * 50) + 5,
            averageOrderValue: Math.floor(Math.random() * 200) + 50
          })).reverse(),
          summary: {
            totalSales: 150000,
            totalOrders: 1500,
            averageOrderValue: 100
          }
        };
        setSalesTrends(mockTrends);
      } else {
        setSalesTrends(trends.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 p-8">
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
      <PlanGuard requiredPlan="Pro">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <LogoEnforcement />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex flex-col justify-between sm:flex-row sm:items-center">
              <div className="mb-4 sm:mb-0">
                <div className="flex items-center">
                  <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
                    Dashboard
                  </h1>
                  <span className="ml-3 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
                    {dateRange === '7d' ? '7D' : dateRange === '30d' ? '30D' : dateRange === '90d' ? '90D' : '12M'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Welcome back! Here's what's happening with your business today.
                </p>
              </div>
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                <div className="relative w-full sm:w-48">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="block w-full rounded-lg border-0 bg-white py-2.5 pl-4 pr-10 text-sm shadow-sm ring-1 ring-gray-200 transition-all hover:ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  onClick={() => {
                    setIsRefreshing(true);
                    fetchAnalyticsData();
                  }}
                  disabled={isRefreshing}
                  className={`inline-flex w-full items-center justify-center rounded-lg border-0 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto ${
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

            {/* Quick Actions */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
              <QuickActions />
            </div>

            {/* Charts Section */}
            {/* Sales Trends Chart */}
            {salesTrends && (
              <div className="mb-8">
                <ChartComponents.SalesTrendsChart data={salesTrends} />
              </div>
            )}

            {/* Customer Segmentation Section */}
            <div className="mb-8">
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Customer Segmentation</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <ChartComponents.CustomerSegmentation />
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-800">Top Spending Segment</p>
                          <p className="text-2xl font-bold text-blue-600">Champions</p>
                          <p className="text-xs text-blue-600">15% of customers, 45% of revenue</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                          <FiDollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-amber-800">Growth Opportunity</p>
                          <p className="text-2xl font-bold text-amber-600">Potential Loyalists</p>
                          <p className="text-xs text-amber-600">30% of customers, 25% of revenue</p>
                        </div>
                        <div className="p-3 bg-amber-100 rounded-full">
                          <FiTrendingUp className="w-6 h-6 text-amber-600" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-rose-800">At Risk</p>
                          <p className="text-2xl font-bold text-rose-600">18% of customers</p>
                          <p className="text-xs text-rose-600">Last purchase 30-60 days ago</p>
                        </div>
                        <div className="p-3 bg-rose-100 rounded-full">
                          <FiAlertCircle className="w-6 h-6 text-rose-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Sales Chart */}
              <div className="lg:col-span-2">
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Sales Overview</h3>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        <FiTrendingUp className="mr-1 h-3 w-3" />
                        12.5% from last month
                      </span>
                    </div>
                  </div>
                  <div className="h-80">
                    <ChartComponents.SalesTrendsAnalysis salesData={analyticsData.salesByMonth || {}} />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Customer Growth */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Customer Growth</h3>
                  <div className="h-64">
                    <ChartComponents.CustomerGrowthChart growthData={analyticsData?.customerGrowth || {}} />
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                    <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <FiUserPlus className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-3">
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
            <div className="mb-8">
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Sales Trends Analysis</h3>
                <div className="grid grid-cols-1 gap-6">
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
