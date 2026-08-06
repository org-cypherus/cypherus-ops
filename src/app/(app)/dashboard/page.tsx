"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid2 as Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { usePermission } from "@/modules/auth/hooks";

function periodFrom(value: string) {
  const days = Number(value);
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default function DashboardPage() {
  const canAdmin = usePermission("admin:visualizar");
  const searchParams = useSearchParams();
  const router = useRouter();
  const period = searchParams.get("period") || "30";
  const from = periodFrom(period);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard.me({ period }),
    queryFn: async () => {
      const { data } = await api.get<{
        activeLeads: number;
        closedLeads: number;
        conversion: number;
        soldValue: number;
        goal: number;
        commission: number;
        avgCloseDays: number;
        funnel: Array<{ stage: string; value: number }>;
        goalSeries: Array<{ month: string; goal: number; actual: number }>;
      }>("/dashboard/me", { params: { from } });
      return data;
    },
  });

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

  const kpis = [
    { label: "Leads ativos", value: String(data.activeLeads) },
    { label: "Leads fechados", value: String(data.closedLeads) },
    { label: "Conversão", value: formatPercent(data.conversion) },
    { label: "Valor vendido", value: formatCurrency(data.soldValue) },
    { label: "Meta", value: formatCurrency(data.goal) },
    { label: "Comissão", value: formatCurrency(data.commission) },
    { label: "Tempo médio", value: `${data.avgCloseDays} dias` },
  ];

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Dashboard Comercial</Typography>
          <Typography variant="body2" color="text.secondary">
            Seus indicadores e progresso de meta
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            select
            size="small"
            label="Período"
            value={period}
            onChange={(e) => router.push(`/dashboard?period=${e.target.value}`)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="7">7 dias</MenuItem>
            <MenuItem value="30">30 dias</MenuItem>
            <MenuItem value="90">90 dias</MenuItem>
            <MenuItem value="365">12 meses</MenuItem>
          </TextField>
          {canAdmin ? (
            <Button component={Link} href="/dashboard/admin" variant="outlined">
              Ver visão administrativa
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {kpis.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Funil
              </Typography>
              <BarChart
                height={280}
                xAxis={[{ data: data.funnel.map((f) => f.stage), scaleType: "band" }]}
                series={[{ data: data.funnel.map((f) => f.value), label: "Leads" }]}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Meta vs realizado
              </Typography>
              <BarChart
                height={280}
                xAxis={[{ data: data.goalSeries.map((g) => g.month), scaleType: "band" }]}
                series={[
                  { data: data.goalSeries.map((g) => g.goal), label: "Meta" },
                  { data: data.goalSeries.map((g) => g.actual), label: "Realizado" },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
