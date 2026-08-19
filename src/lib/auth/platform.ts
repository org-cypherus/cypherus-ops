export function parseCsvList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const DEFAULT_PLATFORM_DOMAINS = ["cypherops.com.br"];

export type PlatformAdminOptions = {
  emails?: string[];
  domains?: string[];
};

/** Staff Cypher: e-mails explícitos ou domínio operacional (não o @cypherops.com de demo). */
export function isPlatformAdminEmail(email: string | undefined, options?: PlatformAdminOptions) {
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized || !normalized.includes("@")) return false;

  const emails = options?.emails ?? parseCsvList(process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS);
  if (emails.includes(normalized)) return true;

  const configured =
    options?.domains ?? parseCsvList(process.env.NEXT_PUBLIC_PLATFORM_ADMIN_DOMAINS);
  const domains = configured.length > 0 ? configured : DEFAULT_PLATFORM_DOMAINS;
  const domain = normalized.split("@")[1];
  return Boolean(domain && domains.includes(domain));
}
