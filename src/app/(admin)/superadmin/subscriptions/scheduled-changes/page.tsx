"use client";
import React, { useEffect, useState } from "react";
import { apiGet } from "@/utils/api";

interface ScheduledPlanChange {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  subscriptionId: string;
  currentPlan: string;
  scheduledPlan: string;
  scheduledEffectiveDate: string;
  userCount: number;
  newPlanUserLimit: number | null;
  overLimit: boolean;
}

export default function ScheduledPlanChangesPage() {
  const [data, setData] = useState<ScheduledPlanChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet("/admin/subscriptions/scheduled")
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>
        Scheduled Plan Changes
      </h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      {!loading && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: 8, border: "1px solid #e5e7eb" }}>Tenant</th>
              <th style={{ padding: 8, border: "1px solid #e5e7eb" }}>Current Plan</th>
              <th style={{ padding: 8, border: "1px solid #e5e7eb" }}>Scheduled Plan</th>
              <th style={{ padding: 8, border: "1px solid #e5e7eb" }}>Effective Date</th>
              <th style={{ padding: 8, border: "1px solid #e5e7eb" }}>User Count</th>
              <th style={{ padding: 8, border: "1px solid #e5e7eb" }}>New Plan Limit</th>
              <th style={{ padding: 8, border: "1px solid #e5e7eb" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.subscriptionId} style={{ background: row.overLimit ? "#fee2e2" : undefined }}>
                <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 500 }}>{row.tenantName}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{row.tenantEmail}</div>
                </td>
                <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{row.currentPlan}</td>
                <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{row.scheduledPlan}</td>
                <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{new Date(row.scheduledEffectiveDate).toLocaleDateString()}</td>
                <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{row.userCount}</td>
                <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{row.newPlanUserLimit ?? "-"}</td>
                <td style={{ padding: 8, border: "1px solid #e5e7eb", color: row.overLimit ? "#b91c1c" : "#059669", fontWeight: 600 }}>
                  {row.overLimit ? "Over Limit" : "OK"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: 24, color: "#b91c1c" }}>
        <b>Note:</b> Rows highlighted in red indicate that the new plan's user limit will be exceeded. Admin action may be required.
      </div>
    </div>
  );
}
