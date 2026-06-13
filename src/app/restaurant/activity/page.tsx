"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/utils/api";
import { useTenant } from "@/hooks/useTenant";
import { useBranches } from "@/hooks/useBranches";
import { useUser } from "@/components/UserContext";

type RestaurantActivityEvent = {
  id: string;
  tenantId: string;
  branchId: string;
  orderId?: string | null;
  actorUserId?: string | null;
  actionType: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  details?: Record<string, unknown>;
  createdAt: string;
  actor?: {
    id: string;
    name?: string;
    email?: string;
  } | null;
};

type TenantRestaurantData = {
  restaurantFeaturesEnabled?: boolean;
  businessType?: string;
};

function formatAction(actionType: string): string {
  return String(actionType || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function RestaurantActivityPage() {
  const { user, loading: userLoading } = useUser();
  const { data: tenantData, isLoading: tenantLoading } = useTenant();
  const { data: branches = [], isLoading: branchesLoading } = useBranches();

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [actionType, setActionType] = useState("");
  const [limit, setLimit] = useState(100);

  const normalizedRoles = useMemo(
    () => (Array.isArray(user?.roles) ? user.roles.map((role) => String(role || "").toLowerCase()) : []),
    [user?.roles],
  );

  const canViewActivity =
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

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (actorUserId.trim()) params.set("actorUserId", actorUserId.trim());
    if (orderId.trim()) params.set("orderId", orderId.trim());
    if (actionType.trim()) params.set("actionType", actionType.trim());
    params.set("limit", String(limit));
    return params.toString();
  }, [from, to, actorUserId, orderId, actionType, limit]);

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ["restaurant", "activity", selectedBranchId, queryString],
    queryFn: async () => {
      if (!selectedBranchId) return [] as RestaurantActivityEvent[];
      const result = await apiGet<RestaurantActivityEvent[]>(
        `/restaurant/activity?${queryString}`,
        { "x-branch-id": selectedBranchId },
      );
      return Array.isArray(result) ? result : [];
    },
    enabled: canViewActivity && isRestaurantTenant && !!selectedBranchId,
    staleTime: 30000,
    refetchInterval: 15000,
  });

  if (userLoading || tenantLoading || branchesLoading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Restaurant Activity</h1>
        <p className="mt-3 text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isRestaurantTenant) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Restaurant Activity</h1>
        <p className="mt-3 text-sm text-gray-600">Restaurant add-on is not enabled for this tenant.</p>
      </div>
    );
  }

  if (!canViewActivity) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-900">Restaurant Activity</h1>
        <p className="mt-3 text-sm text-gray-600">Only owner/admin/manager roles can view this page.</p>
      </div>
    );
  }

  const typedError = error as { message?: string } | null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Restaurant Activity</h1>
          <p className="text-sm text-gray-600">Track who created orders, updated statuses, and completed checkout.</p>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
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

          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Actor user ID"
            value={actorUserId}
            onChange={(e) => setActorUserId(e.target.value)}
          />

          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />

          <input
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Action type"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="text-sm text-gray-600" htmlFor="limit">Limit</label>
          <input
            id="limit"
            type="number"
            min={1}
            max={500}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 100)))}
          />
        </div>
      </div>

      {typedError?.message && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {typedError.message}
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={6}>Loading activity...</td>
              </tr>
            )}

            {!isLoading && events.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={6}>No activity found.</td>
              </tr>
            )}

            {!isLoading && events.map((event) => {
              const details = event.details || {};
              const actorName =
                event.actor?.name ||
                event.actor?.email ||
                (typeof details.actorName === "string" ? details.actorName : "") ||
                event.actorUserId ||
                "System";

              const summary =
                (typeof details.voidReason === "string" && details.voidReason.trim())
                  ? `Reason: ${details.voidReason}`
                  : (typeof details.paymentMethod === "string" ? `Payment: ${details.paymentMethod}` : "-");

              return (
                <tr key={event.id} className="border-t border-gray-100 align-top">
                  <td className="px-3 py-2 text-xs text-gray-600">{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">{actorName}</td>
                  <td className="px-3 py-2 text-xs font-medium">{formatAction(event.actionType)}</td>
                  <td className="px-3 py-2 text-xs">{event.orderId ? event.orderId.slice(0, 8) : "-"}</td>
                  <td className="px-3 py-2 text-xs">
                    {event.fromStatus || "-"}
                    <span className="mx-1 text-gray-400">→</span>
                    {event.toStatus || "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{summary}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
