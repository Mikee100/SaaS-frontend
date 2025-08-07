"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import PlanGuard from '@/components/PlanGuard';
import FeatureGuard from '@/components/FeatureGuard';
import AuthGuard from '@/components/AuthGuard';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import InventoryAnalytics from '@/components/InventoryAnalytics';
import AIInsights from '@/components/AIInsights';
import AdvancedSegments from '@/components/AdvancedSegments';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaShare, FaCrown, FaStar, FaLock, FaArrowUp, FaBrain, FaUsers, FaBox } from 'react-icons/fa';
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
        } catch (error) {
          console.log('Advanced analytics not available');
        }

        // Try to fetch enterprise analytics (Enterprise only)
        try {
          const enterprise = await apiGet('/analytics/enterprise') as AnalyticsData;
          setEnterpriseData(enterprise);
        } catch (error) {
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
          <p className="text-gray-600 mb-4">You don't have permission to view analytics.</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Track your business performance and insights</p>
      </div>

      {/* Basic Analytics - Available to all plans */}
      {basicData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Total Sales</h3>
                <FaChartLine className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{basicData.totalSales?.toLocaleString() || '0'}</p>
              <p className="text-sm text-gray-600">All time sales</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Total Revenue</h3>
                <FaChartBar className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${basicData.totalRevenue?.toLocaleString() || '0'}</p>
              <p className="text-sm text-gray-600">All time revenue</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Products</h3>
                <FaChartPie className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{basicData.totalProducts?.toLocaleString() || '0'}</p>
              <p className="text-sm text-gray-600">Active products</p>
            </div>
          </div>

          {/* Enhanced Basic Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Customers</h3>
                <FaUsers className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{basicData.totalCustomers?.toLocaleString() || '0'}</p>
              <p className="text-sm text-gray-600">Total customers</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Avg Order Value</h3>
                <FaBox className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">${basicData.averageOrderValue?.toFixed(2) || '0'}</p>
              <p className="text-sm text-gray-600">Per transaction</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Conversion Rate</h3>
                <FaBrain className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{((basicData.conversionRate || 0) * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Visitor to customer</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Growth Rate</h3>
                <FaChartLine className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">+15.2%</p>
              <p className="text-sm text-gray-600">Month over month</p>
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
                      <p className="text-sm text-purple-600">Today's earnings</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-900">${enterpriseData.realTimeData?.revenueToday.toLocaleString() || '0'}</p>
                  </div>
                </div>
              </div>

              {/* Export & Share Options */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Export & Share</h3>
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
      </div>
    </AuthGuard>
  );
} 