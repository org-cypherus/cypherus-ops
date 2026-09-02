import { Role, type Permission, type RoleName } from "@/lib/auth/permissions";
import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import type { PlatformStaff } from "@/lib/auth/platform";
import { resolveFeatures } from "@/lib/billing/access";
import type {
  CompanySummary,
  PlanCode,
  SubscriptionStatus,
} from "@/lib/billing/types";
import type { SessionUser } from "@/lib/auth/session";
import { defaultPasswordFromName } from "@/lib/utils/password";
import type { CalendarEvent } from "@/modules/calendar/types";
import type {
  Attachment,
  Lead,
  LeadPriority,
  LegalStage,
  PipelineStage,
} from "@/modules/leads/types";
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
  status: "Recebido" | "Pendente" | "Atrasado";
  paidAt?: string;
};

export type Commission = {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  period?: string;
  status: string;
  paymentId?: string;
};

export type CommissionRule = {
  id: string;
  plan: string;
  type: "percentual" | "taxa";
  value: number;
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
  companyId: string;
  /** Senha mock (padrão: último sobrenome + ano atual) */
  password: string;
  mustChangePassword: boolean;
  createdAt?: string;
};

export type MockCompany = CompanySummary & {
  legalName: string;
  document: string;
};

export type MockSubscription = {
  id: string;
  companyId: string;
  planCode: PlanCode;
  status: SubscriptionStatus;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  kind?: string;
  meta?: { eventIds?: string[]; leadId?: string; date?: string };
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

export const COMPANY_IDS = {
  enterprise: "co-enterprise",
  professional: "co-professional",
  essential: "co-essential",
  almeida: "co-almeida",
} as const;

export const mockCompanies: MockCompany[] = [
  {
    id: COMPANY_IDS.enterprise,
    name: "Cypher Ops Demo Enterprise",
    legalName: "Cypher Ops Demo Enterprise LTDA",
    document: "04.252.011/0001-10",
    status: "ACTIVE",
  },
  {
    id: COMPANY_IDS.professional,
    name: "Cypher Ops Demo Pro",
    legalName: "Cypher Ops Demo Pro LTDA",
    document: "11.222.333/0001-81",
    status: "ACTIVE",
  },
  {
    id: COMPANY_IDS.essential,
    name: "Cypher Ops Demo Essencial",
    legalName: "Cypher Ops Demo Essencial LTDA",
    document: "22.333.444/0001-55",
    status: "ACTIVE",
  },
  {
    id: COMPANY_IDS.almeida,
    name: "Almeida & Associados",
    legalName: "Almeida e Associados Advogados LTDA",
    document: "33.444.555/0001-20",
    status: "ACTIVE",
  },
];

export const mockSubscriptions: MockSubscription[] = [
  {
    id: "sub-enterprise",
    companyId: COMPANY_IDS.enterprise,
    planCode: "ENTERPRISE",
    status: "ACTIVE",
  },
  {
    id: "sub-professional",
    companyId: COMPANY_IDS.professional,
    planCode: "PROFESSIONAL",
    status: "ACTIVE",
  },
  {
    id: "sub-essential",
    companyId: COMPANY_IDS.essential,
    planCode: "ESSENTIAL",
    status: "TRIAL",
  },
  {
    id: "sub-almeida",
    companyId: COMPANY_IDS.almeida,
    planCode: "PROFESSIONAL",
    status: "PAST_DUE",
  },
];

export const DEMO_ACCOUNTS = [
  {
    label: Role.Administrador,
    email: "ana@cypherops.com",
    password: DEMO_PASSWORD,
    name: "Ana Souza",
    role: Role.Administrador,
  },
  {
    label: Role.Comercial,
    email: "bruno@cypherops.com",
    password: DEMO_PASSWORD,
    name: "Bruno Lima",
    role: Role.Comercial,
  },
  {
    label: Role.Jurídico,
    email: "elena@cypherops.com",
    password: DEMO_PASSWORD,
    name: "Elena Rocha",
    role: Role.Jurídico,
  },
] as const;

export const mockUsers: AppUser[] = [
  {
    id: "u1",
    name: "Ana Souza",
    email: "ana@cypherops.com",
    phone: "(11) 98888-1001",
    role: Role.Administrador,
    team: "Operações",
    status: "Ativo",
    companyId: COMPANY_IDS.enterprise,
    password: DEMO_PASSWORD,
    mustChangePassword: false,
  },
  {
    id: "u2",
    name: "Bruno Lima",
    email: "bruno@cypherops.com",
    phone: "(11) 98888-1002",
    role: Role.Comercial,
    team: "Vendas",
    status: "Ativo",
    companyId: COMPANY_IDS.professional,
    password: DEMO_PASSWORD,
    mustChangePassword: false,
  },
  {
    id: "u3",
    name: "Carla Mendes",
    email: "carla@cypherops.com",
    phone: "(11) 98888-1003",
    role: Role.Gestor,
    team: "Vendas",
    status: "Ativo",
    companyId: COMPANY_IDS.essential,
    password: DEMO_PASSWORD,
    mustChangePassword: false,
  },
  {
    id: "u4",
    name: "Diego Alves",
    email: "diego@cypherops.com",
    phone: "(11) 98888-1004",
    role: Role.Financeiro,
    team: "Financeiro",
    status: "Ativo",
    companyId: COMPANY_IDS.essential,
    password: DEMO_PASSWORD,
    mustChangePassword: false,
  },
  {
    id: "u5",
    name: "Elena Rocha",
    email: "elena@cypherops.com",
    phone: "(11) 98888-1005",
    role: Role.Jurídico,
    team: "Jurídico",
    status: "Ativo",
    companyId: COMPANY_IDS.professional,
    password: DEMO_PASSWORD,
    mustChangePassword: false,
  },
  {
    id: "u-ops",
    name: "Ops Cypher",
    email: "ops@cypherops.com.br",
    phone: "(11) 98888-1099",
    role: Role.Administrador,
    team: "Plataforma",
    status: "Ativo",
    companyId: COMPANY_IDS.enterprise,
    password: DEMO_PASSWORD,
    mustChangePassword: false,
  },
];

export const mockRolePermissions: Record<RoleName, Permission[]> = {
  [Role.Administrador]: [...ROLE_PERMISSIONS[Role.Administrador]],
  [Role.Gestor]: [...ROLE_PERMISSIONS[Role.Gestor]],
  [Role.Comercial]: [...ROLE_PERMISSIONS[Role.Comercial]],
  [Role.Financeiro]: [...ROLE_PERMISSIONS[Role.Financeiro]],
  [Role.Jurídico]: [...ROLE_PERMISSIONS[Role.Jurídico]],
};

export function getCompanyById(companyId: string) {
  return mockCompanies.find((company) => company.id === companyId);
}

export function getSubscriptionByCompanyId(companyId: string) {
  return mockSubscriptions.find(
    (subscription) => subscription.companyId === companyId,
  );
}

export type MockPlan = {
  id: string;
  code: PlanCode;
  name: string;
  description: string | null;
  billing_interval: "MONTHLY" | "YEARLY";
  price: string;
  is_active: boolean;
};

export const mockPlans: MockPlan[] = [
  {
    id: "plan-essential",
    code: "ESSENTIAL",
    name: "Essencial",
    description: "CRM e operação essencial",
    billing_interval: "MONTHLY",
    price: "349.90",
    is_active: true,
  },
  {
    id: "plan-professional",
    code: "PROFESSIONAL",
    name: "Profissional",
    description: "Contratos, financeiro e permissões",
    billing_interval: "MONTHLY",
    price: "449.90",
    is_active: true,
  },
  {
    id: "plan-enterprise",
    code: "ENTERPRISE",
    name: "Enterprise",
    description: "API, webhooks e personalizações",
    billing_interval: "MONTHLY",
    price: "1397.90",
    is_active: true,
  },
];

export type MockCatalogFeature = {
  id: string;
  key: string;
  name: string;
  type: "BOOLEAN" | "LIMIT" | "QUOTA";
  unit: string | null;
  is_active: boolean;
};

export const mockFeatureCatalog: MockCatalogFeature[] = [
  { id: "feature-crm", key: "crm", name: "CRM", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-kanban", key: "kanban", name: "Kanban", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-lead-history", key: "lead_history", name: "Histórico de leads", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-lead-distribution", key: "lead_distribution", name: "Distribuição de leads", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-dashboard-basic", key: "dashboard_basic", name: "Dashboard básico", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-dashboard-advanced", key: "dashboard_advanced", name: "Dashboard avançado", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-contracts", key: "contracts", name: "Contratos", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-financial", key: "financial", name: "Financeiro", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-commissions", key: "commissions", name: "Comissões", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-advanced-permissions", key: "advanced_permissions", name: "Permissões avançadas", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-api", key: "api", name: "API", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-webhooks", key: "webhooks", name: "Webhooks", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-advanced-distribution", key: "advanced_distribution", name: "Distribuição avançada", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-custom-dashboard", key: "custom_dashboard", name: "Dashboard personalizado", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-customization", key: "customization", name: "Personalizações", type: "BOOLEAN", unit: null, is_active: true },
  { id: "feature-max-users", key: "max_users", name: "Limite de usuários", type: "LIMIT", unit: "users", is_active: true },
  { id: "feature-attachments", key: "attachments", name: "Anexos", type: "BOOLEAN", unit: null, is_active: true },
];

export type MockFeatureOverride = {
  companyId: string;
  featureId: string;
  enabled: boolean;
  limit_value: number | null;
  is_unlimited: boolean;
};

export const mockFeatureOverrides: MockFeatureOverride[] = [];

const API_TO_UI_FEATURE: Record<string, string> = {
  advanced_distribution: "lead_distribution_advanced",
  customization: "customizations",
  custom_dashboard: "dashboard_custom",
};

export function toCompanyResponse(company: MockCompany) {
  return {
    id: company.id,
    name: company.name,
    legal_name: company.legalName,
    document: company.document,
    status: company.status,
    created_at: "2026-01-15T12:00:00.000Z",
    updated_at: "2026-01-15T12:00:00.000Z",
  };
}

export function resolveMockCompanyFeatures(companyId: string) {
  const subscription = getSubscriptionByCompanyId(companyId);
  const resolved = resolveFeatures(subscription?.planCode ?? "ESSENTIAL");
  return mockFeatureCatalog.map((feature) => {
    const uiKey = (API_TO_UI_FEATURE[feature.key] ?? feature.key) as keyof typeof resolved;
    const planState = resolved[uiKey];
    const override = mockFeatureOverrides.find(
      (item) => item.companyId === companyId && item.featureId === feature.id,
    );
    if (override) {
      return {
        feature: feature.key,
        type: feature.type,
        enabled: override.enabled,
        limit: override.is_unlimited ? null : override.limit_value,
        unlimited: override.is_unlimited,
        source: "OVERRIDE",
      };
    }
    return {
      feature: feature.key,
      type: feature.type,
      enabled: Boolean(planState?.enabled),
      limit: planState?.limit ?? null,
      unlimited: planState?.limit === null,
      source: planState ? "PLAN" : "DEFAULT",
    };
  });
}

/** Resolve User → Company → Subscription → features do catálogo (tier da empresa). */
export function buildSessionUser(user: AppUser): SessionUser {
  const company = getCompanyById(user.companyId);
  const subscription = getSubscriptionByCompanyId(user.companyId);
  if (!company || !subscription) {
    throw new Error(`Company/subscription missing for user ${user.id}`);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    team: user.team,
    permissions: [
      ...(mockRolePermissions[user.role] ?? ROLE_PERMISSIONS[user.role]),
    ],
    mustChangePassword: user.mustChangePassword,
    companyId: company.id,
    company: {
      id: company.id,
      name: company.name,
      status: company.status,
    },
    subscription: {
      planCode: subscription.planCode,
      status: subscription.status,
    },
    features: resolveFeatures(subscription.planCode),
    isPlatformAdmin: false,
  };
}

export const mockPlatformStaff: PlatformStaff & { password: string } = {
  id: "staff-ops",
  email: "staff@cypherops.com.br",
  role: "PLATFORM_ADMIN",
  last_login_at: null,
  password: DEMO_PASSWORD,
};

let currentPlatformStaff: PlatformStaff | null = null;

export function getCurrentPlatformStaff() {
  return currentPlatformStaff;
}

export function setCurrentPlatformStaff(staff: PlatformStaff | null) {
  currentPlatformStaff = staff;
}

export const currentUser: SessionUser = buildSessionUser(mockUsers[0]);

export const generatedPdfs = new Map<string, StoredFile>();
let roundRobinIndex = 0;

/** Regra padrão aplicada quando um lead novo entra sem responsável explícito */
export const distributionSettings = {
  /** Estratégias: manual | round_robin | automatic | team | redistribute */
  defaultStrategy: "round_robin" as
    | "manual"
    | "round_robin"
    | "automatic"
    | "team"
    | "redistribute",
};

export function commercialAssignees() {
  return mockUsers.filter(
    (u) =>
      (u.role === Role.Comercial || u.role === Role.Gestor) &&
      u.status === "Ativo",
  );
}

export function pickOwnerByStrategy(strategy: string, manualOwnerId?: string) {
  const commercial = commercialAssignees();
  if (!commercial.length) return mockUsers[0];

  if (strategy === "manual" && manualOwnerId) {
    return mockUsers.find((u) => u.id === manualOwnerId) || commercial[0];
  }

  const owner = commercial[roundRobinIndex % commercial.length];
  roundRobinIndex += 1;
  return owner;
}

const leadSeed: Array<
  Partial<Lead> & { name: string; status: PipelineStage; totalValue: number }
> = [
  {
    name: "Carlos Eduardo Silva",
    status: "Em negociação",
    totalValue: 18500,
    priority: "alta",
    ownerName: "Bruno Lima",
    ownerId: "u2",
    daysInStage: 3,
  },
  {
    name: "Mariana Costa",
    status: "Novo Lead",
    totalValue: 9200,
    priority: "media",
    ownerName: "Bruno Lima",
    ownerId: "u2",
    daysInStage: 1,
  },
  {
    name: "TechWise Solutions",
    status: "Contato realizado",
    totalValue: 42000,
    priority: "alta",
    ownerName: "Carla Mendes",
    ownerId: "u3",
    daysInStage: 2,
  },
  {
    name: "Global Logistics Ltd",
    status: "Contrato enviado",
    totalValue: 27500,
    priority: "media",
    ownerName: "Bruno Lima",
    ownerId: "u2",
    daysInStage: 4,
  },
  {
    name: "Fernanda Oliveira",
    status: "Contrato assinado",
    totalValue: 15300,
    priority: "alta",
    ownerName: "Carla Mendes",
    ownerId: "u3",
    daysInStage: 1,
  },
  {
    name: "Ricardo Nunes",
    status: "Pagamento confirmado",
    totalValue: 11000,
    priority: "baixa",
    ownerName: "Bruno Lima",
    ownerId: "u2",
    daysInStage: 2,
  },
  {
    name: "Patricia Gomes",
    status: "Concluído",
    totalValue: 9800,
    priority: "media",
    ownerName: "Carla Mendes",
    ownerId: "u3",
    daysInStage: 5,
  },
  {
    name: "João Pedro Almeida",
    status: "Novo Lead",
    totalValue: 7600,
    priority: "baixa",
    ownerName: "Bruno Lima",
    ownerId: "u2",
    daysInStage: 0,
  },
  {
    name: "Helena Martins",
    status: "Em negociação",
    totalValue: 22100,
    priority: "alta",
    ownerName: "Carla Mendes",
    ownerId: "u3",
    daysInStage: 6,
  },
  {
    name: "Grupo Atlas",
    status: "Contato realizado",
    totalValue: 51000,
    priority: "alta",
    ownerName: "Bruno Lima",
    ownerId: "u2",
    daysInStage: 3,
  },
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
  legalStatus: (
    [
      "Contrato assinado",
      "Pagamento confirmado",
      "Concluído",
    ] as PipelineStage[]
  ).includes(seed.status)
    ? seed.status === "Concluído"
      ? "Em andamento"
      : "Backlog"
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
  {
    id: "pdf-c1",
    name: "Contrato-Fernanda.html",
    mime: "text/html",
    body: "<h1>Contrato Assinado</h1><p>Fernanda Oliveira</p>",
  },
  {
    id: "pdf-c2",
    name: "Contrato-Global.html",
    mime: "text/html",
    body: "<h1>Contrato Enviado</h1><p>Global Logistics Ltd</p>",
  },
].forEach((f) => {
  generatedPdfs.set(f.id, {
    id: f.id,
    name: f.name,
    mime: f.mime,
    dataUrl: `data:text/html;charset=utf-8,${encodeURIComponent(f.body)}`,
  });
});

export const mockPayments: Payment[] = [
  {
    id: "p1",
    contractId: "c1",
    leadId: "lead-5",
    leadName: "Fernanda Oliveira",
    amount: 15300,
    dueDate: daysAgo(-2),
    status: "Recebido",
    paidAt: daysAgo(1),
  },
  {
    id: "p2",
    contractId: "c2",
    leadId: "lead-4",
    leadName: "Global Logistics Ltd",
    amount: 27500,
    dueDate: daysAgo(-5),
    status: "Pendente",
  },
  {
    id: "p3",
    contractId: "c3",
    leadId: "lead-1",
    leadName: "Carlos Eduardo Silva",
    amount: 18500,
    dueDate: daysAgo(10),
    status: "Atrasado",
  },
];

export const mockCommissions: Commission[] = [
  {
    id: "cm1",
    userId: "u2",
    userName: "Bruno Lima",
    amount: 2295,
    period: "2026-07",
    status: "Percentual",
    paymentId: "p1",
  },
  {
    id: "cm2",
    userId: "u3",
    userName: "Carla Mendes",
    amount: 4120,
    period: "2026-07",
    status: "Fixa",
  },
];

export const mockCommissionRules: CommissionRule[] = [
  {
    id: "r0",
    plan: "Comissão padrão 10%",
    type: "percentual",
    value: 10,
    active: true,
  },
  { id: "r1", plan: "Plano A", type: "percentual", value: 15, active: false },
  { id: "r2", plan: "Plano B", type: "percentual", value: 20, active: false },
  { id: "r3", plan: "Fixo Premium", type: "taxa", value: 500, active: false },
];

export const mockNotifications: NotificationItem[] = [
  {
    id: "n1",
    title: "Novo Lead",
    body: "Mariana Costa entrou no pipeline.",
    createdAt: daysAgo(0),
    read: false,
    href: "/leads/lead-2",
  },
  {
    id: "n2",
    title: "Contrato assinado",
    body: "Fernanda Oliveira assinou o contrato.",
    createdAt: daysAgo(1),
    read: false,
    href: "/contracts/c1",
  },
  {
    id: "n3",
    title: "Pagamento confirmado",
    body: "Recebimento de R$ 15.300 confirmado.",
    createdAt: daysAgo(1),
    read: true,
    href: "/financial?paymentId=p1",
  },
];

function atLocal(dayOffset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function findUserName(userId: string) {
  return mockUsers.find((u) => u.id === userId)?.name || "Usuário";
}

function findLeadName(leadId: string | null | undefined) {
  if (!leadId) return null;
  return mockLeads.find((l) => l.id === leadId)?.name || null;
}

export let mockCalendarEvents: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Retorno — Carlos Eduardo Silva",
    description: "Confirmar interesse e enviar proposta",
    type: "retorno",
    status: "agendado",
    startsAt: atLocal(0, 10, 0),
    endsAt: atLocal(0, 10, 30),
    allDay: false,
    leadId: "lead-1",
    leadName: "Carlos Eduardo Silva",
    assigneeId: "u2",
    assigneeName: "Bruno Lima",
    createdById: "u2",
    remindAt: atLocal(0, 0, 0),
    completedAt: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "evt-2",
    title: "Retorno — Mariana Costa",
    description: "Ligar para qualificar orçamento",
    type: "retorno",
    status: "agendado",
    startsAt: atLocal(0, 14, 0),
    endsAt: atLocal(0, 14, 30),
    allDay: false,
    leadId: "lead-2",
    leadName: "Mariana Costa",
    assigneeId: "u2",
    assigneeName: "Bruno Lima",
    createdById: "u1",
    remindAt: atLocal(0, 0, 0),
    completedAt: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "evt-3",
    title: "Reunião — Fernanda Oliveira",
    description: "Alinhamento jurídico pós-assinatura",
    type: "reuniao",
    status: "agendado",
    startsAt: atLocal(1, 11, 0),
    endsAt: atLocal(1, 12, 0),
    allDay: false,
    leadId: "lead-5",
    leadName: "Fernanda Oliveira",
    assigneeId: "u5",
    assigneeName: "Elena Rocha",
    createdById: "u5",
    remindAt: atLocal(1, 0, 0),
    completedAt: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "evt-4",
    title: "Retorno — Helena Martins",
    description: "Follow-up da proposta enviada",
    type: "retorno",
    status: "agendado",
    startsAt: atLocal(2, 16, 0),
    endsAt: atLocal(2, 16, 30),
    allDay: false,
    leadId: "lead-9",
    leadName: "Helena Martins",
    assigneeId: "u3",
    assigneeName: "Carla Mendes",
    createdById: "u3",
    remindAt: atLocal(2, 0, 0),
    completedAt: null,
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
  },
];

