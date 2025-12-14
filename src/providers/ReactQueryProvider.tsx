"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 minutes stale time for most queries - reduces unnecessary refetches
            staleTime: 5 * 60 * 1000,
            // 30 minutes garbage collection time - keeps data in memory longer for instant access
            gcTime: 30 * 60 * 1000,
            // Don't refetch on window focus to prevent unnecessary requests
            refetchOnWindowFocus: false,
            // Refetch on reconnect to sync data after network issues
            refetchOnReconnect: true,
            // Retry once on failure (reduced from 2 for faster error handling)
            retry: 1,
            // Exponential backoff for retries
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Use stale data while refetching for better UX (React Query v5 syntax)
            placeholderData: keepPreviousData,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
