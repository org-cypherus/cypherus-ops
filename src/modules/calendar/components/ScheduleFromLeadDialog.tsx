"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { api } from "@/lib/api/client";
import { Role } from "@/lib/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import { useSession } from "@/modules/auth/hooks";
import { useCreateCalendarEvent } from "../hooks";
import { calendarEventFormSchema, type CalendarEventFormValues } from "../schemas";
import { CALENDAR_EVENT_TYPES, EVENT_TYPE_LABELS } from "../types";
import {
  computeRemindAt,
  defaultEventWindow,
  fromDatetimeLocalValue,
} from "../utils";

type Props = {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  defaultOwnerId?: string;
  defaultStartsAt?: string;
};

export function ScheduleFromLeadDialog({
  open,
  onClose,
  leadId,
  leadName,
  defaultOwnerId,
  defaultStartsAt,
}: Props) {
  const createEvent = useCreateCalendarEvent();
  const { enqueueSnackbar } = useSnackbar();
  const { data: session } = useSession();
  const isComercial = session?.role === Role.Comercial;

  const users = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<{ id: string; name: string }> }>("/users");
      return data.data;
    },
    enabled: open && !isComercial,
  });

  const windowDefaults = defaultEventWindow(defaultStartsAt);
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
      title: `Retorno — ${leadName}`,
      description: "",
      type: "retorno",
      startsAtLocal: windowDefaults.startsAtLocal,
      endsAtLocal: windowDefaults.endsAtLocal,
      allDay: false,
      leadId,
      assigneeId: defaultOwnerId || session?.id || "",
      remindMode: "day_login",
      remindMinutes: 30,
    },
  });

  const remindMode = watch("remindMode");

  useEffect(() => {
    if (!open) return;
    const next = defaultEventWindow(defaultStartsAt);
    reset({
      title: `Retorno — ${leadName}`,
      description: "",
      type: "retorno",
      startsAtLocal: next.startsAtLocal,
      endsAtLocal: next.endsAtLocal,
      allDay: false,
      leadId,
      assigneeId: isComercial ? session?.id || "" : defaultOwnerId || session?.id || "",
      remindMode: "day_login",
      remindMinutes: 30,
    });
  }, [open, leadId, leadName, defaultOwnerId, defaultStartsAt, isComercial, session?.id, reset]);

  function submit(values: CalendarEventFormValues) {
    const startsAt = fromDatetimeLocalValue(values.startsAtLocal);
    const endsAt = fromDatetimeLocalValue(values.endsAtLocal);
    createEvent.mutate(
      {
        title: values.title,
        description: values.description,
        type: values.type,
        startsAt,
        endsAt,
        allDay: values.allDay,
        leadId,
        assigneeId: isComercial ? session!.id : values.assigneeId,
        remindAt: computeRemindAt(startsAt, values.remindMode, values.remindMinutes),
      },
      {
        onSuccess: () => {
          enqueueSnackbar("Retorno agendado", { variant: "success" });
          onClose();
        },
        onError: () => {
          enqueueSnackbar("Não foi possível agendar o retorno", { variant: "error" });
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agendar retorno</DialogTitle>
      <form onSubmit={handleSubmit(submit)}>
        <DialogContent>
          <Stack spacing={2} pt={0.5}>
            <TextField
              label="Título"
              fullWidth
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Início"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register("startsAtLocal")}
                error={Boolean(errors.startsAtLocal)}
                helperText={errors.startsAtLocal?.message}
              />
              <TextField
                label="Fim"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                {...register("endsAtLocal")}
                error={Boolean(errors.endsAtLocal)}
                helperText={errors.endsAtLocal?.message}
              />
            </Stack>
            <Controller
              name="allDay"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
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
                {...register("remindMinutes")}
              />
            ) : null}
            <TextField
              label="Descrição"
              fullWidth
              multiline
              minRows={3}
              {...register("description")}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={createEvent.isPending}>
            Agendar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
