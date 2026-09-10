import { describe, expect, it } from "vitest";
import { extraLeadTableColumns, applyColumnVisibility } from "./column-visibility";
import type { KanbanBoard } from "./types";
import type { CustomFieldDefinition } from "@/modules/custom-fields/types";

const board: KanbanBoard = {
  columns: [
    { status: "Novo Lead", count: 1, potentialValue: 10, leads: [] },
    { status: "Em negociação", count: 0, potentialValue: 0, leads: [] },
    { status: "Concluído", count: 2, potentialValue: 20, leads: [] },
  ],
};

const nicho: CustomFieldDefinition = {
  id: "cf-1",
  companyId: "c1",
  entity: "LEAD",
  key: "nicho",
  label: "Nicho",
  type: "text",
  required: false,
  sortOrder: 0,
  options: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("applyColumnVisibility", () => {
  it("hides selected stages", () => {
    const next = applyColumnVisibility(board, ["Concluído"]);
    expect(next.columns.map((c) => c.status)).toEqual(["Novo Lead", "Em negociação"]);
  });

  it("keeps original board when preference would hide every column", () => {
    const next = applyColumnVisibility(board, ["Novo Lead", "Em negociação", "Concluído"]);
    expect(next.columns).toHaveLength(3);
  });

  it("returns the same board when nothing is hidden", () => {
    expect(applyColumnVisibility(board, [])).toBe(board);
  });
});

describe("extraLeadTableColumns", () => {
  it("exposes only defined custom field keys", () => {
    expect(extraLeadTableColumns([])).toEqual([]);
    expect(extraLeadTableColumns([nicho])).toEqual([{ key: "nicho", label: "Nicho", type: "text" }]);
  });

  it("does not invent financial columns without defs", () => {
    const keys = extraLeadTableColumns([]).map((col) => col.key);
    expect(keys).not.toContain("bank");
    expect(keys).not.toContain("installments");
    expect(keys).not.toContain("financedValue");
  });
});
