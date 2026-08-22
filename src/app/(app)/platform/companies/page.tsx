"use client";

import {
  Box,
  Button,
  CircularProgress,
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
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency } from "@/lib/utils/format";
import { companyStatusLabel, paymentStatusLabel } from "@/modules/platform/labels";
import { fetchCompaniesOverview, planPriceNumber } from "@/modules/platform/services";

export default function PlatformCompaniesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const overview = useQuery({
    queryKey: queryKeys.platform.overview,
    queryFn: fetchCompaniesOverview,
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (overview.data ?? []).filter((item) => {
      const matchesTerm =
        !term ||
        item.company.name.toLowerCase().includes(term) ||
        item.company.document.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "ALL" || item.company.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [overview.data, search, statusFilter]);

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
        <Typography variant="h4">Empresas clientes</Typography>
        <Typography variant="body2" color="text.secondary">
          Acesse cada tenant para liberar features, suspender o acesso ou conferir o plano
        </Typography>
      </div>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          size="small"
          label="Buscar"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 260 }}
        />
        <TextField
          select
          size="small"
          label="Acesso"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="ALL">Todos</MenuItem>
          <MenuItem value="ACTIVE">Ativas</MenuItem>
          <MenuItem value="SUSPENDED">Suspensas</MenuItem>
          <MenuItem value="INACTIVE">Inativas</MenuItem>
        </TextField>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Empresa</TableCell>
              <TableCell>Documento</TableCell>
              <TableCell>Plano</TableCell>
              <TableCell>Acesso</TableCell>
              <TableCell>Pagamento</TableCell>
              <TableCell align="right">Valor</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.company.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{item.company.name}</Typography>
                  {item.company.legal_name ? (
                    <Typography variant="caption" color="text.secondary">
                      {item.company.legal_name}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{item.company.document}</TableCell>
                <TableCell>{item.planName}</TableCell>
                <TableCell>
                  <StatusBadge label={companyStatusLabel(item.company.status)} />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={paymentStatusLabel(item.subscription?.status ?? "EXPIRED")}
                  />
                </TableCell>
                <TableCell align="right">{formatCurrency(planPriceNumber(item.plan))}</TableCell>
                <TableCell align="right">
                  <Button component={Link} href={`/platform/companies/${item.company.id}`} size="small">
                    Gerenciar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">Nenhuma empresa encontrada.</Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
