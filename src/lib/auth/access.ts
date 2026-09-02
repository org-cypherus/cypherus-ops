import { Role, ROLE_PERMISSIONS, type Permission, type RoleName } from "./permissions";
import type { SessionUser } from "./session";
import { APP_NAV_ROUTES, canSeeAppRoute } from "@/lib/billing/routes";

export function homePathForRole(role: RoleName) {
  if (role === Role.Financeiro) return "/financial";
  return "/leads";
}

/** Home respeitando role ∩ features do plano da company. Principal de plataforma (`typ=platform`) cai no console. */
export function homePathForSession(
  user: Pick<SessionUser, "role" | "permissions" | "features"> & { isPlatformAdmin?: boolean },
) {
  if (user.isPlatformAdmin) return "/platform";
  const preferred = homePathForRole(user.role);
  const preferredRoute = APP_NAV_ROUTES.find((route) => route.href === preferred);
  if (preferredRoute && canSeeAppRoute(user, preferredRoute)) return preferred;

  for (const route of APP_NAV_ROUTES) {
    if (route.href === "/admin" || route.href === "/admin/users") continue;
    if (canSeeAppRoute(user, route)) return route.href;
  }

  return "/leads";
}

export function roleHasPermission(role: RoleName, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function userHasPermission(permissions: Permission[] | undefined, permission: Permission) {
  return Boolean(permissions?.includes(permission));
}
