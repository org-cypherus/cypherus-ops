import { getCompanyId } from "@/lib/auth/session";

export type UserProfileExtras = {
  phone: string;
  team: string;
};

const STORAGE_PREFIX = "cypher_ops_user_profiles:";

function storageKey(companyId: string) {
  return `${STORAGE_PREFIX}${companyId}`;
}

function readAll(companyId: string): Record<string, UserProfileExtras> {
  if (typeof window === "undefined" || !companyId) return {};
  try {
    const raw = sessionStorage.getItem(storageKey(companyId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, UserProfileExtras>;
  } catch {
    return {};
  }
}

function writeAll(companyId: string, map: Record<string, UserProfileExtras>) {
  if (typeof window === "undefined" || !companyId) return;
  sessionStorage.setItem(storageKey(companyId), JSON.stringify(map));
}

/** Persiste telefone/time salvos via PATCH (o UserResponse do CRM não devolve esses campos). */
export function saveUserProfileExtras(userId: string, extras: UserProfileExtras) {
  const companyId = getCompanyId();
  if (!companyId || !userId) return;
  const map = readAll(companyId);
  map[userId] = {
    phone: extras.phone?.trim() ?? "",
    team: extras.team?.trim() ?? "",
  };
  writeAll(companyId, map);
}

export function getUserProfileExtras(userId: string): UserProfileExtras | undefined {
  const companyId = getCompanyId();
  if (!companyId || !userId) return undefined;
  return readAll(companyId)[userId];
}

export function getAllUserProfileExtras(): Record<string, UserProfileExtras> {
  return readAll(getCompanyId());
}
