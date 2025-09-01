"use client";
import { useState } from "react";
import { apiPut } from "@/utils/api";
import { FaKey } from 'react-icons/fa';
import Link from "next/link";

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

  if (loading) return (
    <div className="flex justify-center items-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaKey className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Change Password</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      <div className="bg-white rounded-xl shadow p-8 w-full mb-8">
        <div className="text-gray-600 text-base mb-4">Update your password regularly to keep your account secure.</div>
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
      </div>
      <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '32px 0' }} />
      <div style={{ color: '#888', fontSize: 14 }}>
        If you forgot your password, use the <a href="/forgot-password" style={{ color: '#2563eb', textDecoration: 'underline' }}>reset password</a> page.
      </div>
    </div>
  );
} 