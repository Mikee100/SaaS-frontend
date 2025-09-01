"use client";
import { ReactNode, useState, useEffect } from 'react';
import { useUser } from './UserContext';
import { apiGet } from '@/utils/api';
import { FaCrown, FaLock, FaArrowUp } from 'react-icons/fa';

interface FeatureGuardProps {
  children: ReactNode;
  requiredFeature: string;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  planRequired?: 'Basic' | 'Pro' | 'Enterprise';
}

export default function FeatureGuard({ 
  children, 
  requiredFeature, 
  fallback, 
  showUpgradePrompt = true,
  planRequired
}: FeatureGuardProps) {
  const userContext = useUser();
  const [hasFeature, setHasFeature] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('Basic');

  useEffect(() => {
    if (!userContext || userContext.loading) return;

    if (!userContext.user) {
      setHasFeature(false);
      setLoading(false);
      return;
    }

    const checkFeature = async () => {
      try {
        setError(null);
        const limits = await apiGet('/billing/limits') as any;
        setCurrentPlan(limits?.currentPlan || 'Basic');
        
        // Check if user has the specific feature
        const featureEnabled = limits?.features?.[requiredFeature] || false;
        setHasFeature(featureEnabled);
      } catch (error: any) {
        console.error('Error checking feature access:', error);
        
        if (error?.message?.includes('Unauthorized') || error?.status === 401) {
          setError('Please log in to access this feature');
          setHasFeature(false);
        } else {
          // For other errors, default to allowing access
          setHasFeature(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkFeature();
  }, [userContext, requiredFeature]);

  if (userContext?.loading || loading) {
    return <div className="animate-pulse bg-gray-200 h-4 rounded"></div>;
  }

  if (!userContext?.user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">Please log in to access this feature</p>
        <a
          href="/login"
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mt-2"
        >
          Log In
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (hasFeature) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const getFeatureInfo = (feature: string) => {
    const featureMap: Record<string, { name: string; description: string; plan: string }> = {
      'analytics': {
        name: 'Analytics',
        description: 'Advanced analytics and reporting features',
        plan: 'Pro'
      },
      'advanced_reports': {
        name: 'Advanced Reports',
        description: 'Detailed reports and insights',
        plan: 'Pro'
      },
      'bulk_operations': {
        name: 'Bulk Operations',
        description: 'Import/export and bulk data management',
        plan: 'Pro'
      },
      'data_export': {
        name: 'Data Export',
        description: 'Export data in various formats',
        plan: 'Pro'
      },
      'custom_fields': {
        name: 'Custom Fields',
        description: 'Add custom fields to products and sales',
        plan: 'Pro'
      },
      'custom_branding': {
        name: 'Custom Branding',
        description: 'Customize colors, logos, and branding',
        plan: 'Enterprise'
      },
      'api_access': {
        name: 'API Access',
        description: 'REST API access for integrations',
        plan: 'Enterprise'
      },
      'advanced_security': {
        name: 'Advanced Security',
        description: 'SSO, audit logs, and enhanced security',
        plan: 'Enterprise'
      },
      'white_label': {
        name: 'White Label',
        description: 'Remove branding and use custom domain',
        plan: 'Enterprise'
      },
      'dedicated_support': {
        name: 'Dedicated Support',
        description: '24/7 priority support with dedicated manager',
        plan: 'Enterprise'
      },
      'sso_enabled': {
        name: 'Single Sign-On',
        description: 'SSO integration for enterprise users',
        plan: 'Enterprise'
      },
      'audit_logs': {
        name: 'Audit Logs',
        description: 'Comprehensive activity logging',
        plan: 'Enterprise'
      },
      'backup_restore': {
        name: 'Backup & Restore',
        description: 'Automated backups and data recovery',
        plan: 'Enterprise'
      },
      'custom_integrations': {
        name: 'Custom Integrations',
        description: 'Build custom integrations and webhooks',
        plan: 'Enterprise'
      },
      'enterprise_branding': {
        name: 'Enterprise Branding',
        description: 'Full white-label solution with custom domain',
        plan: 'Enterprise'
      },
      'full_api_access': {
        name: 'Full API Access',
        description: 'Complete API access with custom integrations',
        plan: 'Enterprise'
      },
      'advanced_analytics': {
        name: 'Advanced Analytics',
        description: 'Comprehensive analytics and insights',
        plan: 'Enterprise'
      },
      'security_audit': {
        name: 'Security Audit',
        description: 'Advanced security with audit capabilities',
        plan: 'Enterprise'
      }
    };

    return featureMap[feature] || {
      name: requiredFeature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: 'This feature requires a higher plan',
      plan: 'Pro'
    };
  };

  const featureInfo = getFeatureInfo(requiredFeature);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <FaLock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            {featureInfo.name} Feature
          </h3>
        </div>
        <p className="text-gray-600 mb-4">
          {featureInfo.description}
        </p>
        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <FaCrown className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Available in {featureInfo.plan} Plan
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Current plan: {currentPlan}
          </p>
        </div>
      </div>
      
      <div className="flex gap-3 justify-center">
        <a
          href="/settings/billing"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
                      <FaArrowUp className="w-4 h-4" />
          Upgrade Plan
        </a>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
} 