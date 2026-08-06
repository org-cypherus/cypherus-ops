"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Box, CircularProgress } from "@mui/material";

export function MSWProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(process.env.NEXT_PUBLIC_USE_MOCKS !== "true");

  useEffect(() => {
    async function enable() {
      if (process.env.NEXT_PUBLIC_USE_MOCKS !== "true") {
        setReady(true);
        return;
      }
      const { worker } = await import("./browser");
      await worker.start({
        onUnhandledRequest: "bypass",
        quiet: true,
        serviceWorker: { url: "/mockServiceWorker.js" },
      });
      setReady(true);
    }
    void enable();
  }, []);

  if (!ready) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return children;
}
