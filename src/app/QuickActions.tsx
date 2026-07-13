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
  tone?: 'default' | 'warning';
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
    },
  ];

  const ownerActions: QuickAction[] = [
    {
      id: "add-product",
      label: "Add Product",
      description: "Create a new product in your catalog.",
      href: "/products/unified",
      icon: <FiPlusCircle className="h-5 w-5" />,
    },
    {
      id: "invite-user",
      label: "Invite User",
      description: "Add staff or managers to your account.",
      href: "/settings/users",
      icon: <FiUserPlus className="h-5 w-5" />,
    },
    {
      id: "configure-branches",
      label: "Configure Branches",
      description: "Add or update your business branches.",
      href: "/settings/branches",
      icon: <FiSettings className="h-5 w-5" />,
    },
    {
      id: "view-analytics",
      label: "View Analytics",
      description: "Open analytics to explore trends and insights.",
      href: "/analytics",
      icon: <FiFileText className="h-5 w-5" />,
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
      tone: 'warning',
    });
  }

  if (nearingAnyLimit && isOwnerOrAdmin) {
    contextActions.push({
      id: "review-plan",
      label: "Review Plan",
      description: "You’re close to a plan limit. Review or upgrade.",
      href: "/settings/billing/subscription",
      icon: <FiTag className="h-5 w-5" />,
      tone: 'warning',
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
          className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition-all duration-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 ${
            action.tone === 'warning'
              ? 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-gray-900 dark:text-zinc-100'
              : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100'
          }`}
        >
          <div className="flex items-center justify-center rounded-md bg-gray-50 dark:bg-zinc-800/70 p-2 text-indigo-600 dark:text-indigo-400">
            {action.icon}
          </div>
          <div className="mt-2 space-y-0.5">
            <p className="text-sm font-semibold">{action.label}</p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              {action.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
