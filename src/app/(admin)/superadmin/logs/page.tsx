"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";

interface AuditLogDetails {
  [key: string]: unknown;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  method?: string;
  path?: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  statusCode?: number;
  duration?: number;
  tenantId?: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: AuditLogDetails | string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  tenant: {
    id: string;
    name: string;
  } | null;
}

export default function SuperadminLogsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [filter, setFilter] = useState<'all' | 'api' | 'user'>('all');

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await apiGet("/admin/logs") as AuditLog[];
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'api') return log.action === 'api_request' || log.action === 'api_response';
    if (filter === 'user') return log.action !== 'api_request' && log.action !== 'api_response';
    return true;
  });

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return '#10b981';
      case 'update':
        return '#3b82f6';
      case 'delete':
        return '#ef4444';
      case 'login':
        return '#8b5cf6';
      case 'api_request':
        return '#06b6d4';
      case 'api_response':
        return '#84cc16';
      default:
        return '#6b7280';
    }
  };

  const formatDetails = (details: AuditLogDetails | string | null) => {
    if (!details) return "No details";
    if (typeof details === 'string') return details;

    try {
      const parsed = details as AuditLogDetails;

      // Special formatting for API requests/responses
      if (parsed.method && parsed.path) {
        const method = parsed.method;
        const path = parsed.path;
        const status = parsed.statusCode ? ` (${parsed.statusCode})` : '';
        const duration = parsed.duration ? ` - ${parsed.duration}ms` : '';
        const query = parsed.query && Object.keys(parsed.query).length > 0 ?
          `\nQuery: ${JSON.stringify(parsed.query)}` : '';
        const body = parsed.body && Object.keys(parsed.body).length > 0 ?
          `\nBody: ${JSON.stringify(parsed.body)}` : '';

        return `${method} ${path}${status}${duration}${query}${body}`;
      }

      return JSON.stringify(details, null, 2);
    } catch {
      return 'Unable to parse details';
    }
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: "2rem" }}>Platform Logs</h1>

      <div style={{ marginBottom: "2rem" }}>
        <label style={{ marginRight: "1rem", fontWeight: "bold" }}>Filter:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'api' | 'user')}
          style={{
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid #d1d5db",
            backgroundColor: "white"
          }}
        >
          <option value="all">All Activities</option>
          <option value="api">API Hits Only</option>
          <option value="user">User Activities Only</option>
        </select>
      </div>

      {loadingLogs ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Loading audit logs...
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              style={{
                background: "#fff",
                padding: "1.5rem",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                borderLeft: `4px solid ${getActionColor(log.action)}`
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                    <span style={{
                      background: getActionColor(log.action),
                      color: "#fff",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "4px",
                      fontSize: 12,
                      fontWeight: "500",
                      textTransform: "uppercase"
                    }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: 14, color: "#6b7280" }}>
                      {log.entityType} {log.entityId}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: "#6b7280" }}>
                    {log.user ? `${log.user.name} (${log.user.email})` : "System"}
                    {log.tenant && ` • ${log.tenant.name}`}
                  </p>
                </div>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              
              {log.details && (
                <details style={{ marginTop: "1rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: "500", color: "#374151" }}>
                    View Details
                  </summary>
                  <pre style={{
                    background: "#f9fafb",
                    padding: "1rem",
                    borderRadius: "4px",
                    fontSize: 12,
                    color: "#374151",
                    marginTop: "0.5rem",
                    overflow: "auto",
                    maxHeight: "200px"
                  }}>
                    {formatDetails(log.details)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredLogs.length === 0 && !loadingLogs && (
        <div style={{ 
          background: "#fff", 
          padding: "2rem", 
          borderRadius: "8px", 
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          textAlign: "center"
        }}>
          <p style={{ color: "#6b7280" }}>No audit logs found</p>
        </div>
      )}

      <div style={{ 
        background: "#fff", 
        padding: "1.5rem", 
        borderRadius: "8px", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginTop: "2rem"
      }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Log Statistics</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Total Logs</h3>
            <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>{filteredLogs.length}</p>
          </div>
          <div>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Today</h3>
            <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
              {filteredLogs.filter(log => {
                const today = new Date();
                const logDate = new Date(log.createdAt);
                return logDate.toDateString() === today.toDateString();
              }).length}
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>This Week</h3>
            <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
              {filteredLogs.filter(log => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const logDate = new Date(log.createdAt);
                return logDate >= weekAgo;
              }).length}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 