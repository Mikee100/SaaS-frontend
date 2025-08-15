"use client";
import React from 'react';
import { useUser } from './UserContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSidebar } from './SidebarContext';
import Tooltip from './Tooltip';
import { FaBox, FaShoppingCart, FaChartLine, FaCog, FaUsers, FaSignOutAlt, FaUser, FaCaretDown, FaBars, FaTimes, FaFileAlt, FaChevronLeft, FaChevronRight, FaMobile } from 'react-icons/fa';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { hasPermission } from '@/utils/permissions';
import dynamic from 'next/dynamic';

// Dynamically import LogoUsage with no SSR to avoid hydration issues
const LogoUsage = dynamic(() => import('@/components/LogoUsage'), { ssr: false });

export default function PlanBasedNav() {
  const userContext = useUser();
  const { limits, hasFeature, loading: limitsLoading } = usePlanLimits();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  // Debug logs
  console.log('userContext:', userContext);
  console.log('limits:', limits);

  // Always call hooks at top level!
  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: LogoUsage, requiredPlan: null, requiredPermission: null },
    { name: 'Products', href: '/products', icon: FaBox, requiredPlan: 'Basic', requiredPermission: 'view_products' },
    { name: 'Inventory', href: '/inventory', icon: FaBox, requiredPlan: 'Basic', requiredPermission: 'view_inventory' },
    { name: 'Sales', href: '/sales', icon: FaShoppingCart, requiredPlan: null, requiredPermission: 'view_sales' },
    { name: 'Sales History', href: '/sales/history', icon: FaShoppingCart, requiredPlan: null, requiredPermission: 'view_sales' },
    { name: 'M-Pesa Transactions', href: '/mpesa-transactions', icon: FaMobile, requiredPlan: null, requiredPermission: 'view_sales' },
    { name: 'Analytics', href: '/analytics', icon: FaChartLine, requiredPlan:null, requiredPermission: 'view_analytics' },
    { name: 'Reports', href: '/reports', icon: FaFileAlt, requiredPlan: null, requiredPermission: 'view_reports' },
    { name: 'Users', href: '/users', icon: FaUsers, requiredPlan: 'Basic', requiredPermission: 'view_users' },
    { name: 'Settings', href: '/settings', icon: FaCog, requiredPlan: null, requiredPermission: null },
  ];

  const planHierarchy: Record<string, number> = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
  const currentPlan = limits?.currentPlan || 'Basic';
  const currentLevel = planHierarchy[currentPlan] || 0;
  const accessibleItems = React.useMemo(() => {
    return navigationItems.filter((item) => {
      // Check plan requirements
      if (item.requiredPlan) {
        const requiredLevel = planHierarchy[item.requiredPlan] || 0;
        if (currentLevel < requiredLevel) return false;
      }
      // Check permission requirements
      if (item.requiredPermission && userContext?.user) {
        const hasPerm = hasPermission(userContext.user, item.requiredPermission);
        console.log('Checking permission for', item.name, '->', item.requiredPermission, ':', hasPerm);
        return hasPerm;
      }
      return true;
    });
  }, [limits, userContext.user, currentLevel]);
{console.log('Accessible navigation items:', accessibleItems)}
  // Hide sidebar on settings pages
  const isSettingsPage = pathname?.startsWith('/settings');
  if (isSettingsPage) {
    console.log('Sidebar hidden on settings page');
    return null;
  }

  // Use a regular variable for loading skeleton
  const isLoading = userContext?.loading || limitsLoading || !userContext?.user || !limits;
  if (isLoading) {
    console.log('Sidebar loading:', { userLoading: userContext?.loading, limitsLoading, user: userContext?.user, limits });
    return (
      <div className={`fixed top-0 left-0 h-full bg-white shadow-lg border-r z-50 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-8">
         
            {!sidebarCollapsed && <span className="text-xl font-bold text-gray-900">SaaS Platform</span>}
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

      {/* Desktop collapse/expand button */}
      <div className="hidden lg:block fixed top-4 left-4 z-50">
        <Tooltip content={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} position="bottom">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 bg-white rounded-lg shadow-lg border hover:bg-gray-50 transition-colors"
          >
            {sidebarCollapsed ? <FaChevronRight className="w-4 h-4" /> : <FaChevronLeft className="w-4 h-4" />}
          </button>
        </Tooltip>
      </div>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-white shadow-lg border-r z-30 transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex flex-col h-full relative">
          {/* Header */}
          <div className={`border-b border-gray-200 transition-all duration-300 ${
            sidebarCollapsed ? 'p-4' : 'p-6'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={sidebarCollapsed ? "w-6 h-6 flex items-center justify-center" : "w-32 h-8"}>
                <LogoUsage 
                  section="dashboard" 
                  className={sidebarCollapsed ? "w-6 h-6" : "w-32 h-8 object-contain"} 
                  showPlaceholder={false}
                />
              </div>
              {!sidebarCollapsed && !sidebarOpen && (
                <span className="text-xl font-bold text-gray-900 whitespace-nowrap">SaaS Platform</span>
              )}
            </div>
          </div>

          {/* Permissions Summary */}
          {!sidebarCollapsed && userContext?.user && (
            <div className="px-6 py-3 border-b border-gray-100 bg-blue-50">
              <div className="text-xs font-semibold text-blue-700 mb-1">Assigned Permissions</div>
              <div className="flex flex-wrap gap-2">
                {(userContext.user.permissions && userContext.user.permissions.length > 0) ? (
                  userContext.user.permissions.map((perm: any, idx: number) => (
                    <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[11px]">
                      {typeof perm === 'string' ? perm : perm.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">No permissions assigned</span>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-1">
              {accessibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const linkContent = (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center transition-all duration-200 rounded text-sm font-medium ${
                      sidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {Icon === LogoUsage ? (
                      <LogoUsage 
                        section="dashboard" 
                        className={sidebarCollapsed ? "w-6 h-6" : "w-32 h-8 object-contain"} 
                        showPlaceholder={false}
                      />
                    ) : (
                      <Icon className="w-5 h-5 flex-shrink-0" />
                    )}
                    {!sidebarCollapsed && (
                      <span className="whitespace-nowrap">{item.name}</span>
                    )}
                  </a>
                );

                return sidebarCollapsed ? (
                  <Tooltip key={item.name} content={item.name} position="right">
                    {linkContent}
                  </Tooltip>
                ) : (
                  linkContent
                );
              })}
            </div>
          </nav>

          {/* User Menu - Only show when expanded */}
          {!sidebarCollapsed && (
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
          )}

          {/* Fixed Logout Button at Bottom - Show in both states */}
          <div className="absolute bottom-0 left-0 w-full border-t border-gray-200 bg-white">
            {sidebarCollapsed ? (
              <Tooltip content="Log out" position="right">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-3 py-2 bg-red-500 text-white rounded-lg font-semibold shadow hover:bg-red-600 transition text-xs"
                >
                  <FaSignOutAlt className="w-4 h-4 flex-shrink-0" />
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg font-semibold shadow hover:bg-red-600 transition text-xs"
              >
                <FaSignOutAlt className="w-4 h-4 flex-shrink-0" />
                <span>Log out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
} 