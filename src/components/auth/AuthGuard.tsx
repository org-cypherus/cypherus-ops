"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { isMockMode } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/session";
import { useSession } from "@/modules/auth/hooks";

/**
 * Garante autenticação sem bloquear o shell.
 * Redireciona para /login em erro; hydrate/cache ficam a cargo do useSession + FeatureRouteGuard.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const mockBlocked = isMockMode() && typeof window !== "undefined" && !getAccessToken();
  const { isError } = useSession();

  useEffect(() => {
    if (mockBlocked || isError) {
      router.replace("/login");
    }
  }, [mockBlocked, isError, router]);

  if (mockBlocked || isError) return null;

  return children;
}
