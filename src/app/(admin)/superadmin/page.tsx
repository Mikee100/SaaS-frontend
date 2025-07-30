"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";

interface PlatformStats {
  totalTenants: number;
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  activeTenants: number;
  superadminUsers: number;
  averageUsersPerTenant: string;
  averageProductsPerTenant: string;
}

export default function SuperadminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const data = await apiGet("/admin/stats") as PlatformStats;
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch platform stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 24 }}>
        Superadmin Dashboard
      </h1>
      
      {loadingStats ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Loading platform statistics...
        </div>
      ) : stats ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Total Tenants</h3>
            <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937" }}>{stats.totalTenants}</p>
            <p style={{ fontSize: 14, color: "#6b7280" }}>{stats.activeTenants} active</p>
          </div>
          
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Total Users</h3>
            <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937" }}>{stats.totalUsers}</p>
            <p style={{ fontSize: 14, color: "#6b7280" }}>~{stats.averageUsersPerTenant} per tenant</p>
          </div>
          
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Total Products</h3>
            <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937" }}>{stats.totalProducts}</p>
            <p style={{ fontSize: 14, color: "#6b7280" }}>~{stats.averageProductsPerTenant} per tenant</p>
          </div>
          
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Total Sales</h3>
            <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937" }}>{stats.totalSales}</p>
            <p style={{ fontSize: 14, color: "#6b7280" }}>Across all tenants</p>
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <p style={{ color: "#ef4444" }}>Failed to load platform statistics</p>
        </div>
      )}

      <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <button 
            onClick={() => router.push("/superadmin/tenants")}
            style={{ 
              background: "#3b82f6", 
              color: "#fff", 
              padding: "1rem", 
              borderRadius: "6px", 
              border: "none", 
              cursor: "pointer",
              fontWeight: "500",
              textAlign: "left"
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "600", marginBottom: "0.25rem" }}>Manage Tenants</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>View and manage all platform tenants</div>
          </button>
          
          <button 
            onClick={() => router.push("/superadmin/users")}
            style={{ 
              background: "#10b981", 
              color: "#fff", 
              padding: "1rem", 
              borderRadius: "6px", 
              border: "none", 
              cursor: "pointer",
              fontWeight: "500",
              textAlign: "left"
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "600", marginBottom: "0.25rem" }}>Manage Users</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>View and manage all platform users</div>
          </button>
          
          <button 
            onClick={() => router.push("/superadmin/support")}
            style={{ 
              background: "#f59e0b", 
              color: "#fff", 
              padding: "1rem", 
              borderRadius: "6px", 
              border: "none", 
              cursor: "pointer",
              fontWeight: "500",
              textAlign: "left"
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "600", marginBottom: "0.25rem" }}>Support Tickets</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Handle client requests and issues</div>
          </button>
          
          <button 
            onClick={() => router.push("/superadmin/health")}
            style={{ 
              background: "#8b5cf6", 
              color: "#fff", 
              padding: "1rem", 
              borderRadius: "6px", 
              border: "none", 
              cursor: "pointer",
              fontWeight: "500",
              textAlign: "left"
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "600", marginBottom: "0.25rem" }}>System Health</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Monitor platform performance</div>
          </button>
          
          <button 
            onClick={() => router.push("/superadmin/bulk")}
            style={{ 
              background: "#ef4444", 
              color: "#fff", 
              padding: "1rem", 
              borderRadius: "6px", 
              border: "none", 
              cursor: "pointer",
              fontWeight: "500",
              textAlign: "left"
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "600", marginBottom: "0.25rem" }}>Bulk Operations</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Perform mass actions efficiently</div>
          </button>
          
          <button 
            onClick={() => router.push("/superadmin/logs")}
            style={{ 
              background: "#6b7280", 
              color: "#fff", 
              padding: "1rem", 
              borderRadius: "6px", 
              border: "none", 
              cursor: "pointer",
              fontWeight: "500",
              textAlign: "left"
            }}
          >
            <div style={{ fontSize: 16, fontWeight: "600", marginBottom: "0.25rem" }}>Audit Logs</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>View system activity logs</div>
          </button>
        </div>
      </div>
    </main>
  );
} 