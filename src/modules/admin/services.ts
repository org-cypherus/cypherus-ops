import { api } from "@/lib/api/client";
import { mapApiPermissions, mapRoleCode, roleCodeFromUi, UI_TO_API_PERMISSION } from "@/lib/auth/mappers";
import type { Permission, RoleName } from "@/lib/auth/permissions";
import { companyPath } from "@/lib/auth/session";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { fetchUserDirectory, seedUserDirectory } from "@/modules/users/directory";
import { editablePermissions } from "./permission-modules";
import { getAllUserProfileExtras, getUserProfileExtras, saveUserProfileExtras } from "./user-profile-extras";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: RoleName;
  team: string;
  status: "Ativo" | "Inativo";
  createdAt?: string;
  mustChangePassword?: boolean;
};

type CrmUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  is_owner?: boolean;
  phone?: string | null;
  job_title?: string | null;
  created_at?: string | null;
};

type CrmRole = {
  id: string;
  code: string;
  name: string;
};

export type OverrideEffect = "ALLOW" | "DENY";

export type UserPermissionAccess = {
  permission: string;
  granted: boolean;
  scope?: string | null;
  source?: string;
};

export type UserPermissionOverride = {
  user_id: string;
  permission_key: string;
  effect: OverrideEffect;
  scope?: string | null;
  reason?: string | null;
  expires_at?: string | null;
  created_at: string;
};

async function fetchRoles() {
  const { data } = await api.get<CrmRole[]>(companyPath("/roles"));
  return data;
}

async function roleIdFor(role: RoleName, roles: CrmRole[]) {
  const code = roleCodeFromUi(role);
  return roles.find((item) => item.code.toUpperCase() === code)?.id
    ?? roles.find((item) => item.code.toUpperCase() === "SALES")?.id
    ?? roles[0]?.id;
}

export function mapCrmUserToAppUser(user: CrmUser, roleCode?: string): AppUser {
  const cached = getUserProfileExtras(user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone?.trim() || cached?.phone || "",
    role: mapRoleCode(roleCode, user.is_owner),
    team: user.job_title?.trim() || cached?.team || "",
    status: user.status === "ACTIVE" ? "Ativo" : "Inativo",
    createdAt: user.created_at ?? undefined,
  };
}

async function toAppUser(user: CrmUser): Promise<AppUser> {
  const { data: assigned } = await api
    .get<CrmRole[]>(companyPath(`/users/${user.id}/roles`))
    .catch(() => ({ data: [] as CrmRole[] }));
  return mapCrmUserToAppUser(user, assigned[0]?.code);
}

export async function fetchUser(id: string): Promise<AppUser> {
  const { data } = await api.get<CrmUser>(companyPath(`/users/${id}`));
  return toAppUser(data);
}

export async function fetchUsers() {
  const data = await fetchUserDirectory();
  const extras = getAllUserProfileExtras();
  return mapWithConcurrency(data, 2, (user) =>
    toAppUser({
      id: user.id,
      name: user.name,
      email: user.email ?? "",
      status: user.status ?? "ACTIVE",
      is_owner: user.is_owner,
      phone: extras[user.id]?.phone,
      job_title: extras[user.id]?.team,
      created_at: user.created_at,
    }),
  );
}

export async function createUser(values: {
  name: string;
  email: string;
  phone: string;
  role: RoleName;
  team: string;
  status: "Ativo" | "Inativo";
}) {
  const roles = await fetchRoles();
  const roleId = await roleIdFor(values.role, roles);
  const { data } = await api.post<{ user?: CrmUser; invitation_token?: string } & CrmUser>(
    companyPath("/invitations"),
    { name: values.name, email: values.email, role_id: roleId },
  );
  const created = data.user ?? data;
  await api.patch(companyPath(`/users/${created.id}`), {
    phone: values.phone,
    job_title: values.team,
  });
  saveUserProfileExtras(created.id, { phone: values.phone, team: values.team });
  const appUser = await toAppUser({
    ...created,
    phone: values.phone,
    job_title: values.team,
  });
  return { ...appUser, invitationToken: data.invitation_token };
}

