import { describe, expect, it } from "vitest";
import { mapCrmUserToAppUser } from "./services";

describe("mapCrmUserToAppUser", () => {
  it("maps list payload without detail fields", () => {
    const mapped = mapCrmUserToAppUser(
      { id: "u1", name: "Ana Silva", email: "ana@acme.com", status: "ACTIVE", is_owner: true },
      "ADMIN",
    );
    expect(mapped).toMatchObject({
      id: "u1",
      name: "Ana Silva",
      email: "ana@acme.com",
      phone: "",
      team: "",
      status: "Ativo",
      role: "Administrador",
    });
  });
});
