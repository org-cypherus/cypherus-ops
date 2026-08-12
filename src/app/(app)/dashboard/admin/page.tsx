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
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { formatPercent } from "@/lib/utils/format";
import { MoneyVisibilityToggle, useMoneyVisibility } from "@/modules/dashboard/MoneyVisibility";

function periodFrom(value: string) {
  const days = Number(value);
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const period = searchParams.get("period") || "30";
  const from = periodFrom(period);
  const { moneyVisible, formatMoney, moneyAxisFormatter } = useMoneyVisibility();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.dashboard.admin({ period }),
    queryFn: async () => {
      const { data } = await api.get<{
        leadsReceived: number;
        conversion: number;
        revenue: number;
        avgTicket: number;
        avgCloseDays: number;
        signedContracts: number;
        pendingContracts: number;
        leadsByOrigin: Array<{ origin: string; value: number }>;
        monthlyRevenue: Array<{ month: string; value: number }>;
        topPerformers: Array<{ name: string; conversion: number; revenue: number }>;
      }>("/dashboard/admin", { params: { from } });
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
    { label: "Leads recebidos", value: String(data.leadsReceived) },
    { label: "Conversão geral", value: formatPercent(data.conversion) },
    { label: "Receita", value: formatMoney(data.revenue) },
    { label: "Ticket médio", value: formatMoney(data.avgTicket) },
    { label: "Tempo médio", value: `${data.avgCloseDays} dias` },
    { label: "Contratos assinados", value: String(data.signedContracts) },
    { label: "Contratos pendentes", value: String(data.pendingContracts) },
  ];

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Dashboard Administrativo</Typography>
          <Typography variant="body2" color="text.secondary">
            Visão macro da operação
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
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Receita mensal
              </Typography>
              <BarChart
                height={300}
                xAxis={[{ data: data.monthlyRevenue.map((m) => m.month), scaleType: "band" }]}
                yAxis={[{ valueFormatter: moneyAxisFormatter }]}
                series={[
                  {
                    data: data.monthlyRevenue.map((m) => (moneyVisible ? m.value : 0)),
                    label: "Receita",
                    valueFormatter: (v) => formatMoney(Number(v ?? 0)),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Leads por origem
              </Typography>
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} variant="outlined">
        <Typography variant="h6" sx={{ p: 2 }}>
          Top performers
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Consultor</TableCell>
              <TableCell>Conversão</TableCell>
              <TableCell align="right">Receita</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.topPerformers.map((row) => (
              <TableRow key={row.name}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{formatPercent(row.conversion)}</TableCell>
                <TableCell align="right">{formatMoney(row.revenue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
