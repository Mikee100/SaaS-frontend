"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/UserContext";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/utils/api";

interface TenantBackup {
  id: string;
  tenantId: string;
  tenantName: string;
  type: 'full' | 'incremental';
  status: 'pending' | 'running' | 'completed' | 'failed';
  size: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl: string;
  restorePoints: number;
  records: {
    users: number;
    products: number;
    sales: number;
    inventory: number;
  };
  backupHistory: Array<{
    id: string;
    createdAt: string;
    type: string;
    status: string;
    size: number;
  }>;
}

interface TenantMigration {
  id: string;
  sourceTenantId: string;
  sourceTenantName: string;
  targetTenantId?: string;
  targetTenantName?: string;
  type: 'backup' | 'clone' | 'restore';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  records: number;
  size: number;
  estimatedDuration: number;
  details: {
    tables: string[];
    records: number;
    size: number;
  };
}

interface Tenant {
  id: string;
  name: string;
  businessType: string;
}

export default function MigrationBackupPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [backups, setBackups] = useState<TenantBackup[]>([]);
  const [migrations, setMigrations] = useState<TenantMigration[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<'backups' | 'migrations'>('backups');
  
  // Backup form state
  const [backupForm, setBackupForm] = useState({
    tenantId: '',
    type: 'full' as 'full' | 'incremental',
    description: ''
  });
  
  // Restore form state
  const [restoreForm, setRestoreForm] = useState({
    backupId: '',
    tenantId: '',
    targetTenantId: '',
    options: {
      overwrite: false,
      preserveUsers: true,
      preserveSettings: true
    }
  });
  
  // Migration form state
  const [migrationForm, setMigrationForm] = useState({
    sourceTenantId: '',
    targetTenantId: '',
    type: 'backup' as 'backup' | 'clone',
    options: {
      includeData: true,
      includeSettings: true,
      includeUsers: true
    }
  });

  React.useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin)) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isSuperadmin) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const [backupsData, migrationsData, tenantsData] = await Promise.all([
        apiGet('/admin/test/backups'),
        apiGet('/admin/test/migrations'),
        apiGet('/admin/tenants')
      ]);

      setBackups(backupsData || []);
      setMigrations(migrationsData || []);
      setTenants(tenantsData || []);
    } catch (error) {
      console.error("Failed to fetch migration/backup data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleCreateBackup = async () => {
    try {
      const result = await apiPost('/admin/tenants/backups', backupForm);
      console.log('Backup created:', result);
      fetchData(); // Refresh data
      setBackupForm({ tenantId: '', type: 'full', description: '' });
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  };

  // Restore backup functionality removed as it's not being used

  const handleMigrateTenant = async () => {
    try {
      const result = await apiPost('/admin/tenants/migrate', migrationForm);
      console.log('Migration initiated:', result);
      fetchData(); // Refresh data
      setMigrationForm({
        sourceTenantId: '',
        targetTenantId: '',
        type: 'backup',
        options: { includeData: true, includeSettings: true, includeUsers: true }
      });
    } catch (error) {
      console.error('Failed to migrate tenant:', error);
    }
  };

  if (loading || !user) return null;

  return (
    <main style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          Migration & Backup Management
        </h1>
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          Manage tenant backups, restores, and migrations
        </p>
      </div>

      {loadingData ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Loading migration and backup data...</div>
      ) : (
        <div style={{ display: "grid", gap: "2rem" }}>
          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid #e5e7eb" }}>
            <button
              onClick={() => setActiveTab('backups')}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: activeTab === 'backups' ? "#3b82f6" : "transparent",
                color: activeTab === 'backups' ? "white" : "#6b7280",
                borderRadius: "6px 6px 0 0",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              Backups ({backups.length})
            </button>
            <button
              onClick={() => setActiveTab('migrations')}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: activeTab === 'migrations' ? "#3b82f6" : "transparent",
                color: activeTab === 'migrations' ? "white" : "#6b7280",
                borderRadius: "6px 6px 0 0",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              Migrations ({migrations.length})
            </button>
          </div>

          {activeTab === 'backups' && (
            <div style={{ display: "grid", gap: "2rem" }}>
              {/* Create Backup Form */}
              <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: 18, fontWeight: "bold" }}>Create New Backup</h3>
                <div style={{ display: "grid", gap: "1rem", maxWidth: "600px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "500" }}>
                      Select Tenant
                    </label>
                    <select
                      value={backupForm.tenantId}
                      onChange={(e) => setBackupForm({ ...backupForm, tenantId: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    >
                      <option value="">Choose a tenant...</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.businessType})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "500" }}>
                      Backup Type
                    </label>
                    <select
                      value={backupForm.type}
                      onChange={(e) => setBackupForm({ ...backupForm, type: e.target.value as 'full' | 'incremental' })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    >
                      <option value="full">Full Backup</option>
                      <option value="incremental">Incremental Backup</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "500" }}>
                      Description (Optional)
                    </label>
                    <textarea
                      value={backupForm.description}
                      onChange={(e) => setBackupForm({ ...backupForm, description: e.target.value })}
                      placeholder="Describe this backup..."
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "14px",
                        minHeight: "80px",
                        resize: "vertical"
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={handleCreateBackup}
                    disabled={!backupForm.tenantId}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: backupForm.tenantId ? "pointer" : "not-allowed",
                      opacity: backupForm.tenantId ? 1 : 0.6,
                      fontWeight: "500"
                    }}
                  >
                    Create Backup
                  </button>
                </div>
              </div>

              {/* Backup List */}
              <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: 18, fontWeight: "bold" }}>Recent Backups</h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {backups.map(backup => (
                    <div key={backup.id} style={{ 
                      padding: "1rem", 
                      border: "1px solid #e5e7eb", 
                      borderRadius: "6px",
                      background: "#f9fafb"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div>
                          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "16px", fontWeight: "600" }}>
                            {backup.tenantName}
                          </h4>
                          <p style={{ margin: "0", fontSize: "14px", color: "#6b7280" }}>
                            {backup.type} backup • {formatBytes(backup.size)}
                          </p>
                        </div>
                        <span style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background: getStatusColor(backup.status) + "20",
                          color: getStatusColor(backup.status)
                        }}>
                          {backup.status}
                        </span>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", fontSize: "12px" }}>
                        <div>
                          <span style={{ color: "#6b7280" }}>Users:</span> {backup.records.users}
                        </div>
                        <div>
                          <span style={{ color: "#6b7280" }}>Products:</span> {backup.records.products}
                        </div>
                        <div>
                          <span style={{ color: "#6b7280" }}>Sales:</span> {backup.records.sales}
                        </div>
                        <div>
                          <span style={{ color: "#6b7280" }}>Created:</span> {new Date(backup.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => setRestoreForm({ ...restoreForm, backupId: backup.id, tenantId: backup.tenantId })}
                          style={{
                            padding: "0.5rem 1rem",
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          Restore
                        </button>
                        <button
                          style={{
                            padding: "0.5rem 1rem",
                            background: "#6b7280",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'migrations' && (
            <div style={{ display: "grid", gap: "2rem" }}>
              {/* Migration Form */}
              <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: 18, fontWeight: "bold" }}>Start New Migration</h3>
                <div style={{ display: "grid", gap: "1rem", maxWidth: "600px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "500" }}>
                      Source Tenant
                    </label>
                    <select
                      value={migrationForm.sourceTenantId}
                      onChange={(e) => setMigrationForm({ ...migrationForm, sourceTenantId: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    >
                      <option value="">Choose source tenant...</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.businessType})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "500" }}>
                      Migration Type
                    </label>
                    <select
                      value={migrationForm.type}
                      onChange={(e) => setMigrationForm({ ...migrationForm, type: e.target.value as 'backup' | 'clone' })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "14px"
                      }}
                    >
                      <option value="backup">Backup Migration</option>
                      <option value="clone">Clone Tenant</option>
                    </select>
                  </div>
                  
                  {migrationForm.type === 'clone' && (
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "14px", fontWeight: "500" }}>
                        Target Tenant
                      </label>
                      <select
                        value={migrationForm.targetTenantId}
                        onChange={(e) => setMigrationForm({ ...migrationForm, targetTenantId: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          fontSize: "14px"
                        }}
                      >
                        <option value="">Choose target tenant...</option>
                        {tenants.map(tenant => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.businessType})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <button
                    onClick={handleMigrateTenant}
                    disabled={!migrationForm.sourceTenantId || (migrationForm.type === 'clone' && !migrationForm.targetTenantId)}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#8b5cf6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "500"
                    }}
                  >
                    Start Migration
                  </button>
                </div>
              </div>

              {/* Migration List */}
              <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: 18, fontWeight: "bold" }}>Recent Migrations</h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {migrations.map(migration => (
                    <div key={migration.id} style={{ 
                      padding: "1rem", 
                      border: "1px solid #e5e7eb", 
                      borderRadius: "6px",
                      background: "#f9fafb"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div>
                          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "16px", fontWeight: "600" }}>
                            {migration.sourceTenantName} → {migration.targetTenantName || 'Backup'}
                          </h4>
                          <p style={{ margin: "0", fontSize: "14px", color: "#6b7280" }}>
                            {migration.type} migration • {formatBytes(migration.size)} • {migration.records} records
                          </p>
                        </div>
                        <span style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background: getStatusColor(migration.status) + "20",
                          color: getStatusColor(migration.status)
                        }}>
                          {migration.status}
                        </span>
                      </div>
                      
                      {migration.status === 'running' && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "0.25rem" }}>
                            <span>Progress</span>
                            <span>{migration.progress}%</span>
                          </div>
                          <div style={{ 
                            width: "100%", 
                            height: "6px", 
                            background: "#e5e7eb", 
                            borderRadius: "3px",
                            overflow: "hidden"
                          }}>
                            <div style={{ 
                              width: `${migration.progress}%`, 
                              height: "100%", 
                              background: "#3b82f6",
                              transition: "width 0.3s"
                            }} />
                          </div>
                        </div>
                      )}
                      
                      <div style={{ marginTop: "0.5rem", fontSize: "12px", color: "#6b7280" }}>
                        Created: {new Date(migration.createdAt).toLocaleDateString()}
                        {migration.completedAt && ` • Completed: ${new Date(migration.completedAt).toLocaleDateString()}`}
                        {migration.estimatedDuration && ` • Est. Duration: ${formatDuration(migration.estimatedDuration)}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
} 