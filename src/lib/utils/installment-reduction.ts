export type InstallmentReductionInput = {
  currentInstallment: number;
  remainingInstallments: number;
  /** Percentual de redução estimado (0–100). */
  reductionPercent: number;
};

export type InstallmentReductionStatus = "incomplete" | "no_savings" | "ok";

export type InstallmentReductionResult = {
  reductionPercent: number;
  newInstallment: number;
  monthlySavings: number;
  totalSavings: number;
  originalRemaining: number;
  estimatedSettlement: number;
  estimatedRestitution: number;
  hasSavings: boolean;
  status: InstallmentReductionStatus;
};

function asPositiveMoney(value: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function asRemaining(value: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function clampReductionPercent(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function roundCents(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

const EMPTY: Omit<InstallmentReductionResult, "status" | "reductionPercent"> = {
  newInstallment: 0,
  monthlySavings: 0,
  totalSavings: 0,
  originalRemaining: 0,
  estimatedSettlement: 0,
  estimatedRestitution: 0,
  hasSavings: false,
};

/**
 * Economia a partir do % informado pelo operador:
 * nova = atual × (1 − %); mensal = atual − nova; restante original = atual × restantes;
 * quitação estimada = nova × restantes (mesmo %). Restituição fica 0 até haver dado de parcelas pagas.
 */
export function calculateInstallmentReduction(
  input: InstallmentReductionInput,
): InstallmentReductionResult {
  const current = asPositiveMoney(input.currentInstallment);
  const remaining = asRemaining(input.remainingInstallments);
  const reductionPercent = clampReductionPercent(input.reductionPercent);

  if (!current || !remaining) {
    return { ...EMPTY, reductionPercent, status: "incomplete" };
  }

  const originalRemaining = roundCents(current * remaining);
  const monthlySavings = roundCents((current * reductionPercent) / 100);
  const newInstallment = roundCents(current - monthlySavings);
  const estimatedSettlement = roundCents(newInstallment * remaining);
  const totalSavings = roundCents(monthlySavings * remaining);

  if (reductionPercent <= 0) {
    return {
      reductionPercent,
      newInstallment: current,
      monthlySavings: 0,
      totalSavings: 0,
      originalRemaining,
      estimatedSettlement: originalRemaining,
      estimatedRestitution: 0,
      hasSavings: false,
      status: "no_savings",
    };
  }

  return {
    reductionPercent,
    newInstallment,
    monthlySavings,
    totalSavings,
    originalRemaining,
    estimatedSettlement,
    estimatedRestitution: 0,
    hasSavings: true,
    status: "ok",
  };
}
