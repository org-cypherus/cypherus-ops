"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { homePathForSession } from "@/lib/auth/access";
import type { Permission } from "@/lib/auth/permissions";
import { canAccess, getFeatureLimit, hasFeature } from "@/lib/billing/access";
import type { FeatureKey } from "@/lib/billing/types";
import { hasSession } from "@/lib/auth/session";
import { queryKeys } from "@/lib/query/keys";
import { fetchMe, loginRequest, logoutRequest } from "./services";
import type { LoginFormValues } from "./schemas";

export { homePathForRole, homePathForSession } from "@/lib/auth/access";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    enabled: typeof window !== "undefined" && hasSession(),
    retry: false,
  });
}

export function usePermission(permission: Permission) {
  const { data: user } = useSession();
  return Boolean(user?.permissions.includes(permission));
}

export function useCompanyPlan() {
  const { data: user } = useSession();
  return {
    planCode: user?.subscription.planCode,
    status: user?.subscription.status,
    company: user?.company,
  };
}

export function useFeature(key: FeatureKey) {
  const { data: user } = useSession();
  return {
    enabled: hasFeature(user?.features, key),
    limit: getFeatureLimit(user?.features, key),
  };
}

export function useCanAccess(feature: FeatureKey, permission?: Permission) {
  const { data: user } = useSession();
  return canAccess(user?.features, user?.permissions, feature, permission);
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginFormValues) => loginRequest(values),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
      router.replace(homePathForSession(user));
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });
}
