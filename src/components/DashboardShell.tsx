"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from '@/utils/api';
import dynamic from "next/dynamic";
import { FaChartLine, FaDollarSign } from "react-icons/fa";

const AnalyticsSidebarSummary = dynamic(() => import("./AnalyticsSidebarSummary"), { ssr: false });

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    apiGet('/sales/analytics').then(setAnalytics).catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  if (loading) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-indigo-500 to-blue-500 text-white flex flex-col p-6">
        <div className="text-2xl font-bold mb-8">SaaS POS</div>
        <nav className="flex-1">
          
          <a href="/products" className="block py-2 px-3 rounded hover:bg-blue-800">Products</a>
          <a href="/inventory" className="block py-2 px-3 rounded hover:bg-blue-800">Inventory</a>
          <a href="/users" className="block py-2 px-3 rounded hover:bg-blue-800">Users</a>
          <a href="/sales" className="block py-2 px-3 rounded hover:bg-blue-800">Sales/POS</a>
          <a href="/sales/history" className="block py-2 px-3 rounded hover:bg-blue-800">Sales History</a>
          <a href="/reports" className="block py-2 px-3 rounded hover:bg-blue-800">Reports</a>
          <a href="/analytics" className="block py-2 px-3 rounded hover:bg-blue-800 flex items-center gap-2">
            <FaChartLine className="inline text-green-300" />
            Analytics
          </a>
          <a href="/settings" className="block py-2 px-3 rounded hover:bg-blue-800">Settings</a>
        </nav>
        {/* Removed AnalyticsSidebarSummary */}
        <div className="mt-auto">
          {user && (
            <div className="flex items-center gap-2 text-xs text-white/80 mb-2">
              <span>{user.name}</span>
              <span className="opacity-60">@ {user.id}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
          >
            Logout
          </button>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between p-4 bg-white shadow-sm">
          <div className="text-lg font-semibold">Welcome!</div>
          {user && (
            <div className="text-gray-600 text-sm">
              {user.name} ({user.role})
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </div>
      </main>
    </div>
  );
}
