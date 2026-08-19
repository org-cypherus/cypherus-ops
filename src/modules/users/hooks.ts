"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { fetchUserDirectory } from "./directory";

export function useUserDirectory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.userDirectory,
    queryFn: fetchUserDirectory,
    enabled,
  });
}
