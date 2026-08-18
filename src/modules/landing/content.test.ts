import { describe, expect, it } from "vitest";
import {
  comparisonRows,
  features,
  findSignupPlanOption,
  plans,
  proofPoints,
  signupPlanOptions,
} from "./content";

describe("landing content", () => {
  it("keeps proof points in sync with feature modules and plans", () => {
    expect(proofPoints.find((p) => p.label === "Módulos principais")?.value).toBe(String(features.length));
    expect(proofPoints.find((p) => p.label === "Planos comerciais")?.value).toBe(String(plans.length));
  });

  it("exposes the three commercial plans with unique ids", () => {
    expect(plans.map((plan) => plan.id)).toEqual(["essencial", "profissional", "enterprise"]);
    expect(plans.filter((plan) => plan.highlight)).toHaveLength(1);
  });

  it("includes Agenda for Profissional and Enterprise only", () => {
    const agenda = comparisonRows.find((row) => row.feature === "Agenda");
    expect(agenda).toEqual({
      feature: "Agenda",
      essencial: false,
      profissional: true,
      enterprise: true,
    });
  });

  it("syncs signup plan options with LP prices", () => {
    for (const option of signupPlanOptions) {
      const plan = plans.find((item) => item.id === option.planId);
      expect(plan?.price).toBe(option.price);
      expect(plan?.name).toBe(option.label);
    }
  });

  it("falls back to profissional when plan code is unknown", () => {
    expect(findSignupPlanOption("UNKNOWN").code).toBe("PROFESSIONAL");
  });
});
