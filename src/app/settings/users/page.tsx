"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";
import Spinner from '../../../components/Spinner';

const roles = ["owner", "manager", "cashier"];

export default function UsersSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");
  const [inviting, setInviting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");

  const fetchUsers = () => {
    setLoading(true);
    apiGet<any[]>("/user")
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/user", { email: inviteEmail, role: inviteRole });
      setSuccess("User invited!");
      setInviteEmail("");
      setInviteRole("cashier");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleEditRole = async (user: any) => {
    setEditing(user.id);
    setEditRole(user.role);
  };

  const handleSaveRole = async (user: any) => {
    try {
      await apiPut(`/user/${user.id}`, { role: editRole });
      setEditing(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemove = async (user: any) => {
    if (!window.confirm("Remove this user?")) return;
    try {
      await apiDelete(`/user/${user.id}`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <Spinner size={40} className="my-12" />;

  return (
    <div style={{ maxWidth: 700 }}>
      <h2>Team/User Management</h2>
      <form onSubmit={handleInvite} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="email"
          placeholder="Invite user by email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          required
        />
        <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button type="submit" disabled={inviting}>{inviting ? "Inviting..." : "Invite"}</button>
      </form>
      {success && <div style={{ color: "green", marginBottom: 8 }}>{success}</div>}
      {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Name</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Email</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Role</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name || "-"}</td>
              <td>{user.email}</td>
              <td>
                {editing === user.id ? (
                  <select value={editRole} onChange={e => setEditRole(e.target.value)}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  user.role
                )}
              </td>
              <td>
                {editing === user.id ? (
                  <>
                    <button onClick={() => handleSaveRole(user)} style={{ marginRight: 8 }}>Save</button>
                    <button onClick={() => setEditing(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEditRole(user)} style={{ marginRight: 8 }}>Edit Role</button>
                    <button onClick={() => handleRemove(user)} style={{ color: "red" }}>Remove</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 