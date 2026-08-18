import { z } from "zod";
import { CALENDAR_EVENT_TYPES } from "./types";

export const calendarEventFormSchema = z
  .object({
    title: z.string().min(2, "Informe o título"),
    description: z.string().optional(),
    type: z.enum(CALENDAR_EVENT_TYPES),
    startsAtLocal: z.string().min(1, "Informe o início"),
    endsAtLocal: z.string().min(1, "Informe o fim"),
    allDay: z.boolean(),
    leadId: z.string().nullable().optional(),
    assigneeId: z.string().min(1, "Informe o responsável"),
    remindMode: z.enum(["day_login", "minutes_before"]),
    remindMinutes: z.coerce.number().min(5).max(1440).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "retorno" && !values.leadId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Retorno exige um Lead vinculado",
        path: ["leadId"],
      });
    }
    const start = new Date(values.startsAtLocal);
    const end = new Date(values.endsAtLocal);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Datas inválidas",
        path: ["startsAtLocal"],
      });
      return;
    }
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O fim deve ser após o início",
        path: ["endsAtLocal"],
      });
    }
    const durationMs = end.getTime() - start.getTime();
    if (durationMs > 24 * 60 * 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duração máxima de 24h",
        path: ["endsAtLocal"],
      });
    }
  });

export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;
