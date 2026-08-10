export type Permission =
  | "crm:visualizar"
  | "crm:criar"
  | "crm:editar"
  | "crm:excluir"
  | "contratos:visualizar"
  | "contratos:criar"
  | "contratos:editar"
  | "financeiro:visualizar"
  | "financeiro:editar"
  | "dashboard:visualizar"
  | "relatorios:exportar"
  | "admin:visualizar"
  | "admin:editar";

/** Cargos do sistema — use sempre Role.* em comparações e atribuições */
export enum Role {
  Administrador = "Administrador",
  Gestor = "Gestor",
  Comercial = "Comercial",
  Financeiro = "Financeiro",
  Jurídico = "Jurídico",
}

export type RoleName = `${Role}`;

export const ROLE_NAMES = Object.values(Role) as RoleName[];

export const ALL_PERMISSIONS: Permission[] = [
  "crm:visualizar",
  "crm:criar",
  "crm:editar",
  "crm:excluir",
  "contratos:visualizar",
  "contratos:criar",
  "contratos:editar",
  "financeiro:visualizar",
  "financeiro:editar",
  "dashboard:visualizar",
  "relatorios:exportar",
  "admin:visualizar",
  "admin:editar",
];

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [Role.Administrador]: ALL_PERMISSIONS,
  [Role.Gestor]: [
    "crm:visualizar",
    "crm:criar",
    "crm:editar",
    "contratos:visualizar",
    "contratos:criar",
    "financeiro:visualizar",
    "dashboard:visualizar",
    "relatorios:exportar",
    "admin:visualizar",
  ],
  [Role.Comercial]: [
    "crm:visualizar",
    "crm:criar",
    "crm:editar",
    "contratos:visualizar",
    "contratos:criar",
    "dashboard:visualizar",
  ],
  [Role.Financeiro]: [
    "financeiro:visualizar",
    "financeiro:editar",
    "dashboard:visualizar",
    "relatorios:exportar",
  ],
  [Role.Jurídico]: [
    "contratos:visualizar",
    "contratos:criar",
    "contratos:editar",
    "dashboard:visualizar",
  ],
};
