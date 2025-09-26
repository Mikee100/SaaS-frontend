"use client";
import { useState, useMemo } from 'react';
import {FaBoxes, FaUsers, FaDollarSign, FaShoppingCart } from 'react-icons/fa';

import { Line} from 'react-chartjs-2';
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
  customerRetention = { totalCustomers: 0, repeatCustomers: 0, retentionRate: 0 },
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

    // Calculate trend line (simple moving average)
    const values = sortedEntries.map(([, value]) => value);
    const period = Math.min(3, values.length); // 3-point moving average
    const movingAverages = values.map((_, i) => {
      const start = Math.max(0, i - period + 1);
      const end = i + 1;
      const subset = values.slice(start, end);
      return subset.reduce((a, b) => a + b, 0) / subset.length;
    });

    return {
      labels: sortedEntries.map(([date]) => formatLabel(date)),
      datasets: [
        {
          label: filter === 'day' ? 'Daily Sales' : filter === 'week' ? 'Weekly Sales' : 'Monthly Sales',
          data: values,
          borderColor: '#4F46E5',
          backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(79, 70, 229, 0.3)');
            gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
            return gradient;
          },
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4F46E5',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.3,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Trend',
          data: movingAverages,
          borderColor: '#10B981',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.3,
          yAxisID: 'y',
        },
      ],
    };
  }, [salesData, dailySalesData, weeklySalesData, filter, dateRange]);



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
                onChange={(e) => setFilter(e.target.value as 'day' | 'week' | 'month')}
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
