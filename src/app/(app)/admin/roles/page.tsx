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
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

export default function RolesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.roles,
    queryFn: async () => {
      const { data } = await api.get<{
        data: Array<{ name: string; permissions: string[] }>;
      }>("/roles");
      return data.data;
    },
  });

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Gestão de Perfis</Typography>
        <Typography variant="body2" color="text.secondary">
          Perfis padrão do sistema e suas permissões
        </Typography>
      </Box>

      {isLoading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <Grid container spacing={2}>
          {(data || []).map((role) => (
            <Grid key={role.name} size={{ xs: 12, md: 6, lg: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6">{role.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1  }}>
                    {role.permissions.length} permissões
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block"  }}>
                    {role.permissions.slice(0, 6).join(" · ")}
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
