"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";

export default function PermissionsSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [userPerms, setUserPerms] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<any[]>("/user"),
      apiGet<any[]>("/permissions"),
    ])
      .then(async ([users, perms]) => {
        setUsers(users);
        setPermissions(perms);
        const permsMap: Record<string, any[]> = {};
        await Promise.all(
          users.map(async (u) => {
            permsMap[u.id] = await apiGet<any[]>(`/user/${u.id}/permissions`);
          })
        );
        setUserPerms(permsMap);
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

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 0' }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 8 }}>Permissions</h2>
      <div style={{ color: '#666', fontSize: 15, marginBottom: 28 }}>
        Manage which users can access specific features. Toggle permissions below.
      </div>
      {success && <div style={{ color: 'green', marginBottom: 8 }}>Saved!</div>}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <table style={{ borderCollapse: 'collapse', minWidth: 600, width: '100%', marginBottom: 32 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#444' }}>
            <th style={{ textAlign: 'left', padding: '8px 0' }}>User</th>
            {permissions.map((perm) => (
              <th key={perm.key} style={{ textAlign: 'center', padding: '8px 0' }}>{perm.key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ fontWeight: 500, color: '#555', padding: '8px 0' }}>{user.name || user.email}</td>
              {permissions.map((perm) => {
                const userPerm = (userPerms[user.id] || []).find((p) => p.permission.key === perm.key);
                return (
                  <td key={perm.key} style={{ textAlign: 'center', padding: 4 }}>
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
      <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '32px 0' }} />
      <div style={{ color: '#888', fontSize: 14 }}>
        Changes are saved instantly. Permissions are enforced across the app.
      </div>
    </div>
  );
} 