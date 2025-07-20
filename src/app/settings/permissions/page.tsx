"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import Spinner from '../../../components/Spinner';

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
        // Fetch each user's permissions
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

  const handleNoteChange = async (userId: string, permKey: string, note: string) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const current = userPerms[userId] || [];
      const newPerms = current.map((p) =>
        p.permission.key === permKey ? { key: p.permission.key, note } : { key: p.permission.key, note: p.note }
      );
      await apiPut(`/user/${userId}/permissions`, { permissions: newPerms });
      setUserPerms({ ...userPerms, [userId]: await apiGet<any[]>(`/user/${userId}/permissions`) });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner size={40} className="my-12" />;

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
      <h2>Permissions</h2>
      {success && <div style={{ color: 'green', marginBottom: 8 }}>Saved!</div>}
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <table style={{ borderCollapse: 'collapse', minWidth: 600 }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>User</th>
            {permissions.map((perm) => (
              <th key={perm.key} style={{ borderBottom: '1px solid #ccc', textAlign: 'center' }}>{perm.key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ fontWeight: 500 }}>{user.name || user.email}</td>
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
                    <br />
                    {userPerm && (
                      <input
                        type="text"
                        placeholder="Note"
                        value={userPerm.note || ''}
                        onChange={e => handleNoteChange(user.id, perm.key, e.target.value)}
                        style={{ width: 80, fontSize: 12 }}
                        disabled={saving}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 