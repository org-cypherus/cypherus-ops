"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Avatar, Box, Card, CardActionArea, CardContent, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { formatCurrency } from "@/lib/utils/format";
import type { KanbanBoard as KanbanBoardType, Lead, PipelineStage } from "../types";
import { PIPELINE_STAGES } from "../types";
import { useMoveLead } from "../hooks";

function LeadCard({ lead, dragging }: { lead: Lead; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      variant="outlined"
      sx={{
        mb: 1,
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
        bgcolor: dragging ? "background.paper" : undefined,
      }}
    >
      <CardActionArea component={Link} href={`/leads/${lead.id}`}>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="subtitle2" noWrap>
            {lead.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatCurrency(lead.process.totalValue)}
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
            <StatusBadge label={lead.priority} />
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {lead.daysInStage}d
              </Typography>
              <Avatar sx={{ width: 22, height: 22, fontSize: 11 }}>{lead.ownerName.charAt(0)}</Avatar>
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function Column({
  status,
  count,
  potentialValue,
  leads,
}: {
  status: PipelineStage;
  count: number;
  potentialValue: number;
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        minWidth: 260,
        width: 260,
        flex: "0 0 260px",
        alignSelf: "flex-start",
        display: "flex",
        flexDirection: "column",
        bgcolor: isOver ? "action.hover" : "background.paper",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        p: 1.25,
      }}
    >
      <Stack spacing={0.25} mb={1.5} px={0.5}>
        <Typography variant="subtitle2">{status}</Typography>
        <Typography variant="caption" color="text.secondary">
          {count} leads · {formatCurrency(potentialValue)}
        </Typography>
      </Stack>
      <Box pr={0.25}>
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </Box>
    </Box>
  );
}

export function KanbanBoard({ board }: { board: KanbanBoardType }) {
  const moveLead = useMoveLead();
  const [active, setActive] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const leadsById = Object.fromEntries(board.columns.flatMap((c) => c.leads.map((l) => [l.id, l])));

  function onDragStart(event: DragStartEvent) {
    setActive(leadsById[String(event.active.id)] || null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActive(null);
    const leadId = String(event.active.id);
    const overId = event.over?.id;
    if (!overId || !leadsById[leadId]) return;

    // Drop na coluna ou em cima de outro card (resolve a coluna do alvo)
    const overKey = String(overId);
    let status: PipelineStage | undefined;
    if ((PIPELINE_STAGES as readonly string[]).includes(overKey)) {
      status = overKey as PipelineStage;
    } else if (leadsById[overKey]) {
      status = leadsById[overKey].status;
    }
    if (!status || leadsById[leadId].status === status) return;
    moveLead.mutate({ leadId, status });
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <Box
        display="flex"
        gap={1.5}
        alignItems="flex-start"
        pb={0.5}
        sx={{
          overflowX: "auto",
          overflowY: "visible",
        }}
      >
        {board.columns.map((column) => (
          <Column key={column.status} {...column} />
        ))}
      </Box>
      <DragOverlay>{active ? <LeadCard lead={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
