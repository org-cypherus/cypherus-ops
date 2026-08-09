"use client";

import {
  Card,
  CardActionArea,
  CardContent,
  Grid2 as Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSnackbar } from "notistack";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

const links = [
  {
    href: "/admin/users",
    title: "Usuários",
    description: "CRUD de colaboradores, cargos e times",
  },
  {
    href: "/admin/roles",
    title: "Perfis",
    description: "Administrador, Gestor, Comercial, Financeiro e Jurídico",
  },
  {
    href: "/admin/permissions",
    title: "Matriz de permissões",
    description: "Controle granular por módulo e ação",
  },
];

const STRATEGY_OPTIONS = [
  { value: "round_robin", label: "Round Robin (sequencial equilibrado)" },
  { value: "automatic", label: "Distribuição automática" },
  { value: "team", label: "Por equipe" },
] as const;

export default function AdminPage() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: [...queryKeys.roles, "distribution"],
    queryFn: async () => {
      const { data } = await api.get<{ defaultStrategy: string }>("/distribution-settings");
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (defaultStrategy: string) => {
      const { data } = await api.patch<{ defaultStrategy: string }>("/distribution-settings", {
        defaultStrategy,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.roles, "distribution"] });
      enqueueSnackbar("Regra de distribuição atualizada", { variant: "success" });
    },
  });

  return (
    <Stack spacing={2.5}>
      <div>
        <Typography variant="h4">Administração</Typography>
        <Typography variant="body2" color="text.secondary">
          Usuários, perfis, permissões e distribuição de leads
        </Typography>
      </div>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Distribuição de novos leads</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Quando um lead entra sem responsável manual, o sistema aplica esta regra automaticamente.
            Redistribuições pontuais continuam pelo botão Distribuir no pipeline.
          </Typography>
          <TextField
            select
            size="small"
            label="Regra padrão"
            sx={{ minWidth: 320 }}
            value={settings.data?.defaultStrategy || "round_robin"}
            disabled={settings.isLoading || updateSettings.isPending}
            onChange={(e) => updateSettings.mutate(e.target.value)}
          >
            {STRATEGY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {links.map((item) => (
          <Grid key={item.href} size={{ xs: 12, md: 4 }}>
            <Card variant="outlined">
              <CardActionArea component={Link} href={item.href}>
                <CardContent>
                  <Typography variant="h6">{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
