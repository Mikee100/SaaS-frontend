"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";

interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    connections: number;
    maxConnections: number;
  };
  api: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
  storage: {
    status: 'healthy' | 'warning' | 'critical';
    usedSpace: number;
    totalSpace: number;
    usagePercentage: number;
  };
  memory: {
    status: 'healthy' | 'warning' | 'critical';
    usedMemory: number;
    totalMemory: number;
    usagePercentage: number;
  };
  activeIssues: Array<{
    id: string;
    type: 'database' | 'api' | 'storage' | 'memory' | 'security';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    createdAt: string;
    resolvedAt?: string;
  }>;
  recentAlerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    timestamp: string;
  }>;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
  activeUsers: number;
  peakConcurrentUsers: number;
  historicalData: {
    responseTimes: Array<{ timestamp: string; value: number }>;
    requests: Array<{ timestamp: string; value: number }>;
    errors: Array<{ timestamp: string; value: number }>;
    users: Array<{ timestamp: string; value: number }>;
  };
}

type TimeRange = '1h' | '6h' | '24h' | '7d';

type TimeSeriesData = {
  timestamp: string;
  value: number;
};

export default function SystemHealthPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchHealthData();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && user?.isSuperadmin) {
      interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, user]);

  const fetchHealthData = async () => {
    try {
      setLoadingHealth(true);
      const [healthData, metricsData] = await Promise.all([
        apiGet("/admin/health"),
        apiGet("/admin/health/metrics")
      ]);
      setHealth(healthData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Failed to fetch health data:", error);
    } finally {
      setLoadingHealth(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const createSparklineData = (data: TimeSeriesData[]) => {
    return data.map((point, index) => ({
      x: index,
      y: point.value
    }));
  };

  const renderSparkline = (data: TimeSeriesData[], color: string, height: number = 40) => {
    if (!data || data.length === 0) return null;

    const points = createSparklineData(data);
    const maxY = Math.max(...points.map(p => p.y));
    const minY = Math.min(...points.map(p => p.y));
    const range = maxY - minY || 1;

    const pathData = points.map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
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
        <circle
          cx={points.length > 0 ? (points.length - 1) / (points.length - 1) * 100 : 0}
          cy={points.length > 0 ? 100 - ((points[points.length - 1]?.y - minY) / range) * 100 : 0}
          r="3"
          fill={color}
        />
      </svg>
    );
  };

  const renderGauge = (value: number, max: number, color: string, label: string) => {
    const percentage = (value / max) * 100;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div style={{ textAlign: 'center' }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ marginTop: '-80px', fontSize: '18px', fontWeight: 'bold' }}>
          {formatPercentage(percentage)}
        </div>
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
          {label}
        </div>
      </div>
    );
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 32, fontWeight: "bold" }}>System Health & Analytics</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as TimeRange)}
            style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchHealthData}
            disabled={loadingHealth}
            style={{
              padding: "0.5rem 1rem",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
              opacity: loadingHealth ? 0.5 : 1
            }}
          >
            {loadingHealth ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {loadingHealth ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading system health data...</div>
      ) : health && metrics ? (
        <div style={{ display: "grid", gap: "2rem" }}>
          {/* System Status Overview */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>Database</h3>
                <span style={{ 
                  padding: "0.25rem 0.75rem", 
                  borderRadius: "20px", 
                  fontSize: 12, 
                  fontWeight: "500",
                  background: getStatusColor(health.database.status) + "20",
                  color: getStatusColor(health.database.status)
                }}>
                  {health.database.status}
                </span>
              </div>
              <div style={{ display: "grid", gap: "0.5rem", fontSize: 14, marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Response Time:</span>
                  <span>{health.database.responseTime}ms</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Connections:</span>
                  <span>{health.database.connections}/{health.database.maxConnections}</span>
                </div>
              </div>
              {renderGauge(health.database.connections, health.database.maxConnections, getStatusColor(health.database.status), "Connections")}
            </div>

            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>API Performance</h3>
                <span style={{ 
                  padding: "0.25rem 0.75rem", 
                  borderRadius: "20px", 
                  fontSize: 12, 
                  fontWeight: "500",
                  background: getStatusColor(health.api.status) + "20",
                  color: getStatusColor(health.api.status)
                }}>
                  {health.api.status}
                </span>
              </div>
              <div style={{ display: "grid", gap: "0.5rem", fontSize: 14, marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Response Time:</span>
                  <span>{health.api.responseTime}ms</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Requests/min:</span>
                  <span>{health.api.requestsPerMinute}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Error Rate:</span>
                  <span>{health.api.errorRate.toFixed(2)}%</span>
                </div>
              </div>
              {renderGauge(health.api.errorRate, 5, getStatusColor(health.api.status), "Error Rate")}
            </div>

            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>Storage</h3>
                <span style={{ 
                  padding: "0.25rem 0.75rem", 
                  borderRadius: "20px", 
                  fontSize: 12, 
                  fontWeight: "500",
                  background: getStatusColor(health.storage.status) + "20",
                  color: getStatusColor(health.storage.status)
                }}>
                  {health.storage.status}
                </span>
              </div>
              <div style={{ display: "grid", gap: "0.5rem", fontSize: 14, marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Used:</span>
                  <span>{formatBytes(health.storage.usedSpace)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Total:</span>
                  <span>{formatBytes(health.storage.totalSpace)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Usage:</span>
                  <span>{health.storage.usagePercentage}%</span>
                </div>
              </div>
              {renderGauge(health.storage.usagePercentage, 100, getStatusColor(health.storage.status), "Usage")}
            </div>

            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>Memory</h3>
                <span style={{ 
                  padding: "0.25rem 0.75rem", 
                  borderRadius: "20px", 
                  fontSize: 12, 
                  fontWeight: "500",
                  background: getStatusColor(health.memory.status) + "20",
                  color: getStatusColor(health.memory.status)
                }}>
                  {health.memory.status}
                </span>
              </div>
              <div style={{ display: "grid", gap: "0.5rem", fontSize: 14, marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Used:</span>
                  <span>{formatBytes(health.memory.usedMemory)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Total:</span>
                  <span>{formatBytes(health.memory.totalMemory)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Usage:</span>
                  <span>{health.memory.usagePercentage}%</span>
                </div>
              </div>
              {renderGauge(health.memory.usagePercentage, 100, getStatusColor(health.memory.status), "Usage")}
            </div>
          </div>

          {/* Performance Analytics */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Performance Analytics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>{metrics.averageResponseTime}ms</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Avg Response Time</div>
                {metrics.historicalData?.responseTimes && (
                  <div style={{ marginTop: "0.5rem" }}>
                    {renderSparkline(metrics.historicalData.responseTimes, "#3b82f6")}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>{metrics.totalRequests}</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Total Requests</div>
                {metrics.historicalData?.requests && (
                  <div style={{ marginTop: "0.5rem" }}>
                    {renderSparkline(metrics.historicalData.requests, "#10b981")}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>{metrics.errorRate.toFixed(2)}%</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Error Rate</div>
                {metrics.historicalData?.errors && (
                  <div style={{ marginTop: "0.5rem" }}>
                    {renderSparkline(metrics.historicalData.errors, "#ef4444")}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>{metrics.activeUsers}</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>Active Users</div>
                {metrics.historicalData?.users && (
                  <div style={{ marginTop: "0.5rem" }}>
                    {renderSparkline(metrics.historicalData.users, "#8b5cf6")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
            {/* Response Time Trend */}
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: 16, fontWeight: "bold" }}>Response Time Trend</h4>
              <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {metrics.historicalData?.responseTimes ? (
                  <div style={{ width: "100%", height: "100%" }}>
                    {renderSparkline(metrics.historicalData.responseTimes, "#3b82f6", 200)}
                  </div>
                ) : (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>No data available</div>
                )}
              </div>
            </div>

            {/* Request Volume */}
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: 16, fontWeight: "bold" }}>Request Volume</h4>
              <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {metrics.historicalData?.requests ? (
                  <div style={{ width: "100%", height: "100%" }}>
                    {renderSparkline(metrics.historicalData.requests, "#10b981", 200)}
                  </div>
                ) : (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>No data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Active Issues */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Active Issues ({health.activeIssues.length})</h3>
            {health.activeIssues.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#10b981" }}>
                <div style={{ fontSize: 48, marginBottom: "1rem" }}>✅</div>
                <p style={{ margin: 0, fontSize: 16 }}>All systems operational</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {health.activeIssues.map((issue) => (
                  <div key={issue.id} style={{ 
                    padding: "1rem", 
                    border: "1px solid #e5e7eb", 
                    borderRadius: "6px",
                    borderLeft: `4px solid ${getSeverityColor(issue.severity)}`
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: "600" }}>{issue.type.toUpperCase()}</h4>
                      <span style={{ 
                        padding: "0.25rem 0.5rem", 
                        borderRadius: "4px", 
                        fontSize: 12, 
                        fontWeight: "500",
                        background: getSeverityColor(issue.severity) + "20",
                        color: getSeverityColor(issue.severity)
                      }}>
                        {issue.severity}
                      </span>
                    </div>
                    <p style={{ margin: "0.5rem 0", fontSize: 14, color: "#374151" }}>{issue.description}</p>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      Created: {new Date(issue.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Alerts */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Recent Alerts</h3>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {health.recentAlerts.map((alert) => (
                <div key={alert.id} style={{ 
                  padding: "0.75rem", 
                  borderBottom: "1px solid #e5e7eb",
                  borderLeft: `4px solid ${getSeverityColor(alert.severity)}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: "500", fontSize: 14 }}>{alert.type}</span>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "4px", 
                      fontSize: 12, 
                      fontWeight: "500",
                      background: getSeverityColor(alert.severity) + "20",
                      color: getSeverityColor(alert.severity)
                    }}>
                      {alert.severity}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0", fontSize: 14, color: "#374151" }}>{alert.message}</p>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <p style={{ color: "#ef4444" }}>Failed to load system health data</p>
        </div>
      )}
    </main>
  );
} 