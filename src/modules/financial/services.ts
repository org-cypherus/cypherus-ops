import { api, getApiError } from "@/lib/api/client";
import { companyPath } from "@/lib/auth/session";
import { fetchLeadNameMap } from "@/modules/leads/services";
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
  createdAt?: string;
  commissionId?: string;
};

export type Commission = {
  id: string;
  userName: string;
  amount: number;
  /** Derivado de `kind` — CommissionResponse do CRM não tem status. */
  status: string;
  kind: string;
  baseAmount: number;
  rate?: number;
  paymentId?: string;
  contractId?: string;
  createdAt?: string;
  /** YYYY-MM a partir de created_at (CRM não envia period). */
  period?: string;
};

/** CRM: só PERCENT | FIXED (sem meta acumulada). */
export type CommissionRule = {
  id: string;
  plan: string;
  type: "percentual" | "taxa";
  value: number;
  active?: boolean;
};

/** Espelha PaymentResponse do saas-crm. */
export type CrmPayment = {
  id: string;
  company_id?: string;
  contract_id: string;
  lead_id: string;
  amount: number | string;
  due_date: string;
  status: string;
  paid_at?: string | null;
  created_at?: string;
  commission_id?: string | null;
};

/** Espelha CommissionResponse do saas-crm. */
export type CrmCommission = {
  id: string;
  company_id?: string;
  payment_id: string;
  contract_id: string;
  beneficiary_user_id: string;
  kind: string;
  base_amount: number | string;
  rate?: number | string | null;
  amount: number | string;
  created_at: string;
};

/** Espelha CommissionRuleResponse do saas-crm. */
export type CrmRule = {
  id: string;
  company_id?: string;
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

const COMMISSION_KIND_LABEL: Record<string, string> = {
  PERCENT: "Percentual",
  FIXED: "Fixa",
};

function asNumber(value: number | string | null | undefined, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

/** YYYY-MM-DD — filtros sem deslocar timezone do ISO. */
export function dayKey(value?: string) {
  return value?.slice(0, 10) || "";
}

export function periodFromIso(iso?: string | null) {
  const key = dayKey(iso || undefined);
  return key ? key.slice(0, 7) : undefined;
}

export function mapPayment(item: CrmPayment, leadName?: string): Payment {
  return {
    id: item.id,
    contractId: item.contract_id,
    leadId: item.lead_id,
    leadName: leadName || "",
    amount: asNumber(item.amount),
    dueDate: item.due_date,
    status: PAYMENT_STATUS[item.status] ?? item.status,
    paidAt: item.paid_at ?? undefined,
    createdAt: item.created_at,
    commissionId: item.commission_id ?? undefined,
  };
}

export function mapCommission(
  item: CrmCommission,
  userName?: string,
): Commission {
  const kind = item.kind || "PERCENT";
  return {
    id: item.id,
    userName: userName || "",
    amount: asNumber(item.amount),
    kind,
    status: COMMISSION_KIND_LABEL[kind] ?? kind,
    baseAmount: asNumber(item.base_amount),
    rate: item.rate == null || item.rate === "" ? undefined : asNumber(item.rate),
    paymentId: item.payment_id,
    contractId: item.contract_id,
    createdAt: item.created_at,
    period: periodFromIso(item.created_at),
  };
}

export function mapCommissionRule(item: CrmRule): CommissionRule {
  const isFixed = item.kind === "FIXED";
  return {
    id: item.id,
    plan: item.name,
    type: isFixed ? "taxa" : "percentual",
    value: asNumber(isFixed ? item.amount : item.rate),
    active: item.is_active,
  };
}

export function filterPayments(
  payments: Payment[],
  filters: { lead: string; status: string; from: string; to: string },
) {
  const leadQ = filters.lead.trim().toLowerCase();
  return payments.filter((payment) => {
    if (leadQ && !payment.leadName.toLowerCase().includes(leadQ)) return false;
    if (filters.status && payment.status !== filters.status) return false;
    const due = dayKey(payment.dueDate);
    if (filters.from && due && due < filters.from) return false;
    if (filters.to && due && due > filters.to) return false;
    return true;
  });
}

async function softEmptyList<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (error) {
    const status = getApiError(error).status;
    if (status === 404 || status === 204) return [];
    throw error;
  }
}

export async function fetchPayments(): Promise<Payment[]> {
  return softEmptyList(async () => {
    const [{ data }, names] = await Promise.all([
      api.get<CrmPayment[] | null>(companyPath("/payments")),
      fetchLeadNameMap().catch(() => ({} as Record<string, string>)),
    ]);
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => mapPayment(item, names[item.lead_id]));
  });
}

export async function confirmPayment(id: string) {
  const { data } = await api.post<CrmPayment>(companyPath(`/payments/${id}/confirm`));
  return mapPayment(data);
}

export async function fetchCommissions(): Promise<Commission[]> {
  return softEmptyList(async () => {
    const { data } = await api.get<CrmCommission[] | null>(companyPath("/commissions"));
    const list = Array.isArray(data) ? data : [];
    if (!list.length) return [];
    const names = await fetchOwnerMap().catch(() => ({} as Record<string, string>));
    return list.map((item) => mapCommission(item, names[item.beneficiary_user_id]));
  });
}

export async function fetchCommissionRules(): Promise<CommissionRule[]> {
  return softEmptyList(async () => {
    const { data } = await api.get<CrmRule[] | null>(companyPath("/commission-rules"));
    const list = Array.isArray(data) ? data : [];
    return list.map(mapCommissionRule);
  });
}

export async function saveCommissionRule(
  rule: Partial<CommissionRule> & { plan: string; type: CommissionRule["type"]; value: number },
) {
  const payload = {
    name: rule.plan,
    kind: rule.type === "taxa" ? "FIXED" : "PERCENT",
    rate: rule.type === "taxa" ? null : rule.value,
    amount: rule.type === "taxa" ? rule.value : null,
    is_active: rule.active ?? true,
  };
  if (rule.id) {
    const { data } = await api.patch<CrmRule>(companyPath(`/commission-rules/${rule.id}`), payload);
    return mapCommissionRule(data);
  }
  const { data } = await api.post<CrmRule>(companyPath("/commission-rules"), payload);
  return mapCommissionRule(data);
}

export async function deleteCommissionRule(id: string) {
  await api.delete(companyPath(`/commission-rules/${id}`));
}

export async function fetchDistributionRules() {
  const { data } = await api.get<Array<{ id: string; strategy?: string; name?: string }> | null>(
    companyPath("/distribution/rules"),
  );
  return Array.isArray(data) ? data : [];
}

export { PAYMENT_STATUS, COMMISSION_KIND_LABEL };
