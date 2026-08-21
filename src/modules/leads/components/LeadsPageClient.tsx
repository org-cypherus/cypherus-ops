"use client";

import {
  Box,
  Button,
  Checkbox,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { KanbanSkeleton, TableSkeleton } from "@/components/feedback/PageSkeletons";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { downloadText } from "@/lib/utils/download";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { useSession } from "@/modules/auth/hooks";
import { Role } from "@/lib/auth/permissions";
import { applyColumnVisibility } from "@/modules/leads/column-visibility";
import {
  CustomizeColumnsButton,
  CustomizeColumnsDialog,
} from "@/modules/leads/components/CustomizeColumnsDialog";
import { CreateLeadDialog } from "@/modules/leads/components/CreateLeadDialog";
import { DistributeLeadsDialog } from "@/modules/leads/components/DistributeLeadsDialog";
import { ImportLeadsDialog } from "@/modules/leads/components/ImportLeadsDialog";
import { KanbanBoard } from "@/modules/leads/components/KanbanBoard";
import { useDistributeLeads, useKanban, useLeads } from "@/modules/leads/hooks";
import { filterKanbanBoard } from "@/modules/leads/services";
import type { Lead, PipelineStage } from "@/modules/leads/types";
import { useUserDirectory } from "@/modules/users/hooks";
import { usePipelinePrefsStore } from "@/store/pipeline-prefs";

const NO_HIDDEN_STAGES: PipelineStage[] = [];

function leadsToCsv(leads: Lead[]) {
  const header = "nome,email,telefone,cpf,origem,status,responsavel,valor,prioridade,tags";
  const rows = leads.map((l) =>
    [l.name, l.email, l.phone, l.cpf, l.origin, l.status, l.ownerName, l.process.totalValue, l.priority, l.tags.join("|")]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export function LeadsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: session, isSuccess: sessionReady } = useSession();
  const isComercial = session?.role === Role.Comercial;
  const canViewCrm = Boolean(session?.permissions.includes("crm:visualizar"));
  const view = searchParams.get("view") === "table" ? "table" : "kanban";

  useEffect(() => {
    if (sessionReady && session && !canViewCrm) {
      router.replace("/dashboard");
    }
  }, [sessionReady, session, canViewCrm, router]);

  const filters = {
    q: searchParams.get("q") || undefined,
    ownerId: isComercial ? session?.id : searchParams.get("ownerId") || undefined,
    origin: searchParams.get("origin") || undefined,
    priority: searchParams.get("priority") || undefined,
    tag: searchParams.get("tag") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkTags, setBulkTags] = useState("");
  const distribute = useDistributeLeads();
  const companyId = session?.companyId || "";
  const hiddenStages = usePipelinePrefsStore(
    (s) => s.hiddenStagesByCompany[companyId] ?? NO_HIDDEN_STAGES,
  );
  const setHiddenStages = usePipelinePrefsStore((s) => s.setHiddenStages);

  const kanban = useKanban(view === "kanban");
  const leads = useLeads({ ...filters, pageSize: 100 }, view === "table");
  const users = useUserDirectory(!isComercial);

  const filteredKanban = useMemo(() => {
    if (!kanban.data) return undefined;
    const filtered = filterKanbanBoard(kanban.data, filters);
    return applyColumnVisibility(filtered, hiddenStages);
  }, [kanban.data, filters, hiddenStages]);

  const availableStages = useMemo(
    () => (kanban.data?.columns.map((column) => column.status) ?? []) as PipelineStage[],
    [kanban.data],
  );

  const allLeads = useMemo(() => {
    if (view === "table") return leads.data?.data || [];
    return filteredKanban?.columns.flatMap((column) => column.leads) || [];
  }, [view, leads.data?.data, filteredKanban]);
  const selectedLeads = useMemo(
    () => allLeads.filter((l) => selected.includes(l.id)),
    [allLeads, selected],
  );
  const allSelected = allLeads.length > 0 && selected.length === allLeads.length;

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `/leads?${qs}` : "/leads");
  }

  function exportLeads(items: Lead[]) {
    if (!items.length) {
      enqueueSnackbar("Nenhum lead para exportar", { variant: "warning" });
      return;
    }
    downloadText(`leads-${new Date().toISOString().slice(0, 10)}.csv`, leadsToCsv(items));
    enqueueSnackbar(`${items.length} leads exportados`, { variant: "success" });
  }

  return (
    <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        gap={2}
        flexShrink={0}
      >
        <Box>
          <Typography variant="h4">Pipeline comercial</Typography>
          <Typography variant="body2" color="text.secondary">
            Acompanhe leads, valores e movimentação do funil
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_, value) => {
              if (!value) return;
              const params = new URLSearchParams(searchParams.toString());
              if (value === "table") params.set("view", "table");
              else params.delete("view");
              const qs = params.toString();
              router.push(qs ? `/leads?${qs}` : "/leads");
            }}
          >
            <ToggleButton value="kanban">Kanban</ToggleButton>
            <ToggleButton value="table">Tabela</ToggleButton>
          </ToggleButtonGroup>
          {view === "kanban" ? (
            <CustomizeColumnsButton onClick={() => setColumnsOpen(true)} />
          ) : null}
          {!isComercial ? (
            <PermissionGate permission="crm:editar">
              <Button variant="outlined" onClick={() => setDistributeOpen(true)}>
                Distribuir
              </Button>
            </PermissionGate>
          ) : null}
          <PermissionGate permission="crm:criar">
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Novo Lead
            </Button>
          </PermissionGate>
          <Button variant="outlined" onClick={() => setImportOpen(true)}>
            Importar
          </Button>
          <Button variant="outlined" onClick={() => exportLeads(allLeads)}>
            Exportar
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap flexShrink={0}>
        <TextField
          size="small"
          placeholder="Buscar lead..."
          defaultValue={filters.q || ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") setFilter("q", (e.target as HTMLInputElement).value);
          }}
          onBlur={(e) => setFilter("q", e.target.value)}
        />
        {!isComercial ? (
          <TextField
            select
            size="small"
            label="Responsável"
            value={filters.ownerId || ""}
            onChange={(e) => setFilter("ownerId", e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {(users.data || []).map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        <TextField
          select
          size="small"
          label="Origem"
          value={filters.origin || ""}
          onChange={(e) => setFilter("origin", e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="Google Ads">Google Ads</MenuItem>
          <MenuItem value="Indicação">Indicação</MenuItem>
          <MenuItem value="Orgânico">Orgânico</MenuItem>
          <MenuItem value="Manual">Manual</MenuItem>
          <MenuItem value="Importação">Importação</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Prioridade"
          value={filters.priority || ""}
          onChange={(e) => setFilter("priority", e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="baixa">baixa</MenuItem>
          <MenuItem value="media">media</MenuItem>
          <MenuItem value="alta">alta</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Tag"
          value={filters.tag || ""}
          onChange={(e) => setFilter("tag", e.target.value)}
          sx={{ minWidth: 120 }}
        />
        <TextField
          size="small"
          type="date"
          label="De"
          InputLabelProps={{ shrink: true }}
          value={filters.from?.slice(0, 10) || ""}
          onChange={(e) => setFilter("from", e.target.value ? new Date(e.target.value).toISOString() : "")}
        />
        <TextField
          size="small"
          type="date"
          label="Até"
          InputLabelProps={{ shrink: true }}
          value={filters.to?.slice(0, 10) || ""}
          onChange={(e) => setFilter("to", e.target.value ? new Date(e.target.value + "T23:59:59").toISOString() : "")}
        />
      </Stack>

      {view === "table" && selected.length > 0 ? (
        <Paper variant="outlined" sx={{ flexShrink: 0 }}>
          <Toolbar sx={{ gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              {selected.length} selecionado(s)
            </Typography>
            <Button
              size="small"
              onClick={() =>
                distribute.mutate(
                  { strategy: "round_robin", leadIds: selected },
                  {
                    onSuccess: (res) => {
                      enqueueSnackbar(`${res.affected} redistribuídos`, { variant: "success" });
                      setSelected([]);
                    },
                  },
                )
              }
            >
              Redistribuir
            </Button>
            <TextField
              size="small"
              placeholder="Tags (vírgula)"
              value={bulkTags}
              onChange={(e) => setBulkTags(e.target.value)}
              sx={{ width: 160 }}
            />
            <Button
              size="small"
              disabled={!bulkTags.trim()}
              onClick={() =>
                distribute.mutate(
                  {
                    strategy: "tags",
                    leadIds: selected,
                    tags: bulkTags.split(",").map((t) => t.trim()).filter(Boolean),
                  },
                  {
                    onSuccess: (res) => {
                      enqueueSnackbar(`Tags aplicadas em ${res.affected}`, { variant: "success" });
                      setSelected([]);
                      setBulkTags("");
                    },
                  },
                )
              }
            >
              Aplicar tags
            </Button>
            <Button size="small" onClick={() => exportLeads(selectedLeads)}>
              Exportar seleção
            </Button>
            <Button size="small" onClick={() => setSelected([])}>
              Limpar
            </Button>
          </Toolbar>
        </Paper>
      ) : null}

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {view === "kanban" ? (
          kanban.isLoading ? (
            <KanbanSkeleton />
          ) : kanban.isError ? (
            <ErrorState onRetry={() => kanban.refetch()} />
          ) : !filteredKanban?.columns.some((c) => c.count > 0) ? (
            <EmptyState title="Nenhum lead no pipeline" description="Crie ou importe leads para começar." />
          ) : (
            <KanbanBoard board={filteredKanban} />
          )
        ) : leads.isLoading ? (
          <TableSkeleton
            columns={8}
            headers={["", "Nome", "Documento", "Status", "Responsável", "Origem", "Valor", "Criação"]}
          />
        ) : leads.isError ? (
          <ErrorState onRetry={() => leads.refetch()} />
        ) : !allLeads.length ? (
          <EmptyState title="Nenhum lead encontrado" />
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={selected.length > 0 && !allSelected}
                      onChange={(e) => setSelected(e.target.checked ? allLeads.map((l) => l.id) : [])}
                    />
                  </TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Documento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Responsável</TableCell>
                  <TableCell>Origem</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Criação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allLeads.map((lead) => (
                  <TableRow key={lead.id} hover selected={selected.includes(lead.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(lead.id)}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked ? [...prev, lead.id] : prev.filter((id) => id !== lead.id),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography
                        component={Link}
                        href={`/leads/${lead.id}`}
                        variant="body2"
                        color="primary"
                        sx={{ textDecoration: "none", fontWeight: 600 }}
                      >
                        {lead.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{lead.cpf}</TableCell>
                    <TableCell>
                      <StatusBadge label={lead.status} />
                    </TableCell>
                    <TableCell>{lead.ownerName}</TableCell>
                    <TableCell>{lead.origin}</TableCell>
                    <TableCell align="right">{formatCurrency(lead.process.totalValue)}</TableCell>
                    <TableCell>{formatDate(lead.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportLeadsDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <DistributeLeadsDialog open={distributeOpen} onClose={() => setDistributeOpen(false)} leadIds={selected} />
      <CustomizeColumnsDialog
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        stages={availableStages}
        hiddenStages={hiddenStages}
        onSave={(hidden) => {
          if (!companyId) return;
          setHiddenStages(companyId, hidden);
          enqueueSnackbar("Colunas do kanban atualizadas", { variant: "success" });
        }}
      />
    </Stack>
  );
}
