import type { Paginated } from "@/lib/api/client";
import type { KanbanBoard, Lead, PipelineStage } from "./types";

function columnTotals(leads: Lead[]) {
  return {
    count: leads.length,
    potentialValue: leads.reduce((sum, lead) => sum + lead.process.totalValue, 0),
  };
}

export function moveLeadInBoard(board: KanbanBoard, leadId: string, status: PipelineStage): KanbanBoard {
  const lead = board.columns.flatMap((c) => c.leads).find((l) => l.id === leadId);
  if (!lead) return board;
  const updated = { ...lead, status, daysInStage: 0 };
  return {
    columns: board.columns.map((col) => {
      const leads =
        col.status === status
          ? [...col.leads.filter((l) => l.id !== leadId), updated]
          : col.leads.filter((l) => l.id !== leadId);
      return { ...col, leads, ...columnTotals(leads) };
    }),
  };
}

/** Atualiza o card no board; move de coluna se o status mudou; inclui se ainda não está no board. */
export function upsertLeadOnBoard(board: KanbanBoard, lead: Lead): KanbanBoard {
  const currentStatus = board.columns.find((col) => col.leads.some((item) => item.id === lead.id))?.status;

  if (!currentStatus) {
    return {
      columns: board.columns.map((col) => {
        if (col.status !== lead.status) return col;
        const leads = [...col.leads, lead];
        return { ...col, leads, ...columnTotals(leads) };
      }),
    };
  }

  if (currentStatus !== lead.status) {
    const withFields: KanbanBoard = {
      columns: board.columns.map((col) => ({
        ...col,
        leads: col.leads.map((item) => (item.id === lead.id ? { ...item, ...lead } : item)),
      })),
    };
    return moveLeadInBoard(withFields, lead.id, lead.status);
  }

  return {
    columns: board.columns.map((col) => {
      const leads = col.leads.map((item) => (item.id === lead.id ? { ...item, ...lead } : item));
      return { ...col, leads, ...columnTotals(leads) };
    }),
  };
}

export function removeLeadFromBoard(board: KanbanBoard, leadId: string): KanbanBoard {
  return {
    columns: board.columns.map((col) => {
      const leads = col.leads.filter((item) => item.id !== leadId);
      return { ...col, leads, ...columnTotals(leads) };
    }),
  };
}

export function patchLeadInList(page: Paginated<Lead>, lead: Lead): Paginated<Lead> {
  if (!page.data.some((item) => item.id === lead.id)) return page;
  return {
    ...page,
    data: page.data.map((item) => (item.id === lead.id ? lead : item)),
  };
}

export function removeLeadFromList(page: Paginated<Lead>, leadId: string): Paginated<Lead> {
  if (!page.data.some((item) => item.id === leadId)) return page;
  return {
    ...page,
    data: page.data.filter((item) => item.id !== leadId),
    total: Math.max(0, page.total - 1),
  };
}

export function patchLeadStatusInList(
  page: Paginated<Lead>,
  leadId: string,
  status: PipelineStage,
): Paginated<Lead> {
  if (!page.data.some((item) => item.id === leadId)) return page;
  return {
    ...page,
    data: page.data.map((item) => (item.id === leadId ? { ...item, status, daysInStage: 0 } : item)),
  };
}
