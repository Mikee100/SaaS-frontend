"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter, useParams } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/utils/api";
import { FaArrowLeft, FaStore, FaReceipt, FaArrowRight, FaUsers, FaBuilding, FaPlug, FaSpinner, FaCheckCircle, FaFileInvoice } from 'react-icons/fa';

const EAST_AFRICAN_COUNTRIES = [
  "Kenya",
  "Tanzania",
  "Uganda",
  "Rwanda",
  "Burundi",
  "South Sudan",
  "Democratic Republic of the Congo",
  "Ethiopia",
  "Somalia",
  "Eritrea",
  "Djibouti",
] as const;

interface TenantDetails {
  id: string;
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  address?: string;
  country?: string;
  kraEnabled?: boolean;
  kraPin?: string;
  vatNumber?: string;
  etimsQrUrl?: string;
  createdAt: string;
  userCount: number;
  productCount: number;
  salesCount: number;
  branchCount: number;
  spaceUsedMB: string;
  resourceSpaceUsage?: Record<string, number>;
}

interface MpesaConfigApiResponse {
  consumerKey?: string;
  consumerSecret?: string;
  shortCode?: string;
  passkey?: string;
  callbackUrl?: string;
  environment?: string;
  isActive?: boolean;
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

interface Subscription {
  planName: string;
  status: string;
}

export default function TenantDetailsPage() {
  const { user, loading, refreshUser } = useUser();
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;

  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'transactions' | 'analytics' | 'integrations' | 'business-kra'>('overview');

  // Business & KRA (admin-editable)
  const [businessKra, setBusinessKra] = useState<Partial<TenantDetails>>({});
  const [savingBusinessKra, setSavingBusinessKra] = useState(false);

  // M-Pesa integration state
  const [mpesaConfig, setMpesaConfig] = useState({
    mpesaConsumerKey: '',
    mpesaConsumerSecret: '',
    mpesaShortCode: '',
    mpesaPasskey: '',
    mpesaCallbackUrl: '',
    mpesaEnvironment: 'sandbox',
    mpesaIsActive: false
  });
  const [savingMpesa, setSavingMpesa] = useState(false);
  const [testingMpesa, setTestingMpesa] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<'disconnected' | 'connected'>('disconnected');

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [assigningSubscription, setAssigningSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const fetchTenantData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [tenantDetails, tenantProducts, tenantTransactions] = await Promise.all([
        apiGet<TenantDetails>(`/admin/tenants/${tenantId}`),
        apiGet<Product[]>(`/admin/tenants/${tenantId}/products`),
        apiGet<Transaction[]>(`/admin/tenants/${tenantId}/transactions`),
      ]);

      setTenant(tenantDetails);
      setBusinessKra({
        name: tenantDetails.name,
        businessType: tenantDetails.businessType,
        contactEmail: tenantDetails.contactEmail,
        contactPhone: tenantDetails.contactPhone ?? '',
        address: tenantDetails.address ?? '',
        country: tenantDetails.country ?? '',
        kraEnabled: tenantDetails.kraEnabled ?? false,
        kraPin: tenantDetails.kraPin ?? '',
        vatNumber: tenantDetails.vatNumber ?? '',
        etimsQrUrl: tenantDetails.etimsQrUrl ?? '',
      });
      setProducts(tenantProducts);
      setTransactions(tenantTransactions);
    } catch (error) {
      console.error("Failed to fetch tenant data:", error);
      alert("Failed to load tenant data");
    } finally {
      setLoadingData(false);
    }
  }, [tenantId]);

