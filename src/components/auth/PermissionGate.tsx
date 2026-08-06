"use client";

import type { ReactNode } from "react";
import type { Permission } from "@/lib/auth/permissions";
import { usePermission } from "@/modules/auth/hooks";

type Props = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate({ permission, children, fallback = null }: Props) {
  const allowed = usePermission(permission);
  if (!allowed) return fallback;
  return children;
}
