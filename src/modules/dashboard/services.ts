import { api } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { uiStageToApiStatus } from "@/modules/leads/adapters";
import { fetchOwnerMap } from "@/modules/users/directory";

export type CommercialFunnelSlice = {
  stage: string;
  count: number;
  potentialValue: number;
};

export type CommercialDashboard = {
  activeLeads: number;
  closedLeads: number;
  conversion: number;
  soldValue: number;
  goal: number;
  commission: number;
  avgCloseDays: number;
  funnel: CommercialFunnelSlice[];
  goalSeries: Array<{ month: string; goal: number; actual: number }>;
};

/** Espelha AdminDashboardResponse do saas-crm (contrato-api-frontend.md). */
export type AdminDashboard = {
  from: string | null;
  to: string | null;
  leadsReceived: number;
  /** Percentual 0–100 (contratos assinados / leads recebidos). */
  conversion: number;
  revenue: number;
  avgTicket: number;
  signedContracts: number;
  pendingContracts: number;
  overdueCount: number;
  overdueAmount: number;
  activeUsers: number;
  leadsByOrigin: Array<{ origin: string; value: number }>;
  /** Série esparsa do CRM; use `fillRevenueByMonth` para eixo contínuo. */
  revenueByMonth: Array<{ month: string; amount: number; count: number }>;
  /** Ranking por consultor (`performance[]`). */
  performance: Array<{
    ownerUserId: string;
    ownerName: string;
    leadCount: number;
    convertedCount: number;
    /** Percentual 0–100. */
    conversionRate: number;
    potentialValue: number;
  }>;
};

type PerformanceRow = {
  owner_user_id: string;
  lead_count: number;
  converted_count: number;
  conversion_rate: number | string;
  potential_value: number | string;
};

type CommercialResponse = {
  leads_in_period: number;
  converted_count: number;
  conversion_rate: number | string;
  funnel: Array<{ name: string; status?: string | null; lead_count: number; potential_value: number | string }>;
  performance: PerformanceRow[];
};

type AdminResponse = {
  from?: string | null;
  to?: string | null;
  leads_received: number;
  leads_by_origin?: Array<{ source?: string | null; lead_count: number }> | null;
  contracts_signed: number;
  contracts_pending: number;
  overdue_count?: number | string | null;
  overdue_amount?: number | string | null;
  revenue: number | string;
  revenue_by_month?: unknown;
  revenueByMonth?: unknown;
  monthly_revenue?: unknown;
  ticket_average: number | string;
  active_users?: number | string | null;
  performance?: PerformanceRow[] | null;
};

const num = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Extrai `YYYY-MM` de string/date do CRM. */
export function monthKey(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2})/);
    return match?.[1] ?? "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // epoch ms improvável; ignore
    return "";
  }
  return "";
}

function moneyAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    // Aceita "1500.50" ou "1.500,50"
    const normalized = trimmed.includes(",")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed;
    return num(normalized);
  }
  return 0;
}

/** Normaliza `revenue_by_month` (e aliases) do AdminDashboardResponse. */
export function normalizeRevenueByMonth(raw: unknown): AdminDashboard["revenueByMonth"] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];

  const mapped = list
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const month = monthKey(row.month ?? row.period ?? row.ym ?? row.month_key);
      if (!month) return null;
      return {
        month,
        amount: moneyAmount(row.amount ?? row.value ?? row.revenue ?? row.total),
        count: num(
          (row.count as number | string | null | undefined) ??
            (row.payment_count as number | string | null | undefined) ??
            0,
        ),
      };
    })
    .filter((item): item is AdminDashboard["revenueByMonth"][number] => Boolean(item));

  return mapped.sort((a, b) => a.month.localeCompare(b.month));
}

/** YYYY-MM-DD no calendário local (evita deslocar o dia via toISOString UTC). */
export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function periodRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: localDateKey(from), to: localDateKey(to) };
}

/** Rótulo curto pt-BR para `YYYY-MM` (mês civil UTC do CRM). */
export function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    date,
  );
}

