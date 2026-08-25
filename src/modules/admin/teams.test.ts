import { beforeEach, describe, expect, it } from "vitest";
import { Role } from "@/lib/auth/permissions";
import type { AppUser } from "./services";
import {
  buildOrgTree,
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

describe("teamNameOptions", () => {
  beforeEach(() => {
    window.localStorage.removeItem("cypherus.ops.extraTeamNames.v1");
  });

  it("keeps default teams first in the requested order", () => {
    expect(teamNameOptions()).toEqual(["Comercial", "Gestor", "Operação", "Marketing"]);
  });

  it("appends extra and existing team names after the defaults", () => {
    const existing: CrmTeam[] = [
      {
        id: "t1",
        company_id: "co",
        parent_team_id: null,
        name: "Jurídico",
        manager_user_id: null,
        is_active: true,
      },
    ];
    expect(teamNameOptions(existing, ["Suporte"])).toEqual([
      "Comercial",
      "Gestor",
      "Operação",
      "Marketing",
      "Jurídico",
      "Suporte",
    ]);
  });

  it("does not duplicate names that match a default team", () => {
    expect(teamNameOptions([], ["comercial", "Novo"])).toEqual([
      "Comercial",
      "Gestor",
      "Operação",
      "Marketing",
      "Novo",
    ]);
  });

  it("matches a default team name without regard to case", () => {
    expect(matchTeamName("comercial", teamNameOptions())).toBe("Comercial");
    expect(matchTeamName("  GESTOR ", teamNameOptions())).toBe("Gestor");
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
