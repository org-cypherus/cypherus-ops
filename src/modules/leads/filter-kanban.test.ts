import { describe, expect, it } from "vitest";
import { filterKanbanBoard } from "./services";
import type { KanbanBoard } from "./types";

const board: KanbanBoard = {
  columns: [
    {
      status: "Novo Lead",
      count: 2,
      potentialValue: 30,
      leads: [
        {
          id: "1",
          name: "Ana",
          email: "ana@a.com",
          phone: "1",
          ownerId: "u1",
          ownerName: "João",
          origin: "Google Ads",
          priority: "alta",
          tags: ["vip"],
          createdAt: "2026-01-02T00:00:00.000Z",
          cpf: "",
          whatsapp: "",
          address: { cep: "", street: "", number: "", neighborhood: "", city: "", state: "" },
          campaign: "",
          channel: "",
          status: "Novo Lead",
          process: { totalValue: 10 },
          daysInStage: 0,
          timeline: [],
          attachments: [],
        },
        {
          id: "2",
          name: "Bruno",
          email: "b@b.com",
          phone: "2",
          ownerId: "u2",
          ownerName: "Maria",
          origin: "Indicação",
          priority: "baixa",
          tags: [],
          createdAt: "2026-02-01T00:00:00.000Z",
          cpf: "",
          whatsapp: "",
          address: { cep: "", street: "", number: "", neighborhood: "", city: "", state: "" },
          campaign: "",
          channel: "",
          status: "Novo Lead",
          process: { totalValue: 20 },
          daysInStage: 0,
          timeline: [],
          attachments: [],
        },
      ],
    },
  ],
};

describe("filterKanbanBoard", () => {
  it("filters by owner without refetching", () => {
    const filtered = filterKanbanBoard(board, { ownerId: "u1" });
    expect(filtered.columns[0].leads.map((lead) => lead.id)).toEqual(["1"]);
    expect(filtered.columns[0].count).toBe(1);
    expect(filtered.columns[0].potentialValue).toBe(10);
  });

  it("keeps CRM column totals when no client filters are active", () => {
    const withTotals: KanbanBoard = {
      columns: [
        {
          ...board.columns[0],
          count: 99,
          potentialValue: 999,
          hasMore: true,
        },
      ],
    };
    const filtered = filterKanbanBoard(withTotals, { q: "", ownerId: undefined });
    expect(filtered.columns[0].count).toBe(99);
    expect(filtered.columns[0].potentialValue).toBe(999);
    expect(filtered.columns[0].hasMore).toBe(true);
  });

  it("filters by calendar day of createdAt", () => {
    const filtered = filterKanbanBoard(board, { from: "2026-02-01", to: "2026-02-01" });
    expect(filtered.columns[0].leads.map((lead) => lead.id)).toEqual(["2"]);
  });
});
