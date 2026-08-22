import type { Permission } from "@/lib/auth/permissions";

export type PermissionModule = {
  key: string;
  label: string;
  actions: string[];
};

/** Matriz editável (módulos × ações) alinhada à UI e ao mapa API. */
export const PERMISSION_MODULES: PermissionModule[] = [
  { key: "crm", label: "CRM / Leads", actions: ["visualizar", "criar", "editar", "excluir"] },
  { key: "contratos", label: "Contratos", actions: ["visualizar", "criar", "editar"] },
  { key: "financeiro", label: "Financeiro", actions: ["visualizar", "editar"] },
  { key: "dashboard", label: "Dashboard", actions: ["visualizar"] },
  { key: "admin", label: "Administração", actions: ["visualizar", "editar"] },
];

export const PERMISSION_ACTIONS = ["visualizar", "criar", "editar", "excluir"] as const;

export function permissionFromModule(modKey: string, action: string): Permission {
  return `${modKey}:${action}` as Permission;
}

export function editablePermissions(): Permission[] {
  return PERMISSION_MODULES.flatMap((mod) =>
    mod.actions.map((action) => permissionFromModule(mod.key, action)),
  );
}
