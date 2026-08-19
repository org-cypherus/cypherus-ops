"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useSnackbar } from "notistack";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Role } from "@/lib/auth/permissions";
import { useCanAccess, useSession } from "@/modules/auth/hooks";
import { useUserDirectory } from "@/modules/users/hooks";
import {
  useCancelCalendarEvent,
  useCompleteCalendarEvent,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from "../hooks";
import { calendarEventFormSchema, type CalendarEventFormValues } from "../schemas";
import {
  CALENDAR_EVENT_TYPES,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type CalendarEvent,
} from "../types";
import {
  computeRemindAt,
  defaultEventWindow,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../utils";

type Props = {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  mode: "create" | "edit";
  defaultStartsAt?: string;
  defaultLeadId?: string | null;
  defaultLeadName?: string | null;
};

export function CalendarEventDrawer({
  open,
  onClose,
  event,
  mode,
  defaultStartsAt,
  defaultLeadId,
  defaultLeadName,
}: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const canEdit = useCanAccess("agenda", "agenda:editar");
  const canCreate = useCanAccess("agenda", "agenda:criar");
  const canDelete = useCanAccess("agenda", "agenda:excluir") || canEdit;
  const isComercial = session?.role === Role.Comercial;

  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent(event?.id || "");
  const completeEvent = useCompleteCalendarEvent();
  const cancelEvent = useCancelCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const users = useUserDirectory(open && !isComercial);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "retorno",
      startsAtLocal: "",
      endsAtLocal: "",
      allDay: false,
      leadId: null,
      assigneeId: "",
      remindMode: "day_login",
      remindMinutes: 30,
    },
  });

  const remindMode = watch("remindMode");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && event) {
      reset({
        title: event.title,
        description: event.description || "",
        type: event.type,
        startsAtLocal: toDatetimeLocalValue(event.startsAt),
        endsAtLocal: toDatetimeLocalValue(event.endsAt),
        allDay: event.allDay,
        leadId: event.leadId,
        assigneeId: event.assigneeId,
        remindMode: "day_login",
        remindMinutes: 30,
      });
      return;
    }
    const window = defaultEventWindow(defaultStartsAt);
    reset({
      title: defaultLeadName ? `Retorno — ${defaultLeadName}` : "Novo evento",
      description: "",
      type: defaultLeadId ? "retorno" : "reuniao",
      startsAtLocal: window.startsAtLocal,
      endsAtLocal: window.endsAtLocal,
      allDay: false,
      leadId: defaultLeadId || null,
      assigneeId: session?.id || "",
      remindMode: "day_login",
      remindMinutes: 30,
    });
  }, [open, mode, event, defaultStartsAt, defaultLeadId, defaultLeadName, session?.id, reset]);

  function submit(values: CalendarEventFormValues) {
    const startsAt = fromDatetimeLocalValue(values.startsAtLocal);
    const endsAt = fromDatetimeLocalValue(values.endsAtLocal);
    const payload = {
      title: values.title,
      description: values.description,
      type: values.type,
      startsAt,
      endsAt,
      allDay: values.allDay,
      leadId: values.leadId || null,
      assigneeId: isComercial ? session!.id : values.assigneeId,
      remindAt: computeRemindAt(startsAt, values.remindMode, values.remindMinutes),
    };

    if (mode === "create") {
      createEvent.mutate(payload, {
        onSuccess: () => {
          enqueueSnackbar("Evento criado", { variant: "success" });
          onClose();
        },
        onError: () => enqueueSnackbar("Falha ao criar evento", { variant: "error" }),
      });
      return;
    }

    updateEvent.mutate(payload, {
      onSuccess: () => {
        enqueueSnackbar("Evento atualizado", { variant: "success" });
        onClose();
      },
      onError: () => enqueueSnackbar("Falha ao atualizar evento", { variant: "error" }),
    });
  }

  const readOnly = mode === "edit" && !canEdit;
  const saving = createEvent.isPending || updateEvent.isPending;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box width={{ xs: 360, sm: 420 }} p={2.5} role="presentation">
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            {mode === "create" ? "Novo evento" : "Detalhe do evento"}
          </Typography>
          <IconButton onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Stack>

        {mode === "edit" && event ? (
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              {EVENT_TYPE_LABELS[event.type]} · {EVENT_STATUS_LABELS[event.status]} ·{" "}
              {event.assigneeName}
            </Typography>
          </Stack>
        ) : null}

        <form onSubmit={handleSubmit(submit)}>
          <Stack spacing={2}>
            <TextField
              label="Título"
              fullWidth
              disabled={readOnly}
              {...register("title")}
              error={Boolean(errors.title)}
              helperText={errors.title?.message}
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Tipo"
                  fullWidth
                  disabled={readOnly}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  error={Boolean(errors.type)}
                  helperText={errors.type?.message}
                >
                  {CALENDAR_EVENT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label="Início"
              type="datetime-local"
              fullWidth
              disabled={readOnly}
              InputLabelProps={{ shrink: true }}
              {...register("startsAtLocal")}
              error={Boolean(errors.startsAtLocal)}
              helperText={errors.startsAtLocal?.message}
            />
            <TextField
              label="Fim"
              type="datetime-local"
              fullWidth
              disabled={readOnly}
              InputLabelProps={{ shrink: true }}
              {...register("endsAtLocal")}
              error={Boolean(errors.endsAtLocal)}
              helperText={errors.endsAtLocal?.message}
            />
            <Controller
              name="allDay"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(field.value)}
                      disabled={readOnly}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label="Dia inteiro"
                />
              )}
            />
            {!isComercial ? (
              <Controller
                name="assigneeId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Responsável"
                    fullWidth
                    disabled={readOnly}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={Boolean(errors.assigneeId)}
                    helperText={errors.assigneeId?.message}
                  >
                    {(users.data || []).map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            ) : null}
            <Controller
              name="remindMode"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Lembrete"
                  fullWidth
                  disabled={readOnly}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                >
                  <MenuItem value="day_login">No dia, ao logar</MenuItem>
                  <MenuItem value="minutes_before">Minutos antes</MenuItem>
                </TextField>
              )}
            />
            {remindMode === "minutes_before" ? (
              <TextField
                label="Minutos antes"
                type="number"
                fullWidth
                disabled={readOnly}
                {...register("remindMinutes")}
              />
            ) : null}
            <TextField
              label="Descrição"
              fullWidth
              multiline
              minRows={3}
              disabled={readOnly}
              {...register("description")}
            />

            {!readOnly && ((mode === "create" && canCreate) || (mode === "edit" && canEdit)) ? (
              <Button type="submit" variant="contained" disabled={saving}>
                {mode === "create" ? "Criar evento" : "Salvar alterações"}
              </Button>
            ) : null}
          </Stack>
        </form>

        {mode === "edit" && event ? (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Stack spacing={1}>
              {event.leadId ? (
                <Button
                  component={Link}
                  href={`/leads/${event.leadId}`}
                  startIcon={<OpenInNewIcon />}
                  onClick={onClose}
                >
                  Abrir lead
                </Button>
              ) : null}
              {canEdit && event.status === "agendado" ? (
                <Button
                  startIcon={<CheckCircleOutlineIcon />}
                  onClick={() =>
                    completeEvent.mutate(
                      { id: event.id, leadId: event.leadId },
                      {
                        onSuccess: () => {
                          enqueueSnackbar("Retorno concluído", { variant: "success" });
                          onClose();
                        },
                      },
                    )
                  }
                >
                  Marcar como concluído
                </Button>
              ) : null}
              {canEdit && event.status === "agendado" ? (
                <Button
                  color="warning"
                  onClick={() =>
                    cancelEvent.mutate(
                      { id: event.id, leadId: event.leadId },
                      {
                        onSuccess: () => {
                          enqueueSnackbar("Evento cancelado", { variant: "info" });
                          onClose();
                        },
                      },
                    )
                  }
                >
                  Cancelar evento
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() =>
                    deleteEvent.mutate(
                      { id: event.id, leadId: event.leadId },
                      {
                        onSuccess: () => {
                          enqueueSnackbar("Evento excluído", { variant: "success" });
                          onClose();
                        },
                      },
                    )
                  }
                >
                  Excluir
                </Button>
              ) : null}
            </Stack>
          </>
        ) : null}
      </Box>
    </Drawer>
  );
}
