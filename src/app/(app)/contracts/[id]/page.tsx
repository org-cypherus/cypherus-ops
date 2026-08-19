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
import { queryKeys } from "@/lib/query/keys";
import { downloadDataUrl, fileToDataUrl } from "@/lib/utils/download";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  fetchContract,
  fetchFile,
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

  const send = useMutation({
    mutationFn: () => updateContract(id, { status: "Enviado" }),
    onSuccess: () => {
      enqueueSnackbar("Contrato enviado", { variant: "success" });
      invalidate();
    },
  });

  const archive = useMutation({
    mutationFn: () => updateContract(id, { status: "Arquivado" }),
    onSuccess: () => {
      enqueueSnackbar("Contrato arquivado", { variant: "success" });
      invalidate();
    },
  });

  const genPdf = useMutation({
    mutationFn: () => generateContractPdf(id),
    onSuccess: async (res) => {
      invalidate();
      const file = res.pdfId ? await fetchFile(res.pdfId) : null;
      if (file) {
        downloadDataUrl(file.name, file.dataUrl);
        enqueueSnackbar("PDF gerado e baixado", { variant: "success" });
      }
    },
  });

  const downloadPdf = useMutation({
    mutationFn: async () => {
      if (!data?.pdfId) throw new Error("Sem PDF");
      return fetchFile(data.pdfId);
    },
    onSuccess: (file) => {
      downloadDataUrl(file.name, file.dataUrl);
    },
  });

  const sign = useMutation({
    mutationFn: async (file?: File) => {
      if (file) {
        const signedDataUrl = await fileToDataUrl(file);
        return signContract(id, { signedDataUrl, fileName: file.name });
      }
      return signContract(id);
    },
    onSuccess: () => {
      enqueueSnackbar("Contrato assinado", { variant: "success" });
      invalidate();
    },
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
            <Button variant="contained" disabled={send.isPending} onClick={() => send.mutate()}>
              Enviar
            </Button>
          ) : null}
          {data.status === "Enviado" || data.status === "Rascunho" ? (
            <>
              <Button variant="outlined" onClick={() => fileRef.current?.click()} disabled={sign.isPending}>
                Assinar (upload PDF)
              </Button>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept=".pdf,application/pdf,image/*,.html"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) sign.mutate(file);
                }}
              />
              <Button variant="outlined" disabled={sign.isPending} onClick={() => sign.mutate(undefined)}>
                Assinar (simulado)
              </Button>
            </>
          ) : null}
          {data.status !== "Arquivado" ? (
            <Button variant="outlined" disabled={archive.isPending} onClick={() => archive.mutate()}>
              Arquivar
            </Button>
          ) : null}
          <Button variant="outlined" disabled={genPdf.isPending} onClick={() => genPdf.mutate()}>
            Gerar PDF
          </Button>
          {data.pdfId ? (
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
            {data.signedAt ? (
              <Typography variant="body2">Assinado em: {formatDate(data.signedAt)}</Typography>
            ) : null}
            {data.signedPdfId ? (
              <Button
                size="small"
                onClick={async () => {
                  const file = await fetchFile(data.signedPdfId!);
                  downloadDataUrl(file.name, file.dataUrl);
                }}
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
