"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { useRef } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  downloadContractVersion,
  downloadSignedContract,
  fetchContract,
  generateContractPdf,
  signContract,
  updateContract,
} from "@/modules/contracts/services";

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.contracts.detail(id),
    queryFn: () => fetchContract(id),
    enabled: Boolean(id),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    void refetch();
  }

  function notifyError(error: unknown, fallback: string) {
    enqueueSnackbar(getApiError(error).message || fallback, { variant: "error" });
  }

  const archive = useMutation({
    mutationFn: () => updateContract(id, { status: "Arquivado" }),
    onSuccess: () => {
      enqueueSnackbar("Contrato arquivado", { variant: "success" });
      invalidate();
    },
    onError: (error) => notifyError(error, "Não foi possível arquivar o contrato"),
  });

  const genPdf = useMutation({
    mutationFn: () => generateContractPdf(id),
    onSuccess: async (res) => {
      invalidate();
      try {
        if (res.currentVersion >= 1) {
          await downloadContractVersion(res.id, res.currentVersion);
        }
        enqueueSnackbar("PDF gerado e baixado", { variant: "success" });
      } catch (downloadError) {
        enqueueSnackbar(
          getApiError(downloadError).message || "PDF gerado, mas o download falhou",
          { variant: "warning" },
        );
      }
    },
    onError: (error) => notifyError(error, "Não foi possível gerar o PDF"),
  });

  const downloadPdf = useMutation({
    mutationFn: async () => {
      if (!data || data.currentVersion < 1) throw new Error("Este contrato ainda não tem PDF gerado.");
      return downloadContractVersion(id, data.currentVersion);
    },
    onError: (error) => notifyError(error, "Não foi possível baixar o PDF"),
  });

  const downloadSigned = useMutation({
    mutationFn: () => downloadSignedContract(id),
    onError: (error) => notifyError(error, "Não foi possível baixar o PDF assinado"),
  });

  const sign = useMutation({
    mutationFn: (file: File) => signContract(id, file),
    onSuccess: () => {
      enqueueSnackbar("Contrato assinado", { variant: "success" });
      invalidate();
    },
    onError: (error) => notifyError(error, "Não foi possível assinar o contrato"),
  });

  if (!id) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <Box py={8} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Stack spacing={2}>
        <Button component={Link} href="/contracts" sx={{ alignSelf: "flex-start" }}>
          ← Voltar aos contratos
        </Button>
        <ErrorState onRetry={() => refetch()} />
        {error ? (
          <Typography variant="caption" color="text.secondary" textAlign="center">
            {(error as Error).message || "Falha ao carregar o contrato"}
          </Typography>
        ) : null}
      </Stack>
    );
  }

  const canGenerate = data.status === "Rascunho" || data.status === "Enviado";
  const canSign = data.status === "Enviado";
  const hasGeneratedPdf = data.currentVersion >= 1;
  const hasSignedPdf = data.status === "Assinado" || data.status === "Arquivado" || Boolean(data.signedPdfId);

  return (
    <Stack spacing={2.5}>
      <Button component={Link} href="/contracts" sx={{ alignSelf: "flex-start" }}>
        ← Voltar
      </Button>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Contrato — {data.leadName}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            <StatusBadge label={data.status} />
            <Typography variant="body2" color="text.secondary">
              {data.templateName} · {formatCurrency(data.value)}
            </Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {data.status === "Rascunho" ? (
            <Button variant="contained" disabled={genPdf.isPending} onClick={() => genPdf.mutate()}>
              Gerar e enviar
            </Button>
          ) : null}
          {canSign ? (
            <>
              <Button variant="outlined" onClick={() => fileRef.current?.click()} disabled={sign.isPending}>
                Assinar (upload PDF)
              </Button>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) sign.mutate(file);
                  e.target.value = "";
                }}
              />
            </>
          ) : null}
          {data.status === "Assinado" ? (
            <Button variant="outlined" disabled={archive.isPending} onClick={() => archive.mutate()}>
              Arquivar
            </Button>
          ) : null}
          {canGenerate && data.status !== "Rascunho" ? (
            <Button variant="outlined" disabled={genPdf.isPending} onClick={() => genPdf.mutate()}>
              Gerar nova versão
            </Button>
          ) : null}
          {hasGeneratedPdf ? (
            <Button variant="contained" disabled={downloadPdf.isPending} onClick={() => downloadPdf.mutate()}>
              Baixar PDF
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Lead:{" "}
              <Link href={`/leads/${data.leadId}`}>{data.leadName}</Link>
            </Typography>
            <Typography variant="body2">Modelo: {data.templateName}</Typography>
            <Typography variant="body2">Valor: {formatCurrency(data.value)}</Typography>
            <Typography variant="body2">Criado em: {formatDate(data.createdAt)}</Typography>
            {data.currentVersion >= 1 ? (
              <Typography variant="body2">Versão atual: {data.currentVersion}</Typography>
            ) : null}
            {data.signedAt ? (
              <Typography variant="body2">Assinado em: {formatDate(data.signedAt)}</Typography>
            ) : null}
            {hasSignedPdf ? (
              <Button
                size="small"
                disabled={downloadSigned.isPending}
                onClick={() => downloadSigned.mutate()}
              >
                Baixar PDF assinado
              </Button>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
