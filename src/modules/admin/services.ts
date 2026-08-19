import { api } from "@/lib/api/client";
import { mapRoleCode, roleCodeFromUi } from "@/lib/auth/mappers";
import type { RoleName } from "@/lib/auth/permissions";
import { companyPath } from "@/lib/auth/session";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { seedUserDirectory } from "@/modules/users/directory";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: RoleName;
  team: string;
  status: "Ativo" | "Inativo";
  mustChangePassword?: boolean;
};

type CrmUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  is_owner?: boolean;
};

type CrmRole = {
  id: string;
  code: string;
  name: string;
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
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: "",
    role: mapRoleCode(roleCode, user.is_owner),
    team: "",
    status: user.status === "ACTIVE" ? "Ativo" : "Inativo",
  };
}

async function toAppUser(user: CrmUser): Promise<AppUser> {
  const { data: assigned } = await api
    .get<CrmRole[]>(companyPath(`/users/${user.id}/roles`))
    .catch(() => ({ data: [] as CrmRole[] }));
  return mapCrmUserToAppUser(user, assigned[0]?.code);
}

export async function fetchUsers() {
  const { data } = await api.get<CrmUser[]>(companyPath("/users"));
  seedUserDirectory(data);
  return mapWithConcurrency(data, 2, (user) => toAppUser(user));
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
  if (values.phone || values.team) {
    await api.patch(companyPath(`/users/${created.id}`), {
      phone: values.phone,
      job_title: values.team,
    });
  }
  const appUser = await toAppUser(created);
  return { ...appUser, invitationToken: data.invitation_token };
}

export async function updateUser(id: string, values: Partial<AppUser>) {
  await api.patch(companyPath(`/users/${id}`), {
    name: values.name,
    phone: values.phone,
    job_title: values.team,
  });
  if (values.role) {
    const roles = await fetchRoles();
    const roleId = await roleIdFor(values.role, roles);
    if (roleId) await api.put(companyPath(`/users/${id}/roles`), { role_id: roleId });
  }
  if (values.status === "Inativo") {
    await api.post(companyPath(`/users/${id}/deactivate`));
  }
  const { data } = await api.get<CrmUser[]>(companyPath("/users"));
  seedUserDirectory(data);
  const user = data.find((item) => item.id === id);
  if (!user) throw new Error("Usuário não encontrado após atualizar.");
  return toAppUser(user);
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
