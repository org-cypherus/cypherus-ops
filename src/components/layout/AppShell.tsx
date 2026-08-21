"use client";

import { Box, Toolbar } from "@mui/material";
import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { FeatureRouteGuard } from "@/components/auth/FeatureRouteGuard";
import { SessionWarmPrefetch } from "@/components/query/SessionWarmPrefetch";
import { Sidebar, TOPBAR_HEIGHT } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <SessionWarmPrefetch />
      <Box
        display="flex"
        height="100dvh"
        overflow="hidden"
        bgcolor="background.default"
      >
        <Sidebar />
        <Topbar />
        <Box
          component="main"
          flexGrow={1}
          minWidth={0}
          display="flex"
          flexDirection="column"
          height="100%"
          overflow="hidden"
        >
          <Toolbar
            sx={{
              minHeight: `${TOPBAR_HEIGHT}px !important`,
              height: TOPBAR_HEIGHT,
              flexShrink: 0,
            }}
          />
          <Box
            flex={1}
            minHeight={0}
            display="flex"
            flexDirection="column"
            overflow="auto"
            p={{ xs: 2, md: 3 }}
          >
            <FeatureRouteGuard>{children}</FeatureRouteGuard>
          </Box>
        </Box>
      </Box>
    </AuthGuard>
  );
}
