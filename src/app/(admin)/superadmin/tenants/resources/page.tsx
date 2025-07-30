"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/utils/api";

interface ResourceAllocation {
  id: string;
  tenantId: string;
  tenantName: string;
  currentUsage: {
    cpu: number;
    memory: number;
    storage: number;
    bandwidth: number;
    databaseConnections: number;
    apiCalls: number;
  };
  limits: {
    cpu: number;
    memory: number;
    storage: number;
    bandwidth: number;
    databaseConnections: number;
    apiCalls: number;
  };
  plan: {
    name: string;
    tier: 'basic' | 'pro' | 'enterprise';
    cost: number;
  };
  recommendations: {
    upgrade: boolean;
    downgrade: boolean;
    reason: string;
    suggestedPlan: string;
  };
  historicalUsage: {
    cpu: Array<{ date: string; usage: number }>;
    memory: Array<{ date: string; usage: number }>;
    storage: Array<{ date: string; usage: number }>;
    bandwidth: Array<{ date: string; usage: number }>;
  };
}

interface ResourcePlan {
  id: string;
  name: string;
  tier: 'basic' | 'pro' | 'enterprise';
  limits: {
    cpu: number;
    memory: number;
    storage: number;
    bandwidth: number;
    databaseConnections: number;
    apiCalls: number;
  };
  cost: number;
  features: string[];
}

