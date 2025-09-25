"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";

interface HistoricalDataItem {
  timestamp: string;
  value: number;
}

interface TenantAnalytics {
  id: string;
  name: string;
  businessType: string;
  createdAt: string;
  productCount?: number;
  spaceUsedMB?: string;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null;
  usage: {
    users: {
      current: number;
      limit: number;
      percentage: number;
    };
    products: {
      current: number;
      limit: number;
      percentage: number;
    };
    sales: {
      current: number;
      limit: number;
      percentage: number;
    };
    storage: {
      current: number;
      limit: number;
      percentage: number;
    };
    apiCalls: {
      current: number;
      limit: number;
      percentage: number;
    };
  };
  performance: {
    averageResponseTime: number;
    uptime: number;
    errorRate: number;
    activeUsers: number;
    peakConcurrentUsers: number;
  };
  revenue: {
    monthlyRecurringRevenue: number;
    totalRevenue: number;
    averageOrderValue: number;
    customerLifetimeValue: number;
  };
  activity: {
    lastLogin: string | null;
    activeDays: number;
    totalSessions: number;
    averageSessionDuration: number;
  };
  historicalData: {
    users: Array<{ timestamp: string; value: number }>;
    sales: Array<{ timestamp: string; value: number }>;
    apiCalls: Array<{ timestamp: string; value: number }>;
    storage: Array<{ timestamp: string; value: number }>;
  };
}

interface TenantComparison {
  metric: string;
  average: number;
  median: number;
  topTenant: { name: string; value: number };
  bottomTenant: { name: string; value: number };
}

// Removed unused interface

