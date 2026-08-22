"use client";

import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid2 as Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/feedback/ErrorState";
import { queryKeys } from "@/lib/query/keys";
import { formatPercent } from "@/lib/utils/format";
import { MoneyVisibilityToggle, useMoneyVisibility } from "@/modules/dashboard/MoneyVisibility";
import { fetchAdminDashboard, periodRange } from "@/modules/dashboard/services";

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const period = searchParams.get("period") || "30";
  const { from, to } = periodRange(Number(period) || 30);
  const { formatMoney } = useMoneyVisibility();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard.admin({ period, from, to }),
    queryFn: () => fetchAdminDashboard(from, to),
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
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Dashboard Administrativo</Typography>
          <Typography variant="body2" color="text.secondary">
            Totais da empresa no CRM · período {periodLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <MoneyVisibilityToggle />
          <TextField
            select
            size="small"
            label="Período"
            value={period}
            onChange={(e) => router.push(`/dashboard/admin?period=${e.target.value}`)}
            sx={{ minWidth: 140 }}
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
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
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
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Receita mensal
              </Typography>
              <Typography variant="body2" color="text.secondary">
                O endpoint <code>GET /dashboard/admin</code> do CRM não devolve série mensal — só o
                total de receita de pagamentos CONFIRMADOS no período ({formatMoney(data.revenue)}).
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Leads por origem
              </Typography>
              {data.leadsByOrigin.length ? (
                <PieChart
                  height={300}
                  series={[
                    {
                      data: data.leadsByOrigin.map((item, index) => ({
                        id: index,
                        value: item.value,
                        label: item.origin,
                      })),
                    },
                  ]}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhuma origem no período.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Top performers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ranking por consultor não vem no dashboard admin. Use o dashboard comercial (
            <code>GET /dashboard/me</code> → <code>performance[]</code>) para conversão e valor
            potencial por responsável.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
