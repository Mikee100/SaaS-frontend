"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import Link from "next/link";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sw", label: "Swahili" },
];
const REGIONS = [
  { value: "ke", label: "Kenya" },
  { value: "ug", label: "Uganda" },
  { value: "tz", label: "Tanzania" },
];

export default function PreferencesSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [prefs, setPrefs] = useState({
    notificationPreferences: { email: true, sms: false },
    language: "en",
    region: "ke",
  });

  useEffect(() => {
    apiGet("/user/me").then((user: any) => {
      setPrefs({
        notificationPreferences: {
          email: user.notificationPreferences?.email ?? true,
          sms: user.notificationPreferences?.sms ?? false,
        },
        language: user.language || "en",
        region: user.region || "ke",
      });
    }).catch(() => setError("Failed to load preferences"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      await apiPut("/user/me/preferences", prefs);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Preferences</h2>
        <Link href="/settings" style={{ color: "#2563eb", textDecoration: "underline" }}>← All Settings</Link>
      </div>
      {success && <div style={{ marginBottom: 16, color: 'green' }}>Preferences saved!</div>}
      {error && <div style={{ marginBottom: 16, color: 'red' }}>{error}</div>}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Notifications</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={prefs.notificationPreferences.email}
              onChange={e => setPrefs(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, email: e.target.checked } }))}
            />
            Email notifications
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={prefs.notificationPreferences.sms}
              onChange={e => setPrefs(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, sms: e.target.checked } }))}
            />
            SMS notifications
          </label>
        </div>
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Language</h3>
          <select
            value={prefs.language}
            onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: 15, background: '#f7fafd' }}
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Region</h3>
          <select
            value={prefs.region}
            onChange={e => setPrefs(p => ({ ...p, region: e.target.value }))}
            style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: 15, background: '#f7fafd' }}
          >
            {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{ padding: '10px 28px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f7fafd', fontWeight: 600, fontSize: 16, color: '#222', cursor: 'pointer' }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
} 