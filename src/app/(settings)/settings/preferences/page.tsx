"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import Link from "next/link";
import { FaCogs } from 'react-icons/fa';

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
    stockThreshold: 15,
  });

  useEffect(() => {
    // Load preferences from user and tenant config
    Promise.all([
      apiGet("/user/me"),
      apiGet("/tenant/configurations/stockThreshold")
    ]).then(([user, config]: [any, any]) => {
      setPrefs({
        notificationPreferences: {
          email: user.notificationPreferences?.email ?? true,
          sms: user.notificationPreferences?.sms ?? false,
        },
        language: user.language || "en",
        region: user.region || "ke",
        stockThreshold: config?.value ? Number(config.value) : 15,
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
      // Only send user preferences fields to /user/me/preferences
      const { stockThreshold, ...userPrefs } = prefs;
      await Promise.all([
        apiPut("/user/me/preferences", userPrefs),
        apiPut("/tenant/configurations/stockThreshold", { value: String(prefs.stockThreshold), category: "general" })
      ]);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save preferences");
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
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaCogs className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Preferences</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>
      {success && <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 border border-green-200">Preferences saved!</div>}
      {error && <div className="mb-4 px-4 py-2 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}
      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white rounded-xl shadow p-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold mb-2 text-gray-700">Notifications</h3>
              <p className="text-xs text-gray-400 mb-4">Choose how you want to receive important updates.</p>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notificationPreferences.email}
                  onChange={e => setPrefs(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, email: e.target.checked } }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">Email notifications</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notificationPreferences.sms}
                  onChange={e => setPrefs(p => ({ ...p, notificationPreferences: { ...p.notificationPreferences, sms: e.target.checked } }))}
                  className="accent-blue-600"
                />
                <span className="text-gray-700">SMS notifications</span>
              </label>
              <div className="mt-6">
                <h3 className="font-semibold mb-2 text-gray-700">Low Stock Threshold</h3>
                <p className="text-xs text-gray-400 mb-2">Set the minimum stock level before a low stock alert is triggered.</p>
                <input
                  type="number"
                  min={1}
                  value={prefs.stockThreshold}
                  onChange={e => setPrefs(p => ({ ...p, stockThreshold: Number(e.target.value) }))}
                  className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 w-32"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold mb-2 text-gray-700">Language</h3>
              <p className="text-xs text-gray-400 mb-4">Select your preferred language for the app interface.</p>
              <select
                value={prefs.language}
                onChange={e => setPrefs(p => ({ ...p, language: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <h3 className="font-semibold mb-2 text-gray-700 mt-8">Region</h3>
              <p className="text-xs text-gray-400 mb-4">Set your region to localize content and features.</p>
              <select
                value={prefs.region}
                onChange={e => setPrefs(p => ({ ...p, region: e.target.value }))}
                className="border border-gray-200 rounded px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-2 rounded-lg border border-blue-200 bg-blue-600 text-white font-semibold text-base shadow hover:bg-blue-700 transition disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
} 