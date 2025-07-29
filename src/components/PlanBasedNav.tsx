"use client";
import { useUser } from './UserContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { FaHome, FaBox, FaShoppingCart, FaChartLine, FaCog, FaCrown, FaUsers, FaSignOutAlt, FaUser, FaCaretDown, FaBars, FaTimes } from 'react-icons/fa';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PlanBasedNav() {
  const userContext = useUser();
  const { limits, hasFeature } = usePlanLimits();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  console.log('🔍 PlanBasedNav: Current state:', {
    user: !!userContext?.user,
    loading: userContext?.loading,
    pathname,
    isSettingsPage: pathname?.startsWith('/settings')
  });

  // Hide sidebar on settings pages
  const isSettingsPage = pathname?.startsWith('/settings');
  if (isSettingsPage) {
    console.log('🔍 PlanBasedNav: On settings page, hiding sidebar');
    return null;
  }

  // Show loading sidebar if user is loading
  if (userContext?.loading) {
    console.log('🔍 PlanBasedNav: User is loading, showing loading sidebar');
    return (
      <div className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg border-r z-50">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-8">
            <FaCrown className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">SaaS Platform</span>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render navigation if no user (for public pages)
  if (!userContext?.user) {
    console.log('🔍 PlanBasedNav: No user, not rendering sidebar');
    return null;
  }

  console.log('🔍 PlanBasedNav: Rendering full sidebar with user:', userContext.user);

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: FaHome, requiredPlan: null },
    { name: 'Products', href: '/products', icon: FaBox, requiredPlan: 'Basic' },
    { name: 'Inventory', href: '/inventory', icon: FaBox, requiredPlan: 'Basic' },
    { name: 'Sales', href: '/sales', icon: FaShoppingCart, requiredPlan: null },
    { name: 'Sales History', href: '/sales/history', icon: FaShoppingCart, requiredPlan: null },
    { name: 'Analytics', href: '/analytics', icon: FaChartLine, requiredPlan: 'Pro' },
    { name: 'Reports', href: '/reports', icon: FaChartLine, requiredPlan: 'Enterprise' },
    { name: 'Settings', href: '/settings', icon: FaCog, requiredPlan: null },
  ];

  const canAccess = (item: any) => {
    if (!item.requiredPlan) return true;
    if (!limits) return true; // Default to allowing if limits not loaded
    
    const planHierarchy: Record<string, number> = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
    const currentPlan = limits.currentPlan || 'Basic';
    const currentLevel = planHierarchy[currentPlan] || 0;
    const requiredLevel = planHierarchy[item.requiredPlan] || 0;
    
    return currentLevel >= requiredLevel;
  };

  const accessibleItems = navigationItems.filter(canAccess);

  const handleLogout = () => {
    if (userContext.logout) {
      userContext.logout();
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border"
        >
          {sidebarOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg border-r z-40 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full relative">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <FaCrown className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">SaaS Platform</span>
            </div>
          </div>

          {/* Navigation (scrollable, smaller text, grouped for mobile) */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-1">
              {accessibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </nav>

          {/* Usage Stats */}
          {limits && (
            <div className="p-3 border-t border-gray-200 text-xs">
              <div className="font-medium text-gray-500 uppercase tracking-wide mb-2">Usage Limits</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Users</span>
                  <span className="font-medium">{limits.usage?.users?.current || 0}/{limits.usage?.users?.limit || 1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Products</span>
                  <span className="font-medium">{limits.usage?.products?.current || 0}/{limits.usage?.products?.limit || 10}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Sales</span>
                  <span className="font-medium">{limits.usage?.sales?.current || 0}/{limits.usage?.sales?.limit || 100}</span>
                </div>
              </div>
              <div className="px-2 py-1 bg-blue-50 text-blue-800 rounded-lg text-center mt-2">
                {limits.currentPlan || 'Basic'} Plan
              </div>
            </div>
          )}

          {/* User Menu (optional, can be grouped in a select for mobile) */}
          <div className="p-3 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 w-full p-2 rounded hover:bg-gray-50 transition-colors text-xs"
              >
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {userContext.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-medium text-gray-900">
                    {userContext.user?.name || 'User'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {userContext.user?.email || 'user@example.com'}
                  </p>
                </div>
                <FaCaretDown className="w-3 h-3 text-gray-400" />
              </button>
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <a
                    href="/settings"
                    className="flex items-center px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    <FaUser className="w-4 h-4 mr-2" />
                    Profile Settings
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    <FaSignOutAlt className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Logout Button at Bottom */}
          <div className="absolute bottom-0 left-0 w-full p-3 border-t border-gray-200 bg-white">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg font-semibold shadow hover:bg-red-600 transition text-xs"
            >
              <FaSignOutAlt className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
} 