import type { Attachment, KanbanBoard, Lead, LeadPriority, PipelineStage, TimelineEvent } from "./types";
import { PIPELINE_STAGES } from "./types";
import { timelineEventLabel } from "./timeline-labels";

function timelineTime(iso?: string) {
  const t = iso ? new Date(iso).getTime() : Number.NaN;
  return Number.isFinite(t) ? t : 0;
}

export function sortTimelineNewestFirst<T extends { createdAt?: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => timelineTime(b.createdAt) - timelineTime(a.createdAt));
}

export type CrmLead = {
  id: string;
  company_id: string;
  owner_user_id: string;
  name: string;
  cpf: string;
  rg?: string | null;
  birth_date?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  zip_code?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  source?: string | null;
  campaign?: string | null;
  channel?: string | null;
  status: string;
  priority: string;
  tags: string[];
  process: Record<string, unknown>;
  pipeline_stage_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmPipelineStage = {
  id: string;
  name: string;
  sort_order: number;
  status?: string | null;
};

export type CrmPipeline = {
  id: string;
  name: string;
  is_default: boolean;
  stages: CrmPipelineStage[];
};

export type CrmPipelineBoard = {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    name: string;
    sort_order: number;
    status?: string | null;
    lead_count: number;
    potential_value: string | number;
    has_more?: boolean;
    leads: CrmLead[];
  }>;
};

const STATUS_TO_UI: Record<string, PipelineStage> = {
  NEW: "Novo Lead",
  CONTACTED: "Contato realizado",
  NEGOTIATING: "Em negociação",
  CONTRACT_SENT: "Contrato enviado",
  CONTRACT_SIGNED: "Contrato assinado",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  COMPLETED: "Concluído",
};

const UI_TO_STATUS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_TO_UI).map(([api, ui]) => [ui, api]),
);

const PRIORITY_TO_UI: Record<string, LeadPriority> = {
  LOW: "baixa",
  MEDIUM: "media",
  HIGH: "alta",
};

const UI_TO_PRIORITY: Record<LeadPriority, string> = {
  baixa: "LOW",
  media: "MEDIUM",
  alta: "HIGH",
};

export function uiStageToApiStatus(status: string) {
  return UI_TO_STATUS[status];
}

export function uiPriorityToApi(priority?: string) {
  if (!priority) return undefined;
  return UI_TO_PRIORITY[priority as LeadPriority];
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Valor do funil/board no CRM: `potential_value` ou `value` (contrato saas-crm). */
export function processPotentialValue(process: Record<string, unknown> | undefined) {
  if (!process) return 0;
  for (const key of ["potential_value", "value", "totalValue", "total_value", "valor"] as const) {
    if (process[key] == null || process[key] === "") continue;
    return asNumber(process[key]);
  }
  return 0;
}

function processValue(process: Record<string, unknown> | undefined) {
  return {
    bank: String(process?.bank ?? process?.banco ?? "") || undefined,
    installments: process?.installments != null ? asNumber(process.installments) : undefined,
    installmentValue:
      process?.installmentValue != null || process?.installment_value != null
        ? asNumber(process?.installmentValue ?? process?.installment_value)
        : undefined,
    financedValue:
      process?.financedValue != null || process?.financed_value != null
        ? asNumber(process?.financedValue ?? process?.financed_value)
        : undefined,
    totalValue: processPotentialValue(process),
    contractType: String(process?.contractType ?? process?.contract_type ?? "") || undefined,
    notes: String(process?.notes ?? process?.observacoes ?? "") || undefined,
  };
}

/** Aproximação: dias desde `updated_at` (CRM não envia days_in_stage). */
export function daysSince(iso?: string | null, today = new Date()) {
  if (!iso) return 0;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const start = Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate());
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}

export function unwrapLeadList(data: unknown): CrmLead[] {
  if (Array.isArray(data)) return data as CrmLead[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: CrmLead[] }).items;
  }
  return [];
}

export function nextLeadCursor(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const cursor = (data as { next_cursor?: string | null }).next_cursor;
  return cursor ?? null;
}

function toProcessPayload(process?: Lead["process"], observations?: string) {
  const total = process?.totalValue;
  return {
    ...(process ?? {}),
    // CRM agrega board por potential_value | value — espelha o total da UI.
    potential_value: total ?? 0,
    value: total ?? 0,
    observations,
  };
}

