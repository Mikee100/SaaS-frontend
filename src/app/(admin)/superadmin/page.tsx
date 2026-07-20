"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import Link from "next/link";
import { apiGet } from "@/utils/api";
import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

const formatKsh = (n: number) => {
  if (n >= 1_000_000) return `Ksh ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `Ksh ${(n / 1_000).toFixed(1)}k`;
  return `Ksh ${n.toFixed(0)}`;
};

const formatBytes = (bytes: number) => {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
};

export default function SuperadminDashboard() {
  const { user, loading } = useUser();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<RevenueHistory[]>([]);
  const [tenantGrowth, setTenantGrowth] = useState<TenantGrowth[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    try {
      setLoadingData(true);
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
      setLoadingData(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main className="p-6 min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Platform snapshot
        </p>
      </header>

      {loadingData ? (
        <div className="space-y-8">
          <div className="h-32 bg-zinc-200/60 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-zinc-200/60 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-72 bg-zinc-200/60 rounded-xl animate-pulse" />
        </div>
      ) : stats ? (
        <div className="space-y-8">
          {/* Hero metrics - single row, emphasis on MRR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-xl p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                MRR
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900">
                {formatKsh(stats.totalMRR)}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {stats.activeSubscriptions} active subscriptions
              </p>
            </div>
            <div className="bg-white border border-zinc-200/80 rounded-xl p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Tenants
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900">
                {stats.totalTenants}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {stats.totalUsers} users across platform
              </p>
            </div>
            <div className="bg-white border border-zinc-200/80 rounded-xl p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                All-time revenue
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900">
                {formatKsh(stats.totalRevenue)}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {stats.totalSales} total transactions
              </p>
            </div>
          </div>

          {/* Secondary stats - compact strip */}
          <div className="flex flex-wrap gap-6 py-4 border-y border-zinc-200/80">
            <div>
              <span className="text-zinc-400 text-sm">Products</span>
              <span className="ml-2 font-medium text-zinc-900">{stats.totalProducts}</span>
            </div>
            <div>
              <span className="text-zinc-400 text-sm">Storage</span>
              <span className="ml-2 font-medium text-zinc-900">{formatBytes(stats.totalStorage)}</span>
            </div>
            <div>
              <span className="text-zinc-400 text-sm">Near capacity</span>
              <span className={`ml-2 font-medium ${stats.nearCapacityTenants > 0 ? "text-amber-600" : "text-zinc-900"}`}>
                {stats.nearCapacityTenants} tenants
              </span>
            </div>
          </div>

          {/* Single chart - MRR over time */}
          <section>
            <h2 className="text-sm font-medium text-zinc-700 mb-4">MRR over the last 12 months</h2>
            <div className="bg-white border border-zinc-200/80 rounded-xl p-6">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueHistory} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#71717a" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickFormatter={(v) => formatKsh(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e4e4e7",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    formatter={(value) => [formatKsh(Number(value ?? 0)), "MRR"]}
                    labelStyle={{ color: "#71717a" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="#52525b"
                    strokeWidth={1.5}
                    fill="url(#mrrGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Tenant growth over time */}
          <section>
            <h2 className="text-sm font-medium text-zinc-700 mb-4">New tenants per month (last 12 months)</h2>
            <div className="bg-white border border-zinc-200/80 rounded-xl p-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tenantGrowth} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e4e4e7",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    formatter={(value) => [value, "New tenants"]}
                    labelStyle={{ color: "#71717a" }}
                  />
                  <Bar dataKey="newTenants" fill="#52525b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-zinc-400">
                {stats.totalTenants} tenants total to date.
              </p>
            </div>
          </section>

          {/* Quick links - minimal list */}
          <section>
            <h2 className="text-sm font-medium text-zinc-700 mb-3">Quick links</h2>
            <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { href: "/superadmin/tenants", label: "Tenants" },
                { href: "/superadmin/users", label: "Users" },
                { href: "/superadmin/subscriptions", label: "Subscriptions" },
                { href: "/superadmin/billing", label: "Billing" },
                { href: "/superadmin/support", label: "Support tickets" },
                { href: "/superadmin/health", label: "System health" },
                { href: "/superadmin/logs", label: "Audit logs" },
                { href: "/superadmin/settings", label: "Settings" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between px-4 py-3 bg-white border border-zinc-200/80 rounded-lg text-sm text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
                >
                  {label}
                  <span className="text-zinc-400">→</span>
                </Link>
              ))}
            </nav>
          </section>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center">
          <p className="text-zinc-600">Failed to load stats. Try refreshing.</p>
        </div>
      )}
    </main>
  );
}
