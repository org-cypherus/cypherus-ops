"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  cancelCalendarEvent,
  completeCalendarEvent,
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvent,
  fetchCalendarEvents,
  fetchLeadCalendarEvents,
  updateCalendarEvent,
  type CalendarEventFilters,
  type CreateCalendarEventPayload,
  type UpdateCalendarEventPayload,
} from "./services";

function invalidateCalendar(
  queryClient: ReturnType<typeof useQueryClient>,
  opts?: { eventId?: string; leadId?: string | null },
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  if (opts?.eventId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.detail(opts.eventId) });
  }
  if (opts?.leadId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(opts.leadId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.byLead(opts.leadId) });
  }
}

export function useCalendarEvents(params: CalendarEventFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.calendar.list(params),
    queryFn: () => fetchCalendarEvents(params),
    enabled: enabled && Boolean(params.from && params.to),
  });
}

export function useCalendarEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.calendar.detail(id),
    queryFn: () => fetchCalendarEvent(id),
    enabled: Boolean(id),
  });
}

export function useLeadCalendarEvents(leadId: string) {
  return useQuery({
    queryKey: queryKeys.calendar.byLead(leadId),
    queryFn: () => fetchLeadCalendarEvents(leadId),
    enabled: Boolean(leadId),
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: (event) => invalidateCalendar(queryClient, { leadId: event.leadId }),
  });
}

export function useUpdateCalendarEvent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCalendarEventPayload) => updateCalendarEvent(id, payload),
    onSuccess: (event) =>
      invalidateCalendar(queryClient, { eventId: id, leadId: event.leadId }),
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; leadId?: string | null }) => deleteCalendarEvent(payload.id),
    onSuccess: (_data, vars) =>
      invalidateCalendar(queryClient, { eventId: vars.id, leadId: vars.leadId }),
  });
}

export function useCompleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; leadId?: string | null }) => completeCalendarEvent(payload.id),
    onSuccess: (event) =>
      invalidateCalendar(queryClient, { eventId: event.id, leadId: event.leadId }),
  });
}

export function useCancelCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string; leadId?: string | null }) => cancelCalendarEvent(payload.id),
    onSuccess: (event) =>
      invalidateCalendar(queryClient, { eventId: event.id, leadId: event.leadId }),
  });
}

export type { CreateCalendarEventPayload };