export function toUiLead(
  lead: CrmLead,
  ownerName?: string,
  extras?: {
    events?: Array<{ type: string; payload?: Record<string, unknown>; created_at: string }>;
    attachments?: Attachment[];
  },
): Lead {
  const process = (lead.process ?? {}) as Record<string, unknown>;
  const contacts = Array.isArray(process.contacts) ? process.contacts : [];
  const eventTimeline = (extras?.events ?? []).map((event, index) => ({
    id: `event-${index}`,
    type: event.type,
    description: String(
      event.payload?.description ?? event.payload?.message ?? timelineEventLabel(event.type),
    ),
    createdAt: event.created_at,
    userName: String(event.payload?.actor_name ?? "Sistema"),
  }));
  const contactTimeline = contacts.map((item, index) => {
    const row = item as { type?: string; description?: string; createdAt?: string; userName?: string };
    return {
      id: `contact-${index}`,
      type: row.type || "Nota",
      description: row.description || "",
      createdAt: row.createdAt || lead.updated_at,
      userName: row.userName || ownerName || "Você",
    };
  });

  const status = STATUS_TO_UI[lead.status] ?? PIPELINE_STAGES[0];
  return {
    id: lead.id,
    name: lead.name,
    cpf: lead.cpf || "",
    rg: lead.rg ?? undefined,
    birthDate: lead.birth_date ?? undefined,
    email: lead.email || "",
    phone: lead.phone || "",
    whatsapp: lead.whatsapp || lead.phone || "",
    address: {
      cep: lead.zip_code || "",
      street: lead.street || "",
      number: lead.number || "",
      neighborhood: lead.neighborhood || "",
      city: lead.city || "",
      state: lead.state || "",
    },
    origin: lead.source || "",
    campaign: lead.campaign || "",
    channel: lead.channel || "",
    ownerId: lead.owner_user_id,
    ownerName: ownerName?.trim() || "Sem responsável",
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
    pipelineStageId: lead.pipeline_stage_id ?? undefined,
    status,
    priority: PRIORITY_TO_UI[lead.priority] ?? "media",
    tags: lead.tags ?? [],
    process: processValue(process),
    daysInStage: daysSince(lead.updated_at || lead.created_at),
    timeline: sortTimelineNewestFirst<TimelineEvent>([...eventTimeline, ...contactTimeline]),
    attachments: extras?.attachments ?? [],
    observations: String(process.observations ?? process.observacoes ?? "") || undefined,
  };
}

export function toKanbanBoard(board: CrmPipelineBoard, owners: Record<string, string>): KanbanBoard {
  return {
    columns: board.columns.map((column) => {
      const leads = column.leads.map((lead) => toUiLead(lead, owners[lead.owner_user_id]));
      const status =
        (column.status && STATUS_TO_UI[column.status]) ||
        (PIPELINE_STAGES.includes(column.name as PipelineStage) ? (column.name as PipelineStage) : leads[0]?.status) ||
        PIPELINE_STAGES[0];
      return {
        status,
        // Totais da coluna vêm do CRM (incluem leads além do slice `leads[]`).
        count: column.lead_count,
        potentialValue: asNumber(column.potential_value),
        hasMore: Boolean(column.has_more),
        leads,
      };
    }),
  };
}

export function leadToCreateRequest(payload: Partial<Lead> & { name: string; email: string }) {
  if (!payload.cpf) throw new Error("Informe o CPF do lead.");
  if (!payload.ownerId) throw new Error("Informe o responsável pelo lead.");
  return {
    name: payload.name,
    cpf: payload.cpf,
    owner_user_id: payload.ownerId,
    rg: payload.rg,
    birth_date: payload.birthDate,
    email: payload.email,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    zip_code: payload.address?.cep,
    street: payload.address?.street,
    number: payload.address?.number,
    neighborhood: payload.address?.neighborhood,
    city: payload.address?.city,
    state: payload.address?.state,
    source: payload.origin,
    campaign: payload.campaign,
    channel: payload.channel,
    status: payload.status ? uiStageToApiStatus(payload.status) : "NEW",
    priority: uiPriorityToApi(payload.priority) ?? "MEDIUM",
    tags: payload.tags ?? [],
    process: toProcessPayload(payload.process, payload.observations),
  };
}

export function leadToUpdateRequest(payload: Partial<Lead>) {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.cpf !== undefined) body.cpf = payload.cpf;
  if (payload.ownerId !== undefined) body.owner_user_id = payload.ownerId;
  if (payload.rg !== undefined) body.rg = payload.rg;
  if (payload.birthDate !== undefined) body.birth_date = payload.birthDate;
  if (payload.email !== undefined) body.email = payload.email;
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.whatsapp !== undefined) body.whatsapp = payload.whatsapp;
  if (payload.address) {
    body.zip_code = payload.address.cep;
    body.street = payload.address.street;
    body.number = payload.address.number;
    body.neighborhood = payload.address.neighborhood;
    body.city = payload.address.city;
    body.state = payload.address.state;
  }
  if (payload.origin !== undefined) body.source = payload.origin;
  if (payload.campaign !== undefined) body.campaign = payload.campaign;
  if (payload.channel !== undefined) body.channel = payload.channel;
  if (payload.priority !== undefined) body.priority = uiPriorityToApi(payload.priority);
  if (payload.tags !== undefined) body.tags = payload.tags;
  if (payload.process !== undefined || payload.observations !== undefined) {
    body.process = toProcessPayload(payload.process, payload.observations);
  }
  return body;
}
