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

  it("maps created_at to createdAt", () => {
    const mapped = mapCrmUserToAppUser(
      {
        id: "u2",
        name: "Bruno Lima",
        email: "bruno@acme.com",
        status: "ACTIVE",
        created_at: "2026-03-10T15:30:00.000Z",
      },
      "SALES",
    );
    expect(mapped.createdAt).toBe("2026-03-10T15:30:00.000Z");
    expect(mapped.role).toBe("Comercial");
  });
});
