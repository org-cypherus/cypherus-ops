import { describe, expect, it } from "vitest";
import { Role } from "@/lib/auth/permissions";
import type { AppUser } from "./services";
import {
  buildOrgTree,
  hydrateTeamManagers,
  inferMembersFromUsers,
  matchTeamName,
  parseTeamMembersPayload,
  TEAM_EMPTY_MEMBERS_MESSAGE,
  TEAM_NOT_REGISTERED_MEMBERS_MESSAGE,
  teamNameOptions,
  type CrmTeam,
  type CrmTeamMember,
} from "./teams";

function user(partial: Partial<AppUser> & Pick<AppUser, "id" | "name">): AppUser {
  return {
    email: `${partial.id}@acme.com`,
    phone: "",
    role: Role.Comercial,
    team: "",
    status: "Ativo",
    ...partial,
  };
}

function team(partial: Partial<CrmTeam> & Pick<CrmTeam, "id" | "name">): CrmTeam {
  return {
    company_id: "co",
    parent_team_id: null,
    manager_user_id: null,
    is_active: true,
    ...partial,
  };
}

describe("teamNameOptions", () => {
  it("lists only names that come from the API or the current extras", () => {
    expect(teamNameOptions()).toEqual([]);
    expect(teamNameOptions([team({ id: "t1", name: "Jurídico" })], ["Suporte"])).toEqual([
      "Jurídico",
      "Suporte",
    ]);
  });

  it("keeps default teams first when they exist in the API list", () => {
    expect(
      teamNameOptions([
        team({ id: "t1", name: "Marketing" }),
        team({ id: "t2", name: "Jurídico" }),
        team({ id: "t3", name: "Comercial" }),
      ]),
    ).toEqual(["Comercial", "Marketing", "Jurídico"]);
  });

  it("does not duplicate names that match a default team", () => {
    expect(teamNameOptions([], ["comercial", "Novo"])).toEqual(["Comercial", "Novo"]);
  });

  it("matches a team name without regard to case", () => {
    expect(matchTeamName("comercial", teamNameOptions([team({ id: "t1", name: "Comercial" })]))).toBe(
      "Comercial",
    );
    expect(matchTeamName("  GESTOR ", teamNameOptions([team({ id: "t1", name: "Gestor" })]))).toBe(
      "Gestor",
    );
    expect(matchTeamName("financeiro", teamNameOptions())).toBeUndefined();
  });
});

describe("buildOrgTree", () => {
  it("builds owner → managers → collaborators and lists unassigned", () => {
    const owner = user({ id: "o1", name: "Owner", role: Role.Administrador, isOwner: true });
    const gestor = user({ id: "g1", name: "Gestor", role: Role.Gestor });
    const collab = user({ id: "c1", name: "Colab", role: Role.Comercial });
    const free = user({ id: "f1", name: "Livre", role: Role.Comercial });

    const teams: CrmTeam[] = [
      {
        id: "t-root",
        company_id: "co",
        parent_team_id: null,
        name: "Empresa",
        manager_user_id: "o1",
        is_active: true,
      },
      {
        id: "t-g1",
        company_id: "co",
        parent_team_id: "t-root",
        name: "Time Gestor",
        manager_user_id: "g1",
        is_active: true,
      },
    ];

    const membersByTeamId: Record<string, CrmTeamMember[]> = {
      "t-root": [],
      "t-g1": [{ team_id: "t-g1", user_id: "c1", is_leader: false }],
    };

    const tree = buildOrgTree([owner, gestor, collab, free], teams, membersByTeamId);

    expect(tree.owner?.id).toBe("o1");
    expect(tree.rootTeam?.id).toBe("t-root");
    expect(tree.managers).toHaveLength(1);
    expect(tree.managers[0]?.user.id).toBe("g1");
    expect(tree.managers[0]?.collaborators.map((item) => item.user.id)).toEqual(["c1"]);
    expect(tree.ownerCollaborators).toEqual([]);
    expect(tree.unassigned.map((item) => item.id)).toEqual(["f1"]);
  });

  it("keeps active collaborators when the manager is inactive or missing", () => {
    const owner = user({ id: "o1", name: "Owner", role: Role.Administrador, isOwner: true });
    const gestor = user({ id: "g1", name: "Gestor", role: Role.Gestor, status: "Inativo" });
    const collab = user({ id: "c1", name: "Colab", role: Role.Comercial });
    const teams: CrmTeam[] = [
      {
        id: "t-root",
        company_id: "co",
        parent_team_id: null,
        name: "Empresa",
        manager_user_id: "o1",
        is_active: true,
      },
      {
        id: "t-g1",
        company_id: "co",
        parent_team_id: "t-root",
        name: "Time Gestor",
        manager_user_id: "g1",
        is_active: true,
      },
    ];
    const membersByTeamId: Record<string, CrmTeamMember[]> = {
      "t-g1": [{ team_id: "t-g1", user_id: "c1", is_leader: false }],
    };

    const tree = buildOrgTree([owner, gestor, collab], teams, membersByTeamId);
    expect(tree.managers).toEqual([]);
    expect(tree.ownerCollaborators.map((item) => item.user.id)).toEqual(["c1"]);
    expect(tree.unassigned.map((item) => item.id)).toEqual([]);
  });

  it("lists root-team members under ownerCollaborators", () => {
    const owner = user({ id: "o1", name: "Owner", role: Role.Administrador, isOwner: true });
    const direct = user({ id: "d1", name: "Direto", role: Role.Comercial });
    const teams: CrmTeam[] = [
      {
        id: "t-root",
        company_id: "co",
        parent_team_id: null,
        name: "Empresa",
        manager_user_id: "o1",
        is_active: true,
      },
    ];
    const membersByTeamId: Record<string, CrmTeamMember[]> = {
      "t-root": [{ team_id: "t-root", user_id: "d1", is_leader: false }],
    };
    const tree = buildOrgTree([owner, direct], teams, membersByTeamId);
    expect(tree.ownerCollaborators.map((item) => item.user.id)).toEqual(["d1"]);
    expect(tree.unassigned).toEqual([]);
  });

  it("keeps a lone owner as the root even without teams", () => {
    const owner = user({ id: "o1", name: "Owner", role: Role.Administrador, isOwner: true });
    const tree = buildOrgTree([owner], [], {});
    expect(tree.owner?.id).toBe("o1");
    expect(tree.rootTeam).toBeNull();
    expect(tree.managers).toEqual([]);
    expect(tree.ownerCollaborators).toEqual([]);
    expect(tree.unassigned).toEqual([]);
  });
});

