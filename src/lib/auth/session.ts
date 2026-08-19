import type { CompanySummary, ResolvedFeatures, SubscriptionSummary } from "@/lib/billing/types";
import { isMockMode } from "@/lib/api/config";
import type { Permission, RoleName } from "./permissions";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: RoleName;
  team?: string;
  permissions: Permission[];
  avatarUrl?: string;
  mustChangePassword?: boolean;
  companyId: string;
  company: CompanySummary;
  subscription: SubscriptionSummary;
  features: ResolvedFeatures;
  isPlatformAdmin?: boolean;
};

const ACCESS_KEY = "cypher_ops_access_token";
const COMPANY_KEY = "cypher_ops_company_id";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string) {
  sessionStorage.setItem(ACCESS_KEY, token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(COMPANY_KEY);
}

export function getCompanyId() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(COMPANY_KEY) || "";
}

export function setCompanyId(companyId: string) {
  sessionStorage.setItem(COMPANY_KEY, companyId);
}

export function requireCompanyId() {
  const id = getCompanyId();
  if (!id) throw new Error("Empresa da sessão não encontrada. Faça login novamente.");
  return id;
}

export function companyPath(suffix: string) {
  const normalized = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `/v1/companies/${requireCompanyId()}${normalized}`;
}

export function hasSession() {
  if (typeof window === "undefined") return false;
  if (isMockMode()) return Boolean(getAccessToken());
  return true;
}
