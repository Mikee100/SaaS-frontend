"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPut } from "@/utils/api";

interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultPlan: string;
  requireEmailVerification: boolean;
  twoFactorAuth: boolean;
  currency: string;
  trialPeriodDays: number;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "SaaS Platform",
  supportEmail: "support@saasplatform.com",
  defaultPlan: "basic",
  requireEmailVerification: true,
  twoFactorAuth: false,
  currency: "KES",
  trialPeriodDays: 14,
};

export default function SuperadminSettingsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const fetchSettings = useCallback(async () => {
    if (!user?.isSuperadmin) return;
    try {
      setLoadingSettings(true);
      const data = await apiGet("/admin/settings/platform") as PlatformSettings;
      setSettings({
        ...DEFAULT_SETTINGS,
        ...data,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoadingSettings(false);
    }
  }, [user?.isSuperadmin]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await apiPut("/admin/settings/platform", settings);
      setMessage({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading || !user) return null;

  if (loadingSettings) {
    return (
      <main style={{ padding: "2rem" }}>
        <div style={{ textAlign: "center", padding: "3rem" }}>Loading settings...</div>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: "2rem" }}>Platform Settings</h1>

      {message && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            borderRadius: "8px",
            background: message.type === "success" ? "#d1fae5" : "#fee2e2",
            color: message.type === "success" ? "#065f46" : "#991b1b",
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ display: "grid", gap: "2rem" }}>
        {/* General Settings */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>General Settings</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Platform Name</label>
              <input
                value={settings.platformName}
                onChange={(e) => updateSetting("platformName", e.target.value)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => updateSetting("supportEmail", e.target.value)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Default Plan</label>
              <select
                value={settings.defaultPlan}
                onChange={(e) => updateSetting("defaultPlan", e.target.value)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Security Settings</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: "500", marginBottom: "0.25rem" }}>Require Email Verification</h3>
                <p style={{ fontSize: 14, color: "#6b7280" }}>Force users to verify their email before accessing the platform</p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) => updateSetting("requireEmailVerification", e.target.checked)}
                style={{ width: 20, height: 20, cursor: "pointer" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: "500", marginBottom: "0.25rem" }}>Two-Factor Authentication</h3>
                <p style={{ fontSize: 14, color: "#6b7280" }}>Enable 2FA for all users</p>
              </div>
              <input
                type="checkbox"
                checked={settings.twoFactorAuth}
                onChange={(e) => updateSetting("twoFactorAuth", e.target.checked)}
                style={{ width: 20, height: 20, cursor: "pointer" }}
              />
            </div>
          </div>
        </div>

        {/* Billing Settings */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Billing Settings</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => updateSetting("currency", e.target.value)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
              >
                <option value="KES">KES (KSh)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Trial Period (Days)</label>
              <input
                type="number"
                value={settings.trialPeriodDays}
                onChange={(e) => updateSetting("trialPeriodDays", parseInt(e.target.value || "0", 10))}
                min={0}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
              />
            </div>
          </div>
        </div>

        {/* System Information */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>System Information</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>Platform Version:</span>
              <span style={{ fontWeight: "500" }}>1.0.0</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>Database:</span>
              <span style={{ fontWeight: "500" }}>PostgreSQL</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>Backend:</span>
              <span style={{ fontWeight: "500" }}>NestJS</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#6b7280" }}>Frontend:</span>
              <span style={{ fontWeight: "500" }}>Next.js</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            style={{
              background: "#3b82f6",
              color: "#fff",
              padding: "0.75rem 2rem",
              borderRadius: "6px",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: "500",
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </main>
  );
}