describe("inferMembersFromUsers", () => {
  it("places collaborators by matching user.team to the team name", () => {
    const owner = user({ id: "o1", name: "Owner", role: Role.Administrador, isOwner: true });
    const gestor = user({ id: "g1", name: "Gestor", role: Role.Gestor, team: "Comercial" });
    const collab = user({ id: "c1", name: "Colab", role: Role.Comercial, team: "Comercial" });
    const teams: CrmTeam[] = [
      {
        id: "t-com",
        company_id: "co",
        parent_team_id: "t-root",
        name: "Comercial",
        manager_user_id: "g1",
        is_active: true,
      },
    ];

    const members = inferMembersFromUsers([owner, gestor, collab], teams);
    expect(members["t-com"]?.map((item) => item.user_id).sort()).toEqual(["c1", "g1"]);
    expect(members["t-com"]?.find((item) => item.user_id === "g1")?.is_leader).toBe(true);
  });

  it("does not reassign a user already placed in the snapshot", () => {
    const collab = user({ id: "c1", name: "Colab", role: Role.Comercial, team: "Comercial" });
    const teams: CrmTeam[] = [
      {
        id: "t-com",
        company_id: "co",
        parent_team_id: null,
        name: "Comercial",
        manager_user_id: "g1",
        is_active: true,
      },
      {
        id: "t-ops",
        company_id: "co",
        parent_team_id: null,
        name: "Operação",
        manager_user_id: "g2",
        is_active: true,
      },
    ];
    const snapshot: Record<string, CrmTeamMember[]> = {
      "t-ops": [{ team_id: "t-ops", user_id: "c1", is_leader: false }],
    };

    const members = inferMembersFromUsers([collab], teams, snapshot);
    expect(members["t-ops"]?.map((item) => item.user_id).sort()).toEqual(["c1", "g2"]);
    expect(members["t-com"]?.some((item) => item.user_id === "c1")).toBe(false);
  });

  it("places collaborators from live members even when user.team is empty", () => {
    const gestor = user({ id: "g1", name: "Gestor", role: Role.Gestor });
    const collab = user({ id: "c1", name: "Colab", role: Role.Comercial });
    const teams: CrmTeam[] = [
      {
        id: "t-com",
        company_id: "co",
        parent_team_id: null,
        name: "Comercial",
        manager_user_id: null,
        is_active: true,
      },
    ];
    const members = inferMembersFromUsers([gestor, collab], teams, {
      "t-com": [
        { team_id: "t-com", user_id: "g1", is_leader: true },
        { team_id: "t-com", user_id: "c1", is_leader: false },
      ],
    });
    expect(members["t-com"]?.map((item) => item.user_id).sort()).toEqual(["c1", "g1"]);
  });
});

describe("hydrateTeamManagers", () => {
  it("fills manager_user_id from the team leader when the list omits it", () => {
    const teams = [team({ id: "t1", name: "Comercial", manager_user_id: null })];
    const hydrated = hydrateTeamManagers(teams, {
      t1: [{ team_id: "t1", user_id: "g1", is_leader: true }],
    });
    expect(hydrated[0]?.manager_user_id).toBe("g1");
  });
});

describe("parseTeamMembersPayload", () => {
  it("reads members from items and keeps a null message", () => {
    expect(
      parseTeamMembersPayload(
        {
          items: [{ team_id: "t1", user_id: "u1", is_leader: true }],
          message: null,
        },
        "t1",
      ),
    ).toEqual({
      items: [{ team_id: "t1", user_id: "u1", is_leader: true, joined_at: undefined }],
      message: null,
    });
  });

  it("returns the missing-team message with an empty list", () => {
    expect(
      parseTeamMembersPayload({ items: [], message: TEAM_NOT_REGISTERED_MEMBERS_MESSAGE }, "gone"),
    ).toEqual({ items: [], message: TEAM_NOT_REGISTERED_MEMBERS_MESSAGE });
  });

  it("returns the empty-team message with an empty list", () => {
    expect(
      parseTeamMembersPayload({ items: [], message: TEAM_EMPTY_MEMBERS_MESSAGE }, "t1"),
    ).toEqual({ items: [], message: TEAM_EMPTY_MEMBERS_MESSAGE });
  });

  it("fills team_id from the requested team when the item omits it", () => {
    expect(parseTeamMembersPayload({ items: [{ user_id: "u2" }], message: null }, "t9")).toEqual({
      items: [{ team_id: "t9", user_id: "u2", is_leader: false, joined_at: undefined }],
      message: null,
    });
  });
});
