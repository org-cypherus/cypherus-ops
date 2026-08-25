import { describe, expect, it } from "vitest";
import { mapApiFeatures, mapApiPermissions, mapRoleCode, roleCodeFromUi } from "./mappers";
import { Role } from "./permissions";

describe("mapApiPermissions", () => {
  it("maps granted CRM keys to spec permissions", () => {
    expect(
      mapApiPermissions([
        { permission: "leads.view", granted: true },
        { permission: "leads.create", granted: false },
        { permission: "contracts.view", granted: true },
      ]),
    ).toEqual(["crm:visualizar", "contratos:visualizar"]);
  });
});

describe("mapApiFeatures", () => {
  it("aliases advanced_distribution to the front feature key", () => {
    const features = mapApiFeatures([
      { feature: "crm", enabled: true },
      { feature: "advanced_distribution", enabled: true, unlimited: true },
    ]);
    expect(features.crm?.enabled).toBe(true);
    expect(features.lead_distribution_advanced?.enabled).toBe(true);
    expect(features.lead_distribution_advanced?.limit).toBeNull();
  });
});

describe("mapRoleCode", () => {
  it("maps owner and API codes", () => {
    expect(mapRoleCode("SALES")).toBe(Role.Comercial);
    expect(mapRoleCode("FINANCE")).toBe(Role.Financeiro);
    expect(mapRoleCode("LEGAL")).toBe(Role.Jurídico);
    expect(mapRoleCode("Jurídico")).toBe(Role.Jurídico);
    expect(mapRoleCode("MANAGER", true)).toBe(Role.Gestor);
    expect(mapRoleCode(undefined, true)).toBe(Role.Administrador);
  });
});

describe("roleCodeFromUi", () => {
  it("writes the CRM code stored for each cargo", () => {
    expect(roleCodeFromUi(Role.Administrador)).toBe("ADMIN");
    expect(roleCodeFromUi(Role.Gestor)).toBe("MANAGER");
    expect(roleCodeFromUi(Role.Comercial)).toBe("SALES");
    expect(roleCodeFromUi(Role.Financeiro)).toBe("FINANCE");
    expect(roleCodeFromUi(Role.Jurídico)).toBe("LEGAL");
  });
});
