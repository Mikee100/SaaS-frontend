"use client";

import React, { useState, useEffect, type ChangeEvent } from "react";
import { 
  FaPrint, 
  FaFileExport, 
  FaCalendarAlt, 
  FaBalanceScale,
  FaCalculator
} from "react-icons/fa";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BalanceItem {
  name: string;
  amount: number;
}

interface BalanceSheetData {
  assets: BalanceItem[];
  liabilities: BalanceItem[];
  equity: BalanceItem[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export default function BalanceSheetStatement() {
  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [enableComparison, setEnableComparison] = useState(false);
  const [compareDate, setCompareDate] = useState(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [compareData, setCompareData] = useState<BalanceSheetData | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
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
  }, [date, selectedBranchId]);

  useEffect(() => {
    if (!enableComparison) {
      setCompareData(null);
      return;
    }

    const fetchCompareData = async () => {
      setCompareLoading(true);
      try {
        const res = await apiGet<BalanceSheetData>(
          `/ledger/balance-sheet?date=${compareDate}`,
          getBranchHeaders(),
        );
        setCompareData(res);
      } catch (error) {
        console.error("Error fetching comparison balance sheet:", error);
        setCompareData(null);
      } finally {
        setCompareLoading(false);
      }
    };

    fetchCompareData();
  }, [enableComparison, compareDate, selectedBranchId]);

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
      const res = await apiGet<BalanceSheetData>(`/ledger/balance-sheet?date=${date}`, getBranchHeaders());
      setData(res);
    } catch (error) {
      console.error("Error fetching balance sheet:", error);
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
      const res = await apiPost<{ syncedSalesCount: number }>("/ledger/sync", {}, getBranchHeaders());
      toast({ title: "Sync complete", description: `${res.syncedSalesCount} records imported.` });
      fetchData();
    } catch (error) {
      console.error("Error syncing ledger:", error);
      toast({ title: "Sync failed", description: "Failed to sync.", variant: "destructive" });
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
    const titleFontSize = getPdfTitleFontSize(pdfTemplate);
    const bodyFontSize = getPdfBodyFontSize(pdfTemplate);
    const reportCurrency = getPdfCurrency(tenantData, pdfTemplate);
    const { primaryRgb } = getPdfTableColors(pdfTemplate);
    const doc = new jsPDF(getPdfDocOptions(pdfTemplate));

    await preparePdfWatermark(doc, getFullAssetUrl(tenantData?.watermark as string | null | undefined));
    let yPosition = applyPdfBusinessHeader(doc, tenantData, pdfTemplate, margin);

    doc.setFontSize(titleFontSize);
    doc.setTextColor((pdfTemplate.primaryColor || "#000000").replace("#", "") || "000000");
    doc.text("Balance Sheet", margin, yPosition + 6);
    yPosition += 10;

    doc.setFontSize(bodyFontSize);
    doc.setTextColor("666666");
    doc.text(`As of ${new Date(date).toLocaleDateString(undefined, { dateStyle: "long" })}`, margin, yPosition);
    yPosition += 4;
    if (pdfTemplate.branchInfo) {
      doc.text(`Branch: ${activeBranchName}`, margin, yPosition);
      yPosition += 4;
    }
    doc.text(`Status: ${isBalanced ? "Balanced" : "Unbalanced"}`, margin, yPosition);
    yPosition += 5;

    const rows = [
      ...data.assets.map((item) => ["Assets", item.name, item.amount.toLocaleString(undefined, { style: "currency", currency: reportCurrency })]),
      ["Assets", "Total Assets", data.totalAssets.toLocaleString(undefined, { style: "currency", currency: reportCurrency })],
      ...data.liabilities.map((item) => ["Liabilities", item.name, item.amount.toLocaleString(undefined, { style: "currency", currency: reportCurrency })]),
      ["Liabilities", "Total Liabilities", data.totalLiabilities.toLocaleString(undefined, { style: "currency", currency: reportCurrency })],
      ...data.equity.map((item) => ["Equity", item.name, item.amount.toLocaleString(undefined, { style: "currency", currency: reportCurrency })]),
      ["Equity", "Total Equity", data.totalEquity.toLocaleString(undefined, { style: "currency", currency: reportCurrency })],
      ["Summary", "Total Liabilities + Equity", totalLiabilitiesAndEquity.toLocaleString(undefined, { style: "currency", currency: reportCurrency })],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [["Section", "Item", `Amount (${reportCurrency})`]],
      body: rows,
      styles: { fontSize: Math.max(7, bodyFontSize - 3), cellPadding: 2 },
      headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        2: { halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    applyPdfFooterAndPageNumbers(doc, pdfTemplate, "SaaS POS • Accounting");
    doc.save(`balance-sheet-${date}.pdf`);
  };

  if (loading && !data) {
    return (
      <div className="py-8 text-sm text-gray-600">
        Preparing balance sheet...
      </div>
    );
  }

  if (accountsCount === 0) {
    return (
      <div className="max-w-xl rounded-md border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <FaCalculator className="text-blue-600" />
          Accounting not initialized
        </div>
        <p className="mb-3 text-sm text-gray-600">
          Set up your Chart of Accounts to start tracking your business assets, liabilities, and equity.
        </p>
        <button
          onClick={handleInitCOA}
          disabled={initializing}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {initializing ? "Initializing..." : "Initialize accounting"}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isBalanced = Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01;
  const totalLiabilitiesAndEquity = data.totalLiabilities + data.totalEquity;
  const compareTotalLiabilitiesAndEquity =
    (compareData?.totalLiabilities || 0) + (compareData?.totalEquity || 0);
  const assetDelta = data.totalAssets - (compareData?.totalAssets || 0);
  const liabilitiesDelta = data.totalLiabilities - (compareData?.totalLiabilities || 0);
  const equityDelta = data.totalEquity - (compareData?.totalEquity || 0);
  const accountingEquationDelta = totalLiabilitiesAndEquity - compareTotalLiabilitiesAndEquity;
  const formatCurrency = (value: number) => `KES ${value.toLocaleString()}`;
  const formatDelta = (value: number) => `${value >= 0 ? "+" : ""}${formatCurrency(value)}`;
  const explainabilityText =
    "Balances reflect posted ledger entries up to the selected date. Assets should equal Liabilities plus Equity after all postings.";

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
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white pl-8 pr-2 text-sm text-gray-700"
            />
          </div>

          <div
            className={`flex h-9 items-center gap-2 rounded-md px-2 text-xs font-medium ${isBalanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            <FaBalanceScale />
            {isBalanced ? "Balanced" : "Unbalanced"}
          </div>

          <label className="flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={enableComparison}
              onChange={(e) => {
                const checked = e.target.checked;
                setEnableComparison(checked);
                if (checked) {
                  setCompareDate(new Date(new Date(`${date}T00:00:00`).getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
                }
              }}
              className="h-3.5 w-3.5"
            />
            Compare
          </label>

          {enableComparison && (
            <input
              type="date"
              value={compareDate}
              onChange={(e) => setCompareDate(e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync History"}
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
            <FaFileExport /> Export PDF
          </button>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-3 py-2">
          <h1 className="text-base font-semibold text-gray-900">Balance Sheet</h1>
          <p className="text-xs text-gray-600">
            As of {new Date(date).toLocaleDateString(undefined, { dateStyle: "long" })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-gray-200 bg-slate-50 px-3 py-2 text-xs md:grid-cols-5">
          <div><span className="text-slate-500">Assets:</span> <span className="font-semibold text-slate-900">{formatCurrency(data.totalAssets)}</span></div>
          <div><span className="text-slate-500">Liabilities:</span> <span className="font-semibold text-slate-900">{formatCurrency(data.totalLiabilities)}</span></div>
          <div><span className="text-slate-500">Equity:</span> <span className="font-semibold text-slate-900">{formatCurrency(data.totalEquity)}</span></div>
          <div><span className="text-slate-500">L+E:</span> <span className="font-semibold text-slate-900">{formatCurrency(totalLiabilitiesAndEquity)}</span></div>
          <div><span className="text-slate-500">Status:</span> <span className={`font-semibold ${isBalanced ? "text-emerald-700" : "text-rose-700"}`}>{isBalanced ? "Balanced" : "Unbalanced"}</span></div>
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
                  Compared to {new Date(compareDate).toLocaleDateString(undefined, { dateStyle: "medium" })}:
                </span>
                <span>Assets {formatDelta(assetDelta)}</span>
                <span>Liabilities {formatDelta(liabilitiesDelta)}</span>
                <span>Equity {formatDelta(equityDelta)}</span>
                <span className={accountingEquationDelta === assetDelta ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                  L+E {formatDelta(accountingEquationDelta)}
                </span>
              </div>
            ) : (
              <span>Comparison data is not available for the selected date.</span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 p-3 lg:grid-cols-2">
          <section className="space-y-2">
            <h2 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
              Assets
            </h2>
            <div className="space-y-1">
              {data.assets.length > 0 ? (
                data.assets.map((item, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-gray-100 py-1">
                    <span className="text-gray-800">{item.name}</span>
                    <span className="font-medium text-gray-900">KES {item.amount.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No assets recorded.</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
              <span>Total Assets</span>
              <span>KES {data.totalAssets.toLocaleString()}</span>
            </div>
          </section>

          <section className="space-y-3">
            <div className="space-y-2">
              <h2 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
                Liabilities
              </h2>
              <div className="space-y-1">
                {data.liabilities.length > 0 ? (
                  data.liabilities.map((item, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-gray-100 py-1">
                      <span className="text-gray-800">{item.name}</span>
                      <span className="font-medium text-gray-900">KES {item.amount.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No liabilities recorded.</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
                <span>Total Liabilities</span>
                <span>KES {data.totalLiabilities.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-900">
                Equity
              </h2>
              <div className="space-y-1">
                {data.equity.length > 0 ? (
                  data.equity.map((item, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-gray-100 py-1">
                      <span className="text-gray-800">{item.name}</span>
                      <span className="font-medium text-gray-900">KES {item.amount.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No equity recorded.</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-gray-300 pt-2 font-semibold">
                <span>Total Equity</span>
                <span>KES {data.totalEquity.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t-2 border-gray-900 pt-2 font-semibold">
              <span>Total Liabilities + Equity</span>
              <span>KES {totalLiabilitiesAndEquity.toLocaleString()}</span>
            </div>
          </section>
        </div>

        <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Status: {isBalanced ? "Balanced" : "Unbalanced"} (Assets = Liabilities + Equity)
            </span>
            <span>Generated on {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
