"use client";

import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/format";
import { useLeadCalendarEvents } from "../hooks";
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS } from "../types";
import { formatEventTimeRange } from "../utils";

type Props = {
  leadId: string;
  onSchedule?: () => void;
  canCreate?: boolean;
};

export function UpcomingLeadEvents({ leadId, onSchedule, canCreate }: Props) {
  const { data, isLoading } = useLeadCalendarEvents(leadId, true);
  const upcoming = (data || [])
    .filter((event) => event.status === "agendado")
    .slice(0, 5);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Agenda</Typography>
          {canCreate ? (
            <Button
              size="small"
              startIcon={<EventAvailableOutlinedIcon />}
              onClick={onSchedule}
            >
              Agendar retorno
            </Button>
          ) : null}
        </Stack>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        ) : upcoming.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nenhum retorno agendado para este lead.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {upcoming.map((event) => (
              <Box
                key={event.id}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  px: 1.5,
                  py: 1.25,
                }}
              >
                <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle2">{event.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(event.startsAt)} · {formatEventTimeRange(event)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Chip size="small" label={EVENT_TYPE_LABELS[event.type]} />
                    <Chip size="small" label={EVENT_STATUS_LABELS[event.status]} variant="outlined" />
                  </Stack>
                </Stack>
                <Button
                  component={Link}
                  href={`/calendar?date=${event.startsAt.slice(0, 10)}&eventId=${event.id}`}
                  size="small"
                  sx={{ mt: 0.75, px: 0 }}
                >
                  Abrir na agenda
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
