"use client";
import { useEffect, useState, useMemo } from 'react';
import { FaChartLine, FaChartBar, FaChartPie, FaFilter, FaBoxes, FaUsers, FaDollarSign, FaShoppingCart } from 'react-icons/fa';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import KPICard from './KPICard';
import MiniChart from './MiniChart';
import DateRangePicker from './DateRangePicker';

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
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
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
  salesByCategory?: Record<string, number>;
  customerGrowth?: Record<string, number>;
  orderData?: Array<{ date: string; amount: number; itemsCount: number }>;
};

export default function AnalyticsCharts({ 
  salesData = {}, 
  dailySalesData = {}, 
  weeklySalesData = {},
  productData = [], 
  inventoryAnalytics = {},
  customerRetention = { totalCustomers: 0, repeatCustomers: 0, retentionRate: 0 },
  salesByCategory = {},
  customerGrowth = {},
  orderData = []
}: AnalyticsChartsProps) {
  const [filter, setFilter] = useState<'month' | 'week' | 'day'>('month');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ 
    start: null, 
    end: null 
  });

  // Calculate metrics from database
  const totalRevenue = Object.values(salesData).reduce((sum, amount) => sum + amount, 0);
  const totalOrders = orderData.length;
  const totalProducts = productData.length;
  const totalCustomers = customerRetention?.totalCustomers || 0;
  
  // Calculate month-over-month changes
  const monthlySales = Object.entries(salesData).sort(([dateA], [dateB]) => 
    new Date(dateA).getTime() - new Date(dateB).getTime()
  );
  
  const lastMonthRevenue = monthlySales.length >= 2 
    ? monthlySales[monthlySales.length - 2][1] 
    : 0;
  const currentMonthRevenue = monthlySales.length > 0 
    ? monthlySales[monthlySales.length - 1][1] 
    : 0;
  const revenueChange = lastMonthRevenue !== 0 
    ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
    : 0;

  // Calculate order change (simplified - you might want to implement more sophisticated logic)
  const orderChange = 8.2; // Replace with actual calculation if order history is available
  
  // Calculate product count change (simplified)
  const productChange = 3.1; // Replace with actual calculation if historical product data is available

  // KPI cards data
  const kpiData = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: parseFloat(revenueChange.toFixed(1)),
      icon: <FaDollarSign className="w-5 h-5 text-indigo-600" />,
      chartData: Object.values(salesData).slice(-12) // Last 12 data points
    },
    {
      title: 'Total Orders',
      value: totalOrders.toLocaleString(),
      change: orderChange,
      icon: <FaShoppingCart className="w-5 h-5 text-green-600" />,
      chartData: orderData.slice(-12).map(order => order.itemsCount || 1) // Last 12 orders
    },
    {
      title: 'Products',
      value: totalProducts.toString(),
      change: productChange,
      icon: <FaBoxes className="w-5 h-5 text-blue-600" />,
      chartData: productData.slice(0, 12).map(p => p.unitsSold || 0) // First 12 products
    },
    {
      title: 'Customers',
      value: totalCustomers.toLocaleString(),
      change: customerRetention.retentionRate ? parseFloat((customerRetention.retentionRate * 100).toFixed(1)) : 0,
      icon: <FaUsers className="w-5 h-5 text-purple-600" />,
      chartData: customerGrowth ? Object.values(customerGrowth).slice(-12) : [] // Last 12 data points
    }
  ];

  const filterDataByDateRange = (data: Record<string, number>, startDate: Date | null, endDate: Date | null) => {
    if (!startDate || !endDate) return data;
    
    return Object.entries(data).reduce((acc, [date, value]) => {
      const currentDate = new Date(date);
      if (currentDate >= startDate && currentDate <= endDate) {
        acc[date] = value;
      }
      return acc;
    }, {} as Record<string, number>);
  };

  const salesChartData = useMemo(() => {
    // Select the appropriate data source based on the filter
    let data: Record<string, number> = {};
    
    switch (filter) {
      case 'day':
        data = dailySalesData || {};
        break;
      case 'week':
        data = weeklySalesData || {};
        break;
      case 'month':
      default:
        data = salesData || {};
    }

    // Apply date range filter if dates are selected
    if (dateRange.start && dateRange.end) {
      data = filterDataByDateRange(data, dateRange.start, dateRange.end);
    }

    // Sort by date to ensure chronological order
    const sortedEntries = Object.entries(data).sort(([dateA], [dateB]) => 
      new Date(dateA).getTime() - new Date(dateB).getTime()
    );

    // Format labels based on the selected filter
    const formatLabel = (dateString: string) => {
      const date = new Date(dateString);
      switch (filter) {
        case 'day':
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case 'week':
          return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        case 'month':
        default:
          return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      }
    };

    return {
      labels: sortedEntries.map(([date]) => formatLabel(date)),
      datasets: [
        {
          label: filter === 'day' ? 'Daily Sales' : filter === 'week' ? 'Weekly Sales' : 'Monthly Sales',
          data: sortedEntries.map(([_, value]) => value),
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [salesData, dailySalesData, weeklySalesData, filter, dateRange]);

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

  const categoryChartData: ChartData = {
    labels: salesByCategory ? Object.keys(salesByCategory) : [],
    datasets: [
      {
        label: 'Sales by Category',
        data: salesByCategory ? Object.values(salesByCategory) : [],
        backgroundColor: [
          '#6366F1',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#3B82F6'
        ],
      },
    ],
  };

  const growthChartData: ChartData = {
    labels: customerGrowth ? Object.keys(customerGrowth) : [],
    datasets: [
      {
        label: 'Customer Growth',
        data: customerGrowth ? Object.values(customerGrowth) : [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const { revenueTrendData, aovData } = useMemo(() => {
    const groupedOrders = orderData.reduce((acc, order) => {
      const date = new Date(order.date);
      let key;
      
      if (filter === 'day') {
        key = date.toLocaleDateString();
      } else if (filter === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week ${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}`;
      } else {
        key = date.toLocaleString('default', { month: 'short' });
      }
      
      if (!acc[key]) {
        acc[key] = { totalAmount: 0, orderCount: 0 };
      }
      
      acc[key].totalAmount += order.amount;
      acc[key].orderCount += 1;
      
      return acc;
    }, {} as Record<string, { totalAmount: number; orderCount: number }>);

    const aovLabels = Object.keys(groupedOrders);
    const aovValues = aovLabels.map(key => 
      groupedOrders[key].orderCount > 0 
        ? groupedOrders[key].totalAmount / groupedOrders[key].orderCount 
        : 0
    );

    const revenueLabels = Object.keys(salesData || {});
    const revenueValues = Object.values(salesData || {});

    return {
      revenueTrendData: {
        labels: revenueLabels,
        datasets: [{
          label: 'Revenue',
          data: revenueValues,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      },
      aovData: {
        labels: aovLabels,
        datasets: [{
          label: 'Average Order Value',
          data: aovValues,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      }
    };
  }, [salesData, orderData, filter]);

  const categoryData = useMemo(() => ({
    labels: Object.keys(salesByCategory),
    datasets: [{
      data: Object.values(salesByCategory),
      backgroundColor: [
        '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#8B5CF6'
      ],
      borderWidth: 1,
    }]
  }), [salesByCategory]);

  const topProductsData = useMemo(() => {
    const sortedProducts = [...(productData || [])]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    return {
      labels: sortedProducts.map(p => p.name),
      datasets: [{
        label: 'Units Sold',
        data: sortedProducts.map(p => p.unitsSold),
        backgroundColor: '#4F46E5',
        borderRadius: 4,
      }]
    };
  }, [productData]);

  const tabs = [
    { id: 'sales', label: 'Revenue Trend', icon: <FaChartLine /> },
    { id: 'category', label: 'Sales by Category', icon: <FaChartPie /> },
    { id: 'products', label: 'Top Products', icon: <FaChartBar /> },
    { id: 'aov', label: 'Avg Order Value', icon: <FaDollarSign /> },
    { id: 'inventory', label: 'Inventory', icon: <FaBoxes /> },
    { id: 'customers', label: 'Customers', icon: <FaUsers /> },
  ];

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
      value: (Array.isArray(productData) && productData.length > 0)
        ? productData.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current, productData[0]).name
        : 'N/A',
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
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Monitor your business performance and key metrics</p>
          </div>
          <DateRangePicker 
            onDateRangeChange={setDateRange}
            className="w-full md:w-auto"
          />
        </header>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value}
              change={kpi.change}
              icon={kpi.icon}
              chartData={kpi.chartData}
            />
          ))}
        </div>

        {/* Mini Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Sales Trend</h3>
            <div className="h-32">
              <MiniChart 
                data={[30, 40, 35, 50, 49, 60, 70, 91, 125, 110, 120, 140]} 
                color="#4F46E5"
                showPoints={false}
              />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Order Volume</h3>
            <div className="h-32">
              <MiniChart 
                data={[10, 20, 15, 25, 30, 40, 35, 45, 50, 55, 60, 65]} 
                color="#10B981"
                showPoints={true}
              />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Customer Growth</h3>
            <div className="h-32">
              <MiniChart 
                data={[15, 20, 18, 25, 30, 28, 35, 40, 38, 45, 42, 50]} 
                color="#8B5CF6"
                showPoints={false}
              />
            </div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
              <p className="text-sm text-gray-500">Key metrics and trends for your business</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
          </div>
          
          <div className="h-96">
            {filter === 'day' && (
              <Line 
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (context) => `$${context.parsed.y.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString()}`
                      }
                    }
                  }
                }}
              />
            )}
            {filter === 'week' && (
              <Line 
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (context) => `$${context.parsed.y.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString()}`
                      }
                    }
                  }
                }}
              />
            )}
            {filter === 'month' && (
              <Line 
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (context) => `$${context.parsed.y.toLocaleString()}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `$${Number(value).toLocaleString()}`
                      }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
