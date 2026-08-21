"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { formatDate, formatFileSize } from "@/lib/utils/format";
import { useAddAttachment, useRemoveAttachment } from "../hooks";
import { downloadLeadAttachment, fetchLeadAttachmentBlob } from "../services";
import type { Attachment, Lead } from "../types";

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/jpeg,image/png,image/webp,image/gif";

function mimeOf(file: Attachment) {
  return (file.type || "").toLowerCase();
}

function isImage(file: Attachment) {
  return mimeOf(file).startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

function isPdf(file: Attachment) {
  return mimeOf(file) === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isText(file: Attachment) {
  return mimeOf(file).startsWith("text/") || /\.txt$/i.test(file.name);
}

function isSpreadsheet(file: Attachment) {
  return /spreadsheet|excel|\.xlsx?$/i.test(`${mimeOf(file)} ${file.name}`);
}

function canInlinePreview(file: Attachment) {
  return isImage(file) || isPdf(file) || isText(file);
}

function FileKindIcon({ file }: { file: Attachment }) {
  if (isPdf(file)) return <PictureAsPdfOutlinedIcon sx={{ fontSize: 48, color: "error.main" }} />;
  if (isSpreadsheet(file)) return <TableChartOutlinedIcon sx={{ fontSize: 48, color: "success.main" }} />;
  if (isText(file)) return <DescriptionOutlinedIcon sx={{ fontSize: 48, color: "text.secondary" }} />;
  return <InsertDriveFileOutlinedIcon sx={{ fontSize: 48, color: "text.secondary" }} />;
}

function useAttachmentObjectUrl(leadId: string, file: Attachment | null, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.leads.attachment(leadId, file?.id ?? "none"),
    queryFn: () => fetchLeadAttachmentBlob(leadId, file!.id),
    enabled: Boolean(file) && enabled,
    staleTime: 5 * 60_000,
  });
  const objectUrl = useMemo(() => {
    if (!query.data) return null;
    return URL.createObjectURL(query.data);
  }, [query.data]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return { ...query, objectUrl };
}

function AttachmentPreviewCard({
  leadId,
  file,
  deleting,
  onOpen,
  onDownload,
  onDelete,
}: {
  leadId: string;
  file: Attachment;
  deleting: boolean;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const previewable = canInlinePreview(file);
  const { objectUrl, isPending, isError } = useAttachmentObjectUrl(leadId, file, previewable);

  return (
    <Box
      border={1}
      borderColor="divider"
      borderRadius={2}
      overflow="hidden"
      bgcolor="background.paper"
      height="100%"
      display="flex"
      flexDirection="column"
    >
      <Box
        sx={{
          position: "relative",
          height: 148,
          bgcolor: "action.hover",
          cursor: previewable && objectUrl ? "zoom-in" : "default",
        }}
        onClick={() => {
          if (previewable && objectUrl) onOpen();
        }}
      >
        {previewable && isPending ? (
          <Stack height="100%" alignItems="center" justifyContent="center">
            <CircularProgress size={28} />
          </Stack>
        ) : isImage(file) && objectUrl ? (
          <Box
            component="img"
            src={objectUrl}
            alt={file.name}
            sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : isPdf(file) && objectUrl ? (
          <Box
            component="iframe"
            title={file.name}
            src={objectUrl}
            sx={{ width: "100%", height: "100%", border: 0, pointerEvents: "none" }}
          />
        ) : (
          <Stack height="100%" alignItems="center" justifyContent="center" spacing={0.5} px={1}>
            <FileKindIcon file={file} />
            {isError && previewable ? (
              <Typography variant="caption" color="error">
                Sem preview
              </Typography>
            ) : null}
          </Stack>
        )}
      </Box>
      <Stack spacing={0.5} p={1.25}>
        <Tooltip title={file.name}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {file.name}
          </Typography>
        </Tooltip>
        <Typography variant="caption" color="text.secondary">
          {formatFileSize(file.size)} · {formatDate(file.createdAt)}
        </Typography>
        <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
          <Tooltip title="Baixar">
            <IconButton size="small" onClick={onDownload} aria-label={`Baixar ${file.name}`}>
              <DownloadOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir anexo">
            <IconButton
              size="small"
              color="error"
              onClick={onDelete}
              disabled={deleting}
              aria-label={`Excluir ${file.name}`}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}

export function LeadAttachments({ lead }: { lead: Lead }) {
  const addAttachment = useAddAttachment(lead.id);
  const removeAttachment = useRemoveAttachment(lead.id);
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Attachment | null>(null);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const previewUrl = useAttachmentObjectUrl(lead.id, preview);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    try {
      for (const file of Array.from(files)) {
        await addAttachment.mutateAsync(file);
      }
      enqueueSnackbar("Anexo(s) enviado(s)", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(getApiError(error).message || "Falha ao enviar anexo", { variant: "error" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDownload(file: Attachment) {
    void downloadLeadAttachment(lead.id, file.id, file.name).catch((error) => {
      enqueueSnackbar(getApiError(error).message || "Falha ao baixar anexo", { variant: "error" });
    });
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Anexos
        </Typography>
        <Box
          border="1px dashed"
          borderColor={dragOver ? "primary.main" : "divider"}
          borderRadius={2}
          p={2}
          textAlign="center"
          mb={2}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Arraste arquivos ou clique para enviar
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            PDF, imagens, Word, Excel ou texto · máx. 20 MB
          </Typography>
          <Button
            size="small"
            sx={{ mt: 1 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={addAttachment.isPending}
          >
            {addAttachment.isPending ? "Enviando…" : "Selecionar"}
          </Button>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            multiple
            accept={ACCEPT}
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </Box>

        {lead.attachments.length ? (
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              overflowX: "auto",
              pb: 1,
              scrollSnapType: "x mandatory",
              "&::-webkit-scrollbar": { height: 8 },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "action.disabled",
                borderRadius: 4,
              },
            }}
          >
            {lead.attachments.map((file) => (
              <Box
                key={file.id}
                sx={{
                  flex: "0 0 calc((100% - 24px) / 3)",
                  minWidth: 168,
                  scrollSnapAlign: "start",
                }}
              >
                <AttachmentPreviewCard
                  leadId={lead.id}
                  file={file}
                  deleting={removeAttachment.isPending && pendingDelete?.id === file.id}
                  onOpen={() => setPreview(file)}
                  onDownload={() => handleDownload(file)}
                  onDelete={() => setPendingDelete(file)}
                />
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Nenhum anexo
          </Typography>
        )}
      </CardContent>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir anexo"
        description={`Remover “${pendingDelete?.name}” deste lead? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={removeAttachment.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          removeAttachment.mutate(pendingDelete.id, {
            onSuccess: () => {
              enqueueSnackbar("Anexo removido", { variant: "info" });
              setPendingDelete(null);
              if (preview?.id === pendingDelete.id) setPreview(null);
            },
            onError: (error) => {
              enqueueSnackbar(getApiError(error).message || "Falha ao excluir anexo", {
                variant: "error",
              });
            },
          });
        }}
      />

      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        fullWidth
        maxWidth={preview && isPdf(preview) ? "lg" : "md"}
      >
        <DialogTitle sx={{ pr: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography variant="h6" noWrap>
              {preview?.name}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {preview ? (
                <Button size="small" onClick={() => handleDownload(preview)}>
                  Baixar
                </Button>
              ) : null}
              <Button size="small" onClick={() => setPreview(null)}>
                Fechar
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 360 }}>
          {previewUrl.isPending ? (
            <Stack alignItems="center" justifyContent="center" py={8}>
              <CircularProgress />
            </Stack>
          ) : preview && isImage(preview) && previewUrl.objectUrl ? (
            <Box
              component="img"
              src={previewUrl.objectUrl}
              alt={preview.name}
              sx={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
          ) : preview && (isPdf(preview) || isText(preview)) && previewUrl.objectUrl ? (
            <Box
              component="iframe"
              title={preview.name}
              src={previewUrl.objectUrl}
              sx={{ width: "100%", height: "70vh", border: 0, bgcolor: "background.paper" }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Preview indisponível para este tipo de arquivo.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
