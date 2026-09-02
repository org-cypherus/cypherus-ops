import { describe, expect, it } from "vitest";
import {
  formatPlanListPrice,
  formatStorageLimit,
  hydrateComparisonRows,
  hydratePlansFromCatalog,
  limitsFromPlanFeatures,
  parseCatalogPrice,
  planIdFromCode,
} from "./plan-catalog";

describe("plan catalog", () => {
  it("maps known plan codes only", () => {
    expect(planIdFromCode("ESSENTIAL")).toBe("essencial");
    expect(planIdFromCode("professional")).toBe("profissional");
    expect(planIdFromCode("OPS-CUSTOM")).toBeUndefined();
  });

  it("formats list prices from the API", () => {
    expect(parseCatalogPrice("497.00")).toBe(497);
    expect(formatPlanListPrice(497).replace(/\u00a0/g, " ")).toBe("R$ 497");
    expect(formatPlanListPrice(1997).replace(/\u00a0/g, " ")).toBe("R$ 1.997");
    expect(formatPlanListPrice(49.9).replace(/\u00a0/g, " ")).toBe("R$ 49,90");
    expect(formatPlanListPrice(0)).toBe("Sob consulta");
  });

  it("formats storage limits in GB", () => {
    expect(formatStorageLimit(50 * 1024 ** 3)).toBe("50 GB");
    expect(formatStorageLimit(1_073_741_824)).toBe("1 GB");
  });

  it("overlays API price, seats and storage on landing copy", () => {
    const catalog = [
      { id: "p1", code: "ESSENTIAL", name: "Essencial", price: "497.00", billing_interval: "MONTHLY" },
      { id: "p2", code: "PROFESSIONAL", name: "Profissional", price: "997.00", billing_interval: "MONTHLY" },
      { id: "p3", code: "ENTERPRISE", name: "Enterprise", price: "1997.00", billing_interval: "MONTHLY" },
    ];
    const limits = limitsFromPlanFeatures(
      catalog,
      [
        { id: "f-users", key: "max_users" },
        { id: "f-storage", key: "max_storage_bytes" },
      ],
      {
        p1: [
          { plan_id: "p1", feature_id: "f-users", enabled: true, limit_value: 5, is_unlimited: false },
          { plan_id: "p1", feature_id: "f-storage", enabled: true, limit_value: 50 * 1024 ** 3, is_unlimited: false },
        ],
        p2: [
          { plan_id: "p2", feature_id: "f-users", enabled: true, limit_value: 15, is_unlimited: false },
          { plan_id: "p2", feature_id: "f-storage", enabled: true, limit_value: 100 * 1024 ** 3, is_unlimited: false },
        ],
        p3: [
          { plan_id: "p3", feature_id: "f-users", enabled: true, limit_value: 25, is_unlimited: false },
          { plan_id: "p3", feature_id: "f-storage", enabled: true, limit_value: 300 * 1024 ** 3, is_unlimited: false },
        ],
      },
    );
    const hydrated = hydratePlansFromCatalog(catalog, limits);
    expect(
      hydrated.map((plan) => ({
        id: plan.id,
        price: plan.price.replace(/\u00a0/g, " "),
        prefix: plan.pricePrefix,
      })),
    ).toEqual([
      { id: "essencial", price: "R$ 497", prefix: undefined },
      { id: "profissional", price: "R$ 997", prefix: undefined },
      { id: "enterprise", price: "R$ 1.997", prefix: "a partir de" },
    ]);
    expect(hydrated.map((plan) => plan.features[0])).toEqual([
      "5 usuários inclusos",
      "15 usuários inclusos",
      "25 usuários inclusos",
    ]);
    expect(hydrated.map((plan) => plan.features[1])).toEqual([
      "50 GB de armazenamento",
      "100 GB de armazenamento",
      "300 GB de armazenamento",
    ]);

    const rows = hydrateComparisonRows(limits);
    expect(rows.find((row) => row.feature === "Usuários inclusos")).toEqual({
      feature: "Usuários inclusos",
      essencial: "5",
      profissional: "15",
      enterprise: "25",
    });
    expect(rows.find((row) => row.feature === "Storage incluso")).toEqual({
      feature: "Storage incluso",
      essencial: "50 GB",
      profissional: "100 GB",
      enterprise: "300 GB",
    });
  });

  it("drops the starting-from prefix when the API price is zero", () => {
    const hydrated = hydratePlansFromCatalog([
      { id: "p3", code: "ENTERPRISE", name: "Enterprise", price: "0.00", billing_interval: "MONTHLY" },
    ]);
    expect(hydrated.find((plan) => plan.id === "enterprise")).toMatchObject({
      price: "Sob consulta",
      pricePrefix: undefined,
    });
  });
});
