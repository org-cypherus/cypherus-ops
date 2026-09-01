import type { KanbanBoard, KanbanColumn, PipelineStage } from "./types";

/** Remove do board as colunas que o usuário ocultou na preferência de visualização. */
export function applyColumnVisibility(
  board: KanbanBoard,
  hiddenStages: readonly PipelineStage[],
): KanbanBoard {
  if (!hiddenStages.length) return board;
  const hidden = new Set(hiddenStages);
  const columns = board.columns.filter((column) => !hidden.has(column.status));
  // Nunca deixar o kanban sem coluna: se tudo foi ocultado, mantém o board original.
  if (!columns.length) return board;
  return { columns };
}

export function visibleStagesFromBoard(
  columns: KanbanColumn[],
  hiddenStages: readonly PipelineStage[],
): PipelineStage[] {
  const hidden = new Set(hiddenStages);
  return columns.map((c) => c.status).filter((status) => !hidden.has(status));
}
