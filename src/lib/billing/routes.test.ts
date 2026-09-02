import { describe, expect, it } from "vitest";
import { Role, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { resolveFeatures } from "./access";
import { APP_NAV_ROUTES, canSeeAppRoute, matchAppRoute } from "./routes";

describe("matchAppRoute", () => {
  it("matches nested contract paths", () => {
    expect(matchAppRoute("/contracts/new")?.feature).toBe("contracts");
    expect(matchAppRoute("/contracts/abc")?.feature).toBe("contracts");
  });

  it("prefers specific admin feature routes over /admin", () => {
    expect(matchAppRoute("/admin/permissions")?.feature).toBe("advanced_permissions");
    expect(matchAppRoute("/admin/roles")?.feature).toBe("advanced_permissions");
    expect(matchAppRoute("/admin/enterprise")?.href).toBe("/admin/enterprise");
    expect(matchAppRoute("/admin")?.feature).toBeUndefined();
    expect(matchAppRoute("/admin/users")?.feature).toBeUndefined();
  });

  it("does not expose calendar, legal or reports in the gated nav", () => {
    expect(matchAppRoute("/calendar")).toBeUndefined();
    expect(matchAppRoute("/legal")).toBeUndefined();
    expect(matchAppRoute("/reports")).toBeUndefined();
  });

  it("does not register /platform as a tenant-gated route", () => {
    expect(matchAppRoute("/platform")).toBeUndefined();
    expect(matchAppRoute("/platform/companies")).toBeUndefined();
    expect(matchAppRoute("/platform/plans")).toBeUndefined();
    expect(matchAppRoute("/platform/billing")).toBeUndefined();
  });
});

describe("canSeeAppRoute", () => {
  const pro = resolveFeatures("PROFESSIONAL");
  const essential = resolveFeatures("ESSENTIAL");
  const comercial = ROLE_PERMISSIONS[Role.Comercial];
  const financeiro = ROLE_PERMISSIONS[Role.Financeiro];
  const gestor = ROLE_PERMISSIONS[Role.Gestor];

  it("hides contracts for comercial on Essential (no feature)", () => {
    const route = APP_NAV_ROUTES.find((item) => item.href === "/contracts")!;
    expect(canSeeAppRoute({ permissions: comercial, features: essential }, route)).toBe(false);
  });

  it("hides financial when permission is missing even on Professional", () => {
    const route = APP_NAV_ROUTES.find((item) => item.href === "/financial")!;
    expect(canSeeAppRoute({ permissions: comercial, features: pro }, route)).toBe(false);
    expect(canSeeAppRoute({ permissions: financeiro, features: pro }, route)).toBe(true);
  });

  it("hides users management without usuarios:visualizar", () => {
    const users = APP_NAV_ROUTES.find((item) => item.href === "/admin/users")!;
    expect(canSeeAppRoute({ permissions: comercial, features: pro }, users)).toBe(false);
    expect(canSeeAppRoute({ permissions: gestor, features: pro }, users)).toBe(true);
  });

  it("hides everything without a session", () => {
    const leads = APP_NAV_ROUTES.find((item) => item.href === "/leads")!;
    expect(canSeeAppRoute(undefined, leads)).toBe(false);
    expect(canSeeAppRoute({ permissions: [], features: pro }, leads)).toBe(false);
  });
});
