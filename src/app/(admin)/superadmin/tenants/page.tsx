"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete } from "@/utils/api";

interface Tenant {
  id: string;
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  _count: {
    users: number;
    products: number;
    sales: number;
  };
}

export default function SuperadminTenantsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchTenants();
    }
  }, [user]);

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
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{tenant._count.users} users</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{tenant._count.products} products</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{tenant._count.sales} sales</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
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