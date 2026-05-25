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

const HIDDEN_ACTIONS = new Set(["api_request", "api_response"]);

const FRIENDLY_AUDIT_ACTIONS: Record<string, string> = {
  user_created: "User account created",
  user_updated: "User profile updated",
  user_deleted: "User account deleted",
  role_changed: "Role changed",
  branch_changed: "Branch changed",
  login_success: "Successful sign in",
  login_failed: "Failed sign in",
  password_reset_required: "Password reset required",
  password_reset_completed: "Password reset completed",
  mfa_enabled: "MFA enabled",
  mfa_disabled: "MFA disabled",
  account_locked: "Account locked",
  account_unlocked: "Account unlocked",
};

const TECHNICAL_DETAIL_KEYS = new Set([
  "path",
  "query",
  "method",
  "timestamp",
  "useragent",
  "userid",
  "tenantid",
  "requestid",
  "traceid",
  "headers",
  "body",
]);

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatAuditAction = (action: string) => {
  const normalized = (action || "").toLowerCase();
  return FRIENDLY_AUDIT_ACTIONS[normalized] || toTitleCase(action || "Activity update");
};

const formatDetailValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  return "[complex data]";
};

const getUserFacingDetailEntries = (details: AuditLog["details"]) => {
  if (!details || typeof details !== "object" || Array.isArray(details)) return [];
  return Object.entries(details).filter(
    ([key, value]) =>
      !TECHNICAL_DETAIL_KEYS.has(key.toLowerCase()) && value !== null && value !== undefined && value !== "",
  );
};

const getAuditSummary = (log: AuditLog) => {
  if (typeof log.details === "string") return log.details || "No additional details";

  const entries = getUserFacingDetailEntries(log.details);
  if (entries.length === 0) return "No additional details";

  return entries
    .slice(0, 2)
    .map(([key, value]) => `${toTitleCase(key)}: ${formatDetailValue(value)}`)
    .join("; ");
};

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

  const visibleLogs = logs.filter((log) => !HIDDEN_ACTIONS.has((log.action || "").toLowerCase()));

  const filteredLogs = visibleLogs.filter(log => {
    const friendlyAction = formatAuditAction(log.action);
    const summary = getAuditSummary(log);
    const matchesSearch = searchTerm === "" ||
      friendlyAction.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterAction === "" || log.action === filterAction;

    return matchesSearch && matchesFilter;
  });

  const uniqueActions = [...new Set(visibleLogs.map(log => log.action))];

  const exportLogs = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "Date,User,Event,Summary\n" +
      filteredLogs.map(log =>
        `"${new Date(log.createdAt).toLocaleString()}","${log.user?.name || log.user?.email || '-'}","${formatAuditAction(log.action)}","${getAuditSummary(log)}"`
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Event</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Summary</th>
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
                        {formatAuditAction(log.action)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm max-w-xs truncate">
                      {getAuditSummary(log)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredLogs.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredLogs.length} of {visibleLogs.length} audit logs
          </div>
        )}
      </div>
    </div>
  );
}
