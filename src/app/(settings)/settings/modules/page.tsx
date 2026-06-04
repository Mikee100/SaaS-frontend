"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPut } from '@/utils/api';
import { useUser } from '@/components/UserContext';
import { AppModuleKey, normalizeEnabledModules } from '@/utils/moduleAccess';

interface ModuleConfigResponse {
  key: string;
  enabledModules: AppModuleKey[];
  availableModules: AppModuleKey[];
  defaultEnabledModules: AppModuleKey[];
}

const labels: Record<AppModuleKey, string> = {
  dashboard: 'Dashboard',
  payroll: 'Payroll',
  sales: 'Sales',
  credits: 'Credits',
  inventory: 'Inventory',
  accounts: 'Accounts',
  analytics: 'Analytics',
  reports: 'Reports',
  expenses: 'Expenses',
  crm: 'CRM',
  ai: 'AI Assistant',
  settings: 'Settings',
  billing: 'Billing',
};

export default function ModuleSettingsPage() {
  const { user, refreshUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableModules, setAvailableModules] = useState<AppModuleKey[]>([]);
  const [enabledModules, setEnabledModules] = useState<AppModuleKey[]>([]);

  const isAllowed =
    !!user &&
    (user.isSuperadmin ||
      user.roles?.includes('owner') ||
      user.roles?.includes('admin') ||
      user.permissions?.includes('edit_settings'));
  const canEditModules = !!user?.isSuperadmin;

  const sortedModules = useMemo(
    () => [...availableModules].sort((a, b) => labels[a].localeCompare(labels[b])),
    [availableModules],
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiGet<ModuleConfigResponse>('/tenant/configurations/modules');
        setAvailableModules(normalizeEnabledModules(response?.availableModules || []));
        setEnabledModules(normalizeEnabledModules(response?.enabledModules || []));
      } catch (e) {
        setError((e as { message?: string })?.message || 'Failed to load module settings');
      } finally {
        setLoading(false);
      }
    };

    if (isAllowed) {
      load();
    } else {
      setLoading(false);
    }
  }, [isAllowed]);

  const toggleModule = (module: AppModuleKey) => {
    setEnabledModules((prev) =>
      prev.includes(module) ? prev.filter((item) => item !== module) : [...prev, module],
    );
  };

  const handleSave = async () => {
    if (!canEditModules) {
      setError('Only the platform administrator can change tenant module entitlements.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const normalized = normalizeEnabledModules(enabledModules);
      await apiPut('/tenant/configurations/modules', { enabledModules: normalized });
      await refreshUser();
      setSuccess('Module entitlements updated. Navigation and access rules are now applied.');
    } catch (e) {
      setError((e as { message?: string })?.message || 'Failed to save module settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold text-gray-900">Module Settings</h1>
        <p className="mt-2 text-sm text-gray-600">You do not have permission to manage modules.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Module Settings</h1>
      <p className="mt-1 text-sm text-gray-600">
        Modules enabled for this tenant. Disabled modules are hidden in UI and blocked in backend.
      </p>
      {!canEditModules && (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Module entitlements are controlled by the platform administrator.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="mt-6 text-sm text-gray-600">Loading modules...</div>
      ) : (
        <div className="mt-6 space-y-3">
          {sortedModules.map((module) => {
            const checked = enabledModules.includes(module);
            return (
              <label
                key={module}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">{labels[module]}</div>
                  <div className="text-xs text-gray-500">Key: {module}</div>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleModule(module)}
                  disabled={!canEditModules}
                  className="h-4 w-4"
                />
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading || !canEditModules}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Modules'}
        </button>
      </div>
    </div>
  );
}
