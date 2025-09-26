'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/utils/api';
import {
  FaChevronLeft,
  FaSave,
  FaCreditCard,
  FaExchangeAlt,
  FaMoneyBillWave
} from 'react-icons/fa';

interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  isLiveMode: boolean;
}

interface BillingSettings {
  currency: string;
  taxEnabled: boolean;
  taxRate: number;
  invoicePrefix: string;
  daysUntilDue: number;
  stripe: StripeConfig;
}

export default function BillingSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [settings, setSettings] = useState<BillingSettings>({
    currency: 'USD',
    taxEnabled: false,
    taxRate: 0,
    invoicePrefix: 'INV',
    daysUntilDue: 30,
    stripe: {
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      isLiveMode: false
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiGet<BillingSettings>('/admin/billing/settings');
      
      // Validate the response data matches our expected type
      if (data && typeof data === 'object') {
        setSettings(data as BillingSettings);
      } else {
        throw new Error('Invalid billing settings format received from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate required fields
      if (!settings.stripe.publishableKey || !settings.stripe.secretKey) {
        throw new Error('Stripe publishable key and secret key are required');
      }

      await apiPost('/admin/billing/settings', settings);
      setSuccess('Billing settings saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStripeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setSettings(prev => ({
      ...prev,
      stripe: {
        ...prev.stripe,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const testStripeConnection = async () => {
    try {
      setLoading(true);
      setError('');
      await apiPost('/admin/billing/test-connection', settings.stripe);
      setSuccess('Successfully connected to Stripe!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Stripe');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <FaChevronLeft className="mr-1" /> Back to Billing
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Billing Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your billing and payment provider settings
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              <FaCreditCard className="inline-block mr-2 text-blue-500" />
              Payment Provider
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure your payment provider settings
            </p>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <label htmlFor="stripe-mode" className="block text-sm font-medium text-gray-700">
                  Stripe Mode
                </label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">
                    {settings.stripe.isLiveMode ? 'Live Mode' : 'Test Mode'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      stripe: {
                        ...prev.stripe,
                        isLiveMode: !prev.stripe.isLiveMode
                      }
                    }))}
                    className={`${
                      settings.stripe.isLiveMode ? 'bg-green-500' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span
                      className={`${
                        settings.stripe.isLiveMode ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {settings.stripe.isLiveMode
                  ? 'Live mode is active. All transactions will be processed as real payments.'
                  : 'Test mode is active. No real transactions will be processed.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="publishableKey" className="block text-sm font-medium text-gray-700">
                  Publishable Key
                </label>
                <input
                  type="password"
                  name="publishableKey"
                  id="publishableKey"
                  value={settings.stripe.publishableKey}
                  onChange={handleStripeInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="pk_test_..."
                />
              </div>

              <div>
                <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
                  Secret Key
                </label>
                <input
                  type="password"
                  name="secretKey"
                  id="secretKey"
                  value={settings.stripe.secretKey}
                  onChange={handleStripeInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="sk_test_..."
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="webhookSecret" className="block text-sm font-medium text-gray-700">
                  Webhook Secret
                </label>
                <input
                  type="password"
                  name="webhookSecret"
                  id="webhookSecret"
                  value={settings.stripe.webhookSecret}
                  onChange={handleStripeInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="whsec_..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  The webhook secret is used to verify webhook events from Stripe.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={testStripeConnection}
                disabled={loading || saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <FaExchangeAlt className="-ml-1 mr-2 h-4 w-4" />
                {loading ? 'Testing Connection...' : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              <FaMoneyBillWave className="inline-block mr-2 text-green-500" />
              Billing Settings
            </h3>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Default Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={settings.currency}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>

              <div>
                <label htmlFor="invoicePrefix" className="block text-sm font-medium text-gray-700">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  name="invoicePrefix"
                  id="invoicePrefix"
                  value={settings.invoicePrefix}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="INV"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Prefix for invoice numbers (e.g., INV-1234)
                </p>
              </div>

              <div>
                <label htmlFor="daysUntilDue" className="block text-sm font-medium text-gray-700">
                  Days Until Due
                </label>
                <input
                  type="number"
                  name="daysUntilDue"
                  id="daysUntilDue"
                  min="1"
                  max="365"
                  value={settings.daysUntilDue}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of days until an invoice is marked as due
                </p>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="taxEnabled"
                    name="taxEnabled"
                    type="checkbox"
                    checked={settings.taxEnabled}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="taxEnabled" className="font-medium text-gray-700">
                    Enable Taxes
                  </label>
                  <p className="text-gray-500">
                    Add taxes to invoices based on the tax rate below
                  </p>
                </div>
              </div>

              {settings.taxEnabled && (
                <div>
                  <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">
                    Tax Rate (%)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <input
                      type="number"
                      name="taxRate"
                      id="taxRate"
                      min="0"
                      max="100"
                      step="0.01"
                      value={settings.taxRate}
                      onChange={handleInputChange}
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm" id="tax-rate-percentage">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <FaSave className="-ml-1 mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
