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

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface LoginActivity {
  id: string;
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  user: {
    name: string;
    email: string;
  };
}

export default function SuperadminUsersPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActivity, setUserActivity] = useState<LoginActivity[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchUsers();
      fetchRoles();
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

  const fetchRoles = async () => {
    try {
      // Assuming there's an endpoint to get all roles
      const data = await apiGet("/admin/roles") as Role[];
      setRoles(data);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      // For now, set some default roles
      setRoles([
        { id: "1", name: "Admin", description: "Administrator role" },
        { id: "2", name: "Manager", description: "Manager role" },
        { id: "3", name: "User", description: "Regular user role" },
      ]);
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

  const updateUserRole = async (userId: string, roleId: string) => {
    try {
      await apiPut(`/admin/users/${userId}/role`, { roleId, tenantId: selectedUser?.tenant?.id });
      alert("User role updated successfully!");
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update user role:", error);
      alert("Failed to update user role. Please try again.");
    }
  };

  const fetchUserActivity = async (userId: string) => {
    try {
      setLoadingActivity(true);
      const data = await apiGet(`/admin/users/${userId}/activity?limit=50`) as LoginActivity[];
      setUserActivity(data);
      setShowActivityModal(true);
    } catch (error) {
      console.error("Failed to fetch user activity:", error);
      alert("Failed to fetch user activity. Please try again.");
    } finally {
      setLoadingActivity(false);
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
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <select
                  onChange={(e) => updateUserRole(user.id, e.target.value)}
                  defaultValue={user.userRoles[0]?.role?.name || ""}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                    minWidth: "120px"
                  }}
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
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
                  onClick={() => {
                    setSelectedUser(user);
                    fetchUserActivity(user.id);
                  }}
                  disabled={loadingActivity}
                  style={{
                    background: "#8b5cf6",
                    color: "#fff",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    border: "none",
                    cursor: loadingActivity ? "not-allowed" : "pointer",
                    fontSize: 14,
                    opacity: loadingActivity ? 0.6 : 1
                  }}
                >
                  {loadingActivity ? "Loading..." : "Activity"}
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

      {/* Activity Modal */}
      {showActivityModal && selectedUser && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "8px",
            maxWidth: "800px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: 20, fontWeight: "bold" }}>
                Login Activity for {selectedUser.name}
              </h2>
              <button
                onClick={() => setShowActivityModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#6b7280"
                }}
              >
                ×
              </button>
            </div>

            {userActivity.length === 0 ? (
              <p style={{ textAlign: "center", color: "#6b7280" }}>No login activity found.</p>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {userActivity.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      background: "#f9fafb",
                      padding: "1rem",
                      borderRadius: "4px",
                      border: "1px solid #e5e7eb"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: "bold", color: activity.success ? "#10b981" : "#ef4444" }}>
                        {activity.success ? "✓ Successful Login" : "✗ Failed Login"}
                      </span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {new Date(activity.loginTime).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>
                      <p>IP: {activity.ipAddress || "Unknown"}</p>
                      <p>User Agent: {activity.userAgent || "Unknown"}</p>
                      {activity.failureReason && (
                        <p style={{ color: "#ef4444" }}>Reason: {activity.failureReason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
