'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import PlanGuard from '@/components/PlanGuard';
import AuthGuard from '@/components/AuthGuard';
import LogoEnforcement from '@/components/LogoEnforcement';
import BranchSwitcher from '@/components/BranchSwitcher';
import {
  FiTrendingUp,
  FiRefreshCw,
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
  ),
  SalesTarget: dynamic(
    () => import('@/components/SalesTarget'),
    { ssr: false, loading: () => <div className="h-64 flex items-center justify-center">Loading...</div> }
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

type SalesTrends = {
  trends: {
    date: string;
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  }[];
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
};

const QuickActions = () => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { icon: <FiPlus className="h-4 w-4" />, label: 'New Sale', onClick: () => {} },
        { icon: <FiUserPlus className="h-4 w-4" />, label: 'Add Customer', onClick: () => {} },
        { icon: <FiPackage className="h-4 w-4" />, label: 'Add Product', onClick: () => {} },
        { icon: <FiFileText className="h-4 w-4" />, label: 'Generate Report', onClick: () => {} },
      ].map((action, index) => (
        <motion.button
          key={index}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-3 text-center transition-colors hover:bg-gray-50"
        >
          <div className="mb-1.5 rounded-md bg-indigo-50 p-1.5 text-indigo-600">
            {action.icon}
          </div>
          <span className="text-xs font-medium text-gray-700">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
};



export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({});
  const [salesTrends, setSalesTrends] = useState<SalesTrends | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
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
            <div className="mb-6 flex flex-col justify-between sm:flex-row sm:items-center">
              <div className="mb-3 sm:mb-0">
                <div className="flex items-center">
                  <h1 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
                    Dashboard
                  </h1>
                  <span className="ml-2 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                    {dateRange === '7d' ? '7D' : dateRange === '30d' ? '30D' : dateRange === '90d' ? '90D' : '12M'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Welcome back! Here&apos;s what&apos;s happening with your business today.
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
            <div className="mb-6">
              <h2 className="mb-3 text-base font-semibold text-gray-900">Quick Actions</h2>
              <QuickActions />
            </div>

            {/* Charts Section */}
            {/* Sales Trends Chart */}
            {salesTrends && (
              <div className="mb-6">
                <ChartComponents.SalesTrendsChart data={salesTrends} />
              </div>
            )}

            {/* Customer Segmentation Section */}
            <div className="mb-6">
              <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Customer Segmentation</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <ChartComponents.CustomerSegmentation />
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-800">Top Spending Segment</p>
                          <p className="text-lg font-bold text-blue-600">Champions</p>
                          <p className="text-xs text-blue-600">15% of customers, 45% of revenue</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full">
                          <FiDollarSign className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-amber-800">Growth Opportunity</p>
                          <p className="text-lg font-bold text-amber-600">Potential Loyalists</p>
                          <p className="text-xs text-amber-600">30% of customers, 25% of revenue</p>
                        </div>
                        <div className="p-2 bg-amber-100 rounded-full">
                          <FiTrendingUp className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-rose-800">At Risk</p>
                          <p className="text-lg font-bold text-rose-600">18% of customers</p>
                          <p className="text-xs text-rose-600">Last purchase 30-60 days ago</p>
                        </div>
                        <div className="p-2 bg-rose-100 rounded-full">
                          <FiAlertCircle className="w-4 h-4 text-rose-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Sales Chart */}
              <div className="lg:col-span-2">
                <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">Sales Overview</h3>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <FiTrendingUp className="mr-1 h-3 w-3" />
                        12.5% from last month
                      </span>
                    </div>
                  </div>
                  <div className="h-72">
                    <ChartComponents.SalesTrendsAnalysis salesData={analyticsData.salesByMonth || {}} />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Customer Growth */}
                <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
                  <h3 className="mb-3 text-base font-semibold text-gray-900">Customer Growth</h3>
                  <div className="h-56">
                    <ChartComponents.CustomerGrowthChart growthData={analyticsData?.customerGrowth || {}} />
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">Recent Activities</h3>
                    <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <FiUserPlus className="h-4 w-4 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-2">
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
            <div className="mb-6">
              <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
                <h3 className="mb-3 text-base font-semibold text-gray-900">Sales Trends Analysis</h3>
                <div className="grid grid-cols-1 gap-4">
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

