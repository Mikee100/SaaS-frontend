"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FaChartLine, FaBox, FaClipboardList, FaUsers, FaCashRegister, FaHistory, FaCog, FaSignOutAlt, FaBell, FaCreditCard } from "react-icons/fa";
import { usePathname } from "next/navigation";

type User = {
  name: string;
  email: string;
  // Add other fields as needed
};

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navLinks = [
    { href: "/products/unified", label: "Products & Inventory", icon: <FaBox /> },
    { href: "/settings/users", label: "Users", icon: <FaUsers /> },
    { href: "/sales", label: "Sales/POS", icon: <FaCashRegister /> },
    { href: "/sales/history", label: "Sales History", icon: <FaHistory /> },
    { href: "/credit", label: "Credit Management", icon: <FaCreditCard /> },
    { href: "/reports", label: "Reports", icon: <FaClipboardList /> },
    { href: "/analytics", label: "Analytics", icon: <FaChartLine /> },
    { href: "/settings", label: "Settings", icon: <FaCog /> },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      {/* Sidebar */}
      <aside className={`fixed z-40 top-0 left-0 h-full w-64 bg-gradient-to-b from-indigo-600 to-blue-500 text-white flex flex-col shadow-lg transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'} md:translate-x-0 md:static md:shadow-none`}>
        <div className="flex items-center justify-between px-6 py-6 mb-4 border-b border-white/10">
          <span className="text-2xl font-extrabold tracking-tight">SaaS POS</span>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <span className="text-2xl">×</span>
          </button>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {navLinks.map(link => {
            const active = pathname === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium text-base transition
                  ${active ? 'bg-white/20 text-yellow-200 shadow border-l-4 border-yellow-300' : 'hover:bg-white/10 text-white/90'}
                `}
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
              </a>
            );
          })}
        </nav>
        <div className="mt-auto px-6 pb-6">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white/90">{user.name}</span>
                <span className="text-xs text-white/60">{user.email}</span>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 py-2 px-4 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </aside>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Main content */}
      <main className="flex-1 flex flex-col  min-h-screen">
        {/* Topbar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-2xl text-blue-700" onClick={() => setSidebarOpen(true)}>
              <svg width="1.5em" height="1.5em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <span className="text-lg font-semibold text-gray-700">Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}!</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-gray-500 hover:text-blue-600 transition">
              <FaBell className="text-xl" />
              {/* Notification dot */}
              <span className="absolute top-0 right-0 block w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" style={{ right: -2, top: -2 }}></span>
            </button>
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="text-sm text-gray-700 font-medium">{user.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-100 to-blue-50">
          {children}
        </div>
      </main>
    </div>
  );
}
