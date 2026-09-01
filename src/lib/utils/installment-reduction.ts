export type InstallmentReductionInput = {
  currentInstallment: number;
  remainingInstallments: number;
  newInstallment: number;
};

export type InstallmentReductionStatus = "incomplete" | "no_savings" | "ok";

export type InstallmentReductionResult = {
  monthlySavings: number;
  totalSavings: number;
  reductionPercent: number;
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

/** Economia v1: mensal = atual − nova; total = mensal × restantes; % = mensal / atual. */
export function calculateInstallmentReduction(
  input: InstallmentReductionInput,
): InstallmentReductionResult {
  const current = asPositiveMoney(input.currentInstallment);
  const remaining = asRemaining(input.remainingInstallments);
  const next = asPositiveMoney(input.newInstallment);

  const empty = {
    monthlySavings: 0,
    totalSavings: 0,
    reductionPercent: 0,
    hasSavings: false,
  } as const;

  if (!current || !remaining || !next) {
    return { ...empty, status: "incomplete" };
  }

  if (next >= current) {
    return { ...empty, status: "no_savings" };
  }

  const monthlySavings = current - next;
  return {
    monthlySavings,
    totalSavings: monthlySavings * remaining,
    reductionPercent: (monthlySavings / current) * 100,
    hasSavings: true,
    status: "ok",
  };
}
