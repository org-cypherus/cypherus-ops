"use client";

import type { ReactNode } from "react";
import type { Permission } from "@/lib/auth/permissions";
import type { FeatureKey } from "@/lib/billing/types";
import { useCanAccess } from "@/modules/auth/hooks";

type Props = {
  feature: FeatureKey;
  /** Se informada, exige também a permission do cargo (role ∩ tier). */
  permission?: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

export function FeatureGate({ feature, permission, children, fallback = null }: Props) {
  const allowed = useCanAccess(feature, permission);
  if (!allowed) return fallback;
  return children;
}
