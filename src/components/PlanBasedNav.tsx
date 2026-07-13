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
import type { IconType } from 'react-icons';
import { MdOutlineInventory2, MdOutlineAnalytics, MdOutlineReport, MdOutlineSettings } from 'react-icons/md';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasPermission } from '@/utils/permissions';
import { getFullAssetUrl } from '@/utils/logoUrl';
import { useTheme } from '@/contexts/ThemeContext';
import { AppModuleKey, CrmCapabilityKey, isCrmCapabilityEnabled, isModuleEnabled } from '@/utils/moduleAccess';
import { getEffectiveTenantManifest } from '@/utils/manifest/manifestClient';
import { BlueprintNavItem } from '@/types/blueprintManifest';

type PlanName = 'Basic' | 'Pro' | 'Enterprise';

interface NavSubItem {
  name: string;
  href: string;
  icon?: IconType;
  requiredPermission?: string | null;
  requiredRestaurant?: boolean;
  subItems?: NavSubItem[];
}

interface NavItem extends NavSubItem {
  icon: IconType;
  requiredPlan?: PlanName | null;
  requiredModule?: AppModuleKey;
  requiredCrmCapability?: CrmCapabilityKey;
  subItems?: NavSubItem[];
}

type NavSectionKey = 'overview' | 'operations' | 'insights' | 'people' | 'system';

const NAV_SECTION_LABELS: Record<NavSectionKey, string> = {
  overview: 'Overview',
  operations: 'Operations',
  insights: 'Insights',
  people: 'People',
  system: 'System',
};

function iconBadgeClass(path: string): string {
  void path;
  return 'text-current';
}

function isRestaurantRoute(path: string): boolean {
  return String(path || '').toLowerCase().startsWith('/restaurant');
}

function iconForPath(path: string): IconType {
  const normalized = String(path || '').toLowerCase();
  if (normalized.startsWith('/dashboard') || normalized === '/') return FaTachometerAlt;
  if (normalized.startsWith('/ai')) return FaRobot;
  if (normalized.startsWith('/accounts')) return FaFileInvoiceDollar;
  if (normalized.startsWith('/products') || normalized.startsWith('/inventory')) return FaBoxOpen;
  if (normalized.startsWith('/sales') || normalized.startsWith('/restaurant')) return FaShoppingBasket;
  if (normalized.startsWith('/analytics')) return MdOutlineAnalytics;
  if (normalized.startsWith('/reports')) return MdOutlineReport;
  if (normalized.startsWith('/credit')) return FaCreditCard;
  if (normalized.startsWith('/hr') || normalized.startsWith('/users')) return FaUsers;
  if (normalized.startsWith('/payroll')) return FaMoneyBillWave;
  if (normalized.startsWith('/expenses')) return FaHistory;
  if (normalized.startsWith('/settings')) return MdOutlineSettings;
  if (normalized.startsWith('/billing') || normalized.startsWith('/account')) return FaFileInvoiceDollar;
  return FaLayerGroup;
}

function toSubItems(items?: BlueprintNavItem[]): NavSubItem[] | undefined {
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }

  return items.map((item) => ({
    name: item.label,
    href: item.path,
    icon: iconForPath(item.path),
    requiredPermission: item.requiredPermission || null,
    requiredRestaurant: isRestaurantRoute(item.path),
    subItems: toSubItems(item.children),
  }));
}

function toNavItems(items?: BlueprintNavItem[]): NavItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((item) => ({
    name: item.label,
    href: item.path,
    icon: iconForPath(item.path),
    requiredPlan: null,
    requiredPermission: item.requiredPermission || null,
    requiredRestaurant: isRestaurantRoute(item.path),
    requiredModule: item.requiredModule,
    subItems: toSubItems(item.children),
  }));
}

function flattenNavItems(items: NavItem[]): NavSubItem[] {
  const output: NavSubItem[] = [];

  const walk = (entries?: NavSubItem[]) => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      output.push({
        name: entry.name,
        href: entry.href,
        icon: entry.icon,
        requiredPermission: entry.requiredPermission || null,
        requiredRestaurant: entry.requiredRestaurant,
      });
      if (Array.isArray(entry.subItems) && entry.subItems.length > 0) {
        walk(entry.subItems);
      }
    }
  };

  walk(items);
  return output;
}

