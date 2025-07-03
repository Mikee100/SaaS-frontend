"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("user") || "null"));
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  if (loading) return null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-blue-700 to-purple-700 text-white flex flex-col p-6 space-y-4">
        <div className="text-2xl font-bold mb-8">SaaS POS</div>
        <nav className="flex-1 space-y-2">
          <a href="/" className="block py-2 px-3 rounded hover:bg-blue-800">Dashboard</a>
          <a href="/products" className="block py-2 px-3 rounded hover:bg-blue-800">Products</a>
          <a href="/inventory" className="block py-2 px-3 rounded hover:bg-blue-800">Inventory</a>
          <a href="/users" className="block py-2 px-3 rounded hover:bg-blue-800">Users</a>
          <a href="/sales" className="block py-2 px-3 rounded hover:bg-blue-800">Sales/POS</a>
          <a href="/reports" className="block py-2 px-3 rounded hover:bg-blue-800">Reports</a>
          <a href="/settings" className="block py-2 px-3 rounded hover:bg-blue-800">Settings</a>
        </nav>
        <div className="mt-auto">
          {user && (
            <div className="text-sm mb-2">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-blue-100">{user.role} @ {user.tenantId}</div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded transition font-semibold"
          >
            Logout
          </button>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          {user && (
            <div className="text-gray-600 text-sm">
              {user.name} ({user.role})
            </div>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
