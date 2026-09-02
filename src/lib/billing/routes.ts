import type { Permission, RoleName } from "@/lib/auth/permissions";
import { Role } from "@/lib/auth/permissions";
import { canAccess } from "./access";
import type { FeatureKey, ResolvedFeatures } from "./types";

export type AppRouteConfig = {
  href: string;
  label: string;
  /** Feature do plano da company. Omitida = só RBAC. */
  feature?: FeatureKey;
  permission: Permission;
  /** Prefixos extras além de `href` (ex.: /admin/roles sob advanced_permissions). */
  matchPrefixes?: string[];
};

/**
 * Nav + guards: hide na Sidebar se !canSeeAppRoute; URL direta → upsell (plano) ou sem permissão.
 */
export const APP_NAV_ROUTES: AppRouteConfig[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    feature: "dashboard_basic",
    permission: "dashboard:visualizar",
  },
  {
    href: "/leads",
    label: "Leads",
    feature: "crm",
    permission: "crm:visualizar",
  },
  {
    href: "/contracts",
    label: "Contratos",
    feature: "contracts",
    permission: "contratos:visualizar",
  },
  {
    href: "/financial",
    label: "Financeiro",
    feature: "financial",
    permission: "financeiro:visualizar",
  },
  {
    href: "/admin/users",
    label: "Usuários",
    permission: "usuarios:visualizar",
  },
  {
    href: "/admin",
    label: "Administração",
    permission: "admin:visualizar",
  },
];

/** Rotas gated que não entram na nav principal (ou refinamentos). */
export const APP_FEATURE_ROUTES: AppRouteConfig[] = [
  {
    href: "/admin/permissions",
    label: "Permissões",
    feature: "advanced_permissions",
    permission: "admin:editar",
  },
  {
    href: "/admin/roles",
    label: "Perfis",
    feature: "advanced_permissions",
    permission: "admin:visualizar",
  },
  {
    href: "/admin/enterprise",
    label: "Enterprise",
    permission: "admin:visualizar",
  },
  {
    href: "/dashboard/admin",
    label: "Dashboard admin",
    feature: "dashboard_advanced",
    permission: "dashboard:visualizar",
  },
];

const ALL_ROUTES: AppRouteConfig[] = [...APP_FEATURE_ROUTES, ...APP_NAV_ROUTES];

export function getAppRouteByHref(href: string): AppRouteConfig | undefined {
  return ALL_ROUTES.find((route) => route.href === href);
}

/**
 * Visível na navegação / hub: precisa de permissão; se a rota tiver feature, também do plano.
 * Sem sessão → oculto.
 */
export function canSeeAppRoute(
  user:
    | {
        role?: RoleName;
        permissions?: Permission[];
        features?: ResolvedFeatures;
      }
    | null
    | undefined,
  route: Pick<AppRouteConfig, "href" | "permission" | "feature">,
): boolean {
  if (!user) return false;
  // Cargo Financeiro: a home/nav é o módulo financeiro. Upsell de plano fica no FeatureRouteGuard.
  if (route.href === "/financial" && user.role === Role.Financeiro) return true;
  if (!user.permissions?.length) return false;
  if (route.feature) {
    return canAccess(user.features, user.permissions, route.feature, route.permission);
  }
  return user.permissions.includes(route.permission);
}

function routePrefixes(route: AppRouteConfig) {
  return [route.href, ...(route.matchPrefixes ?? [])];
}

function matchesPath(pathname: string, prefix: string) {
  if (pathname === prefix) return true;
  if (prefix === "/admin") {
    return (
      pathname.startsWith("/admin") &&
      !pathname.startsWith("/admin/users") &&
      !pathname.startsWith("/admin/permissions") &&
      !pathname.startsWith("/admin/roles") &&
      !pathname.startsWith("/admin/enterprise")
    );
  }
  return pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`);
}

/** Resolve a rota gated mais específica para o pathname. */
export function matchAppRoute(pathname: string): AppRouteConfig | undefined {
  const ranked = ALL_ROUTES.map((route) => {
    const prefixes = routePrefixes(route);
    const hit = prefixes.find((prefix) => matchesPath(pathname, prefix));
    if (!hit) return null;
    return { route, score: hit.length };
  }).filter(Boolean) as Array<{ route: AppRouteConfig; score: number }>;

  ranked.sort((a, b) => b.score - a.score);
  return ranked[0]?.route;
}
