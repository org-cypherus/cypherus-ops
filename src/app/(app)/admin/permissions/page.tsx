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
import { api } from "@/lib/api/client";
import type { Permission, RoleName } from "@/lib/auth/permissions";
import { queryKeys } from "@/lib/query/keys";

const modules = [
  { key: "crm", label: "CRM / Leads", actions: ["visualizar", "criar", "editar", "excluir"] },
  { key: "contratos", label: "Contratos", actions: ["visualizar", "criar", "editar"] },
  { key: "financeiro", label: "Financeiro", actions: ["visualizar", "editar"] },
  { key: "dashboard", label: "Dashboard", actions: ["visualizar"] },
  { key: "relatorios", label: "Relatórios", actions: ["exportar"] },
  { key: "admin", label: "Administração", actions: ["visualizar", "editar"] },
];

export default function PermissionsPage() {
  const [role, setRole] = useState<RoleName>("Administrador");
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.roles,
    queryFn: async () => {
      const { data } = await api.get<{
        data: Array<{ name: RoleName; permissions: Permission[] }>;
      }>("/roles");
      return data.data;
    },
  });

  const selected = useMemo(
    () => data?.find((item) => item.name === role)?.permissions || [],
    [data, role],
  );

  const updatePermissions = useMutation({
    mutationFn: async (permissions: Permission[]) => {
      const { data } = await api.patch(`/roles/${encodeURIComponent(role)}/permissions`, {
        permissions,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      enqueueSnackbar("Permissões atualizadas", { variant: "success" });
    },
  });

  function togglePermission(permission: Permission, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...selected, permission]))
      : selected.filter((p) => p !== permission);
    updatePermissions.mutate(next);
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Matriz de Permissões</Typography>
        <Typography variant="body2" color="text.secondary">
          Módulos × ações por perfil — alterações persistem na sessão mock
        </Typography>
      </Box>

      <TextField
        select
        size="small"
        label="Perfil"
        value={role}
        onChange={(e) => setRole(e.target.value as RoleName)}
        sx={{ maxWidth: 280 }}
      >
        {(data || []).map((item) => (
          <MenuItem key={item.name} value={item.name}>
            {item.name}
          </MenuItem>
        ))}
      </TextField>

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
                <TableCell>Módulo</TableCell>
                {["visualizar", "criar", "editar", "excluir", "exportar"].map((action) => (
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
                  {["visualizar", "criar", "editar", "excluir", "exportar"].map((action) => {
                    const permission = `${mod.key}:${action}` as Permission;
                    const available = mod.actions.includes(action);
                    return (
                      <TableCell key={action} align="center">
                        {available ? (
                          <Checkbox
                            checked={selected.includes(permission)}
                            disabled={updatePermissions.isPending}
                            onChange={(e) => togglePermission(permission, e.target.checked)}
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
