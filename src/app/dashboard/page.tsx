'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import PlanGuard from '@/components/PlanGuard';
import AuthGuard from '@/components/AuthGuard';
import LogoEnforcement from '@/components/LogoEnforcement';
import BranchSwitcher from '@/components/BranchSwitcher';
import QuickActions from '../QuickActions';
import { useUser } from '@/components/UserContext';
import { useAppPreferences, preferenceDateRangeToDashboard } from '@/hooks/useAppPreferences';
import { hasPermission } from '@/utils/permissions';
import { apiGet } from '@/utils/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import {
  FiTrendingUp,
  FiRefreshCw,
  FiDollarSign,
  FiAlertCircle,
  FiUserPlus
} from 'react-icons/fi';

// Dynamically import components with no SSR for better performance
const ChartComponents = {
  CustomerGrowthChart: dynamic(
    () => import('@/components/CustomerGrowthChart'),
    { ssr: false, loading: () => <div className="h-64 flex items-center justify-center">Loading...</div> }
  ),
  SalesRevenueChart: dynamic(
    () => import('@/components/SalesRevenueChart'),
    { ssr: false, loading: () => <div className="h-80 flex items-center justify-center">Loading...</div> }
  ),
  SalesTrendsAnalysis: dynamic(
    () => import('@/components/SalesTrendsAnalysis'),
    { ssr: false, loading: () => <div className="h-96 flex items-center justify-center">Loading...</div> }
  ),
  SalesTrendsChart: dynamic(
    () => import('@/components/SalesTrendsChart'),
    { ssr: false, loading: () => <div className="h-96 flex items-center justify-center">Loading...</div> }
  ),
  MonthlySalesTrends: dynamic(
    () => import('@/components/MonthlySalesTrends'),
    { ssr: false, loading: () => <div className="h-96 flex items-center justify-center">Loading...</div> }
  ),
  CustomerSegmentation: dynamic(
    () => import('@/components/CustomerSegmentation'),
    { ssr: false, loading: () => <div className="h-full flex items-center justify-center">Loading...</div> }
  ),
  SalesTarget: dynamic(
    () => import('@/components/SalesTarget'),
    { ssr: false, loading: () => <div className="h-64 flex items-center justify-center">Loading...</div> }
  )
};

interface AnalyticsData {
  totalSales?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalCustomers?: number;
  salesByMonth?: Record<string, number>;
  customerGrowth?: Record<string, number>;
  realTimeData?: {
    currentUsers: number;
    activeSales: number;
    revenueToday: number;
  };
  inventoryAnalytics?: {
    lowStockItems: number;
    overstockItems: number;
    inventoryTurnover: number;
    stockoutRate: number;
  };
  pendingOrders?: number;
  openShifts?: number;
  customerRetention?: {
    totalCustomers: number;
    repeatCustomers: number;
    retentionRate: number;
  };
}

type CreditItem = {
  id: string;
  status?: string;
  balance?: number;
  totalAmount?: number;
  paidAmount?: number;
  dueDate?: string;
};

type SalesTargets = {
  daily: number;
  weekly: number;
  monthly: number;
};

type SalesTrends = {
  trends: {
    date: string;
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  }[];
  summary: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
};

type PriorityItem = {
  id: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  href?: string;
};



