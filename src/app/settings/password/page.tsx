"use client";
import { useState } from "react";
import { apiPut } from "@/utils/api";

export default function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await apiPut("/user/me/password", { currentPassword, newPassword });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 0' }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 8 }}>Change Password</h2>
      <div style={{ color: '#666', fontSize: 15, marginBottom: 28 }}>
        Update your password regularly to keep your account secure.
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
        <div>
          <label style={{ fontWeight: 500, marginBottom: 6, display: 'block' }}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', fontSize: 16, background: '#f7fafd', width: '100%' }}
            required
          />
        </div>
        <div>
          <label style={{ fontWeight: 500, marginBottom: 6, display: 'block' }}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', fontSize: 16, background: '#f7fafd', width: '100%' }}
            required
          />
        </div>
        <div>
          <label style={{ fontWeight: 500, marginBottom: 6, display: 'block' }}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', fontSize: 16, background: '#f7fafd', width: '100%' }}
            required
          />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: 8 }}>Password changed successfully!</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{ padding: '10px 28px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f7fafd', fontWeight: 600, fontSize: 16, color: '#222', cursor: 'pointer' }}
            disabled={loading}
          >
            {loading ? "Saving..." : "Change Password"}
          </button>
        </div>
      </form>
      <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '32px 0' }} />
      <div style={{ color: '#888', fontSize: 14 }}>
        If you forgot your password, use the <a href="/forgot-password" style={{ color: '#2563eb', textDecoration: 'underline' }}>reset password</a> page.
      </div>
    </div>
  );
} 