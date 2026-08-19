"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid2 as Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency } from "@/lib/utils/format";
import { fetchPlatformPlans, planPriceNumber, updatePlatformPlan } from "@/modules/platform/services";

export default function PlatformPlansPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const plans = useQuery({
    queryKey: queryKeys.plans,
    queryFn: fetchPlatformPlans,
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!plans.data) return;
    setDrafts(
      Object.fromEntries(plans.data.map((plan) => [plan.id, String(planPriceNumber(plan).toFixed(2))])),
    );
  }, [plans.data]);

  const save = useMutation({
    mutationFn: ({ planId, price }: { planId: string; price: number }) =>
      updatePlatformPlan(planId, { price }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans });
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.overview });
      enqueueSnackbar("Preço do plano atualizado", { variant: "success" });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível salvar o preço", {
        variant: "error",
      });
    },
  });

  if (plans.isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (plans.isError) {
    return <ErrorState onRetry={() => plans.refetch()} />;
  }

  return (
    <Stack spacing={2.5}>
      <div>
        <Typography variant="h4">Planos e preços</Typography>
        <Typography variant="body2" color="text.secondary">
          Altera o valor comercial de Essencial, Profissional e Enterprise. Quem já assinou
          permanece no mesmo plano; o novo preço vale para a cobrança seguinte.
        </Typography>
      </div>

      <Grid container spacing={2}>
        {(plans.data ?? []).map((plan) => {
          const current = planPriceNumber(plan);
          const draft = drafts[plan.id] ?? String(current);
          const parsed = Number(draft.replace(",", "."));
          const dirty = Number.isFinite(parsed) && parsed !== current;
          return (
            <Grid key={plan.id} size={{ xs: 12, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="primary.main">
                    {plan.billing_interval === "YEARLY" ? "Anual" : "Mensal"}
                  </Typography>
                  <Typography variant="h5">{plan.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                    {formatCurrency(current)} / {plan.billing_interval === "YEARLY" ? "ano" : "mês"}
                  </Typography>
                  <TextField
                    label="Novo valor (R$)"
                    size="small"
                    fullWidth
                    value={draft}
                    onChange={(event) =>
                      setDrafts((currentDrafts) => ({
                        ...currentDrafts,
                        [plan.id]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    sx={{ mt: 2 }}
                    variant="contained"
                    disabled={!dirty || save.isPending || !Number.isFinite(parsed) || parsed < 0}
                    onClick={() => save.mutate({ planId: plan.id, price: parsed })}
                  >
                    Salvar preço
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
