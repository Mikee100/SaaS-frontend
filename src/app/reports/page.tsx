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
import { FaCrown, FaLock, FaArrowUp } from 'react-icons/fa';

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

type TopProduct = { id: string; name: string; unitsSold: number; revenue: number };
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
  customerSegments: any[];
};

export default function ReportsPage() {
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

  useEffect(() => {
    apiGet<any[]>("/products").then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (dateFrom) params.append("from", dateFrom);
    if (dateTo) params.append("to", dateTo);
    if (productId) params.append("productId", productId);
    if (paymentType) params.append("paymentType", paymentType);
    
    apiGet<Metrics>(`/sales/analytics?${params.toString()}`)
      .then((data) => setMetrics(data))
      .catch((err) => setError(err.message || "An error occurred while fetching data."))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, productId, paymentType]);

  const { salesTrendData, revenueBreakdownData, paymentMethodData } = useMemo(() => {
    const salesByMonth = metrics.salesByMonth || {};
    const forecast = metrics.forecast || { forecast_months: [], forecast_sales: [] };
    const actualMonths = Object.keys(salesByMonth);
    const actualSales = Object.values(salesByMonth);

    const allMonths = [...actualMonths, ...forecast.forecast_months];
    const salesData = [...actualSales, ...Array(forecast.forecast_months.length).fill(null)];
    const forecastData =
      actualSales.length > 0
        ? [...Array(actualSales.length - 1).fill(null), actualSales[actualSales.length - 1], ...forecast.forecast_sales]
        : forecast.forecast_sales;
    
    const salesTrendData = {
      labels: allMonths,
      datasets: [
        {
          label: 'Actual Sales',
          data: salesData,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Forecast',
          data: forecastData,
          borderColor: '#f59e0b',
          borderDash: [5, 5],
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4,
        },
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-700">Loading Reports...</div>
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
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Business Reports</h1>
          <p className="mt-2 text-lg text-gray-500">Dive deep into your sales, customers, and product performance.</p>
        </header>

        {/* Basic Reports - Available to all plans */}
        {canAccessBasicReports && (
          <>
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
                  <span className="text-3xl font-bold text-green-700">Ksh {metrics.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                  <span className="text-gray-500 text-sm mb-1">Avg. Sale Value</span>
                  <span className="text-3xl font-bold text-purple-700">Ksh {metrics.avgSaleValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
                  <span className="text-gray-500 text-sm mb-1">Low Stock Alerts</span>
                  <span className="text-3xl font-bold text-red-600">{(metrics.lowStock || []).length}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Advanced Reports - Pro and Enterprise */}
        {canAccessAdvancedReports ? (
          <>
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Advanced Filters</h2>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select value={productId} onChange={e => setProductId(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    <option value="">All Products</option>
                    {(products || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    <option value="">All Types</option>
                    {(paymentTypes || []).map((pt) => <option key={pt} value={pt}>{pt.charAt(0).toUpperCase() + pt.slice(1)}</option>)}
                  </select>
                </div>
                <button className="text-sm text-gray-600 hover:text-indigo-600" onClick={() => { setDateFrom(""); setDateTo(""); setProductId(""); setPaymentType(""); }}>Clear Filters</button>
              </div>
            </div>

            {/* Sales Performance Section */}
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
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="text-center py-8">
              <FaLock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Advanced Reports</h3>
              <p className="text-gray-600 mb-4">Upgrade to Pro plan to access detailed sales performance, customer insights, and advanced analytics.</p>
              <a href="/settings/billing" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <FaArrowUp className="w-4 h-4" />
                Upgrade to Pro
              </a>
            </div>
          </div>
        )}

        {/* Enterprise Reports - Enterprise only */}
        {canAccessEnterpriseReports ? (
          <section className="mt-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaCrown className="w-6 h-6 text-yellow-500" />
              Enterprise Analytics
            </h2>
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">Customer Segmentation</h3>
              <p className="text-gray-600 mb-4">Advanced customer analysis and segmentation insights available for Enterprise users.</p>
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
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="text-center py-8">
              <FaCrown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Enterprise Analytics</h3>
              <p className="text-gray-600 mb-4">Get access to advanced AI-powered analytics, customer segmentation, and predictive insights.</p>
              <a href="/settings/billing" className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
                <FaCrown className="w-4 h-4" />
                Upgrade to Enterprise
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
