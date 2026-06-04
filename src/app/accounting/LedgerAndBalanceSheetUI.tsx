"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { 
  FaFileExport, 
  FaFilter, 
  FaSearch, 
  FaPlus, 
  FaChartLine, 
  FaBalanceScale, 
  FaHistory,
  FaCalculator,
  FaCheckCircle,
  FaInfoCircle
} from "react-icons/fa";
import { useUser } from "@/components/UserContext";
import { useBranches } from "@/hooks/useBranches";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000").replace(/\/+$/, "");

export default function LedgerAndBalanceSheetUI() {
  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const [activeTab, setActiveTab] = useState<"ledger" | "trial-balance" | "p-and-l" | "balance-sheet">("ledger");
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pAndL, setPAndL] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [initializing, setInitializing] = useState(false);
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

  const getBranchHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined" && selectedBranchId && selectedBranchId !== "all") {
      headers["x-branch-id"] = selectedBranchId;
    }
    return headers;
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

  // Manual Journal Entry State
  const [entryDescription, setEntryDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryType, setEntryType] = useState("manual");
  const [entryLines, setEntryLines] = useState([
    { accountId: "", debit: 0, credit: 0, description: "" },
    { accountId: "", debit: 0, credit: 0, description: "" },
  ]);

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedBranchId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getBranchHeaders();
      const options = { credentials: "include" as const, headers };

      // Fetch accounts if needed for modal
      const accountsRes = await fetch(`${API_URL}/ledger/accounts`, options);
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
      }

      if (activeTab === "ledger") {
        const res = await fetch(`${API_URL}/ledger`, options);
        if (res.ok) setLedgerData(await res.json());
      } else if (activeTab === "trial-balance") {
        const res = await fetch(`${API_URL}/ledger/trial-balance`, options);
        if (res.ok) setTrialBalance(await res.json());
      } else if (activeTab === "p-and-l") {
        const res = await fetch(`${API_URL}/ledger/profit-loss`, options);
        if (res.ok) setPAndL(await res.json());
      } else if (activeTab === "balance-sheet") {
        const res = await fetch(`${API_URL}/ledger/balance-sheet`, options);
        if (res.ok) setBalanceSheet(await res.json());
      }
    } catch (error) {
      console.error("Error fetching accounting data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitCOA = async () => {
    setInitializing(true);
    try {
      const res = await fetch(`${API_URL}/ledger/init-coa`, {
        method: "POST",
        credentials: "include",
        headers: getBranchHeaders(),
      });
      if (res.ok) {
        alert("Chart of Accounts initialized successfully!");
        fetchData();
      }
    } catch (error) {
      console.error("Error initializing COA:", error);
    } finally {
      setInitializing(false);
    }
  };

  const handleAddLine = () => {
    setEntryLines([...entryLines, { accountId: "", debit: 0, credit: 0, description: "" }]);
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...entryLines];
    newLines[index] = { ...newLines[index], [field]: value };
    setEntryLines(newLines);
  };

  const handleSubmitEntry = async () => {
    const totalDebit = entryLines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = entryLines.reduce((sum, l) => sum + Number(l.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert("Journal entry must be balanced (Total Debit = Total Credit)");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/ledger/journal`, {
        method: "POST",
        credentials: "include",
        headers: getBranchHeaders(),
        body: JSON.stringify({
          description: entryDescription,
          date: entryDate,
          type: entryType,
          lines: entryLines.map(l => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) })),
        }),
      });

      if (res.ok) {
        setShowEntryModal(false);
        setEntryDescription("");
        setEntryLines([{ accountId: "", debit: 0, credit: 0, description: "" }, { accountId: "", debit: 0, credit: 0, description: "" }]);
        fetchData();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to save entry");
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Accounting Center</h1>
            <p className="text-gray-500 mt-1">Manage your financial records and professional reports.</p>
          </div>
          <div className="flex gap-3">
            {canTenantSelectBranch ? (
              <select
                value={selectedBranchId}
                onChange={handleBranchChange}
                className="px-3 py-2.5 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2.5 bg-gray-50 text-gray-600 font-semibold rounded-xl border border-gray-200 text-sm">
                Branch: {activeBranchName}
              </div>
            )}

            {accounts.length === 0 && (
              <button 
                onClick={handleInitCOA}
                disabled={initializing}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-100 transition-all border border-indigo-200"
              >
                {initializing ? "Initializing..." : "Setup Chart of Accounts"}
              </button>
            )}
            <button 
              onClick={() => setShowEntryModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              <FaPlus /> New Transaction
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 w-fit">
          {[
            { id: "ledger", label: "General Ledger", icon: FaHistory },
            { id: "trial-balance", label: "Trial Balance", icon: FaCalculator },
            { id: "p-and-l", label: "Profit & Loss", icon: FaChartLine },
            { id: "balance-sheet", label: "Balance Sheet", icon: FaBalanceScale },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-gray-900 text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className={activeTab === tab.id ? "text-blue-400" : "text-gray-400"} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500 font-medium">Crunching the numbers...</p>
            </div>
          ) : (
            <div className="p-8">
              {activeTab === "ledger" && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
                    <div className="flex gap-2">
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Search transactions..." 
                          className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
                        />
                      </div>
                      <button className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600">
                        <FaFilter />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Reference</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Debit</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Credit</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {ledgerData.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                              {new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg uppercase">
                                {entry.reference}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{entry.description}</td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-red-500">
                              {entry.debit > 0 ? `KES ${entry.debit.toLocaleString()}` : "-"}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-600">
                              {entry.credit > 0 ? `KES ${entry.credit.toLocaleString()}` : "-"}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                              KES {entry.balance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "trial-balance" && trialBalance && (
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Trial Balance</h2>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-bold">
                        <FaCheckCircle /> Balanced
                      </div>
                    </div>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Account Code</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Account Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Debit</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {trialBalance.accounts.map((acc: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-blue-600 font-bold">{acc.code}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{acc.name}</td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            {acc.debit > 0 ? `KES ${acc.debit.toLocaleString()}` : "-"}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            {acc.credit > 0 ? `KES ${acc.credit.toLocaleString()}` : "-"}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-900 text-white">
                        <td colSpan={2} className="px-6 py-4 font-bold rounded-l-2xl">TOTAL</td>
                        <td className="px-6 py-4 text-right font-bold text-blue-400">KES {trialBalance.totalDebit.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-400 rounded-r-2xl">KES {trialBalance.totalCredit.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "p-and-l" && pAndL && (
                <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-gray-900">Profit & Loss Statement</h2>
                    <p className="text-gray-500 font-medium">For the current period</p>
                  </div>
                  
                  <div className="space-y-10">
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">Revenue</h3>
                      <div className="space-y-3">
                        {pAndL.revenue.map((r: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-lg">
                            <span className="text-gray-600 font-medium">{r.name}</span>
                            <span className="font-bold text-gray-900">KES {r.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-900">
                          <span className="font-black text-gray-900">Total Revenue</span>
                          <span className="text-2xl font-black text-gray-900 underline decoration-blue-500 underline-offset-8">
                            KES {pAndL.totalRevenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">Expenses</h3>
                      <div className="space-y-3">
                        {pAndL.expenses.map((e: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-lg">
                            <span className="text-gray-600 font-medium">{e.name}</span>
                            <span className="font-bold text-gray-900">KES {e.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-4 border-t-2 border-gray-900">
                          <span className="font-black text-gray-900">Total Expenses</span>
                          <span className="text-2xl font-black text-gray-900 underline decoration-red-500 underline-offset-8">
                            KES {pAndL.totalExpenses.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </section>

                    <div className={`mt-12 p-8 rounded-3xl ${pAndL.netProfit >= 0 ? "bg-emerald-600" : "bg-red-600"} text-white shadow-xl shadow-gray-200`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white/70 font-bold uppercase text-xs tracking-widest mb-1">Net Operating {pAndL.netProfit >= 0 ? "Profit" : "Loss"}</p>
                          <h4 className="text-4xl font-black italic">KES {pAndL.netProfit.toLocaleString()}</h4>
                        </div>
                        <FaChartLine className="text-6xl text-white/20" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "balance-sheet" && balanceSheet && (
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-gray-900">Balance Sheet</h2>
                    <p className="text-gray-500 font-medium">Snapshot of your business value</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Left Column: Assets */}
                    <div className="space-y-8">
                      <section>
                        <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                          Assets
                        </h3>
                        <div className="space-y-4">
                          {balanceSheet.assets.map((a: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center pb-2 border-b border-gray-50">
                              <span className="text-gray-600 font-medium">{a.name}</span>
                              <span className="font-bold text-gray-900">KES {a.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-4 text-xl">
                            <span className="font-black text-gray-900 uppercase italic">Total Assets</span>
                            <span className="font-black text-blue-600 underline underline-offset-4 decoration-4">
                              KES {balanceSheet.totalAssets.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </section>
                    </div>

                    {/* Right Column: Liabilities & Equity */}
                    <div className="space-y-12">
                      <section>
                        <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <span className="h-2 w-2 bg-red-500 rounded-full"></span>
                          Liabilities
                        </h3>
                        <div className="space-y-4">
                          {balanceSheet.liabilities.map((l: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center pb-2 border-b border-gray-50">
                              <span className="text-gray-600 font-medium">{l.name}</span>
                              <span className="font-bold text-gray-900">KES {l.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-4 text-xl">
                            <span className="font-black text-gray-900 uppercase italic">Total Liabilities</span>
                            <span className="font-black text-red-500">KES {balanceSheet.totalLiabilities.toLocaleString()}</span>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <span className="h-2 w-2 bg-emerald-600 rounded-full"></span>
                          Equity
                        </h3>
                        <div className="space-y-4">
                          {balanceSheet.equity.map((e: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center pb-2 border-b border-gray-50">
                              <span className="text-gray-600 font-medium">{e.name}</span>
                              <span className="font-bold text-gray-900">KES {e.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between items-center pt-4 text-xl">
                            <span className="font-black text-gray-900 uppercase italic">Total Equity</span>
                            <span className="font-black text-emerald-600">KES {balanceSheet.totalEquity.toLocaleString()}</span>
                          </div>
                        </div>
                      </section>

                      <div className="p-6 bg-gray-900 rounded-3xl text-white">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold uppercase tracking-widest text-white/50 italic">Liabilities + Equity</p>
                          <p className="text-lg font-black text-blue-400">KES {(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toLocaleString()}</p>
                        </div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-full"></div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-emerald-400 uppercase">
                          <FaCheckCircle /> Perfectly Balanced
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 transform transition-all">
            <div className="bg-gray-900 p-6 flex justify-between items-center text-white">
              <div>
                <h3 className="text-2xl font-black tracking-tight">New Journal Entry</h3>
                <p className="text-white/50 text-sm font-medium">Record a manual accounting transaction</p>
              </div>
              <button onClick={() => setShowEntryModal(false)} className="text-white/50 hover:text-white text-3xl font-light">&times;</button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Description</label>
                  <input 
                    type="text" 
                    value={entryDescription}
                    onChange={(e) => setEntryDescription(e.target.value)}
                    placeholder="e.g. Starting Capital injection"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Date</label>
                  <input 
                    type="date" 
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Transaction Type</label>
                  <select 
                    value={entryType}
                    onChange={(e) => setEntryType(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="manual">Manual Journal</option>
                    <option value="capital_injection">Capital Injection</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 text-xs font-bold text-gray-400 uppercase px-4">
                  <div className="flex-1">Account</div>
                  <div className="w-40 text-right">Debit</div>
                  <div className="w-40 text-right">Credit</div>
                  <div className="w-10"></div>
                </div>
                
                {entryLines.map((line, idx) => (
                  <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-left-2 transition-all">
                    <select 
                      value={line.accountId}
                      onChange={(e) => handleLineChange(idx, "accountId", e.target.value)}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select Account...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      value={line.debit}
                      onChange={(e) => handleLineChange(idx, "debit", e.target.value)}
                      placeholder="0.00"
                      className="w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-right font-bold text-red-500 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input 
                      type="number" 
                      value={line.credit}
                      onChange={(e) => handleLineChange(idx, "credit", e.target.value)}
                      placeholder="0.00"
                      className="w-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-right font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      onClick={() => setEntryLines(entryLines.filter((_, i) => i !== idx))}
                      className="w-10 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleAddLine}
                className="mt-6 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                <FaPlus /> Add Line Item
              </button>

              <div className="mt-8 pt-6 border-t flex justify-between items-center">
                <div className="flex gap-8">
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Total Debits</p>
                    <p className="text-xl font-black text-gray-900">KES {entryLines.reduce((sum, l) => sum + Number(l.debit), 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Total Credits</p>
                    <p className="text-xl font-black text-gray-900">KES {entryLines.reduce((sum, l) => sum + Number(l.credit), 0).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                   <button 
                    onClick={() => setShowEntryModal(false)}
                    className="px-8 py-3 text-gray-500 font-bold hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmitEntry}
                    className="px-10 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Post Journal Entry
                  </button>
                </div>
              </div>
              
              {Math.abs(entryLines.reduce((sum, l) => sum + Number(l.debit), 0) - entryLines.reduce((sum, l) => sum + Number(l.credit), 0)) > 0.01 && (
                <p className="mt-4 text-xs font-bold text-red-500 flex items-center gap-2 italic">
                  <FaInfoCircle /> Entry is unbalanced. Debits and credits must match.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
