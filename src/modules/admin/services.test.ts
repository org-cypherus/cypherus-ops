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

  it("uses the assigned role name stored in the CRM", () => {
    const mapped = mapCrmUserToAppUser(
      {
        id: "u3",
        name: "Elena Rocha",
        email: "elena@acme.com",
        status: "ACTIVE",
      },
      { code: "LEGAL", name: "Jurídico" },
    );
    expect(mapped.role).toBe("Jurídico");
  });

  it("keeps the assigned cargo even when the user is owner", () => {
    const mapped = mapCrmUserToAppUser(
      {
        id: "u4",
        name: "Ana Souza",
        email: "ana@acme.com",
        status: "ACTIVE",
        is_owner: true,
      },
      { code: "MANAGER", name: "Gestor" },
    );
    expect(mapped.role).toBe("Gestor");
  });
});
