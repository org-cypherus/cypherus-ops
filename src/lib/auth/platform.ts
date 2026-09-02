export const PLATFORM_TOKEN_TYP = "platform";

export type PlatformStaffRole = "PLATFORM_VIEWER" | "PLATFORM_OPS" | "PLATFORM_ADMIN";

export type PlatformStaff = {
  id: string;
  email: string;
  role: PlatformStaffRole;
  last_login_at?: string | null;
};

export function isPlatformStaffRole(value: unknown): value is PlatformStaffRole {
  return value === "PLATFORM_VIEWER" || value === "PLATFORM_OPS" || value === "PLATFORM_ADMIN";
}

/** Staff autenticado: JWT `typ=platform`, não sufixo de e-mail. */
export function isPlatformStaff(value: unknown): value is PlatformStaff {
  if (!value || typeof value !== "object") return false;
  const staff = value as Record<string, unknown>;
  return (
    typeof staff.id === "string" &&
    typeof staff.email === "string" &&
    isPlatformStaffRole(staff.role)
  );
}
