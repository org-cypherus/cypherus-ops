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
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  downloadContractVersion,
  downloadSignedContract,
  fetchContract,
  fetchContractVersionBlob,
  fetchSignedContractBlob,
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
  const [versionPreviewOpen, setVersionPreviewOpen] = useState(false);
  const [signedPreviewOpen, setSignedPreviewOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.contracts.detail(id),
    queryFn: () => fetchContract(id),
    enabled: Boolean(id),
  });

  const currentVersion = data?.currentVersion ?? 0;

  const versionPreviewQuery = useQuery({
    queryKey: queryKeys.contracts.version(id, currentVersion),
    queryFn: () => fetchContractVersionBlob(id, currentVersion),
    enabled: versionPreviewOpen && Boolean(id) && currentVersion >= 1,
    staleTime: 5 * 60_000,
  });
  const versionPreviewUrl = useMemo(() => {
    if (!versionPreviewQuery.data) return null;
    return URL.createObjectURL(versionPreviewQuery.data);
  }, [versionPreviewQuery.data]);

  useEffect(() => {
    return () => {
      if (versionPreviewUrl) URL.revokeObjectURL(versionPreviewUrl);
    };
  }, [versionPreviewUrl]);

  const signedPreviewQuery = useQuery({
    queryKey: queryKeys.contracts.signed(id),
    queryFn: () => fetchSignedContractBlob(id),
    enabled: signedPreviewOpen && Boolean(id),
    staleTime: 5 * 60_000,
  });
  const signedPreviewUrl = useMemo(() => {
    if (!signedPreviewQuery.data) return null;
    return URL.createObjectURL(signedPreviewQuery.data);
  }, [signedPreviewQuery.data]);

  useEffect(() => {
    return () => {
      if (signedPreviewUrl) URL.revokeObjectURL(signedPreviewUrl);
    };
  }, [signedPreviewUrl]);

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
              <Stack spacing={1}>
                <Typography variant="body2">Versão atual: {data.currentVersion}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button size="small" variant="outlined" onClick={() => setVersionPreviewOpen(true)}>
                    Visualizar versão atual
                  </Button>
                  <Button
                    size="small"
                    disabled={downloadPdf.isPending}
                    onClick={() => downloadPdf.mutate()}
                  >
                    Baixar PDF
                  </Button>
                </Stack>
              </Stack>
            ) : null}
            {data.signedAt ? (
              <Typography variant="body2">Assinado em: {formatDate(data.signedAt)}</Typography>
            ) : null}
            {hasSignedPdf ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" onClick={() => setSignedPreviewOpen(true)}>
                  Visualizar PDF
                </Button>
                <Button
                  size="small"
                  disabled={downloadSigned.isPending}
                  onClick={() => downloadSigned.mutate()}
                >
                  Baixar PDF assinado
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={versionPreviewOpen}
        onClose={() => setVersionPreviewOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ pr: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography variant="h6" noWrap>
              Versão {data.currentVersion} — {data.leadName}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                disabled={downloadPdf.isPending}
                onClick={() => downloadPdf.mutate()}
              >
                Baixar
              </Button>
              <Button size="small" onClick={() => setVersionPreviewOpen(false)}>
                Fechar
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 360 }}>
          {versionPreviewQuery.isPending ? (
            <Stack alignItems="center" justifyContent="center" py={8}>
              <CircularProgress />
            </Stack>
          ) : versionPreviewQuery.isError ? (
            <Typography variant="body2" color="error">
              {getApiError(versionPreviewQuery.error).message ||
                "Não foi possível carregar a versão atual."}
            </Typography>
          ) : versionPreviewUrl ? (
            <Box
              component="iframe"
              title={`PDF versão ${data.currentVersion} do contrato ${id}`}
              src={versionPreviewUrl}
              sx={{ width: "100%", height: "75vh", border: 0, bgcolor: "background.paper" }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Preview indisponível.
            </Typography>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={signedPreviewOpen}
        onClose={() => setSignedPreviewOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ pr: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography variant="h6" noWrap>
              PDF assinado — {data.leadName}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                disabled={downloadSigned.isPending}
                onClick={() => downloadSigned.mutate()}
              >
                Baixar
              </Button>
              <Button size="small" onClick={() => setSignedPreviewOpen(false)}>
                Fechar
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 360 }}>
          {signedPreviewQuery.isPending ? (
            <Stack alignItems="center" justifyContent="center" py={8}>
              <CircularProgress />
            </Stack>
          ) : signedPreviewQuery.isError ? (
            <Typography variant="body2" color="error">
              {getApiError(signedPreviewQuery.error).message ||
                "Não foi possível carregar o PDF assinado."}
            </Typography>
          ) : signedPreviewUrl ? (
            <Box
              component="iframe"
              title={`PDF assinado do contrato ${id}`}
              src={signedPreviewUrl}
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
