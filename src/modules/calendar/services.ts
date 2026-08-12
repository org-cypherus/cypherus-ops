import { api, type Paginated } from "@/lib/api/client";
import type { CalendarEvent, CalendarEventStatus, CalendarEventType } from "./types";

export type CalendarEventFilters = {
  from: string;
  to: string;
  assigneeId?: string;
  leadId?: string;
  type?: CalendarEventType | string;
  status?: CalendarEventStatus | string;
  page?: number;
  pageSize?: number;
};

export type CreateCalendarEventPayload = {
  title: string;
  description?: string;
  type: CalendarEventType;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  leadId?: string | null;
  assigneeId: string;
  remindAt?: string | null;
};

export type UpdateCalendarEventPayload = Partial<CreateCalendarEventPayload> & {
  status?: CalendarEventStatus;
};

export async function fetchCalendarEvents(params: CalendarEventFilters) {
  const { data } = await api.get<Paginated<CalendarEvent>>("/calendar/events", { params });
  return data;
}

export async function fetchCalendarEvent(id: string) {
  const { data } = await api.get<CalendarEvent>(`/calendar/events/${id}`);
  return data;
}

export async function createCalendarEvent(payload: CreateCalendarEventPayload) {
  const { data } = await api.post<CalendarEvent>("/calendar/events", payload);
  return data;
}

export async function updateCalendarEvent(id: string, payload: UpdateCalendarEventPayload) {
  const { data } = await api.patch<CalendarEvent>(`/calendar/events/${id}`, payload);
  return data;
}

export async function deleteCalendarEvent(id: string) {
  const { data } = await api.delete<{ ok: boolean }>(`/calendar/events/${id}`);
  return data;
}

export async function completeCalendarEvent(id: string) {
  const { data } = await api.post<CalendarEvent>(`/calendar/events/${id}/complete`);
  return data;
}

export async function cancelCalendarEvent(id: string) {
  const { data } = await api.post<CalendarEvent>(`/calendar/events/${id}/cancel`);
  return data;
}

export async function fetchLeadCalendarEvents(leadId: string) {
  const { data } = await api.get<{ data: CalendarEvent[] }>(`/leads/${leadId}/calendar-events`);
  return data.data;
}
