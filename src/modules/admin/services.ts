import { api } from "@/lib/api/client";
import {
  mapApiPermissions,
  mapRoleCode,
  resolveRoleName,
  roleCodeFromUi,
  UI_TO_API_PERMISSION,
} from "@/lib/auth/mappers";
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
  status: "Ativo" | "Inativo" | "Convidado";
  createdAt?: string;
  mustChangePassword?: boolean;
  isOwner?: boolean;
};

type CrmRole = {
  id: string;
  code: string;
  name: string;
};

type AssignedRole = Pick<CrmRole, "code" | "name">;

type CrmUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  is_owner?: boolean;
  phone?: string | null;
  job_title?: string | null;
  created_at?: string | null;
  roles?: CrmRole[];
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
  return (
    roles.find((item) => item.code.toUpperCase() === code)?.id ??
    roles.find(
      (item) => resolveRoleName(item.code) === role || resolveRoleName(item.name) === role,
    )?.id ??
    roles.find((item) => item.code.toUpperCase() === "SALES")?.id ??
    roles[0]?.id
  );
}

function roleFromAssigned(
  role?: string | AssignedRole,
  isOwner = false,
): RoleName {
  if (typeof role === "string") return mapRoleCode(role, isOwner);
  return (
    resolveRoleName(role?.name) ??
    resolveRoleName(role?.code) ??
    mapRoleCode(undefined, isOwner)
  );
}

export function mapCrmUserToAppUser(user: CrmUser, role?: string | AssignedRole): AppUser {
  const cached = getUserProfileExtras(user.id);
  const statusRaw = String(user.status ?? "ACTIVE").toUpperCase();
  const status: AppUser["status"] =
    statusRaw === "ACTIVE" ? "Ativo" : statusRaw === "INVITED" ? "Convidado" : "Inativo";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone?.trim() || cached?.phone || "",
    role: roleFromAssigned(role, user.is_owner),
    team: user.job_title?.trim() || cached?.team || "",
    status,
    createdAt: user.created_at ?? undefined,
    isOwner: Boolean(user.is_owner),
  };
}

async function fetchAssignedRoles(userId: string): Promise<CrmRole[]> {
  const { data } = await api
    .get<CrmRole[] | null>(companyPath(`/users/${userId}/roles`), { timeout: 8_000 })
    .catch(() => ({ data: [] as CrmRole[] }));
  return Array.isArray(data) ? data : [];
}

async function toAppUser(user: CrmUser, assigned?: CrmRole[]): Promise<AppUser> {
  const roles =
    assigned !== undefined
      ? assigned
      : user.roles && user.roles.length > 0
        ? user.roles
        : await fetchAssignedRoles(user.id);
  return mapCrmUserToAppUser(user, roles[0]);
}

export async function fetchUser(id: string): Promise<AppUser> {
  const data = await fetchUserDirectory();
  const extras = getAllUserProfileExtras();
  const user = data.find((item) => item.id === id);
  if (!user) {
    throw Object.assign(new Error("Usuário não encontrado"), {
      apiError: {
        status: 404,
        code: "USER_NOT_FOUND",
        message: "Usuário não encontrado",
      },
    });
  }
  return toAppUser(
    {
      id: user.id,
      name: user.name,
      email: user.email ?? "",
      status: user.status ?? "ACTIVE",
      is_owner: user.is_owner,
      phone: user.phone?.trim() || extras[user.id]?.phone,
      job_title: user.job_title?.trim() || extras[user.id]?.team,
      created_at: user.created_at,
    },
    user.roles,
  );
}

export async function fetchUsers() {
  const data = await fetchUserDirectory();
  const extras = getAllUserProfileExtras();
  return mapWithConcurrency(data, 2, (user) =>
    toAppUser(
      {
        id: user.id,
        name: user.name,
        email: user.email ?? "",
        status: user.status ?? "ACTIVE",
        is_owner: user.is_owner,
        phone: user.phone?.trim() || extras[user.id]?.phone,
        job_title: user.job_title?.trim() || extras[user.id]?.team,
        created_at: user.created_at,
      },
      user.roles ?? [],
    ),
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
    const roles = await fetchRoles().catch(() => [] as CrmRole[]);
    const roleId = await roleIdFor(values.role, roles);
    if (roleId) {
      await api.put(companyPath(`/users/${id}/roles`), { role_id: roleId });
    }
  }
  if (values.status === "Inativo") {
    await api.post(companyPath(`/users/${id}/deactivate`));
  }
  const data = await fetchUserDirectory();
  seedUserDirectory(data);
  const user = data.find((item) => item.id === id);
  const cached = getUserProfileExtras(id);
  if (!user) {
    // Soft-delete remove o usuário da listagem — ainda devolvemos o estado local.
    return mapCrmUserToAppUser({
      id,
      name: values.name ?? "",
      email: "",
      status: values.status === "Inativo" ? "INACTIVE" : "ACTIVE",
      phone: values.phone ?? cached?.phone,
      job_title: values.team ?? cached?.team,
    });
  }
  return toAppUser(
    {
      id: user.id,
      name: values.name ?? user.name,
      email: user.email ?? "",
      status: user.status ?? "ACTIVE",
      is_owner: user.is_owner,
      phone: values.phone ?? cached?.phone,
      job_title: values.team ?? cached?.team,
      created_at: user.created_at,
      roles: user.roles,
    },
    user.roles,
  );
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