/**
 * Preenche meses sem confirmação com 0 entre o intervalo.
 * A janela inclui `from`/`to` **e** todos os meses presentes na série do CRM
 * (não descarta fatias retornadas pela API).
 */
export function fillRevenueByMonth(
  series: AdminDashboard["revenueByMonth"],
  from?: string | null,
  to?: string | null,
): AdminDashboard["revenueByMonth"] {
  const sorted = [...series].sort((a, b) => a.month.localeCompare(b.month));
  const byMonth = new Map(sorted.map((item) => [item.month, item]));

  const candidates = [
    monthKey(from),
    monthKey(to),
    sorted[0]?.month ?? "",
    sorted.at(-1)?.month ?? "",
  ].filter((key) => /^\d{4}-\d{2}$/.test(key));

  if (!candidates.length) return sorted;

  let startKey = candidates.reduce((min, key) => (key < min ? key : min));
  let endKey = candidates.reduce((max, key) => (key > max ? key : max));
  if (startKey > endKey) [startKey, endKey] = [endKey, startKey];

  const result: AdminDashboard["revenueByMonth"] = [];
  let year = Number(startKey.slice(0, 4));
  let month = Number(startKey.slice(5, 7));
  const endYear = Number(endKey.slice(0, 4));
  const endMonth = Number(endKey.slice(5, 7));

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    result.push(byMonth.get(key) ?? { month: key, amount: 0, count: 0 });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

export function mapAdminDashboard(data: AdminResponse): AdminDashboard {
  const leadsReceived = num(data.leads_received);
  const signedContracts = num(data.contracts_signed);
  const revenueByMonth = normalizeRevenueByMonth(
    data.revenue_by_month ?? data.revenueByMonth ?? data.monthly_revenue,
  );
  return {
    from: data.from ?? null,
    to: data.to ?? null,
    leadsReceived,
    // formatPercent espera 0–100; CRM não envia conversion_rate no admin.
    conversion: leadsReceived > 0 ? (signedContracts / leadsReceived) * 100 : 0,
    revenue: num(data.revenue),
    avgTicket: num(data.ticket_average),
    signedContracts,
    pendingContracts: num(data.contracts_pending),
    overdueCount: num(data.overdue_count),
    overdueAmount: num(data.overdue_amount),
    activeUsers: num(data.active_users),
    leadsByOrigin: (data.leads_by_origin ?? []).map((item) => ({
      origin: item.source || "Sem origem",
      value: num(item.lead_count),
    })),
    revenueByMonth,
    performance: normalizePerformance(data.performance),
  };
}

/** Normaliza `performance[]` do admin ou do comercial. */
export function normalizePerformance(
  raw: unknown,
  ownerNames: Record<string, string> = {},
): AdminDashboard["performance"] {
  const list = Array.isArray(raw) ? raw : [];
  const mapped = list
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const ownerUserId = String(row.owner_user_id ?? row.ownerUserId ?? "").trim();
      if (!ownerUserId) return null;
      return {
        ownerUserId,
        ownerName: ownerNames[ownerUserId] || ownerUserId.slice(0, 8),
        leadCount: num(row.lead_count as number | string | null | undefined),
        convertedCount: num(row.converted_count as number | string | null | undefined),
        conversionRate: num(row.conversion_rate as number | string | null | undefined),
        potentialValue: moneyAmount(row.potential_value ?? row.potentialValue),
      };
    })
    .filter((item): item is AdminDashboard["performance"][number] => Boolean(item));

  return mapped.sort((a, b) => {
    if (b.leadCount !== a.leadCount) return b.leadCount - a.leadCount;
    return a.ownerUserId.localeCompare(b.ownerUserId);
  });
}

export function withOwnerNames(
  rows: AdminDashboard["performance"],
  ownerNames: Record<string, string>,
): AdminDashboard["performance"] {
  return rows.map((row) => ({
    ...row,
    ownerName: ownerNames[row.ownerUserId] || row.ownerName,
  }));
}

