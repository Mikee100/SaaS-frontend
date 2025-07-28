"use client";
import { useEffect, useState } from 'react';
import { apiGet } from '@/utils/api';
import PlanGuard from '@/components/PlanGuard';
import { FaChartLine, FaChartBar, FaChartPie, FaDownload, FaShare, FaCrown, FaStar } from 'react-icons/fa';

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
}

export default function AnalyticsPage() {
  const [basicData, setBasicData] = useState<AnalyticsData | null>(null);
  const [advancedData, setAdvancedData] = useState<AnalyticsData | null>(null);
  const [enterpriseData, setEnterpriseData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Track your business performance and insights</p>
      </div>

      {/* Basic Analytics - Available to all plans */}
      {basicData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Total Sales</h3>
              <FaChartLine className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{basicData.totalSales?.toLocaleString() || 0}</p>
            <p className="text-sm text-green-600">+12% from last month</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Total Revenue</h3>
              <FaChartBar className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">${basicData.totalRevenue?.toLocaleString() || 0}</p>
            <p className="text-sm text-green-600">+8% from last month</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Products</h3>
              <FaChartPie className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{basicData.totalProducts || 0}</p>
            <p className="text-sm text-green-600">+15% from last month</p>
          </div>
        </div>
      )}

      {/* Pro Plan Features */}
      <PlanGuard requiredPlan="Pro">
        {advancedData && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Advanced Analytics</h2>
              <div className="flex items-center gap-2">
                <FaStar className="w-4 h-4 text-blue-600" />
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Pro Feature
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Monthly Sales Trend</h3>
                <div className="space-y-3">
                  {advancedData.salesByMonth && Object.entries(advancedData.salesByMonth).map(([month, sales]) => (
                    <div key={month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-800">{month}</span>
                      <span className="font-semibold text-green-600">${sales.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Top Products</h3>
                <div className="space-y-3">
                  {advancedData.topProducts?.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.sales} sales</p>
                      </div>
                      <p className="font-semibold text-green-600">${product.revenue}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </PlanGuard>

      {/* Enterprise Plan Features */}
      <PlanGuard requiredPlan="Enterprise">
        {enterpriseData && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Enterprise Analytics</h2>
              <div className="flex items-center gap-2">
                <FaCrown className="w-4 h-4 text-yellow-600" />
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  Enterprise Feature
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Real-time Data</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Current Users</p>
                    <p className="text-2xl font-bold text-green-600">{enterpriseData.realTimeData?.currentUsers || 0}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Active Sales</p>
                    <p className="text-2xl font-bold text-blue-600">{enterpriseData.realTimeData?.activeSales || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Revenue Today</p>
                    <p className="text-2xl font-bold text-purple-600">${enterpriseData.realTimeData?.revenueToday?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Predictive Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Next Month Forecast</p>
                    <p className="text-2xl font-bold text-blue-600">${enterpriseData.predictiveAnalytics?.nextMonthForecast?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Growth Rate</p>
                    <p className="text-2xl font-bold text-green-600">{((enterpriseData.predictiveAnalytics?.growthRate || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Churn Risk</p>
                    <p className="text-2xl font-bold text-red-600">{((enterpriseData.predictiveAnalytics?.churnRisk || 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PlanGuard>

      {/* Feature-based Protection */}
      <PlanGuard requiredFeature="advanced_reports">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Advanced Reports</h2>
          <p className="text-gray-600 mb-4">
            Generate detailed reports with custom filters and advanced analytics.
          </p>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <FaDownload className="w-4 h-4" />
              Generate Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <FaShare className="w-4 h-4" />
              Share Report
            </button>
          </div>
        </div>
      </PlanGuard>
    </div>
  );
} 