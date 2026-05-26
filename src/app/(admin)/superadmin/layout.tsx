"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/components/UserContext";
import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiUsers, FiServer, FiSettings, FiMonitor, FiLifeBuoy, FiBarChart2, FiFileText, FiChevronLeft, FiChevronRight, FiLogOut } from "react-icons/fi";

const SIDEBAR_COLLAPSED_KEY = "superadmin-sidebar-collapsed";

// Custom NavLink component with icon, active state, and collapsed mode
function NavLink({ href, icon, children, active, collapsed }: { href: string; icon: React.ReactNode; children: React.ReactNode; active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={href}
      title={collapsed ? children as string : undefined}
      className={`flex items-center rounded-lg transition-all duration-200 group ${
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
      } ${
        active 
          ? "bg-slate-700 text-white" 
          : "text-slate-300 hover:bg-slate-600 hover:text-white"
      }`}
    >
      <span className="text-base shrink-0">{icon}</span>
      {!collapsed && <span className="ml-3 text-sm font-medium truncate">{children}</span>}
    </Link>
  );
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  // Load sidebar state from localStorage (only on client)
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  };

  React.useEffect(() => {
    if (!loading && (!user || (!user.isSuperadmin && !user.roles?.includes("superadmin")))) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  const isActive = (href: string) =>
    pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.4);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.6);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
        }
      `}</style>

      {/* Mobile header */}
      <header className="md:hidden bg-slate-800 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Superadmin</h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Sidebar - narrower, collapsible, slate color */}
      <aside
        className={`${mobileMenuOpen ? "block" : "hidden"} md:block shrink-0 md:h-screen md:sticky md:top-0 bg-slate-800 text-white border-r border-slate-700/50 transition-all duration-300 ease-in-out ${
          collapsed ? "md:w-18" : "md:w-52"
        } w-full`}
      >
        <div className="h-full flex flex-col">
          {/* Header with collapse toggle */}
          <div className={`flex items-center shrink-0 border-b border-slate-700/50 ${collapsed ? "justify-center py-4 px-2" : "justify-between py-4 px-4"}`}>
            {!collapsed && <h2 className="text-lg font-bold truncate">Superadmin</h2>}
            <button
              onClick={toggleCollapsed}
              className="p-2 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <FiChevronRight className="w-5 h-5" /> : <FiChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto min-h-0 py-3 px-2 custom-scrollbar space-y-4">
            <div className="space-y-1">
              {!collapsed && <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Overview</h3>}
              <NavLink href="/superadmin" icon={<FiHome />} active={isActive("/superadmin")} collapsed={collapsed}>
                Dashboard
              </NavLink>
            </div>

            <div className="space-y-1">
              {!collapsed && <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Management</h3>}
              <NavLink href="/superadmin/tenants" icon={<FiServer />} active={isActive("/superadmin/tenants")} collapsed={collapsed}>
                Tenants
              </NavLink>
              <NavLink href="/superadmin/billing" icon={<FiBarChart2 />} active={isActive("/superadmin/billing")} collapsed={collapsed}>
                Billing
              </NavLink>
              <NavLink href="/superadmin/billing/operations" icon={<FiBarChart2 />} active={isActive("/superadmin/billing/operations")} collapsed={collapsed}>
                Billing Operations
              </NavLink>
              <NavLink href="/superadmin/users" icon={<FiUsers />} active={isActive("/superadmin/users")} collapsed={collapsed}>
                Users
              </NavLink>
              <NavLink href="/superadmin/create-user" icon={<FiUsers />} active={isActive("/superadmin/create-user")} collapsed={collapsed}>
                Create Users
              </NavLink>
              <NavLink href="/superadmin/trial-management" icon={<FiLifeBuoy />} active={isActive("/superadmin/trial-management")} collapsed={collapsed}>
                Trial Management
              </NavLink>
              <NavLink href="/superadmin/plan-management" icon={<FiSettings />} active={isActive("/superadmin/plan-management")} collapsed={collapsed}>
                Plan Management
              </NavLink>
              <NavLink href="/superadmin/classifications" icon={<FiFileText />} active={isActive("/superadmin/classifications")} collapsed={collapsed}>
                Classifications
              </NavLink>
              <NavLink href="/superadmin/subscriptions" icon={<FiBarChart2 />} active={isActive("/superadmin/subscriptions")} collapsed={collapsed}>
                Subscriptions
              </NavLink>
              <NavLink href="/superadmin/subscriptions/scheduled-changes" icon={<FiBarChart2 />} active={isActive("/superadmin/subscriptions/scheduled-changes")} collapsed={collapsed}>
                Scheduled Plan Changes
              </NavLink>
            </div>

            <div className="space-y-1">
              {!collapsed && <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Support</h3>}
              <NavLink href="/superadmin/support" icon={<FiLifeBuoy />} active={isActive("/superadmin/support")} collapsed={collapsed}>
                Support Tickets
              </NavLink>
              <NavLink href="/superadmin/bulk" icon={<FiFileText />} active={isActive("/superadmin/bulk")} collapsed={collapsed}>
                Bulk Operations
              </NavLink>
            </div>

            <div className="space-y-1">
              {!collapsed && <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Monitoring</h3>}
              <NavLink href="/superadmin/health" icon={<FiMonitor />} active={isActive("/superadmin/health")} collapsed={collapsed}>
                System Health
              </NavLink>
              <NavLink href="/superadmin/monitoring" icon={<FiMonitor />} active={isActive("/superadmin/monitoring")} collapsed={collapsed}>
                Monitoring
              </NavLink>
              <NavLink href="/superadmin/logs" icon={<FiFileText />} active={isActive("/superadmin/logs")} collapsed={collapsed}>
                Audit Logs
              </NavLink>
            </div>

            <div className="space-y-1">
              {!collapsed && <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Settings</h3>}
              <NavLink href="/superadmin/settings" icon={<FiSettings />} active={isActive("/superadmin/settings")} collapsed={collapsed}>
                Platform Settings
              </NavLink>
              <NavLink href="/superadmin/configurations" icon={<FiSettings />} active={isActive("/superadmin/configurations")} collapsed={collapsed}>
                Configurations
              </NavLink>
            </div>
          </nav>

          {/* User profile and logout at bottom */}
          <div className="mt-auto pt-3 pb-4 px-2 border-t border-slate-700/50 shrink-0 space-y-2">
            <div className={`flex items-center ${collapsed ? "justify-center" : ""}`}>
              <div className="h-9 w-9 rounded-full bg-slate-600 flex items-center justify-center text-white font-medium shrink-0">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              {!collapsed && (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user.name || "Superadmin"}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => logout?.()}
              title="Logout"
              className={`flex items-center rounded-lg transition-all duration-200 text-slate-300 hover:bg-slate-600 hover:text-white w-full ${
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
              }`}
            >
              <FiLogOut className="text-base shrink-0" />
              {!collapsed && <span className="ml-3 text-sm font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  );
}