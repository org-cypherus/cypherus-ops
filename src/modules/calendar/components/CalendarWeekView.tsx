"use client";

import { Box, Stack, Typography } from "@mui/material";
import type { Dayjs } from "dayjs";
import type { CalendarEvent } from "../types";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  SLOT_HEIGHT_PX,
  dayjs,
  eventsForDay,
  hourSlots,
} from "../utils";
import { CalendarEventBlock } from "./CalendarEventBlock";

type Props = {
  days: Dayjs[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (day: Dayjs, hour: number) => void;
};

export function CalendarWeekView({ days, events, onEventClick, onSlotClick }: Props) {
  const hours = hourSlots();
  const gridHeight = (DAY_END_HOUR - DAY_START_HOUR) * SLOT_HEIGHT_PX;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "auto",
        bgcolor: "background.paper",
      }}
    >
      <Box
        display="grid"
        gridTemplateColumns={`64px repeat(${days.length}, minmax(120px, 1fr))`}
        position="sticky"
        top={0}
        zIndex={2}
        bgcolor="background.paper"
        borderBottom="1px solid"
        borderColor="divider"
      >
        <Box />
        {days.map((day) => {
          const isToday = day.isSame(dayjs(), "day");
          return (
            <Box key={day.toString()} px={1} py={1.25} textAlign="center">
              <Typography
                variant="caption"
                color={isToday ? "primary.main" : "text.secondary"}
                sx={{ textTransform: "uppercase", fontWeight: 700 }}
              >
                {day.format("ddd")}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: isToday ? "primary.main" : "text.primary",
                  lineHeight: 1.1,
                }}
              >
                {day.format("D")}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box
        display="grid"
        gridTemplateColumns={`64px repeat(${days.length}, minmax(120px, 1fr))`}
        minWidth={days.length > 1 ? 900 : undefined}
      >
        <Box position="relative" height={gridHeight}>
          {hours.map((hour) => (
            <Box
              key={hour}
              sx={{
                position: "absolute",
                top: (hour - DAY_START_HOUR) * SLOT_HEIGHT_PX,
                right: 8,
                transform: "translateY(-50%)",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {String(hour).padStart(2, "0")}:00
              </Typography>
            </Box>
          ))}
        </Box>

        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          return (
            <Box
              key={day.toString()}
              position="relative"
              height={gridHeight}
              borderLeft="1px solid"
              borderColor="divider"
              sx={{ bgcolor: day.isSame(dayjs(), "day") ? "action.hover" : "transparent" }}
            >
              {hours.map((hour) => (
                <Box
                  key={hour}
                  onClick={() => onSlotClick(day, hour)}
                  sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: (hour - DAY_START_HOUR) * SLOT_HEIGHT_PX,
                    height: SLOT_HEIGHT_PX,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                />
              ))}
              {dayEvents.map((event) => (
                <CalendarEventBlock key={event.id} event={event} onClick={onEventClick} />
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function CalendarDayList({
  day,
  events,
  onEventClick,
}: {
  day: Dayjs;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const dayEvents = eventsForDay(events, day);
  if (!dayEvents.length) {
    return (
      <Typography variant="body2" color="text.secondary" py={2}>
        Nenhum compromisso neste dia.
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {dayEvents.map((event) => (
        <Box
          key={event.id}
          onClick={() => onEventClick(event)}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            px: 1.5,
            py: 1.25,
            cursor: "pointer",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <Typography variant="subtitle2">{event.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {dayjs(event.startsAt).format("HH:mm")} – {dayjs(event.endsAt).format("HH:mm")} ·{" "}
            {event.assigneeName}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
