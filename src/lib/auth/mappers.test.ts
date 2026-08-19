import { describe, expect, it } from "vitest";
import { mapApiFeatures, mapApiPermissions, mapRoleCode } from "./mappers";
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
    expect(mapRoleCode("MANAGER", true)).toBe(Role.Administrador);
  });
});
