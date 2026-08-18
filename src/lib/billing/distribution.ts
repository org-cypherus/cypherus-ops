import type { PlanCode } from "./types";

export type DistributionStrategy =
  | "manual"
  | "round_robin"
  | "automatic"
  | "team"
  | "redistribute";

const STRATEGY_LABELS: Record<DistributionStrategy, string> = {
  manual: "Manual",
  round_robin: "Round Robin",
  automatic: "Distribuição automática",
  team: "Distribuição por equipe",
  redistribute: "Redistribuição (leads parados)",
};

/** Estratégias liberadas por tier da empresa. */
export function allowedDistributionStrategies(
  planCode: PlanCode | undefined,
): DistributionStrategy[] {
  if (!planCode || planCode === "ESSENTIAL") {
    return ["manual", "round_robin"];
  }
  if (planCode === "PROFESSIONAL") {
    return ["manual", "round_robin", "automatic", "team"];
  }
  return ["manual", "round_robin", "automatic", "team", "redistribute"];
}

export function isDistributionStrategyAllowed(
  planCode: PlanCode | undefined,
  strategy: string,
): strategy is DistributionStrategy {
  return allowedDistributionStrategies(planCode).includes(strategy as DistributionStrategy);
}

export function distributionStrategyOptions(planCode: PlanCode | undefined) {
  return allowedDistributionStrategies(planCode).map((value) => ({
    value,
    label: STRATEGY_LABELS[value],
  }));
}

/** Fallback seguro quando a regra salva não existe no plano atual. */
export function clampDistributionStrategy(
  planCode: PlanCode | undefined,
  strategy: string,
): DistributionStrategy {
  if (isDistributionStrategyAllowed(planCode, strategy)) return strategy;
  return allowedDistributionStrategies(planCode)[0] ?? "manual";
}
