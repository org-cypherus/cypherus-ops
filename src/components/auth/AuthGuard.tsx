"use client";

import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { getAccessToken } from "@/lib/auth/session";
import { useSession } from "@/modules/auth/hooks";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasToken = typeof window !== "undefined" && Boolean(getAccessToken());
  const { isLoading, isError, isSuccess } = useSession();

  useEffect(() => {
    if (!hasToken || isError) {
      router.replace("/login");
    }
  }, [hasToken, isError, router]);

  if (!hasToken || isLoading || (!isSuccess && !isError)) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return children;
}
