"use client";

import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid2 as Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { CurrencyField } from "@/components/inputs/CurrencyField";
import { IntegerField } from "@/components/inputs/IntegerField";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { calculateInstallmentReduction } from "@/lib/utils/installment-reduction";
import type { Lead } from "../types";

type Props = {
  process: Lead["process"];
  applying?: boolean;
  onApply: (installmentValue: number) => void;
};

function ResultCell({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      spacing={0.25}
      sx={{
        p: 1.5,
        borderRadius: 1,
        bgcolor: "action.hover",
        height: "100%",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}

export function InstallmentReductionCard({ process, applying, onApply }: Props) {
  const [currentInstallment, setCurrentInstallment] = useState(process.installmentValue || 0);
  const [remainingInstallments, setRemainingInstallments] = useState(process.installments || 0);
  const [newInstallment, setNewInstallment] = useState(0);

  useEffect(() => {
    setCurrentInstallment(process.installmentValue || 0);
    setRemainingInstallments(process.installments || 0);
  }, [process.installmentValue, process.installments]);

  const result = useMemo(
    () =>
      calculateInstallmentReduction({
        currentInstallment,
        remainingInstallments,
        newInstallment,
      }),
    [currentInstallment, remainingInstallments, newInstallment],
  );

  function handleApply() {
    if (!result.hasSavings) return;
    const next = newInstallment;
    setNewInstallment(0);
    onApply(next);
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6">Calculadora de redução</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          Estime a economia ao negociar uma parcela menor. Cálculo simples, sem CET nem taxa.
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CurrencyField
              label="Parcela atual"
              size="small"
              fullWidth
              value={currentInstallment}
              onChange={setCurrentInstallment}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <IntegerField
              label="Parcelas restantes"
              size="small"
              fullWidth
              value={remainingInstallments}
              onChange={setRemainingInstallments}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <CurrencyField
              label="Nova parcela"
              size="small"
              fullWidth
              value={newInstallment}
              onChange={setNewInstallment}
            />
          </Grid>
        </Grid>

        {result.status === "no_savings" ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            A nova parcela precisa ser menor que a atual para haver economia.
          </Alert>
        ) : (
          <Grid container spacing={1.5} sx={{ mt: 1 }} role="status" aria-live="polite">
            <Grid size={{ xs: 12, sm: 4 }}>
              <ResultCell label="Economia mensal" value={formatCurrency(result.monthlySavings)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <ResultCell label="Economia total" value={formatCurrency(result.totalSavings)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <ResultCell label="Redução" value={formatPercent(result.reductionPercent)} />
            </Grid>
          </Grid>
        )}

        <PermissionGate permission="crm:editar">
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            disabled={!result.hasSavings || applying}
            onClick={handleApply}
          >
            Aplicar nova parcela
          </Button>
        </PermissionGate>
      </CardContent>
    </Card>
  );
}
