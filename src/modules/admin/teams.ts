import { api, getApiError } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import type { AppUser } from "./services";
import { getUserProfileExtras, saveUserProfileExtras } from "./user-profile-extras";

export const PREDEFINED_TEAM_NAMES = [
  "Comercial",
  "Gestor",
  "Operação",
  "Marketing",
] as const;

const LEGACY_TEAM_CACHE_KEYS = [
  "cypherus.ops.knownTeams.v2",
  "cypherus.ops.extraTeamNames.v1",
  "cypherus.ops.orgSnapshot.v1",
] as const;

function clearLegacyTeamCache() {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_TEAM_CACHE_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.sessionStorage.removeItem("cypherus.ops.knownTeams");
  } catch {
    /* ignore */
  }
}

clearLegacyTeamCache();

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

export const TEAM_NOT_REGISTERED_MEMBERS_MESSAGE =
  "Este time não está cadastrado ou foi removido. Cadastre um time e vincule gestores, supervisores e funcionários.";

export const TEAM_EMPTY_MEMBERS_MESSAGE =
  "Este time ainda não possui gestores, supervisores ou funcionários. Vincule usuários para começar.";

export type TeamMembersList = {
  items: CrmTeamMember[];
  message: string | null;
};

function normalizeMember(raw: unknown, fallbackTeamId: string): CrmTeamMember | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<CrmTeamMember>;
  if (typeof item.user_id !== "string" || !item.user_id.trim()) return null;
  return {
    team_id:
      typeof item.team_id === "string" && item.team_id.trim() ? item.team_id : fallbackTeamId,
    user_id: item.user_id,
    is_leader: Boolean(item.is_leader),
    joined_at: item.joined_at,
  };
}

/** GET /teams/{id}/members: `{ items, message }` — message null quando há membros. */
export function parseTeamMembersPayload(raw: unknown, teamId = ""): TeamMembersList {
  if (Array.isArray(raw)) {
    return {
      items: raw
        .map((item) => normalizeMember(item, teamId))
        .filter((item): item is CrmTeamMember => Boolean(item)),
      message: null,
    };
  }
  if (!raw || typeof raw !== "object") {
    return { items: [], message: null };
  }
  const payload = raw as { items?: unknown; message?: unknown };
  const items = Array.isArray(payload.items)
    ? payload.items
        .map((item) => normalizeMember(item, teamId))
        .filter((item): item is CrmTeamMember => Boolean(item))
    : [];
  const message =
    typeof payload.message === "string" && payload.message.trim()
      ? payload.message.trim()
      : null;
  return { items, message };
}

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
  /** Colaboradores reportando direto ao owner (membros do time raiz). */
  ownerCollaborators: OrgTreeCollaborator[];
  unassigned: AppUser[];
};

export type ManagerExitTarget =
  | { kind: "manager"; teamId: string }
  | { kind: "owner"; ownerId: string };

function normalizeTeam(raw: Partial<CrmTeam> & { id: string }): CrmTeam {
  return {
    id: raw.id,
    company_id: String(raw.company_id ?? ""),
    parent_team_id: raw.parent_team_id ?? null,
    name: raw.name ?? "Time",
    manager_user_id: raw.manager_user_id ?? null,
    is_active: raw.is_active !== false,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

/** GET /teams (e membros) pode 404 USER_NOT_FOUND sem times — não é falha da árvore. */
function isTeamsUserNotFound(error: unknown) {
  const parsed = getApiError(error);
  return parsed.status === 404 && parsed.code === "USER_NOT_FOUND";
}

function conflictTeamId(error: unknown): string | null {
  const parsed = getApiError(error);
  if (parsed.status !== 409 && parsed.code !== "CONFLICT") return null;
  const details = parsed.details;
  if (!details || typeof details !== "object") return null;
  const teamId = (details as { team_id?: unknown }).team_id;
  return typeof teamId === "string" && teamId ? teamId : null;
}

async function syncUserJobTitle(userId: string, teamName: string) {
  const name = teamName.trim().slice(0, 120);
  if (!userId || !name) return;
  await api.patch(companyPath(`/users/${userId}`), { job_title: name }).catch(() => undefined);
  const previous = getUserProfileExtras(userId);
  saveUserProfileExtras(userId, { phone: previous?.phone ?? "", team: name });
}

export function teamNameOptions(existing: CrmTeam[] = [], extra: string[] = []): string[] {
  const byLower = new Map<string, string>();
  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!byLower.has(key)) byLower.set(key, trimmed);
  };

  for (const team of existing) {
    if (team.is_active) add(team.name);
  }
  for (const name of extra) add(name);

  const result: string[] = [];
  const used = new Set<string>();
  for (const name of PREDEFINED_TEAM_NAMES) {
    if (!byLower.has(name.toLowerCase())) continue;
    result.push(name);
    used.add(name.toLowerCase());
  }
  const rest = Array.from(byLower.values())
    .filter((name) => !used.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  return [...result, ...rest];
}

export function matchTeamName(name: string, options: string[]): string | undefined {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return undefined;
  return options.find((item) => item.toLowerCase() === trimmed);
}

export type NewTeamNameResult =
  | { ok: true; name: string }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "duplicate"; existing: string };

