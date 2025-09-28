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

export default function NotificationsSettings() {
  const { user } = useUser();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    emailAlerts: true,
    smsAlerts: false,
    inApp: true,
    emailTypes: {
      sales: true,
      inventory: true,
      billing: true,
      security: true,
    },
    smsTypes: {
      lowStock: true,
      paymentReceived: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);


useEffect(() => {
  const fetchPrefs = async () => {
    try {
      const data = await apiGet<NotificationPrefs>("/tenant/notifications");
      setPrefs(prev => data || prev); // functional update
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  };
  fetchPrefs();
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
         <p className="text-gray-600 mb-4">You don&#39;t have permission to edit notification settings.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaBell className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Notification Preferences</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>

      {success && <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 border border-green-200">Preferences saved!</div>}
      {error && <div className="mb-4 px-4 py-2 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}

      <div className="bg-white rounded-xl shadow p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main Channels */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Notification Channels</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  id="emailAlerts"
                  checked={prefs.emailAlerts}
                  onChange={(e) => handleToggle('emailAlerts', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="emailAlerts" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-blue-600" />
                    <span className="font-medium">Email Alerts</span>
                  </div>
                  <p className="text-sm text-gray-600">Receive notifications via email</p>
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  id="smsAlerts"
                  checked={prefs.smsAlerts}
                  onChange={(e) => handleToggle('smsAlerts', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="smsAlerts" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FaMobileAlt className="text-green-600" />
                    <span className="font-medium">SMS Alerts</span>
                  </div>
                  <p className="text-sm text-gray-600">Receive SMS notifications (Pro+ plan required)</p>
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  id="inApp"
                  checked={prefs.inApp}
                  onChange={(e) => handleToggle('inApp', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="inApp" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <FaBell className="text-purple-600" />
                    <span className="font-medium">In-App Notifications</span>
                  </div>
                  <p className="text-sm text-gray-600">See notifications in the dashboard</p>
                </label>
              </div>
            </div>
          </div>

          {/* Email Types */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Email Notification Types</h3>
            <div className="space-y-3">
              {Object.entries(prefs.emailTypes).map(([type, enabled]) => (
                <div key={type} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id={`email-${type}`}
                    checked={enabled}
                    onChange={(e) => handleEmailTypeToggle(type as keyof NotificationPrefs['emailTypes'], e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor={`email-${type}`} className="flex-1 cursor-pointer">
                    <span className="font-medium capitalize">{type.replace('_', ' ')}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SMS Types - Only if SMS enabled */}
        {prefs.smsAlerts && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">SMS Notification Types</h3>
            <div className="space-y-3">
              {Object.entries(prefs.smsTypes).map(([type, enabled]) => (
                <div key={type} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id={`sms-${type}`}
                    checked={enabled}
                    onChange={(e) => handleSmsTypeToggle(type as keyof NotificationPrefs['smsTypes'], e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor={`sms-${type}`} className="flex-1 cursor-pointer">
                    <span className="font-medium capitalize">{type.replace('_', ' ')}</span>
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
            className="px-8 py-2 rounded-lg border border-blue-200 bg-blue-600 text-white font-semibold text-base shadow hover:bg-blue-700 transition disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
