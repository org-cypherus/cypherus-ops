"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { getApiError } from "@/lib/api/client";
import { fieldFromError, type ParsedApiError } from "@/lib/api/errors";
import { CurrencyField } from "@/components/inputs/CurrencyField";
import { formatCurrency } from "@/lib/utils/format";
import { useSession } from "@/modules/auth/hooks";
import { Role } from "@/lib/auth/permissions";
import { CustomFieldRenderer } from "@/modules/custom-fields/components/CustomFieldRenderer";
import { formatCustomFieldValue } from "@/modules/custom-fields/display";
import { useCustomFields } from "@/modules/custom-fields/hooks";
import { defaultProcessValues } from "@/modules/custom-fields/schema-builder";
import { useUserDirectory } from "@/modules/users/hooks";
import { useCreateLead } from "../hooks";
import { buildLeadFormSchema, type LeadFormValues } from "../schemas";
import { PIPELINE_STAGES } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
};

const steps = ["Dados pessoais", "Comercial", "Processo", "Revisão"];

const API_FIELD_TO_FORM: Record<string, keyof LeadFormValues> = {
  name: "name",
  email: "email",
  phone: "phone",
  whatsapp: "whatsapp",
  cpf: "cpf",
  origin: "origin",
  source: "origin",
  campaign: "campaign",
  channel: "channel",
  owner_user_id: "ownerId",
  ownerId: "ownerId",
  priority: "priority",
  status: "status",
  tags: "tags",
  observations: "observations",
  total_value: "totalValue",
  totalValue: "totalValue",
};

const FIELD_STEP: Record<keyof Omit<LeadFormValues, "process">, number> = {
  name: 0,
  email: 0,
  phone: 0,
  whatsapp: 0,
  cpf: 0,
  origin: 1,
  campaign: 1,
  channel: 1,
  ownerId: 1,
  priority: 1,
  status: 1,
  tags: 1,
  totalValue: 2,
  observations: 2,
};

function formFieldFromApi(apiField: string | undefined): keyof LeadFormValues | undefined {
  if (!apiField) return undefined;
  if (apiField.startsWith("process.")) return "process";
  return API_FIELD_TO_FORM[apiField];
}

function stepForField(field: keyof LeadFormValues): number {
  if (field === "process") return 2;
  return FIELD_STEP[field] ?? 0;
}

function firstInvalidStep(formErrors: FieldErrors<LeadFormValues>): number {
  if (formErrors.process) return 2;
  const field = (Object.keys(FIELD_STEP) as Array<keyof Omit<LeadFormValues, "process">>).find(
    (key) => formErrors[key],
  );
  return field ? stepForField(field) : 0;
}

