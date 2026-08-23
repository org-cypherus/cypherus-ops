import { api, getApiError } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import type { AppUser } from "./services";

export const PREDEFINED_TEAM_NAMES = [
  "Comercial",
  "SDR",
  "Closers",
  "CS",
  "Marketing",
  "Operações",
] as const;

const KNOWN_TEAMS_STORAGE_KEY = "cypherus.ops.knownTeams.v2";
const ORG_SNAPSHOT_KEY = "cypherus.ops.orgSnapshot.v1";

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

type OrgSnapshot = {
  teams: CrmTeam[];
  membersByTeamId: Record<string, CrmTeamMember[]>;
  updatedAt: string;
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

function isTeamsPresentationError(error: unknown) {
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

function readKnownTeams(): CrmTeam[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.localStorage.getItem(KNOWN_TEAMS_STORAGE_KEY) ??
      window.sessionStorage.getItem("cypherus.ops.knownTeams");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Partial<CrmTeam> & { id: string } =>
        Boolean(item && typeof item === "object" && typeof (item as CrmTeam).id === "string"),
      )
      .map((item) => normalizeTeam(item));
  } catch {
    return [];
  }
}

function writeKnownTeams(teams: CrmTeam[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KNOWN_TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch {
    /* ignore quota */
  }
}

/** Mantém times criados/atualizados mesmo quando GET /teams falha no CRM. */
export function rememberTeam(team: CrmTeam) {
  const normalized = normalizeTeam(team);
  const current = readKnownTeams().filter((item) => item.id !== normalized.id);
  current.push(normalized);
  writeKnownTeams(current);
  const snap = readOrgSnapshot();
  writeOrgSnapshot({
    teams: mergeTeams(snap?.teams ?? [], [normalized]),
    membersByTeamId: snap?.membersByTeamId ?? {},
    updatedAt: new Date().toISOString(),
  });
}

function readOrgSnapshot(): OrgSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ORG_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrgSnapshot;
    if (!parsed || !Array.isArray(parsed.teams)) return null;
    return {
      teams: parsed.teams.map((team) => normalizeTeam(team)),
      membersByTeamId: parsed.membersByTeamId ?? {},
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return null;
  }
}

