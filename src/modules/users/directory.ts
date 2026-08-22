import { api, getApiError } from "@/lib/api/client";
import { isPermissionDenied } from "@/lib/api/errors";
import { companyPath } from "@/lib/auth/session";
import { getQueryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";

export type UserDirectoryEntry = {
  id: string;
  name: string;
  email?: string;
  status?: string;
  is_owner?: boolean;
  created_at?: string | null;
};

export async function fetchUserDirectory(): Promise<UserDirectoryEntry[]> {
  const { data } = await api.get<UserDirectoryEntry[]>(companyPath("/users"));
  const list = (data ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    is_owner: user.is_owner,
    created_at: user.created_at,
  }));
  getQueryClient().setQueryData(queryKeys.userDirectory, list);
  return list;
}

/** Nomes de owners para enriquecer leads/financeiro. Sem `users.view` retorna vazio (não quebra a tela). */
export async function fetchOwnerMap(): Promise<Record<string, string>> {
  try {
    const users = await getQueryClient().ensureQueryData({
      queryKey: queryKeys.userDirectory,
      queryFn: fetchUserDirectoryOrEmpty,
    });
    return Object.fromEntries(users.map((user) => [user.id, user.name]));
  } catch (error) {
    if (isPermissionDenied(getApiError(error))) return {};
    throw error;
  }
}

/** Diretório para selects/prefetch. Sem permissão, lista vazia (não polui o cache com erro). */
export async function fetchUserDirectoryOrEmpty(): Promise<UserDirectoryEntry[]> {
  try {
    return await fetchUserDirectory();
  } catch (error) {
    if (isPermissionDenied(getApiError(error))) return [];
    throw error;
  }
}

export function seedUserDirectory(users: UserDirectoryEntry[]) {
  getQueryClient().setQueryData(
    queryKeys.userDirectory,
    users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      is_owner: user.is_owner,
      created_at: user.created_at,
    })),
  );
}