export function CreateLeadDialog({ open, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [submitError, setSubmitError] = useState<ParsedApiError | null>(null);
  const createLead = useCreateLead();
  const { enqueueSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const isComercial = session?.role === Role.Comercial;
  const users = useUserDirectory(open && !isComercial);
  const submitting = createLead.isPending;
  const fieldsQuery = useCustomFields(false, open);
  const fieldDefs = useMemo(
    () => fieldsQuery.data ?? [],
    [fieldsQuery.data],
  );
  const schema = useMemo(() => buildLeadFormSchema(fieldDefs), [fieldDefs]);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    getValues,
    setError,
    control,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(schema) as Resolver<LeadFormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      cpf: "",
      priority: "media",
      status: "Novo Lead",
      totalValue: 0,
      origin: "Manual",
      channel: "Sistema",
      process: {},
    },
  });

  const values = watch();

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setSubmitError(null);
      return;
    }
    reset((current) => ({
      ...current,
      process: { ...defaultProcessValues(fieldDefs), ...(current.process ?? {}) },
    }));
  }, [open, fieldDefs, reset]);

  function closeDialog() {
    if (submitting) return;
    setSubmitError(null);
    onClose();
  }

  async function nextStep() {
    if (submitting) return;
    setSubmitError(null);
    if (activeStep === 0) {
      const ok = await trigger(["name", "email", "phone", "cpf"]);
      if (!ok) return;
    }
    if (activeStep === 1) {
      const ok = await trigger(["priority", "status", "origin"]);
      if (!ok) return;
    }
    if (activeStep === 2) {
      const processKeys = fieldDefs.map((def) => `process.${def.key}` as const);
      const ok = await trigger(["totalValue", ...processKeys] as never);
      if (!ok) return;
    }
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function applyApiError(error: unknown) {
    const parsed = getApiError(error);
    setSubmitError(parsed);
    const formField = formFieldFromApi(fieldFromError(parsed));
    if (formField) {
      setError(formField, { type: "server", message: parsed.message });
      setActiveStep(stepForField(formField));
    }
  }

  function submit(formValues: LeadFormValues) {
    if (submitting) return;
    setSubmitError(null);
    createLead.mutate(
      {
        name: formValues.name,
        email: formValues.email,
        phone: formValues.phone,
        whatsapp: formValues.whatsapp || formValues.phone,
        cpf: formValues.cpf,
        origin: formValues.origin,
        campaign: formValues.campaign,
        channel: formValues.channel,
        ownerId: isComercial ? session?.id : formValues.ownerId,
        priority: formValues.priority,
        status: formValues.status,
        tags: formValues.tags
          ? formValues.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        observations: formValues.observations,
        process: {
          totalValue: formValues.totalValue,
          ...formValues.process,
        },
      },
      {
        onSuccess: () => {
          enqueueSnackbar("Lead criado", { variant: "success" });
          reset();
          setActiveStep(0);
          setSubmitError(null);
          onClose();
        },
        onError: applyApiError,
      },
    );
  }

  function onInvalid(formErrors: FieldErrors<LeadFormValues>) {
    setActiveStep(firstInvalidStep(formErrors));
  }

  const ownerName = isComercial
    ? "Regra de distribuição do admin"
    : users.data?.find((u) => u.id === values.ownerId)?.name ||
      "Regra de distribuição do admin";

  return (
    <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
      <DialogTitle>Novo Lead</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ my: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {submitError ? (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {submitError.message || "Não foi possível criar o lead."}
          </Alert>
        ) : null}

        <Stack
          spacing={2}
          component="form"
          id="create-lead-form"
          onSubmit={handleSubmit(submit, onInvalid)}
        >
          {activeStep === 0 ? (
            <>
              <TextField
                label="Nome"
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
                {...register("name")}
                fullWidth
              />
              <TextField
                label="E-mail"
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                {...register("email")}
                fullWidth
              />
              <TextField
                label="Telefone"
                error={Boolean(errors.phone)}
                helperText={errors.phone?.message}
                {...register("phone")}
                fullWidth
              />
              <TextField label="WhatsApp" {...register("whatsapp")} fullWidth />
              <TextField
                label="CPF"
                error={Boolean(errors.cpf)}
                helperText={errors.cpf?.message}
                {...register("cpf")}
                fullWidth
              />
            </>
          ) : null}

          {activeStep === 1 ? (
            <>
              <TextField label="Origem" {...register("origin")} fullWidth />
              <TextField label="Campanha" {...register("campaign")} fullWidth />
              <TextField label="Canal" {...register("channel")} fullWidth />
              {!isComercial ? (
                <TextField
                  select
                  label="Responsável"
                  defaultValue=""
                  disabled={users.isLoading}
                  helperText={users.isLoading ? "Carregando…" : undefined}
                  {...register("ownerId")}
                  fullWidth
                >
                  <MenuItem value="">Usar regra de distribuição</MenuItem>
                  {(users.data || []).map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  O responsável será definido pela regra de distribuição
                  configurada pelo administrador (não fica automaticamente com
                  quem cadastrou).
                </Typography>
              )}
              <TextField
                select
                label="Prioridade"
                defaultValue="media"
                {...register("priority")}
                fullWidth
              >
                <MenuItem value="baixa">baixa</MenuItem>
                <MenuItem value="media">media</MenuItem>
                <MenuItem value="alta">alta</MenuItem>
              </TextField>
              <TextField
                select
                label="Status"
                defaultValue="Novo Lead"
                {...register("status")}
                fullWidth
              >
                {PIPELINE_STAGES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Tags (vírgula)"
                {...register("tags")}
                fullWidth
              />
            </>
          ) : null}

          {activeStep === 2 ? (
            <>
              <Controller
                name="totalValue"
                control={control}
                render={({ field }) => (
                  <CurrencyField
                    label="Valor potencial"
                    value={Number(field.value || 0)}
                    onChange={field.onChange}
                    error={Boolean(errors.totalValue)}
                    helperText={errors.totalValue?.message}
                    fullWidth
                  />
                )}
              />
              {fieldDefs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum campo extra. O lead usa só os dados padrão.
                </Typography>
              ) : (
                fieldDefs.map((def) => (
                  <Controller
                    key={def.id}
                    name={`process.${def.key}` as const}
                    control={control}
                    render={({ field }) => (
                      <CustomFieldRenderer
                        definition={def}
                        value={field.value}
                        onChange={field.onChange}
                        error={
                          (errors.process as Record<string, { message?: string }> | undefined)?.[def.key]
                            ?.message
                        }
                      />
                    )}
                  />
                ))
              )}
              <TextField
                label="Observações"
                multiline
                minRows={3}
                {...register("observations")}
                fullWidth
              />
            </>
          ) : null}

          {activeStep === 3 ? (
            <Box
              border={1}
              borderColor="divider"
              borderRadius={2}
              p={2}
              bgcolor="background.default"
            >
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Confira os dados antes de criar
              </Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2">
                  <strong>Nome:</strong> {getValues("name")}
                </Typography>
                <Typography variant="body2">
                  <strong>E-mail:</strong> {getValues("email")}
                </Typography>
                <Typography variant="body2">
                  <strong>Telefone:</strong> {getValues("phone")}
                </Typography>
                <Typography variant="body2">
                  <strong>CPF:</strong> {getValues("cpf") || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Origem:</strong> {getValues("origin") || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Campanha:</strong> {getValues("campaign") || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Responsável:</strong> {ownerName}
                </Typography>
                <Typography variant="body2">
                  <strong>Prioridade:</strong> {getValues("priority")}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> {getValues("status")}
                </Typography>
                <Typography variant="body2">
                  <strong>Valor:</strong>{" "}
                  {formatCurrency(Number(getValues("totalValue") || 0))}
                </Typography>
                {fieldDefs.map((def) => (
                  <Typography variant="body2" key={def.id}>
                    <strong>{def.label}:</strong>{" "}
                    {formatCustomFieldValue(def, getValues("process")?.[def.key])}
                  </Typography>
                ))}
                <Typography variant="body2">
                  <strong>Tags:</strong> {getValues("tags") || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Observações:</strong>{" "}
                  {getValues("observations") || "—"}
                </Typography>
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeDialog} disabled={submitting}>
          Cancelar
        </Button>
        <Box flex={1} />
        {activeStep > 0 ? (
          <Button
            onClick={() => {
              if (submitting) return;
              setSubmitError(null);
              setActiveStep((s) => s - 1);
            }}
            disabled={submitting}
          >
            Voltar
          </Button>
        ) : null}
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={() => void nextStep()} disabled={submitting}>
            Continuar
          </Button>
        ) : (
          <Button
            type="submit"
            form="create-lead-form"
            variant="contained"
            loading={submitting}
            disabled={submitting}
          >
            Confirmar e criar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
