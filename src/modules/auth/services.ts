import { api } from "@/lib/api/client";
import { isMockMode } from "@/lib/api/config";
import { isPlatformAdminEmail } from "@/lib/auth/platform";
import {
  mapApiFeatures,
  mapApiPermissions,
  mapCompanyStatus,
  mapPlanCode,
  mapRoleCode,
  mapSubscriptionStatus,
  type FeatureAccess,
  type PermissionAccess,
} from "@/lib/auth/mappers";
import {
  clearAccessToken,
  setAccessToken,
  setCompanyId,
  type SessionUser,
} from "@/lib/auth/session";
import type { LoginFormValues, SignupFormValues } from "./schemas";
import { onlyDigits } from "@/lib/utils/document";

type CrmUser = {
  id: string;
  company_id: string;
  name: string;
  email: string;
  status: string;
  is_owner: boolean;
  locale?: string;
  timezone?: string;
};

type MeResponse = {
  user: CrmUser;
  company_id: string;
  permissions: PermissionAccess[];
};

type CompanyResponse = {
  id: string;
  name: string;
  status: string;
};

type SubscriptionResponse = {
  id: string;
  plan_id: string;
  status: string;
};

type PlanResponse = {
  id: string;
  code: string;
  name: string;
  billing_interval: string;
};

type RoleResponse = {
  id: string;
  code: string;
  name: string;
};

type ProvisionedCompany = CompanyResponse & {
  invitation_token?: string;
  owner?: CrmUser;
};

async function hydrateSession(user: CrmUser, companyId: string, permissions?: PermissionAccess[]): Promise<SessionUser> {
  setCompanyId(companyId);
  const [companyRes, featuresRes, subscriptionRes, rolesRes, plansRes, meRes] = await Promise.all([
    api.get<CompanyResponse>(`/v1/companies/${companyId}`),
    api.get<FeatureAccess[]>(`/v1/companies/${companyId}/features`),
    api.get<SubscriptionResponse>(`/v1/companies/${companyId}/subscriptions/current`).catch(() => null),
    api.get<RoleResponse[]>(`/v1/companies/${companyId}/users/${user.id}/roles`).catch(() => ({ data: [] as RoleResponse[] })),
    api.get<PlanResponse[]>("/v1/plans").catch(() => ({ data: [] as PlanResponse[] })),
    permissions ? Promise.resolve(null) : api.get<MeResponse>("/v1/me"),
  ]);

  const granted = permissions ?? meRes?.data.permissions ?? [];
  const subscription = subscriptionRes?.data;
  const plan = (plansRes.data ?? []).find((item) => item.id === subscription?.plan_id);
  const role = mapRoleCode(rolesRes.data[0]?.code, user.is_owner);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    permissions: mapApiPermissions(granted),
    companyId,
    company: {
      id: companyRes.data.id,
      name: companyRes.data.name,
      status: mapCompanyStatus(companyRes.data.status),
    },
    subscription: {
      planCode: mapPlanCode(plan?.code),
      status: mapSubscriptionStatus(subscription?.status),
    },
    features: mapApiFeatures(featuresRes.data),
    isPlatformAdmin: isPlatformAdminEmail(user.email),
  };
}

export async function loginRequest(values: LoginFormValues) {
  const { data } = await api.post<{
    access_token?: string;
    user: CrmUser;
  }>("/v1/auth/login", values);
  if (isMockMode() && data.access_token) setAccessToken(data.access_token);
  const companyId = data.user.company_id;
  return hydrateSession(data.user, companyId);
}

export async function fetchMe() {
  const { data } = await api.get<MeResponse>("/v1/me");
  return hydrateSession(data.user, data.company_id, data.permissions);
}

export async function logoutRequest() {
  try {
    await api.post("/v1/auth/logout", {});
  } finally {
    clearAccessToken();
  }
}

export async function requestPasswordReset(email: string) {
  await api.post("/v1/auth/password-reset", { email });
}

export async function signupRequest(values: SignupFormValues) {
  const { data: plans } = await api.get<PlanResponse[]>("/v1/plans");
  const plan = plans.find(
    (item) =>
      item.code.toUpperCase() === values.planCode &&
      item.billing_interval === values.billingInterval,
  ) ?? plans.find((item) => item.code.toUpperCase() === values.planCode);

  if (!plan) {
    throw new Error("Plano não encontrado. Tente novamente em instantes.");
  }

  const { data: provisioned } = await api.post<ProvisionedCompany>("/v1/companies", {
    name: values.companyName,
    legal_name: values.legalName,
    document: onlyDigits(values.document),
    plan_id: plan.id,
    owner_name: values.adminName,
    owner_email: values.email,
    subscription_status: "TRIAL",
  });

  if (!provisioned.invitation_token) {
    return { company: provisioned, accepted: false as const };
  }

  const { data: accepted } = await api.post<{ access_token?: string }>("/v1/auth/invitations/accept", {
    token: provisioned.invitation_token,
    password: values.password,
  });
  if (isMockMode() && accepted?.access_token) setAccessToken(accepted.access_token);

  return { company: provisioned, accepted: true as const };
}
