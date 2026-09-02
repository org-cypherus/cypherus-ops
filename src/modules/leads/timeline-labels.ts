import { humanizeEnumLabel } from "@/lib/utils/labels";

/** Status do CRM (`Lead.status`) → rótulo do pipeline na UI. */
const API_STAGE_LABELS: Record<string, string> = {
  NEW: "Novo Lead",
  CONTACTED: "Contato realizado",
  NEGOTIATING: "Em negociação",
  CONTRACT_SENT: "Contrato enviado",
  CONTRACT_SIGNED: "Contrato assinado",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  COMPLETED: "Concluído",
};

/** Eventos de sistema do CRM → rótulo pt-BR (spec `01-business-rules`). */
export const TIMELINE_EVENT_LABELS: Record<string, string> = {
  LEAD_CREATED: "Criado",
  CREATED: "Criado",
  LEAD_UPDATED: "Atualizado",
  UPDATED: "Atualizado",
  LEAD_ASSIGNED: "Distribuído",
  ASSIGNED: "Distribuído",
  DISTRIBUTED: "Distribuído",
  STAGE_CHANGED: "Status alterado",
  STATUS_CHANGED: "Status alterado",
  CONTACT_LOGGED: "Contato",
  NOTE_ADDED: "Observação",
  OBSERVATION_UPDATED: "Observação",
  CONTRACT_CREATED: "Contrato criado",
  CONTRACT_GENERATED: "Contrato gerado",
  CONTRACT_SENT: "Contrato enviado",
  CONTRACT_SIGNED: "Contrato assinado",
  CONTRACT_ARCHIVED: "Contrato arquivado",
  PAYMENT_RECEIVED: "Pagamento recebido",
  PAYMENT_CONFIRMED: "Pagamento confirmado",
  ATTACHMENT_ADDED: "Anexo adicionado",
  ATTACHMENT_DELETED: "Anexo removido",
  CALENDAR_EVENT_CREATED: "Evento agendado",
};

export function timelineEventLabel(type: string) {
  return TIMELINE_EVENT_LABELS[type] ?? humanizeEnumLabel(type);
}

function payloadText(payload: Record<string, unknown> | null | undefined, key: string) {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stageLabel(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const key = value.trim();
  return API_STAGE_LABELS[key] ?? humanizeEnumLabel(key);
}

/** Descrição na timeline: payload do CRM (`to_status`) ou rótulo do tipo. */
export function timelineEventDescription(
  type: string,
  payload?: Record<string, unknown> | null,
) {
  const explicit = payloadText(payload, "description") ?? payloadText(payload, "message");
  if (explicit) return explicit;

  if (type === "STAGE_CHANGED" || type === "STATUS_CHANGED") {
    const from = stageLabel(payload?.from_status);
    const to = stageLabel(payload?.to_status);
    if (from && to && from !== to) return `Status alterado: ${from} → ${to}`;
    if (to) return `Status alterado para ${to}`;
  }

  return timelineEventLabel(type);
}
