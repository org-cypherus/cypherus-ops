"use client";

import { Box, Typography } from "@mui/material";
import type { CalendarEvent, CalendarEventType } from "../types";
import { EVENT_TYPE_LABELS } from "../types";
import { eventPosition, formatEventTimeRange } from "../utils";

const TYPE_COLORS: Record<CalendarEventType, string> = {
  retorno: "#1565C0",
  reuniao: "#2E7D32",
  outro: "#6A1B9A",
};

type Props = {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  compact?: boolean;
};

export function CalendarEventBlock({ event, onClick, compact }: Props) {
  const pos = eventPosition(event);
  const muted = event.status !== "agendado";

  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      sx={{
        position: "absolute",
        left: 4,
        right: 4,
        top: pos.top,
        height: pos.height,
        bgcolor: TYPE_COLORS[event.type],
        color: "#fff",
        borderRadius: 1,
        px: 0.75,
        py: 0.25,
        overflow: "hidden",
        cursor: "pointer",
        opacity: muted ? 0.45 : 0.95,
        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
        "&:hover": { opacity: muted ? 0.6 : 1 },
        zIndex: 1,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, displayHeight: 1.2, display: "block" }}>
        {compact ? EVENT_TYPE_LABELS[event.type] : event.title}
      </Typography>
      {!compact ? (
        <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1.2 }}>
          {formatEventTimeRange(event)}
        </Typography>
      ) : null}
    </Box>
  );
}
