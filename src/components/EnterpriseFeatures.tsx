"use client";
import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut } from '@/utils/api';
import { FaCrown, FaPalette, FaCode, FaShieldAlt, FaHeadset, FaDownload, FaUpload, FaKey, FaGlobe, FaLock, FaHistory, FaCloud, FaPlug } from 'react-icons/fa';

interface EnterpriseFeatures {
  customBranding: {
    enabled: boolean;
    features: string[];
  };
  apiAccess: {
    enabled: boolean;
    features: string[];
  };
  security: {
    enabled: boolean;
    features: string[];
  };
  support: {
    enabled: boolean;
    features: string[];
  };
}

interface BrandingSettings {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customDomain?: string;
  whiteLabel?: boolean;
}

interface ApiSettings {
  apiKey?: string;
  webhookUrl?: string;
  rateLimit?: number;
  customIntegrations?: boolean;
}

export default function EnterpriseFeatures() {
  const [features, setFeatures] = useState<EnterpriseFeatures | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({});
  const [apiSettings, setApiSettings] = useState<ApiSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'branding' | 'api' | 'security' | 'support'>('branding');

  useEffect(() => {
    fetchEnterpriseFeatures();
  }, []);

  const fetchEnterpriseFeatures = async () => {
    try {
      setLoading(true);
      const [featuresData, brandingData, apiData] = await Promise.all([
        apiGet('/billing/enterprise-features') as Promise<EnterpriseFeatures>,
        apiGet('/tenant/branding') as Promise<BrandingSettings>,
        apiGet('/tenant/api-settings') as Promise<ApiSettings>,
      ]);
      
      setFeatures(featuresData);
      setBrandingSettings(brandingData);
      setApiSettings(apiData);
    } catch (error) {
      console.error('Error fetching enterprise features:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandingSave = async () => {
    try {
      setSaving(true);
      await apiPut('/tenant/branding', brandingSettings);
      alert('Branding settings saved successfully!');
    } catch (error) {
      console.error('Error saving branding settings:', error);
      alert('Failed to save branding settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleApiSave = async () => {
    try {
      setSaving(true);
      await apiPut('/tenant/api-settings', apiSettings);
      alert('API settings saved successfully!');
    } catch (error) {
      console.error('Error saving API settings:', error);
      alert('Failed to save API settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!features) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <FaCrown className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Enterprise Features Not Available</h3>
        <p className="text-yellow-700 mb-4">
          Enterprise features are only available on the Enterprise plan.
        </p>
        <a
          href="/settings/billing"
          className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Upgrade to Enterprise
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <FaCrown className="w-6 h-6 text-yellow-600" />
          <h2 className="text-xl font-semibold text-gray-800">Enterprise Features</h2>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            Enterprise
          </span>
        </div>
        <p className="text-gray-600">
          Configure advanced enterprise features including custom branding, API access, security, and support.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('branding')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'branding'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaPalette className="w-4 h-4 inline mr-2" />
            Custom Branding
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'api'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaCode className="w-4 h-4 inline mr-2" />
            API Access
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaShieldAlt className="w-4 h-4 inline mr-2" />
            Security
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'support'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FaHeadset className="w-4 h-4 inline mr-2" />
            Support
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Logo & Branding</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                    <div className="flex items-center gap-4">
                      {brandingSettings.logoUrl && (
                        <img
                          src={brandingSettings.logoUrl}
                          alt="Company Logo"
                          className="w-16 h-16 object-contain border border-gray-200 rounded"
                        />
                      )}
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Upload Logo
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                    <input
                      type="color"
                      value={brandingSettings.primaryColor || '#3B82F6'}
                      onChange={(e) => setBrandingSettings({...brandingSettings, primaryColor: e.target.value})}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                    <input
                      type="color"
                      value={brandingSettings.secondaryColor || '#1F2937'}
                      onChange={(e) => setBrandingSettings({...brandingSettings, secondaryColor: e.target.value})}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Domain & White Label */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Domain & White Label</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom Domain</label>
                    <input
                      type="text"
                      placeholder="app.yourcompany.com"
                      value={brandingSettings.customDomain || ''}
                      onChange={(e) => setBrandingSettings({...brandingSettings, customDomain: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="whiteLabel"
                      checked={brandingSettings.whiteLabel || false}
                      onChange={(e) => setBrandingSettings({...brandingSettings, whiteLabel: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="whiteLabel" className="text-sm font-medium text-gray-700">
                      Enable White Label Mode
                    </label>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Available Features</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {features.customBranding.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <FaPalette className="w-3 h-3" />
                          {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleBrandingSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Branding Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* API Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiSettings.apiKey || ''}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="Generate API key to access"
                      />
                      <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                        Generate
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                    <input
                      type="url"
                      placeholder="https://your-domain.com/webhook"
                      value={apiSettings.webhookUrl || ''}
                      onChange={(e) => setApiSettings({...apiSettings, webhookUrl: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rate Limit (requests/hour)</label>
                    <input
                      type="number"
                      value={apiSettings.rateLimit || 1000}
                      onChange={(e) => setApiSettings({...apiSettings, rateLimit: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* API Features */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">API Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="customIntegrations"
                      checked={apiSettings.customIntegrations || false}
                      onChange={(e) => setApiSettings({...apiSettings, customIntegrations: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="customIntegrations" className="text-sm font-medium text-gray-700">
                      Enable Custom Integrations
                    </label>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Available API Features</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      {features.apiAccess.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <FaCode className="w-3 h-3" />
                          {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">API Documentation</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Access comprehensive API documentation and SDKs for your integrations.
                    </p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View Documentation →
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleApiSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save API Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Security Features */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Security Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="ssoEnabled"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="ssoEnabled" className="text-sm font-medium text-gray-700">
                      Single Sign-On (SSO)
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auditLogs"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="auditLogs" className="text-sm font-medium text-gray-700">
                      Audit Logs
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="backupRestore"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="backupRestore" className="text-sm font-medium text-gray-700">
                      Backup & Restore
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="encryption"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="encryption" className="text-sm font-medium text-gray-700">
                      End-to-End Encryption
                    </label>
                  </div>
                </div>
              </div>

              {/* Security Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Security Status</h3>
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Available Security Features</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      {features.security.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <FaShieldAlt className="w-3 h-3" />
                          {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Security Compliance</h4>
                    <p className="text-sm text-blue-700">
                      Your data is protected with enterprise-grade security and compliance standards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Support Features */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Support Features</h3>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Available Support Features</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {features.support.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <FaHeadset className="w-3 h-3" />
                          {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Contact Support</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Get priority support with dedicated account management.
                    </p>
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Contact Support →
                    </button>
                  </div>
                </div>
              </div>

              {/* Support Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Support Status</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Active Support</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Your enterprise support is active and available 24/7.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Dedicated Account Manager</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      John Smith
                    </p>
                    <p className="text-sm text-blue-600">
                      john.smith@company.com
                    </p>
                    <p className="text-sm text-blue-600">
                      +1 (555) 123-4567
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 