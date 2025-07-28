"use client";
import { ReactNode } from 'react';
import { useUser } from './UserContext';
import { apiGet } from '@/utils/api';
import { useState, useEffect } from 'react';

interface PlanGuardProps {
  children: ReactNode;
  requiredPlan?: 'Basic' | 'Pro' | 'Enterprise';
  requiredFeature?: string;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export default function PlanGuard({ 
  children, 
  requiredPlan, 
  requiredFeature, 
  fallback, 
  showUpgradePrompt = true 
}: PlanGuardProps) {
  const userContext = useUser();
  const [planLimits, setPlanLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // If user context is not available yet, wait
    if (!userContext || userContext.loading) return;

    const checkAccess = async () => {
      try {
        const limits = await apiGet('/billing/limits');
        setPlanLimits(limits);
        
        if (requiredPlan) {
          const planHierarchy = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
          const currentPlan = limits.currentPlan || 'Basic';
          const currentLevel = planHierarchy[currentPlan] || 0;
          const requiredLevel = planHierarchy[requiredPlan] || 0;
          setHasAccess(currentLevel >= requiredLevel);
        } else if (requiredFeature) {
          setHasAccess(limits.features?.[requiredFeature] || false);
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Error checking plan access:', error);
        // Default to allowing access if there's an error
        setHasAccess(true);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [userContext, requiredPlan, requiredFeature]);

  // Show loading state while user context is loading
  if (userContext?.loading || loading) {
    return <div className="animate-pulse bg-gray-200 h-4 rounded"></div>;
  }

  // If no user context, show children (for public pages)
  if (!userContext?.user) {
    return <>{children}</>;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {requiredPlan ? `Upgrade to ${requiredPlan} Plan` : 'Feature Not Available'}
        </h3>
        <p className="text-gray-600 mb-4">
          {requiredPlan 
            ? `This feature is available in the ${requiredPlan} plan and higher.`
            : 'This feature is not available in your current plan.'
          }
        </p>
      </div>
      <a
        href="/settings/billing"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Upgrade Plan
      </a>
    </div>
  );
} 