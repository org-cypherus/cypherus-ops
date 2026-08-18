"use client";

import {
  Box,
  Button,
  CircularProgress,
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FeatureGate } from "@/components/auth/FeatureGate";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { queryKeys } from "@/lib/query/keys";
import { fetchContracts } from "@/modules/contracts/services";

export default function ContractsPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.contracts.list(),
    queryFn: () => fetchContracts(),
    retry: 1,
  });

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

      {isLoading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
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
              {(data?.data || []).map((contract) => (
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
