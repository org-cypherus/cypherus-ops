import { type Permission, type RoleName } from "@/lib/auth/permissions";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { defaultPasswordFromName } from "@/lib/utils/password";
import type { Attachment, Lead, LeadPriority, LegalStage, PipelineStage } from "@/modules/leads/types";
import { LEGAL_STAGES, PIPELINE_STAGES } from "@/modules/leads/types";

export { defaultPasswordFromName };

export type Contract = {
  id: string;
  leadId: string;
  leadName: string;
  templateId: string;
  templateName: string;
  status: "Rascunho" | "Enviado" | "Assinado" | "Arquivado";
  value: number;
  createdAt: string;
  signedAt?: string;
  pdfId?: string;
  signedPdfId?: string;
};

export type ContractTemplate = {
  id: string;
  name: string;
  description: string;
  placeholders: string[];
  body: string;
};

export type Payment = {
  id: string;
  contractId: string;
  leadName: string;
  leadId?: string;
  amount: number;
  dueDate: string;
  status: "Recebido" | "Pendente" | "Inadimplente";
  paidAt?: string;
};

export type Commission = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  period: string;
  status: "A pagar" | "Pago";
  paymentId?: string;
};

export type CommissionRule = {
  id: string;
  plan: string;
  type: "percentual" | "taxa" | "percentual_meta";
  value: number;
  /** Meta mínima acumulada no período. Em percentual_meta, % sobre o total se ≥ meta. */
  threshold?: number;
  /** Quando true, usada no cálculo automático ao confirmar pagamento */
  active?: boolean;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: RoleName;
  team: string;
  status: "Ativo" | "Inativo";
  /** Senha mock (padrão: último sobrenome + ano atual) */
  password: string;
  mustChangePassword: boolean;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

export type StoredFile = {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** Contas demo do MVP prévio — senha única para facilitar a call com o cliente */
export const DEMO_PASSWORD = "123456";

export const DEMO_ACCOUNTS = [
  {
    label: "Administrador",
    email: "ana@cypherops.com",
    password: DEMO_PASSWORD,
    name: "Ana Souza",
    role: "Administrador" as RoleName,
  },
  {
    label: "Comercial",
    email: "bruno@cypherops.com",
    password: DEMO_PASSWORD,
    name: "Bruno Lima",
    role: "Comercial" as RoleName,
  },
  {
    label: "Jurídico",
    email: "elena@cypherops.com",
    password: DEMO_PASSWORD,
    name: "Elena Rocha",
    role: "Jurídico" as RoleName,
  },
] as const;

export const mockUsers: AppUser[] = [
  { id: "u1", name: "Ana Souza", email: "ana@cypherops.com", phone: "(11) 98888-1001", role: "Administrador", team: "Operações", status: "Ativo", password: DEMO_PASSWORD, mustChangePassword: false },
  { id: "u2", name: "Bruno Lima", email: "bruno@cypherops.com", phone: "(11) 98888-1002", role: "Comercial", team: "Vendas", status: "Ativo", password: DEMO_PASSWORD, mustChangePassword: false },
  { id: "u3", name: "Carla Mendes", email: "carla@cypherops.com", phone: "(11) 98888-1003", role: "Gestor", team: "Vendas", status: "Ativo", password: DEMO_PASSWORD, mustChangePassword: false },
  { id: "u4", name: "Diego Alves", email: "diego@cypherops.com", phone: "(11) 98888-1004", role: "Financeiro", team: "Financeiro", status: "Ativo", password: DEMO_PASSWORD, mustChangePassword: false },
  { id: "u5", name: "Elena Rocha", email: "elena@cypherops.com", phone: "(11) 98888-1005", role: "Jurídico", team: "Jurídico", status: "Ativo", password: DEMO_PASSWORD, mustChangePassword: false },
];

export const currentUser: SessionUser = {
  id: "u1",
  name: "Ana Souza",
  email: "ana@cypherops.com",
  phone: "(11) 98888-1001",
  role: "Administrador",
  team: "Operações",
  permissions: [...ROLE_PERMISSIONS.Administrador],
  mustChangePassword: false,
};

export const mockRolePermissions: Record<RoleName, Permission[]> = {
  Administrador: [...ROLE_PERMISSIONS.Administrador],
  Gestor: [...ROLE_PERMISSIONS.Gestor],
  Comercial: [...ROLE_PERMISSIONS.Comercial],
  Financeiro: [...ROLE_PERMISSIONS.Financeiro],
  Jurídico: [...ROLE_PERMISSIONS.Jurídico],
};

export const generatedPdfs = new Map<string, StoredFile>();

let roundRobinIndex = 0;

const leadSeed: Array<Partial<Lead> & { name: string; status: PipelineStage; totalValue: number }> = [
  { name: "Carlos Eduardo Silva", status: "Em negociação", totalValue: 18500, priority: "alta", ownerName: "Bruno Lima", ownerId: "u2", daysInStage: 3 },
  { name: "Mariana Costa", status: "Novo Lead", totalValue: 9200, priority: "media", ownerName: "Bruno Lima", ownerId: "u2", daysInStage: 1 },
  { name: "TechWise Solutions", status: "Contato realizado", totalValue: 42000, priority: "alta", ownerName: "Carla Mendes", ownerId: "u3", daysInStage: 2 },
  { name: "Global Logistics Ltd", status: "Contrato enviado", totalValue: 27500, priority: "media", ownerName: "Bruno Lima", ownerId: "u2", daysInStage: 4 },
  { name: "Fernanda Oliveira", status: "Contrato assinado", totalValue: 15300, priority: "alta", ownerName: "Carla Mendes", ownerId: "u3", daysInStage: 1 },
  { name: "Ricardo Nunes", status: "Pagamento confirmado", totalValue: 11000, priority: "baixa", ownerName: "Bruno Lima", ownerId: "u2", daysInStage: 2 },
  { name: "Patricia Gomes", status: "Concluído", totalValue: 9800, priority: "media", ownerName: "Carla Mendes", ownerId: "u3", daysInStage: 5 },
  { name: "João Pedro Almeida", status: "Novo Lead", totalValue: 7600, priority: "baixa", ownerName: "Bruno Lima", ownerId: "u2", daysInStage: 0 },
  { name: "Helena Martins", status: "Em negociação", totalValue: 22100, priority: "alta", ownerName: "Carla Mendes", ownerId: "u3", daysInStage: 6 },
  { name: "Grupo Atlas", status: "Contato realizado", totalValue: 51000, priority: "alta", ownerName: "Bruno Lima", ownerId: "u2", daysInStage: 3 },
];

export let mockLeads: Lead[] = leadSeed.map((seed, index) => ({
  id: `lead-${index + 1}`,
  name: seed.name,
  cpf: `123.456.789-0${index}`,
  rg: `12.345.678-${index}`,
  birthDate: "1990-05-12",
  email: `${seed.name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
  phone: `(11) 9${1000 + index}-000${index}`,
  whatsapp: `(11) 9${1000 + index}-000${index}`,
  address: {
    cep: "01310-100",
    street: "Av. Paulista",
    number: `${1000 + index}`,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
  origin: index % 2 === 0 ? "Google Ads" : "Indicação",
  campaign: index % 2 === 0 ? "Revisão Q3" : "Parceiros",
  channel: index % 3 === 0 ? "WhatsApp" : "Site",
  ownerId: seed.ownerId || "u2",
  ownerName: seed.ownerName || "Bruno Lima",
  createdAt: daysAgo(10 - index),
  status: seed.status,
  priority: seed.priority || "media",
  tags: index % 2 === 0 ? ["hot", "pf"] : ["pj"],
  legalStatus: (["Contrato assinado", "Pagamento confirmado", "Concluído"] as PipelineStage[]).includes(seed.status)
    ? (seed.status === "Concluído" ? "Em andamento" : "Backlog")
    : null,
  process: {
    bank: "Banco Exemplo",
    installments: 48,
    installmentValue: Math.round((seed.totalValue / 48) * 100) / 100,
    financedValue: seed.totalValue * 0.85,
    totalValue: seed.totalValue,
    contractType: "Pessoa Física",
    notes: "Cliente interessado em redução de juros.",
  },
  daysInStage: seed.daysInStage ?? 1,
  timeline: [
    {
      id: `t-${index}-1`,
      type: "Criado",
      description: "Lead criado no sistema",
      createdAt: daysAgo(10 - index),
      userName: "Sistema",
    },
    {
      id: `t-${index}-2`,
      type: "Contato",
      description: "Primeiro contato realizado",
      createdAt: daysAgo(8 - index),
      userName: seed.ownerName || "Bruno Lima",
    },
  ],
  attachments: [
    {
      id: `a-${index}-1`,
      name: "documento.pdf",
      type: "application/pdf",
      size: 240000,
      url: "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK",
      createdAt: daysAgo(5),
    },
  ],
  observations: "Acompanhar retorno do cliente.",
}));

export const mockTemplates: ContractTemplate[] = [
  {
    id: "tpl-1",
    name: "Contrato Pessoa Física",
    description: "Modelo padrão PF",
    placeholders: ["{{nome}}", "{{cpf}}", "{{valor}}", "{{parcelas}}"],
    body: "Contrato entre Cypher Ops e {{nome}}, CPF {{cpf}}, no valor de {{valor}} em {{parcelas}} parcelas.",
  },
  {
    id: "tpl-2",
    name: "Contrato Pessoa Jurídica",
    description: "Modelo padrão PJ",
    placeholders: ["{{nome}}", "{{cnpj}}", "{{valor}}", "{{parcelas}}"],
    body: "Contrato PJ com {{nome}}, CNPJ {{cnpj}}, valor {{valor}}.",
  },
  {
    id: "tpl-3",
    name: "Contrato Premium",
    description: "Plano premium",
    placeholders: ["{{nome}}", "{{cpf}}", "{{valor}}"],
    body: "Contrato Premium para {{nome}} — valor {{valor}}.",
  },
];

export const mockContracts: Contract[] = [
  {
    id: "c1",
    leadId: "lead-5",
    leadName: "Fernanda Oliveira",
    templateId: "tpl-1",
    templateName: "Contrato Pessoa Física",
    status: "Assinado",
    value: 15300,
    createdAt: daysAgo(4),
    signedAt: daysAgo(2),
    pdfId: "pdf-c1",
  },
  {
    id: "c2",
    leadId: "lead-4",
    leadName: "Global Logistics Ltd",
    templateId: "tpl-2",
    templateName: "Contrato Pessoa Jurídica",
    status: "Enviado",
    value: 27500,
    createdAt: daysAgo(3),
    pdfId: "pdf-c2",
  },
  {
    id: "c3",
    leadId: "lead-1",
    leadName: "Carlos Eduardo Silva",
    templateId: "tpl-1",
    templateName: "Contrato Pessoa Física",
    status: "Rascunho",
    value: 18500,
    createdAt: daysAgo(1),
  },
];

// PDFs mock pré-gerados para contratos seed
[
  { id: "pdf-c1", name: "Contrato-Fernanda.html", mime: "text/html", body: "<h1>Contrato Assinado</h1><p>Fernanda Oliveira</p>" },
  { id: "pdf-c2", name: "Contrato-Global.html", mime: "text/html", body: "<h1>Contrato Enviado</h1><p>Global Logistics Ltd</p>" },
].forEach((f) => {
  generatedPdfs.set(f.id, {
    id: f.id,
    name: f.name,
    mime: f.mime,
    dataUrl: `data:text/html;charset=utf-8,${encodeURIComponent(f.body)}`,
  });
});

export const mockPayments: Payment[] = [
  { id: "p1", contractId: "c1", leadId: "lead-5", leadName: "Fernanda Oliveira", amount: 15300, dueDate: daysAgo(-2), status: "Recebido", paidAt: daysAgo(1) },
  { id: "p2", contractId: "c2", leadId: "lead-4", leadName: "Global Logistics Ltd", amount: 27500, dueDate: daysAgo(-5), status: "Pendente" },
  { id: "p3", contractId: "c3", leadId: "lead-1", leadName: "Carlos Eduardo Silva", amount: 18500, dueDate: daysAgo(10), status: "Inadimplente" },
];

export const mockCommissions: Commission[] = [
  { id: "cm1", userId: "u2", userName: "Bruno Lima", amount: 2295, period: "2026-07", status: "A pagar", paymentId: "p1" },
  { id: "cm2", userId: "u3", userName: "Carla Mendes", amount: 4120, period: "2026-07", status: "A pagar" },
];

export const mockCommissionRules: CommissionRule[] = [
  {
    id: "r0",
    plan: "Meta mínima 10k (vigente)",
    type: "percentual_meta",
    value: 10,
    threshold: 10000,
    active: true,
  },
  { id: "r1", plan: "Plano A", type: "percentual", value: 15, active: false },
  { id: "r2", plan: "Plano B", type: "percentual", value: 20, active: false },
  { id: "r3", plan: "Fixo Premium", type: "taxa", value: 500, active: false },
];

export const mockNotifications: NotificationItem[] = [
  { id: "n1", title: "Novo Lead", body: "Mariana Costa entrou no pipeline.", createdAt: daysAgo(0), read: false, href: "/leads/lead-2" },
  { id: "n2", title: "Contrato assinado", body: "Fernanda Oliveira assinou o contrato.", createdAt: daysAgo(1), read: false, href: "/contracts/c1" },
  { id: "n3", title: "Pagamento confirmado", body: "Recebimento de R$ 15.300 confirmado.", createdAt: daysAgo(1), read: true, href: "/financial?paymentId=p1" },
];

export function buildKanban(filters?: {
  ownerId?: string;
  origin?: string;
  priority?: string;
  tag?: string;
  from?: string;
  to?: string;
}) {
  const filtered = filterLeads(mockLeads, filters);
  return {
    columns: PIPELINE_STAGES.map((status) => {
      const leads = filtered.filter((l) => l.status === status);
      return {
        status,
        count: leads.length,
        potentialValue: leads.reduce((sum, l) => sum + l.process.totalValue, 0),
        leads,
      };
    }),
  };
}

export function filterLeads(
  leads: Lead[],
  filters?: {
    q?: string;
    ownerId?: string;
    origin?: string;
    priority?: string;
    tag?: string;
    status?: string;
    from?: string;
    to?: string;
  },
) {
  let items = [...leads];
  if (!filters) return items;
  const q = (filters.q || "").toLowerCase();
  if (q) {
    items = items.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.cpf.includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q),
    );
  }
  if (filters.ownerId) items = items.filter((l) => l.ownerId === filters.ownerId);
  if (filters.origin) items = items.filter((l) => l.origin === filters.origin);
  if (filters.priority) items = items.filter((l) => l.priority === filters.priority);
  if (filters.tag) items = items.filter((l) => l.tags.includes(filters.tag!));
  if (filters.status) items = items.filter((l) => l.status === filters.status);
  if (filters.from) items = items.filter((l) => l.createdAt >= filters.from!);
  if (filters.to) items = items.filter((l) => l.createdAt <= filters.to!);
  return items;
}

export function pushTimeline(lead: Lead, type: string, description: string): Lead {
  return {
    ...lead,
    timeline: [
      {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        description,
        createdAt: new Date().toISOString(),
        userName: currentUser.name,
      },
      ...lead.timeline,
    ],
  };
}

export function shouldHandoffToLegal(status: PipelineStage) {
  return (
    status === "Contrato assinado" ||
    status === "Pagamento confirmado" ||
    status === "Concluído"
  );
}

export function buildLegalKanban() {
  return {
    columns: LEGAL_STAGES.map((status) => {
      const leads = mockLeads.filter((l) => l.legalStatus === status);
      return {
        status,
        count: leads.length,
        potentialValue: leads.reduce((s, l) => s + l.process.totalValue, 0),
        leads,
      };
    }),
  };
}

export function updateLegalStatus(leadId: string, legalStatus: LegalStage) {
  mockLeads = mockLeads.map((lead) => {
    if (lead.id !== leadId) return lead;
    return pushTimeline(
      { ...lead, legalStatus },
      "Jurídico",
      `Status jurídico alterado para ${legalStatus}`,
    );
  });
}

export function updateLeadStatus(leadId: string, status: PipelineStage) {
  mockLeads = mockLeads.map((lead) => {
    if (lead.id !== leadId) return lead;
    let next: Lead = { ...lead, status, daysInStage: 0 };
    if (shouldHandoffToLegal(status) && !next.legalStatus) {
      next = { ...next, legalStatus: "Backlog" };
      next = pushTimeline(next, "Jurídico", "Lead enviado ao pipeline jurídico (Backlog)");
    }
    return pushTimeline(next, "Status", `Status alterado para ${status}`);
  });
}

export function createLead(input: Partial<Lead> & { name: string; email: string }): Lead {
  const owner =
    mockUsers.find((u) => u.id === input.ownerId) ||
    mockUsers.find((u) => u.role === "Comercial") ||
    mockUsers[1];
  const totalValue = input.process?.totalValue ?? 0;
  const lead: Lead = {
    id: `lead-${Date.now()}`,
    name: input.name,
    cpf: input.cpf || "",
    rg: input.rg,
    birthDate: input.birthDate,
    email: input.email,
    phone: input.phone || "",
    whatsapp: input.whatsapp || input.phone || "",
    address: input.address || {
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
    },
    origin: input.origin || "Manual",
    campaign: input.campaign || "",
    channel: input.channel || "Sistema",
    ownerId: owner.id,
    ownerName: owner.name,
    createdAt: new Date().toISOString(),
    status: (input.status as PipelineStage) || "Novo Lead",
    priority: (input.priority as LeadPriority) || "media",
    tags: input.tags || [],
    process: {
      bank: input.process?.bank,
      installments: input.process?.installments,
      installmentValue: input.process?.installmentValue,
      financedValue: input.process?.financedValue,
      totalValue,
      contractType: input.process?.contractType,
      notes: input.process?.notes,
    },
    daysInStage: 0,
    timeline: [
      {
        id: `t-${Date.now()}`,
        type: "Criado",
        description: "Lead criado no sistema",
        createdAt: new Date().toISOString(),
        userName: currentUser.name,
      },
    ],
    attachments: [],
    observations: input.observations,
    legalStatus: input.legalStatus ?? null,
  };
  mockLeads.unshift(lead);
  mockNotifications.unshift({
    id: `n-${Date.now()}`,
    title: "Novo Lead",
    body: `${lead.name} entrou no pipeline.`,
    createdAt: new Date().toISOString(),
    read: false,
    href: `/leads/${lead.id}`,
  });
  return lead;
}

export function patchLead(id: string, body: Partial<Lead>) {
  const index = mockLeads.findIndex((l) => l.id === id);
  if (index < 0) return null;
  const prev = mockLeads[index];
  let next: Lead = {
    ...prev,
    ...body,
    address: body.address ? { ...prev.address, ...body.address } : prev.address,
    process: body.process ? { ...prev.process, ...body.process } : prev.process,
  };
  if (body.ownerId && body.ownerId !== prev.ownerId) {
    const owner = mockUsers.find((u) => u.id === body.ownerId);
    if (owner) {
      next.ownerName = owner.name;
      next = pushTimeline(next, "Responsável", `Responsável alterado para ${owner.name}`);
    }
  } else {
    next = pushTimeline(next, "Atualização", "Lead atualizado");
  }
  if (body.status && body.status !== prev.status) {
    next.daysInStage = 0;
    next = pushTimeline(next, "Status", `Status alterado para ${body.status}`);
    if (shouldHandoffToLegal(body.status) && !next.legalStatus) {
      next = { ...next, legalStatus: "Backlog" };
      next = pushTimeline(next, "Jurídico", "Lead enviado ao pipeline jurídico (Backlog)");
    }
  }
  if (body.legalStatus && body.legalStatus !== prev.legalStatus) {
    next = pushTimeline(next, "Jurídico", `Status jurídico alterado para ${body.legalStatus}`);
  }
  mockLeads[index] = next;
  return next;
}

export function deleteLead(id: string) {
  const before = mockLeads.length;
  mockLeads = mockLeads.filter((l) => l.id !== id);
  return before !== mockLeads.length;
}

export function addAttachment(leadId: string, file: Attachment) {
  const index = mockLeads.findIndex((l) => l.id === leadId);
  if (index < 0) return null;
  mockLeads[index] = pushTimeline(
    {
      ...mockLeads[index],
      attachments: [file, ...mockLeads[index].attachments],
    },
    "Anexo",
    `Anexo adicionado: ${file.name}`,
  );
  return mockLeads[index];
}

export function removeAttachment(leadId: string, attachmentId: string) {
  const index = mockLeads.findIndex((l) => l.id === leadId);
  if (index < 0) return null;
  mockLeads[index] = {
    ...mockLeads[index],
    attachments: mockLeads[index].attachments.filter((a) => a.id !== attachmentId),
  };
  return mockLeads[index];
}

export function distributeLeadsInStore(payload: {
  strategy: string;
  leadIds?: string[];
  ownerId?: string;
  tags?: string[];
}) {
  const commercial = mockUsers.filter((u) => u.role === "Comercial" || u.role === "Gestor");
  let targets = payload.leadIds?.length
    ? mockLeads.filter((l) => payload.leadIds!.includes(l.id))
    : [...mockLeads];

  if (payload.strategy === "redistribute") {
    targets = targets.filter((l) => l.daysInStage >= 3 && l.status !== "Concluído");
  }

  targets.forEach((lead, i) => {
    const idx = mockLeads.findIndex((l) => l.id === lead.id);
    if (idx < 0) return;

    if (payload.strategy === "tags" && payload.tags?.length) {
      let next = {
        ...mockLeads[idx],
        tags: Array.from(new Set([...mockLeads[idx].tags, ...payload.tags])),
      };
      next = pushTimeline(next, "Tags", `Tags atualizadas: ${payload.tags.join(", ")}`);
      mockLeads[idx] = next;
      return;
    }

    let owner = commercial[0];
    if (payload.strategy === "manual" && payload.ownerId) {
      owner = mockUsers.find((u) => u.id === payload.ownerId) || owner;
    } else if (payload.strategy === "round_robin" || payload.strategy === "automatic" || payload.strategy === "redistribute") {
      owner = commercial[roundRobinIndex % commercial.length];
      roundRobinIndex += 1;
    } else if (payload.strategy === "team") {
      owner = commercial[(i + roundRobinIndex) % commercial.length];
    }
    let next = {
      ...mockLeads[idx],
      ownerId: owner.id,
      ownerName: owner.name,
      tags: payload.tags ? Array.from(new Set([...mockLeads[idx].tags, ...payload.tags])) : mockLeads[idx].tags,
    };
    next = pushTimeline(next, "Distribuição", `Distribuído para ${owner.name} (${payload.strategy})`);
    mockLeads[idx] = next;
  });

  return targets.length;
}

export function deleteUser(id: string, actorId: string) {
  if (id === actorId) return { ok: false as const, message: "Você não pode excluir o próprio usuário" };
  const user = mockUsers.find((u) => u.id === id);
  if (!user) return { ok: false as const, message: "Usuário não encontrado" };
  if (user.role === "Administrador") {
    const activeAdmins = mockUsers.filter((u) => u.role === "Administrador" && u.status === "Ativo" && u.id !== id);
    if (activeAdmins.length === 0) {
      return { ok: false as const, message: "Não é possível excluir o último administrador ativo" };
    }
  }
  const index = mockUsers.findIndex((u) => u.id === id);
  mockUsers.splice(index, 1);
  return { ok: true as const };
}

export function canDeactivateUser(targetId: string, actorId: string) {
  if (targetId === actorId) return { ok: false as const, message: "Você não pode inativar o próprio cadastro" };
  const user = mockUsers.find((u) => u.id === targetId);
  if (!user) return { ok: false as const, message: "Usuário não encontrado" };
  if (user.role === "Administrador" && user.status === "Ativo") {
    const otherActiveAdmins = mockUsers.filter(
      (u) => u.role === "Administrador" && u.status === "Ativo" && u.id !== targetId,
    );
    if (otherActiveAdmins.length === 0) {
      return { ok: false as const, message: "Não é possível inativar o último administrador ativo" };
    }
  }
  return { ok: true as const };
}

export function generateContractPdf(contract: Contract, lead: Lead, template: ContractTemplate) {
  const filled = template.body
    .replaceAll("{{nome}}", lead.name)
    .replaceAll("{{cpf}}", lead.cpf)
    .replaceAll("{{cnpj}}", lead.cpf)
    .replaceAll("{{valor}}", String(contract.value))
    .replaceAll("{{parcelas}}", String(lead.process.installments || 1));
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${template.name}</title></head><body><h1>${template.name}</h1><p>${filled}</p><p>Valor: ${contract.value}</p><p>Lead: ${lead.name}</p></body></html>`;
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  const id = `pdf-${contract.id}`;
  generatedPdfs.set(id, {
    id,
    name: `${template.name}-${lead.name}.html`,
    mime: "text/html",
    dataUrl,
  });
  return id;
}
