import type { CompanyStatus, PlanCode, SubscriptionStatus } from "@/lib/billing/types";

export const FEATURE_LABELS: Record<string, string> = {
  crm: "CRM",
  kanban: "Kanban",
  lead_history: "Histórico de leads",
  lead_distribution: "Distribuição de leads",
  lead_distribution_advanced: "Distribuição avançada",
  advanced_distribution: "Distribuição avançada",
  dashboard_basic: "Dashboard básico",
  dashboard_advanced: "Dashboard avançado",
  dashboard_custom: "Dashboard personalizado",
  custom_dashboard: "Dashboard personalizado",
  agenda: "Agenda",
  contracts: "Contratos",
  financial: "Financeiro",
  commissions: "Comissões",
  advanced_permissions: "Permissões avançadas",
  api: "API",
  webhooks: "Webhooks",
  customizations: "Personalizações",
  customization: "Personalizações",
  max_users: "Limite de usuários",
  attachments: "Anexos",
  integrations: "Integrações",
  integration_events: "Eventos de integração",
};

export function featureLabel(key: string) {
  return FEATURE_LABELS[key] ?? key;
}

export function companyStatusLabel(status: CompanyStatus | string) {
  switch (status) {
    case "ACTIVE":
      return "Ativa";
    case "INACTIVE":
      return "Inativa";
    case "SUSPENDED":
      return "Suspensa";
    default:
      return status;
  }
}

export function paymentStatusLabel(status: SubscriptionStatus | string) {
  switch (status) {
    case "ACTIVE":
      return "Pago";
    case "PAST_DUE":
      return "Pendente";
    case "TRIAL":
      return "Trial";
    case "CANCELLED":
      return "Cancelado";
    case "EXPIRED":
      return "Expirado";
    default:
      return status;
  }
}

export function planCodeFromApi(code: string | undefined): PlanCode {
  const normalized = (code || "").toUpperCase();
  if (normalized === "ESSENTIAL" || normalized === "PROFESSIONAL" || normalized === "ENTERPRISE") {
    return normalized;
  }
  return "ESSENTIAL";
}
