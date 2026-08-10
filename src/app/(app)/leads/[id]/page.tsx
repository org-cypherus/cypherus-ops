"use client";

import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Role } from "@/lib/auth/permissions";
import { useSession } from "@/modules/auth/hooks";
import { LeadDetail } from "@/modules/leads/components/LeadDetail";
import { useLead } from "@/modules/leads/hooks";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useLead(params.id);
  const { data: session } = useSession();
  const isLegal = session?.role === Role.Jurídico;
  const backHref = isLegal ? "/legal" : "/leads";
  const backLabel = isLegal ? "← Voltar ao jurídico" : "← Voltar ao pipeline";

  if (isLoading) {
    return (
      <Box py={8} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <Stack spacing={2}>
      <Button component={Link} href={backHref} sx={{ alignSelf: "flex-start" }}>
        {backLabel}
      </Button>
      <Typography variant="h4">Detalhe do Lead</Typography>
      <LeadDetail lead={data} />
    </Stack>
  );
}
