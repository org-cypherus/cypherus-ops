import { describe, expect, it } from "vitest";
import {
  addons,
  buildSignupPlanOptions,
  comparisonRows,
  features,
  findSignupPlanOption,
  plans,
  proofPoints,
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

  it("includes WhatsApp on Enterprise only", () => {
    expect(plans.find((plan) => plan.id === "enterprise")?.features).toContain(
      "WhatsApp (1 número, inbox multi-user)",
    );
    expect(comparisonRows.find((row) => row.feature === "WhatsApp")).toEqual({
      feature: "WhatsApp",
      essencial: false,
      profissional: false,
      enterprise: true,
    });
  });

  it("keeps seat and storage copy as fallback until the catalog hydrates", () => {
    expect(plans.map((plan) => plan.price)).toEqual(["", "", ""]);
    expect(plans.map((plan) => plan.features[0])).toEqual([
      "5 usuários inclusos",
      "15 usuários inclusos",
      "25 usuários inclusos",
    ]);
    expect(plans.map((plan) => plan.features[1])).toEqual([
      "50 GB de armazenamento",
      "100 GB de armazenamento",
      "300 GB de armazenamento",
    ]);
  });

  it("lists add-ons for every plan", () => {
    expect(addons.map((addon) => addon.item)).toEqual([
      "Usuário extra",
      "Storage extra",
      "WhatsApp (1 número, inbox multi-user, se não for Enterprise)",
      "Número WhatsApp extra",
      "API / webhooks (se não for Enterprise)",
      "Customização / integração",
    ]);
    expect(addons[0].price).toBe("R$ 49 / mês");
    expect(addons[1].price).toBe("R$ 29 / 50 GB / mês");
  });

  it("syncs signup plan options with hydrated LP prices", () => {
    const hydrated = plans.map((plan, index) => ({
      ...plan,
      price: ["R$ 497", "R$ 997", "R$ 1.997"][index] ?? plan.price,
    }));
    const options = buildSignupPlanOptions(hydrated);
    for (const option of options) {
      const plan = hydrated.find((item) => item.id === option.planId);
      const expectedPrice = plan?.pricePrefix ? `${plan.pricePrefix} ${plan.price}` : plan?.price;
      expect(option.price).toBe(expectedPrice);
      expect(plan?.name).toBe(option.label);
    }
  });

  it("falls back to profissional when plan code is unknown", () => {
    expect(findSignupPlanOption("UNKNOWN").code).toBe("PROFESSIONAL");
  });
});
