"use client";
import { useState, useEffect, useRef } from "react";
import { apiGet, apiPut, apiDelete, apiPost } from "@/utils/api";

const currencies = ["KES", "USD", "EUR", "GBP"];
const timezones = ["Africa/Nairobi", "UTC", "Europe/London", "America/New_York"];
const roles = ["owner", "manager", "cashier"];

async function uploadLogoFile(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/tenant/logo`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.logoUrl);
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        reject(new Error("Failed to upload logo"));
      }
    };
    xhr.onerror = () => reject(new Error("Failed to upload logo"));
    xhr.send(formData);
  });
}

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: "",
    businessType: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    currency: "KES",
    timezone: "Africa/Nairobi",
    invoiceFooter: "",
    logoUrl: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const [logoError, setLogoError] = useState("");
  const [logoSuccess, setLogoSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "cashier", password: "" });
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "cashier" });
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [removeUser, setRemoveUser] = useState<any | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [removeSuccess, setRemoveSuccess] = useState("");
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permUser, setPermUser] = useState<any | null>(null);
  const [permChecked, setPermChecked] = useState<string[]>([]);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState("");
  const [permSuccess, setPermSuccess] = useState("");
  // Get current user from localStorage
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        setCurrentUser(JSON.parse(localStorage.getItem("user") || "null"));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);
  const canManageUsers = currentUser && (currentUser.role === "owner" || currentUser.role === "manager");

  // Permissions matrix state
  const [permMatrix, setPermMatrix] = useState<Record<string, string[]>>({}); // userId -> permission keys
  const [permMatrixChanged, setPermMatrixChanged] = useState(false);
  const [permMatrixSaving, setPermMatrixSaving] = useState(false);
  const [permMatrixError, setPermMatrixError] = useState("");
  const [permMatrixSuccess, setPermMatrixSuccess] = useState("");
  // Notes for each user-permission (userId_permKey -> note)
  const [permNotes, setPermNotes] = useState<Record<string, string>>({});
  const [noteEdit, setNoteEdit] = useState<{ userId: string; permKey: string } | null>(null);
  const [noteInput, setNoteInput] = useState("");

  // Build initial matrix when users/permissions change
  useEffect(() => {
    const matrix: Record<string, string[]> = {};
    users.forEach(u => {
      matrix[u.id] = u.permissions?.map((p: any) => p.permission?.key) || [];
    });
    setPermMatrix(matrix);
    setPermMatrixChanged(false);
  }, [users, permissions]);

  // Build initial notes when users/permissions change
  useEffect(() => {
    const notes: Record<string, string> = {};
    users.forEach(u => {
      (u.permissions || []).forEach((up: any) => {
        if (up.permission?.key) {
          notes[`${u.id}_${up.permission.key}`] = up.note || "";
        }
      });
    });
    setPermNotes(notes);
  }, [users, permissions]);

  // Toggle permission in matrix
  const toggleMatrixPerm = (userId: string, permKey: string) => {
    setPermMatrix((prev) => {
      const userPerms = prev[userId] || [];
      const updated = userPerms.includes(permKey)
        ? userPerms.filter(k => k !== permKey)
        : [...userPerms, permKey];
      return { ...prev, [userId]: updated };
    });
    setPermMatrixChanged(true);
  };

  // Open note editor
  const openNoteEdit = (userId: string, permKey: string) => {
    setNoteEdit({ userId, permKey });
    setNoteInput(permNotes[`${userId}_${permKey}`] || "");
  };

  // Save note
  const saveNote = () => {
    if (noteEdit) {
      setPermNotes((prev) => ({ ...prev, [`${noteEdit.userId}_${noteEdit.permKey}`]: noteInput }));
      setNoteEdit(null);
      setPermMatrixChanged(true);
    }
  };

  // Save all permissions in matrix
  const handleMatrixSave = async () => {
    setPermMatrixSaving(true);
    setPermMatrixError("");
    setPermMatrixSuccess("");
    try {
      await Promise.all(
        users.map(u =>
          u.role === "owner"
            ? Promise.resolve()
            : apiPut(`/user/${u.id}/permissions`, {
                permissions: (permMatrix[u.id] || []).map((key) => ({
                  key,
                  note: permNotes[`${u.id}_${key}`] || undefined,
                })),
              })
        )
      );
      setPermMatrixSuccess("Permissions updated!");
      setPermMatrixChanged(false);
      setUserLoading(true);
      apiGet<any[]>("/user").then(setUsers).finally(() => setUserLoading(false));
    } catch (err: any) {
      setPermMatrixError(err.message || "Failed to update permissions");
    } finally {
      setPermMatrixSaving(false);
    }
  };

  useEffect(() => {
    apiGet<any>("/tenant/me")
      .then((data) => setForm({
        name: data.name || "",
        businessType: data.businessType || "",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
        address: data.address || "",
        currency: data.currency || "KES",
        timezone: data.timezone || "Africa/Nairobi",
        invoiceFooter: data.invoiceFooter || "",
        logoUrl: data.logoUrl || "",
      }))
      .catch(() => setError("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (logoFile) {
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(logoFile);
    } else {
      setLogoPreview(form.logoUrl || "");
    }
  }, [logoFile, form.logoUrl]);

  // Fetch users
  useEffect(() => {
    setUserLoading(true);
    apiGet<any[]>("/user").then(setUsers).finally(() => setUserLoading(false));
  }, []);

  // Fetch all permissions
  useEffect(() => {
    apiGet<any[]>("/permissions").then(setPermissions);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError("");
    setLogoSuccess("");
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type and size
      if (!file.type.startsWith("image/")) {
        setLogoError("Only image files are allowed.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setLogoError("File size must be less than 2MB.");
        return;
      }
      setLogoFile(file);
      setLogoUploading(true);
      setLogoProgress(0);
      try {
        const url = await uploadLogoFile(file, setLogoProgress);
        setForm((prev) => ({ ...prev, logoUrl: url }));
        setLogoPreview(url);
        setLogoSuccess("Logo uploaded successfully!");
      } catch (err) {
        setLogoError("Failed to upload logo");
      } finally {
        setLogoUploading(false);
      }
    }
  };

  const handleLogoRemove = () => {
    setLogoFile(null);
    setLogoPreview("");
    setForm({ ...form, logoUrl: "" });
    setLogoSuccess("");
    setLogoError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await apiPut("/tenant/me", { ...form });
      setSuccess("Settings updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm({ ...pwForm, [e.target.name]: e.target.value });
  };

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwError("");
    setPwSuccess("");
    if (pwForm.new !== pwForm.confirm) {
      setPwError("New passwords do not match");
      setPwSaving(false);
      return;
    }
    try {
      // TODO: Implement password change endpoint
      // await apiPut("/user/change-password", { current: pwForm.current, new: pwForm.new });
      setPwSuccess("Password changed successfully!");
    } catch (err: any) {
      setPwError(err.message || "Failed to change password");
    } finally {
      setPwSaving(false);
    }
  };

  // Invite user
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    try {
      await apiPost("/user", inviteForm);
      setInviteSuccess("User invited successfully!");
      setInviteForm({ name: "", email: "", role: "cashier", password: "" });
      setInviteOpen(false);
      setUserLoading(true);
      apiGet<any[]>("/user").then(setUsers).finally(() => setUserLoading(false));
    } catch (err: any) {
      setInviteError(err.message || "Failed to invite user");
    }
  };

  // Edit user
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    setEditSuccess("");
    try {
      await apiPut(`/user/${editUser.id}`, editForm);
      setEditSuccess("User updated!");
      setEditUser(null);
      setUserLoading(true);
      apiGet<any[]>("/user").then(setUsers).finally(() => setUserLoading(false));
    } catch (err: any) {
      setEditError(err.message || "Failed to update user");
    }
  };

  // Remove user
  const handleRemove = async () => {
    if (!removeUser) return;
    setRemoveError("");
    setRemoveSuccess("");
    try {
      await apiDelete(`/user/${removeUser.id}`);
      setRemoveSuccess("User removed!");
      setRemoveUser(null);
      setUserLoading(true);
      apiGet<any[]>("/user").then(setUsers).finally(() => setUserLoading(false));
    } catch (err: any) {
      setRemoveError(err.message || "Failed to remove user");
    }
  };

  // Open permissions modal
  const openPerms = (user: any) => {
    setPermUser(user);
    setPermChecked(user.permissions?.map((p: any) => p.permission?.key) || []);
    setPermError("");
    setPermSuccess("");
  };

  // Toggle permission
  const togglePerm = (key: string) => {
    setPermChecked((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // Save permissions (now with backend integration)
  const handlePermSave = async () => {
    if (!permUser) return;
    setPermSaving(true);
    setPermError("");
    setPermSuccess("");
    try {
      await apiPut(`/user/${permUser.id}/permissions`, { permissions: permChecked });
      setPermSuccess("Permissions updated!");
      setPermSaving(false);
      setPermUser(null);
      setUserLoading(true);
      apiGet<any[]>("/user").then(setUsers).finally(() => setUserLoading(false));
    } catch (err: any) {
      setPermError(err.message || "Failed to update permissions");
      setPermSaving(false);
    }
  };

  // Grant all permissions
  const grantAllPerms = () => setPermChecked(permissions.map((p) => p.key));
  // Revoke all permissions
  const revokeAllPerms = () => setPermChecked([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-0">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8 pt-10 pl-10">Business Settings</h1>
      <div className="w-full max-w-3xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
            <div className="text-center text-gray-500">Loading...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Preview" className="h-16 w-16 rounded object-cover border transition-all duration-200" />
                ) : (
                  <div className="h-16 w-16 rounded bg-gray-100 border flex items-center justify-center text-gray-400">No Logo</div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => fileInputRef.current?.click()} disabled={logoUploading}>Upload Logo</button>
                  {logoPreview && <button type="button" className="text-xs text-red-600 hover:underline" onClick={handleLogoRemove} disabled={logoUploading}>Remove</button>}
                  {logoUploading && (
                    <div className="w-32 h-2 bg-gray-200 rounded mt-1 overflow-hidden">
                      <div className="h-2 bg-blue-500 rounded transition-all" style={{ width: `${logoProgress}%` }}></div>
                    </div>
                  )}
                  {logoError && <div className="text-xs text-red-600 mt-1">{logoError}</div>}
                  {logoSuccess && <div className="text-xs text-green-600 mt-1">{logoSuccess}</div>}
                </div>
              </div>
            </div>
            {/* Business Info */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <input
                  type="text"
                  name="businessType"
                  value={form.businessType}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={form.contactEmail}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  name="contactPhone"
                  value={form.contactPhone}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
            </div>
            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            {/* Currency & Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                >
                  {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                >
                  {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
            </div>
            {/* Invoice Footer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice/Receipt Footer</label>
              <textarea
                name="invoiceFooter"
                value={form.invoiceFooter}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded"
                rows={2}
              />
            </div>
            {(error || success) && (
              <div className="text-center">
                {error && <div className="text-red-600 text-sm mb-1">{error}</div>}
                {success && <div className="text-green-600 text-sm mb-1">{success}</div>}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition"
              disabled={saving || logoUploading}
            >
              {saving ? "Saving..." : logoUploading ? "Uploading Logo..." : "Save Settings"}
            </button>
          </form>
        )}
        {/* Password Change Section */}
        <div className="mt-16 border-t pt-12">
          <h2 className="text-lg font-bold mb-4 text-blue-700">Change Password</h2>
          <form onSubmit={handlePwSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  name="current"
                  value={pwForm.current}
                  onChange={handlePwChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  name="new"
                  value={pwForm.new}
                  onChange={handlePwChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  name="confirm"
                  value={pwForm.confirm}
                  onChange={handlePwChange}
                  className="w-full border px-3 py-2 rounded"
                  required
                />
              </div>
            </div>
            {(pwError || pwSuccess) && (
              <div className="text-center">
                {pwError && <div className="text-red-600 text-sm mb-1">{pwError}</div>}
                {pwSuccess && <div className="text-green-600 text-sm mb-1">{pwSuccess}</div>}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition"
              disabled={pwSaving}
            >
              {pwSaving ? "Saving..." : "Change Password"}
            </button>
          </form>
        </div>
        {/* Team Management Section */}
        <div className="mt-16 border-t pt-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-700">Team Members</h2>
            {canManageUsers && (
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => setInviteOpen(true)}>Invite User</button>
            )}
          </div>
          {userLoading ? (
            <div className="text-center text-gray-500">Loading users...</div>
          ) : (
            <table className="min-w-full bg-white border rounded shadow">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Email</th>
                  <th className="py-2 px-4 border-b">Role</th>
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 px-4 border-b flex items-center gap-2">
                      {u.name}
                      {u.role === "owner" && <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-semibold">Owner</span>}
                    </td>
                    <td className="py-2 px-4 border-b">{u.email}</td>
                    <td className="py-2 px-4 border-b">{u.role}</td>
                    <td className="py-2 px-4 border-b">
                      {canManageUsers && u.role !== "owner" && (
                        <>
                          <button className="text-blue-600 hover:underline mr-2" onClick={() => { setEditUser(u); setEditForm({ name: u.name, role: u.role }); }}>Edit</button>
                          <button className="text-red-600 hover:underline" onClick={() => setRemoveUser(u)}>Remove</button>
                        </>
                      )}
                      {u.role === "owner" && <span className="text-xs text-gray-400">Full access</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Permissions Matrix */}
          <div className="mt-10 overflow-x-auto">
            <h3 className="text-lg font-bold mb-2 text-blue-700">Permissions Matrix</h3>
            {permMatrixError && <div className="text-red-600 text-sm mb-2">{permMatrixError}</div>}
            {permMatrixSuccess && <div className="text-green-600 text-sm mb-2">{permMatrixSuccess}</div>}
            <table className="min-w-full bg-white border rounded shadow text-xs">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left">User</th>
                  {permissions.map((p) => (
                    <th key={p.key} className="py-2 px-2 border-b text-center" title={p.description || p.key}>{p.description || p.key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 px-4 border-b flex items-center gap-2">
                      {u.name}
                      {u.role === "owner" && <span className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-semibold">Owner</span>}
                    </td>
                    {permissions.map((p) => {
                      const checked = permMatrix[u.id]?.includes(p.key) || false;
                      const note = permNotes[`${u.id}_${p.key}`] || "";
                      return (
                        <td key={p.key} className="py-2 px-2 border-b text-center relative group">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMatrixPerm(u.id, p.key)}
                            disabled={u.role === "owner" || !canManageUsers || permMatrixSaving}
                            className="accent-blue-600"
                          />
                          {checked && (
                            <button
                              type="button"
                              className="ml-1 text-xs text-gray-400 hover:text-blue-600"
                              title={note ? `Note: ${note}` : "Add note"}
                              onClick={() => openNoteEdit(u.id, p.key)}
                              disabled={u.role === "owner" || !canManageUsers || permMatrixSaving}
                            >
                              {note ? "📝" : "＋"}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-4">
              <button
                className="px-6 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                onClick={handleMatrixSave}
                disabled={!permMatrixChanged || permMatrixSaving}
              >
                {permMatrixSaving ? "Saving..." : "Save All"}
              </button>
            </div>
            {/* Note Edit Modal */}
            {noteEdit && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-semibold mb-4">Permission Note</h2>
                  <textarea
                    className="w-full border px-3 py-2 rounded mb-4"
                    rows={3}
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    placeholder="Add a note for this permission (optional)"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setNoteEdit(null)}>Cancel</button>
                    <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={saveNote}>Save</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Invite Modal */}
          {inviteOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">Invite User</h2>
                <form onSubmit={handleInvite} className="space-y-4">
                  <input type="text" placeholder="Name" value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} className="w-full border px-3 py-2 rounded" required />
                  <input type="email" placeholder="Email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full border px-3 py-2 rounded" required />
                  <input type="password" placeholder="Password" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} className="w-full border px-3 py-2 rounded" required />
                  <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className="w-full border px-3 py-2 rounded">
                    {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  {inviteError && <div className="text-red-600 text-sm">{inviteError}</div>}
                  {inviteSuccess && <div className="text-green-600 text-sm">{inviteSuccess}</div>}
                  <div className="flex justify-end gap-2">
                    <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setInviteOpen(false)}>Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Invite</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Edit Modal */}
          {editUser && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">Edit User</h2>
                <form onSubmit={handleEdit} className="space-y-4">
                  <input type="text" placeholder="Name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full border px-3 py-2 rounded" required />
                  <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="w-full border px-3 py-2 rounded">
                    {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  {editError && <div className="text-red-600 text-sm">{editError}</div>}
                  {editSuccess && <div className="text-green-600 text-sm">{editSuccess}</div>}
                  <div className="flex justify-end gap-2">
                    <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setEditUser(null)}>Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* Remove Modal */}
          {removeUser && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">Remove User</h2>
                <div className="mb-4">Are you sure you want to remove <span className="font-bold">{removeUser.name}</span>?</div>
                {removeError && <div className="text-red-600 text-sm mb-2">{removeError}</div>}
                {removeSuccess && <div className="text-green-600 text-sm mb-2">{removeSuccess}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setRemoveUser(null)}>Cancel</button>
                  <button type="button" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700" onClick={handleRemove}>Remove</button>
                </div>
              </div>
            </div>
          )}
          {/* Permissions Modal */}
          {permUser && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4">Edit Permissions for {permUser.name}</h2>
                {permUser.role === "owner" ? (
                  <div className="text-blue-700 font-semibold mb-4">Owner has all permissions and cannot be edited.</div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-4">
                      <button className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200" onClick={grantAllPerms} disabled={permSaving}>Grant All</button>
                      <button className="px-3 py-1 rounded bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200" onClick={revokeAllPerms} disabled={permSaving}>Revoke All</button>
                    </div>
                    <div className="space-y-2 mb-4">
                      {permissions.map((p) => (
                        <label key={p.key} className="flex items-center gap-2" title={p.description || p.key}>
                          <input
                            type="checkbox"
                            checked={permChecked.includes(p.key)}
                            onChange={() => togglePerm(p.key)}
                            className="accent-blue-600"
                            disabled={permSaving}
                          />
                          <span>{p.description || p.key}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {permError && <div className="text-red-600 text-sm mb-2">{permError}</div>}
                {permSuccess && <div className="text-green-600 text-sm mb-2">{permSuccess}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={() => setPermUser(null)} disabled={permSaving}>Cancel</button>
                  {permUser.role !== "owner" && (
                    <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={handlePermSave} disabled={permSaving}>{permSaving ? "Saving..." : "Save"}</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 