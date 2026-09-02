import { api } from "@/lib/api/client";
import { mapCompanyStatus, mapPlanCode, mapSubscriptionStatus } from "@/lib/auth/mappers";
import { planLabel } from "@/lib/billing/plan-catalog";
import type { CompanyStatus, PlanCode, SubscriptionStatus } from "@/lib/billing/types";
import { getQueryClient, PLANS_STALE_TIME_MS } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";

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

type PlatformCompanyListItem = {
  id: string;
  name: string;
  document: string;
  status: string;
  created_at?: string;
  subscription: {
    status: string;
    plan_id: string;
    plan_code: string;
    plan_name: string;
  } | null;
};

type PlatformCompanyListResponse = {
  items?: PlatformCompanyListItem[];
  next_cursor?: string | null;
};

type PlatformCompanyDetailResponse = {
  company: PlatformCompany;
  subscription: (PlatformSubscription & { plan_code?: string; plan_name?: string }) | null;
  features?: CompanyFeatureAccess[];
};

export type PlatformCompanyDetail = {
  company: PlatformCompany;
  subscription: PlatformSubscription | null;
  features: CompanyFeatureAccess[];
};

const PLATFORM_COMPANY_PAGE_SIZE = 100;

export function planPriceNumber(plan: Pick<PlatformPlan, "price"> | null | undefined) {
  if (!plan) return 0;
  return typeof plan.price === "number" ? plan.price : Number(plan.price);
}

export function mapPlatformCompanyList(payload: PlatformCompanyListResponse | PlatformCompanyListItem[] | null | undefined) {
  if (Array.isArray(payload)) return payload;
  return payload?.items ?? [];
}

function toPlatformCompany(item: PlatformCompanyListItem): PlatformCompany {
  return {
    id: item.id,
    name: item.name,
    legal_name: null,
    document: item.document,
    status: mapCompanyStatus(item.status),
    created_at: item.created_at,
  };
}

async function fetchAllPlatformCompanyItems() {
  const items: PlatformCompanyListItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const { data } = await api.get<PlatformCompanyListResponse>("/v1/platform/companies", {
      params: { limit: PLATFORM_COMPANY_PAGE_SIZE, cursor },
    });
    const batch = mapPlatformCompanyList(data);
    items.push(...batch);
    const next = data?.next_cursor;
    if (!next || batch.length === 0) break;
    cursor = next;
  }
  return items;
}

export async function fetchPlatformCompanies() {
  const items = await fetchAllPlatformCompanyItems();
  return items.map(toPlatformCompany);
}

export async function fetchPlatformCompanyDetail(companyId: string): Promise<PlatformCompanyDetail> {
  const { data } = await api.get<PlatformCompanyDetailResponse>(`/v1/platform/companies/${companyId}`);
  return {
    company: { ...data.company, status: mapCompanyStatus(data.company.status) },
    subscription: data.subscription
      ? { ...data.subscription, status: mapSubscriptionStatus(data.subscription.status) }
      : null,
    features: data.features ?? [],
  };
}

export async function fetchPlatformCompany(companyId: string) {
  const detail = await fetchPlatformCompanyDetail(companyId);
  return detail.company;
}

export async function updateCompanyStatus(companyId: string, status: CompanyStatus) {
  const { data } = await api.patch<PlatformCompany>(`/v1/platform/companies/${companyId}/status`, {
    status,
  });
  return { ...data, status: mapCompanyStatus(data.status) };
}

export async function fetchPlatformPlans() {
  return getQueryClient().ensureQueryData({
    queryKey: queryKeys.plans,
    staleTime: PLANS_STALE_TIME_MS,
    queryFn: async () => {
      const { data } = await api.get<PlatformPlan[]>("/v1/platform/plans");
      return data ?? [];
    },
  });
}

export async function updatePlatformPlan(
  planId: string,
  payload: { name?: string; price?: number; is_active?: boolean },
) {
  const { data } = await api.patch<PlatformPlan>(`/v1/platform/plans/${planId}`, payload);
  return data;
}

export async function fetchPlatformFeatures() {
  const { data } = await api.get<PlatformFeature[]>("/v1/platform/features");
  return (data ?? []).filter((feature) => feature.is_active !== false);
}

export async function fetchCompanyFeatures(companyId: string) {
  const detail = await fetchPlatformCompanyDetail(companyId);
  return detail.features;
}

export async function upsertCompanyFeatureOverride(
  companyId: string,
  payload: { feature_id: string; enabled: boolean; limit_value?: number | null; is_unlimited?: boolean },
) {
  const { data } = await api.put(`/v1/platform/companies/${companyId}/overrides`, payload);
  return data;
}

export async function fetchCompanySubscription(companyId: string) {
  try {
    const detail = await fetchPlatformCompanyDetail(companyId);
    return detail.subscription;
  } catch {
    return null;
  }
}

export async function changeCompanyPlan(companyId: string, planId: string) {
  const { data } = await api.post<PlatformSubscription>(
    `/v1/platform/companies/${companyId}/subscriptions/current/change-plan`,
    { plan_id: planId },
  );
  return { ...data, status: mapSubscriptionStatus(data.status) };
}

export async function updateCompanyPaymentStatus(companyId: string, status: CurrentPaymentStatus) {
  const { data } = await api.patch<PlatformSubscription>(
    `/v1/platform/companies/${companyId}/subscriptions/current`,
    { status },
  );
  return { ...data, status: mapSubscriptionStatus(data.status) };
}

export function overviewFromListItems(
  items: PlatformCompanyListItem[],
  plans: PlatformPlan[],
): CompanyOverview[] {
  return items.map((item) => {
    const plan = item.subscription
      ? (plans.find((candidate) => candidate.id === item.subscription?.plan_id) ?? null)
      : null;
    const planCode = item.subscription
      ? mapPlanCode(item.subscription.plan_code)
      : plan
        ? mapPlanCode(plan.code)
        : null;
    return {
      company: toPlatformCompany(item),
      plan,
      planCode,
      planName: item.subscription?.plan_name || (planCode ? planLabel(planCode) : "—"),
      subscription: item.subscription
        ? {
            id: item.subscription.plan_id,
            company_id: item.id,
            plan_id: item.subscription.plan_id,
            status: mapSubscriptionStatus(item.subscription.status),
            is_current: true,
          }
        : null,
    };
  });
}

export async function fetchCompaniesOverview(): Promise<CompanyOverview[]> {
  const [items, plans] = await Promise.all([fetchAllPlatformCompanyItems(), fetchPlatformPlans()]);
  return overviewFromListItems(items, plans);
}
