"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FeatureGate } from "@/components/auth/FeatureGate";
import { Role } from "@/lib/auth/permissions";
import { useCanAccess, useSession } from "@/modules/auth/hooks";
import { useUserDirectory } from "@/modules/users/hooks";
import { useCalendarEvents } from "../hooks";
import type { CalendarEvent, CalendarView } from "../types";
import { dayjs, monthRange, weekRange } from "../utils";
import { CalendarEventDrawer } from "./CalendarEventDrawer";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarDayList, CalendarWeekView } from "./CalendarWeekView";

export function CalendarPageClient() {
  const searchParams = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { data: session } = useSession();
  const canView = useCanAccess("agenda", "agenda:visualizar");
  const isComercial = session?.role === Role.Comercial;

  const initialDate = searchParams.get("date");
  const initialEventId = searchParams.get("eventId");
  const initialView = (searchParams.get("view") as CalendarView | null) || "week";

  const [anchor, setAnchor] = useState(() => dayjs(initialDate || undefined));
  const [view, setView] = useState<CalendarView>(isMobile ? "day" : initialView);
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState("agendado");
  const [drawerOpen, setDrawerOpen] = useState(Boolean(initialEventId));
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">(
    initialEventId ? "edit" : "create",
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createSlot, setCreateSlot] = useState<string | undefined>();

  const users = useUserDirectory(!isComercial);

  const range = useMemo(() => {
    if (view === "day") {
      return {
        from: anchor.startOf("day"),
        to: anchor.endOf("day"),
        days: [anchor.startOf("day")],
      };
    }
    if (view === "month") return monthRange(anchor);
    return weekRange(anchor);
  }, [anchor, view]);

  const eventsQuery = useCalendarEvents(
    {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      assigneeId: assigneeId || undefined,
      status: status || undefined,
    },
    canView,
  );

  const events = eventsQuery.data?.data || [];

  useEffect(() => {
    if (!initialEventId || !events.length || selectedEvent) return;
    const found = events.find((e) => e.id === initialEventId);
    if (found) {
      setSelectedEvent(found);
      setDrawerMode("edit");
      setDrawerOpen(true);
    }
  }, [initialEventId, events, selectedEvent]);

  function openCreate(at?: string) {
    setSelectedEvent(null);
    setCreateSlot(at);
    setDrawerMode("create");
    setDrawerOpen(true);
  }

  function openEvent(event: CalendarEvent) {
    setSelectedEvent(event);
    setDrawerMode("edit");
    setDrawerOpen(true);
  }

  function shiftPeriod(direction: -1 | 1) {
    if (view === "day") setAnchor((d) => d.add(direction, "day"));
    else if (view === "month") setAnchor((d) => d.add(direction, "month"));
    else setAnchor((d) => d.add(direction, "week"));
  }

  const title =
    view === "day"
      ? anchor.format("dddd, D [de] MMMM")
      : view === "month"
        ? anchor.format("MMMM YYYY")
        : `${range.from.format("D MMM")} – ${range.to.format("D MMM YYYY")}`;

  if (!canView) {
    return (
      <ErrorState
        title="Sem permissão"
        description="Seu perfil não tem acesso à Agenda."
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        gap={2}
      >
        <Box>
          <Typography variant="h4">Agenda</Typography>
          <Typography variant="body2" color="text.secondary">
            Retornos e compromissos do comercial e jurídico
          </Typography>
        </Box>
        <FeatureGate feature="agenda" permission="agenda:criar">
          <Button
            variant="contained"
            startIcon={<EventAvailableOutlinedIcon />}
            onClick={() => openCreate()}
          >
            Novo evento
          </Button>
        </FeatureGate>
      </Stack>

      <Stack
        direction={{ xs: "column", lg: "row" }}
        justifyContent="space-between"
        gap={2}
        alignItems={{ lg: "center" }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" onClick={() => setAnchor(dayjs())}>
            Hoje
          </Button>
          <Button size="small" onClick={() => shiftPeriod(-1)} aria-label="Período anterior">
            <ChevronLeftIcon />
          </Button>
          <Button size="small" onClick={() => shiftPeriod(1)} aria-label="Próximo período">
            <ChevronRightIcon />
          </Button>
          <Typography variant="h6" sx={{ textTransform: "capitalize", minWidth: 180 }}>
            {title}
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          {!isComercial ? (
            <TextField
              select
              size="small"
              label="Responsável"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {(users.data || []).map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="agendado">Agendado</MenuItem>
            <MenuItem value="concluido">Concluído</MenuItem>
            <MenuItem value="cancelado">Cancelado</MenuItem>
          </TextField>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_, next) => {
              if (next) setView(next);
            }}
          >
            <ToggleButton value="day">Dia</ToggleButton>
            <ToggleButton value="week">Semana</ToggleButton>
            <ToggleButton value="month">Mês</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {eventsQuery.isLoading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : eventsQuery.isError ? (
        <ErrorState
          title="Não foi possível carregar a agenda"
          onRetry={() => void eventsQuery.refetch()}
        />
      ) : isMobile && view !== "month" ? (
        <CalendarDayList day={anchor} events={events} onEventClick={openEvent} />
      ) : view === "month" ? (
        <CalendarMonthView
          days={range.days}
          events={events}
          currentMonth={anchor}
          onDayClick={(day) => {
            setAnchor(day);
            setView("day");
          }}
          onEventClick={openEvent}
        />
      ) : (
        <CalendarWeekView
          days={range.days}
          events={events}
          onEventClick={openEvent}
          onSlotClick={(day, hour) => {
            const slot = day.hour(hour).minute(0).second(0).toISOString();
            openCreate(slot);
          }}
        />
      )}

      <CalendarEventDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedEvent(null);
        }}
        mode={drawerMode}
        event={selectedEvent}
        defaultStartsAt={createSlot}
      />
    </Stack>
  );
}
