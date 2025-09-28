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

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const data = await apiGet<Integration[]>("/tenant/integrations");
        if (data) {
          setIntegrations(data);
        }
      } catch (err) {
        console.error('Failed to load integrations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIntegrations();
  }, []);

  const handleConnect = async (integrationId: string) => {
    try {
      const response = await apiPost<{ url: string }>(`/tenant/integrations/${integrationId}/connect`, {});
      if (response.url) {
        window.open(response.url, '_blank');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || `Failed to connect ${integrationId}`);
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

  const canManage = hasPermission(user, 'manage_integrations');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&#39;t have permission to manage integrations.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 min-h-[80vh]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FaPlug className="text-blue-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-800">API & Integrations</h2>
        </div>
        <Link href="/settings" className="text-blue-600 hover:underline text-sm">← All Settings</Link>
      </div>

      {success && <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 border border-green-200">{success}</div>}
      {error && <div className="mb-4 px-4 py-2 rounded bg-red-50 text-red-700 border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-xl shadow p-6 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  integration.status === 'connected' ? 'bg-green-500' :
                  integration.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <h3 className="text-lg font-semibold text-gray-800">{integration.name}</h3>
              </div>
              {integration.status === 'connected' && (
                <FaCheckCircle className="text-green-500 w-5 h-5" />
              )}
            </div>

            <p className="text-gray-600 mb-4">{integration.description}</p>

            {integration.lastSync && (
              <p className="text-sm text-gray-500 mb-4">Last sync: {new Date(integration.lastSync).toLocaleString()}</p>
            )}

            <div className="space-y-3">
              {integration.id === 'stripe' || integration.id === 'mpesa' ? (
                <button
                  onClick={() => handleConnect(integration.id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleSaveApiKey(integration.id, (document.querySelector(`input[placeholder*="API Key"]`) as HTMLInputElement)?.value || '')}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Save API Key
                  </button>
                </div>
              )}

              {integration.status === 'connected' && (
                <button
                  onClick={() => handleTestConnection(integration.id)}
                  disabled={testing === integration.id}
                  className="w-full px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-60"
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

              <a
                href={`https://docs.example.com/integrations/${integration.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <FaExternalLinkAlt />
                View Documentation
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* API Keys Section */}
      <div className="mt-8 bg-white rounded-xl shadow p-6 border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Your API Keys</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Public API Key</h4>
              <p className="text-sm text-gray-600">Use this key for frontend integrations</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded text-sm">pk_live_...</code>
              <button className="text-blue-600 hover:text-blue-800">Copy</button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium">Secret API Key</h4>
              <p className="text-sm text-gray-600">Keep this key secure - never share it</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-white px-2 py-1 rounded text-sm">sk_live_...</code>
              <button className="text-blue-600 hover:text-blue-800">Copy</button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Regenerate Keys
          </button>
        </div>
      </div>
    </div>
  );
}
