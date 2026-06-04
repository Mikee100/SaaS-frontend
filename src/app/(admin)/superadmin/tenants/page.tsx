"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, apiPost } from "@/utils/api";
import {
  FiArrowRight,
  FiDatabase,
  FiEye,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { FaTrashRestore } from "react-icons/fa";

type Tenant = {
  id: string;
  name: string;
  businessType: string;
  restaurantFeaturesEnabled?: boolean;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  userCount: number;
  productCount: number;
  salesCount: number;
};

type ClassificationOption = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
};

type DeletedTenant = {
  id: string;
  name: string;
  businessType: string;
  contactEmail: string;
  deletedAt: string;
};

type Notice =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

type SortKey = "newest" | "oldest" | "name" | "users" | "space";

type CreateTenantForm = {
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  crmPackageKey: "starter" | "growth" | "pro" | "enterprise";
};

const emptyCreateForm: CreateTenantForm = {
  name: "",
  businessType: "",
  contactEmail: "",
  contactPhone: "",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
  crmPackageKey: "starter",
};

const STORAGE_WARNING_MB = 750;
const STORAGE_FULL_MB = 1000;

export default function SuperadminTenantsPage() {
  const { user, loading, refreshUser } = useUser();
  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [spaceUsage, setSpaceUsage] = useState<Record<string, number>>({});
  const [deletedTenants, setDeletedTenants] = useState<DeletedTenant[]>([]);
  const [classifications, setClassifications] = useState<ClassificationOption[]>([]);

  const [loadingTenants, setLoadingTenants] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [loadingClassifications, setLoadingClassifications] = useState(false);

  const [notice, setNotice] = useState<Notice>(null);

  const [showDeleted, setShowDeleted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);

  const [search, setSearch] = useState("");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const [actionTenantId, setActionTenantId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateTenantForm>(emptyCreateForm);

  const [provisionModal, setProvisionModal] = useState<{
    tenantId: string;
    tenantName: string;
    businessType?: string;
    selectedClassificationId: string;
  } | null>(null);
  const [provisioningByTenant, setProvisioningByTenant] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.isSuperadmin) return;
    void refreshData(true);
  }, [user]);

  useEffect(() => {
    if (!showDeleted || !user?.isSuperadmin) return;
    void fetchDeletedTenants();
  }, [showDeleted, user]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const normalizeBusinessToken = (input?: string | null) =>
    (input ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const resolveClassificationByBusinessType = (
    businessType: string | undefined,
    options: ClassificationOption[],
  ) => {
    const normalized = normalizeBusinessToken(businessType);
    if (!normalized) return "";

    const exact = options.find(
      (c) => normalizeBusinessToken(c.slug) === normalized || normalizeBusinessToken(c.name) === normalized,
    );
    if (exact) return exact.id;

    const partial = options.find((c) => {
      const slug = normalizeBusinessToken(c.slug);
      const name = normalizeBusinessToken(c.name);
      return normalized.includes(slug) || slug.includes(normalized) || normalized.includes(name);
    });

    return partial?.id || "";
  };

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const data = (await apiGet("/admin/tenants")) as Tenant[];
      setTenants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
      setNotice({ type: "error", text: "Failed to load tenants." });
    } finally {
      setLoadingTenants(false);
    }
  };

  const fetchSpaceUsage = async () => {
    try {
      const data = (await apiGet("/admin/tenants/space-usage")) as Array<{
        tenantId: string;
        spaceUsedMB: string;
      }>;
      const map: Record<string, number> = {};
      for (const item of data || []) {
        map[item.tenantId] = Number(item.spaceUsedMB || 0);
      }
      setSpaceUsage(map);
    } catch (error) {
      console.error("Failed to fetch tenant space usage:", error);
      setSpaceUsage({});
    }
  };

  const fetchDeletedTenants = async () => {
    try {
      setLoadingDeleted(true);
      const data = (await apiGet("/admin/tenants/deleted")) as DeletedTenant[];
      setDeletedTenants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch deleted tenants:", error);
      setNotice({ type: "error", text: "Failed to load deleted tenants." });
    } finally {
      setLoadingDeleted(false);
    }
  };

  const fetchClassifications = async () => {
    try {
      setLoadingClassifications(true);
      const data = (await apiGet("/admin/classifications")) as ClassificationOption[];
      const active = Array.isArray(data) ? data.filter((c) => c.isActive !== false) : [];
      setClassifications(active);
    } catch (error) {
      console.error("Failed to fetch classifications:", error);
      setClassifications([]);
    } finally {
      setLoadingClassifications(false);
    }
  };

  const refreshData = async (initial = false) => {
    try {
      if (!initial) setRefreshing(true);
      await Promise.all([fetchTenants(), fetchSpaceUsage(), fetchClassifications()]);
    } finally {
      if (!initial) setRefreshing(false);
    }
  };

  const startImpersonate = async (tenantId: string) => {
    try {
      setActionTenantId(tenantId);
      await apiPost("/admin/impersonate/start", { tenantId });
      await refreshUser();
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to impersonate tenant:", error);
      setNotice({ type: "error", text: "Failed to start impersonation." });
    } finally {
      setActionTenantId(null);
    }
  };

  const deleteTenant = async (tenant: Tenant) => {
    const ok = window.confirm(`Delete tenant '${tenant.name}'?`);
    if (!ok) return;

    try {
      setActionTenantId(tenant.id);
      await apiDelete(`/admin/tenants/${tenant.id}`);
      setNotice({ type: "success", text: `${tenant.name} moved to deleted tenants.` });
      await fetchTenants();
      if (showDeleted) await fetchDeletedTenants();
    } catch (error) {
      console.error("Failed to delete tenant:", error);
      setNotice({ type: "error", text: "Failed to delete tenant." });
    } finally {
      setActionTenantId(null);
    }
  };

  const restoreTenant = async (tenant: DeletedTenant) => {
    try {
      setActionTenantId(tenant.id);
      await apiPost(`/admin/tenants/${tenant.id}/restore`, {});
      setNotice({ type: "success", text: `${tenant.name} restored.` });
      await Promise.all([fetchTenants(), fetchDeletedTenants()]);
    } catch (error) {
      console.error("Failed to restore tenant:", error);
      setNotice({ type: "error", text: "Failed to restore tenant." });
    } finally {
      setActionTenantId(null);
    }
  };

  const createTenant = async () => {
    try {
      setCreatingTenant(true);
      await apiPost("/admin/tenants", {
        ...createForm,
        crmEntitlements: {
          packageKey: createForm.crmPackageKey,
          source: "tenant_create",
          reason: "initial package assignment",
        },
      });
      setNotice({ type: "success", text: `${createForm.name} created.` });
      setShowCreateModal(false);
      setCreateForm(emptyCreateForm);
      await fetchTenants();
    } catch (error: any) {
      console.error("Failed to create tenant:", error);
      setNotice({ type: "error", text: error?.message || "Failed to create tenant." });
    } finally {
      setCreatingTenant(false);
    }
  };

  const openProvisionModal = async (tenant: Tenant) => {
    let options = classifications;
    if (!options.length) {
      await fetchClassifications();
      options = classifications;
    }

    const selectedClassificationId = resolveClassificationByBusinessType(tenant.businessType, options);
    setProvisionModal({
      tenantId: tenant.id,
      tenantName: tenant.name,
      businessType: tenant.businessType,
      selectedClassificationId,
    });
  };

  const setTenantProvisioning = (tenantId: string, status: boolean) => {
    setProvisioningByTenant((prev) => {
      if (!status) {
        const { [tenantId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [tenantId]: true };
    });
  };

  const assignAndProvision = async () => {
    if (!provisionModal) return;
    if (!provisionModal.selectedClassificationId) {
      setNotice({ type: "error", text: "Select a classification first." });
      return;
    }

    try {
      setTenantProvisioning(provisionModal.tenantId, true);
      const result = (await apiPost(`/admin/tenants/${provisionModal.tenantId}/classification`, {
        classificationId: provisionModal.selectedClassificationId,
        provisionDefaults: true,
      })) as {
        defaultsProvisioning?: {
          provisionedAttributes?: string[];
          allowedUnits?: string[];
          defaultUnit?: string | null;
        };
      };

      const defaults = result?.defaultsProvisioning;
      const attrs = defaults?.provisionedAttributes?.length ? defaults.provisionedAttributes.join(", ") : "none";
      const units = defaults?.allowedUnits?.length ? defaults.allowedUnits.join(", ") : "none";
      const defaultUnit = defaults?.defaultUnit || "not set";

      setNotice({
        type: "success",
        text: `${provisionModal.tenantName}: provisioned. Attrs: ${attrs}. Units: ${units}. Default: ${defaultUnit}.`,
      });
      setProvisionModal(null);
      await fetchTenants();
    } catch (error: any) {
      console.error("Failed to assign and provision:", error);
      setNotice({ type: "error", text: error?.message || "Failed to assign and provision metrics." });
    } finally {
      setTenantProvisioning(provisionModal.tenantId, false);
    }
  };

  const businessTypes = useMemo(
    () =>
      Array.from(new Set(tenants.map((t) => t.businessType).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    [tenants],
  );

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();

    let next = tenants.filter((t) => {
      if (businessTypeFilter !== "all" && t.businessType !== businessTypeFilter) return false;
      if (!query) return true;
      const haystack = `${t.name} ${t.businessType} ${t.contactEmail} ${t.contactPhone}`.toLowerCase();
      return haystack.includes(query);
    });

    next = [...next].sort((a, b) => {
      if (sortKey === "newest") return +new Date(b.createdAt) - +new Date(a.createdAt);
      if (sortKey === "oldest") return +new Date(a.createdAt) - +new Date(b.createdAt);
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "users") return b.userCount - a.userCount;
      return (spaceUsage[b.id] || 0) - (spaceUsage[a.id] || 0);
    });

    return next;
  }, [tenants, search, businessTypeFilter, sortKey, spaceUsage]);

  const stats = useMemo(() => {
    const total = tenants.length;
    const totalUsers = tenants.reduce((sum, t) => sum + (t.userCount || 0), 0);
    const totalProducts = tenants.reduce((sum, t) => sum + (t.productCount || 0), 0);
    const totalSales = tenants.reduce((sum, t) => sum + (t.salesCount || 0), 0);
    const totalSpace = Object.values(spaceUsage).reduce((sum, mb) => sum + mb, 0);
    return { total, totalUsers, totalProducts, totalSales, totalSpace };
  }, [tenants, spaceUsage]);

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 md:px-6">
      <div className="mx-auto max-w-360 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Tenant Operations</h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage tenant lifecycle, support actions, and provisioning from one compact console.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowDeleted((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium ${
                  showDeleted
                    ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                <FaTrashRestore className="h-3.5 w-3.5" />
                {showDeleted ? "Show Active" : "Show Deleted"}
              </button>
              <button
                onClick={() => void refreshData()}
                disabled={refreshing}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <FiRefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <FiPlus className="h-3.5 w-3.5" />
                New Tenant
              </button>
            </div>
          </div>
        </section>

        {notice && (
          <section
            className={`rounded-lg border px-3 py-2 text-sm ${
              notice.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-rose-300 bg-rose-50 text-rose-800"
            }`}
          >
            {notice.text}
          </section>
        )}

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Tenants</p>
            <p className="text-xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Users</p>
            <p className="text-xl font-semibold text-sky-700">{stats.totalUsers}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Products</p>
            <p className="text-xl font-semibold text-emerald-700">{stats.totalProducts}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Sales</p>
            <p className="text-xl font-semibold text-amber-700">{stats.totalSales}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">DB Space MB</p>
            <p className="text-xl font-semibold text-violet-700">{stats.totalSpace.toFixed(1)}</p>
          </div>
        </section>

        {showDeleted ? (
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Deleted Tenants</h2>
              <span className="text-xs text-slate-500">{deletedTenants.length} records</span>
            </div>

            {loadingDeleted ? (
              <p className="text-sm text-slate-600">Loading deleted tenants...</p>
            ) : deletedTenants.length === 0 ? (
              <p className="text-sm text-slate-600">No deleted tenants.</p>
            ) : (
              <div className="space-y-2">
                {deletedTenants.map((tenant) => {
                  const busy = actionTenantId === tenant.id;
                  return (
                    <div key={tenant.id} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{tenant.name}</p>
                          <p className="text-xs text-slate-600">
                            {tenant.businessType} • {tenant.contactEmail}
                          </p>
                          <p className="text-xs text-slate-500">
                            Deleted {new Date(tenant.deletedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => void restoreTenant(tenant)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <FaTrashRestore className="h-3 w-3" />
                          {busy ? "Restoring..." : "Restore"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                <div className="relative xl:col-span-2">
                  <FiSearch className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tenant, business type, email, phone"
                    className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                  />
                </div>

                <select
                  value={businessTypeFilter}
                  onChange={(e) => setBusinessTypeFilter(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                >
                  <option value="all">All Types</option>
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name A-Z</option>
                  <option value="users">Most Users</option>
                  <option value="space">Most Space</option>
                </select>

                <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-600">
                  <FiFilter className="h-3.5 w-3.5" />
                  {filteredTenants.length} of {tenants.length}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {loadingTenants ? (
                <div className="p-4 text-sm text-slate-600">Loading tenants...</div>
              ) : filteredTenants.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-600">No tenants match current filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Tenant</th>
                        <th className="px-3 py-2 font-semibold">Business</th>
                        <th className="px-3 py-2 font-semibold">Activity</th>
                        <th className="px-3 py-2 font-semibold">Storage</th>
                        <th className="px-3 py-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {filteredTenants.map((tenant) => {
                        const busy = actionTenantId === tenant.id;
                        const space = spaceUsage[tenant.id] || 0;
                        const usagePct = Math.min((space / 1000) * 100, 100);
                        const isProvisioning = !!provisioningByTenant[tenant.id];

                        return (
                          <tr key={tenant.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 align-top">
                              <p className="font-medium text-slate-900">{tenant.name}</p>
                              <p className="text-xs text-slate-500">{tenant.contactEmail}</p>
                              <p className="text-xs text-slate-500">{tenant.contactPhone || "No phone"}</p>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <p className="text-sm text-slate-800">{tenant.businessType || "Unknown"}</p>
                              <div className="mt-1">
                                <span
                                  className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${
                                    tenant.restaurantFeaturesEnabled
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                      : "border-amber-300 bg-amber-50 text-amber-800"
                                  }`}
                                >
                                  Restaurant: {tenant.restaurantFeaturesEnabled ? "On" : "Off"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                Created {new Date(tenant.createdAt).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-slate-700">
                                  <FiUsers className="h-3 w-3" /> {tenant.userCount}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-slate-700">
                                  <FiDatabase className="h-3 w-3" /> {tenant.productCount}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-slate-700">
                                  <FiShield className="h-3 w-3" /> {tenant.salesCount}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="min-w-36">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                  <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${usagePct}%`,
                                      background: usagePct > 80 ? "#f59e0b" : usagePct > 60 ? "#fbbf24" : "#10b981",
                                    }}
                                  />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">{space.toFixed(1)} MB</p>
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="flex flex-wrap gap-1">
                                <button
                                  onClick={() => router.push(`/superadmin/tenants/${tenant.id}`)}
                                  className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-100"
                                >
                                  <FiEye className="h-3.5 w-3.5" />
                                  View
                                </button>

                                <button
                                  onClick={() => void startImpersonate(tenant.id)}
                                  disabled={busy}
                                  className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <FiUser className="h-3.5 w-3.5" />
                                  {busy ? "Working..." : "Impersonate"}
                                </button>

                                <button
                                  onClick={() => void openProvisionModal(tenant)}
                                  disabled={isProvisioning || loadingClassifications}
                                  className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                                >
                                  <FiArrowRight className="h-3.5 w-3.5" />
                                  {isProvisioning ? "Provisioning..." : "Assign+Provision"}
                                </button>

                                <button
                                  onClick={() => void deleteTenant(tenant)}
                                  disabled={busy}
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                                >
                                  <FiTrash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Create Tenant</h2>
            <p className="mt-1 text-xs text-slate-600">Create tenant and owner account in one action.</p>

            <div className="mt-3 grid gap-2">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Business Name"
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                value={createForm.businessType}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, businessType: e.target.value }))}
                placeholder="Business Type"
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                value={createForm.contactEmail}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="Contact Email"
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                value={createForm.contactPhone}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="Contact Phone"
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                value={createForm.ownerName}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                placeholder="Owner Name"
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                value={createForm.ownerEmail}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                placeholder="Owner Email"
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
              <input
                value={createForm.ownerPassword}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, ownerPassword: e.target.value }))}
                placeholder="Owner Password"
                type="password"
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">CRM Package</label>
                <select
                  value={createForm.crmPackageKey}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      crmPackageKey: e.target.value as CreateTenantForm["crmPackageKey"],
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm(emptyCreateForm);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => void createTenant()}
                disabled={creatingTenant}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creatingTenant ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {provisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Assign + Provision Metrics</h3>
            <p className="mt-1 text-sm text-slate-600">
              Select classification for <span className="font-medium">{provisionModal.tenantName}</span>, then provision units and variant attributes.
            </p>

            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Business Type: <span className="font-medium">{provisionModal.businessType || "Unknown"}</span>
            </div>

            <label className="mt-3 block text-xs font-medium text-slate-700">Classification</label>
            <select
              value={provisionModal.selectedClassificationId}
              onChange={(e) =>
                setProvisionModal((prev) =>
                  prev
                    ? {
                        ...prev,
                        selectedClassificationId: e.target.value,
                      }
                    : prev,
                )
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-800"
            >
              <option value="">Select classification</option>
              {classifications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setProvisionModal(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => void assignAndProvision()}
                disabled={
                  !provisionModal.selectedClassificationId ||
                  !!provisioningByTenant[provisionModal.tenantId]
                }
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {!!provisioningByTenant[provisionModal.tenantId] ? "Provisioning..." : "Assign + Provision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
