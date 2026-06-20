import React from 'react';
import { BlueprintDashboardWidget } from '@/types/blueprintManifest';
import { User } from '@/components/UserContext';
import { hasPermission } from '@/utils/permissions';
import { isModuleEnabled } from '@/utils/moduleAccess';

type AnalyticsData = {
  totalSales?: number;
  totalRevenue?: number;
  totalProducts?: number;
  totalCustomers?: number;
};

type TodaySummary = {
  revenueToday: number;
  ordersToday: number;
  averageOrderValueToday: number;
};

interface BlueprintWidgetRegistryProps {
  widgets: BlueprintDashboardWidget[];
  user: User | null;
  analyticsData: AnalyticsData;
  todaySummary: TodaySummary | null;
  lowStockAlerts: number;
  pendingOrdersCount: number;
  openShiftsCount: number | null;
  retentionRate: number | null;
}

function WidgetCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{note}</p>
    </div>
  );
}

function renderWidget(
  widget: BlueprintDashboardWidget,
  payload: Omit<BlueprintWidgetRegistryProps, 'widgets' | 'user'>,
): React.ReactNode {
  switch (widget.widgetType) {
    case 'kpi.sales': {
      const value = payload.todaySummary
        ? `Ksh ${Math.round(payload.todaySummary.revenueToday).toLocaleString()}`
        : `Ksh ${(payload.analyticsData.totalRevenue || 0).toLocaleString()}`;
      return (
        <WidgetCard
          title={widget.title}
          value={value}
          note="Sales performance snapshot"
        />
      );
    }

    case 'kpi.table_turnover': {
      return (
        <WidgetCard
          title={widget.title}
          value={payload.pendingOrdersCount.toLocaleString()}
          note="Open or active order cycles"
        />
      );
    }

    case 'kpi.bookings': {
      return (
        <WidgetCard
          title={widget.title}
          value={payload.pendingOrdersCount.toLocaleString()}
          note="Upcoming or active bookings"
        />
      );
    }

    case 'kpi.staff_utilization': {
      return (
        <WidgetCard
          title={widget.title}
          value={payload.openShiftsCount === null ? '—' : payload.openShiftsCount.toLocaleString()}
          note="Active staff shifts"
        />
      );
    }

    case 'list.stock_alerts': {
      return (
        <WidgetCard
          title={widget.title}
          value={payload.lowStockAlerts.toLocaleString()}
          note="Items below stock threshold"
        />
      );
    }

    case 'list.kitchen_tickets': {
      return (
        <WidgetCard
          title={widget.title}
          value={payload.pendingOrdersCount.toLocaleString()}
          note="Kitchen queue backlog"
        />
      );
    }

    case 'chart.top_products': {
      return (
        <WidgetCard
          title={widget.title}
          value={(payload.analyticsData.totalProducts || 0).toLocaleString()}
          note="Catalog coverage for top sellers"
        />
      );
    }

    case 'chart.top_services': {
      return (
        <WidgetCard
          title={widget.title}
          value={payload.retentionRate === null ? '—' : `${payload.retentionRate.toFixed(1)}%`}
          note="Service return and retention signal"
        />
      );
    }

    default: {
      return (
        <WidgetCard
          title={widget.title}
          value="Configured"
          note={`Type: ${widget.widgetType}`}
        />
      );
    }
  }
}

export default function BlueprintWidgetRegistry({
  widgets,
  user,
  analyticsData,
  todaySummary,
  lowStockAlerts,
  pendingOrdersCount,
  openShiftsCount,
  retentionRate,
}: BlueprintWidgetRegistryProps) {
  const visibleWidgets = widgets
    .filter((widget) => {
      if (widget.requiredModule && !isModuleEnabled(user?.enabledModules, widget.requiredModule)) {
        return false;
      }

      if (widget.requiredPermission && !hasPermission(user, widget.requiredPermission)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (visibleWidgets.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-slate-400">
        No blueprint widgets are visible for this role yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visibleWidgets.map((widget) => (
        <div key={widget.key}>
          {renderWidget(widget, {
            analyticsData,
            todaySummary,
            lowStockAlerts,
            pendingOrdersCount,
            openShiftsCount,
            retentionRate,
          })}
        </div>
      ))}
    </div>
  );
}
