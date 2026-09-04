import { api, getApiError } from "@/lib/api/client";
import { isPermissionDenied } from "@/lib/api/errors";
import { companyPath } from "@/lib/auth/session";
import { getQueryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";

export type UserDirectoryRole = {
  id?: string;
  code: string;
  name: string;
};

export type UserDirectoryEntry = {
  id: string;
  name: string;
  email?: string;
  status?: string;
  is_owner?: boolean;
  created_at?: string | null;
  phone?: string | null;
  job_title?: string | null;
  roles?: UserDirectoryRole[];
  role?: string | UserDirectoryRole;
  role_code?: string;
};

function directoryRoles(user: UserDirectoryEntry): UserDirectoryRole[] | undefined {
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  return undefined;
}

function isInactiveStatus(status?: string) {
  return String(status ?? "ACTIVE").toUpperCase() === "INACTIVE";
}

export function isInactiveUserStatus(status?: string) {
  return isInactiveStatus(status);
}

export function activeOnlyDirectory(users: UserDirectoryEntry[]) {
  return users.filter((user) => !isInactiveStatus(user.status));
}

export async function fetchUserDirectory(options?: {
  includeInactive?: boolean;
}): Promise<UserDirectoryEntry[]> {
  const { data } = await api.get<UserDirectoryEntry[]>(companyPath("/users"), {
    params: options?.includeInactive ? { include_inactive: "true" } : undefined,
  });
  const list = (data ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    is_owner: user.is_owner,
    created_at: user.created_at,
    phone: user.phone,
    job_title: user.job_title,
    roles: directoryRoles(user),
    role: user.role,
    role_code: user.role_code,
  }));
  // Selects/kanban só precisam de ativos; a tabela admin usa o retorno completo.
  getQueryClient().setQueryData(queryKeys.userDirectory, activeOnlyDirectory(list));
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
      phone: user.phone,
      job_title: user.job_title,
      roles: user.roles,
      role: user.role,
      role_code: user.role_code,
    })),
  );
}
