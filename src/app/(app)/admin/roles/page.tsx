"use client";

import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid2 as Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/feedback/ErrorState";
import { queryKeys } from "@/lib/query/keys";
import { fetchRoleCatalog, fetchRolePermissions } from "@/modules/admin/services";
import { mapWithConcurrency } from "@/lib/utils/concurrency";

export default function RolesPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.roles.withPermissions,
    queryFn: async () => {
      const roles = await fetchRoleCatalog();
      const withPermissions = await mapWithConcurrency(roles, 2, async (role) => ({
        ...role,
        permissions: await fetchRolePermissions(role.id).catch(() => []),
      }));
      return withPermissions;
    },
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Gestão de Perfis</Typography>
        <Typography variant="body2" color="text.secondary">
          Cargos da empresa e permissões efetivas
        </Typography>
      </Box>

      {isLoading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : isError ? (
        <ErrorState error={error} resourceLabel="cargos e papéis" onRetry={() => refetch()} />
      ) : (
        <Grid container spacing={2}>
          {(data || []).map((role) => (
            <Grid key={role.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6">{role.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {role.permissions.length} permissões
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
                    {role.permissions
                      .slice(0, 6)
                      .map((item) => item.permission_key)
                      .join(" · ")}
                    {role.permissions.length > 6 ? "…" : ""}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
