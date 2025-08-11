"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import { jwtDecode } from "jwt-decode";
import AuthGuard from '@/components/AuthGuard';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Tooltip from '@/components/Tooltip';
import { FaUsers, FaUserPlus } from 'react-icons/fa';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
}

function getUserFromToken() {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return jwtDecode(token) as { role?: string; tenantId?: string };
  } catch {
    return null;
  }
}

const ROLES = ["owner", "manager", "cashier"];

export default function UsersPage() {
  const { user } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState<null | User>(null);
  const [showDelete, setShowDelete] = useState<null | User>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "cashier", password: "" });
  const [editForm, setEditForm] = useState({ name: "", role: "cashier" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [canManage, setCanManage] = useState(false);

  // Permission checks
  const canViewUsers = hasPermission(user, 'view_users');
  const canEditUsers = hasPermission(user, 'edit_users');
  const canDeleteUsers = hasPermission(user, 'delete_users');

  // Set canManage after user is loaded
  useEffect(() => {
    if (user) {
      setCanManage(user.roles?.includes("owner") || user.roles?.includes("manager"));
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    apiGet(`/user`)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Refresh users
  const refreshUsers = () => {
    if (!user?.id) return;
    setLoading(true);
    apiGet(`/user`)
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  // Invite User
  const openInvite = () => {
    setForm({ name: "", email: "", role: "cashier", password: "" });
    setFormError("");
    setShowInvite(true);
  };
  const handleInviteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setFormError("All fields are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/user", {
        ...form,
      });
      setShowInvite(false);
      setToast({ type: "success", message: "User invited!" });
      refreshUsers();
    } catch (err: any) {
      setFormError(err.message || "Failed to invite user");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit User
  const openEdit = (u: User) => {
    setEditForm({ name: u.name, role: u.role });
    setShowEdit(u);
    setFormError("");
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name) {
      setFormError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPut(`/user/${showEdit?.id}`, {
        name: editForm.name,
        role: editForm.role,
      });
      setShowEdit(null);
      setToast({ type: "success", message: "User updated!" });
      refreshUsers();
    } catch (err: any) {
      setFormError(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete User
  const handleDelete = async () => {
    if (!showDelete) return;
    setSubmitting(true);
    try {
      await apiDelete(`/user/${showDelete.id}`);
      setShowDelete(null);
      setToast({ type: "success", message: "User deleted!" });
      refreshUsers();
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Failed to delete user" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to view users
  if (!canViewUsers) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaUsers className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view users.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
            <p className="text-gray-600">Manage team members and permissions</p>
          </div>
          
          {canEditUsers ? (
            <button
              onClick={openInvite}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaUserPlus className="w-4 h-4 inline mr-2" />
              Invite User
            </button>
          ) : (
            <Tooltip content="You don't have permission to invite users. Contact your administrator.">
              <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
              >
                <FaUserPlus className="w-4 h-4 inline mr-2" />
                Invite User
              </button>
            </Tooltip>
          )}
        </div>
        {toast && (
          <div className={`mb-4 px-4 py-2 rounded ${toast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{toast.message}</div>
        )}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="min-w-full bg-white border rounded shadow">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Name</th>
                <th className="py-2 px-4 border-b">Email</th>
                <th className="py-2 px-4 border-b">Role</th>
                {canManage && <th className="py-2 px-4 border-b">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2 px-4 border-b">{u.name}</td>
                  <td className="py-2 px-4 border-b">{u.email}</td>
                  <td className="py-2 px-4 border-b">{u.role}</td>
                  {canManage && (
                    <td className="py-2 px-4 border-b">
                      {canEditUsers && <button className="text-blue-600 hover:underline mr-2" onClick={() => openEdit(u)}>Edit</button>}
                      {canDeleteUsers && <button className="text-red-600 hover:underline" onClick={() => setShowDelete(u)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Invite User</h2>
              <form onSubmit={handleInviteSubmit}>
                <div className="mb-4">
                  <label className="block mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInviteChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleInviteChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1">Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleInviteChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleInviteChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                {formError && <div className="text-red-600 mb-2">{formError}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowInvite(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={submitting}>{submitting ? "Inviting..." : "Invite"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Edit Modal */}
        {showEdit && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Edit User</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label className="block mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1">Role</label>
                  <select
                    name="role"
                    value={editForm.role}
                    onChange={handleEditChange}
                    className="w-full border px-3 py-2 rounded"
                    required
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {formError && <div className="text-red-600 mb-2">{formError}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowEdit(null)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete Modal */}
        {showDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Delete User</h2>
              <div className="mb-4">Are you sure you want to delete <b>{showDelete.name}</b>?</div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowDelete(null)} disabled={submitting}>Cancel</button>
                <button className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={handleDelete} disabled={submitting}>{submitting ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
} 