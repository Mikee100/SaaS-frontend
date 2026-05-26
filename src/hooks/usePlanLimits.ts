import { useQuery } from '@tanstack/react-query';
import { apiGet, isAccessRestrictedError } from '@/utils/api';
import { useUser } from '@/components/UserContext';
import { useBillingAccessStatus } from '@/hooks/useBillingAccessStatus';

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

interface UsePlanLimitsOptions {
  enabled?: boolean;
}

/**
 * Hook for fetching plan limits with React Query caching
 * Plan limits rarely change, so we cache for 10-15 minutes
 */
export function usePlanLimits(options?: UsePlanLimitsOptions) {
  const { user } = useUser();
  const { data: accessStatus, isLoading: accessStatusLoading } =
    useBillingAccessStatus();
  const queryEnabled =
    !!user &&
    !accessStatusLoading &&
    !accessStatus.restricted &&
    (options?.enabled ?? true);

  const query = useQuery({
    queryKey: ['plan-limits', user?.id],
    queryFn: () => apiGet<PlanLimitsData>('/user/me/plan-limits'),
    enabled: queryEnabled,
    retry: (failureCount, error) => {
      if (isAccessRestrictedError(error)) return false;
      return failureCount < 1;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - plan limits rarely change
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error
      ? isAccessRestrictedError(query.error)
        ? 'Plan details are unavailable while subscription access is restricted. Renew in Billing to continue.'
        : query.error instanceof Error
          ? query.error.message
          : 'Failed to fetch plan limits'
      : null,
    refetch: query.refetch,
  };
}
