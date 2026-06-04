"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { FaCalendarAlt, FaFileDownload, FaPrint, FaCalculator } from "react-icons/fa";
import { apiGet, apiPost } from "@/utils/api";
import { useUser } from "@/components/UserContext";
import { useBranches } from "@/hooks/useBranches";
import { useTenant } from "@/hooks/useTenant";
import {
  getPdfDocOptions,
  getPdfMargin,
  getPdfFontSize,
  applyPdfBusinessHeader,
  applyPdfFooterAndPageNumbers,
  getPdfTableColors,
  type PdfTemplate,
  preparePdfWatermark,
} from "@/utils/pdfTemplate";
import { getFullAssetUrl } from "@/utils/logoUrl";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ProfitAndLossData {
  revenue: { name: string; amount: number }[];
  cogs: { name: string; amount: number }[];
  expenses: { name: string; amount: number }[];
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

type TrendGranularity = "day" | "week" | "month" | "year";
type PeriodMode = "custom" | "day" | "week" | "month" | "year";

interface TrendPoint {
  label: string;
  startDate: string;
  endDate: string;
  revenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_POINTS_BY_GRANULARITY: Record<TrendGranularity, number> = {
  day: 60,
  week: 52,
  month: 36,
  year: 10,
};

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTrendLabel = (start: Date, end: Date, granularity: TrendGranularity) => {
  if (granularity === "day") {
    return start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  if (granularity === "week") {
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }

  if (granularity === "month") {
    return start.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }

  return start.toLocaleDateString(undefined, { year: "numeric" });
};

const getPeriodEnd = (start: Date, granularity: TrendGranularity) => {
  if (granularity === "day") {
    return new Date(start);
  }

  if (granularity === "week") {
    return new Date(start.getTime() + DAY_MS * 6);
  }

  if (granularity === "month") {
    return new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }

  return new Date(start.getFullYear(), 11, 31);
};

const getNextPeriodStart = (start: Date, granularity: TrendGranularity) => {
  if (granularity === "day") {
    return new Date(start.getTime() + DAY_MS);
  }

  if (granularity === "week") {
    return new Date(start.getTime() + DAY_MS * 7);
  }

  if (granularity === "month") {
    return new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }

  return new Date(start.getFullYear() + 1, 0, 1);
};

const alignPeriodStart = (date: Date, granularity: TrendGranularity) => {
  if (granularity === "month") {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  if (granularity === "year") {
    return new Date(date.getFullYear(), 0, 1);
  }

  return new Date(date);
};

const buildTrendPeriods = (
  startDate: string,
  endDate: string,
  granularity: TrendGranularity,
) => {
  const rangeStart = parseDateInput(startDate);
  const rangeEnd = parseDateInput(endDate);

  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeStart > rangeEnd) {
    return [] as { label: string; startDate: string; endDate: string }[];
  }

  const periods: { label: string; startDate: string; endDate: string }[] = [];
  let cursor = alignPeriodStart(rangeStart, granularity);

  while (cursor <= rangeEnd) {
    const periodStart = cursor < rangeStart ? new Date(rangeStart) : new Date(cursor);
    const rawPeriodEnd = getPeriodEnd(cursor, granularity);
    const periodEnd = rawPeriodEnd > rangeEnd ? new Date(rangeEnd) : rawPeriodEnd;

    if (periodStart <= periodEnd) {
      periods.push({
        label: formatTrendLabel(periodStart, periodEnd, granularity),
        startDate: toDateParam(periodStart),
        endDate: toDateParam(periodEnd),
      });
    }

    cursor = getNextPeriodStart(cursor, granularity);
  }

  const maxPoints = MAX_POINTS_BY_GRANULARITY[granularity];
  if (periods.length > maxPoints) {
    return periods.slice(periods.length - maxPoints);
  }

  return periods;
};

const compactAmount = (amount: number) => {
  const absolute = Math.abs(amount);
  if (absolute >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toFixed(0);
};

const getIsoWeekValue = (date: Date) => {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);

  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3);

  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (DAY_MS * 7));
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
};

const getDateRangeFromIsoWeek = (weekValue: string) => {
  const [yearPart, weekPart] = weekValue.split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);

  if (!year || !week) {
    return null;
  }

  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(year, 0, 4 - jan4Day);

  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startDate: toDateParam(start),
    endDate: toDateParam(end),
  };
};