/** Valida um nome digitado em “+ Adicionar time” sem apagar o texto. */
export function parseNewTeamName(input: string, existingNames: string[]): NewTeamNameResult {
  const name = input.trim();
  if (!name) return { ok: false, reason: "empty" };
  const existing = matchTeamName(name, existingNames);
  if (existing) return { ok: false, reason: "duplicate", existing };
  return { ok: true, name };
}

/** Time já tem gestor (além do owner) — útil para marcar “em uso” na UI. */
export function isTeamInUse(team: CrmTeam, ownerId?: string | null): boolean {
  if (!team.is_active || !team.manager_user_id) return false;
  if (ownerId && team.manager_user_id === ownerId) return false;
  return true;
}

export function teamNamesInUse(teams: CrmTeam[], ownerId?: string | null): Set<string> {
  const used = new Set<string>();
  for (const team of teams) {
    if (isTeamInUse(team, ownerId)) used.add(team.name.trim().toLowerCase());
  }
  return used;
}

export async function fetchTeams(): Promise<CrmTeam[]> {
  const { data } = await api.get<CrmTeam[] | null>(companyPath("/teams"));
  return Array.isArray(data) ? data.map((team) => normalizeTeam(team)) : [];
}

/** Lista times da API. USER_NOT_FOUND vira lista vazia — a árvore ainda mostra o owner. */
export async function fetchTeamsResilient(_ownerId?: string): Promise<{
  teams: CrmTeam[];
  recoveredFromConflict: boolean;
  listFailed: boolean;
}> {
  try {
    const teams = await fetchTeams();
    return { teams, recoveredFromConflict: false, listFailed: false };
  } catch (error) {
    if (!isTeamsUserNotFound(error)) throw error;
    return {
      teams: [],
      recoveredFromConflict: false,
      listFailed: true,
    };
  }
}