export function canAccessCalendarEvent(event: CalendarEvent) {
  if (currentUser.role === Role.Comercial) {
    return event.assigneeId === currentUser.id;
  }
  return true;
}

export function resolveCalendarAssigneeScope(
  requestedAssigneeId?: string | null,
) {
  if (currentUser.role === Role.Comercial) return currentUser.id;
  return requestedAssigneeId || undefined;
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filters?: {
    from?: string;
    to?: string;
    assigneeId?: string;
    leadId?: string;
    type?: string;
    status?: string;
  },
) {
  let items = events.filter((event) => canAccessCalendarEvent(event));
  if (!filters) return items;
  if (filters.from) items = items.filter((e) => e.endsAt >= filters.from!);
  if (filters.to) items = items.filter((e) => e.startsAt <= filters.to!);
  const assigneeId = resolveCalendarAssigneeScope(filters.assigneeId);
  if (assigneeId) items = items.filter((e) => e.assigneeId === assigneeId);
  if (filters.leadId) items = items.filter((e) => e.leadId === filters.leadId);
  if (filters.type) items = items.filter((e) => e.type === filters.type);
  if (filters.status) items = items.filter((e) => e.status === filters.status);
  return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function formatTimelineWhen(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function appendCalendarTimeline(
  leadId: string | null | undefined,
  type: string,
  description: string,
) {
  if (!leadId) return;
  addTimelineEntry(leadId, type, description);
}

export function createCalendarEventInStore(payload: {
  title: string;
  description?: string;
  type: CalendarEvent["type"];
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  leadId?: string | null;
  assigneeId: string;
  remindAt?: string | null;
}) {
  const now = new Date().toISOString();
  const start = new Date(payload.startsAt);
  const end = new Date(payload.endsAt);
  if (!(end > start)) throw new Error("endsAt deve ser após startsAt");
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
    throw new Error("Duração máxima de 24h");
  }
  if (payload.type === "retorno" && !payload.leadId) {
    throw new Error("Retorno exige leadId");
  }

  const event: CalendarEvent = {
    id: `evt-${Date.now()}`,
    title: payload.title.trim(),
    description: payload.description?.trim() || undefined,
    type: payload.type,
    status: "agendado",
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    allDay: Boolean(payload.allDay),
    leadId: payload.leadId || null,
    leadName: findLeadName(payload.leadId),
    assigneeId: payload.assigneeId,
    assigneeName: findUserName(payload.assigneeId),
    createdById: currentUser.id,
    remindAt:
      payload.remindAt ??
      new Date(new Date(payload.startsAt).setHours(0, 0, 0, 0)).toISOString(),
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  mockCalendarEvents = [event, ...mockCalendarEvents];
  appendCalendarTimeline(
    event.leadId,
    "Agenda",
    `Retorno agendado para ${formatTimelineWhen(event.startsAt)}`,
  );
  syncCalendarReminderNotifications();
  return event;
}

export function patchCalendarEventInStore(
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    type: CalendarEvent["type"];
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    leadId: string | null;
    assigneeId: string;
    remindAt: string | null;
    status: CalendarEvent["status"];
  }>,
) {
  const index = mockCalendarEvents.findIndex((e) => e.id === id);
  if (index < 0) return null;
  const prev = mockCalendarEvents[index];
  const next: CalendarEvent = {
    ...prev,
    ...payload,
    title: payload.title?.trim() ?? prev.title,
    description:
      payload.description !== undefined
        ? payload.description.trim() || undefined
        : prev.description,
    leadId: payload.leadId !== undefined ? payload.leadId : prev.leadId,
    leadName:
      payload.leadId !== undefined
        ? findLeadName(payload.leadId)
        : prev.leadName,
    assigneeId: payload.assigneeId ?? prev.assigneeId,
    assigneeName: payload.assigneeId
      ? findUserName(payload.assigneeId)
      : prev.assigneeName,
    updatedAt: new Date().toISOString(),
  };

  if (new Date(next.endsAt) <= new Date(next.startsAt)) {
    throw new Error("endsAt deve ser após startsAt");
  }
  if (next.type === "retorno" && !next.leadId) {
    throw new Error("Retorno exige leadId");
  }

  const rescheduled =
    payload.startsAt !== undefined && payload.startsAt !== prev.startsAt;
  mockCalendarEvents[index] = next;

  if (rescheduled) {
    appendCalendarTimeline(
      next.leadId,
      "Agenda",
      `Retorno remarcado para ${formatTimelineWhen(next.startsAt)}`,
    );
  }
  syncCalendarReminderNotifications();
  return next;
}

export function completeCalendarEventInStore(id: string) {
  const index = mockCalendarEvents.findIndex((e) => e.id === id);
  if (index < 0) return null;
  const event = mockCalendarEvents[index];
  const next: CalendarEvent = {
    ...event,
    status: "concluido",
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockCalendarEvents[index] = next;
  appendCalendarTimeline(next.leadId, "Agenda", "Retorno concluído");
  syncCalendarReminderNotifications();
  return next;
}

export function cancelCalendarEventInStore(id: string) {
  const index = mockCalendarEvents.findIndex((e) => e.id === id);
  if (index < 0) return null;
  const event = mockCalendarEvents[index];
  const next: CalendarEvent = {
    ...event,
    status: "cancelado",
    updatedAt: new Date().toISOString(),
  };
  mockCalendarEvents[index] = next;
  appendCalendarTimeline(next.leadId, "Agenda", "Retorno cancelado");
  syncCalendarReminderNotifications();
  return next;
}

export function deleteCalendarEventInStore(id: string) {
  const index = mockCalendarEvents.findIndex((e) => e.id === id);
  if (index < 0) return false;
  mockCalendarEvents.splice(index, 1);
  syncCalendarReminderNotifications();
  return true;
}

function sameLocalDay(a: string | Date, b: string | Date) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function localDateKey(value: string | Date = new Date()) {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Garante notificação idempotente de retornos do dia para o usuário atual */
export function syncCalendarReminderNotifications() {
  const todayKey = localDateKey();
  const due = mockCalendarEvents.filter(
    (event) =>
      event.assigneeId === currentUser.id &&
      event.status === "agendado" &&
      sameLocalDay(event.startsAt, new Date()) &&
      (event.remindAt == null || new Date(event.remindAt) <= new Date()),
  );

  const notifId = `n-cal-${todayKey}-${currentUser.id}`;
  const existingIdx = mockNotifications.findIndex((n) => n.id === notifId);

  if (!due.length) {
    if (existingIdx >= 0) mockNotifications.splice(existingIdx, 1);
    return;
  }

  const eventIds = due.map((e) => e.id);
  const nextMeta = {
    eventIds,
    leadId: due.length === 1 ? due[0].leadId || undefined : undefined,
    date: todayKey,
  };

  const next =
    due.length === 1
      ? {
          title: "Retorno do dia",
          body: `Retorno: ${due[0].leadName || due[0].title} às ${new Intl.DateTimeFormat(
            "pt-BR",
            {
              hour: "2-digit",
              minute: "2-digit",
            },
          ).format(new Date(due[0].startsAt))}`,
          href: due[0].leadId
            ? `/leads/${due[0].leadId}`
            : `/calendar?date=${todayKey}`,
        }
      : {
          title: "Retornos do dia",
          body: `Você tem ${due.length} retornos pendentes hoje`,
          href: `/calendar?date=${todayKey}`,
        };

  if (existingIdx >= 0) {
    const existing = mockNotifications[existingIdx];
    const prevIds = [...(existing.meta?.eventIds || [])].sort().join(",");
    const nextIds = [...eventIds].sort().join(",");
    mockNotifications[existingIdx] = {
      ...existing,
      title: next.title,
      body: next.body,
      href: next.href,
      kind: "calendar_reminder",
      meta: nextMeta,
      // Só volta a não-lida se o conjunto de eventos do dia mudou
      read: prevIds === nextIds ? existing.read : false,
    };
    return;
  }

  mockNotifications.unshift({
    id: notifId,
    title: next.title,
    body: next.body,
    createdAt: new Date().toISOString(),
    read: false,
    href: next.href,
    kind: "calendar_reminder",
    meta: nextMeta,
  });
}

export function listNotificationsForCurrentUser() {
  syncCalendarReminderNotifications();
  return mockNotifications;
}
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
  if (filters.ownerId)
    items = items.filter((l) => l.ownerId === filters.ownerId);
  if (filters.origin) items = items.filter((l) => l.origin === filters.origin);
  if (filters.priority)
    items = items.filter((l) => l.priority === filters.priority);
  if (filters.tag) items = items.filter((l) => l.tags.includes(filters.tag!));
  if (filters.status) items = items.filter((l) => l.status === filters.status);
  if (filters.from) items = items.filter((l) => l.createdAt >= filters.from!);
  if (filters.to) items = items.filter((l) => l.createdAt <= filters.to!);
  return items;
}

export function pushTimeline(
  lead: Lead,
  type: string,
  description: string,
): Lead {
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

export function addTimelineEntry(
  leadId: string,
  type: string,
  description: string,
) {
  const index = mockLeads.findIndex((l) => l.id === leadId);
  if (index < 0) return null;
  const note = description.trim() || `Contato registrado via ${type}`;
  mockLeads[index] = pushTimeline(mockLeads[index], type, note);
  return mockLeads[index];
}

/** Comercial só vê os próprios leads; demais perfis respeitam o filtro opcional */
export function resolveOwnerScope(requestedOwnerId?: string | null) {
  if (currentUser.role === Role.Comercial) return currentUser.id;
  return requestedOwnerId || undefined;
}

export function canAccessLead(lead: Lead) {
  if (currentUser.role === Role.Comercial)
    return lead.ownerId === currentUser.id;
  return true;
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
      next = pushTimeline(
        next,
        "Jurídico",
        "Lead enviado ao pipeline jurídico (Backlog)",
      );
    }
    return pushTimeline(next, "Status", `Status alterado para ${status}`);
  });
}

