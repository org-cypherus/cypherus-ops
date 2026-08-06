"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { parseLeadsCsv } from "@/lib/utils/download";
import { useImportLeads } from "../hooks";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ImportLeadsDialog({ open, onClose }: Props) {
  const [rows, setRows] = useState<Array<{ name: string; email: string; phone?: string; cpf?: string; origin?: string; process: { totalValue: number } }>>([]);
  const importLeads = useImportLeads();
  const { enqueueSnackbar } = useSnackbar();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Importar leads (CSV)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary">
            Cabeçalhos suportados: nome, email, telefone, cpf, origem, valor
          </Typography>
          <Button variant="outlined" component="label">
            Selecionar arquivo CSV
            <input
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setRows(parseLeadsCsv(text));
              }}
            />
          </Button>
          {rows.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>E-mail</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell>Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.slice(0, 20).map((row, i) => (
                  <TableRow key={`${row.email}-${i}`}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell>{row.process.totalValue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!rows.length || importLeads.isPending}
          onClick={() =>
            importLeads.mutate(rows, {
              onSuccess: (res) => {
                enqueueSnackbar(`${res.created} leads importados`, { variant: "success" });
                setRows([]);
                onClose();
              },
            })
          }
        >
          Confirmar importação
        </Button>
      </DialogActions>
    </Dialog>
  );
}
