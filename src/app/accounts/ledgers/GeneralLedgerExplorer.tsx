"use client";

import React, { useState, useEffect } from "react";
import { 
  FaSearch, 
  FaArrowLeft, 
  FaChevronRight,
  FaFilePdf,
  FaFileExcel,
  FaUndo,
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { apiGet } from "@/utils/api";
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

interface Account {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  reference: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  user?: string;
  meta: { journalEntryId: string };
}

type DateFilterMode = "all" | "date" | "week" | "month" | "year" | "range";

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatWeekInput = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
};

const parseIsoWeekRange = (weekValue: string) => {
  const match = weekValue.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const mondayUtc = new Date(simple);

  if (dow <= 4) {
    mondayUtc.setUTCDate(simple.getUTCDate() - dow + 1);
  } else {
    mondayUtc.setUTCDate(simple.getUTCDate() + 8 - dow);
  }

  const start = new Date(mondayUtc.getUTCFullYear(), mondayUtc.getUTCMonth(), mondayUtc.getUTCDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const normalizeToDay = (dateValue: string | Date) => {
  const parsed = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
};

export default function GeneralLedgerExplorer() {
  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const { data: tenantData } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("all");
  const [selectedDate, setSelectedDate] = useState<string>(formatDateInput(new Date()));
  const [selectedWeek, setSelectedWeek] = useState<string>(formatWeekInput(new Date()));
  const [selectedMonth, setSelectedMonth] = useState<string>(formatDateInput(new Date()).slice(0, 7));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");

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
    fetchAccounts();
  }, [selectedBranchId]);

  const handleBranchChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextBranchId = event.target.value;
    setSelectedBranchId(nextBranchId);
    setSelectedAccount(null);
    setEntries([]);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedBranchId", nextBranchId);
    }
  };

  const activeBranchName =
    selectedBranchId === "all"
      ? "All Branches"
      : branches.find((branch) => branch.id === selectedBranchId)?.name || "Assigned Branch";

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/ledger/accounts", getBranchHeaders());
      setAccounts(res);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (account: Account) => {
    setSelectedAccount(account);
    setDateFilterMode("all");
    setRangeStart("");
    setRangeEnd("");
    setDetailsLoading(true);
    try {
      const res = await apiGet(`/ledger/accounts/${account.id}/entries`, getBranchHeaders());
      setEntries(res);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.code.includes(searchTerm)
  );

  // Group accounts by type
  const groupedAccounts = filteredAccounts.reduce((acc, curr) => {
    if (!acc[curr.type]) acc[curr.type] = [];
    acc[curr.type].push(curr);
    return acc;
  }, {} as Record<string, Account[]>);

  const filteredEntries = entries.filter((entry) => {
    if (dateFilterMode === "all") return true;

    const entryDate = normalizeToDay(entry.date);

    if (dateFilterMode === "date") {
      if (!selectedDate) return true;
      return formatDateInput(entryDate) === selectedDate;
    }

    if (dateFilterMode === "week") {
      const weekRange = parseIsoWeekRange(selectedWeek);
      if (!weekRange) return true;
      const entryTime = entryDate.getTime();
      return entryTime >= weekRange.start.getTime() && entryTime <= weekRange.end.getTime();
    }

    if (dateFilterMode === "month") {
      if (!selectedMonth) return true;
      const [yearText, monthText] = selectedMonth.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      if (!year || !month) return true;
      return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === month;
    }

    if (dateFilterMode === "year") {
      const year = Number(selectedYear);
      if (!year) return true;
      return entryDate.getFullYear() === year;
    }

    if (dateFilterMode === "range") {
      const start = rangeStart ? normalizeToDay(rangeStart) : null;
      const end = rangeEnd ? normalizeToDay(rangeEnd) : null;

      if (start && end) {
        return entryDate.getTime() >= start.getTime() && entryDate.getTime() <= end.getTime();
      }

      if (start) return entryDate.getTime() >= start.getTime();
      if (end) return entryDate.getTime() <= end.getTime();
      return true;
    }

    return true;
  });

  const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0);

  const getFilterLabel = () => {
    if (dateFilterMode === "all") return "All dates";
    if (dateFilterMode === "date") return selectedDate || "Date filter";
    if (dateFilterMode === "week") return selectedWeek || "Week filter";
    if (dateFilterMode === "month") return selectedMonth || "Month filter";
    if (dateFilterMode === "year") return selectedYear || "Year filter";
    return `${rangeStart || "Any"} to ${rangeEnd || "Any"}`;
  };

  const resetDateFilters = () => {
    setDateFilterMode("all");
    setRangeStart("");
    setRangeEnd("");
  };

  const handleExportExcel = () => {
    if (!selectedAccount || filteredEntries.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(
      filteredEntries.map((entry) => ({
        Date: new Date(entry.date).toLocaleDateString(),
        Reference: entry.reference,
        Description: entry.description,
        Type: entry.type,
        Debit: entry.debit,
        Credit: entry.credit,
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    XLSX.writeFile(
      workbook,
      `ledger-${selectedAccount.code}-${Date.now()}.xlsx`,
    );
  };

  const handleExportPdf = async () => {
    if (!selectedAccount || filteredEntries.length === 0) return;

    const pdfTemplate = (tenantData?.pdfTemplate || {}) as PdfTemplate;
    const margin = getPdfMargin(pdfTemplate);
    const fontSize = getPdfFontSize(pdfTemplate);
    const { primaryRgb, secondaryRgb } = getPdfTableColors(pdfTemplate);

    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));
    await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(fontSize + 4);
    doc.setTextColor((pdfTemplate.primaryColor || "#000000").replace("#", "") || "000000");
    doc.text("General Ledger", margin, yPosition + 8);
    yPosition += 16;
    doc.setFontSize(fontSize - 2);
    doc.setTextColor("666666");
    doc.text(`Account: ${selectedAccount.code} - ${selectedAccount.name}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Branch: ${activeBranchName}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Filter: ${getFilterLabel()}`, margin, yPosition);
    yPosition += 8;

    autoTable(doc, {
      startY: yPosition,
      head: [["Date", "Reference", "Description", "Type", "Debit", "Credit"]],
      body: filteredEntries.map((entry) => [
        new Date(entry.date).toLocaleDateString(),
        entry.reference || "-",
        entry.description || "-",
        entry.type || "-",
        entry.debit > 0 ? entry.debit.toLocaleString() : "-",
        entry.credit > 0 ? entry.credit.toLocaleString() : "-",
      ]),
      styles: { fontSize: Math.max(8, fontSize - 2), cellPadding: 4 },
      headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: secondaryRgb },
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    const tableState = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    const finalY = (tableState.lastAutoTable?.finalY || yPosition) + 12;
    doc.setFontSize(Math.max(8, fontSize - 1));
    doc.setTextColor("333333");
    doc.text(`Debit Total: ${totalDebit.toLocaleString()}`, margin, finalY);
    doc.text(`Credit Total: ${totalCredit.toLocaleString()}`, margin + 60, finalY);
    doc.text(`Rows: ${filteredEntries.length}`, margin + 120, finalY);

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, "SaaS POS • Accounting");
    doc.save(`ledger-${selectedAccount.code}-${Date.now()}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="mt-2 text-[11px] text-gray-500">Loading chart of accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700">
        <span className="font-semibold">General Ledger</span>
        {canTenantSelectBranch ? (
          <select
            value={selectedBranchId}
            onChange={handleBranchChange}
            className="h-8 border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-500"
          >
            <option value="all">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="border border-gray-200 bg-gray-50 px-2 py-1 font-semibold text-gray-600">
            Branch: {activeBranchName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-12">
      
      {/* Sidebar: Chart of Accounts */}
      <div className={`lg:col-span-4 ${selectedAccount ? "hidden lg:block" : "block"}`}>
        <div className="border border-gray-200 p-2">
          <div className="relative mb-2">
            <FaSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
            <input 
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-full border border-gray-200 bg-white pl-7 pr-2 text-xs text-gray-700 outline-none focus:border-blue-500"
            />
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            {Object.entries(groupedAccounts).map(([type, accs]) => (
              <div key={type}>
                <h3 className="mb-1 border-b border-gray-100 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{type}s</h3>
                <div className="space-y-0.5">
                  {accs.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => fetchEntries(acc)}
                      className={`group flex w-full items-center justify-between px-2 py-1.5 text-left text-xs transition-colors ${
                        selectedAccount?.id === acc.id 
                          ? "bg-gray-900 text-white" 
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`w-10 text-[10px] font-semibold ${selectedAccount?.id === acc.id ? "text-gray-300" : "text-gray-400"}`}>
                          {acc.code}
                        </span>
                        <span className="truncate">{acc.name}</span>
                      </div>
                      <FaChevronRight className={`text-[10px] ${selectedAccount?.id === acc.id ? "opacity-100" : "opacity-40 group-hover:opacity-100"}`} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main View: Detailed Entries */}
      <div className={`lg:col-span-8 ${!selectedAccount ? "hidden lg:block" : "block"}`}>
        {!selectedAccount ? (
          <div className="border border-dashed border-gray-300 px-4 py-8 text-center text-xs text-gray-500">
            Select an account to view entries.
          </div>
        ) : (
          <div>
            {/* Detail Header */}
            <div className="mb-2 border border-gray-200 px-3 py-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedAccount(null)}
                    className="lg:hidden border border-gray-300 px-2 py-1 text-xs text-gray-700"
                  >
                    <FaArrowLeft />
                  </button>
                  <div>
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                        {selectedAccount.code}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        {selectedAccount.type}
                      </span>
                    </div>
                    <h1 className="text-sm font-semibold text-gray-900">
                      {selectedAccount.name}
                    </h1>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <select
                    value={dateFilterMode}
                    onChange={(event) => setDateFilterMode(event.target.value as DateFilterMode)}
                    className="h-8 border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500"
                  >
                    <option value="all">All Dates</option>
                    <option value="date">Specific Date</option>
                    <option value="week">Specific Week</option>
                    <option value="month">Specific Month</option>
                    <option value="year">Specific Year</option>
                    <option value="range">Date Range</option>
                  </select>

                  {dateFilterMode === "date" && (
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) => setSelectedDate(event.target.value)}
                      className="h-8 border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500"
                    />
                  )}

                  {dateFilterMode === "week" && (
                    <input
                      type="week"
                      value={selectedWeek}
                      onChange={(event) => setSelectedWeek(event.target.value)}
                      className="h-8 border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500"
                    />
                  )}

                  {dateFilterMode === "month" && (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value)}
                      className="h-8 border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500"
                    />
                  )}

                  {dateFilterMode === "year" && (
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(event) => setSelectedYear(event.target.value)}
                      min={2000}
                      max={2100}
                      className="h-8 w-24 border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500"
                    />
                  )}

                  {dateFilterMode === "range" && (
                    <>
                      <input
                        type="date"
                        value={rangeStart}
                        onChange={(event) => setRangeStart(event.target.value)}
                        className="h-8 border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500"
                      />
                      <input
                        type="date"
                        value={rangeEnd}
                        onChange={(event) => setRangeEnd(event.target.value)}
                        className="h-8 border border-gray-200 bg-white px-2 text-[11px] text-gray-700 outline-none focus:border-blue-500"
                      />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={resetDateFilters}
                    className="inline-flex h-8 items-center gap-1 border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <FaUndo className="text-[10px]" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={filteredEntries.length === 0}
                    className="inline-flex h-8 items-center gap-1 border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaFilePdf className="text-[10px]" />
                    PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={filteredEntries.length === 0}
                    className="inline-flex h-8 items-center gap-1 border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaFileExcel className="text-[10px]" />
                    Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Entries Table */}
            <div className="overflow-hidden border border-gray-200">
              {detailsLoading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-[11px] text-gray-500">Loading entries...</p>
                </div>
              ) : entries.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No transactions found for this account.
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  No transactions found for the selected date filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-600">Date</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-600">Reference</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-600">Description</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-600">Debit</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-600">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{entry.reference}</td>
                          <td className="px-3 py-2">
                            <div className="max-w-[320px] truncate text-gray-800">{entry.description}</div>
                            <div className="text-[10px] text-gray-500">{entry.type}</div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {entry.debit > 0 ? (
                              <span className="font-semibold text-red-600">{entry.debit.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {entry.credit > 0 ? (
                              <span className="font-semibold text-emerald-600">{entry.credit.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-end gap-4 text-[11px] text-gray-600">
              <span>Debit: {totalDebit.toLocaleString()}</span>
              <span>Credit: {totalCredit.toLocaleString()}</span>
              <span>Rows: {filteredEntries.length} / {entries.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
