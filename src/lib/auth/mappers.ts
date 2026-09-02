import type { CompanyStatus, FeatureKey, PlanCode, ResolvedFeatures, SubscriptionStatus } from "@/lib/billing/types";
import { Role, ROLE_NAMES, type Permission, type RoleName } from "./permissions";

export const API_TO_UI_PERMISSION: Record<string, Permission> = {
  "leads.view": "crm:visualizar",
  "leads.create": "crm:criar",
  "leads.update": "crm:editar",
  "leads.delete": "crm:excluir",
  "contracts.view": "contratos:visualizar",
  "contracts.create": "contratos:criar",
  "contracts.update": "contratos:editar",
  "contracts.sign": "contratos:editar",
  "contracts.delete": "contratos:editar",
  "invoices.view": "financeiro:visualizar",
  "invoices.manage": "financeiro:editar",
  "payments.register": "financeiro:editar",
  "commissions.view": "financeiro:visualizar",
  "commissions.manage": "financeiro:editar",
  "dashboard.view": "dashboard:visualizar",
  "dashboard.advanced.view": "dashboard:visualizar",
  "users.view": "usuarios:visualizar",
  "users.invite": "usuarios:criar",
  "users.update": "usuarios:editar",
  "users.deactivate": "usuarios:excluir",
  "roles.view": "admin:visualizar",
  "roles.create": "admin:editar",
  "roles.update": "admin:editar",
  "permissions.override": "admin:editar",
  "distribution_rules.manage": "admin:editar",
  "leads.distribute": "admin:editar",
  "leads.assign": "crm:editar",
};

export const UI_TO_API_PERMISSION: Partial<Record<Permission, string>> = {
  "crm:visualizar": "leads.view",
  "crm:criar": "leads.create",
  "crm:editar": "leads.update",
  "crm:excluir": "leads.delete",
  "contratos:visualizar": "contracts.view",
  "contratos:criar": "contracts.create",
  "contratos:editar": "contracts.update",
  "financeiro:visualizar": "invoices.view",
  "financeiro:editar": "payments.register",
  "dashboard:visualizar": "dashboard.view",
  "usuarios:visualizar": "users.view",
  "usuarios:criar": "users.invite",
  "usuarios:editar": "users.update",
  "usuarios:excluir": "users.deactivate",
  "admin:visualizar": "roles.view",
  "admin:editar": "permissions.override",
};

const FEATURE_ALIAS: Record<string, FeatureKey> = {
  advanced_distribution: "lead_distribution_advanced",
  customization: "customizations",
  custom_dashboard: "dashboard_custom",
};

const ROLE_CODE_MAP: Record<string, RoleName> = {
  OWNER: Role.Administrador,
  ADMIN: Role.Administrador,
  ADMINISTRATOR: Role.Administrador,
  ADMINISTRADOR: Role.Administrador,
  MANAGER: Role.Gestor,
  GESTOR: Role.Gestor,
  SALES: Role.Comercial,
  COMERCIAL: Role.Comercial,
  FINANCE: Role.Financeiro,
  FINANCEIRO: Role.Financeiro,
  LEGAL: Role.Jurídico,
  JURIDICO: Role.Jurídico,
};

function normalizeRoleToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

/** Resolve code/nome gravado no CRM para o cargo da UI. Sem match → undefined. */
export function resolveRoleName(codeOrName?: string | null): RoleName | undefined {
  if (!codeOrName?.trim()) return undefined;
  const token = normalizeRoleToken(codeOrName);
  return ROLE_CODE_MAP[token] ?? ROLE_NAMES.find((name) => normalizeRoleToken(name) === token);
}

export type PermissionAccess = {
  permission: string;
  granted: boolean;
  scope?: string | null;
  source?: string;
};

export type FeatureAccess = {
  feature: string;
  enabled: boolean;
  limit?: number | null;
  unlimited?: boolean;
};

export function mapApiPermissions(items: PermissionAccess[] | undefined): Permission[] {
  const mapped = new Set<Permission>();
  for (const item of items ?? []) {
    if (!item.granted) continue;
    const ui = API_TO_UI_PERMISSION[item.permission];
    if (ui) mapped.add(ui);
  }
  return [...mapped];
}

export function mapApiFeatures(items: FeatureAccess[] | undefined): ResolvedFeatures {
  const features: ResolvedFeatures = {};
  for (const item of items ?? []) {
    const key = (FEATURE_ALIAS[item.feature] ?? item.feature) as FeatureKey;
    features[key] = {
      enabled: item.enabled,
      limit: item.unlimited ? null : item.limit,
    };
  }
  return features;
}

export function mapRoleCode(code: string | undefined, isOwner = false): RoleName {
  return resolveRoleName(code) ?? (isOwner ? Role.Administrador : Role.Comercial);
}

export function mapPlanCode(code: string | undefined): PlanCode {
  const normalized = (code || "").toUpperCase();
  if (normalized === "ESSENTIAL" || normalized === "PROFESSIONAL" || normalized === "ENTERPRISE") {
    return normalized;
  }
  return "ESSENTIAL";
}

export function mapCompanyStatus(status: string | undefined): CompanyStatus {
  if (status === "INACTIVE" || status === "SUSPENDED" || status === "ACTIVE") return status;
  return "ACTIVE";
}

export function mapSubscriptionStatus(status: string | undefined): SubscriptionStatus {
  if (
    status === "TRIAL" ||
    status === "ACTIVE" ||
    status === "PAST_DUE" ||
    status === "CANCELLED" ||
    status === "EXPIRED"
  ) {
    return status;
  }
  return "ACTIVE";
}

export function roleCodeFromUi(role: RoleName): string {
  switch (role) {
    case Role.Administrador:
      return "ADMIN";
    case Role.Gestor:
      return "MANAGER";
    case Role.Financeiro:
      return "FINANCE";
    case Role.Jurídico:
      return "LEGAL";
    default:
      return "SALES";
  }
}
