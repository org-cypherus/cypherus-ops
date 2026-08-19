"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import { useQuery } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { queryKeys } from "@/lib/query/keys";
import { fetchUsers } from "@/modules/admin/services";
import { formatCurrency } from "@/lib/utils/format";
import { useSession } from "@/modules/auth/hooks";
import { Role } from "@/lib/auth/permissions";
import { useCreateLead } from "../hooks";
import { leadFormSchema, type LeadFormValues } from "../schemas";
import { PIPELINE_STAGES } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
};

const steps = ["Dados pessoais", "Comercial", "Processo", "Revisão"];

export function CreateLeadDialog({ open, onClose }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const createLead = useCreateLead();
  const { enqueueSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const isComercial = session?.role === Role.Comercial;
  const users = useQuery({
    queryKey: queryKeys.users,
    queryFn: fetchUsers,
    enabled: !isComercial,
  });

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    getValues,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      priority: "media",
      status: "Novo Lead",
      totalValue: 0,
      origin: "Manual",
      channel: "Sistema",
    },
  });

  const values = watch();

  useEffect(() => {
    if (!open) {
      setActiveStep(0);
    }
  }, [open]);

  async function nextStep() {
    if (activeStep === 0) {
      const ok = await trigger(["name", "email", "phone"]);
      if (!ok) return;
    }
    if (activeStep === 1) {
      const ok = await trigger(["priority", "status", "origin"]);
      if (!ok) return;
    }
    if (activeStep === 2) {
      const ok = await trigger(["totalValue"]);
      if (!ok) return;
    }
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function submit(formValues: LeadFormValues) {
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
        tags: formValues.tags ? formValues.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        observations: formValues.observations,
        process: { totalValue: formValues.totalValue },
      },
      {
        onSuccess: () => {
          enqueueSnackbar("Lead criado", { variant: "success" });
          reset();
          setActiveStep(0);
          onClose();
        },
      },
    );
  }

  const ownerName = isComercial
    ? "Regra de distribuição do admin"
    : users.data?.find((u) => u.id === values.ownerId)?.name || "Regra de distribuição do admin";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Novo Lead</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ my: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Stack spacing={2} component="form" id="create-lead-form" onSubmit={handleSubmit(submit)}>
          {activeStep === 0 ? (
            <>
              <TextField label="Nome" error={Boolean(errors.name)} helperText={errors.name?.message} {...register("name")} fullWidth />
              <TextField label="E-mail" error={Boolean(errors.email)} helperText={errors.email?.message} {...register("email")} fullWidth />
              <TextField label="Telefone" error={Boolean(errors.phone)} helperText={errors.phone?.message} {...register("phone")} fullWidth />
              <TextField label="WhatsApp" {...register("whatsapp")} fullWidth />
              <TextField label="CPF" {...register("cpf")} fullWidth />
            </>
          ) : null}

          {activeStep === 1 ? (
            <>
              <TextField label="Origem" {...register("origin")} fullWidth />
              <TextField label="Campanha" {...register("campaign")} fullWidth />
              <TextField label="Canal" {...register("channel")} fullWidth />
              {!isComercial ? (
                <TextField select label="Responsável" defaultValue="" {...register("ownerId")} fullWidth>
                  <MenuItem value="">Usar regra de distribuição</MenuItem>
                  {(users.data || []).map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  O responsável será definido pela regra de distribuição configurada pelo administrador
                  (não fica automaticamente com quem cadastrou).
                </Typography>
              )}
              <TextField select label="Prioridade" defaultValue="media" {...register("priority")} fullWidth>
                <MenuItem value="baixa">baixa</MenuItem>
                <MenuItem value="media">media</MenuItem>
                <MenuItem value="alta">alta</MenuItem>
              </TextField>
              <TextField select label="Status" defaultValue="Novo Lead" {...register("status")} fullWidth>
                {PIPELINE_STAGES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Tags (vírgula)" {...register("tags")} fullWidth />
            </>
          ) : null}

          {activeStep === 2 ? (
            <>
              <TextField label="Valor potencial" type="number" {...register("totalValue")} fullWidth />
              <TextField label="Observações" multiline minRows={3} {...register("observations")} fullWidth />
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
                <Typography variant="body2"><strong>Nome:</strong> {getValues("name")}</Typography>
                <Typography variant="body2"><strong>E-mail:</strong> {getValues("email")}</Typography>
                <Typography variant="body2"><strong>Telefone:</strong> {getValues("phone")}</Typography>
                <Typography variant="body2"><strong>CPF:</strong> {getValues("cpf") || "—"}</Typography>
                <Typography variant="body2"><strong>Origem:</strong> {getValues("origin") || "—"}</Typography>
                <Typography variant="body2"><strong>Campanha:</strong> {getValues("campaign") || "—"}</Typography>
                <Typography variant="body2"><strong>Responsável:</strong> {ownerName}</Typography>
                <Typography variant="body2"><strong>Prioridade:</strong> {getValues("priority")}</Typography>
                <Typography variant="body2"><strong>Status:</strong> {getValues("status")}</Typography>
                <Typography variant="body2">
                  <strong>Valor:</strong> {formatCurrency(Number(getValues("totalValue") || 0))}
                </Typography>
                <Typography variant="body2"><strong>Tags:</strong> {getValues("tags") || "—"}</Typography>
                <Typography variant="body2"><strong>Observações:</strong> {getValues("observations") || "—"}</Typography>
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Box flex={1} />
        {activeStep > 0 ? (
          <Button onClick={() => setActiveStep((s) => s - 1)}>Voltar</Button>
        ) : null}
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={() => void nextStep()}>
            Continuar
          </Button>
        ) : (
          <Button type="submit" form="create-lead-form" variant="contained" disabled={createLead.isPending}>
            Confirmar e criar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