export default function TenantAnalyticsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [tenants, setTenants] = useState<TenantAnalytics[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTenant] = useState<string>("");
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [comparisonData, setComparisonData] = useState<TenantComparison[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const fetchTenantAnalytics = async (range: string) => {
    try {
      setLoadingData(true);
      const data = await apiGet(`/admin/tenants/analytics?range=${range}`);
      setTenants(data.tenants || []);
      setComparisonData(data.comparisons || []);
    } catch (err) {
      setError('Failed to fetch tenant analytics');
      console.error('Error fetching tenant analytics:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchTenantAnalytics(timeRange);
    }
  }, [user, timeRange]);

  // Removed unused function

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 75) return '#f59e0b';
    return '#10b981';
  };

  const renderUsageBar = (current: number, limit: number, percentage: number) => {
    const color = getUsageColor(percentage);
    return (
      <div style={{ marginTop: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "0.25rem" }}>
          <span>{current.toLocaleString()}</span>
          <span>{limit.toLocaleString()}</span>
        </div>
        <div style={{ 
          width: "100%", 
          height: "6px", 
          background: "#e5e7eb", 
          borderRadius: "3px",
          overflow: "hidden"
        }}>
          <div style={{ 
            width: `${Math.min(percentage, 100)}%`, 
            height: "100%", 
            background: color,
            transition: "width 0.3s"
          }} />
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "0.25rem" }}>
          {percentage.toFixed(1)}% used
        </div>
      </div>
    );
  };

  const renderSparkline = (data: Array<{ date: string; count: number }>, color: string, height: number = 40) => {
    if (!data || data.length === 0) return null;

    const points = data.map((point, index) => ({
      x: (index / (data.length - 1)) * 100,
      y: point.count
    }));

    const maxY = Math.max(...points.map(p => p.y));
    const minY = Math.min(...points.map(p => p.y));
    const range = maxY - minY || 1;

    const pathData = points.map((point, index) => {
      const x = point.x;
      const y = 100 - ((point.y - minY) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} style={{ overflow: 'visible' }}>
        <path
          d={pathData}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const [filter] = useState<'all' | 'active' | 'over_limit' | 'inactive'>('all');
  
  const filteredTenants = tenants.filter(tenant => {
    if (!tenant?.usage || !tenant.performance) return false;
    
    if (filter === 'all') return true;
    if (filter === 'active') return tenant.usage.users.percentage < 90;
    if (filter === 'over_limit') return tenant.usage.users.percentage >= 90;
    if (filter === 'inactive') return tenant.performance.activeUsers === 0;
    return true;
  });

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <div style={{ 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          color: '#b91c1c', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <p>Error loading tenant analytics: {error}</p>
          <button 
            onClick={() => fetchTenantAnalytics(timeRange)}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          Tenant Analytics
        </h1>
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          Monitor usage, performance, and revenue across all tenants
        </p>
        
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
          <select
            value={timeRange}
            onChange={(e) => {
              const value = e.target.value as '7d' | '30d' | '90d';
              setTimeRange(value);
            }}
            style={{
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px"
            }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <button
            onClick={() => fetchTenantAnalytics(timeRange)}
            disabled={loadingData}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loadingData ? "not-allowed" : "pointer",
              opacity: loadingData ? 0.6 : 1
            }}
          >
            {loadingData ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading tenant analytics...</div>
      ) : (
        <div style={{ display: "grid", gap: "2rem" }}>
          {/* Platform Overview */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Platform Overview</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>{tenants.length}</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Total Tenants</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
                  {tenants.filter(t => t?.usage?.users?.percentage >= 90).length}
                </div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Near Capacity</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
                  {formatCurrency(tenants.reduce((sum, t) => sum + (t?.revenue?.monthlyRecurringRevenue || 0), 0))}
                </div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Total MRR</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
                  {formatBytes(tenants.reduce((sum: number, tenant: TenantAnalytics) => sum + ((tenant.spaceUsedMB ? parseFloat(tenant.spaceUsedMB) : 0) * 1024 * 1024), 0))}
                </div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Total Storage Used</div>
              </div>
            </div>
          </div>

          {/* Tenant Comparison */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Tenant Comparison</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
              {Array.isArray(comparisonData) && comparisonData.map((metric) => {
                if (!metric) return null;
                const safeMetric = {
                  metric: metric.metric || 'N/A',
                  average: typeof metric.average === 'number' ? metric.average : 0,
                  median: typeof metric.median === 'number' ? metric.median : 0,
                  topTenant: {
                    name: metric.topTenant?.name || 'N/A',
                    value: typeof metric.topTenant?.value === 'number' ? metric.topTenant.value : 0
                  },
                  bottomTenant: {
                    name: metric.bottomTenant?.name || 'N/A',
                    value: typeof metric.bottomTenant?.value === 'number' ? metric.bottomTenant.value : 0
                  }
                };
                
                return (
                  <div key={safeMetric.metric} style={{ padding: "1rem", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                    <h4 style={{ margin: "0 0 0.5rem 0", fontSize: 14, fontWeight: "600", textTransform: "uppercase" }}>
                      {String(safeMetric.metric).replace(/_/g, ' ')}
                    </h4>
                    <div style={{ display: "grid", gap: "0.5rem", fontSize: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Average:</span>
                        <span>{safeMetric.average.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Median:</span>
                        <span>{safeMetric.median.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Top:</span>
                        <span>{safeMetric.topTenant.name} ({safeMetric.topTenant.value.toFixed(2)})</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Bottom:</span>
                        <span>{safeMetric.bottomTenant.name} ({safeMetric.bottomTenant.value.toFixed(2)})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Tenant List */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>
              Tenant Details ({filteredTenants.length})
            </h3>
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {filteredTenants.map((tenant) => (
                <div key={tenant.id} style={{ 
                  padding: "1.5rem", 
                  border: "1px solid #e5e7eb", 
                  borderRadius: "8px",
                  background: selectedTenant === tenant.id ? "#f9fafb" : "#fff"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div>
                      <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "18px", fontWeight: "bold" }}>{tenant.name}</h4>
                      <p style={{ margin: "0", fontSize: "14px", color: "#6b7280" }}>{tenant.businessType}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ 
                        padding: "0.25rem 0.75rem", 
                        borderRadius: "20px", 
                        fontSize: "12px", 
                        fontWeight: "500",
                        background: tenant.subscription?.status === 'active' ? "#dcfce7" : "#fee2e2",
                        color: tenant.subscription?.status === 'active' ? "#166534" : "#dc2626"
                      }}>
                        {tenant.subscription?.plan || 'No Plan'} - {tenant.subscription?.status || 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                    {/* Usage Metrics */}
                    <div>
                      <h5 style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "600" }}>Usage</h5>
                      <div style={{ display: "grid", gap: "0.75rem" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                            <span>Users</span>
                            <span>{tenant.usage?.users?.current || 0}/{tenant.usage?.users?.limit || 0}</span>
                          </div>
                          {renderUsageBar(tenant.usage?.users?.current || 0, tenant.usage?.users?.limit || 1, tenant.usage?.users?.percentage || 0)}
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                            <span>Products</span>
                            <span>{tenant.productCount ?? 0}</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                            <span>Storage</span>
                            <span>{formatBytes(tenant.usage?.storage?.current || 0)}</span>
                          </div>
                          {renderUsageBar(tenant.usage?.storage?.current || 0, tenant.usage?.storage?.limit || 1, tenant.usage?.storage?.percentage || 0)}
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "0.5rem" }}>
                            <span>DB Space Used</span>
                            <span>{tenant.spaceUsedMB ? `${tenant.spaceUsedMB} MB` : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      <h5 style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "600" }}>Performance</h5>
                      <div style={{ display: "grid", gap: "0.5rem", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Response Time:</span>
                          <span>{tenant.performance?.averageResponseTime || 0}ms</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Uptime:</span>
                          <span>{tenant.performance?.uptime || 0}%</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Error Rate:</span>
                          <span>{(tenant.performance?.errorRate || 0).toFixed(2)}%</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Active Users:</span>
                          <span>{tenant.performance?.activeUsers || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Revenue Metrics */}
                    <div>
                      <h5 style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "600" }}>Revenue</h5>
                      <div style={{ display: "grid", gap: "0.5rem", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>MRR:</span>
                          <span>{formatCurrency(tenant.revenue?.monthlyRecurringRevenue || 0)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Total Revenue:</span>
                          <span>{formatCurrency(tenant.revenue?.totalRevenue || 0)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Avg Order Value:</span>
                          <span>{formatCurrency(tenant.revenue?.averageOrderValue || 0)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>CLV:</span>
                          <span>{formatCurrency(tenant.revenue?.customerLifetimeValue || 0)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Activity Metrics */}
                    <div>
                      <h5 style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "600" }}>Activity</h5>
                      <div style={{ display: "grid", gap: "0.5rem", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Last Login:</span>
                          <span>{tenant.activity?.lastLogin ? new Date(tenant.activity.lastLogin).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Active Days:</span>
                          <span>{tenant.activity?.activeDays || 0}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Total Sessions:</span>
                          <span>{tenant.activity?.totalSessions || 0}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Avg Session:</span>
                          <span>{Math.round((tenant.activity?.averageSessionDuration || 0) / 60000)}m</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Historical Data Sparklines */}
                  <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>Users Trend</div>
                      {renderSparkline(tenant.historicalData.users.map((u: HistoricalDataItem) => ({ date: u.timestamp, count: u.value })), "#3b82f6")}
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>Sales Trend</div>
                      {renderSparkline(tenant.historicalData.sales.map((s: HistoricalDataItem) => ({ date: s.timestamp, count: s.value })), "#10b981")}
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>API Calls</div>
                      {renderSparkline(tenant.historicalData.apiCalls.map((a: HistoricalDataItem) => ({ date: a.timestamp, count: a.value })), "#f59e0b")}
                    </div>
                    <div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>Storage Usage</div>
                      {renderSparkline(tenant.historicalData.storage.map((s: HistoricalDataItem) => ({ date: s.timestamp, count: s.value })), "#8b5cf6")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}