"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  FaDatabase,
  FaChartBar,
  FaTable,
  FaSort,
  FaChartLine,
  FaDownload,
} from "react-icons/fa";

interface TenantStats {
  tenantId: string;
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  spaceUsedMB: string;
  productCount: number;
}

interface ChartData {
  name: string;
  spaceUsed: number;
  value: number;
  percentage: number;
  color: string;
  [key: string]: string | number;
}

interface RevenuePoint {
  month: string;
  revenue: number;
  mrr: number;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

const SkeletonCard = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
    <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
    <div className="mb-2 h-6 w-32 rounded bg-gray-200" />
    <div className="h-3 w-40 rounded bg-gray-200" />
  </div>
);

export default function SystemAnalyticsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [tenantStats, setTenantStats] = useState<TenantStats[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<RevenuePoint[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sortBy, setSortBy] = useState<"name" | "spaceUsed" | "percentage">(
    "spaceUsed"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoadingStats(true);
      const [tenantData, revenueData] = await Promise.all([
        apiGet("/admin/tenants/analytics") as Promise<TenantStats[]>,
        apiGet("/admin/stats/revenue-history?months=12") as Promise<
          RevenuePoint[]
        >,
      ]);
      setTenantStats(tenantData);
      setRevenueHistory(revenueData);
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const totalSpaceUsed = tenantStats.reduce(
    (sum, tenant) => sum + parseFloat(tenant.spaceUsedMB || "0"),
    0
  );

  const chartData: ChartData[] = tenantStats.map((tenant, index) => ({
    name:
      tenant.name.length > 15
        ? tenant.name.substring(0, 15) + "..."
        : tenant.name,
    spaceUsed: parseFloat(tenant.spaceUsedMB || "0"),
    value: parseFloat(tenant.spaceUsedMB || "0"),
    percentage:
      totalSpaceUsed > 0
        ? (parseFloat(tenant.spaceUsedMB || "0") / totalSpaceUsed) * 100
        : 0,
    color: COLORS[index % COLORS.length],
  }));

  const sortedChartData = [...chartData].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;
    switch (sortBy) {
      case "name":
        aValue = a.name;
        bValue = b.name;
        break;
      case "spaceUsed":
        aValue = a.spaceUsed;
        bValue = b.spaceUsed;
        break;
      case "percentage":
        aValue = a.percentage;
        bValue = b.percentage;
        break;
      default:
        return 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const handleSort = (column: "name" | "spaceUsed" | "percentage") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const formatSpace = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const exportCsv = () => {
    if (!tenantStats.length) return;

    const headers = [
      "Tenant ID",
      "Name",
      "Business Type",
      "Contact Email",
      "Contact Phone",
      "Created At",
      "Space Used (MB)",
      "Product Count",
    ];

    const rows = tenantStats.map((t) => [
      t.tenantId,
      t.name,
      t.businessType,
      t.contactEmail,
      t.contactPhone,
      t.createdAt,
      t.spaceUsedMB,
      t.productCount.toString(),
    ]);

    const csvContent =
      [headers, ...rows].map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "tenant-analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading || !user) return null;

  const totalRevenue = revenueHistory.reduce(
    (sum, p) => sum + p.revenue,
    0
  );

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            System Analytics
          </h1>
          <p className="text-sm text-gray-600 md:text-base">
            Database usage, tenant comparison, and revenue trends
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!tenantStats.length}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
        >
          <FaDownload className="h-4 w-4 text-gray-500" />
          Export CSV
        </button>
      </div>

      {loadingStats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                  <FaDatabase className="h-4 w-4" />
                </span>
                <h3 className="text-xs font-medium text-gray-600">
                  Total Database Space
                </h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatSpace(totalSpaceUsed)}
              </p>
              <p className="text-xs text-gray-500">
                Across {tenantStats.length} tenants
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                  <FaChartBar className="h-4 w-4" />
                </span>
                <h3 className="text-xs font-medium text-gray-600">
                  Largest Tenant
                </h3>
              </div>
              <p className="text-base font-semibold text-gray-900">
                {chartData.length > 0
                  ? chartData.reduce((max, curr) =>
                      curr.spaceUsed > max.spaceUsed ? curr : max
                    ).name
                  : "N/A"}
              </p>
              <p className="text-xs text-gray-500">
                {chartData.length > 0
                  ? formatSpace(
                      chartData.reduce((max, curr) =>
                        curr.spaceUsed > max.spaceUsed ? curr : max
                      ).spaceUsed
                    )
                  : "0 MB"}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                  <FaTable className="h-4 w-4" />
                </span>
                <h3 className="text-xs font-medium text-gray-600">
                  Average Usage
                </h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {tenantStats.length > 0
                  ? formatSpace(totalSpaceUsed / tenantStats.length)
                  : "0 MB"}
              </p>
              <p className="text-xs text-gray-500">Per tenant</p>
            </div>
          </div>

          {/* Charts */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            {/* Space Usage by Tenant */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 md:text-base">
                Space Usage by Tenant
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                    }}
                    formatter={(value: number) => [
                      formatSpace(value),
                      "Space Used",
                    ]}
                  />
                  <Bar dataKey="spaceUsed" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue & MRR Trend */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 md:text-base">
                Revenue & MRR Trend (Last 12 Months)
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueHistory}>
                  <defs>
                    <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                    }}
                    formatter={(value: number, name) => [
                      `$${value.toFixed(2)}`,
                      name === "revenue" ? "Revenue" : "MRR",
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revArea)"
                  />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    name="MRR"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-gray-500">
                Total revenue shown: ${totalRevenue.toFixed(2)}
              </p>
            </div>

            {/* Space Distribution */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 md:text-base">
                Space Distribution
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: ${(
                        ((value as number) / totalSpaceUsed || 0) * 100
                      ).toFixed(1)}%`
                    }
                    outerRadius={80}
                    dataKey="spaceUsed"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      formatSpace(value),
                      "Space Used",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Simple heatmap-ish table for tenant usage */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 md:text-base">
                Tenant Usage Details
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-xs md:text-sm">
                  <thead className="bg-gray-50 text-left text-[11px] font-semibold text-gray-600 md:text-xs">
                    <tr>
                      <th
                        className="cursor-pointer border-b border-gray-200 px-3 py-2"
                        onClick={() => handleSort("name")}
                      >
                        <span className="inline-flex items-center gap-1">
                          Tenant Name
                          <FaSort
                            className={`h-3 w-3 ${
                              sortBy === "name" ? "opacity-100" : "opacity-40"
                            }`}
                          />
                        </span>
                      </th>
                      <th
                        className="cursor-pointer border-b border-gray-200 px-3 py-2"
                        onClick={() => handleSort("spaceUsed")}
                      >
                        <span className="inline-flex items-center gap-1">
                          Space Used
                          <FaSort
                            className={`h-3 w-3 ${
                              sortBy === "spaceUsed"
                                ? "opacity-100"
                                : "opacity-40"
                            }`}
                          />
                        </span>
                      </th>
                      <th
                        className="cursor-pointer border-b border-gray-200 px-3 py-2"
                        onClick={() => handleSort("percentage")}
                      >
                        <span className="inline-flex items-center gap-1">
                          Percentage
                          <FaSort
                            className={`h-3 w-3 ${
                              sortBy === "percentage"
                                ? "opacity-100"
                                : "opacity-40"
                            }`}
                          />
                        </span>
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2">
                        Usage Bar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedChartData.map((tenant, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-3 py-2 text-xs font-medium text-gray-900 md:text-sm">
                          {tenant.name}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 md:text-sm">
                          {formatSpace(tenant.spaceUsed)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 md:text-sm">
                          {tenant.percentage.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2">
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${tenant.percentage}%`,
                                backgroundColor: tenant.color,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
