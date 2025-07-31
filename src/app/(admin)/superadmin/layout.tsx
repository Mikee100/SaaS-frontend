"use client";

import React from "react";
import Link from "next/link";
import { useUser } from "@/components/UserContext";
import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiUsers, FiServer, FiSettings, FiMonitor, FiLifeBuoy, FiDatabase, FiBarChart2, FiCpu, FiFileText } from "react-icons/fi";

// Custom NavLink component with icon and active state
function NavLink({ href, icon, children, active }: { href: string; icon: React.ReactNode; children: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 ${
        active 
          ? 'bg-indigo-800 text-white shadow-lg shadow-indigo-900/50' 
          : 'text-indigo-100 hover:bg-indigo-600 hover:text-white hover:shadow-md'
      }`}
    >
      <span className="mr-3 text-base transition-transform duration-200 group-hover:scale-110">{icon}</span>
      {children}
    </Link>
  );
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  // Check if a link is active
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(79, 70, 229, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(79, 70, 229, 0.6);
          border-radius: 3px;
          transition: background 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(79, 70, 229, 0.8);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(79, 70, 229, 0.6) rgba(79, 70, 229, 0.1);
        }
      `}</style>
      
      {/* Mobile header */}
      <header className="md:hidden bg-indigo-700 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Superadmin</h1>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-white"
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

      {/* Sidebar - shown on desktop, conditionally on mobile */}
      <aside className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-indigo-700 text-white flex-shrink-0 md:h-screen md:sticky md:top-0`}>
        <div className="p-4 h-full flex flex-col max-h-screen">
          <h2 className="text-xl font-bold hidden md:block mb-4 flex-shrink-0">Superadmin</h2>
          
          <nav className="flex-1 space-y-3 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3 px-2 sticky top-0 bg-indigo-700 py-1 rounded">Overview</h3>
              <NavLink href="/superadmin" icon={<FiHome />} active={isActive('/superadmin')}>
                Dashboard
              </NavLink>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3 px-2 sticky top-0 bg-indigo-700 py-1 rounded">Management</h3>
              <NavLink href="/superadmin/tenants" icon={<FiServer />} active={isActive('/superadmin/tenants')}>
                Tenants
              </NavLink>
              <NavLink href="/superadmin/tenants/analytics" icon={<FiBarChart2 />} active={isActive('/superadmin/tenants/analytics')}>
                Tenant Analytics
              </NavLink>
              <NavLink href="/superadmin/tenants/migration" icon={<FiDatabase />} active={isActive('/superadmin/tenants/migration')}>
                Migration & Backup
              </NavLink>
              <NavLink href="/superadmin/tenants/resources" icon={<FiCpu />} active={isActive('/superadmin/tenants/resources')}>
                Resource Management
              </NavLink>
              <NavLink href="/superadmin/users" icon={<FiUsers />} active={isActive('/superadmin/users')}>
                Users
              </NavLink>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3 px-2 sticky top-0 bg-indigo-700 py-1 rounded">Support & Operations</h3>
              <NavLink href="/superadmin/support" icon={<FiLifeBuoy />} active={isActive('/superadmin/support')}>
                Support Tickets
              </NavLink>
              <NavLink href="/superadmin/bulk" icon={<FiFileText />} active={isActive('/superadmin/bulk')}>
                Bulk Operations
              </NavLink>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3 px-2 sticky top-0 bg-indigo-700 py-1 rounded">Monitoring</h3>
              <NavLink href="/superadmin/health" icon={<FiMonitor />} active={isActive('/superadmin/health')}>
                System Health
              </NavLink>
              <NavLink href="/superadmin/logs" icon={<FiFileText />} active={isActive('/superadmin/logs')}>
                Audit Logs
              </NavLink>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-3 px-2 sticky top-0 bg-indigo-700 py-1 rounded">Settings</h3>
              <NavLink href="/superadmin/settings" icon={<FiSettings />} active={isActive('/superadmin/settings')}>
                Platform Settings
              </NavLink>
              <NavLink href="/superadmin/configurations" icon={<FiSettings />} active={isActive('/superadmin/configurations')}>
                System Configurations
              </NavLink>
            </div>
          </nav>

          {/* User profile at the bottom */}
          <div className="mt-auto pt-4 border-t border-indigo-600 hidden md:block flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium">{user.name || 'Superadmin'}</p>
                <p className="text-xs text-indigo-200">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  );
}