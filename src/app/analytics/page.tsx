"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import InventoryAnalytics from '@/components/InventoryAnalytics';
import AIInsights from '@/components/AIInsights';
import AdvancedSegments from '@/components/AdvancedSegments';
import InteractiveChart from '@/components/InteractiveChart';
import AlertBanner from '@/components/AlertBanner';
import ReportBuilder from '@/components/ReportBuilder';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaShare, FaCrown, FaStar, FaArrowUp, FaBrain, FaUsers, FaBox, FaTable } from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';

interface AnalyticsData {
  totalSales?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalCustomers?: number;
  averageOrderValue?: number;
  conversionRate?: number;
  salesByMonth?: Record<string, number>;
  salesByCategory?: Record<string, number>;
  topProducts?: Array<{ name: string; sales: number; revenue: number; growth?: number; margin?: number }>;
  customerSegments?: Array<{ segment: string; count: number; revenue: number; avgOrderValue?: number; retention?: number }>;
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
  performanceMetrics?: {
    customerLifetimeValue: number;
    customerAcquisitionCost: number;
    returnOnInvestment: number;
    netPromoterScore: number;
  };
  inventoryAnalytics?: {
    lowStockItems: number;
    overstockItems: number;
    inventoryTurnover: number;
    stockoutRate: number;
  };
  advancedSegments?: {
    byLocation: Array<{ location: string; revenue: number; customers: number }>;
    byAge: Array<{ age: string; revenue: number; customers: number }>;
    byDevice: Array<{ device: string; revenue: number; customers: number }>;
  };
  aiInsights?: {
    recommendations: string[];
    anomalies: string[];
  };
  customReports?: Array<{ name: string; data: string; lastUpdated?: string }>;
  message?: string;
}

