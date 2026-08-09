"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
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
import type { Attachment, KanbanBoard, Lead, LegalStage, PipelineStage } from "./types";

function invalidateLeadQueries(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  // Prefixo ["kanban"] — cobre todas as variantes com filtros
  void queryClient.invalidateQueries({ queryKey: ["kanban"] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.legalKanban });
  if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
}

function moveLeadInBoard(board: KanbanBoard, leadId: string, status: PipelineStage): KanbanBoard {
  const lead = board.columns.flatMap((c) => c.leads).find((l) => l.id === leadId);
  if (!lead) return board;
  const updated = { ...lead, status, daysInStage: 0 };
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

export function useKanban(params?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.kanban(params),
    queryFn: () => fetchKanban(params),
  });
}

export function useLeads(params?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => fetchLeads(params),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: () => fetchLead(id),
    enabled: Boolean(id),
  });
}

export function useLeadContracts(leadId: string) {
  return useQuery({
    queryKey: [...queryKeys.contracts.list({ leadId })],
    queryFn: () => fetchLeadContracts(leadId),
    enabled: Boolean(leadId),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLead,
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importLeads,
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLead,
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}

export function useMoveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: PipelineStage }) =>
      moveLead(leadId, status),
    onMutate: async ({ leadId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["kanban"] });
      const previous = queryClient.getQueriesData<KanbanBoard>({ queryKey: ["kanban"] });
      queryClient.setQueriesData<KanbanBoard>({ queryKey: ["kanban"] }, (old) =>
        old ? moveLeadInBoard(old, leadId, status) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => invalidateLeadQueries(queryClient),
  });
}

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Lead>) => updateLead(id, payload),
    onSuccess: () => invalidateLeadQueries(queryClient, id),
  });
}

export function useDistributeLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributeLeads,
    onSuccess: () => invalidateLeadQueries(queryClient),
  });
}

export function useAddAttachment(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachment: Omit<Attachment, "id" | "createdAt">) =>
      addLeadAttachment(leadId, attachment),
    onSuccess: () => invalidateLeadQueries(queryClient, leadId),
  });
}

export function useRemoveAttachment(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => removeLeadAttachment(leadId, attachmentId),
    onSuccess: () => invalidateLeadQueries(queryClient, leadId),
  });
}

export function useAddTimelineEntry(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: string; description: string }) =>
      addLeadTimelineEntry(leadId, payload),
    onSuccess: () => invalidateLeadQueries(queryClient, leadId),
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
      queryClient.setQueryData<LegalBoard>(queryKeys.legalKanban, (old) =>
        old ? moveLeadInLegalBoard(old, leadId, status) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.legalKanban, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.legalKanban });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}
