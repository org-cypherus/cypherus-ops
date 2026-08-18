import type { Permission } from "@/lib/auth/permissions";
import { PLAN_FEATURE_CATALOG } from "./plan-catalog";
import type { FeatureKey, PlanCode, ResolvedFeatures } from "./types";

const PLAN_ORDER: PlanCode[] = ["ESSENTIAL", "PROFESSIONAL", "ENTERPRISE"];

export function resolveFeatures(planCode: PlanCode): ResolvedFeatures {
  return { ...PLAN_FEATURE_CATALOG[planCode] };
}

export function hasFeature(features: ResolvedFeatures | undefined, key: FeatureKey) {
  return Boolean(features?.[key]?.enabled);
}

export function getFeatureLimit(features: ResolvedFeatures | undefined, key: FeatureKey) {
  const state = features?.[key];
  if (!state?.enabled) return undefined;
  return state.limit;
}

/** Menor plano que habilita a feature (para copy de upsell). */
export function minimumPlanForFeature(key: FeatureKey): PlanCode | undefined {
  return PLAN_ORDER.find((plan) => PLAN_FEATURE_CATALOG[plan][key]?.enabled);
}

/**
 * Acesso efetivo = feature do tier da empresa ∩ permission do cargo.
 * Se `permission` for omitida, exige apenas a feature.
 */
export function canAccess(
  features: ResolvedFeatures | undefined,
  permissions: Permission[] | undefined,
  feature: FeatureKey,
  permission?: Permission,
) {
  if (!hasFeature(features, feature)) return false;
  if (!permission) return true;
  return Boolean(permissions?.includes(permission));
}
