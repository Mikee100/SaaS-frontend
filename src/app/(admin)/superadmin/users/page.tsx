"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPut } from "@/utils/api";

interface User {
  id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
  isDisabled: boolean;
  createdAt: string;
  tenant: {
    id: string;
    name: string;
  } | null;
  userRoles: {
    role: {
      name: string;
    };
  }[];
}

export default function SuperadminUsersPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await apiGet("/admin/users") as User[];
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiPut(`/admin/users/${userId}/status`, { isDisabled: !currentStatus });
      // Refresh the users list
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update user status:", error);
      alert("Failed to update user status. Please try again.");
    }
  };

  const getRoleNames = (userRoles: User['userRoles']) => {
    return userRoles.map(ur => ur.role.name).join(", ") || "No role";
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: "2rem" }}>User Management</h1>

      {loadingUsers ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Loading users...
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                background: "#fff",
                padding: "1.5rem",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                  <h3 style={{ fontSize: 18, fontWeight: "bold" }}>{user.name}</h3>
                  {user.isSuperadmin && (
                    <span style={{
                      background: "#f59e0b",
                      color: "#fff",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: 12,
                      fontWeight: "500"
                    }}>
                      Superadmin
                    </span>
                  )}
                  {user.isDisabled && (
                    <span style={{
                      background: "#ef4444",
                      color: "#fff",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: 12,
                      fontWeight: "500"
                    }}>
                      Disabled
                    </span>
                  )}
                </div>
                <p style={{ color: "#6b7280", marginBottom: "0.5rem" }}>{user.email}</p>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <span style={{ fontSize: 14, color: "#6b7280" }}>
                    Tenant: {user.tenant?.name || "No tenant"}
                  </span>
                  <span style={{ fontSize: 14, color: "#6b7280" }}>
                    Roles: {getRoleNames(user.userRoles)}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: "0.5rem" }}>
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => toggleUserStatus(user.id, user.isDisabled)}
                  style={{
                    background: user.isDisabled ? "#10b981" : "#ef4444",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14
                  }}
                >
                  {user.isDisabled ? "Enable" : "Disable"}
                </button>
                <button
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ 
        background: "#fff", 
        padding: "1.5rem", 
        borderRadius: "8px", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginTop: "2rem"
      }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: "1rem" }}>User Statistics</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Total Users</h3>
            <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>{users.length}</p>
          </div>
          <div>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Superadmins</h3>
            <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
              {users.filter(u => u.isSuperadmin).length}
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Tenant Users</h3>
            <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
              {users.filter(u => !u.isSuperadmin).length}
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 14, color: "#6b7280", marginBottom: "0.5rem" }}>Disabled Users</h3>
            <p style={{ fontSize: 24, fontWeight: "bold", color: "#1f2937" }}>
              {users.filter(u => u.isDisabled).length}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 