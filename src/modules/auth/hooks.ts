"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { homePathForSession } from "@/lib/auth/access";
import type { Permission } from "@/lib/auth/permissions";
import { canAccess, getFeatureLimit, hasFeature } from "@/lib/billing/access";
import type { FeatureKey } from "@/lib/billing/types";
import {
  getCachedSessionUser,
  hasSession,
  setCachedSessionUser,
} from "@/lib/auth/session";
import { SESSION_STALE_TIME_MS, getQueryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { acceptInvitationRequest, fetchMe, loginRequest, logoutRequest } from "./services";
import type { AcceptInvitationFormValues, LoginFormValues } from "./schemas";

export { homePathForRole, homePathForSession } from "@/lib/auth/access";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const user = await fetchMe((partial) => {
        setCachedSessionUser(partial);
        getQueryClient().setQueryData(queryKeys.me, partial);
      });
      setCachedSessionUser(user);
      return user;
    },
    enabled: typeof window !== "undefined" && hasSession(),
    staleTime: SESSION_STALE_TIME_MS,
    retry: false,
    // Snapshot: shell/gates na hora no F5; hydrate refetch em background.
    placeholderData: () => getCachedSessionUser(),
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
      setCachedSessionUser(user);
      queryClient.setQueryData(queryKeys.me, user);
      router.replace(homePathForSession(user));
    },
  });
}

export function useAcceptInvitation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AcceptInvitationFormValues) => acceptInvitationRequest(values),
    onSuccess: (user) => {
      setCachedSessionUser(user);
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
