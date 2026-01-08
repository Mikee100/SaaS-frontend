"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FaUsers,
  FaBox,
  FaShoppingCart,
  FaDollarSign,
  FaDatabase,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";

interface PlatformStats {
  totalTenants: number;
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  activeSubscriptions: number;
  totalStorage: number;
  nearCapacityTenants: number;
  totalMRR: number;
}

interface RevenueHistory {
  month: string;
  revenue: number;
  mrr: number;
}

interface TenantGrowth {
  month: string;
  newTenants: number;
  totalTenants: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

// Loading skeleton component
const StatCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
    <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-40"></div>
  </div>
);

// Stat card component
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
  color?: "blue" | "green" | "orange" | "purple" | "cyan";
}) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    cyan: "bg-cyan-100 text-cyan-600",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend === "up" ? "text-green-600" : "text-orange-600"
            }`}
          >
            {trend === "up" ? (
              <FaArrowUp className="w-3 h-3" />
            ) : (
              <FaArrowDown className="w-3 h-3" />
            )}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-1">
        {typeof value === "number" && value >= 1000
          ? `$${(value / 1000).toFixed(1)}k`
          : typeof value === "number" && value < 1
          ? value.toFixed(2)
          : value}
      </p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
};

export default function SuperadminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<RevenueHistory[]>([]);
  const [tenantGrowth, setTenantGrowth] = useState<TenantGrowth[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoadingStats(true);
      setLoadingCharts(true);

      // Fetch all data in parallel
      const [statsData, revenueData, growthData] = await Promise.all([
        apiGet("/admin/stats") as Promise<PlatformStats>,
        apiGet("/admin/stats/revenue-history?months=12") as Promise<RevenueHistory[]>,
        apiGet("/admin/stats/tenant-growth?months=12") as Promise<TenantGrowth[]>,
      ]);

      setStats(statsData);
      setRevenueHistory(revenueData);
      setTenantGrowth(growthData);
    } catch (error) {
      console.error("Failed to fetch platform statistics:", error);
    } finally {
      setLoadingStats(false);
      setLoadingCharts(false);
    }
  };

  // Calculate trends
  const calculateTrend = (data: number[]) => {
    if (data.length < 2) return null;
    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change >= 0 ? ("up" as const) : ("down" as const),
      value: `${Math.abs(change).toFixed(1)}%`,
    };
  };

  const mrrTrend = revenueHistory.length >= 2
    ? calculateTrend(revenueHistory.map((d) => d.mrr))
    : null;

  const tenantTrend = tenantGrowth.length >= 2
    ? calculateTrend(tenantGrowth.map((d) => d.newTenants))
    : null;

  if (loading || !user) return null;

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Superadmin Dashboard</h1>
        <p className="text-gray-600">Platform overview and analytics</p>
      </div>

      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(8)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Tenants"
              value={stats.totalTenants}
              subtitle={`${stats.activeSubscriptions} active subscriptions`}
              icon={FaUsers}
              color="blue"
              trend={tenantTrend?.direction}
              trendValue={tenantTrend?.value}
            />
            <StatCard
              title="Total MRR"
              value={`$${stats.totalMRR.toFixed(2)}`}
              subtitle="Monthly recurring revenue"
              icon={FaDollarSign}
              color="green"
              trend={mrrTrend?.direction}
              trendValue={mrrTrend?.value}
            />
            <StatCard
              title="Total Revenue"
              value={`$${stats.totalRevenue.toFixed(2)}`}
              subtitle="All-time revenue"
              icon={FaChartLine}
              color="purple"
            />
            <StatCard
              title="Storage Used"
              value={`${(stats.totalStorage / (1024 * 1024 * 1024)).toFixed(1)} GB`}
              subtitle="Total platform storage"
              icon={FaDatabase}
              color="cyan"
            />
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              subtitle="Across all tenants"
              icon={FaUsers}
              color="blue"
            />
            <StatCard
              title="Total Products"
              value={stats.totalProducts}
              subtitle="Across all tenants"
              icon={FaBox}
              color="orange"
            />
            <StatCard
              title="Total Sales"
              value={stats.totalSales}
              subtitle="All-time transactions"
              icon={FaShoppingCart}
              color="green"
            />
            <StatCard
              title="Near Capacity"
              value={stats.nearCapacityTenants}
              subtitle="Tenants over 80% usage"
              icon={FaDatabase}
              color="orange"
            />
          </div>

          {/* Charts Section */}
          {loadingCharts ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* MRR Trend Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  MRR Growth Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueHistory}>
                    <defs>
                      <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "MRR"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMrr)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue Trend Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Monthly Revenue
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                      }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tenant Growth Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tenant Growth
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tenantGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="totalTenants"
                      name="Total Tenants"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="newTenants"
                      name="New Tenants"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Subscription Status Distribution */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Subscription Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Active Subscriptions</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.activeSubscriptions}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <FaUsers className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Tenants</p>
                      <p className="text-xl font-bold text-green-600">
                        {stats.totalTenants}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Near Capacity</p>
                      <p className="text-xl font-bold text-orange-600">
                        {stats.nearCapacityTenants}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push("/superadmin/tenants")}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-left group"
              >
                <div className="text-blue-600 font-semibold mb-1 group-hover:text-blue-700">
                  Manage Tenants
                </div>
                <div className="text-sm text-gray-600">
                  View and manage all platform tenants
                </div>
              </button>

              <button
                onClick={() => router.push("/superadmin/users")}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors text-left group"
              >
                <div className="text-green-600 font-semibold mb-1 group-hover:text-green-700">
                  Manage Users
                </div>
                <div className="text-sm text-gray-600">
                  View and manage all platform users
                </div>
              </button>

              <button
                onClick={() => router.push("/superadmin/support")}
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors text-left group"
              >
                <div className="text-orange-600 font-semibold mb-1 group-hover:text-orange-700">
                  Support Tickets
                </div>
                <div className="text-sm text-gray-600">
                  Handle client requests and issues
                </div>
              </button>

              <button
                onClick={() => router.push("/superadmin/health")}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors text-left group"
              >
                <div className="text-purple-600 font-semibold mb-1 group-hover:text-purple-700">
                  System Health
                </div>
                <div className="text-sm text-gray-600">
                  Monitor platform performance
                </div>
              </button>

              <button
                onClick={() => router.push("/superadmin/bulk")}
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors text-left group"
              >
                <div className="text-orange-600 font-semibold mb-1 group-hover:text-orange-700">
                  Bulk Operations
                </div>
                <div className="text-sm text-gray-600">
                  Perform mass actions efficiently
                </div>
              </button>

              <button
                onClick={() => router.push("/superadmin/logs")}
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left group"
              >
                <div className="text-gray-600 font-semibold mb-1 group-hover:text-gray-700">
                  Audit Logs
                </div>
                <div className="text-sm text-gray-600">
                  View system activity logs
                </div>
              </button>

              <button
                onClick={() => router.push("/superadmin/analytics")}
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors text-left group"
              >
                <div className="text-orange-600 font-semibold mb-1 group-hover:text-orange-700">
                  System Analytics
                </div>
                <div className="text-sm text-gray-600">
                  View platform analytics and insights
                </div>
              </button>

              <button
                onClick={() => router.push("/superadmin/billing")}
                className="p-4 bg-cyan-50 hover:bg-cyan-100 rounded-lg border border-cyan-200 transition-colors text-left group"
              >
                <div className="text-cyan-600 font-semibold mb-1 group-hover:text-cyan-700">
                  Billing Management
                </div>
                <div className="text-sm text-gray-600">
                  Manage subscriptions and billing
                </div>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-orange-600">Failed to load platform statistics</p>
        </div>
      )}
    </main>
  );
}
