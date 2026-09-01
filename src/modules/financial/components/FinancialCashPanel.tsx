"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Grid2 as Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { pieChartLegendLayout } from "@/components/charts/pie-legend";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils/format";
import { humanizeEnumLabel } from "@/lib/utils/labels";
import {
  buildCashPanelMetrics,
  listUpcomingReceivables,
  upcomingReceivableDays,
  type UpcomingDayFilter,
} from "../cash-metrics";
import type { Payment } from "../services";

export function FinancialCashPanel({ payments }: { payments: Payment[] }) {
  const metrics = useMemo(() => buildCashPanelMetrics(payments), [payments]);
  const [dayFilter, setDayFilter] = useState<UpcomingDayFilter>("week");
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => upcomingReceivableDays(today), [today]);
  const upcoming = useMemo(
    () => listUpcomingReceivables(payments, today, dayFilter),
    [payments, today, dayFilter],
  );
  const weekCount = useMemo(
    () => listUpcomingReceivables(payments, today, "week").length,
    [payments, today],
  );

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
                  {...pieChartLegendLayout}
                  series={[
                    {
                      data: metrics.statusMix.map((slice, index) => ({
                        id: index,
                        value: slice.amount,
                        label: `${humanizeEnumLabel(slice.status)} (${slice.count})`,
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

              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  mt: 1,
                  bgcolor: "transparent",
                  "&:before": { display: "none" },
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="pending-clients-content"
                  id="pending-clients-header"
                  sx={{ px: 0, minHeight: 48 }}
                >
                  <Stack>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Clientes pendentes ({weekCount})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tabela por dia de vencimento — mesmo recorte do KPI Caixa 7 dias
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0, pt: 0 }}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
                    <Chip
                      size="small"
                      label="Semana"
                      color={dayFilter === "week" ? "primary" : "default"}
                      variant={dayFilter === "week" ? "filled" : "outlined"}
                      onClick={() => setDayFilter("week")}
                    />
                    {days.map((day) => (
                      <Chip
                        key={day.key}
                        size="small"
                        label={`${day.weekday} ${day.label}`}
                        color={dayFilter === day.key ? "primary" : "default"}
                        variant={dayFilter === day.key ? "filled" : "outlined"}
                        onClick={() => setDayFilter(day.key)}
                      />
                    ))}
                  </Stack>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Vencimento</TableCell>
                        <TableCell align="right">Valor</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {upcoming.length ? (
                        upcoming.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>
                              {payment.leadId ? (
                                <Typography
                                  component={Link}
                                  href={`/leads/${payment.leadId}`}
                                  variant="body2"
                                  sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}
                                >
                                  {payment.leadName}
                                </Typography>
                              ) : (
                                payment.leadName
                              )}
                            </TableCell>
                            <TableCell>{formatDate(payment.dueDate)}</TableCell>
                            <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                            <TableCell>
                              <StatusBadge label={payment.status} />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                              Nenhum cliente pendente {dayFilter === "week" ? "nesta semana" : "neste dia"}.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
