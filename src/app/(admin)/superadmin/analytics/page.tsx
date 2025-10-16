"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet } from "@/utils/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FaDatabase, FaChartBar, FaTable, FaSort } from 'react-icons/fa';

interface TenantStats {
  tenantId: string;
  name: string;
  businessType: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  spaceUsedMB: string;
  productCount: number;
}

interface ChartData {
  name: string;
  spaceUsed: number;
  value: number; 
  percentage: number;
  color: string;
  [key: string]: string | number; // Add index signature for recharts compatibility
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export default function SystemAnalyticsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [tenantStats, setTenantStats] = useState<TenantStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'spaceUsed' | 'percentage'>('spaceUsed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchTenantStats();
    }
  }, [user]);

  const fetchTenantStats = async () => {
    try {
      setLoadingStats(true);
      const data = await apiGet("/admin/tenants/analytics") as TenantStats[];
      setTenantStats(data);
    } catch (error) {
      console.error("Failed to fetch tenant stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const totalSpaceUsed = tenantStats.reduce((sum, tenant) => sum + parseFloat(tenant.spaceUsedMB), 0);

  const chartData: ChartData[] = tenantStats.map((tenant, index) => ({
    name: tenant.name.length > 15 ? tenant.name.substring(0, 15) + '...' : tenant.name,
    spaceUsed: parseFloat(tenant.spaceUsedMB),
    value: parseFloat(tenant.spaceUsedMB), // <-- Add this line
    percentage: totalSpaceUsed > 0 ? (parseFloat(tenant.spaceUsedMB) / totalSpaceUsed) * 100 : 0,
    color: COLORS[index % COLORS.length]
  }));

  const sortedChartData = [...chartData].sort((a, b) => {
    let aValue, bValue;
    switch (sortBy) {
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'spaceUsed':
        aValue = a.spaceUsed;
        bValue = b.spaceUsed;
        break;
      case 'percentage':
        aValue = a.percentage;
        bValue = b.percentage;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
  });

  const handleSort = (column: 'name' | 'spaceUsed' | 'percentage') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const formatSpace = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: "0.5rem" }}>System Analytics</h1>
        <p style={{ color: "#6b7280", fontSize: "18px" }}>Database usage and tenant comparison</p>
      </div>

      {loadingStats ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Loading analytics data...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <FaDatabase style={{ color: "#3b82f6" }} />
                <h3 style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Total Database Space</h3>
              </div>
              <p style={{ fontSize: 32, fontWeight: "bold", color: "#1f2937", margin: 0 }}>{formatSpace(totalSpaceUsed)}</p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>Across {tenantStats.length} tenants</p>
            </div>

            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <FaChartBar style={{ color: "#10b981" }} />
                <h3 style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Largest Tenant</h3>
              </div>
              <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937", margin: 0 }}>
                {chartData.length > 0 ? chartData.reduce((max, curr) => curr.spaceUsed > max.spaceUsed ? curr : max).name : 'N/A'}
              </p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>
                {chartData.length > 0 ? formatSpace(chartData.reduce((max, curr) => curr.spaceUsed > max.spaceUsed ? curr : max).spaceUsed) : '0 MB'}
              </p>
            </div>

            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <FaTable style={{ color: "#f59e0b" }} />
                <h3 style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Average Usage</h3>
              </div>
              <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937", margin: 0 }}>
                {tenantStats.length > 0 ? formatSpace(totalSpaceUsed / tenantStats.length) : '0 MB'}
              </p>
              <p style={{ fontSize: 14, color: "#6b7280" }}>Per tenant</p>
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
            {/* Bar Chart */}
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Space Usage by Tenant</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis
                    label={{ value: 'Space Used (MB)', angle: -90, position: 'insideLeft' }}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatSpace(value), 'Space Used']}
                    labelStyle={{ color: '#000' }}
                  />
                  <Bar dataKey="spaceUsed" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>Space Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${((value as number / totalSpaceUsed) * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="spaceUsed"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatSpace(value), 'Space Used']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>Tenant Usage Details</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f9fafb" }}>
                  <tr>
                    <th
                      style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "#374151", cursor: "pointer", borderBottom: "1px solid #e5e7eb" }}
                      onClick={() => handleSort('name')}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        Tenant Name
                        <FaSort style={{ fontSize: "12px", opacity: sortBy === 'name' ? 1 : 0.3 }} />
                      </div>
                    </th>
                    <th
                      style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "#374151", cursor: "pointer", borderBottom: "1px solid #e5e7eb" }}
                      onClick={() => handleSort('spaceUsed')}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        Space Used
                        <FaSort style={{ fontSize: "12px", opacity: sortBy === 'spaceUsed' ? 1 : 0.3 }} />
                      </div>
                    </th>
                    <th
                      style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "#374151", cursor: "pointer", borderBottom: "1px solid #e5e7eb" }}
                      onClick={() => handleSort('percentage')}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        Percentage
                        <FaSort style={{ fontSize: "12px", opacity: sortBy === 'percentage' ? 1 : 0.3 }} />
                      </div>
                    </th>
                    <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>
                      Usage Bar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedChartData.map((tenant, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "1rem", fontWeight: "500", color: "#111827" }}>
                        {tenant.name}
                      </td>
                      <td style={{ padding: "1rem", color: "#6b7280" }}>
                        {formatSpace(tenant.spaceUsed)}
                      </td>
                      <td style={{ padding: "1rem", color: "#6b7280" }}>
                        {tenant.percentage.toFixed(1)}%
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${tenant.percentage}%`,
                              height: "100%",
                              background: tenant.color,
                              transition: "width 0.3s ease"
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
