"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { apiGet, apiPut } from '@/utils/api';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useTenant } from '@/hooks/useTenant';
import { useBillingAccessStatus } from '@/hooks/useBillingAccessStatus';
import { useUser } from '@/components/UserContext';
import BranchSwitcher from '@/components/BranchSwitcher';
import QuickActions from './QuickActions';
import { useQuery } from '@tanstack/react-query';
import {
  FiTrendingUp,
  FiDollarSign,
  FiPackage,
  FiUsers,
  FiAlertCircle,
  FiRefreshCw,
  FiShoppingCart,
  FiRepeat,
  FiBarChart2,
} from 'react-icons/fi';

// Dynamically import components with no SSR for better performance
const ChartComponents = {
  SalesTrendsAnalysis: dynamic(
    () => import('@/components/SalesTrendsAnalysis'),
    { ssr: false }
  ),
  SalesTarget: dynamic(
    () => import('@/components/SalesTarget'),
    { ssr: false }
  ),
  SimpleChart: dynamic(
    () => import('@/components/SimpleChart'),
    { ssr: false }
  ),
  BranchComparisonChart: dynamic(
    () => import('@/components/BranchComparisonChart'),
    { ssr: false }
  ),
  TopProductsChart: dynamic(
    () => import('@/components/TopProductsChart'),
    { ssr: false }
  ),
  TopProductsByProfitChart: dynamic(
    () => import('@/components/TopProductsByProfitChart'),
    { ssr: false }
  ),
  GrossProfitTrendChart: dynamic(
    () => import('@/components/GrossProfitTrendChart'),
    { ssr: false }
  ),
  SalesByHourHeatmap: dynamic(
    () => import('@/components/SalesByHourHeatmap'),
    { ssr: false }
  ),
  BranchMonthlyComparisonChart: dynamic(
    () => import('@/components/BranchMonthlyComparisonChart'),
    { ssr: false }
  )
};

const {
  SalesTarget,
  SimpleChart,
  BranchComparisonChart,
  TopProductsChart,
  TopProductsByProfitChart,
  GrossProfitTrendChart,
  SalesByHourHeatmap,
  BranchMonthlyComparisonChart,
} = ChartComponents;

interface AnalyticsData {
  totalSales?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalCustomers?: number;
  salesByMonth?: Record<string, number>;
  salesByWeek?: Record<string, number>;
  salesByDay?: Record<string, number>;
  branches?: Array<{ id: string; name: string }>;
  branchSalesByDay?: Record<string, Record<string, number>>;
  branchSalesByWeek?: Record<string, Record<string, number>>;
  branchSalesByMonth?: Record<string, Record<string, number>>;
  branchTopProducts?: Record<string, Array<{ name: string; sales: number; revenue: number; margin?: number; cost?: number }>>;
  topProducts?: Array<{ name: string; sales: number; revenue: number; margin?: number; cost?: number }>;
  grossProfitTrend?: Array<{ day: string; revenue: number; cost: number; profit: number }>;
  salesByHourHeatmap?: Array<{ dow: number; hour: number; orders: number; revenue?: number }>;
  customerSegments?: Array<{ segment: string; count: number; revenue: number }>;
  realTimeData?: {
    currentUsers: number;
    activeSales: number;
    revenueToday: number;
  };
  predictiveAnalytics?: {
    nextMonthForecast: number;
    churnRisk: number;
    growthRate: number;
  };
  inventoryAnalytics?: {
    lowStockItems: number;
    overstockItems: number;
    inventoryTurnover: number;
    stockoutRate: number;
  };
  performanceMetrics?: {
    customerLifetimeValue: number;
    customerAcquisitionCost: number;
    returnOnInvestment: number;
    netPromoterScore: number;
  };
  customerGrowth?: Record<string, number>;
  message?: string;
  recentActivity?: {
    sales?: Array<{ amount: number; customer: string; date: string }>;
    products?: Array<{ name: string; date: string }>;
  };
  customerRetention?: {
    totalCustomers: number;
    repeatCustomers: number;
    retentionRate: number;
  };
  aiSummary?: string;
  anomalies?: Array<{ date: string; value: number; anomaly: boolean }>;
  customerSegmentsAI?: Array<{
    name: string;
    total: number;
    count: number;
    last_purchase: string;
    segment_label: string;
    clv: number;
    churn_risk: number;
  }>;
  churnPrediction?: Array<{
    name: string;
    total: number;
    count: number;
    last_purchase: string;
    churn_probability: number;
    churn_risk: number;
  }>;
};

type ActionCenterItem = {
  id: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  href?: string;
  ageLabel?: string;
  slaBreached?: boolean;
  actionLabel?: string;
  actionHref?: string;
  actionType?: 'open-reorder' | 'open-branch-target-editor' | 'reconcile-failed-sync' | 'open-link';
};

type MpesaTransactionItem = {
  id: string;
  status?: string;
  createdAt?: string;
  checkoutRequestId?: string;
  checkoutRequestID?: string;
};

type CreditItem = {
  id: string;
  status?: string;
  balance?: number;
  dueDate?: string | null;
};

type SalesTargets = {
  daily: number;
  weekly: number;
  monthly: number;
};

type BranchTargetSnapshot = {
  branchId: string;
  branchName: string;
  daily: number;
  weekly: number;
  monthly: number;
  isExplicit: boolean;
};

function StatCard({ icon, label, value, trend, trendDirection, loading = false }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down';
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="adeera-card p-4 h-full">
        <div className="animate-pulse space-y-2">
          <div className="adeera-skeleton h-5 w-5 rounded-full"></div>
          <div className="adeera-skeleton h-3 rounded w-2/3"></div>
          <div className="adeera-skeleton h-6 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="adeera-card adeera-card-interactive group p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-(--adeera-surface-muted) text-(--adeera-text-muted) transition-colors duration-150 group-hover:bg-(--adeera-accent-soft) group-hover:text-(--adeera-accent)">
          {icon}
        </div>
        {trend && (
          <span
            className={`flex items-center text-[11px] font-semibold gap-1 px-2 py-1 rounded-full ${
              trendDirection === 'up'
                ? 'bg-(--adeera-success-soft) text-(--adeera-success)'
                : 'bg-(--adeera-danger-soft) text-(--adeera-danger)'
            }`}
          >
            {trendDirection === 'up' ? <FiTrendingUp className="w-3 h-3" /> : ''}
            {trend}
          </span>
        )}
      </div>
      <div>
        <span className="adeera-label">{label}</span>
        <div className="text-xl font-bold text-(--adeera-text) mt-1">{value}</div>
      </div>
    </div>
  );
}


