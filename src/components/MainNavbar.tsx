"use client";
import Link from 'next/link';
import { hasPermission } from '@/utils/permissions';
import { useUser } from './UserContext';
import { MainLogo } from './LogoUsage';
import { LogoComplianceBadge } from './LogoEnforcement';
import { isModuleEnabled } from '@/utils/moduleAccess';

export default function MainNavbar() {
  const { user } = useUser();
  const isAdmin = user?.roles?.includes('owner') || user?.roles?.includes('manager');
  
  const showSales = isModuleEnabled(user?.enabledModules, 'sales');
  const showInventory = isModuleEnabled(user?.enabledModules, 'inventory');
  const showAnalytics = isModuleEnabled(user?.enabledModules, 'analytics');
  const showSettings = isModuleEnabled(user?.enabledModules, 'settings');

  return (
    <nav className="w-full px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
          <MainLogo size="sm" />
          <span className="font-bold text-gray-900 text-lg">SaaS Platform</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-6">
        {showSales && <Link href="/sales" className="text-gray-700 hover:text-blue-600 transition">Sales</Link>}
        {showInventory && <Link href="/products/unified" className="text-gray-700 hover:text-blue-600 transition">Products & Inventory</Link>}
        {showAnalytics && <Link href="/analytics" className="text-gray-700 hover:text-blue-600 transition">Analytics</Link>}
        {showSettings && hasPermission(user, 'manage_settings') && (
          <Link href="/settings" className="text-gray-700 hover:text-blue-600 transition">Settings</Link>
        )}
        {showSettings && isAdmin && (
          <Link href="/settings/users" className="text-gray-700 hover:text-blue-600 transition">Users</Link>
        )}
        {user?.isSuperadmin && (
          <Link href="/superadmin" className="text-gray-700 hover:text-blue-600 transition">Superadmin</Link>
        )}
        <LogoComplianceBadge />
      </div>
    </nav>
  );
} 