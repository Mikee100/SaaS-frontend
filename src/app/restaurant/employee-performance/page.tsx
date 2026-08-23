"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/utils/api";
import { useTenant } from "@/hooks/useTenant";
import { useBranches } from "@/hooks/useBranches";
import { useUser } from "@/components/UserContext";

type RestaurantOrder = {
  id: string;
  status: string;
  total: number;
  waiterId?: string | null;
  tableId?: string | null;
  table?: { id?: string; number?: string } | null;
  createdAt: string;
};

type StaffUser = {
  id: string;
  name?: string;
  email?: string;
};

type TenantRestaurantData = {
  restaurantFeaturesEnabled?: boolean;
  businessType?: string;
};

type WaiterStat = {
  waiterId: string;
  name: string;
  ordersCount: number;
  totalSales: number;
  tables: Set<string>;
};

const currencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
});

export default function EmployeePerformancePage() {
  const { user, loading: userLoading } = useUser();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const { data: branches = [], isLoading: branchesLoading } = useBranches();

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const normalizedRoles = useMemo(
    () => (Array.isArray(user?.roles) ? user.roles.map((role) => String(role || "").toLowerCase()) : []),
    [user?.roles],
  );

  const canViewReport =
    Boolean(user?.isSuperadmin) ||
    normalizedRoles.includes("owner") ||
    normalizedRoles.includes("admin") ||
    normalizedRoles.includes("manager");

  const isRestaurantTenant = useMemo(() => {
    const typedTenant = (tenantData || {}) as TenantRestaurantData;
    const businessType = String(typedTenant.businessType || "").toLowerCase();
    return Boolean(typedTenant.restaurantFeaturesEnabled) || businessType.includes("restaurant") || businessType.includes("hospitality");
  }, [tenantData]);

  useEffect(() => {
    if (selectedBranchId) return;

    const storedBranch = typeof window !== "undefined" ? localStorage.getItem("selectedBranchId") || "" : "";
    if (storedBranch) {
      setSelectedBranchId(storedBranch);
      return;
    }

    if (user?.branchId) {
      setSelectedBranchId(user.branchId);
      return;
    }

    if (branches.length > 0) {
      const first = branches[0] as { id?: string };
      if (first?.id) {
        setSelectedBranchId(first.id);
      }
    }
  }, [branches, selectedBranchId, user?.branchId]);

  const ordersQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("status", "Closed");
    return params.toString();
  }, [from, to]);

  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
    refetch,
  } = useQuery({
    queryKey: ["restaurant", "orders", "history", "employee-performance", selectedBranchId, ordersQueryString],
    queryFn: async () => {
      if (!selectedBranchId) return [] as RestaurantOrder[];
      const result = await apiGet<RestaurantOrder[]>(
        `/restaurant/orders/history?${ordersQueryString}`,
        { "x-branch-id": selectedBranchId },
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: canViewReport && isRestaurantTenant && !!selectedBranchId,
    staleTime: 30000,
  });

  const { data: staffUsers = [] } = useQuery({
    queryKey: ["restaurant", "staff-users", selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [] as StaffUser[];
      const result = await apiGet<StaffUser[]>("/user", { "x-branch-id": selectedBranchId });
      return Array.isArray(result) ? result : [];
    },
    enabled: canViewReport && isRestaurantTenant && !!selectedBranchId,
    staleTime: 60000,
  });

  const rows = useMemo(() => {
    const staffById = new Map(staffUsers.map((member) => [member.id, member]));
    const statsByWaiter = new Map<string, WaiterStat>();

    orders.forEach((order) => {
      const key = order.waiterId || "unassigned";
      if (!statsByWaiter.has(key)) {
        const staff = order.waiterId ? staffById.get(order.waiterId) : undefined;
        const name = staff?.name || staff?.email || (order.waiterId ? `Waiter ${order.waiterId.slice(0, 8)}` : "Unassigned");
        statsByWaiter.set(key, { waiterId: key, name, ordersCount: 0, totalSales: 0, tables: new Set() });
      }
      const entry = statsByWaiter.get(key)!;
      entry.ordersCount += 1;
      entry.totalSales += Number(order.total || 0);
      const tableLabel = order.table?.number || order.tableId;
      if (tableLabel) entry.tables.add(tableLabel);
    });

    return Array.from(statsByWaiter.values())
      .map((entry) => ({
        ...entry,
        avgOrderValue: entry.ordersCount ? entry.totalSales / entry.ordersCount : 0,
        tablesHandled: entry.tables.size,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [orders, staffUsers]);

  if (userLoading || tenantLoading || branchesLoading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Employee Performance</h1>
        <p className="mt-3 text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isRestaurantTenant) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Employee Performance</h1>
        <p className="mt-3 text-sm text-gray-600">Restaurant add-on is not enabled for this tenant.</p>
      </div>
    );
  }

  if (!canViewReport) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Employee Performance</h1>
        <p className="mt-3 text-sm text-gray-600">Only owner/admin/manager roles can view this page.</p>
      </div>
    );
  }

  const typedError = ordersError as { message?: string } | null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Employee Performance</h1>
          <p className="text-sm text-gray-600">Sales, orders, and tables handled per waiter for closed orders.</p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            <option value="">Select branch</option>
            {branches.map((branch) => {
              const typedBranch = branch as { id: string; name: string };
              return (
                <option key={typedBranch.id} value={typedBranch.id}>
                  {typedBranch.name}
                </option>
              );
            })}
          </select>

          <input
            type="datetime-local"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />

          <input
            type="datetime-local"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {typedError?.message && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {typedError.message}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {ordersLoading
          ? "Loading closed orders..."
          : `${orders.length} closed order${orders.length === 1 ? "" : "s"} in range${!from && !to ? " (all time — set a range to narrow results)" : ""}`}
      </p>

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Waiter</th>
              <th className="px-3 py-2 text-right">Orders</th>
              <th className="px-3 py-2 text-right">Sales</th>
              <th className="px-3 py-2 text-right">Avg Order</th>
              <th className="px-3 py-2 text-right">Tables Handled</th>
            </tr>
          </thead>
          <tbody>
            {!ordersLoading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={5}>No closed orders in this range.</td>
              </tr>
            )}

            {rows.map((row) => (
              <tr key={row.waiterId} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">{row.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.ordersCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">{currencyFormatter.format(row.totalSales)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{currencyFormatter.format(row.avgOrderValue)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.tablesHandled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
