"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Grid2 as Grid,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { CurrencyField } from "@/components/inputs/CurrencyField";
import { IntegerField } from "@/components/inputs/IntegerField";
import { formatPercent } from "@/lib/utils/format";
import {
  calculateInstallmentReduction,
  clampReductionPercent,
} from "@/lib/utils/installment-reduction";
import { useSession } from "@/modules/auth/hooks";
import type { Lead } from "../types";
import { InstallmentReductionPreview } from "./InstallmentReductionPreview";

const DEFAULT_REDUCTION_PERCENT = 30;

const PERCENT_MARKS = [
  { value: 0, label: "0%" },
  { value: 50, label: "50%" },
  { value: 100, label: "100%" },
];

type Props = {
  lead: Lead;
  applying?: boolean;
  onApply: (installmentValue: number) => void;
};

export function InstallmentReductionCard({ lead, applying, onApply }: Props) {
  const { data: session } = useSession();
  const process = lead.process;
  const [currentInstallment, setCurrentInstallment] = useState(process.installmentValue || 0);
  const [remainingInstallments, setRemainingInstallments] = useState(process.installments || 0);
  const [reductionPercent, setReductionPercent] = useState(DEFAULT_REDUCTION_PERCENT);

  useEffect(() => {
    setCurrentInstallment(process.installmentValue || 0);
    setRemainingInstallments(process.installments || 0);
  }, [process.installmentValue, process.installments]);

  const result = useMemo(
    () =>
      calculateInstallmentReduction({
        currentInstallment,
        remainingInstallments,
        reductionPercent,
      }),
    [currentInstallment, remainingInstallments, reductionPercent],
  );

  function handleApply() {
    if (!result.hasSavings) return;
    setReductionPercent(0);
    onApply(result.newInstallment);
  }

  return (
    <Accordion
      disableGutters
      variant="outlined"
      sx={{
        "&:before": { display: "none" },
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="installment-calculator-content"
        id="installment-calculator-header"
        sx={{
          px: 2,
          "& .MuiAccordionSummary-content": { my: 1.5, flexDirection: "column" },
        }}
      >
        <Typography variant="h6">Calculadora de redução</Typography>
        <Typography variant="body2" color="text.secondary">
          Abra para simular a redução de parcela quando precisar
        </Typography>
      </AccordionSummary>
      <AccordionDetails
        id="installment-calculator-content"
        sx={{ px: 2, pb: 2, pt: 0 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Informe o percentual de redução estimado. A nova parcela e o parecer são
          calculados na hora — gerar o PDF com o modelo da análise vem depois.
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CurrencyField
              label="Parcela atual"
              size="small"
              fullWidth
              value={currentInstallment}
              onChange={setCurrentInstallment}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <IntegerField
              label="Parcelas restantes"
              size="small"
              fullWidth
              value={remainingInstallments}
              onChange={setRemainingInstallments}
            />
          </Grid>
          <Grid size={12}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              mb={0.5}
            >
              <Typography id="reduction-percent-label" variant="body2">
                Redução estimada
              </Typography>
              <Typography variant="subtitle2" color="primary">
                {formatPercent(reductionPercent)}
              </Typography>
            </Stack>
            <Box px={{ xs: 1, sm: 1.5 }}>
              <Slider
                aria-labelledby="reduction-percent-label"
                aria-valuetext={`${reductionPercent} por cento`}
                value={reductionPercent}
                min={0}
                max={100}
                step={1}
                marks={PERCENT_MARKS}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                onChange={(_, value) =>
                  setReductionPercent(clampReductionPercent(Array.isArray(value) ? value[0] : value))
                }
              />
            </Box>
          </Grid>
        </Grid>

        {result.status === "no_savings" ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            Mova o percentual acima de 0% para projetar economia na parcela.
          </Alert>
        ) : null}

        <InstallmentReductionPreview
          lead={lead}
          currentInstallment={currentInstallment}
          remainingInstallments={remainingInstallments}
          result={result}
          consultantName={session?.name}
          companyName={session?.company.name}
        />

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
      </AccordionDetails>
    </Accordion>
  );
}