export default function ResourceAllocationPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [plans, setPlans] = useState<ResourcePlan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [filter, setFilter] = useState<'all' | 'over_limit' | 'under_utilized' | 'optimal'>('all');

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchResourceData();
    }
  }, [user]);

  const fetchResourceData = async () => {
    try {
      setLoadingData(true);
      const [allocationsData, plansData] = await Promise.all([
        apiGet("/admin/tenants/resources"),
        apiGet("/admin/tenants/plans")
      ]);
      setAllocations(allocationsData);
      setPlans(plansData);
    } catch (error) {
      console.error("Failed to fetch resource data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateTenantPlan = async () => {
    if (!selectedTenant || !selectedPlan) return;
    
    try {
      await apiPut(`/admin/tenants/${selectedTenant}/plan`, {
        planId: selectedPlan
      });
      setShowAllocationModal(false);
      fetchResourceData();
    } catch (error) {
      console.error("Failed to update tenant plan:", error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (current: number, limit: number) => {
    return ((current / limit) * 100).toFixed(1);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 75) return '#f59e0b';
    if (percentage >= 50) return '#3b82f6';
    return '#10b981';
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'upgrade': return '#ef4444';
      case 'downgrade': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderResourceBar = (current: number, limit: number, label: string, unit: string = '') => {
    const percentage = (current / limit) * 100;
    const color = getUsageColor(percentage);
    
    return (
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "0.25rem" }}>
          <span>{label}</span>
          <span>{current}{unit} / {limit}{unit}</span>
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
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          {formatPercentage(current, limit)}% used
        </div>
      </div>
    );
  };

  const renderSparkline = (data: Array<{ date: string; usage: number }>, color: string, height: number = 40) => {
    if (!data || data.length === 0) return null;

    const points = data.map((point, index) => ({
      x: (index / (data.length - 1)) * 100,
      y: point.usage
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

  const filteredAllocations = allocations.filter(allocation => {
    const avgUsage = (
      (allocation.currentUsage.cpu / allocation.limits.cpu) +
      (allocation.currentUsage.memory / allocation.limits.memory) +
      (allocation.currentUsage.storage / allocation.limits.storage)
    ) / 3 * 100;

    if (filter === 'all') return true;
    if (filter === 'over_limit') return avgUsage >= 90;
    if (filter === 'under_utilized') return avgUsage <= 30;
    if (filter === 'optimal') return avgUsage > 30 && avgUsage < 90;
    return true;
  });

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 32, fontWeight: "bold" }}>Resource Allocation Management</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
          >
            <option value="all">All Tenants</option>
            <option value="over_limit">Over Limit</option>
            <option value="under_utilized">Under Utilized</option>
            <option value="optimal">Optimal Usage</option>
          </select>
        </div>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading resource data...</div>
      ) : (
        <div style={{ display: "grid", gap: "2rem" }}>
          {/* Resource Overview */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Platform Resource Overview</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
                  {formatBytes(allocations.reduce((sum, a) => sum + a.currentUsage.storage, 0))}
                </div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Total Storage Used</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
                  {allocations.reduce((sum, a) => sum + a.currentUsage.cpu, 0).toFixed(1)}%
                </div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Total CPU Usage</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
                  {formatBytes(allocations.reduce((sum, a) => sum + a.currentUsage.memory, 0))}
                </div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Total Memory Used</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
                  {allocations.filter(a => a.recommendations.upgrade).length}
                </div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Need Upgrade</div>
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Available Resource Plans</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {plans.map((plan) => (
                <div key={plan.id} style={{ 
                  padding: "1.5rem", 
                  border: "1px solid #e5e7eb", 
                  borderRadius: "8px",
                  borderLeft: `4px solid ${
                    plan.tier === 'enterprise' ? '#8b5cf6' : 
                    plan.tier === 'pro' ? '#3b82f6' : '#10b981'
                  }`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>{plan.name}</h4>
                    <span style={{ 
                      padding: "0.25rem 0.75rem", 
                      borderRadius: "20px", 
                      fontSize: "12px", 
                      fontWeight: "500",
                      background: plan.tier === 'enterprise' ? '#f3e8ff' : 
                                plan.tier === 'pro' ? '#dbeafe' : '#dcfce7',
                      color: plan.tier === 'enterprise' ? '#7c3aed' : 
                             plan.tier === 'pro' ? '#1d4ed8' : '#166534'
                    }}>
                      {plan.tier.toUpperCase()}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "1rem" }}>
                    ${plan.cost}/month
                  </div>
                  
                  <div style={{ display: "grid", gap: "0.5rem", fontSize: "14px", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>CPU:</span>
                      <span>{plan.limits.cpu} cores</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Memory:</span>
                      <span>{formatBytes(plan.limits.memory)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Storage:</span>
                      <span>{formatBytes(plan.limits.storage)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Bandwidth:</span>
                      <span>{formatBytes(plan.limits.bandwidth)}/month</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>DB Connections:</span>
                      <span>{plan.limits.databaseConnections}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>API Calls:</span>
                      <span>{plan.limits.apiCalls.toLocaleString()}/month</span>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {plan.features.join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tenant Resource Allocations */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>
              Tenant Resource Allocations ({filteredAllocations.length})
            </h3>
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {filteredAllocations.map((allocation) => (
                <div key={allocation.id} style={{ 
                  padding: "1.5rem", 
                  border: "1px solid #e5e7eb", 
                  borderRadius: "8px",
                  borderLeft: `4px solid ${
                    allocation.recommendations.upgrade ? '#ef4444' :
                    allocation.recommendations.downgrade ? '#10b981' : '#6b7280'
                  }`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                    <div>
                      <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "18px", fontWeight: "bold" }}>
                        {allocation.tenantName}
                      </h4>
                      <p style={{ margin: "0", fontSize: "14px", color: "#6b7280" }}>
                        {allocation.plan.name} - ${allocation.plan.cost}/month
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <span style={{ 
                        padding: "0.25rem 0.75rem", 
                        borderRadius: "20px", 
                        fontSize: "12px", 
                        fontWeight: "500",
                        background: allocation.plan.tier === 'enterprise' ? '#f3e8ff' : 
                                  allocation.plan.tier === 'pro' ? '#dbeafe' : '#dcfce7',
                        color: allocation.plan.tier === 'enterprise' ? '#7c3aed' : 
                               allocation.plan.tier === 'pro' ? '#1d4ed8' : '#166534'
                      }}>
                        {allocation.plan.tier.toUpperCase()}
                      </span>
                      {allocation.recommendations.upgrade && (
                        <span style={{ 
                          padding: "0.25rem 0.75rem", 
                          borderRadius: "20px", 
                          fontSize: "12px", 
                          fontWeight: "500",
                          background: "#fee2e2",
                          color: "#dc2626"
                        }}>
                          NEEDS UPGRADE
                        </span>
                      )}
                      {allocation.recommendations.downgrade && (
                        <span style={{ 
                          padding: "0.25rem 0.75rem", 
                          borderRadius: "20px", 
                          fontSize: "12px", 
                          fontWeight: "500",
                          background: "#dcfce7",
                          color: "#166534"
                        }}>
                          CAN DOWNGRADE
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
                    {/* Current Usage */}
                    <div>
                      <h5 style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "600" }}>Current Usage</h5>
                      {renderResourceBar(allocation.currentUsage.cpu, allocation.limits.cpu, "CPU", "%")}
                      {renderResourceBar(allocation.currentUsage.memory, allocation.limits.memory, "Memory", "")}
                      {renderResourceBar(allocation.currentUsage.storage, allocation.limits.storage, "Storage", "")}
                      {renderResourceBar(allocation.currentUsage.bandwidth, allocation.limits.bandwidth, "Bandwidth", "")}
                      {renderResourceBar(allocation.currentUsage.databaseConnections, allocation.limits.databaseConnections, "DB Connections", "")}
                      {renderResourceBar(allocation.currentUsage.apiCalls, allocation.limits.apiCalls, "API Calls", "")}
                    </div>

                    {/* Historical Trends */}
                    <div>
                      <h5 style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "600" }}>Usage Trends</h5>
                      <div style={{ display: "grid", gap: "0.75rem" }}>
                        <div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>CPU Usage</div>
                          {renderSparkline(allocation.historicalUsage.cpu, "#3b82f6")}
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>Memory Usage</div>
                          {renderSparkline(allocation.historicalUsage.memory, "#10b981")}
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>Storage Usage</div>
                          {renderSparkline(allocation.historicalUsage.storage, "#f59e0b")}
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.25rem" }}>Bandwidth Usage</div>
                          {renderSparkline(allocation.historicalUsage.bandwidth, "#8b5cf6")}
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h5 style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "600" }}>Recommendations</h5>
                      <div style={{ 
                        padding: "1rem", 
                        background: allocation.recommendations.upgrade ? "#fee2e2" : 
                                  allocation.recommendations.downgrade ? "#dcfce7" : "#f3f4f6",
                        borderRadius: "6px",
                        borderLeft: `4px solid ${
                          allocation.recommendations.upgrade ? '#ef4444' :
                          allocation.recommendations.downgrade ? '#10b981' : '#6b7280'
                        }`
                      }}>
                        <p style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "500" }}>
                          {allocation.recommendations.reason}
                        </p>
                        {allocation.recommendations.suggestedPlan && (
                          <p style={{ margin: "0", fontSize: "12px", color: "#6b7280" }}>
                            Suggested: {allocation.recommendations.suggestedPlan}
                          </p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedTenant(allocation.tenantId);
                          setShowAllocationModal(true);
                        }}
                        style={{
                          marginTop: "1rem",
                          width: "100%",
                          padding: "0.75rem",
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "500"
                        }}
                      >
                        Manage Allocation
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocationModal && (
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
            maxWidth: "500px",
            width: "90%"
          }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Update Resource Allocation</h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: 14, fontWeight: "500" }}>
                Select New Plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db"
                }}
              >
                <option value="">Choose a plan...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.cost}/month
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowAllocationModal(false)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                Cancel
              </button>
              <button
                onClick={updateTenantPlan}
                disabled={!selectedPlan}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  opacity: selectedPlan ? 1 : 0.5
                }}
              >
                Update Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 