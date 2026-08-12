import { describe, expect, it } from "vitest";
import { resolveFeatures, hasFeature } from "./access";
import { ENTERPRISE_CAPABILITIES } from "./enterprise";

describe("enterprise capabilities", () => {
  it("lists api, webhooks and customizations", () => {
    expect(ENTERPRISE_CAPABILITIES.map((c) => c.feature)).toEqual([
      "api",
      "webhooks",
      "customizations",
    ]);
  });

  it("enables all three only on Enterprise", () => {
    const essential = resolveFeatures("ESSENTIAL");
    const pro = resolveFeatures("PROFESSIONAL");
    const enterprise = resolveFeatures("ENTERPRISE");

    for (const { feature } of ENTERPRISE_CAPABILITIES) {
      expect(hasFeature(essential, feature)).toBe(false);
      expect(hasFeature(pro, feature)).toBe(false);
      expect(hasFeature(enterprise, feature)).toBe(true);
    }
  });
});
