import { QueryClient } from "@tanstack/react-query";

/**
 * Fresh client per router instance (required for SSR — avoids cache leaking between requests).
 * Defaults tuned for drive-style listings + server-backed mutations (invalidate after success).
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
