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
import { useSnackbar } from "notistack";
import { useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { downloadDataUrl } from "@/lib/utils/download";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default function ReportsPage() {
  const [origin, setOrigin] = useState("");
  const [status, setStatus] = useState("");
  const [format, setFormat] = useState("csv");
  const { enqueueSnackbar } = useSnackbar();

  const report = useQuery({
    queryKey: queryKeys.reports({ origin, status, format }),
    queryFn: async () => {
      const { data } = await api.get<{
        status: string;
        format: string;
        downloadUrl: string;
        fileName: string;
        rows: Array<{
          date: string;
          lead: string;
          value: number;
          status: string;
          owner: string;
          origin: string;
        }>;
      }>("/reports/export", { params: { origin, status, format } });
      return data;
    },
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Relatórios</Typography>
        <Typography variant="body2" color="text.secondary">
          Filtros, pré-visualização e exportação
        </Typography>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <TextField
          select
          size="small"
          label="Origem"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="Google Ads">Google Ads</MenuItem>
          <MenuItem value="Indicação">Indicação</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="Em negociação">Em negociação</MenuItem>
          <MenuItem value="Concluído">Concluído</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Formato"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="csv">CSV</MenuItem>
          <MenuItem value="excel">Excel</MenuItem>
          <MenuItem value="pdf">PDF</MenuItem>
        </TextField>
        <Button
          variant="contained"
          disabled={report.isFetching}
          onClick={async () => {
            const result = await report.refetch();
            const data = result.data;
            if (!data?.downloadUrl) {
              enqueueSnackbar("Falha ao gerar relatório", { variant: "error" });
              return;
            }
            downloadDataUrl(data.fileName || `relatorio.${format}`, data.downloadUrl);
            enqueueSnackbar(`Relatório ${format.toUpperCase()} baixado`, { variant: "success" });
          }}
        >
          Exportar
        </Button>
      </Stack>

      {report.isLoading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : report.isError ? (
        <ErrorState onRetry={() => report.refetch()} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Lead</TableCell>
                <TableCell>Origem</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Consultor</TableCell>
                <TableCell align="right">Valor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(report.data?.rows || [])
                .filter((row) => (!origin || row.origin === origin) && (!status || row.status === status))
                .map((row, index) => (
                  <TableRow key={`${row.lead}-${index}`} hover>
                    <TableCell>{formatDate(row.date)}</TableCell>
                    <TableCell>{row.lead}</TableCell>
                    <TableCell>{row.origin}</TableCell>
                    <TableCell>
                      <StatusBadge label={row.status} />
                    </TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell align="right">{formatCurrency(row.value)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
