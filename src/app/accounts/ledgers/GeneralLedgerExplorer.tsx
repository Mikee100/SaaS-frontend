"use client";

import React, { useState, useEffect } from "react";
import { 
  FaSearch, 
  FaArrowLeft, 
  FaChevronRight
} from "react-icons/fa";
import { apiGet } from "@/utils/api";
import { useUser } from "@/components/UserContext";
import { useBranches } from "@/hooks/useBranches";

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

export default function GeneralLedgerExplorer() {
  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
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
                      {entries.map((entry) => (
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
              <span>Debit: {entries.reduce((sum, e) => sum + e.debit, 0).toLocaleString()}</span>
              <span>Credit: {entries.reduce((sum, e) => sum + e.credit, 0).toLocaleString()}</span>
              <span>Rows: {entries.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
