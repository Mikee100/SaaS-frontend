"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import Link from "next/link";
import { FaCalendarAlt, FaFileDownload, FaPrint, FaCalculator } from "react-icons/fa";
import { apiGet, apiPost } from "@/utils/api";
import { useUser } from "@/components/UserContext";
import { useBranches } from "@/hooks/useBranches";
import { useTenant } from "@/hooks/useTenant";
import { useBranchScope } from "@/hooks/useBranchScope";
import { useToast } from "@/components/ui/use-toast";
import {
  DEFAULT_REPORT_PREFERENCES,
  mergeReportPreferences,
  type ReportPreferences,
} from "@/utils/reportPreferences";
import {
  getPdfDocOptions,
  getPdfMargin,
  getPdfBodyFontSize,
  getPdfTitleFontSize,
  getPdfCurrency,
  applyPdfBusinessHeader,
  applyPdfFooterAndPageNumbers,
  getPdfTableColors,
  type PdfTemplate,
  preparePdfWatermark,
} from "@/utils/pdfTemplate";
import { getFullAssetUrl } from "@/utils/logoUrl";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
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

interface LedgerAccount {
  id: string;
  name: string;
  code: string;
  type: string;
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

interface ProfitAndLossTrendSummary {
  granularity: TrendGranularity;
  points: TrendPoint[];
}

type PdfSectionVariable =
  | "revenue"
  | "cogs"
  | "grossProfit"
  | "expenses"
  | "netProfit"
  | "comparisonSummary";

type PdfChartSeriesVariable = "revenue" | "cogs" | "expenses" | "netProfit";
type PdfExportPreset = "minimal" | "standard" | "detailed";

const DAY_MS = 24 * 60 * 60 * 1000;

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

const getPreviousRange = (startDate: string, endDate: string) => {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }

  const durationDays = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const previousEnd = new Date(start.getTime() - DAY_MS);
  const previousStart = new Date(previousEnd.getTime() - DAY_MS * (durationDays - 1));

  return {
    startDate: toDateParam(previousStart),
    endDate: toDateParam(previousEnd),
  };
};

const getSamePeriodLastYear = (startDate: string, endDate: string) => {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }

  const previousStart = new Date(start);
  previousStart.setFullYear(previousStart.getFullYear() - 1);

  const previousEnd = new Date(end);
  previousEnd.setFullYear(previousEnd.getFullYear() - 1);

  return {
    startDate: toDateParam(previousStart),
    endDate: toDateParam(previousEnd),
  };
};

