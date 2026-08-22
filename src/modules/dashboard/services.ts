import { api } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { uiStageToApiStatus } from "@/modules/leads/adapters";

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
};

type CommercialResponse = {
  leads_in_period: number;
  converted_count: number;
  conversion_rate: number | string;
  funnel: Array<{ name: string; status?: string | null; lead_count: number; potential_value: number | string }>;
  performance: Array<{
    owner_user_id: string;
    lead_count: number;
    converted_count: number;
    conversion_rate: number | string;
    potential_value: number | string;
  }>;
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
  ticket_average: number | string;
  active_users?: number | string | null;
};

const num = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

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

export function mapAdminDashboard(data: AdminResponse): AdminDashboard {
  const leadsReceived = num(data.leads_received);
  const signedContracts = num(data.contracts_signed);
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
  };
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
  return mapAdminDashboard(data);
}

export { uiStageToApiStatus };
