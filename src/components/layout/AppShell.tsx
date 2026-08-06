"use client";

import { Box, Toolbar } from "@mui/material";
import type { ReactNode } from "react";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
import { NotificationsDrawer } from "@/components/notifications/NotificationsDrawer";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { Sidebar, TOPBAR_HEIGHT } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <Box display="flex" minHeight="100vh" bgcolor="background.default">
        <Sidebar />
        <Topbar />
        <Box
          component="main"
          flexGrow={1}
          minWidth={0}
          display="flex"
          flexDirection="column"
          minHeight="100vh"
        >
          <Toolbar
            sx={{
              minHeight: `${TOPBAR_HEIGHT}px !important`,
              height: TOPBAR_HEIGHT,
            }}
          />
          <Box
            flex={1}
            minHeight={0}
            display="flex"
            flexDirection="column"
            p={{ xs: 2, md: 3 }}
          >
            {children}
          </Box>
        </Box>
        <GlobalSearchDialog />
        <NotificationsDrawer />
        <ChangePasswordDialog />
      </Box>
    </AuthGuard>
  );
}