export async function updateUser(id: string, values: Partial<AppUser>) {
  await api.patch(companyPath(`/users/${id}`), {
    name: values.name,
    phone: values.phone,
    job_title: values.team,
  });
  if (values.phone !== undefined || values.team !== undefined) {
    const previous = getUserProfileExtras(id);
    saveUserProfileExtras(id, {
      phone: values.phone ?? previous?.phone ?? "",
      team: values.team ?? previous?.team ?? "",
    });
  }
  if (values.role) {
    const roles = await fetchRoles();
    const roleId = await roleIdFor(values.role, roles);
    if (roleId) await api.put(companyPath(`/users/${id}/roles`), { role_id: roleId });
  }
  if (values.status === "Inativo") {
    await api.post(companyPath(`/users/${id}/deactivate`));
  }
  const data = await fetchUserDirectory();
  seedUserDirectory(data);
  const user = data.find((item) => item.id === id);
  if (!user) throw new Error("Usuário não encontrado após atualizar.");
  const cached = getUserProfileExtras(id);
  return toAppUser({
    id: user.id,
    name: values.name ?? user.name,
    email: user.email ?? "",
    status: user.status ?? "ACTIVE",
    is_owner: user.is_owner,
    phone: values.phone ?? cached?.phone,
    job_title: values.team ?? cached?.team,
    created_at: user.created_at,
  });
}

export async function deactivateUser(id: string) {
  await api.post(companyPath(`/users/${id}/deactivate`));
}

export async function fetchRoleCatalog() {
  const { data } = await api.get<CrmRole[]>(companyPath("/roles"));
  return data;
}

export async function fetchRolePermissions(roleId: string) {
  const { data } = await api.get<Array<{ permission_key: string; scope: string }>>(
    companyPath(`/roles/${roleId}/permissions`),
  );
  return data;
}

export async function replaceRolePermissions(roleId: string, permissionKey: string, scope = "COMPANY") {
  await api.put(companyPath(`/roles/${roleId}/permissions`), {
    permission_key: permissionKey,
    scope,
  });
}

export async function fetchUserEffectivePermissions(userId: string): Promise<UserPermissionAccess[]> {
  const { data } = await api.get<UserPermissionAccess[]>(companyPath(`/users/${userId}/permissions`));
  return data ?? [];
}

export async function fetchUserPermissionOverrides(userId: string): Promise<UserPermissionOverride[]> {
  const { data } = await api.get<UserPermissionOverride[]>(companyPath(`/users/${userId}/overrides`));
  return data ?? [];
}

export async function upsertUserPermissionOverride(
  userId: string,
  body: {
    permission_key: string;
    effect: OverrideEffect;
    scope?: string | null;
    reason?: string | null;
  },
) {
  const { data } = await api.put<UserPermissionOverride>(companyPath(`/users/${userId}/overrides`), {
    permission_key: body.permission_key,
    effect: body.effect,
    scope: body.effect === "ALLOW" ? (body.scope ?? "COMPANY") : undefined,
    reason: body.reason ?? undefined,
  });
  return data;
}

/** Ajusta overrides ALLOW/DENY para bater com o conjunto desejado (pós troca de cargo). */
export async function syncUserPermissionOverrides(userId: string, desired: Permission[]) {
  const effective = await fetchUserEffectivePermissions(userId);
  const current = new Set(mapApiPermissions(effective));
  const desiredSet = new Set(desired);
  const targets = editablePermissions().filter((permission) => UI_TO_API_PERMISSION[permission]);

  await mapWithConcurrency(targets, 2, async (permission) => {
    const key = UI_TO_API_PERMISSION[permission];
    if (!key) return;
    const want = desiredSet.has(permission);
    const has = current.has(permission);
    if (want === has) return;
    await upsertUserPermissionOverride(userId, {
      permission_key: key,
      effect: want ? "ALLOW" : "DENY",
    });
  });
}
