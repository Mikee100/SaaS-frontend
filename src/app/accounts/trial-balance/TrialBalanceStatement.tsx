"use client";

import React, { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaInfoCircle,
  FaPrint,
  FaSearch,
  FaSyncAlt,
  FaTimesCircle,
} from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { apiGet, apiPost } from "@/utils/api";
import { useUser } from "@/components/UserContext";
import { useBranches } from "@/hooks/useBranches";
import { useTenant } from "@/hooks/useTenant";
import { useBranchScope } from "@/hooks/useBranchScope";
import { useToast } from "@/components/ui/use-toast";
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

interface TrialBalanceAccount {
  id: string;
  name: string;
  code: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalanceData {
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
}

interface SyncResponse {
  syncedSalesCount: number;
  syncedExpensesCount?: number;
}

interface ReclassifyResponse {
  scanned: number;
  reclassifiedCount: number;
  unchangedCount: number;
  skippedNoExpense: number;
  skippedNoExpenseLine: number;
}

type AccountTypeFilter = "all" | "asset" | "liability" | "equity" | "revenue" | "expense";
type MovementFilter = "all" | "active" | "zero";

const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountTypeFilter; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "asset", label: "Assets" },
  { value: "liability", label: "Liabilities" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

const currencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value || 0);
}

function downloadBlob(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

function getPreviousMonthDate(dateText: string) {
  const base = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(base.getTime())) return dateText;
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();
  const previousMonth = new Date(year, month - 1, 1);
  const maxDay = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0).getDate();
  const adjustedDay = Math.min(day, maxDay);
  const result = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), adjustedDay);
  return result.toISOString().split("T")[0];
}

type LastRunSnapshot = {
  branchId: string;
  date: string;
  totalDebit: number;
  totalCredit: number;
  rows: number;
  capturedAt: string;
};

