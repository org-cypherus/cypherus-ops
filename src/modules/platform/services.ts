import { api } from "@/lib/api/client";
import { mapCompanyStatus, mapPlanCode, mapSubscriptionStatus } from "@/lib/auth/mappers";
import { planLabel } from "@/lib/billing/plan-catalog";
import type { CompanyStatus, PlanCode, SubscriptionStatus } from "@/lib/billing/types";

export type PlatformCompany = {
  id: string;
  name: string;
  legal_name: string | null;
  document: string;
  status: CompanyStatus;
  created_at?: string;
  updated_at?: string;
};

export type PlatformPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string | number;
  billing_interval: string;
  is_active: boolean;
};

export type PlatformSubscription = {
  id: string;
  company_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  is_current?: boolean;
  started_at?: string;
  ends_at?: string | null;
};

export type PlatformFeature = {
  id: string;
  key: string;
  name: string;
  type: string;
  unit: string | null;
  is_active: boolean;
};

export type CompanyFeatureAccess = {
  feature: string;
  type: string;
  enabled: boolean;
  limit: number | null;
  unlimited: boolean;
  source: string;
};

export type CurrentPaymentStatus = Extract<SubscriptionStatus, "TRIAL" | "ACTIVE" | "PAST_DUE">;

export type CompanyOverview = {
  company: PlatformCompany;
  plan: PlatformPlan | null;
  planCode: PlanCode | null;
  planName: string;
  subscription: PlatformSubscription | null;
};

export function planPriceNumber(plan: Pick<PlatformPlan, "price"> | null | undefined) {
  if (!plan) return 0;
  return typeof plan.price === "number" ? plan.price : Number(plan.price);
}

export async function fetchPlatformCompanies() {
  const { data } = await api.get<PlatformCompany[]>("/v1/companies");
  return (data ?? []).map((company) => ({
    ...company,
    status: mapCompanyStatus(company.status),
  }));
}

export async function fetchPlatformCompany(companyId: string) {
  const { data } = await api.get<PlatformCompany>(`/v1/companies/${companyId}`);
  return { ...data, status: mapCompanyStatus(data.status) };
}

export async function updateCompanyStatus(companyId: string, status: CompanyStatus) {
  const { data } = await api.patch<PlatformCompany>(`/v1/companies/${companyId}/status`, { status });
  return { ...data, status: mapCompanyStatus(data.status) };
}

export async function fetchPlatformPlans() {
  const { data } = await api.get<PlatformPlan[]>("/v1/plans");
  return data ?? [];
}

export async function updatePlatformPlan(
  planId: string,
  payload: { name?: string; price?: number; is_active?: boolean },
) {
  const { data } = await api.patch<PlatformPlan>(`/v1/plans/${planId}`, payload);
  return data;
}

export async function fetchPlatformFeatures() {
  const { data } = await api.get<PlatformFeature[]>("/v1/features");
  return (data ?? []).filter((feature) => feature.is_active !== false);
}

export async function fetchCompanyFeatures(companyId: string) {
  const { data } = await api.get<CompanyFeatureAccess[]>(`/v1/companies/${companyId}/features`);
  return data ?? [];
}

export async function upsertCompanyFeatureOverride(
  companyId: string,
  payload: { feature_id: string; enabled: boolean; limit_value?: number | null; is_unlimited?: boolean },
) {
  const { data } = await api.put(`/v1/companies/${companyId}/overrides`, payload);
  return data;
}

export async function fetchCompanySubscription(companyId: string) {
  try {
    const { data } = await api.get<PlatformSubscription>(
      `/v1/companies/${companyId}/subscriptions/current`,
    );
    return {
      ...data,
      status: mapSubscriptionStatus(data.status),
    };
  } catch {
    return null;
  }
}

export async function changeCompanyPlan(companyId: string, planId: string) {
  const { data } = await api.post<PlatformSubscription>(
    `/v1/companies/${companyId}/subscriptions/current/change-plan`,
    { plan_id: planId },
  );
  return { ...data, status: mapSubscriptionStatus(data.status) };
}

export async function updateCompanyPaymentStatus(companyId: string, status: CurrentPaymentStatus) {
  const { data } = await api.patch<PlatformSubscription>(
    `/v1/companies/${companyId}/subscriptions/current`,
    { status },
  );
  return { ...data, status: mapSubscriptionStatus(data.status) };
}

export async function fetchCompaniesOverview(): Promise<CompanyOverview[]> {
  const [companies, plans] = await Promise.all([fetchPlatformCompanies(), fetchPlatformPlans()]);
  const subscriptions = await Promise.all(
    companies.map(async (company) => {
      const subscription = await fetchCompanySubscription(company.id);
      const plan = plans.find((item) => item.id === subscription?.plan_id) ?? null;
      const planCode = plan ? mapPlanCode(plan.code) : null;
      return {
        company,
        plan,
        planCode,
        planName: planCode ? planLabel(planCode) : plan?.name || "—",
        subscription,
      };
    }),
  );
  return subscriptions;
}