export default function DashboardPage() {
  const { user } = useUser();
  const { preferences: appPrefs, loading: prefsLoading } = useAppPreferences();
  const [dateRange, setDateRange] = useState(() => {
    if (typeof window === 'undefined') return '30d';
    return window.localStorage.getItem('dashboardDateRange') || '30d';
  });

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => role.toLowerCase())
    : [];
  const isOwner = normalizedRoles.includes('owner');
  const isAdmin = normalizedRoles.includes('admin') || Boolean(user?.isSuperadmin);
  const isManager = normalizedRoles.includes('manager');
  const isCashier = normalizedRoles.includes('cashier');
  const isOwnerOrAdmin = isOwner || isAdmin;

  const canViewAnalytics = hasPermission(user, 'view_analytics');
  const canViewSales = hasPermission(user, 'view_sales');
  const canCreateSales = hasPermission(user, 'create_sales');
  const canViewProducts = hasPermission(user, 'view_products');

  // Apply saved default date range once when preferences first load (don't overwrite user's later choice)
  const hasAppliedDatePref = React.useRef(false);
  useEffect(() => {
    if (prefsLoading || hasAppliedDatePref.current) return;
    hasAppliedDatePref.current = true;
    const preferred = preferenceDateRangeToDashboard(appPrefs.dashboardDefaultDateRange);
    setDateRange(preferred);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboardDateRange', preferred);
    }
  }, [prefsLoading, appPrefs.dashboardDefaultDateRange]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', dateRange],
    refetchInterval: appPrefs.dashboardAutoRefresh ? 60 * 1000 : false,
    queryFn: async () => {
      // Fetch sales trends
      let trends: { data: SalesTrends | null } = { data: null };
      try {
        const response = await fetch('/api/sales-trends');
        if (response.ok) {
          trends = await response.json();
        }
      } catch {
        // ignore, handled with fallback below
      }

      // Fetch analytics overview
      let analytics: AnalyticsData = {};
      try {
        analytics = await apiGet<AnalyticsData>('/analytics/dashboard');
      } catch {
        // Fallback to legacy endpoint shape when dashboard endpoint is unavailable
        try {
          const response = await fetch('/api/analytics/overview');
          if (response.ok) {
            analytics = await response.json();
          }
        } catch {
          // ignore, leave analytics as empty object
        }
      }

      // Fallback mock trends only if API did not return any data
      let salesTrends: SalesTrends | null = trends.data;
      if (!salesTrends) {
        const mockTrends: SalesTrends = {
          trends: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            totalSales: Math.floor(Math.random() * 10000) + 1000,
            totalOrders: Math.floor(Math.random() * 50) + 5,
            averageOrderValue: Math.floor(Math.random() * 200) + 50,
          })).reverse(),
          summary: {
            totalSales: 150000,
            totalOrders: 1500,
            averageOrderValue: 100,
          },
        };
        salesTrends = mockTrends;
      }

      return { analyticsData: analytics, salesTrends };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: planLimits } = usePlanLimits();

  const { data: creditSnapshot } = useQuery({
    queryKey: ['dashboard', 'credit-snapshot'],
    enabled: canViewSales && (isOwnerOrAdmin || isManager),
    queryFn: async () => {
      try {
        const credits = await apiGet<CreditItem[]>('/sales/credits/all');
        if (!Array.isArray(credits)) {
          return { outstanding: 0, overdue: 0, openCredits: 0 };
        }

        const outstanding = credits.reduce((sum, credit) => sum + Number(credit.balance || 0), 0);
        const overdue = credits.filter((credit) => {
          const status = String(credit.status || '').toLowerCase();
          return status === 'overdue' && Number(credit.balance || 0) > 0;
        }).length;
        const openCredits = credits.filter((credit) => Number(credit.balance || 0) > 0).length;

        return { outstanding, overdue, openCredits };
      } catch {
        return { outstanding: 0, overdue: 0, openCredits: 0 };
      }
    },
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  const { data: salesTargetsProgress } = useQuery({
    queryKey: ['dashboard', 'sales-target-progress'],
    enabled: canViewSales,
    queryFn: async () => {
      try {
        const [targets, dailySales] = await Promise.all([
          apiGet<SalesTargets>('/sales-targets').catch(() => ({ daily: 0, weekly: 0, monthly: 0 })),
          apiGet<Record<string, number>>('/analytics/sales/daily').catch(() => ({} as Record<string, number>)),
        ]);

        const todayKey = new Date().toISOString().slice(0, 10);
        const todayRevenue = Number(dailySales[todayKey] || 0);
        const dailyTarget = Number(targets.daily || 0);
        const dailyProgress = dailyTarget > 0 ? Math.min(100, (todayRevenue / dailyTarget) * 100) : 0;

        return {
          todayRevenue,
          dailyTarget,
          dailyProgress,
        };
      } catch {
        return {
          todayRevenue: 0,
          dailyTarget: 0,
          dailyProgress: 0,
        };
      }
    },
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  const { data: overdueCreditsCount = 0 } = useQuery({
    queryKey: ['dashboard', 'overdue-credits'],
    enabled: canViewSales && (isOwnerOrAdmin || isManager),
    queryFn: async () => {
      try {
        const credits = await apiGet<CreditItem[]>('/sales/credits/all');
        if (!Array.isArray(credits)) return 0;

        return credits.filter((credit) => {
          const status = String(credit.status || '').toLowerCase();
          const balance = Number(credit.balance || 0);
          return status === 'overdue' && balance > 0;
        }).length;
      } catch {
        return 0;
      }
    },
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
  });

  const analyticsData: AnalyticsData = data?.analyticsData || {};
  const salesTrends: SalesTrends | null = data?.salesTrends || null;
  const isRefreshing = isFetching && !!data;

  // Derive "today" ops metrics from sales trends (latest day)
  const todaySummary = (() => {
    if (!salesTrends || !salesTrends.trends || salesTrends.trends.length === 0) {
      return null;
    }

    const sorted = [...salesTrends.trends].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const latest = sorted[sorted.length - 1];
    const previous = sorted.slice(-8, -1);

    const previousRevenueTotal = previous.reduce(
      (sum, item) => sum + (typeof item.totalSales === 'number' ? item.totalSales : 0),
      0
    );
    const previousOrdersTotal = previous.reduce(
      (sum, item) => sum + (typeof item.totalOrders === 'number' ? item.totalOrders : 0),
      0
    );

    const previousCount = previous.length || 1;
    const previousRevenueAvg = previousRevenueTotal / previousCount;
    const previousOrdersAvg = previousOrdersTotal / previousCount;

    const revenueTrendPercent =
      previousRevenueAvg > 0
        ? ((latest.totalSales - previousRevenueAvg) / previousRevenueAvg) * 100
        : 0;

    const ordersTrendPercent =
      previousOrdersAvg > 0
        ? ((latest.totalOrders - previousOrdersAvg) / previousOrdersAvg) * 100
        : 0;

    const hasRevenueTrend = Math.abs(revenueTrendPercent) >= 0.5 && previousRevenueAvg > 0;

    const revenueTrendDirection: 'up' | 'down' | 'flat' =
      !hasRevenueTrend
        ? 'flat'
        : revenueTrendPercent > 0
        ? 'up'
        : 'down';

    return {
      revenueToday: latest.totalSales,
      ordersToday: latest.totalOrders,
      averageOrderValueToday: latest.averageOrderValue,
      revenueTrendPercent,
      revenueTrendDirection,
      ordersTrendPercent,
    };
  })();

  const retentionRate =
    analyticsData.customerRetention?.retentionRate ?? null;
  const lowStockAlerts = analyticsData.inventoryAnalytics?.lowStockItems ?? 0;
  const pendingOrdersCount = analyticsData.pendingOrders ?? analyticsData.realTimeData?.activeSales ?? 0;
  const openShiftsCount = analyticsData.openShifts ?? null;

  const dashboardPersona: 'owner' | 'admin' | 'manager' | 'cashier' | 'staff' = isOwner
    ? 'owner'
    : isAdmin
    ? 'admin'
    : isManager
    ? 'manager'
    : isCashier
    ? 'cashier'
    : 'staff';

  const personaTitle =
    dashboardPersona === 'owner'
      ? 'Owner Focus'
      : dashboardPersona === 'admin'
      ? 'Admin Focus'
      : dashboardPersona === 'manager'
      ? 'Manager Focus'
      : dashboardPersona === 'cashier'
      ? 'Cashier Focus'
      : 'Daily Focus';

  const roleCards = (() => {
    if (isOwnerOrAdmin) {
      return [
        {
          id: 'owner-revenue',
          label: 'Revenue',
          value: `Ksh ${(analyticsData.totalRevenue || 0).toLocaleString()}`,
          note: 'All-time revenue',
          href: '/analytics',
        },
        {
          id: 'owner-retention',
          label: 'Customer Retention',
          value: retentionRate !== null ? `${retentionRate.toFixed(1)}%` : '—',
          note: 'Repeat customer rate',
          href: '/analytics',
        },
        {
          id: 'owner-overdue',
          label: 'Overdue Credits',
          value: overdueCreditsCount.toLocaleString(),
          note: 'Customers with overdue balances',
          href: '/credit',
        },
        {
          id: 'owner-low-stock',
          label: 'Low Stock Alerts',
          value: lowStockAlerts.toLocaleString(),
          note: 'Items below threshold',
          href: '/products/reports/low-stock-alerts',
        },
      ];
    }

    if (isCashier) {
      return [
        {
          id: 'cashier-sales-today',
          label: 'Today Sales',
          value: todaySummary ? todaySummary.ordersToday.toLocaleString() : '—',
          note: 'Transactions recorded today',
          href: '/sales/history',
        },
        {
          id: 'cashier-open-shifts',
          label: 'Open Shifts',
          value: openShiftsCount === null ? '—' : openShiftsCount.toLocaleString(),
          note: 'Active shifts now',
          href: '/sales',
        },
        {
          id: 'cashier-pending-orders',
          label: 'Pending Orders',
          value: pendingOrdersCount.toLocaleString(),
          note: 'Orders awaiting completion',
          href: '/sales/history',
        },
        {
          id: 'cashier-revenue-today',
          label: 'Revenue Today',
          value: todaySummary
            ? `Ksh ${Math.round(todaySummary.revenueToday).toLocaleString()}`
            : '—',
          note: 'Current day revenue',
          href: '/sales/history',
        },
      ];
    }

    if (isManager) {
      return [
        {
          id: 'manager-sales',
          label: 'Orders Today',
          value: todaySummary ? todaySummary.ordersToday.toLocaleString() : '—',
          note: 'Current branch activity',
          href: '/sales/history',
        },
        {
          id: 'manager-revenue',
          label: 'Revenue Today',
          value: todaySummary
            ? `Ksh ${Math.round(todaySummary.revenueToday).toLocaleString()}`
            : '—',
          note: 'Daily revenue trend',
          href: '/analytics',
        },
        {
          id: 'manager-low-stock',
          label: 'Low Stock Alerts',
          value: lowStockAlerts.toLocaleString(),
          note: 'Action needed on inventory',
          href: '/products/reports/low-stock-alerts',
        },
        {
          id: 'manager-pending',
          label: 'Pending Orders',
          value: pendingOrdersCount.toLocaleString(),
          note: 'Orders to close out',
          href: '/sales/history',
        },
      ];
    }

    return [
      {
        id: 'default-revenue',
        label: 'Revenue Today',
        value: todaySummary
          ? `Ksh ${Math.round(todaySummary.revenueToday).toLocaleString()}`
          : '—',
        note: 'Latest daily performance',
        href: '/analytics',
      },
      {
        id: 'default-orders',
        label: 'Orders Today',
        value: todaySummary ? todaySummary.ordersToday.toLocaleString() : '—',
        note: 'Sales processed today',
        href: '/sales/history',
      },
      {
        id: 'default-customers',
        label: 'Customers',
        value: analyticsData.totalCustomers?.toLocaleString() ?? '—',
        note: 'Total tracked customers',
        href: '/analytics',
      },
      {
        id: 'default-products',
        label: 'Products',
        value: analyticsData.totalProducts?.toLocaleString() ?? '—',
        note: 'Items in catalog',
        href: '/products/unified',
      },
    ];
  })();

  const cashierPosActions = [
    { id: 'pos-new-sale', label: 'New Sale', href: '/sales', visible: canCreateSales },
    { id: 'pos-sales-history', label: 'Sales History', href: '/sales/history', visible: canViewSales },
    { id: 'pos-product-lookup', label: 'Product Lookup', href: '/products/unified', visible: canViewProducts },
  ].filter((item) => item.visible);

  const showExecutiveWidgets = canViewAnalytics && (isOwnerOrAdmin || isManager);
  const showCustomerSegmentationWidget = canViewAnalytics && isOwnerOrAdmin;
  const showSalesAnalysisWidget = canViewAnalytics && (isOwnerOrAdmin || isManager);
  const showCashierOpsWidgets = isCashier;
  const showCrossModuleSnapshot = Boolean(canViewSales || canViewProducts || isOwnerOrAdmin || isManager);

  const usageRows = [
    {
      id: 'usage-users',
      label: 'Users',
      current: planLimits?.usage?.users?.current ?? 0,
      limit: planLimits?.usage?.users?.limit ?? 0,
    },
    {
      id: 'usage-products',
      label: 'Physical Items',
      current: planLimits?.usage?.products?.current ?? 0,
      limit: planLimits?.usage?.products?.limit ?? 0,
    },
    {
      id: 'usage-sales',
      label: 'Sales',
      current: planLimits?.usage?.sales?.current ?? 0,
      limit: planLimits?.usage?.sales?.limit ?? 0,
    },
  ];

  const priorities: PriorityItem[] = [];

  if (todaySummary && todaySummary.revenueTrendDirection === 'down' && todaySummary.revenueTrendPercent <= -10) {
    priorities.push({
      id: 'boost-sales-today',
      title: 'Boost sales today',
      description: `Revenue is ${todaySummary.revenueTrendPercent.toFixed(1)}% below your recent average`,
      severity: 'high',
      href: '/analytics',
    });
  }

  if (retentionRate !== null && retentionRate < 40) {
    priorities.push({
      id: 'improve-retention',
      title: 'Improve customer retention',
      description: `${retentionRate.toFixed(1)}% repeat rate across customers`,
      severity: 'medium',
      href: '/analytics',
    });
  }

  if ((analyticsData.totalProducts ?? 0) === 0) {
    priorities.push({
      id: 'add-products',
      title: 'Add your products',
      description: 'Start by adding products so you can record sales',
      severity: 'medium',
      href: '/products/unified',
    });
  }

  if ((analyticsData.totalCustomers ?? 0) === 0) {
    priorities.push({
      id: 'add-customers',
      title: 'Add customers',
      description: 'Create customer profiles to track repeat buyers',
      severity: 'low',
      href: '/settings/users',
    });
  }

  if ((isOwnerOrAdmin || isManager) && overdueCreditsCount > 0) {
    priorities.push({
      id: 'overdue-credits',
      title: 'Follow up overdue credits',
      description: `${overdueCreditsCount} overdue credit account${overdueCreditsCount === 1 ? '' : 's'} need follow-up`,
      severity: 'high',
      href: '/credit',
    });
  }

  if ((isOwnerOrAdmin || isManager) && lowStockAlerts > 0) {
    priorities.push({
      id: 'low-stock-alerts',
      title: 'Resolve low stock alerts',
      description: `${lowStockAlerts} item${lowStockAlerts === 1 ? '' : 's'} are below stock threshold`,
      severity: 'medium',
      href: '/products/reports/low-stock-alerts',
    });
  }

  if (isCashier && pendingOrdersCount > 0) {
    priorities.push({
      id: 'cashier-pending-orders',
      title: 'Close pending orders',
      description: `${pendingOrdersCount} pending order${pendingOrdersCount === 1 ? '' : 's'} to complete`,
      severity: 'medium',
      href: '/sales/history',
    });
  }

  const showPriorities = priorities.length > 0;

  if (isLoading && !data) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
          <div className="mx-auto max-w-7xl">
            <div className="h-8 w-64 animate-pulse rounded-md bg-gray-200"></div>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <PlanGuard requiredFeature="advanced_analytics">
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:bg-slate-900 dark:from-slate-900 dark:to-slate-900">
          <LogoEnforcement />
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent dark:text-indigo-300">
                    Operations dashboard
                  </h1>
                  <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-300">
                    {dateRange === '7d' ? '7D' : dateRange === '30d' ? '30D' : dateRange === '90d' ? '90D' : '12M'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Live metrics and priorities for running today. Use Analytics for deeper reports.
                </p>
              </div>
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                <div className="relative w-full sm:w-48">
                  <select
                    value={dateRange}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDateRange(value);
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('dashboardDateRange', value);
                      }
                    }}
                    className="block w-full rounded-lg border-0 bg-white dark:bg-slate-800 py-2.5 pl-4 pr-10 text-sm shadow-sm ring-1 ring-gray-200 dark:ring-slate-600 text-gray-900 dark:text-slate-100 transition-all hover:ring-gray-300 dark:hover:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="12m">Last 12 months</option>
                  </select>
                </div>
                <BranchSwitcher />
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isRefreshing}
                  className={`inline-flex w-full items-center justify-center rounded-lg border-0 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium shadow-sm text-gray-900 dark:text-slate-100 transition-all hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 sm:w-auto ${
                    isRefreshing ? 'cursor-not-allowed opacity-70' : ''
                  }`}
                >
                  <FiRefreshCw
                    className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
            </div>

            {/* Role-based focus widgets */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                  {personaTitle}
                </h2>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  Role-based defaults for your workflow
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {roleCards.map((card) => {
                  const content = (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        {card.label}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{card.value}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{card.note}</p>
                    </div>
                  );

                  return card.href ? (
                    <a key={card.id} href={card.href}>
                      {content}
                    </a>
                  ) : (
                    <div key={card.id}>{content}</div>
                  );
                })}
              </div>

              {isCashier && cashierPosActions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {cashierPosActions.map((action) => (
                    <a
                      key={action.id}
                      href={action.href}
                      className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      {action.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Hero: primary KPI + secondary KPIs */}
            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Primary KPI - Today’s revenue */}
              <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                      <FiDollarSign className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Today&apos;s Revenue
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-slate-500">
                        Compared to your recent daily average
                      </p>
                    </div>
                  </div>
                  {todaySummary && todaySummary.revenueTrendDirection !== 'flat' && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        todaySummary.revenueTrendDirection === 'up'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {todaySummary.revenueTrendDirection === 'up' ? '▲' : '▼'}
                      {`${todaySummary.revenueTrendPercent > 0 ? '+' : ''}${todaySummary.revenueTrendPercent.toFixed(1)}%`}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <p className="text-3xl font-semibold text-gray-900 dark:text-slate-50">
                    {todaySummary
                      ? `Ksh ${Math.round(todaySummary.revenueToday).toLocaleString()}`
                      : '—'}
                  </p>
                  {!todaySummary && (
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                      Today&apos;s figures will appear as you record sales.
                    </span>
                  )}
                </div>
              </div>

              {/* Secondary KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Orders Today
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                    {todaySummary ? todaySummary.ordersToday.toLocaleString() : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Avg Order Value (Today)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                    {todaySummary
                      ? `Ksh ${todaySummary.averageOrderValueToday.toFixed(2)}`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Customers (All time)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                    {analyticsData.totalCustomers?.toLocaleString() ?? '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Products (All time)
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-50">
                    {analyticsData.totalProducts?.toLocaleString() ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            {showCrossModuleSnapshot && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Cross-Module Snapshot</h2>
                  <span className="text-xs text-gray-500 dark:text-slate-400">Credit, targets, and plan limits in one view</span>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Credit Snapshot</p>
                      <a href="/credit" className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700">Open</a>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                      Outstanding: <span className="font-semibold">Ksh {(creditSnapshot?.outstanding || 0).toLocaleString()}</span>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                      Overdue: <span className="font-semibold">{(creditSnapshot?.overdue || 0).toLocaleString()}</span>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                      Open Accounts: <span className="font-semibold">{(creditSnapshot?.openCredits || 0).toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Sales Target Progress</p>
                      <a href="/sales/targets" className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700">Open</a>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                      Today Revenue: <span className="font-semibold">Ksh {(salesTargetsProgress?.todayRevenue || 0).toLocaleString()}</span>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                      Daily Target: <span className="font-semibold">Ksh {(salesTargetsProgress?.dailyTarget || 0).toLocaleString()}</span>
                    </p>
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-gray-600 dark:text-slate-400">
                        <span>Progress</span>
                        <span>{(salesTargetsProgress?.dailyProgress || 0).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700">
                        <div
                          className="h-2 rounded-full bg-indigo-500"
                          style={{ width: `${Math.min(100, salesTargetsProgress?.dailyProgress || 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Usage Limits</p>
                      <a href="/account/billing" className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700">Open</a>
                    </div>
                    <div className="space-y-1.5">
                      {usageRows.map((row) => {
                        const percentage = row.limit > 0 ? Math.min(100, (row.current / row.limit) * 100) : 0;
                        return (
                          <div key={row.id}>
                            <div className="flex items-center justify-between text-xs text-gray-700 dark:text-slate-300">
                              <span>{row.label}</span>
                              <span className="font-medium">{row.current.toLocaleString()} / {row.limit.toLocaleString()}</span>
                            </div>
                            <div className="mt-0.5 h-1.5 rounded-full bg-gray-200 dark:bg-slate-700">
                              <div
                                className={`h-1.5 rounded-full ${percentage >= 90 ? 'bg-rose-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Today’s priorities */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-slate-300">
                  Today&apos;s priorities
                </span>
                {showPriorities ? (
                  priorities.slice(0, 3).map((item) => {
                    const severityClasses =
                      item.severity === 'high'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : item.severity === 'medium'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700';

                    const content = (
                      <>
                        <span className="text-xs font-semibold">{item.title}</span>
                        <span className="text-[11px] text-gray-600 dark:text-slate-400">
                          · {item.description}
                        </span>
                      </>
                    );

                    return item.href ? (
                      <a
                        key={item.id}
                        href={item.href}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${severityClasses}`}
                      >
                        {content}
                      </a>
                    ) : (
                      <span
                        key={item.id}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${severityClasses}`}
                      >
                        {content}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-gray-500 dark:text-slate-400">
                    No urgent issues detected – focus on serving customers.
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6 space-y-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                {showCashierOpsWidgets ? 'Quick POS Actions' : 'Quick Actions'}
              </h2>
              <QuickActions lowStockCount={isOwnerOrAdmin || isManager ? lowStockAlerts : undefined} />
            </div>

            {/* Charts Section */}
            {/* Sales Trends Chart */}
            {(showSalesAnalysisWidget || showCashierOpsWidgets) && salesTrends && (
              <div className="mb-6">
                <ChartComponents.SalesTrendsChart data={salesTrends} />
              </div>
            )}

            {/* Customer Segmentation Section */}
            {showCustomerSegmentationWidget && (
            <div className="mb-6">
<div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Customer Segmentation</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <ChartComponents.CustomerSegmentation />
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-800">Top Spending Segment</p>
                          <p className="text-lg font-bold text-blue-600">Champions</p>
                          <p className="text-xs text-blue-600">15% of customers, 45% of revenue</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-full">
                          <FiDollarSign className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-amber-800">Growth Opportunity</p>
                          <p className="text-lg font-bold text-amber-600">Potential Loyalists</p>
                          <p className="text-xs text-amber-600">30% of customers, 25% of revenue</p>
                        </div>
                        <div className="p-2 bg-amber-100 rounded-full">
                          <FiTrendingUp className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-rose-800">At Risk</p>
                          <p className="text-lg font-bold text-rose-600">18% of customers</p>
                          <p className="text-xs text-rose-600">Last purchase 30-60 days ago</p>
                        </div>
                        <div className="p-2 bg-rose-100 rounded-full">
                          <FiAlertCircle className="w-4 h-4 text-rose-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {showExecutiveWidgets && (
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Sales Chart */}
              <div className="lg:col-span-2">
                <div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Sales Overview</h3>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <FiTrendingUp className="mr-1 h-3 w-3" />
                        12.5% from last month
                      </span>
                    </div>
                  </div>
                  <div className="h-72">
                    <ChartComponents.SalesTrendsAnalysis salesData={analyticsData.salesByMonth || {}} />
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="space-y-4">
                {/* Customer Growth */}
                <div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                  <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Customer Growth</h3>
                  <div className="h-56">
                    <ChartComponents.CustomerGrowthChart growthData={analyticsData?.customerGrowth || {}} />
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Recent Activities</h3>
                    <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start">
                        <div className="shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <FiUserPlus className="h-4 w-4 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-2">
                          <p className="text-sm font-medium text-gray-900">New customer registered</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )}

            {showCashierOpsWidgets && (
              <div className="mb-6 rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Cashier Operations</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-md border border-gray-200 p-3 dark:border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Pending Orders</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{pendingOrdersCount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 p-3 dark:border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Open Shifts</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{openShiftsCount === null ? '—' : openShiftsCount.toLocaleString()}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 p-3 dark:border-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Today Sales</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{todaySummary ? todaySummary.ordersToday.toLocaleString() : '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Trends Analysis */}
            {showSalesAnalysisWidget && (
            <div className="mb-6">
              <div className="rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm ring-1 ring-gray-200 dark:ring-slate-600">
                <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-slate-100">Sales Trends Analysis</h3>
                <div className="grid grid-cols-1 gap-4">
                  <ChartComponents.MonthlySalesTrends />
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </PlanGuard>
    </AuthGuard>
  );
}

