import { Role, ROLE_PERMISSIONS, type Permission, type RoleName } from "./permissions";
import type { SessionUser } from "./session";
import { canAccess } from "@/lib/billing/access";
import { APP_NAV_ROUTES } from "@/lib/billing/routes";

export function homePathForRole(role: RoleName) {
  if (role === Role.Jurídico) return "/legal";
  if (role === Role.Financeiro) return "/financial";
  return "/leads";
}

/** Home respeitando role ∩ features do plano da company. */
export function homePathForSession(user: Pick<SessionUser, "role" | "permissions" | "features">) {
  const preferred = homePathForRole(user.role);
  const preferredRoute = APP_NAV_ROUTES.find((route) => route.href === preferred);
  if (preferredRoute) {
    const ok = preferredRoute.feature
      ? canAccess(user.features, user.permissions, preferredRoute.feature, preferredRoute.permission)
      : user.permissions.includes(preferredRoute.permission);
    if (ok) return preferred;
  }

  for (const route of APP_NAV_ROUTES) {
    if (route.href === "/admin" || route.href === "/admin/users") continue;
    const ok = route.feature
      ? canAccess(user.features, user.permissions, route.feature, route.permission)
      : user.permissions.includes(route.permission);
    if (ok) return route.href;
  }

  return "/leads";
}

export function roleHasPermission(role: RoleName, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function userHasPermission(permissions: Permission[] | undefined, permission: Permission) {
  return Boolean(permissions?.includes(permission));
}
