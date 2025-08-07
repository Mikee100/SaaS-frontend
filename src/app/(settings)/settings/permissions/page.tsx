"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import { FaShieldAlt, FaUsers, FaEdit, FaTrash, FaPlus, FaUserShield, FaCog, FaLock } from 'react-icons/fa';
import Link from "next/link";
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';

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
  userRoles: Array<{ role: { name: string } }>;
  permissions?: Array<{ permission: { key: string; description?: string }; note?: string }>;
}

export default function PermissionsSettings() {
  const { user } = useUser();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Role management
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // User permissions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserPermissions, setShowUserPermissions] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Array<{ key: string; note?: string }>>([]);

  // Permission checks
  const canEditUsers = hasPermission(user, 'edit_users');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData, usersData] = await Promise.all([
        apiGet("/roles"),
        apiGet("/permissions"),
        apiGet("/user"),
      ]);
      setRoles(rolesData as Role[]);
      setPermissions(permissionsData as Permission[]);
      setUsers(usersData as User[]);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost("/roles", newRole);
      setNewRole({ name: "", description: "" });
      setShowCreateRole(false);
      await loadData();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRolePermissions = async (roleId: string, permissions: string[]) => {
    try {
      await apiPut(`/roles/${roleId}/permissions`, { permissions });
      await loadData();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update role permissions");
    }
  };

  const handleUpdateUserPermissions = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      await apiPut(`/user/${selectedUser.id}/permissions`, { permissions: userPermissions });
      await loadData();
      setShowUserPermissions(false);
      setSelectedUser(null);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update user permissions");
    } finally {
      setLoading(false);
    }
  };

  const openUserPermissions = async (user: User) => {
    setSelectedUser(user);
    setUserPermissions(user.permissions?.map(up => ({ 
      key: up.permission.key, 
      note: up.note 
    })) || []);
    setShowUserPermissions(true);
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

  const getPermissionCategory = (key: string) => {
    for (const [category, perms] of Object.entries(permissionCategories)) {
      if (perms.includes(key)) return category;
    }
    return "Other";
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
          <p className="text-gray-600 mb-4">You don't have permission to manage permissions.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

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

      {/* Roles Management */}
      <div className="bg-white rounded-xl shadow p-8 w-full mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FaCog className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Roles Management</h3>
          </div>
          <button
            onClick={() => setShowCreateRole(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            Create Role
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <div key={role.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">{role.name}</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingRole(role)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit role"
                  >
                    <FaEdit className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {role.description && (
                <p className="text-gray-600 text-sm mb-4">{role.description}</p>
              )}
              
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

      {/* User Permissions */}
      <div className="bg-white rounded-xl shadow p-8 w-full mb-8">
        <div className="flex items-center gap-2 mb-6">
          <FaUserShield className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">User Permissions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Roles</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Direct Permissions</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
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
                      {user.permissions?.map((up, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {up.permission.key}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openUserPermissions(user)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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

      {/* Available Permissions */}
      <div className="bg-white rounded-xl shadow p-8 w-full">
        <div className="flex items-center gap-2 mb-6">
          <FaShieldAlt className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Available Permissions</h3>
        </div>

        <div className="space-y-6">
          {Object.entries(permissionCategories).map(([category, perms]) => (
            <div key={category} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Array.isArray(perms) ? perms : []).map(permKey => {
                  const permission = Array.isArray(permissions) ? permissions.find(p => p.key === permKey) : undefined;
                  return (
                    <div key={permKey} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">{permKey}</span>
                      {permission?.description && (
                        <span className="text-xs text-gray-500">({permission.description})</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Role</h3>
            <form onSubmit={handleCreateRole}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create Role
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateRole(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Permissions Modal */}
      {showUserPermissions && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Manage Permissions for {selectedUser.name}
            </h3>
            
            <div className="space-y-6">
              {Object.entries(permissionCategories).map(([category, perms]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {perms.map(permKey => {
                      const isSelected = userPermissions.some(up => up.key === permKey);
                      return (
                        <label key={permKey} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserPermissions([...userPermissions, { key: permKey }]);
                              } else {
                                setUserPermissions(userPermissions.filter(up => up.key !== permKey));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{permKey}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateUserPermissions}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Permissions
              </button>
              <button
                onClick={() => setShowUserPermissions(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
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