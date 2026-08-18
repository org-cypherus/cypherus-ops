import { describe, expect, it } from "vitest";
import { resolveFeatures } from "@/lib/billing/access";
import { homePathForRole, homePathForSession, roleHasPermission, userHasPermission } from "./access";
import { Role, ROLE_PERMISSIONS } from "./permissions";

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

describe("homePathForSession", () => {
  it("falls back when preferred home is not in the company plan", () => {
    const path = homePathForSession({
      role: Role.Financeiro,
      permissions: ROLE_PERMISSIONS[Role.Financeiro],
      features: resolveFeatures("ESSENTIAL"),
    });
    expect(path).not.toBe("/financial");
    expect(path).toBe("/dashboard");
  });

  it("keeps preferred home when plan allows", () => {
    expect(
      homePathForSession({
        role: Role.Financeiro,
        permissions: ROLE_PERMISSIONS[Role.Financeiro],
        features: resolveFeatures("PROFESSIONAL"),
      }),
    ).toBe("/financial");
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
