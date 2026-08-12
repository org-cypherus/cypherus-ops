import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { CalendarPageClient } from "@/modules/calendar/components/CalendarPageClient";

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      }
    >
      <CalendarPageClient />
    </Suspense>
  );
}
