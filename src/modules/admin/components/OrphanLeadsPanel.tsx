"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { assignLeadsOwners, fetchLeads } from "@/modules/leads/services";
import { useUserDirectory } from "@/modules/users/hooks";

/**
 * Leads cujo owner não está mais na lista de usuários ativos (desativado/removido).
 * Permite reatribuir responsável em lote ou por lead.
 */
export function OrphanLeadsPanel() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const directory = useUserDirectory(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [bulkOwnerId, setBulkOwnerId] = useState("");

  const activeUsers = useMemo(
    () =>
      (directory.data ?? []).filter(
        (user) => String(user.status ?? "ACTIVE").toUpperCase() === "ACTIVE",
      ),
    [directory.data],
  );
  const activeIds = useMemo(() => new Set(activeUsers.map((user) => user.id)), [activeUsers]);

  const leadsQuery = useQuery({
    queryKey: [...queryKeys.leads.all, "orphan-owners"] as const,
    queryFn: async () => {
      const page = await fetchLeads({ pageSize: 500 });
      return page.data;
    },
  });

  const orphans = useMemo(() => {
    const leads = leadsQuery.data ?? [];
    return leads.filter((lead) => !lead.ownerId || !activeIds.has(lead.ownerId));
  }, [leadsQuery.data, activeIds]);

  useEffect(() => {
    if (!orphans.length) {
      setSelected(new Set());
      setAssignments({});
      return;
    }
    setSelected(new Set(orphans.map((lead) => lead.id)));
  }, [orphans]);

  const mutation = useMutation({
    mutationFn: async () => {
      const missing = orphans.filter((lead) => !assignments[lead.id]);
      if (missing.length) {
        throw new Error(`Defina um responsável para todos os leads (${missing.length} pendentes).`);
      }
      const payload: Record<string, string> = {};
      for (const lead of orphans) payload[lead.id] = assignments[lead.id];
      await assignLeadsOwners(payload);
    },
    onSuccess: async () => {
      enqueueSnackbar("Leads reatribuídos", { variant: "success" });
      setAssignments({});
      setBulkOwnerId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.kanban }),
        leadsQuery.refetch(),
      ]);
    },
    onError: (error) => {
      enqueueSnackbar(getApiError(error).message || "Falha ao reatribuir leads", {
        variant: "error",
      });
    },
  });

  if (directory.isLoading || leadsQuery.isLoading) {
    return (
      <Box py={2} display="flex" justifyContent="center">
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (leadsQuery.isError) {
    return (
      <ErrorState
        error={leadsQuery.error}
        resourceLabel="leads sem responsável"
        onRetry={() => leadsQuery.refetch()}
      />
    );
  }

  if (!orphans.length) return null;

  const allSelected = selected.size === orphans.length;
  const someSelected = selected.size > 0 && selected.size < orphans.length;

  function applyBulk() {
    if (!bulkOwnerId || !selected.size) return;
    setAssignments((prev) => {
      const next = { ...prev };
      for (const id of selected) next[id] = bulkOwnerId;
      return next;
    });
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Leads sem responsável ativo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {orphans.length} lead(s) apontam para usuário inativo ou inexistente. Reatribua antes de
            usar o kanban.
          </Typography>
        </Box>

        <Alert severity="warning">
          Selecione um responsável ativo para cada lead (ou aplique em lote aos selecionados).
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
            {activeUsers.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" onClick={applyBulk} disabled={!bulkOwnerId || !selected.size}>
            Aplicar aos selecionados ({selected.size})
          </Button>
        </Stack>

        <TableContainer sx={{ maxHeight: 320 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(orphans.map((l) => l.id)) : new Set())
                    }
                  />
                </TableCell>
                <TableCell>Lead</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Owner atual</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Novo responsável</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orphans.map((lead) => (
                <TableRow key={lead.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(lead.id);
                          else next.delete(lead.id);
                          return next;
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {lead.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {lead.status}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    {lead.ownerName || "—"}
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
                      {activeUsers.map((user) => (
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

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            disabled={
              mutation.isPending ||
              !activeUsers.length ||
              orphans.some((lead) => !assignments[lead.id])
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Salvando…" : "Salvar responsáveis"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
