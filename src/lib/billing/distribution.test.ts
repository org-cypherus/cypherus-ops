import { describe, expect, it } from "vitest";
import {
  allowedDistributionStrategies,
  clampDistributionStrategy,
  isDistributionStrategyAllowed,
} from "./distribution";

describe("distribution strategies by plan", () => {
  it("keeps Essencial on manual/round robin", () => {
    expect(allowedDistributionStrategies("ESSENTIAL")).toEqual(["manual", "round_robin"]);
    expect(isDistributionStrategyAllowed("ESSENTIAL", "automatic")).toBe(false);
  });

  it("adds automatic/team on Profissional", () => {
    expect(allowedDistributionStrategies("PROFESSIONAL")).toContain("automatic");
    expect(allowedDistributionStrategies("PROFESSIONAL")).toContain("team");
    expect(isDistributionStrategyAllowed("PROFESSIONAL", "redistribute")).toBe(false);
  });

  it("unlocks redistribute on Enterprise", () => {
    expect(allowedDistributionStrategies("ENTERPRISE")).toContain("redistribute");
  });

  it("clamps invalid saved strategy to a plan-safe default", () => {
    expect(clampDistributionStrategy("ESSENTIAL", "automatic")).toBe("manual");
    expect(clampDistributionStrategy("PROFESSIONAL", "redistribute")).toBe("manual");
    expect(clampDistributionStrategy("ENTERPRISE", "team")).toBe("team");
  });
});
