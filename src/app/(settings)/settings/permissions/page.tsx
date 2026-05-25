"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut, apiPost, apiDelete } from "@/utils/api";
import { FaListAlt, FaShieldAlt, FaCog, FaLock, FaPlus, FaEdit, FaTrash, FaUserTag } from "react-icons/fa";
import Link from "next/link";
import { useUser } from "@/components/UserContext";
import { hasPermission } from "@/utils/permissions";

interface Role {
  id: string;
  name: string;
  description?: string;
  rolePermissions?: Array<{ permission: { key?: string; name?: string; description?: string } }>;
  permissions?: Array<{ permission: { key?: string; name?: string; description?: string } }>;
}

interface Permission {
  id: string;
  key: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  branchId?: string;
  userRoles: Array<{ role: { name: string } }>;
  permissions?: string[];
  effectivePermissions?: string[];
  inheritedPermissions?: string[];
}

interface Branch {
  id: string;
  name: string;
}

export default function PermissionsSettings() {
  const { user } = useUser();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showManagePermissions, setShowManagePermissions] = useState<User | null>(null);
  const [userPermissionsEdit, setUserPermissionsEdit] = useState<string[]>([]);
  const [userInheritedPermissionsEdit, setUserInheritedPermissionsEdit] = useState<string[]>([]);

  // Role management
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showAvailablePermissions, setShowAvailablePermissions] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const defaultRoles = ["Admin", "Manager", "Staff"];
  const [selectedDefaultRole, setSelectedDefaultRole] = useState<string>("");
  const [showRolesManagement, setShowRolesManagement] = useState(true);
  const [showEditRole, setShowEditRole] = useState<Role | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({ name: "", description: "" });
  const [editRolePermissions, setEditRolePermissions] = useState<string[]>([]);
  const [showAssignRole, setShowAssignRole] = useState<User | null>(null);
  const [assignRoleName, setAssignRoleName] = useState("");
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Permission checks
  const canEditUsers = hasPermission(user, "edit_users");
  const canEditRoles = hasPermission(user, "edit_roles");

  const permKey = (rp: { permission: { key?: string; name?: string } }) =>
    rp.permission?.key ?? rp.permission?.name ?? "";

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesData, permissionsData, usersData, branchesData] = await Promise.all([
        apiGet("/roles"),
        apiGet("/permissions"),
        apiGet("/user"),
        apiGet("/branches"),
      ]);
      setRoles(rolesData as Role[]);
      const mappedPermissions = Array.isArray(permissionsData)
        ? permissionsData.map((p: unknown) => {
            const obj = p as { id?: string; key?: string; name?: string; description?: string };
            return {
              id: obj.id || "",
              key: obj.key || obj.name || "",
              description: obj.description,
            };
          })
        : [];
      setPermissions(mappedPermissions);
      setUsers(usersData as User[]);
      setBranches(branchesData as Branch[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!user?.tenantId) {
        throw new Error("Tenant ID is missing. Please log in again.")
      }

      const trimmedName = newRole.name.trim();
      if (!trimmedName) {
        throw new Error("Role name is required.");
      }

      // Check for duplicate role names locally
      const existingRole = roles.find(role =>
        role.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingRole) {
        throw new Error("A role with this name already exists. Please choose a different name.");
      }

      await apiPost("/roles", {
        name: trimmedName,
        description: newRole.description || undefined,
        tenantId: user.tenantId,
      });
      setNewRole({ name: "", description: "" });
      setShowCreateRole(false);
      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create role.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const rolePerms = (role: Role) => role.rolePermissions ?? role.permissions ?? [];

  const openEditRole = (role: Role) => {
    setShowEditRole(role);
    setEditRoleForm({ name: role.name, description: role.description || "" });
    setEditRolePermissions(
      rolePerms(role).map((rp) => permKey(rp)).filter(Boolean),
    );
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditRole) return;
    setLoading(true);
    setError("");
    try {
      const name = editRoleForm.name.trim();
      if (!name) throw new Error("Role name is required.");
      await apiPut(`/roles/${showEditRole.id}`, {
        name,
        description: editRoleForm.description || undefined,
      });
      await apiPut(`/roles/${showEditRole.id}/permissions`, {
        permissions: editRolePermissions,
      });
      setShowEditRole(null);
      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignRole || !assignRoleName.trim()) return;
    setLoading(true);
    setError("");
    try {
      await apiPut(`/user/${showAssignRole.id}`, { role: assignRoleName.trim() });
      setShowAssignRole(null);
      setAssignRoleName("");
      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to assign role to user.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setLoading(true);
    setError("");
    try {
      await apiDelete(`/roles/${roleToDelete.id}`);
      setRoleToDelete(null);
      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to delete role.",
      );
    } finally {
      setLoading(false);
    }
  };

  const permissionCategories = {
    "User Management": ["view_users", "edit_users", "delete_users"],
    "Role Management": ["view_roles", "edit_roles", "delete_roles"],
    "Sales": ["view_sales", "create_sales", "edit_sales", "delete_sales"],
    "Inventory": ["view_inventory", "edit_inventory", "delete_inventory"],
    "Products": ["view_products", "edit_products", "delete_products"],
    "Analytics": ["view_analytics", "export_data"],
    "Settings": ["view_settings", "edit_settings"],
    "Billing": ["view_billing", "edit_billing"],
  };

  const listPermissions = (u: User) => {
    if (Array.isArray(u.effectivePermissions) && u.effectivePermissions.length > 0) {
      return u.effectivePermissions;
    }
    if (Array.isArray(u.permissions) && u.permissions.length > 0) {
      return u.permissions;
    }
    return [];
  };

  const isTenantPermissionLocked = (u: User | null) => {
    if (!u || !Array.isArray(u.userRoles)) return false;
    return u.userRoles.some((ur) => {
      const roleName = ur?.role?.name?.toLowerCase();
      return roleName === "owner" || roleName === "admin";
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canEditUsers) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaLock className="w-16 h-16 text-red-500 mx-auto mb-4 dark:text-red-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">You don&apos;t have permission to manage permissions.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  // Group users by branchId
  const usersByBranch: { [branchId: string]: User[] } = {};
  users.forEach(user => {
    const branchKey = user.branchId || "unassigned";
    if (!usersByBranch[branchKey]) usersByBranch[branchKey] = [];
    usersByBranch[branchKey].push(user);
  });

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaShieldAlt className="text-blue-600 dark:text-blue-400 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Roles & Permissions</h2>
        </div>
        <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">← All Settings</Link>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
          Operation completed successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
          {error}
        </div>
      )}


      {/* Manage Permissions Modal */}
      {showManagePermissions && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 w-full max-w-2xl mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-gray-100">Manage Permissions for {showManagePermissions.name}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isTenantPermissionLocked(showManagePermissions)) {
                  setError("This is the tenant and permissions cannot be edited.");
                  return;
                }
                setLoading(true);
                try {
                  await apiPut(`/user/${showManagePermissions.id}/permissions`, { permissions: userPermissionsEdit });
                  setShowManagePermissions(null);
                  await loadData();
                  setSuccess(true);
                  setTimeout(() => setSuccess(false), 4000);
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : "Failed to update user permissions");
                } finally {
                  setLoading(false);
                }
              }}
            >
              <div className="space-y-6">
                <div>
                  <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">Direct Permissions</label>
                  {isTenantPermissionLocked(showManagePermissions) && (
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                      This is the tenant and permissions cannot be edited.
                    </p>
                  )}
                  {userInheritedPermissionsEdit.length > 0 && (
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      Role-inherited permissions are checked and read-only.
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-900/30 rounded p-3">
                    {permissions.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-gray-800 dark:text-gray-200 py-1">
                        {(() => {
                          const isInherited = userInheritedPermissionsEdit.includes(p.key);
                          const isDirect = userPermissionsEdit.includes(p.key);
                          const isTenantLocked = isTenantPermissionLocked(showManagePermissions);
                          return (
                            <input
                              type="checkbox"
                              checked={isDirect || isInherited}
                              disabled={isInherited || isTenantLocked}
                              onChange={(e) => {
                                if (isInherited || isTenantLocked) return;
                                setUserPermissionsEdit((prev) =>
                                  e.target.checked
                                    ? p.key && !prev.includes(p.key)
                                      ? [...prev, p.key]
                                      : prev
                                    : prev.filter((pk) => pk !== p.key),
                                );
                              }}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                            />
                          );
                        })()}
                        <span className="text-sm">{p.key}</span>
                        {userInheritedPermissionsEdit.includes(p.key) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">role</span>
                        )}
                        {p.description && <span className="text-xs text-gray-500 dark:text-gray-400">({p.description})</span>}
                      </label>
                    ))}
                  </div>
                </div>
                {userInheritedPermissionsEdit.length > 0 && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-2">Inherited (read-only)</label>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {userInheritedPermissionsEdit.map((perm) => (
                        <span
                          key={perm}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-base"
                  disabled={loading || isTenantPermissionLocked(showManagePermissions)}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowManagePermissions(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-base"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users grouped by branch */}
      {branches.map((branch) => (
        <div key={branch.id} className="mb-10">
          <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-1">{branch.name}</h3>
          <div className="border-b-2 border-blue-200 dark:border-blue-800 mb-4" />
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Roles</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Permissions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(usersByBranch[branch.id] || []).map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">{u.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{u.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(u.userRoles) ? u.userRoles : []).map((ur, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                            {ur.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {listPermissions(u).length > 0 ? (
                          listPermissions(u).map((perm, idx) => (
                            <span key={perm + idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                              {perm}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">No permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-500 text-xs flex items-center gap-1"
                          onClick={() => {
                            setShowAssignRole(u);
                            setAssignRoleName((Array.isArray(u.userRoles) && u.userRoles[0]) ? u.userRoles[0].role.name : "");
                          }}
                        >
                          <FaUserTag className="w-3 h-3" /> Assign Role
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1.5 text-white rounded text-xs ${
                            isTenantPermissionLocked(u)
                              ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-70"
                              : "bg-gray-600 dark:bg-gray-500 hover:bg-gray-700 dark:hover:bg-gray-600"
                          }`}
                          disabled={isTenantPermissionLocked(u)}
                          title={
                            isTenantPermissionLocked(u)
                              ? "This is the tenant and permissions cannot be edited."
                              : "Manage direct permissions"
                          }
                          onClick={() => {
                            setShowManagePermissions(u);
                            setUserPermissionsEdit(
                              Array.isArray(u.permissions) && u.permissions.length > 0
                                ? u.permissions.filter((pk) => typeof pk === "string" && pk.length > 0)
                                : [],
                            );
                            setUserInheritedPermissionsEdit(
                              Array.isArray(u.inheritedPermissions) && u.inheritedPermissions.length > 0
                                ? u.inheritedPermissions.filter((pk) => typeof pk === "string" && pk.length > 0)
                                : [],
                            );
                          }}
                        >
                          Manage Permissions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(usersByBranch[branch.id] || []).length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 text-sm py-4 px-4">No users in this branch.</div>
            )}
          </div>
        </div>
      ))}

      {/* Unassigned users */}
      {usersByBranch["unassigned"] && (
        <div className="mb-10">
          <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-1">Unassigned</h3>
          <div className="border-b-2 border-red-200 dark:border-red-800 mb-4" />
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Roles</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Permissions</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersByBranch["unassigned"].map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-300 font-medium text-sm">{u.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{u.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(u.userRoles) ? u.userRoles : []).map((ur, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                            {ur.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {listPermissions(u).length > 0 ? (
                          listPermissions(u).map((perm, idx) => (
                            <span key={perm + idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                              {perm}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">No permissions</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-500 text-xs flex items-center gap-1"
                          onClick={() => {
                            setShowAssignRole(u);
                            setAssignRoleName((Array.isArray(u.userRoles) && u.userRoles[0]) ? u.userRoles[0].role.name : "");
                          }}
                        >
                          <FaUserTag className="w-3 h-3" /> Assign Role
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1.5 text-white rounded text-xs ${
                            isTenantPermissionLocked(u)
                              ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed opacity-70"
                              : "bg-gray-600 dark:bg-gray-500 hover:bg-gray-700 dark:hover:bg-gray-600"
                          }`}
                          disabled={isTenantPermissionLocked(u)}
                          title={
                            isTenantPermissionLocked(u)
                              ? "This is the tenant and permissions cannot be edited."
                              : "Manage direct permissions"
                          }
                          onClick={() => {
                            setShowManagePermissions(u);
                            setUserPermissionsEdit(
                              Array.isArray(u.permissions) && u.permissions.length > 0
                                ? u.permissions.filter((pk) => typeof pk === "string" && pk.length > 0)
                                : [],
                            );
                            setUserInheritedPermissionsEdit(
                              Array.isArray(u.inheritedPermissions) && u.inheritedPermissions.length > 0
                                ? u.inheritedPermissions.filter((pk) => typeof pk === "string" && pk.length > 0)
                                : [],
                            );
                          }}
                        >
                          Manage Permissions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Roles Management */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6 w-full mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setShowRolesManagement(!showRolesManagement)}
            className="flex items-center gap-2 text-left focus:outline-none"
          >
            <FaCog className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Roles Management</h3>
            <span className="text-blue-600 dark:text-blue-400 text-sm ml-2">
              {showRolesManagement ? "▲" : "▼"}
            </span>
          </button>
          {canEditRoles && (
            <button
              type="button"
              onClick={() => setShowCreateRole(true)}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition flex items-center gap-2"
            >
              <FaPlus className="w-4 h-4" />
              Create Role
            </button>
          )}
        </div>

        {showRolesManagement && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{role.name}</h4>
                      {role.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{role.description}</p>
                      )}
                    </div>
                    {canEditRoles && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                          title="Edit Role"
                          onClick={() => openEditRole(role)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                          title="Delete Role"
                          onClick={() => setRoleToDelete(role)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 mt-3">
                    <h5 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Permissions:</h5>
                    <div>
                      {rolePerms(role).length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No permissions assigned</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {rolePerms(role).map((rp, index) => (
                            <div key={index} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 rounded px-2 py-1">
                              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
                              <span className="text-xs text-gray-700 dark:text-gray-200">{permKey(rp)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Available Permissions Section */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <button
          type="button"
          onClick={() => setShowAvailablePermissions(!showAvailablePermissions)}
          className="flex items-center justify-between w-full text-left mb-4 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <FaListAlt className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Available Permissions</h3>
          </div>
          <span className="text-blue-600 dark:text-blue-400">
            {showAvailablePermissions ? "Hide" : "Show"} Permissions
          </span>
        </button>

        {showAvailablePermissions && (
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            {Object.entries(permissionCategories).map(([category, perms]) => (
              <div key={category} className="mb-6">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perms.map((key) => {
                    const permission = permissions.find((p) => p.key === key);
                    return permission ? (
                      <div key={key} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="font-mono text-sm text-gray-700 dark:text-gray-300">{permission.key}</div>
                        {permission.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{permission.description}</div>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Create New Role</h3>
            <form onSubmit={handleCreateRole}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Select Default Role</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-600 focus:border-blue-600 dark:bg-gray-700 dark:text-gray-100 mb-3"
                    value={selectedDefaultRole}
                    onChange={(e) => {
                      setSelectedDefaultRole(e.target.value);
                      setNewRole({ ...newRole, name: e.target.value });
                    }}
                  >
                    <option value="">-- Choose default role (or enter custom below) --</option>
                    {defaultRoles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Or Enter Custom Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => {
                      setNewRole({ ...newRole, name: e.target.value });
                      setSelectedDefaultRole("");
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-600 focus:border-blue-600 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Custom role name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-600 focus:border-blue-600 dark:bg-gray-700 dark:text-gray-100"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                  disabled={loading}
                >
                  Create Role
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateRole(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRole && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Edit Role: {showEditRole.name}</h3>
            <form onSubmit={handleSaveEditRole}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Role Name</label>
                  <input
                    type="text"
                    value={editRoleForm.name}
                    onChange={(e) => setEditRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-600 focus:border-blue-600 dark:bg-gray-700 dark:text-gray-100"
                    placeholder="Role name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Description</label>
                  <textarea
                    value={editRoleForm.description}
                    onChange={(e) => setEditRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-600 focus:border-blue-600 dark:bg-gray-700 dark:text-gray-100"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                    {permissions.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-gray-800 dark:text-gray-200 text-sm">
                        <input
                          type="checkbox"
                          checked={editRolePermissions.includes(p.key)}
                          onChange={(e) => {
                            setEditRolePermissions((prev) =>
                              e.target.checked ? [...prev, p.key] : prev.filter((k) => k !== p.key),
                            );
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:bg-gray-700"
                        />
                        {p.key}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                  disabled={loading}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditRole(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignRole && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Assign Role to {showAssignRole.name}</h3>
            <form onSubmit={handleAssignRole}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <select
                  value={assignRoleName}
                  onChange={(e) => setAssignRoleName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-600 focus:border-blue-600 dark:bg-gray-700 dark:text-gray-100"
                  required
                >
                  <option value="">-- Select role --</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                  disabled={loading}
                >
                  Assign
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAssignRole(null); setAssignRoleName(""); }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Role Confirmation */}
      {roleToDelete && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Delete Role</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Delete the role &quot;{roleToDelete.name}&quot;? This cannot be undone. The role must not be assigned to any user.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteRole}
                className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition"
                disabled={loading}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
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