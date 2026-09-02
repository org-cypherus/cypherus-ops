"use client";

import { useQuery } from "@tanstack/react-query";
import { PLANS_STALE_TIME_MS } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { fetchPlansCatalog } from "@/modules/auth/services";
import { fetchPlanLimits, hydratePlansFromCatalog } from "./plan-catalog";

export function usePlanCatalog() {
  const plansQuery = useQuery({
    queryKey: queryKeys.plans,
    queryFn: fetchPlansCatalog,
    staleTime: PLANS_STALE_TIME_MS,
  });

  const limitsQuery = useQuery({
    queryKey: queryKeys.planLimits,
    queryFn: () => fetchPlanLimits(plansQuery.data ?? []),
    enabled: Boolean(plansQuery.data?.length),
    staleTime: PLANS_STALE_TIME_MS,
  });

  const hydrated = hydratePlansFromCatalog(plansQuery.data ?? [], limitsQuery.data ?? {});

  return {
    catalog: plansQuery.data ?? [],
    limits: limitsQuery.data ?? {},
    plans: hydrated,
    isLoading: plansQuery.isLoading,
    isError: plansQuery.isError,
    error: plansQuery.error,
  };
}
