"use client";

import {
  Box,
  Card,
  CardContent,
  Grid2 as Grid,
  Stack,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { useMemo } from "react";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { buildCashPanelMetrics } from "../cash-metrics";
import type { Payment } from "../services";

export function FinancialCashPanel({ payments }: { payments: Payment[] }) {
  const metrics = useMemo(() => buildCashPanelMetrics(payments), [payments]);

  const agingHasData = metrics.aging.some((bucket) => bucket.amount > 0);
  const weeklyHasData = metrics.weeklyCash.length > 0;
  const mixHasData = metrics.statusMix.some((slice) => slice.amount > 0);

  const kpis = [
    { label: "Recebido", value: formatCurrency(metrics.received) },
    { label: "Pendente", value: formatCurrency(metrics.pending) },
    { label: "Atrasado", value: formatCurrency(metrics.overdue) },
    { label: "Caixa 7 dias", value: formatCurrency(metrics.next7Days) },
    { label: "Taxa de cobrança", value: formatPercent(metrics.collectionRate * 100) },
  ];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6">Painel de caixa e inadimplência</Typography>
        <Typography variant="body2" color="text.secondary">
          Visão derivada dos pagamentos filtrados — aging, mix de status e vencimentos por semana
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {kpis.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, sm: 6, md: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, fontSize: { md: "1.1rem" } }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Mix por status (R$)
              </Typography>
              {mixHasData ? (
                <PieChart
                  height={280}
                  series={[
                    {
                      data: metrics.statusMix.map((slice, index) => ({
                        id: index,
                        value: slice.amount,
                        label: `${slice.status} (${slice.count})`,
                      })),
                    },
                  ]}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sem pagamentos no filtro atual.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Aging de recebíveis abertos
              </Typography>
              {agingHasData ? (
                <BarChart
                  height={280}
                  layout="horizontal"
                  yAxis={[{ data: metrics.aging.map((b) => b.label), scaleType: "band" }]}
                  xAxis={[
                    {
                      valueFormatter: (v) => formatCurrency(Number(v ?? 0)),
                    },
                  ]}
                  series={[
                    {
                      data: metrics.aging.map((b) => b.amount),
                      label: "Valor",
                      valueFormatter: (v) => formatCurrency(Number(v ?? 0)),
                    },
                  ]}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhum recebível aberto (pendente/atrasado) no filtro.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Caixa esperado por semana de vencimento
              </Typography>
              {weeklyHasData ? (
                <BarChart
                  height={300}
                  xAxis={[
                    {
                      data: metrics.weeklyCash.map((point) => point.label),
                      scaleType: "band",
                    },
                  ]}
                  yAxis={[
                    {
                      valueFormatter: (v) => formatCurrency(Number(v ?? 0)),
                    },
                  ]}
                  series={[
                    {
                      data: metrics.weeklyCash.map((point) => point.amount),
                      label: "A receber",
                      valueFormatter: (v) => formatCurrency(Number(v ?? 0)),
                    },
                  ]}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sem vencimentos abertos para projetar caixa.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