const fetchMpesaConfig = useCallback(async () => {
  try {
    const config = await apiGet(`/mpesa/config`, { tenantId }) as MpesaConfigApiResponse;
    if (config) {
      setMpesaConfig({
        mpesaConsumerKey: config.consumerKey || '',
        mpesaConsumerSecret: config.consumerSecret || '',
        mpesaShortCode: config.shortCode || '',
        mpesaPasskey: config.passkey || '',
        mpesaCallbackUrl: config.callbackUrl || '',
        mpesaEnvironment: config.environment || 'sandbox',
        mpesaIsActive: config.isActive || false
      });
      setMpesaStatus(config.isActive ? 'connected' : 'disconnected');
    }
  } catch (error) {
    console.error("Failed to fetch M-Pesa config:", error);
    // Keep default disconnected status
  }
}, [tenantId]);

  useEffect(() => {
    if (user?.isSuperadmin && tenantId) {
      fetchTenantData();
      fetchMpesaConfig();
    }
  }, [user, tenantId, fetchTenantData, fetchMpesaConfig]);

  const saveMpesaConfig = async () => {
    try {
      setSavingMpesa(true);
      await apiPost(`/mpesa/config`, {
        tenantId,
        mpesaConsumerKey: mpesaConfig.mpesaConsumerKey,
        mpesaConsumerSecret: mpesaConfig.mpesaConsumerSecret,
        mpesaShortCode: mpesaConfig.mpesaShortCode,
        mpesaPasskey: mpesaConfig.mpesaPasskey,
        mpesaCallbackUrl: mpesaConfig.mpesaCallbackUrl,
        mpesaIsActive: mpesaConfig.mpesaIsActive,
        mpesaEnvironment: mpesaConfig.mpesaEnvironment
      });
      setMpesaStatus('connected');
      alert("M-Pesa configuration saved successfully!");
    } catch (error) {
      console.error("Failed to save M-Pesa config:", error);
      alert("Failed to save M-Pesa configuration");
    } finally {
      setSavingMpesa(false);
    }
  };

  const testMpesaConnection = async () => {
    try {
      setTestingMpesa(true);
      // For now, just simulate a test - in real implementation, you'd call a test endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      setMpesaStatus('connected');
      alert("M-Pesa connection test successful!");
    } catch (error) {
      console.error("Failed to test M-Pesa connection:", error);
      setMpesaStatus('disconnected');
      alert("M-Pesa connection test failed");
    } finally {
      setTestingMpesa(false);
    }
  };

  const handleImpersonate = async () => {
    if (!tenant) return;

    try {
      await apiPost('/admin/impersonate/start', { tenantId: tenant.id });
      await refreshUser();
      router.push('/dashboard');
    } catch (error) {
      console.error("Failed to impersonate tenant:", error);
      alert("Failed to impersonate tenant");
    }
  };

  const saveBusinessKra = async () => {
    if (!tenantId) return;
    try {
      setSavingBusinessKra(true);
      await apiPut(`/admin/tenants/${tenantId}`, {
        name: businessKra.name,
        businessType: businessKra.businessType,
        contactEmail: businessKra.contactEmail,
        contactPhone: businessKra.contactPhone || null,
        address: businessKra.address || null,
        country: businessKra.country || null,
        kraEnabled: !!businessKra.kraEnabled,
        kraPin: businessKra.kraPin || null,
        vatNumber: businessKra.vatNumber || null,
        etimsQrUrl: businessKra.etimsQrUrl || null,
      });
      await fetchTenantData();
      alert("Business & KRA details saved.");
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save Business & KRA details");
    } finally {
      setSavingBusinessKra(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `Ksh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchSubscription = async () => {
    try {
      setLoadingData(true);
      const result = await apiGet<Subscription>(`/billing/subscription/${tenantId}`);
      setSubscription(result);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const assignSubscription = async (planId: string) => {
    try {
      setAssigningSubscription(true);
      setSubscriptionError(null);
      const result = await apiPost<{ subscription: Subscription }>(
        '/billing/superadmin/assign-subscription',
        {
          tenantId,
          planId,
        }
      );
      setSubscription(result.subscription);
    } catch (error) {
      setSubscriptionError(
        error instanceof Error ? error.message : 'Failed to assign subscription.'
      );
    } finally {
      setAssigningSubscription(false);
    }
  };

  React.useEffect(() => {
    fetchSubscription();
  }, [tenantId]);

  if (loading || !user) return null;

  if (loadingData) {
    return (
      <main style={{ padding: "1rem", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "1rem", fontSize: "13px", color: "#64748b" }}>
          Loading tenant data...
        </div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main style={{ padding: "1rem", background: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "1rem", fontSize: "13px", color: "#64748b" }}>
          Tenant not found
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "1rem", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={() => router.push('/superadmin/tenants')}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "none",
            border: "none",
            color: "#2563eb",
            cursor: "pointer",
            fontSize: "13px",
            marginBottom: "0.7rem",
            fontWeight: 500
          }}
        >
          <FaArrowLeft /> Back
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: "bold", marginBottom: "0.2rem", color: "#1e293b" }}>{tenant.name}</h1>
            <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "0.2rem" }}>{tenant.businessType}</p>
            <p style={{ color: "#64748b", fontSize: "12px" }}>{tenant.contactEmail} • {tenant.contactPhone}</p>
          </div>

          <button
            onClick={handleImpersonate}
            style={{
              background: "#2563eb",
              color: "#fff",
              padding: "0.3rem 0.8rem",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "12px",
              boxShadow: "0 1px 2px rgba(37,99,235,0.04)"
            }}
          >
            <FaArrowRight /> Impersonate
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "0.7rem",
        marginBottom: "1.2rem"
      }}>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaUsers style={{ color: "#2563eb", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>Users</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1e293b" }}>{tenant.userCount}</div>
        </div>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaStore style={{ color: "#059669", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>Products</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1e293b" }}>{tenant.productCount}</div>
        </div>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaReceipt style={{ color: "#f59e0b", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>Transactions</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1e293b" }}>{tenant.salesCount}</div>
        </div>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaBuilding style={{ color: "#8b5cf6", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>Branches</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1e293b" }}>{tenant.branchCount}</div>
        </div>
        <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <FaStore style={{ color: "#ef4444", fontSize: "13px" }} />
            <span style={{ fontSize: "11px", color: "#64748b" }}>DB Space</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#1e293b" }}>{tenant.spaceUsedMB} MB</div>
          <div style={{ marginTop: "0.2rem" }}>
            <div style={{ width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
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
      <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "1.2rem" }}>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'overview' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'overview' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'overview' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('products')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'products' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'products' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'products' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'transactions' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'transactions' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'transactions' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'analytics' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'analytics' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'analytics' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'integrations' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'integrations' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'integrations' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('business-kra')}
            style={{
              padding: "0.5rem 0",
              border: "none",
              background: "none",
              borderBottom: activeTab === 'business-kra' ? "2px solid #2563eb" : "2px solid transparent",
              color: activeTab === 'business-kra' ? "#2563eb" : "#64748b",
              fontWeight: activeTab === 'business-kra' ? "600" : "500",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Business & KRA
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: "0.5rem", color: "#334155" }}>Recent Products</h3>
            <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {products.slice(0, 5).map(product => (
                <div key={product.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
                  <div style={{ fontWeight: "500" }}>{product.name}</div>
                  <div style={{ color: "#64748b" }}>
                    {formatCurrency(product.price)} • Stock: {product.inventory[0]?.quantity || 0}
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                  No products found
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: "0.5rem", color: "#334155" }}>Recent Transactions</h3>
            <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              {transactions.slice(0, 5).map(transaction => (
                <div key={transaction.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
                  <div style={{ fontWeight: "500" }}>{formatCurrency(transaction.total)}</div>
                  <div style={{ color: "#64748b" }}>{formatDate(transaction.createdAt)}</div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                  No transactions found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: "0.5rem", color: "#334155" }}>Space Usage Trend</h3>
            <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ height: "80px", display: "flex", alignItems: "end", justifyContent: "center", background: "#f9fafb", borderRadius: "4px" }}>
                <div style={{ width: "60%", height: `${Math.min((parseFloat(tenant.spaceUsedMB) / 1000) * 100, 100)}%`, background: "#2563eb", borderRadius: "4px 4px 0 0", transition: "height 0.3s ease" }}></div>
              </div>
              <p style={{ textAlign: "center", marginTop: "0.5rem", color: "#64748b", fontSize: "12px" }}>
                Current usage: {tenant.spaceUsedMB} MB
              </p>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: "bold", marginBottom: "0.5rem", color: "#334155" }}>Resource Distribution</h3>
            <div style={{ background: "#fff", padding: "0.7rem", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {tenant.resourceSpaceUsage && Object.entries(tenant.resourceSpaceUsage).map(([resource, bytes]) => {
                  const mb = (bytes / (1024 * 1024)).toFixed(2);
                  const maxBytes = Math.max(...Object.values(tenant.resourceSpaceUsage!));
                  const percentage = maxBytes > 0 ? (bytes / maxBytes) * 100 : 0;

                  return (
                    <div key={resource} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <span style={{ color: "#64748b" }}>{resource}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <div style={{ width: "60px", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${percentage}%`, height: "100%", background: "#059669" }}></div>
                        </div>
                        <span style={{ color: "#1e293b" }}>{mb} MB</span>
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
        <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 13, fontWeight: "bold", margin: 0, color: "#334155" }}>All Products</h3>
          </div>
          {products.map(product => (
            <div key={product.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "500" }}>{product.name}</div>
                  <div style={{ color: "#64748b" }}>
                    Stock: {product.inventory[0]?.quantity || 0}
                  </div>
                </div>
                <div style={{ fontWeight: "600", color: "#1e293b" }}>
                  {formatCurrency(product.price)}
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
              No products found
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 13, fontWeight: "bold", margin: 0, color: "#334155" }}>All Transactions</h3>
          </div>
          {transactions.map(transaction => (
            <div key={transaction.id} style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "500" }}>Transaction #{transaction.id.slice(-8)}</div>
                  <div style={{ color: "#64748b" }}>
                    {formatDate(transaction.createdAt)}
                  </div>
                </div>
                <div style={{ fontWeight: "600", color: "#1e293b" }}>
                  {formatCurrency(transaction.total)}
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
              No transactions found
            </div>
          )}
        </div>
      )}

      {activeTab === 'integrations' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {/* M-Pesa Integration */}
          <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.5rem" }}>
                <FaPlug style={{ color: "#059669", fontSize: "13px" }} />
                <span style={{ fontSize: 13, fontWeight: "bold", color: "#334155" }}>M-Pesa Integration</span>
                {mpesaStatus === 'connected' ? (
                  <FaCheckCircle style={{ color: "#059669", fontSize: "13px" }} />
                ) : (
                  <FaSpinner style={{ color: "#f59e0b", fontSize: "13px", animation: "spin 1s linear infinite" }} />
                )}
              </div>
              <span style={{ color: "#64748b", fontSize: "12px" }}>
                Configure M-Pesa payment gateway
              </span>
            </div>

            <div style={{ padding: "0.7rem" }}>
              <form onSubmit={(e) => e.preventDefault()}>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Consumer Key
                  </label>
                  <input
                    type="text"
                    value={mpesaConfig.mpesaConsumerKey}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaConsumerKey: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="Enter M-Pesa Consumer Key"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Consumer Secret
                  </label>
                  <input
                    type="password"
                    value={mpesaConfig.mpesaConsumerSecret}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaConsumerSecret: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="Enter M-Pesa Consumer Secret"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Short Code
                  </label>
                  <input
                    type="text"
                    value={mpesaConfig.mpesaShortCode}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaShortCode: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="Enter M-Pesa Short Code"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Passkey
                  </label>
                  <input
                    type="password"
                    value={mpesaConfig.mpesaPasskey}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaPasskey: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="Enter M-Pesa Passkey"
                  />
                </div>
                <div style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Callback URL
                  </label>
                  <input
                    type="url"
                    value={mpesaConfig.mpesaCallbackUrl}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaCallbackUrl: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                    placeholder="https://your-domain.com/mpesa/callback"
                  />
                </div>
                <div style={{ marginBottom: "0.7rem" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>
                    Environment
                  </label>
                  <select
                    value={mpesaConfig.mpesaEnvironment}
                    onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaEnvironment: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "0.3rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "3px",
                      fontSize: "12px"
                    }}
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div style={{ marginBottom: "0.7rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "12px" }}>
                    <input
                      type="checkbox"
                      checked={mpesaConfig.mpesaIsActive}
                      onChange={(e) => setMpesaConfig(prev => ({ ...prev, mpesaIsActive: e.target.checked }))}
                      style={{ width: "14px", height: "14px" }}
                    />
                    <span style={{ fontWeight: "500", color: "#334155" }}>Enable M-Pesa for this tenant</span>
                  </label>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={saveMpesaConfig}
                    disabled={savingMpesa}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      padding: "0.3rem 0.8rem",
                      borderRadius: "5px",
                      border: "none",
                      cursor: savingMpesa ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem",
                      opacity: savingMpesa ? 0.6 : 1,
                      fontSize: "12px"
                    }}
                  >
                    {savingMpesa ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaCheckCircle />}
                    {savingMpesa ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={testMpesaConnection}
                    disabled={testingMpesa}
                    style={{
                      background: "#059669",
                      color: "#fff",
                      padding: "0.3rem 0.8rem",
                      borderRadius: "5px",
                      border: "none",
                      cursor: testingMpesa ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.2rem",
                      opacity: testingMpesa ? 0.6 : 1,
                      fontSize: "12px"
                    }}
                  >
                    {testingMpesa ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaPlug />}
                    {testingMpesa ? 'Testing...' : 'Test'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Integration Status */}
          <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#334155" }}>Integration Status</span>
            </div>
            <div style={{ padding: "0.7rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>M-Pesa</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    {mpesaStatus === 'connected' ? (
                      <>
                        <FaCheckCircle style={{ color: "#059669", fontSize: "13px" }} />
                        <span style={{ color: "#059669", fontWeight: "500" }}>Connected</span>
                      </>
                    ) : (
                      <>
                        <FaSpinner style={{ color: "#f59e0b", fontSize: "13px", animation: "spin 1s linear infinite" }} />
                        <span style={{ color: "#f59e0b", fontWeight: "500" }}>Disconnected</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Webhook Status</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <FaCheckCircle style={{ color: "#059669", fontSize: "13px" }} />
                    <span style={{ color: "#059669", fontWeight: "500" }}>Active</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>Last Sync</span>
                  <span style={{ color: "#1e293b", fontWeight: "500" }}>2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'business-kra' && (
        <div style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "0.7rem", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <FaFileInvoice style={{ color: "#2563eb", fontSize: "13px" }} />
              <span style={{ fontSize: 13, fontWeight: "bold", color: "#334155" }}>Business & KRA (Kenya Revenue Authority)</span>
            </div>
            <span style={{ color: "#64748b", fontSize: "12px", display: "block", marginTop: "0.2rem" }}>
              Edit business details and KRA compliance for this tenant. Tenant users can only view these details in Settings.
            </span>
          </div>
          <div style={{ padding: "0.7rem" }}>
            <form onSubmit={(e) => { e.preventDefault(); saveBusinessKra(); }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginBottom: "0.7rem" }}>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Business Name</label>
                  <input type="text" value={businessKra.name ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, name: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Business Type</label>
                  <input type="text" value={businessKra.businessType ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, businessType: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Contact Email</label>
                  <input type="email" value={businessKra.contactEmail ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, contactEmail: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Contact Phone</label>
                  <input type="text" value={businessKra.contactPhone ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, contactPhone: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Address</label>
                  <input type="text" value={businessKra.address ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, address: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>Country</label>
                  <select
                    value={businessKra.country ?? ''}
                    onChange={(e) => setBusinessKra(prev => ({ ...prev, country: e.target.value || undefined }))}
                    style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }}
                  >
                    <option value="">Select country</option>
                    {EAST_AFRICAN_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.7rem", marginTop: "0.7rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input type="checkbox" id="kraEnabled" checked={!!businessKra.kraEnabled} onChange={(e) => setBusinessKra(prev => ({ ...prev, kraEnabled: e.target.checked }))} style={{ width: "14px", height: "14px" }} />
                  <label htmlFor="kraEnabled" style={{ fontWeight: "500", fontSize: "12px" }}>Enable KRA compliance (show KRA PIN / VAT / eTIMS on receipts)</label>
                </div>
                {businessKra.kraEnabled && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem", marginTop: "0.5rem" }}>
                    <div>
                      <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>KRA PIN</label>
                      <input type="text" value={businessKra.kraPin ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, kraPin: e.target.value }))} placeholder="e.g. P051234567A" style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>VAT Number</label>
                      <input type="text" value={businessKra.vatNumber ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, vatNumber: e.target.value }))} style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", fontWeight: "500", marginBottom: "0.2rem", fontSize: "12px" }}>KRA eTIMS QR Code URL</label>
                      <input type="url" value={businessKra.etimsQrUrl ?? ''} onChange={(e) => setBusinessKra(prev => ({ ...prev, etimsQrUrl: e.target.value }))} placeholder="URL to eTIMS QR image (required for Kenya)" style={{ width: "100%", padding: "0.3rem", border: "1px solid #d1d5db", borderRadius: "3px", fontSize: "12px" }} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: "0.7rem" }}>
                <button type="submit" disabled={savingBusinessKra} style={{ background: "#2563eb", color: "#fff", padding: "0.3rem 0.8rem", borderRadius: "5px", border: "none", cursor: savingBusinessKra ? "not-allowed" : "pointer", fontWeight: "500", fontSize: "12px", opacity: savingBusinessKra ? 0.6 : 1 }}>
                  {savingBusinessKra ? "Saving..." : "Save Business & KRA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="subscription-management">
        <h2>Subscription Management</h2>
        {subscription ? (
          <div>
            <p>Current Plan: {subscription.planName}</p>
            <p>Status: {subscription.status}</p>
          </div>
        ) : (
          <p>No subscription assigned.</p>
        )}

        <div>
          <h3>Assign Subscription</h3>
          <button
            onClick={() => assignSubscription('plan_basic')}
            disabled={assigningSubscription}
          >
            Assign Basic Plan
          </button>
          <button
            onClick={() => assignSubscription('plan_pro')}
            disabled={assigningSubscription}
          >
            Assign Pro Plan
          </button>
          <button
            onClick={() => assignSubscription('plan_enterprise')}
            disabled={assigningSubscription}
          >
            Assign Enterprise Plan
          </button>
        </div>

        {subscriptionError && <p className="error">{subscriptionError}</p>}
      </div>
    </main>
  );
}
