"use client";

import React from "react";
import { apiGet } from "@/utils/api";

const ClassificationsAdminPage = () => {
  const [classifications, setClassifications] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    apiGet<any[]>("/admin/classifications")
      .then((data) => {
        setClassifications(data);
        setSelected(data[0] || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load classifications");
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ color: "#fff", textAlign: "center", marginTop: 80 }}>Loading classifications...</div>;
  if (error) return <div style={{ color: "#f00", textAlign: "center", marginTop: 80 }}>{error}</div>;

  return (
    <div style={{ maxWidth: 1200, margin: "2rem auto", padding: "2rem", display: "flex", gap: 32, position: "relative" }}>
      {/* Left panel: Classification list */}
      <div style={{ width: 320, background: "#181828", borderRadius: 12, padding: 24, minHeight: 500 }}>
        <h3 style={{ color: "#fff", marginBottom: 24 }}>Classifications</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {classifications.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{
                display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 8, cursor: "pointer",
                background: selected?.id === c.id ? c.color || "#23233a" : "#23233a",
                color: selected?.id === c.id ? "#fff" : "#ccc",
                boxShadow: selected?.id === c.id ? "0 2px 12px #0004" : undefined,
                border: selected?.id === c.id ? "2px solid #fff" : "2px solid transparent"
              }}
            >
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: selected?.id === c.id ? "#fff" : "#aaa" }}>{(c.units || []).map((u: any) => u.abbreviation).join(", ")}</div>
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{c._count?.primaryTenants ?? 0} tenants</div>
            </div>
          ))}
        </div>
      </div>
      {/* Right panel: Details + units */}
      <div style={{ flex: 1, background: "#23233a", borderRadius: 12, padding: 32, minHeight: 500 }}>
        <h3 style={{ color: "#fff", marginBottom: 24 }}>Details & Units</h3>
        {selected ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <span style={{ fontSize: 40 }}>{selected.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 22 }}>{selected.name}</div>
                <div style={{ fontSize: 14, color: "#ccc" }}>Units: {(selected.units || []).map((u: any) => u.abbreviation).join(", ")}</div>
                <div style={{ fontSize: 13, color: "#aaa" }}>{selected._count?.primaryTenants ?? 0} tenants</div>
              </div>
            </div>
            <table style={{ width: "100%", background: "#181828", borderRadius: 8, marginTop: 16 }}>
              <thead>
                <tr style={{ color: "#fff", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Unit</th>
                  <th style={{ padding: 8 }}>Abbreviation</th>
                  <th style={{ padding: 8 }}>Type</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(selected.units || []).map((u: any) => (
                  <tr key={u.id} style={{ color: "#fff" }}>
                    <td style={{ padding: 8 }}>{u.name}</td>
                    <td style={{ padding: 8 }}>{u.abbreviation}</td>
                    <td style={{ padding: 8 }}>{u.type}</td>
                    <td style={{ padding: 8 }}><button style={{ background: "#444", color: "#fff", border: "none", borderRadius: 4, padding: "2px 10px" }}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div style={{ color: "#aaa" }}>Select a classification to view details.</div>}
      </div>
      {/* Floating +New button */}
      <button style={{ position: "absolute", right: 48, bottom: 48, background: "#0070f3", color: "#fff", border: "none", borderRadius: "50%", width: 64, height: 64, fontSize: 32, boxShadow: "0 4px 24px #0070f399", cursor: "pointer" }}>+</button>
    </div>
  );
};

export default ClassificationsAdminPage;
