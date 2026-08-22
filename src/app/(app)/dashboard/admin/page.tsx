"use client";

import {
  Box,
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
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { queryKeys } from "@/lib/query/keys";
import { formatPercent } from "@/lib/utils/format";
import {
  ChartShell,
  useChartMargins,
  useIsCompactChart,
} from "@/modules/dashboard/ChartShell";
import { MoneyVisibilityToggle, useMoneyVisibility } from "@/modules/dashboard/MoneyVisibility";
import {
  fetchAdminDashboard,
  fillRevenueByMonth,
  formatMonthLabel,
  periodRange,
} from "@/modules/dashboard/services";

const cardSx = {
  height: "100%",
  minWidth: 0,
  display: "flex",
  flexDirection: "column" as const,
};

const cardContentSx = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column" as const,
  gap: 1,
  "&:last-child": { pb: 2 },
};

const tableWrapSx = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
};

function truncateLabel(value: string, max = 14) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const period = searchParams.get("period") || "30";
  const { from, to } = periodRange(Number(period) || 30);
  const { formatMoney, moneyAxisFormatter } = useMoneyVisibility();
  const isCompact = useIsCompactChart();
  const moneyMargins = useChartMargins("money");
  const pieMargins = useChartMargins("pie");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.admin({ period, from, to }),
    queryFn: () => fetchAdminDashboard(from, to),
  });

  const revenueSeries = useMemo(() => {
    if (!data) return [];
    const filled = fillRevenueByMonth(data.revenueByMonth, data.from ?? from, data.to ?? to);
    if (data.revenueByMonth.some((item) => item.amount > 0) && !filled.some((item) => item.amount > 0)) {
      return data.revenueByMonth;
    }
    return filled.length ? filled : data.revenueByMonth;
  }, [data, from, to]);

  const hasRevenueBars = revenueSeries.some((item) => item.amount > 0);
  const performance = useMemo(() => data?.performance ?? [], [data?.performance]);
  const ownerLabels = useMemo(
    () =>
      Object.fromEntries(
        performance.map((row) => [
          row.ownerUserId,
          truncateLabel(row.ownerName, isCompact ? 10 : 16),
        ]),
      ),
    [performance, isCompact],
  );

  if (isLoading) {
    return (
      <Box py={8} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        error={error}
        resourceLabel="o dashboard administrativo"
        onRetry={() => refetch()}
      />
    );
  }

  const kpis = [
    { label: "Leads recebidos", value: String(data.leadsReceived) },
    {
      label: "Conversão (assinados / leads)",
      value: formatPercent(data.conversion),
    },
    { label: "Receita (pagamentos confirmados)", value: formatMoney(data.revenue) },
    { label: "Ticket médio", value: formatMoney(data.avgTicket) },
    { label: "Contratos assinados", value: String(data.signedContracts) },
    { label: "Contratos pendentes", value: String(data.pendingContracts) },
    { label: "Inadimplência (qtd)", value: String(data.overdueCount) },
    { label: "Inadimplência (R$)", value: formatMoney(data.overdueAmount) },
    { label: "Usuários ativos", value: String(data.activeUsers) },
  ];

  const periodLabel =
    data.from && data.to ? `${data.from} → ${data.to}` : `${from} → ${to}`;

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ width: "100%", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "flex-start" }}
        gap={2}
      >
        <Box minWidth={0}>
          <Typography variant="h4" sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}>
            Dashboard Administrativo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
            Totais da empresa no CRM · período {periodLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
          <MoneyVisibilityToggle />
          <TextField
            select
            size="small"
            label="Período"
            value={period}
            onChange={(e) => router.push(`/dashboard/admin?period=${e.target.value}`)}
            sx={{ minWidth: { xs: 120, sm: 140 } }}
          >
            <MenuItem value="7">7 dias</MenuItem>
            <MenuItem value="30">30 dias</MenuItem>
            <MenuItem value="90">90 dias</MenuItem>
            <MenuItem value="365">12 meses</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {kpis.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 4, lg: 3 }} sx={{ minWidth: 0 }}>
            <Card variant="outlined" sx={cardSx}>
              <CardContent sx={{ py: 1.75, "&:last-child": { pb: 1.75 } }}>
                <Typography variant="body2" color="text.secondary" noWrap title={kpi.label}>
                  {kpi.label}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ mt: 0.75, fontSize: { xs: "1.05rem", md: "1.15rem" }, wordBreak: "break-word" }}
                >
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 8 }} sx={{ minWidth: 0 }}>
          <Card variant="outlined" sx={cardSx}>
            <CardContent sx={cardContentSx}>
              <Box>
                <Typography variant="h6">Receita mensal</Typography>
                <Typography variant="body2" color="text.secondary">
                  Pagamentos confirmados por mês · total {formatMoney(data.revenue)}
                </Typography>
              </Box>
              {hasRevenueBars ? (
                <>
                  <ChartShell height={300}>
                    <BarChart
                      height={isCompact ? 255 : 300}
                      margin={moneyMargins}
                      grid={{ horizontal: true }}
                      xAxis={[
                        {
                          data: revenueSeries.map((item) => item.month),
                          scaleType: "band",
                          tickLabelStyle: {
                            fontSize: isCompact ? 10 : 12,
                            angle: isCompact && revenueSeries.length > 4 ? -35 : 0,
                            textAnchor: isCompact && revenueSeries.length > 4 ? "end" : "middle",
                          },
                          valueFormatter: (value) => formatMonthLabel(String(value ?? "")),
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
                          data: revenueSeries.map((item) => item.amount),
                          label: "Receita",
                          valueFormatter: (value) => formatMoney(Number(value ?? 0)),
                        },
                      ]}
                      slotProps={{
                        legend: { hidden: true },
                      }}
                    />
                  </ChartShell>
                  <TableContainer component={Paper} variant="outlined" sx={tableWrapSx}>
                    <Table size="small" sx={{ minWidth: 280 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Mês</TableCell>
                          <TableCell align="right">Pagamentos</TableCell>
                          <TableCell align="right">Receita</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {revenueSeries
                          .filter((item) => item.amount > 0 || item.count > 0)
                          .map((item) => (
                            <TableRow key={item.month}>
                              <TableCell>{formatMonthLabel(item.month)}</TableCell>
                              <TableCell align="right">{item.count}</TableCell>
                              <TableCell align="right">{formatMoney(item.amount)}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {data.revenue > 0
                    ? "Há receita no total do período, mas não foi possível montar a série mensal."
                    : "Nenhuma receita confirmada no período."}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }} sx={{ minWidth: 0 }}>
          <Card variant="outlined" sx={cardSx}>
            <CardContent sx={cardContentSx}>
              <Typography variant="h6">Leads por origem</Typography>
              {data.leadsByOrigin.length ? (
                <>
                  <ChartShell height={280}>
                    <PieChart
                      height={isCompact ? 238 : 280}
                      margin={pieMargins}
                      series={[
                        {
                          data: data.leadsByOrigin.map((item, index) => ({
                            id: index,
                            value: item.value,
                            label: truncateLabel(item.origin, isCompact ? 12 : 18),
                          })),
                          innerRadius: isCompact ? 36 : 48,
                          outerRadius: isCompact ? 72 : 90,
                          paddingAngle: 2,
                          cornerRadius: 4,
                        },
                      ]}
                      slotProps={{
                        legend: {
                          direction: "row",
                          position: { vertical: "bottom", horizontal: "middle" },
                        },
                      }}
                    />
                  </ChartShell>
                  <TableContainer component={Paper} variant="outlined" sx={tableWrapSx}>
                    <Table size="small" sx={{ minWidth: 220 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Origem</TableCell>
                          <TableCell align="right">Leads</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.leadsByOrigin.map((item) => (
                          <TableRow key={item.origin}>
                            <TableCell sx={{ wordBreak: "break-word" }}>{item.origin}</TableCell>
                            <TableCell align="right">{item.value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma origem no período.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ ...cardSx, width: "100%" }}>
        <CardContent sx={cardContentSx}>
          <Box>
            <Typography variant="h6">Top performers</Typography>
            <Typography variant="body2" color="text.secondary">
              Conversão e valor potencial por responsável no período
            </Typography>
          </Box>
          {performance.length ? (
            <>
              <ChartShell height={Math.max(240, performance.length * (isCompact ? 44 : 36) + 80)}>
                <BarChart
                  height={Math.max(240, performance.length * (isCompact ? 44 : 36) + 80)}
                  layout="horizontal"
                  margin={{
                    ...moneyMargins,
                    left: isCompact ? 72 : 100,
                    bottom: 32,
                  }}
                  grid={{ vertical: true }}
                  yAxis={[
                    {
                      data: performance.map((row) => row.ownerUserId),
                      scaleType: "band",
                      valueFormatter: (value) => ownerLabels[String(value ?? "")] ?? String(value ?? ""),
                      tickLabelStyle: { fontSize: isCompact ? 10 : 12 },
                    },
                  ]}
                  xAxis={[
                    {
                      valueFormatter: moneyAxisFormatter,
                      tickLabelStyle: { fontSize: isCompact ? 10 : 12 },
                    },
                  ]}
                  series={[
                    {
                      data: performance.map((row) => row.potentialValue),
                      label: "Valor potencial",
                      valueFormatter: (value) => formatMoney(Number(value ?? 0)),
                    },
                  ]}
                  slotProps={{
                    legend: { hidden: true },
                  }}
                />
              </ChartShell>
              <TableContainer component={Paper} variant="outlined" sx={tableWrapSx}>
                <Table size="small" sx={{ minWidth: 480 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Consultor</TableCell>
                      <TableCell align="right">Leads</TableCell>
                      <TableCell align="right">Convertidos</TableCell>
                      <TableCell align="right">Conversão</TableCell>
                      <TableCell align="right">Valor potencial</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performance.map((row) => (
                      <TableRow key={row.ownerUserId}>
                        <TableCell sx={{ wordBreak: "break-word" }}>{row.ownerName}</TableCell>
                        <TableCell align="right">{row.leadCount}</TableCell>
                        <TableCell align="right">{row.convertedCount}</TableCell>
                        <TableCell align="right">{formatPercent(row.conversionRate)}</TableCell>
                        <TableCell align="right">{formatMoney(row.potentialValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhum consultor com leads no período.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
