"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/utils/api";
import Link from "next/link";
import {
  FiActivity,
  FiAlertCircle,
  FiChevronDown,
  FiChevronRight,
  FiCheck,
  FiClock,
  FiFilter,
  FiLogOut,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSlash,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

interface User {
  id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
  isDisabled: boolean;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
  } | null;
  userRoles: {
    role: {
      name: string;
    };
  }[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

type StatusFilter = "all" | "active" | "disabled";
type ScopeFilter = "all" | "superadmin" | "tenant";
type SortKey = "createdAt_desc" | "createdAt_asc" | "name_asc" | "email_asc";

type UserGroup = {
  key: string;
  name: string;
  users: User[];
  tenantId?: string;
  isPlatformGroup?: boolean;
};

interface LoginActivity {
  id: string;
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  user: {
    name: string;
    email: string;
  };
}

export default function SuperadminUsersPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActivity, setUserActivity] = useState<LoginActivity[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt_desc");

  const [pendingRoleByUser, setPendingRoleByUser] = useState<Record<string, string>>({});
  const [actionByUser, setActionByUser] = useState<Record<string, string>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const [confirmAction, setConfirmAction] = useState<
    | {
        kind: "toggleStatus" | "logoutAll";
        userId: string;
        title: string;
        body: string;
        confirmLabel: string;
      }
    | null
  >(null);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      void refreshData();
    }
  }, [user]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const setRowAction = (userId: string, action: string | null) => {
    setActionByUser((prev) => {
      if (!action) {
        const { [userId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [userId]: action };
    });
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchUsers(), fetchRoles()]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await apiGet("/admin/users") as User[];
      setUsers(data);
      setNotice(null);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setNotice({ type: "error", message: "Failed to load users. Please refresh and try again." });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRoles = async () => {
    try {
      // Superadmin route does not expose /admin/roles. Use shared /roles endpoint.
      const data = await apiGet("/roles") as Role[];
      setRoles(data);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      setRoles([]);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setRowAction(userId, "status");
      await apiPut(`/admin/users/${userId}/status`, { isDisabled: !currentStatus });
      setNotice({
        type: "success",
        message: `User ${currentStatus ? "enabled" : "disabled"} successfully.`,
      });
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update user status:", error);
      setNotice({ type: "error", message: "Failed to update user status." });
    } finally {
      setRowAction(userId, null);
    }
  };

  const updateUserRole = async (targetUser: User, roleId: string) => {
    try {
      if (!roleId) return;
      if (!targetUser.tenant?.id) {
        setNotice({ type: "error", message: "Cannot assign role: user is not attached to a tenant." });
        return;
      }

      setRowAction(targetUser.id, "role");
      await apiPut(`/admin/users/${targetUser.id}/role`, {
        roleId,
        tenantId: targetUser.tenant.id,
      });

      const roleName = roles.find((r) => r.id === roleId)?.name ?? "role";
      setNotice({ type: "success", message: `${targetUser.name}: role updated to ${roleName}.` });
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update user role:", error);
      setNotice({ type: "error", message: "Failed to update user role." });
    } finally {
      setRowAction(targetUser.id, null);
    }
  };

  const logoutAllSessions = async (targetUser: User) => {
    try {
      setRowAction(targetUser.id, "logoutAll");
      await apiPost(`/admin/users/${targetUser.id}/logout-all`, {});
      setNotice({ type: "success", message: `Revoked active sessions for ${targetUser.name}.` });
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
      setNotice({ type: "error", message: "Failed to revoke user sessions." });
    } finally {
      setRowAction(targetUser.id, null);
    }
  };

  const fetchUserActivity = async (userId: string) => {
    try {
      setSelectedUser(users.find((u) => u.id === userId) || null);
      setLoadingActivity(true);
      const data = await apiGet(`/admin/users/${userId}/activity?limit=50`) as LoginActivity[];
      setUserActivity(data);
      setShowActivityModal(true);
    } catch (error) {
      console.error("Failed to fetch user activity:", error);
      setNotice({ type: "error", message: "Failed to fetch user activity." });
    } finally {
      setLoadingActivity(false);
    }
  };

  const getRoleNames = (userRoles: User['userRoles']) => {
    return userRoles.map(ur => ur.role.name).join(", ") || "No role";
  };

  if (loading || !user) return null;

  const tenants = React.useMemo(
    () =>
      Array.from(new Set(users.map((u) => u.tenant?.name).filter(Boolean) as string[]))
        .sort((a, b) => a.localeCompare(b)),
    [users],
  );

  const filteredUsers = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    let next = users.filter((u) => {
      if (statusFilter === "active" && u.isDisabled) return false;
      if (statusFilter === "disabled" && !u.isDisabled) return false;

      if (scopeFilter === "superadmin" && !u.isSuperadmin) return false;
      if (scopeFilter === "tenant" && u.isSuperadmin) return false;

      if (tenantFilter !== "all" && (u.tenant?.name || "") !== tenantFilter) return false;

      if (!query) return true;
      const haystack = `${u.name} ${u.email} ${u.tenant?.name || ""} ${getRoleNames(u.userRoles)}`.toLowerCase();
      return haystack.includes(query);
    });

    next = [...next].sort((a, b) => {
      if (sortKey === "createdAt_desc") {
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
      if (sortKey === "createdAt_asc") {
        return +new Date(a.createdAt) - +new Date(b.createdAt);
      }
      if (sortKey === "name_asc") return a.name.localeCompare(b.name);
      return a.email.localeCompare(b.email);
    });

    return next;
  }, [users, search, statusFilter, scopeFilter, tenantFilter, sortKey]);

  const groupedUsers = React.useMemo<UserGroup[]>(() => {
    const groups = new Map<string, UserGroup>();

    for (const currentUser of filteredUsers) {
      const isPlatformGroup = currentUser.isSuperadmin || !currentUser.tenant?.id;
      const key = isPlatformGroup
        ? "platform-superadmins"
        : `tenant:${currentUser.tenant?.id}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: isPlatformGroup
            ? "Platform Superadmins"
            : currentUser.tenant?.name || "Unknown Tenant",
          users: [],
          tenantId: currentUser.tenant?.id,
          isPlatformGroup,
        });
      }

      groups.get(key)?.users.push(currentUser);
    }

    const sorted = Array.from(groups.values()).sort((a, b) => {
      if (a.isPlatformGroup && !b.isPlatformGroup) return -1;
      if (!a.isPlatformGroup && b.isPlatformGroup) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [filteredUsers]);

  const stats = React.useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => !u.isDisabled).length;
    const disabled = users.filter((u) => u.isDisabled).length;
    const superadmins = users.filter((u) => u.isSuperadmin).length;
    const tenantUsers = total - superadmins;
    return { total, active, disabled, superadmins, tenantUsers };
  }, [users]);

  const roleIdFromUser = (targetUser: User) => {
    const firstRoleName = targetUser.userRoles[0]?.role?.name?.toLowerCase();
    if (!firstRoleName) return "";
    return roles.find((r) => r.name.toLowerCase() === firstRoleName)?.id || "";
  };

  const resolvePendingRole = (targetUser: User) => {
    return pendingRoleByUser[targetUser.id] ?? roleIdFromUser(targetUser);
  };

  const selectedActivitySuccessCount = userActivity.filter((a) => a.success).length;
  const selectedActivityFailureCount = userActivity.filter((a) => !a.success).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-350 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">User Administration</h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage access, roles, account state, and session security across all tenants.
              </p>
            </div>
            <button
              onClick={() => void refreshData()}
              disabled={refreshing || loadingUsers}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {notice && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              notice.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-rose-300 bg-rose-50 text-rose-800"
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
            <p className="text-xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Active</p>
            <p className="text-xl font-semibold text-emerald-700">{stats.active}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Disabled</p>
            <p className="text-xl font-semibold text-rose-700">{stats.disabled}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Superadmins</p>
            <p className="text-xl font-semibold text-amber-700">{stats.superadmins}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Tenant Users</p>
            <p className="text-xl font-semibold text-sky-700">{stats.tenantUsers}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <FiSearch className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, tenant, role"
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>

            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
            >
              <option value="all">All Scopes</option>
              <option value="superadmin">Superadmin</option>
              <option value="tenant">Tenant User</option>
            </select>

            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
            >
              <option value="all">All Tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant} value={tenant}>
                  {tenant}
                </option>
              ))}
            </select>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
            >
              <option value="createdAt_desc">Newest First</option>
              <option value="createdAt_asc">Oldest First</option>
              <option value="name_asc">Name A-Z</option>
              <option value="email_asc">Email A-Z</option>
            </select>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <FiFilter className="h-3.5 w-3.5" />
            <span>Showing {filteredUsers.length} of {users.length} users in {groupedUsers.length} groups</span>
          </div>
        </section>

        {loadingUsers ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 text-sm text-slate-600">Loading users...</div>
          </section>
        ) : groupedUsers.length === 0 ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="p-8 text-center text-sm text-slate-600">No users match the current filters.</div>
          </section>
        ) : (
          <section className="space-y-3">
            {groupedUsers.map((group) => {
              const isCollapsed = !!collapsedGroups[group.key];
              return (
                <div key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <button
                      onClick={() =>
                        setCollapsedGroups((prev) => ({
                          ...prev,
                          [group.key]: !prev[group.key],
                        }))
                      }
                      className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      {isCollapsed ? <FiChevronRight className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                      <span>{group.name}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      {group.tenantId && (
                        <Link
                          href={`/superadmin/tenants/${group.tenantId}`}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Open Tenant
                        </Link>
                      )}
                      <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                        {group.users.length} user{group.users.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left">
                        <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-3 py-2 font-semibold">User</th>
                            <th className="px-3 py-2 font-semibold">Scope</th>
                            <th className="px-3 py-2 font-semibold">Roles</th>
                            <th className="px-3 py-2 font-semibold">Joined</th>
                            <th className="px-3 py-2 font-semibold">Role Update</th>
                            <th className="px-3 py-2 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                          {group.users.map((rowUser) => {
                    const rowAction = actionByUser[rowUser.id];
                    const pendingRole = resolvePendingRole(rowUser);
                    const roleBusy = rowAction === "role";
                    const statusBusy = rowAction === "status";
                    const logoutBusy = rowAction === "logoutAll";
                    const joinedDate = new Date(rowUser.createdAt);

                    return (
                      <tr key={rowUser.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                              <FiUser className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{rowUser.name}</p>
                              <p className="truncate text-xs text-slate-500">{rowUser.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-wrap gap-1">
                            {rowUser.isSuperadmin ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                <FiShield className="h-3 w-3" /> Superadmin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                                <FiUsers className="h-3 w-3" /> Tenant User
                              </span>
                            )}

                            {rowUser.isDisabled ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800">
                                <FiSlash className="h-3 w-3" /> Disabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                <FiCheck className="h-3 w-3" /> Active
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top text-xs text-slate-700">{getRoleNames(rowUser.userRoles)}</td>

                        <td className="px-3 py-2 align-top text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <FiClock className="h-3 w-3 text-slate-400" />
                            <span>{joinedDate.toLocaleDateString()}</span>
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="flex gap-1">
                            <select
                              value={pendingRole}
                              onChange={(e) =>
                                setPendingRoleByUser((prev) => ({
                                  ...prev,
                                  [rowUser.id]: e.target.value,
                                }))
                              }
                              disabled={roleBusy || roles.length === 0 || rowUser.isSuperadmin}
                              className="min-w-35 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              <option value="">{roles.length === 0 ? "No roles available" : "Select role"}</option>
                              {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => void updateUserRole(rowUser, pendingRole)}
                              disabled={
                                roleBusy ||
                                rowUser.isSuperadmin ||
                                roles.length === 0 ||
                                !pendingRole ||
                                pendingRole === roleIdFromUser(rowUser)
                              }
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {roleBusy ? "Saving..." : "Apply"}
                            </button>
                          </div>
                        </td>

                        <td className="px-3 py-2 align-top">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => void fetchUserActivity(rowUser.id)}
                              disabled={loadingActivity && selectedUser?.id === rowUser.id}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-1">
                                <FiActivity className="h-3.5 w-3.5" />
                                Activity
                              </span>
                            </button>

                            <button
                              onClick={() =>
                                setConfirmAction({
                                  kind: "logoutAll",
                                  userId: rowUser.id,
                                  title: "Revoke all sessions?",
                                  body: `This will immediately sign ${rowUser.name} out on every device.`,
                                  confirmLabel: "Revoke Sessions",
                                })
                              }
                              disabled={logoutBusy}
                              className="rounded-md border border-orange-300 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-1">
                                <FiLogOut className="h-3.5 w-3.5" />
                                {logoutBusy ? "Revoking..." : "Logout All"}
                              </span>
                            </button>

                            <button
                              onClick={() =>
                                setConfirmAction({
                                  kind: "toggleStatus",
                                  userId: rowUser.id,
                                  title: rowUser.isDisabled ? "Enable user account?" : "Disable user account?",
                                  body: rowUser.isDisabled
                                    ? `Allow ${rowUser.name} to sign in again.`
                                    : `Block ${rowUser.name} from signing in until re-enabled.`,
                                  confirmLabel: rowUser.isDisabled ? "Enable" : "Disable",
                                })
                              }
                              disabled={statusBusy || rowUser.isSuperadmin}
                              className={`rounded-md border px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                                rowUser.isDisabled
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                  : "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                              }`}
                            >
                              {statusBusy ? "Updating..." : rowUser.isDisabled ? "Enable" : "Disable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>

      {/* Activity Modal */}
      {showActivityModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Login Activity: {selectedUser.name}</h2>
                <p className="text-xs text-slate-500">Recent sign-in attempts and session signals.</p>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close activity"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs">
                <p className="text-slate-500">Events</p>
                <p className="text-sm font-semibold text-slate-900">{userActivity.length}</p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                <p className="text-emerald-700">Successful</p>
                <p className="text-sm font-semibold text-emerald-900">{selectedActivitySuccessCount}</p>
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs">
                <p className="text-rose-700">Failed</p>
                <p className="text-sm font-semibold text-rose-900">{selectedActivityFailureCount}</p>
              </div>
            </div>

            <div className="max-h-[56vh] overflow-auto p-4">
              {userActivity.length === 0 ? (
                <p className="text-sm text-slate-600">No activity found.</p>
              ) : (
                <div className="space-y-2">
                  {userActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        activity.success ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                            activity.success
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {activity.success ? <FiCheck className="h-3 w-3" /> : <FiAlertCircle className="h-3 w-3" />}
                          {activity.success ? "Successful Login" : "Failed Login"}
                        </span>
                        <span className="text-xs text-slate-500">{new Date(activity.loginTime).toLocaleString()}</span>
                      </div>

                      <div className="mt-2 grid gap-1 text-xs text-slate-600 md:grid-cols-2">
                        <p>IP: {activity.ipAddress || "Unknown"}</p>
                        <p className="truncate">Agent: {activity.userAgent || "Unknown"}</p>
                      </div>

                      {activity.failureReason && (
                        <p className="mt-1 text-xs font-medium text-rose-700">Reason: {activity.failureReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">{confirmAction.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{confirmAction.body}</p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = users.find((u) => u.id === confirmAction.userId);
                  if (!target) return setConfirmAction(null);

                  if (confirmAction.kind === "toggleStatus") {
                    await toggleUserStatus(target.id, target.isDisabled);
                  } else {
                    await logoutAllSessions(target);
                  }
                  setConfirmAction(null);
                }}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
