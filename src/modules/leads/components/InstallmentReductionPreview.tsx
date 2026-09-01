"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Box, Divider, Grid2 as Grid, Stack, Typography } from "@mui/material";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { InstallmentReductionResult } from "@/lib/utils/installment-reduction";
import type { Lead } from "../types";

type Props = {
  lead: Lead;
  currentInstallment: number;
  remainingInstallments: number;
  result: InstallmentReductionResult;
  consultantName?: string;
  companyName?: string;
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value || "—"}
      </Typography>
    </Stack>
  );
}

function Metric({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        height: "100%",
        bgcolor: emphasize ? "primary.main" : "action.hover",
        color: emphasize ? "primary.contrastText" : "text.primary",
      }}
    >
      <Typography variant="caption" sx={{ opacity: emphasize ? 0.85 : 1 }}>
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
}

const FINDINGS = [
  "Possibilidade de redução das parcelas",
  "Possibilidade de restituição de valores cobrados",
  "Possibilidade de negociação para redução do saldo devedor",
  "Cenário favorável para negociação junto à instituição financeira",
];

export function InstallmentReductionPreview({
  lead,
  currentInstallment,
  remainingInstallments,
  result,
  consultantName,
  companyName,
}: Props) {
  const installments = lead.process.installments || remainingInstallments;
  const incomplete = result.status === "incomplete";

  return (
    <Box
      sx={{
        mt: 2,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={0.5} mb={2}>
        <Typography variant="overline" color="primary" letterSpacing={1.2}>
          Análise contratual
        </Typography>
        <Typography variant="h6" component="h3">
          Relatório pré-aprovado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Simulação técnica de revisão do contrato. O PDF com o modelo oficial entra na
          próxima etapa — por ora o parecer aparece só nesta tela.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Fact label="Cliente analisado" value={lead.name} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Fact label="Instituição" value={lead.process.bank || "—"} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Fact
            label="Valor financiado"
            value={formatCurrency(lead.process.financedValue || 0)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Fact label="Parcelas" value={installments ? `${installments}x` : "—"} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Fact
            label="Parcelas restantes"
            value={remainingInstallments ? String(remainingInstallments) : "—"}
          />
        </Grid>
      </Grid>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5 }}>
        Com base nas informações fornecidas, a projeção abaixo apresenta uma estimativa
        técnica do cenário que poderá ser buscado durante as tratativas junto à instituição
        financeira.
      </Typography>

      <Typography variant="subtitle2" sx={{ mt: 2.5, mb: 1.5 }}>
        Projeção de revisão contratual
      </Typography>

      {incomplete ? (
        <Typography variant="body2" color="text.secondary">
          Preencha a parcela atual e as parcelas restantes para ver os valores projetados.
        </Typography>
      ) : (
        <Grid container spacing={1.5} role="status" aria-live="polite">
          <Grid size={{ xs: 12, sm: 4 }}>
            <Metric label="Parcela atual" value={formatCurrency(currentInstallment)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Metric
              label="Nova parcela estimada"
              value={formatCurrency(result.newInstallment)}
              emphasize
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Metric label="Redução" value={formatPercent(result.reductionPercent)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Metric label="Economia mensal" value={formatCurrency(result.monthlySavings)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Metric
              label="Valor original restante"
              value={formatCurrency(result.originalRemaining)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Metric
              label="Valor estimado para quitação"
              value={formatCurrency(result.estimatedSettlement)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Metric
              label="Restituição estimada"
              value={formatCurrency(result.estimatedRestitution)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Metric label="Economia total" value={formatCurrency(result.totalSavings)} />
          </Grid>
        </Grid>
      )}

      {!incomplete ? (
        <>
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            Parecer técnico preliminar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            A análise identificou indícios favoráveis para revisão das condições do
            financiamento, com potencial de obtenção de condições mais vantajosas junto à
            instituição financeira.
          </Typography>
          <Stack spacing={0.75}>
            {FINDINGS.map((item) => (
              <Stack key={item} direction="row" spacing={1} alignItems="flex-start">
                <CheckCircleOutlineIcon color="success" fontSize="small" sx={{ mt: "1px" }} />
                <Typography variant="body2">{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </>
      ) : null}

      <Divider sx={{ my: 2 }} />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={0.5}
      >
        <Typography variant="caption" color="text.secondary">
          Consultor responsável: {consultantName || "—"}
          {companyName ? ` · ${companyName}` : ""}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Estimativa técnica. Os valores podem ser ajustados nas tratativas.
        </Typography>
      </Stack>
    </Box>
  );
}
