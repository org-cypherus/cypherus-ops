"use client";

import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useSnackbar } from "notistack";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { TableSkeleton } from "@/components/feedback/PageSkeletons";
import { getApiError } from "@/lib/api/client";
import { getFeatureLimit } from "@/lib/billing/access";
import { useSession } from "@/modules/auth/hooks";
import {
  useCreateCustomField,
  useCustomFields,
  useDeleteCustomField,
  useUpdateCustomField,
} from "../hooks";
import {
  customFieldAdminSchema,
  parseOptionsText,
  type CustomFieldAdminValues,
} from "../schema-builder";
import {
  CUSTOM_FIELD_TYPE_LABEL,
  CUSTOM_FIELD_TYPES,
  type CustomFieldDefinition,
  type CustomFieldType,
} from "../types";

const emptyForm: CustomFieldAdminValues = {
  key: "",
  label: "",
  type: "text",
  required: false,
  optionsText: "",
};

export function CustomFieldsAdminPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const fieldsQuery = useCustomFields(false);
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CustomFieldDefinition | null>(null);

  const fields = fieldsQuery.data ?? [];
  const limit = getFeatureLimit(session?.features, "custom_fields");
  const atLimit = limit != null && fields.length >= limit;
  const limitLabel =
    limit === null ? `${fields.length} campos · ilimitado` : `${fields.length} de ${limit} campos do plano`;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<CustomFieldAdminValues>({
    resolver: zodResolver(customFieldAdminSchema),
    defaultValues: emptyForm,
  });

  const selectedType = watch("type");

  function openCreate() {
    setEditing(null);
    reset(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(field: CustomFieldDefinition) {
    setEditing(field);
    reset({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      optionsText: field.options.join("\n"),
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  function submit(values: CustomFieldAdminValues) {
    const options = values.type === "select" ? parseOptionsText(values.optionsText) : undefined;
    if (editing) {
      updateField.mutate(
        {
          fieldId: editing.id,
          input: {
            label: values.label,
            required: values.required,
            options,
          },
        },
        {
          onSuccess: () => {
            enqueueSnackbar("Campo atualizado", { variant: "success" });
            closeDialog();
          },
          onError: (err) => {
            enqueueSnackbar(getApiError(err).message || "Não foi possível atualizar o campo", {
              variant: "error",
            });
          },
        },
      );
      return;
    }
    createField.mutate(
      {
        key: values.key,
        label: values.label,
        type: values.type,
        required: values.required,
        sortOrder: fields.length,
        options,
      },
      {
        onSuccess: () => {
          enqueueSnackbar("Campo criado", { variant: "success" });
          closeDialog();
        },
        onError: (err) => {
          enqueueSnackbar(getApiError(err).message || "Não foi possível criar o campo", { variant: "error" });
        },
      },
    );
  }

  function move(field: CustomFieldDefinition, direction: -1 | 1) {
    const index = fields.findIndex((item) => item.id === field.id);
    const swap = fields[index + direction];
    if (!swap) return;
    const nextOrder = swap.sortOrder;
    updateField.mutate({ fieldId: field.id, input: { sortOrder: nextOrder } });
    updateField.mutate({ fieldId: swap.id, input: { sortOrder: field.sortOrder } });
  }

  const saving = createField.isPending || updateField.isPending;
  const typeOptions = useMemo(() => CUSTOM_FIELD_TYPES, []);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Campos personalizados</Typography>
          <Typography variant="body2" color="text.secondary">
            Schema do tenant sobre o processo do lead. Valores ficam em `process[key]`.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button component={Link} href="/admin" variant="outlined">
            Voltar à administração
          </Button>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={openCreate}
            disabled={atLimit}
          >
            Novo campo
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info">{limitLabel}. Tipos fechados: texto, número, moeda, data, sim/não e lista.</Alert>
      {atLimit ? (
        <Alert severity="warning">Limite do plano atingido. Remova um campo ou faça upgrade para criar outro.</Alert>
      ) : null}

      {fieldsQuery.isLoading ? (
        <TableSkeleton columns={6} rows={4} />
      ) : fieldsQuery.isError ? (
        <ErrorState
          error={fieldsQuery.error}
          resourceLabel="campos personalizados"
          onRetry={() => void fieldsQuery.refetch()}
        />
      ) : fields.length === 0 ? (
        <EmptyState
          icon={<TuneOutlinedIcon fontSize="inherit" />}
          title="Nenhum campo extra"
          description="O lead usa só os dados padrão. Crie campos aqui para aparecerem no cadastro e no detalhe."
          actionLabel="Novo campo"
          onAction={openCreate}
        />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ordem</TableCell>
                <TableCell>Rótulo</TableCell>
                <TableCell>Chave</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Obrigatório</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        aria-label={`Subir ${field.label}`}
                        disabled={index === 0 || updateField.isPending}
                        onClick={() => move(field, -1)}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label={`Descer ${field.label}`}
                        disabled={index === fields.length - 1 || updateField.isPending}
                        onClick={() => move(field, 1)}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell>{field.label}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {field.key}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={CUSTOM_FIELD_TYPE_LABEL[field.type]} />
                  </TableCell>
                  <TableCell>{field.required ? "Sim" : "Não"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton size="small" aria-label={`Editar ${field.label}`} onClick={() => openEdit(field)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        aria-label={`Excluir ${field.label}`}
                        onClick={() => setPendingDelete(field)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Editar campo" : "Novo campo"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1} component="form" id="custom-field-form" onSubmit={handleSubmit(submit)}>
            <TextField
              label="Chave"
              helperText={
                errors.key?.message ||
                (editing ? "A chave não pode ser alterada depois de criada." : "snake_case, imutável após criar")
              }
              error={Boolean(errors.key)}
              disabled={Boolean(editing)}
              {...register("key")}
              fullWidth
            />
            <TextField
              label="Rótulo"
              error={Boolean(errors.label)}
              helperText={errors.label?.message}
              {...register("label")}
              fullWidth
            />
            <TextField
              select
              label="Tipo"
              defaultValue="text"
              disabled={Boolean(editing)}
              helperText={editing ? "O tipo não pode ser alterado." : undefined}
              {...register("type")}
              fullWidth
            >
              {typeOptions.map((type) => (
                <MenuItem key={type} value={type}>
                  {CUSTOM_FIELD_TYPE_LABEL[type as CustomFieldType]}
                </MenuItem>
              ))}
            </TextField>
            <Controller
              name="required"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                  label="Obrigatório no lead"
                />
              )}
            />
            {selectedType === "select" ? (
              <TextField
                label="Opções (uma por linha)"
                multiline
                minRows={4}
                error={Boolean(errors.optionsText)}
                helperText={errors.optionsText?.message || "Mínimo 2 opções"}
                {...register("optionsText")}
                fullWidth
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button type="submit" form="custom-field-form" variant="contained" disabled={saving}>
            {editing ? "Salvar" : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir campo?"
        description="O campo some da lista ativa. Valores já gravados no lead não são apagados."
        confirmLabel="Excluir"
        onClose={() => setPendingDelete(null)}
        loading={deleteField.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteField.mutate(pendingDelete.id, {
            onSuccess: () => {
              enqueueSnackbar("Campo excluído", { variant: "success" });
              setPendingDelete(null);
            },
            onError: (err) => {
              enqueueSnackbar(getApiError(err).message || "Não foi possível excluir", { variant: "error" });
            },
          });
        }}
      />
    </Stack>
  );
}
