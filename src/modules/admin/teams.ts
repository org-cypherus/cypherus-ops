import { api } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import type { AppUser } from "./services";

export type CrmTeam = {
  id: string;
  company_id: string;
  parent_team_id: string | null;
  name: string;
  manager_user_id: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CrmTeamMember = {
  team_id: string;
  user_id: string;
  is_leader: boolean;
  joined_at?: string;
};

export type OrgTreeCollaborator = {
  kind: "collaborator";
  user: AppUser;
  teamId: string;
};

export type OrgTreeManagerNode = {
  kind: "manager";
  user: AppUser;
  team: CrmTeam;
  collaborators: OrgTreeCollaborator[];
};

export type OrgTree = {
  owner: AppUser | null;
  rootTeam: CrmTeam | null;
  managers: OrgTreeManagerNode[];
  unassigned: AppUser[];
};

export async function fetchTeams(): Promise<CrmTeam[]> {
  const { data } = await api.get<CrmTeam[] | null>(companyPath("/teams"));
  return Array.isArray(data) ? data : [];
}

export async function createTeam(payload: {
  name: string;
  parent_team_id?: string | null;
  manager_user_id?: string | null;
}): Promise<CrmTeam> {
  const { data } = await api.post<CrmTeam>(companyPath("/teams"), payload);
  return data;
}

export async function updateTeam(
  teamId: string,
  payload: {
    name?: string;
    parent_team_id?: string | null;
    manager_user_id?: string | null;
    is_active?: boolean;
  },
): Promise<CrmTeam> {
  const { data } = await api.patch<CrmTeam>(companyPath(`/teams/${teamId}`), payload);
  return data;
}

export async function fetchTeamMembers(teamId: string): Promise<CrmTeamMember[]> {
  const { data } = await api.get<CrmTeamMember[] | null>(companyPath(`/teams/${teamId}/members`));
  return Array.isArray(data) ? data : [];
}

export async function upsertTeamMember(
  teamId: string,
  payload: { user_id: string; is_leader?: boolean },
): Promise<CrmTeamMember> {
  const { data } = await api.put<CrmTeamMember>(companyPath(`/teams/${teamId}/members`), {
    user_id: payload.user_id,
    is_leader: payload.is_leader ?? false,
  });
  return data;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<CrmTeamMember[]> {
  const { data } = await api.delete<CrmTeamMember[] | null>(
    companyPath(`/teams/${teamId}/members/${userId}`),
  );
  return Array.isArray(data) ? data : [];
}

export async function ensureRootTeam(ownerId: string): Promise<CrmTeam> {
  const teams = await fetchTeams();
  const active = teams.filter((team) => team.is_active);
  const root =
    active.find((team) => !team.parent_team_id && team.manager_user_id === ownerId) ??
    active.find((team) => !team.parent_team_id && team.name.toLowerCase() === "empresa") ??
    active.find((team) => !team.parent_team_id);

  if (!root) {
    return createTeam({ name: "Empresa", manager_user_id: ownerId });
  }
  if (!root.manager_user_id) {
    return updateTeam(root.id, { manager_user_id: ownerId });
  }
  return root;
}

export async function fetchTeamsWithMembers(): Promise<{
  teams: CrmTeam[];
  membersByTeamId: Record<string, CrmTeamMember[]>;
}> {
  const teams = await fetchTeams();
  const active = teams.filter((team) => team.is_active);
  const memberLists = await mapWithConcurrency(active, 3, async (team) => ({
    teamId: team.id,
    members: await fetchTeamMembers(team.id),
  }));
  const membersByTeamId: Record<string, CrmTeamMember[]> = {};
  for (const item of memberLists) {
    membersByTeamId[item.teamId] = item.members;
  }
  return { teams: active, membersByTeamId };
}

/**
 * Monta a árvore Owner → Gestores (manager do time) → Colaboradores (membros).
 * Times sem gestor ou com gestor = owner ficam fora dos nós de gestor (exceto raiz).
 */
export function buildOrgTree(
  users: AppUser[],
  teams: CrmTeam[],
  membersByTeamId: Record<string, CrmTeamMember[]>,
): OrgTree {
  const byId = new Map(users.map((user) => [user.id, user]));
  const activeUsers = users.filter((user) => user.status === "Ativo");
  const owner =
    activeUsers.find((user) => user.isOwner) ??
    users.find((user) => user.isOwner) ??
    null;

  const activeTeams = teams.filter((team) => team.is_active);
  const rootTeam =
    (owner
      ? activeTeams.find((team) => !team.parent_team_id && team.manager_user_id === owner.id)
      : undefined) ??
    activeTeams.find((team) => !team.parent_team_id && team.name.toLowerCase() === "empresa") ??
    activeTeams.find((team) => !team.parent_team_id) ??
    null;

  const managers: OrgTreeManagerNode[] = [];

  for (const team of activeTeams) {
    if (!team.manager_user_id) continue;
    if (owner && team.manager_user_id === owner.id) continue;
    const manager = byId.get(team.manager_user_id);
    if (!manager) continue;

    const members = membersByTeamId[team.id] ?? [];
    const collaborators: OrgTreeCollaborator[] = members
      .filter((member) => member.user_id !== team.manager_user_id && !member.is_leader)
      .map((member) => byId.get(member.user_id))
      .filter((user): user is AppUser => Boolean(user))
      .map((user) => ({ kind: "collaborator" as const, user, teamId: team.id }));

    managers.push({ kind: "manager", user: manager, team, collaborators });
  }

  managers.sort((a, b) => a.user.name.localeCompare(b.user.name, "pt-BR"));

  const assignedIds = new Set<string>();
  if (owner) assignedIds.add(owner.id);
  for (const node of managers) {
    assignedIds.add(node.user.id);
    for (const collab of node.collaborators) {
      assignedIds.add(collab.user.id);
    }
  }

  for (const team of activeTeams) {
    if (team.manager_user_id) assignedIds.add(team.manager_user_id);
    for (const member of membersByTeamId[team.id] ?? []) {
      assignedIds.add(member.user_id);
    }
  }

  const unassigned = activeUsers
    .filter((user) => !assignedIds.has(user.id))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return {
    owner,
    rootTeam,
    managers,
    unassigned,
  };
}

export async function linkManagerToOrg(params: {
  ownerId: string;
  manager: AppUser;
}): Promise<CrmTeam> {
  const root = await ensureRootTeam(params.ownerId);
  const existing = (await fetchTeams()).find(
    (team) => team.is_active && team.manager_user_id === params.manager.id,
  );
  if (existing) {
    if (existing.parent_team_id !== root.id) {
      return updateTeam(existing.id, { parent_team_id: root.id });
    }
    return existing;
  }
  const baseName = `Time ${params.manager.name}`.slice(0, 120);
  try {
    return await createTeam({
      name: baseName,
      parent_team_id: root.id,
      manager_user_id: params.manager.id,
    });
  } catch {
    return createTeam({
      name: `${baseName} (${params.manager.id.slice(0, 6)})`.slice(0, 120),
      parent_team_id: root.id,
      manager_user_id: params.manager.id,
    });
  }
}

export async function assignCollaboratorToManager(params: {
  collaboratorId: string;
  managerTeamId: string;
  previousTeamId?: string | null;
}): Promise<void> {
  if (params.previousTeamId && params.previousTeamId !== params.managerTeamId) {
    await removeTeamMember(params.previousTeamId, params.collaboratorId).catch(() => undefined);
  }
  await upsertTeamMember(params.managerTeamId, {
    user_id: params.collaboratorId,
    is_leader: false,
  });
}
