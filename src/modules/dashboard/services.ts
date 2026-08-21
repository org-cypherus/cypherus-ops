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

export type AdminDashboard = {
  leadsReceived: number;
  conversion: number;
  revenue: number;
  avgTicket: number;
  avgCloseDays: number;
  signedContracts: number;
  pendingContracts: number;
  leadsByOrigin: Array<{ origin: string; value: number }>;
  monthlyRevenue: Array<{ month: string; value: number }>;
  topPerformers: Array<{ name: string; conversion: number; revenue: number }>;
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
  leads_received: number;
  leads_by_origin: Array<{ source?: string | null; lead_count: number }>;
  contracts_signed: number;
  contracts_pending: number;
  revenue: number | string;
  ticket_average: number | string;
};

const num = (value: number | string | undefined) => Number(value || 0);

export async function fetchCommercialDashboard(from: string, to?: string) {
  const { data } = await api.get<CommercialResponse>(companyPath("/dashboard/me"), {
    params: { from, to },
  });
  const soldValue = data.funnel.reduce((sum, slice) => sum + num(slice.potential_value), 0);
  return {
    activeLeads: data.leads_in_period,
    closedLeads: data.converted_count,
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
  return {
    leadsReceived: data.leads_received,
    conversion: data.leads_received ? data.contracts_signed / data.leads_received : 0,
    revenue: num(data.revenue),
    avgTicket: num(data.ticket_average),
    avgCloseDays: 0,
    signedContracts: data.contracts_signed,
    pendingContracts: data.contracts_pending,
    leadsByOrigin: data.leads_by_origin.map((item) => ({
      origin: item.source || "Sem origem",
      value: item.lead_count,
    })),
    monthlyRevenue: [] as AdminDashboard["monthlyRevenue"],
    topPerformers: [] as AdminDashboard["topPerformers"],
  } satisfies AdminDashboard;
}

export { uiStageToApiStatus };
