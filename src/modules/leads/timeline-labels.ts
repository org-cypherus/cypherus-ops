import { humanizeEnumLabel } from "@/lib/utils/labels";

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
