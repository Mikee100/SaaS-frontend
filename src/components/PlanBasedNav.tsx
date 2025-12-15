"use client";
import React, { useState } from 'react';
import { useUser } from './UserContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useTenant } from '@/hooks/useTenant';
import { useSidebar } from './SidebarContext';
import Tooltip from './Tooltip';
import {
  FaBoxOpen, FaShoppingBasket, FaChartBar, FaCreditCard, /* FaCog, */ FaSignOutAlt, FaBars, FaTimes,
  FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp, /* FaMapMarkerAlt, */ FaRobot, FaTachometerAlt,
  FaLayerGroup, FaUpload, FaHistory, FaUsers, FaMoneyBillWave, FaFileInvoiceDollar, /* FaBuilding, */ FaBullseye
} from 'react-icons/fa';
import { MdOutlineInventory2, MdOutlineAnalytics, MdOutlineReport, MdOutlineSettings } from 'react-icons/md';
import { usePathname } from 'next/navigation';
import { hasPermission } from '@/utils/permissions';
import Image from 'next/image';


export default function PlanBasedNav() {
  const userContext = useUser();
  const { data: limits, loading: limitsLoading } = usePlanLimits();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const tenantBranchLoading = tenantLoading;
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  // Close dropdowns when navigating to a different page, but open relevant ones for reports
  React.useEffect(() => {
    const newOpen = new Set<string>();
    if (pathname?.startsWith('/products/reports')) {
      newOpen.add('Products & Inventory');
      newOpen.add('Reports');
    }
    setOpenDropdowns(newOpen);
  }, [pathname]);

  // Get tenant name and logo from cached data
  const tenant = tenantData ? {
    name: tenantData.name || '',
    logoUrl: tenantData.logo as string | undefined,
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
      name: 'Products & Inventory',
      href: '/products/unified',
      icon: FaBoxOpen,
      requiredPlan: null,
      requiredPermission: 'view_products',
      subItems: [
        { name: 'Unified Management', href: '/products/unified', requiredPermission: 'view_products', icon: FaLayerGroup },
        { name: 'Bulk Upload', href: '/products/bulk-add', requiredPermission: 'create_products', icon: FaUpload },
        { name: 'Bulk Upload Records', href: '/products/bulk-upload-records', requiredPermission: 'view_products', icon: FaHistory },
        { name: 'Suppliers', href: '/inventory/suppliers', requiredPermission: 'view_inventory', icon: FaUsers },
        {
          name: 'Reports',
          href: '/products/reports',
          requiredPermission: 'view_inventory',
          icon: MdOutlineReport,
          subItems: [
            { name: 'Product Sales', href: '/products/reports/product-sales', requiredPermission: 'view_sales', icon: FaFileInvoiceDollar },
            { name: 'Inventory Levels', href: '/products/reports/inventory-levels', requiredPermission: 'view_inventory', icon: MdOutlineInventory2 },
            { name: 'Low Stock Alerts', href: '/products/reports/low-stock-alerts', requiredPermission: 'view_inventory', icon: FaBullseye },
            { name: 'Product Performance', href: '/products/reports/product-performance', requiredPermission: 'view_analytics', icon: FaChartBar },
            { name: 'Inventory Turnover', href: '/products/reports/inventory-turnover', requiredPermission: 'view_inventory', icon: FaHistory },
            { name: 'Supplier Performance', href: '/products/reports/supplier-performance', requiredPermission: 'view_inventory', icon: FaUsers },
            { name: 'Product Category Analysis', href: '/products/reports/product-category-analysis', requiredPermission: 'view_analytics', icon: FaLayerGroup },
            { name: 'Inventory Movement', href: '/products/reports/inventory-movement', requiredPermission: 'view_inventory', icon: FaBoxOpen },
            { name: 'Inventory Aging', href: '/products/reports/inventory-aging', requiredPermission: 'view_inventory', icon: FaHistory },
            { name: 'Stockout & Lost Sales', href: '/products/reports/stockout-lost-sales', requiredPermission: 'view_inventory', icon: FaMoneyBillWave },
            { name: 'Inventory Valuation', href: '/products/reports/inventory-valuation', requiredPermission: 'view_inventory', icon: FaCreditCard }
          ]
        }
      ]
    },
    {
      name: 'Transactions',
      href: '/sales',
      icon: FaShoppingBasket,
      requiredPlan: null,
      requiredPermission: 'view_sales',
      subItems: [
        { name: 'Sales', href: '/sales', requiredPermission: 'view_sales', icon: FaShoppingBasket },
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
    { name: 'Expenses', href: '/expenses', icon: FaMoneyBillWave, requiredPlan: null, requiredPermission: 'view_users' },
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
    const result = limits && limits.currentPlan !== null; // Any assigned plan is considered active
  
    return result;
  }, [limits]);


  const accessibleItems = React.useMemo(() => {
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
  }, [userContext.user, currentLevel, navigationItems, planHierarchy, hasActiveSubscription]);

  // Hide sidebar on settings pages
  const isSettingsPage = pathname?.startsWith('/settings');
  if (isSettingsPage) {
    return null;
  }

  // Use a regular variable for loading skeleton
  const isLoading = userContext?.loading || limitsLoading || !userContext?.user || !limits || tenantBranchLoading;
  if (isLoading) {
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
          className="p-2 bg-white rounded-lg shadow-lg border"
        >
          {sidebarOpen ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-white shadow-xl border-r z-30 transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Desktop collapse/expand button */}
        <div className="hidden lg:block absolute -right-3 top-4 z-50">
          <Tooltip content={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} position="right">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <FaChevronRight className="w-3 h-3" /> : <FaChevronLeft className="w-3 h-3" />}
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col h-full relative">
          {/* Header */}
          <div className={`border-b border-gray-200 transition-all duration-300 ${
            sidebarCollapsed ? 'p-3' : 'p-4'
          }`}>
            <div className="flex flex-col items-center justify-center space-y-2">
              {/* Logo */}
              {!sidebarCollapsed && !sidebarOpen && tenant?.logoUrl && (
                <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  <Image
                    src={tenant.logoUrl}
                    alt={`${tenant.name} logo`}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <div className="space-y-1">
              {accessibleItems.map((item) => {
                const Icon = item.icon;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isDropdownOpen = openDropdowns.has(item.name);
                const isActive =
                  pathname === item.href ||
                  (hasSubItems && item.subItems?.some((subItem) => pathname === subItem.href));
                // Mobile: show all subitems as collapsible accordions
                if (hasSubItems && !sidebarCollapsed && sidebarOpen) {
                  const submenuKey = item.href || item.name;
                  const open = !!openSubmenus[submenuKey];
                  return (
                    <div key={item.name} className="mb-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSubmenu(submenuKey)}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded text-base font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          {item.name}
                        </span>
                        <span>
                          {open ? (
                            <FaChevronUp className="w-4 h-4" />
                          ) : (
                            <FaChevronDown className="w-4 h-4" />
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
                                    className={`flex items-center w-full space-x-2 px-3 py-2 rounded text-sm transition-all duration-200 ${
                                      isSubActive || openNested
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4" />
                                    <span>{subItem.name}</span>
                                    <span className="ml-auto">
                                      {openNested ? (
                                        <FaChevronUp className="w-3 h-3" />
                                      ) : (
                                        <FaChevronDown className="w-3 h-3" />
                                      )}
                                    </span>
                                  </button>
                                ) : (
                                  <a
                                    href={subItem.href}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-all duration-200 ${
                                      isSubActive
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4" />
                                    <span>{subItem.name}</span>
                                  </a>
                                )}
                                {/* Nested subitems */}
                                {hasNested && openSubmenus[submenuKey] && (
                                  <div className="ml-4">
                                    {subItem.subItems.map((nested) => {
                                      const NestedIcon = nested.icon || FaChevronRight;
                                      const isNestedActive = pathname === nested.href;
                                      return (
                                        <a
                                          key={nested.name}
                                          href={nested.href}
                                          className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-all duration-200 ${
                                            isNestedActive
                                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                          }`}
                                        >
                                          <NestedIcon className="w-4 h-4" />
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
                }
                // Desktop: dropdown or tooltip
                if (hasSubItems) {
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
                        className={`flex items-center justify-between transition-all duration-200 rounded text-sm font-medium w-full ${
                          sidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-3 py-2'
                        } ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          {!sidebarCollapsed && (
                            <span className="whitespace-nowrap">{item.name}</span>
                          )}
                        </div>
                        {!sidebarCollapsed && (
                          <div className="flex-shrink-0">
                            {isDropdownOpen ? (
                              <FaChevronUp className="w-3 h-3" />
                            ) : (
                              <FaChevronDown className="w-3 h-3" />
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
                                    className={`flex items-center w-full space-x-2 px-3 py-2 rounded text-sm transition-all duration-200 ${
                                      isSubActive || open
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4" />
                                    <span>{subItem.name}</span>
                                    <span className="ml-auto">
                                      {open ? (
                                        <FaChevronUp className="w-3 h-3" />
                                      ) : (
                                        <FaChevronDown className="w-3 h-3" />
                                      )}
                                    </span>
                                  </button>
                                ) : (
                                  <a
                                    href={subItem.href}
                                    className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-all duration-200 ${
                                      isSubActive
                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                  >
                                    <SubIcon className="w-4 h-4" />
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
                                          className={`flex items-center space-x-2 px-3 py-2 rounded text-sm transition-all duration-200 ${
                                            isNestedActive
                                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                          }`}
                                        >
                                          <NestedIcon className="w-4 h-4" />
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
                        <Icon className="w-5 h-5 flex-shrink-0" />
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
                      className={`flex items-center transition-all duration-200 rounded text-sm font-medium ${
                        sidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
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
                }
              })}
            </div>
          </nav>

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
          className="fixed inset-0 bg-white/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}

