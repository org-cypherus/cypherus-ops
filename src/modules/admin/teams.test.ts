import { describe, expect, it } from "vitest";
import { Role } from "@/lib/auth/permissions";
import type { AppUser } from "./services";
import { buildOrgTree, type CrmTeam, type CrmTeamMember } from "./teams";

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
    expect(tree.unassigned.map((item) => item.id)).toEqual(["f1"]);
  });
});
