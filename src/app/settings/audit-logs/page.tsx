"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";

export default function AuditLogsSettings() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/audit-logs").then((value) => setLogs(value as any[])).catch(() => setError("Failed to load logs")).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 0' }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 32 }}>Audit Logs</h2>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>
      ) : logs.length === 0 ? (
        <div style={{ color: '#888' }}>No audit logs found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#444' }}>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>User</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Action</th>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 0', color: '#555' }}>{new Date(log.createdAt).toLocaleString()}</td>
                <td style={{ padding: '8px 0', color: '#555' }}>{log.user?.name || log.user?.email || '-'}</td>
                <td style={{ padding: '8px 0', color: '#555' }}>{log.action}</td>
                <td style={{ padding: '8px 0', color: '#555', fontSize: 14 }}>{typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 