export default function TrialBalanceStatement() {
  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | "csv" | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [compareDate, setCompareDate] = useState(getPreviousMonthDate(new Date().toISOString().split("T")[0]));
  const [enableComparison, setEnableComparison] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountTypeFilter>("all");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all");
  const [showOperations, setShowOperations] = useState(false);
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareData, setCompareData] = useState<TrialBalanceData | null>(null);
  const [lastRunMessage, setLastRunMessage] = useState<string | null>(null);
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

  useEffect(() => {
    checkAccounts();
    fetchData();
  }, [date, selectedBranchId]);

  useEffect(() => {
    if (!enableComparison || !compareDate) {
      setCompareData(null);
      return;
    }

    let cancelled = false;

    const fetchComparison = async () => {
      setCompareLoading(true);
      try {
        const res = await apiGet<TrialBalanceData>(
          `/ledger/trial-balance?date=${compareDate}`,
          getBranchHeaders(),
        );
        if (!cancelled) setCompareData(res);
      } catch (error) {
        console.error("Error fetching comparison trial balance:", error);
        if (!cancelled) {
          setCompareData(null);
          toast({
            title: "Comparison unavailable",
            description: "Could not load comparison period data.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setCompareLoading(false);
      }
    };

    fetchComparison();

    return () => {
      cancelled = true;
    };
  }, [compareDate, enableComparison, selectedBranchId]);

  const handleBranchChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextBranchId = event.target.value;
    setSelectedBranchIdPersisted(nextBranchId);
  };

  const checkAccounts = async () => {
    try {
      const res = await apiGet<TrialBalanceAccount[]>("/ledger/accounts", getBranchHeaders());
      setAccountsCount(res.length);
    } catch (error) {
      console.error("Error checking accounts:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet<TrialBalanceData>(
        `/ledger/trial-balance?date=${date}`,
        getBranchHeaders(),
      );
      setData(res);
    } catch (error) {
      console.error("Error fetching trial balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitCOA = async () => {
    setInitializing(true);
    try {
      await apiPost("/ledger/init-coa", {}, getBranchHeaders());
      await checkAccounts();
      await fetchData();
    } catch (error) {
      console.error("Error initializing COA:", error);
    } finally {
      setInitializing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiPost<SyncResponse>("/ledger/sync", {}, getBranchHeaders());
      const syncedExpenses = res.syncedExpensesCount || 0;
      toast({
        title: "Sync complete",
        description: `Imported ${res.syncedSalesCount} historical sales and ${syncedExpenses} expenses.`,
      });
      await fetchData();
    } catch (error) {
      console.error("Error syncing ledger:", error);
      toast({
        title: "Sync failed",
        description: "Failed to sync historical transactions.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleReclassifyExpenses = async () => {
    setReclassifying(true);
    try {
      const res = await apiPost<ReclassifyResponse>(
        "/ledger/reclassify-expenses",
        {},
        getBranchHeaders(),
      );
      toast({
        title: "Reclassification complete",
        description: `Scanned ${res.scanned} entries, reclassified ${res.reclassifiedCount}, unchanged ${res.unchangedCount}.`,
      });
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Backward compatibility: older backend builds may not expose this route yet.
      if (message.includes("Cannot POST /ledger/reclassify-expenses") || message.includes("404")) {
        try {
          const syncRes = await apiPost<SyncResponse>(
            "/ledger/sync",
            {},
            getBranchHeaders(),
          );
          toast({
            title: "Reclassify endpoint unavailable",
            description: `Fallback sync completed: ${syncRes.syncedSalesCount} sales and ${syncRes.syncedExpensesCount || 0} expenses imported.`,
          });
          await fetchData();
        } catch (fallbackError) {
          console.error("Fallback sync failed:", fallbackError);
          toast({
            title: "Fallback sync failed",
            description: "Reclassify endpoint is unavailable and fallback sync also failed.",
            variant: "destructive",
          });
        }
      } else {
        console.error("Error reclassifying expenses:", error);
        toast({
          title: "Reclassification failed",
          description: "Failed to reclassify expense entries.",
          variant: "destructive",
        });
      }
    } finally {
      setReclassifying(false);
    }
  };

  useEffect(() => {
    if (!data || typeof window === "undefined") return;

    const storageKey = "trial-balance-last-run-v1";
    const currentSnapshot: LastRunSnapshot = {
      branchId: selectedBranchId || "all",
      date,
      totalDebit: data.totalDebit,
      totalCredit: data.totalCredit,
      rows: data.accounts.length,
      capturedAt: new Date().toISOString(),
    };

    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const previous = JSON.parse(raw) as LastRunSnapshot;
        if (previous.branchId === currentSnapshot.branchId) {
          const debitDelta = currentSnapshot.totalDebit - previous.totalDebit;
          const creditDelta = currentSnapshot.totalCredit - previous.totalCredit;
          const rowDelta = currentSnapshot.rows - previous.rows;
          const changed =
            Math.abs(debitDelta) > 0.01 ||
            Math.abs(creditDelta) > 0.01 ||
            rowDelta !== 0;

          if (changed) {
            setLastRunMessage(
              `Since your last run (${new Date(previous.capturedAt).toLocaleString()}): debit ${debitDelta >= 0 ? "+" : ""}${formatCurrency(debitDelta)}, credit ${creditDelta >= 0 ? "+" : ""}${formatCurrency(creditDelta)}, rows ${rowDelta >= 0 ? "+" : ""}${rowDelta}.`,
            );
          } else {
            setLastRunMessage("No changes since your last run for this branch.");
          }
        } else {
          setLastRunMessage(null);
        }
      } catch {
        setLastRunMessage(null);
      }
    }

    localStorage.setItem(storageKey, JSON.stringify(currentSnapshot));
  }, [data, date, selectedBranchId]);

  const effectiveData: TrialBalanceData = data || {
    accounts: [],
    totalDebit: 0,
    totalCredit: 0,
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredAccounts = effectiveData.accounts.filter((account) => {
    const matchesSearch =
      !normalizedSearch ||
      account.name.toLowerCase().includes(normalizedSearch) ||
      account.code.toLowerCase().includes(normalizedSearch) ||
      account.type.toLowerCase().includes(normalizedSearch);

    const matchesType = typeFilter === "all" || account.type === typeFilter;

    const hasMovement = account.debit > 0 || account.credit > 0;
    const matchesMovement =
      movementFilter === "all" ||
      (movementFilter === "active" && hasMovement) ||
      (movementFilter === "zero" && !hasMovement);

    return matchesSearch && matchesType && matchesMovement;
  });

  const totalAccounts = effectiveData.accounts.length;
  const visibleDebit = filteredAccounts.reduce((sum, account) => sum + account.debit, 0);
  const visibleCredit = filteredAccounts.reduce((sum, account) => sum + account.credit, 0);
  const debitAccounts = effectiveData.accounts.filter((account) => account.debit > 0).length;
  const creditAccounts = effectiveData.accounts.filter((account) => account.credit > 0).length;
  const nonZeroAccounts = effectiveData.accounts.filter((account) => account.debit > 0 || account.credit > 0).length;
  const isBalanced = Math.abs(effectiveData.totalDebit - effectiveData.totalCredit) < 0.01;
  const imbalance = Math.abs(effectiveData.totalDebit - effectiveData.totalCredit);
  const hasFilters =
    normalizedSearch.length > 0 || typeFilter !== "all" || movementFilter !== "all";
  const reportDate = new Date(`${date}T00:00:00`);
  const compareReportDate = new Date(`${compareDate}T00:00:00`);

  const compareMap = new Map(
    (compareData?.accounts || []).map((account) => [account.code, account]),
  );

  const changedRows = filteredAccounts.reduce((count, account) => {
    if (!enableComparison || !compareData) return count;
    const previous = compareMap.get(account.code);
    const currentNet = account.debit - account.credit;
    const previousNet = previous ? previous.debit - previous.credit : 0;
    return Math.abs(currentNet - previousNet) > 0.01 ? count + 1 : count;
  }, 0);

  const addedRows = filteredAccounts.reduce((count, account) => {
    if (!enableComparison || !compareData) return count;
    return compareMap.has(account.code) ? count : count + 1;
  }, 0);

  const explainabilityText = `Rows are included when they match your search and filters. "Has Movement" shows only accounts with debit or credit activity for the selected date.`;

  if (loading && !data) {
    return (
      <div className="border border-slate-200 bg-white px-4 py-8 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Loading</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Preparing trial balance</h2>
      </div>
    );
  }

  if (accountsCount === 0) {
    return (
      <div className="border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-amber-100 text-xl text-amber-700">
          <FaExclamationTriangle />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Accounting setup required</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">No chart of accounts found</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Initialize the accounting structure first so the system can classify entries and generate a usable trial balance.
        </p>
        <button
          onClick={handleInitCOA}
          disabled={initializing}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {initializing ? "Initializing accounts..." : "Set Up Accounting System"}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    setExporting("csv");
    try {
      const rows = [
        ["Trial Balance"],
        [`As of ${reportDate.toLocaleDateString("en-KE", { dateStyle: "long" })}`],
        [],
        ["Code", "Account Name", "Type", "Debit (KES)", "Credit (KES)"],
        ...filteredAccounts.map((account) => [
          account.code,
          account.name,
          account.type,
          account.debit.toFixed(2),
          account.credit.toFixed(2),
        ]),
        [],
        ["Total", "", "", effectiveData.totalDebit.toFixed(2), effectiveData.totalCredit.toFixed(2)],
      ];

      const csv = rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? "").replace(/"/g, "\"\"")}"`)
            .join(","),
        )
        .join("\n");

      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `trial-balance-${date}.csv`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = () => {
    setExporting("excel");
    try {
      const worksheet = XLSX.utils.json_to_sheet(
        filteredAccounts.map((account) => ({
          Code: account.code,
          Account: account.name,
          Type: account.type,
          Debit: account.debit,
          Credit: account.credit,
        })),
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Trial Balance");
      XLSX.writeFile(workbook, `trial-balance-${date}.xlsx`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    try {
      const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
      const margin = getPdfMargin(pdfTemplate);
      const titleFontSize = getPdfTitleFontSize(pdfTemplate);
      const bodyFontSize = getPdfBodyFontSize(pdfTemplate);
      const reportCurrency = getPdfCurrency(tenantData, pdfTemplate);
      const reportCurrencyFormatter = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: reportCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const formatReportCurrency = (value: number) => reportCurrencyFormatter.format(value || 0);
      const { primaryRgb } = getPdfTableColors(pdfTemplate);

      const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
      await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
      let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

      doc.setFontSize(titleFontSize);
      doc.setTextColor((pdfTemplate.primaryColor || "#000000").replace("#", "") || "000000");
      doc.text("Trial Balance", margin, yPosition + 6);
      yPosition += 10;

      doc.setFontSize(bodyFontSize);
      doc.setTextColor("666666");
      doc.text(`As of ${reportDate.toLocaleDateString("en-KE", { dateStyle: "long" })}`, margin, yPosition);
      yPosition += 4;
      if (pdfTemplate.branchInfo) {
        doc.text(`Branch: ${activeBranchName}`, margin, yPosition);
        yPosition += 4;
      }
      doc.text(
        `Status: ${isBalanced ? "Balanced" : `Unbalanced by ${formatReportCurrency(imbalance)}`}`,
        margin,
        yPosition,
      );
      yPosition += 5;

      autoTable(doc, {
        startY: yPosition,
        head: [["Code", "Account Name", "Type", `Debit (${reportCurrency})`, `Credit (${reportCurrency})`]],
        body: filteredAccounts.map((account) => [
          account.code,
          account.name,
          account.type,
          account.debit > 0 ? formatReportCurrency(account.debit) : "-",
          account.credit > 0 ? formatReportCurrency(account.credit) : "-",
        ]),
        foot: [["Total", "", "", formatReportCurrency(effectiveData.totalDebit), formatReportCurrency(effectiveData.totalCredit)]],
        styles: {
          fontSize: Math.max(7, bodyFontSize - 3),
          cellPadding: 2,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: primaryRgb,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        footStyles: {
          fillColor: [31, 41, 55],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          3: { halign: "right" },
          4: { halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      applyPdfFooterAndPageNumbers(doc, pdfTemplate, "SaaS POS • Accounting");
      doc.save(`trial-balance-${date}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-3">
      <section className="border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm md:px-4">
          <div className="font-semibold text-slate-900">Trial Balance</div>
          <span className="text-xs text-slate-500">{reportDate.toLocaleDateString("en-KE", { dateStyle: "medium" })}</span>
          <span className="ml-auto text-xs font-semibold text-slate-500">{filteredAccounts.length} rows</span>
          <span
            className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-semibold ${
              isBalanced ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {isBalanced ? <FaCheckCircle /> : <FaExclamationTriangle />}
            {isBalanced ? "Balanced" : `Diff ${formatCurrency(imbalance)}`}
          </span>
        </div>

        <div className="grid gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:grid-cols-2 md:px-4">
          <div><span className="text-slate-500">Debit:</span> <span className="font-semibold text-slate-900">{formatCurrency(effectiveData.totalDebit)}</span></div>
          <div><span className="text-slate-500">Credit:</span> <span className="font-semibold text-slate-900">{formatCurrency(effectiveData.totalCredit)}</span></div>
        </div>

        {showSummaryDetails && (
          <div className="grid gap-2 border-b border-slate-200 bg-white px-3 py-2 text-xs sm:grid-cols-2 lg:grid-cols-4 md:px-4">
            <div><span className="text-slate-500">Visible debit:</span> <span className="font-semibold text-slate-900">{formatCurrency(visibleDebit)}</span></div>
            <div><span className="text-slate-500">Visible credit:</span> <span className="font-semibold text-slate-900">{formatCurrency(visibleCredit)}</span></div>
            <div><span className="text-slate-500">Active:</span> <span className="font-semibold text-slate-900">{nonZeroAccounts}</span></div>
            <div><span className="text-slate-500">Debit/Credit accounts:</span> <span className="font-semibold text-slate-900">{debitAccounts}/{creditAccounts}</span></div>
            <div><span className="text-slate-500">Scope:</span> <span className="font-semibold text-slate-900">{activeBranchName}</span></div>
          </div>
        )}

        <div className="grid gap-2 border-b border-slate-200 px-3 py-2 print:hidden md:grid-cols-2 xl:grid-cols-4 md:px-4">
          <label className="relative block">
            <FaCalendarAlt className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-9 w-full border border-slate-200 bg-white pl-8 pr-2 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
          </label>

          <label className="relative block">
            <FaSearch className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, account, type"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-9 w-full border border-slate-200 bg-white pl-8 pr-8 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
            {normalizedSearch.length > 0 && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                aria-label="Clear search"
              >
                <FaTimesCircle />
              </button>
            )}
          </label>

          <button
            onClick={() => setEnableComparison((prev) => !prev)}
            className={`inline-flex h-9 items-center justify-center gap-2 border px-3 text-xs font-semibold transition ${
              enableComparison
                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <FaChartLine />
            {enableComparison ? "Comparison On" : "Comparison Off"}
          </button>

          <div className="col-span-full flex flex-wrap gap-1">
            {hasFilters && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                  setMovementFilter("all");
                }}
                className="inline-flex h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FaTimesCircle />
                Clear
              </button>
            )}
            <button
              onClick={() => setShowSummaryDetails((prev) => !prev)}
              className="inline-flex h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FaInfoCircle />
              {showSummaryDetails ? "Hide Details" : "More Details"}
            </button>
            <button
              onClick={() => setShowOperations((prev) => !prev)}
              className="inline-flex h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {showOperations ? "Hide Ops" : "Show Ops"}
            </button>
          </div>

          {showSummaryDetails && (
            <>
              <label className="relative block">
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as AccountTypeFilter)}
                  className="h-9 w-full border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  {ACCOUNT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative block">
                <select
                  value={movementFilter}
                  onChange={(event) => setMovementFilter(event.target.value as MovementFilter)}
                  className="h-9 w-full border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                >
                  <option value="all">All Movement</option>
                  <option value="active">Has Movement</option>
                  <option value="zero">Zero Movement</option>
                </select>
              </label>

              {enableComparison ? (
                <label className="relative block">
                  <input
                    type="date"
                    value={compareDate}
                    onChange={(event) => setCompareDate(event.target.value)}
                    className="h-9 w-full border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                  />
                </label>
              ) : (
                <div className="hidden xl:block" />
              )}

              {canTenantSelectBranch ? (
                <label className="relative block lg:col-span-1">
                  <select
                    value={selectedBranchId}
                    onChange={handleBranchChange}
                    className="h-9 w-full border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-400"
                  >
                    <option value="all">All Branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="flex h-9 items-center border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">
                  Branch: {activeBranchName}
                </div>
              )}
            </>
          )}

          {showOperations && (
            <div className="col-span-full flex flex-wrap gap-1 border-t border-slate-200 pt-2">
              <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex h-9 items-center gap-2 border border-slate-900 bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSyncAlt className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync"}
            </button>
            <button
              onClick={handleReclassifyExpenses}
              disabled={reclassifying}
              className="inline-flex h-9 items-center gap-2 border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSyncAlt className={reclassifying ? "animate-spin" : ""} />
              {reclassifying ? "Reclassifying..." : "Reclassify Expenses"}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FaPrint />
              Print
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exporting !== null}
              className="inline-flex h-9 items-center gap-2 border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaFilePdf />
              {exporting === "pdf" ? "..." : "PDF"}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exporting !== null}
              className="inline-flex h-9 items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaFileExcel />
              {exporting === "excel" ? "..." : "XLSX"}
            </button>
            <button
              onClick={handleExportCsv}
              disabled={exporting !== null}
              className="inline-flex h-9 items-center gap-2 border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaFileCsv />
              {exporting === "csv" ? "..." : "CSV"}
            </button>
            </div>
          )}
        </div>

        {showSummaryDetails && (
          <div className="grid gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:grid-cols-1 lg:grid-cols-2 md:px-4">
            <div className="flex items-start gap-2 text-slate-700">
              <FaInfoCircle className="mt-0.5 text-slate-500" />
              <p>{explainabilityText}</p>
            </div>
            <div className="flex items-start gap-2 text-slate-700">
              <FaChartLine className="mt-0.5 text-slate-500" />
              <p>
                {enableComparison
                  ? compareLoading
                    ? "Loading comparison period..."
                    : `Comparing against ${compareReportDate.toLocaleDateString("en-KE", { dateStyle: "long" })}: ${changedRows} changed rows, ${addedRows} new rows in current view.`
                  : "Comparison is off. Turn it on to see row-level variance flags."}
              </p>
            </div>
          </div>
        )}

        {lastRunMessage && (
          <div className="border-b border-slate-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 md:px-4">
            {lastRunMessage}
          </div>
        )}

        {!isBalanced && (
          <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 md:px-4">
            <FaExclamationTriangle className="mt-0.5 text-amber-600" />
            <p>
              Debit and credit totals differ by {formatCurrency(imbalance)}. Review recent entries before final audit use.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Code</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Account</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Type</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Debit</th>
                <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Credit</th>
                {enableComparison && (
                  <>
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Prev Net</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Variance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className={`hover:bg-slate-50 ${account.debit === 0 && account.credit === 0 ? "bg-slate-50/40" : ""}`}>
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700 md:px-4">{account.code}</td>
                  <td className="px-3 py-1.5 md:px-4">
                    <Link
                      href={`/accounts/account/${account.id}?from=trial-balance&date=${date}&branchId=${selectedBranchId}`}
                      className="font-semibold text-slate-900 underline-offset-2 hover:underline"
                    >
                      {account.name}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {account.debit > 0
                        ? `Dr ${formatCurrency(account.debit)}`
                        : account.credit > 0
                          ? `Cr ${formatCurrency(account.credit)}`
                          : "No movement"}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-slate-600 md:px-4">{account.type}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-slate-900 md:px-4">{account.debit > 0 ? formatCurrency(account.debit) : "-"}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-slate-900 md:px-4">{account.credit > 0 ? formatCurrency(account.credit) : "-"}</td>
                  {enableComparison && (() => {
                    const previous = compareMap.get(account.code);
                    const currentNet = account.debit - account.credit;
                    const previousNet = previous ? previous.debit - previous.credit : 0;
                    const variance = currentNet - previousNet;
                    const isChanged = Math.abs(variance) > 0.01;

                    return (
                      <>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-700 md:px-4">
                          {formatCurrency(previousNet)}
                        </td>
                        <td className={`px-3 py-1.5 text-right font-semibold md:px-4 ${
                          isChanged
                            ? variance > 0
                              ? "text-emerald-700"
                              : "text-red-700"
                            : "text-slate-500"
                        }`}>
                          {variance > 0 ? "+" : ""}
                          {formatCurrency(variance)}
                        </td>
                      </>
                    );
                  })()}
                </tr>
              ))}

              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center md:px-4">
                    <div className="mx-auto max-w-md text-sm text-slate-600">
                      <h3 className="font-semibold text-slate-900">No matching accounts</h3>
                      <p className="mt-1">Try a broader search term or clear the current filter.</p>
                      <button
                        onClick={() => setSearchTerm("")}
                        className="mt-3 inline-flex items-center gap-2 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <FaTimesCircle />
                        Clear search
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100 text-slate-900">
                <td colSpan={3} className="px-3 py-2 text-sm font-bold md:px-4">Report totals</td>
                <td className="px-3 py-2 text-right text-sm font-bold md:px-4">{formatCurrency(effectiveData.totalDebit)}</td>
                <td className="px-3 py-2 text-right text-sm font-bold md:px-4">{formatCurrency(effectiveData.totalCredit)}</td>
                {enableComparison && (
                  <>
                    <td className="px-3 py-2 text-right text-sm font-bold md:px-4">
                      {formatCurrency((compareData?.totalDebit || 0) - (compareData?.totalCredit || 0))}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold md:px-4">
                      {formatCurrency((effectiveData.totalDebit - effectiveData.totalCredit) - ((compareData?.totalDebit || 0) - (compareData?.totalCredit || 0)))}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
