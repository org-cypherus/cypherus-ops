"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSession } from "@/modules/auth/hooks";
import { prefetchWarmQueries } from "@/lib/query/prefetch-routes";

/** Depois da sessão real, aquece kanban + diretório de users. */
export function SessionWarmPrefetch() {
  const queryClient = useQueryClient();
  const { data: session, isSuccess, isPlaceholderData } = useSession();

  useEffect(() => {
    if (!isSuccess || isPlaceholderData || !session) return;
    void prefetchWarmQueries(queryClient, session);
  }, [queryClient, session, isSuccess, isPlaceholderData]);

  return null;
}
