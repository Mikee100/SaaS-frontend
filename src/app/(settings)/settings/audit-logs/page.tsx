"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { FaClipboardList } from 'react-icons/fa';
import Link from "next/link";

interface AuditLog {
  id: string | number;
  createdAt: string;
  user?: {
    name?: string;
    email?: string;
  };
  action: string;
  details: any;
}

export default function AuditLogsSettings() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/audit-logs").then((value) => setLogs(value as any[])).catch(() => setError("Failed to load logs")).finally(() => setLoading(false));
  }, []);

  const handleRowClick = () => {
    // Handle row click
  };



  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaClipboardList className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      <div className="bg-white rounded-xl shadow p-8 w-full">
        {error ? (
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
                <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }} onClick={handleRowClick}>
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
    </div>
  );
}