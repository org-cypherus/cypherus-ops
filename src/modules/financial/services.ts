import { api } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { fetchOwnerMap } from "@/modules/users/directory";

export type Payment = {
  id: string;
  contractId: string;
  leadName: string;
  leadId?: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt?: string;
};

export type Commission = {
  id: string;
  userName: string;
  amount: number;
  status: string;
};

export type CommissionRule = {
  id: string;
  plan: string;
  type: "percentual" | "taxa" | "percentual_meta";
  value: number;
  threshold?: number;
  active?: boolean;
};

type CrmPayment = {
  id: string;
  contract_id: string;
  lead_id: string;
  amount: number | string;
  due_date: string;
  status: string;
  paid_at?: string | null;
};

type CrmCommission = {
  id: string;
  beneficiary_user_id: string;
  amount: number | string;
};

type CrmRule = {
  id: string;
  name: string;
  kind: string;
  rate?: number | string | null;
  amount?: number | string | null;
  is_active: boolean;
};

const PAYMENT_STATUS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Recebido",
  OVERDUE: "Atrasado",
};

export async function fetchPayments(): Promise<Payment[]> {
  const [{ data }, leads] = await Promise.all([
    api.get<CrmPayment[]>(companyPath("/payments")),
    api.get<Array<{ id: string; name: string }>>(companyPath("/leads")).catch(() => ({ data: [] as Array<{ id: string; name: string }> })),
  ]);
  const names = Object.fromEntries(leads.data.map((lead) => [lead.id, lead.name]));
  return data.map((item) => ({
    id: item.id,
    contractId: item.contract_id,
    leadId: item.lead_id,
    leadName: names[item.lead_id] || "",
    amount: Number(item.amount),
    dueDate: item.due_date,
    status: PAYMENT_STATUS[item.status] ?? item.status,
    paidAt: item.paid_at ?? undefined,
  }));
}

export async function confirmPayment(id: string) {
  await api.post(companyPath(`/payments/${id}/confirm`));
}

export async function fetchCommissions(): Promise<Commission[]> {
  const { data } = await api.get<CrmCommission[]>(companyPath("/commissions"));
  const names = await fetchOwnerMap().catch(() => ({} as Record<string, string>));
  return data.map((item) => ({
    id: item.id,
    userName: names[item.beneficiary_user_id] || "",
    amount: Number(item.amount),
    status: "Calculada",
  }));
}

export async function fetchCommissionRules(): Promise<CommissionRule[]> {
  const { data } = await api.get<CrmRule[]>(companyPath("/commission-rules"));
  return data.map((item) => ({
    id: item.id,
    plan: item.name,
    type: item.kind === "FIXED" ? "taxa" : "percentual",
    value: Number(item.kind === "FIXED" ? item.amount : item.rate ?? 0),
    active: item.is_active,
  }));
}

export async function saveCommissionRule(rule: Partial<CommissionRule> & { plan: string; type: CommissionRule["type"]; value: number }) {
  const payload = {
    name: rule.plan,
    kind: rule.type === "taxa" ? "FIXED" : "PERCENT",
    rate: rule.type === "taxa" ? null : rule.value,
    amount: rule.type === "taxa" ? rule.value : null,
    is_active: rule.active ?? true,
  };
  if (rule.id) {
    const { data } = await api.patch<CrmRule>(companyPath(`/commission-rules/${rule.id}`), payload);
    return data;
  }
  const { data } = await api.post<CrmRule>(companyPath("/commission-rules"), payload);
  return data;
}

export async function deleteCommissionRule(id: string) {
  await api.delete(companyPath(`/commission-rules/${id}`));
}

export async function fetchDistributionRules() {
  const { data } = await api.get<Array<{ id: string; strategy?: string; name?: string }>>(
    companyPath("/distribution/rules"),
  );
  return data;
}
