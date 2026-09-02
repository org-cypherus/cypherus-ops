export { landingColors } from "@/theme/palette";

export const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Planos", href: "#pricing" },
  { label: "Comparativo", href: "#compare" },
] as const;

export const hero = {
  badge: "Plataforma SaaS comercial",
  titleLead: "Segurança. Controle.",
  titleAccent: "Comando.",
  subtitle:
    "CRM, agenda, contratos, financeiro e administração em um só lugar — com planos sob medida para a operação da sua empresa.",
  primaryCta: { label: "Criar conta", href: "/signup" },
  secondaryCta: {
    label: "Falar com vendas",
    href: "mailto:comercial@cypherops.com.br",
  },
} as const;

export const features = [
  {
    title: "CRM (Leads + Pipeline)",
    description:
      "Dados pessoais, endereço, comerciais e do processo em um só lead — com timeline imutável e Kanban para previsibilidade de receita.",
    icon: "view_kanban" as const,
  },
  {
    title: "Agenda",
    description:
      "Agende retornos vinculados ao lead, visualize dia/semana/mês e receba lembretes dos compromissos comerciais e jurídicos.",
    icon: "calendar_month" as const,
  },
  {
    title: "Contratos",
    description:
      "Gere contratos a partir do lead com templates e placeholders, acompanhe até a assinatura e arquive com segurança.",
    icon: "description" as const,
  },
  {
    title: "Dashboard",
    description:
      "Indicadores comerciais e administrativos em tempo quase real para decisões rápidas da operação.",
    icon: "dashboard" as const,
  },
  {
    title: "Financeiro",
    description:
      "Pagamentos, pendências e comissões decorrentes de contratos assinados — com regras configuráveis por plano.",
    icon: "payments" as const,
  },
  {
    title: "Administração",
    description:
      "Usuários, perfis de acesso e permissões granulares (RBAC) alinhadas ao que cada assinatura libera.",
    icon: "admin_panel_settings" as const,
  },
  {
    title: "Relatórios",
    description:
      "Exporte dados operacionais e comerciais para análise externa com importação/exportação manual.",
    icon: "file_download" as const,
  },
] as const;

export type PlanId = "essencial" | "profissional" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  priceNote: string;
  pricePrefix?: string;
  highlight?: boolean;
  badge?: string;
  cta: { label: string; href: string; variant: "solid" | "outline" };
  features: string[];
};

export const plans: Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    price: "",
    priceNote: "/mês",
    cta: {
      label: "Começar no Essencial",
      href: "/signup?plan=essencial",
      variant: "outline",
    },
    features: [
      "5 usuários inclusos",
      "50 GB de armazenamento",
      "CRM + Pipeline Kanban",
      "Histórico básico",
      "Distribuição manual de leads",
      "Dashboard básico",
      "Importação/exportação manual",
      "Permissões básicas",
      "Anexos",
      "Suporte comercial",
    ],
  },
  {
    id: "profissional",
    name: "Profissional",
    price: "",
    priceNote: "/mês",
    highlight: true,
    badge: "Mais popular",
    cta: {
      label: "Começar no Profissional",
      href: "/signup?plan=profissional",
      variant: "solid",
    },
    features: [
      "15 usuários inclusos",
      "100 GB de armazenamento",
      "Tudo do Essencial",
      "Agenda (retornos e compromissos)",
      "Contratos (sem assinatura digital integrada)",
      "Financeiro básico + pagamentos",
      "Comissões com regras",
      "Distribuição automática",
      "Dashboard comercial + financeiro",
      "Histórico completo",
      "Permissões granulares",
      "Suporte prioritário",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "",
    priceNote: "/mês",
    pricePrefix: "a partir de",
    cta: {
      label: "Falar com vendas",
      href: "mailto:comercial@cypherops.com.br",
      variant: "outline",
    },
    features: [
      "25 usuários inclusos",
      "300 GB de armazenamento",
      "Tudo do Profissional",
      "Distribuição com regras avançadas",
      "Dashboard personalizado",
      "Financeiro completo",
      "Integrações múltiplas",
      "API e webhooks",
      "WhatsApp (1 número, inbox multi-user)",
      "Personalizações sob demanda",
      "Suporte prioritário",
    ],
  },
];

