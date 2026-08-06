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
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { formatCurrency } from "@/lib/utils/format";
import { useLegalKanban, useMoveLegalLead } from "@/modules/leads/hooks";
import type { Lead, LegalStage } from "@/modules/leads/types";
import { LEGAL_STAGES } from "@/modules/leads/types";

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
            <StatusBadge label={lead.status} />
            <Avatar sx={{ width: 22, height: 22, fontSize: 11 }}>{lead.ownerName.charAt(0)}</Avatar>
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
  status: LegalStage;
  count: number;
  potentialValue: number;
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        minWidth: 280,
        width: 280,
        flex: "0 0 280px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        bgcolor: isOver ? "action.hover" : "background.default",
        border: "1px solid",
        borderColor: "divider",
        p: 1.5,
      }}
    >
      <Stack direction="row" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2">{status}</Typography>
        <Typography variant="caption" color="text.secondary">
          {count} · {formatCurrency(potentialValue)}
        </Typography>
      </Stack>
      <Box flex={1} overflow="auto" minHeight={0}>
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </Box>
    </Box>
  );
}

export default function LegalPage() {
  const { data, isLoading, isError, refetch } = useLegalKanban();
  const moveLead = useMoveLegalLead();
  const [active, setActive] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const leadsById = Object.fromEntries(
    (data?.columns || []).flatMap((c) => c.leads.map((l) => [l.id, l])),
  );

  function onDragStart(event: DragStartEvent) {
    setActive(leadsById[String(event.active.id)] || null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActive(null);
    const leadId = String(event.active.id);
    const status = event.over?.id as LegalStage | undefined;
    if (!status || !LEGAL_STAGES.includes(status)) return;
    if (!leadsById[leadId] || leadsById[leadId].legalStatus === status) return;
    moveLead.mutate({ leadId, status });
  }

  return (
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, height: "100%" }}>
      <Box flexShrink={0}>
        <Typography variant="h4">Pipeline Jurídico</Typography>
        <Typography variant="body2" color="text.secondary">
          Tratativa com a instituição financeira após o fechamento comercial
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {isLoading ? (
          <Box py={8} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data?.columns.some((c) => c.count > 0) ? (
          <EmptyState
            title="Nenhum lead no jurídico"
            description="Leads entram aqui quando o comercial avança para Contrato assinado, Pagamento confirmado ou Concluído."
          />
        ) : (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <Box display="flex" gap={1.5} overflow="auto" height="100%" minHeight={0}>
              {data.columns.map((column) => (
                <Column key={column.status} {...column} />
              ))}
            </Box>
            <DragOverlay>{active ? <LeadCard lead={active} dragging /> : null}</DragOverlay>
          </DndContext>
        )}
      </Box>
    </Stack>
  );
}