export default function AnalyticsPage() {
  const { user } = useUser();
  const [basicData, setBasicData] = useState<AnalyticsData | null>(null);
  const [advancedData, setAdvancedData] = useState<AnalyticsData | null>(null);
  const [enterpriseData, setEnterpriseData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Permission checks
  const canViewAnalytics = hasPermission(user, 'view_analytics');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch basic analytics (available to all)
        const basic = await apiGet('/analytics/basic') as AnalyticsData;
        setBasicData(basic);

        // Try to fetch advanced analytics (Pro+)
        try {
          const advanced = await apiGet('/analytics/advanced') as AnalyticsData;
          setAdvancedData(advanced);
        } catch {
          console.log('Advanced analytics not available');
        }

        // Try to fetch enterprise analytics (Enterprise only)
        try {
          const enterprise = await apiGet('/analytics/enterprise') as AnalyticsData;
          setEnterpriseData(enterprise);
        } catch {
          console.log('Enterprise analytics not available');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to view analytics
  if (!canViewAnalytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaChartLine className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view analytics.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
            <p className="text-gray-600">Business insights and performance metrics</p>
          </div>

          <div className="flex gap-2">
            <Tooltip content="Export analytics data">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <FaDownload className="w-4 h-4 inline mr-2" />
                Export
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Alert Banner */}
        <AlertBanner />

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FaChartLine },
              { id: 'trends', label: 'Trends', icon: FaChartBar },
              { id: 'segments', label: 'Segments', icon: FaUsers },
              { id: 'predictive', label: 'Predictive', icon: FaBrain },
              { id: 'reports', label: 'Reports', icon: FaTable },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>

      {/* Basic Analytics - Available to all plans */}
      {basicData && (
        <>
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Total Sales</h3>
                  <p className="text-sm text-blue-700">All time transactions</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-full">
                  <FaChartLine className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-blue-900 mb-2">{basicData.totalSales?.toLocaleString() || '0'}</p>
              <div className="flex items-center text-sm">
                <FaArrowUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">+12.5%</span>
                <span className="text-blue-600 ml-2">vs last month</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Total Revenue</h3>
                  <p className="text-sm text-green-700">All time earnings</p>
                </div>
                <div className="bg-green-500 p-3 rounded-full">
                  <FaChartBar className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-green-900 mb-2">${basicData.totalRevenue?.toLocaleString() || '0'}</p>
              <div className="flex items-center text-sm">
                <FaArrowUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">+18.2%</span>
                <span className="text-green-600 ml-2">vs last month</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">Active Products</h3>
                  <p className="text-sm text-purple-700">In inventory</p>
                </div>
                <div className="bg-purple-500 p-3 rounded-full">
                  <FaBox className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-purple-900 mb-2">{basicData.totalProducts?.toLocaleString() || '0'}</p>
              <div className="flex items-center text-sm">
                <span className="text-purple-600">+3 new this month</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-indigo-900">Total Customers</h3>
                  <p className="text-sm text-indigo-700">Unique buyers</p>
                </div>
                <div className="bg-indigo-500 p-3 rounded-full">
                  <FaUsers className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-indigo-900 mb-2">{basicData.totalCustomers?.toLocaleString() || '0'}</p>
              <div className="flex items-center text-sm">
                <FaArrowUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">+8.1%</span>
                <span className="text-indigo-600 ml-2">vs last month</span>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Avg Order Value</h3>
                <FaBox className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">${basicData.averageOrderValue?.toFixed(2) || '0'}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
              <p className="text-sm text-gray-600">Above industry average</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Conversion Rate</h3>
                <FaBrain className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">{((basicData.conversionRate || 0) * 100).toFixed(1)}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <p className="text-sm text-gray-600">Room for improvement</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Monthly Growth</h3>
                <FaChartLine className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">+15.2%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <p className="text-sm text-gray-600">Strong performance</p>
            </div>
          </div>

          {/* Sales Overview Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaChartLine className="w-5 h-5 text-blue-600" />
                Sales Trend (Last 6 Months)
              </h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {[
                  { month: 'Jan', sales: 12000 },
                  { month: 'Feb', sales: 15000 },
                  { month: 'Mar', sales: 18000 },
                  { month: 'Apr', sales: 22000 },
                  { month: 'May', sales: 25000 },
                  { month: 'Jun', sales: 28000 },
                ].map((data) => (
                  <div key={data.month} className="flex flex-col items-center flex-1">
                    <div
                      className="bg-gradient-to-t from-blue-500 to-blue-600 rounded-t w-full mb-2 transition-all hover:from-blue-600 hover:to-blue-700"
                      style={{ height: `${(data.sales / 30000) * 200}px` }}
                    ></div>
                    <span className="text-xs font-medium text-gray-600">{data.month}</span>
                    <span className="text-xs text-gray-500">${(data.sales / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaChartPie className="w-5 h-5 text-green-600" />
                Top Products by Revenue
              </h3>
              <div className="space-y-4">
                {[
                  { name: 'Wireless Headphones', revenue: 2450, percentage: 35 },
                  { name: 'Smart Watch', revenue: 1890, percentage: 27 },
                  { name: 'Laptop Stand', revenue: 1230, percentage: 18 },
                  { name: 'USB Cable', revenue: 890, percentage: 13 },
                  { name: 'Phone Case', revenue: 450, percentage: 7 },
                ].map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">${product.revenue}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${product.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-600">{product.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Geographic Performance & Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaUsers className="w-5 h-5 text-purple-600" />
                Sales by Region
              </h3>
              <div className="space-y-3">
                {[
                  { region: 'North America', sales: 15420, percentage: 45 },
                  { region: 'Europe', sales: 12350, percentage: 36 },
                  { region: 'Asia Pacific', sales: 5680, percentage: 17 },
                  { region: 'Other', sales: 550, percentage: 2 },
                ].map((region) => (
                  <div key={region.region} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{region.region}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">${region.sales.toLocaleString()}</span>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">{region.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaBrain className="w-5 h-5 text-indigo-600" />
                Performance Score
              </h3>
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${2 * Math.PI * 10 * (1 - 0.85)}`}
                      className="text-indigo-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo-600">85%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Overall Performance</p>
                <p className="text-xs text-green-600 mt-1">+5% from last month</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaStar className="w-5 h-5 text-yellow-500" />
                Quick Insights
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 text-sm mb-1">Top Product</h4>
                  <p className="text-xs text-blue-700">Wireless Headphones - $2,450</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 text-sm mb-1">Best Day</h4>
                  <p className="text-xs text-green-700">Friday - $850 avg</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 text-sm mb-1">Retention</h4>
                  <p className="text-xs text-purple-700">78% repeat rate</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Advanced Analytics - Pro+ Plans Only */}
      <FeatureGuard requiredFeature="analytics" fallback={
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaStar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Advanced Analytics</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Pro+</span>
          </div>
          <p className="text-gray-600 mb-4">
            Unlock advanced analytics with detailed insights, customer segmentation, and predictive analytics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-gray-800 mb-2">Customer Segmentation</h4>
              <p className="text-sm text-gray-600">Analyze customer behavior and segments</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-gray-800 mb-2">Predictive Analytics</h4>
              <p className="text-sm text-gray-600">Forecast sales and growth trends</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-gray-800 mb-2">Advanced Reports</h4>
              <p className="text-sm text-gray-600">Detailed reports and insights</p>
            </div>
          </div>
          <a
            href="/settings/billing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaArrowUp className="w-4 h-4" />
            Upgrade to Pro
          </a>
        </div>
      }>
        {advancedData && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FaStar className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Advanced Analytics</h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Pro+</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Customer Segments */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Segments</h3>
                <div className="space-y-3">
                  {advancedData.customerSegments?.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{segment.segment}</p>
                        <p className="text-sm text-gray-600">{segment.count} customers</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${segment.revenue.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Predictive Analytics */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Predictive Analytics</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-1">Next Month Forecast</h4>
                    <p className="text-2xl font-bold text-blue-900">${advancedData.predictiveAnalytics?.nextMonthForecast.toLocaleString() || '0'}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-1">Growth Rate</h4>
                    <p className="text-2xl font-bold text-green-900">{(advancedData.predictiveAnalytics?.growthRate || 0).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-1">Churn Risk</h4>
                    <p className="text-2xl font-bold text-orange-900">{(advancedData.predictiveAnalytics?.churnRisk || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            {advancedData.performanceMetrics && (
              <div className="mb-6">
                <PerformanceMetrics metrics={advancedData.performanceMetrics} />
              </div>
            )}

            {/* Inventory Analytics */}
            {advancedData.inventoryAnalytics && (
              <div className="mb-6">
                <InventoryAnalytics analytics={advancedData.inventoryAnalytics} />
              </div>
            )}
          </div>
        )}
      </FeatureGuard>

      {/* Enterprise Analytics - Enterprise Only */}
      <FeatureGuard requiredFeature="advanced_analytics" fallback={
        <div className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaCrown className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-semibold text-gray-800">Enterprise Analytics</h2>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Enterprise</span>
          </div>
          <p className="text-gray-600 mb-4">
            Access enterprise-grade analytics with real-time data, custom reports, and advanced insights.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <h4 className="font-medium text-gray-800 mb-2">Real-Time Data</h4>
              <p className="text-sm text-gray-600">Live analytics and monitoring</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <h4 className="font-medium text-gray-800 mb-2">Custom Reports</h4>
              <p className="text-sm text-gray-600">Build custom analytics reports</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-yellow-200">
              <h4 className="font-medium text-gray-800 mb-2">API Access</h4>
              <p className="text-sm text-gray-600">Integrate with external tools</p>
            </div>
          </div>
          <a
            href="/settings/billing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <FaArrowUp className="w-4 h-4" />
            Upgrade to Enterprise
          </a>
        </div>
      }>
        {enterpriseData && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FaCrown className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-800">Enterprise Analytics</h2>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Enterprise</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Real-Time Data */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Real-Time Data</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Current Users</p>
                      <p className="text-sm text-green-600">Active right now</p>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{enterpriseData.realTimeData?.currentUsers || 0}</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-800">Active Sales</p>
                      <p className="text-sm text-blue-600">In progress</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{enterpriseData.realTimeData?.activeSales || 0}</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium text-purple-800">Revenue Today</p>
                      <p className="text-sm text-purple-600">Todays earnings</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">${enterpriseData.realTimeData?.revenueToday.toLocaleString() || '0'}</p>
                  </div>
                </div>
              </div>

              {/* Export &amp; Share Options */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Export &amp; Share</h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <FaDownload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Export Analytics Report</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <FaShare className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Share Dashboard</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <FaChartLine className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Schedule Reports</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Customer Segments */}
            {enterpriseData.advancedSegments && (
              <div className="mb-6">
                <AdvancedSegments segments={enterpriseData.advancedSegments} />
              </div>
            )}

            {/* AI Insights */}
            {enterpriseData.aiInsights && (
              <div className="mb-6">
                <AIInsights insights={enterpriseData.aiInsights} />
              </div>
            )}
          </div>
        )}
      </FeatureGuard>

            {/* Plan Upgrade CTA */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Unlock More Analytics</h3>
              <p className="text-gray-600 mb-4">
                Upgrade your plan to access advanced analytics, real-time data, and custom reports.
              </p>
              <a
                href="/settings/billing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaArrowUp className="w-4 h-4" />
                View Plans
              </a>
            </div>
          </>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Sales Trends</h2>
            {basicData?.salesByMonth && (
              <InteractiveChart
                data={Object.entries(basicData.salesByMonth).map(([month, value]) => ({
                  month,
                  sales: value,
                }))}
                type="line"
                title="Monthly Sales Trends"
                xKey="month"
                yKey="sales"
              />
            )}
            {basicData?.salesByCategory && (
              <InteractiveChart
                data={Object.entries(basicData.salesByCategory).map(([category, value]) => ({
                  category,
                  sales: value,
                }))}
                type="bar"
                title="Sales by Category"
                xKey="category"
                yKey="sales"
              />
            )}
          </div>
        )}

        {activeTab === 'segments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Customer Segments</h2>
            {advancedData?.customerSegments && (
              <InteractiveChart
                data={advancedData.customerSegments.map(segment => ({
                  segment: segment.segment,
                  customers: segment.count,
                  revenue: segment.revenue,
                }))}
                type="pie"
                title="Customer Segments by Revenue"
                xKey="segment"
                yKey="revenue"
              />
            )}
            <AdvancedSegments segments={enterpriseData?.advancedSegments || {}} />
          </div>
        )}

        {activeTab === 'predictive' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Predictive Analytics</h2>
            {advancedData?.predictiveAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Forecast Data</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    ${advancedData.predictiveAnalytics.nextMonthForecast?.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Next month forecast</p>
                </div>
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-4">Growth Rate</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {advancedData.predictiveAnalytics.growthRate?.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">Predicted growth</p>
                </div>
              </div>
            )}
            <AIInsights insights={enterpriseData?.aiInsights || { recommendations: [], anomalies: [] }} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Custom Reports</h2>
            <ReportBuilder
              availableElements={[
                { id: 'sales', type: 'metric', title: 'Total Sales', data: basicData?.totalSales },
                { id: 'revenue', type: 'metric', title: 'Total Revenue', data: basicData?.totalRevenue },
                { id: 'customers', type: 'metric', title: 'Customer Count', data: basicData?.totalCustomers },
                { id: 'trends', type: 'chart', title: 'Sales Trends', data: basicData?.salesByMonth },
                { id: 'segments', type: 'table', title: 'Customer Segments', data: advancedData?.customerSegments },
              ]}
            />
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 