"use client";
import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPut, apiDelete, apiPost } from "@/utils/api";
import { FaShieldAlt, FaLock, FaMobileAlt, FaKey, FaSignOutAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Link from 'next/link';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';
import Image from 'next/image';

interface SessionItem {
  id: string;
  ip: string | null;
  userAgent: string | null;
  lastActive: string;
  deviceName?: string;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  recoveryCodes: string[];
  activeSessions: SessionItem[];
  passwordLastChanged: string;
  suspiciousActivity: boolean;
}

export default function SecuritySettings() {
  const { user } = useUser();
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    recoveryCodes: [],
    activeSessions: [],
    passwordLastChanged: '',
    suspiciousActivity: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await apiGet<{ sessions: SessionItem[]; currentSessionId: string | null }>("/auth/sessions");
      setSettings(prev => ({ ...prev, activeSessions: res?.sessions ?? [] }));
      setCurrentSessionId(res?.currentSessionId ?? null);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setSettings(prev => ({ ...prev, activeSessions: [] }));
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSessionsLoading(true);
      try {
        const [tenantData, sessionsRes] = await Promise.all([
          apiGet<SecuritySettings>("/tenant/security").catch(() => null),
          apiGet<{ sessions: SessionItem[]; currentSessionId: string | null }>("/auth/sessions").catch(() => ({ sessions: [], currentSessionId: null })),
        ]);
        if (cancelled) return;
        if (tenantData) {
          setSettings(s => ({ ...s, ...tenantData }));
          if (tenantData.twoFactorSecret) {
            setQrCode(`data:image/svg+xml;base64,${btoa(tenantData.twoFactorSecret)}`);
          }
        }
        if (sessionsRes) {
          setSettings(prev => ({ ...prev, activeSessions: sessionsRes.sessions ?? [] }));
          setCurrentSessionId(sessionsRes.currentSessionId ?? null);
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to load security settings:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setSessionsLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);


  const handleEnable2FA = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiPut<{ secret: string; qrCode: string; recoveryCodes: string[] }>("/tenant/security/2fa/enable", {});
      setSettings(prev => ({ ...prev, twoFactorEnabled: true, recoveryCodes: response.recoveryCodes }));
      setQrCode(response.qrCode);
      setSuccess('2FA enabled! Save your recovery codes securely.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to enable 2FA");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This reduces account security.')) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut("/tenant/security/2fa/disable", {});
      setSettings(prev => ({ ...prev, twoFactorEnabled: false, recoveryCodes: [], twoFactorSecret: undefined }));
      setQrCode(null);
      setSuccess('2FA disabled.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to disable 2FA");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    if (!confirm('Logout this session?')) return;
    setError(null);
    try {
      await apiDelete(`/auth/sessions/${sessionId}`);
      setSettings(prev => ({
        ...prev,
        activeSessions: prev.activeSessions.filter(s => s.id !== sessionId),
      }));
      setSuccess('Session logged out.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to logout session");
    }
  };

  const handleLogoutAllOtherSessions = async () => {
    if (!confirm('Log out all other devices? You will stay logged in on this device.')) return;
    setError(null);
    setRevokingAll(true);
    try {
      const res = await apiPost<{ success: boolean; revoked: number }>("/auth/sessions/revoke-others", {});
      await fetchSessions();
      setSuccess(res?.revoked != null ? `Logged out ${res.revoked} other session(s).` : 'All other sessions logged out.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "Failed to logout other sessions");
    } finally {
      setRevokingAll(false);
    }
  };

  const handleChangePassword = () => {
    // Redirect to password change page or open modal
    window.location.href = '/settings/password';
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
          <p className="text-gray-600 mb-4">You don&#39;t have permission to manage security settings.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  /** Derive a short device/browser label from user agent for display. */
  const sessionDeviceLabel = (session: SessionItem) => {
    if (session.deviceName) return session.deviceName;
    const ua = session.userAgent || "";
    if (ua.includes("Electron")) return "Electron (Desktop app)";
    if (ua.includes("Edg/")) return "Microsoft Edge";
    if (ua.includes("Chrome/") && !ua.includes("Edg")) return "Google Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("axios")) return "API / Script";
    return ua.length > 40 ? ua.slice(0, 40) + "…" : ua || "Unknown device";
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh] w-full overflow-x-hidden box-border">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaShieldAlt className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">Security Settings</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>

      {success && <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 border border-green-200">{success}</div>}
      {error && <div className="mb-4 px-4 py-2 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 2FA Section */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaMobileAlt />
            Two-Factor Authentication
          </h3>
          <p className="text-gray-600 mb-4">Add an extra layer of security to your account using an authenticator app.</p>
          
          {settings.twoFactorEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium text-green-800">2FA is enabled</p>
                  <p className="text-sm text-green-700">Your account is protected with two-factor authentication.</p>
                </div>
                <FaCheckCircle className="text-green-500 w-5 h-5" />
              </div>

              {qrCode && (
  <div className="text-center">
    <p className="text-sm text-gray-600 mb-2">Scan this QR code with your authenticator app (if setting up a new device):</p>
    <Image src={qrCode} alt="2FA QR Code" width={192} height={192} className="mx-auto mb-4 w-48 h-48" />
  </div>
)}


              <div className="space-y-2">
                <button
                  onClick={() => setShowRecoveryCodes(!showRecoveryCodes)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {showRecoveryCodes ? 'Hide' : 'Show'} Recovery Codes
                </button>
                {showRecoveryCodes && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800 mb-2">Save these codes securely. Use them if you lose access to your authenticator.</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {settings.recoveryCodes.map((code, index) => (
                        <code key={index} className="bg-yellow-100 px-2 py-1 rounded text-sm font-mono block">
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={handleDisable2FA}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {saving ? "Disabling..." : "Disable 2FA"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">2FA is not enabled. We recommend enabling it for better security.</p>
              </div>
              <button
                onClick={handleEnable2FA}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {saving ? "Enabling..." : "Enable 2FA"}
              </button>
            </div>
          )}
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaLock />
            Password Management
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Last changed: {new Date(settings.passwordLastChanged).toLocaleDateString()}</p>
              {settings.suspiciousActivity && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <FaExclamationTriangle className="w-4 h-4" />
                  Suspicious activity detected - consider changing your password.
                </p>
              )}
            </div>
            <button
              onClick={handleChangePassword}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="mt-8 w-full max-w-full bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-gray-200 dark:border-slate-600 overflow-hidden box-border">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <FaKey />
          Active Sessions
        </h3>
        <p className="text-gray-600 dark:text-slate-400 mb-6">Manage your active login sessions across devices.</p>

        {sessionsLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mr-2 align-middle" />
            Loading sessions...
          </div>
        ) : settings.activeSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            No active sessions found. Sessions are created when you log in with cookies (browser).
          </div>
        ) : (
          <div className="space-y-3 overflow-hidden">
            {settings.activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 min-w-0 overflow-hidden"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-slate-100 truncate" title={session.userAgent || undefined}>
                    {sessionDeviceLabel(session)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                    {session.ip ? `IP: ${session.ip} • ` : ""}
                    Last active: {new Date(session.lastActive).toLocaleString()}
                  </p>
                  {currentSessionId === session.id && (
                    <span className="inline-block mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">This device</span>
                  )}
                </div>
                {currentSessionId !== session.id && (
                  <button
                    type="button"
                    onClick={() => handleLogoutSession(session.id)}
                    className="sm:ml-4 flex-shrink-0 w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <FaSignOutAlt className="inline mr-1" />
                    Logout
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600 flex flex-col sm:flex-row sm:flex-wrap justify-between items-stretch sm:items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-slate-400 order-2 sm:order-1">
            {settings.activeSessions.length} active session{settings.activeSessions.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={handleLogoutAllOtherSessions}
            disabled={revokingAll || settings.activeSessions.length <= 1}
            className="order-1 sm:order-2 w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex-shrink-0"
          >
            {revokingAll ? (
              <>
                <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1.5 align-middle" />
                Logging out...
              </>
            ) : (
              "Logout All Other Sessions"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
