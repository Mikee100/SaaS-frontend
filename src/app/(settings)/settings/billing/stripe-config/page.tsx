"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/utils/api";
import { FaCreditCard, FaKey, FaEye, FaEyeSlash, FaSave, FaCheck, FaTimes, FaInfoCircle } from "react-icons/fa";

interface StripeKeys {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

interface StripePriceIds {
  basicPriceId: string;
  proPriceId: string;
  enterprisePriceId: string;
}

export default function StripeConfigPage() {
  const [stripeKeys, setStripeKeys] = useState<StripeKeys>({
    secretKey: '',
    publishableKey: '',
    webhookSecret: '',
  });
  const [priceIds, setPriceIds] = useState<StripePriceIds>({
    basicPriceId: '',
    proPriceId: '',
    enterprisePriceId: '',
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  useEffect(() => {
    fetchStripeConfig();
  }, []);

  async function fetchStripeConfig() {
    try {
      setLoading(true);
      setError("");
      
      const [statusResponse, keysResponse, priceIdsResponse] = await Promise.all([
        apiGet("/tenant/configurations/stripe/status"),
        apiGet("/tenant/configurations/stripe/keys"),
        apiGet("/tenant/configurations/stripe/price-ids"),
      ]);

      setIsConfigured(statusResponse.isConfigured);
      setStripeKeys({
        secretKey: keysResponse.secretKey === '[CONFIGURED]' ? '' : (keysResponse.secretKey || ''),
        publishableKey: keysResponse.publishableKey || '',
        webhookSecret: keysResponse.webhookSecret === '[CONFIGURED]' ? '' : (keysResponse.webhookSecret || ''),
      });
      setPriceIds({
        basicPriceId: priceIdsResponse.basicPriceId || '',
        proPriceId: priceIdsResponse.proPriceId || '',
        enterprisePriceId: priceIdsResponse.enterprisePriceId || '',
      });
    } catch (err: any) {
      setError(err.message || "Failed to load Stripe configuration");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await apiPost("/tenant/configurations/stripe/configure", {
        secretKey: stripeKeys.secretKey,
        publishableKey: stripeKeys.publishableKey,
        webhookSecret: stripeKeys.webhookSecret || undefined,
        basicPriceId: priceIds.basicPriceId || undefined,
        proPriceId: priceIds.proPriceId || undefined,
        enterprisePriceId: priceIds.enterprisePriceId || undefined,
      });

      setSuccess("Stripe configuration saved successfully!");
      await fetchStripeConfig(); // Refresh status
    } catch (err: any) {
      setError(err.message || "Failed to save Stripe configuration");
    } finally {
      setSaving(false);
    }
  }

  function validateStripeKey(key: string, type: 'secret' | 'publishable'): boolean {
    if (!key) return false;
    
    if (type === 'secret') {
      return key.startsWith('sk_test_') || key.startsWith('sk_live_');
    } else {
      return key.startsWith('pk_test_') || key.startsWith('pk_live_');
    }
  }

  function validatePriceId(priceId: string): boolean {
    if (!priceId) return true; // Optional
    return priceId.startsWith('price_');
  }

  const isFormValid = () => {
    return (
      validateStripeKey(stripeKeys.secretKey, 'secret') &&
      validateStripeKey(stripeKeys.publishableKey, 'publishable') &&
      validatePriceId(priceIds.basicPriceId) &&
      validatePriceId(priceIds.proPriceId) &&
      validatePriceId(priceIds.enterprisePriceId)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Stripe Configuration</h1>
          <p className="mt-2 text-lg text-gray-500">Configure your Stripe payment processing settings.</p>
        </header>

        {/* Status Indicator */}
        <div className="mb-8">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            isConfigured 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <FaCreditCard className="h-4 w-4 mr-2" />
            {isConfigured ? 'Stripe is configured' : 'Stripe is not configured'}
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <FaCheck className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <FaTimes className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Stripe Keys */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FaKey className="h-6 w-6 text-indigo-600" />
              Stripe API Keys
            </h2>
            
            <div className="space-y-6">
              {/* Secret Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    value={stripeKeys.secretKey}
                    onChange={(e) => setStripeKeys(prev => ({ ...prev, secretKey: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      stripeKeys.secretKey && !validateStripeKey(stripeKeys.secretKey, 'secret')
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="sk_test_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showSecretKey ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                  </button>
                </div>
                {stripeKeys.secretKey && !validateStripeKey(stripeKeys.secretKey, 'secret') && (
                  <p className="mt-1 text-sm text-red-600">Invalid secret key format</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Your secret key starts with sk_test_ (test mode) or sk_live_ (live mode)
                </p>
              </div>

              {/* Publishable Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publishable Key
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={stripeKeys.publishableKey}
                  onChange={(e) => setStripeKeys(prev => ({ ...prev, publishableKey: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    stripeKeys.publishableKey && !validateStripeKey(stripeKeys.publishableKey, 'publishable')
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="pk_test_..."
                />
                {stripeKeys.publishableKey && !validateStripeKey(stripeKeys.publishableKey, 'publishable') && (
                  <p className="mt-1 text-sm text-red-600">Invalid publishable key format</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Your publishable key starts with pk_test_ (test mode) or pk_live_ (live mode)
                </p>
              </div>

              {/* Webhook Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook Secret (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? "text" : "password"}
                    value={stripeKeys.webhookSecret}
                    onChange={(e) => setStripeKeys(prev => ({ ...prev, webhookSecret: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="whsec_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showWebhookSecret ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Webhook secret starts with whsec_ (optional for enhanced security)
                </p>
              </div>
            </div>
          </div>

          {/* Price IDs */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FaCreditCard className="h-6 w-6 text-indigo-600" />
              Stripe Price IDs
            </h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Basic Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Basic Plan Price ID
                  </label>
                  <input
                    type="text"
                    value={priceIds.basicPriceId}
                    onChange={(e) => setPriceIds(prev => ({ ...prev, basicPriceId: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      priceIds.basicPriceId && !validatePriceId(priceIds.basicPriceId)
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="price_basic_monthly"
                  />
                  {priceIds.basicPriceId && !validatePriceId(priceIds.basicPriceId) && (
                    <p className="mt-1 text-sm text-red-600">Invalid price ID format</p>
                  )}
                </div>

                {/* Pro Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pro Plan Price ID
                  </label>
                  <input
                    type="text"
                    value={priceIds.proPriceId}
                    onChange={(e) => setPriceIds(prev => ({ ...prev, proPriceId: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      priceIds.proPriceId && !validatePriceId(priceIds.proPriceId)
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="price_pro_monthly"
                  />
                  {priceIds.proPriceId && !validatePriceId(priceIds.proPriceId) && (
                    <p className="mt-1 text-sm text-red-600">Invalid price ID format</p>
                  )}
                </div>

                {/* Enterprise Plan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enterprise Plan Price ID
                  </label>
                  <input
                    type="text"
                    value={priceIds.enterprisePriceId}
                    onChange={(e) => setPriceIds(prev => ({ ...prev, enterprisePriceId: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      priceIds.enterprisePriceId && !validatePriceId(priceIds.enterprisePriceId)
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="price_enterprise_monthly"
                  />
                  {priceIds.enterprisePriceId && !validatePriceId(priceIds.enterprisePriceId) && (
                    <p className="mt-1 text-sm text-red-600">Invalid price ID format</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <FaInfoCircle className="h-5 w-5" />
              How to Get Your Stripe Keys
            </h3>
            <div className="space-y-3 text-sm text-blue-800">
              <p>1. Go to your <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Stripe Dashboard</a></p>
              <p>2. Navigate to Developers → API keys</p>
              <p>3. Copy your Publishable key and Secret key</p>
              <p>4. For webhook secret, go to Developers → Webhooks and copy the signing secret</p>
              <p>5. For price IDs, go to Products and copy the price IDs for each plan</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!isFormValid() || saving}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <FaSave className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 