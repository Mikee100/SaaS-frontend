"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import { apiGet, apiPut } from '@/utils/api';
import { useUser } from '@/components/UserContext';

const POS_DISPLAY_NAME_KEY = 'POS_DISPLAY_NAME';

type TenantResponse = {
  name?: string;
};

type TenantConfig = {
  key: string;
  value?: string | null;
};

export default function PosDisplayNameSettingsPage() {
  const { user } = useUser();
  const [tenantName, setTenantName] = useState('');
  const [posDisplayName, setPosDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const hasAccess =
    !!user &&
    (user.isSuperadmin ||
      user.roles?.includes('owner') ||
      user.roles?.includes('admin') ||
      user.permissions?.includes('view_settings'));

  const canEdit =
    !!user &&
    (user.isSuperadmin ||
      user.roles?.includes('owner') ||
      user.roles?.includes('admin') ||
      user.permissions?.includes('edit_settings'));

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [tenant, config] = await Promise.all([
          apiGet<TenantResponse>('/tenant/me'),
          apiGet<TenantConfig>(`/tenant/configurations/${POS_DISPLAY_NAME_KEY}`).catch(() => null),
        ]);

        setTenantName((tenant?.name || '').trim());
        if (config) {
          setPosDisplayName((config.value || '').trim());
        }
      } catch {
        setError('Failed to load POS display name settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hasAccess]);

  const handleSave = async () => {
    if (!canEdit) return;

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const normalizedValue = posDisplayName.trim();
      await apiPut(`/tenant/configurations/${POS_DISPLAY_NAME_KEY}`, {
        value: normalizedValue,
        category: 'general',
        isEncrypted: false,
        description: 'Display name shown in POS header',
      });

      setMessage('POS display name saved. Leave blank to use your business name by default.');
    } catch {
      setError('Failed to save POS display name.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  if (!hasAccess) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Access Denied</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">POS Display Name</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Control the name shown on POS headers and restaurant screens.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <FaArrowLeft className="h-3 w-3" />
          Back to Settings
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Loading...
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-slate-100">
              POS Display Name
            </label>
            <input
              type="text"
              value={posDisplayName}
              onChange={(e) => setPosDisplayName(e.target.value)}
              disabled={!canEdit}
              placeholder={tenantName || 'Business name'}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              maxLength={120}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              If left blank, POS will display your business name: <span className="font-semibold">{tenantName || 'Business'}</span>.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="pt-1">
            <button
              onClick={handleSave}
              disabled={!canEdit || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave className="h-3 w-3" />
              {saving ? 'Saving...' : 'Save POS Display Name'}
            </button>
          </div>

          {!canEdit && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              You can view this setting, but you need edit settings permission to make changes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
