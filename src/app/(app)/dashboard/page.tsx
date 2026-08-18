"use client";

import {
  Alert,
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
import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api/client";
import { Role } from "@/lib/auth/permissions";
import { planLabel } from "@/lib/billing/plan-catalog";
import { queryKeys } from "@/lib/query/keys";
import { formatPercent } from "@/lib/utils/format";
import { useCanAccess, useFeature, useSession } from "@/modules/auth/hooks";
import { MoneyVisibilityToggle, useMoneyVisibility } from "@/modules/dashboard/MoneyVisibility";

function periodFrom(value: string) {
  const days = Number(value);
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const canAdminDash = useCanAccess("dashboard_advanced", "admin:visualizar");
  const advanced = useFeature("dashboard_advanced").enabled;
  const custom = useFeature("dashboard_custom").enabled;
  const searchParams = useSearchParams();
  const router = useRouter();
  const period = searchParams.get("period") || "30";
  const from = periodFrom(period);
  const { moneyVisible, formatMoney, moneyAxisFormatter } = useMoneyVisibility();
  const isAdmin = session?.role === Role.Administrador;

  useEffect(() => {
    if (isAdmin && canAdminDash) {
      router.replace(`/dashboard/admin?period=${period}`);
    }
  }, [isAdmin, canAdminDash, period, router]);

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
    enabled: !(isAdmin && canAdminDash),
  });

  if (isAdmin && canAdminDash) {
    return (
      <Box py={8} display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box py={8} display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const basicKpis = [
    { label: "Leads ativos", value: String(data.activeLeads), money: false },
    { label: "Leads fechados", value: String(data.closedLeads), money: false },
    { label: "Conversão", value: formatPercent(data.conversion), money: false },
    { label: "Tempo médio", value: `${data.avgCloseDays} dias`, money: false },
  ];

  const advancedKpis = [
    ...basicKpis,
    { label: "Valor vendido", value: formatMoney(data.soldValue), money: true },
    { label: "Meta", value: formatMoney(data.goal), money: true },
    { label: "Comissão", value: formatMoney(data.commission), money: true },
  ];

  const kpis = advanced ? advancedKpis : basicKpis;

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">
            {advanced ? "Dashboard Comercial" : "Dashboard"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {advanced
              ? "Indicadores comerciais, meta e comissão"
              : "Visão básica do pipeline — amplie no Profissional"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {advanced ? <MoneyVisibilityToggle /> : null}
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
          {canAdminDash && !isAdmin ? (
            <Button component={Link} href="/dashboard/admin" variant="outlined">
              Ver visão administrativa
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {!advanced ? (
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/#pricing" color="inherit" size="small">
              Ver planos
            </Button>
          }
        >
          Dashboard comercial + financeiro disponível a partir do plano {planLabel("PROFESSIONAL")}.
        </Alert>
      ) : null}

      {custom ? (
        <Alert severity="success">
          Plano {planLabel("ENTERPRISE")}: dashboard personalizado habilitado — widgets sob medida em breve.
        </Alert>
      ) : advanced ? (
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/#pricing" color="inherit" size="small">
              Ver planos
            </Button>
          }
        >
          Dashboard personalizado (widgets sob medida) no plano {planLabel("ENTERPRISE")}.
        </Alert>
      ) : null}

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
        <Grid size={{ xs: 12, md: advanced ? 6 : 12 }}>
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
        {advanced ? (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Meta vs realizado
                </Typography>
                <BarChart
                  height={280}
                  xAxis={[{ data: data.goalSeries.map((g) => g.month), scaleType: "band" }]}
                  yAxis={[
                    {
                      valueFormatter: moneyAxisFormatter,
                    },
                  ]}
                  series={[
                    {
                      data: data.goalSeries.map((g) => (moneyVisible ? g.goal : 0)),
                      label: "Meta",
                      valueFormatter: (v) => formatMoney(Number(v ?? 0)),
                    },
                    {
                      data: data.goalSeries.map((g) => (moneyVisible ? g.actual : 0)),
                      label: "Realizado",
                      valueFormatter: (v) => formatMoney(Number(v ?? 0)),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>
    </Stack>
  );
}
