import { describe, expect, it } from "vitest";
import { homePathForSession } from "@/lib/auth/access";
import {
  buildSessionUser,
  createLead,
  deleteLead,
  distributeLeadsInStore,
  filterLeads,
  mockCommissionRules,
  mockLeads,
  mockUsers,
  patchLead,
} from "@/mocks/data";

describe("buildSessionUser (company tier)", () => {
  it("gives two users in the same company the same planCode and features", () => {
    const bruno = mockUsers.find((u) => u.email === "bruno@cypherops.com")!;
    const elena = mockUsers.find((u) => u.email === "elena@cypherops.com")!;
    expect(bruno.companyId).toBe(elena.companyId);

    const sessionBruno = buildSessionUser(bruno);
    const sessionElena = buildSessionUser(elena);

    expect(sessionBruno.subscription.planCode).toBe("PROFESSIONAL");
    expect(sessionElena.subscription.planCode).toBe("PROFESSIONAL");
    expect(sessionBruno.features).toEqual(sessionElena.features);
    expect(sessionBruno.role).not.toBe(sessionElena.role);
  });

  it("resolves different tiers per company", () => {
    const ana = buildSessionUser(mockUsers.find((u) => u.email === "ana@cypherops.com")!);
    const carla = buildSessionUser(mockUsers.find((u) => u.email === "carla@cypherops.com")!);
    expect(ana.subscription.planCode).toBe("ENTERPRISE");
    expect(carla.subscription.planCode).toBe("ESSENTIAL");
    expect(ana.features.agenda?.enabled).toBe(true);
    expect(carla.features.agenda?.enabled).toBe(false);
  });

  it("does not treat @cypherops.com.br as platform admin", () => {
    const ops = buildSessionUser(mockUsers.find((u) => u.email === "ops@cypherops.com.br")!);
    expect(ops).not.toHaveProperty("isPlatformAdmin");
    expect(homePathForSession(ops)).toBe("/leads");
  });
});

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
    expect(lead.timeline.some((t) => t.type === "Criado")).toBe(true);
    expect(lead.timeline.some((t) => t.type === "Distribuição")).toBe(true);

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
