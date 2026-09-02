import { api, getApiError } from "@/lib/api/client";
import { isMockMode } from "@/lib/api/config";
import { isGatewayUpstreamTimeout, type ParsedApiError } from "@/lib/api/errors";
import { isPlatformStaff, type PlatformStaff } from "@/lib/auth/platform";
import { Role } from "@/lib/auth/permissions";
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
  getSessionKind,
  setAccessToken,
  setCompanyId,
  setSessionKind,
  type SessionUser,
} from "@/lib/auth/session";
import { getQueryClient, PLANS_STALE_TIME_MS } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import type { AcceptInvitationFormValues, LoginFormValues, SignupFormValues } from "./schemas";
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

export async function fetchPlansCatalog(): Promise<PlanResponse[]> {
  const { data } = await api.get<PlanResponse[]>("/v1/plans");
  return data ?? [];
}

async function loadPlansCatalog() {
  return getQueryClient().ensureQueryData({
    queryKey: queryKeys.plans,
    queryFn: fetchPlansCatalog,
    staleTime: PLANS_STALE_TIME_MS,
  });
}

export type HydrateSessionProgress = (partial: SessionUser) => void;

function buildSessionUser(input: {
  user: CrmUser;
  companyId: string;
  permissions: PermissionAccess[];
  company: CompanyResponse;
  features: FeatureAccess[];
  role: SessionUser["role"];
  subscription: SessionUser["subscription"];
}): SessionUser {
  return {
    id: input.user.id,
    name: input.user.name,
    email: input.user.email,
    role: input.role,
    permissions: mapApiPermissions(input.permissions),
    companyId: input.companyId,
    company: {
      id: input.company.id,
      name: input.company.name,
      status: mapCompanyStatus(input.company.status),
    },
    subscription: input.subscription,
    features: mapApiFeatures(input.features),
    isPlatformAdmin: false,
  };
}

/**
 * Onda 1: company + features (gates de rota) → publica parcial.
 * Onda 2: roles + subscription + plans (enriquecimento) → não precisa bloquear o shell.
 */
async function hydrateSession(
  user: CrmUser,
  companyId: string,
  permissions: PermissionAccess[],
  onPartial?: HydrateSessionProgress,
): Promise<SessionUser> {
  setCompanyId(companyId);

  const [{ data: company }, { data: features }] = await Promise.all([
    api.get<CompanyResponse>(`/v1/companies/${companyId}`).catch((error: unknown) => {
      const status = getApiError(error).status;
      if (status === 401 || status === 403) {
        return {
          data: {
            id: companyId,
            name: user.name,
            status: "ACTIVE",
          } satisfies CompanyResponse,
        };
      }
      throw error;
    }),
    api.get<FeatureAccess[]>(`/v1/companies/${companyId}/features`),
  ]);

  const partial = buildSessionUser({
    user,
    companyId,
    permissions,
    company,
    features,
    role: mapRoleCode(undefined, user.is_owner),
    subscription: {
      planCode: mapPlanCode(undefined),
      status: mapSubscriptionStatus(undefined),
    },
  });
  onPartial?.(partial);

  const [{ data: roles }, subscriptionRes] = await Promise.all([
    api
      .get<RoleResponse[]>(`/v1/companies/${companyId}/users/${user.id}/roles`)
      .catch(() => ({ data: [] as RoleResponse[] })),
    api.get<SubscriptionResponse>(`/v1/companies/${companyId}/subscriptions/current`).catch(() => null),
  ]);
  const plans = await loadPlansCatalog().catch(() => [] as PlanResponse[]);

  const subscription = subscriptionRes?.data;
  const plan = plans.find((item) => item.id === subscription?.plan_id);

  return buildSessionUser({
    user,
    companyId,
    permissions,
    company,
    features,
    role: mapRoleCode(roles[0]?.code, user.is_owner),
    subscription: {
      planCode: mapPlanCode(plan?.code),
      status: mapSubscriptionStatus(subscription?.status),
    },
  });
}

export function shouldTryPlatformLogin(error: unknown) {
  const parsed = getApiError(error);
  if (parsed.status !== 401) return false;
  return parsed.code !== "ACCOUNT_LOCKED";
}

function buildPlatformSessionUser(staff: PlatformStaff): SessionUser {
  return {
    id: staff.id,
    name: staff.email.split("@")[0] || staff.email,
    email: staff.email,
    role: Role.Administrador,
    permissions: [],
    companyId: "",
    company: {
      id: "",
      name: "Plataforma",
      status: "ACTIVE",
    },
    subscription: {
      planCode: "ENTERPRISE",
      status: "ACTIVE",
    },
    features: {},
    isPlatformAdmin: true,
  };
}

async function fetchPlatformMe(): Promise<SessionUser> {
  const { data } = await api.get<PlatformStaff>("/v1/platform/auth/me");
  if (!isPlatformStaff(data)) {
    throw new Error("Resposta de plataforma inválida.");
  }
  setSessionKind("platform");
  return buildPlatformSessionUser(data);
}

