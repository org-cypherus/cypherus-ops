const PUBLIC_CRM_PREFIXES = [
  "v1/auth/login",
  "v1/auth/refresh",
  "v1/auth/logout",
  "v1/auth/invitations/accept",
  "v1/auth/password-reset",
  "v1/auth/email-verification",
  "v1/health/",
];

/** Catálogo estático: leitura pública; mutações exigem sessão CRM. */
export const PUBLIC_CATALOG_PREFIXES = ["v1/plans", "v1/features", "v1/permissions"];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix);
}

function isPublicCatalogRead(path: string, method: string) {
  if (!SAFE_METHODS.has(method.toUpperCase())) return false;
  return PUBLIC_CATALOG_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

export function isPublicCrmPath(path: string, method: string) {
  if (path === "v1/companies" && method === "POST") return true;
  if (isPublicCatalogRead(path, method)) return true;
  return PUBLIC_CRM_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

export function needsUpstreamAuth(path: string, method: string) {
  return !isPublicCrmPath(path, method);
}

export function requiresCrmSession(path: string, method: string) {
  return needsUpstreamAuth(path, method);
}
