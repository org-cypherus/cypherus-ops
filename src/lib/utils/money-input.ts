import { onlyDigits } from "./document";

export function parseIntegerInput(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  return Number.parseInt(digits, 10);
}

export function formatIntegerInput(value: number) {
  if (!Number.isFinite(value)) return "0";
  return String(Math.trunc(value));
}

/** Interpreta dígitos como centavos: `4800` → `48`. */
export function parseCurrencyInput(raw: string) {
  const digits = onlyDigits(raw);
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function formatCurrencyInput(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
