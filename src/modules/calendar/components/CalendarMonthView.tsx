"use client";

import { Box, Typography } from "@mui/material";
import type { Dayjs } from "dayjs";
import type { CalendarEvent } from "../types";
import { dayjs, eventsForDay } from "../utils";

type Props = {
  days: Dayjs[];
  events: CalendarEvent[];
  currentMonth: Dayjs;
  onDayClick: (day: Dayjs) => void;
  onEventClick: (event: CalendarEvent) => void;
};

export function CalendarMonthView({
  days,
  events,
  currentMonth,
  onDayClick,
  onEventClick,
}: Props) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Box
        display="grid"
        gridTemplateColumns="repeat(7, 1fr)"
        borderBottom="1px solid"
        borderColor="divider"
      >
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
          <Box key={label} px={1} py={1} textAlign="center">
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box display="grid" gridTemplateColumns="repeat(7, 1fr)">
        {days.map((day) => {
          const inMonth = day.month() === currentMonth.month();
          const isToday = day.isSame(dayjs(), "day");
          const dayEvents = eventsForDay(events, day).slice(0, 3);
          return (
            <Box
              key={day.toString()}
              onClick={() => onDayClick(day)}
              sx={{
                minHeight: 110,
                borderRight: "1px solid",
                borderBottom: "1px solid",
                borderColor: "divider",
                p: 1,
                cursor: "pointer",
                bgcolor: inMonth ? "background.paper" : "action.hover",
                opacity: inMonth ? 1 : 0.65,
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: isToday ? 800 : 600,
                  color: isToday ? "primary.main" : "text.primary",
                  mb: 0.75,
                }}
              >
                {day.format("D")}
              </Typography>
              <Box display="flex" flexDirection="column" gap={0.5}>
                {dayEvents.map((event) => (
                  <Box
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    sx={{
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      borderRadius: 1,
                      px: 0.75,
                      py: 0.25,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      fontSize: 11,
                      opacity: event.status === "agendado" ? 1 : 0.5,
                    }}
                  >
                    {dayjs(event.startsAt).format("HH:mm")} {event.title}
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
