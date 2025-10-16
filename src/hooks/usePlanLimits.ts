import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '@/utils/api';

export interface PlanLimitsData {
  currentPlan: string;
  usage: {
    users: { current: number; limit: number };
    products: { current: number; limit: number };
    branches: { current: number; limit: number };
    sales: { current: number; limit: number };
  };
  features: {
    analytics: boolean;
    advanced_reports: boolean;
    custom_branding: boolean;
    api_access: boolean;
    bulk_operations: boolean;
    data_export: boolean;
    custom_fields: boolean;
  };
}

export function usePlanLimits() {
  const [data, setData] = useState<PlanLimitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanLimits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<PlanLimitsData>('/user/me/plan-limits');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plan limits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanLimits();
  }, [fetchPlanLimits]);

  const refetch = useCallback(() => {
    fetchPlanLimits();
  }, [fetchPlanLimits]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
