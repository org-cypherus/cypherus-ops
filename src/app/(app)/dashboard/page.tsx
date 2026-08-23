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
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Role } from "@/lib/auth/permissions";
import { planLabel } from "@/lib/billing/plan-catalog";
import { queryKeys } from "@/lib/query/keys";
import { formatPercent } from "@/lib/utils/format";
import { useCanAccess, useFeature, useSession } from "@/modules/auth/hooks";
import {
  MoneyVisibilityToggle,
  useMoneyVisibility,
} from "@/modules/dashboard/MoneyVisibility";
import {
  ChartShell,
  useChartMargins,
  useIsCompactChart,
} from "@/modules/dashboard/ChartShell";
import {
  fetchCommercialDashboard,
  periodRange,
} from "@/modules/dashboard/services";

type FunnelMetric = "count" | "value";

export default function DashboardPage() {
  const { data: session } = useSession();
  const canAdminDash = useCanAccess("dashboard_advanced", "admin:visualizar");
  const advanced = useFeature("dashboard_advanced").enabled;
  const custom = useFeature("dashboard_custom").enabled;
  const searchParams = useSearchParams();
  const router = useRouter();
  const period = searchParams.get("period") || "30";
  const { from, to } = periodRange(Number(period) || 30);
  const { moneyVisible, formatMoney, moneyAxisFormatter } =
    useMoneyVisibility();
  const isCompact = useIsCompactChart();
  const isAdmin = session?.role === Role.Administrador;
  const [funnelMetric, setFunnelMetric] = useState<FunnelMetric>(
    searchParams.get("funnel") === "value" ? "value" : "count",
  );
  const funnelMargins = useChartMargins(
    funnelMetric === "value" ? "money" : "count",
  );
  const moneyMargins = useChartMargins("money");

  useEffect(() => {
    if (isAdmin && canAdminDash) {
      router.replace(`/dashboard/admin?period=${period}`);
    }
  }, [isAdmin, canAdminDash, period, router]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.me({ period, from, to }),
    queryFn: () => fetchCommercialDashboard(from, to),
    enabled: !(isAdmin && canAdminDash),
  });

  const funnelRows = useMemo(() => {
    if (!data) return [];
    return data.funnel.map((slice) => ({
      ...slice,
      avgTicket: slice.count > 0 ? slice.potentialValue / slice.count : 0,
    }));
  }, [data]);

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
    return (
      <ErrorState
        error={error}
        resourceLabel="o dashboard"
        onRetry={() => refetch()}
      />
    );
  }

  const basicKpis = [
    { label: "Leads ativos", value: String(data.activeLeads), money: false },
    { label: "Leads fechados", value: String(data.closedLeads), money: false },
    { label: "Conversão", value: formatPercent(data.conversion), money: false },
    { label: "Tempo médio", value: `${data.avgCloseDays} dias`, money: false },
  ];

  const advancedKpis = [
    ...basicKpis,
    {
      label: "Valor potencial (funil)",
      value: formatMoney(data.soldValue),
      money: true,
    },
    { label: "Meta", value: formatMoney(data.goal), money: true },
    { label: "Comissão", value: formatMoney(data.commission), money: true },
  ];

  const kpis = advanced ? advancedKpis : basicKpis;
  const showValueFunnel = funnelMetric === "value";
  // On basic plan there is no money toggle — always show amounts when metric is value.
  const funnelSeriesData = funnelRows.map((slice) => {
    if (!showValueFunnel) return slice.count;
    if (!advanced || moneyVisible) return slice.potentialValue;
    return 0;
  });

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ width: "100%", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box minWidth={0}>
          <Typography
            variant="h4"
            sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
          >
            {advanced ? "Dashboard Comercial" : "Dashboard"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {advanced
              ? "Indicadores comerciais, meta e comissão"
              : "Visão básica do pipeline — amplie no Profissional"}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          {advanced ? <MoneyVisibilityToggle /> : null}
          <TextField
            select
            size="small"
            label="Período"
            value={period}
            onChange={(e) => router.push(`/dashboard?period=${e.target.value}`)}
            sx={{ minWidth: { xs: 120, sm: 140 } }}
          >
            <MenuItem value="7">7 dias</MenuItem>
            <MenuItem value="30">30 dias</MenuItem>
            <MenuItem value="90">90 dias</MenuItem>
            <MenuItem value="365">12 meses</MenuItem>
          </TextField>
          {canAdminDash && !isAdmin ? (
            <Button
              component={Link}
              href="/dashboard/admin"
              variant="outlined"
              size="small"
            >
              Ver visão administrativa
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {!advanced ? (
        <Alert
          severity="info"
          action={
            <Button
              component={Link}
              href="/#pricing"
              color="inherit"
              size="small"
            >
              Ver planos
            </Button>
          }
        >
          Dashboard comercial + financeiro disponível a partir do plano{" "}
          {planLabel("PROFESSIONAL")}.
        </Alert>
      ) : null}

      {custom ? (
        <Alert severity="success">
          Plano {planLabel("ENTERPRISE")}: dashboard personalizado habilitado —
          widgets sob medida em breve.
        </Alert>
      ) : advanced ? (
        <Alert
          severity="info"
          action={
            <Button
              component={Link}
              href="/#pricing"
              color="inherit"
              size="small"
            >
              Ver planos
            </Button>
          }
        >
          Dashboard personalizado (widgets sob medida) no plano{" "}
          {planLabel("ENTERPRISE")}.
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        {kpis.map((kpi) => (
          <Grid
            key={kpi.label}
            size={{ xs: 12, sm: 6, md: 3 }}
            sx={{ minWidth: 0 }}
          >
            <Card variant="outlined" sx={{ height: "100%", minWidth: 0 }}>
              <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  noWrap
                  title={kpi.label}
                >
                  {kpi.label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    mt: 0.75,
                    fontSize: { xs: "1.05rem", md: "1.15rem" },
                    wordBreak: "break-word",
                  }}
                >
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, md: advanced ? 6 : 12 }} sx={{ minWidth: 0 }}>
          <Card variant="outlined" sx={{ height: "100%", minWidth: 0 }}>
            <CardContent sx={{ minWidth: 0 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
                gap={1}
                mb={2}
              >
                <Typography variant="h6">Funil</Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={funnelMetric}
                  onChange={(_, value: FunnelMetric | null) => {
                    if (value) setFunnelMetric(value);
                  }}
                >
                  <ToggleButton value="count">Contagem</ToggleButton>
                  <ToggleButton value="value">Valor potencial</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <ChartShell height={280}>
                <BarChart
                  height={isCompact ? 238 : 280}
                  margin={funnelMargins}
                  grid={{ horizontal: true }}
                  xAxis={[
                    {
                      data: funnelRows.map((f) => f.stage),
                      scaleType: "band",
                      tickLabelStyle: {
                        fontSize: isCompact ? 10 : 12,
                        angle: isCompact ? -30 : 0,
                        textAnchor: isCompact ? "end" : "middle",
                      },
                    },
                  ]}
                  yAxis={[
                    {
                      valueFormatter: showValueFunnel
                        ? moneyAxisFormatter
                        : (v) => String(v ?? 0),
                      tickLabelStyle: { fontSize: isCompact ? 10 : 12 },
                    },
                  ]}
                  series={[
                    {
                      data: funnelSeriesData,
                      label: showValueFunnel ? "Valor potencial" : "Leads",
                      valueFormatter: (v) =>
                        showValueFunnel
                          ? formatMoney(Number(v ?? 0))
                          : String(v ?? 0),
                    },
                  ]}
                  slotProps={{ legend: { hidden: true } }}
                />
              </ChartShell>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  mt: 2,
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <Table size="small" sx={{ minWidth: 360 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Estágio</TableCell>
                      <TableCell align="right">Leads</TableCell>
                      <TableCell align="right">Valor potencial</TableCell>
                      <TableCell align="right">Ticket médio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {funnelRows.map((slice) => (
                      <TableRow key={slice.stage}>
                        <TableCell sx={{ wordBreak: "break-word" }}>
                          {slice.stage}
                        </TableCell>
                        <TableCell align="right">{slice.count}</TableCell>
                        <TableCell align="right">
                          {formatMoney(slice.potentialValue)}
                        </TableCell>
                        <TableCell align="right">
                          {formatMoney(slice.avgTicket)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        {advanced ? (
          <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: 0 }}>
            <Card variant="outlined" sx={{ height: "100%", minWidth: 0 }}>
              <CardContent sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Meta vs realizado
                </Typography>
                {data.goalSeries.length ? (
                  <ChartShell height={280}>
                    <BarChart
                      height={isCompact ? 238 : 280}
                      margin={moneyMargins}
                      grid={{ horizontal: true }}
                      xAxis={[
                        {
                          data: data.goalSeries.map((g) => g.month),
                          scaleType: "band",
                          tickLabelStyle: { fontSize: isCompact ? 10 : 12 },
                        },
                      ]}
                      yAxis={[
                        {
                          valueFormatter: moneyAxisFormatter,
                          tickLabelStyle: { fontSize: isCompact ? 10 : 12 },
                        },
                      ]}
                      series={[
                        {
                          data: data.goalSeries.map((g) =>
                            moneyVisible ? g.goal : 0,
                          ),
                          label: "Meta",
                          valueFormatter: (v) => formatMoney(Number(v ?? 0)),
                        },
                        {
                          data: data.goalSeries.map((g) =>
                            moneyVisible ? g.actual : 0,
                          ),
                          label: "Realizado",
                          valueFormatter: (v) => formatMoney(Number(v ?? 0)),
                        },
                      ]}
                    />
                  </ChartShell>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Série de meta ainda não disponível neste período.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>
    </Stack>
  );
}