function writeOrgSnapshot(snapshot: OrgSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORG_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

function rememberMembers(teamId: string, members: CrmTeamMember[]) {
  const snap = readOrgSnapshot() ?? {
    teams: readKnownTeams(),
    membersByTeamId: {},
    updatedAt: new Date().toISOString(),
  };
  writeOrgSnapshot({
    ...snap,
    membersByTeamId: { ...snap.membersByTeamId, [teamId]: members },
    updatedAt: new Date().toISOString(),
  });
}

function mergeMembers(
  primary: CrmTeamMember[],
  secondary: CrmTeamMember[],
): CrmTeamMember[] {
  const byUser = new Map<string, CrmTeamMember>();
  for (const member of secondary) byUser.set(member.user_id, member);
  for (const member of primary) byUser.set(member.user_id, member);
  return Array.from(byUser.values());
}

function mergeTeams(...lists: CrmTeam[][]): CrmTeam[] {
  const byId = new Map<string, CrmTeam>();
  for (const list of lists) {
    for (const team of list) {
      const next = normalizeTeam(team);
      const prev = byId.get(next.id);
      if (!prev) {
        byId.set(next.id, next);
        continue;
      }
      // Se a API zerar o gestor (apresentação), preserva o gestor conhecido localmente.
      byId.set(next.id, {
        ...prev,
        ...next,
        manager_user_id: next.manager_user_id ?? prev.manager_user_id,
        parent_team_id:
          next.parent_team_id !== undefined ? next.parent_team_id : prev.parent_team_id,
        name: next.name || prev.name,
      });
    }
  }
  return Array.from(byId.values());
}

export function teamNameOptions(existing: CrmTeam[] = []): string[] {
  const names = new Set<string>(PREDEFINED_TEAM_NAMES);
  for (const team of existing) {
    if (team.is_active && team.name.trim()) names.add(team.name.trim());
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
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

/** Lista times; se a API cair por gestor soft-deleted, recupera via cache + heal de seeds. */
export async function fetchTeamsResilient(ownerId?: string): Promise<{
  teams: CrmTeam[];
  recoveredFromConflict: boolean;
  listFailed: boolean;
}> {
  const remembered = readKnownTeams();
  try {
    const teams = await fetchTeams();
    const merged = mergeTeams(teams, remembered);
    for (const team of teams) rememberTeam(team);
    return { teams: merged, recoveredFromConflict: false, listFailed: false };
  } catch (error) {
    if (!isTeamsPresentationError(error)) throw error;
    const recovered = await recoverTeamsViaNameConflict(ownerId);
    try {
      const teams = await fetchTeams();
      const merged = mergeTeams(teams, recovered, remembered);
      for (const team of teams) rememberTeam(team);
      return { teams: merged, recoveredFromConflict: true, listFailed: false };
    } catch {
      return {
        teams: mergeTeams(recovered, remembered),
        recoveredFromConflict: recovered.length > 0 || remembered.length > 0,
        listFailed: true,
      };
    }
  }
}

/**
 * Quando GET /teams falha (gestor soft-deleted em time seed), reaproveita o cache local
 * e tenta GET individual — sem sobrescrever gestores já vinculados.
 */
async function recoverTeamsViaNameConflict(ownerId?: string): Promise<CrmTeam[]> {
  const remembered = readKnownTeams();
  const found: CrmTeam[] = [];
  const seen = new Set<string>();

  async function pushTeam(team: CrmTeam) {
    if (seen.has(team.id)) return;
    seen.add(team.id);
    rememberTeam(team);
    found.push(team);
  }

  for (const cached of remembered) {
    try {
      const { data } = await api.get<CrmTeam>(companyPath(`/teams/${cached.id}`));
      if (data?.id) {
        const normalized = normalizeTeam(data);
        if (!normalized.manager_user_id && cached.manager_user_id) {
          normalized.manager_user_id = cached.manager_user_id;
        }
        await pushTeam(normalized);
        continue;
      }
    } catch {
      /* mantém snapshot local */
    }
    await pushTeam(cached);
  }

  // Raiz conhecida / Empresa — só garante owner na raiz, sem tocar em times de gestores.
  const knownRootIds = ["01a02bad-7911-7238-8e06-93002e9f37d0"];
  for (const id of knownRootIds) {
    if (seen.has(id)) continue;
    try {
      if (ownerId) {
        await pushTeam(
          normalizeTeam(await updateTeam(id, { manager_user_id: ownerId, is_active: true })),
        );
      } else {
        const { data } = await api.get<CrmTeam>(companyPath(`/teams/${id}`));
        if (data?.id) await pushTeam(normalizeTeam(data));
      }
    } catch {
      /* ignore */
    }
  }

  const hasRoot = found.some((team) => !team.parent_team_id);
  if (!hasRoot && ownerId) {
    try {
      await pushTeam(await createTeam({ name: "Empresa", manager_user_id: ownerId }));
    } catch (error) {
      const teamId = conflictTeamId(error);
      if (teamId) {
        try {
          await pushTeam(
            normalizeTeam(await updateTeam(teamId, { manager_user_id: ownerId, is_active: true })),
          );
        } catch {
          /* ignore */
        }
      }
    }
  }

  // Tenta destravar a listagem só em times Seed (não reatribui gestores de times de negócio).
  for (const seedName of ["Comercial Seed", "SDR Seed", "Closers Seed", "CS Seed"]) {
    if (found.some((team) => team.name.toLowerCase() === seedName.toLowerCase())) continue;
    try {
      await createTeam({ name: seedName, manager_user_id: ownerId ?? null });
    } catch (error) {
      const teamId = conflictTeamId(error);
      if (!teamId || !ownerId) continue;
      try {
        // Owner vivo no lugar do gestor soft-deleted desbloqueia o present_teams na HML antiga.
        await pushTeam(
          normalizeTeam(await updateTeam(teamId, { manager_user_id: ownerId, is_active: true })),
        );
      } catch {
        /* ignore */
      }
    }
  }

  return found;
}

export async function createTeam(payload: {
  name: string;
  parent_team_id?: string | null;
  manager_user_id?: string | null;
}): Promise<CrmTeam> {
  const { data } = await api.post<CrmTeam>(companyPath("/teams"), payload);
  const team = normalizeTeam(data);
  rememberTeam(team);
  return team;
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
  const previous =
    readKnownTeams().find((team) => team.id === teamId) ??
    readOrgSnapshot()?.teams.find((team) => team.id === teamId);

  try {
    const { data } = await api.patch<CrmTeam>(companyPath(`/teams/${teamId}`), payload);
    const team = normalizeTeam(data);
    rememberTeam(team);
    return team;
  } catch (error) {
    if (isTeamsPresentationError(error)) {
      const optimistic = normalizeTeam({
        id: teamId,
        company_id: previous?.company_id ?? "",
        parent_team_id:
          payload.parent_team_id !== undefined
            ? payload.parent_team_id
            : (previous?.parent_team_id ?? null),
        name: payload.name ?? previous?.name ?? "Time",
        manager_user_id:
          payload.manager_user_id !== undefined
            ? payload.manager_user_id
            : (previous?.manager_user_id ?? null),
        is_active: payload.is_active ?? previous?.is_active ?? true,
      });
      rememberTeam(optimistic);
      return optimistic;
    }
    throw error;
  }
}

export async function fetchTeamMembers(teamId: string): Promise<CrmTeamMember[]> {
  const cached = readOrgSnapshot()?.membersByTeamId[teamId] ?? [];
  try {
    const { data } = await api.get<CrmTeamMember[] | null>(companyPath(`/teams/${teamId}/members`));
    const members = Array.isArray(data) ? data : [];
    const merged = mergeMembers(members, cached);
    rememberMembers(teamId, merged);
    return merged;
  } catch (error) {
    if (isTeamsPresentationError(error)) return cached;
    throw error;
  }
}

export async function upsertTeamMember(
  teamId: string,
  payload: { user_id: string; is_leader?: boolean },
): Promise<CrmTeamMember> {
  const optimistic: CrmTeamMember = {
    team_id: teamId,
    user_id: payload.user_id,
    is_leader: payload.is_leader ?? false,
  };
  try {
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
    const current = readOrgSnapshot()?.membersByTeamId[teamId] ?? [];
    rememberMembers(
      teamId,
      mergeMembers(
        [member],
        current.filter((item) => item.user_id !== payload.user_id),
      ),
    );
    return member;
  } catch (error) {
    if (isTeamsPresentationError(error)) {
      const current = readOrgSnapshot()?.membersByTeamId[teamId] ?? [];
      rememberMembers(
        teamId,
        mergeMembers(
          [optimistic],
          current.filter((item) => item.user_id !== payload.user_id),
        ),
      );
      return optimistic;
    }
    throw error;
  }
}

export async function removeTeamMember(teamId: string, userId: string): Promise<CrmTeamMember[]> {
  const fallback = () => {
    const members = (readOrgSnapshot()?.membersByTeamId[teamId] ?? []).filter(
      (item) => item.user_id !== userId,
    );
    rememberMembers(teamId, members);
    return members;
  };

  try {
    const { data, status } = await api.delete<CrmTeamMember[] | null>(
      companyPath(`/teams/${teamId}/members/${userId}`),
    );
    if (status === 204 || data == null) return fallback();
    const members = Array.isArray(data) ? data : fallback();
    rememberMembers(teamId, members);
    return members;
  } catch (error) {
    if (isTeamsPresentationError(error)) return fallback();
    const parsed = getApiError(error);
    if (parsed.status === 204 || parsed.status === 0) return fallback();
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

export async function fetchTeamsWithMembers(ownerId?: string): Promise<{
  teams: CrmTeam[];
  membersByTeamId: Record<string, CrmTeamMember[]>;
  listFailed: boolean;
  recoveredFromConflict: boolean;
}> {
  const snapshot = readOrgSnapshot();
  const { teams, listFailed, recoveredFromConflict } = await fetchTeamsResilient(ownerId);
  const mergedTeams = mergeTeams(teams, snapshot?.teams ?? [], readKnownTeams()).filter(
    (team) => team.is_active,
  );

  const memberLists = await mapWithConcurrency(mergedTeams, 3, async (team) => ({
    teamId: team.id,
    members: await fetchTeamMembers(team.id),
  }));

  const membersByTeamId: Record<string, CrmTeamMember[]> = {
    ...(snapshot?.membersByTeamId ?? {}),
  };
  for (const item of memberLists) {
    membersByTeamId[item.teamId] = mergeMembers(
      item.members,
      snapshot?.membersByTeamId[item.teamId] ?? [],
    );
  }

  writeOrgSnapshot({
    teams: mergedTeams,
    membersByTeamId,
    updatedAt: new Date().toISOString(),
  });
  writeKnownTeams(mergedTeams);

  return { teams: mergedTeams, membersByTeamId, listFailed, recoveredFromConflict };
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
  const existing =
    teams.find((team) => team.is_active && team.name.toLowerCase() === name.toLowerCase()) ??
    readKnownTeams().find(
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

  rememberTeam(team);
  return team;
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
): Promise<{ team: CrmTeam; collaboratorIds: string[] } | null> {
  const { teams, membersByTeamId } = await fetchTeamsWithMembers(ownerId);
  const team = teams.find((item) => item.is_active && item.manager_user_id === userId);
  if (!team) return null;
  const collaboratorIds = (membersByTeamId[team.id] ?? [])
    .filter((member) => member.user_id !== userId && !member.is_leader)
    .map((member) => member.user_id);
  return { team, collaboratorIds };
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
