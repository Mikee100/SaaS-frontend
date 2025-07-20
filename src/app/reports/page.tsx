"use client";
import { useEffect, useState } from "react";
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
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const paymentTypes = ["cash", "mpesa", "card"];

type TopProduct = { id: string; name: string; unitsSold: number; revenue: number };
type Metrics = {
  totalSales: number;
  totalRevenue: number;
  topProducts: TopProduct[];
  lowStock: any[];
  paymentBreakdown: Record<string, number>;
};

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalSales: 0,
    totalRevenue: 0,
    topProducts: [],
    lowStock: [],
    paymentBreakdown: {},
  });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productId, setProductId] = useState("");
  const [paymentType, setPaymentType] = useState("");

  // Fetch product list for filter
  useEffect(() => {
    apiGet<any[]>("/products").then(setProducts);
  }, []);

  // Fetch analytics with filters
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.append("from", dateFrom);
    if (dateTo) params.append("to", dateTo);
    if (productId) params.append("productId", productId);
    if (paymentType) params.append("paymentType", paymentType);
    apiGet<any>(`/sales/analytics?${params.toString()}`)
      .then((data) => setMetrics(data))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, productId, paymentType]);

  // Placeholder for sales trend (should be replaced with real trend data from backend)
  const salesTrendData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        label: "Sales",
        data: [12, 19, 10, 15, 22, 30, 25],
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.2)",
        tension: 0.4,
      },
    ],
  };

  // Revenue breakdown by top products
  const revenueBreakdownData = {
    labels: metrics.topProducts.map((p: any) => p.name),
    datasets: [
      {
        label: "Revenue",
        data: metrics.topProducts.map((p: any) => p.revenue),
        backgroundColor: [
          "#6366f1",
          "#a21caf",
          "#f59e42",
          "#10b981",
          "#ef4444",
        ],
      },
    ],
  };

  // Payment method breakdown
  const paymentLabels = Object.keys(metrics.paymentBreakdown);
  const paymentData = Object.values(metrics.paymentBreakdown);
  const paymentMethodData = {
    labels: paymentLabels,
    datasets: [
      {
        label: "Payments",
        data: paymentData,
        backgroundColor: ["#6366f1", "#10b981", "#f59e42", "#ef4444", "#a21caf"],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold text-blue-700 mb-8 text-center">Business Reports & Analytics</h1>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 items-end bg-white rounded-xl shadow p-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Product</label>
            <select value={productId} onChange={e => setProductId(e.target.value)} className="border rounded px-2 py-1">
              <option value="">All</option>
              {(products || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Payment Type</label>
            <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="border rounded px-2 py-1">
              <option value="">All</option>
              {(paymentTypes || []).map((pt) => <option key={pt} value={pt}>{pt.charAt(0).toUpperCase() + pt.slice(1)}</option>)}
            </select>
          </div>
          <button className="ml-auto text-xs text-gray-500 hover:underline" onClick={() => { setDateFrom(""); setDateTo(""); setProductId(""); setPaymentType(""); }}>Clear Filters</button>
        </div>
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-gray-500 text-sm mb-1">Total Sales</span>
            <span className="text-2xl font-bold text-blue-700">{metrics.totalSales}</span>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-gray-500 text-sm mb-1">Total Revenue</span>
            <span className="text-2xl font-bold text-green-700">Ksh {metrics.totalRevenue.toLocaleString()}</span>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-gray-500 text-sm mb-1">Top Products</span>
            <span className="text-lg font-semibold text-purple-700">{metrics.topProducts.length > 0 ? metrics.topProducts[0]?.name : "-"}</span>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-gray-500 text-sm mb-1">Low Stock Alerts</span>
            <span className="text-lg font-semibold text-red-600">{metrics.lowStock.length}</span>
          </div>
        </div>
        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold mb-4">Sales Trend</h2>
            <div className="h-64">
              <Line data={salesTrendData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold mb-4">Revenue Breakdown</h2>
            <div className="h-64">
              <Bar data={revenueBreakdownData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          </div>
        </div>
        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-xl shadow p-6 mb-10">
          <h2 className="text-lg font-bold mb-4">Payment Method Breakdown</h2>
          <div className="h-48">
            <Pie data={paymentMethodData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
          </div>
        </div>
        {/* Top Products Table */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-4">Top Selling Products</h2>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="py-2 px-4 text-left">Product</th>
                <th className="py-2 px-4 text-left">Units Sold</th>
                <th className="py-2 px-4 text-left">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(metrics.topProducts || []).length === 0 ? (
                <tr><td colSpan={3} className="text-center text-gray-400 py-4">No data</td></tr>
              ) : (
                (metrics.topProducts || []).map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2 px-4">{p.name}</td>
                    <td className="py-2 px-4">{p.unitsSold}</td>
                    <td className="py-2 px-4">Ksh {p.revenue.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
