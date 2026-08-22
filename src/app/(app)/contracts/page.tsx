"use client";

import {
  Box,
  Button,
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/PageSkeletons";
import { FeatureGate } from "@/components/auth/FeatureGate";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { queryKeys } from "@/lib/query/keys";
import {
  fetchContracts,
  filterContracts,
  type Contract,
} from "@/modules/contracts/services";

const CONTRACT_STATUSES: Contract["status"][] = ["Rascunho", "Enviado", "Assinado", "Arquivado"];

export default function ContractsPage() {
  const router = useRouter();
  const [leadFilter, setLeadFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.contracts.list(),
    queryFn: () => fetchContracts(),
  });

  const filtered = useMemo(
    () =>
      filterContracts(data?.data || [], {
        lead: leadFilter,
        status: statusFilter,
        template: templateFilter,
        from: fromFilter,
        to: toFilter,
      }),
    [data?.data, leadFilter, statusFilter, templateFilter, fromFilter, toFilter],
  );

  const hasActiveFilters = Boolean(
    leadFilter.trim() || statusFilter || templateFilter.trim() || fromFilter || toFilter,
  );

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Contratos</Typography>
          <Typography variant="body2" color="text.secondary">
            Rascunho, envio, assinatura e arquivamento
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <FeatureGate feature="contracts" permission="contratos:editar">
            <Button component={Link} href="/contracts/templates" variant="outlined">
              Modelos
            </Button>
          </FeatureGate>
          <FeatureGate feature="contracts" permission="contratos:criar">
            <Button component={Link} href="/contracts/new" variant="contained">
              Novo contrato
            </Button>
          </FeatureGate>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Lead"
          placeholder="Buscar lead..."
          value={leadFilter}
          onChange={(e) => setLeadFilter(e.target.value)}
          sx={{ minWidth: 180, flex: 1 }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Todos</MenuItem>
          {CONTRACT_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Modelo"
          placeholder="Buscar modelo..."
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          type="date"
          label="Criado de"
          InputLabelProps={{ shrink: true }}
          value={fromFilter}
          onChange={(e) => setFromFilter(e.target.value)}
        />
        <TextField
          size="small"
          type="date"
          label="Criado até"
          InputLabelProps={{ shrink: true }}
          value={toFilter}
          onChange={(e) => setToFilter(e.target.value)}
        />
        {hasActiveFilters ? (
          <Button
            size="small"
            onClick={() => {
              setLeadFilter("");
              setStatusFilter("");
              setTemplateFilter("");
              setFromFilter("");
              setToFilter("");
            }}
          >
            Limpar filtros
          </Button>
        ) : null}
      </Stack>

      {isLoading ? (
        <TableSkeleton
          columns={5}
          headers={["Lead", "Modelo", "Status", "Valor", "Criado em"]}
        />
      ) : isError ? (
        <ErrorState error={error} resourceLabel="os contratos" onRetry={() => refetch()} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {filtered.length}
              {hasActiveFilters ? ` de ${(data?.data || []).length}` : ""} contrato(s)
            </Typography>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lead</TableCell>
                <TableCell>Modelo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell>Criado em</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length ? (
                filtered.map((contract) => (
                  <TableRow
                    key={contract.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                  >
                    <TableCell>
                      <Typography
                        component={Link}
                        href={`/contracts/${contract.id}`}
                        variant="body2"
                        color="primary"
                        sx={{ textDecoration: "none", fontWeight: 600 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {contract.leadName}
                      </Typography>
                    </TableCell>
                    <TableCell>{contract.templateName}</TableCell>
                    <TableCell>
                      <StatusBadge label={contract.status} />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(contract.value)}</TableCell>
                    <TableCell>{formatDate(contract.createdAt)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                      {hasActiveFilters
                        ? "Nenhum contrato encontrado com os filtros atuais."
                        : "Nenhum contrato cadastrado."}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
