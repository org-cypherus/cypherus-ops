"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { getApiError } from "@/lib/api/client";
import type { CompanyStatus } from "@/lib/billing/types";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency } from "@/lib/utils/format";
import {
  companyStatusLabel,
  featureLabel,
  paymentStatusLabel,
} from "@/modules/platform/labels";
import {
  changeCompanyPlan,
  fetchCompanyFeatures,
  fetchCompanySubscription,
  fetchPlatformCompany,
  fetchPlatformFeatures,
  fetchPlatformPlans,
  planPriceNumber,
  updateCompanyPaymentStatus,
  updateCompanyStatus,
  upsertCompanyFeatureOverride,
  type CompanyFeatureAccess,
  type CurrentPaymentStatus,
  type PlatformFeature,
} from "@/modules/platform/services";

const ACCESS_OPTIONS: CompanyStatus[] = ["ACTIVE", "SUSPENDED", "INACTIVE"];
const PAYMENT_OPTIONS: CurrentPaymentStatus[] = ["ACTIVE", "PAST_DUE", "TRIAL"];

function featureState(features: CompanyFeatureAccess[], key: string) {
  return features.find((item) => item.feature === key);
}

function catalogKey(feature: PlatformFeature) {
  return feature.key;
}

export default function PlatformCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const companyQuery = useQuery({
    queryKey: queryKeys.platform.company(companyId),
    queryFn: () => fetchPlatformCompany(companyId),
    enabled: Boolean(companyId),
  });
  const plansQuery = useQuery({
    queryKey: queryKeys.platform.plans,
    queryFn: fetchPlatformPlans,
  });
  const catalogQuery = useQuery({
    queryKey: queryKeys.platform.features,
    queryFn: fetchPlatformFeatures,
  });
  const featuresQuery = useQuery({
    queryKey: queryKeys.platform.companyFeatures(companyId),
    queryFn: () => fetchCompanyFeatures(companyId),
    enabled: Boolean(companyId),
  });
  const subscriptionQuery = useQuery({
    queryKey: queryKeys.platform.companySubscription(companyId),
    queryFn: () => fetchCompanySubscription(companyId),
    enabled: Boolean(companyId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.platform.company(companyId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.platform.companyFeatures(companyId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.platform.companySubscription(companyId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.platform.overview });
  };

  const statusMutation = useMutation({
    mutationFn: (status: CompanyStatus) => updateCompanyStatus(companyId, status),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar("Acesso da empresa atualizado", { variant: "success" });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível alterar o acesso", {
        variant: "error",
      });
    },
  });

  const planMutation = useMutation({
    mutationFn: (planId: string) => changeCompanyPlan(companyId, planId),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar("Plano da empresa atualizado", { variant: "success" });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível trocar o plano", {
        variant: "error",
      });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (status: CurrentPaymentStatus) => updateCompanyPaymentStatus(companyId, status),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar("Status de pagamento atualizado", { variant: "success" });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível atualizar o pagamento", {
        variant: "error",
      });
    },
  });

  const overrideMutation = useMutation({
    mutationFn: (payload: {
      feature_id: string;
      enabled: boolean;
      limit_value?: number | null;
      is_unlimited?: boolean;
    }) => upsertCompanyFeatureOverride(companyId, payload),
    onSuccess: () => {
      invalidate();
      enqueueSnackbar("Feature atualizada para esta empresa", { variant: "success" });
    },
    onError: (error: unknown) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível alterar a feature", {
        variant: "error",
      });
    },
  });

  if (companyQuery.isLoading || plansQuery.isLoading || catalogQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (companyQuery.isError || !companyQuery.data) {
    return <ErrorState onRetry={() => companyQuery.refetch()} />;
  }

  const company = companyQuery.data;
  const plans = plansQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];
  const features = featuresQuery.data ?? [];
  const subscription = subscriptionQuery.data;
  const currentPlan = plans.find((plan) => plan.id === subscription?.plan_id);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <div>
          <Button component={Link} href="/platform/companies" size="small" sx={{ mb: 1, ml: -1 }}>
            Voltar às empresas
          </Button>
          <Typography variant="h4">{company.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {company.legal_name || company.document}
          </Typography>
        </div>
        <Stack direction="row" spacing={1} alignItems="center">
          <StatusBadge label={companyStatusLabel(company.status)} />
          <StatusBadge label={paymentStatusLabel(subscription?.status ?? "EXPIRED")} />
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Acesso e cobrança</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Suspender bloqueia o tenant sem cancelar o contrato. Pagamento pendente marca a
            assinatura como PAST_DUE.
          </Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              select
              size="small"
              label="Acesso"
              value={company.status}
              disabled={statusMutation.isPending}
              onChange={(event) => statusMutation.mutate(event.target.value as CompanyStatus)}
              sx={{ minWidth: 200 }}
            >
              {ACCESS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {companyStatusLabel(status)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Plano"
              value={subscription?.plan_id ?? ""}
              disabled={planMutation.isPending || !subscription}
              onChange={(event) => planMutation.mutate(event.target.value)}
              sx={{ minWidth: 240 }}
            >
              {plans.map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.name} · {formatCurrency(planPriceNumber(plan))}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Pagamento"
              value={subscription?.status ?? ""}
              disabled={paymentMutation.isPending || !subscription}
              onChange={(event) =>
                paymentMutation.mutate(event.target.value as CurrentPaymentStatus)
              }
              sx={{ minWidth: 200 }}
            >
              {PAYMENT_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {paymentStatusLabel(status)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {currentPlan ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Documento {company.document} · {formatCurrency(planPriceNumber(currentPlan))}/mês
            </Typography>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta empresa não tem assinatura vigente.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6">Features desta empresa</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            O override vale só para este cliente. Desligar um módulo aqui não altera o catálogo do
            plano.
          </Typography>
          {featuresQuery.isLoading ? (
            <CircularProgress size={24} />
          ) : (
            <Stack divider={<Divider />} spacing={1.5}>
              {catalog.map((feature) => {
                const current = featureState(features, catalogKey(feature));
                const enabled = Boolean(current?.enabled);
                const isLimit = feature.type === "LIMIT" || feature.key === "max_users";
                return (
                  <Box
                    key={feature.id}
                    display="flex"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    gap={2}
                    flexDirection={{ xs: "column", sm: "row" }}
                  >
                    <Box>
                      <Typography fontWeight={600}>{feature.name || featureLabel(feature.key)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {feature.key}
                        {current?.source ? ` · origem ${current.source}` : " · fora do plano"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {isLimit && enabled ? (
                        <TextField
                          size="small"
                          type="number"
                          label="Limite"
                          defaultValue={current?.unlimited ? "" : (current?.limit ?? "")}
                          disabled={overrideMutation.isPending}
                          onBlur={(event) => {
                            const raw = event.target.value.trim();
                            overrideMutation.mutate({
                              feature_id: feature.id,
                              enabled: true,
                              is_unlimited: raw === "",
                              limit_value: raw === "" ? null : Number(raw),
                            });
                          }}
                          sx={{ width: 120 }}
                        />
                      ) : null}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={enabled}
                            disabled={overrideMutation.isPending}
                            onChange={(event) =>
                              overrideMutation.mutate({
                                feature_id: feature.id,
                                enabled: event.target.checked,
                                is_unlimited: current?.unlimited,
                                limit_value: current?.unlimited ? null : current?.limit,
                              })
                            }
                          />
                        }
                        label={enabled ? "Ligada" : "Desligada"}
                      />
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
