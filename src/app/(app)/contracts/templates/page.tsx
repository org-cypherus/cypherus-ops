"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2 as Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { ErrorState } from "@/components/feedback/ErrorState";
import { queryKeys } from "@/lib/query/keys";
import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  updateTemplate,
  type ContractTemplate,
} from "@/modules/contracts/services";

const emptyForm = {
  name: "",
  description: "",
  placeholders: "{{nome}}, {{cpf}}, {{valor}}, {{parcelas}}",
  body: "Contrato entre as partes. Cliente: {{nome}}, CPF {{cpf}}. Valor {{valor}} em {{parcelas}} parcelas.",
};

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContractTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.contracts.templates,
    queryFn: fetchTemplates,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description,
        placeholders: form.placeholders.split(",").map((p) => p.trim()).filter(Boolean),
        body: form.body,
      };
      if (editing) return updateTemplate(editing.id, payload);
      return createTemplate(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contracts.templates });
      enqueueSnackbar(editing ? "Modelo atualizado" : "Modelo criado", { variant: "success" });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contracts.templates });
      enqueueSnackbar("Modelo excluído", { variant: "success" });
      setDeleteId(null);
    },
  });

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Modelos de contrato</Typography>
          <Typography variant="body2" color="text.secondary">
            Templates com placeholders para interpolação
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setOpen(true);
          }}
        >
          Novo modelo
        </Button>
      </Stack>

      {isLoading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <Grid container spacing={2}>
          {(data || []).map((tpl) => (
            <Grid key={tpl.id} size={{ xs: 12, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6">{tpl.name}</Typography>
                    <Stack direction="row">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(tpl);
                          setForm({
                            name: tpl.name,
                            description: tpl.description,
                            placeholders: tpl.placeholders.join(", "),
                            body: tpl.body,
                          });
                          setOpen(true);
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteId(tpl.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {tpl.description}
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 2, display: "block" }}>
                    Placeholders: {tpl.placeholders.join(", ")}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 2,
                      p: 1.5,
                      bgcolor: "background.default",
                      borderRadius: 1,
                      fontFamily: "monospace",
                    }}
                  >
                    {tpl.body}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? "Editar modelo" : "Novo modelo"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
            <TextField label="Descrição" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} fullWidth />
            <TextField label="Placeholders (vírgula)" value={form.placeholders} onChange={(e) => setForm((f) => ({ ...f, placeholders: e.target.value }))} fullWidth />
            <TextField label="Corpo" multiline minRows={6} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!form.name || save.isPending} onClick={() => save.mutate()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir modelo"
        description="Remover este modelo de contrato?"
        confirmLabel="Excluir"
        loading={remove.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </Stack>
  );
}
