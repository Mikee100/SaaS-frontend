import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/utils/api';
import { useUser } from '@/components/UserContext';

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  [key: string]: unknown;
}

/**
 * Shared hook for fetching branches with React Query caching
 * Replaces multiple independent /branches calls across components
 */
export function useBranches() {
  const { user } = useUser();

  return useQuery({
    queryKey: ['branches', user?.tenantId],
    queryFn: async () => {
      if (!user?.tenantId) {
        return [];
      }
      const data = await apiGet('/branches');
      return (Array.isArray(data) ? data : []) as Branch[];
    },
    enabled: !!user?.tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes - branches don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
}

