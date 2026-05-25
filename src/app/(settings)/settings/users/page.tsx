"use client";

import { useEffect, useState, useRef } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import Link from "next/link";
import { FaEdit, FaTrash, FaUserPlus, FaUsers, FaClipboardList, FaDownload } from "react-icons/fa";

interface UserRoleLink {
  role: {
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  userRoles: UserRoleLink[];
  createdAt: string;
  isSuperadmin?: boolean;
  branchId?: string;
  lastLogin?: string;
  failedLoginCount?: number;
  mfaEnabled?: boolean;
  forceReset?: boolean;
  locked?: boolean;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface AuditLog {
  id: string;
  action: string;
  createdAt: string;
  details?: unknown;
}

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
  api_request: "System request",
};

const TECHNICAL_AUDIT_KEYS = new Set([
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

const AUDIT_META_KEY_PRIORITY = [
  "email",
  "name",
  "role",
  "newRole",
  "oldRole",
  "branch",
  "branchName",
  "newBranch",
  "oldBranch",
  "note",
  "auditNote",
  "reason",
  "status",
  "target",
  "resource",
  "module",
  "entity",
  "entityName",
  "amount",
  "currency",
];

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

const formatAuditValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((item) => formatAuditValue(item)).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getAuditDetailsMap = (details: unknown): Record<string, unknown> => {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return {};
  }
  return details as Record<string, unknown>;
};

const isTechnicalAuditField = (key: string) => TECHNICAL_AUDIT_KEYS.has(key.toLowerCase());

const isRequestMetadataLog = (info: Record<string, unknown>) => {
  const path = typeof info.path === "string" ? info.path : "";
  const method = typeof info.method === "string" ? info.method : "";
  return !!path && !!method;
};

const getUserFacingAuditEntries = (info: Record<string, unknown>) => {
  return Object.entries(info).filter(
    ([key, value]) =>
      !isTechnicalAuditField(key) && value !== null && value !== undefined && value !== "",
  );
};

const getAuditSummary = (log: AuditLog): string => {
  const info = getAuditDetailsMap(log.details);
  const userEntries = getUserFacingAuditEntries(info);

  if (isRequestMetadataLog(info)) {
    const path = typeof info.path === "string" ? info.path : "";
    const method = typeof info.method === "string" ? info.method.toUpperCase() : "";
    if (path.includes("/audit-logs")) {
      return "Viewed activity log";
    }
    return `System request (${method} ${path})`;
  }

  const role = formatAuditValue(info.role ?? info.newRole);
  const branch = formatAuditValue(info.branchName ?? info.branch ?? info.newBranch);
  const note = formatAuditValue(info.auditNote ?? info.note ?? info.reason);
  const ip = formatAuditValue(info.ipAddress ?? info.ip);

  if (role !== "-" && branch !== "-") return `Role: ${role}; Branch: ${branch}`;
  if (role !== "-") return `Role: ${role}`;
  if (branch !== "-") return `Branch: ${branch}`;
  if (note !== "-") return `Note: ${note}`;
  if (ip !== "-") return `IP: ${ip}`;

  if (userEntries.length === 1) {
    return `${toTitleCase(userEntries[0][0])}: ${formatAuditValue(userEntries[0][1])}`;
  }

  const fallback = typeof log.details === "string" ? formatAuditValue(log.details) : "-";
  return fallback !== "-" ? fallback : "No additional details";
};

const getAuditMetaRows = (log: AuditLog): Array<{ label: string; value: string }> => {
  const info = getAuditDetailsMap(log.details);
  if (isRequestMetadataLog(info)) {
    return [];
  }

  const userEntries = getUserFacingAuditEntries(info);

  const sortedEntries = [...userEntries].sort(([a], [b]) => {
    const ai = AUDIT_META_KEY_PRIORITY.indexOf(a);
    const bi = AUDIT_META_KEY_PRIORITY.indexOf(b);
    const av = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bv = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    return av - bv;
  });

  const entries = sortedEntries
    .slice(0, 3)
    .map(([key, value]) => ({ label: toTitleCase(key), value: formatAuditValue(value) }));

  return entries;
};

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [form, setForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    role: "",
  });
  const [branchId, setBranchId] = useState("");
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [activityUser, setActivityUser] = useState<User | null>(null);
  const [activityLogs, setActivityLogs] = useState<AuditLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState("");
  const csvLinkRef = useRef<HTMLAnchorElement>(null);

