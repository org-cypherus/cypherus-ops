import { describe, expect, it } from "vitest";
import {
  createLead,
  deleteLead,
  distributeLeadsInStore,
  filterLeads,
  mockCommissionRules,
  mockLeads,
  patchLead,
} from "@/mocks/data";

describe("mock store mutations", () => {
  it("creates, patches and deletes a lead", () => {
    const before = mockLeads.length;
    const lead = createLead({
      name: "Teste Wave 2",
      email: "wave2@test.com",
      phone: "11988887777",
      process: { totalValue: 999 },
    });
    expect(mockLeads.length).toBe(before + 1);
    expect(lead.timeline[0]?.type).toBe("Criado");

    const patched = patchLead(lead.id, { observations: "Obs atualizada" });
    expect(patched?.observations).toBe("Obs atualizada");

    expect(deleteLead(lead.id)).toBe(true);
    expect(mockLeads.find((l) => l.id === lead.id)).toBeUndefined();
  });

  it("filters leads by origin and priority", () => {
    const items = filterLeads(mockLeads, {
      origin: "Google Ads",
      priority: "alta",
    });
    items.forEach((l) => {
      expect(l.origin).toBe("Google Ads");
      expect(l.priority).toBe("alta");
    });
  });

  it("distributes leads with round robin", () => {
    const affected = distributeLeadsInStore({
      strategy: "round_robin",
      leadIds: mockLeads.slice(0, 2).map((l) => l.id),
    });
    expect(affected).toBe(2);
  });

  it("keeps commission rules mutable", () => {
    const count = mockCommissionRules.length;
    mockCommissionRules.push({
      id: "r-test",
      plan: "Teste",
      type: "taxa",
      value: 10,
    });
    expect(mockCommissionRules.length).toBe(count + 1);
    mockCommissionRules.pop();
  });
});
