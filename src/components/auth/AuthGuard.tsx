"use client";

import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { isMockMode } from "@/lib/api/config";
import { getAccessToken } from "@/lib/auth/session";
import { useSession } from "@/modules/auth/hooks";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const mockBlocked = isMockMode() && typeof window !== "undefined" && !getAccessToken();
  const { isLoading, isError, isSuccess } = useSession();

  useEffect(() => {
    if (mockBlocked || isError) {
      router.replace("/login");
    }
  }, [mockBlocked, isError, router]);

  if (mockBlocked || isLoading || (!isSuccess && !isError)) {
    return (
      <Box minHeight="100vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) return null;

  return children;
}
