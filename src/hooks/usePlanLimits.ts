import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/utils/api';
import { useUser } from '@/components/UserContext';

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

/**
 * Hook for fetching plan limits with React Query caching
 * Plan limits rarely change, so we cache for 10-15 minutes
 */
export function usePlanLimits() {
  const { user } = useUser();

  const query = useQuery({
    queryKey: ['plan-limits', user?.id],
    queryFn: () => apiGet<PlanLimitsData>('/user/me/plan-limits'),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes - plan limits rarely change
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error instanceof Error ? query.error.message : 'Failed to fetch plan limits') : null,
    refetch: query.refetch,
  };
}
