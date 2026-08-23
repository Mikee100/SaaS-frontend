import React from "react";
import type { TenantUserSummary } from "../types";

interface PasswordResetTabProps {
  users: TenantUserSummary[];
  loadingUsers: boolean;
  loadError?: string | null;
  tenantContactEmail?: string;
  selectedUserId: string;
  setSelectedUserId: (value: string) => void;
  resettingPassword: boolean;
  temporaryPassword: string;
  resetTemporaryPassword: () => void;
  resetByContactEmail: () => void;
  onCreateUser: () => void;
}

export default function PasswordResetTab({
  users,
  loadingUsers,
  loadError,
  tenantContactEmail,
  selectedUserId,
  setSelectedUserId,
  resettingPassword,
  temporaryPassword,
  resetTemporaryPassword,
  resetByContactEmail,
  onCreateUser,
}: PasswordResetTabProps) {
  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  const hasUsers = users.length > 0;

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Reset Tenant User Password</h3>
        <p className="mt-1 text-xs text-gray-600">
          Select a tenant user and reset to the default password: <span className="font-mono">password123@</span>.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Tenant User</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={loadingUsers || resettingPassword || !hasUsers}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">{loadingUsers ? "Loading users..." : "Select user"}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}){u.isDisabled ? " [disabled]" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
          <p className="font-medium text-gray-900">Selected User</p>
          {selectedUser ? (
            <div className="mt-1 space-y-0.5">
              <p>{selectedUser.name}</p>
              <p>{selectedUser.email}</p>
            </div>
          ) : (
            <p className="mt-1 text-gray-500">No user selected.</p>
          )}
        </div>
      </div>

      {!loadingUsers && !hasUsers ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">No users found for this tenant.</p>
          <p className="mt-1 text-xs text-amber-800">
            Create a tenant user first, then reset their password here.
          </p>
          <button
            type="button"
            onClick={onCreateUser}
            className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Create Tenant User
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={resetTemporaryPassword}
          disabled={!selectedUserId || loadingUsers || resettingPassword || !hasUsers}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resettingPassword ? "Resetting..." : "Reset To Default Password"}
        </button>
        <button
          type="button"
          onClick={resetByContactEmail}
          disabled={!tenantContactEmail || resettingPassword}
          className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset Contact Password
        </button>
      </div>

      {temporaryPassword ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">Default Password</p>
          <p className="mt-1 font-mono text-sm text-amber-950">{temporaryPassword}</p>
          <p className="mt-1 text-xs text-amber-800">
            Share this securely with the user. They can log in and change it from their profile.
          </p>
        </div>
      ) : null}
    </div>
  );
}
