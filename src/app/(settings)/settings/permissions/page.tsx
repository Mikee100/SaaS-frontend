"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import { FaListAlt, FaShieldAlt, FaCog, FaLock, FaPlus, FaEdit } from 'react-icons/fa';
import Link from "next/link";
import { useUser } from "@/components/UserContext";
import { hasPermission } from '@/utils/permissions';

interface Role {
  id: string;
  name: string;
  description?: string;
  rolePermissions: Array<{ permission: { key: string; description?: string } }>;
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

  // Role management
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showAvailablePermissions, setShowAvailablePermissions] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const defaultRoles = ["Admin", "Manager", "Staff"];
  const [selectedDefaultRole, setSelectedDefaultRole] = useState<string>("");
  const [showRolesManagement, setShowRolesManagement] = useState(true);

  // Permission checks
  const canEditUsers = hasPermission(user, 'edit_users');
  console.log("canEditUsers:", canEditUsers);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    console.log("loadData called"); // <--- Add this
    setLoading(true);
    setError("");
    try {
      // LOG: JWT token if available
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      console.log("JWT token being sent:", token);

      const [rolesData, permissionsData, usersData, branchesData] = await Promise.all([
        apiGet("/roles"),
        apiGet("/permissions"),
        apiGet("/user"),
        apiGet("/api/branches"),
      ]);
      // LOG: API responses
      console.log("rolesData:", rolesData);
      console.log("permissionsData:", permissionsData);
      console.log("usersData:", usersData);
      console.log("branchesData:", branchesData);

      setRoles(rolesData as Role[]);
      const mappedPermissions = Array.isArray(permissionsData)
        ? permissionsData.map((p: unknown) => {
            const obj = p as { id?: string; key?: string; name?: string; description?: string };
            return {
              id: obj.id || '',
              key: obj.key || obj.name || '',
              description: obj.description
            };
          })
        : [];
      setPermissions(mappedPermissions);
      setUsers(usersData as User[]);
      setBranches(branchesData as Branch[]);
    } catch (err: unknown) {
      // LOG: Error details
      console.error("Failed to load data:", err);
      const message = err instanceof Error ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };


  console.log("User in TenantID:", user?.tenantId);
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

      console.log('Sending role creation request with:', {
        name: trimmedName,
        description: newRole.description,
        tenantId: user.tenantId
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedName,
          description: newRole.description,
          tenantId: user.tenantId
        })
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('Role creation failed with status:', response.status, 'Response:', responseData);
        if (response.status === 400 && responseData.message?.includes('already exists')) {
          throw new Error("A role with this name already exists for your organization. Please choose a different name.");
        }
        throw new Error(responseData.message || `Failed to create role: ${response.statusText}`);
      }

      setNewRole({ name: "", description: "" });
      setShowCreateRole(false);
      await loadData();
      setSuccess(true);
    } catch (err: unknown) {
      console.error("Failed to create role:", err);
      const message = err instanceof Error ? err.message : "Failed to create role. Please check the console for more details.";
      setError(message);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to manage permissions
  if (!canEditUsers) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaLock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to manage permissions.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
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
          <FaShieldAlt className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Roles & Permissions</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 border border-green-200">
          Operation completed successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2 rounded bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}


           {/* Manage Permissions Modal */}
           {showManagePermissions && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Manage Permissions for {showManagePermissions.name}</h3>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setLoading(true);
                try {
                  // Use selected keys as permission names (backend expects 'name' to match 'key')
                  await apiPut(`/user/${showManagePermissions.id}/permissions`, { permissions: userPermissionsEdit });
                  setShowManagePermissions(null);
                  await loadData();
                  setSuccess(true);
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : "Failed to update user permissions";
                  setError(message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permissions.map(p => (
                      <label key={p.key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={userPermissionsEdit.includes(p.key)}
                          disabled={false}
                          onChange={e => {
                            console.log('Checkbox clicked:', { key: p.key, checked: e.target.checked });
                            setUserPermissionsEdit(prev => {
                              if (e.target.checked) {
                                // Only add valid, non-null, non-empty keys
                                return p.key && typeof p.key === 'string' && p.key.length > 0 && !prev.includes(p.key)
                                  ? [...prev, p.key]
                                  : prev;
                              } else {
                                return prev.filter(pk => pk !== p.key);
                              }
                            });
                          }}
                        />
                        <span className="text-sm">{p.key}</span>
                        {p.description && <span className="text-xs text-gray-500">({p.description})</span>}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  disabled={loading}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowManagePermissions(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
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
      {branches.map(branch => (
  <div key={branch.id} className="mb-10">
    <h3 className="text-xl font-bold text-blue-700 mb-1">{branch.name}</h3>
    <div className="border-b-2 border-blue-200 mb-4"></div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Roles</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Permissions</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(usersByBranch[branch.id] || []).map(user => (
            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(user.userRoles) ? user.userRoles : []).map((ur, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {ur.role.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(user.permissions) && user.permissions.length > 0 ? (
                    user.permissions.map((perm, idx) => (
                      <span key={perm + idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">No permissions</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                  onClick={() => {
                    setShowManagePermissions(user);
                    setUserPermissionsEdit(
                      Array.isArray(user.permissions) && user.permissions.length > 0
                        ? user.permissions.filter(pk => typeof pk === 'string' && pk.length > 0)
                        : []
                    );
                  }}
                >
                  Manage Permissions
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(usersByBranch[branch.id] || []).length === 0 && (
        <div className="text-gray-500 text-sm py-4">No users in this branch.</div>
      )}
    </div>
  </div>
))}

{/* Unassigned users */}
{usersByBranch["unassigned"] && (
  <div className="mb-10">
    <h3 className="text-xl font-bold text-red-700 mb-1">Unassigned</h3>
    <div className="border-b-2 border-red-200 mb-4"></div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Roles</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Permissions</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {usersByBranch["unassigned"].map(user => (
            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(user.userRoles) ? user.userRoles : []).map((ur, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {ur.role.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(user.permissions) && user.permissions.length > 0 ? (
                    user.permissions.map((perm, idx) => (
                      <span key={perm + idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">No permissions</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                  onClick={() => {
                    setShowManagePermissions(user);
                    setUserPermissionsEdit(
                      Array.isArray(user.permissions) && user.permissions.length > 0
                        ? user.permissions.filter(pk => typeof pk === 'string' && pk.length > 0)
                        : []
                    );
                  }}
                >
                  Manage Permissions
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}


      {/* Roles Management */}
      <div className="bg-white rounded-xl shadow p-6 w-full mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowRolesManagement(!showRolesManagement)}
            className="flex items-center gap-2 text-left focus:outline-none"
          >
            <FaCog className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Roles Management</h3>
            <span className="text-blue-600 text-sm ml-2">
              {showRolesManagement ? '▲' : '▼'}
            </span>
          </button>
          <button
            onClick={() => setShowCreateRole(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            Create Role
          </button>
        </div>
        
        {showRolesManagement && (
          <div className="mt-4 border-t pt-4">
            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{role.name}</h4>
                      {role.description && (
                        <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled
                        className="p-2 text-gray-400 cursor-not-allowed rounded-full"
                        title="Edit Role (Coming Soon)"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h5 className="font-medium text-gray-700 text-sm">Permissions:</h5>
                    <div className="space-y-2">
                      {(Array.isArray(role.rolePermissions) && role.rolePermissions.length === 0) ? (
                        <p className="text-gray-500 text-sm">No permissions assigned</p>
                      ) : (
                        (Array.isArray(role.rolePermissions) ? role.rolePermissions : []).map((rp, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">{rp.permission.key}</span>
                          </div>
                        ))
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
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <button
          onClick={() => setShowAvailablePermissions(!showAvailablePermissions)}
          className="flex items-center justify-between w-full text-left mb-4 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <FaListAlt className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Available Permissions</h3>
          </div>
          <span className="text-blue-600">
            {showAvailablePermissions ? 'Hide' : 'Show'} Permissions
          </span>
        </button>
        
        {showAvailablePermissions && (
          <div className="mt-4 border-t pt-4">
            {Object.entries(permissionCategories).map(([category, perms]) => (
              <div key={category} className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">{category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perms.map((key) => {
                    const permission = permissions.find(p => p.key === key);
                    return permission ? (
                      <div key={key} className="bg-gray-50 p-3 rounded-lg border">
                        <div className="font-mono text-sm text-gray-700">{permission.key}</div>
                        {permission.description && (
                          <div className="text-xs text-gray-500 mt-1">{permission.description}</div>
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
        <div className="fixed inset-0 bg-gray-100 bg-opacity-90 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg mx-4">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Create New Role</h3>
            <form onSubmit={handleCreateRole}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Select Default Role</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600 mb-3"
                    value={selectedDefaultRole}
                    onChange={e => {
                      setSelectedDefaultRole(e.target.value);
                      setNewRole({ ...newRole, name: e.target.value });
                    }}
                  >
                    <option value="">-- Choose default role (or enter custom below) --</option>
                    {defaultRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Or Enter Custom Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={e => {
                      setNewRole({ ...newRole, name: e.target.value });
                      setSelectedDefaultRole("");
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Custom role name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-600 focus:border-blue-600"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create Role
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateRole(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

     
    </div>
  );
}