export async function createTeam(payload: {
  name: string;
  parent_team_id?: string | null;
  manager_user_id?: string | null;
}): Promise<CrmTeam> {
  const { data } = await api.post<CrmTeam>(companyPath("/teams"), payload);
  return normalizeTeam(data);
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
  return normalizeTeam(data);
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMembersList> {
  try {
    const { data } = await api.get<unknown>(companyPath(`/teams/${teamId}/members`));
    return parseTeamMembersPayload(data, teamId);
  } catch (error) {
    const parsed = getApiError(error);
    if (parsed.status === 404) {
      return { items: [], message: TEAM_NOT_REGISTERED_MEMBERS_MESSAGE };
    }
    throw error;
  }
}

export async function upsertTeamMember(
  teamId: string,
  payload: { user_id: string; is_leader?: boolean },
): Promise<CrmTeamMember> {
  const { data } = await api.put<CrmTeamMember>(companyPath(`/teams/${teamId}/members`), {
    user_id: payload.user_id,
    is_leader: payload.is_leader ?? false,
  });
  const member: CrmTeamMember = {
    team_id: teamId,
    user_id: data?.user_id ?? payload.user_id,
    is_leader: Boolean(data?.is_leader ?? payload.is_leader),
    joined_at: data?.joined_at,
  };
  return member;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<CrmTeamMember[]> {
  try {
    const { data, status } = await api.delete<CrmTeamMember[] | null>(
      companyPath(`/teams/${teamId}/members/${userId}`),
    );
    if (status === 204 || data == null) return [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    const parsed = getApiError(error);
    if (parsed.status === 204) return [];
    throw error;
  }
}

export async function ensureRootTeam(ownerId: string): Promise<CrmTeam> {
  const { teams } = await fetchTeamsResilient(ownerId);
  const active = teams.filter((team) => team.is_active);
  const root =
    active.find((team) => !team.parent_team_id && team.manager_user_id === ownerId) ??
    active.find((team) => !team.parent_team_id && team.name.toLowerCase() === "empresa") ??
    active.find((team) => !team.parent_team_id);

  if (!root) {
    try {
      return await createTeam({ name: "Empresa", manager_user_id: ownerId });
    } catch (error) {
      const teamId = conflictTeamId(error);
      if (teamId) {
        return updateTeam(teamId, { manager_user_id: ownerId, is_active: true });
      }
      throw error;
    }
  }
  if (!root.manager_user_id || root.manager_user_id !== ownerId) {
    return updateTeam(root.id, { manager_user_id: ownerId });
  }
  return root;
}

/**
 * Monta membros da árvore a partir da lista já carregada (users + teams).
 * Não dispara GET /teams/{id}/members.
 */
export function inferMembersFromUsers(
  users: AppUser[],
  teams: CrmTeam[],
  snapshot: Record<string, CrmTeamMember[]> = {},
): Record<string, CrmTeamMember[]> {
  const result: Record<string, CrmTeamMember[]> = {};
  const placed = new Set<string>();

  for (const team of teams) {
    const members = [...(snapshot[team.id] ?? [])];
    result[team.id] = members;
    for (const member of members) placed.add(member.user_id);
  }

  const add = (teamId: string, member: CrmTeamMember) => {
    const current = result[teamId] ?? [];
    if (current.some((item) => item.user_id === member.user_id)) return;
    result[teamId] = [...current, member];
    placed.add(member.user_id);
  };

  for (const team of teams) {
    if (!team.manager_user_id) continue;
    add(team.id, {
      team_id: team.id,
      user_id: team.manager_user_id,
      is_leader: true,
    });
  }

  const teamByName = new Map<string, CrmTeam>();
  for (const team of teams) {
    if (!team.is_active) continue;
    const key = team.name.trim().toLowerCase();
    if (key && !teamByName.has(key)) teamByName.set(key, team);
  }

  for (const user of users) {
    if (user.status === "Inativo" || user.isOwner || placed.has(user.id)) continue;
    const teamName = user.team.trim().toLowerCase();
    if (!teamName) continue;
    const team = teamByName.get(teamName);
    if (!team) continue;
    add(team.id, {
      team_id: team.id,
      user_id: user.id,
      is_leader: user.role === "Gestor" || team.manager_user_id === user.id,
    });
  }

  return result;
}

/** Preenche gestor a partir de GET /teams/{id}/members quando a listagem omite manager_user_id. */
export function hydrateTeamManagers(
  teams: CrmTeam[],
  membersByTeamId: Record<string, CrmTeamMember[]>,
): CrmTeam[] {
  return teams.map((team) => {
    if (team.manager_user_id) return team;
    const leader = (membersByTeamId[team.id] ?? []).find((member) => member.is_leader);
    if (!leader?.user_id) return team;
    return { ...team, manager_user_id: leader.user_id };
  });
}

/** Membros da API (+ inferência por cargo) — usado ao abrir a aba Árvore. */
export function membersForOrgTree(
  users: AppUser[],
  teams: CrmTeam[],
  membersByTeamId: Record<string, CrmTeamMember[]> = {},
): Record<string, CrmTeamMember[]> {
  return inferMembersFromUsers(users, teams, membersByTeamId);
}

export async function fetchTeamsWithMembers(ownerId?: string): Promise<{
  teams: CrmTeam[];
  membersByTeamId: Record<string, CrmTeamMember[]>;
  messagesByTeamId: Record<string, string>;
  listFailed: boolean;
  recoveredFromConflict: boolean;
}> {
  const { teams, listFailed, recoveredFromConflict } = await fetchTeamsResilient(ownerId);
  const liveTeamIds = new Set(teams.map((team) => team.id));
  const visibleTeams = teams.filter((team) => team.is_active);
  const teamsToLoad = listFailed ? visibleTeams : visibleTeams.filter((team) => liveTeamIds.has(team.id));

  const memberLists = await mapWithConcurrency(teamsToLoad, 3, async (team) => ({
    teamId: team.id,
    list: await fetchTeamMembers(team.id),
  }));

  const membersByTeamId: Record<string, CrmTeamMember[]> = {};
  const messagesByTeamId: Record<string, string> = {};
  for (const item of memberLists) {
    membersByTeamId[item.teamId] = item.list.items;
    if (item.list.message) messagesByTeamId[item.teamId] = item.list.message;
  }

  return {
    teams: hydrateTeamManagers(visibleTeams, membersByTeamId),
    membersByTeamId,
    messagesByTeamId,
    listFailed,
    recoveredFromConflict,
  };
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
    activeUsers.find((user) => user.role === "Administrador") ??
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

  const ownerCollaborators: OrgTreeCollaborator[] = [];
  if (rootTeam) {
    const rootMembers = membersByTeamId[rootTeam.id] ?? [];
    for (const member of rootMembers) {
      if (owner && member.user_id === owner.id) continue;
      if (member.is_leader && owner && member.user_id === owner.id) continue;
      if (managers.some((node) => node.user.id === member.user_id)) continue;
      const user = byId.get(member.user_id);
      if (!user) continue;
      ownerCollaborators.push({ kind: "collaborator", user, teamId: rootTeam.id });
    }
    ownerCollaborators.sort((a, b) => a.user.name.localeCompare(b.user.name, "pt-BR"));
  }

  const assignedIds = new Set<string>();
  if (owner) assignedIds.add(owner.id);
  for (const node of managers) {
    assignedIds.add(node.user.id);
    for (const collab of node.collaborators) {
      assignedIds.add(collab.user.id);
    }
  }
  for (const collab of ownerCollaborators) {
    assignedIds.add(collab.user.id);
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
    ownerCollaborators,
    unassigned,
  };
}

async function resolveTeamByName(params: {
  name: string;
  ownerId: string;
  parentTeamId: string;
  managerUserId: string;
}): Promise<CrmTeam> {
  const name = params.name.trim().slice(0, 120);
  const { teams } = await fetchTeamsResilient(params.ownerId);
  const existing = teams.find(
    (team) => team.is_active && team.name.toLowerCase() === name.toLowerCase(),
  );

  if (existing) {
    return updateTeam(existing.id, {
      parent_team_id: params.parentTeamId,
      manager_user_id: params.managerUserId,
      is_active: true,
    });
  }
  try {
    return await createTeam({
      name,
      parent_team_id: params.parentTeamId,
      manager_user_id: params.managerUserId,
    });
  } catch (error) {
    const teamId = conflictTeamId(error);
    if (teamId) {
      return updateTeam(teamId, {
        parent_team_id: params.parentTeamId,
        manager_user_id: params.managerUserId,
        is_active: true,
      });
    }
    // Não cria mais “Time (hash)” — evita duplicar times com sufixo.
    throw new Error(
      `O time “${name}” já existe no CRM, mas não foi possível obter o ID. Tente outro nome ou recarregue a página.`,
    );
  }
}

export async function linkManagerToOrg(params: {
  ownerId: string;
  manager: AppUser;
  teamName: string;
}): Promise<CrmTeam> {
  const root = await ensureRootTeam(params.ownerId);
  const teamName = params.teamName.trim();
  if (!teamName) throw new Error("Selecione ou informe o time.");

  const { teams } = await fetchTeamsResilient(params.ownerId);
  const alreadyManager = teams.find(
    (team) => team.is_active && team.manager_user_id === params.manager.id,
  );
  if (alreadyManager && alreadyManager.name.toLowerCase() !== teamName.toLowerCase()) {
    throw new Error(`Este usuário já é gestor do time “${alreadyManager.name}”.`);
  }

  const takenByOther = teams.find(
    (team) =>
      team.is_active &&
      team.name.toLowerCase() === teamName.toLowerCase() &&
      team.manager_user_id &&
      team.manager_user_id !== params.manager.id &&
      team.manager_user_id !== params.ownerId,
  );
  if (takenByOther) {
    throw new Error(`O time “${teamName}” já tem outro gestor. Escolha outro time ou troque o gestor.`);
  }

  const team = alreadyManager
    ? await updateTeam(alreadyManager.id, {
        name: teamName.slice(0, 120),
        parent_team_id: root.id,
        manager_user_id: params.manager.id,
        is_active: true,
      })
    : await resolveTeamByName({
        name: teamName,
        ownerId: params.ownerId,
        parentTeamId: root.id,
        managerUserId: params.manager.id,
      });

  await upsertTeamMember(team.id, {
    user_id: params.manager.id,
    is_leader: true,
  }).catch(() => undefined);
  await syncUserJobTitle(params.manager.id, team.name);

  return team;
}

export async function assignCollaboratorToManager(params: {
  collaboratorId: string;
  managerTeamId: string;
  previousTeamId?: string | null;
  teamName?: string;
}): Promise<void> {
  if (params.previousTeamId && params.previousTeamId !== params.managerTeamId) {
    await removeTeamMember(params.previousTeamId, params.collaboratorId).catch(() => undefined);
  }
  await upsertTeamMember(params.managerTeamId, {
    user_id: params.collaboratorId,
    is_leader: false,
  });
  if (params.teamName) {
    await syncUserJobTitle(params.collaboratorId, params.teamName);
  }
}

/** Move colaboradores de um time de gestor para outro gestor ou para o owner (time raiz). */
export async function transferManagerCollaborators(params: {
  fromTeamId: string;
  collaboratorIds: string[];
  target: ManagerExitTarget;
}): Promise<CrmTeam> {
  let targetTeamId = params.target.kind === "manager" ? params.target.teamId : "";

  if (params.target.kind === "owner") {
    const root = await ensureRootTeam(params.target.ownerId);
    targetTeamId = root.id;
  }

  if (!targetTeamId) throw new Error("Selecione o destino dos colaboradores.");
  if (targetTeamId === params.fromTeamId) {
    throw new Error("Escolha um destino diferente do time atual.");
  }

  for (const userId of params.collaboratorIds) {
    await assignCollaboratorToManager({
      collaboratorId: userId,
      managerTeamId: targetTeamId,
      previousTeamId: params.fromTeamId,
    });
  }

  // Libera o time antigo (sem gestor) para não manter vínculo órfão.
  return updateTeam(params.fromTeamId, { manager_user_id: null });
}

export async function findManagedTeamForUser(
  userId: string,
  ownerId?: string,
  cachedTeams?: CrmTeam[],
): Promise<{ team: CrmTeam; collaboratorIds: string[] } | null> {
  const teams = (cachedTeams ?? (await fetchTeamsResilient(ownerId)).teams).filter(
    (item) => item.is_active,
  );
  const fromManagerId = teams.find((item) => item.manager_user_id === userId);
  const inspect = async (team: CrmTeam) => {
    const list = await fetchTeamMembers(team.id);
    const collaboratorIds = list.items
      .filter((member) => member.user_id !== userId && !member.is_leader)
      .map((member) => member.user_id);
    return { team, collaboratorIds, items: list.items };
  };

  if (fromManagerId) {
    const found = await inspect(fromManagerId);
    return { team: found.team, collaboratorIds: found.collaboratorIds };
  }

  const memberLists = await mapWithConcurrency(teams, 3, inspect);
  const found = memberLists.find((entry) =>
    entry.items.some((member) => member.user_id === userId && member.is_leader),
  );
  if (!found) return null;
  return {
    team: { ...found.team, manager_user_id: userId },
    collaboratorIds: found.collaboratorIds,
  };
}

/** Garante que um time com o nome exista (para o formulário de usuário). */
export async function ensureTeamNamed(params: {
  name: string;
  ownerId?: string;
}): Promise<CrmTeam> {
  const name = params.name.trim().slice(0, 120);
  if (!name) throw new Error("Informe o nome do time.");
  const { teams } = await fetchTeamsResilient(params.ownerId);
  const existing = teams.find(
    (team) => team.is_active && team.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) return existing;

  const root = params.ownerId ? await ensureRootTeam(params.ownerId) : null;
  try {
    return await createTeam({
      name,
      parent_team_id: root?.id ?? null,
      manager_user_id: null,
    });
  } catch (error) {
    const teamId = conflictTeamId(error);
    if (teamId) {
      return updateTeam(teamId, { is_active: true, parent_team_id: root?.id ?? undefined });
    }
    throw error;
  }
}