const getDateRangeFromMonth = (monthValue: string) => {
  const [yearPart, monthPart] = monthValue.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!year || !month) {
    return null;
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startDate: toDateParam(start),
    endDate: toDateParam(end),
  };
};

const getDateRangeFromYear = (yearValue: string) => {
  const year = Number(yearValue);

  if (!year) {
    return null;
  }

  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
};

export default function ProfitLossStatement() {
  const today = new Date();
  const todayParam = toDateParam(today);
  const currentMonthParam = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const currentYearParam = String(today.getFullYear());

  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const { data: tenantData } = useTenant();
  const [data, setData] = useState<ProfitAndLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("month");
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("custom");
  const [selectedDay, setSelectedDay] = useState(todayParam);
  const [selectedWeek, setSelectedWeek] = useState(getIsoWeekValue(today));
  const [selectedMonth, setSelectedMonth] = useState(currentMonthParam);
  const [selectedYear, setSelectedYear] = useState(currentYearParam);
  const [startDate, setStartDate] = useState(
    toDateParam(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [endDate, setEndDate] = useState(todayParam);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

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

  const getBranchHeaders = () => {
    if (!selectedBranchId || selectedBranchId === "all") return undefined;
    return { "x-branch-id": selectedBranchId };
  };

  const handleBranchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextBranchId = event.target.value;
    setSelectedBranchId(nextBranchId);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedBranchId", nextBranchId);
    }
  };

  const activeBranchName =
    selectedBranchId === "all"
      ? "All Branches"
      : branches.find((branch) => branch.id === selectedBranchId)?.name || "Assigned Branch";

  useEffect(() => {
    checkAccounts();
    fetchData();
    fetchTrendData();
  }, [startDate, endDate, selectedBranchId, trendGranularity]);

  useEffect(() => {
    if (periodMode === "custom") {
      return;
    }

    if (periodMode === "day") {
      setStartDate(selectedDay);
      setEndDate(selectedDay);
      setTrendGranularity("day");
      return;
    }

    if (periodMode === "week") {
      const range = getDateRangeFromIsoWeek(selectedWeek);
      if (!range) return;
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setTrendGranularity("day");
      return;
    }

    if (periodMode === "month") {
      const range = getDateRangeFromMonth(selectedMonth);
      if (!range) return;
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setTrendGranularity("day");
      return;
    }

    const range = getDateRangeFromYear(selectedYear);
    if (!range) return;
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setTrendGranularity("month");
  }, [periodMode, selectedDay, selectedWeek, selectedMonth, selectedYear]);

  const checkAccounts = async () => {
    try {
      const res = await apiGet<Array<unknown>>("/ledger/accounts", getBranchHeaders());
      setAccountsCount(res.length);
    } catch (error) {
      console.error("Error checking accounts:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet<ProfitAndLossData>(
        `/ledger/profit-loss?startDate=${startDate}&endDate=${endDate}`,
        getBranchHeaders(),
      );
      setData(res);
    } catch (error) {
      console.error("Error fetching P&L data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    const periods = buildTrendPeriods(startDate, endDate, trendGranularity);
    if (periods.length === 0) {
      setTrendData([]);
      return;
    }

    setTrendLoading(true);
    try {
      const values = await Promise.all(
        periods.map(async (period) => {
          const res = await apiGet<ProfitAndLossData>(
            `/ledger/profit-loss?startDate=${period.startDate}&endDate=${period.endDate}`,
            getBranchHeaders(),
          );

          return {
            label: period.label,
            startDate: period.startDate,
            endDate: period.endDate,
            revenue: Number(res.totalRevenue || 0),
            cogs: Number(res.totalCOGS || 0),
            expenses: Number(res.totalExpenses || 0),
            netProfit: Number(res.netProfit || 0),
          } as TrendPoint;
        }),
      );

      setTrendData(values);
    } catch (error) {
      console.error("Error fetching P&L trend data:", error);
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const handleInitCOA = async () => {
    setInitializing(true);
    try {
      await apiPost("/ledger/init-coa", {}, getBranchHeaders());
      await checkAccounts();
      await fetchData();
      alert("Chart of accounts initialized.");
    } catch (error) {
      console.error("Error initializing COA:", error);
      alert("Failed to initialize accounting system.");
    } finally {
      setInitializing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiPost<{ syncedSalesCount: number }>("/ledger/sync", {}, getBranchHeaders());
      alert(`Sync complete! ${res.syncedSalesCount} records imported.`);
      fetchData();
    } catch (error) {
      console.error("Error syncing ledger:", error);
      alert("Failed to sync transactions.");
    } finally {
      setSyncing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (!data) return;

    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);
    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));

    await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || "#000000").replace("#", "") || "000000");
    doc.text("Profit & Loss Statement", margin, yPosition + 8);
    yPosition += 16;

    doc.setFontSize(fontSize - 2);
    doc.setTextColor("666666");
    doc.text(
      `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
      margin,
      yPosition,
    );
    yPosition += 6;
    doc.text(`Branch: ${activeBranchName}`, margin, yPosition);
    yPosition += 8;

    const rows = [
      ...data.revenue.map((item) => ["Revenue", item.name, item.amount.toLocaleString()]),
      ["Revenue", "Total Revenue", data.totalRevenue.toLocaleString()],
      ...data.cogs.map((item) => ["COGS", item.name, item.amount.toLocaleString()]),
      ["COGS", "Total COGS", data.totalCOGS.toLocaleString()],
      ["Summary", "Gross Profit", data.grossProfit.toLocaleString()],
      ...data.expenses.map((item) => ["Expenses", item.name, item.amount.toLocaleString()]),
      ["Expenses", "Total Expenses", data.totalExpenses.toLocaleString()],
      ["Summary", `Net ${data.netProfit >= 0 ? "Profit" : "Loss"}`, data.netProfit.toLocaleString()],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [["Section", "Item", "Amount (KES)"]],
      body: rows,
      styles: { fontSize: Math.max(8, fontSize - 2), cellPadding: 4 },
      headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: secondaryRgb },
      columnStyles: {
        2: { halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, "SaaS POS • Accounting");
    doc.save(`profit-loss-${startDate}-to-${endDate}.pdf`);
  };

  if (loading && !data) {
    return <div className="py-8 text-sm text-gray-600">Generating financial statement...</div>;
  }

  if (accountsCount === 0) {
    return (
      <div className="max-w-xl rounded-md border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <FaCalculator className="text-blue-600" />
          Accounting system not ready
        </div>
        <p className="mb-3 text-sm text-gray-600">
          Set up your chart of accounts first to track revenue, COGS, and expenses.
        </p>
        <button
          onClick={handleInitCOA}
          disabled={initializing}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {initializing ? "Initializing..." : "Setup accounting"}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const formatAmount = (amount: number) => `KES ${amount.toLocaleString()}`;
  const formatBracketAmount = (amount: number) => `(${amount.toLocaleString()})`;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-3 print:hidden md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {canTenantSelectBranch ? (
            <select
              value={selectedBranchId}
              onChange={handleBranchChange}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex h-9 items-center rounded-md border border-gray-300 bg-gray-50 px-2 text-xs text-gray-700">
              Branch: {activeBranchName}
            </div>
          )}

          <div className="relative">
            <FaCalendarAlt className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPeriodMode("custom");
                setStartDate(e.target.value);
              }}
              className="h-9 rounded-md border border-gray-300 bg-white pl-8 pr-2 text-sm text-gray-700"
            />
          </div>

          <span className="text-xs text-gray-500">to</span>

          <div className="relative">
            <FaCalendarAlt className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPeriodMode("custom");
                setEndDate(e.target.value);
              }}
              className="h-9 rounded-md border border-gray-300 bg-white pl-8 pr-2 text-sm text-gray-700"
            />
          </div>

          <div className="ml-1 flex flex-wrap items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1">
            {(["custom", "day", "week", "month", "year"] as PeriodMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setPeriodMode(mode)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  periodMode === mode
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {mode === "custom"
                  ? "Range"
                  : mode === "day"
                    ? "Day"
                    : mode === "week"
                      ? "Week"
                      : mode === "month"
                        ? "Month"
                        : "Year"}
              </button>
            ))}
          </div>

          {periodMode === "day" && (
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => {
                setSelectedDay(e.target.value);
                setPeriodMode("day");
              }}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
            />
          )}

          {periodMode === "week" && (
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value);
                setPeriodMode("week");
              }}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
            />
          )}

          {periodMode === "month" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPeriodMode("month");
              }}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
            />
          )}

          {periodMode === "year" && (
            <input
              type="number"
              min={2000}
              max={2100}
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setPeriodMode("year");
              }}
              className="h-9 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>

          <button
            onClick={handlePrint}
            className="flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FaPrint /> Print
          </button>

          <button
            onClick={handleExportPdf}
            className="flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            <FaFileDownload /> Export PDF
          </button>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-3 py-2">
          <h1 className="text-base font-semibold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-xs text-gray-600">
            {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </p>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 print:hidden">
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {(["day", "week", "month", "year"] as TrendGranularity[]).map((option) => (
              <button
                key={option}
                onClick={() => setTrendGranularity(option)}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  trendGranularity === option
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {option === "day"
                  ? "Days"
                  : option === "week"
                    ? "Weeks"
                    : option === "month"
                      ? "Months"
                      : "Years"}
              </button>
            ))}
          </div>

          <div className="h-60 w-full">
            {trendLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">
                Building trend graph...
              </div>
            ) : trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">
                No trend data for the selected range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    minTickGap={18}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    width={72}
                    tickFormatter={compactAmount}
                  />
                  <Tooltip
                    formatter={(value, key) => [
                      `KES ${Number(value ?? 0).toLocaleString()}`,
                      String(key) === "revenue"
                        ? "Revenue"
                        : String(key) === "cogs"
                          ? "COGS"
                          : String(key) === "expenses"
                            ? "Expenses"
                            : "Net Profit",
                    ]}
                    labelFormatter={(label, payload) => {
                      if (!payload || payload.length === 0) return label;
                      const entry = payload[0].payload as TrendPoint;
                      return `${label} (${entry.startDate} to ${entry.endDate})`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cogs"
                    name="COGS"
                    stroke="#7c3aed"
                    strokeWidth={1.8}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#ea580c"
                    strokeWidth={1.8}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="Net Profit"
                    stroke="#2563eb"
                    strokeWidth={2.2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-4 p-3">
          <section className="space-y-1 bg-gray-50 border border-gray-200 rounded-md p-3">
            <h2 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">Revenue</h2>
            {data.revenue.length > 0 ? (
              data.revenue.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-100 py-1">
                  <span className="text-gray-800">{r.name}</span>
                  <span className="font-medium text-gray-900">{formatAmount(r.amount)}</span>
                </div>
              ))
            ) : (
              <div className="py-1 text-xs text-gray-500">No revenue recorded.</div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
              <span>Total Revenue</span>
              <span>{formatAmount(data.totalRevenue)}</span>
            </div>
          </section>

          <section className="space-y-1 bg-gray-50 border border-gray-200 rounded-md p-3">
            <h2 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
              Cost of Goods Sold
            </h2>
            {data.cogs.length > 0 ? (
              data.cogs.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-100 py-1">
                  <span className="text-gray-800">{c.name}</span>
                  <span className="font-medium text-gray-900">{formatBracketAmount(c.amount)}</span>
                </div>
              ))
            ) : (
              <div className="py-1 text-xs text-gray-500">No COGS recorded.</div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
              <span>Total COGS</span>
              <span>{formatBracketAmount(data.totalCOGS)}</span>
            </div>
          </section>

          <div className="flex items-center justify-between border border-yellow-200 pt-2 font-semibold bg-yellow-50 rounded-md p-3">
            <span>Gross Profit</span>
            <span>{formatAmount(data.grossProfit)}</span>
          </div>

          <section className="space-y-1 bg-gray-50 border border-gray-200 rounded-md p-3">
            <h2 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
              Operating Expenses
            </h2>
            {data.expenses.length > 0 ? (
              data.expenses.map((e, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-100 py-1">
                  <span className="text-gray-800">{e.name}</span>
                  <span className="font-medium text-gray-900">{formatAmount(e.amount)}</span>
                </div>
              ))
            ) : (
              <div className="py-1 text-xs text-gray-500">No operating expenses recorded.</div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
              <span>Total Operating Expenses</span>
              <span>{formatAmount(data.totalExpenses)}</span>
            </div>
          </section>

          <div className={`flex items-center justify-between border-t-2 border-gray-900 pt-2 font-semibold ${data.netProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'} rounded-md p-3`}>
            <span>Net {data.netProfit >= 0 ? "Profit" : "Loss"}</span>
            <span>{formatAmount(data.netProfit)}</span>
          </div>

          <div className="pt-1 text-xs text-gray-600">Generated on {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
