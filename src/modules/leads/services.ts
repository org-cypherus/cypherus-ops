import { api, type Paginated } from "@/lib/api/client";
import type { Attachment, KanbanBoard, Lead, PipelineStage } from "./types";

export type LeadFilters = {
  q?: string;
  page?: number;
  pageSize?: number;
  ownerId?: string;
  origin?: string;
  priority?: string;
  tag?: string;
  status?: string;
  from?: string;
  to?: string;
};

export async function fetchLeads(params?: LeadFilters) {
  const { data } = await api.get<Paginated<Lead>>("/leads", { params });
  return data;
}

export async function fetchLead(id: string) {
  const { data } = await api.get<Lead>(`/leads/${id}`);
  return data;
}

export async function createLead(payload: Partial<Lead> & { name: string; email: string }) {
  const { data } = await api.post<Lead>("/leads", payload);
  return data;
}

export async function importLeads(rows: Array<Partial<Lead> & { name: string; email: string }>) {
  const { data } = await api.post<{ created: number; data: Lead[] }>("/leads/import", { rows });
  return data;
}

export async function deleteLead(id: string) {
  const { data } = await api.delete<{ ok: boolean }>(`/leads/${id}`);
  return data;
}

export async function fetchKanban(params?: LeadFilters) {
  const { data } = await api.get<KanbanBoard>("/kanban", { params });
  return data;
}

export async function moveLead(leadId: string, status: PipelineStage) {
  const { data } = await api.patch<KanbanBoard>("/kanban/move", { leadId, status });
  return data;
}

export async function updateLead(id: string, payload: Partial<Lead>) {
  const { data } = await api.patch<Lead>(`/leads/${id}`, payload);
  return data;
}

export async function distributeLeads(payload: {
  strategy: string;
  leadIds?: string[];
  ownerId?: string;
  tags?: string[];
}) {
  const { data } = await api.post<{ ok: boolean; affected: number }>("/leads/distribute", payload);
  return data;
}

export async function addLeadAttachment(leadId: string, attachment: Omit<Attachment, "id" | "createdAt"> & { id?: string }) {
  const { data } = await api.post<Lead>(`/leads/${leadId}/attachments`, attachment);
  return data;
}

export async function removeLeadAttachment(leadId: string, attachmentId: string) {
  const { data } = await api.delete<Lead>(`/leads/${leadId}/attachments/${attachmentId}`);
  return data;
}

export async function addLeadTimelineEntry(
  leadId: string,
  payload: { type: string; description: string },
) {
  const { data } = await api.post<Lead>(`/leads/${leadId}/timeline`, payload);
  return data;
}

export async function fetchLeadContracts(leadId: string) {
  const { data } = await api.get<{ data: Array<{ id: string; templateName: string; status: string; value: number }> }>(
    "/contracts",
    { params: { leadId } },
  );
  return data.data;
}

export async function fetchLegalKanban() {
  const { data } = await api.get<{
    columns: Array<{
      status: import("./types").LegalStage;
      count: number;
      potentialValue: number;
      leads: Lead[];
    }>;
  }>("/legal/kanban");
  return data;
}

export async function moveLegalLead(leadId: string, status: import("./types").LegalStage) {
  const { data } = await api.patch("/legal/move", { leadId, status });
  return data as Awaited<ReturnType<typeof fetchLegalKanban>>;
}