function buildGroupedNavigation(items: NavItem[]): NavItem[] {
  const flat = flattenNavItems(items);
  const byHref = new Map(flat.map((entry) => [entry.href, entry]));

  const createSubItem = (
    name: string,
    href: string,
    requiredPermission?: string,
    iconOverride?: IconType,
  ): NavSubItem | null => {
    const source = byHref.get(href);
    return {
      name,
      href,
      icon: iconOverride || source?.icon || iconForPath(href),
      requiredPermission: source?.requiredPermission || requiredPermission || null,
      requiredRestaurant: source?.requiredRestaurant || isRestaurantRoute(href),
    };
  };

  const createMainItem = (
    name: string,
    href: string,
    Icon: IconType,
    requiredModule?: AppModuleKey,
    requiredPermission?: string,
    subItems?: NavSubItem[],
  ): NavItem | null => {
    const source = byHref.get(href);
    const hasSubItems = Array.isArray(subItems) && subItems.length > 0;
    if (!source && !hasSubItems) return null;
    return {
      name,
      href,
      icon: source?.icon || Icon,
      requiredPlan: null,
      requiredPermission: source?.requiredPermission || requiredPermission || null,
      requiredRestaurant: source?.requiredRestaurant || isRestaurantRoute(href),
      requiredModule,
      subItems,
    };
  };

  const accountsSubItems = [
    createSubItem('Accounts Ledgers', '/accounts/ledgers', undefined, FaHistory),
    createSubItem('Balance Sheet', '/accounts/balance-sheet', undefined, FaChartBar),
    createSubItem('Trial Balance', '/accounts/trial-balance', undefined, FaLayerGroup),
    createSubItem('Revenue', '/accounts/revenue', undefined, FaMoneyBillWave),
    createSubItem('Profit & Loss', '/accounts/profit-loss', undefined, MdOutlineAnalytics),
    createSubItem('Inventory', '/accounts/inventory', undefined, MdOutlineInventory2),
  ].filter((item): item is NavSubItem => Boolean(item));

  const productsInventorySubItems = [
    createSubItem('Unified Management', '/products/unified', 'view_products', FaLayerGroup),
    createSubItem('Restaurant Menu Studio', '/restaurant/menu-studio', 'view_products', FaShoppingBasket),
    createSubItem('Suppliers', '/inventory/suppliers', 'view_inventory', FaUsers),
    createSubItem('Product Sales Report', '/products/reports/product-sales', 'view_reports', FaChartBar),
    createSubItem('Inventory Levels Report', '/products/reports/inventory-levels', 'view_reports', MdOutlineInventory2),
    createSubItem('Low Stock Alerts', '/products/reports/low-stock-alerts', 'view_reports', FaBullseye),
  ].filter((item): item is NavSubItem => Boolean(item));

  const salesTransactionsSubItems = [
    createSubItem('Sales History', '/sales/history', 'view_sales'),
    createSubItem('Restaurant Activity', '/restaurant/activity', 'view_sales'),
    createSubItem('Restaurant Inventory Costing', '/restaurant/inventory-costing', 'view_sales'),
    createSubItem('M-Pesa Transactions', '/mpesa-transactions', 'view_sales'),
    createSubItem('Sales Target', '/sales/targets', 'view_sales'),
  ].filter((item): item is NavSubItem => Boolean(item));

  const coreOperationsSubItems = [
    createSubItem('Products', '/products', 'view_products'),
    createSubItem('Inventory', '/inventory', 'view_inventory'),
    createSubItem('Customers', '/crm/pipeline', 'view_sales'),
  ].filter((item): item is NavSubItem => Boolean(item));

  const grouped: Array<NavItem | null> = [
    createMainItem('Dashboard', '/dashboard', FaTachometerAlt, 'dashboard'),
    createMainItem('AI Assistant', '/ai-assistant', FaRobot, 'ai'),
    accountsSubItems.length
      ? {
          name: 'Accounts',
          href: '/accounts/ledgers',
          icon: FaFileInvoiceDollar,
          requiredPlan: null,
          requiredPermission: null,
          requiredModule: 'accounts',
          subItems: accountsSubItems,
        }
      : null,
    productsInventorySubItems.length
      ? {
          name: 'Products & Inventory',
          href: '/products/unified',
          icon: FaBoxOpen,
          requiredPlan: null,
          requiredPermission: 'view_products',
          requiredModule: 'inventory',
          subItems: productsInventorySubItems,
        }
      : null,
    salesTransactionsSubItems.length
      ? {
          name: 'Transactions',
          href: '/sales/history',
          icon: FaShoppingBasket,
          requiredPlan: null,
          requiredPermission: 'view_sales',
          requiredModule: 'sales',
          subItems: salesTransactionsSubItems,
        }
      : null,
    coreOperationsSubItems.length
      ? {
          name: 'Core Operations',
          href: '/products',
          icon: FaLayerGroup,
          requiredPlan: null,
          requiredPermission: 'view_sales',
          requiredModule: 'sales',
          subItems: coreOperationsSubItems,
        }
      : null,
    createMainItem('Analytics', '/analytics', MdOutlineAnalytics, 'analytics', 'view_analytics'),
    createMainItem('Reports', '/reports', MdOutlineReport, 'reports', 'view_reports'),
    createMainItem('Credit', '/credit', FaCreditCard, 'credits', 'view_users'),
    createMainItem('HR Employees', '/hr/employees', FaUsers, 'payroll', 'view_sales'),
    createMainItem('Payroll', '/payroll', FaMoneyBillWave, 'payroll', 'view_sales'),
    createMainItem('Expenses', '/expenses', FaHistory, 'expenses', 'view_users'),
    createMainItem('Settings', '/settings', MdOutlineSettings, 'settings'),
    createMainItem('Billing & Subscription', '/account/billing', FaFileInvoiceDollar, 'billing'),
  ];

  return grouped.filter((item): item is NavItem => Boolean(item));
}


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
  const [manifestNavigationItems, setManifestNavigationItems] = useState<NavItem[] | null>(null);

  const tenantBranchLoading = tenantLoading;
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const itemRowBase = 'adeera-nav-item transition-colors duration-150';

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
    if (pathname?.startsWith('/accounts')) {
      newOpen.add('Accounts');
    }
    if (
      pathname?.startsWith('/products') ||
      pathname?.startsWith('/inventory')
    ) {                                                                                                                                     
      newOpen.add('Products & Inventory');
    }
    if (
      pathname?.startsWith('/sales') ||
      pathname?.startsWith('/restaurant') ||
      pathname?.startsWith('/mpesa-transactions')
    ) {
      newOpen.add('Transactions');
      newOpen.add('Core Operations');
    }
    if (pathname?.startsWith('/products/reports')) {
      newOpen.add('Products & Inventory');
      newOpen.add('Reports');
    }
    setOpenDropdowns(newOpen);
  }, [pathname]);

  useEffect(() => {
    let active = true;

    const loadManifestNavigation = async () => {
      if (!userContext?.user) {
        if (active) {
          setManifestNavigationItems(null);
        }
        return;
      }

      try {
        const payload = await getEffectiveTenantManifest();
        const manifestItems = toNavItems(payload?.manifest?.navigation);
        if (active) {
          setManifestNavigationItems(
            manifestItems.length > 0 ? manifestItems : null,
          );
        }
      } catch {
        if (active) {
          setManifestNavigationItems(null);
        }
      }
    };

    loadManifestNavigation();

    return () => {
      active = false;
    };
  }, [userContext?.user?.id, userContext?.user?.tenantId, userContext?.entitlementsSyncedAt]);

  // Get tenant name and logo from cached data (API returns logoUrl; some code may use logo)
  const tenant = tenantData ? {
    name: tenantData.name || '',
    logoUrl: (tenantData.logoUrl ?? tenantData.logo) as string | undefined,
  } : null;

  // Improved icon mapping for main and sub items
  const defaultNavigationItems: NavItem[] = React.useMemo(() => [
    { name: 'Dashboard', href: '/', icon: FaTachometerAlt, requiredPlan: null, requiredPermission: null, requiredModule: 'dashboard' as AppModuleKey },
    {
      name: 'AI Assistant',
      href: '/ai-assistant',
      icon: FaRobot,
      requiredPlan: null,
      requiredPermission: null,
      requiredModule: 'ai' as AppModuleKey,
    },
    {
      name: 'Accounts',
      href: '/accounts',
      icon: FaFileInvoiceDollar,
      requiredPlan: null,
      requiredPermission: null,
      requiredModule: 'accounts' as AppModuleKey,
      subItems: [
        { name: 'Ledgers', href: '/accounts/ledgers', icon: FaHistory },
        { name: 'Balance Sheet', href: '/accounts/balance-sheet', icon: FaChartBar },
        { name: 'Trial Balance', href: '/accounts/trial-balance', icon: FaLayerGroup },
        { name: 'Revenue', href: '/accounts/revenue', icon: FaMoneyBillWave },
        { name: 'Profit & Loss', href: '/accounts/profit-loss', icon: MdOutlineAnalytics },
        { name: 'Inventory', href: '/accounts/inventory', icon: MdOutlineInventory2 }
      ]
    },
    {
      name: 'Products & Inventory',
      href: '/products/unified',
      icon: FaBoxOpen,
      requiredPlan: null,
      requiredPermission: 'view_products',
      requiredModule: 'inventory' as AppModuleKey,
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
      requiredModule: 'sales' as AppModuleKey,
      subItems: [
        // { name: 'Sales', href: '/sales', requiredPermission: 'view_sales', icon: FaShoppingBasket }, // Sales page commented out
        { name: 'Sales History', href: '/sales/history', requiredPermission: 'view_sales', icon: FaHistory },
        { name: 'Restaurant Activity', href: '/restaurant/activity', requiredPermission: 'view_sales', icon: FaHistory },
        { name: 'Restaurant Inventory Costing', href: '/restaurant/inventory-costing', requiredPermission: 'view_sales', icon: MdOutlineInventory2 },
        { name: 'M-Pesa Transactions', href: '/mpesa-transactions', requiredPermission: 'view_sales', icon: FaMoneyBillWave },
        { name: 'Sales Target', href: '/sales/targets', requiredPermission: 'view_sales', icon: FaBullseye },
      ]
    },
    // CRM navigation is temporarily disabled.
    // {
    //   name: 'CRM Pipeline',
    //   href: '/crm/pipeline',
    //   icon: FaLayerGroup,
    //   requiredPlan: null,
    //   requiredPermission: 'view_sales',
    //   requiredModule: 'crm' as AppModuleKey,
    //   requiredCrmCapability: 'crm.pipeline' as CrmCapabilityKey,
    // },
    // {
    //   name: 'CRM Tasks',
    //   href: '/crm/tasks',
    //   icon: FaHistory,
    //   requiredPlan: null,
    //   requiredPermission: 'view_sales',
    //   requiredModule: 'crm' as AppModuleKey,
    //   requiredCrmCapability: 'crm.tasks' as CrmCapabilityKey,
    // },
    // {
    //   name: 'CRM Reports',
    //   href: '/crm/reports',
    //   icon: MdOutlineReport,
    //   requiredPlan: null,
    //   requiredPermission: 'view_sales',
    //   requiredModule: 'crm' as AppModuleKey,
    //   requiredCrmCapability: 'crm.reporting' as CrmCapabilityKey,
    // },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: MdOutlineAnalytics,
      requiredPlan: null,
      requiredPermission: 'view_analytics',
      requiredModule: 'analytics' as AppModuleKey,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: MdOutlineReport,
      requiredPlan: null,
      requiredPermission: 'view_reports',
      requiredModule: 'reports' as AppModuleKey,
    },
    { name: 'Credit', href: '/credit', icon: FaCreditCard, requiredPlan: null, requiredPermission: 'view_users', requiredModule: 'credits' as AppModuleKey },
    { name: 'HR Employees', href: '/hr/employees', icon: FaUsers, requiredPlan: null, requiredPermission: 'view_sales', requiredModule: 'payroll' as AppModuleKey },
    { name: 'Payroll', href: '/payroll', icon: FaMoneyBillWave, requiredPlan: null, requiredPermission: 'view_sales', requiredModule: 'payroll' as AppModuleKey },
    { name: 'Expenses', href: '/expenses', icon: FaHistory, requiredPlan: null, requiredPermission: 'view_users', requiredModule: 'expenses' as AppModuleKey },
    { name: 'Settings', href: '/settings', icon: MdOutlineSettings, requiredPlan: null, requiredPermission: null, requiredModule: 'settings' as AppModuleKey },
    { name: 'Billing & Subscription', href: '/account/billing', icon: FaFileInvoiceDollar, requiredPlan: null, requiredPermission: null, requiredModule: 'billing' as AppModuleKey },
  ], []);

  const navigationItems =
    Array.isArray(manifestNavigationItems) && manifestNavigationItems.length > 0
      ? buildGroupedNavigation(manifestNavigationItems)
      : defaultNavigationItems;

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
        (item) =>
          item.href === '/' ||
          item.href === '/dashboard' ||
          item.href === '/account/billing' ||
          item.href === '/settings/billing',
      );
    }

    // If no active subscription, only show Dashboard
    if (!hasActiveSubscription) {
      return navigationItems.filter(
        (item) => item.href === '/' || item.href === '/dashboard',
      );
    }

    return navigationItems.filter((item) => {
      if (item.requiredRestaurant && !userContext.user?.restaurantFeaturesEnabled) {
        return false;
      }

      if (!isModuleEnabled(userContext.user?.enabledModules, item.requiredModule)) {
        return false;
      }

      if (!isCrmCapabilityEnabled(userContext.user?.crmEntitlements, (item as { requiredCrmCapability?: CrmCapabilityKey }).requiredCrmCapability)) {
        return false;
      }

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
          if (subItem.requiredRestaurant && !userContext.user?.restaurantFeaturesEnabled) {
            return false;
          }
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
        if (subItem.requiredRestaurant && !userContext.user?.restaurantFeaturesEnabled) {
          return false;
        }
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

  const getSectionForItem = (item: NavItem): NavSectionKey => {
    const href = String(item.href || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();

    if (href === '/' || href.startsWith('/dashboard') || href.startsWith('/ai')) {
      return 'overview';
    }

    if (
      href.startsWith('/accounts') ||
      href.startsWith('/products') ||
      href.startsWith('/inventory') ||
      href.startsWith('/sales') ||
      href.startsWith('/restaurant') ||
      href.startsWith('/mpesa') ||
      href.startsWith('/expenses')
    ) {
      return 'operations';
    }

    if (href.startsWith('/analytics') || href.startsWith('/reports')) {
      return 'insights';
    }

    if (href.startsWith('/hr') || href.startsWith('/payroll') || name.includes('user')) {
      return 'people';
    }

    return 'system';
  };

  // Navigation
  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100"
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
        className={`fixed top-0 left-0 h-full border-r z-40 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 ${
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
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <FaChevronRight className="w-3.5 h-3.5" /> : <FaChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col h-full relative z-10" style={{ position: 'relative' }}>
          {/* Header - Minimal spacing */}
          {!sidebarCollapsed && !sidebarOpen && tenant?.logoUrl && (
            <div className="border-b border-gray-200 dark:border-zinc-800 px-4 py-2">
              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
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
            className="flex-1 min-h-0 p-2 overflow-y-auto overscroll-contain custom-scrollbar" 
            style={{ 
              paddingBottom: sidebarCollapsed ? '60px' : '120px'
            }}
          >
            <div className="space-y-1">
              {accessibleItems.map((item, index) => {
                const Icon = item.icon;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isDropdownOpen = openDropdowns.has(item.name);
                const isActive =
                  pathname === item.href ||
                  (hasSubItems && item.subItems?.some((subItem) => pathname === subItem.href));
                const currentSection = getSectionForItem(item);
                const previousSection =
                  index > 0 ? getSectionForItem(accessibleItems[index - 1]) : null;
                const showSectionSeparator = index === 0 || currentSection !== previousSection;
                
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
                    <React.Fragment key={item.name}>
                      {showSectionSeparator && (
                        <div className={index === 0 ? 'mb-2' : 'mb-2 mt-3'}>
                          {sidebarCollapsed ? (
                            <div className="mx-1 h-px bg-gray-200 dark:bg-zinc-800" />
                          ) : (
                            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-zinc-400">
                              {NAV_SECTION_LABELS[currentSection]}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="mb-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSubmenu(submenuKey)}
                          className={`flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                            isActive
                              ? `${itemRowBase} adeera-nav-item-active`
                              : `${itemRowBase}`
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${iconBadgeClass(item.href)}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate text-xs">{item.name}</span>
                          </span>
                          <span className="shrink-0">
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
                            const nestedItems = subItem.subItems || [];
                            const hasNested = nestedItems.length > 0;
                            const submenuKey = subItem.href || subItem.name;
                            const openNested = !!openSubmenus[submenuKey];
                            return (
                              <div key={subItem.name}>
                                {hasNested ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubmenu(submenuKey)}
                                    className={`flex items-center w-full space-x-2 px-2 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                                      isSubActive || openNested
                                        ? `${itemRowBase} adeera-nav-item-active`
                                        : `${itemRowBase}`
                                    }`}
                                  >
                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${iconBadgeClass(subItem.href)}`}>
                                      <SubIcon className="w-3 h-3 shrink-0" />
                                    </span>
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
                                    className={`flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                                      isSubActive
                                        ? `${itemRowBase} adeera-nav-item-active`
                                        : `${itemRowBase}`
                                    }`}
                                  >
                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${iconBadgeClass(subItem.href)}`}>
                                      <SubIcon className="w-3 h-3 shrink-0" />
                                    </span>
                                    <span>{subItem.name}</span>
                                  </Link>
                                )}
                                {/* Nested subitems */}
                                {hasNested && openSubmenus[submenuKey] && (
                                  <div className="ml-4">
                                    {nestedItems.map((nested) => {
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
                                          className={`flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                                            isNestedActive
                                              ? `${itemRowBase} adeera-nav-item-active`
                                              : `${itemRowBase}`
                                          }`}
                                        >
                                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${iconBadgeClass(nested.href)}`}>
                                            <NestedIcon className="w-3 h-3 shrink-0" />
                                          </span>
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
                    </React.Fragment>
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
                        className={`flex items-center justify-between transition-colors duration-150 rounded-lg text-xs font-semibold w-full ${
                          sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-2 px-2.5 py-2'
                        } ${
                          isActive
                            ? `${itemRowBase} adeera-nav-item-active`
                            : `${itemRowBase}`
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${iconBadgeClass(item.href)}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          {!sidebarCollapsed && (
                            <span className="truncate text-xs">{item.name}</span>
                          )}
                        </div>
                        {!sidebarCollapsed && (
                          <div className="shrink-0">
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
                            const nestedItems = subItem.subItems || [];
                            const hasNested = nestedItems.length > 0;
                            const submenuKey = subItem.href || subItem.name;
                            const open = !!openSubmenus[submenuKey];
                            return (
                              <div key={subItem.name}>
                                {hasNested ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubmenu(submenuKey)}
                                    className={`flex items-center w-full space-x-2 px-2 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                                      isSubActive || open
                                        ? `${itemRowBase} adeera-nav-item-active`
                                        : `${itemRowBase}`
                                    }`}
                                  >
                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${iconBadgeClass(subItem.href)}`}>
                                      <SubIcon className="w-3 h-3 shrink-0" />
                                    </span>
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
                                    className={`flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                                      isSubActive
                                        ? `${itemRowBase} adeera-nav-item-active`
                                        : `${itemRowBase}`
                                    }`}
                                  >
                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${iconBadgeClass(subItem.href)}`}>
                                      <SubIcon className="w-3 h-3 shrink-0" />
                                    </span>
                                    <span>{subItem.name}</span>
                                  </a>
                                )}
                                {/* Nested subitems */}
                                {hasNested && open && (
                                  <div className="ml-4">
                                    {nestedItems.map((nested) => {
                                      const NestedIcon = nested.icon || FaChevronRight;
                                      const isNestedActive = pathname === nested.href;
                                      return (
                                        <a
                                          key={nested.name}
                                          href={nested.href}
                                          className={`flex items-center space-x-2 px-2 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                                            isNestedActive
                                              ? `${itemRowBase} adeera-nav-item-active`
                                              : `${itemRowBase}`
                                          }`}
                                        >
                                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${iconBadgeClass(nested.href)}`}>
                                            <NestedIcon className="w-3 h-3 shrink-0" />
                                          </span>
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
                  return (
                    <React.Fragment key={item.name}>
                      {showSectionSeparator && (
                        <div className={index === 0 ? 'mb-2' : 'mb-2 mt-3'}>
                          {sidebarCollapsed ? (
                            <div className="mx-1 h-px bg-gray-200 dark:bg-zinc-800" />
                          ) : (
                            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-zinc-400">
                              {NAV_SECTION_LABELS[currentSection]}
                            </p>
                          )}
                        </div>
                      )}
                      {sidebarCollapsed ? (
                        <Tooltip content={item.name} position="right">
                          <a
                            href={item.href}
                            className={`flex items-center transition-colors duration-150 rounded text-sm font-medium ${
                              'justify-center px-2 py-3'
                            } ${
                              isActive
                                ? `${itemRowBase} adeera-nav-item-active`
                                : `${itemRowBase}`
                            }`}
                          >
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md shrink-0 ${iconBadgeClass(item.href)}`}>
                              <Icon className="w-4 h-4" />
                            </span>
                          </a>
                        </Tooltip>
                      ) : (
                        dropdownContent
                      )}
                    </React.Fragment>
                  );
                } else {
                  // Regular link
                  const linkContent = (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`flex items-center transition-colors duration-150 rounded text-xs font-medium ${
                        sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-2 px-2.5 py-2'
                      } ${
                        isActive
                            ? `${itemRowBase} adeera-nav-item-active`
                            : `${itemRowBase}`
                      }`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${iconBadgeClass(item.href)}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      {!sidebarCollapsed && (
                        <span className="truncate text-xs">{item.name}</span>
                      )}
                    </a>
                  );
                  return (
                    <React.Fragment key={item.name}>
                      {showSectionSeparator && (
                        <div className={index === 0 ? 'mb-2' : 'mb-2 mt-3'}>
                          {sidebarCollapsed ? (
                            <div className="mx-1 h-px bg-gray-200 dark:bg-zinc-800" />
                          ) : (
                            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-zinc-400">
                              {NAV_SECTION_LABELS[currentSection]}
                            </p>
                          )}
                        </div>
                      )}
                      {sidebarCollapsed ? (
                        <Tooltip content={item.name} position="right">
                          {linkContent}
                        </Tooltip>
                      ) : (
                        linkContent
                      )}
                    </React.Fragment>
                  );
                }
              })}
            </div>
          </nav>

          {/* Footer actions pinned by flex layout (does not overlap nav list) */}
          <div className="mt-auto shrink-0 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            {sidebarCollapsed ? (
              <>
                <Tooltip content={isDark ? 'Light mode' : 'Dark mode'} position="right">
                  <button
                    type="button"
                    onClick={() => setTheme({ colorScheme: isDark ? 'light' : 'dark' })}
                    className="w-full flex items-center justify-center py-2.5 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 border-b border-gray-200 dark:border-zinc-800 transition-colors"
                    aria-label="Toggle theme"
                  >
                    {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                  </button>
                </Tooltip>
                <Tooltip content="Log out" position="right">
                  <div className="w-full block">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center py-3 text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all duration-200 active:scale-95"
                      title="Log out"
                    >
                      <FaSignOutAlt className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </Tooltip>
              </>
            ) : (
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-end gap-2 px-1 py-1">
                  <button
                    type="button"
                    onClick={() => setTheme({ colorScheme: isDark ? 'light' : 'dark' })}
                    className="p-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                  >
                    {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                  </button>
                </div>
                {userContext?.user && (
                  <div className="flex items-center gap-2 px-2 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-800">
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 flex items-center justify-center font-semibold text-xs shrink-0">
                      {userContext.user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                        {userContext.user.name || 'User'}
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-zinc-400 truncate">
                        {userContext.user.email || ''}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      aria-label="Log out"
                      title="Log out"
                    >
                      <FaSignOutAlt className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
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


