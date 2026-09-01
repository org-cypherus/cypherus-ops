"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import { getApiError } from "@/lib/api/client";
import { Role } from "@/lib/auth/permissions";
import { useSession } from "@/modules/auth/hooks";
import { useUserDirectory } from "@/modules/users/hooks";
import { applyImportOwners, parseLeadsCsv, type ParsedImportLead } from "../import-csv";
import { useImportLeads } from "../hooks";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ImportLeadsDialog({ open, onClose }: Props) {
  const [rows, setRows] = useState<ParsedImportLead[]>([]);
  const [defaultOwnerId, setDefaultOwnerId] = useState("");
  const importLeads = useImportLeads();
  const { enqueueSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const isComercial = session?.role === Role.Comercial;
  const users = useUserDirectory(open && !isComercial);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setDefaultOwnerId("");
      return;
    }
    if (session?.id) setDefaultOwnerId(session.id);
  }, [open, session?.id]);

  const fallbackOwnerId = isComercial ? session?.id || "" : defaultOwnerId;
  const directory = users.data ?? [];
  const ownerOptions =
    session && !directory.some((user) => user.id === session.id)
      ? [{ id: session.id, name: session.name }, ...directory]
      : directory;
  const resolved = useMemo(
    () => applyImportOwners(rows, directory, fallbackOwnerId),
    [rows, directory, fallbackOwnerId],
  );
  const missingOwner = resolved.some((row) => !row.ownerId);
  const missingCpf = resolved.some((row) => !row.cpf?.trim());
  const canConfirm =
    resolved.length > 0 &&
    !missingOwner &&
    !missingCpf &&
    !importLeads.isPending &&
    (isComercial || !users.isLoading);

  function ownerLabel(ownerId: string) {
    if (!ownerId) return "—";
    if (session?.id === ownerId) return session.name;
    return directory.find((user) => user.id === ownerId)?.name || ownerId;
  }

  function closeDialog() {
    if (importLeads.isPending) return;
    setRows([]);
    onClose();
  }

  return (
    <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="md">
      <DialogTitle>Importar leads (CSV)</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary">
            Cabeçalhos: nome, e-mail, telefone, CPF, origem, valor. O responsável pode vir como UUID,
            e-mail ou nome (colunas owner_user_id ou responsável). A API exige nome, CPF e responsável
            em cada linha.
          </Typography>
          {!isComercial ? (
            <TextField
              select
              size="small"
              label="Responsável padrão"
              value={fallbackOwnerId}
              onChange={(e) => setDefaultOwnerId(e.target.value)}
              helperText="Usado nas linhas sem responsável no arquivo"
              disabled={users.isLoading}
            >
              <MenuItem value="">Selecione um responsável</MenuItem>
              {ownerOptions.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Os leads importados ficam com você como responsável.
            </Typography>
          )}
          <Button variant="outlined" component="label">
            Selecionar arquivo CSV
            <input
              hidden
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const text = await file.text();
                setRows(parseLeadsCsv(text));
              }}
            />
          </Button>
          {rows.length > 0 && missingOwner ? (
            <Alert severity="warning">
              Há linhas sem responsável. Informe no CSV ou escolha um responsável padrão.
            </Alert>
          ) : null}
          {rows.length > 0 && missingCpf ? (
            <Alert severity="warning">Há linhas sem CPF. A importação será recusada pela API.</Alert>
          ) : null}
          {resolved.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>E-mail</TableCell>
                  <TableCell>CPF</TableCell>
                  <TableCell>Responsável</TableCell>
                  <TableCell>Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resolved.slice(0, 20).map((row, i) => (
                  <TableRow key={`${row.email}-${i}`}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.cpf || "—"}</TableCell>
                    <TableCell>{ownerLabel(row.ownerId)}</TableCell>
                    <TableCell>{row.process.totalValue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog} disabled={importLeads.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!canConfirm}
          onClick={() =>
            importLeads.mutate(resolved, {
              onSuccess: (res) => {
                enqueueSnackbar(`${res.created} leads importados`, { variant: "success" });
                setRows([]);
                onClose();
              },
              onError: (err) => {
                enqueueSnackbar(getApiError(err).message || "Não foi possível importar os leads", {
                  variant: "error",
                });
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
