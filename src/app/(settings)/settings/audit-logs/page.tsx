"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";
import { FaClipboardList, FaSearch, FaDownload } from 'react-icons/fa';
import Link from "next/link";

interface AuditLogUser {
  name?: string;
  email?: string;
}

interface AuditLogDetails {
  [key: string]: unknown;
  timestamp?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLog {
  id: string | number;
  createdAt: string;
  user?: AuditLogUser;
  action: string;
  details: AuditLogDetails | string;
}

export default function AuditLogsSettings() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiGet<AuditLog[]>("/audit-logs");
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
        }
      } catch (err) {
        setError("Failed to load audit logs");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === "" ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterAction === "" || log.action === filterAction;

    return matchesSearch && matchesFilter;
  });

  const uniqueActions = [...new Set(logs.map(log => log.action))];

  const exportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Date,User,Action,Details\n" +
      filteredLogs.map(log =>
        `"${new Date(log.createdAt).toLocaleString()}","${log.user?.name || log.user?.email || '-'}","${log.action}","${typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}"`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit-logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaClipboardList className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>

      <div className="bg-white rounded-xl shadow p-8 w-full">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FaDownload className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">{error}</div>
            <p className="text-gray-600">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <FaClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {logs.length === 0 ? "No audit logs available" : "No logs match your filters"}
            </h3>
            <p className="text-gray-600">
              {logs.length === 0
                ? "Audit logs will appear here once users perform actions in the system."
                : "Try adjusting your search or filter criteria."
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {log.user?.name || log.user?.email || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm max-w-xs truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredLogs.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} audit logs
          </div>
        )}
      </div>
    </div>
  );
}