const getPriorYtdRange = (currentEndDate: string) => {
  const end = parseDateInput(currentEndDate);

  if (Number.isNaN(end.getTime())) {
    return null;
  }

  const priorYear = end.getFullYear() - 1;
  const start = new Date(priorYear, 0, 1);
  const priorEnd = new Date(end);
  priorEnd.setFullYear(priorYear);

  return {
    startDate: toDateParam(start),
    endDate: toDateParam(priorEnd),
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
  const { toast } = useToast();
  const [data, setData] = useState<ProfitAndLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
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
  const initialCompareRange = getPreviousRange(
    toDateParam(new Date(today.getFullYear(), today.getMonth(), 1)),
    todayParam,
  );
  const [enableComparison, setEnableComparison] = useState(false);
  const [compareStartDate, setCompareStartDate] = useState(
    initialCompareRange?.startDate || todayParam,
  );
  const [compareEndDate, setCompareEndDate] = useState(
    initialCompareRange?.endDate || todayParam,
  );
  const [compareData, setCompareData] = useState<ProfitAndLossData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [reportPreferences, setReportPreferences] =
    useState<ReportPreferences>(DEFAULT_REPORT_PREFERENCES);
  const [selectedPdfChartGranularities, setSelectedPdfChartGranularities] =
    useState<TrendGranularity[]>(["month"]);
  const [selectedPdfSectionVariables, setSelectedPdfSectionVariables] = useState<
    PdfSectionVariable[]
  >(["revenue", "cogs", "grossProfit", "expenses", "netProfit", "comparisonSummary"]);
  const [selectedPdfChartSeries, setSelectedPdfChartSeries] = useState<
    PdfChartSeriesVariable[]
  >(["revenue", "cogs", "expenses", "netProfit"]);
  const [pdfExportPreset, setPdfExportPreset] = useState<PdfExportPreset>("standard");
  const [showAdvancedPdfOptions, setShowAdvancedPdfOptions] = useState(false);
  const trendChartRef = useRef<HTMLDivElement | null>(null);
  const {
    selectedBranchId,
    setSelectedBranchIdPersisted,
    canTenantSelectBranch,
    activeBranchName,
  } = useBranchScope({ user, branches });

  const getBranchHeaders = () => {
    if (!selectedBranchId || selectedBranchId === "all") return undefined;
    return { "x-branch-id": selectedBranchId };
  };

  const handleBranchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextBranchId = event.target.value;
    setSelectedBranchIdPersisted(nextBranchId);
  };

  useEffect(() => {
    checkAccounts();
    fetchData();
    fetchTrendData();
  }, [startDate, endDate, selectedBranchId, trendGranularity]);

  useEffect(() => {
    let cancelled = false;

    const loadReportPreferences = async () => {
      try {
        const me = await apiGet<{ preferences?: Record<string, unknown> }>(
          "/user/me",
        );
        if (cancelled) return;

        const rawPreferences =
          me?.preferences && typeof me.preferences === "object"
            ? me.preferences
            : {};
        setReportPreferences(
          mergeReportPreferences(rawPreferences.reportPreferences),
        );
      } catch {
        if (!cancelled) {
          setReportPreferences({ ...DEFAULT_REPORT_PREFERENCES });
        }
      }
    };

    loadReportPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const preferred = reportPreferences.pdfTrendGranularities as TrendGranularity[];
    if (preferred && preferred.length > 0) {
      setSelectedPdfChartGranularities(preferred);
    }
  }, [reportPreferences.pdfTrendGranularities]);

  const togglePdfChartGranularity = (granularity: TrendGranularity) => {
    setSelectedPdfChartGranularities((prev) => {
      const exists = prev.includes(granularity);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== granularity);
      }
      return [...prev, granularity];
    });
  };

  const togglePdfSectionVariable = (variable: PdfSectionVariable) => {
    setSelectedPdfSectionVariables((prev) => {
      const exists = prev.includes(variable);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== variable);
      }
      return [...prev, variable];
    });
  };

  const togglePdfChartSeries = (series: PdfChartSeriesVariable) => {
    setSelectedPdfChartSeries((prev) => {
      const exists = prev.includes(series);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== series);
      }
      return [...prev, series];
    });
  };

  const applyPdfPreset = (preset: PdfExportPreset) => {
    setPdfExportPreset(preset);

    if (preset === "minimal") {
      setSelectedPdfSectionVariables(["netProfit"]);
      setSelectedPdfChartGranularities(["month"]);
      setSelectedPdfChartSeries(["netProfit"]);
      return;
    }

    if (preset === "standard") {
      setSelectedPdfSectionVariables([
        "revenue",
        "cogs",
        "grossProfit",
        "expenses",
        "netProfit",
      ]);
      setSelectedPdfChartGranularities(["month"]);
      setSelectedPdfChartSeries(["revenue", "expenses", "netProfit"]);
      return;
    }

    setSelectedPdfSectionVariables([
      "revenue",
      "cogs",
      "grossProfit",
      "expenses",
      "netProfit",
      "comparisonSummary",
    ]);
    setSelectedPdfChartGranularities(["day", "week", "month", "year"]);
    setSelectedPdfChartSeries(["revenue", "cogs", "expenses", "netProfit"]);
  };

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

  useEffect(() => {
    if (!enableComparison) {
      setCompareData(null);
      setCompareError(null);
      return;
    }

    const fetchCompareData = async () => {
      setCompareLoading(true);
      try {
        const res = await apiGet<ProfitAndLossData>(
          `/ledger/profit-loss?startDate=${compareStartDate}&endDate=${compareEndDate}`,
          getBranchHeaders(),
        );
        setCompareData(res);
        setCompareError(null);
      } catch (error) {
        console.error("Error fetching comparison P&L data:", error);
        setCompareData(null);
        setCompareError("Unable to load comparison data for the selected period.");
      } finally {
        setCompareLoading(false);
      }
    };

    fetchCompareData();
  }, [enableComparison, compareStartDate, compareEndDate, selectedBranchId]);

  const checkAccounts = async () => {
    try {
      const res = await apiGet<LedgerAccount[]>("/ledger/accounts", getBranchHeaders());
      setLedgerAccounts(res || []);
      setAccountsCount((res || []).length);
      setAccountsError(null);
    } catch (error) {
      console.error("Error checking accounts:", error);
      setAccountsError("Unable to verify chart of accounts status.");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setDataError(null);
    try {
      const res = await apiGet<ProfitAndLossData>(
        `/ledger/profit-loss?startDate=${startDate}&endDate=${endDate}`,
        getBranchHeaders(),
      );
      setData(res);
    } catch (error) {
      console.error("Error fetching P&L data:", error);
      setDataError("Unable to load Profit & Loss data. Check your filters or connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    const parsedStartDate = parseDateInput(startDate);
    const parsedEndDate = parseDateInput(endDate);
    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime()) ||
      parsedStartDate > parsedEndDate
    ) {
      setTrendData([]);
      setTrendError("Choose a valid date range to build trend data.");
      return;
    }

    setTrendLoading(true);
    setTrendError(null);
    try {
      const trendSummary = await apiGet<ProfitAndLossTrendSummary>(
        `/ledger/profit-loss/trend?startDate=${startDate}&endDate=${endDate}&granularity=${trendGranularity}`,
        getBranchHeaders(),
      );
      setTrendData(trendSummary.points || []);
    } catch (error) {
      console.error("Error fetching P&L trend data:", error);
      setTrendData([]);
      setTrendError("Unable to build trend chart for the selected range.");
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
      toast({ title: "Accounting initialized", description: "Chart of accounts initialized." });
    } catch (error) {
      console.error("Error initializing COA:", error);
      toast({
        title: "Initialization failed",
        description: "Failed to initialize accounting system.",
        variant: "destructive",
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiPost<{ syncedSalesCount: number }>("/ledger/sync", {}, getBranchHeaders());
      toast({
        title: "Sync complete",
        description: `${res.syncedSalesCount} records imported.`,
      });
      fetchData();
    } catch (error) {
      console.error("Error syncing ledger:", error);
      toast({
        title: "Sync failed",
        description: "Failed to sync transactions.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const parseTrendValue = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.replace(/,/g, "").trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const getChartSnapshotDataUrl = async (): Promise<string | null> => {
    const svgElement = trendChartRef.current?.querySelector("svg");
    if (!svgElement) return null;

    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      if (!clonedSvg.getAttribute("xmlns")) {
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      if (!clonedSvg.getAttribute("xmlns:xlink")) {
        clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      }

      const bbox = svgElement.getBoundingClientRect();
      const width = Math.max(1, Math.floor(bbox.width));
      const height = Math.max(1, Math.floor(bbox.height));

      if (!clonedSvg.getAttribute("width")) {
        clonedSvg.setAttribute("width", String(width));
      }
      if (!clonedSvg.getAttribute("height")) {
        clonedSvg.setAttribute("height", String(height));
      }

      const serialized = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      const blobUrl = URL.createObjectURL(svgBlob);

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load SVG snapshot"));
        img.src = blobUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(blobUrl);
        return null;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const drawTrendChartPage = (
    doc: jsPDF,
    points: TrendPoint[],
    granularity: TrendGranularity,
    currency: string,
    margin: number,
    selectedSeries: PdfChartSeriesVariable[],
  ) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const chartX = margin;
    const chartY = margin + 16;
    const chartWidth = pageWidth - margin * 2;
    const chartHeight = Math.min(105, pageHeight - margin * 2 - 20);

    doc.setFontSize(13);
    doc.setTextColor("1f2937");
    doc.text(`Trend Chart (${granularity.toUpperCase()})`, margin, margin + 6);

    if (!points.length) {
      doc.setFontSize(10);
      doc.setTextColor("6b7280");
      doc.text("No trend data available for this granularity.", margin, margin + 16);
      return;
    }

    const seriesConfig: Record<
      PdfChartSeriesVariable,
      { label: string; color: [number, number, number]; width: number; accessor: (p: TrendPoint) => number }
    > = {
      revenue: {
        label: "Revenue",
        color: [15, 118, 110],
        width: 0.9,
        accessor: (p) => parseTrendValue(p.revenue),
      },
      cogs: {
        label: "COGS",
        color: [124, 58, 237],
        width: 0.8,
        accessor: (p) => parseTrendValue(p.cogs),
      },
      expenses: {
        label: "Expenses",
        color: [234, 88, 12],
        width: 0.8,
        accessor: (p) => parseTrendValue(p.expenses),
      },
      netProfit: {
        label: "Net Profit",
        color: [37, 99, 235],
        width: 1.1,
        accessor: (p) => parseTrendValue(p.netProfit),
      },
    };

    const activeSeries =
      selectedSeries.length > 0 ? selectedSeries : (["netProfit"] as PdfChartSeriesVariable[]);

    const allValues = points.flatMap((p) =>
      activeSeries.map((series) => seriesConfig[series].accessor(p)),
    );

    let minValue = Math.min(...allValues);
    let maxValue = Math.max(...allValues);
    if (minValue === maxValue) {
      minValue -= 1;
      maxValue += 1;
    }

    const yPadding = (maxValue - minValue) * 0.08;
    minValue -= yPadding;
    maxValue += yPadding;

    const xForIndex = (index: number) => {
      if (points.length === 1) return chartX + chartWidth / 2;
      return chartX + (index / (points.length - 1)) * chartWidth;
    };

    const yForValue = (value: number) => {
      const ratio = (value - minValue) / (maxValue - minValue);
      return chartY + chartHeight - ratio * chartHeight;
    };

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    for (let i = 0; i <= 4; i++) {
      const y = chartY + (i / 4) * chartHeight;
      doc.line(chartX, y, chartX + chartWidth, y);
    }

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.35);
    doc.line(chartX, chartY, chartX, chartY + chartHeight);
    doc.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight);

    const drawSeries = (
      accessor: (p: TrendPoint) => number,
      color: [number, number, number],
      width: number,
    ) => {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(width);
      for (let i = 1; i < points.length; i++) {
        const prevY = yForValue(accessor(points[i - 1]));
        const currY = yForValue(accessor(points[i]));
        if (!Number.isFinite(prevY) || !Number.isFinite(currY)) {
          continue;
        }
        doc.line(
          xForIndex(i - 1),
          prevY,
          xForIndex(i),
          currY,
        );
      }

      // Add dots so the graph is visible even on short ranges.
      doc.setFillColor(color[0], color[1], color[2]);
      points.forEach((point, index) => {
        const y = yForValue(accessor(point));
        if (!Number.isFinite(y)) return;
        doc.circle(xForIndex(index), y, 0.9, "F");
      });
    };

    activeSeries.forEach((series) => {
      const config = seriesConfig[series];
      drawSeries(config.accessor, config.color, config.width);
    });

    const legendY = chartY + chartHeight + 8;
    const legendItems: Array<{ label: string; color: [number, number, number] }> = activeSeries.map(
      (series) => ({
        label: seriesConfig[series].label,
        color: seriesConfig[series].color,
      }),
    );

    let legendX = chartX;
    legendItems.forEach((item) => {
      doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
      doc.setLineWidth(1.2);
      doc.line(legendX, legendY, legendX + 7, legendY);
      doc.setFontSize(9);
      doc.setTextColor("374151");
      doc.text(item.label, legendX + 9, legendY + 1.5);
      legendX += 34;
    });

    doc.setFontSize(9);
    doc.setTextColor("6b7280");
    doc.text(`Scale: ${currency}`, chartX, legendY + 8);
    doc.text(`Min ${compactAmount(minValue)} · Max ${compactAmount(maxValue)}`, chartX + 35, legendY + 8);
    doc.text(points[0].label || "", chartX, legendY + 14);
    doc.text(points[points.length - 1].label || "", chartX + chartWidth - 20, legendY + 14);
  };

  const handleExportPdf = async () => {
    if (!data) return;
    setExportingPdf(true);

    try {
      const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
      const margin = getPdfMargin(pdfTemplate);
      const titleFontSize = getPdfTitleFontSize(pdfTemplate);
      const bodyFontSize = getPdfBodyFontSize(pdfTemplate);
      const reportCurrency = getPdfCurrency(tenantData, pdfTemplate);
      const { primaryRgb } = getPdfTableColors(pdfTemplate);
      const doc = new jsPDF(getPdfDocOptions(pdfTemplate));

      await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
      let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

      doc.setFontSize(titleFontSize);
      doc.setTextColor((pdfTemplate.primaryColor || "#000000").replace("#", "") || "000000");
      doc.text("Profit & Loss Statement", margin, yPosition + 6);
      yPosition += 10;

      doc.setFontSize(bodyFontSize);
      doc.setTextColor("666666");
      doc.text(
        `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
        margin,
        yPosition,
      );
      yPosition += 4;
      if (pdfTemplate.branchInfo) {
        doc.text(`Branch: ${activeBranchName}`, margin, yPosition);
        yPosition += 4;
      }
      yPosition += 3;

      const rows: string[][] = [];
      const sectionVars =
        selectedPdfSectionVariables.length > 0
          ? selectedPdfSectionVariables
          : (["netProfit"] as PdfSectionVariable[]);

      if (sectionVars.includes("revenue")) {
        rows.push(
          ...data.revenue.map((item) => ["Revenue", item.name, item.amount.toLocaleString()]),
          ["Revenue", "Total Revenue", data.totalRevenue.toLocaleString()],
        );
      }

      if (sectionVars.includes("cogs")) {
        rows.push(
          ...data.cogs.map((item) => ["COGS", item.name, item.amount.toLocaleString()]),
          ["COGS", "Total COGS", data.totalCOGS.toLocaleString()],
        );
      }

      if (sectionVars.includes("grossProfit")) {
        rows.push(["Summary", "Gross Profit", data.grossProfit.toLocaleString()]);
      }

      if (sectionVars.includes("expenses")) {
        rows.push(
          ...data.expenses.map((item) => ["Expenses", item.name, item.amount.toLocaleString()]),
          ["Expenses", "Total Expenses", data.totalExpenses.toLocaleString()],
        );
      }

      if (sectionVars.includes("netProfit")) {
        rows.push([
          "Summary",
          `Net ${data.netProfit >= 0 ? "Profit" : "Loss"}`,
          data.netProfit.toLocaleString(),
        ]);
      }

      if (rows.length === 0) {
        rows.push([
          "Summary",
          `Net ${data.netProfit >= 0 ? "Profit" : "Loss"}`,
          data.netProfit.toLocaleString(),
        ]);
      }

      autoTable(doc, {
        startY: yPosition,
        head: [["Section", "Item", `Amount (${reportCurrency})`]],
        body: rows,
        styles: {
          fontSize: reportPreferences.compactPdfLayout
            ? Math.max(7, bodyFontSize - 3)
            : Math.max(8, bodyFontSize - 2),
          cellPadding: reportPreferences.compactPdfLayout ? 2 : 3,
        },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          2: { halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      let nextY =
        ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
          ?.finalY || yPosition) + 8;

      if (
        reportPreferences.includeComparisonSummary &&
        selectedPdfSectionVariables.includes("comparisonSummary") &&
        enableComparison &&
        compareData
      ) {
        doc.setFontSize(Math.max(9, bodyFontSize - 1));
        doc.setTextColor("333333");
        doc.text(
          `Comparison Net Change: ${formatDelta(netDelta)} (${formatPctDelta(
            data.netProfit,
            compareData.netProfit,
          )})`,
          margin,
          nextY,
        );
        nextY += 6;
      }

      if (reportPreferences.includeChartsInPdf) {
        const liveChartSnapshot = await getChartSnapshotDataUrl();
        if (liveChartSnapshot) {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const imageWidth = pageWidth - margin * 2;
          const imageHeight = Math.min(pageHeight - margin * 2 - 10, imageWidth * 0.56);

          doc.addPage();
          doc.setFontSize(12);
          doc.setTextColor("333333");
          doc.text(
            `Trend Chart Snapshot (${trendGranularity.toUpperCase()} view)`,
            margin,
            margin + 5,
          );
          doc.addImage(
            liveChartSnapshot,
            "PNG",
            margin,
            margin + 10,
            imageWidth,
            imageHeight,
          );
        }

        const chartGranularities: TrendGranularity[] =
          selectedPdfChartGranularities.length > 0
            ? selectedPdfChartGranularities
            : ["month"];

        let renderedChartCount = 0;
        for (const chartGranularity of chartGranularities) {
          let points: TrendPoint[] = [];

          if (chartGranularity === trendGranularity && trendData.length > 0) {
            points = trendData;
          }

          try {
            if (points.length === 0) {
              const trendSummary = await apiGet<ProfitAndLossTrendSummary>(
                `/ledger/profit-loss/trend?startDate=${startDate}&endDate=${endDate}&granularity=${chartGranularity}`,
                getBranchHeaders(),
              );
              points = trendSummary?.points || [];
            }

            doc.addPage();
            drawTrendChartPage(
              doc,
              points,
              chartGranularity,
              reportCurrency,
              margin,
              selectedPdfChartSeries,
            );
            if (points.length > 0) {
              renderedChartCount += 1;
            }
          } catch {
            doc.addPage();
            drawTrendChartPage(
              doc,
              [],
              chartGranularity,
              reportCurrency,
              margin,
              selectedPdfChartSeries,
            );
          }
        }

        // Last-resort fallback: capture the visible on-screen chart if all chart pages are empty.
        if (renderedChartCount === 0 && trendChartRef.current) {
          try {
            const canvas = await html2canvas(trendChartRef.current, {
              backgroundColor: "#ffffff",
              scale: 2,
              useCORS: true,
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const imageWidth = pageWidth - margin * 2;
            const imageHeight = (canvas.height * imageWidth) / canvas.width;

            doc.addPage();
            doc.setFontSize(12);
            doc.setTextColor("333333");
            doc.text("Trend Chart (Current View Snapshot)", margin, margin + 5);

            doc.addImage(
              canvas.toDataURL("image/png"),
              "PNG",
              margin,
              margin + 10,
              imageWidth,
              Math.min(imageHeight, pageHeight - margin * 2 - 10),
            );
          } catch {
            // Keep PDF export resilient even if screenshot fallback fails.
          }
        }
      }

      applyPdfFooterAndPageNumbers(doc, pdfTemplate, "SaaS POS • Accounting");
      doc.save(`profit-loss-${startDate}-to-${endDate}.pdf`);

      toast({
        title: "PDF generated",
        description: "Profit & Loss report downloaded successfully.",
      });
    } catch (error) {
      console.error("Error exporting Profit & Loss PDF:", error);
      toast({
        title: "Export failed",
        description: "Unable to generate Profit & Loss PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportingPdf(false);
    }
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

  const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
  const reportCurrency = getPdfCurrency(tenantData, pdfTemplate);
  const formatAmount = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: reportCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${reportCurrency} ${amount.toLocaleString()}`;
    }
  };
  const formatBracketAmount = (amount: number) => `(${formatAmount(Math.abs(amount))})`;
  const marginPct = data.totalRevenue === 0 ? 0 : (data.netProfit / data.totalRevenue) * 100;
  const compareMarginPct =
    (compareData?.totalRevenue || 0) === 0
      ? 0
      : ((compareData?.netProfit || 0) / (compareData?.totalRevenue || 1)) * 100;
  const getPctDelta = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return 0;
      return current > 0 ? 100 : -100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };
  const formatPctDelta = (current: number, previous: number) => {
    const pct = getPctDelta(current, previous);
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  };
  const formatDelta = (value: number) =>
    `${value >= 0 ? "+" : "-"}${formatAmount(Math.abs(value))}`;
  const revenueDelta = data.totalRevenue - (compareData?.totalRevenue || 0);
  const cogsDelta = data.totalCOGS - (compareData?.totalCOGS || 0);
  const grossDelta = data.grossProfit - (compareData?.grossProfit || 0);
  const expensesDelta = data.totalExpenses - (compareData?.totalExpenses || 0);
  const netDelta = data.netProfit - (compareData?.netProfit || 0);
  const explainabilityText =
    "Revenue includes recognized sales for the selected period. COGS and expenses include posted ledger movements within the same date range.";

  const buildAmountMap = (items: { name: string; amount: number }[]) => {
    const map = new Map<string, number>();
    items.forEach((item) => map.set(item.name, Number(item.amount || 0)));
    return map;
  };

  const topDriverRows = (() => {
    if (!enableComparison || !compareData) return [] as {
      key: string;
      section: "Revenue" | "COGS" | "Expenses";
      name: string;
      delta: number;
      impact: number;
    }[];

    const revenueCurrent = buildAmountMap(data.revenue);
    const revenuePrevious = buildAmountMap(compareData.revenue);
    const cogsCurrent = buildAmountMap(data.cogs);
    const cogsPrevious = buildAmountMap(compareData.cogs);
    const expensesCurrent = buildAmountMap(data.expenses);
    const expensesPrevious = buildAmountMap(compareData.expenses);

    const rows: {
      key: string;
      section: "Revenue" | "COGS" | "Expenses";
      name: string;
      delta: number;
      impact: number;
    }[] = [];

    const pushRows = (
      section: "Revenue" | "COGS" | "Expenses",
      currentMap: Map<string, number>,
      previousMap: Map<string, number>,
      direction: 1 | -1,
    ) => {
      const names = new Set([...currentMap.keys(), ...previousMap.keys()]);
      names.forEach((name) => {
        const current = currentMap.get(name) || 0;
        const previous = previousMap.get(name) || 0;
        const delta = current - previous;
        if (Math.abs(delta) < 0.005) return;

        rows.push({
          key: `${section}-${name}`,
          section,
          name,
          delta,
          impact: direction * delta,
        });
      });
    };

    pushRows("Revenue", revenueCurrent, revenuePrevious, 1);
    pushRows("COGS", cogsCurrent, cogsPrevious, -1);
    pushRows("Expenses", expensesCurrent, expensesPrevious, -1);

    return rows;
  })();

  const topPositiveDrivers = [...topDriverRows]
    .filter((row) => row.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  const topNegativeDrivers = [...topDriverRows]
    .filter((row) => row.impact < 0)
    .sort((a, b) => a.impact - b.impact)
    .slice(0, 5);

  const normalizeAccountName = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const resolveAccountLink = (name: string, preferredType?: "revenue" | "expense") => {
    const normalized = normalizeAccountName(name);
    if (!normalized) return null;

    const typeFiltered = preferredType
      ? ledgerAccounts.filter((account) => account.type === preferredType)
      : ledgerAccounts;

    const exact = typeFiltered.find(
      (account) => normalizeAccountName(account.name) === normalized,
    );
    if (exact) return exact;

    const contains = typeFiltered.find((account) => {
      const accountName = normalizeAccountName(account.name);
      return accountName.includes(normalized) || normalized.includes(accountName);
    });
    if (contains) return contains;

    return null;
  };

  const buildAccountHref = (accountId: string) => {
    const params = new URLSearchParams();
    params.set("from", "profit-loss");
    params.set("startDate", startDate);
    params.set("endDate", endDate);
    params.set("branchId", selectedBranchId);
    return `/accounts/account/${accountId}?${params.toString()}`;
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2 border-b border-gray-200 pb-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Filters</span>

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

          <label className="ml-1 flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={enableComparison}
              onChange={(e) => {
                const checked = e.target.checked;
                setEnableComparison(checked);
                if (checked) {
                  const previousRange = getPreviousRange(startDate, endDate);
                  if (previousRange) {
                    setCompareStartDate(previousRange.startDate);
                    setCompareEndDate(previousRange.endDate);
                  }
                }
              }}
              className="h-3.5 w-3.5"
            />
            Compare
          </label>

          {enableComparison && (
            <>
              <div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-1 py-1">
                <button
                  onClick={() => {
                    const previousRange = getPreviousRange(startDate, endDate);
                    if (!previousRange) return;
                    setCompareStartDate(previousRange.startDate);
                    setCompareEndDate(previousRange.endDate);
                  }}
                  className="rounded px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                >
                  Previous Period
                </button>
                <button
                  onClick={() => {
                    const lastYearRange = getSamePeriodLastYear(startDate, endDate);
                    if (!lastYearRange) return;
                    setCompareStartDate(lastYearRange.startDate);
                    setCompareEndDate(lastYearRange.endDate);
                  }}
                  className="rounded px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                >
                  Same Period Last Year
                </button>
                <button
                  onClick={() => {
                    const priorYtdRange = getPriorYtdRange(endDate);
                    if (!priorYtdRange) return;
                    setCompareStartDate(priorYtdRange.startDate);
                    setCompareEndDate(priorYtdRange.endDate);
                  }}
                  className="rounded px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100"
                >
                  Prior YTD
                </button>
              </div>

              <input
                type="date"
                value={compareStartDate}
                onChange={(e) => setCompareStartDate(e.target.value)}
                className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="date"
                value={compareEndDate}
                onChange={(e) => setCompareEndDate(e.target.value)}
                className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700"
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">View</span>
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

            {periodMode === "day" && (
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => {
                  setSelectedDay(e.target.value);
                  setPeriodMode("day");
                }}
                className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
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
                className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
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
                className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
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
                className="h-8 w-24 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Actions</span>

            <select
              value={pdfExportPreset}
              onChange={(e) => applyPdfPreset(e.target.value as PdfExportPreset)}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700"
              title="PDF export preset"
            >
              <option value="minimal">PDF: Minimal</option>
              <option value="standard">PDF: Standard</option>
              <option value="detailed">PDF: Detailed</option>
            </select>

            <button
              type="button"
              onClick={() => setShowAdvancedPdfOptions((prev) => !prev)}
              className="flex h-8 items-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {showAdvancedPdfOptions ? "Hide Options" : "More Options"}
            </button>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex h-8 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync"}
            </button>

            <button
              onClick={handlePrint}
              className="flex h-8 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FaPrint /> Print
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex h-8 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaFileDownload /> {exportingPdf ? "Exporting..." : "Export PDF"}
            </button>

            <Link
              href="/settings/report-preferences"
              className="flex h-8 items-center rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              Report PDF Settings
            </Link>
          </div>
        </div>

        {showAdvancedPdfOptions && (
          <div className="space-y-2 rounded-md border border-gray-200 bg-white px-2 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Advanced PDF options</div>

            {reportPreferences.includeChartsInPdf && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium text-gray-600">Chart pages</span>
                {(["day", "week", "month", "year"] as TrendGranularity[]).map((option) => {
                  const selected = selectedPdfChartGranularities.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => togglePdfChartGranularity(option)}
                      className={`rounded-md px-2 py-1 text-xs font-medium border ${
                        selected
                          ? "border-blue-600 bg-blue-100 text-blue-800"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
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
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-gray-600">Sections</span>
              {(
                [
                  { key: "revenue", label: "Revenue" },
                  { key: "cogs", label: "COGS" },
                  { key: "grossProfit", label: "Gross" },
                  { key: "expenses", label: "Expenses" },
                  { key: "netProfit", label: "Net" },
                  { key: "comparisonSummary", label: "Comparison" },
                ] as { key: PdfSectionVariable; label: string }[]
              ).map((item) => {
                const selected = selectedPdfSectionVariables.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => togglePdfSectionVariable(item.key)}
                    className={`rounded-md px-2 py-1 text-xs font-medium border ${
                      selected
                        ? "border-blue-600 bg-blue-100 text-blue-800"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {reportPreferences.includeChartsInPdf && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium text-gray-600">Chart lines</span>
                {(
                  [
                    { key: "revenue", label: "Revenue" },
                    { key: "cogs", label: "COGS" },
                    { key: "expenses", label: "Expenses" },
                    { key: "netProfit", label: "Net" },
                  ] as { key: PdfChartSeriesVariable; label: string }[]
                ).map((item) => {
                  const selected = selectedPdfChartSeries.includes(item.key);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => togglePdfChartSeries(item.key)}
                      className={`rounded-md px-2 py-1 text-xs font-medium border ${
                        selected
                          ? "border-blue-600 bg-blue-100 text-blue-800"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] text-blue-900">
          <span className="font-semibold">PDF:</span>
          <span className="rounded bg-white px-2 py-0.5 capitalize">{pdfExportPreset}</span>
          <span className="rounded bg-white px-2 py-0.5">{reportPreferences.compactPdfLayout ? "Compact" : "Comfort"}</span>
          {reportPreferences.includeChartsInPdf ? (
            <span className="rounded bg-white px-2 py-0.5">{selectedPdfChartGranularities.length} chart view(s)</span>
          ) : (
            <span className="rounded bg-white px-2 py-0.5">No charts</span>
          )}
          <span className="rounded bg-white px-2 py-0.5">{selectedPdfSectionVariables.length} section(s)</span>
        </div>
      </div>

      {accountsError && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {accountsError}
        </div>
      )}

      {dataError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
          <span>{dataError}</span>
          <button
            onClick={fetchData}
            className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-3 py-2">
          <h1 className="text-base font-semibold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-xs text-gray-600">
            {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-gray-200 bg-slate-50 px-3 py-2 text-xs md:grid-cols-6">
          <div>
            <span className="text-slate-500">Revenue:</span> <span className="font-semibold text-slate-900">{formatAmount(data.totalRevenue)}</span>
            {enableComparison && compareData && <span className={`ml-1 font-medium ${revenueDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>({formatPctDelta(data.totalRevenue, compareData.totalRevenue)})</span>}
          </div>
          <div>
            <span className="text-slate-500">COGS:</span> <span className="font-semibold text-slate-900">{formatAmount(data.totalCOGS)}</span>
            {enableComparison && compareData && <span className={`ml-1 font-medium ${cogsDelta <= 0 ? "text-emerald-700" : "text-rose-700"}`}>({formatPctDelta(data.totalCOGS, compareData.totalCOGS)})</span>}
          </div>
          <div>
            <span className="text-slate-500">Gross:</span> <span className="font-semibold text-slate-900">{formatAmount(data.grossProfit)}</span>
            {enableComparison && compareData && <span className={`ml-1 font-medium ${grossDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>({formatPctDelta(data.grossProfit, compareData.grossProfit)})</span>}
          </div>
          <div>
            <span className="text-slate-500">Expenses:</span> <span className="font-semibold text-slate-900">{formatAmount(data.totalExpenses)}</span>
            {enableComparison && compareData && <span className={`ml-1 font-medium ${expensesDelta <= 0 ? "text-emerald-700" : "text-rose-700"}`}>({formatPctDelta(data.totalExpenses, compareData.totalExpenses)})</span>}
          </div>
          <div>
            <span className="text-slate-500">Net:</span> <span className={`font-semibold ${data.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatAmount(data.netProfit)}</span>
            {enableComparison && compareData && <span className={`ml-1 font-medium ${netDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>({formatPctDelta(data.netProfit, compareData.netProfit)})</span>}
          </div>
          <div><span className="text-slate-500">Margin:</span> <span className="font-semibold text-slate-900">{marginPct.toFixed(1)}%</span></div>
        </div>

        <div className="border-b border-gray-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
          <span className="font-semibold">How totals are computed:</span> {explainabilityText}
        </div>

        {enableComparison && (
          <div className="border-b border-gray-200 bg-amber-50 px-3 py-1 text-xs text-amber-900">
            {compareLoading ? (
              <span>Loading comparison summary...</span>
            ) : compareData ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight md:flex-nowrap md:gap-x-3 md:overflow-x-auto md:whitespace-nowrap">
                <span className="w-full font-semibold md:w-auto">
                  Compared to {new Date(compareStartDate).toLocaleDateString()} - {new Date(compareEndDate).toLocaleDateString()}:
                </span>
                <span>Revenue {formatDelta(revenueDelta)} ({formatPctDelta(data.totalRevenue, compareData.totalRevenue)})</span>
                <span>COGS {formatDelta(cogsDelta)} ({formatPctDelta(data.totalCOGS, compareData.totalCOGS)})</span>
                <span>Gross {formatDelta(grossDelta)} ({formatPctDelta(data.grossProfit, compareData.grossProfit)})</span>
                <span>Expenses {formatDelta(expensesDelta)} ({formatPctDelta(data.totalExpenses, compareData.totalExpenses)})</span>
                <span className={netDelta >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                  Net {formatDelta(netDelta)} ({formatPctDelta(data.netProfit, compareData.netProfit)}) {netDelta >= 0 ? "improved" : "worsened"}
                </span>
                <span>Margin {(marginPct - compareMarginPct).toFixed(1)} pts</span>
              </div>
            ) : (
              <span>{compareError || "Comparison data is not available for the selected period."}</span>
            )}
          </div>
        )}

        {enableComparison && !compareLoading && compareData && (
          <div className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
            <div className="mb-1 font-semibold text-slate-700">Top Drivers (impact on net)</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                  Favorable
                </div>
                {topPositiveDrivers.length > 0 ? (
                  <div className="space-y-0.5">
                    {topPositiveDrivers.map((driver) => (
                      <div key={driver.key} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {driver.section}: {driver.name}
                        </span>
                        <span className="whitespace-nowrap font-medium text-emerald-800">
                          +{formatAmount(Math.abs(driver.impact))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-600">No favorable drivers in this comparison.</div>
                )}
              </div>

              <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-800">
                  Unfavorable
                </div>
                {topNegativeDrivers.length > 0 ? (
                  <div className="space-y-0.5">
                    {topNegativeDrivers.map((driver) => (
                      <div key={driver.key} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {driver.section}: {driver.name}
                        </span>
                        <span className="whitespace-nowrap font-medium text-rose-800">
                          -{formatAmount(Math.abs(driver.impact))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-600">No unfavorable drivers in this comparison.</div>
                )}
              </div>
            </div>
          </div>
        )}

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

          <div ref={trendChartRef} className="h-60 w-full bg-white">
            {trendLoading ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-500">
                Building trend graph...
              </div>
            ) : trendError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-amber-700">
                <span>{trendError}</span>
                <button
                  onClick={fetchTrendData}
                  className="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  Retry trend
                </button>
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
                      formatAmount(Number(value ?? 0)),
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
                  <span className="text-gray-800">
                    {(() => {
                      const linked = resolveAccountLink(r.name, "revenue");
                      return linked ? (
                        <Link
                          href={buildAccountHref(linked.id)}
                          className="font-medium text-blue-700 underline-offset-2 hover:underline"
                        >
                          {r.name}
                        </Link>
                      ) : (
                        r.name
                      );
                    })()}
                  </span>
                  <span className="font-medium text-gray-900">{formatAmount(r.amount)}</span>
                </div>
              ))
            ) : (
              <div className="py-1 text-xs text-gray-500">No revenue recorded.</div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
              <span>Total Revenue</span>
              <span className="text-right">
                {formatAmount(data.totalRevenue)}
                {enableComparison && compareData && (
                  <span className={`ml-2 text-xs font-medium ${revenueDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatPctDelta(data.totalRevenue, compareData.totalRevenue)}
                  </span>
                )}
              </span>
            </div>
          </section>

          <section className="space-y-1 bg-gray-50 border border-gray-200 rounded-md p-3">
            <h2 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
              Cost of Goods Sold
            </h2>
            {data.cogs.length > 0 ? (
              data.cogs.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-100 py-1">
                  <span className="text-gray-800">
                    {(() => {
                      const linked = resolveAccountLink(c.name, "expense");
                      return linked ? (
                        <Link
                          href={buildAccountHref(linked.id)}
                          className="font-medium text-blue-700 underline-offset-2 hover:underline"
                        >
                          {c.name}
                        </Link>
                      ) : (
                        c.name
                      );
                    })()}
                  </span>
                  <span className="font-medium text-gray-900">{formatBracketAmount(c.amount)}</span>
                </div>
              ))
            ) : (
              <div className="py-1 text-xs text-gray-500">No COGS recorded.</div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
              <span>Total COGS</span>
              <span className="text-right">
                {formatBracketAmount(data.totalCOGS)}
                {enableComparison && compareData && (
                  <span className={`ml-2 text-xs font-medium ${cogsDelta <= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatPctDelta(data.totalCOGS, compareData.totalCOGS)}
                  </span>
                )}
              </span>
            </div>
          </section>

          <div className="flex items-center justify-between border border-yellow-200 pt-2 font-semibold bg-yellow-50 rounded-md p-3">
            <span>Gross Profit</span>
            <span className="text-right">
              {formatAmount(data.grossProfit)}
              {enableComparison && compareData && (
                <span className={`ml-2 text-xs font-medium ${grossDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatPctDelta(data.grossProfit, compareData.grossProfit)}
                </span>
              )}
            </span>
          </div>

          <section className="space-y-1 bg-gray-50 border border-gray-200 rounded-md p-3">
            <h2 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
              Operating Expenses
            </h2>
            {data.expenses.length > 0 ? (
              data.expenses.map((e, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-gray-100 py-1">
                  <span className="text-gray-800">
                    {(() => {
                      const linked = resolveAccountLink(e.name, "expense");
                      return linked ? (
                        <Link
                          href={buildAccountHref(linked.id)}
                          className="font-medium text-blue-700 underline-offset-2 hover:underline"
                        >
                          {e.name}
                        </Link>
                      ) : (
                        e.name
                      );
                    })()}
                  </span>
                  <span className="font-medium text-gray-900">{formatAmount(e.amount)}</span>
                </div>
              ))
            ) : (
              <div className="py-1 text-xs text-gray-500">No operating expenses recorded.</div>
            )}
            <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
              <span>Total Operating Expenses</span>
              <span className="text-right">
                {formatAmount(data.totalExpenses)}
                {enableComparison && compareData && (
                  <span className={`ml-2 text-xs font-medium ${expensesDelta <= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatPctDelta(data.totalExpenses, compareData.totalExpenses)}
                  </span>
                )}
              </span>
            </div>
          </section>

          <div className={`flex items-center justify-between border-t-2 border-gray-900 pt-2 font-semibold ${data.netProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'} rounded-md p-3`}>
            <span>Net {data.netProfit >= 0 ? "Profit" : "Loss"}</span>
            <span className="text-right">
              {formatAmount(data.netProfit)}
              {enableComparison && compareData && (
                <span className={`ml-2 text-xs font-medium ${netDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatPctDelta(data.netProfit, compareData.netProfit)}
                </span>
              )}
            </span>
          </div>

          <div className="pt-1 text-xs text-gray-600">Generated on {new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
