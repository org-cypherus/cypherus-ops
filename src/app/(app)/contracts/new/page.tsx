"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency } from "@/lib/utils/format";
import { fetchLeads } from "@/modules/leads/services";
import { createContract, fetchTemplates, signContract, updateContract } from "@/modules/contracts/services";

const steps = [
  "Selecionar Lead",
  "Selecionar Modelo",
  "Preencher dados",
  "Gerar PDF",
  "Enviar assinatura",
];

export default function ContractWizardPage() {
  const searchParams = useSearchParams();
  const [activeStep, setActiveStep] = useState(0);
  const [leadId, setLeadId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [value, setValue] = useState(10000);
  const [contractId, setContractId] = useState<string | null>(null);
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  useEffect(() => {
    const preselected = searchParams.get("leadId");
    if (preselected) {
      setLeadId(preselected);
      setActiveStep(1);
    }
  }, [searchParams]);

  const leads = useQuery({
    queryKey: queryKeys.leads.list({ pageSize: 50 }),
    queryFn: () => fetchLeads({ pageSize: 50 }),
  });
  const templates = useQuery({
    queryKey: queryKeys.contracts.templates,
    queryFn: fetchTemplates,
  });

  const create = useMutation({
    mutationFn: () => createContract({ leadId, templateId, value }),
    onSuccess: (contract) => {
      setContractId(contract.id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      setActiveStep(3);
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!contractId) throw new Error("Contrato não gerado");
      await updateContract(contractId, { status: "Enviado" });
      return signContract(contractId);
    },
    onSuccess: () => {
      enqueueSnackbar("Contrato assinado com sucesso", { variant: "success" });
      router.push("/contracts");
    },
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Wizard de Contratos</Typography>
        <Typography variant="body2" color="text.secondary">
          Fluxo completo até a assinatura
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card variant="outlined">
        <CardContent>
          {activeStep === 0 && (
            <Stack spacing={2}>
              <TextField
                select
                label="Lead"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                fullWidth
              >
                {(leads.data?.data || []).map((lead) => (
                  <MenuItem key={lead.id} value={lead.id}>
                    {lead.name} — {formatCurrency(lead.process.totalValue)}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="contained" disabled={!leadId} onClick={() => setActiveStep(1)}>
                Continuar
              </Button>
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={2}>
              <TextField
                select
                label="Modelo"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                fullWidth
              >
                {(templates.data || []).map((tpl) => (
                  <MenuItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setActiveStep(0)}>Voltar</Button>
                <Button variant="contained" disabled={!templateId} onClick={() => setActiveStep(2)}>
                  Continuar
                </Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={2}>
              <TextField
                type="number"
                label="Valor do contrato"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                fullWidth
              />
              <Typography variant="body2" color="text.secondary">
                Placeholders serão preenchidos com dados do lead selecionado.
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setActiveStep(1)}>Voltar</Button>
                <Button
                  variant="contained"
                  disabled={create.isPending}
                  onClick={() => create.mutate()}
                >
                  Gerar PDF
                </Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 3 && (
            <Stack spacing={2}>
              <Typography>
                PDF gerado para o contrato <strong>{contractId}</strong>.
              </Typography>
              <Box
                border={1}
                borderColor="divider"
                borderRadius={2}
                p={3}
                bgcolor="background.default"
              >
                <Typography variant="subtitle2">Pré-visualização</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1  }}>
                  Documento PDF versionado pronto para envio de assinatura.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setActiveStep(2)}>Voltar</Button>
                <Button variant="contained" onClick={() => setActiveStep(4)}>
                  Enviar assinatura
                </Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 4 && (
            <Stack spacing={2}>
              <Typography>
                Confirme o envio/assinatura do contrato (MVP: confirmação simulada).
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setActiveStep(3)}>Voltar</Button>
                <Button
                  variant="contained"
                  disabled={send.isPending}
                  onClick={() => send.mutate()}
                >
                  Confirmar assinatura
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
