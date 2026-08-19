import { api } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { getQueryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";

export type UserDirectoryEntry = {
  id: string;
  name: string;
  email?: string;
  status?: string;
};

export async function fetchUserDirectory(): Promise<UserDirectoryEntry[]> {
  const { data } = await api.get<UserDirectoryEntry[]>(companyPath("/users"));
  const list = (data ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
  }));
  getQueryClient().setQueryData(queryKeys.userDirectory, list);
  return list;
}

export async function fetchOwnerMap(): Promise<Record<string, string>> {
  const users = await getQueryClient().ensureQueryData({
    queryKey: queryKeys.userDirectory,
    queryFn: fetchUserDirectory,
  });
  return Object.fromEntries(users.map((user) => [user.id, user.name]));
}

export function seedUserDirectory(users: UserDirectoryEntry[]) {
  getQueryClient().setQueryData(
    queryKeys.userDirectory,
    users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
    })),
  );
}
