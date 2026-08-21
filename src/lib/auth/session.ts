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
const SESSION_USER_KEY = "cypher_ops_session_user";
const SESSION_USER_AT_KEY = "cypher_ops_session_user_at";

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
  clearCachedSessionUser();
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.id === "string" &&
    typeof u.name === "string" &&
    typeof u.email === "string" &&
    typeof u.companyId === "string" &&
    Array.isArray(u.permissions) &&
    u.company !== null &&
    typeof u.company === "object" &&
    u.features !== null &&
    typeof u.features === "object" &&
    u.subscription !== null &&
    typeof u.subscription === "object"
  );
}

/** Snapshot da sessão para montar o shell sem esperar o fan-out de hydrate. */
export function getCachedSessionUser(): SessionUser | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isSessionUser(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function getCachedSessionUpdatedAt(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = sessionStorage.getItem(SESSION_USER_AT_KEY);
  if (!raw) return undefined;
  const at = Number(raw);
  return Number.isFinite(at) ? at : undefined;
}

export function setCachedSessionUser(user: SessionUser) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(SESSION_USER_AT_KEY, String(Date.now()));
}

export function clearCachedSessionUser() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_USER_AT_KEY);
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
