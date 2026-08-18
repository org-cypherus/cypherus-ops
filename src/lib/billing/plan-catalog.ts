import type { FeatureKey, FeatureState, PlanCode, ResolvedFeatures } from "./types";

type CatalogEntry = FeatureState;

const unlimitedUsers: CatalogEntry = { enabled: true, limit: null };

/** Catálogo canônico: tier da empresa → features/limites. */
export const PLAN_FEATURE_CATALOG: Record<PlanCode, ResolvedFeatures> = {
  ESSENTIAL: {
    crm: { enabled: true },
    kanban: { enabled: true },
    lead_history: { enabled: true },
    lead_distribution: { enabled: true },
    lead_distribution_advanced: { enabled: false },
    dashboard_basic: { enabled: true },
    dashboard_advanced: { enabled: false },
    dashboard_custom: { enabled: false },
    agenda: { enabled: false },
    contracts: { enabled: false },
    financial: { enabled: false },
    commissions: { enabled: false },
    advanced_permissions: { enabled: false },
    api: { enabled: false },
    webhooks: { enabled: false },
    customizations: { enabled: false },
    max_users: { enabled: true, limit: 5 },
  },
  PROFESSIONAL: {
    crm: { enabled: true },
    kanban: { enabled: true },
    lead_history: { enabled: true },
    lead_distribution: { enabled: true },
    lead_distribution_advanced: { enabled: false },
    dashboard_basic: { enabled: true },
    dashboard_advanced: { enabled: true },
    dashboard_custom: { enabled: false },
    agenda: { enabled: true },
    contracts: { enabled: true },
    financial: { enabled: true },
    commissions: { enabled: true },
    advanced_permissions: { enabled: true },
    api: { enabled: false },
    webhooks: { enabled: false },
    customizations: { enabled: false },
    max_users: { enabled: true, limit: 15 },
  },
  ENTERPRISE: {
    crm: { enabled: true },
    kanban: { enabled: true },
    lead_history: { enabled: true },
    lead_distribution: { enabled: true },
    lead_distribution_advanced: { enabled: true },
    dashboard_basic: { enabled: true },
    dashboard_advanced: { enabled: true },
    dashboard_custom: { enabled: true },
    agenda: { enabled: true },
    contracts: { enabled: true },
    financial: { enabled: true },
    commissions: { enabled: true },
    advanced_permissions: { enabled: true },
    api: { enabled: true },
    webhooks: { enabled: true },
    customizations: { enabled: true },
    max_users: unlimitedUsers,
  },
};

export const ALL_FEATURE_KEYS = Object.keys(PLAN_FEATURE_CATALOG.ENTERPRISE) as FeatureKey[];

export function planLabel(planCode: PlanCode) {
  switch (planCode) {
    case "ESSENTIAL":
      return "Essencial";
    case "PROFESSIONAL":
      return "Profissional";
    case "ENTERPRISE":
      return "Enterprise";
  }
}
