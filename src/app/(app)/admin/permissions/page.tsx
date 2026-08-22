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
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  permissionFromModule,
} from "@/modules/admin/permission-modules";
import { fetchRoleCatalog, fetchRolePermissions, replaceRolePermissions } from "@/modules/admin/services";

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.catalog,
    queryFn: fetchRoleCatalog,
  });
  const [roleId, setRoleId] = useState<string>("");
  const selectedRoleId = roleId || rolesQuery.data?.[0]?.id || "";

  const permissionsQuery = useQuery({
    queryKey: [...queryKeys.roles.catalog, selectedRoleId, "permissions"],
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.catalog });
      void queryClient.invalidateQueries({ queryKey: queryKeys.roles.withPermissions });
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
        <ErrorState
          error={rolesQuery.error || permissionsQuery.error}
          resourceLabel="cargos e permissões"
          onRetry={() => permissionsQuery.refetch()}
        />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Módulo</TableCell>
                {PERMISSION_ACTIONS.map((action) => (
                  <TableCell key={action} align="center">
                    {action}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {PERMISSION_MODULES.map((mod) => (
                <TableRow key={mod.key}>
                  <TableCell>{mod.label}</TableCell>
                  {PERMISSION_ACTIONS.map((action) => {
                    const permission = permissionFromModule(mod.key, action);
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
