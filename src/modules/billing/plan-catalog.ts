import { api } from "@/lib/api/client";
import type { PlanCode } from "@/lib/billing/types";
import { type PlanResponse } from "@/modules/auth/services";
import {
  comparisonRows,
  plans,
  type ComparisonValue,
  type Plan,
  type PlanId,
} from "@/modules/landing/content";

export type FeatureCatalogItem = {
  id: string;
  key: string;
};

export type PlanFeatureItem = {
  plan_id: string;
  feature_id: string;
  enabled: boolean;
  limit_value: number | null;
  is_unlimited: boolean;
};

export type PlanLimits = {
  usersLabel?: string;
  usersValue?: ComparisonValue;
  storageLabel?: string;
  storageValue?: ComparisonValue;
};

export type PlanLimitsMap = Partial<Record<PlanId, PlanLimits>>;

const KNOWN_PLAN_CODES = new Set<PlanCode>(["ESSENTIAL", "PROFESSIONAL", "ENTERPRISE"]);

const PLAN_ID_BY_CODE: Record<PlanCode, PlanId> = {
  ESSENTIAL: "essencial",
  PROFESSIONAL: "profissional",
  ENTERPRISE: "enterprise",
};

export function planIdFromCode(code: string | undefined): PlanId | undefined {
  const normalized = (code || "").toUpperCase() as PlanCode;
  if (!KNOWN_PLAN_CODES.has(normalized)) return undefined;
  return PLAN_ID_BY_CODE[normalized];
}

export function parseCatalogPrice(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function formatPlanListPrice(value: number): string {
  if (value <= 0) return "Sob consulta";
  const integer = Number.isInteger(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: integer ? 0 : 2,
    maximumFractionDigits: integer ? 0 : 2,
  }).format(value);
}

export function formatStorageLimit(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) {
    const rounded = Math.round(gb * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded} GB` : `${rounded.toFixed(1)} GB`;
  }
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) {
    const rounded = Math.round(mb);
    return `${rounded} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function catalogByPlanId(catalog: PlanResponse[]): Map<PlanId, PlanResponse> {
  const byId = new Map<PlanId, PlanResponse>();
  for (const item of catalog) {
    if (item.is_active === false) continue;
    const id = planIdFromCode(item.code);
    if (!id) continue;
    byId.set(id, item);
  }
  return byId;
}

export function hydratePlansFromCatalog(
  catalog: PlanResponse[],
  limits: PlanLimitsMap = {},
  copy: Plan[] = plans,
): Plan[] {
  const byId = catalogByPlanId(catalog);
  return copy.map((plan) => {
    const item = byId.get(plan.id);
    const amount = parseCatalogPrice(item?.price);
    const price = amount == null ? "" : formatPlanListPrice(amount);
    const limit = limits[plan.id];
    const features = [...plan.features];
    if (limit?.usersLabel) features[0] = limit.usersLabel;
    if (limit?.storageLabel) features[1] = limit.storageLabel;
    return {
      ...plan,
      name: item?.name || plan.name,
      price,
      pricePrefix: amount != null && amount <= 0 ? undefined : plan.pricePrefix,
      priceNote: amount != null && amount <= 0 ? "" : plan.priceNote,
      features,
    };
  });
}

export function hydrateComparisonRows(
  limits: PlanLimitsMap,
  rows: typeof comparisonRows = comparisonRows,
) {
  return rows.map((row) => {
    if (row.feature === "Usuários inclusos") {
      return {
        ...row,
        essencial: limits.essencial?.usersValue ?? row.essencial,
        profissional: limits.profissional?.usersValue ?? row.profissional,
        enterprise: limits.enterprise?.usersValue ?? row.enterprise,
      };
    }
    if (row.feature === "Storage incluso") {
      return {
        ...row,
        essencial: limits.essencial?.storageValue ?? row.essencial,
        profissional: limits.profissional?.storageValue ?? row.profissional,
        enterprise: limits.enterprise?.storageValue ?? row.enterprise,
      };
    }
    return row;
  });
}

function limitFromFeature(item: PlanFeatureItem | undefined, kind: "users" | "storage"): PlanLimits {
  if (!item?.enabled) return {};
  if (kind === "users") {
    if (item.is_unlimited) {
      return { usersLabel: "Usuários ilimitados", usersValue: "Ilimitado" };
    }
    if (item.limit_value == null) return {};
    return {
      usersLabel: `${item.limit_value} usuários inclusos`,
      usersValue: String(item.limit_value),
    };
  }
  if (item.is_unlimited) {
    return { storageLabel: "Armazenamento ilimitado", storageValue: "Ilimitado" };
  }
  if (item.limit_value == null) return {};
  const label = formatStorageLimit(item.limit_value);
  return {
    storageLabel: `${label} de armazenamento`,
    storageValue: label,
  };
}

export function limitsFromPlanFeatures(
  catalog: PlanResponse[],
  features: FeatureCatalogItem[],
  offerings: Record<string, PlanFeatureItem[]>,
): PlanLimitsMap {
  const keyById = new Map(features.map((feature) => [feature.id, feature.key]));
  const result: PlanLimitsMap = {};
  for (const plan of catalog) {
    const planId = planIdFromCode(plan.code);
    if (!planId) continue;
    const rows = offerings[plan.id] ?? [];
    const users = rows.find((row) => keyById.get(row.feature_id) === "max_users");
    const storage = rows.find((row) => keyById.get(row.feature_id) === "max_storage_bytes");
    result[planId] = {
      ...limitFromFeature(users, "users"),
      ...limitFromFeature(storage, "storage"),
    };
  }
  return result;
}

export async function fetchFeatureCatalog(): Promise<FeatureCatalogItem[]> {
  const { data } = await api.get<FeatureCatalogItem[]>("/v1/features", { params: { active_only: true } });
  return data ?? [];
}

export async function fetchPlanFeatureRows(planId: string): Promise<PlanFeatureItem[]> {
  const { data } = await api.get<PlanFeatureItem[]>(`/v1/plans/${planId}/features`);
  return data ?? [];
}

export async function fetchPlanLimits(catalog: PlanResponse[]): Promise<PlanLimitsMap> {
  const features = await fetchFeatureCatalog();
  const offerings = Object.fromEntries(
    await Promise.all(
      catalog.map(async (plan) => [plan.id, await fetchPlanFeatureRows(plan.id)] as const),
    ),
  );
  return limitsFromPlanFeatures(catalog, features, offerings);
}
