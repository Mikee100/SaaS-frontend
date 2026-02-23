"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/utils/api";

interface BulkOperation {
  id: string;
  type: 'user_management' | 'tenant_management' | 'data_migration' | 'system_maintenance';
  action: string;
  description: string;
  affectedCount: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface BulkAction {
  type: string;
  action: string;
  description: string;
  requiresConfirmation: boolean;
  destructive: boolean;
}

export default function BulkOperationsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [loadingOperations, setLoadingOperations] = useState(true);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchOperations();
    }
  }, [user]);

const fetchOperations = async () => {
  try {
    setLoadingOperations(true);
    const data = await apiGet("/admin/bulk/operations");
    setOperations(data as BulkOperation[]);
  } catch (error) {
    console.error("Failed to fetch operations:", error);
  } finally {
    setLoadingOperations(false);
  }
};

  const bulkActions: BulkAction[] = [
    {
      type: "user_management",
      action: "suspend_users",
      description: "Suspend multiple users across tenants",
      requiresConfirmation: true,
      destructive: true
    },
    {
      type: "user_management",
      action: "activate_users",
      description: "Activate suspended users",
      requiresConfirmation: false,
      destructive: false
    },
    {
      type: "user_management",
      action: "reset_passwords",
      description: "Reset passwords for multiple users",
      requiresConfirmation: true,
      destructive: false
    },
    {
      type: "tenant_management",
      action: "suspend_tenants",
      description: "Suspend entire tenants",
      requiresConfirmation: true,
      destructive: true
    },
    {
      type: "tenant_management",
      action: "activate_tenants",
      description: "Activate suspended tenants",
      requiresConfirmation: false,
      destructive: false
    },
    {
      type: "tenant_management",
      action: "update_plan",
      description: "Update subscription plans for multiple tenants",
      requiresConfirmation: true,
      destructive: false
    },
    {
      type: "data_migration",
      action: "export_data",
      description: "Export tenant data for migration",
      requiresConfirmation: false,
      destructive: false
    },
    {
      type: "data_migration",
      action: "import_data",
      description: "Import data to tenants",
      requiresConfirmation: true,
      destructive: false
    },
    {
      type: "system_maintenance",
      action: "clear_cache",
      description: "Clear system cache",
      requiresConfirmation: false,
      destructive: false
    },
    {
      type: "system_maintenance",
      action: "optimize_database",
      description: "Optimize database performance",
      requiresConfirmation: true,
      destructive: false
    }
  ];

  const handleActionSelect = (action: string) => {
    const selectedBulkAction = bulkActions.find(a => a.action === action);
    if (selectedBulkAction?.requiresConfirmation) {
      setSelectedAction(action);
      setConfirmationText("");
      setShowConfirmation(true);
    } else {
      executeBulkAction(action, false);
    }
  };

  const executeBulkAction = async (action: string, confirmed = false) => {
    try {
      setLoadingAction(true);
      const body: { action: string; confirmation?: string } = { action };
      const selectedBulkAction = bulkActions.find(a => a.action === action);
      if (selectedBulkAction?.requiresConfirmation && confirmed) {
        body.confirmation = "CONFIRM";
      }
      await apiPost("/admin/bulk/execute", body);
      fetchOperations();
      setShowConfirmation(false);
      setSelectedAction("");
    } catch (error) {
      console.error("Failed to execute bulk action:", error);
    } finally {
      setLoadingAction(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#6b7280';
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'user_management': return '#3b82f6';
      case 'tenant_management': return '#10b981';
      case 'data_migration': return '#f59e0b';
      case 'system_maintenance': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 24 }}>
        Bulk Operations
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Available Actions */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Available Actions</h2>
          
          <div style={{ display: "grid", gap: "1rem" }}>
            {bulkActions.map((action) => (
              <div key={action.action} style={{ 
                padding: "1rem", 
                border: "1px solid #e5e7eb", 
                borderRadius: "6px",
                borderLeft: `4px solid ${getTypeColor(action.type)}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: "600" }}>
                    {action.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {action.requiresConfirmation && (
                      <span style={{ 
                        padding: "0.25rem 0.5rem", 
                        borderRadius: "4px", 
                        fontSize: 12, 
                        fontWeight: "500",
                        background: "#fef3c7",
                        color: "#d97706"
                      }}>
                        Confirmation Required
                      </span>
                    )}
                    {action.destructive && (
                      <span style={{ 
                        padding: "0.25rem 0.5rem", 
                        borderRadius: "4px", 
                        fontSize: 12, 
                        fontWeight: "500",
                        background: "#fee2e2",
                        color: "#dc2626"
                      }}>
                        Destructive
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: "0.5rem 0", fontSize: 14, color: "#6b7280" }}>{action.description}</p>
                <button
                  onClick={() => handleActionSelect(action.action)}
                  disabled={loadingAction}
                  style={{
                    padding: "0.5rem 1rem",
                    background: action.destructive ? "#ef4444" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                    opacity: loadingAction ? 0.5 : 1
                  }}
                >
                  Execute
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Operations */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Recent Operations</h2>
          
          <div style={{ maxHeight: "600px", overflowY: "auto" }}>
            {loadingOperations ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>Loading operations...</div>
            ) : operations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>No operations found</div>
            ) : (
              operations.map((operation) => (
                <div key={operation.id} style={{ 
                  padding: "1rem", 
                  borderBottom: "1px solid #e5e7eb",
                  borderLeft: `4px solid ${getTypeColor(operation.type)}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: "600" }}>{operation.action}</h4>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "4px", 
                      fontSize: 12, 
                      fontWeight: "500",
                      background: getStatusColor(operation.status) + "20",
                      color: getStatusColor(operation.status)
                    }}>
                      {operation.status}
                    </span>
                  </div>
                  <p style={{ margin: "0.5rem 0", fontSize: 14, color: "#6b7280" }}>{operation.description}</p>
                  
                  {operation.status === 'running' && (
                    <div style={{ margin: "0.5rem 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: "0.25rem" }}>
                        <span>Progress</span>
                        <span>{operation.progress}%</span>
                      </div>
                      <div style={{ 
                        width: "100%", 
                        height: "4px", 
                        background: "#e5e7eb", 
                        borderRadius: "2px",
                        overflow: "hidden"
                      }}>
                        <div style={{ 
                          width: `${operation.progress}%`, 
                          height: "100%", 
                          background: "#3b82f6",
                          transition: "width 0.3s"
                        }} />
                      </div>
                    </div>
                  )}
                  
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    Affected: {operation.affectedCount} items • 
                    Created: {new Date(operation.createdAt).toLocaleString()}
                    {operation.completedAt && ` • Completed: ${new Date(operation.completedAt).toLocaleString()}`}
                  </div>
                  
                  {operation.error && (
                    <div style={{ 
                      marginTop: "0.5rem", 
                      padding: "0.5rem", 
                      background: "#fee2e2", 
                      color: "#dc2626",
                      borderRadius: "4px",
                      fontSize: 12
                    }}>
                      Error: {operation.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
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
            maxWidth: "500px",
            width: "90%"
          }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: 20, fontWeight: "bold" }}>Confirm Action</h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: 14, color: "#374151" }}>
              This action will affect multiple items and cannot be easily undone.
              Please type &quot;CONFIRM&quot; to proceed.
            </p>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="Type CONFIRM to proceed"
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                marginBottom: "1rem"
              }}
            />
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setSelectedAction("");
                  setConfirmationText("");
                }}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeBulkAction(selectedAction, true)}
                disabled={confirmationText !== "CONFIRM" || loadingAction}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                  opacity: confirmationText === "CONFIRM" && !loadingAction ? 1 : 0.5
                }}
              >
                {loadingAction ? "Executing..." : "Execute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 