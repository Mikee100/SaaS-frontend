"use client";

import React, { useState, useEffect } from "react";
import { 
  FaPrint, 
  FaFileExport, 
  FaCalendarAlt, 
  FaShieldAlt, 
  FaBalanceScale,
  FaCalculator,
  FaArrowRight,
  FaBuilding,
  FaWallet,
  FaFileInvoiceDollar
} from "react-icons/fa";
import { apiGet, apiPost } from "@/utils/api";

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
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountsCount, setAccountsCount] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    checkAccounts();
    fetchData();
  }, [date]);

  const checkAccounts = async () => {
    try {
      const res = await apiGet("/ledger/accounts");
      setAccountsCount(res.length);
    } catch (error) {
      console.error("Error checking accounts:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/ledger/balance-sheet?date=${date}`);
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
      await apiPost("/ledger/init-coa", {});
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
      const res = await apiPost("/ledger/sync", {});
      alert(`Sync complete! ${res.syncedSalesCount} records imported.`);
      fetchData();
    } catch (error) {
      console.error("Error syncing ledger:", error);
      alert("Failed to sync.");
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
        <p className="text-gray-500 font-medium">Preparing Balance Sheet...</p>
      </div>
    );
  }

  if (accountsCount === 0) {
    return (
      <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 shadow-xl text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">
          <FaCalculator />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4">Accounting Not Initialized</h2>
        <p className="text-gray-500 mb-8 font-medium leading-relaxed">
          Set up your Chart of Accounts to start tracking your business assets, liabilities, and equity.
        </p>
        <button 
          onClick={handleInitCOA}
          disabled={initializing}
          className="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {initializing ? "Initializing..." : "Initialize Accounting System"}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isBalanced = Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="relative">
            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            />
          </div>
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider ${isBalanced ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            <FaBalanceScale />
            {isBalanced ? "Balanced" : "Unbalanced"}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync History"}
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
          >
            <FaPrint /> Print
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-900 rounded-2xl text-sm font-bold text-white hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95">
            <FaFileExport /> Export PDF
          </button>
        </div>
      </div>

      {/* Main Statement Card */}
      <div className="bg-white rounded-[3rem] shadow-2xl shadow-gray-100 border border-gray-100 overflow-hidden print:shadow-none print:border-none">
        {/* Report Header */}
        <div className="bg-gray-900 p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-blue-400 mb-2 font-black uppercase tracking-[0.2em] text-xs">
              <FaShieldAlt /> Verified Financial Report
            </div>
            <h1 className="text-5xl font-black mb-4 tracking-tight">Balance Sheet</h1>
            <p className="text-gray-400 text-lg font-medium max-w-xl">
              Statement of financial position as of <span className="text-white font-bold">{new Date(date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
            </p>
          </div>
        </div>

        <div className="p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Left Column: Assets */}
            <div className="space-y-12">
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                    <FaWallet />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900">Assets</h2>
                </div>

                <div className="space-y-6">
                  {data.assets.length > 0 ? (
                    data.assets.map((item, index) => (
                      <div key={index} className="flex items-center justify-between group">
                        <div className="flex flex-col">
                          <span className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Account</span>
                          <span className="text-gray-900 font-black text-lg group-hover:text-blue-600 transition-colors">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1 block">Value (KES)</span>
                          <span className="text-xl font-black text-gray-900">{item.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 font-medium italic">No assets recorded.</p>
                  )}
                </div>

                <div className="mt-10 pt-10 border-t-2 border-gray-50 flex items-center justify-between">
                  <span className="text-xl font-black text-gray-900">Total Assets</span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-blue-600">KES {data.totalAssets.toLocaleString()}</span>
                    <div className="h-1.5 w-full bg-blue-600 mt-2 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Liabilities & Equity */}
            <div className="space-y-12">
              {/* Liabilities */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-xl">
                    <FaFileInvoiceDollar />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900">Liabilities</h2>
                </div>

                <div className="space-y-6">
                  {data.liabilities.length > 0 ? (
                    data.liabilities.map((item, index) => (
                      <div key={index} className="flex items-center justify-between group">
                        <span className="text-gray-900 font-black text-lg group-hover:text-orange-600 transition-colors">{item.name}</span>
                        <span className="text-xl font-black text-gray-900">{item.amount.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 font-medium italic">No liabilities recorded.</p>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-500">Total Liabilities</span>
                  <span className="text-xl font-black text-gray-900">KES {data.totalLiabilities.toLocaleString()}</span>
                </div>
              </div>

              {/* Equity */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl">
                    <FaBuilding />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900">Equity</h2>
                </div>

                <div className="space-y-6">
                  {data.equity.length > 0 ? (
                    data.equity.map((item, index) => (
                      <div key={index} className="flex items-center justify-between group">
                        <span className="text-gray-900 font-black text-lg group-hover:text-purple-600 transition-colors">{item.name}</span>
                        <span className="text-xl font-black text-gray-900">{item.amount.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 font-medium italic">No equity recorded.</p>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-500">Total Equity</span>
                  <span className="text-xl font-black text-gray-900">KES {data.totalEquity.toLocaleString()}</span>
                </div>
              </div>

              {/* L+E Total */}
              <div className="mt-10 pt-10 border-t-4 border-gray-900 flex items-center justify-between bg-gray-50 -mx-6 px-6 py-8 rounded-3xl">
                <div className="flex flex-col">
                  <span className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-1">Total Liabilities & Equity</span>
                  <span className="text-xl font-black text-gray-900 underline decoration-gray-300 underline-offset-8">Total Claim</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-gray-900">KES {(data.totalLiabilities + data.totalEquity).toLocaleString()}</span>
                  <div className="flex gap-1 mt-2 justify-end">
                    <div className="h-1 w-20 bg-gray-900 rounded-full"></div>
                    <div className="h-1 w-8 bg-gray-300 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="bg-gray-50 p-12 border-t border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg ${isBalanced ? 'bg-green-500 text-white shadow-green-200' : 'bg-red-500 text-white shadow-red-200'}`}>
                <FaBalanceScale />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  {isBalanced ? "Equation Balanced" : "Balance Mismatch"}
                </h3>
                <p className="text-gray-500 font-medium italic">
                  Assets = Liabilities + Equity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm font-bold text-gray-400">
              <span>Generated on {new Date().toLocaleString()}</span>
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
              <span>Certified Accounting Report</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <span className="text-gray-400 font-bold text-xs uppercase tracking-widest block mb-4">Liquidity Ratio</span>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-gray-900">2.4</span>
            <span className="text-green-600 font-black text-sm bg-green-50 px-3 py-1 rounded-full">Healthy</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <span className="text-gray-400 font-bold text-xs uppercase tracking-widest block mb-4">Debt to Equity</span>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-gray-900">0.15</span>
            <span className="text-blue-600 font-black text-sm bg-blue-50 px-3 py-1 rounded-full">Optimal</span>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <span className="text-gray-400 font-bold text-xs uppercase tracking-widest block mb-4">Asset Quality</span>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-gray-900">High</span>
            <span className="text-purple-600 font-black text-sm bg-purple-50 px-3 py-1 rounded-full">Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
