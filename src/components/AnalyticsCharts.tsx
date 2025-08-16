"use client";
import { useEffect, useState, useMemo } from 'react';
import { FaChartLine, FaChartBar, FaChartPie, FaFilter, FaBoxes, FaUsers, FaDollarSign } from 'react-icons/fa';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    tension?: number;
    borderRadius?: number;
  }>;
}

type AnalyticsChartsProps = {
  salesData?: Record<string, number>;
  dailySalesData?: Record<string, number>;
  weeklySalesData?: Record<string, number>;
  productData?: Array<{ name: string; unitsSold: number; revenue: number; margin?: number }>;
  inventoryAnalytics?: { lowStockItems?: number; overstockItems?: number; inventoryTurnover?: number; stockoutRate?: number };
  customerRetention?: { totalCustomers: number; repeatCustomers: number; retentionRate: number };
};

export default function AnalyticsCharts({ salesData, dailySalesData, weeklySalesData, productData, inventoryAnalytics, customerRetention }: AnalyticsChartsProps) {
  const [filter, setFilter] = useState<'month' | 'week' | 'day'>('month');
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'inventory' | 'customers'>('sales');

  const salesChartData = useMemo(() => {
    let data: Record<string, number> = salesData || {};
    if (filter === 'day' && dailySalesData) {
      data = dailySalesData;
    } else if (filter === 'week' && weeklySalesData) {
      data = weeklySalesData;
    }
    return {
      labels: Object.keys(data),
      datasets: [
        {
          label: filter === 'day' ? 'Daily Sales' : filter === 'week' ? 'Weekly Sales' : 'Monthly Sales',
          data: Object.values(data),
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [salesData, dailySalesData, weeklySalesData, filter]);

  const productChartData: ChartData = {
    labels: productData ? productData.map(p => p.name) : [],
    datasets: [
      {
        label: 'Units Sold',
        data: productData ? productData.map(p => p.unitsSold) : [],
        backgroundColor: '#6366F1',
        borderRadius: 4,
      },
      {
        label: 'Revenue',
        data: productData ? productData.map(p => p.revenue) : [],
        backgroundColor: '#10B981',
        borderRadius: 4,
      },
    ],
  };

  const marginChartData: ChartData = {
    labels: productData ? productData.map(p => p.name) : [],
    datasets: [
      {
        label: 'Profit Margin (%)',
        data: productData ? productData.map(p => (p.margin ?? 0) * 100) : [],
        backgroundColor: productData ? productData.map(p => (p.margin ?? 0) * 100 > 30 ? '#10B981' : (p.margin ?? 0) * 100 > 15 ? '#F59E0B' : '#EF4444') : [],
        borderRadius: 4,
      },
    ],
  };

  const inventoryChartData: ChartData = {
    labels: ['Low Stock', 'Overstock', 'Turnover', 'Stockout Rate'],
    datasets: [
      {
        label: 'Inventory Metrics',
        data: [
          inventoryAnalytics?.lowStockItems ?? 0,
          inventoryAnalytics?.overstockItems ?? 0,
          inventoryAnalytics?.inventoryTurnover ?? 0,
          (inventoryAnalytics?.stockoutRate ?? 0) * 100
        ],
        backgroundColor: [
          '#F59E0B',
          '#EF4444',
          '#10B981',
          '#6366F1'
        ],
        borderRadius: 4,
      },
    ],
  };

  const retentionChartData: ChartData = {
    labels: ['Retention Rate', 'Churn Rate'],
    datasets: [
      {
        label: 'Customer Retention',
        data: [
          (customerRetention?.retentionRate ?? 0) * 100,
          (1 - (customerRetention?.retentionRate ?? 0)) * 100
        ],
        backgroundColor: ['#10B981', '#EF4444'],
      },
    ],
  };

  const summaryCards = [
    {
      title: 'Total Sales',
      value: `$${Object.values(salesData || {}).reduce((a, b) => a + b, 0).toLocaleString()}`,
      change: 12.5,
      icon: <FaDollarSign className="text-indigo-500" />,
      trend: 'up'
    },
    {
      title: 'Top Product',
      value: productData?.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current).name || 'N/A',
      change: 8.2,
      icon: <FaBoxes className="text-green-500" />,
      trend: 'up'
    },
    {
      title: 'Customer Retention',
      value: `${((customerRetention?.retentionRate || 0) * 100).toFixed(1)}%`,
      change: ((customerRetention?.retentionRate || 0) * 100) - 75,
      icon: <FaUsers className="text-blue-500" />,
      trend: ((customerRetention?.retentionRate || 0) * 100) > 75 ? 'up' : 'down'
    },
    {
      title: 'Inventory Issues',
      value: `${inventoryAnalytics?.lowStockItems || 0} items`,
      change: -5.3,
      icon: <FaBoxes className="text-amber-500" />,
      trend: 'down'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitor your business performance and key metrics</p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <h3 className="text-2xl font-semibold text-gray-900 mt-1">{card.value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${card.trend === 'up' ? 'bg-green-50' : 'bg-red-50'}`}>
                  {card.icon}
                </div>
              </div>
              <div className={`flex items-center mt-4 text-sm ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {card.trend === 'up' ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                <span>{Math.abs(card.change)}% {card.trend === 'up' ? 'increase' : 'decrease'} from last period</span>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'sales' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FaChartLine className="mr-2" /> Sales
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'products' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FaChartBar className="mr-2" /> Products
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'inventory' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FaBoxes className="mr-2" /> Inventory
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === 'customers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FaUsers className="mr-2" /> Customers
          </button>
        </div>

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50">
                    <FaChartLine className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Sales Trend</h3>
                    <p className="text-sm text-gray-500">Track your sales performance over time</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${filter === 'month' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setFilter('month')}
                  >
                    Monthly
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${filter === 'week' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setFilter('week')}
                  >
                    Weekly
                  </button>
                  <button
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${filter === 'day' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setFilter('day')}
                  >
                    Daily
                  </button>
                </div>
              </div>
              <div className="h-80">
                <Line 
                  data={salesChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false },
                      tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#1F2937',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: {
                        grid: {
                          drawBorder: false,
                          color: '#E5E7EB'
                        },
                        ticks: {
                          callback: function(value) {
                            return '$' + value;
                          }
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && productData && productData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <FaChartBar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Product Performance</h3>
                  <p className="text-sm text-gray-500">Units sold vs revenue generated</p>
                </div>
              </div>
              <div className="h-80">
                <Bar 
                  data={productChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 20
                        }
                      },
                      tooltip: {
                        backgroundColor: '#1F2937',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: {
                        grid: {
                          drawBorder: false,
                          color: '#E5E7EB'
                        },
                        ticks: {
                          callback: function(value) {
                            return value === 0 ? value : '$' + value;
                          }
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-green-50">
                  <FaChartBar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Profit Margins</h3>
                  <p className="text-sm text-gray-500">Profitability by product</p>
                </div>
              </div>
              <div className="h-80">
                <Bar 
                  data={marginChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return context.dataset.label + ': ' + context.raw + '%';
                          }
                        },
                        backgroundColor: '#1F2937',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: {
                        grid: {
                          drawBorder: false,
                          color: '#E5E7EB'
                        },
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          }
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-amber-50">
                  <FaBoxes className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Inventory Analytics</h3>
                  <p className="text-sm text-gray-500">Key inventory metrics and movement</p>
                </div>
              </div>
              <div className="h-80">
                <Bar 
                  data={inventoryChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.label === 'Stockout Rate') {
                              label += context.raw + '%';
                            } else {
                              label += context.raw;
                            }
                            return label;
                          }
                        },
                        backgroundColor: '#1F2937',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: {
                        grid: {
                          drawBorder: false,
                          color: '#E5E7EB'
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-50">
                  <FaUsers className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Customer Retention</h3>
                  <p className="text-sm text-gray-500">Repeat customers vs churn rate</p>
                </div>
              </div>
              <div className="h-80">
                <Pie 
                  data={retentionChartData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        position: 'right',
                        labels: {
                          usePointStyle: true,
                          padding: 20
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            return context.label + ': ' + context.raw + '%';
                          }
                        },
                        backgroundColor: '#1F2937',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 12,
                        cornerRadius: 8
                      }
                    }
                  }} 
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-50">
                  <FaUsers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Customer Insights</h3>
                  <p className="text-sm text-gray-500">Key customer metrics</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Customers</p>
                    <h3 className="text-xl font-semibold text-gray-900">{customerRetention?.totalCustomers || 0}</h3>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <FaUsers className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Repeat Customers</p>
                    <h3 className="text-xl font-semibold text-gray-900">{customerRetention?.repeatCustomers || 0}</h3>
                  </div>
                  <div className="p-3 rounded-lg bg-green-100 text-green-600">
                    <FiTrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Retention Rate</p>
                    <h3 className="text-xl font-semibold text-gray-900">{((customerRetention?.retentionRate || 0) * 100).toFixed(1)}%</h3>
                  </div>
                  <div className={`p-3 rounded-lg ${(customerRetention?.retentionRate || 0) * 100 > 75 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                    {(customerRetention?.retentionRate || 0) * 100 > 75 ? 
                      <FiTrendingUp className="w-5 h-5" /> : 
                      <FiTrendingDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}