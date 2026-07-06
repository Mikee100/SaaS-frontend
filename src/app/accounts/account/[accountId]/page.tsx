"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FaArrowLeft, FaBuilding, FaCalendarAlt, FaChevronDown } from "react-icons/fa";
import { apiGet } from "@/utils/api";
import { useUser } from "@/components/UserContext";
import { useBranches } from "@/hooks/useBranches";
import { useBranchScope } from "@/hooks/useBranchScope";

type Account = {
  id: string;
  name: string;
  code: string;
  type: string;
};

type LedgerEntry = {
  id: string;
  date: string;
  reference: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  user?: string;
  source?: {
    type: "invoice" | "payment" | "expense" | "credit_note" | "sale" | "return" | "manual" | "stock";
    id?: string;
    paymentId?: string;
    url: string;
    label: string;
  };
};

type TrialBalanceAccount = {
  id: string;
  debit: number;
  credit: number;
  balance?: number;
};

type TrialBalanceData = {
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
};

type LedgerEntriesResponse = {
  items: LedgerEntry[];
  hasMore: boolean;
  nextCursor: string | null;
};

const PAGE_SIZE = 50;

const toQueryDate = (value: string | null) => (value ? value : "");

export default function AccountDetailPage() {
  const TOTALS_MODE_STORAGE_KEY = "account-detail-totals-mode-v1";
  const params = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const accountId = params?.accountId ?? "";

  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const {
    selectedBranchId,
    setSelectedBranchIdPersisted,
    canTenantSelectBranch,
    activeBranchName,
  } = useBranchScope({ user, branches });

  const queryDate = toQueryDate(searchParams?.get("date") ?? null);
  const queryStart = toQueryDate(searchParams?.get("startDate") ?? null);
  const queryEnd = toQueryDate(searchParams?.get("endDate") ?? null);
  const queryBranch = toQueryDate(searchParams?.get("branchId") ?? null);
  const from = searchParams?.get("from") || "trial-balance";

  const [account, setAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [totalsMode, setTotalsMode] = useState<"period" | "filtered">("period");
  const [endingBalance, setEndingBalance] = useState<number | null>(null);
  // Trial Balance is an "as-of" view, so drilldown should default to all history up to that date.
  const [startDate, setStartDate] = useState(queryStart || "");
  const [endDate, setEndDate] = useState(queryEnd || queryDate || "");

  useEffect(() => {
    if (!queryBranch) return;
    setSelectedBranchIdPersisted(queryBranch);
  }, [queryBranch, setSelectedBranchIdPersisted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(TOTALS_MODE_STORAGE_KEY);
    if (saved === "period" || saved === "filtered") {
      setTotalsMode(saved);
    }
  }, [TOTALS_MODE_STORAGE_KEY]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOTALS_MODE_STORAGE_KEY, totalsMode);
  }, [totalsMode, TOTALS_MODE_STORAGE_KEY]);

  const getBranchHeaders = () => {
    if (!selectedBranchId || selectedBranchId === "all") return undefined;
    return { "x-branch-id": selectedBranchId };
  };

  const buildEntriesUrl = (cursor?: string | null) => {
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    if (cursor) p.set("cursor", cursor);
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    return `/ledger/accounts/${accountId}/entries?${p.toString()}`;
  };

  const fetchAccount = async () => {
    if (!accountId) {
      setAccount(null);
      return;
    }
    const all = await apiGet<Account[]>("/ledger/accounts", getBranchHeaders());
    const found = (all || []).find((a) => a.id === accountId) || null;
    setAccount(found);
  };

  const fetchEntries = async () => {
    if (!accountId) {
      setEntries([]);
      setHasMore(false);
      setNextCursor(null);
      setEndingBalance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiGet<LedgerEntriesResponse>(buildEntriesUrl(), getBranchHeaders());
      setEntries(res.items || []);
      setHasMore(Boolean(res.hasMore));
      setNextCursor(res.nextCursor);

      const asOfDate = endDate || new Date().toISOString().split("T")[0];
      const trial = await apiGet<TrialBalanceData>(
        `/ledger/trial-balance?date=${asOfDate}`,
        getBranchHeaders(),
      );
      const asOfAccount = (trial.accounts || []).find((row) => row.id === accountId);
      if (!asOfAccount) {
        setEndingBalance(0);
      } else {
        const asOfNet =
          typeof asOfAccount.balance === "number"
            ? asOfAccount.balance
            : asOfAccount.debit - asOfAccount.credit;
        setEndingBalance(asOfNet);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await apiGet<LedgerEntriesResponse>(buildEntriesUrl(nextCursor), getBranchHeaders());
      setEntries((prev) => [...prev, ...(res.items || [])]);
      setHasMore(Boolean(res.hasMore));
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void fetchAccount();
    void fetchEntries();
  }, [accountId, selectedBranchId, startDate, endDate]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const dateDelta = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDelta !== 0) return dateDelta;
      return a.id.localeCompare(b.id);
    });
  }, [entries]);

  const periodDebitTotal = sortedEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const periodCreditTotal = sortedEntries.reduce((sum, entry) => sum + entry.credit, 0);
  const periodNetMovement = periodDebitTotal - periodCreditTotal;
  const closingBalance = endingBalance ?? periodNetMovement;
  const openingBalance = closingBalance - periodNetMovement;

  const rowsWithRunning = useMemo(() => {
    let running = openingBalance;
    return sortedEntries.map((entry) => {
      running += entry.debit - entry.credit;
      return {
        ...entry,
        runningBalance: running,
      };
    });
  }, [sortedEntries, openingBalance]);

  const displayRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rowsWithRunning;
    return rowsWithRunning.filter((entry) => {
      return (
        entry.reference.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.type.toLowerCase().includes(q)
      );
    });
  }, [rowsWithRunning, searchText]);

  const filteredDebitTotal = displayRows.reduce((sum, entry) => sum + entry.debit, 0);
  const filteredCreditTotal = displayRows.reduce((sum, entry) => sum + entry.credit, 0);
  const filteredNetMovement = filteredDebitTotal - filteredCreditTotal;

  const activeDebitTotal = totalsMode === "filtered" ? filteredDebitTotal : periodDebitTotal;
  const activeCreditTotal = totalsMode === "filtered" ? filteredCreditTotal : periodCreditTotal;
  const activeNetMovement = activeDebitTotal - activeCreditTotal;
  const activeClosingBalance =
    totalsMode === "filtered" ? openingBalance + filteredNetMovement : closingBalance;
  const totalsScopeLabel = totalsMode === "filtered" ? "Filtered rows" : "Full period";

  const backHref = useMemo(() => {
    if (from === "ledgers") {
      return "/accounts/ledgers";
    }

    if (from === "profit-loss") {
      const p = new URLSearchParams();
      if (queryStart) p.set("startDate", queryStart);
      if (queryEnd || queryDate) p.set("endDate", queryEnd || queryDate);
      if (queryBranch) p.set("branchId", queryBranch);
      return `/accounts/profit-loss${p.toString() ? `?${p.toString()}` : ""}`;
    }

    const p = new URLSearchParams();
    if (queryDate) p.set("date", queryDate);
    if (queryBranch) p.set("branchId", queryBranch);
    return `/accounts/trial-balance${p.toString() ? `?${p.toString()}` : ""}`;
  }, [from, queryDate, queryStart, queryEnd, queryBranch]);

  return (
    <div className="min-h-screen bg-slate-50 px-2 py-3 md:px-4 md:py-4">
      <div className="mx-auto w-full max-w-400 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Link
              href={backHref}
              className="inline-flex h-8 items-center gap-2 border border-slate-200 bg-white px-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FaArrowLeft /> Back
            </Link>
            <div className="text-slate-500">Account Detail</div>
            {account && (
              <>
                <span className="rounded-sm bg-slate-100 px-2 py-1 font-semibold text-slate-700">{account.code}</span>
                <span className="font-semibold text-slate-900">{account.name}</span>
                <span className="text-slate-500 uppercase">{account.type}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canTenantSelectBranch ? (
              <label className="inline-flex items-center gap-1">
                <FaBuilding className="text-slate-400" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchIdPersisted(e.target.value)}
                  className="h-8 border border-slate-200 bg-white px-2 text-xs text-slate-700"
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
              <span className="inline-flex h-8 items-center border border-slate-200 bg-slate-50 px-2 text-slate-700">
                Branch: {activeBranchName}
              </span>
            )}

            <label className="inline-flex items-center gap-1">
              <FaCalendarAlt className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 border border-slate-200 bg-white px-2 text-xs text-slate-700"
              />
            </label>
            <FaChevronDown className="text-slate-300" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 border border-slate-200 bg-white px-2 text-xs text-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border border-slate-200 bg-white px-3 py-2 text-xs md:grid-cols-6">
          <div><span className="text-slate-500">Rows:</span> <span className="font-semibold text-slate-900">{displayRows.length}</span></div>
          <div><span className="text-slate-500">Debit:</span> <span className="font-semibold text-slate-900">{activeDebitTotal.toLocaleString()}</span></div>
          <div><span className="text-slate-500">Credit:</span> <span className="font-semibold text-slate-900">{activeCreditTotal.toLocaleString()}</span></div>
          <div><span className="text-slate-500">{totalsMode === "filtered" ? "Derived close:" : "As-of balance:"}</span> <span className="font-semibold text-slate-900">{activeClosingBalance.toLocaleString()}</span></div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTotalsMode("period")}
              className={`h-8 border px-2 text-[11px] font-semibold ${
                totalsMode === "period"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Period
            </button>
            <button
              type="button"
              onClick={() => setTotalsMode("filtered")}
              className={`h-8 border px-2 text-[11px] font-semibold ${
                totalsMode === "filtered"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Filtered
            </button>
          </div>
          <div>
            <input
              type="text"
              placeholder="Search entries"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-8 w-full border border-slate-200 bg-white px-2 text-xs text-slate-700"
            />
          </div>
        </div>

        <div className="overflow-hidden border border-slate-200 bg-white">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading account entries...</div>
          ) : !account ? (
            <div className="py-12 text-center text-xs text-rose-600">
              Account not found in current scope.
            </div>
          ) : displayRows.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No entries found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">Reference</th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">Description</th>
                    <th className="px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">Debit</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">Credit</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">Net</th>
                    <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">Running</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRows.map((entry) => {
                    const net = entry.debit - entry.credit;
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-700">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-3 py-1.5 text-slate-700">
                          {entry.source?.url ? (
                            <Link
                              href={entry.source.url}
                              className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                              title={entry.source.label}
                            >
                              {entry.reference}
                            </Link>
                          ) : (
                            entry.reference
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-800">{entry.description}</td>
                        <td className="px-3 py-1.5 text-slate-600">{entry.type}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{entry.debit > 0 ? entry.debit.toLocaleString() : "-"}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-900">{entry.credit > 0 ? entry.credit.toLocaleString() : "-"}</td>
                        <td className={`px-3 py-1.5 text-right font-semibold ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {net.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-slate-900">
                          {entry.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="sticky bottom-0 border-t-2 border-slate-300 bg-slate-100 text-slate-900">
                    <td colSpan={4} className="px-3 py-2 font-semibold">
                      {totalsScopeLabel} Totals (Opening basis: {openingBalance.toLocaleString()})
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{activeDebitTotal.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-bold">{activeCreditTotal.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right font-bold ${activeNetMovement >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {activeNetMovement.toLocaleString()}
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${activeClosingBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {activeClosingBalance.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex h-8 items-center border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
