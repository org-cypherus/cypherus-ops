import { describe, expect, it } from "vitest";
import { Role, ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { canAccess, getFeatureLimit, hasFeature, minimumPlanForFeature, resolveFeatures } from "./access";
import { PLAN_FEATURE_CATALOG } from "./plan-catalog";

describe("resolveFeatures", () => {
  it("returns a copy of the catalog entry for the plan", () => {
    const features = resolveFeatures("PROFESSIONAL");
    expect(features.agenda?.enabled).toBe(true);
    expect(features.api?.enabled).toBe(false);
    expect(features).not.toBe(PLAN_FEATURE_CATALOG.PROFESSIONAL);
  });
});

describe("minimumPlanForFeature", () => {
  it("points agenda/contracts to Profissional", () => {
    expect(minimumPlanForFeature("agenda")).toBe("PROFESSIONAL");
    expect(minimumPlanForFeature("contracts")).toBe("PROFESSIONAL");
    expect(minimumPlanForFeature("api")).toBe("ENTERPRISE");
    expect(minimumPlanForFeature("crm")).toBe("ESSENTIAL");
  });
});

describe("hasFeature / getFeatureLimit", () => {
  it("reads enabled flags from resolved features", () => {
    const essential = resolveFeatures("ESSENTIAL");
    expect(hasFeature(essential, "crm")).toBe(true);
    expect(hasFeature(essential, "agenda")).toBe(false);
    expect(getFeatureLimit(essential, "max_users")).toBe(5);
  });

  it("treats enterprise max_users as unlimited (null)", () => {
    const enterprise = resolveFeatures("ENTERPRISE");
    expect(getFeatureLimit(enterprise, "max_users")).toBeNull();
  });

  it("returns undefined when feature is disabled", () => {
    const essential = resolveFeatures("ESSENTIAL");
    expect(getFeatureLimit(essential, "agenda")).toBeUndefined();
  });
});

describe("canAccess (role ∩ tier)", () => {
  const pro = resolveFeatures("PROFESSIONAL");
  const essential = resolveFeatures("ESSENTIAL");
  const comercial = ROLE_PERMISSIONS[Role.Comercial];
  const financeiro = ROLE_PERMISSIONS[Role.Financeiro];

  it("allows when both feature and permission are present", () => {
    expect(canAccess(pro, comercial, "agenda", "agenda:visualizar")).toBe(true);
  });

  it("denies when company tier lacks the feature even if role has permission", () => {
    expect(canAccess(essential, comercial, "agenda", "agenda:visualizar")).toBe(false);
  });

  it("denies when feature exists but role lacks permission", () => {
    expect(canAccess(pro, financeiro, "agenda", "agenda:visualizar")).toBe(false);
  });

  it("allows feature-only checks when permission is omitted", () => {
    expect(canAccess(pro, financeiro, "agenda")).toBe(true);
    expect(canAccess(essential, financeiro, "agenda")).toBe(false);
  });
});

describe("plan matrix smoke", () => {
  it("keeps Essencial without Pro modules", () => {
    const features = resolveFeatures("ESSENTIAL");
    expect(hasFeature(features, "contracts")).toBe(false);
    expect(hasFeature(features, "financial")).toBe(false);
    expect(hasFeature(features, "commissions")).toBe(false);
  });

  it("gives Enterprise api/webhooks/customizations", () => {
    const features = resolveFeatures("ENTERPRISE");
    expect(hasFeature(features, "api")).toBe(true);
    expect(hasFeature(features, "webhooks")).toBe(true);
    expect(hasFeature(features, "customizations")).toBe(true);
    expect(hasFeature(features, "lead_distribution_advanced")).toBe(true);
  });
});
