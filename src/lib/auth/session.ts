import type { CompanySummary, ResolvedFeatures, SubscriptionSummary } from "@/lib/billing/types";
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
};

const ACCESS_KEY = "cypher_ops_access_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string) {
  sessionStorage.setItem(ACCESS_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_KEY);
}
