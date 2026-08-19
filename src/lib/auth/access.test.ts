import { describe, expect, it } from "vitest";
import { resolveFeatures } from "@/lib/billing/access";
import { homePathForRole, homePathForSession, roleHasPermission, userHasPermission } from "./access";
import { Role, ROLE_PERMISSIONS } from "./permissions";

describe("homePathForRole", () => {
  it("routes financeiro to the financial home", () => {
    expect(homePathForRole(Role.Financeiro)).toBe("/financial");
  });

  it("defaults remaining roles to leads", () => {
    expect(homePathForRole(Role.Administrador)).toBe("/leads");
    expect(homePathForRole(Role.Comercial)).toBe("/leads");
    expect(homePathForRole(Role.Gestor)).toBe("/leads");
    expect(homePathForRole(Role.Jurídico)).toBe("/leads");
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

  it("routes Cypher staff to the platform console", () => {
    expect(
      homePathForSession({
        role: Role.Administrador,
        permissions: ROLE_PERMISSIONS[Role.Administrador],
        features: resolveFeatures("ENTERPRISE"),
        isPlatformAdmin: true,
      }),
    ).toBe("/platform");
  });
});

describe("roleHasPermission", () => {
  it("grants admin full CRM access", () => {
    expect(roleHasPermission(Role.Administrador, "crm:excluir")).toBe(true);
  });

  it("denies financeiro from creating leads", () => {
    expect(roleHasPermission(Role.Financeiro, "crm:criar")).toBe(false);
  });
});

describe("userHasPermission", () => {
  it("checks permission list", () => {
    expect(userHasPermission(["crm:visualizar", "contratos:visualizar"], "contratos:visualizar")).toBe(true);
    expect(userHasPermission(["crm:visualizar"], "crm:criar")).toBe(false);
    expect(userHasPermission(undefined, "crm:visualizar")).toBe(false);
  });
});
