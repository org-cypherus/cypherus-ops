import { describe, expect, it } from "vitest";
import { Role } from "@/lib/auth/permissions";
import type { AppUser } from "./services";
import { keepVanishedUsersAsInactive } from "./user-list";

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

describe("keepVanishedUsersAsInactive", () => {
  it("keeps a user that disappeared after deactivate", () => {
    const luna = user({ id: "luna", name: "Luna", status: "Ativo" });
    const livia = user({ id: "livia", name: "Livia" });
    const next = keepVanishedUsersAsInactive([livia], [luna, livia]);
    expect(next.map((item) => item.id)).toEqual(["livia", "luna"]);
    expect(next.find((item) => item.id === "luna")?.status).toBe("Inativo");
  });

  it("does not duplicate users still returned by the API", () => {
    const luna = user({ id: "luna", name: "Luna", status: "Inativo" });
    expect(keepVanishedUsersAsInactive([luna], [luna])).toEqual([luna]);
  });
});
