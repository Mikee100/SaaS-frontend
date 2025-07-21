"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";
import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [anomalyError, setAnomalyError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiGet("/sales/analytics")
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch sales data for anomaly detection
  useEffect(() => {
    async function fetchAnomalies() {
      setAnomalyLoading(true);
      setAnomalyError("");
      try {
        // Get all sales (per transaction)
        const sales = await apiGet<any[]>("/sales");
        // Prepare data for anomaly endpoint: [{date, value}]
        const salesForAnomaly = sales.map(s => ({ date: s.date, value: s.total }));
        if (salesForAnomaly.length >= 5) {
          // Call Flask anomaly endpoint (adjust URL if needed)
          const flaskUrl = process.env.NEXT_PUBLIC_FLASK_URL || "http://localhost:5000";
          const res = await fetch(`${flaskUrl}/anomalies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sales: salesForAnomaly }),
          });
          if (!res.ok) throw new Error("Failed to fetch anomalies");
          const data = await res.json();
          setAnomalies(data);
        } else {
          setAnomalies([]);
        }
      } catch (e: any) {
        setAnomalyError(e.message || "Failed to detect anomalies");
      } finally {
        setAnomalyLoading(false);
      }
    }
    fetchAnomalies();
  }, []);

  // For chart highlighting: mark anomaly dates
  const anomalyDates = useMemo(() => new Set(anomalies.map(a => new Date(a.date).toISOString().slice(0, 10))), [anomalies]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg font-semibold text-gray-600">Loading Analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg font-semibold text-gray-500">No analytics data available.</div>
      </div>
    );
  }

  // Prepare chart data
  const actualMonths = Object.entries(data.salesByMonth || {}).map(([month, revenue]: any) => ({
    month,
    revenue,
    forecast: null,
  }));

  const forecastMonths = (data.forecast?.forecast_months || []).map((month: string, i: number) => ({
    month,
    revenue: null,
    forecast: data.forecast.forecast_sales[i],
  }));

  // Bridge point: repeat the last actual value as the first forecast point
  if (actualMonths.length && forecastMonths.length) {
    const lastActual = actualMonths[actualMonths.length - 1];
    forecastMonths.unshift({
      month: lastActual.month,
      revenue: null,
      forecast: lastActual.revenue,
    });
  }

  const monthData = [...actualMonths, ...forecastMonths];
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#a4de6c", "#d0ed57", "#ffc0cb"];

  const productData = Object.entries(data.salesByProduct || {}).map(([id, v]: any) => ({
    id,
    name: v.name,
    quantity: v.quantity,
    revenue: v.revenue,
  }));

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Sales & Customer Analytics</h1>
          <p className="mt-2 text-lg text-gray-500">
            An overview of your business performance, customer behavior, and sales trends.
          </p>
        </div>

        {/* Section 1: At a Glance */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">At a Glance</h2>
          <p className="text-gray-500 mb-6">A high-level summary of your key business metrics.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 flex flex-col items-center justify-center">
              <div className="text-sm text-blue-600 font-semibold mb-1">Total Sales</div>
              <div className="text-3xl font-bold text-blue-800">{data.totalSales}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6 flex flex-col items-center justify-center">
              <div className="text-sm text-green-600 font-semibold mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-green-800">${data.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-6 flex flex-col items-center justify-center">
              <div className="text-sm text-indigo-600 font-semibold mb-1">Avg. Sale Value</div>
              <div className="text-3xl font-bold text-indigo-800">${data.avgSaleValue.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <hr className="my-10 border-gray-200" />

        {/* Section 2: Sales Performance */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sales Performance</h2>
          <p className="text-gray-500 mb-6">Visualize your sales trends and identify top-performing products.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-center">Sales by Product (Units Sold)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={productData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip wrapperClassName="rounded-md border bg-white px-3 py-2 text-sm shadow-sm" />
                  <Bar dataKey="quantity" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-center">Monthly Sales & Forecast</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip wrapperClassName="rounded-md border bg-white px-3 py-2 text-sm shadow-sm" />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} name="Actual Sales" />
                  <Line type="monotone" dataKey="forecast" stroke="#F59E0B" strokeDasharray="5 5" strokeWidth={2} name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <hr className="my-10 border-gray-200" />

        {/* Section 3: Customer Insights */}
        {data.customerSegments && data.customerSegments.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Customer Insights</h2>
            <p className="text-gray-500 mb-6">Understand your customer segments, their value, and churn risk.</p>
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Spent</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Purchases</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Predicted CLV</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Segment</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Churn Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customerSegments.map((c: any, i: number) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{c.name}</td>
                      <td className="px-4 py-3 text-right">${c.total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{c.count}</td>
                      <td className="px-4 py-3 text-right">${c.clv.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          c.segment_label === 'VIP' ? 'bg-green-100 text-green-800' :
                          c.segment_label === 'At-Risk' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.segment_label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${c.churn_risk ? 'text-red-600' : 'text-green-600'}`}>
                          {c.churn_risk ? 'High' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">Customer Segments Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(data.customerSegments.reduce((acc: any, c: any) => {
                        acc[c.segment_label] = (acc[c.segment_label] || 0) + 1;
                        return acc;
                      }, {})).map(([name, value]) => ({ name, value }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {Object.entries(data.customerSegments.reduce((acc: any, c: any) => {
                        acc[c.segment_label] = (acc[c.segment_label] || 0) + 1;
                        return acc;
                      }, {})).map(([name], i) => (
                        <Cell key={name} fill={
                          name === 'VIP' ? '#22C55E' :
                          name === 'At-Risk' ? '#EF4444' :
                          '#3B82F6'
                        } />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 text-center">Avg. Predicted CLV by Segment</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(
                      data.customerSegments.reduce((acc: any, c: any) => {
                        acc[c.segment_label] = acc[c.segment_label] || [];
                        acc[c.segment_label].push(c.clv);
                        return acc;
                      }, {})
                    ).map(([segment, clvs]: any) => ({
                      segment,
                      avgCLV: clvs.reduce((a: number, b: number) => a + b, 0) / clvs.length,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="segment" />
                    <YAxis />
                    <Tooltip wrapperClassName="rounded-md border bg-white px-3 py-2 text-sm shadow-sm" />
                    <Bar dataKey="avgCLV" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <hr className="my-10 border-gray-200" />

        {/* Section 4: Anomaly Detection */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sales Anomaly Detection</h2>
          <p className="text-gray-500 mb-6">Identify unusual sales transactions that might require further investigation.</p>
          {anomalyLoading ? (
            <div className="text-center text-gray-500">Detecting anomalies...</div>
          ) : anomalyError ? (
            <div className="text-center text-red-500 bg-red-50 p-4 rounded-lg">{anomalyError}</div>
          ) : anomalies.length === 0 ? (
            <div className="text-center text-gray-500 bg-gray-50 p-4 rounded-lg">No anomalies detected in the recent sales data.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Anomalous Value</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a, i) => (
                    <tr key={i} className="border-t bg-yellow-50 hover:bg-yellow-100">
                      <td className="px-4 py-3">{new Date(a.date).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-800">${a.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 