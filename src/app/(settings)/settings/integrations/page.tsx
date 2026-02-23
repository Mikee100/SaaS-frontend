"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/utils/api";
import { FaPlug, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaExternalLinkAlt } from 'react-icons/fa';
import Link from 'next/link';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  apiKey?: string;
  webhookUrl?: string;
}

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passkey: string;
  callbackUrl: string;
  environment: string;
  isActive: boolean;
}

export default function IntegrationsSettings() {
  const { user } = useUser();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Payment processing and billing',
      status: 'disconnected',
    },
    {
      id: 'mpesa',
      name: 'M-Pesa',
      description: 'Mobile money payments for Kenya',
      status: 'disconnected',
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Accounting and financial management',
      status: 'disconnected',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Team communication and notifications',
      status: 'disconnected',
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mpesaForm, setMpesaForm] = useState({
    mpesaConsumerKey: '',
    mpesaConsumerSecret: '',
    mpesaShortCode: '',
    mpesaPasskey: '',
    mpesaCallbackUrl: '',
    mpesaIsActive: false,
    mpesaEnvironment: 'sandbox',
  });
  const [savingMpesa, setSavingMpesa] = useState(false);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const data = await apiGet<Integration[]>("/tenant/integrations");
        if (Array.isArray(data) && data.length) {
          setIntegrations(data);
        }
      } catch (err) {
        console.error('Failed to load integrations:', err);
      }
    };

    const fetchMpesaConfig = async () => {
      try {
        if (!user?.tenantId) return;
        const config = await apiGet<MpesaConfig>(`/mpesa/config?tenantId=${encodeURIComponent(user.tenantId)}`);
        if (config) {
          setMpesaForm({
            mpesaConsumerKey: config.consumerKey || '',
            mpesaConsumerSecret: config.consumerSecret || '',
            mpesaShortCode: config.shortCode || '',
            mpesaPasskey: config.passkey || '',
            mpesaCallbackUrl: config.callbackUrl || '',
            mpesaIsActive: config.isActive || false,
            mpesaEnvironment: config.environment || 'sandbox',
          });
          // Update M-Pesa integration status
          setIntegrations(prev => prev.map(int =>
            int.id === 'mpesa' ? { ...int, status: config.isActive ? 'connected' : 'disconnected' } : int
          ));
        }
      } catch (err) {
        console.error('Failed to load M-Pesa config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
    fetchMpesaConfig();
  }, [user?.tenantId]);

  const handleConnect = async (integrationId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await apiPost<{ url: string | null }>(`/tenant/integrations/${integrationId}/connect`, {});
      if (response?.url) {
        if (response.url.startsWith('/')) {
          window.location.href = response.url;
        } else {
          window.open(response.url, '_blank');
        }
      } else {
        setError(`Connect not available for ${integrationId}.`);
      }
    } catch (err: unknown) {
      const errMsg = err as { message?: string };
      setError(errMsg.message || `Failed to connect ${integrationId}`);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    setTesting(integrationId);
    setError(null);
    setSuccess(null);
    try {
      await apiPost(`/tenant/integrations/${integrationId}/test`, {});
      setSuccess(`${integrationId} connection is working!`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || `Failed to test ${integrationId} connection`);
    } finally {
      setTesting(null);
    }
  };

  const handleSaveApiKey = async (integrationId: string, apiKey: string) => {
    try {
      await apiPut(`/tenant/integrations/${integrationId}`, { apiKey });
      setIntegrations(integrations.map(int =>
        int.id === integrationId ? { ...int, apiKey, status: 'connected' as const } : int
      ));
      setSuccess(`${integrationId} API key saved!`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || `Failed to save ${integrationId} API key`);
    }
  };

  const handleSaveMpesaConfig = async () => {
    setSavingMpesa(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost('/mpesa/config', { ...mpesaForm, tenantId: user?.tenantId });
      setSuccess('M-Pesa configuration saved successfully!');
      setTimeout(() => setSuccess(null), 4000);
      // Update integration status
      setIntegrations(prev => prev.map(int =>
        int.id === 'mpesa' ? { ...int, status: mpesaForm.mpesaIsActive ? 'connected' : 'disconnected' } : int
      ));
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to save M-Pesa configuration');
    } finally {
      setSavingMpesa(false);
    }
  };

  const handleTestMpesaConnection = async () => {
    setTesting('mpesa');
    setError(null);
    setSuccess(null);
    try {
      // For now, simulate test by calling initiate with a small amount (0.01)
      // In production, backend should have a dedicated test endpoint
      await apiPost('/mpesa/initiate', {
        phoneNumber: '254712345678', // Test phone
        amount: 0.01,
        reference: 'TEST_CONNECTION',
        transactionDesc: 'Connection Test',
        tenantId: user?.tenantId,
      });
      setSuccess('M-Pesa connection test successful!');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'M-Pesa connection test failed');
    } finally {
      setTesting(null);
    }
  };

  const canManage = hasPermission(user, 'manage_integrations');
  const canEditMpesa = user?.isSuperadmin === true;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You don&apos;t have permission to manage integrations.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaPlug className="text-blue-600 dark:text-blue-400 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">API & Integrations</h2>
        </div>
        <Link href="/settings" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">← All Settings</Link>
      </div>

      {success && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white dark:bg-gray-800/80 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  integration.status === 'connected' ? 'bg-green-500' :
                  integration.status === 'error' ? 'bg-red-500' : 'bg-gray-400 dark:bg-gray-500'
                }`} />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{integration.name}</h3>
              </div>
              {integration.status === 'connected' && (
                <FaCheckCircle className="text-green-500 dark:text-green-400 w-5 h-5" />
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">{integration.description}</p>

            {integration.lastSync && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Last sync: {new Date(integration.lastSync).toLocaleString()}</p>
            )}

            <div className="space-y-3">
              {integration.id === 'mpesa' ? (
                <div className="space-y-3">
                  {!canEditMpesa && (
                    <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                      Only an administrator can add or edit M-Pesa. Go to <strong>Superadmin → Tenants → this tenant → Integrations</strong> to configure.
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="text"
                      placeholder="Consumer Key"
                      value={mpesaForm.mpesaConsumerKey}
                      onChange={(e) => canEditMpesa && setMpesaForm(prev => ({ ...prev, mpesaConsumerKey: e.target.value }))}
                      readOnly={!canEditMpesa}
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent ${!canEditMpesa ? 'border-gray-200 dark:border-gray-600 opacity-90 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    <input
                      type="password"
                      placeholder="Consumer Secret"
                      value={mpesaForm.mpesaConsumerSecret}
                      onChange={(e) => canEditMpesa && setMpesaForm(prev => ({ ...prev, mpesaConsumerSecret: e.target.value }))}
                      readOnly={!canEditMpesa}
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent ${!canEditMpesa ? 'border-gray-200 dark:border-gray-600 opacity-90 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    <input
                      type="text"
                      placeholder="Short Code"
                      value={mpesaForm.mpesaShortCode}
                      onChange={(e) => canEditMpesa && setMpesaForm(prev => ({ ...prev, mpesaShortCode: e.target.value }))}
                      readOnly={!canEditMpesa}
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent ${!canEditMpesa ? 'border-gray-200 dark:border-gray-600 opacity-90 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    <input
                      type="password"
                      placeholder="Passkey"
                      value={mpesaForm.mpesaPasskey}
                      onChange={(e) => canEditMpesa && setMpesaForm(prev => ({ ...prev, mpesaPasskey: e.target.value }))}
                      readOnly={!canEditMpesa}
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent ${!canEditMpesa ? 'border-gray-200 dark:border-gray-600 opacity-90 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    <textarea
                      placeholder="Callback URL"
                      value={mpesaForm.mpesaCallbackUrl}
                      onChange={(e) => canEditMpesa && setMpesaForm(prev => ({ ...prev, mpesaCallbackUrl: e.target.value }))}
                      readOnly={!canEditMpesa}
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent ${!canEditMpesa ? 'border-gray-200 dark:border-gray-600 opacity-90 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
                      rows={2}
                    />
                    <select
                      value={mpesaForm.mpesaEnvironment}
                      onChange={(e) => canEditMpesa && setMpesaForm(prev => ({ ...prev, mpesaEnvironment: e.target.value }))}
                      disabled={!canEditMpesa}
                      className={`w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent ${!canEditMpesa ? 'border-gray-200 dark:border-gray-600 opacity-90 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600'}`}
                    >
                      <option value="sandbox">Sandbox</option>
                      <option value="production">Production</option>
                    </select>
                    <label className={`flex items-center gap-2 ${!canEditMpesa ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={mpesaForm.mpesaIsActive}
                        onChange={(e) => canEditMpesa && setMpesaForm(prev => ({ ...prev, mpesaIsActive: e.target.checked }))}
                        disabled={!canEditMpesa}
                        className="rounded accent-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Enable M-Pesa Integration</span>
                    </label>
                  </div>
                  {canEditMpesa && (
                    <button
                      onClick={handleSaveMpesaConfig}
                      disabled={savingMpesa}
                      className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-60"
                    >
                      {savingMpesa ? (
                        <>
                          <FaSpinner className="inline mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Configuration'
                      )}
                    </button>
                  )}
                </div>
              ) : integration.id === 'stripe' ? (
                <button
                  onClick={() => handleConnect(integration.id)}
                  className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                >
                  {integration.status === 'connected' ? 'Reconnect' : 'Connect'} {integration.name}
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder={`Enter ${integration.name} API Key`}
                    defaultValue={integration.apiKey || ''}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== integration.apiKey) {
                        handleSaveApiKey(integration.id, e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleSaveApiKey(integration.id, (document.querySelector(`input[placeholder*="API Key"]`) as HTMLInputElement)?.value || '')}
                    className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                  >
                    Save API Key
                  </button>
                </div>
              )}

              {integration.status === 'connected' && integration.id !== 'mpesa' && (
                <button
                  onClick={() => handleTestConnection(integration.id)}
                  disabled={testing === integration.id}
                  className="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-60"
                >
                  {testing === integration.id ? (
                    <>
                      <FaSpinner className="inline mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>
              )}

              {integration.id === 'mpesa' && integration.status === 'connected' && canEditMpesa && (
                <button
                  onClick={handleTestMpesaConnection}
                  disabled={testing === 'mpesa'}
                  className="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-60"
                >
                  {testing === 'mpesa' ? (
                    <>
                      <FaSpinner className="inline mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>
              )}

              <a
                href={`https://docs.example.com/integrations/${integration.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <FaExternalLinkAlt />
                View Documentation
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* API Keys Section */}
      <div className="mt-8 bg-white dark:bg-gray-800/80 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Your API Keys</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200">Public API Key</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Use this key for frontend integrations</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm text-gray-800 dark:text-gray-200">pk_live_...</code>
              <button type="button" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Copy</button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200">Secret API Key</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Keep this key secure — never share it</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded text-sm text-gray-800 dark:text-gray-200">sk_live_...</code>
              <button type="button" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">Copy</button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button type="button" className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors">
            Regenerate Keys
          </button>
        </div>
      </div>
    </div>
  );
}
