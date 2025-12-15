"use client";
import { useState } from 'react';
import { apiGet } from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import AuthGuard from '@/components/AuthGuard';
import AIInsights from '@/components/AIInsights';
import AdvancedSegments from '@/components/AdvancedSegments';
import InteractiveChart from '@/components/InteractiveChart';
import AlertBanner from '@/components/AlertBanner';
import ReportBuilder from '@/components/ReportBuilder';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaStar, FaArrowUp, FaBrain, FaUsers, FaBox, FaTable, FaChevronDown, FaChevronUp } from 'react-icons/fa';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [alertBannerExpanded, setAlertBannerExpanded] = useState(false);

  // Permission checks
  const canViewAnalytics = hasPermission(user, 'view_analytics');

  // Fetch analytics data using React Query - parallel queries with shared cache
  const { data: basicData, isLoading: basicLoading } = useQuery({
    queryKey: ['analytics', 'basic'],
    queryFn: () => apiGet('/analytics/basic') as Promise<AnalyticsData>,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });

  const { data: advancedData } = useQuery({
    queryKey: ['analytics', 'advanced'],
    queryFn: () => apiGet('/analytics/advanced') as Promise<AnalyticsData>,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false, // Don't retry if endpoint doesn't exist
  });

  const { data: enterpriseData } = useQuery({
    queryKey: ['analytics', 'enterprise'],
    queryFn: () => apiGet('/analytics/enterprise') as Promise<AnalyticsData>,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false, // Don't retry if endpoint doesn't exist
  });

  const loading = basicLoading;

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
      <div className="max-w-7xl mx-auto px-2 py-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Analytics</h1>
            <p className="text-xs text-gray-600">Business insights and performance metrics</p>
          </div>

          <div className="flex gap-1">
            <Tooltip content="Export analytics data">
              <button className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">
                <FaDownload className="w-3 h-3 inline mr-1" />
                Export
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Alert Banner - Minimized/Expandable */}
        <div className="mb-2">
          {alertBannerExpanded ? (
            <div className="relative">
              <AlertBanner />
              <button
                className="absolute top-1 right-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 bg-white bg-opacity-80 px-2 py-1 rounded"
                onClick={() => setAlertBannerExpanded(false)}
                aria-label="Minimize alerts"
              >
                <FaChevronUp className="w-3 h-3" />
                Hide
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-1 cursor-pointer" onClick={() => setAlertBannerExpanded(true)}>
              <span className="text-xs text-blue-700 font-medium flex items-center gap-2">
                <FaChevronDown className="w-3 h-3" />
                Show Alerts
              </span>
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={e => { e.stopPropagation(); setAlertBannerExpanded(true); }}
                aria-label="Expand alerts"
              >
                Expand
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-2">
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
                className={`flex items-center gap-1 py-2 px-1 border-b-2 font-medium text-xs ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-3 h-3" />
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded border border-blue-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-blue-900">Total Sales</h3>
                        <p className="text-xs text-blue-700">All time transactions</p>
                      </div>
                      <div className="bg-blue-500 p-2 rounded-full">
                        <FaChartLine className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-blue-900 mb-1">{basicData.totalSales?.toLocaleString() || '0'}</p>
                    <div className="flex items-center text-xs">
                      <FaArrowUp className="w-3 h-3 text-green-500 mr-1" />
                      <span className="text-green-600 font-medium">+12.5%</span>
                      <span className="text-blue-600 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded border border-green-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-green-900">Total Revenue</h3>
                        <p className="text-xs text-green-700">All time earnings</p>
                      </div>
                      <div className="bg-green-500 p-2 rounded-full">
                        <FaChartBar className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-green-900 mb-1">${basicData.totalRevenue?.toLocaleString() || '0'}</p>
                    <div className="flex items-center text-xs">
                      <FaArrowUp className="w-3 h-3 text-green-500 mr-1" />
                      <span className="text-green-600 font-medium">+18.2%</span>
                      <span className="text-green-600 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded border border-purple-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-purple-900">Active Products</h3>
                        <p className="text-xs text-purple-700">In inventory</p>
                      </div>
                      <div className="bg-purple-500 p-2 rounded-full">
                        <FaBox className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-purple-900 mb-1">{basicData.totalProducts?.toLocaleString() || '0'}</p>
                    <div className="flex items-center text-xs">
                      <span className="text-purple-600">+3 new this month</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded border border-indigo-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-indigo-900">Total Customers</h3>
                        <p className="text-xs text-indigo-700">Unique buyers</p>
                      </div>
                      <div className="bg-indigo-500 p-2 rounded-full">
                        <FaUsers className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <p className="text-xl font-bold text-indigo-900 mb-1">{basicData.totalCustomers?.toLocaleString() || '0'}</p>
                    <div className="flex items-center text-xs">
                      <FaArrowUp className="w-3 h-3 text-green-500 mr-1" />
                      <span className="text-green-600 font-medium">+8.1%</span>
                      <span className="text-indigo-600 ml-1">vs last month</span>
                    </div>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  <div className="bg-white rounded border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-800">Avg Order Value</h3>
                      <FaBox className="w-4 h-4 text-orange-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-1">${basicData.averageOrderValue?.toFixed(2) || '0'}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                      <div className="bg-orange-500 h-1 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <p className="text-xs text-gray-600">Above industry average</p>
                  </div>
                  <div className="bg-white rounded border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-800">Conversion Rate</h3>
                      <FaBrain className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-1">{((basicData.conversionRate || 0) * 100).toFixed(1)}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                      <div className="bg-red-500 h-1 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    <p className="text-xs text-gray-600">Room for improvement</p>
                  </div>
                  <div className="bg-white rounded border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-800">Monthly Growth</h3>
                      <FaChartLine className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-1">+15.2%</p>
                    <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                      <div className="bg-green-500 h-1 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-xs text-gray-600">Strong performance</p>
                  </div>
                </div>

                {/* Sales Overview Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
                  <div className="bg-white rounded border p-3">
                    <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaChartLine className="w-4 h-4 text-blue-600" />
                      Sales Trend (6mo)
                    </h3>
                    <div className="h-40 flex items-end justify-between space-x-1">
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
                            className="bg-gradient-to-t from-blue-500 to-blue-600 rounded-t w-full mb-1 transition-all hover:from-blue-600 hover:to-blue-700"
                            style={{ height: `${(data.sales / 30000) * 120}px` }}
                          ></div>
                          <span className="text-[11px] font-medium text-gray-600">{data.month}</span>
                          <span className="text-[10px] text-gray-500">${(data.sales / 1000).toFixed(0)}k</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded border p-3">
                    <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaChartPie className="w-4 h-4 text-green-600" />
                      Top Products by Revenue
                    </h3>
                    <div className="space-y-2">
                      {[
                        { name: 'Wireless Headphones', revenue: 2450, percentage: 35 },
                        { name: 'Smart Watch', revenue: 1890, percentage: 27 },
                        { name: 'Laptop Stand', revenue: 1230, percentage: 18 },
                        { name: 'USB Cable', revenue: 890, percentage: 13 },
                        { name: 'Phone Case', revenue: 450, percentage: 7 },
                      ].map((product, index) => (
                        <div key={product.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-xs text-gray-900">{product.name}</p>
                              <p className="text-[11px] text-gray-600">${product.revenue}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-14 bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-green-500 h-1 rounded-full"
                                style={{ width: `${product.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-600">{product.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Geographic Performance & Quick Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-3">
                  <div className="bg-white rounded border p-3">
                    <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaUsers className="w-4 h-4 text-purple-600" />
                      Sales by Region
                    </h3>
                    <div className="space-y-2">
                      {[
                        { region: 'North America', sales: 15420, percentage: 45 },
                        { region: 'Europe', sales: 12350, percentage: 36 },
                        { region: 'Asia Pacific', sales: 5680, percentage: 17 },
                        { region: 'Other', sales: 550, percentage: 2 },
                      ].map((region) => (
                        <div key={region.region} className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">{region.region}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">${region.sales.toLocaleString()}</span>
                            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">{region.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded border p-3">
                    <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaBrain className="w-4 h-4 text-indigo-600" />
                      Performance Score
                    </h3>
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 24 24">
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
                          <span className="text-lg font-bold text-indigo-600">85%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">Overall Performance</p>
                      <p className="text-[10px] text-green-600 mt-1">+5% from last month</p>
                    </div>
                  </div>
                  <div className="bg-white rounded border p-3">
                    <h3 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaStar className="w-4 h-4 text-yellow-500" />
                      Quick Insights
                    </h3>
                    <div className="space-y-2">
                      <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <h4 className="font-medium text-blue-900 text-xs mb-0.5">Top Product</h4>
                        <p className="text-[10px] text-blue-700">Wireless Headphones - $2,450</p>
                      </div>
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        <h4 className="font-medium text-green-900 text-xs mb-0.5">Best Day</h4>
                        <p className="text-[10px] text-green-700">Friday - $850 avg</p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded border border-purple-200">
                        <h4 className="font-medium text-purple-900 text-xs mb-0.5">Retention</h4>
                        <p className="text-[10px] text-purple-700">78% repeat rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
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
                <div className="bg-white rounded-lg border p-3">
                  <h3 className="text-base font-semibold mb-4">Forecast Data</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    ${advancedData.predictiveAnalytics.nextMonthForecast?.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Next month forecast</p>
                </div>
                <div className="bg-white rounded-lg border p-3">
                  <h3 className="text-base font-semibold mb-4">Growth Rate</h3>
                  <p className="text-2xl font-bold text-green-600">
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