import { Role, ROLE_PERMISSIONS, type Permission, type RoleName } from "./permissions";

export function homePathForRole(role: RoleName) {
  if (role === Role.Jurídico) return "/legal";
  if (role === Role.Financeiro) return "/financial";
  return "/leads";
}

export function roleHasPermission(role: RoleName, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function userHasPermission(permissions: Permission[] | undefined, permission: Permission) {
  return Boolean(permissions?.includes(permission));
}
