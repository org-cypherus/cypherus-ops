export type PlanCode = "ESSENTIAL" | "PROFESSIONAL" | "ENTERPRISE";

export type CompanyStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export type FeatureKey =
  | "crm"
  | "kanban"
  | "lead_history"
  | "lead_distribution"
  | "lead_distribution_advanced"
  | "dashboard_basic"
  | "dashboard_advanced"
  | "dashboard_custom"
  | "agenda"
  | "contracts"
  | "financial"
  | "commissions"
  | "advanced_permissions"
  | "api"
  | "webhooks"
  | "customizations"
  | "max_users";

export type FeatureState = {
  enabled: boolean;
  /** Limite numérico quando aplicável (ex.: max_users). `null` = ilimitado. */
  limit?: number | null;
};

export type CompanySummary = {
  id: string;
  name: string;
  status: CompanyStatus;
};

export type SubscriptionSummary = {
  planCode: PlanCode;
  status: SubscriptionStatus;
};

export type ResolvedFeatures = Partial<Record<FeatureKey, FeatureState>>;
