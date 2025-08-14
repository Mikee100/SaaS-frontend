"use client";
import { useEffect, useState, useMemo } from "react";
import { apiGet } from "@/utils/api";
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
} from "chart.js";
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FaCrown, FaLock, FaArrowUp, FaChartBar, FaDownload } from 'react-icons/fa';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
);

const paymentTypes = ["cash", "mpesa", "card"];

type TopProduct = { id: string; name: string; unitsSold: number; revenue: number; margin?: number };
type Customer = { name: string; phone: string; total: number; count: number; lastPurchase?: Date };
type Forecast = { forecast_months: string[]; forecast_sales: number[] };

type Metrics = {
  totalSales: number;
  totalRevenue: number;
  avgSaleValue: number;
  topProducts: TopProduct[];
  lowStock: any[];
  paymentBreakdown: Record<string, number>;
  salesByMonth: Record<string, number>;
  topCustomers: Customer[];
  forecast: Forecast;
  customerSegments: Array<{
    segment: string;
    count: number;
    revenue: number;
    avgOrderValue: number;
    retention: number;
  }>;
  advancedSegments?: {
    byLocation?: Array<{ location: string; revenue: number; customers: number }>;
    byAge?: Array<{ age: string; revenue: number; customers: number }>;
    byDevice?: Array<{ device: string; revenue: number; customers: number }>;
  };
  inventoryAnalytics?: {
    lowStockItems?: number;
    overstockItems?: number;
    inventoryTurnover?: number;
    stockoutRate?: number;
  };
  performanceMetrics?: {
    visitorCount?: number;
    leadCount?: number;
    customerCount?: number;
    customerLifetimeValue?: number;
    customerAcquisitionCost?: number;
    returnOnInvestment?: number;
    netPromoterScore?: number;
  };
};

