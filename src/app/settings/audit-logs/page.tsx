"use client";
import { useEffect, useState } from "react";
import { apiGet } from "../../../utils/api";
import Spinner from "@/components/Spinner";

interface AuditLog {
  id: string;
  createdAt: string;
  user?: { email?: string; name?: string } | null;
  userId?: string | null;
  action: string;
  details: any;
  ip?: string | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet("/audit-logs");
        setLogs(Array.isArray(res) ? res : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
    setIsClient(true);
  }, []);

  return (
    <div className="p-8 w-full">
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>
      {loading ? (
        <Spinner size={40} className="my-12" />
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">User</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Details</th>
                <th className="px-4 py-3 text-left font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-blue-50 transition">
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                      {isClient ? new Date(log.createdAt).toLocaleString() : log.createdAt}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                      {log.user?.name || log.user?.email || log.userId || <span className="italic text-gray-400">System</span>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-blue-700 font-medium">{log.action}</td>
                    <td className="px-4 py-2 max-w-xs truncate text-gray-600">
                      <pre className="whitespace-pre-wrap break-all text-xs bg-gray-50 rounded p-2">{JSON.stringify(log.details, null, 2)}</pre>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{log.ip || <span className="italic text-gray-300">-</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 