export const addons = [
  { item: "Usuário extra", price: "R$ 49 / mês" },
  { item: "Storage extra", price: "R$ 29 / 50 GB / mês" },
  {
    item: "WhatsApp (1 número, inbox multi-user, se não for Enterprise)",
    price: "R$ 149 / mês + tarifa Meta (repasse)",
  },
  { item: "Número WhatsApp extra", price: "R$ 99 / mês + Meta" },
  {
    item: "API / webhooks (se não for Enterprise)",
    price: "R$ 197 / mês",
  },
  {
    item: "Customização / integração",
    price: "Sob proposta",
  },
] as const;

export const proofPoints = [
  { value: "1", label: "Plataforma unificada" },
  { value: String(features.length), label: "Módulos principais" },
  { value: String(plans.length), label: "Planos comerciais" },
] as const;

export type ComparisonValue = boolean | string;

export const comparisonRows: {
  feature: string;
  essencial: ComparisonValue;
  profissional: ComparisonValue;
  enterprise: ComparisonValue;
}[] = [
  {
    feature: "Usuários inclusos",
    essencial: "5",
    profissional: "15",
    enterprise: "25",
  },
  {
    feature: "Storage incluso",
    essencial: "50 GB",
    profissional: "100 GB",
    enterprise: "300 GB",
  },
  { feature: "CRM", essencial: true, profissional: true, enterprise: true },
  { feature: "Kanban", essencial: true, profissional: true, enterprise: true },
  {
    feature: "Histórico de Leads",
    essencial: true,
    profissional: true,
    enterprise: true,
  },
  {
    feature: "Distribuição de Leads",
    essencial: true,
    profissional: true,
    enterprise: true,
  },
  {
    feature: "Dashboard Básico",
    essencial: true,
    profissional: true,
    enterprise: true,
  },
  {
    feature: "Dashboard Avançado",
    essencial: false,
    profissional: true,
    enterprise: true,
  },
  { feature: "Agenda", essencial: false, profissional: true, enterprise: true },
  {
    feature: "Contratos",
    essencial: false,
    profissional: true,
    enterprise: true,
  },
  {
    feature: "Financeiro",
    essencial: false,
    profissional: true,
    enterprise: true,
  },
  {
    feature: "Comissões",
    essencial: false,
    profissional: true,
    enterprise: true,
  },
  {
    feature: "Permissões Avançadas",
    essencial: false,
    profissional: true,
    enterprise: true,
  },
  { feature: "API", essencial: false, profissional: false, enterprise: true },
  {
    feature: "Webhooks",
    essencial: false,
    profissional: false,
    enterprise: true,
  },
  {
    feature: "Distribuição Avançada",
    essencial: false,
    profissional: false,
    enterprise: true,
  },
  {
    feature: "Dashboard Personalizado",
    essencial: false,
    profissional: false,
    enterprise: true,
  },
  {
    feature: "WhatsApp",
    essencial: false,
    profissional: false,
    enterprise: true,
  },
  {
    feature: "Personalizações",
    essencial: false,
    profissional: false,
    enterprise: true,
  },
];

export const PLAN_CODE_BY_ID = {
  essencial: "ESSENTIAL",
  profissional: "PROFESSIONAL",
  enterprise: "ENTERPRISE",
} as const;

/** Opções do formulário de signup (preço/nome sincronizados com `plans` hidratados da API). */
export const signupPlanNotes: Record<PlanId, string> = {
  essencial: "5 usuários · 50 GB · CRM",
  profissional: "15 usuários · 100 GB · Agenda · Contratos",
  enterprise: "25 usuários · 300 GB · integrações",
};

export type SignupPlanOption = {
  code: (typeof PLAN_CODE_BY_ID)[PlanId];
  planId: PlanId;
  label: string;
  price: string;
  note: string;
};

export function buildSignupPlanOptions(source: Plan[] = plans): SignupPlanOption[] {
  return source.map((plan) => ({
    code: PLAN_CODE_BY_ID[plan.id],
    planId: plan.id,
    label: plan.name,
    price: plan.pricePrefix && plan.price ? `${plan.pricePrefix} ${plan.price}` : plan.price,
    note: signupPlanNotes[plan.id],
  }));
}

export const signupPlanOptions = buildSignupPlanOptions();

export function findSignupPlanOption(code: string, options: SignupPlanOption[] = signupPlanOptions) {
  return options.find((option) => option.code === code) ?? options[1] ?? signupPlanOptions[1];
}

export function findPlanById(id: PlanId) {
  return plans.find((plan) => plan.id === id);
}