type PaymentRow = {
  status?: string | null;
  amount?: number | string | null;
  paid_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function dayInInclusiveRange(day: string, from?: string | null, to?: string | null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  if (from && day < from.slice(0, 10)) return false;
  if (to && day > to.slice(0, 10)) return false;
  return true;
}

/**
 * Monta `revenue_by_month` a partir de pagamentos CONFIRMADOS.
 * Usado quando o AdminDashboard (HML/develop) ainda não envia a série.
 * Instantâneo: coalesce(paid_at, updated_at, created_at) — mês civil UTC via prefixo ISO.
 */
export function revenueByMonthFromPayments(
  payments: PaymentRow[],
  from?: string | null,
  to?: string | null,
): AdminDashboard["revenueByMonth"] {
  const buckets = new Map<string, { amount: number; count: number }>();

  for (const payment of payments) {
    if (String(payment.status || "").toUpperCase() !== "CONFIRMED") continue;
    const instant = payment.paid_at || payment.updated_at || payment.created_at || "";
    const day = typeof instant === "string" ? instant.trim().slice(0, 10) : "";
    const month = monthKey(instant);
    if (!month || !dayInInclusiveRange(day, from, to)) continue;
    const prev = buckets.get(month) ?? { amount: 0, count: 0 };
    prev.amount += moneyAmount(payment.amount);
    prev.count += 1;
    buckets.set(month, prev);
  }

  return [...buckets.entries()]
    .map(([month, value]) => ({ month, amount: value.amount, count: value.count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

async function fetchRevenueByMonthFromPayments(from: string, to?: string) {
  const { data } = await api.get<PaymentRow[] | null>(companyPath("/payments"), {
    params: { status: "CONFIRMED" },
  });
  return revenueByMonthFromPayments(Array.isArray(data) ? data : [], from, to);
}

/** HML/develop: admin ainda não envia performance[]; comercial já tem. */
async function fetchPerformanceFromCommercial(from: string, to?: string) {
  const { data } = await api.get<CommercialResponse>(companyPath("/dashboard/me"), {
    params: { from, to },
  });
  return normalizePerformance(data.performance);
}

export async function fetchCommercialDashboard(from: string, to?: string) {
  const { data } = await api.get<CommercialResponse>(companyPath("/dashboard/me"), {
    params: { from, to },
  });
  const soldValue = data.funnel.reduce((sum, slice) => sum + num(slice.potential_value), 0);
  return {
    activeLeads: data.leads_in_period,
    closedLeads: data.converted_count,
    // CRM: conversion_rate já é percentual 0–100.
    conversion: num(data.conversion_rate),
    soldValue,
    goal: 0,
    commission: 0,
    avgCloseDays: 0,
    funnel: data.funnel.map((slice) => ({
      stage: slice.name,
      count: slice.lead_count,
      potentialValue: num(slice.potential_value),
    })),
    goalSeries: [] as CommercialDashboard["goalSeries"],
  } satisfies CommercialDashboard;
}

export async function fetchAdminDashboard(from: string, to?: string) {
  const { data } = await api.get<AdminResponse>(companyPath("/dashboard/admin"), {
    params: { from, to },
  });
  let mapped = mapAdminDashboard(data);

  if (!mapped.revenueByMonth.length) {
    // develop/HML: AdminDashboardResponse só traz `revenue` agregado, sem série mensal.
    try {
      const fromPayments = await fetchRevenueByMonthFromPayments(from, to);
      if (fromPayments.length) {
        mapped = { ...mapped, revenueByMonth: fromPayments };
      }
    } catch {
      /* mantém série vazia — UI explica se revenue > 0 */
    }
  }

  if (!mapped.performance.length) {
    try {
      const fromCommercial = await fetchPerformanceFromCommercial(from, to);
      if (fromCommercial.length) {
        mapped = { ...mapped, performance: fromCommercial };
      }
    } catch {
      /* ranking fica vazio */
    }
  }

  if (mapped.performance.length) {
    try {
      const owners = await fetchOwnerMap();
      mapped = { ...mapped, performance: withOwnerNames(mapped.performance, owners) };
    } catch {
      /* mantém id abreviado como nome */
    }
  }

  return mapped;
}

export { uiStageToApiStatus };
