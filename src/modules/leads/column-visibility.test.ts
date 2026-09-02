import { describe, expect, it } from "vitest";
import { applyColumnVisibility } from "./column-visibility";
import type { KanbanBoard } from "./types";

const board: KanbanBoard = {
  columns: [
    { status: "Novo Lead", count: 1, potentialValue: 10, leads: [] },
    { status: "Em negociação", count: 0, potentialValue: 0, leads: [] },
    { status: "Concluído", count: 2, potentialValue: 20, leads: [] },
  ],
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
