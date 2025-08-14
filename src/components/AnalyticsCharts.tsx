"use client";
import { useEffect, useState, useMemo } from 'react';
import { FaChartLine, FaChartBar, FaChartPie } from 'react-icons/fa';
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
    backgroundColor?: string;
    borderColor?: string;
    tension?: number;
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
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
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
        backgroundColor: '#3B82F6',
      },
      {
        label: 'Revenue',
        data: productData ? productData.map(p => p.revenue) : [],
        backgroundColor: '#10B981',
      },
    ],
  };

  const marginChartData: ChartData = {
    labels: productData ? productData.map(p => p.name) : [],
    datasets: [
      {
        label: 'Profit Margin (%)',
        data: productData ? productData.map(p => (p.margin ?? 0) * 100) : [],
        backgroundColor: '#22c55e',
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
  backgroundColor: '#ef4444',
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
  backgroundColor: '#10b981',
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Sales Trend Chart with Filter */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center grid-cols-1  gap-2 mb-6">
          <FaChartLine className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Sales Trend</h3>
          <div className="ml-auto flex gap-2">
            <button
              className={`px-2 py-1 rounded text-xs font-medium ${filter === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setFilter('month')}
            >Month</button>
            <button
              className={`px-2 py-1 rounded text-xs font-medium ${filter === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setFilter('week')}
            >Week</button>
            <button
              className={`px-2 py-1 rounded text-xs font-medium ${filter === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setFilter('day')}
            >Day</button>
          </div>
        </div>
        <div className="h-64">
          <Line data={salesChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
      </div>

      {/* Product Performance Chart */}
      {productData && productData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <FaChartBar className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Product Performance</h3>
          </div>
          <div className="h-64">
            <Bar data={productChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
      )}

      {/* Profitability Chart */}
      {productData && productData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <FaChartBar className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-800">Profitability (Margin %)</h3>
          </div>
          <div className="h-64">
            <Bar data={marginChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </div>
      )}

      {/* Inventory Movement Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-6">
          <FaChartBar className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-800">Inventory Movement</h3>
        </div>
        <div className="h-64">
          <Bar data={inventoryChartData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>

      {/* Customer Retention Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-6">
          <FaChartPie className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">Customer Retention</h3>
        </div>
        <div className="h-64">
          <Pie data={retentionChartData} options={{ responsive: true, plugins: { legend: { position: 'right' } } }} />
        </div>
      </div>
    </div>
  );
}
