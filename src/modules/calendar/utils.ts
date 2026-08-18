import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/pt-br";
import type { CalendarEvent } from "./types";

dayjs.extend(isoWeek);
dayjs.locale("pt-br");

export { dayjs };

export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 20;
export const SLOT_HEIGHT_PX = 56;

export function toDatetimeLocalValue(value?: string | Date | null) {
  if (!value) return "";
  return dayjs(value).format("YYYY-MM-DDTHH:mm");
}

export function fromDatetimeLocalValue(value: string) {
  return dayjs(value).toISOString();
}

export function startOfLocalDay(value: string | Date | Dayjs = new Date()) {
  return dayjs(value).startOf("day");
}

export function endOfLocalDay(value: string | Date | Dayjs = new Date()) {
  return dayjs(value).endOf("day");
}

export function weekRange(anchor: string | Date | Dayjs) {
  const d = dayjs(anchor);
  const from = d.startOf("isoWeek");
  const to = d.endOf("isoWeek");
  return { from, to, days: Array.from({ length: 7 }, (_, i) => from.add(i, "day")) };
}

export function monthRange(anchor: string | Date | Dayjs) {
  const d = dayjs(anchor);
  const from = d.startOf("month").startOf("isoWeek");
  const to = d.endOf("month").endOf("isoWeek");
  const days: Dayjs[] = [];
  let cursor = from;
  while (cursor.isBefore(to) || cursor.isSame(to, "day")) {
    days.push(cursor);
    cursor = cursor.add(1, "day");
  }
  return { from, to, days };
}

export function hourSlots() {
  return Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
}

export function eventPosition(event: CalendarEvent) {
  const start = dayjs(event.startsAt);
  const end = dayjs(event.endsAt);
  const startMinutes = (start.hour() - DAY_START_HOUR) * 60 + start.minute();
  const endMinutes = (end.hour() - DAY_START_HOUR) * 60 + end.minute();
  const clampedStart = Math.max(0, startMinutes);
  const clampedEnd = Math.min((DAY_END_HOUR - DAY_START_HOUR) * 60, Math.max(clampedStart + 15, endMinutes));
  return {
    top: (clampedStart / 60) * SLOT_HEIGHT_PX,
    height: Math.max(((clampedEnd - clampedStart) / 60) * SLOT_HEIGHT_PX, 28),
  };
}

export function eventsForDay(events: CalendarEvent[], day: Dayjs) {
  return events
    .filter((event) => dayjs(event.startsAt).isSame(day, "day"))
    .sort((a, b) => dayjs(a.startsAt).valueOf() - dayjs(b.startsAt).valueOf());
}

export function formatEventTimeRange(event: CalendarEvent) {
  if (event.allDay) return "Dia inteiro";
  return `${dayjs(event.startsAt).format("HH:mm")} – ${dayjs(event.endsAt).format("HH:mm")}`;
}

export function defaultEventWindow(anchor?: string | Date) {
  const start = dayjs(anchor).minute(0).second(0).millisecond(0);
  const rounded = start.minute() >= 30 ? start.add(1, "hour").minute(0) : start.minute(0);
  const base = rounded.hour() < DAY_START_HOUR ? rounded.hour(DAY_START_HOUR) : rounded;
  return {
    startsAtLocal: base.format("YYYY-MM-DDTHH:mm"),
    endsAtLocal: base.add(30, "minute").format("YYYY-MM-DDTHH:mm"),
  };
}

export function computeRemindAt(
  startsAtIso: string,
  mode: "day_login" | "minutes_before",
  minutes?: number,
) {
  if (mode === "minutes_before") {
    return dayjs(startsAtIso)
      .subtract(minutes || 30, "minute")
      .toISOString();
  }
  return dayjs(startsAtIso).startOf("day").toISOString();
}
