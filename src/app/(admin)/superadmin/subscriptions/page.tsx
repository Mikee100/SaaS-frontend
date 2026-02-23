"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";
import { format } from "date-fns";
import SubscriptionDetailsModal from "@/components/SubscriptionDetailsModal";
import AssignPlanModal from "@/components/AssignPlanModal";

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  scheduledEffectiveDate?: string;
  cancelAtPeriodEnd?: boolean;
  Plan: {
    id: string;
    name: string;
    price: number;
    interval: string;
  };
  ScheduledPlan?: {
    id: string;
    name: string;
    price: number;
  } | null;
  Tenant: {
    id: string;
    name: string;
    contactEmail: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  contactEmail: string;
}

export default function SubscriptionsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"all" | "no-subscription">("all");

  const fetchSubscriptions = useCallback(async () => {
    try {
      setError(null);
      const data = await apiGet<Subscription[]>("/admin/subscriptions");
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setError("Failed to load subscriptions. Check your connection and try again.");
      setSubscriptions([]);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    try {
      const data = await apiGet<{ id: string; name: string; contactEmail: string }[]>("/admin/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch tenants:", err);
      setTenants([]);
    }
  }, []);

  useEffect(() => {
    if (user?.isSuperadmin) {
      setLoadingData(true);
      Promise.all([fetchSubscriptions(), fetchTenants()]).finally(() =>
        setLoadingData(false)
      );
    }
  }, [user?.isSuperadmin, fetchSubscriptions, fetchTenants]);

  useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const tenantIdsWithSubs = new Set(subscriptions.map((s) => s.Tenant.id));
  const tenantsWithoutSubscription = tenants.filter((t) => !tenantIdsWithSubs.has(t.id));

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const matchSearch =
      !searchTerm ||
      sub.Tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.Tenant.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.Plan.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === "all" || sub.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleViewDetails = (id: string) => {
    setSelectedSubscriptionId(id);
    setModalOpen(true);
  };

  const handleCancelScheduled = () => {
    fetchSubscriptions();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800",
      canceled: "bg-red-100 text-red-800",
      past_due: "bg-amber-100 text-amber-800",
      incomplete: "bg-slate-100 text-slate-600",
      trialing: "bg-blue-100 text-blue-800",
    };
    const s = styles[status] || "bg-slate-100 text-slate-600";
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s}`}>
        {status}
      </span>
    );
  };

  const formatPrice = (price: number, interval: string) => {
    if (interval === "yearly") return `Ksh ${price}/yr`;
    return `Ksh ${price}/mo`;
  };

  if (loading || !user) return null;

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            View and manage tenant subscriptions
          </p>
        </div>
        <button
          onClick={() => setAssignModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
        >
          Assign Plan to Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Subscriptions</p>
          <p className="text-xl font-semibold text-gray-900">{subscriptions.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-xl font-semibold text-emerald-600">
            {subscriptions.filter((s) => s.status === "active").length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Tenants Without Plan</p>
          <p className="text-xl font-semibold text-amber-600">
            {tenantsWithoutSubscription.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Tenants</p>
          <p className="text-xl font-semibold text-gray-900">{tenants.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by tenant, email, or plan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="canceled">Canceled</option>
          <option value="past_due">Past due</option>
          <option value="incomplete">Incomplete</option>
          <option value="trialing">Trialing</option>
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("all")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              viewMode === "all"
                ? "bg-slate-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => setViewMode("no-subscription")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              viewMode === "no-subscription"
                ? "bg-slate-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            No subscription ({tenantsWithoutSubscription.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loadingData ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setLoadingData(true);
                fetchSubscriptions();
              }}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : viewMode === "no-subscription" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tenantsWithoutSubscription.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      All tenants have subscriptions.
                    </td>
                  </tr>
                ) : (
                  tenantsWithoutSubscription.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{t.name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{t.contactEmail}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setAssignModalOpen(true)}
                          className="text-slate-600 hover:text-slate-800 font-medium text-sm"
                        >
                          Assign plan
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current period</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No subscriptions found.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{sub.Tenant.name}</p>
                        <p className="text-sm text-gray-500">{sub.Tenant.contactEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{sub.Plan.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatPrice(sub.Plan.price, sub.Plan.interval || "monthly")}
                        </p>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(sub.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {format(new Date(sub.currentPeriodStart), "MMM d, yyyy")} –{" "}
                        {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sub.ScheduledPlan && sub.scheduledEffectiveDate ? (
                          <span>
                            → {sub.ScheduledPlan.name} on{" "}
                            {format(new Date(sub.scheduledEffectiveDate), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleViewDetails(sub.id)}
                          className="text-slate-600 hover:text-slate-800 font-medium text-sm"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SubscriptionDetailsModal
        subscriptionId={selectedSubscriptionId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCancelScheduled={handleCancelScheduled}
      />

      <AssignPlanModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={() => {
          fetchSubscriptions();
          fetchTenants();
        }}
      />
    </main>
  );
}