export async function loginRequest(values: LoginFormValues) {
  try {
    const { data } = await api.post<{
      access_token?: string;
      user: CrmUser;
    }>("/v1/auth/login", values);
    if (isMockMode() && data.access_token) setAccessToken(data.access_token);
    setSessionKind("tenant");
    setCompanyId(data.user.company_id);
    return fetchMe();
  } catch (error) {
    if (!shouldTryPlatformLogin(error)) throw error;
    try {
      const { data } = await api.post<{
        access_token?: string;
        staff?: PlatformStaff;
      }>("/v1/platform/auth/login", values);
      if (isMockMode() && data.access_token) setAccessToken(data.access_token);
      setSessionKind("platform");
      if (isPlatformStaff(data.staff)) {
        return buildPlatformSessionUser(data.staff);
      }
      return fetchPlatformMe();
    } catch {
      throw error;
    }
  }
}

export async function acceptInvitationRequest(values: AcceptInvitationFormValues) {
  const { data } = await api.post<{
    access_token?: string;
    user?: CrmUser;
  }>("/v1/auth/invitations/accept", {
    token: values.token,
    password: values.password,
  });
  if (isMockMode() && data.access_token) setAccessToken(data.access_token);
  if (data.user?.company_id) setCompanyId(data.user.company_id);
  return fetchMe();
}

export async function fetchMe(onPartial?: HydrateSessionProgress) {
  if (getSessionKind() === "platform") {
    return fetchPlatformMe();
  }
  try {
    const { data } = await api.get<MeResponse>("/v1/me");
    setSessionKind("tenant");
    return hydrateSession(data.user, data.company_id, data.permissions, onPartial);
  } catch (error) {
    if (getApiError(error).status !== 401) throw error;
    return fetchPlatformMe();
  }
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function companyFromConflict(details: unknown): ProvisionedCompany | null {
  const root = asRecord(details);
  if (!root) return null;
  const nested = asRecord(root.company);
  const source = nested ?? root;
  if (typeof source.id !== "string") return null;
  return {
    id: source.id,
    name: typeof source.name === "string" ? source.name : "",
    status: typeof source.status === "string" ? source.status : "ACTIVE",
    invitation_token: typeof source.invitation_token === "string" ? source.invitation_token : undefined,
    owner: source.owner as CrmUser | undefined,
  };
}

function throwSignupApiError(error: unknown, parsed: ParsedApiError, message: string): never {
  const target = error && typeof error === "object" ? error : new Error(message);
  throw Object.assign(target, { apiError: { ...parsed, message } satisfies ParsedApiError });
}

async function provisionCompany(payload: {
  name: string;
  legal_name: string;
  document: string;
  plan_id: string;
  owner_name: string;
  owner_email: string;
  subscription_status: "TRIAL";
}) {
  try {
    const { data } = await api.post<ProvisionedCompany>("/v1/companies", payload);
    return data;
  } catch (error) {
    const parsed = getApiError(error);
    const recovered = companyFromConflict(parsed.details);
    if (recovered) return recovered;
    if (parsed.status === 409) {
      throwSignupApiError(
        error,
        parsed,
        parsed.message || "Esta empresa (CNPJ) já está cadastrada. Tente entrar com o e-mail do administrador.",
      );
    }
    if (isGatewayUpstreamTimeout(parsed)) {
      throwSignupApiError(
        error,
        parsed,
        "O gateway expirou, mas o CRM pode ter criado a empresa. Aguarde alguns segundos e tente entrar. Se ainda não houver senha, use o convite enviado ao e-mail.",
      );
    }
    throw error;
  }
}

export async function signupRequest(values: SignupFormValues) {
  const plans = await loadPlansCatalog();
  const plan = plans.find(
    (item) =>
      item.code.toUpperCase() === values.planCode &&
      item.billing_interval === values.billingInterval,
  ) ?? plans.find((item) => item.code.toUpperCase() === values.planCode);

  if (!plan) {
    throw new Error("Plano não encontrado. Tente novamente em instantes.");
  }

  const provisioned = await provisionCompany({
    name: values.companyName,
    legal_name: values.legalName,
    document: onlyDigits(values.document),
    plan_id: plan.id,
    owner_name: values.adminName,
    owner_email: values.email,
    subscription_status: "TRIAL",
  }).catch(async (error): Promise<ProvisionedCompany> => {
    const parsed = getApiError(error);
    if (parsed.status === 409 || isGatewayUpstreamTimeout(parsed)) {
      try {
        const session = await loginRequest({ email: values.email, password: values.password });
        return {
          id: session.company.id,
          name: session.company.name,
          status: session.company.status,
        };
      } catch {
        throw error;
      }
    }
    throw error;
  });

  if (!provisioned.invitation_token) {
    try {
      await loginRequest({ email: values.email, password: values.password });
      return { company: provisioned, accepted: true as const };
    } catch {
      return { company: provisioned, accepted: false as const };
    }
  }

  const { data: accepted } = await api.post<{ access_token?: string }>("/v1/auth/invitations/accept", {
    token: provisioned.invitation_token,
    password: values.password,
  });
  if (isMockMode() && accepted?.access_token) setAccessToken(accepted.access_token);

  return { company: provisioned, accepted: true as const };
}
