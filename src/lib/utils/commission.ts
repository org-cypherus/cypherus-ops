export type CommissionRuleType = "percentual" | "taxa" | "percentual_meta";

export type CommissionRuleInput = {
  type: CommissionRuleType;
  value: number;
  /** Meta mínima acumulada no período. Em percentual_meta, só gera % se o total ≥ meta. */
  threshold?: number;
};

/**
 * Calcula comissão.
 * - percentual: % sobre o valor informado
 * - taxa: valor fixo
 * - percentual_meta: acumula vendas no período; se total < meta → 0;
 *   se total ≥ meta → % sobre o total das vendas.
 *   Ex.: meta 10k, vendas 3k+2k+6k = 11k, 10% → 1.100.
 */
export function calculateCommission(amount: number, rule: CommissionRuleInput): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  if (rule.type === "taxa") {
    return Math.max(0, Math.round(rule.value));
  }

  if (rule.type === "percentual_meta") {
    const threshold = rule.threshold ?? 0;
    if (amount < threshold) return 0;
    return Math.round((amount * rule.value) / 100);
  }

  return Math.round((amount * rule.value) / 100);
}

export function formatCommissionRuleLabel(
  rule: CommissionRuleInput & { plan?: string },
  formatCurrency: (n: number) => string,
): string {
  if (rule.type === "taxa") {
    return formatCurrency(rule.value);
  }
  if (rule.type === "percentual_meta") {
    const meta = formatCurrency(rule.threshold ?? 0);
    return `${rule.value}% do total após bater meta ${meta} (acumulado)`;
  }
  return `${rule.value}%`;
}
