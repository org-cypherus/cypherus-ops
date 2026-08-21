import { describe, expect, it } from "vitest";
import {
  moveLeadInBoard,
  patchLeadInList,
  removeLeadFromBoard,
  upsertLeadOnBoard,
} from "./lead-cache";
import type { KanbanBoard, Lead } from "./types";

function lead(partial: Partial<Lead> & Pick<Lead, "id" | "status">): Lead {
  return {
    name: "Lead",
    cpf: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: { cep: "", street: "", number: "", neighborhood: "", city: "", state: "" },
    origin: "",
    campaign: "",
    channel: "",
    ownerId: "",
    ownerName: "",
    createdAt: "",
    priority: "media",
    tags: [],
    process: { totalValue: 1000 },
    daysInStage: 1,
    timeline: [],
    attachments: [],
    ...partial,
  };
}

const board: KanbanBoard = {
  columns: [
    {
      status: "Novo Lead",
      count: 1,
      potentialValue: 1000,
      leads: [lead({ id: "a", status: "Novo Lead" })],
    },
    { status: "Em negociação", count: 0, potentialValue: 0, leads: [] },
  ],
};

describe("lead-cache", () => {
  it("moves a lead between columns", () => {
    const next = moveLeadInBoard(board, "a", "Em negociação");
    expect(next.columns[0].leads).toHaveLength(0);
    expect(next.columns[1].leads[0]?.id).toBe("a");
    expect(next.columns[1].leads[0]?.status).toBe("Em negociação");
  });

  it("upserts fields without moving when status is unchanged", () => {
    const next = upsertLeadOnBoard(board, lead({ id: "a", status: "Novo Lead", name: "Ana" }));
    expect(next.columns[0].leads[0]?.name).toBe("Ana");
    expect(next.columns[0].count).toBe(1);
  });

  it("removes a lead from the board", () => {
    const next = removeLeadFromBoard(board, "a");
    expect(next.columns[0].leads).toHaveLength(0);
    expect(next.columns[0].count).toBe(0);
  });

  it("patches a lead inside a list page", () => {
    const page = {
      data: [lead({ id: "a", status: "Novo Lead", name: "Old" })],
      total: 1,
      page: 1,
      pageSize: 20,
    };
    const next = patchLeadInList(page, lead({ id: "a", status: "Novo Lead", name: "New" }));
    expect(next.data[0]?.name).toBe("New");
  });
});
