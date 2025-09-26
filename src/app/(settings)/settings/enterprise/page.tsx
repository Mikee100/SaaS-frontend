"use client";
import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/utils/api";
import { FaCrown, FaPalette, FaCode, FaShieldAlt, FaHeadset, FaCheck, FaTimes, FaArrowRight, FaLock } from 'react-icons/fa';
import EnterpriseFeatures from '@/components/EnterpriseFeatures';
import PlanGuard from '@/components/PlanGuard';
import { hasPermission } from '@/utils/permissions';
import { useUser } from '@/components/UserContext';

interface EnterpriseStatus {
  customBranding: boolean;
  apiAccess: boolean;
  advancedSecurity: boolean;
  dedicatedSupport: boolean;
  whiteLabel: boolean;
  ssoEnabled: boolean;
  auditLogs: boolean;
  backupRestore: boolean;
  customIntegrations: boolean;
}

export default function EnterprisePage() {
  const { user } = useUser();
  const [enterpriseStatus, setEnterpriseStatus] = useState<EnterpriseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  interface BillingLimits {
    features?: {
      custom_branding?: boolean;
      api_access?: boolean;
      advanced_security?: boolean;
      dedicated_support?: boolean;
      white_label?: boolean;
      sso_enabled?: boolean;
      audit_logs?: boolean;
      backup_restore?: boolean;
      custom_integrations?: boolean;
    };
  }

  const fetchEnterpriseStatus = useCallback(async () => {
    try {
      setLoading(true);
      const limits = await apiGet<BillingLimits>('/billing/limits');
      setEnterpriseStatus({
        customBranding: limits?.features?.custom_branding || false,
        apiAccess: limits?.features?.api_access || false,
        advancedSecurity: limits?.features?.advanced_security || false,
        dedicatedSupport: limits?.features?.dedicated_support || false,
        whiteLabel: limits?.features?.white_label || false,
        ssoEnabled: limits?.features?.sso_enabled || false,
        auditLogs: limits?.features?.audit_logs || false,
        backupRestore: limits?.features?.backup_restore || false,
        customIntegrations: limits?.features?.custom_integrations || false,
      });
    } catch (error: unknown) {
      console.error('Error fetching enterprise status:', error);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed

  useEffect(() => {
    fetchEnterpriseStatus();
  }, [fetchEnterpriseStatus]);

  // Permission checks
  const canViewSettings = hasPermission(user, 'view_settings');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user has permission to view enterprise features
  if (!canViewSettings) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <FaLock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view enterprise features.</p>
          <p className="text-sm text-gray-500">Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FaCrown className="w-8 h-8 text-yellow-600" />
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Features</h1>
        </div>
        <p className="text-gray-600">
          Configure and manage advanced enterprise features for your organization.
        </p>
      </div>

      {/* Enterprise Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaPalette className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Branding</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {enterpriseStatus?.customBranding ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">Custom Branding</span>
            </div>
            <div className="flex items-center gap-2">
              {enterpriseStatus?.whiteLabel ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">White Label</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaCode className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-gray-800">API Access</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {enterpriseStatus?.apiAccess ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">REST API</span>
            </div>
            <div className="flex items-center gap-2">
              {enterpriseStatus?.customIntegrations ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">Custom Integrations</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaShieldAlt className="w-6 h-6 text-purple-600" />
            <h3 className="font-semibold text-gray-800">Security</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {enterpriseStatus?.advancedSecurity ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">Advanced Security</span>
            </div>
            <div className="flex items-center gap-2">
              {enterpriseStatus?.ssoEnabled ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">Single Sign-On</span>
            </div>
            <div className="flex items-center gap-2">
              {enterpriseStatus?.auditLogs ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">Audit Logs</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaHeadset className="w-6 h-6 text-orange-600" />
            <h3 className="font-semibold text-gray-800">Support</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {enterpriseStatus?.dedicatedSupport ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">Dedicated Support</span>
            </div>
            <div className="flex items-center gap-2">
              {enterpriseStatus?.backupRestore ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaTimes className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm text-gray-700">Backup & Restore</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Features Configuration */}
      <PlanGuard requiredPlan="Enterprise" fallback={
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <FaCrown className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-yellow-800 mb-2">Enterprise Features Not Available</h3>
          <p className="text-yellow-700 mb-6">
            Enterprise features are only available on the Enterprise plan. Upgrade to access advanced branding, 
            API access, security features, and dedicated support.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/settings/billing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              <FaArrowRight className="w-4 h-4" />
              Upgrade to Enterprise
            </a>
            <a
              href="/settings/billing"
              className="inline-flex items-center px-6 py-3 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors"
            >
              View Plans
            </a>
          </div>
        </div>
      }>
        <EnterpriseFeatures />
      </PlanGuard>

      {/* Enterprise Benefits */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Enterprise Benefits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaPalette className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Custom Branding</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Fully customize your experience with custom logos, colors, domains, and white-label options.
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Custom logo and colors</li>
              <li>• White-label solution</li>
              <li>• Custom domain support</li>
              <li>• Branded receipts</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaCode className="w-6 h-6 text-green-600" />
              <h3 className="font-semibold text-gray-800">API Access</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Full API access with custom integrations, webhooks, and comprehensive documentation.
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• REST API access</li>
              <li>• Webhook support</li>
              <li>• Custom integrations</li>
              <li>• Rate limiting</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaShieldAlt className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Advanced Security</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Enterprise-grade security with SSO, audit logs, and enhanced data protection.
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Single Sign-On (SSO)</li>
              <li>• Comprehensive audit logs</li>
              <li>• End-to-end encryption</li>
              <li>• Backup & restore</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaHeadset className="w-6 h-6 text-orange-600" />
              <h3 className="font-semibold text-gray-800">Dedicated Support</h3>
            </div>
            <p className="text-gray-600 mb-4">
              24/7 priority support with dedicated account management and custom solutions.
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 24/7 priority support</li>
              <li>• Dedicated account manager</li>
              <li>• Custom solutions</li>
              <li>• Priority queue</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaCrown className="w-6 h-6 text-red-600" />
              <h3 className="font-semibold text-gray-800">White Label</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Remove all branding and use your own domain for a completely custom experience.
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Remove all branding</li>
              <li>• Custom domain</li>
              <li>• Branded interface</li>
              <li>• Custom email templates</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaCheck className="w-6 h-6 text-teal-600" />
              <h3 className="font-semibold text-gray-800">Custom Integrations</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Build custom integrations with webhooks, API access, and third-party connections.
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Custom webhooks</li>
              <li>• Third-party integrations</li>
              <li>• API rate limits</li>
              <li>• Custom workflows</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}