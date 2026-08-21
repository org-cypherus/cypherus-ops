import { api, type Paginated } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { getQueryClient, PIPELINE_STALE_TIME_MS } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { downloadApiFile, fetchApiBlob } from "@/lib/utils/download";
import { fetchOwnerMap } from "@/modules/users/directory";
import type { Attachment, KanbanBoard, Lead, LegalStage, PipelineStage } from "./types";
import {
  leadToCreateRequest,
  leadToUpdateRequest,
  toKanbanBoard,
  toUiLead,
  uiStageToApiStatus,
  type CrmLead,
  type CrmPipeline,
  type CrmPipelineBoard,
} from "./adapters";

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

export function filterKanbanBoard(board: KanbanBoard, filters?: LeadFilters): KanbanBoard {
  if (!filters) return board;
  const q = filters.q?.trim().toLowerCase();
  return {
    columns: board.columns.map((column) => {
      const leads = column.leads.filter((lead) => {
        if (q && !`${lead.name} ${lead.email} ${lead.phone}`.toLowerCase().includes(q)) return false;
        if (filters.ownerId && lead.ownerId !== filters.ownerId) return false;
        if (filters.origin && lead.origin !== filters.origin) return false;
        if (filters.priority && lead.priority !== filters.priority) return false;
        if (filters.tag && !lead.tags.includes(filters.tag)) return false;
        if (filters.from && lead.createdAt < filters.from) return false;
        if (filters.to && lead.createdAt > filters.to) return false;
        return true;
      });
      return {
        ...column,
        leads,
        count: leads.length,
        potentialValue: leads.reduce((sum, lead) => sum + lead.process.totalValue, 0),
      };
    }),
  };
}

function paginate<T>(items: T[], params?: LeadFilters): Paginated<T> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? (items.length || 50);
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

async function enrichLeads(leads: CrmLead[]): Promise<Lead[]> {
  const owners = await fetchOwnerMap();
  seedLeadNames(leads);
  return leads.map((lead) => toUiLead(lead, owners[lead.owner_user_id]));
}

export async function fetchLeadNameMap(): Promise<Record<string, string>> {
  return getQueryClient().ensureQueryData({
    queryKey: queryKeys.leadNames,
    staleTime: PIPELINE_STALE_TIME_MS,
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; name: string }>>(companyPath("/leads"));
      return Object.fromEntries((data ?? []).map((lead) => [lead.id, lead.name]));
    },
  });
}

function seedLeadNames(leads: Array<{ id: string; name: string }>) {
  getQueryClient().setQueryData(
    queryKeys.leadNames,
    Object.fromEntries(leads.map((lead) => [lead.id, lead.name])),
  );
}

export async function fetchLeads(params?: LeadFilters) {
  const query: Record<string, string> = {};
  if (params?.q) query.q = params.q;
  if (params?.ownerId) query.owner_user_id = params.ownerId;
  if (params?.origin) query.source = params.origin;
  if (params?.status) query.status = uiStageToApiStatus(params.status) ?? params.status;
  const { data } = await api.get<CrmLead[]>(companyPath("/leads"), { params: query });
  let leads = await enrichLeads(data);
  if (params?.priority) leads = leads.filter((lead) => lead.priority === params.priority);
  if (params?.tag) leads = leads.filter((lead) => lead.tags.includes(params.tag!));
  return paginate(leads, params);
}

export async function fetchLead(id: string) {
  const [{ data: lead }, events, attachments] = await Promise.all([
    api.get<CrmLead>(companyPath(`/leads/${id}`)),
    api.get<Array<{ type: string; payload?: Record<string, unknown>; created_at: string; actor_user_id?: string | null }>>(
      companyPath(`/leads/${id}/events`),
    ).catch(() => ({ data: [] })),
    api.get<Array<{
      id: string;
      filename: string;
      mime_type?: string;
      content_type?: string;
      size_bytes?: number;
      created_at: string;
    }>>(companyPath(`/leads/${id}/attachments`)).catch(() => ({ data: [] })),
  ]);
  const owners = await fetchOwnerMap();
  return toUiLead(lead, owners[lead.owner_user_id], {
    events: events.data,
    attachments: attachments.data.map((item) => mapLeadAttachment(id, item)),
  });
}

export function mapLeadAttachment(
  leadId: string,
  item: {
    id: string;
    filename: string;
    mime_type?: string;
    content_type?: string;
    size_bytes?: number;
    created_at: string;
  },
): Attachment {
  return {
    id: item.id,
    name: item.filename,
    type: item.mime_type || item.content_type || "application/octet-stream",
    size: item.size_bytes || 0,
    url: companyPath(`/leads/${leadId}/attachments/${item.id}/content`),
    createdAt: item.created_at,
  };
}

export async function createLead(payload: Partial<Lead> & { name: string; email: string }) {
  const { data } = await api.post<CrmLead>(companyPath("/leads"), leadToCreateRequest(payload));
  const owners = await fetchOwnerMap();
  return toUiLead(data, owners[data.owner_user_id]);
}

