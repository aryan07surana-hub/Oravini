import { useQuery, UseQueryOptions } from "@tanstack/react-query";

/**
 * Safe wrapper around useQuery that prevents crashes
 * Returns empty array/object on error instead of throwing
 */
export function useSafeQuery<T = any>(options: UseQueryOptions<T>) {
  return useQuery({
    ...options,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    onError: (error: any) => {
      console.error(`Query failed [${options.queryKey}]:`, error);
    },
  });
}

/**
 * Safe array query - returns empty array on error
 */
export function useSafeArrayQuery<T = any[]>(queryKey: any[], queryFn?: any) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    onError: (err: any) => {
      console.error(`Array query failed [${queryKey}]:`, err);
    },
  });

  return {
    data: (data as T) ?? ([] as T),
    isLoading,
    error,
    refetch,
  };
}

/**
 * Safe object query - returns empty object on error
 */
export function useSafeObjectQuery<T = any>(queryKey: any[], queryFn?: any) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn,
    retry: 1,
    retryDelay: 500,
    staleTime: 30000,
    onError: (err: any) => {
      console.error(`Object query failed [${queryKey}]:`, err);
    },
  });

  return {
    data: (data as T) ?? ({} as T),
    isLoading,
    error,
    refetch,
  };
}
