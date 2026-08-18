"use client";

import {
  Alert,
  Button,
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
import {
  clampDistributionStrategy,
  distributionStrategyOptions,
} from "@/lib/billing/distribution";
import { planLabel } from "@/lib/billing/plan-catalog";
import { queryKeys } from "@/lib/query/keys";
import { EnterpriseCapabilities } from "@/modules/admin/components/EnterpriseCapabilities";
import { useCompanyPlan, useFeature } from "@/modules/auth/hooks";

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
    feature: "advanced_permissions" as const,
  },
  {
    href: "/admin/permissions",
    title: "Matriz de permissões",
    description: "Controle granular por módulo e ação",
    feature: "advanced_permissions" as const,
  },
  {
    href: "/admin/enterprise",
    title: "Enterprise",
    description: "API, webhooks e personalizações do plano",
  },
];

export default function AdminPage() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { planCode } = useCompanyPlan();
  const advancedPermissions = useFeature("advanced_permissions");
  const visibleLinks = links.filter((item) => !item.feature || advancedPermissions.enabled);
  const strategyOptions = distributionStrategyOptions(planCode);

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
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Não foi possível atualizar a regra";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const selectedStrategy = clampDistributionStrategy(
    planCode,
    settings.data?.defaultStrategy || "round_robin",
  );

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
          {planCode === "ESSENTIAL" ? (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              action={
                <Button component={Link} href="/#pricing" color="inherit" size="small">
                  Ver planos
                </Button>
              }
            >
              Plano {planLabel("ESSENTIAL")}: distribuição manual/Round Robin. Automática no{" "}
              {planLabel("PROFESSIONAL")}.
            </Alert>
          ) : null}
          <TextField
            select
            size="small"
            label="Regra padrão"
            sx={{ minWidth: 320 }}
            value={selectedStrategy}
            disabled={settings.isLoading || updateSettings.isPending}
            onChange={(e) => updateSettings.mutate(e.target.value)}
          >
            {strategyOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {visibleLinks.map((item) => (
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

      <EnterpriseCapabilities compact />
    </Stack>
  );
}