  const openActivityDrawer = async (user: User) => {
    setActivityUser(user);
    setShowActivityDrawer(true);
    setLoadingActivity(true);
    setActivityLogs([]);
    setActivityError("");
    try {
      const logs = await apiGet<AuditLog[]>(`/audit-logs?userId=${user.id}&limit=50`);
      setActivityLogs(Array.isArray(logs) ? logs : []);
    } catch (err: unknown) {
      setActivityError(err instanceof Error ? err.message : "Failed to load activity logs");
    } finally {
      setLoadingActivity(false);
    }
  };

  const closeActivityDrawer = () => {
    setShowActivityDrawer(false);
    setActivityUser(null);
    setActivityLogs([]);
    setActivityError("");
  };

  const exportActivityLogs = () => {
    if (!activityLogs.length) return;
    const headers = ["Date", "Event", "Summary"];
    const rows = activityLogs.map((log) => [
      new Date(log.createdAt).toLocaleString(),
      formatAuditAction(log.action),
      getAuditSummary(log),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    if (csvLinkRef.current) {
      csvLinkRef.current.href = url;
      csvLinkRef.current.download = `${activityUser?.name || "user"}-activity.csv`;
      csvLinkRef.current.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [usersData, rolesData, branchesData] = await Promise.all([
        apiGet<User[]>("/user"),
        apiGet<Role[]>("/roles"),
        apiGet<Branch[]>("/branches"),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users data");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const isOwnerAccount = (user: User) => {
    return (user.userRoles || []).some(
      (userRole) => userRole.role?.name?.toLowerCase() === "owner",
    );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetCreateForm = () => {
    setForm({ name: "", email: "", password: "", role: "" });
    setBranchId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.password || !form.role || !branchId) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiPost("/user", {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        branchId,
      });

      resetCreateForm();
      setShowAddModal(false);
      await loadData();
      showSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user: User) => {
    if (isOwnerAccount(user)) {
      setError("Owner account cannot be edited.");
      return;
    }
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) {
      return;
    }

    if (isOwnerAccount(editingUser)) {
      setError("Owner account cannot be edited.");
      setShowEditModal(false);
      setEditingUser(null);
      return;
    }

    const editedRole = editingUser.userRoles[0]?.role?.name ?? "";

    setSaving(true);
    setError("");

    try {
      await apiPut(`/user/${editingUser.id}`, {
        name: editingUser.name,
        role: editedRole,
        branchId: editingUser.branchId || undefined,
      });

      setShowEditModal(false);
      setEditingUser(null);
      await loadData();
      showSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (user: User) => {
    if (isOwnerAccount(user)) {
      setError("Owner account cannot be deleted.");
      return;
    }
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) {
      return;
    }

    if (isOwnerAccount(userToDelete)) {
      setError("Owner account cannot be deleted.");
      setShowDeleteModal(false);
      setUserToDelete(null);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiDelete(`/user/${userToDelete.id}`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      await loadData();
      showSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
  };

  // Inline role/branch change state and handlers (must be at top level, not inside JSX)
  const [pendingChange, setPendingChange] = useState<{
    user: User;
    field: 'role' | 'branch';
    newValue: string;
  } | null>(null);
  const [auditNote, setAuditNote] = useState("");

  // Handler for inline role change
  const handleInlineRoleChange = (user: User, newRole: string) => {
    if (isOwnerAccount(user)) return;
    setPendingChange({ user, field: 'role', newValue: newRole });
  };

  // Handler for inline branch change
  const handleInlineBranchChange = (user: User, newBranchId: string) => {
    if (isOwnerAccount(user)) return;
    setPendingChange({ user, field: 'branch', newValue: newBranchId });
  };

  // Handler for confirming the change
  const handleConfirmChange = async () => {
    if (!pendingChange) return;
    setSaving(true);
    setError("");
    try {
      if (pendingChange.field === 'role') {
        await apiPut(`/user/${pendingChange.user.id}`, {
          name: pendingChange.user.name,
          role: pendingChange.newValue,
          branchId: pendingChange.user.branchId || undefined,
          auditNote,
        });
      } else if (pendingChange.field === 'branch') {
        await apiPut(`/user/${pendingChange.user.id}`, {
          name: pendingChange.user.name,
          role: pendingChange.user.userRoles[0]?.role?.name || "",
          branchId: pendingChange.newValue,
          auditNote,
        });
      }
      setPendingChange(null);
      setAuditNote("");
      await loadData();
      showSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // Handler for cancelling the change
  const handleCancelChange = () => {
    setPendingChange(null);
    setAuditNote("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }
  return (
    <div className="mx-auto min-h-[80vh] max-w-7xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaUsers className="text-2xl text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Users</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow transition hover:bg-blue-700"
          >
            <FaUserPlus />
            <span>Add New User</span>
          </button>
          <Link
            href="/settings"
            className="flex items-center text-sm text-blue-600 hover:underline"
          >
            ← All Settings
          </Link>
        </div>
      </div>

      {success && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-2 text-green-700">
          Operation completed successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-red-700">
          {error}
        </div>
      )}

      <div className="w-full rounded-xl bg-white p-8 shadow">
        <div className="mb-6 flex items-center gap-2">
          <FaUsers className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Organization Users</h3>
          <span className="text-sm text-gray-500">({users.length} users)</span>
        </div>

        {users.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <FaUsers className="mx-auto mb-4 text-4xl text-gray-300" />
            <p>No users found in your organization.</p>
            <p className="mt-2 text-sm">Add your first user to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3 flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <span className="text-sm font-medium text-blue-600">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-600">{user.email}</div>
                    </div>
                    {user.isSuperadmin && (
                      <span className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">
                        Super Admin
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isOwnerAccount(user) && (
                      <>
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-md p-2 text-blue-600 transition hover:bg-blue-50"
                          title="Edit user"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="rounded-md p-2 text-red-600 transition hover:bg-red-50"
                          title={user.isSuperadmin ? "Super Admin cannot be deleted" : "Delete user"}
                          disabled={user.isSuperadmin}
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openActivityDrawer(user)}
                      className="rounded-md p-2 text-gray-600 transition hover:bg-gray-100"
                      title="View activity"
                    >
                      <FaClipboardList className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="rounded-md bg-gray-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Access</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">Role</span>
                        {isOwnerAccount(user) ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            {(user.userRoles || [])
                              .map((ur) => ur.role?.name)
                              .filter(Boolean)
                              .join(", ") || "No Role"}
                          </span>
                        ) : (
                          <select
                            className="rounded border px-2 py-1 text-xs"
                            value={user.userRoles[0]?.role?.name || ""}
                            onChange={(e) => handleInlineRoleChange(user, e.target.value)}
                            disabled={saving}
                          >
                            <option value="">Select Role</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.name}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">Branch</span>
                        {isOwnerAccount(user) ? (
                          <span className="text-xs text-gray-700">
                            {branches.find((branch) => branch.id === user.branchId)?.name || "No Branch"}
                          </span>
                        ) : (
                          <select
                            className="rounded border px-2 py-1 text-xs"
                            value={user.branchId || ""}
                            onChange={(e) => handleInlineBranchChange(user, e.target.value)}
                            disabled={saving}
                          >
                            <option value="">Select Branch</option>
                            {branches.map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">Created</span>
                        <span className="text-xs text-gray-700">{formatDate(user.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md bg-gray-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Authentication</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">Last Login</span>
                        <span className="text-xs text-gray-700">
                          {user.lastLogin ? formatDate(user.lastLogin) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">Failed Logins</span>
                        <span className="text-xs text-gray-700">
                          {typeof user.failedLoginCount === "number" ? user.failedLoginCount : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">MFA</span>
                        {user.mfaEnabled ? (
                          <span className="text-xs font-medium text-green-600">Enabled</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md bg-gray-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Security Controls</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">Force Reset</span>
                        {user.forceReset ? (
                          <span className="text-xs font-medium text-red-600">Required</span>
                        ) : (
                          <button
                            className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 hover:bg-yellow-200"
                            disabled={saving}
                          >
                            Force
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-500">Lock Status</span>
                        {user.locked ? (
                          <span className="text-xs font-medium text-red-600">Locked</span>
                        ) : (
                          <button
                            className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-800 hover:bg-gray-200"
                            disabled={saving}
                          >
                            Lock
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Confirm {pendingChange.field === 'role' ? 'Role' : 'Branch'} Change</h3>
            <p className="mb-2 text-gray-700">
              Are you sure you want to change {pendingChange.user.name}'s {pendingChange.field} to <strong>{pendingChange.newValue}</strong>?
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">Audit Note (optional)</label>
            <textarea
              className="mb-4 w-full rounded border border-gray-300 px-3 py-2"
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              rows={2}
            />
            <div className="flex gap-3">
              <button
                onClick={handleConfirmChange}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
              <button
                onClick={handleCancelChange}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showActivityDrawer && activityUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative mx-4 w-full max-w-2xl rounded-xl bg-white p-8 shadow-lg">
            <button
              className="absolute right-3 top-3 text-xl text-gray-400 hover:text-gray-600"
              onClick={closeActivityDrawer}
              aria-label="Close"
            >
              x
            </button>
            <div className="mb-6 flex items-center gap-2">
              <FaClipboardList className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">{activityUser.name}'s Activity</h3>
            </div>
            <div className="mb-4 flex items-center gap-2 justify-between">
              <span className="text-sm text-gray-600">Recent user activity (last 50)</span>
              <button
                onClick={exportActivityLogs}
                className="flex items-center gap-2 px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                disabled={loadingActivity || !activityLogs.length}
              >
                <FaDownload className="h-4 w-4" /> Export CSV
              </button>
              <a ref={csvLinkRef} style={{ display: 'none' }}>Download</a>
            </div>
            {loadingActivity ? (
              <div className="py-8 text-center text-gray-500">Loading activity...</div>
            ) : activityError ? (
              <div className="py-8 text-center text-red-600">{activityError}</div>
            ) : activityLogs.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No activity found for this user.</div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-xs border">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-700">When</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">What Happened</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {formatAuditAction(log.action)}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-sm align-top">
                          <div className="text-gray-800">{getAuditSummary(log)}</div>
                          {getAuditMetaRows(log).length > 0 && (
                            <div className="mt-1 space-y-0.5 text-[11px] text-gray-500">
                              {getAuditMetaRows(log).map((item) => (
                                <div key={`${log.id}-${item.label}`}>
                                  <span className="font-medium text-gray-600">{item.label}:</span> {item.value}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative mx-4 w-full max-w-lg rounded-xl bg-white p-8 shadow-lg">
            <button
              className="absolute right-3 top-3 text-xl text-gray-400 hover:text-gray-600"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >
              x
            </button>
            <div className="mb-6 flex items-center gap-2">
              <FaUserPlus className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Add New User</h3>
            </div>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 items-end gap-4 md:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={saving}
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={saving}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex gap-3 md:col-span-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    saving ||
                    !form.name ||
                    !form.email ||
                    !form.password ||
                    !form.role ||
                    !branchId
                  }
                >
                  {saving ? "Creating..." : "Add User"}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Edit User</h3>
            <form onSubmit={handleEditUser}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={editingUser.userRoles[0]?.role?.name || ""}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev
                          ? { ...prev, userRoles: [{ role: { name: e.target.value } }] }
                          : prev,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Branch</label>
                  <select
                    value={editingUser.branchId ?? ""}
                    onChange={(e) =>
                      setEditingUser((prev) =>
                        prev ? { ...prev, branchId: e.target.value } : prev,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">Delete User</h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete <strong>{userToDelete.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Deleting..." : "Delete User"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
