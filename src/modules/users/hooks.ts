"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { fetchUserDirectoryOrEmpty } from "./directory";

/** Diretório para selects/filtros. Sem `users.view`, retorna lista vazia (não quebra a tela). */
export function useUserDirectory(enabled = true) {
  return useQuery({
    queryKey: queryKeys.userDirectory,
    queryFn: fetchUserDirectoryOrEmpty,
    enabled,
  });
}
