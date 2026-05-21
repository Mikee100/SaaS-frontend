"use client";
import { useState } from 'react';
import { apiGet } from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import AuthGuard from '@/components/AuthGuard';
import AIInsights from '@/components/AIInsights';
import AdvancedSegments from '@/components/AdvancedSegments';
import InteractiveChart from '@/components/InteractiveChart';
import AlertBanner from '@/components/AlertBanner';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaStar, FaArrowUp, FaBrain, FaUsers, FaBox, FaTable, FaChevronDown, FaChevronUp, FaFileAlt, FaShoppingCart, FaUser, FaWarehouse, FaMoneyBillWave, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
import { useBranches } from '@/hooks/useBranches';
import ReportsTab from '@/components/ReportsTab';

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
  revenueGrowth?: number;
  salesGrowth?: number;
  customerRetention?: number;
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
  const [trendsTimeRange, setTrendsTimeRange] = useState<'7d' | '30d' | '90d' | '6m' | '1y'>(() => {
    if (typeof window === 'undefined') return '30d';
    const stored = window.localStorage.getItem('analyticsTrendsRange') as '7d' | '30d' | '90d' | '6m' | '1y' | null;
    return stored || '30d';
  });

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

  // Fetch trend-specific data
  const { data: dailySales } = useQuery({
    queryKey: ['analytics', 'sales', 'daily'],
    queryFn: () => apiGet('/analytics/sales/daily') as Promise<Record<string, number>>,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: activeTab === 'trends',
  });

  const { data: weeklySales } = useQuery({
    queryKey: ['analytics', 'sales', 'weekly'],
    queryFn: () => apiGet('/analytics/sales/weekly') as Promise<Record<string, number>>,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: activeTab === 'trends',
  });

  const { data: yearlySales } = useQuery({
    queryKey: ['analytics', 'sales', 'yearly'],
    queryFn: () => apiGet('/analytics/sales/yearly') as Promise<Record<string, number>>,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: activeTab === 'trends',
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
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>
            <p className="text-[11px] text-gray-500">Business insights</p>
          </div>

          <div className="flex gap-1">
            <Tooltip content="Export analytics data">
              <button className="px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-800 text-xs">
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
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-3 py-1 cursor-pointer" onClick={() => setAlertBannerExpanded(true)}>
              <span className="text-xs text-gray-700 font-medium flex items-center gap-2">
                <FaChevronDown className="w-3 h-3" />
                Show Alerts
              </span>
              <button
                className="text-xs text-gray-600 hover:underline"
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
          <nav className="-mb-px flex space-x-2 overflow-x-auto">
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
                className={`flex items-center gap-1 py-2 px-1 border-b-2 font-medium text-xs whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-slate-700 text-slate-700'
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900">Total Sales</h3>
                        <p className="text-[11px] text-gray-500">All-time transactions</p>
                      </div>
                      <FaChartLine className="w-3 h-3 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{basicData.totalSales?.toLocaleString() || '0'}</p>
                    {basicData.salesGrowth !== undefined && (
                      <div className="flex items-center text-[11px]">
                        {basicData.salesGrowth >= 0 ? (
                          <FaArrowUp className="w-3 h-3 text-green-500 mr-1" />
                        ) : (
                          <FaArrowUp className="w-3 h-3 text-red-500 mr-1 rotate-180" />
                        )}
                        <span className={`font-medium ${basicData.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {basicData.salesGrowth >= 0 ? '+' : ''}{basicData.salesGrowth.toFixed(1)}%
                        </span>
                        <span className="text-gray-500 ml-1">vs last month</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900">Total Revenue</h3>
                        <p className="text-[11px] text-gray-500">All-time earnings</p>
                      </div>
                      <FaChartBar className="w-3 h-3 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Ksh {basicData.totalRevenue?.toLocaleString() || '0'}</p>
                    {basicData.revenueGrowth !== undefined && (
                      <div className="flex items-center text-[11px]">
                        {basicData.revenueGrowth >= 0 ? (
                          <FaArrowUp className="w-3 h-3 text-green-500 mr-1" />
                        ) : (
                          <FaArrowUp className="w-3 h-3 text-red-500 mr-1 rotate-180" />
                        )}
                        <span className={`font-medium ${basicData.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {basicData.revenueGrowth >= 0 ? '+' : ''}{basicData.revenueGrowth.toFixed(1)}%
                        </span>
                        <span className="text-gray-500 ml-1">vs last month</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900">Active Products</h3>
                        <p className="text-[11px] text-gray-500">In inventory</p>
                      </div>
                      <FaBox className="w-3 h-3 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{basicData.totalProducts?.toLocaleString() || '0'}</p>
                    <div className="flex items-center text-[11px]">
                      <span className="text-gray-500">Total products</span>
                    </div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xs font-semibold text-gray-900">Total Customers</h3>
                        <p className="text-[11px] text-gray-500">Unique buyers</p>
                      </div>
                      <FaUsers className="w-3 h-3 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{basicData.totalCustomers?.toLocaleString() || '0'}</p>
                    {basicData.customerRetention && (
                      <div className="flex items-center text-xs">
                        <span className="text-gray-500">{basicData.customerRetention.toFixed(1)}% retention</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-gray-800">Avg Order Value</h3>
                      <FaBox className="w-3 h-3 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Ksh {basicData.averageOrderValue?.toFixed(2) || '0'}</p>
                    <p className="text-[11px] text-gray-500">Average per order</p>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-gray-800">Conversion Rate</h3>
                      <FaBrain className="w-3 h-3 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{((basicData.conversionRate || 0) * 100).toFixed(1)}%</p>
                    <p className="text-[11px] text-gray-500">Visitor to buyer ratio</p>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-gray-800">Monthly Growth</h3>
                      <FaChartLine className="w-3 h-3 text-gray-400" />
                    </div>
                    {basicData.revenueGrowth !== undefined ? (
                      <>
                        <p className={`text-xl font-bold mb-1 ${basicData.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {basicData.revenueGrowth >= 0 ? '+' : ''}{basicData.revenueGrowth.toFixed(1)}%
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                          <div 
                            className={`h-1 rounded-full ${basicData.revenueGrowth >= 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                            style={{ width: `${Math.min(Math.abs(basicData.revenueGrowth), 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          {basicData.revenueGrowth >= 0 ? 'Growth' : 'Decline'} this month
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold text-gray-900 mb-1">N/A</p>
                        <p className="text-xs text-gray-600">No data available</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Sales Overview Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-2">
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaChartLine className="w-3 h-3 text-gray-400" />
                      Sales Trend (6mo)
                    </h3>
                    {basicData.salesByMonth && Object.keys(basicData.salesByMonth).length > 0 ? (
                      <div className="h-40 flex items-end justify-between space-x-1">
                        {Object.entries(basicData.salesByMonth)
                          .slice(-6)
                          .map(([month, sales]) => {
                            const salesValue = typeof sales === 'number' ? sales : 0;
                            const maxSales = Math.max(...Object.values(basicData.salesByMonth || {}).map(v => typeof v === 'number' ? v : 0), 1);
                            const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' });
                            return (
                              <div key={month} className="flex flex-col items-center flex-1">
                                <div
                                  className="bg-slate-500 rounded-t w-full mb-1 transition-all hover:bg-slate-600"
                                  style={{ height: `${(salesValue / maxSales) * 120}px` }}
                                ></div>
                                <span className="text-[11px] font-medium text-gray-600">{monthName}</span>
                                <span className="text-[10px] text-gray-500">Ksh {(salesValue / 1000).toFixed(0)}k</span>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                        No sales data available
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaChartPie className="w-3 h-3 text-gray-400" />
                      Top Products by Revenue
                    </h3>
                    {basicData.topProducts && basicData.topProducts.length > 0 ? (
                      <div className="space-y-2">
                        {(() => {
                          const totalRevenue = basicData.topProducts.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0);
                          return basicData.topProducts.slice(0, 5).map((product: any, index: number) => {
                            const revenue = product.revenue || 0;
                            const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                            return (
                              <div key={product.name || index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <p className="font-medium text-xs text-gray-900">{product.name || 'Unknown Product'}</p>
                                    <p className="text-[11px] text-gray-600">Ksh {(revenue || 0).toLocaleString()}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-14 bg-gray-200 rounded-full h-1">
                                    <div
                                      className="bg-slate-500 h-1 rounded-full"
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-600">{percentage.toFixed(0)}%</span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        No product sales data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Geographic Performance & Quick Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mb-2">
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaUsers className="w-3 h-3 text-gray-400" />
                      Customer Insights
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">Total Customers</span>
                        <span className="text-xs font-bold text-gray-900">{basicData.totalCustomers?.toLocaleString() || '0'}</span>
                      </div>
                      {basicData.customerRetention !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">Retention Rate</span>
                          <span className="text-xs font-bold text-purple-600">{basicData.customerRetention.toFixed(1)}%</span>
                        </div>
                      )}
                      {basicData.averageOrderValue !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">Avg Order Value</span>
                          <span className="text-xs font-bold text-gray-900">Ksh {basicData.averageOrderValue.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaBrain className="w-3 h-3 text-gray-400" />
                      Performance Score
                    </h3>
                    <div className="text-center">
                      {(() => {
                        // Calculate performance score based on multiple factors
                        let score = 50; // Base score
                        if (basicData.revenueGrowth !== undefined && basicData.revenueGrowth > 0) score += 20;
                        if (basicData.salesGrowth !== undefined && basicData.salesGrowth > 0) score += 15;
                        if (basicData.customerRetention !== undefined && basicData.customerRetention > 50) score += 15;
                        score = Math.min(100, Math.max(0, score));
                        const percentage = score;
                        return (
                          <>
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
                                  strokeDashoffset={`${2 * Math.PI * 10 * (1 - percentage / 100)}`}
                                  className={percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-lg font-bold ${percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600">Overall Performance</p>
                            {basicData.revenueGrowth !== undefined && (
                              <p className={`text-[10px] mt-1 ${basicData.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {basicData.revenueGrowth >= 0 ? '+' : ''}{basicData.revenueGrowth.toFixed(1)}% revenue growth
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2">
                    <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                      <FaStar className="w-3 h-3 text-gray-400" />
                      Quick Insights
                    </h3>
                    <div className="space-y-2">
                      {basicData.topProducts && basicData.topProducts.length > 0 && (
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          <h4 className="font-medium text-gray-900 text-xs mb-0.5">Top Product</h4>
                          <p className="text-[10px] text-gray-600">
                            {basicData.topProducts[0].name} - Ksh {basicData.topProducts[0].revenue?.toLocaleString() || '0'}
                          </p>
                        </div>
                      )}
                      {basicData.totalRevenue !== undefined && (
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          <h4 className="font-medium text-gray-900 text-xs mb-0.5">Total Revenue</h4>
                          <p className="text-[10px] text-gray-600">Ksh {basicData.totalRevenue.toLocaleString()}</p>
                        </div>
                      )}
                      {basicData.customerRetention !== undefined && (
                        <div className="p-2 bg-gray-50 rounded border border-gray-200">
                          <h4 className="font-medium text-gray-900 text-xs mb-0.5">Retention</h4>
                          <p className="text-[10px] text-gray-600">{basicData.customerRetention.toFixed(1)}% repeat rate</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-3">
            {/* Time Range Selector */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Sales Trends Analysis</h2>
                <p className="mt-1 text-[11px] text-gray-500">
                  Comparisons below use the selected period vs the previous period.
                </p>
              </div>
              <div className="flex gap-2">
                {(['7d', '30d', '90d', '6m', '1y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setTrendsTimeRange(range);
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('analyticsTrendsRange', range);
                      }
                    }}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      trendsTimeRange === range
                        ? 'bg-slate-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : range === '6m' ? '6 Months' : '1 Year'}
                  </button>
                ))}
              </div>
            </div>

            {/* Trend Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(() => {
                const getTrendData = () => {
                  if (trendsTimeRange === '7d' && dailySales) return dailySales;
                  if (trendsTimeRange === '30d' && dailySales) return dailySales;
                  if (trendsTimeRange === '90d' && weeklySales) return weeklySales;
                  if (trendsTimeRange === '6m' && basicData?.salesByMonth) return basicData.salesByMonth;
                  if (trendsTimeRange === '1y' && yearlySales) return yearlySales;
                  return basicData?.salesByMonth || {};
                };
                
                const trendData = getTrendData();
                const values = Object.values(trendData).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
                const total = values.length > 0 ? values.reduce((sum, v) => sum + (v || 0), 0) : 0;
                const avg = values.length > 0 ? total / values.length : 0;
                const max = values.length > 0 ? Math.max(...values) : 0;
                const min = values.length > 0 ? Math.min(...values) : 0;
                
                // Calculate growth
                const sortedValues = [...values].sort((a, b) => a - b);
                const firstHalf = sortedValues.slice(0, Math.floor(sortedValues.length / 2));
                const secondHalf = sortedValues.slice(Math.floor(sortedValues.length / 2));
                const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length : 0;
                const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length : 0;
                const growth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

                return (
                  <>
                    <div className="bg-white rounded border border-gray-200 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-medium text-gray-600">Total Revenue</h3>
                        <FaChartLine className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Ksh {(total || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Over {trendsTimeRange}</p>
                    </div>
                    <div className="bg-white rounded border border-gray-200 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-medium text-gray-600">Average Daily</h3>
                        <FaChartBar className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Ksh {(avg || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-gray-500 mt-1">Per period</p>
                    </div>
                    <div className="bg-white rounded border border-gray-200 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-medium text-gray-600">Peak Period</h3>
                        <FaArrowUp className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Ksh {(max || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">Highest value</p>
                    </div>
                    <div className="bg-white rounded border border-gray-200 p-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-medium text-gray-600">Trend</h3>
                        {growth >= 0 ? (
                          <FaArrowUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <FaArrowUp className="w-4 h-4 text-red-600 rotate-180" />
                        )}
                      </div>
                      <p className={`text-sm font-semibold ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Growth rate</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Main Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Revenue Trend Chart */}
              <div className="bg-white rounded border border-gray-200 p-2">
                <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                  <FaChartLine className="w-3 h-3 text-gray-400" />
                  Revenue Trend
                </h3>
                {(() => {
                  const getChartData = () => {
                    try {
                      if (trendsTimeRange === '7d' && dailySales) {
                        return Object.entries(dailySales).slice(-7).map(([date, value]) => ({
                          label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                          value: (typeof value === 'number' && !isNaN(value)) ? value : 0,
                        }));
                      }
                      if (trendsTimeRange === '30d' && dailySales) {
                        return Object.entries(dailySales).slice(-30).map(([date, value]) => ({
                          label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          value: (typeof value === 'number' && !isNaN(value)) ? value : 0,
                        }));
                      }
                      if (trendsTimeRange === '90d' && weeklySales) {
                        return Object.entries(weeklySales).map(([week, value]) => ({
                          label: week,
                          value: (typeof value === 'number' && !isNaN(value)) ? value : 0,
                        }));
                      }
                      if (trendsTimeRange === '6m' && basicData?.salesByMonth) {
                        return Object.entries(basicData.salesByMonth).slice(-6).map(([month, value]) => ({
                          label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                          value: (typeof value === 'number' && !isNaN(value)) ? value : 0,
                        }));
                      }
                      if (trendsTimeRange === '1y' && yearlySales) {
                        return Object.entries(yearlySales).map(([year, value]) => ({
                          label: year,
                          value: (typeof value === 'number' && !isNaN(value)) ? value : 0,
                        }));
                      }
                    } catch (error) {
                      console.error('Error processing chart data:', error);
                    }
                    return [];
                  };

                  const chartData = getChartData();
                  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value || 0), 1) : 1;

                  return chartData.length > 0 ? (
                    <div className="h-64 flex items-end justify-between gap-1">
                      {chartData.map((data, index) => {
                        const value = data.value || 0;
                        return (
                          <div key={index} className="flex flex-col items-center flex-1 group">
                            <div
                              className="w-full bg-slate-500 rounded-t mb-2 transition-all hover:bg-slate-600 cursor-pointer relative"
                              style={{ height: `${(value / maxValue) * 240}px` }}
                              title={`${data.label}: Ksh ${value.toLocaleString()}`}
                            >
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                Ksh {value.toLocaleString()}
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-gray-600 text-center">{data.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                      No data available for this period
                    </div>
                  );
                })()}
              </div>

              {/* Top Products Trend */}
              <div className="bg-white rounded border border-gray-200 p-2">
                <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                  <FaChartPie className="w-3 h-3 text-gray-400" />
                  Top Products Performance
                </h3>
                {basicData?.topProducts && basicData.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {(() => {
                      const topProducts = basicData.topProducts!;
                      const totalRevenue = topProducts.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0);
                      return topProducts.slice(0, 5).map((product: any, index: number) => {
                        const revenue = product.revenue || 0;
                        const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                      return (
                        <div key={product.name || index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{product.name || 'Unknown'}</span>
                            <span className="text-sm font-bold text-gray-900">Ksh {(revenue || 0).toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-slate-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">{product.sales || 0} sales</span>
                            <span className="text-xs font-medium text-gray-600">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    });
                    })()}
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                    No product data available
                  </div>
                )}
              </div>
            </div>

            {/* Additional Trend Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {/* Sales Comparison */}
              <div className="bg-white rounded border border-gray-200 p-2">
                <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                  <FaChartBar className="w-3 h-3 text-gray-400" />
                  Period Comparison
                </h3>
                {(() => {
                  const currentData = trendsTimeRange === '7d' ? dailySales : 
                                     trendsTimeRange === '30d' ? dailySales :
                                     trendsTimeRange === '90d' ? weeklySales :
                                     trendsTimeRange === '6m' ? basicData?.salesByMonth : yearlySales;
                  const currentTotal = currentData ? Object.values(currentData).reduce((sum: number, v: any) => sum + ((typeof v === 'number' && !isNaN(v)) ? v : 0), 0) : 0;
                  const currentAvg = currentData && Object.keys(currentData).length > 0 
                    ? currentTotal / Object.keys(currentData).length 
                    : 0;
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">Current Period</span>
                        <span className="text-sm font-semibold text-gray-900">Ksh {currentTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">Average</span>
                        <span className="text-sm font-semibold text-gray-900">Ksh {currentAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm font-medium text-gray-700">Data Points</span>
                        <span className="text-sm font-semibold text-gray-900">{currentData ? Object.keys(currentData).length : 0}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Growth Indicators */}
              <div className="bg-white rounded border border-gray-200 p-2">
                <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                  <FaArrowUp className="w-3 h-3 text-gray-400" />
                  Growth Indicators
                </h3>
                {(() => {
                  const getGrowthData = () => {
                    const data = trendsTimeRange === '7d' ? dailySales : 
                                trendsTimeRange === '30d' ? dailySales :
                                trendsTimeRange === '90d' ? weeklySales :
                                trendsTimeRange === '6m' ? basicData?.salesByMonth : yearlySales;
                    if (!data) return null;
                    const values = Object.values(data).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
                    if (values.length < 2) return null;
                    const firstHalf = values.slice(0, Math.floor(values.length / 2));
                    const secondHalf = values.slice(Math.floor(values.length / 2));
                    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, v) => s + (v || 0), 0) / firstHalf.length : 0;
                    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, v) => s + (v || 0), 0) / secondHalf.length : 0;
                    const growth = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
                    return { growth, firstAvg: firstAvg || 0, secondAvg: secondAvg || 0 };
                  };
                  
                  const growthData = getGrowthData();
                  
                  return growthData ? (
                    <div className="space-y-3">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-sm font-semibold text-gray-900">
                          {growthData.growth >= 0 ? '+' : ''}{growthData.growth.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Growth Rate</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-gray-50 rounded text-center">
                          <p className="text-xs text-gray-600">Early Avg</p>
                          <p className="text-sm font-bold text-gray-900">Ksh {growthData.firstAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-center">
                          <p className="text-xs text-gray-600">Recent Avg</p>
                          <p className="text-sm font-bold text-gray-900">Ksh {growthData.secondAvg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      Insufficient data for comparison
                    </div>
                  );
                })()}
              </div>

              {/* Trend Insights */}
              <div className="bg-white rounded border border-gray-200 p-2">
                <h3 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                  <FaBrain className="w-3 h-3 text-gray-400" />
                  Trend Insights
                </h3>
                {(() => {
                  const getInsights = () => {
                    const data = trendsTimeRange === '7d' ? dailySales : 
                                trendsTimeRange === '30d' ? dailySales :
                                trendsTimeRange === '90d' ? weeklySales :
                                trendsTimeRange === '6m' ? basicData?.salesByMonth : yearlySales;
                    if (!data) return [];
                    const values = Object.values(data).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
                    if (values.length === 0) return [];
                    const entries = Object.entries(data);
                    const maxEntry = entries.reduce((max, [k, v]) => {
                      const numVal = typeof v === 'number' && !isNaN(v) ? v : 0;
                      const maxVal = typeof max[1] === 'number' && !isNaN(max[1]) ? max[1] : 0;
                      return numVal > maxVal ? [k, numVal] : max;
                    }, ['', 0] as [string, number]);
                    const minEntry = entries.reduce((min, [k, v]) => {
                      const numVal = typeof v === 'number' && !isNaN(v) ? v : Infinity;
                      const minVal = typeof min[1] === 'number' && !isNaN(min[1]) ? min[1] : Infinity;
                      return numVal < minVal ? [k, numVal] : min;
                    }, ['', Infinity] as [string, number]);
                    const avg = values.length > 0 ? values.reduce((s, v) => s + (v || 0), 0) / values.length : 0;
                    const variance = values.length > 0 ? values.reduce((s, v) => s + Math.pow((v || 0) - avg, 2), 0) / values.length : 0;
                    const stdDev = Math.sqrt(variance);
                    const consistency = avg > 0 && stdDev / avg < 0.3 ? 'High' : avg > 0 && stdDev / avg < 0.6 ? 'Medium' : 'Low';
                    
                    return [
                      { label: 'Best Period', value: maxEntry[0] || 'N/A', amount: typeof maxEntry[1] === 'number' ? maxEntry[1] : 0 },
                      { label: 'Lowest Period', value: minEntry[0] || 'N/A', amount: typeof minEntry[1] === 'number' && minEntry[1] !== Infinity ? minEntry[1] : 0 },
                      { label: 'Consistency', value: consistency },
                    ];
                  };
                  
                  const insights = getInsights();
                  
                  return insights.length > 0 ? (
                    <div className="space-y-2">
                      {insights.map((insight, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-600 mb-1">{insight.label}</p>
                          <p className="text-sm font-bold text-gray-900">
                            {insight.value}
                            {insight.amount !== undefined && insight.amount !== null && ` - Ksh ${(insight.amount || 0).toLocaleString()}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No insights available
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Day of Week Analysis & Additional Charts */}
            {trendsTimeRange === '30d' && dailySales && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Day of Week Analysis */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaChartBar className="w-4 h-4 text-purple-600" />
                    Sales by Day of Week
                  </h3>
                  {(() => {
                    const dayOfWeekData: Record<string, number> = {};
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    
                    Object.entries(dailySales).forEach(([date, value]) => {
                      try {
                        const day = new Date(date).getDay();
                        const dayName = dayNames[day];
                        const numValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;
                        dayOfWeekData[dayName] = (dayOfWeekData[dayName] || 0) + numValue;
                      } catch (error) {
                        // Skip invalid dates
                      }
                    });

                    const sortedDays = dayNames.map(day => ({
                      day,
                      revenue: (dayOfWeekData[day] && typeof dayOfWeekData[day] === 'number') ? dayOfWeekData[day] : 0,
                    }));

                    const maxRevenue = sortedDays.length > 0 ? Math.max(...sortedDays.map(d => d.revenue || 0), 1) : 1;

                    return (
                      <div className="space-y-3">
                        {sortedDays.map(({ day, revenue }) => (
                          <div key={day}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{day}</span>
                              <span className="text-sm font-bold text-gray-900">Ksh {(revenue || 0).toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${(revenue / maxRevenue) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Velocity Metrics */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaChartLine className="w-4 h-4 text-blue-600" />
                    Sales Velocity
                  </h3>
                  {(() => {
                    const timeRange = trendsTimeRange as '7d' | '30d' | '90d' | '6m' | '1y';
                    const data = timeRange === '7d' ? dailySales : 
                                timeRange === '30d' ? dailySales :
                                timeRange === '90d' ? weeklySales :
                                timeRange === '6m' ? basicData?.salesByMonth : yearlySales;
                    if (!data) return null;
                    
                    const values = Object.values(data).filter(v => typeof v === 'number' && !isNaN(v)) as number[];
                    if (values.length === 0) return null;
                    const sortedValues = [...values].sort((a, b) => a - b);
                    const median = sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length / 2)] : 0;
                    const q1 = sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length * 0.25)] : 0;
                    const q3 = sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length * 0.75)] : 0;
                    const iqr = q3 - q1;
                    const avg = values.length > 0 ? values.reduce((s, v) => s + (v || 0), 0) / values.length : 0;
                    const maxValue = values.length > 0 ? Math.max(...values, 1) : 1;
                    
                    // Calculate momentum (rate of change)
                    const recentValues = values.slice(-Math.min(7, values.length));
                    const olderValues = values.slice(0, Math.max(0, values.length - 7));
                    const recentAvg = recentValues.reduce((s, v) => s + v, 0) / recentValues.length;
                    const olderAvg = olderValues.length > 0 ? olderValues.reduce((s, v) => s + v, 0) / olderValues.length : recentAvg;
                    const momentum = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

                    return (
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-600 mb-1">Average Daily</p>
                          <p className="text-xl font-bold text-blue-600">Ksh {avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Median</p>
                            <p className="text-sm font-bold text-gray-900">Ksh {median.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-xs text-gray-600">Momentum</p>
                            <p className={`text-sm font-bold ${momentum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {momentum >= 0 ? '+' : ''}{momentum.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">Distribution Range</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Q1: Ksh {q1.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="text-gray-600">Q3: Ksh {q3.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                              style={{ width: `${Math.min((iqr / maxValue) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Comparison Chart */}
            {basicData?.salesByMonth && Object.keys(basicData.salesByMonth).length >= 2 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaChartLine className="w-4 h-4 text-green-600" />
                  Month-over-Month Comparison
                </h3>
                {(() => {
                  const months = Object.entries(basicData.salesByMonth).slice(-6);
                  if (months.length < 2) {
                    return (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Insufficient data for comparison
                      </div>
                    );
                  }
                  const currentMonth = months[months.length - 1];
                  const previousMonth = months[months.length - 2];
                  const currentValue = (typeof currentMonth[1] === 'number' && !isNaN(currentMonth[1])) ? currentMonth[1] : 0;
                  const previousValue = (typeof previousMonth[1] === 'number' && !isNaN(previousMonth[1])) ? previousMonth[1] : 0;
                  const change = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
                  
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-1">Current Month</p>
                        <p className="text-2xl font-bold text-blue-600">Ksh {currentValue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(currentMonth[0] + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-1">Previous Month</p>
                        <p className="text-2xl font-bold text-green-600">Ksh {previousValue.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(previousMonth[0] + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="col-span-2 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Change</span>
                          <div className="flex items-center gap-2">
                            {change >= 0 ? (
                              <FaArrowUp className="w-5 h-5 text-green-600" />
                            ) : (
                              <FaArrowUp className="w-5 h-5 text-red-600 rotate-180" />
                            )}
                            <span className={`text-2xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {change >= 0 ? 'Increase' : 'Decrease'} of Ksh {Math.abs(currentValue - previousValue).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'segments' && (
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-gray-900">Customer Segments</h2>
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
            <h2 className="text-sm font-semibold text-gray-900">Predictive Analytics</h2>
            {advancedData?.predictiveAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-white rounded border border-gray-200 p-2">
                  <h3 className="text-xs font-semibold mb-2">Forecast Data</h3>
                  <p className="text-sm font-semibold text-gray-900">
                    ${advancedData.predictiveAnalytics.nextMonthForecast?.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-gray-500">Next month forecast</p>
                </div>
                <div className="bg-white rounded border border-gray-200 p-2">
                  <h3 className="text-xs font-semibold mb-2">Growth Rate</h3>
                  <p className="text-sm font-semibold text-gray-900">
                    {advancedData.predictiveAnalytics.growthRate?.toFixed(1)}%
                  </p>
                  <p className="text-[11px] text-gray-500">Predicted growth</p>
                </div>
              </div>
            )}
            <AIInsights insights={enterpriseData?.aiInsights || { recommendations: [], anomalies: [] }} />
          </div>
        )}

        {activeTab === 'reports' && (
          <ReportsTab 
            basicData={basicData}
            advancedData={advancedData}
            user={user}
          />
        )}
      </div>
    </AuthGuard>
  );
}