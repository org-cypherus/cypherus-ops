export const PIPELINE_STAGES = [
  "Novo Lead",
  "Contato realizado",
  "Em negociação",
  "Contrato enviado",
  "Contrato assinado",
  "Pagamento confirmado",
  "Concluído",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type LeadPriority = "baixa" | "media" | "alta";

export const LEGAL_STAGES = ["Backlog", "Em andamento", "Finalizado"] as const;
export type LegalStage = (typeof LEGAL_STAGES)[number];

/** Canais de contato registrados manualmente na timeline (estilo CRM Facilita) */
export const TIMELINE_CONTACT_TYPES = [
  "WhatsApp",
  "Telefone",
  "VideoChamada",
  "E-mail",
  "Presencial",
] as const;

export type TimelineContactType = (typeof TIMELINE_CONTACT_TYPES)[number];

export type TimelineEvent = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userName: string;
};

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  createdAt: string;
};

export type Lead = {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  birthDate?: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  origin: string;
  campaign: string;
  channel: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  status: PipelineStage;
  priority: LeadPriority;
  tags: string[];
  process: {
    bank?: string;
    installments?: number;
    installmentValue?: number;
    financedValue?: number;
    totalValue: number;
    contractType?: string;
    notes?: string;
  };
  daysInStage: number;
  timeline: TimelineEvent[];
  attachments: Attachment[];
  observations?: string;
  /** Pipeline jurídico — preenchido após o comercial fechar a esteira */
  legalStatus?: LegalStage | null;
};

export type KanbanColumn = {
  status: PipelineStage;
  count: number;
  potentialValue: number;
  leads: Lead[];
};

export type KanbanBoard = {
  columns: KanbanColumn[];
};
