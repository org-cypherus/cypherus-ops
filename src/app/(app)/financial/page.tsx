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
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { FeatureGate } from "@/components/auth/FeatureGate";
import { queryKeys } from "@/lib/query/keys";
import { formatCommissionRuleLabel } from "@/lib/utils/commission";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { useFeature } from "@/modules/auth/hooks";
import {
  confirmPayment as confirmPaymentRequest,
  deleteCommissionRule,
  fetchCommissionRules,
  fetchCommissions,
  fetchPayments,
  saveCommissionRule,
  type CommissionRule,
  type Payment,
} from "@/modules/financial/services";

type RuleForm = {
  plan: string;
  type: CommissionRule["type"];
  value: number;
  threshold: number;
  active: boolean;
};

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
    type: "percentual_meta",
    value: 10,
    threshold: 10000,
    active: false,
  });
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  useEffect(() => {
    const paymentId = searchParams.get("paymentId");
    if (paymentId) setSelectedId(paymentId);
  }, [searchParams]);

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
  const selected = payments.data?.find((p) => p.id === selectedId) || null;

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
        threshold: ruleForm.threshold,
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

  const received = (payments.data || [])
    .filter((p) => p.status === "Recebido")
    .reduce((s, p) => s + p.amount, 0);
  const pending = (payments.data || [])
    .filter((p) => p.status !== "Recebido")
    .reduce((s, p) => s + p.amount, 0);
  const commissionsTotal = (commissions.data || []).reduce((s, c) => s + c.amount, 0);

  if (payments.isLoading) {
    return (
      <Box py={8} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (payments.isError) {
    return <ErrorState onRetry={() => payments.refetch()} />;
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4">Financeiro e Comissões</Typography>
        <Typography variant="body2" color="text.secondary">
          Pagamentos, inadimplência e regras de comissão
        </Typography>
      </Box>

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
            <Typography variant="h6" sx={{ p: 2 }}>
              Pagamentos
            </Typography>
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
                {(payments.data || []).map((payment) => (
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
                ))}
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
                  {(commissions.data || []).map((item) => (
                    <Stack key={item.id} direction="row" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">{item.userName}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(item.amount)}
                      </Typography>
                    </Stack>
                  ))}
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
                          plan: "Meta mínima 10k",
                          type: "percentual_meta",
                          value: 10,
                          threshold: 10000,
                          active: false,
                        });
                        setRuleOpen(true);
                      }}
                    >
                      Adicionar
                    </Button>
                  </Stack>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Vigente: soma as vendas do período; ao bater a meta mínima, % sobre o total
                  acumulado (ex.: 3k+2k+6k=11k → 10% de 11k).
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
                            threshold: rule.threshold ?? 10000,
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
                  threshold: e.target.value === "percentual_meta" ? f.threshold || 10000 : f.threshold,
                }))
              }
              fullWidth
            >
              <MenuItem value="percentual_meta">% após meta acumulada</MenuItem>
              <MenuItem value="percentual">Percentual total</MenuItem>
              <MenuItem value="taxa">Taxa fixa</MenuItem>
            </TextField>
            <TextField
              type="number"
              label={ruleForm.type === "taxa" ? "Valor fixo (R$)" : "Percentual (%)"}
              value={ruleForm.value}
              onChange={(e) => setRuleForm((f) => ({ ...f, value: Number(e.target.value) }))}
              fullWidth
            />
            {ruleForm.type === "percentual_meta" ? (
              <TextField
                type="number"
                label="Meta mínima acumulada (R$)"
                helperText="Soma as vendas do período. Abaixo da meta = 0. Na meta ou acima = % do total."
                value={ruleForm.threshold}
                onChange={(e) => setRuleForm((f) => ({ ...f, threshold: Number(e.target.value) }))}
                fullWidth
              />
            ) : null}
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
