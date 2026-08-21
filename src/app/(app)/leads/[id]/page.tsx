"use client";

import { Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LeadDetailSkeleton } from "@/components/feedback/PageSkeletons";
import { LeadDetail } from "@/modules/leads/components/LeadDetail";
import { useLead } from "@/modules/leads/hooks";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useLead(params.id);
  const backHref = "/leads";
  const backLabel = "← Voltar ao pipeline";

  if (isError || (!isLoading && !data)) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <Stack spacing={2}>
      <Button component={Link} href={backHref} sx={{ alignSelf: "flex-start" }}>
        {backLabel}
      </Button>
      <Typography variant="h4">Detalhe do Lead</Typography>
      {isLoading || !data ? <LeadDetailSkeleton /> : <LeadDetail lead={data} />}
    </Stack>
  );
}
