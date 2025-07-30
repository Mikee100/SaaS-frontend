"use client";

import React from "react";
import Link from "next/link";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <aside style={{ width: 280, background: "#1e293b", color: "#fff", padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 32 }}>Superadmin</h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 8, textTransform: "uppercase" }}>Overview</h3>
            <Link href="/superadmin" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Dashboard</Link>
          </div>
          
          <div>
            <h3 style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 8, textTransform: "uppercase" }}>Management</h3>
            <Link href="/superadmin/tenants" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Tenants</Link>
            <Link href="/superadmin/tenants/analytics" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Tenant Analytics</Link>
            <Link href="/superadmin/tenants/migration" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Migration & Backup</Link>
            <Link href="/superadmin/tenants/resources" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Resource Management</Link>
            <Link href="/superadmin/users" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Users</Link>
          </div>
          
          <div>
            <h3 style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 8, textTransform: "uppercase" }}>Support & Operations</h3>
            <Link href="/superadmin/support" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Support Tickets</Link>
            <Link href="/superadmin/bulk" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Bulk Operations</Link>
          </div>
          
          <div>
            <h3 style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 8, textTransform: "uppercase" }}>Monitoring</h3>
            <Link href="/superadmin/health" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>System Health</Link>
            <Link href="/superadmin/logs" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Audit Logs</Link>
          </div>
          
          <div>
            <h3 style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 8, textTransform: "uppercase" }}>Settings</h3>
            <Link href="/superadmin/settings" style={{ color: "#fff", textDecoration: "none", fontWeight: "500", display: "block", padding: "0.5rem 0" }}>Platform Settings</Link>
          </div>
        </div>
      </aside>
      <section style={{ flex: 1, background: "#f8fafc" }}>{children}</section>
    </div>
  );
} 