"use client";

import React, { useEffect, useState, type ChangeEvent } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
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

export default function TrialBalanceStatement() {
  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const { data: tenantData } = useTenant();
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | "csv" | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
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

  useEffect(() => {
    checkAccounts();
    fetchData();
  }, [date, selectedBranchId]);

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
      alert(
        `Sync complete. Imported ${res.syncedSalesCount} historical sales and ${syncedExpenses} expenses.`,
      );
      await fetchData();
    } catch (error) {
      console.error("Error syncing ledger:", error);
      alert("Failed to sync historical transactions.");
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
      alert(
        `Reclassification complete. Scanned ${res.scanned} entries, reclassified ${res.reclassifiedCount}, unchanged ${res.unchangedCount}.`,
      );
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
          alert(
            `Your backend build does not expose /ledger/reclassify-expenses yet. Fallback sync completed: ${syncRes.syncedSalesCount} sales and ${syncRes.syncedExpensesCount || 0} expenses imported.`,
          );
          await fetchData();
        } catch (fallbackError) {
          console.error("Fallback sync failed:", fallbackError);
          alert("Reclassify endpoint is unavailable and fallback sync also failed.");
        }
      } else {
        console.error("Error reclassifying expenses:", error);
        alert("Failed to reclassify expense entries.");
      }
    } finally {
      setReclassifying(false);
    }
  };

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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredAccounts = data.accounts.filter((account) => {
    if (!normalizedSearch) return true;
    return (
      account.name.toLowerCase().includes(normalizedSearch) ||
      account.code.toLowerCase().includes(normalizedSearch) ||
      account.type.toLowerCase().includes(normalizedSearch)
    );
  });

  const totalAccounts = data.accounts.length;
  const visibleDebit = filteredAccounts.reduce((sum, account) => sum + account.debit, 0);
  const visibleCredit = filteredAccounts.reduce((sum, account) => sum + account.credit, 0);
  const debitAccounts = data.accounts.filter((account) => account.debit > 0).length;
  const creditAccounts = data.accounts.filter((account) => account.credit > 0).length;
  const nonZeroAccounts = data.accounts.filter((account) => account.debit > 0 || account.credit > 0).length;
  const isBalanced = Math.abs(data.totalDebit - data.totalCredit) < 0.01;
  const imbalance = Math.abs(data.totalDebit - data.totalCredit);
  const hasFilters = normalizedSearch.length > 0;
  const reportDate = new Date(`${date}T00:00:00`);

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
        ["Total", "", "", data.totalDebit.toFixed(2), data.totalCredit.toFixed(2)],
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
      const fontSize = getPdfFontSize(pdfTemplate);
      const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

      const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
      await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
      let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

      doc.setFontSize(fontSize + 4);
      doc.setTextColor((pdfTemplate.primaryColor || "#000000").replace("#", "") || "000000");
      doc.text("Trial Balance", margin, yPosition + 8);
      yPosition += 16;

      doc.setFontSize(fontSize - 2);
      doc.setTextColor("666666");
      doc.text(`As of ${reportDate.toLocaleDateString("en-KE", { dateStyle: "long" })}`, margin, yPosition);
      yPosition += 6;
      doc.text(
        `Status: ${isBalanced ? "Balanced" : `Unbalanced by ${formatCurrency(imbalance)}`}`,
        margin,
        yPosition,
      );
      yPosition += 8;

      autoTable(doc, {
        startY: yPosition,
        head: [["Code", "Account Name", "Type", "Debit (KES)", "Credit (KES)"]],
        body: filteredAccounts.map((account) => [
          account.code,
          account.name,
          account.type,
          account.debit > 0 ? formatCurrency(account.debit) : "-",
          account.credit > 0 ? formatCurrency(account.credit) : "-",
        ]),
        foot: [["Total", "", "", formatCurrency(data.totalDebit), formatCurrency(data.totalCredit)]],
        styles: {
          fontSize: Math.max(8, fontSize - 2),
          cellPadding: 10,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: primaryRgb,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: secondaryRgb,
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
          <div className="text-slate-500">{reportDate.toLocaleDateString("en-KE", { dateStyle: "long" })}</div>
          <span className="ml-auto text-xs font-semibold text-slate-500">{filteredAccounts.length} / {totalAccounts} rows</span>
          <span
            className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-semibold ${
              isBalanced ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {isBalanced ? <FaCheckCircle /> : <FaExclamationTriangle />}
            {isBalanced ? "Balanced" : `Diff ${formatCurrency(imbalance)}`}
          </span>
        </div>

        <div className="grid gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:grid-cols-2 lg:grid-cols-4 md:px-4">
          <div><span className="text-slate-500">Debit:</span> <span className="font-semibold text-slate-900">{formatCurrency(data.totalDebit)}</span></div>
          <div><span className="text-slate-500">Credit:</span> <span className="font-semibold text-slate-900">{formatCurrency(data.totalCredit)}</span></div>
          <div><span className="text-slate-500">Active:</span> <span className="font-semibold text-slate-900">{nonZeroAccounts}</span></div>
          <div><span className="text-slate-500">Debit/Credit accounts:</span> <span className="font-semibold text-slate-900">{debitAccounts}/{creditAccounts}</span></div>
        </div>

        <div className="grid gap-2 border-b border-slate-200 px-3 py-2 print:hidden lg:grid-cols-[180px_minmax(0,1fr)_auto] md:px-4">
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
            {hasFilters && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                aria-label="Clear search"
              >
                <FaTimesCircle />
              </button>
            )}
          </label>

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

          <div className="flex flex-wrap gap-1">
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
        </div>

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
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Code</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Account</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Type</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Debit</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:px-4">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700 md:px-4">{account.code}</td>
                  <td className="px-3 py-2 md:px-4">
                    <div className="font-semibold text-slate-900">{account.name}</div>
                    <div className="text-xs text-slate-500">
                      {account.debit > 0
                        ? `Dr ${formatCurrency(account.debit)}`
                        : account.credit > 0
                          ? `Cr ${formatCurrency(account.credit)}`
                          : "No movement"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 md:px-4">{account.type}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900 md:px-4">{account.debit > 0 ? formatCurrency(account.debit) : "-"}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900 md:px-4">{account.credit > 0 ? formatCurrency(account.credit) : "-"}</td>
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
                <td className="px-3 py-2 text-right text-sm font-bold md:px-4">{formatCurrency(data.totalDebit)}</td>
                <td className="px-3 py-2 text-right text-sm font-bold md:px-4">{formatCurrency(data.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
