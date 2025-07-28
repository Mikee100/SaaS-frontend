"use client";
import { useEffect, useState } from 'react';
import { FaChartLine, FaChartBar, FaChartPie } from 'react-icons/fa';

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

interface AnalyticsChartsProps {
  salesData?: Record<string, number>;
  productData?: Array<{ name: string; sales: number; revenue: number }>;
  customerData?: Array<{ segment: string; count: number; revenue: number }>;
}

export default function AnalyticsCharts({ salesData, productData, customerData }: AnalyticsChartsProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const salesChartData: ChartData = {
    labels: salesData ? Object.keys(salesData) : [],
    datasets: [
      {
        label: 'Monthly Sales',
        data: salesData ? Object.values(salesData) : [],
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const productChartData: ChartData = {
    labels: productData ? productData.map(p => p.name) : [],
    datasets: [
      {
        label: 'Product Sales',
        data: productData ? productData.map(p => p.sales) : [],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Sales Trend Chart */}
      {salesData && Object.keys(salesData).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <FaChartLine className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Sales Trend</h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaChartLine className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600">Chart.js will render here</p>
              <p className="text-sm text-gray-500">Install chart.js and react-chartjs-2 to see charts</p>
            </div>
          </div>
        </div>
      )}

      {/* Product Performance Chart */}
      {productData && productData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <FaChartBar className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Product Performance</h3>
          </div>
          <div className="space-y-4">
            {productData.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5] }}
                  ></div>
                  <span className="font-medium text-gray-800">{product.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{product.sales} sales</p>
                  <p className="text-sm text-green-600">${product.revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Segments Chart */}
      {customerData && customerData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-6">
            <FaChartPie className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Customer Segments</h3>
          </div>
          <div className="space-y-4">
            {customerData.map((segment, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'][index % 5] }}
                  ></div>
                  <span className="font-medium text-gray-800">{segment.segment}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{segment.count} customers</p>
                  <p className="text-sm text-purple-600">${segment.revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 