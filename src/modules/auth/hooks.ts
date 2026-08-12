"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { homePathForRole } from "@/lib/auth/access";
import type { Permission } from "@/lib/auth/permissions";
import { getAccessToken } from "@/lib/auth/session";
import { queryKeys } from "@/lib/query/keys";
import { fetchMe, loginRequest, logoutRequest } from "./services";
import type { LoginFormValues } from "./schemas";

export { homePathForRole } from "@/lib/auth/access";

export function useSession() {
  const hasToken = typeof window !== "undefined" && Boolean(getAccessToken());
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    enabled: hasToken,
    retry: false,
  });
}

export function usePermission(permission: Permission) {
  const { data: user } = useSession();
  return Boolean(user?.permissions.includes(permission));
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LoginFormValues) => loginRequest(values),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
      router.replace(homePathForRole(user.role));
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
