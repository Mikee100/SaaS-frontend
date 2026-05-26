import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/components/UserContext';
import { apiGet } from '@/utils/api';

export interface BillingAccessStatus {
  restricted: boolean;
  reason: string | null;
  status: string;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  daysSinceExpiry: number | null;
  renewalPath: string;
}

const DEFAULT_STATUS: BillingAccessStatus = {
  restricted: false,
  reason: null,
  status: 'active',
  currentPeriodEnd: null,
  graceEndsAt: null,
  daysSinceExpiry: 0,
  renewalPath: '/account/billing',
};

export function useBillingAccessStatus() {
  const { user } = useUser();

  const shouldFetch = Boolean(user && !user.isSuperadmin && user.tenantId);

  const query = useQuery({
    queryKey: ['billing-access-status', user?.tenantId],
    queryFn: () => apiGet<BillingAccessStatus>('/billing/access-status'),
    enabled: shouldFetch,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  const fallbackStatus: BillingAccessStatus =
    user && !user.isSuperadmin && !user.tenantId
      ? {
          restricted: true,
          reason:
            'No tenant is assigned to your account yet. Contact your administrator to activate access.',
          status: 'no_tenant',
          currentPeriodEnd: null,
          graceEndsAt: null,
          daysSinceExpiry: null,
          renewalPath: '/account/billing',
        }
      : DEFAULT_STATUS;

  return {
    data: query.data ?? fallbackStatus,
    isLoading: shouldFetch ? query.isLoading : false,
    isError: query.isError,
    error: query.error,
  };
}
