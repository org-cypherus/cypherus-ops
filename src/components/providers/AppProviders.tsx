"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import { type ReactNode } from "react";
import { QueryProvider } from "@/lib/query/provider";
import { MSWProvider } from "@/mocks/MSWProvider";
import { useUIStore } from "@/store/ui";
import { createAppTheme } from "@/theme";

function Themed({ children }: { children: ReactNode }) {
  const mode = useUIStore((s) => s.mode);
  const theme = createAppTheme(mode);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
        {children}
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <MSWProvider>
        <QueryProvider>
          <Themed>{children}</Themed>
        </QueryProvider>
      </MSWProvider>
    </AppRouterCacheProvider>
  );
}
