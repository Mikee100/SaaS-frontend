"use client";

import React from "react";
import {
  FiPlusCircle,
  FiUserPlus,
  FiFileText,
  FiShoppingCart,
  FiPackage,
  FiTag,
  FiBarChart2,
  FiSettings,
} from "react-icons/fi";
import { IconType } from 'react-icons';
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserContext";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useQuery } from '@tanstack/react-query';
import { getEffectiveTenantManifest } from '@/utils/manifest/manifestClient';

type QuickActionsProps = {
  lowStockCount?: number;
};

type QuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactElement;
  color: string;
};

function iconForActionPath(path: string): IconType {
  const normalized = String(path || '').toLowerCase();
  if (normalized.startsWith('/sales')) return FiShoppingCart;
  if (normalized.startsWith('/products') || normalized.startsWith('/inventory')) return FiPackage;
  if (normalized.startsWith('/settings/users')) return FiUserPlus;
  if (normalized.startsWith('/settings')) return FiSettings;
  if (normalized.startsWith('/analytics') || normalized.startsWith('/reports')) return FiBarChart2;
  if (normalized.startsWith('/account') || normalized.startsWith('/billing')) return FiTag;
  return FiFileText;
}

function colorForActionPath(path: string): string {
  const normalized = String(path || '').toLowerCase();
  if (normalized.startsWith('/sales')) return 'bg-blue-50 text-blue-700 hover:bg-blue-100';
  if (normalized.startsWith('/products') || normalized.startsWith('/inventory')) {
    return 'text-emerald-700 hover:border-emerald-300';
  }
  if (normalized.startsWith('/analytics') || normalized.startsWith('/reports')) {
    return 'text-purple-700 hover:border-purple-300';
  }
  if (normalized.startsWith('/settings')) return 'text-slate-700 hover:border-slate-300';
  return 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100';
}

export default function QuickActions({ lowStockCount }: QuickActionsProps) {
  const router = useRouter();
  const { user } = useUser();
  const { data: planLimits } = usePlanLimits();

  const { data: manifestPayload } = useQuery({
    queryKey: ['tenant-effective-manifest', user?.tenantId, user?.id],
    enabled: Boolean(user?.tenantId),
    queryFn: getEffectiveTenantManifest,
    staleTime: 5 * 60 * 1000,
  });

  const roles = user?.roles || [];
  const isOwnerOrAdmin =
    user?.isSuperadmin ||
    roles.includes("owner") ||
    roles.includes("admin");
  const isCashierOrStaff =
    roles.includes("cashier") || roles.includes("staff");

  const nearingAnyLimit = (() => {
    if (!planLimits?.usage) return false;
    return Object.values(planLimits.usage).some(({ current, limit }) => {
      if (!limit || limit <= 0) return false;
      return current / limit >= 0.9;
    });
  })();

  const baseActions: QuickAction[] = [
    {
      id: "today-sales",
      label: "Today’s Sales",
      description: "View today’s transactions and monitor performance.",
      href: "/sales/history",
      icon: <FiBarChart2 className="h-5 w-5" />,
      color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    },
  ];

  const ownerActions: QuickAction[] = [
    {
      id: "add-product",
      label: "Add Product",
      description: "Create a new product in your catalog.",
      href: "/products/unified",
      icon: <FiPlusCircle className="h-5 w-5" />,
      color: "text-emerald-700 hover:border-emerald-300",
    },
    {
      id: "invite-user",
      label: "Invite User",
      description: "Add staff or managers to your account.",
      href: "/settings/users",
      icon: <FiUserPlus className="h-5 w-5" />,
      color: "text-amber-700 hover:border-amber-300",
    },
    {
      id: "configure-branches",
      label: "Configure Branches",
      description: "Add or update your business branches.",
      href: "/settings/branches",
      icon: <FiSettings className="h-5 w-5" />,
      color: "text-slate-700 hover:border-slate-300",
    },
    {
      id: "view-analytics",
      label: "View Analytics",
      description: "Open analytics to explore trends and insights.",
      href: "/analytics",
      icon: <FiFileText className="h-5 w-5" />,
      color: "text-purple-700 hover:border-purple-300",
    },
  ];

  const contextActions: QuickAction[] = [];

  const manifestQuickActions: QuickAction[] = React.useMemo(() => {
    const quickActions = manifestPayload?.manifest?.quickActions;
    if (!Array.isArray(quickActions) || quickActions.length === 0) {
      return [];
    }

    return quickActions
      .filter((action) => {
        const key = String(action.key || '').toLowerCase();
        const label = String(action.label || '').toLowerCase();
        const path = String(action.path || '').toLowerCase();
        return !(key === 'new_sale' || label === 'new sale' || path === '/sales');
      })
      .filter((action) => action.actionType === 'navigate' && typeof action.path === 'string' && action.path.length > 0)
      .map((action) => {
        const Icon = iconForActionPath(action.path || '');
        return {
          id: action.key,
          label: action.label,
          description: `Open ${action.label} workspace.`,
          href: action.path || '/dashboard',
          icon: <Icon className="h-5 w-5" />,
          color: colorForActionPath(action.path || ''),
        };
      });
  }, [manifestPayload]);

  if (typeof lowStockCount === "number" && lowStockCount > 0) {
    contextActions.push({
      id: "reorder-stock",
      label: "Reorder Stock",
      description: `${lowStockCount} item${
        lowStockCount === 1 ? "" : "s"
      } below minimum level.`,
      href: "/products/reports/low-stock-alerts",
      icon: <FiPackage className="h-5 w-5" />,
      color: "text-rose-700 hover:border-rose-300",
    });
  }

  if (nearingAnyLimit && isOwnerOrAdmin) {
    contextActions.push({
      id: "review-plan",
      label: "Review Plan",
      description: "You’re close to a plan limit. Review or upgrade.",
      href: "/settings/billing/subscription",
      icon: <FiTag className="h-5 w-5" />,
      color: "text-pink-700 hover:border-pink-300",
    });
  }

  let actions: QuickAction[] = [...baseActions];

  if (manifestQuickActions.length > 0) {
    actions = [...manifestQuickActions];
  }

  if (manifestQuickActions.length === 0 && isOwnerOrAdmin) {
    actions = actions.concat(ownerActions);
  } else if (manifestQuickActions.length === 0 && isCashierOrStaff) {
    // Cashier/staff: keep base actions, optionally add inventory access
    actions.push({
      id: "manage-inventory",
      label: "Manage Inventory",
      description: "Check product availability and stock levels.",
      href: "/products/unified",
      icon: <FiPackage className="h-5 w-5" />,
      color: "text-emerald-700 hover:border-emerald-300",
    });
  }

  actions = actions.concat(contextActions);

  // Deduplicate by id in case of overlaps
  const uniqueActions = Array.from(
    new Map(actions.map((a) => [a.id, a])).values()
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {uniqueActions.map((action) => (
        <button
          key={action.id}
          onClick={() => router.push(action.href)}
          className={`flex flex-col items-start justify-between rounded-lg border border-gray-200 bg-white p-3 text-left text-gray-800 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 ${action.color}`}
        >
          <div className="flex items-center justify-center rounded-md bg-white/70 p-2 shadow-sm dark:bg-slate-800/60">
            {action.icon}
          </div>
          <div className="mt-2 space-y-0.5">
            <p className="text-sm font-semibold">{action.label}</p>
            <p className="text-[11px] text-gray-600 dark:text-slate-400">
              {action.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