export async function importLeads(rows: Array<Partial<Lead> & { name: string; email: string }>) {
  const fallbackOwner = rows.find((row) => row.ownerId)?.ownerId || "";
  const csvLines = ["name,cpf,owner_user_id,email,phone,source,process"];
  for (const row of rows) {
    const owner = row.ownerId || fallbackOwner;
    const process = JSON.stringify({ totalValue: row.process?.totalValue ?? 0 });
    const fields = [
      row.name,
      row.cpf || "",
      owner,
      row.email,
      row.phone || "",
      row.origin || "",
      process,
    ];
    csvLines.push(fields.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
  }
  const file = new File([csvLines.join("\n")], "leads.csv", { type: "text/csv" });
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<CrmLead[]>(companyPath("/leads/import"), form);
  const mapped = await enrichLeads(data);
  return { created: mapped.length, data: mapped };
}

export async function deleteLead(id: string) {
  await api.delete(companyPath(`/leads/${id}`));
  return { ok: true };
}

async function getDefaultPipeline(): Promise<CrmPipeline> {
  return getQueryClient().ensureQueryData({
    queryKey: queryKeys.defaultPipeline,
    staleTime: PIPELINE_STALE_TIME_MS,
    queryFn: async () => {
      const { data } = await api.get<CrmPipeline[]>(companyPath("/pipelines"));
      const pipeline = data.find((item) => item.is_default) ?? data[0];
      if (!pipeline) throw new Error("Nenhum pipeline encontrado para a empresa.");
      return pipeline;
    },
  });
}

export async function fetchKanban() {
  const pipeline = await getDefaultPipeline();
  const [{ data }, owners] = await Promise.all([
    api.get<CrmPipelineBoard>(companyPath(`/pipelines/${pipeline.id}/board`)),
    fetchOwnerMap(),
  ]);
  const board = toKanbanBoard(data, owners);
  seedLeadNames(board.columns.flatMap((column) => column.leads));
  return board;
}

export async function moveLead(leadId: string, status: PipelineStage) {
  const pipeline = await getDefaultPipeline();
  const apiStatus = uiStageToApiStatus(status);
  const stage =
    pipeline.stages.find((item) => item.status === apiStatus) ??
    pipeline.stages.find((item) => item.name === status);
  if (!stage) throw new Error("Estágio do pipeline não encontrado.");
  await api.patch(companyPath(`/leads/${leadId}/stage`), { stage_id: stage.id });
}

export async function updateLead(id: string, payload: Partial<Lead>) {
  const { data } = await api.patch<CrmLead>(companyPath(`/leads/${id}`), leadToUpdateRequest(payload));
  if (payload.status && payload.status !== toUiLead(data).status) {
    await moveLead(id, payload.status);
    return fetchLead(id);
  }
  const owners = await fetchOwnerMap();
  return toUiLead(data, owners[data.owner_user_id]);
}

export async function distributeLeads(payload: {
  strategy: string;
  leadIds?: string[];
  ownerId?: string;
  tags?: string[];
}) {
  const ids = payload.leadIds ?? [];
  if (payload.strategy === "manual" && payload.ownerId) {
    await Promise.all(
      ids.map((leadId) => api.patch(companyPath(`/leads/${leadId}/assign`), { owner_user_id: payload.ownerId })),
    );
    return { ok: true, affected: ids.length };
  }
  if (payload.strategy === "redistribute") {
    const { data } = await api.post<CrmLead[]>(companyPath("/leads/redistribute"), {});
    return { ok: true, affected: data.length };
  }
  const strategy = payload.strategy.toUpperCase();
  await Promise.all(
    ids.map((leadId) =>
      api.post(companyPath(`/leads/${leadId}/distribute`), { strategy }),
    ),
  );
  return { ok: true, affected: ids.length };
}

export async function addLeadAttachment(
  leadId: string,
  file: File,
  onProgress?: (percent: number) => void,
) {
  const form = new FormData();
  form.append("file", file);
  await api.post(companyPath(`/leads/${leadId}/attachments`), form, {
    onUploadProgress: (event: { loaded: number; total?: number }) => {
      if (!onProgress) return;
      if (!event.total) {
        onProgress(0);
        return;
      }
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    },
  });
  onProgress?.(100);
  return fetchLead(leadId);
}

export async function downloadLeadAttachment(leadId: string, attachmentId: string, fileName: string) {
  return downloadApiFile(
    companyPath(`/leads/${leadId}/attachments/${attachmentId}/content`),
    fileName,
  );
}

export async function fetchLeadAttachmentBlob(leadId: string, attachmentId: string) {
  return fetchApiBlob(companyPath(`/leads/${leadId}/attachments/${attachmentId}/content`));
}

export async function removeLeadAttachment(leadId: string, attachmentId: string) {
  await api.delete(companyPath(`/leads/${leadId}/attachments/${attachmentId}`));
  return fetchLead(leadId);
}

export async function addLeadTimelineEntry(
  leadId: string,
  payload: { type: string; description: string },
) {
  const current = await api.get<CrmLead>(companyPath(`/leads/${leadId}`));
  const process: Record<string, unknown> = current.data.process
    ? { ...current.data.process }
    : {};
  const contacts = Array.isArray(process.contacts) ? process.contacts : [];
  process.contacts = [
    ...contacts,
    {
      type: payload.type,
      description: payload.description,
      createdAt: new Date().toISOString(),
    },
  ];
  await api.patch(companyPath(`/leads/${leadId}`), { process });
  return fetchLead(leadId);
}

export async function fetchLeadContracts(leadId: string) {
  const { data } = await api.get<Array<{
    id: string;
    title?: string;
    status: string;
    template_id?: string | null;
    data?: Record<string, string>;
  }>>(companyPath(`/leads/${leadId}/contracts`));
  return data.map((item) => ({
    id: item.id,
    templateName: item.title || "Contrato",
    status: item.status,
    value: Number(item.data?.value ?? item.data?.valor ?? 0),
  }));
}

export type LegalKanbanBoard = {
  columns: Array<{
    status: LegalStage;
    count: number;
    potentialValue: number;
    leads: Lead[];
  }>;
};

export async function fetchLegalKanban(): Promise<LegalKanbanBoard> {
  return { columns: [] };
}

export async function moveLegalLead(_leadId?: string, _status?: LegalStage) {
  return fetchLegalKanban();
}
