"use client";
import { useState, useEffect } from 'react';
import { useUser } from '@/components/UserContext';
import { apiGet } from '@/utils/api';

export function usePlanLimits() {
  const userContext = useUser();
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch if user is not loaded yet
    if (!userContext || userContext.loading) return;

    const fetchLimits = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiGet('/billing/limits');
        setLimits(data);
      } catch (err: any) {
        console.error('Error fetching plan limits:', err);
        setError(err.message || 'Failed to fetch plan limits');
        // Set default limits if there's an error
        setLimits({
          currentPlan: 'Basic',
          usage: {
            users: { current: 1, limit: 1 },
            products: { current: 0, limit: 10 },
            sales: { current: 0, limit: 100 }
          },
          features: {
            analytics: false,
            advanced_reports: false,
            custom_branding: false,
            api_access: false
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [userContext]);

  const hasFeature = (feature: string) => {
    if (!limits) return false;
    return limits.features?.[feature] || false;
  };

  const canCreate = (type: 'users' | 'products' | 'sales') => {
    if (!limits) return true; // Default to allowing if limits not loaded
    const usage = limits.usage?.[type];
    if (!usage) return true;
    return usage.current < usage.limit;
  };

  const getUsagePercentage = (type: 'users' | 'products' | 'sales') => {
    if (!limits) return 0;
    const usage = limits.usage?.[type];
    if (!usage || usage.limit === 0) return 0;
    return Math.min((usage.current / usage.limit) * 100, 100);
  };

  const isPlanAtLeast = (plan: 'Basic' | 'Pro' | 'Enterprise') => {
    if (!limits) return false;
    const planHierarchy = { 'Basic': 1, 'Pro': 2, 'Enterprise': 3 };
    const currentPlan = limits.currentPlan || 'Basic';
    const currentLevel = planHierarchy[currentPlan] || 0;
    const requiredLevel = planHierarchy[plan] || 0;
    return currentLevel >= requiredLevel;
  };

  return {
    limits,
    loading: userContext?.loading || loading,
    error,
    hasFeature,
    canCreate,
    getUsagePercentage,
    isPlanAtLeast
  };
} 