"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut, apiPost } from "@/utils/api";
import { FaUserShield } from 'react-icons/fa';
import Link from "next/link";

export default function PermissionsSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [userPerms, setUserPerms] = useState<Record<string, any[]>>({});
  const [roles, setRoles] = useState<any[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newPermKey, setNewPermKey] = useState("");
  const [newPermDesc, setNewPermDesc] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<any[]>("/user"),
      apiGet<any[]>("/permissions"),
      apiGet<any[]>("/roles"),
    ])
      .then(async ([users, perms, roles]) => {
        setUsers(users);
        setPermissions(perms);
        setRoles(roles);
        const permsMap: Record<string, any[]> = {};
        await Promise.all(
          users.map(async (u) => {
            permsMap[u.id] = await apiGet<any[]>(`/user/${u.id}/permissions`);
          })
        );
        setUserPerms(permsMap);
        // Fetch role permissions
        const rolePermsMap: Record<string, any[]> = {};
        await Promise.all(
          roles.map(async (r) => {
            rolePermsMap[r.id] = await apiGet<any[]>(`/roles/${r.id}/permissions`);
          })
        );
        setRolePerms(rolePermsMap);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (userId: string, permKey: string) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const current = userPerms[userId] || [];
      const hasPerm = current.some((p) => p.permission.key === permKey);
      let newPerms;
      if (hasPerm) {
        newPerms = current.filter((p) => p.permission.key !== permKey).map((p) => ({ key: p.permission.key, note: p.note }));
      } else {
        newPerms = [...current.map((p) => ({ key: p.permission.key, note: p.note })), { key: permKey }];
      }
      await apiPut(`/user/${userId}/permissions`, { permissions: newPerms });
      setUserPerms({ ...userPerms, [userId]: await apiGet<any[]>(`/user/${userId}/permissions`) });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = async (roleId: string, permKey: string) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const current = rolePerms[roleId] || [];
      const hasPerm = current.some((p) => p.permission.key === permKey);
      let newPerms;
      if (hasPerm) {
        newPerms = current.filter((p) => p.permission.key !== permKey).map((p) => ({ key: p.permission.key, note: p.note }));
      } else {
        newPerms = [...current.map((p) => ({ key: p.permission.key, note: p.note })), { key: permKey }];
      }
      await apiPut(`/roles/${roleId}/permissions`, { permissions: newPerms });
      setRolePerms({ ...rolePerms, [roleId]: await apiGet<any[]>(`/roles/${roleId}/permissions`) });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPut("/roles", { name: newRoleName.trim(), description: newRoleDesc.trim() });
      setNewRoleName("");
      setNewRoleDesc("");
      // Refresh roles
      const roles = await apiGet<any[]>("/roles");
      setRoles(roles);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPermission = async () => {
    if (!newPermKey.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPost("/permissions", { key: newPermKey.trim(), description: newPermDesc.trim() });
      setNewPermKey("");
      setNewPermDesc("");
      // Refresh permissions
      const perms = await apiGet<any[]>("/permissions");
      setPermissions(perms);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 min-h-[80vh] overflow-x-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaUserShield className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Permissions & Roles</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      <div className="bg-white rounded-xl shadow p-8 mb-8">
        <div className="text-gray-600 text-base mb-4">Manage roles and user permissions for your team.</div>
        {success && <div className="text-green-600 mb-2">Saved!</div>}
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {/* Role Management Section */}
        <div className="mb-12">
          <h3 className="font-semibold text-lg mb-2">Role Management</h3>
          <div className="text-gray-500 text-sm mb-4">
            Assign permissions to each role. Users inherit permissions from their assigned roles.
          </div>
          {/* Add Role Form */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              placeholder="New role name"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
              disabled={saving}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newRoleDesc}
              onChange={e => setNewRoleDesc(e.target.value)}
              className="flex-2 px-3 py-2 border border-gray-300 rounded"
              disabled={saving}
            />
            <button
              onClick={handleAddRole}
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold disabled:opacity-60"
              disabled={saving || !newRoleName.trim()}
            >
              Add Role
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse mb-4">
              <thead>
                <tr className="border-b border-gray-200 text-gray-700">
                  <th className="text-left py-2 px-2">Role</th>
                  {permissions.map((perm) => (
                    <th key={perm.key} className="text-center py-2 px-2">{perm.key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-gray-100">
                    <td className="font-medium text-gray-700 py-2 px-2">{role.name}</td>
                    {permissions.map((perm) => {
                      const rolePerm = (rolePerms[role.id] || []).find((p) => p.permission.key === perm.key);
                      return (
                        <td key={perm.key} className="text-center py-1 px-2">
                          <input
                            type="checkbox"
                            checked={!!rolePerm}
                            onChange={() => handleRoleToggle(role.id, perm.key)}
                            disabled={saving}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <hr className="my-8 border-gray-200" />
        {/* Permission Management Section */}
        <div className="mb-8">
          <h3 className="font-semibold text-lg mb-2">Permission Management</h3>
          <div className="text-gray-500 text-sm mb-4">
            Add new permissions to control access to features.
          </div>
          {/* Add Permission Form */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              placeholder="Permission key (e.g. view_sales)"
              value={newPermKey}
              onChange={e => setNewPermKey(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
              disabled={saving}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newPermDesc}
              onChange={e => setNewPermDesc(e.target.value)}
              className="flex-2 px-3 py-2 border border-gray-300 rounded"
              disabled={saving}
            />
            <button
              onClick={handleAddPermission}
              className="px-4 py-2 bg-green-600 text-white rounded font-semibold disabled:opacity-60"
              disabled={saving || !newPermKey.trim()}
            >
              Add Permission
            </button>
          </div>
        </div>
        {/* User-Permission Matrix (existing) */}
        <h2 className="font-bold text-2xl mb-2">Permissions</h2>
        <div className="text-gray-600 text-base mb-6">
          Manage which users can access specific features. Toggle permissions below.
        </div>
        {success && <div className="text-green-600 mb-2">Saved!</div>}
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse mb-8">
            <thead>
              <tr className="border-b border-gray-200 text-gray-700">
                <th className="text-left py-2 px-2">User</th>
                {permissions.map((perm) => (
                  <th key={perm.key} className="text-center py-2 px-2">{perm.key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100">
                  <td className="font-medium text-gray-700 py-2 px-2">{user.name || user.email}</td>
                  {permissions.map((perm) => {
                    const userPerm = (userPerms[user.id] || []).find((p) => p.permission.key === perm.key);
                    return (
                      <td key={perm.key} className="text-center py-1 px-2">
                        <input
                          type="checkbox"
                          checked={!!userPerm}
                          onChange={() => handleToggle(user.id, perm.key)}
                          disabled={saving}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <hr className="my-8 border-gray-200" />
        <div className="text-gray-500 text-sm">
          Changes are saved instantly. Permissions are enforced across the app.
        </div>
      </div>
    </div>
  );
} 