export function createLead(
  input: Partial<Lead> & { name: string; email: string },
): Lead {
  // Responsável explícito (admin/gestor) OU regra padrão de distribuição do admin
  const owner = input.ownerId
    ? mockUsers.find((u) => u.id === input.ownerId) ||
      pickOwnerByStrategy(distributionSettings.defaultStrategy)
    : pickOwnerByStrategy(distributionSettings.defaultStrategy);
  const assignedByRule = !input.ownerId;
  const totalValue = input.process?.totalValue ?? 0;
  let lead: Lead = {
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
  if (assignedByRule) {
    lead = pushTimeline(
      lead,
      "Distribuição",
      `Atribuído a ${owner.name} pela regra padrão (${distributionSettings.defaultStrategy})`,
    );
  }
  mockLeads.unshift(lead);
  mockNotifications.unshift({
    id: `n-${Date.now()}`,
    title: "Novo Lead",
    body: `${lead.name} entrou no pipeline · responsável: ${owner.name}`,
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
      next = pushTimeline(
        next,
        "Responsável",
        `Responsável alterado para ${owner.name}`,
      );
    }
  } else {
    next = pushTimeline(next, "Atualização", "Lead atualizado");
  }
  if (body.status && body.status !== prev.status) {
    next.daysInStage = 0;
    next = pushTimeline(next, "Status", `Status alterado para ${body.status}`);
    if (shouldHandoffToLegal(body.status) && !next.legalStatus) {
      next = { ...next, legalStatus: "Backlog" };
      next = pushTimeline(
        next,
        "Jurídico",
        "Lead enviado ao pipeline jurídico (Backlog)",
      );
    }
  }
  if (body.legalStatus && body.legalStatus !== prev.legalStatus) {
    next = pushTimeline(
      next,
      "Jurídico",
      `Status jurídico alterado para ${body.legalStatus}`,
    );
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
    attachments: mockLeads[index].attachments.filter(
      (a) => a.id !== attachmentId,
    ),
  };
  return mockLeads[index];
}

export function distributeLeadsInStore(payload: {
  strategy: string;
  leadIds?: string[];
  ownerId?: string;
  tags?: string[];
}) {
  const commercial = commercialAssignees();
  let targets = payload.leadIds?.length
    ? mockLeads.filter((l) => payload.leadIds!.includes(l.id))
    : [...mockLeads];

  if (payload.strategy === "redistribute") {
    targets = targets.filter(
      (l) => l.daysInStage >= 3 && l.status !== "Concluído",
    );
  }

  targets.forEach((lead) => {
    const idx = mockLeads.findIndex((l) => l.id === lead.id);
    if (idx < 0) return;

    if (payload.strategy === "tags" && payload.tags?.length) {
      let next = {
        ...mockLeads[idx],
        tags: Array.from(new Set([...mockLeads[idx].tags, ...payload.tags])),
      };
      next = pushTimeline(
        next,
        "Tags",
        `Tags atualizadas: ${payload.tags.join(", ")}`,
      );
      mockLeads[idx] = next;
      return;
    }

    let owner = commercial[0];
    if (payload.strategy === "manual" && payload.ownerId) {
      owner = pickOwnerByStrategy("manual", payload.ownerId);
    } else if (
      payload.strategy === "round_robin" ||
      payload.strategy === "automatic" ||
      payload.strategy === "redistribute" ||
      payload.strategy === "team"
    ) {
      owner = pickOwnerByStrategy(payload.strategy);
    }
    let next = {
      ...mockLeads[idx],
      ownerId: owner.id,
      ownerName: owner.name,
      tags: payload.tags
        ? Array.from(new Set([...mockLeads[idx].tags, ...payload.tags]))
        : mockLeads[idx].tags,
    };
    next = pushTimeline(
      next,
      "Distribuição",
      `Distribuído para ${owner.name} (${payload.strategy})`,
    );
    mockLeads[idx] = next;
  });

  return targets.length;
}

export function deleteUser(id: string, actorId: string) {
  if (id === actorId)
    return {
      ok: false as const,
      message: "Você não pode excluir o próprio usuário",
    };
  const user = mockUsers.find((u) => u.id === id);
  if (!user) return { ok: false as const, message: "Usuário não encontrado" };
  if (user.role === Role.Administrador) {
    const activeAdmins = mockUsers.filter(
      (u) =>
        u.role === Role.Administrador && u.status === "Ativo" && u.id !== id,
    );
    if (activeAdmins.length === 0) {
      return {
        ok: false as const,
        message: "Não é possível excluir o último administrador ativo",
      };
    }
  }
  const index = mockUsers.findIndex((u) => u.id === id);
  mockUsers.splice(index, 1);
  return { ok: true as const };
}

export function canDeactivateUser(targetId: string, actorId: string) {
  if (targetId === actorId)
    return {
      ok: false as const,
      message: "Você não pode inativar o próprio cadastro",
    };
  const user = mockUsers.find((u) => u.id === targetId);
  if (!user) return { ok: false as const, message: "Usuário não encontrado" };
  if (user.role === Role.Administrador && user.status === "Ativo") {
    const otherActiveAdmins = mockUsers.filter(
      (u) =>
        u.role === Role.Administrador &&
        u.status === "Ativo" &&
        u.id !== targetId,
    );
    if (otherActiveAdmins.length === 0) {
      return {
        ok: false as const,
        message: "Não é possível inativar o último administrador ativo",
      };
    }
  }
  return { ok: true as const };
}

export function generateContractPdf(
  contract: Contract,
  lead: Lead,
  template: ContractTemplate,
) {
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
