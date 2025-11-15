"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import AuthGuard from '@/components/AuthGuard';
import { FaBox, FaMoneyBillWave, FaChartLine, FaExclamationTriangle, FaArrowLeft, FaChartBar, FaChartPie, FaChartArea } from 'react-icons/fa';
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  description?: string;
}

interface AnalyticsData {
  totalProducts: number;
  totalStock: number;
  avgPrice: number;
  avgCost: number;
  avgMargin: number;
  inventoryValue: number;
  potentialProfit: number;
  lowMarginCount: number;
  productsByMargin: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  topProductsByValue: Array<{
    name: string;
    value: number;
  }>;
  stockDistribution: Array<{
    range: string;
    count: number;
  }>;
  marginTrend: Array<{
    month: string;
    avgMargin: number;
  }>;
}

export default function ProductAnalyticsPage() {
  const [, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const response = await apiGet<{ products: Product[], pagination: unknown }>('/products');

        const productsData = response?.products || [];
        setProducts(productsData);
        // For now, compute analytics locally since we don't have a dedicated endpoint
        const computedAnalytics = computeAnalytics(productsData);
        setAnalytics(computedAnalytics);
      } catch (err: unknown) {
        const error = err as Error;
        setError(error.message || "Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const computeAnalytics = (products: Product[]): AnalyticsData => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const avgPrice = totalProducts > 0 ? products.reduce((sum, p) => sum + p.price, 0) / totalProducts : 0;
    const avgCost = totalProducts > 0 ? products.reduce((sum, p) => sum + p.cost, 0) / totalProducts : 0;
    const avgMargin = totalProducts > 0 ? products.reduce((sum, p) => p.price > 0 ? ((p.price - p.cost) / p.price * 100) : 0, 0) / totalProducts : 0;
    const inventoryValue = products.reduce((sum, p) => sum + (p.cost * p.stock), 0);
    const potentialProfit = products.reduce((sum, p) => sum + ((p.price - p.cost) * p.stock), 0);
    const lowMarginCount = products.filter(p => p.price > 0 && ((p.price - p.cost) / p.price * 100) < 20).length;

    // Products by margin ranges
    const marginRanges = [
      { range: '0-10%', min: 0, max: 10 },
      { range: '10-20%', min: 10, max: 20 },
      { range: '20-30%', min: 20, max: 30 },
      { range: '30-50%', min: 30, max: 50 },
      { range: '50%+', min: 50, max: Infinity }
    ];

    const productsByMargin = marginRanges.map(range => {
      const count = products.filter(p => {
        if (p.price === 0) return false;
        const margin = (p.price - p.cost) / p.price * 100;
        return margin >= range.min && margin < range.max;
      }).length;
      return {
        range: range.range,
        count,
        percentage: totalProducts > 0 ? (count / totalProducts * 100) : 0
      };
    });

    // Top products by inventory value
    const topProductsByValue = products
      .map(p => ({ name: p.name, value: p.cost * p.stock }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Stock distribution
    const stockRanges = [
      { range: '0-10', min: 0, max: 10 },
      { range: '11-50', min: 11, max: 50 },
      { range: '51-100', min: 51, max: 100 },
      { range: '101-500', min: 101, max: 500 },
      { range: '500+', min: 501, max: Infinity }
    ];

    const stockDistribution = stockRanges.map(range => ({
      range: range.range,
      count: products.filter(p => p.stock >= range.min && p.stock <= range.max).length
    }));

    // Mock margin trend data (in real app, this would come from historical data)
    const marginTrend = [
      { month: 'Jan', avgMargin: avgMargin - 2 },
      { month: 'Feb', avgMargin: avgMargin - 1 },
      { month: 'Mar', avgMargin: avgMargin + 1 },
      { month: 'Apr', avgMargin: avgMargin - 0.5 },
      { month: 'May', avgMargin: avgMargin + 2 },
      { month: 'Jun', avgMargin }
    ];

    return {
      totalProducts,
      totalStock,
      avgPrice,
      avgCost,
      avgMargin,
      inventoryValue,
      potentialProfit,
      lowMarginCount,
      productsByMargin,
      topProductsByValue,
      stockDistribution,
      marginTrend
    };
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/products"
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FaArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Analytics</h1>
            <p className="text-gray-600">Detailed insights into your product performance</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-200 rounded-lg">
                <FaBox className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Products</p>
                <p className="text-3xl font-bold text-blue-900">{analytics?.totalProducts || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-200 rounded-lg">
                <FaMoneyBillWave className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Inventory Value</p>
                <p className="text-3xl font-bold text-green-900">${analytics?.inventoryValue.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-200 rounded-lg">
                <FaChartLine className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-medium">Potential Profit</p>
                <p className="text-3xl font-bold text-purple-900">${analytics?.potentialProfit.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-200 rounded-lg">
                <FaChartBar className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-emerald-700 font-medium">Avg Margin</p>
                <p className="text-3xl font-bold text-emerald-900">{analytics?.avgMargin.toFixed(1) || '0.0'}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Margin Distribution Pie Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaChartPie className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Margin Distribution</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.productsByMargin || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, percentage }) => `${range}: ${typeof percentage === 'number' ? percentage.toFixed(1) : percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics?.productsByMargin.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products by Value */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaChartBar className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">Top Products by Value</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.topProductsByValue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Value']} />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Distribution */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaChartArea className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">Stock Distribution</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.stockDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Margin Trend */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaChartLine className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-800">Margin Trend</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.marginTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Avg Margin']} />
                  <Line type="monotone" dataKey="avgMargin" stroke="#FF8042" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <FaExclamationTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Low Margin Alert</h3>
                <p className="text-sm text-gray-600">Products with margin {'<'} 20%</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-orange-600">{analytics?.lowMarginCount || 0}</p>
            <p className="text-sm text-gray-500 mt-1">
              {analytics?.totalProducts ? ((analytics.lowMarginCount / analytics.totalProducts) * 100).toFixed(1) : 0}% of total products
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaMoneyBillWave className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Average Price</h3>
                <p className="text-sm text-gray-600">Mean selling price</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-600">${analytics?.avgPrice.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-gray-500 mt-1">
              vs ${analytics?.avgCost.toFixed(2) || '0.00'} average cost
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaBox className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Total Stock</h3>
                <p className="text-sm text-gray-600">Units in inventory</p>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-600">{analytics?.totalStock || 0}</p>
            <p className="text-sm text-gray-500 mt-1">
              Across {analytics?.totalProducts || 0} products
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
