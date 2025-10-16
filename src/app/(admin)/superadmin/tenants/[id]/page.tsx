"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost } from "@/utils/api";
import { FaArrowLeft, FaStore, FaReceipt, FaArrowRight, FaUsers, FaBuilding } from 'react-icons/fa';

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
  spaceUsedMB: string;
  resourceSpaceUsage?: Record<string, number>;
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

export default function TenantDetailsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;

  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'transactions' | 'analytics'>('overview');

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin && tenantId) {
      fetchTenantData();
    }
  }, [user, tenantId]);

  const fetchTenantData = async () => {
    try {
      setLoadingData(true);
      const [tenantDetails, tenantProducts, tenantTransactions] = await Promise.all([
        apiGet<TenantDetails>(`/admin/tenants/${tenantId}`),
        apiGet<Product[]>(`/admin/tenants/${tenantId}/products`),
        apiGet<Transaction[]>(`/admin/tenants/${tenantId}/transactions`),
      ]);

      setTenant(tenantDetails);
      setProducts(tenantProducts);
      setTransactions(tenantTransactions);
    } catch (error) {
      console.error("Failed to fetch tenant data:", error);
      alert("Failed to load tenant data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleEnterAccount = async () => {
    if (!tenant) return;

    try {
      await apiPost(`/admin/tenants/${tenant.id}/switch`, {});
      // Redirect to the tenant's dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error("Failed to switch tenant context:", error);
      alert("Failed to enter tenant account");
    }
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

  if (loading || !user) return null;

  if (loadingData) {
    return (
      <main style={{ padding: "2rem" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Loading tenant data...
        </div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main style={{ padding: "2rem" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Tenant not found
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={() => router.push('/superadmin/tenants')}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "none",
            border: "none",
            color: "#3b82f6",
            cursor: "pointer",
            fontSize: "16px",
            marginBottom: "1rem"
          }}
        >
          <FaArrowLeft /> Back to Tenants
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: "0.5rem" }}>{tenant.name}</h1>
            <p style={{ color: "#6b7280", fontSize: "18px" }}>{tenant.businessType}</p>
            <p style={{ color: "#6b7280" }}>{tenant.contactEmail} • {tenant.contactPhone}</p>
          </div>

          <button
            onClick={handleEnterAccount}
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
              gap: "0.5rem",
              fontSize: "16px"
            }}
          >
            <FaArrowRight /> Enter Account
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <FaUsers style={{ color: "#3b82f6" }} />
            <h3 style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Users</h3>
          </div>
          <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937", margin: 0 }}>{tenant.userCount}</p>
        </div>

        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <FaStore style={{ color: "#10b981" }} />
            <h3 style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Products</h3>
          </div>
          <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937", margin: 0 }}>{tenant.productCount}</p>
        </div>

        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <FaReceipt style={{ color: "#f59e0b" }} />
            <h3 style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Transactions</h3>
          </div>
          <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937", margin: 0 }}>{tenant.salesCount}</p>
        </div>

        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <FaBuilding style={{ color: "#8b5cf6" }} />
            <h3 style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Branches</h3>
          </div>
          <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937", margin: 0 }}>{tenant.branchCount}</p>
        </div>

        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <FaStore style={{ color: "#ef4444" }} />
            <h3 style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Database Space</h3>
          </div>
          <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937", margin: 0 }}>{tenant.spaceUsedMB} MB</p>
          <div style={{ marginTop: "0.5rem" }}>
            <div style={{ width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min((parseFloat(tenant.spaceUsedMB) / 1000) * 100, 100)}%`,
                  height: "100%",
                  background: parseFloat(tenant.spaceUsedMB) > 750 ? "#ef4444" : parseFloat(tenant.spaceUsedMB) > 500 ? "#f59e0b" : "#10b981",
                  transition: "width 0.3s ease"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "2rem" }}>
        <nav style={{ display: "flex", gap: "2rem" }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: "1rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'overview' ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === 'overview' ? "#3b82f6" : "#6b7280",
              fontWeight: activeTab === 'overview' ? "600" : "500",
              cursor: "pointer"
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              padding: "1rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'products' ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === 'products' ? "#3b82f6" : "#6b7280",
              fontWeight: activeTab === 'products' ? "600" : "500",
              cursor: "pointer"
            }}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: "1rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'transactions' ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === 'transactions' ? "#3b82f6" : "#6b7280",
              fontWeight: activeTab === 'transactions' ? "600" : "500",
              cursor: "pointer"
            }}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: "1rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'analytics' ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === 'analytics' ? "#3b82f6" : "#6b7280",
              fontWeight: activeTab === 'analytics' ? "600" : "500",
              cursor: "pointer"
            }}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Recent Products</h3>
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
              {products.slice(0, 5).map(product => (
                <div key={product.id} style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: "500" }}>{product.name}</div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>
                    {formatCurrency(product.price)} • Stock: {product.inventory[0]?.quantity || 0}
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                  No products found
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Recent Transactions</h3>
            <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
              {transactions.slice(0, 5).map(transaction => (
                <div key={transaction.id} style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: "500" }}>{formatCurrency(transaction.total)}</div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>{formatDate(transaction.createdAt)}</div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                  No transactions found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Space Usage Trend</h3>
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ height: "200px", display: "flex", alignItems: "end", justifyContent: "center", background: "#f9fafb", borderRadius: "4px" }}>
                <div style={{ width: "60%", height: `${Math.min((parseFloat(tenant.spaceUsedMB) / 1000) * 100, 100)}%`, background: "#3b82f6", borderRadius: "4px 4px 0 0", transition: "height 0.3s ease" }}></div>
              </div>
              <p style={{ textAlign: "center", marginTop: "1rem", color: "#6b7280" }}>
                Current usage: {tenant.spaceUsedMB} MB
              </p>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Resource Distribution</h3>
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {tenant.resourceSpaceUsage && Object.entries(tenant.resourceSpaceUsage).map(([resource, bytes]) => {
                  const mb = (bytes / (1024 * 1024)).toFixed(2);
                  const maxBytes = Math.max(...Object.values(tenant.resourceSpaceUsage!));
                  const percentage = maxBytes > 0 ? (bytes / maxBytes) * 100 : 0;

                  return (
                    <div key={resource} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#6b7280" }}>{resource}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "100px", height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${percentage}%`, height: "100%", background: "#10b981" }}></div>
                        </div>
                        <span style={{ fontSize: "14px", color: "#1f2937" }}>{mb} MB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>All Products</h3>
          </div>
          {products.map(product => (
            <div key={product.id} style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "500" }}>{product.name}</div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>
                    Stock: {product.inventory[0]?.quantity || 0}
                  </div>
                </div>
                <div style={{ fontWeight: "600", color: "#1f2937" }}>
                  {formatCurrency(product.price)}
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              No products found
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>All Transactions</h3>
          </div>
          {transactions.map(transaction => (
            <div key={transaction.id} style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "500" }}>Transaction #{transaction.id.slice(-8)}</div>
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>
                    {formatDate(transaction.createdAt)}
                  </div>
                </div>
                <div style={{ fontWeight: "600", color: "#1f2937" }}>
                  {formatCurrency(transaction.total)}
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              No transactions found
            </div>
          )}
        </div>
      )}
    </main>
  );
}
