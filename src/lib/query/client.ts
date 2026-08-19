import { QueryClient } from "@tanstack/react-query";
import { getApiError } from "@/lib/api/client";

export const QUERY_STALE_TIME_MS = 30_000;
export const PLANS_STALE_TIME_MS = 10 * 60 * 1000;
export const PIPELINE_STALE_TIME_MS = 5 * 60 * 1000;

export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount > 0) return false;
  const status = getApiError(error).status;
  return status === 0 || status === 408;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  browserClient ??= makeQueryClient();
  return browserClient;
}
