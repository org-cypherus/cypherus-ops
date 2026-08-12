import { describe, expect, it } from "vitest";
import { homePathForRole, roleHasPermission, userHasPermission } from "./access";
import { Role } from "./permissions";

describe("homePathForRole", () => {
  it("routes juridico and financeiro to specialized homes", () => {
    expect(homePathForRole(Role.Jurídico)).toBe("/legal");
    expect(homePathForRole(Role.Financeiro)).toBe("/financial");
  });

  it("defaults remaining roles to leads", () => {
    expect(homePathForRole(Role.Administrador)).toBe("/leads");
    expect(homePathForRole(Role.Comercial)).toBe("/leads");
    expect(homePathForRole(Role.Gestor)).toBe("/leads");
  });
});

describe("roleHasPermission", () => {
  it("grants admin full CRM access", () => {
    expect(roleHasPermission(Role.Administrador, "crm:excluir")).toBe(true);
  });

  it("denies financeiro from creating leads", () => {
    expect(roleHasPermission(Role.Financeiro, "crm:criar")).toBe(false);
  });

  it("allows juridico agenda but not lead delete", () => {
    expect(roleHasPermission(Role.Jurídico, "agenda:criar")).toBe(true);
    expect(roleHasPermission(Role.Jurídico, "crm:excluir")).toBe(false);
  });
});

describe("userHasPermission", () => {
  it("checks permission list", () => {
    expect(userHasPermission(["crm:visualizar", "agenda:visualizar"], "agenda:visualizar")).toBe(true);
    expect(userHasPermission(["crm:visualizar"], "agenda:criar")).toBe(false);
    expect(userHasPermission(undefined, "crm:visualizar")).toBe(false);
  });
});
