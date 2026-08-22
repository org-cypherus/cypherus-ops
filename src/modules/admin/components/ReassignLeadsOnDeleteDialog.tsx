"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { deactivateUser } from "@/modules/admin/services";
import { assignLeadsOwners, fetchLeads } from "@/modules/leads/services";
import { useUserDirectory } from "@/modules/users/hooks";

type Props = {
  open: boolean;
  userId: string | null;
  userName?: string;
  onClose: () => void;
  onCompleted: () => void;
};

export function ReassignLeadsOnDeleteDialog({
  open,
  userId,
  userName,
  onClose,
  onCompleted,
}: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const directory = useUserDirectory(open);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [bulkOwnerId, setBulkOwnerId] = useState("");

  const leadsQuery = useQuery({
    queryKey: [...queryKeys.leads.list({ ownerId: userId ?? undefined }), "delete-reassign"] as const,
    queryFn: async () => {
      if (!userId) return [];
      const page = await fetchLeads({ ownerId: userId, pageSize: 500 });
      return page.data;
    },
    enabled: open && Boolean(userId),
  });

  const candidates = useMemo(
    () =>
      (directory.data ?? []).filter(
        (user) =>
          user.id !== userId &&
          String(user.status ?? "ACTIVE").toUpperCase() === "ACTIVE",
      ),
    [directory.data, userId],
  );

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setAssignments({});
      setBulkOwnerId("");
      return;
    }
    if (!leadsQuery.data) return;
    setSelected(new Set(leadsQuery.data.map((lead) => lead.id)));
    setAssignments({});
    setBulkOwnerId("");
  }, [open, leadsQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const leads = leadsQuery.data ?? [];
      if (leads.length) {
        const missing = leads.filter((lead) => !assignments[lead.id]);
        if (missing.length) {
          throw new Error(
            `Defina um responsável para todos os leads (${missing.length} sem responsável).`,
          );
        }
        await assignLeadsOwners(assignments);
      }
      await deactivateUser(userId);
    },
    onSuccess: () => {
      enqueueSnackbar(
        (leadsQuery.data?.length ?? 0) > 0
          ? "Leads reatribuídos e usuário desativado"
          : "Usuário desativado",
        { variant: "success" },
      );
      onCompleted();
      onClose();
    },
    onError: (error) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível desativar o usuário", {
        variant: "error",
      });
    },
  });

  const leads = leadsQuery.data ?? [];
  const allSelected = leads.length > 0 && selected.size === leads.length;
  const someSelected = selected.size > 0 && selected.size < leads.length;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(leads.map((lead) => lead.id)) : new Set());
  }

  function toggleOne(leadId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  }

  function applyBulkOwner() {
    if (!bulkOwnerId || !selected.size) return;
    setAssignments((prev) => {
      const next = { ...prev };
      for (const leadId of selected) next[leadId] = bulkOwnerId;
      return next;
    });
  }

  const canSubmit =
    !mutation.isPending &&
    !leadsQuery.isLoading &&
    !leadsQuery.isError &&
    (leads.length === 0 || leads.every((lead) => Boolean(assignments[lead.id])));

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
          {leads.length
            ? `Reatribuir leads antes de desativar${userName ? ` — ${userName}` : ""}`
            : `Desativar usuário${userName ? ` — ${userName}` : ""}`}
        </DialogTitle>
      <DialogContent>
        {leadsQuery.isLoading || directory.isLoading ? (
          <Box py={4} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : leadsQuery.isError ? (
          <ErrorState
            error={leadsQuery.error}
            resourceLabel="os leads deste usuário"
            onRetry={() => leadsQuery.refetch()}
          />
        ) : leads.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Este usuário não possui leads. A desativação remove o acesso (soft delete) e libera o
            e-mail. Continuar?
          </Typography>
        ) : (
          <Stack spacing={2} mt={0.5}>
            <Alert severity="warning">
              {leads.length} lead(s) estão vinculados a este usuário. Reatribua um responsável ativo
              antes de desativar — os leads permanecem no CRM.
            </Alert>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              <TextField
                select
                size="small"
                label="Responsável (em lote)"
                value={bulkOwnerId}
                onChange={(e) => setBulkOwnerId(e.target.value)}
                sx={{ minWidth: 220, flex: 1 }}
              >
                {candidates.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                onClick={applyBulkOwner}
                disabled={!bulkOwnerId || selected.size === 0}
              >
                Aplicar aos selecionados ({selected.size})
              </Button>
            </Stack>

            {!candidates.length ? (
              <Alert severity="error">
                Não há outro usuário ativo para receber os leads. Convide ou ative alguém antes.
              </Alert>
            ) : null}

            <TableContainer sx={{ maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={someSelected}
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>Lead</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Status</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>Novo responsável</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.has(lead.id)}
                          onChange={(e) => toggleOne(lead.id, e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {lead.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lead.email || lead.phone || lead.id}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                        {lead.status}
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Responsável"
                          value={assignments[lead.id] ?? ""}
                          onChange={(e) =>
                            setAssignments((prev) => ({ ...prev, [lead.id]: e.target.value }))
                          }
                        >
                          {candidates.map((user) => (
                            <MenuItem key={user.id} value={user.id}>
                              {user.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!canSubmit || (leads.length > 0 && !candidates.length)}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? "Processando…"
            : leads.length
              ? "Reatribuir e desativar"
              : "Desativar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
