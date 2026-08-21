"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Paginated } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import {
  moveLeadInBoard,
  patchLeadInList,
  patchLeadStatusInList,
  removeLeadFromBoard,
  removeLeadFromList,
  upsertLeadOnBoard,
} from "./lead-cache";
import {
  addLeadAttachment,
  addLeadTimelineEntry,
  createLead,
  deleteLead,
  distributeLeads,
  fetchKanban,
  fetchLead,
  fetchLeadContracts,
  fetchLeads,
  fetchLegalKanban,
  importLeads,
  moveLead,
  moveLegalLead,
  removeLeadAttachment,
  updateLead,
  type LeadFilters,
} from "./services";
import type { KanbanBoard, Lead, LegalStage, PipelineStage } from "./types";

type Qc = ReturnType<typeof useQueryClient>;

const LEAD_LIST_KEY = ["leads", "list"] as const;

function invalidateLeadLists(queryClient: Qc) {
  void queryClient.invalidateQueries({ queryKey: LEAD_LIST_KEY });
}

function invalidateKanban(queryClient: Qc) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.kanban });
}

/** Grava detalhe e propaga o lead no kanban/listas em cache — sem invalidar legal nem refetch em massa. */
function writeLeadDetailCaches(queryClient: Qc, lead: Lead) {
  queryClient.setQueryData(queryKeys.leads.detail(lead.id), lead);
  queryClient.setQueriesData<KanbanBoard>({ queryKey: queryKeys.kanban }, (old) =>
    old ? upsertLeadOnBoard(old, lead) : old,
  );
  queryClient.setQueriesData<Paginated<Lead>>({ queryKey: LEAD_LIST_KEY }, (old) =>
    old ? patchLeadInList(old, lead) : old,
  );
}

type LegalBoard = Awaited<ReturnType<typeof fetchLegalKanban>>;

function moveLeadInLegalBoard(board: LegalBoard, leadId: string, status: LegalStage): LegalBoard {
  const lead = board.columns.flatMap((c) => c.leads).find((l) => l.id === leadId);
  if (!lead) return board;
  const updated = { ...lead, legalStatus: status };
  return {
    columns: board.columns.map((col) => {
      const leads =
        col.status === status
          ? [...col.leads.filter((l) => l.id !== leadId), updated]
          : col.leads.filter((l) => l.id !== leadId);
      return {
        ...col,
        leads,
        count: leads.length,
        potentialValue: leads.reduce((sum, l) => sum + l.process.totalValue, 0),
      };
    }),
  };
}

export function useKanban(enabled = true) {
  return useQuery({
    queryKey: queryKeys.kanban,
    queryFn: fetchKanban,
    enabled,
  });
}

export function useLeads(params?: LeadFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => fetchLeads(params),
    enabled,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => fetchLead(id),
    enabled: Boolean(id),
  });
}

export function useLeadContracts(leadId: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.contracts.list({ leadId })],
    queryFn: () => fetchLeadContracts(leadId),
    enabled: Boolean(leadId) && enabled,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLead,
    onSuccess: (lead) => {
      writeLeadDetailCaches(queryClient, lead);
      // Novo lead pode não estar na página filtrada atual — refetch só das listas.
      invalidateLeadLists(queryClient);
    },
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importLeads,
    onSuccess: () => {
      invalidateKanban(queryClient);
      invalidateLeadLists(queryClient);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.leads.detail(id) });
      queryClient.setQueriesData<KanbanBoard>({ queryKey: queryKeys.kanban }, (old) =>
        old ? removeLeadFromBoard(old, id) : old,
      );
      queryClient.setQueriesData<Paginated<Lead>>({ queryKey: LEAD_LIST_KEY }, (old) =>
        old ? removeLeadFromList(old, id) : old,
      );
      invalidateLeadLists(queryClient);
    },
  });
}

export function useMoveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: PipelineStage }) =>
      moveLead(leadId, status),
    onMutate: async ({ leadId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.kanban });
      await queryClient.cancelQueries({ queryKey: LEAD_LIST_KEY });
      const previousKanban = queryClient.getQueriesData<KanbanBoard>({ queryKey: queryKeys.kanban });
      const previousLists = queryClient.getQueriesData<Paginated<Lead>>({ queryKey: LEAD_LIST_KEY });
      const previousDetail = queryClient.getQueryData<Lead>(queryKeys.leads.detail(leadId));

      queryClient.setQueriesData<KanbanBoard>({ queryKey: queryKeys.kanban }, (old) =>
        old ? moveLeadInBoard(old, leadId, status) : old,
      );
      queryClient.setQueriesData<Paginated<Lead>>({ queryKey: LEAD_LIST_KEY }, (old) =>
        old ? patchLeadStatusInList(old, leadId, status) : old,
      );
      if (previousDetail) {
        queryClient.setQueryData(queryKeys.leads.detail(leadId), {
          ...previousDetail,
          status,
          daysInStage: 0,
        });
      }

      return { previousKanban, previousLists, previousDetail, leadId };
    },
    onError: (_err, _vars, context) => {
      context?.previousKanban.forEach(([key, data]) => queryClient.setQueryData(key, data));
      context?.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.leads.detail(context.leadId), context.previousDetail);
      }
    },
    onSettled: () => {
      // Reconcilia só o board; listas/detalhe já foram patched.
      invalidateKanban(queryClient);
    },
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Lead>) => updateLead(id, payload),
    onSuccess: (lead) => {
      writeLeadDetailCaches(queryClient, lead);
    },
  });
}

export function useDistributeLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributeLeads,
    onSuccess: () => {
      invalidateKanban(queryClient);
      invalidateLeadLists(queryClient);
    },
  });
}

export function useAddAttachment(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => addLeadAttachment(leadId, file),
    onSuccess: (lead) => {
      writeLeadDetailCaches(queryClient, lead);
    },
  });
}

export function useRemoveAttachment(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => removeLeadAttachment(leadId, attachmentId),
    onSuccess: (lead, attachmentId) => {
      queryClient.removeQueries({ queryKey: queryKeys.leads.attachment(leadId, attachmentId) });
      writeLeadDetailCaches(queryClient, lead);
    },
  });
}

export function useAddTimelineEntry(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: string; description: string }) =>
      addLeadTimelineEntry(leadId, payload),
    onSuccess: (lead) => {
      writeLeadDetailCaches(queryClient, lead);
    },
  });
}

export function useLegalKanban() {
  return useQuery({
    queryKey: queryKeys.legalKanban,
    queryFn: fetchLegalKanban,
  });
}

export function useMoveLegalLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LegalStage }) =>
      moveLegalLead(leadId, status),
    onMutate: async ({ leadId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.legalKanban });
      const previous = queryClient.getQueryData<LegalBoard>(queryKeys.legalKanban);
      const previousDetail = queryClient.getQueryData<Lead>(queryKeys.leads.detail(leadId));
      queryClient.setQueryData<LegalBoard>(queryKeys.legalKanban, (old) =>
        old ? moveLeadInLegalBoard(old, leadId, status) : old,
      );
      if (previousDetail) {
        queryClient.setQueryData(queryKeys.leads.detail(leadId), {
          ...previousDetail,
          legalStatus: status,
        });
      }
      return { previous, previousDetail, leadId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.legalKanban, context.previous);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.leads.detail(context.leadId), context.previousDetail);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.legalKanban });
    },
  });
}
