"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useTenant } from '@/hooks/useTenant';
import { useBillingAccessStatus } from '@/hooks/useBillingAccessStatus';
import { useSidebar } from './SidebarContext';
import Tooltip from './Tooltip';
import {
  FaBoxOpen, FaShoppingBasket, FaChartBar, FaCreditCard, /* FaCog, */ FaSignOutAlt, FaBars, FaTimes,
  FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp, /* FaMapMarkerAlt, */ FaRobot, FaTachometerAlt,
  FaLayerGroup, FaUpload, FaHistory, FaUsers, FaMoneyBillWave, FaFileInvoiceDollar, /* FaBuilding, */ FaBullseye,
  FaSun, FaMoon
} from 'react-icons/fa';
import { MdOutlineInventory2, MdOutlineAnalytics, MdOutlineReport, MdOutlineSettings } from 'react-icons/md';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasPermission } from '@/utils/permissions';
import { getFullAssetUrl } from '@/utils/logoUrl';
import { useTheme } from '@/contexts/ThemeContext';


export default function PlanBasedNav() {
  const userContext = useUser();
  const { data: limits, loading: limitsLoading } = usePlanLimits();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const { data: accessStatus, isLoading: accessStatusLoading } = useBillingAccessStatus();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const { theme, setTheme, isDark } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const tenantBranchLoading = tenantLoading;
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  // Detect mobile/tablet viewport
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    // Check immediately on mount
    if (typeof window !== 'undefined') {
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Handle sidebar animation state
  useEffect(() => {
    if (sidebarOpen) {
      setIsAnimating(true);
      // Small delay to ensure smooth start
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [sidebarOpen]);

  // Close dropdowns when navigating to a different page, but open relevant ones for reports
  React.useEffect(() => {
    const newOpen = new Set<string>();
    if (pathname?.startsWith('/products/reports')) {
      newOpen.add('Products & Inventory');
      newOpen.add('Reports');
    }
    setOpenDropdowns(newOpen);
  }, [pathname]);

  // Get tenant name and logo from cached data (API returns logoUrl; some code may use logo)
  const tenant = tenantData ? {
    name: tenantData.name || '',
    logoUrl: (tenantData.logoUrl ?? tenantData.logo) as string | undefined,
  } : null;

  // Improved icon mapping for main and sub items
  const navigationItems = React.useMemo(() => [
    { name: 'Dashboard', href: '/', icon: FaTachometerAlt, requiredPlan: null, requiredPermission: null },
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: FaRobot,
      requiredPlan: null,
      requiredPermission: null
    },
    {
      name: 'Accounts',
      href: '/accounts',
      icon: FaFileInvoiceDollar,
      requiredPlan: null,
      requiredPermission: null,
      subItems: [
        { name: 'Ledgers', href: '/accounts/ledgers', icon: FaHistory },
        { name: 'Balance Sheet', href: '/accounts/balance-sheet', icon: MdOutlineAnalytics },
        { name: 'Trial Balance', href: '/accounts/trial-balance', icon: FaLayerGroup },
        { name: 'Capital', href: '/accounts/capital', icon: FaMoneyBillWave },
        { name: 'Revenue', href: '/accounts/revenue', icon: FaCreditCard },
        { name: 'Profit & Loss', href: '/accounts/profit-loss', icon: FaChartBar },
        { name: 'Inventory', href: '/accounts/inventory', icon: MdOutlineInventory2 }
      ]
    },
    {
      name: 'Products & Inventory',
      href: '/products/unified',
      icon: FaBoxOpen,
      requiredPlan: null,
      requiredPermission: 'view_products',
      subItems: [
        { name: 'Unified Management', href: '/products/unified', requiredPermission: 'view_products', icon: FaLayerGroup },
        { name: 'Suppliers', href: '/inventory/suppliers', requiredPermission: 'view_inventory', icon: FaUsers },
        {
          name: 'Reports',
          href: '/products/reports',
          requiredPermission: 'view_inventory',
          icon: MdOutlineReport,
          subItems: [
            { name: 'Product Sales', href: '/products/reports/product-sales', requiredPermission: 'view_sales', icon: FaFileInvoiceDollar },
            { name: 'Inventory Levels', href: '/products/reports/inventory-levels', requiredPermission: 'view_inventory', icon: MdOutlineInventory2 },
            { name: 'Low Stock Alerts', href: '/products/reports/low-stock-alerts', requiredPermission: 'view_inventory', icon: FaBullseye }
          ]
        }
      ]
    },
    {
      name: 'Transactions',
      href: '/sales/history',
      icon: FaShoppingBasket,
      requiredPlan: null,
      requiredPermission: 'view_sales',
      subItems: [
        // { name: 'Sales', href: '/sales', requiredPermission: 'view_sales', icon: FaShoppingBasket }, // Sales page commented out
        { name: 'Sales History', href: '/sales/history', requiredPermission: 'view_sales', icon: FaHistory },
        { name: 'M-Pesa Transactions', href: '/mpesa-transactions', requiredPermission: 'view_sales', icon: FaMoneyBillWave },
        { name: 'Sales Target', href: '/sales/targets', requiredPermission: 'view_sales', icon: FaBullseye },
      ]
    },
    {
      name: 'Reports & Analytics',
      href: '/analytics',
      icon: MdOutlineAnalytics,
      requiredPlan: null,
      requiredPermission: 'view_analytics',
      subItems: [
        { name: 'Analytics', href: '/analytics', requiredPermission: 'view_analytics', icon: MdOutlineAnalytics },
        { name: 'Reports', href: '/reports', requiredPermission: 'view_reports', icon: MdOutlineReport }
      ]
    },
    { name: 'Credit', href: '/credit', icon: FaCreditCard, requiredPlan: null, requiredPermission: 'view_users' },
    { name: 'HR Employees', href: '/hr/employees', icon: FaUsers, requiredPlan: null, requiredPermission: 'view_sales' },
    { name: 'Payroll', href: '/payroll', icon: FaMoneyBillWave, requiredPlan: null, requiredPermission: 'view_sales' },
    { name: 'Expenses', href: '/expenses', icon: FaHistory, requiredPlan: null, requiredPermission: 'view_users' },
    { name: 'Settings', href: '/settings', icon: MdOutlineSettings, requiredPlan: null, requiredPermission: null },
    { name: 'Billing & Subscription', href: '/account/billing', icon: FaFileInvoiceDollar, requiredPlan: null, requiredPermission: null },
  ], []);

  type PlanName = 'Basic' | 'Pro' | 'Enterprise';

  const planHierarchy: Record<PlanName, number> = React.useMemo(() => ({
    'Basic': 1,
    'Pro': 2,
    'Enterprise': 3
  }), []);

  const currentPlan: PlanName = (limits?.currentPlan as PlanName) || 'Basic';
  const currentLevel = planHierarchy[currentPlan] || 0;

  // Check if tenant has an active subscription
  const hasActiveSubscription = React.useMemo(() => {
    // If we don't have limits yet (e.g. just logged in), don't block the nav –
    // assume active until we explicitly know otherwise.
    if (!limitsLoading && !limits) {
      return true;
    }

    if (!limits) {
      return true;
    }

    return limits.currentPlan !== null;
  }, [limits, limitsLoading]);


  const accessibleItems = React.useMemo(() => {
    if (accessStatus.restricted) {
      return navigationItems.filter(
        (item) => item.name === 'Dashboard' || item.name === 'Billing & Subscription',
      );
    }

    // If no active subscription, only show Dashboard
    if (!hasActiveSubscription) {
      return navigationItems.filter(item => item.name === 'Dashboard');
    }

    return navigationItems.filter((item) => {
      // Check plan requirements
      if (item.requiredPlan) {
        const requiredLevel = planHierarchy[item.requiredPlan as PlanName] || 0;
        if (currentLevel < requiredLevel) return false;
      }
      // Check permission requirements for main item
      if (item.requiredPermission && userContext?.user) {
        const hasPerm = hasPermission(userContext.user, item.requiredPermission);
        return hasPerm;
      }
      // For items with subItems, check if any subItem is accessible
      if (item.subItems && userContext?.user) {
        const accessibleSubItems = item.subItems.filter(subItem => {
          if (subItem.requiredPermission) {
            return hasPermission(userContext.user, subItem.requiredPermission);
          }
          return true;
        });
        return accessibleSubItems.length > 0;
      }
      return true;
    }).map(item => ({
      ...item,
      subItems: item.subItems ? item.subItems.filter(subItem => {
        if (subItem.requiredPermission && userContext?.user) {
          return hasPermission(userContext.user, subItem.requiredPermission);
        }
        return true;
      }) : undefined
    }));
  }, [
    userContext.user,
    currentLevel,
    navigationItems,
    planHierarchy,
    hasActiveSubscription,
    accessStatus.restricted,
  ]);

  // Hide sidebar on settings pages
  const isSettingsPage = pathname?.startsWith('/settings');
  if (isSettingsPage) {
    return null;
  }

  // Only block rendering while the *user* is unresolved.
  // Plan/tenant data can load in the background so the nav appears immediately after login.
  const isUserLoading =
    userContext?.loading || !userContext?.user || accessStatusLoading;
  if (isUserLoading) {
    return (
      <div className={`fixed top-0 left-0 h-full bg-white shadow-lg border-r z-50 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-8">

            {!sidebarCollapsed && <span className="text-xl font-bold text-gray-900">Loading...</span>}
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

  // Helper for toggling submenus (by key)
  const handleToggleSubmenu = (key: string) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Navigation
  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-white rounded-lg shadow-lg border transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            transform: sidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), scale 0.2s ease-out'
          }}
        >
          {sidebarOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      {/* On mobile, always show full width when open; on desktop, respect collapsed state */}
      <div 
        className={`fixed top-0 left-0 h-full bg-white shadow-xl border-r z-40 ${
          isMobile 
            ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full')
            : 'lg:translate-x-0'
        } ${(isMobile && sidebarOpen) ? 'w-64' : (sidebarCollapsed ? 'w-16' : 'w-64')}`}
        style={{
          ...(isMobile ? {
            // Mobile: slide in/out animation
            transition: sidebarOpen 
              ? 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), width 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
              : 'transform 0.4s cubic-bezier(0.4, 0, 1, 1), width 0.4s cubic-bezier(0.4, 0, 1, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 1, 1)',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            willChange: isAnimating ? 'transform, width' : 'auto',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          } : {
            // Desktop: only width transition for collapse/expand (no transform needed)
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateX(0)',
            willChange: 'width',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          })
        }}
      >
        {/* Desktop collapse/expand button */}
        <div className="hidden lg:block absolute -right-3 top-4 z-50">
          <Tooltip content={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} position="right">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <FaChevronRight className="w-3.5 h-3.5" /> : <FaChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col h-full relative z-10" style={{ position: 'relative' }}>
          {/* Header - Minimal spacing */}
          {!sidebarCollapsed && !sidebarOpen && tenant?.logoUrl && (
            <div className="border-b border-gray-200 px-4 py-2">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img
                    src={getFullAssetUrl(tenant.logoUrl)}
                    alt={`${tenant.name} logo`}
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav 
            className="flex-1 p-2 overflow-y-auto custom-scrollbar" 
            style={{ 
              paddingBottom: sidebarCollapsed ? '60px' : '120px'
            }}
          >
            <div className="space-y-1">
              {accessibleItems.map((item) => {
                const Icon = item.icon;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isDropdownOpen = openDropdowns.has(item.name);
                const isActive =
                  pathname === item.href ||
                  (hasSubItems && item.subItems?.some((subItem) => pathname === subItem.href));
                
                // Show subitems as collapsible accordions when:
                // - On mobile: when sidebar is open (always show accordion, ignore collapsed state)
                // - On desktop: when sidebar is not collapsed
                const shouldShowSubmenu = hasSubItems && (
                  (isMobile && sidebarOpen) || // Mobile: show when sidebar is open
                  (!isMobile && !sidebarCollapsed) // Desktop: show when not collapsed
                );
                const shouldUseDesktopDropdown = hasSubItems && !shouldShowSubmenu;
                
                if (shouldShowSubmenu) {
                  const submenuKey = item.href || item.name;
                  const open = !!openSubmenus[submenuKey];
                  return (
                    <div key={item.name} className="mb-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSubmenu(submenuKey)}
                        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate text-xs">{item.name}</span>
                        </span>
                        <span className="flex-shrink-0">
                          {open ? (
                            <FaChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <FaChevronDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </button>
                      {open && (
                        <div className="ml-4 mt-1">
                          {item.subItems?.map((subItem) => {
                            const SubIcon = subItem.icon || FaChevronRight;
                            const isSubActive = pathname === subItem.href;
                            const hasNested = subItem.subItems && subItem.subItems.length > 0;
                            const submenuKey = subItem.href || subItem.name;
                            const openNested = !!openSubmenus[submenuKey];
                            return (
                              <div key={subItem.name}>
                                {hasNested ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubmenu(submenuKey)}
                                    className={`flex items-center w-full space-x-2 px-2 py-1 rounded text-xs transition-all duration-200 ${
                                      isSubActive || openNested
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                                    <span>{subItem.name}</span>
                                    <span className="ml-auto">
                                      {openNested ? (
                                        <FaChevronUp className="w-3.5 h-3.5" />
                                      ) : (
                                        <FaChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </span>
                                  </button>
                                ) : (
                                  <Link
                                    href={subItem.href}
                                    onClick={() => {
                                      // Close sidebar on mobile after navigation
                                      if (isMobile) {
                                        setSidebarOpen(false);
                                      }
                                    }}
                                    className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all duration-200 ${
                                      isSubActive
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                                    <span>{subItem.name}</span>
                                  </Link>
                                )}
                                {/* Nested subitems */}
                                {hasNested && openSubmenus[submenuKey] && (
                                  <div className="ml-4">
                                    {subItem.subItems.map((nested) => {
                                      const NestedIcon = nested.icon || FaChevronRight;
                                      const isNestedActive = pathname === nested.href;
                                      return (
                                        <Link
                                          key={nested.name}
                                          href={nested.href}
                                          onClick={() => {
                                            // Close sidebar on mobile after navigation
                                            if (isMobile) {
                                              setSidebarOpen(false);
                                            }
                                          }}
                                          className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all duration-200 ${
                                            isNestedActive
                                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                          }`}
                                        >
                                          <NestedIcon className="w-4 h-4 flex-shrink-0" />
                                          <span>{nested.name}</span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                // Desktop: dropdown or tooltip (fallback for collapsed sidebar)
                // Only use desktop dropdown when NOT using mobile accordion
                if (shouldUseDesktopDropdown) {
                  const dropdownContent = (
                    <div key={item.name}>
                      <button
                        type="button"
                        onClick={() => {
                          const newOpenDropdowns = new Set(openDropdowns);
                          if (isDropdownOpen) {
                            newOpenDropdowns.delete(item.name);
                          } else {
                            newOpenDropdowns.add(item.name);
                          }
                          setOpenDropdowns(newOpenDropdowns);
                        }}
                        className={`flex items-center justify-between transition-all duration-200 rounded text-xs font-medium w-full ${
                          sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-2 px-2.5 py-2'
                        } ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          {!sidebarCollapsed && (
                            <span className="truncate text-xs">{item.name}</span>
                          )}
                        </div>
                        {!sidebarCollapsed && (
                          <div className="flex-shrink-0">
                            {isDropdownOpen ? (
                              <FaChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <FaChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        )}
                      </button>
                      {!sidebarCollapsed && isDropdownOpen && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.subItems?.map((subItem) => {
                            const isSubActive = pathname === subItem.href;
                            const SubIcon = subItem.icon || FaChevronRight;
                            const hasNested = subItem.subItems && subItem.subItems.length > 0;
                            const submenuKey = subItem.href || subItem.name;
                            const open = !!openSubmenus[submenuKey];
                            return (
                              <div key={subItem.name}>
                                {hasNested ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubmenu(submenuKey)}
                                    className={`flex items-center w-full space-x-2 px-2 py-1 rounded text-xs transition-all duration-200 ${
                                      isSubActive || open
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                                    <span>{subItem.name}</span>
                                    <span className="ml-auto">
                                      {open ? (
                                        <FaChevronUp className="w-3.5 h-3.5" />
                                      ) : (
                                        <FaChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </span>
                                  </button>
                                ) : (
                                  <a
                                    href={subItem.href}
                                    className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all duration-200 ${
                                      isSubActive
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4 flex-shrink-0" />
                                    <span>{subItem.name}</span>
                                  </a>
                                )}
                                {/* Nested subitems */}
                                {hasNested && open && (
                                  <div className="ml-4">
                                    {subItem.subItems.map((nested) => {
                                      const NestedIcon = nested.icon || FaChevronRight;
                                      const isNestedActive = pathname === nested.href;
                                      return (
                                        <a
                                          key={nested.name}
                                          href={nested.href}
                                          className={`flex items-center space-x-2 px-2 py-1 rounded text-xs transition-all duration-200 ${
                                            isNestedActive
                                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                          }`}
                                        >
                                          <NestedIcon className="w-4 h-4 flex-shrink-0" />
                                          <span>{nested.name}</span>
                                        </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                  return sidebarCollapsed ? (
                    <Tooltip key={item.name} content={item.name} position="right">
                      <a
                        href={item.href}
                        className={`flex items-center transition-all duration-200 rounded text-sm font-medium ${
                          'justify-center px-2 py-3'
                        } ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </Tooltip>
                  ) : (
                    dropdownContent
                  );
                } else {
                  // Regular link
                  const linkContent = (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`flex items-center transition-all duration-200 rounded text-xs font-medium ${
                        sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-2 px-2.5 py-2'
                      } ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="truncate text-xs">{item.name}</span>
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
                }
              })}
            </div>
          </nav>

          {/* Fixed Logout Section at Bottom */}
          <div className="absolute bottom-0 left-0 w-full border-t border-gray-200 bg-white">
            {sidebarCollapsed ? (
              <>
                <Tooltip content={isDark ? 'Light mode' : 'Dark mode'} position="right">
                  <button
                    type="button"
                    onClick={() => setTheme({ colorScheme: isDark ? 'light' : 'dark' })}
                    className="w-full flex items-center justify-center py-2.5 text-gray-600 hover:text-blue-600 hover:bg-gray-50 border-b border-gray-200 transition-colors"
                    aria-label="Toggle theme"
                  >
                    {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                  </button>
                </Tooltip>
                <Tooltip content="Log out" position="right">
                  <div className="w-full block">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium shadow-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 active:scale-95"
                      title="Log out"
                    >
                      <FaSignOutAlt className="w-4 h-4 flex-shrink-0" />
                    </button>
                  </div>
                </Tooltip>
              </>
            ) : (
              <div className="p-2 space-y-2">
                {/* Theme toggle */}
                <div className="flex items-center justify-between gap-2 px-2 py-1">
                  <span className="text-xs font-medium text-gray-600">Theme</span>
                  <button
                    type="button"
                    onClick={() => setTheme({ colorScheme: isDark ? 'light' : 'dark' })}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                  </button>
                </div>
                {/* User Info */}
                {userContext?.user && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                      {userContext.user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {userContext.user.name || 'User'}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {userContext.user.email || ''}
                      </p>
                    </div>
                  </div>
                )}
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium rounded-lg shadow-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 active:scale-[0.98] group"
                >
                  <FaSignOutAlt className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          transition: sidebarOpen
            ? 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'opacity 0.35s cubic-bezier(0.4, 0, 1, 1), backdrop-filter 0.35s cubic-bezier(0.4, 0, 1, 1)',
          willChange: sidebarOpen ? 'opacity, backdrop-filter' : 'auto'
        }}
        onClick={() => setSidebarOpen(false)}
      />
    </>
  );
}

