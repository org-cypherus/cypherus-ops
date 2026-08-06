import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { LeadsPageClient } from "@/modules/leads/components/LeadsPageClient";

export default function LeadsPage() {
  return (
    <Suspense
      fallback={
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      }
    >
      <LeadsPageClient />
    </Suspense>
  );
}
