"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useSidebar } from './SidebarContext';
import Tooltip from './Tooltip';
import { FaBox, FaShoppingCart, FaChartLine, FaCog, FaUsers, FaSignOutAlt, FaBars, FaTimes, FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp, FaMapMarkerAlt, FaCreditCard, FaRobot } from 'react-icons/fa';
import { usePathname } from 'next/navigation';
import { hasPermission } from '@/utils/permissions';
import { FaTachometerAlt } from 'react-icons/fa';
import { apiGet } from '@/utils/api';
import Image from 'next/image';



interface Tenant {
  name: string;
  logoUrl?: string;
  // Add other fields as needed
}

interface Branch {
  name: string;
  // Add other fields as needed
}

export default function PlanBasedNav() {
  const userContext = useUser();
  const { data: limits, loading: limitsLoading } = usePlanLimits();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tenantBranchLoading, setTenantBranchLoading] = useState(true);
  const pathname = usePathname();

  // Close dropdowns when navigating to a different page
  React.useEffect(() => {
    setOpenDropdowns(new Set());
  }, [pathname]);

  // Fetch tenant and branch data
  useEffect(() => {
    const fetchTenantAndBranch = async () => {
      if (!userContext.user?.tenantId || !userContext.user?.branchId) {
        setTenantBranchLoading(false);
        return;
      }

      try {
        const [tenantData, branchData] = await Promise.all([
          apiGet('/tenant/me'),
          apiGet(`/branches/${userContext.user.branchId}`)
        ]);
        setTenant(tenantData as Tenant);
        setBranch(branchData as Branch);
      } catch (error) {
        console.error('Error fetching tenant or branch:', error);
      } finally {
        setTenantBranchLoading(false);
      }
    };

    if (userContext.user) {
      fetchTenantAndBranch();
    }
  }, [userContext.user]);

    // Always call hooks at top level!
    const navigationItems = React.useMemo(() => [
      { name: 'Dashboard', href: '/', icon: FaTachometerAlt, requiredPlan: null, requiredPermission: null },
      {
        name: 'AI Assistant',
        href: '/ai-assistant',
        icon: FaRobot,
        requiredPlan: 'Basic',
        requiredPermission: null
      },
      {
        name: 'Products & Inventory',
        href: '/products',
        icon: FaBox,
        requiredPlan: 'Basic',
        requiredPermission: 'view_products',
        subItems: [
          { name: 'Product List', href: '/products', requiredPermission: 'view_products' },
          { name: 'Bulk Upload', href: '/products/bulk-add', requiredPermission: 'create_products' },
          { name: 'Bulk Upload Records', href: '/products/bulk-upload-records', requiredPermission: 'view_products' },
          { name: 'Basic Inventory', href: '/inventory', requiredPermission: 'view_inventory' },
          { name: 'Advanced Inventory', href: '/inventory/advanced', requiredPermission: 'view_inventory' },
          { name: 'Suppliers', href: '/inventory/suppliers', requiredPermission: 'view_inventory' },
           { name: 'Reports', href: '/products/reports', requiredPermission: 'view_inventory' }
        ]
      },
    {
      name: 'Transactions',
      href: '/sales',
      icon: FaShoppingCart,
      requiredPlan: null,
      requiredPermission: 'view_sales',
      subItems: [
        { name: 'Sales', href: '/sales', requiredPermission: 'view_sales' },
        { name: 'Sales History', href: '/sales/history', requiredPermission: 'view_sales' },
        { name: 'M-Pesa Transactions', href: '/mpesa-transactions', requiredPermission: 'view_sales' }
      ]
    },
    {
      name: 'Reports & Analytics',
      href: '/analytics',
      icon: FaChartLine,
      requiredPlan: null,
      requiredPermission: 'view_analytics',
      subItems: [
        { name: 'Analytics', href: '/analytics', requiredPermission: 'view_analytics' },
        { name: 'Reports', href: '/reports', requiredPermission: 'view_reports' }
      ]
    },
    { name: 'Users', href: '/users', icon: FaUsers, requiredPlan: 'Basic', requiredPermission: 'view_users' },
    { name: 'Settings', href: '/settings', icon: FaCog, requiredPlan: null, requiredPermission: null },
    { name: 'Billing & Subscription', href: '/account/billing', icon: FaCreditCard, requiredPlan: null, requiredPermission: null },
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
    console.log('PlanBasedNav: calculating hasActiveSubscription, limits:', limits);
    const result = limits && limits.currentPlan !== null; // Any assigned plan is considered active
    console.log('PlanBasedNav: hasActiveSubscription result:', result);
    return result;
  }, [limits]);

  // Debug log
  console.log('PlanBasedNav - limits:', limits);
  console.log('PlanBasedNav - hasActiveSubscription:', hasActiveSubscription);
  console.log('PlanBasedNav - currentPlan:', limits?.currentPlan);

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
      <div className={`fixed top-0 left-0 h-full bg-white shadow-lg border-r z-30 transition-all duration-300 ease-in-out ${
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

              {/* Business and Branch Info */}
              {!sidebarCollapsed && !sidebarOpen && (
                <div className="text-center">
                  <h1 className="text-sm font-semibold text-gray-900 leading-tight">
                    {tenant?.name || 'Business Name'}
                  </h1>
                  <div className="flex items-center justify-center mt-1 space-x-1">
                    <FaMapMarkerAlt className="w-3 h-3 text-gray-500" />
                    <p className="text-xs text-gray-600">
                      {branch?.name || 'Branch'}
                    </p>
                  </div>
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
                const isActive = pathname === item.href || (hasSubItems && item.subItems?.some(subItem => pathname === subItem.href));

                if (hasSubItems) {
                  // Dropdown item
                  const dropdownContent = (
                    <div key={item.name}>
                      <button
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
                            {isDropdownOpen ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
                          </div>
                        )}
                      </button>

                      {!sidebarCollapsed && isDropdownOpen && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.subItems?.map((subItem) => {
                            const isSubActive = pathname === subItem.href;
                            return (
                              <a
                                key={subItem.name}
                                href={subItem.href}
                                className={`flex items-center space-x-3 px-3 py-2 rounded text-sm transition-all duration-200 ${
                                  isSubActive
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                              >
                                <span className="whitespace-nowrap">{subItem.name}</span>
                              </a>
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
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
