"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete } from "@/utils/api";
import { FaEye, FaStore, FaReceipt, FaArrowRight } from 'react-icons/fa';

interface Tenant {
  id: string;
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  userCount: number;
  productCount: number;
  salesCount: number;
}

interface TenantSpaceUsage {
  tenantId: string;
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  spaceUsedMB: string;
  productCount: number;
}

interface TenantDetails {
  id: string;
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  userCount: number;
  productCount: number;
  salesCount: number;
  branchCount: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  inventory: {
    quantity: number;
  }[];
}

interface Transaction {
  id: string;
  total: number;
  createdAt: string;
}

export default function SuperadminTenantsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantSpaceUsage, setTenantSpaceUsage] = useState<TenantSpaceUsage[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedTenant] = useState<TenantDetails | null>(null);
  const [tenantProducts] = useState<Product[]>([]);
  const [tenantTransactions] = useState<Transaction[]>([]);
  const [showTenantModal, setShowTenantModal] = useState(false);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchTenants();
      fetchTenantSpaceUsage();
    }
  }, [user]);

 
  const handleEnterAccount = async (tenantId: string) => {
    try {
      await apiPost(`/admin/tenants/${tenantId}/switch`, {});
      // Redirect to the tenant's dashboard or main app
      router.push('/dashboard'); // Adjust this path as needed
    } catch (error) {
      console.error("Failed to switch tenant context:", error);
      alert("Failed to enter tenant account");
    }
  };

  const fetchTenants = async () => {
    try {
      setLoadingTenants(true);
      const data = await apiGet("/admin/tenants") as Tenant[];
      setTenants(data);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const fetchTenantSpaceUsage = async () => {
    try {
      const data = await apiGet("/admin/tenants/space-usage") as TenantSpaceUsage[];
      setTenantSpaceUsage(data);
    } catch (error) {
      console.error("Failed to fetch tenant space usage:", error);
    }
  };

  const handleViewTenant = (tenantId: string) => {
    router.push(`/superadmin/tenants/${tenantId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getTenantSpaceUsage = (tenantId: string) => {
    return tenantSpaceUsage.find(usage => usage.tenantId === tenantId);
  };

  const renderSpaceUsageBar = (spaceUsedMB: string) => {
    return (
      <div className="mt-1 w-full">
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          {/* The actual percentage width is computed inline but colors avoid red */}
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min((parseFloat(spaceUsedMB) / 100) * 100, 100)}%`,
              background:
                parseFloat(spaceUsedMB) > 80
                  ? "#f59e0b" // amber instead of red
                  : parseFloat(spaceUsedMB) > 60
                  ? "#fbbf24"
                  : "#10b981",
            }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-500">
          {spaceUsedMB} MB used
        </div>
      </div>
    );
  };

  const handleCreateTenant = async (formData: FormData) => {
    try {
      setCreating(true);
      const tenantData = {
        name: formData.get("name") as string,
        businessType: formData.get("businessType") as string,
        contactEmail: formData.get("contactEmail") as string,
        contactPhone: formData.get("contactPhone") as string,
        ownerName: formData.get("ownerName") as string,
        ownerEmail: formData.get("ownerEmail") as string,
        ownerPassword: formData.get("ownerPassword") as string,
      };

      await apiPost("/admin/tenants", tenantData);
      setShowCreateForm(false);
      fetchTenants();
    } catch (error) {
      console.error("Failed to create tenant:", error);
      alert("Failed to create tenant");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) {
      return;
    }

    try {
      await apiDelete(`/admin/tenants/${tenantId}`);
      fetchTenants();
    } catch (error) {
      console.error("Failed to delete tenant:", error);
      alert("Failed to delete tenant");
    }
  };

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          Tenant Management
        </h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 md:text-sm"
        >
          Create Tenant
        </button>
      </div>

      {/* Tenant Modal */}
      {showTenantModal && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-[95%] max-w-xl overflow-auto rounded-xl bg-white p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {selectedTenant.name}
              </h2>
              <button
                onClick={() => setShowTenantModal(false)}
                className="text-lg text-gray-500 transition-colors hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                  <div className="text-base font-semibold text-blue-600">
                    {selectedTenant.userCount}
                  </div>
                  <div className="text-[11px] text-slate-500">Users</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                  <div className="text-base font-semibold text-emerald-600">
                    {selectedTenant.productCount}
                  </div>
                  <div className="text-[11px] text-slate-500">Products</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                  <div className="text-base font-semibold text-amber-600">
                    {selectedTenant.salesCount}
                  </div>
                  <div className="text-[11px] text-slate-500">Transactions</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-center">
                  <div className="text-base font-semibold text-purple-600">
                    {selectedTenant.branchCount}
                  </div>
                  <div className="text-[11px] text-slate-500">Branches</div>
                </div>
              </div>
              {getTenantSpaceUsage(selectedTenant.id) && (
                <div className="mt-2">
                  <div className="mb-1 text-[11px] font-medium text-slate-700">
                    DB Space Usage
                  </div>
                  {renderSpaceUsageBar(getTenantSpaceUsage(selectedTenant.id)!.spaceUsedMB)}
                </div>
              )}

              <button
                onClick={() => handleEnterAccount(selectedTenant.id)}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <FaArrowRight /> Enter Account
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <FaStore className="h-4 w-4" /> Products ({tenantProducts.length})
                </h3>
                <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-slate-100 p-2">
                  {tenantProducts.length > 0 ? (
                    tenantProducts.slice(0, 10).map(product => (
                      <div
                        key={product.id}
                        className="border-b border-slate-100 pb-1 text-[11px] last:border-0"
                      >
                        <div className="font-medium text-slate-800">
                          {product.name}
                        </div>
                        <div className="text-slate-500">
                          {formatCurrency(product.price)} • Stock: {product.inventory[0]?.quantity || 0}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] italic text-slate-500">
                      No products found
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <FaReceipt className="h-4 w-4" /> Transactions ({tenantTransactions.length})
                </h3>
                <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-slate-100 p-2">
                  {tenantTransactions.length > 0 ? (
                    tenantTransactions.slice(0, 10).map(transaction => (
                      <div
                        key={transaction.id}
                        className="border-b border-slate-100 pb-1 text-[11px] last:border-0"
                      >
                        <div className="font-medium text-slate-800">
                          {formatCurrency(transaction.total)}
                        </div>
                        <div className="text-slate-500">
                          {formatDate(transaction.createdAt)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] italic text-slate-500">
                      No transactions found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-[95%] max-w-sm overflow-auto rounded-xl bg-white p-4 shadow-2xl">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Create Tenant
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateTenant(new FormData(e.currentTarget)); }}>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Business Name
                  </label>
                  <input
                    name="name"
                    required
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Business Type
                  </label>
                  <input
                    name="businessType"
                    required
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Contact Email
                  </label>
                  <input
                    name="contactEmail"
                    type="email"
                    required
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Contact Phone
                  </label>
                  <input
                    name="contactPhone"
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Owner Name
                  </label>
                  <input
                    name="ownerName"
                    required
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Owner Email
                  </label>
                  <input
                    name="ownerEmail"
                    type="email"
                    required
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Owner Password
                  </label>
                  <input
                    name="ownerPassword"
                    type="password"
                    required
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm ${
                    creating
                      ? "cursor-not-allowed bg-blue-300"
                      : "cursor-pointer bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loadingTenants ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-gray-200" />
                <div className="h-3 w-32 rounded bg-gray-100" />
                <div className="flex gap-3">
                  <div className="h-3 w-12 rounded bg-gray-100" />
                  <div className="h-3 w-12 rounded bg-gray-100" />
                  <div className="h-3 w-12 rounded bg-gray-100" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-16 rounded bg-gray-100" />
                <div className="h-8 w-16 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 text-xs shadow-sm transition-shadow hover:shadow-md md:text-sm"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-900 md:text-base">
                  {tenant.name}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500 md:text-xs">
                  {tenant.businessType}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 md:text-xs">
                  {tenant.contactEmail}
                </p>
                <div className="mt-1 flex gap-3 text-[11px] text-slate-500 md:text-xs">
                  <span>{tenant.userCount} users</span>
                  <span>{tenant.productCount} products</span>
                  <span>{tenant.salesCount} sales</span>
                </div>
                {getTenantSpaceUsage(tenant.id) && (
                  <div className="mt-1">
                    {renderSpaceUsageBar(getTenantSpaceUsage(tenant.id)!.spaceUsedMB)}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewTenant(tenant.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-blue-700 md:text-xs"
                >
                  <FaEye /> View
                </button>
                <button
                  onClick={() => handleDeleteTenant(tenant.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-amber-600 md:text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

