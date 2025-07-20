"use client";
import Link from "next/link";

export default function SettingsHome() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Settings</h1>
        <Link href="/" style={{ color: "#2563eb", textDecoration: "underline" }}>← Back to Home</Link>
      </div>
      <p style={{ color: "#444" }}>Select a section from the sidebar to manage your business settings.</p>
    </div>
  );
} 