export default function ReportsPage() {
  // Low stock notification state
  const [showLowStockAlert, setShowLowStockAlert] = useState(true);
  const { user } = useUser();
  const { limits, hasFeature } = usePlanLimits();
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    totalRevenue: 0,
    avgSaleValue: 0,
    topProducts: [],
    lowStock: [],
    paymentBreakdown: {},
    salesByMonth: {},
    topCustomers: [],
    forecast: { forecast_months: [], forecast_sales: [] },
    customerSegments: [],
  });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productId, setProductId] = useState("");
  const [paymentType, setPaymentType] = useState("");

  // Plan-based access control
  const canAccessBasicReports = !limits?.currentPlan || limits.currentPlan === 'Basic' || limits.currentPlan === 'Pro' || limits.currentPlan === 'Enterprise';
  const canAccessAdvancedReports = limits?.currentPlan === 'Pro' || limits?.currentPlan === 'Enterprise';
  const canAccessEnterpriseReports = limits?.currentPlan === 'Enterprise';

  // Permission checks
  const permissionsLoading = !user || !limits;
  const canViewReports = !permissionsLoading && hasPermission(user, 'view_reports');

  useEffect(() => {
    apiGet("/products").then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/analytics/dashboard`)
      .then((data) => setMetrics(data))
      .catch((err) => setError(err.message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, []);

  // Map backend dashboard data to frontend chart formats
  const { salesTrendData, revenueBreakdownData, paymentMethodData } = useMemo(() => {
    const salesByMonth = metrics.salesByMonth || {};
    const actualMonths = Object.keys(salesByMonth);
    const actualSales = Object.values(salesByMonth);
    const salesTrendData = {
      labels: actualMonths,
      datasets: [
        {
          label: 'Sales',
          data: actualSales,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ],
    };
    const revenueBreakdownData = {
      labels: (metrics.topProducts || []).map(p => p.name),
      datasets: [{
        label: 'Revenue',
        data: (metrics.topProducts || []).map(p => p.revenue),
        backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#22c55e', '#f59e0b'],
        borderRadius: 4,
      }],
    };
    const paymentMethodData = {
      labels: Object.keys(metrics.paymentBreakdown || {}),
      datasets: [{
        label: 'Payments',
        data: Object.values(metrics.paymentBreakdown || {}),
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a21caf'],
        hoverOffset: 4,
      }],
    };
    return { salesTrendData, revenueBreakdownData, paymentMethodData };
  }, [metrics]);

    // Find low stock products (stock <= 10)
  const LOW_STOCK_THRESHOLD = 10;
  const lowStockProducts = products.filter(p => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD && (p.stock ?? 0) > 0);

  // Show notification alert automatically when low stock detected
  useEffect(() => {
    if (lowStockProducts.length > 0) {
      setShowLowStockAlert(true);
    }
  }, [lowStockProducts.length]);

  if (permissionsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 text-lg">Loading permissions...</span>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to view reports
  if (!canViewReports) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaChartBar className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view reports.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-md" role="alert">
          <strong className="font-bold">Failed to load data:</strong>
          <span className="block sm:inline ml-2">{error}</span>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Low Stock Notification Alert */}
        {showLowStockAlert && lowStockProducts.length > 0 && (
          <div className="mb-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-md flex items-center justify-between" role="alert">
              <div>
                <strong className="font-bold">Low Stock Alert:</strong>
                <span className="ml-2">{lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} are low on stock.</span>
                <span className="ml-2 text-xs text-gray-600">({lowStockProducts.map(p => p.name).join(', ')})</span>
              </div>
              <button className="ml-4 text-red-700 hover:text-red-900" onClick={() => setShowLowStockAlert(false)}>
                Dismiss
              </button>
            </div>
          </div>
        )}
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Business Reports</h1>
          <p className="mt-2 text-lg text-gray-500">Dive deep into your sales, customers, and product performance.</p>
        </header>

        {/* Basic Reports - Always visible */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Basic Filters</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
            </div>
            <button className="text-sm text-gray-600 hover:text-indigo-600" onClick={() => { setDateFrom(""); setDateTo(""); setProductId(""); setPaymentType(""); }}>Clear Filters</button>
          </div>
        </div>

        {/* Key Metrics Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <span className="text-gray-500 text-sm mb-1">Total Sales</span>
              <span className="text-3xl font-bold text-indigo-700">{metrics.totalSales}</span>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <span className="text-gray-500 text-sm mb-1">Total Revenue</span>
              <span className="text-3xl font-bold text-green-700">Ksh {(metrics.totalRevenue ?? 0).toLocaleString()}</span>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <span className="text-gray-500 text-sm mb-1">Avg. Sale Value</span>
              <span className="text-3xl font-bold text-purple-700">Ksh {(metrics.avgSaleValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <span className="text-gray-500 text-sm mb-1">Low Stock Alerts</span>
              <span className="text-3xl font-bold text-red-600">{(metrics.lowStock || []).length}</span>
            </div>
          </div>
        </section>

        {/* Advanced Reports - Always visible */}
        {/* Sales Performance Section, Customer & Operations, etc. are always shown */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sales Performance</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4 text-center">Monthly Sales & Forecast</h3>
              <div className="h-80">
                <Line data={salesTrendData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4 text-center">Revenue by Top Products</h3>
              <div className="h-80">
                <Bar data={revenueBreakdownData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Customer & Operations Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Customer & Operations</h2>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4">Top Customers by Spend</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Customer</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Purchases</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-600">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics.topCustomers || []).length === 0 ? (
                      <tr><td colSpan={3} className="text-center text-gray-400 py-4">No customer data available</td></tr>
                    ) : (
                      (metrics.topCustomers || []).map((c) => (
                        <tr key={c.phone || c.name} className="border-b">
                          <td className="py-2 px-4">{c.name}</td>
                          <td className="py-2 px-4">{c.count}</td>
                          <td className="py-2 px-4">Ksh {c.total.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold mb-4 text-center">Payment Methods</h3>
              <div className="h-80 flex items-center justify-center">
                <div className="w-full max-w-xs">
                  <Pie data={paymentMethodData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise Analytics - Always visible */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaCrown className="w-6 h-6 text-yellow-500" />
            Enterprise Analytics
          </h2>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold mb-4">Customer Segmentation</h3>
            <p className="text-gray-600 mb-4">Advanced customer analysis and segmentation insights.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Customer Segments</h4>
                <p className="text-sm text-gray-600">AI-powered customer segmentation and behavior analysis.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Predictive Analytics</h4>
                <p className="text-sm text-gray-600">Advanced forecasting and trend prediction models.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
