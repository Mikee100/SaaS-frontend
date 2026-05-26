import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/utils/api';
import { useUser } from '@/components/UserContext';
import { useBillingAccessStatus } from '@/hooks/useBillingAccessStatus';

export interface Tenant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  logoUrl?: string;
  receiptLogo?: string;
  favicon?: string;
  [key: string]: unknown;
}

interface UseTenantOptions {
  enabled?: boolean;
}

/**
 * Shared hook for fetching tenant data with React Query caching
 * Replaces multiple independent /tenant/me calls across components
 */
export function useTenant(options?: UseTenantOptions) {
  const { user } = useUser();
  const { data: accessStatus, isLoading: accessStatusLoading } =
    useBillingAccessStatus();
  const queryEnabled =
    !!user?.tenantId &&
    !accessStatusLoading &&
    !accessStatus.restricted &&
    (options?.enabled ?? true);

  return useQuery({
    queryKey: ['tenant', user?.tenantId],
    queryFn: async () => {
      if (!user?.tenantId) {
        throw new Error('No tenant ID available');
      }
      return apiGet('/tenant/me') as Promise<Tenant>;
    },
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - tenant data doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache (React Query v5: gcTime replaces cacheTime)
  });
}

