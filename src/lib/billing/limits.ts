import { getFeatureLimit } from "./access";
import type { PlanCode, ResolvedFeatures } from "./types";

/** Conta usuários ativos contra o limite `max_users` do plano. `null` = ilimitado. */
export function getMaxUsersLimit(features: ResolvedFeatures | undefined) {
  return getFeatureLimit(features, "max_users");
}

export function canAddActiveUser(
  features: ResolvedFeatures | undefined,
  activeUserCount: number,
) {
  const limit = getMaxUsersLimit(features);
  if (limit === undefined) return false;
  if (limit === null) return true;
  return activeUserCount < limit;
}

export function usersLimitLabel(
  features: ResolvedFeatures | undefined,
  activeUserCount: number,
) {
  const limit = getMaxUsersLimit(features);
  if (limit === null) return `${activeUserCount} usuários ativos · ilimitado`;
  if (limit === undefined) return `${activeUserCount} usuários ativos`;
  return `${activeUserCount} de ${limit} usuários do plano`;
}

/** Próximo plano com teto de usuários maior. */
export function nextPlanForMoreUsers(planCode: PlanCode | undefined): PlanCode | undefined {
  if (planCode === "ESSENTIAL") return "PROFESSIONAL";
  if (planCode === "PROFESSIONAL") return "ENTERPRISE";
  return undefined;
}
