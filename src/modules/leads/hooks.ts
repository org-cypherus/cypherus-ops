"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  addLeadAttachment,
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
import type { Attachment, Lead, LegalStage, PipelineStage } from "./types";

function invalidateLeadQueries(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.kanban() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.legalKanban });
  if (id) void queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
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
    onSuccess: () => invalidateLeadQueries(queryClient),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.legalKanban });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    },
  });
}
