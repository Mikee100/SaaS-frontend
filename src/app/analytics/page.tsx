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

  if (loading) return <div className="p-8">Loading analytics...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!data) return <div className="p-8 text-gray-500">No analytics data.</div>;

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
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Sales Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded shadow p-6 flex flex-col items-center">
          <div className="text-xs text-gray-500 mb-1">Total Sales</div>
          <div className="text-2xl font-bold">{data.totalSales}</div>
        </div>
        <div className="bg-white rounded shadow p-6 flex flex-col items-center">
          <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold">${data.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded shadow p-6 flex flex-col items-center">
          <div className="text-xs text-gray-500 mb-1">Avg. Sale Value</div>
          <div className="text-2xl font-bold">${data.avgSaleValue.toFixed(2)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Sales by Product</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Sales by Month</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={3} name="Actual Sales" />
              <Line type="monotone" dataKey="forecast" stroke="#ff7300" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Forecast" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* --- Anomaly Detection Section --- */}
      <div className="bg-white rounded shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Sales Anomalies</h2>
        {anomalyLoading ? (
          <div>Detecting anomalies...</div>
        ) : anomalyError ? (
          <div className="text-red-500">{anomalyError}</div>
        ) : anomalies.length === 0 ? (
          <div className="text-gray-500">No anomalies detected.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-right px-4 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => (
                  <tr key={i} className="border-t bg-yellow-50">
                    <td className="px-4 py-2">{new Date(a.date).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-bold">${a.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Customer Segmentation & Insights */}
      {data.customerSegments && data.customerSegments.length > 0 && (
        <div className="bg-white rounded shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Customer Segmentation & Insights</h2>
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-right px-4 py-2">Total Spent</th>
                  <th className="text-right px-4 py-2">Purchases</th>
                  <th className="text-right px-4 py-2">Predicted CLV</th>
                  <th className="text-center px-4 py-2">Segment</th>
                  <th className="text-center px-4 py-2">Churn Risk</th>
                </tr>
              </thead>
              <tbody>
                {data.customerSegments.map((c: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 text-right">${c.total.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{c.count}</td>
                    <td className="px-4 py-2 text-right">${c.clv.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={
                        c.segment_label === 'VIP' ? 'text-green-600 font-bold' :
                        c.segment_label === 'At-Risk' ? 'text-red-600 font-bold' :
                        'text-blue-600 font-bold'
                      }>
                        {c.segment_label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={c.churn_risk ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                        {c.churn_risk ? 'High' : 'Low'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pie chart for segments */}
            <div>
              <h3 className="text-md font-semibold mb-2">Customer Segments</h3>
              <ResponsiveContainer width="100%" height={250}>
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
                    outerRadius={80}
                    label
                  >
                    {Object.entries(data.customerSegments.reduce((acc: any, c: any) => {
                      acc[c.segment_label] = (acc[c.segment_label] || 0) + 1;
                      return acc;
                    }, {})).map(([name], i) => (
                      <Cell key={name} fill={
                        name === 'VIP' ? '#22c55e' :
                        name === 'At-Risk' ? '#ef4444' :
                        '#3b82f6'
                      } />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Bar chart for CLV by segment */}
            <div>
              <h3 className="text-md font-semibold mb-2">Avg. Predicted CLV by Segment</h3>
              <ResponsiveContainer width="100%" height={250}>
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
                  margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="segment" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgCLV" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 