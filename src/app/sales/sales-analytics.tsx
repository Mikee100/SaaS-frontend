"use client";
import { useCallback, useState, useEffect } from 'react';
import { FaChartLine, FaDollarSign, FaShoppingCart, FaUsers, FaArrowDown, FaTimes } from 'react-icons/fa';
import { apiGet } from '@/utils/api';

interface SalesMetrics {
  todaySales: number;
  todayTransactions: number;
  averageOrderValue: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  hourlySales: Array<{
    hour: number;
    sales: number;
  }>;
  customerCount: number;
  growthRate: number;
}

interface SalesAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SalesAnalytics({ isOpen, onClose }: SalesAnalyticsProps) {
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/analytics/sales?range=${timeRange}`);
      setMetrics(data as SalesMetrics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, timeRange, fetchAnalytics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <FaChartLine className="text-blue-600" />
            Sales Analytics
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeRange(e.target.value as 'today' | 'week' | 'month')}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          ) : metrics ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaDollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Total Sales</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">${metrics.todaySales.toFixed(2)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {metrics.growthRate > 0 ? (
                      <FaChartLine className="w-3 h-3 text-green-600" />
                    ) : (
                      <FaArrowDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`text-xs ${metrics.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(metrics.growthRate)}% from yesterday
                    </span>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaShoppingCart className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Transactions</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{metrics.todayTransactions}</p>
                  <p className="text-xs text-green-700 mt-1">Today&apos;s orders</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaDollarSign className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Average Order</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">${metrics.averageOrderValue.toFixed(2)}</p>
                  <p className="text-xs text-purple-700 mt-1">Per transaction</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaUsers className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Customers</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{metrics.customerCount}</p>
                  <p className="text-xs text-orange-700 mt-1">Unique customers</p>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Top Selling Products</h4>
                <div className="space-y-2">
                  {metrics.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-800">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-800">{product.quantity} sold</p>
                        <p className="text-xs text-gray-600">${product.revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly Sales Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Hourly Sales Trend</h4>
                <div className="h-48 flex items-end justify-between gap-1">
                  {metrics.hourlySales.map((hourData, index) => {
                    const maxSales = Math.max(...metrics.hourlySales.map(h => h.sales));
                    const height = maxSales > 0 ? (hourData.sales / maxSales) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                          style={{ height: `${height}%` }}
                          title={`${hourData.hour}:00 - $${hourData.sales.toFixed(2)}`}
                        />
                        <span className="text-xs text-gray-600 mt-1">{hourData.hour}:00</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Peak Hours</h4>
                  <p className="text-sm text-yellow-700">
                    {(() => {
                      const peakHour = metrics.hourlySales.reduce((max, current) => 
                        current.sales > max.sales ? current : max
                      );
                      return `${peakHour.hour}:00 - $${peakHour.sales.toFixed(2)}`;
                    })()}
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">Performance</h4>
                  <p className="text-sm text-green-700">
                    {metrics.growthRate > 0 ? 'Up' : 'Down'} {Math.abs(metrics.growthRate)}% from previous period
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FaChartLine className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No analytics data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}