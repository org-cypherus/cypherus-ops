"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FeatureGate } from "@/components/auth/FeatureGate";
import { queryKeys } from "@/lib/query/keys";
import { formatCommissionRuleLabel } from "@/lib/utils/commission";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useFeature } from "@/modules/auth/hooks";
import { FinancialCashPanel } from "@/modules/financial/components/FinancialCashPanel";
import { FinancialCommissionsPanel } from "@/modules/financial/components/FinancialCommissionsPanel";
import { filterCommissions } from "@/modules/financial/commission-metrics";
import {
  confirmPayment as confirmPaymentRequest,
  deleteCommissionRule,
  fetchCommissionRules,
  fetchCommissions,
  fetchPayments,
  filterPayments,
  saveCommissionRule,
  type CommissionRule,
} from "@/modules/financial/services";

type RuleForm = {
  plan: string;
  type: CommissionRule["type"];
  value: number;
  active: boolean;
};

const PAYMENT_STATUSES = ["Pendente", "Recebido", "Atrasado"] as const;

export default function FinancialPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const commissionsEnabled = useFeature("commissions").enabled;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleForm>({
    plan: "",
    type: "percentual",
    value: 10,
    active: false,
  });
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [leadFilter, setLeadFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [beneficiaryFilter, setBeneficiaryFilter] = useState("");
  const [commissionStatusFilter, setCommissionStatusFilter] = useState("");
  const [tab, setTab] = useState<"operacional" | "caixa" | "comissoes">("operacional");

  useEffect(() => {
    const paymentId = searchParams.get("paymentId");
    const view = searchParams.get("view");
    if (paymentId) {
      setSelectedId(paymentId);
      setTab("operacional");
      return;
    }
    if (view === "caixa") setTab("caixa");
    if (view === "comissoes" && commissionsEnabled) setTab("comissoes");
  }, [searchParams, commissionsEnabled]);

  const payments = useQuery({
    queryKey: queryKeys.payments.list(),
    queryFn: fetchPayments,
  });

  const commissions = useQuery({
    queryKey: queryKeys.payments.commissions,
    queryFn: fetchCommissions,
    enabled: commissionsEnabled,
  });

  const rules = useQuery({
    queryKey: queryKeys.payments.rules,
    queryFn: fetchCommissionRules,
    enabled: commissionsEnabled,
  });

  const filteredPayments = useMemo(
    () =>
      filterPayments(payments.data || [], {
        lead: leadFilter,
        status: statusFilter,
        from: fromFilter,
        to: toFilter,
      }),
    [payments.data, leadFilter, statusFilter, fromFilter, toFilter],
  );

  const filteredCommissions = useMemo(
    () =>
      filterCommissions(commissions.data || [], {
        beneficiary: beneficiaryFilter,
        status: commissionStatusFilter,
      }),
    [commissions.data, beneficiaryFilter, commissionStatusFilter],
  );

  const commissionStatuses = useMemo(() => {
    const set = new Set((commissions.data || []).map((item) => item.status).filter(Boolean));
    return Array.from(set).sort();
  }, [commissions.data]);

  const selected = filteredPayments.find((p) => p.id === selectedId) || null;

  const confirmPayment = useMutation({
    mutationFn: (id: string) => confirmPaymentRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      enqueueSnackbar("Pagamento confirmado — comissão pela regra vigente", { variant: "success" });
    },
  });

  const saveRule = useMutation({
    mutationFn: async () =>
      saveCommissionRule({
        id: editingRule?.id,
        plan: ruleForm.plan,
        type: ruleForm.type,
        value: ruleForm.value,
        active: ruleForm.active,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.rules });
      enqueueSnackbar(editingRule ? "Regra atualizada" : "Regra criada", { variant: "success" });
      setRuleOpen(false);
      setEditingRule(null);
    },
  });

  const removeRule = useMutation({
    mutationFn: (id: string) => deleteCommissionRule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.rules });
      enqueueSnackbar("Regra removida", { variant: "success" });
      setDeleteRuleId(null);
    },
  });

  const received = filteredPayments
    .filter((p) => p.status === "Recebido")
    .reduce((s, p) => s + p.amount, 0);
  const pending = filteredPayments
    .filter((p) => p.status !== "Recebido")
    .reduce((s, p) => s + p.amount, 0);
  const commissionsTotal = (commissions.data || []).reduce((s, c) => s + c.amount, 0);
  const hasActivePaymentFilters = Boolean(leadFilter.trim() || statusFilter || fromFilter || toFilter);
  const hasActiveCommissionFilters = Boolean(beneficiaryFilter.trim() || commissionStatusFilter);

  useEffect(() => {
    if (!commissionsEnabled && tab === "comissoes") setTab("operacional");
  }, [commissionsEnabled, tab]);

  if (payments.isLoading) {
    return (
      <Box py={8} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (payments.isError) {
    return (
      <ErrorState
        error={payments.error}
        resourceLabel="os pagamentos"
        onRetry={() => payments.refetch()}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Financeiro e Comissões</Typography>
        <Typography variant="body2" color="text.secondary">
          Pagamentos, inadimplência e regras de comissão
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value: "operacional" | "caixa" | "comissoes") => setTab(value)}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="operacional" label="Operacional" />
        <Tab value="caixa" label="Caixa e inadimplência" />
        {commissionsEnabled ? <Tab value="comissoes" label="Comissões operacionais" /> : null}
      </Tabs>

      {tab === "comissoes" ? (
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            label="Beneficiário"
            placeholder="Buscar beneficiário..."
            value={beneficiaryFilter}
            onChange={(e) => setBeneficiaryFilter(e.target.value)}
            sx={{ minWidth: 200, flex: 1 }}
          />
          <TextField
            select
            size="small"
            label="Tipo"
            value={commissionStatusFilter}
            onChange={(e) => setCommissionStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {commissionStatuses.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
          {hasActiveCommissionFilters ? (
            <Button
              size="small"
              onClick={() => {
                setBeneficiaryFilter("");
                setCommissionStatusFilter("");
              }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </Stack>
      ) : (
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            label="Lead"
            placeholder="Buscar lead..."
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            sx={{ minWidth: 200, flex: 1 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {PAYMENT_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Vencimento de"
            InputLabelProps={{ shrink: true }}
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="Vencimento até"
            InputLabelProps={{ shrink: true }}
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
          />
          {hasActivePaymentFilters ? (
            <Button
              size="small"
              onClick={() => {
                setLeadFilter("");
                setStatusFilter("");
                setFromFilter("");
                setToFilter("");
              }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </Stack>
      )}

      {tab === "caixa" ? (
        <FinancialCashPanel payments={filteredPayments} />
      ) : tab === "comissoes" ? (
        commissions.isLoading ? (
          <Box py={6} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : (
          <FinancialCommissionsPanel commissions={filteredCommissions} />
        )
      ) : (
        <>
      <Grid container spacing={2}>
        {[
          { label: "Receita recebida", value: formatCurrency(received) },
          { label: "Pendências", value: formatCurrency(pending) },
          ...(commissionsEnabled
            ? [{ label: "Comissões a pagar", value: formatCurrency(commissionsTotal) }]
            : []),
        ].map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 12, md: commissionsEnabled ? 4 : 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {kpi.label}
                </Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: commissionsEnabled ? 8 : 12 }}>
          <TableContainer component={Paper} variant="outlined">
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, pb: 1 }}>
              <Typography variant="h6">Pagamentos</Typography>
              <Typography variant="caption" color="text.secondary">
                {filteredPayments.length}
                {hasActivePaymentFilters ? ` de ${(payments.data || []).length}` : ""} registro(s)
              </Typography>
            </Stack>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Lead</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPayments.length ? (
                  filteredPayments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      hover
                      selected={selectedId === payment.id}
                      sx={{ cursor: "pointer" }}
                      onClick={() => setSelectedId(payment.id)}
                    >
                      <TableCell>{payment.leadName}</TableCell>
                      <TableCell align="right">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{formatDate(payment.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge label={payment.status} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                        {hasActivePaymentFilters
                          ? "Nenhum pagamento encontrado com os filtros atuais."
                          : "Nenhum pagamento cadastrado."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        <Grid size={{ xs: 12, md: commissionsEnabled ? 4 : 12 }}>
          <Stack spacing={2}>
            <FeatureGate feature="commissions">
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Comissões
                  </Typography>
                  {commissions.isLoading ? (
                    <Typography variant="body2" color="text.secondary">
                      Carregando…
                    </Typography>
                  ) : (commissions.data || []).length ? (
                    (commissions.data || []).map((item) => (
                      <Stack key={item.id} direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">{item.userName}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(item.amount)}
                        </Typography>
                      </Stack>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma comissão encontrada.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </FeatureGate>
            <FeatureGate feature="commissions" permission="financeiro:editar">
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6">Regras de comissão</Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingRule(null);
                        setRuleForm({
                          plan: "Comissão padrão",
                          type: "percentual",
                          value: 10,
                          active: false,
                        });
                        setRuleOpen(true);
                      }}
                    >
                      Adicionar
                    </Button>
                  </Stack>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  CRM: uma regra vigente por empresa (`PERCENT` ou `FIXED`). Sem regra ativa o
                  pagamento confirma, mas pode não gerar comissão.
                </Typography>
                {(rules.data || []).map((rule) => (
                  <Stack
                    key={rule.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={0.75}
                  >
                    <Box>
                      <Typography variant="body2">
                        {rule.plan}
                        {rule.active ? " · vigente" : ""}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCommissionRuleLabel(rule, formatCurrency)}
                      </Typography>
                    </Box>
                    <Stack direction="row">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingRule(rule);
                          setRuleForm({
                            plan: rule.plan,
                            type: rule.type,
                            value: rule.value,
                            active: Boolean(rule.active),
                          });
                          setRuleOpen(true);
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteRuleId(rule.id)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))}
              </CardContent>
            </Card>
            </FeatureGate>
          </Stack>
        </Grid>
      </Grid>
        </>
      )}

      <Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelectedId(null)}>
        <Box width={360} p={2}>
          {selected ? (
            <Stack spacing={2}>
              <Typography variant="h6">Detalhe do pagamento</Typography>
              <Typography variant="body2">Lead: {selected.leadName}</Typography>
              <Typography variant="body2">Valor: {formatCurrency(selected.amount)}</Typography>
              <Typography variant="body2">Vencimento: {formatDate(selected.dueDate)}</Typography>
              <Typography variant="body2">Status: {selected.status}</Typography>
              {selected.paidAt ? (
                <Typography variant="body2">Recebido em: {formatDate(selected.paidAt)}</Typography>
              ) : null}
              {selected.commissionId ? (
                <Typography variant="body2">Comissão: {selected.commissionId}</Typography>
              ) : null}
              <FeatureGate feature="contracts" permission="contratos:visualizar">
                <Button component={Link} href={`/contracts/${selected.contractId}`} size="small">
                  Ver contrato
                </Button>
              </FeatureGate>
              {selected.leadId ? (
                <Button component={Link} href={`/leads/${selected.leadId}`} size="small">
                  Ver lead
                </Button>
              ) : null}
              {selected.status !== "Recebido" ? (
                <Button
                  variant="contained"
                  disabled={confirmPayment.isPending}
                  onClick={() => confirmPayment.mutate(selected.id)}
                >
                  Confirmar recebimento
                </Button>
              ) : null}
            </Stack>
          ) : null}
        </Box>
      </Drawer>

      <Dialog open={ruleOpen} onClose={() => setRuleOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingRule ? "Editar regra" : "Nova regra"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Plano"
              value={ruleForm.plan}
              onChange={(e) => setRuleForm((f) => ({ ...f, plan: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Tipo"
              value={ruleForm.type}
              onChange={(e) =>
                setRuleForm((f) => ({
                  ...f,
                  type: e.target.value as RuleForm["type"],
                }))
              }
              fullWidth
            >
              <MenuItem value="percentual">Percentual (0–100)</MenuItem>
              <MenuItem value="taxa">Valor fixo</MenuItem>
            </TextField>
            <TextField
              type="number"
              label={ruleForm.type === "taxa" ? "Valor fixo (R$)" : "Percentual (%)"}
              value={ruleForm.value}
              onChange={(e) => setRuleForm((f) => ({ ...f, value: Number(e.target.value) }))}
              fullWidth
            />
            <TextField
              select
              label="Usar no cálculo automático"
              value={ruleForm.active ? "sim" : "nao"}
              onChange={(e) => setRuleForm((f) => ({ ...f, active: e.target.value === "sim" }))}
              fullWidth
            >
              <MenuItem value="sim">Sim (vigente)</MenuItem>
              <MenuItem value="nao">Não</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!ruleForm.plan || saveRule.isPending}
            onClick={() => saveRule.mutate()}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteRuleId)}
        title="Excluir regra"
        description="Remover esta regra de comissão?"
        confirmLabel="Excluir"
        loading={removeRule.isPending}
        onClose={() => setDeleteRuleId(null)}
        onConfirm={() => deleteRuleId && removeRule.mutate(deleteRuleId)}
      />
    </Stack>
  );
}
