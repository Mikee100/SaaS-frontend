"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  database: {
    status: 'up' | 'down';
    responseTime: number;
  };
  system: {
    cpu: number;
    memory: number;
    disk: number;
  };
  uptime: number;
}

interface DatabaseMetrics {
  activeConnections: number;
  totalConnections: number;
  connectionPoolSize: number;
  queryCount: number;
  slowQueries: number;
  averageQueryTime: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: Array<{
    filesystem: string;
    size: number;
    used: number;
    available: number;
    usagePercent: number;
  }>;
  network: Array<{
    interface: string;
    rxBytes: number;
    txBytes: number;
  }>;
}

interface AlertConfig {
  id: string;
  name: string;
  type: 'database' | 'system' | 'api';
  threshold: number;
  condition: 'above' | 'below' | 'equals';
  enabled: boolean;
  notificationChannels: string[];
}

interface NotificationHistory {
  id: string;
  alertId: string;
  alertName: string;
  metricName: string;
  currentValue: number;
  threshold: number;
  status: 'sent' | 'failed';
  timestamp: string;
  message?: string;
}

interface HealthHistoryItem {
  timestamp: string;
  responseTime: number;
  cpu: number;
  memory: number;
  disk: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export default function MonitoringPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [healthHistory, setHealthHistory] = useState<HealthHistoryItem[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchMonitoringData();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && user?.isSuperadmin) {
      interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, user]);

  const fetchMonitoringData = async () => {
    try {
      setLoadingData(true);
      const [healthData, dbData, sysData, alertData, historyData, notificationData] = await Promise.all([
        apiGet("/admin/monitoring/health"),
        apiGet("/admin/monitoring/database/metrics"),
        apiGet("/admin/monitoring/system/metrics"),
        apiGet("/admin/monitoring/alerts"),
        apiGet("/admin/monitoring/health/history?limit=20"),
        apiGet("/admin/monitoring/notifications?limit=20")
      ]);
      setHealth(healthData as HealthCheckResult);
      setDatabaseMetrics(dbData as DatabaseMetrics);
      setSystemMetrics(sysData as SystemMetrics);
      setAlerts(alertData as AlertConfig[]);
      setNotificationHistory(notificationData as NotificationHistory[]);

      // Process health history for chart
      const processedHistory = (historyData as unknown[]).map(item => {
        const entry = item as Partial<HealthHistoryItem> & { system?: { cpu: number; memory: number; disk: number } };
        return {
          timestamp: new Date(entry.timestamp!).toLocaleTimeString(),
          responseTime: entry.responseTime!,
          cpu: typeof entry.cpu === "number"
            ? entry.cpu
            : (entry.system && typeof entry.system.cpu === "number" ? entry.system.cpu : 0),
          memory: typeof entry.memory === "number"
            ? entry.memory
            : (entry.system && typeof entry.system.memory === "number" ? entry.system.memory : 0),
          disk: typeof entry.disk === "number"
            ? entry.disk
            : (entry.system && typeof entry.system.disk === "number" ? entry.system.disk : 0),
          status: entry.status as 'healthy' | 'degraded' | 'unhealthy'
        };
      });
      setHealthHistory(processedHistory);
    } catch (error) {
      console.error("Failed to fetch monitoring data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'unhealthy':
      case 'down': return '#ef4444';
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

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const renderGauge = (value: number, max: number, color: string, label: string) => {
    const percentage = Math.min((value / max) * 100, 100);
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
          {value.toFixed(1)}%
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
        <h1 style={{ fontSize: 32, fontWeight: "bold" }}>System Monitoring Dashboard</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchMonitoringData}
            disabled={loadingData}
            style={{
              padding: "0.5rem 1rem",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
              opacity: loadingData ? 0.5 : 1
            }}
          >
            {loadingData ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading monitoring data...</div>
      ) : (
        <div style={{ display: "grid", gap: "2rem" }}>
          {/* Overall Health Status */}
          {health && (
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: "bold" }}>System Health Status</h3>
                <span style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                  fontSize: 14,
                  fontWeight: "600",
                  background: getStatusColor(health.status) + "20",
                  color: getStatusColor(health.status)
                }}>
                  {health.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>Response Time</div>
                  <div style={{ fontSize: 18, fontWeight: "bold" }}>{health.responseTime}ms</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>Uptime</div>
                  <div style={{ fontSize: 18, fontWeight: "bold" }}>{formatUptime(health.uptime)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>Last Check</div>
                  <div style={{ fontSize: 14 }}>{new Date(health.timestamp).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* System Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {/* Database Metrics */}
            {databaseMetrics && (
              <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>Database Performance</h3>
                  <span style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "20px",
                    fontSize: 12,
                    fontWeight: "500",
                    background: getStatusColor(health?.database.status || 'up') + "20",
                    color: getStatusColor(health?.database.status || 'up')
                  }}>
                    {health?.database.status || 'up'}
                  </span>
                </div>
                <div style={{ display: "grid", gap: "0.75rem", fontSize: 14, marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Active Connections:</span>
                    <span>{databaseMetrics.activeConnections}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total Connections:</span>
                    <span>{databaseMetrics.totalConnections}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Query Count:</span>
                    <span>{databaseMetrics.queryCount}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Slow Queries:</span>
                    <span>{databaseMetrics.slowQueries}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Avg Query Time:</span>
                    <span>{databaseMetrics.averageQueryTime.toFixed(2)}ms</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>DB Response Time:</span>
                    <span>{health?.database.responseTime || 0}ms</span>
                  </div>
                </div>
                {renderGauge(databaseMetrics.activeConnections, databaseMetrics.totalConnections, getStatusColor(health?.database.status || 'up'), "Connection Usage")}
              </div>
            )}

            {/* System Resources */}
            {systemMetrics && (
              <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: 18, fontWeight: "bold" }}>System Resources</h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {/* CPU */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#6b7280" }}>CPU Usage</div>
                      <div style={{ fontSize: 16, fontWeight: "bold" }}>{systemMetrics.cpu.usage.toFixed(1)}%</div>
                    </div>
                    <div style={{ width: "80px" }}>
                      {renderGauge(systemMetrics.cpu.usage, 100, getStatusColor(systemMetrics.cpu.usage > 90 ? 'unhealthy' : systemMetrics.cpu.usage > 80 ? 'degraded' : 'healthy'), "")}
                    </div>
                  </div>

                  {/* Memory */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#6b7280" }}>Memory Usage</div>
                      <div style={{ fontSize: 16, fontWeight: "bold" }}>{systemMetrics.memory.usagePercent.toFixed(1)}%</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {formatBytes(systemMetrics.memory.used)} / {formatBytes(systemMetrics.memory.total)}
                      </div>
                    </div>
                    <div style={{ width: "80px" }}>
                      {renderGauge(systemMetrics.memory.usagePercent, 100, getStatusColor(systemMetrics.memory.usagePercent > 85 ? 'unhealthy' : systemMetrics.memory.usagePercent > 80 ? 'degraded' : 'healthy'), "")}
                    </div>
                  </div>

                  {/* Disk */}
                  <div>
                    <div style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Disk Usage</div>
                    {systemMetrics.disk.map((disk, index) => (
                      <div key={index} style={{ marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                          <span style={{ fontSize: 12 }}>{disk.filesystem}</span>
                          <span style={{ fontSize: 12 }}>{disk.usagePercent.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${disk.usagePercent}%`,
                              height: "100%",
                              background: getStatusColor(disk.usagePercent > 90 ? 'unhealthy' : disk.usagePercent > 85 ? 'degraded' : 'healthy'),
                              borderRadius: "3px"
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: "0.25rem" }}>
                          {formatBytes(disk.used)} / {formatBytes(disk.size)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Health History Chart */}
          {healthHistory.length > 0 && (
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Health History (Last 20 Checks)</h3>
              <div style={{ height: "300px", width: "100%" }}>
                <ResponsiveContainer>
                  <LineChart data={healthHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="responseTime" stroke="#3b82f6" name="Response Time (ms)" />
                    <Line type="monotone" dataKey="cpu" stroke="#ef4444" name="CPU Usage (%)" />
                    <Line type="monotone" dataKey="memory" stroke="#f59e0b" name="Memory Usage (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Alert Configuration */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Alert Configuration</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              {alerts.map((alert) => (
                <div key={alert.id} style={{
                  padding: "1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: alert.enabled ? "#f9fafb" : "#fff"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: "600" }}>{alert.name}</h4>
                      <p style={{ margin: "0.25rem 0", fontSize: 14, color: "#6b7280" }}>
                        {alert.type} • {alert.condition} {alert.threshold}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: 12,
                        fontWeight: "500",
                        background: alert.enabled ? "#10b98120" : "#6b728020",
                        color: alert.enabled ? "#10b981" : "#6b7280"
                      }}>
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    Notifications: {alert.notificationChannels.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification History */}
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Notification History</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              {notificationHistory.length > 0 ? (
                notificationHistory.map((notification) => (
                  <div key={notification.id} style={{
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    background: notification.status === 'sent' ? "#f0fdf4" : "#fef2f2"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: "600" }}>{notification.alertName}</h4>
                        <p style={{ margin: "0.25rem 0", fontSize: 14, color: "#6b7280" }}>
                          {notification.metricName}: {notification.currentValue} (Threshold: {notification.threshold})
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: 12,
                          fontWeight: "500",
                          background: notification.status === 'sent' ? "#10b98120" : "#ef444420",
                          color: notification.status === 'sent' ? "#10b981" : "#ef4444"
                        }}>
                          {notification.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                    {notification.message && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: "0.5rem" }}>
                        {notification.message}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  No notifications yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
