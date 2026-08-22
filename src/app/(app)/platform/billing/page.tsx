"use client";

import {
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
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSnackbar } from "notistack";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency } from "@/lib/utils/format";
import { paymentStatusLabel } from "@/modules/platform/labels";
import {
  fetchCompaniesOverview,
  planPriceNumber,
  updateCompanyPaymentStatus,
  type CurrentPaymentStatus,
} from "@/modules/platform/services";

export default function PlatformBillingPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [filter, setFilter] = useState("ALL");
  const overview = useQuery({
    queryKey: queryKeys.platform.overview,
    queryFn: fetchCompaniesOverview,
  });

  const rows = useMemo(() => {
    return (overview.data ?? []).filter((item) => {
      if (filter === "ALL") return true;
      return item.subscription?.status === filter;
    });
  }, [overview.data, filter]);

  const paid = (overview.data ?? []).filter((item) => item.subscription?.status === "ACTIVE");
  const pending = (overview.data ?? []).filter((item) => item.subscription?.status === "PAST_DUE");
  const trial = (overview.data ?? []).filter((item) => item.subscription?.status === "TRIAL");
  const received = paid.reduce((sum, item) => sum + planPriceNumber(item.plan), 0);
  const outstanding = pending.reduce((sum, item) => sum + planPriceNumber(item.plan), 0);

  const payment = useMutation({
    mutationFn: ({
      companyId,
      status,
    }: {
      companyId: string;
      status: Extract<CurrentPaymentStatus, "ACTIVE" | "PAST_DUE">;
    }) => updateCompanyPaymentStatus(companyId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.overview });
      enqueueSnackbar("Pagamento atualizado", { variant: "success" });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível atualizar o pagamento", {
        variant: "error",
      });
    },
  });

  if (overview.isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;
  }

  return (
    <Stack spacing={2.5}>
      <div>
        <Typography variant="h4">Pagamentos das assinaturas</Typography>
        <Typography variant="body2" color="text.secondary">
          Controle se a mensalidade de cada cliente está paga ou pendente
        </Typography>
      </div>

      <Grid container spacing={2}>
        {[
          { label: "Recebido (MRR)", value: formatCurrency(received) },
          { label: "Pendente", value: formatCurrency(outstanding) },
          { label: "Em trial", value: String(trial.length) },
        ].map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <TextField
        select
        size="small"
        label="Status"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        sx={{ maxWidth: 240 }}
      >
        <MenuItem value="ALL">Todos</MenuItem>
        <MenuItem value="ACTIVE">Pagos</MenuItem>
        <MenuItem value="PAST_DUE">Pendentes</MenuItem>
        <MenuItem value="TRIAL">Trial</MenuItem>
      </TextField>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Empresa</TableCell>
              <TableCell>Plano</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => {
              const status = item.subscription?.status;
              return (
                <TableRow key={item.company.id} hover>
                  <TableCell>
                    <Button
                      component={Link}
                      href={`/platform/companies/${item.company.id}`}
                      size="small"
                      sx={{ ml: -1 }}
                    >
                      {item.company.name}
                    </Button>
                  </TableCell>
                  <TableCell>{item.planName}</TableCell>
                  <TableCell align="right">{formatCurrency(planPriceNumber(item.plan))}</TableCell>
                  <TableCell>
                    <StatusBadge label={paymentStatusLabel(status ?? "EXPIRED")} />
                  </TableCell>
                  <TableCell align="right">
                    {status === "PAST_DUE" || status === "TRIAL" ? (
                      <Button
                        size="small"
                        disabled={payment.isPending || !item.subscription}
                        onClick={() =>
                          payment.mutate({ companyId: item.company.id, status: "ACTIVE" })
                        }
                      >
                        Marcar pago
                      </Button>
                    ) : null}
                    {status === "ACTIVE" ? (
                      <Button
                        size="small"
                        color="warning"
                        disabled={payment.isPending || !item.subscription}
                        onClick={() =>
                          payment.mutate({ companyId: item.company.id, status: "PAST_DUE" })
                        }
                      >
                        Marcar pendente
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">Nenhum pagamento neste filtro.</Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
