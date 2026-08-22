"use client";

import {
  Box,
  Card,
  CardContent,
  Grid2 as Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { useMemo } from "react";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { buildCommissionPanelMetrics } from "../commission-metrics";
import type { Commission } from "../services";

export function FinancialCommissionsPanel({ commissions }: { commissions: Commission[] }) {
  const metrics = useMemo(() => buildCommissionPanelMetrics(commissions), [commissions]);

  const chartUsers = metrics.byUser.slice(0, 12);
  const hasUsers = chartUsers.length > 0;
  const hasStatusMix = metrics.statusMix.length > 1;

  const kpis = [
    { label: "Total comissões", value: formatCurrency(metrics.total) },
    { label: "Lançamentos", value: String(metrics.count) },
    { label: "Beneficiários", value: String(metrics.beneficiaries) },
    { label: "Média por lançamento", value: formatCurrency(metrics.average) },
    { label: "Share top 5", value: formatPercent(metrics.topShare * 100) },
  ];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6">Comissões operacionais</Typography>
        <Typography variant="body2" color="text.secondary">
          Ranking por beneficiário, participação do top 5 e distribuição por status
        </Typography>
      </Box>

      {!hasUsers ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Nenhuma comissão encontrada.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
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
        <Grid size={{ xs: 12, md: hasStatusMix ? 8 : 12 }}>
          <Card variant="outlined" sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Comissão por beneficiário
              </Typography>
              <BarChart
                height={Math.max(280, chartUsers.length * 36)}
                layout="horizontal"
                yAxis={[
                  {
                    data: chartUsers.map((row) => row.userName),
                    scaleType: "band",
                  },
                ]}
                xAxis={[
                  {
                    valueFormatter: (v) => formatCurrency(Number(v ?? 0)),
                  },
                ]}
                series={[
                  {
                    data: chartUsers.map((row) => row.amount),
                    label: "Comissão",
                    valueFormatter: (v) => formatCurrency(Number(v ?? 0)),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>

        {hasStatusMix ? (
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Mix por status (R$)
                </Typography>
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
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        <Grid size={{ xs: 12 }}>
          <TableContainer component={Paper} variant="outlined">
            <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
              Top 5 beneficiários
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Beneficiário</TableCell>
                  <TableCell align="right">Lançamentos</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Participação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metrics.topUsers.map((row, index) => (
                  <TableRow key={row.userName}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row.userName}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                    <TableCell align="right">{formatCurrency(row.amount)}</TableCell>
                    <TableCell align="right">
                      {formatPercent(metrics.total ? (row.amount / metrics.total) * 100 : 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
        </>
      )}
    </Stack>
  );
}
