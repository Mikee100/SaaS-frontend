"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { 
  FaChartLine, 
  FaCalendarAlt, 
  FaFileDownload, 
  FaPrint, 
  FaArrowUp, 
  FaArrowDown, 
  FaChevronRight,
  FaCalculator
} from "react-icons/fa";
import { apiGet, apiPost } from "@/utils/api";
import { useUser } from "@/components/UserContext";
import { useBranches } from "@/hooks/useBranches";

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

export default function ProfitLossStatement() {
  const { user } = useUser();
  const { data: branches = [] } = useBranches();
  const [data, setData] = useState<ProfitAndLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
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
  }, [startDate, endDate, selectedBranchId]);

  const checkAccounts = async () => {
    try {
      const res = await apiGet("/ledger/accounts", getBranchHeaders());
      setAccountsCount(res.length);
    } catch (error) {
      console.error("Error checking accounts:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet(
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

  const handleInitCOA = async () => {
    setInitializing(true);
    try {
      await apiPost("/ledger/init-coa", {}, getBranchHeaders());
      await checkAccounts();
      await fetchData();
      alert("Chart of Accounts initialized! Your future sales and expenses will now be recorded here.");
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
      const res = await apiPost("/ledger/sync", {}, getBranchHeaders());
      alert(`Sync complete! ${res.syncedSalesCount} past sales have been imported into the accounting system.`);
      fetchData();
    } catch (error) {
      console.error("Error syncing ledger:", error);
      alert("Failed to sync past transactions.");
    } finally {
      setSyncing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Generating financial statement...</p>
      </div>
    );
  }

  if (accountsCount === 0) {
    return (
      <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-xl text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">
          <FaCalculator />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4">Accounting System Not Ready</h2>
        <p className="text-gray-500 mb-8 font-medium leading-relaxed">
          Your Chart of Accounts has not been set up. We need to initialize the accounting structure to track your revenue, expenses, and profit automatically.
        </p>
        <button 
          onClick={handleInitCOA}
          disabled={initializing}
          className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {initializing ? "Initializing System..." : "Setup Accounting Now"}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const grossProfitMargin = data.totalRevenue > 0 ? (data.grossProfit / data.totalRevenue) * 100 : 0;
  const netProfitMargin = data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FaCalculator className="text-blue-600" />
            Profit & Loss Statement
          </h2>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Financial performance summary for the selected period
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {canTenantSelectBranch ? (
            <select
              value={selectedBranchId}
              onChange={handleBranchChange}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="h-11 rounded-2xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-600 flex items-center">
              Branch: {activeBranchName}
            </div>
          )}

          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-2 px-3">
              <FaCalendarAlt className="text-gray-400 text-xs" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer"
              />
            </div>
            <FaChevronRight className="text-gray-300 text-xs" />
            <div className="flex items-center gap-2 px-3">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="p-3 bg-white border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
              title="Print Statement"
            >
              <FaPrint />
            </button>
            <button 
              className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95 text-sm"
            >
              <FaFileDownload /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
          <h3 className="text-2xl font-black text-gray-900">KES {data.totalRevenue.toLocaleString()}</h3>
          <div className="mt-2 flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
            <FaArrowUp /> 100% of income
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-amber-400">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Gross Profit</p>
          <h3 className="text-2xl font-black text-gray-900">KES {data.grossProfit.toLocaleString()}</h3>
          <div className="mt-2 flex items-center gap-1 text-amber-500 text-[10px] font-bold">
            {grossProfitMargin.toFixed(1)}% Margin
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-blue-400">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Op. Expenses</p>
          <h3 className="text-2xl font-black text-gray-900">KES {data.totalExpenses.toLocaleString()}</h3>
          <div className="mt-2 flex items-center gap-1 text-blue-500 text-[10px] font-bold">
            <FaArrowDown /> {data.totalRevenue > 0 ? ((data.totalExpenses / data.totalRevenue) * 100).toFixed(1) : 0}% of revenue
          </div>
        </div>

        <div className={`p-6 rounded-3xl shadow-xl ${data.netProfit >= 0 ? 'bg-emerald-600 shadow-emerald-100' : 'bg-red-600 shadow-red-100'} text-white`}>
          <p className="text-xs font-black text-white/70 uppercase tracking-widest mb-1">Net {data.netProfit >= 0 ? 'Profit' : 'Loss'}</p>
          <h3 className="text-2xl font-black italic">KES {data.netProfit.toLocaleString()}</h3>
          <div className="mt-2 flex items-center gap-1 text-white/80 text-[10px] font-bold">
            {netProfitMargin.toFixed(1)}% Net Margin
          </div>
        </div>
      </div>

      {/* Main Statement Content */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 max-w-4xl mx-auto">
          <div className="space-y-12">
            
            {/* Revenue Section */}
            <section>
              <div className="flex justify-between items-end mb-6 border-b-2 border-gray-900 pb-2">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Revenue</h3>
                <span className="text-sm font-bold text-gray-400 uppercase">Amount (KES)</span>
              </div>
              <div className="space-y-4">
                {data.revenue.length > 0 ? data.revenue.map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <span className="text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{r.name}</span>
                    <span className="font-bold text-gray-900">{r.amount.toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="text-gray-400 italic text-sm py-2">No revenue recorded in this period.</div>
                )}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                  <span className="font-black text-gray-900 uppercase">Total Revenue</span>
                  <span className="text-xl font-black text-gray-900 border-b-4 border-gray-900 px-1">
                    {data.totalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </section>

            {/* COGS Section */}
            <section>
              <div className="flex justify-between items-end mb-6 border-b-2 border-gray-900 pb-2">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Cost of Goods Sold</h3>
              </div>
              <div className="space-y-4">
                {data.cogs.length > 0 ? data.cogs.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <span className="text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{c.name}</span>
                    <span className="font-bold text-gray-900">({c.amount.toLocaleString()})</span>
                  </div>
                )) : (
                  <div className="text-gray-400 italic text-sm py-2">No COGS recorded in this period.</div>
                )}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                  <span className="font-black text-gray-900 uppercase">Total COGS</span>
                  <span className="text-lg font-bold text-gray-900">
                    ({data.totalCOGS.toLocaleString()})
                  </span>
                </div>
              </div>
            </section>

            {/* Gross Profit Highlight */}
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex justify-between items-center">
              <span className="text-amber-900 font-black uppercase text-lg italic">Gross Profit</span>
              <span className="text-2xl font-black text-amber-900">KES {data.grossProfit.toLocaleString()}</span>
            </div>

            {/* Expenses Section */}
            <section>
              <div className="flex justify-between items-end mb-6 border-b-2 border-gray-900 pb-2">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Operating Expenses</h3>
              </div>
              <div className="space-y-4">
                {data.expenses.length > 0 ? data.expenses.map((e, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <span className="text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{e.name}</span>
                    <span className="font-bold text-gray-900">{e.amount.toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="text-gray-400 italic text-sm py-2">No operating expenses recorded.</div>
                )}
                <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                  <span className="font-black text-gray-900 uppercase">Total Operating Expenses</span>
                  <span className="text-lg font-bold text-gray-900">
                    {data.totalExpenses.toLocaleString()}
                  </span>
                </div>
              </div>
            </section>

            {/* Net Profit Final */}
            <div className={`mt-16 p-8 rounded-[2rem] ${data.netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-600'} text-white shadow-2xl relative overflow-hidden`}>
              <FaChartLine className="absolute -right-8 -bottom-8 text-[12rem] text-white/10 rotate-12" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <p className="text-white/70 font-black uppercase tracking-[0.2em] text-xs mb-2">Net {data.netProfit >= 0 ? 'Operating Profit' : 'Operating Loss'}</p>
                  <h4 className="text-5xl font-black italic tracking-tighter">
                    KES {data.netProfit.toLocaleString()}
                  </h4>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-xs font-bold uppercase mb-1">Performance Index</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full" 
                        style={{ width: `${Math.min(Math.max(netProfitMargin, 0), 100)}%` }}
                      ></div>
                    </div>
                    <span className="font-black text-xl">{netProfitMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
          
          <div className="mt-12 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Generated on {new Date().toLocaleString()} • Certified SaaS Platform Accounting Report
          </div>
        </div>
      </div>
    </div>
  );
}
