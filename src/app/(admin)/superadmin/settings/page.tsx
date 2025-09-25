"use client";

import React, { useState } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";

export default function SuperadminSettingsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      // TODO: Implement settings save functionality
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: "2rem" }}>Platform Settings</h1>

      <div style={{ display: "grid", gap: "2rem" }}>
        {/* General Settings */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>General Settings</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }}>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Platform Name</label>
                <input
                  name="platformName"
                  defaultValue="SaaS Platform"
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Support Email</label>
                <input
                  name="supportEmail"
                  type="email"
                  defaultValue="support@saasplatform.com"
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Default Plan</label>
                <select
                  name="defaultPlan"
                  defaultValue="basic"
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </form>
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
              <label style={{ position: "relative", display: "inline-block", width: "50px", height: "24px" }}>
                <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "#3b82f6",
                  borderRadius: "24px",
                  transition: "0.4s"
                }}>
                  <span style={{
                    position: "absolute",
                    content: '""',
                    height: "16px",
                    width: "16px",
                    left: "4px",
                    bottom: "4px",
                    background: "#fff",
                    borderRadius: "50%",
                    transition: "0.4s"
                  }} />
                </span>
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: "500", marginBottom: "0.25rem" }}>Two-Factor Authentication</h3>
                <p style={{ fontSize: 14, color: "#6b7280" }}>Enable 2FA for all users</p>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: "50px", height: "24px" }}>
                <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "#d1d5db",
                  borderRadius: "24px",
                  transition: "0.4s"
                }}>
                  <span style={{
                    position: "absolute",
                    content: '""',
                    height: "16px",
                    width: "16px",
                    left: "4px",
                    bottom: "4px",
                    background: "#fff",
                    borderRadius: "50%",
                    transition: "0.4s"
                  }} />
                </span>
              </label>
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
                name="currency"
                defaultValue="USD"
                style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="KES">KES (KSh)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Trial Period (Days)</label>
              <input
                name="trialPeriod"
                type="number"
                defaultValue="14"
                min="0"
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
            onClick={() => handleSaveSettings()}
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