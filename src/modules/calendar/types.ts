export const CALENDAR_EVENT_TYPES = ["retorno", "reuniao", "outro"] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export const CALENDAR_EVENT_STATUSES = ["agendado", "concluido", "cancelado"] as const;
export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number];

export const CALENDAR_VIEWS = ["day", "week", "month"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  leadId: string | null;
  leadName?: string | null;
  assigneeId: string;
  assigneeName: string;
  createdById: string;
  remindAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  retorno: "Retorno",
  reuniao: "Reunião",
  outro: "Outro",
};

export const EVENT_STATUS_LABELS: Record<CalendarEventStatus, string> = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
