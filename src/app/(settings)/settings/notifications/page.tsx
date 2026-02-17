"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPut } from "@/utils/api";
import { FaBell, FaEnvelope, FaMobileAlt, FaExclamationTriangle } from 'react-icons/fa';
import Link from 'next/link';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface NotificationPrefs {
  emailAlerts: boolean;
  smsAlerts: boolean;
  inApp: boolean;
  emailTypes: {
    sales: boolean;
    inventory: boolean;
    billing: boolean;
    security: boolean;
  };
  smsTypes: {
    lowStock: boolean;
    paymentReceived: boolean;
  };
}

const defaultPrefs: NotificationPrefs = {
  emailAlerts: true,
  smsAlerts: false,
  inApp: true,
  emailTypes: { sales: true, inventory: true, billing: true, security: true },
  smsTypes: { lowStock: true, paymentReceived: true },
};

function mergePrefs(data: unknown): NotificationPrefs {
  if (!data || typeof data !== 'object') return defaultPrefs;
  const o = data as Record<string, unknown>;
  const et = (o.emailTypes as Record<string, boolean>) || {};
  const st = (o.smsTypes as Record<string, boolean>) || {};
  return {
    emailAlerts: typeof o.emailAlerts === 'boolean' ? o.emailAlerts : defaultPrefs.emailAlerts,
    smsAlerts: typeof o.smsAlerts === 'boolean' ? o.smsAlerts : defaultPrefs.smsAlerts,
    inApp: typeof o.inApp === 'boolean' ? o.inApp : defaultPrefs.inApp,
    emailTypes: {
      sales: typeof et.sales === 'boolean' ? et.sales : defaultPrefs.emailTypes.sales,
      inventory: typeof et.inventory === 'boolean' ? et.inventory : defaultPrefs.emailTypes.inventory,
      billing: typeof et.billing === 'boolean' ? et.billing : defaultPrefs.emailTypes.billing,
      security: typeof et.security === 'boolean' ? et.security : defaultPrefs.emailTypes.security,
    },
    smsTypes: {
      lowStock: typeof st.lowStock === 'boolean' ? st.lowStock : defaultPrefs.smsTypes.lowStock,
      paymentReceived: typeof st.paymentReceived === 'boolean' ? st.paymentReceived : defaultPrefs.smsTypes.paymentReceived,
    },
  };
}

export default function NotificationsSettings() {
  const { user } = useUser();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchPrefs = async () => {
      try {
        const data = await apiGet<unknown>("/tenant/notifications");
        if (!cancelled) setPrefs(mergePrefs(data));
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load notification preferences:', err);
          setError('Failed to load notification preferences.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPrefs();
    return () => { cancelled = true; };
  }, []);



  const handleToggle = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs({ ...prefs, [key]: value });
  };

  const handleEmailTypeToggle = (type: keyof NotificationPrefs['emailTypes'], value: boolean) => {
    setPrefs({
      ...prefs,
      emailTypes: { ...prefs.emailTypes, [type]: value },
    });
  };

  const handleSmsTypeToggle = (type: keyof NotificationPrefs['smsTypes'], value: boolean) => {
    setPrefs({
      ...prefs,
      smsTypes: { ...prefs.smsTypes, [type]: value },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPut("/tenant/notifications", prefs);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to save notification preferences");
    } finally {
      setSaving(false);
    }
  };

  const canEdit = hasPermission(user, 'edit_settings');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don&apos;t have permission to edit notification settings.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaBell className="text-blue-600 dark:text-blue-400 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Notification Preferences</h2>
        </div>
        <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">← All Settings</Link>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
          Preferences saved!
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-10 border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main Channels */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">Notification Channels</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <input
                  type="checkbox"
                  id="emailAlerts"
                  checked={prefs.emailAlerts}
                  onChange={(e) => handleToggle('emailAlerts', e.target.checked)}
                  className="rounded accent-blue-600"
                />
                <label htmlFor="emailAlerts" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">Email Alerts</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via email</p>
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <input
                  type="checkbox"
                  id="smsAlerts"
                  checked={prefs.smsAlerts}
                  onChange={(e) => handleToggle('smsAlerts', e.target.checked)}
                  className="rounded accent-blue-600"
                />
                <label htmlFor="smsAlerts" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FaMobileAlt className="text-green-600 dark:text-green-400" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">SMS Alerts</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receive SMS notifications (Pro+ plan required)</p>
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <input
                  type="checkbox"
                  id="inApp"
                  checked={prefs.inApp}
                  onChange={(e) => handleToggle('inApp', e.target.checked)}
                  className="rounded accent-blue-600"
                />
                <label htmlFor="inApp" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FaBell className="text-purple-600 dark:text-purple-400" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">In-App Notifications</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">See notifications in the dashboard</p>
                </label>
              </div>
            </div>
          </div>

          {/* Email Types */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">Email Notification Types</h3>
            <div className="space-y-3">
              {Object.entries(prefs.emailTypes).map(([type, enabled]) => (
                <div key={type} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <input
                    type="checkbox"
                    id={`email-${type}`}
                    checked={enabled}
                    onChange={(e) => handleEmailTypeToggle(type as keyof NotificationPrefs['emailTypes'], e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <label htmlFor={`email-${type}`} className="flex-1 cursor-pointer">
                    <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{type.replace('_', ' ')}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SMS Types - Only if SMS enabled */}
        {prefs.smsAlerts && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">SMS Notification Types</h3>
            <div className="space-y-3">
              {Object.entries(prefs.smsTypes).map(([type, enabled]) => (
                <div key={type} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <input
                    type="checkbox"
                    id={`sms-${type}`}
                    checked={enabled}
                    onChange={(e) => handleSmsTypeToggle(type as keyof NotificationPrefs['smsTypes'], e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <label htmlFor={`sms-${type}`} className="flex-1 cursor-pointer">
                    <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{type.replace('_', ' ')}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 rounded-lg border border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 text-white font-semibold text-base shadow hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
