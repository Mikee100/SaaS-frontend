"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";

export default function UsersSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/user").then((data) => setUsers(data)).catch(() => setError("Failed to load users")).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 0' }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 8 }}>Users</h2>
      <div style={{ color: '#666', fontSize: 15, marginBottom: 28 }}>
        View all users in your organization. Roles determine access to features.
      </div>
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
                <td style={{ padding: '8px 0', color: '#555' }}>{user.role}</td>
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
  );
} 