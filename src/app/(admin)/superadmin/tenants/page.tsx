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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTenantSpaceUsage = (tenantId: string) => {
    return tenantSpaceUsage.find(usage => usage.tenantId === tenantId);
  };

  const renderSpaceUsageBar = (spaceUsedMB: string) => {
    const spaceUsed = parseFloat(spaceUsedMB);
    // Assume a max limit of 100MB for visualization (adjust as needed)
    const maxSpace = 100;
    const percentage = Math.min((spaceUsed / maxSpace) * 100, 100);

    return (
      <div style={{ width: '100%', marginTop: '0.5rem' }}>
        <div style={{
          width: '100%',
          height: '8px',
          background: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            background: percentage > 80 ? '#ef4444' : percentage > 60 ? '#f59e0b' : '#10b981',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '0.25rem' }}>
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
    <main style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 28, fontWeight: "bold" }}>Tenant Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            background: "#3b82f6",
            color: "#fff",
            padding: "0.75rem 1.5rem",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontWeight: "500"
          }}
        >
          Create New Tenant
        </button>
      </div>

      {/* Tenant Modal */}
      {showTenantModal && selectedTenant && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "8px",
            width: "90%",
            maxWidth: "800px",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: 24, fontWeight: "bold" }}>{selectedTenant.name}</h2>
              <button
                onClick={() => setShowTenantModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ textAlign: "center", padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#3b82f6" }}>{selectedTenant.userCount}</div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>Users</div>
                </div>
                <div style={{ textAlign: "center", padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>{selectedTenant.productCount}</div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>Products</div>
                </div>
                <div style={{ textAlign: "center", padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>{selectedTenant.salesCount}</div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>Transactions</div>
                </div>
                <div style={{ textAlign: "center", padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#8b5cf6" }}>{selectedTenant.branchCount}</div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>Branches</div>
                </div>
              </div>
              {getTenantSpaceUsage(selectedTenant.id) && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "0.5rem" }}>Database Space Usage</div>
                  {renderSpaceUsageBar(getTenantSpaceUsage(selectedTenant.id)!.spaceUsedMB)}
                </div>
              )}

              <button
                onClick={() => handleEnterAccount(selectedTenant.id)}
                style={{
                  background: "#3b82f6",
                  color: "#fff",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                <FaArrowRight /> Enter Account
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FaStore /> Products ({tenantProducts.length})
                </h3>
                <div style={{ maxHeight: "300px", overflow: "auto" }}>
                  {tenantProducts.length > 0 ? (
                    tenantProducts.slice(0, 10).map(product => (
                      <div key={product.id} style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                        <div style={{ fontWeight: "500" }}>{product.name}</div>
                        <div style={{ fontSize: "14px", color: "#6b7280" }}>
                          {formatCurrency(product.price)} • Stock: {product.inventory[0]?.quantity || 0}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#6b7280", fontStyle: "italic" }}>No products found</div>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FaReceipt /> Recent Transactions ({tenantTransactions.length})
                </h3>
                <div style={{ maxHeight: "300px", overflow: "auto" }}>
                  {tenantTransactions.length > 0 ? (
                    tenantTransactions.slice(0, 10).map(transaction => (
                      <div key={transaction.id} style={{ padding: "0.5rem", borderBottom: "1px solid #e5e7eb" }}>
                        <div style={{ fontWeight: "500" }}>{formatCurrency(transaction.total)}</div>
                        <div style={{ fontSize: "14px", color: "#6b7280" }}>{formatDate(transaction.createdAt)}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#6b7280", fontStyle: "italic" }}>No transactions found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateForm && (
        <div style={{ 
          position: "fixed", 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: "rgba(0,0,0,0.5)", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{ 
            background: "#fff", 
            padding: "2rem", 
            borderRadius: "8px", 
            width: "90%", 
            maxWidth: "500px",
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Create New Tenant</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateTenant(new FormData(e.currentTarget)); }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Business Name</label>
                <input
                  name="name"
                  required
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Business Type</label>
                <input
                  name="businessType"
                  required
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Contact Email</label>
                <input
                  name="contactEmail"
                  type="email"
                  required
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Contact Phone</label>
                <input
                  name="contactPhone"
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Owner Name</label>
                <input
                  name="ownerName"
                  required
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Owner Email</label>
                <input
                  name="ownerEmail"
                  type="email"
                  required
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Owner Password</label>
                <input
                  name="ownerPassword"
                  type="password"
                  required
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "6px",
                    border: "none",
                    cursor: creating ? "not-allowed" : "pointer",
                    opacity: creating ? 0.6 : 1
                  }}
                >
                  {creating ? "Creating..." : "Create Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loadingTenants ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Loading tenants...
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              style={{
                background: "#fff",
                padding: "1.5rem",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: "0.5rem" }}>{tenant.name}</h3>
                <p style={{ color: "#6b7280", marginBottom: "0.5rem" }}>{tenant.businessType}</p>
                <p style={{ color: "#6b7280", fontSize: 14 }}>{tenant.contactEmail}</p>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{tenant.userCount} users</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{tenant.productCount} products</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{tenant.salesCount} sales</span>
                </div>
                {getTenantSpaceUsage(tenant.id) && (
                  <div style={{ marginTop: "0.5rem" }}>
                    {renderSpaceUsageBar(getTenantSpaceUsage(tenant.id)!.spaceUsedMB)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => handleViewTenant(tenant.id)}
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem"
                  }}
                >
                  <FaEye /> View Details
                </button>
                <button
                  onClick={() => handleDeleteTenant(tenant.id)}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14
                  }}
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