function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} loading={true} icon={null} label="" value="" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="adeera-card adeera-skeleton p-3 h-40"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="adeera-card adeera-skeleton p-3 h-24"></div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="adeera-card adeera-skeleton p-3 h-40"></div>
          <div className="adeera-card adeera-skeleton p-3 h-40"></div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, trend }: { title: string; value: number; unit?: string; trend?: number }) {
  return (
    <div className="adeera-card adeera-card-interactive p-4">
      <p className="adeera-label mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-lg font-bold text-(--adeera-text)">
          {unit && unit === '$' ? unit : ''}{value.toLocaleString()}{unit && unit !== '$' ? ` ${unit}` : ''}
        </p>
        {trend !== undefined && (
          <span
            className={`flex items-center text-[11px] font-semibold gap-1 px-2 py-1 rounded-full ${
              trend >= 0 ? 'bg-(--adeera-success-soft) text-(--adeera-success)' : 'bg-(--adeera-danger-soft) text-(--adeera-danger)'
            }`}
          >
            {trend >= 0 ? <FiTrendingUp className="w-3 h-3" /> : ''}
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}

function formatChartData(data: Record<string, number>) {
  // Converts { "2024-06-01": 100, ... } to [{ label: "2024-06-01", value: 100 }, ...]
  return Object.entries(data)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([label, value]) => ({ label, value }));
}


import { useBranch } from '@/contexts/BranchContext';

export default function DashboardPage() {
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  const { data: planLimits, loading: limitsLoading } = usePlanLimits();
  const { user } = useUser();
  const { selectedBranchId } = useBranch();
  const { data: accessStatus, isLoading: accessStatusLoading } =
    useBillingAccessStatus();
  const isRestricted = accessStatus.restricted;
  const isAuthenticated = Boolean(user?.id);

  // Fetch stock threshold configuration
  const { data: stockConfig } = useQuery({
    queryKey: ['stockThreshold', user?.tenantId, user?.id],
    queryFn: () => apiGet<{ value?: number | string }>('/tenant/configurations/stockThreshold'),
    enabled: isAuthenticated && !isRestricted,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const stockThreshold = stockConfig?.value ? Number(stockConfig.value) : 15;
  const branchHeaders =
    selectedBranchId && selectedBranchId !== "all"
      ? { "x-branch-id": selectedBranchId }
      : undefined;

  // Fetch dashboard analytics data (branch-aware)
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'dashboard', user?.tenantId, user?.id, selectedBranchId],
    queryFn: async () => {
      const stats = await apiGet('/analytics/dashboard', branchHeaders) as AnalyticsData;
      return {
        ...stats,
        topProducts: stats.topProducts?.map((p: { name: string; sales: number; revenue: number; margin?: number; cost?: number }) => ({
          name: p.name,
          sales: p.sales,
          revenue: p.revenue,
          margin: p.margin,
          cost: p.cost
        })),
      } as AnalyticsData;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - analytics change frequently
    gcTime: 5 * 60 * 1000, // React Query v5: gcTime replaces cacheTime
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
    enabled: isAuthenticated && !isRestricted && !!selectedBranchId,
  });

  // Fetch branch monthly comparison
  const { data: branchMonthlyComparison } = useQuery({
    queryKey: ['analytics', 'branch-monthly-comparison', user?.tenantId, user?.id],
    queryFn: () => apiGet('/analytics/branch-monthly-sales-comparison') as Promise<{
      months: string[];
      branches: { branchId: string; branchName: string; data: number[] }[];
      total: number[];
    }>,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // React Query v5: gcTime replaces cacheTime
    enabled: isAuthenticated && !isRestricted,
  });

  const { data: creditSnapshot } = useQuery({
    queryKey: ['dashboard', 'home-credit-snapshot', user?.tenantId, user?.id, selectedBranchId],
    enabled: isAuthenticated && !isRestricted && Boolean(selectedBranchId),
    queryFn: async () => {
      try {
        const credits = await apiGet<CreditItem[]>('/sales/credits/all', branchHeaders);
        if (!Array.isArray(credits)) {
          return { outstanding: 0, overdue: 0, openCredits: 0, oldestOverdueDays: 0 };
        }

        const outstanding = credits.reduce((sum, credit) => sum + Number(credit.balance || 0), 0);
        const overdue = credits.filter((credit) => {
          const status = String(credit.status || '').toLowerCase();
          return status === 'overdue' && Number(credit.balance || 0) > 0;
        }).length;
        const openCredits = credits.filter((credit) => Number(credit.balance || 0) > 0).length;

        const now = Date.now();
        const overdueAges = credits
          .filter((credit) => {
            const status = String(credit.status || '').toLowerCase();
            return status === 'overdue' && Number(credit.balance || 0) > 0 && Boolean(credit.dueDate);
          })
          .map((credit) => {
            const due = Date.parse(String(credit.dueDate));
            return Number.isFinite(due) ? Math.max(0, now - due) : 0;
          });

        const oldestOverdueDays = overdueAges.length > 0
          ? Math.floor(Math.max(...overdueAges) / (1000 * 60 * 60 * 24))
          : 0;

        return { outstanding, overdue, openCredits, oldestOverdueDays };
      } catch {
        return { outstanding: 0, overdue: 0, openCredits: 0, oldestOverdueDays: 0 };
      }
    },
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
  });

  const { data: salesTargetsSnapshot } = useQuery({
    queryKey: ['dashboard', 'home-sales-target-snapshot', user?.tenantId, user?.id, selectedBranchId],
    enabled: isAuthenticated && !isRestricted && Boolean(selectedBranchId),
    queryFn: async () => {
      try {
        const [targets, dailySales] = await Promise.all([
          apiGet<SalesTargets>('/sales-targets').catch(() => ({ daily: 0, weekly: 0, monthly: 0 })),
          apiGet<Record<string, number>>('/analytics/sales/daily', branchHeaders).catch(() => ({} as Record<string, number>)),
        ]);

        const todayKey = new Date().toISOString().slice(0, 10);
        const todayRevenue = Number(dailySales[todayKey] || 0);
        const dailyTarget = Number(targets.daily || 0);
        const dailyProgress = dailyTarget > 0 ? Math.min(100, (todayRevenue / dailyTarget) * 100) : 0;

        return { todayRevenue, dailyTarget, dailyProgress };
      } catch {
        return { todayRevenue: 0, dailyTarget: 0, dailyProgress: 0 };
      }
    },
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
  });

  const { data: branchTargetsSnapshot, refetch: refetchBranchTargets } = useQuery({
    queryKey: ['dashboard', 'home-branch-targets', user?.tenantId, user?.id],
    enabled: isAuthenticated && !isRestricted,
    queryFn: async () => {
      try {
        const response = await apiGet<{ branches?: BranchTargetSnapshot[] }>('/sales-targets/branch-targets');
        return Array.isArray(response?.branches) ? response.branches : [];
      } catch {
        return [] as BranchTargetSnapshot[];
      }
    },
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
  });

  const { data: mpesaTransactions = [] } = useQuery({
    queryKey: ['dashboard', 'mpesa-transactions', user?.tenantId, user?.id],
    enabled: isAuthenticated && !isRestricted,
    queryFn: async () => {
      try {
        const response = await apiGet<{ success?: boolean; data?: MpesaTransactionItem[] }>('/mpesa/tenant/transactions');
        return Array.isArray(response?.data) ? response.data : [];
      } catch {
        return [] as MpesaTransactionItem[];
      }
    },
    staleTime: 60 * 1000,
    gcTime: 3 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
  });

  const [reorderModalOpen, setReorderModalOpen] = React.useState(false);
  const [branchTargetModalOpen, setBranchTargetModalOpen] = React.useState(false);
  const [branchTargetDrafts, setBranchTargetDrafts] = React.useState<
    Record<string, { daily: string; weekly: string; monthly: string }>
  >({});
  const [branchTargetSaveBusyById, setBranchTargetSaveBusyById] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const nextDrafts: Record<string, { daily: string; weekly: string; monthly: string }> = {};
    for (const row of branchTargetsSnapshot || []) {
      nextDrafts[row.branchId] = {
        daily: String(Number(row.daily || 0)),
        weekly: String(Number(row.weekly || 0)),
        monthly: String(Number(row.monthly || 0)),
      };
    }
    setBranchTargetDrafts(nextDrafts);
  }, [branchTargetsSnapshot]);

  const formatAgeDays = (days: number): string => {
    if (!Number.isFinite(days) || days <= 0) return 'today';
    return `${days}d`;
  };

  const saveBranchTarget = async (branchId: string) => {
    const draft = branchTargetDrafts[branchId];
    if (!draft) return;

    setBranchTargetSaveBusyById((prev) => ({ ...prev, [branchId]: true }));
    try {
      await apiPut('/sales-targets/branch-targets', {
        branchId,
        daily: Number(draft.daily || 0),
        weekly: Number(draft.weekly || 0),
        monthly: Number(draft.monthly || 0),
      });
      await refetchBranchTargets();
    } finally {
      setBranchTargetSaveBusyById((prev) => ({ ...prev, [branchId]: false }));
    }
  };

  // Compute derived data
  const salesByDay = analyticsData?.salesByDay || {};
  const salesByWeek = analyticsData?.salesByWeek || {};
  const salesByMonth = analyticsData?.salesByMonth || {};
  const lowStockProducts = (analyticsData?.topProducts || []).filter((p) => (p.sales ?? 0) < stockThreshold);

  // Calculate new metrics
  const averageOrderValue = analyticsData?.totalSales && analyticsData.totalSales > 0
    ? (analyticsData.totalRevenue || 0) / analyticsData.totalSales
    : 0;
  
  const customerRetentionRate = analyticsData?.customerRetention?.retentionRate || 0;
  
  const revenuePerCustomer = analyticsData?.totalCustomers && analyticsData.totalCustomers > 0
    ? (analyticsData.totalRevenue || 0) / analyticsData.totalCustomers
    : 0;

  // Hero metrics: "Is my business healthy today?"
  const salesByDayEntries = Object.entries(salesByDay).filter(
    ([, value]) => typeof value === 'number' && !Number.isNaN(value as number)
  ) as Array<[string, number]>;

  const sortedSalesByDay = salesByDayEntries.sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  );

  const latestDayEntry = sortedSalesByDay[sortedSalesByDay.length - 1];
  const revenueTodayFromSeries = latestDayEntry ? latestDayEntry[1] : 0;

  const revenueToday =
    analyticsData?.realTimeData?.revenueToday ??
    revenueTodayFromSeries ??
    0;

  const previous7Entries =
    sortedSalesByDay.length > 1
      ? sortedSalesByDay.slice(-8, -1)
      : [];

  const previous7Total = previous7Entries.reduce(
    (sum, [, value]) => sum + (typeof value === 'number' ? value : 0),
    0
  );

  const previous7Avg =
    previous7Entries.length > 0 ? previous7Total / previous7Entries.length : 0;

  const revenueTodayTrendPercent =
    previous7Avg > 0 ? ((revenueToday - previous7Avg) / previous7Avg) * 100 : 0;

  const hasMeaningfulTrend = Math.abs(revenueTodayTrendPercent) >= 0.5;
  const revenueTodayTrendDirection: 'up' | 'down' | 'flat' =
    !hasMeaningfulTrend || previous7Avg === 0
      ? 'flat'
      : revenueTodayTrendPercent > 0
      ? 'up'
      : 'down';

  const salesLast30Days = (() => {
    if (sortedSalesByDay.length === 0) return 0;
    const last30 = sortedSalesByDay.slice(-30);
    return last30.reduce(
      (sum, [, value]) => sum + (typeof value === 'number' ? value : 0),
      0
    );
  })();

  const lowStockCount =
    analyticsData?.inventoryAnalytics?.lowStockItems ??
    lowStockProducts.length;

  const todayKey = new Date().toISOString().slice(0, 10);
  const overdueCreditsCount = Number(creditSnapshot?.overdue || 0);
  const oldestOverdueDays = Number(creditSnapshot?.oldestOverdueDays || 0);

  const branches = analyticsData?.branches || [];
  const branchCount = branches.length;
  const globalDailyTarget = Number(salesTargetsSnapshot?.dailyTarget || 0);
  const perBranchDailyTarget = branchCount > 0 ? globalDailyTarget / branchCount : 0;
  const branchTargetsById = new Map(
    (branchTargetsSnapshot || []).map((target) => [target.branchId, Number(target.daily || 0)])
  );

  const branchesBelowTargetCount =
    (branchTargetsById.size > 0 || perBranchDailyTarget > 0)
      ? branches.filter((branch) => {
          const branchTarget =
            branchTargetsById.get(branch.id) ??
            perBranchDailyTarget;
          const branchTodaySales = Number(
            analyticsData?.branchSalesByDay?.[branch.id]?.[todayKey] || 0
          );
          return branchTarget > 0 && branchTodaySales < branchTarget;
        }).length
      : 0;

  const failedStatuses = new Set(['failed', 'cancelled', 'timeout', 'stock_unavailable']);
  const failedPaymentSyncTodayCount = mpesaTransactions.filter((tx) => {
    const status = String(tx.status || '').toLowerCase();
    const createdAt = String(tx.createdAt || '');
    return failedStatuses.has(status) && createdAt.slice(0, 10) === todayKey;
  }).length;

  const msPerDay = 1000 * 60 * 60 * 24;
  const nowTs = Date.now();

  const lowStockAgeDays = lowStockCount > 0 ? 0 : 0;

  const belowTargetAgeDays = (() => {
    if (branchesBelowTargetCount <= 0) return 0;
    return 0;
  })();

  const failedSyncAges = (mpesaTransactions || [])
    .filter((tx) => failedStatuses.has(String(tx.status || '').toLowerCase()))
    .map((tx) => Date.parse(String(tx.createdAt || '')))
    .filter((ts) => Number.isFinite(ts));

  const oldestFailedSyncDays = failedSyncAges.length > 0
    ? Math.max(0, Math.floor((nowTs - Math.min(...failedSyncAges)) / msPerDay))
    : 0;

  const stockSlaBreached = lowStockAgeDays >= 1;
  const creditSlaBreached = oldestOverdueDays >= 3;
  const targetSlaBreached = belowTargetAgeDays >= 1;
  const syncSlaBreached = oldestFailedSyncDays >= 1;

  const actionCenterItems: ActionCenterItem[] = [];

  if (lowStockCount > 0) {
    actionCenterItems.push({
      id: 'stockouts-today',
      title: 'Stockouts today',
      description: `${lowStockCount} item${lowStockCount === 1 ? '' : 's'} need immediate restock`,
      severity: lowStockCount > 10 ? 'high' : 'medium',
      href: '/products/reports/low-stock-alerts',
      ageLabel: formatAgeDays(lowStockAgeDays),
      slaBreached: stockSlaBreached,
      actionLabel: 'Reorder now',
      actionType: 'open-reorder',
    });
  }

  if (overdueCreditsCount > 0) {
    actionCenterItems.push({
      id: 'credits-overdue',
      title: 'Credits overdue',
      description: `${overdueCreditsCount} credit account${overdueCreditsCount === 1 ? '' : 's'} overdue`,
      severity: overdueCreditsCount > 10 ? 'high' : 'medium',
      href: '/credit',
      ageLabel: formatAgeDays(oldestOverdueDays),
      slaBreached: creditSlaBreached,
      actionLabel: 'Collect now',
      actionHref: '/credit?status=overdue',
      actionType: 'open-link',
    });
  }

  if (branchesBelowTargetCount > 0) {
    actionCenterItems.push({
      id: 'below-target-branches',
      title: 'Sales below target by branch',
      description: `${branchesBelowTargetCount}/${branchCount} branch${branchCount === 1 ? '' : 'es'} below today target`,
      severity: branchesBelowTargetCount >= Math.max(1, Math.ceil(branchCount / 2)) ? 'high' : 'medium',
      href: '/sales/targets',
      ageLabel: formatAgeDays(belowTargetAgeDays),
      slaBreached: targetSlaBreached,
      actionLabel: 'Edit targets',
      actionType: 'open-branch-target-editor',
    });
  }

  if (failedPaymentSyncTodayCount > 0) {
    actionCenterItems.push({
      id: 'failed-payment-sync-events',
      title: 'Failed payment sync events',
      description: `${failedPaymentSyncTodayCount} failed M-Pesa sync event${failedPaymentSyncTodayCount === 1 ? '' : 's'} today`,
      severity: failedPaymentSyncTodayCount > 3 ? 'high' : 'medium',
      href: '/mpesa-transactions',
      ageLabel: formatAgeDays(oldestFailedSyncDays),
      slaBreached: syncSlaBreached,
      actionLabel: 'Open failed syncs',
      actionHref: '/mpesa-transactions',
      actionType: 'open-link',
    });
  }

  const showActionCenter = actionCenterItems.length > 0;

  const isOwnerOrManager =
    user?.isSuperadmin ||
    user?.roles?.includes('owner') ||
    user?.roles?.includes('manager');

  const loading =
    accessStatusLoading || tenantLoading || analyticsLoading || limitsLoading;

  if (loading || limitsLoading) {
    return (
      <div className="adeera-page min-h-screen py-4 px-2 sm:px-3 lg:px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4">
            <div className="adeera-skeleton h-6 rounded w-40 mb-1"></div>
            <div className="adeera-skeleton h-3 rounded w-56"></div>
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  if (isRestricted) {
    return (
      <div className="adeera-page min-h-screen px-3 py-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-(--adeera-warning)/30 bg-(--adeera-warning-soft) p-5 shadow-sm">
            <h1 className="text-xl font-semibold text-(--adeera-text)">Subscription Access Restricted</h1>
            <p className="mt-2 text-sm text-(--adeera-text)">
              {accessStatus.reason ||
                'Your subscription is inactive. You can still log in, but business operations are paused until renewal.'}
            </p>
            {accessStatus.graceEndsAt && (
              <p className="mt-1 text-sm text-(--adeera-text)">
                Grace window ended: {new Date(accessStatus.graceEndsAt).toLocaleString()}
              </p>
            )}
            <div className="mt-4">
              <a
                href={accessStatus.renewalPath || '/account/billing'}
                className="inline-flex items-center rounded-md border border-(--adeera-warning)/40 bg-(--adeera-surface) px-4 py-2 text-sm font-semibold text-(--adeera-text) hover:bg-(--adeera-surface-muted)"
              >
                Renew Subscription
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adeera-page min-h-screen">
      <div className="max-w-5xl mx-auto px-2 sm:px-3 lg:px-4 py-4">
        {/* Header */}
        <div className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-(--adeera-text)">
              {tenant?.name || 'Business'} – Today at a glance
            </h1>
            <p className="text-(--adeera-text-muted) mt-1 text-sm">
              Is your business healthy today and do you need to act on anything right now?
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-(--adeera-text-muted)">
              <span>
                Data for your current branch
              </span>
              {isOwnerOrManager && planLimits && (
                <>
                  <span className="h-1 w-1 rounded-full bg-(--adeera-border)" />
                  <span className="font-medium">
                    Plan: {planLimits.currentPlan}
                  </span>
                  <span className="hidden sm:inline">
                    · {planLimits.usage.branches.current}/{planLimits.usage.branches.limit} branches,{" "}
                    {planLimits.usage.users.current}/{planLimits.usage.users.limit} users
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BranchSwitcher />
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg border border-(--adeera-border) bg-(--adeera-surface) p-2 text-(--adeera-text-muted) transition-colors duration-150 hover:bg-(--adeera-surface-muted) hover:text-(--adeera-text)"
              title="Refresh data"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero: primary KPI + secondary KPIs */}
        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Primary KPI */}
          <div className="adeera-card lg:col-span-2 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-(--adeera-surface-muted) text-(--adeera-text-muted)">
                  <FiTrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <p className="adeera-label">
                    Today&apos;s Revenue
                  </p>
                  <p className="text-[11px] text-(--adeera-text-muted)">
                    vs average of the last 7 days
                  </p>
                </div>
              </div>
              {hasMeaningfulTrend && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    revenueTodayTrendDirection === 'up'
                      ? 'bg-(--adeera-success-soft) text-(--adeera-success)'
                      : 'bg-(--adeera-danger-soft) text-(--adeera-danger)'
                  }`}
                >
                  {revenueTodayTrendDirection === 'up' ? '▲' : '▼'}
                  {`${revenueTodayTrendPercent > 0 ? '+' : ''}${revenueTodayTrendPercent.toFixed(1)}%`}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <p className="adeera-metric-value">
                {revenueToday > 0 ? `Ksh ${Math.round(revenueToday).toLocaleString()}` : '—'}
              </p>
              {!hasMeaningfulTrend && (
                <span className="text-xs text-(--adeera-text-muted)">
                  Trend data will appear as you record more days of sales.
                </span>
              )}
            </div>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="adeera-card p-3">
              <p className="adeera-label">
                Sales (Last 30 days)
              </p>
              <p className="mt-1 text-lg font-semibold text-(--adeera-text)">
                {salesLast30Days > 0 ? `Ksh ${Math.round(salesLast30Days).toLocaleString()}` : '—'}
              </p>
            </div>
            <div className="adeera-card p-3">
              <p className="adeera-label">
                Avg Order Value
              </p>
              <p className="mt-1 text-lg font-semibold text-(--adeera-text)">
                {averageOrderValue > 0 ? `Ksh ${averageOrderValue.toFixed(2)}` : '—'}
              </p>
            </div>
            <div className="adeera-card p-3">
              <p className="adeera-label">
                Customers
              </p>
              <p className="mt-1 text-lg font-semibold text-(--adeera-text)">
                {analyticsData?.totalCustomers?.toLocaleString() ?? '—'}
              </p>
            </div>
            <div className="adeera-card p-3">
              <p className="adeera-label">
                Low-stock Items
              </p>
              <p className="mt-1 text-lg font-semibold text-(--adeera-text)">
                {lowStockCount}
              </p>
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="mb-4 adeera-card px-3 py-2">
          <div className="flex flex-col gap-2">
            <span className="adeera-section-title">
              Action Center
            </span>
            {showActionCenter ? (
              actionCenterItems.map((item) => {
                const severityClasses =
                  item.severity === 'high'
                    ? 'border-(--adeera-danger)/30 bg-(--adeera-danger-soft)'
                    : item.severity === 'medium'
                    ? 'border-(--adeera-warning)/30 bg-(--adeera-warning-soft)'
                    : 'border-(--adeera-border) bg-(--adeera-surface-muted)';

                const slaText = item.slaBreached ? 'SLA breached' : 'Within SLA';

                const handleChipAction = async (event: React.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (item.actionType === 'open-link' && item.actionHref) {
                    window.location.href = item.actionHref;
                    return;
                  }

                  if (item.actionType === 'open-reorder') {
                    setReorderModalOpen(true);
                    return;
                  }

                  if (item.actionType === 'open-branch-target-editor') {
                    setBranchTargetModalOpen(true);
                    return;
                  }

                };

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[11px] transition-colors duration-150 ${severityClasses}`}
                  >
                    <a href={item.href || '#'} className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className={`adeera-status-dot ${
                          item.severity === 'high'
                            ? 'bg-(--adeera-danger)'
                            : item.severity === 'medium'
                            ? 'bg-(--adeera-warning)'
                            : 'bg-(--adeera-success)'
                        }`}
                      />
                      <span className="text-xs font-semibold text-(--adeera-text)">{item.title}</span>
                      <span className="truncate text-[11px] text-(--adeera-text-muted)">
                        {item.description}
                      </span>
                      {(item.ageLabel || item.slaBreached !== undefined) && (
                        <span className="rounded-md border border-(--adeera-border) bg-(--adeera-surface)/70 px-1.5 py-0.5 text-[10px] font-medium text-(--adeera-text-muted)">
                          Oldest: {item.ageLabel || 'today'} • {slaText}
                        </span>
                      )}
                    </a>
                    {item.actionLabel && (
                      <button
                        type="button"
                        onClick={handleChipAction}
                        className="shrink-0 rounded-md border border-(--adeera-border) bg-transparent px-2 py-0.5 text-[10px] font-semibold text-(--adeera-text-muted) transition-colors duration-150 hover:bg-(--adeera-surface-muted) hover:text-(--adeera-text) disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {item.actionLabel}
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-[11px] text-(--adeera-text-muted)">
                No urgent issues right now.
              </span>
            )}
          </div>
        </div>

          <div className="mb-6 adeera-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="adeera-section-title">Cross-Module Snapshot</h2>
              <span className="text-xs text-(--adeera-text-muted)">Credit, targets, and usage in one place</span>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-lg border border-(--adeera-border) bg-(--adeera-surface-muted) p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="adeera-label">Credit Snapshot</p>
                  <a href="/credit" className="text-[11px] font-medium text-(--adeera-accent) hover:opacity-85">Open</a>
                </div>
                <p className="text-sm text-(--adeera-text)">
                  Outstanding: <span className="font-semibold">Ksh {(creditSnapshot?.outstanding || 0).toLocaleString()}</span>
                </p>
                <p className="text-sm text-(--adeera-text)">
                  Overdue: <span className="font-semibold">{(creditSnapshot?.overdue || 0).toLocaleString()}</span>
                </p>
                <p className="text-sm text-(--adeera-text)">
                  Open Accounts: <span className="font-semibold">{(creditSnapshot?.openCredits || 0).toLocaleString()}</span>
                </p>
              </div>

              <div className="rounded-lg border border-(--adeera-border) bg-(--adeera-surface-muted) p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="adeera-label">Sales Target Progress</p>
                  <a href="/sales/targets" className="text-[11px] font-medium text-(--adeera-accent) hover:opacity-85">Open</a>
                </div>
                <p className="text-sm text-(--adeera-text)">
                  Today Revenue: <span className="font-semibold">Ksh {(salesTargetsSnapshot?.todayRevenue || 0).toLocaleString()}</span>
                </p>
                <p className="text-sm text-(--adeera-text)">
                  Daily Target: <span className="font-semibold">Ksh {(salesTargetsSnapshot?.dailyTarget || 0).toLocaleString()}</span>
                </p>
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-(--adeera-text-muted)">
                    <span>Progress</span>
                    <span>{(salesTargetsSnapshot?.dailyProgress || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-(--adeera-border)">
                    <div
                      className="h-2 rounded-full bg-(--adeera-accent)"
                      style={{ width: `${Math.min(100, salesTargetsSnapshot?.dailyProgress || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-(--adeera-border) bg-(--adeera-surface-muted) p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="adeera-label">Usage Limits</p>
                  <a href="/account/billing" className="text-[11px] font-medium text-(--adeera-accent) hover:opacity-85">Open</a>
                </div>
                <div className="space-y-1.5">
                  {[
                    { id: 'usage-users', label: 'Users', current: planLimits?.usage?.users?.current ?? 0, limit: planLimits?.usage?.users?.limit ?? 0 },
                    { id: 'usage-products', label: 'Physical Items', current: planLimits?.usage?.products?.current ?? 0, limit: planLimits?.usage?.products?.limit ?? 0 },
                    { id: 'usage-sales', label: 'Sales', current: planLimits?.usage?.sales?.current ?? 0, limit: planLimits?.usage?.sales?.limit ?? 0 },
                  ].map((row) => {
                    const percentage = row.limit > 0 ? Math.min(100, (row.current / row.limit) * 100) : 0;
                    return (
                      <div key={row.id}>
                        <div className="flex items-center justify-between text-xs text-(--adeera-text)">
                          <span>{row.label}</span>
                          <span className="font-medium">{row.current.toLocaleString()} / {row.limit.toLocaleString()}</span>
                        </div>
                        <div className="mt-0.5 h-1.5 rounded-full bg-(--adeera-border)">
                          <div
                            className={`h-1.5 rounded-full ${percentage >= 90 ? 'bg-(--adeera-danger)' : percentage >= 80 ? 'bg-(--adeera-warning)' : 'bg-(--adeera-success)'}`}
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

          {/* Quick Actions */}
          <div className="mb-4 space-y-2">
            <h2 className="adeera-section-title">
              Quick Actions
            </h2>
            <QuickActions lowStockCount={lowStockCount} />
          </div>

        {/* Performance */}
        <section className="mb-6">
          <h2 className="adeera-section-title mb-3">
            Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard
            icon={<FiDollarSign className="w-5 h-5" />}
            label="Total Sales (all time)"
            value={analyticsData?.totalSales?.toLocaleString() || '0'}
          />
          <StatCard
            icon={<FiTrendingUp className="w-5 h-5" />}
            label="Total Revenue (all time)"
            value={`Ksh ${analyticsData?.totalRevenue?.toLocaleString() || '0'}`}
          />
          <StatCard
            icon={<FiPackage className="w-5 h-5" />}
            label="Products"
            value={analyticsData?.totalProducts?.toLocaleString() || '0'}
          />
          <StatCard
            icon={<FiUsers className="w-5 h-5" />}
            label="Customers"
            value={analyticsData?.totalCustomers?.toLocaleString() || '0'}
          />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard
              icon={<FiShoppingCart className="w-5 h-5" />}
              label="Avg Order Value"
              value={`Ksh ${averageOrderValue.toFixed(2)}`}
            />
            <StatCard
              icon={<FiRepeat className="w-5 h-5" />}
              label="Customer Retention"
              value={`${customerRetentionRate.toFixed(1)}%`}
            />
            <StatCard
              icon={<FiBarChart2 className="w-5 h-5" />}
              label="Revenue per Customer"
              value={`Ksh ${revenuePerCustomer.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
          </div>
          </section>

          {/* Sales trends */}
          <section className="mb-6">
            <h2 className="adeera-section-title mb-3">
              Sales trends by branch
            </h2>
            {analyticsData?.branches && analyticsData.branches.length > 0 ? (
              analyticsData.branches.map((branch) => (
                <div key={branch.id} className="mb-8">
                  <h3 className="text-md font-semibold text-(--adeera-text) mb-3">{branch.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Daily Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="adeera-card adeera-card-interactive flex flex-col p-5 min-h-[240px]"
                    >
                      <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-(--adeera-text) flex items-center gap-2">
                          Daily sales
                        </span>
                        <span className="text-[10px] text-(--adeera-text-muted) bg-(--adeera-surface-muted) px-2 py-1 rounded-full">
                          {Object.keys(analyticsData.branchSalesByDay?.[branch.id] || {}).length} days
                        </span>
                      </div>
                      {analyticsData.branchSalesByDay && analyticsData.branchSalesByDay[branch.id] && Object.keys(analyticsData.branchSalesByDay[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByDay[branch.id]}
                          height={160}
                          type="line"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-(--adeera-text-muted) bg-(--adeera-surface-muted) rounded-lg">
                          No daily sales data available
                        </div>
                      )}
                    </motion.div>
                    {/* Weekly Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="adeera-card adeera-card-interactive flex flex-col p-5 min-h-[240px]"
                    >
                      <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-(--adeera-text) flex items-center gap-2">
                          Weekly sales
                        </span>
                        <span className="text-[10px] text-(--adeera-text-muted) bg-(--adeera-surface-muted) px-2 py-1 rounded-full">
                          {Object.keys(analyticsData.branchSalesByWeek?.[branch.id] || {}).length} weeks
                        </span>
                      </div>
                      {analyticsData.branchSalesByWeek && analyticsData.branchSalesByWeek[branch.id] && Object.keys(analyticsData.branchSalesByWeek[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByWeek[branch.id]}
                          height={160}
                          type="line"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-(--adeera-text-muted) bg-(--adeera-surface-muted) rounded-lg">
                          No weekly sales data available
                        </div>
                      )}
                    </motion.div>
                    {/* Monthly Sales Chart */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="adeera-card adeera-card-interactive flex flex-col p-5 min-h-[240px]"
                    >
                      <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-(--adeera-text) flex items-center gap-2">
                          Monthly sales
                        </span>
                        <span className="text-[10px] text-(--adeera-text-muted) bg-(--adeera-surface-muted) px-2 py-1 rounded-full">
                          {Object.keys(analyticsData.branchSalesByMonth?.[branch.id] || {}).length} months
                        </span>
                      </div>
                      {analyticsData.branchSalesByMonth && analyticsData.branchSalesByMonth[branch.id] && Object.keys(analyticsData.branchSalesByMonth[branch.id]).length > 0 ? (
                        <SimpleChart
                          data={analyticsData.branchSalesByMonth[branch.id]}
                          height={160}
                          type="line"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-(--adeera-text-muted) bg-(--adeera-surface-muted) rounded-lg">
                          No monthly sales data available
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback to overall sales if no branches
              <div className="mb-8">
                <h3 className="text-lg font-bold text-(--adeera-text) mb-4">Overall Sales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Daily Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="adeera-card adeera-card-interactive flex flex-col p-5 min-h-[240px]"
                  >
                    <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-(--adeera-text) flex items-center gap-2">
                          Daily sales
                        </span>
                        <span className="text-[10px] text-(--adeera-text-muted) bg-(--adeera-surface-muted) px-2 py-1 rounded-full">
                        {Object.keys(salesByDay).length} days
                      </span>
                    </div>
                    {Object.keys(salesByDay).length > 0 ? (
                      <SimpleChart
                        data={salesByDay}
                        height={160}
                        type="line"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-(--adeera-text-muted) bg-(--adeera-surface-muted) rounded-lg">
                        No daily sales data available
                      </div>
                    )}
                  </motion.div>
                  {/* Weekly Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="adeera-card adeera-card-interactive flex flex-col p-5 min-h-[240px]"
                  >
                    <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-(--adeera-text) flex items-center gap-2">
                          Weekly sales
                        </span>
                        <span className="text-[10px] text-(--adeera-text-muted) bg-(--adeera-surface-muted) px-2 py-1 rounded-full">
                        {Object.keys(salesByWeek).length} weeks
                      </span>
                    </div>
                    {Object.keys(salesByWeek).length > 0 ? (
                      <SimpleChart
                        data={salesByWeek}
                        height={160}
                        type="line"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-(--adeera-text-muted) bg-(--adeera-surface-muted) rounded-lg">
                        No weekly sales data available
                      </div>
                    )}
                  </motion.div>
                  {/* Monthly Sales Chart */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="adeera-card adeera-card-interactive flex flex-col p-5 min-h-[240px]"
                  >
                    <div className="flex items-center justify-between mb-3">
<span className="text-sm font-semibold text-(--adeera-text) flex items-center gap-2">
                          Monthly sales
                        </span>
                        <span className="text-[10px] text-(--adeera-text-muted) bg-(--adeera-surface-muted) px-2 py-1 rounded-full">
                        {Object.keys(salesByMonth).length} months
                      </span>
                    </div>
                    {Object.keys(salesByMonth).length > 0 ? (
                      <SimpleChart
                        data={salesByMonth}
                        height={160}
                        type="line"
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-(--adeera-text-muted) bg-(--adeera-surface-muted) rounded-lg">
                        No monthly sales data available
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </section>

          {/* Inventory & risk */}
          <section className="mb-6">
            <h2 className="adeera-section-title mb-3">
              Inventory & risk
            </h2>
          {analyticsData?.inventoryAnalytics && (
            <div className="adeera-card p-5 mb-4">
              <h3 className="text-base font-semibold text-(--adeera-text) mb-4">
                Inventory overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  title="Low Stock Items"
                  value={analyticsData.inventoryAnalytics.lowStockItems}
                />
                <MetricCard
                  title="Overstock Items"
                  value={analyticsData.inventoryAnalytics.overstockItems}
                />
                <MetricCard
                  title="Inventory Turnover"
                  value={analyticsData.inventoryAnalytics.inventoryTurnover}
                />
                <MetricCard
                  title="Stockout Rate"
                  value={Math.round(analyticsData.inventoryAnalytics.stockoutRate * 100)}
                  unit="%"
                />
              </div>
            </div>
          )}
          <div className="mb-6">
            <SalesTarget
              currentRevenue={analyticsData?.totalRevenue || 0}
              totalSales={analyticsData?.totalSales || 0}
              filteredSales={analyticsData?.recentActivity?.sales || []}
            />
          </div>

          {/* Best performing products/meals */}
          {analyticsData?.topProducts && analyticsData.topProducts.length > 0 && (
            <div className="mb-6">
              <TopProductsChart
                products={analyticsData.topProducts.map((product) => ({
                  name: product.name,
                  sales: product.sales,
                }))}
              />
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <GrossProfitTrendChart data={analyticsData?.grossProfitTrend || []} />
            <TopProductsByProfitChart products={analyticsData?.topProducts || []} />
          </div>

          <div className="mb-6">
            <SalesByHourHeatmap
              data={analyticsData?.salesByHourHeatmap || []}
              scopeLabel={selectedBranchId && selectedBranchId !== 'all' ? 'Current branch' : 'All branches'}
            />
          </div>

          {/* Branch Top Products Section */}
          {analyticsData?.branches && analyticsData.branches.length > 0 && analyticsData.branchTopProducts && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-(--adeera-text) mb-4">
                Top products by branch
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analyticsData.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="adeera-card adeera-card-interactive p-5"
                  >
                    <h3 className="text-lg font-bold text-(--adeera-text) mb-4 pb-2 border-b border-(--adeera-border)">{branch.name}</h3>
                    {analyticsData.branchTopProducts?.[branch.id] && analyticsData.branchTopProducts[branch.id].length > 0 ? (
                      <div className="space-y-3">
                        {analyticsData.branchTopProducts[branch.id].slice(0, 3).map((product, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-(--adeera-border) bg-(--adeera-surface) transition-shadow hover:shadow-sm">
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-(--adeera-text) mb-1">{product.name}</div>
                              <div className="text-xs text-(--adeera-text-muted) flex items-center gap-2">
                                <span>{product.sales} units sold</span>
                                {product.margin !== undefined && (
                                  <span className="text-[10px] font-medium text-(--adeera-text-muted)">
                                    {(product.margin * 100).toFixed(1)}% margin
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-base font-bold text-(--adeera-text)">Ksh {product.revenue.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-(--adeera-text-muted) text-center py-8 bg-(--adeera-surface-muted) rounded-lg">No product data available</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branch Comparison Section */}
          {analyticsData?.branches && analyticsData.branches.length > 1 && (
            <div className="mb-4">
              <h2 className="adeera-section-title mb-3">Branch comparison</h2>
              <div className="adeera-card p-4">
                <BranchComparisonChart
                  branchData={analyticsData.branches.map(branch => ({
                    branchName: branch.name,
                    dailySales: Object.values(analyticsData.branchSalesByDay?.[branch.id] || {}).reduce((sum, val) => sum + val, 0),
                    weeklySales: Object.values(analyticsData.branchSalesByWeek?.[branch.id] || {}).reduce((sum, val) => sum + val, 0),
                    monthlySales: Object.values(analyticsData.branchSalesByMonth?.[branch.id] || {}).reduce((sum, val) => sum + val, 0),
                  }))}
                  height={300}
                />
              </div>
            </div>
          )}

          {/* Branch Monthly Sales Comparison Section */}
          {branchMonthlyComparison && branchMonthlyComparison.months && branchMonthlyComparison.months.length > 0 ? (
            <div className="mb-6">
              <div className="adeera-card p-6">
                <BranchMonthlyComparisonChart
                  data={branchMonthlyComparison}
                  height={400}
                  chartType="combined"
                />
              </div>
            </div>
          ) : null}

          {/* Low stock (under Inventory & risk) */}
              {lowStockProducts.length > 0 && (
                <div className="adeera-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiAlertCircle className="w-4 h-4 text-(--adeera-text-muted)" />
                    <h3 className="text-base font-semibold text-(--adeera-text)">Low stock</h3>
                  </div>
                  <p className="text-xs text-(--adeera-text-muted) mb-2">
                    {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} below {stockThreshold} in stock.
                  </p>
                  <div className="space-y-1">
                    {lowStockProducts.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-(--adeera-text)">
                        <span className="font-medium">{p.name}</span>
                        <span>{p.sales ?? 0} left</span>
                      </div>
                    ))}
                  </div>
                  {lowStockProducts.length > 3 && (
                    <p className="text-[10px] text-(--adeera-text-muted) mt-1">
                      +{lowStockProducts.length - 3} more with low stock
                    </p>
                  )}
                  <a
                    href="/products/reports/low-stock-alerts"
                    className="mt-3 block w-full text-center px-2 py-2 rounded-lg border border-(--adeera-border) bg-(--adeera-surface-muted) text-(--adeera-text) hover:bg-(--adeera-border)/40 text-xs font-medium transition-colors duration-150"
                  >
                    View low-stock report
                  </a>
                </div>
              )}
          </section>

          {/* Sales Targets Section */}

          {reorderModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
              <div className="w-full max-w-xl adeera-card p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-(--adeera-text)">Reorder Low-Stock Items</h3>
                  <button
                    type="button"
                    onClick={() => setReorderModalOpen(false)}
                    className="rounded-md border border-(--adeera-border) px-2 py-1 text-xs text-(--adeera-text-muted) hover:bg-(--adeera-surface-muted)"
                  >
                    Close
                  </button>
                </div>
                <p className="mb-3 text-xs text-(--adeera-text-muted)">
                  Prioritize these items now. This list shows the first low-stock products detected on your dashboard.
                </p>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-(--adeera-border) p-2">
                  {lowStockProducts.length > 0 ? (
                    lowStockProducts.slice(0, 20).map((p, idx) => (
                      <div key={`${p.name}-${idx}`} className="flex items-center justify-between rounded-md bg-(--adeera-surface-muted) px-2 py-1 text-xs">
                        <span className="font-medium text-(--adeera-text)">{p.name}</span>
                        <span className="text-(--adeera-text-muted)">{p.sales ?? 0} left</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-(--adeera-text-muted)">No low-stock items right now.</p>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <a
                    href="/products/reports/low-stock-alerts"
                    className="rounded-md border border-(--adeera-accent)/30 bg-(--adeera-accent-soft) px-3 py-1.5 text-xs font-semibold text-(--adeera-accent) hover:opacity-85"
                  >
                    Open low-stock report
                  </a>
                </div>
              </div>
            </div>
          )}

          {branchTargetModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
              <div className="w-full max-w-3xl adeera-card p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-(--adeera-text)">Quick Edit Branch Targets</h3>
                  <button
                    type="button"
                    onClick={() => setBranchTargetModalOpen(false)}
                    className="rounded-md border border-(--adeera-border) px-2 py-1 text-xs text-(--adeera-text-muted) hover:bg-(--adeera-surface-muted)"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-(--adeera-border)">
                  <table className="w-full text-xs">
                    <thead className="bg-(--adeera-surface-muted)">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-(--adeera-text-muted)">Branch</th>
                        <th className="px-2 py-2 text-left font-semibold text-(--adeera-text-muted)">Daily</th>
                        <th className="px-2 py-2 text-left font-semibold text-(--adeera-text-muted)">Weekly</th>
                        <th className="px-2 py-2 text-left font-semibold text-(--adeera-text-muted)">Monthly</th>
                        <th className="px-2 py-2 text-left font-semibold text-(--adeera-text-muted)">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(branchTargetsSnapshot || []).map((row) => {
                        const draft = branchTargetDrafts[row.branchId] || {
                          daily: String(Number(row.daily || 0)),
                          weekly: String(Number(row.weekly || 0)),
                          monthly: String(Number(row.monthly || 0)),
                        };

                        return (
                          <tr key={row.branchId} className="border-t border-(--adeera-border)">
                            <td className="px-2 py-2 text-(--adeera-text)">{row.branchName}</td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min={0}
                                value={draft.daily}
                                onChange={(event) =>
                                  setBranchTargetDrafts((prev) => ({
                                    ...prev,
                                    [row.branchId]: { ...draft, daily: event.target.value },
                                  }))
                                }
                                className="w-24 rounded border border-(--adeera-border) bg-(--adeera-surface) px-2 py-1 text-xs text-(--adeera-text)"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min={0}
                                value={draft.weekly}
                                onChange={(event) =>
                                  setBranchTargetDrafts((prev) => ({
                                    ...prev,
                                    [row.branchId]: { ...draft, weekly: event.target.value },
                                  }))
                                }
                                className="w-24 rounded border border-(--adeera-border) bg-(--adeera-surface) px-2 py-1 text-xs text-(--adeera-text)"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min={0}
                                value={draft.monthly}
                                onChange={(event) =>
                                  setBranchTargetDrafts((prev) => ({
                                    ...prev,
                                    [row.branchId]: { ...draft, monthly: event.target.value },
                                  }))
                                }
                                className="w-28 rounded border border-(--adeera-border) bg-(--adeera-surface) px-2 py-1 text-xs text-(--adeera-text)"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => saveBranchTarget(row.branchId)}
                                disabled={Boolean(branchTargetSaveBusyById[row.branchId])}
                                className="rounded-md border border-(--adeera-success)/30 bg-(--adeera-success-soft) px-2 py-1 text-[11px] font-semibold text-(--adeera-success) hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {branchTargetSaveBusyById[row.branchId] ? 'Saving...' : 'Save'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}
