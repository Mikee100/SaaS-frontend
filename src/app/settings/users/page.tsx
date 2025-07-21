"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/utils/api";
import { FaUsers } from 'react-icons/fa';
import Link from "next/link";

export default function UsersSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet("/user"),
      apiGet("/roles"),
    ])
      .then(([users, roles]) => {
        setUsers(users as any[]);
        setRoles(roles as any[]);
      })
      .catch(() => setError("Failed to load users or roles"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await apiPost("/user", form);
      setForm({ name: "", email: "", password: "", role: "" });
      setUsers(await apiGet("/user"));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to create user");
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
    <div className="max-w-5xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaUsers className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Users</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      <div className="bg-white rounded-xl shadow p-8 w-full mb-8">
        <div className="text-gray-600 text-base mb-4">View all users in your organization. Roles determine access to features.</div>
        {/* Create User Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
            required
            disabled={saving}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            style={{ flex: 2, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
            required
            disabled={saving}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
            required
            disabled={saving}
          />
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 4 }}
            required
            disabled={saving}
          >
            <option value="">Select Role</option>
            {roles.map((role: any) => (
              <option key={role.id} value={role.name}>{role.name}</option>
            ))}
          </select>
          <button
            type="submit"
            style={{ padding: '6px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, fontWeight: 600 }}
            disabled={saving || !form.name || !form.email || !form.password || !form.role}
          >
            {saving ? 'Creating...' : 'Add User'}
          </button>
        </form>
        {success && <div style={{ color: 'green', marginBottom: 8 }}>User created!</div>}
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>
        ) : users.length === 0 ? (
          <div style={{ color: '#888' }}>No users found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, marginBottom: 32 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#444' }}>
                <th style={{ textAlign: 'left', padding: '8px 0' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '8px 0' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '8px 0' }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 0', color: '#555' }}>{user.name}</td>
                  <td style={{ padding: '8px 0', color: '#555' }}>{user.email}</td>
                  <td style={{ padding: '8px 0', color: '#555' }}>
                    {(user.userRoles || []).map((ur: any) => ur.role?.name).filter(Boolean).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '32px 0' }} />
        <div style={{ color: '#888', fontSize: 14 }}>
          Contact your admin to add or remove users.
        </div>
      </div>
    </div>
  );
} 