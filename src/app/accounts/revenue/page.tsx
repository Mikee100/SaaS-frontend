"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/utils/api";
import { useUser } from "@/components/UserContext";
import { useBranches } from "@/hooks/useBranches";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import RevenueBranchComparison from "./RevenueBranchComparison";
import BranchComparisonGraph from "./BranchComparisonGraph";

type SeriesMode = "daily" | "weekly" | "monthly" | "yearly";

interface AnalyticsData {
  totalSales?: number;
  totalRevenue?: number;
  averageOrderValue?: number;
  revenueGrowth?: number;
  salesByMonth?: Record<string, number>;
  topProducts?: Array<{ name: string; revenue: number; sales: number }>;
  cogs?: number;
}

interface ChartPoint {
  label: string;
  revenue: number;
  order: number;
}

const toNumber = (value: unknown) => Number(value || 0);

const compactAmount = (amount: number) => {
  const absolute = Math.abs(amount);
  if (absolute >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
};

const safeDateOrder = (label: string, index: number) => {
  const parsed = new Date(label).getTime();
  return Number.isNaN(parsed) ? index : parsed;
};

export default function RevenuePage() {
  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const [seriesMode, setSeriesMode] = useState<SeriesMode>("monthly");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [monthlyGoal, setMonthlyGoal] = useState<number>(250000);

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles
        .map((role: any) =>
          typeof role === "string"
            ? role.toLowerCase()
            : String(role?.name || "").toLowerCase(),
        )
        .filter(Boolean)
    : [];
  const primaryRole = String((user as any)?.role || "").toLowerCase();
  const isBranchScopedUser =
    normalizedRoles.includes("manager") ||
    normalizedRoles.includes("cashier") ||
    primaryRole === "manager" ||
    primaryRole === "cashier";
  const assignedBranchId = user?.branchId || "";
  const canTenantSelectBranch =
    !isBranchScopedUser &&
    (normalizedRoles.includes("owner") ||
      normalizedRoles.includes("admin") ||
      Boolean(user?.isSuperadmin));

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isBranchScopedUser && assignedBranchId) {
      setSelectedBranchId(assignedBranchId);
      localStorage.setItem("selectedBranchId", assignedBranchId);
      return;
    }

    if (canTenantSelectBranch) {
      const storedBranch = localStorage.getItem("selectedBranchId") || "all";
      const existsInBranches =
        storedBranch === "all" || branches.some((branch) => branch.id === storedBranch);
      const nextBranch = existsInBranches ? storedBranch : "all";
      setSelectedBranchId(nextBranch);
      localStorage.setItem("selectedBranchId", nextBranch);
      return;
    }

    setSelectedBranchId(assignedBranchId || "all");
  }, [assignedBranchId, branches, canTenantSelectBranch, isBranchScopedUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedGoal = Number(localStorage.getItem("revenueMonthlyGoal") || "0");
    if (savedGoal > 0) {
      setMonthlyGoal(savedGoal);
    }
  }, []);

  const branchHeaders =
    selectedBranchId && selectedBranchId !== "all" ? { "x-branch-id": selectedBranchId } : undefined;

  const { data: basicData, isLoading: basicLoading } = useQuery({
    queryKey: ["revenue", "basic", selectedBranchId],
    queryFn: () => apiGet("/analytics/basic", branchHeaders) as Promise<AnalyticsData>,
    staleTime: 2 * 60 * 1000,
  });

  const { data: dailySales } = useQuery({
    queryKey: ["revenue", "daily", selectedBranchId],
    queryFn: () => apiGet("/analytics/sales/daily", branchHeaders) as Promise<Record<string, number>>,
    staleTime: 2 * 60 * 1000,
  });

  const { data: weeklySales } = useQuery({
    queryKey: ["revenue", "weekly", selectedBranchId],
    queryFn: () => apiGet("/analytics/sales/weekly", branchHeaders) as Promise<Record<string, number>>,
    staleTime: 2 * 60 * 1000,
  });

  const { data: yearlySales } = useQuery({
    queryKey: ["revenue", "yearly", selectedBranchId],
    queryFn: () => apiGet("/analytics/sales/yearly", branchHeaders) as Promise<Record<string, number>>,
    staleTime: 2 * 60 * 1000,
  });

  const monthlySales = basicData?.salesByMonth || {};

  const chartData = useMemo(() => {
    const source =
      seriesMode === "daily"
        ? dailySales || {}
        : seriesMode === "weekly"
          ? weeklySales || {}
          : seriesMode === "monthly"
            ? monthlySales
            : yearlySales || {};

    const entries = Object.entries(source)
      .map(([label, revenue], index) => ({
        label,
        revenue: toNumber(revenue),
        order: safeDateOrder(label, index),
      }))
      .sort((a, b) => a.order - b.order);

    const maxPoints =
      seriesMode === "daily"
        ? 60
        : seriesMode === "weekly"
          ? 52
          : seriesMode === "monthly"
            ? 24
            : 10;

    return entries.length > maxPoints ? entries.slice(entries.length - maxPoints) : entries;
  }, [dailySales, monthlySales, seriesMode, weeklySales, yearlySales]);

  const chartInsight = useMemo(() => {
    if (chartData.length === 0) {
      return {
        latest: 0,
        previous: 0,
        trend: 0,
        bestPoint: null as ChartPoint | null,
      };
    }

    const latest = chartData[chartData.length - 1].revenue;
    const previous = chartData.length > 1 ? chartData[chartData.length - 2].revenue : 0;
    const trend = previous > 0 ? ((latest - previous) / previous) * 100 : 0;
    const bestPoint = chartData.reduce((max, point) => (point.revenue > max.revenue ? point : max), chartData[0]);

    return { latest, previous, trend, bestPoint };
  }, [chartData]);

  const monthToDateRevenue = useMemo(() => {
    const source = dailySales || {};
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return Object.entries(source).reduce((sum, [dateKey, amount]) => {
      const parsed = new Date(dateKey);
      if (Number.isNaN(parsed.getTime())) return sum;
      if (parsed.getFullYear() === currentYear && parsed.getMonth() === currentMonth) {
        return sum + toNumber(amount);
      }
      return sum;
    }, 0);
  }, [dailySales]);

  const goalProgress = monthlyGoal > 0 ? Math.min((monthToDateRevenue / monthlyGoal) * 100, 100) : 0;
  const totalRevenue = toNumber(basicData?.totalRevenue);
  const totalSales = toNumber(basicData?.totalSales);
  const averageOrderValue = toNumber(basicData?.averageOrderValue);
  const revenueGrowth = toNumber(basicData?.revenueGrowth);
  const cogs = toNumber(basicData?.cogs);
  const grossMargin = totalRevenue - cogs;
  const grossMarginPct = totalRevenue > 0 ? ((grossMargin / totalRevenue) * 100) : 0;
  const activeBranchName =
    selectedBranchId === "all"
      ? "All Branches"
      : branches.find((branch) => branch.id === selectedBranchId)?.name || "Assigned Branch";

  // Branch comparison data (only for tenant/owner/admin/superadmin)
  const isTenantUser =
    !isBranchScopedUser &&
    (normalizedRoles.includes("owner") ||
      normalizedRoles.includes("admin") ||
      Boolean(user?.isSuperadmin));
  // Fetch dashboard analytics for branch comparison (all periods)
  const { data: dashboardData } = useQuery({
    queryKey: ["revenue", "dashboard", selectedBranchId],
    queryFn: () => apiGet("/analytics/dashboard", branchHeaders),
    enabled: isTenantUser,
    staleTime: 2 * 60 * 1000,
  });

  // Period selection for branch comparison graph
  const [branchComparePeriod, setBranchComparePeriod] = useState<"day" | "week" | "month" | "year">("month");
  const branchSalesByPeriod =
    branchComparePeriod === "day"
      ? dashboardData?.branchSalesByDay
      : branchComparePeriod === "week"
      ? dashboardData?.branchSalesByWeek
      : branchComparePeriod === "month"
      ? dashboardData?.branchSalesByMonth
      : dashboardData?.branchSalesByYear;

  const topProducts = (basicData?.topProducts || []).slice(0, 8);

  const handleBranchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextBranchId = event.target.value;
    setSelectedBranchId(nextBranchId);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedBranchId", nextBranchId);
    }
  };

  const handleGoalChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value || 0);
    setMonthlyGoal(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("revenueMonthlyGoal", String(next));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 text-sm">
      <div className="mb-3 flex flex-col gap-2 border-b border-gray-200 pb-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Revenue</h1>
          <p className="text-xs text-gray-600">Track revenue momentum, product contribution, and monthly target.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canTenantSelectBranch ? (
            <select
              value={selectedBranchId}
              onChange={handleBranchChange}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex h-8 items-center rounded-md border border-gray-300 bg-gray-50 px-2 text-xs text-gray-700">
              Branch: {activeBranchName}
            </div>
          )}

          <div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white p-1">
            {(["daily", "weekly", "monthly", "yearly"] as SeriesMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSeriesMode(mode)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  seriesMode === mode ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {mode === "daily"
                  ? "Daily"
                  : mode === "weekly"
                    ? "Weekly"
                    : mode === "monthly"
                      ? "Monthly"
                      : "Yearly"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <p className="text-[11px] text-gray-500">Total Revenue</p>
          <p className="text-base font-semibold text-gray-900">KES {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <p className="text-[11px] text-gray-500">COGS</p>
          <p className="text-base font-semibold text-gray-900">KES {cogs.toLocaleString()}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <p className="text-[11px] text-gray-500">Gross Margin</p>
          <p className="text-base font-semibold text-gray-900">KES {grossMargin.toLocaleString()}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <p className="text-[11px] text-gray-500">Gross Margin %</p>
          <p className={`text-base font-semibold ${grossMarginPct >= 0 ? "text-green-700" : "text-red-700"}`}>{grossMarginPct.toFixed(1)}%</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <p className="text-[11px] text-gray-500">Revenue Growth</p>
          <p className={`text-base font-semibold ${revenueGrowth >= 0 ? "text-green-700" : "text-red-700"}`}>
            {revenueGrowth >= 0 ? "+" : ""}
            {revenueGrowth.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <p className="text-[11px] text-gray-500">Average Order Value</p>
          <p className="text-base font-semibold text-gray-900">KES {averageOrderValue.toLocaleString()}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-white p-2">
          <p className="text-[11px] text-gray-500">Total Sales</p>
          <p className="text-base font-semibold text-gray-900">{totalSales.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-gray-200 bg-white p-3 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Revenue Trend</h2>
            <div className="text-[11px] text-gray-600">
              Latest: <span className="font-medium">KES {chartInsight.latest.toLocaleString()}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {basicLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">Loading trend...</div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">No trend data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 10, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} minTickGap={18} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={compactAmount} width={70} />
                  <Tooltip formatter={(value: number) => [`KES ${Number(value).toLocaleString()}`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-gray-700 md:grid-cols-3">
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              Current Period: <span className="font-medium">KES {chartInsight.latest.toLocaleString()}</span>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              Period Trend: <span className={`font-medium ${chartInsight.trend >= 0 ? "text-green-700" : "text-red-700"}`}>{chartInsight.trend >= 0 ? "+" : ""}{chartInsight.trend.toFixed(1)}%</span>
            </div>
            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              Best Period: <span className="font-medium">{chartInsight.bestPoint?.label || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Monthly Goal</h2>
            <label className="mb-1 block text-[11px] text-gray-600">Revenue target (KES)</label>
            <input
              type="number"
              min={0}
              value={monthlyGoal}
              onChange={handleGoalChange}
              className="h-8 w-full rounded-md border border-gray-300 px-2 text-xs text-gray-800"
            />

            <div className="mt-2 text-xs text-gray-700">
              Month-to-date: <span className="font-medium">KES {monthToDateRevenue.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded bg-gray-100">
              <div className="h-full bg-blue-600" style={{ width: `${goalProgress}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-gray-600">{goalProgress.toFixed(1)}% achieved</div>
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-3">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Business Focus</h2>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>Push bundles around your best-revenue product this week.</li>
              <li>Track if revenue trend stays positive for 3 consecutive periods.</li>
              <li>Use branch filter to catch underperforming locations early.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Top Products by Revenue</h2>
        {topProducts.length === 0 ? (
          <div className="text-xs text-gray-500">No product revenue data available yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-1.5 pr-2 font-medium">Product</th>
                  <th className="py-1.5 pr-2 font-medium">Revenue</th>
                  <th className="py-1.5 pr-2 font-medium">Sales</th>
                  <th className="py-1.5 font-medium">Revenue Share</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((item) => {
                  const share = totalRevenue > 0 ? (toNumber(item.revenue) / totalRevenue) * 100 : 0;
                  return (
                    <tr key={item.name} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-1.5 pr-2 text-gray-800">{item.name}</td>
                      <td className="py-1.5 pr-2 font-medium text-gray-900">KES {toNumber(item.revenue).toLocaleString()}</td>
                      <td className="py-1.5 pr-2 text-gray-800">{toNumber(item.sales).toLocaleString()}</td>
                      <td className="py-1.5 text-gray-800">{share.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Branch comparison for tenant users only */}
      {isTenantUser && dashboardData?.branches && branchSalesByPeriod && (
        <>
          <div className="mt-6 mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-700 font-medium">Compare by:</span>
            {["day", "week", "month", "year"].map((period) => (
              <button
                key={period}
                onClick={() => setBranchComparePeriod(period as any)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  branchComparePeriod === period ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          <BranchComparisonGraph
            branches={dashboardData.branches}
            branchSalesByPeriod={branchSalesByPeriod}
            periodType={branchComparePeriod}
          />
          <RevenueBranchComparison
            branches={dashboardData.branches}
            branchSalesByMonth={dashboardData.branchSalesByMonth}
          />
        </>
      )}
    </div>
  );
}
