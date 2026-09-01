import { Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { LeadDetailSkeleton } from "@/components/feedback/PageSkeletons";

export default function Loading() {
  return (
    <Stack spacing={2}>
      <Button component={Link} href="/leads" sx={{ alignSelf: "flex-start" }}>
        ← Voltar ao pipeline
      </Button>
      <Typography variant="h4">Detalhe do Lead</Typography>
      <LeadDetailSkeleton />
    </Stack>
  );
}
