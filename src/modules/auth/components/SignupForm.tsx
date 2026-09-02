"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Link as MuiLink,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { getApiError } from "@/lib/api/client";
import type { ParsedApiError } from "@/lib/api/errors";
import { formatCnpj } from "@/lib/utils/document";
import { findSignupPlanOption, signupPlanOptions } from "@/modules/landing/content";
import {
  billingIntervalLabel,
  canSubmitSignup,
  SIGNUP_STEP_FIELDS,
  validateSignupStep,
} from "@/modules/auth/signup-flow";
import { signupRequest } from "@/modules/auth/services";
import {
  resolvePlanCode,
  signupSchema,
  signupSteps,
  type SignupFormValues,
} from "@/modules/auth/schemas";

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={0.5} justifyContent="space-between" py={1}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign={{ xs: "left", sm: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}

function detailsPreview(details: unknown) {
  if (details == null) return null;
  try {
    const text = typeof details === "string" ? details : JSON.stringify(details, null, 2);
    return text.length > 1500 ? `${text.slice(0, 1500)}…` : text;
  } catch {
    return null;
  }
}

function SignupErrorAlert({ error }: { error: ParsedApiError }) {
  const operation = [error.method, error.path].filter(Boolean).join(" ");
  const preview = detailsPreview(error.details);
  return (
    <Alert severity="error" sx={{ mb: 2 }} role="alert">
      <Typography variant="body2" fontWeight={700}>
        {error.message || "Falha ao finalizar a contratação. Verifique os dados e tente de novo."}
      </Typography>
      {operation ? (
        <Typography variant="caption" display="block" sx={{ mt: 0.75 }}>
          {operation}
          {error.status ? ` · HTTP ${error.status}` : ""}
          {error.code && error.code !== "UNKNOWN" ? ` · ${error.code}` : ""}
        </Typography>
      ) : (
        <Typography variant="caption" display="block" sx={{ mt: 0.75 }}>
          {error.status ? `HTTP ${error.status}` : "Erro local"}
          {error.code && error.code !== "UNKNOWN" ? ` · ${error.code}` : ""}
        </Typography>
      )}
      {error.requestId ? (
        <Typography variant="caption" display="block" sx={{ fontFamily: "ui-monospace, monospace", mt: 0.5 }}>
          Request ID: {error.requestId}
        </Typography>
      ) : null}
      {error.traceId ? (
        <Typography variant="caption" display="block" sx={{ fontFamily: "ui-monospace, monospace" }}>
          Trace ID: {error.traceId}
        </Typography>
      ) : null}
      {preview ? (
        <Typography
          variant="caption"
          component="pre"
          display="block"
          sx={{ mt: 1, mb: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, monospace" }}
        >
          {preview}
        </Typography>
      ) : null}
    </Alert>
  );
}

export function SignupForm() {
  const searchParams = useSearchParams();
  const initialPlan = resolvePlanCode(searchParams.get("plan"));
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ParsedApiError | null>(null);
  const [createdAccount, setCreatedAccount] = useState<SignupFormValues | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      companyName: "",
      legalName: "",
      document: "",
      adminName: "",
      email: "",
      password: "",
      confirmPassword: "",
      planCode: initialPlan,
      billingInterval: "MONTHLY",
    },
  });

  const values = watch();
  const selectedPlanMeta = useMemo(() => findSignupPlanOption(values.planCode), [values.planCode]);

  function applyZodIssues(issues: { path: (string | number)[]; message: string }[]) {
    for (const issue of issues) {
      const field = issue.path[0];
      if (typeof field !== "string") continue;
      setError(field as FieldPath<SignupFormValues>, { type: "manual", message: issue.message });
    }
  }

  function goNext() {
    setSubmitError(null);
    if (activeStep >= SIGNUP_STEP_FIELDS.length) return;

    const fields = [...SIGNUP_STEP_FIELDS[activeStep]];
    clearErrors(fields);
    const result = validateSignupStep(activeStep, getValues());
    if (!result.success) {
      applyZodIssues(result.issues);
      return;
    }
    setActiveStep((step) => step + 1);
  }

  function goBack() {
    if (submitting) return;
    setSubmitError(null);
    setActiveStep((step) => Math.max(0, step - 1));
  }

  async function onConfirmSignup(formValues: SignupFormValues) {
    if (!canSubmitSignup(activeStep)) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await signupRequest(formValues);
      if (!result.company) {
        setSubmitError({
          status: 0,
          code: "SIGNUP_FAILED",
          message: "Não foi possível criar a conta. Tente novamente.",
        });
        return;
      }
      setCreatedAccount(formValues);
    } catch (error) {
      const parsed = getApiError(error);
      console.error("[signup] falha ao confirmar e finalizar", parsed, error);
      setSubmitError(parsed);
    } finally {
      setSubmitting(false);
    }
  }

  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitSignup(activeStep)) {
      goNext();
      return;
    }
    void handleSubmit(onConfirmSignup)();
  }

  if (createdAccount) {
    const plan = findSignupPlanOption(createdAccount.planCode);
    return (
      <Card sx={{ width: "100%", maxWidth: 640 }} elevation={0} variant="outlined">
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <CheckCircleRoundedIcon color="success" sx={{ fontSize: 56 }} aria-hidden />
            <Box>
              <Typography variant="h4" fontWeight={800} letterSpacing="-0.03em">
                Conta criada com sucesso
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Sua empresa e o acesso de administrador foram provisionados. A assinatura inicia em período trial.
              </Typography>
            </Box>
            <Alert severity="success" role="status" sx={{ width: "100%", textAlign: "left" }}>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>
                  <strong>Empresa:</strong> {createdAccount.companyName} ({createdAccount.document})
                </li>
                <li>
                  <strong>Administrador:</strong> {createdAccount.adminName} · {createdAccount.email}
                </li>
                <li>
                  <strong>Plano:</strong> {plan.label} · {billingIntervalLabel(createdAccount.billingInterval)}
                </li>
              </Box>
            </Alert>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} width="100%">
              <Button component={NextLink} href="/login" variant="contained" fullWidth>
                Entrar na plataforma
              </Button>
              <Button component={NextLink} href="/" variant="outlined" fullWidth>
                Voltar para a home
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ width: "100%", maxWidth: 640 }} elevation={0} variant="outlined">
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3} component="form" noValidate onSubmit={onFormSubmit} aria-labelledby="signup-title">
          <Box textAlign="center">
            <Typography
              component={NextLink}
              href="/"
              variant="h4"
              id="signup-title"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.03em",
                textDecoration: "none",
                color: "primary.main",
                display: "inline-block",
              }}
            >
              Cypher Ops
            </Typography>
            <Typography component="p" variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Cadastro em etapas — confira tudo antes de finalizar
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} alternativeLabel aria-label="Progresso do cadastro">
            {signupSteps.map((step) => (
              <Step key={step.id}>
                <StepLabel>{step.label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 ? (
            <Box component="fieldset" sx={{ border: "none", m: 0, p: 0 }}>
              <Typography component="legend" variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Dados da empresa
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Nome comercial"
                  autoComplete="organization"
                  error={Boolean(errors.companyName)}
                  helperText={errors.companyName?.message}
                  fullWidth
                  disabled={submitting}
                  {...register("companyName")}
                />
                <TextField
                  label="Razão social"
                  error={Boolean(errors.legalName)}
                  helperText={errors.legalName?.message}
                  fullWidth
                  disabled={submitting}
                  {...register("legalName")}
                />
                <Controller
                  name="document"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="CNPJ"
                      inputMode="numeric"
                      autoComplete="off"
                      error={Boolean(errors.document)}
                      helperText={errors.document?.message ?? "Será validado com dígitos verificadores"}
                      fullWidth
                      disabled={submitting}
                      value={field.value}
                      onChange={(event) => field.onChange(formatCnpj(event.target.value))}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </Stack>
            </Box>
          ) : null}

          {activeStep === 1 ? (
            <Box component="fieldset" sx={{ border: "none", m: 0, p: 0 }}>
              <Typography component="legend" variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Administrador inicial
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Nome completo"
                  autoComplete="name"
                  error={Boolean(errors.adminName)}
                  helperText={errors.adminName?.message ?? "Nome e sobrenome"}
                  fullWidth
                  disabled={submitting}
                  {...register("adminName")}
                />
                <TextField
                  label="E-mail corporativo"
                  type="email"
                  autoComplete="email"
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  fullWidth
                  disabled={submitting}
                  {...register("email")}
                />
                <TextField
                  label="Senha"
                  type="password"
                  autoComplete="new-password"
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message ?? "Mín. 8 caracteres, com maiúscula, minúscula e número"}
                  fullWidth
                  disabled={submitting}
                  {...register("password")}
                />
                <TextField
                  label="Confirmar senha"
                  type="password"
                  autoComplete="new-password"
                  error={Boolean(errors.confirmPassword)}
                  helperText={errors.confirmPassword?.message}
                  fullWidth
                  disabled={submitting}
                  {...register("confirmPassword")}
                />
              </Stack>
            </Box>
          ) : null}

          {activeStep === 2 ? (
            <Box component="fieldset" sx={{ border: "none", m: 0, p: 0 }}>
              <Typography component="legend" variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Plano e assinatura
              </Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Plano"
                  fullWidth
                  disabled={submitting}
                  error={Boolean(errors.planCode)}
                  helperText={errors.planCode?.message}
                  value={values.planCode}
                  onChange={(event) =>
                    setValue("planCode", event.target.value as SignupFormValues["planCode"], {
                      shouldValidate: true,
                    })
                  }
                >
                  {signupPlanOptions.map((option) => (
                    <MenuItem key={option.code} value={option.code}>
                      {option.label} — {option.price}/mês
                    </MenuItem>
                  ))}
                </TextField>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={`${selectedPlanMeta.price}/mês`} color="primary" variant="outlined" />
                  <Chip size="small" label={selectedPlanMeta.note} variant="outlined" />
                </Stack>

                <Controller
                  name="billingInterval"
                  control={control}
                  render={({ field }) => (
                    <FormControl error={Boolean(errors.billingInterval)} disabled={submitting}>
                      <FormLabel id="billing-interval-label">Periodicidade</FormLabel>
                      <RadioGroup
                        row
                        aria-labelledby="billing-interval-label"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        <FormControlLabel value="MONTHLY" control={<Radio />} label="Mensal" />
                        <FormControlLabel value="YEARLY" control={<Radio />} label="Anual" />
                      </RadioGroup>
                      {errors.billingInterval ? (
                        <FormHelperText>{errors.billingInterval.message}</FormHelperText>
                      ) : null}
                    </FormControl>
                  )}
                />
              </Stack>
            </Box>
          ) : null}

          {activeStep === 3 ? (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Revisão final
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Confira as informações abaixo. Nada foi criado ainda — a conta só será provisionada depois que você
                confirmar.
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                A senha permanece oculta nesta etapa. Use <strong>Voltar</strong> se precisar corrigir algum dado.
              </Alert>

              {submitError ? <SignupErrorAlert error={submitError} /> : null}

              <Typography variant="overline" color="text.secondary">
                Empresa
              </Typography>
              <ReviewRow label="Nome comercial" value={values.companyName} />
              <ReviewRow label="Razão social" value={values.legalName} />
              <ReviewRow label="CNPJ" value={values.document} />
              <Divider sx={{ my: 1.5 }} />

              <Typography variant="overline" color="text.secondary">
                Administrador
              </Typography>
              <ReviewRow label="Nome" value={values.adminName} />
              <ReviewRow label="E-mail" value={values.email} />
              <ReviewRow label="Senha" value="••••••••" />
              <Divider sx={{ my: 1.5 }} />

              <Typography variant="overline" color="text.secondary">
                Contratação
              </Typography>
              <ReviewRow label="Plano" value={`${selectedPlanMeta.label} — ${selectedPlanMeta.price}/mês`} />
              <ReviewRow label="Periodicidade" value={billingIntervalLabel(values.billingInterval)} />
              <ReviewRow label="Após confirmar" value="Assinatura inicia em trial" />
            </Box>
          ) : null}

          <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.5} justifyContent="space-between">
            <Button
              type="button"
              variant="outlined"
              onClick={goBack}
              disabled={activeStep === 0 || submitting}
              sx={{ minWidth: { sm: 120 } }}
            >
              Voltar
            </Button>

            {activeStep < signupSteps.length - 1 ? (
              <Button
                type="button"
                variant="contained"
                onClick={goNext}
                disabled={submitting}
                sx={{ minWidth: { sm: 160 } }}
              >
                Continuar
              </Button>
            ) : (
              <Button
                type="button"
                variant="contained"
                disabled={submitting}
                onClick={() => void handleSubmit(onConfirmSignup)()}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
                sx={{ minWidth: { sm: 220 } }}
              >
                {submitting ? "Finalizando…" : "Confirmar e finalizar"}
              </Button>
            )}
          </Stack>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Já tem conta?{" "}
            <MuiLink component={NextLink} href="/login" underline="hover">
              Entrar
            </MuiLink>
            {" · "}
            <MuiLink component={NextLink} href="/" underline="hover">
              Voltar para a home
            </MuiLink>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
