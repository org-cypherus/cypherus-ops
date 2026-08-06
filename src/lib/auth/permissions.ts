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

export type RoleName =
  | "Administrador"
  | "Gestor"
  | "Comercial"
  | "Financeiro"
  | "Jurídico";

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
  Administrador: ALL_PERMISSIONS,
  Gestor: [
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
  Comercial: [
    "crm:visualizar",
    "crm:criar",
    "crm:editar",
    "contratos:visualizar",
    "contratos:criar",
    "dashboard:visualizar",
  ],
  Financeiro: [
    "financeiro:visualizar",
    "financeiro:editar",
    "dashboard:visualizar",
    "relatorios:exportar",
  ],
  Jurídico: [
    "contratos:visualizar",
    "contratos:criar",
    "contratos:editar",
    "crm:visualizar",
    "dashboard:visualizar",
  ],
};
