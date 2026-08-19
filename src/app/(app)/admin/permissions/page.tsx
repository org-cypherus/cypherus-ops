"use client";

import {
  Box,
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
import { useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { mapApiPermissions, UI_TO_API_PERMISSION } from "@/lib/auth/mappers";
import type { Permission } from "@/lib/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import { fetchRoleCatalog, fetchRolePermissions, replaceRolePermissions } from "@/modules/admin/services";

const modules = [
  { key: "crm", label: "CRM / Leads", actions: ["visualizar", "criar", "editar", "excluir"] },
  { key: "contratos", label: "Contratos", actions: ["visualizar", "criar", "editar"] },
  { key: "financeiro", label: "Financeiro", actions: ["visualizar", "editar"] },
  { key: "dashboard", label: "Dashboard", actions: ["visualizar"] },
  { key: "admin", label: "Administração", actions: ["visualizar", "editar"] },
];

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const rolesQuery = useQuery({
    queryKey: queryKeys.roles,
    queryFn: fetchRoleCatalog,
  });
  const [roleId, setRoleId] = useState<string>("");
  const selectedRoleId = roleId || rolesQuery.data?.[0]?.id || "";

  const permissionsQuery = useQuery({
    queryKey: [...queryKeys.roles, selectedRoleId, "permissions"],
    queryFn: () => fetchRolePermissions(selectedRoleId),
    enabled: Boolean(selectedRoleId),
  });

  const selected = useMemo(
    () =>
      mapApiPermissions(
        (permissionsQuery.data ?? []).map((item) => ({
          permission: item.permission_key,
          granted: true,
        })),
      ),
    [permissionsQuery.data],
  );

  const updatePermissions = useMutation({
    mutationFn: async (permission: Permission) => {
      const key = UI_TO_API_PERMISSION[permission];
      if (!key) throw new Error("Permissão sem equivalente na API.");
      await replaceRolePermissions(selectedRoleId, key);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles });
      enqueueSnackbar("Permissão atualizada", { variant: "success" });
    },
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Matriz de Permissões</Typography>
        <Typography variant="body2" color="text.secondary">
          Cargos da empresa × chaves da API (`leads.view`, `contracts.sign`, …)
        </Typography>
      </Box>

      <TextField
        select
        size="small"
        label="Perfil"
        value={selectedRoleId}
        onChange={(e) => setRoleId(e.target.value)}
        sx={{ maxWidth: 280 }}
        disabled={!rolesQuery.data?.length}
      >
        {(rolesQuery.data || []).map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.name}
          </MenuItem>
        ))}
      </TextField>

      {rolesQuery.isLoading || permissionsQuery.isLoading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : rolesQuery.isError || permissionsQuery.isError ? (
        <ErrorState onRetry={() => permissionsQuery.refetch()} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Módulo</TableCell>
                {["visualizar", "criar", "editar", "excluir"].map((action) => (
                  <TableCell key={action} align="center">
                    {action}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {modules.map((mod) => (
                <TableRow key={mod.key}>
                  <TableCell>{mod.label}</TableCell>
                  {["visualizar", "criar", "editar", "excluir"].map((action) => {
                    const permission = `${mod.key}:${action}` as Permission;
                    const available = mod.actions.includes(action);
                    return (
                      <TableCell key={action} align="center">
                        {available ? (
                          <Checkbox
                            checked={selected.includes(permission)}
                            disabled={updatePermissions.isPending || selected.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) updatePermissions.mutate(permission);
                            }}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
