"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency } from "@/lib/utils/format";
import { fetchLeads } from "@/modules/leads/services";
import {
  createContract,
  downloadContractVersion,
  fetchContractVersionBlob,
  fetchTemplates,
  generateContractPdf,
  signContractWithGeneratedVersion,
} from "@/modules/contracts/services";

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
  const [generatedVersion, setGeneratedVersion] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
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

  const previewEnabled = previewOpen && Boolean(contractId) && generatedVersion >= 1;
  const previewQuery = useQuery({
    queryKey: queryKeys.contracts.version(contractId ?? "none", generatedVersion),
    queryFn: () => fetchContractVersionBlob(contractId!, generatedVersion),
    enabled: previewEnabled,
    staleTime: 5 * 60_000,
  });
  const previewUrl = useMemo(() => {
    if (!previewQuery.data) return null;
    return URL.createObjectURL(previewQuery.data);
  }, [previewQuery.data]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const create = useMutation({
    mutationFn: async () => {
      const contract = await createContract({ leadId, templateId, value });
      return generateContractPdf(contract.id);
    },
    onSuccess: (contract) => {
      setContractId(contract.id);
      setGeneratedVersion(contract.currentVersion);
      void queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      setActiveStep(3);
    },
    onError: (error) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível gerar o PDF", { variant: "error" });
    },
  });

  const downloadPdf = useMutation({
    mutationFn: async () => {
      if (!contractId || generatedVersion < 1) throw new Error("PDF ainda não gerado.");
      return downloadContractVersion(contractId, generatedVersion);
    },
    onError: (error) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível baixar o PDF", { variant: "error" });
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!contractId) throw new Error("Contrato não gerado");
      if (generatedVersion < 1) throw new Error("PDF ainda não gerado.");
      return signContractWithGeneratedVersion(contractId, generatedVersion);
    },
    onSuccess: () => {
      enqueueSnackbar("Contrato assinado com sucesso", { variant: "success" });
      router.push("/contracts");
    },
    onError: (error) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível assinar o contrato", {
        variant: "error",
      });
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
                PDF gerado para o contrato <strong>{contractId}</strong>
                {generatedVersion >= 1 ? ` (versão ${generatedVersion})` : ""}.
              </Typography>
              <Box
                border={1}
                borderColor="divider"
                borderRadius={2}
                p={3}
                bgcolor="background.default"
              >
                <Typography variant="subtitle2">Documento no CRM</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  O PDF foi gerado e versionado no saas-crm. Visualize no navegador ou baixe para
                  revisar e assinar fora da plataforma.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button onClick={() => setActiveStep(2)}>Voltar</Button>
                <Button
                  variant="outlined"
                  disabled={generatedVersion < 1}
                  onClick={() => setPreviewOpen(true)}
                >
                  Visualizar PDF
                </Button>
                <Button
                  variant="outlined"
                  disabled={downloadPdf.isPending || generatedVersion < 1}
                  onClick={() => downloadPdf.mutate()}
                >
                  Baixar PDF
                </Button>
                <Button variant="contained" onClick={() => setActiveStep(4)}>
                  Enviar assinatura
                </Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 4 && (
            <Stack spacing={2}>
              <Typography>
                Confirme a assinatura com o PDF gerado na etapa anterior
                {generatedVersion >= 1 ? ` (versão ${generatedVersion})` : ""}.
              </Typography>
              <Box
                border={1}
                borderColor="divider"
                borderRadius={2}
                p={3}
                bgcolor="background.default"
              >
                <Typography variant="subtitle2">Documento a assinar</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  O mesmo arquivo gerado no CRM será enviado como assinatura — sem precisar fazer
                  upload de outro PDF.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={generatedVersion < 1}
                    onClick={() => setPreviewOpen(true)}
                  >
                    Visualizar PDF
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={downloadPdf.isPending || generatedVersion < 1}
                    onClick={() => downloadPdf.mutate()}
                  >
                    Baixar PDF
                  </Button>
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button onClick={() => setActiveStep(3)}>Voltar</Button>
                <Button
                  variant="contained"
                  disabled={send.isPending || !contractId || generatedVersion < 1}
                  onClick={() => send.mutate()}
                >
                  {send.isPending ? "Assinando…" : "Confirmar assinatura"}
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ pr: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography variant="h6" noWrap>
              Contrato {contractId}
              {generatedVersion >= 1 ? ` · v${generatedVersion}` : ""}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                disabled={downloadPdf.isPending || generatedVersion < 1}
                onClick={() => downloadPdf.mutate()}
              >
                Baixar
              </Button>
              <Button size="small" onClick={() => setPreviewOpen(false)}>
                Fechar
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 360 }}>
          {previewQuery.isPending ? (
            <Stack alignItems="center" justifyContent="center" py={8}>
              <CircularProgress />
            </Stack>
          ) : previewQuery.isError ? (
            <Typography variant="body2" color="error">
              {getApiError(previewQuery.error).message || "Não foi possível carregar o PDF."}
            </Typography>
          ) : previewUrl ? (
            <Box
              component="iframe"
              title={`PDF do contrato ${contractId}`}
              src={previewUrl}
              sx={{ width: "100%", height: "75vh", border: 0, bgcolor: "background.paper" }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Preview indisponível.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
