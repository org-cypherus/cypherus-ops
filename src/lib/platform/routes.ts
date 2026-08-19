export const PLATFORM_NAV_ROUTES = [
  { href: "/platform", label: "Visão geral" },
  { href: "/platform/companies", label: "Empresas" },
  { href: "/platform/plans", label: "Planos" },
  { href: "/platform/billing", label: "Pagamentos" },
] as const;

export function isPlatformPath(pathname: string) {
  return pathname === "/platform" || pathname.startsWith("/platform/");
}
