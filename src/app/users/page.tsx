"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../../utils/api";
import { jwtDecode } from "jwt-decode";
import AuthGuard from '@/components/AuthGuard';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
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
  const user = getUserFromToken();
  if (!user) return null;
  const canManage = user.role === "owner" || user.role === "manager";

  useEffect(() => {
    if (!user?.tenantId) return;
    setLoading(true);
    apiGet(`/user?tenantId=${user.tenantId}`)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [user?.tenantId]);

  const refreshUsers = () => {
    setLoading(true);
    apiGet(`/user?tenantId=${user.tenantId}`)
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

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
        tenantId: user?.tenantId,
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

  return (
    <AuthGuard>
      <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        {canManage && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={openInvite}>
            Invite User
          </button>
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
                    <button className="text-blue-600 hover:underline mr-2" onClick={() => openEdit(u)}>Edit</button>
                    <button className="text-red-600 hover:underline" onClick={() => setShowDelete(u)}>Delete</button>
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