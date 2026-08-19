"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { distributionStrategyOptions, type DistributionStrategy } from "@/lib/billing/distribution";
import { planLabel } from "@/lib/billing/plan-catalog";
import { useCompanyPlan } from "@/modules/auth/hooks";
import { useUserDirectory } from "@/modules/users/hooks";
import { useDistributeLeads } from "../hooks";

type Props = {
  open: boolean;
  onClose: () => void;
  leadIds?: string[];
};

export function DistributeLeadsDialog({ open, onClose, leadIds }: Props) {
  const { planCode } = useCompanyPlan();
  const strategies = distributionStrategyOptions(planCode);
  const [strategy, setStrategy] = useState<DistributionStrategy>(strategies[0]?.value ?? "manual");
  const [ownerId, setOwnerId] = useState("");
  const distribute = useDistributeLeads();
  const { enqueueSnackbar } = useSnackbar();
  const users = useUserDirectory(open);

  useEffect(() => {
    const allowed = distributionStrategyOptions(planCode).map((item) => item.value);
    if (!allowed.includes(strategy)) {
      setStrategy(allowed[0] ?? "manual");
    }
  }, [planCode, strategy]);

  const showsAdvancedUpsell = planCode === "ESSENTIAL" || planCode === "PROFESSIONAL";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Distribuição de Leads</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {leadIds?.length
            ? `${leadIds.length} lead(s) selecionado(s).`
            : "Aplica a todos os leads elegíveis conforme a estratégia."}
        </Typography>
        {showsAdvancedUpsell ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {planCode === "ESSENTIAL"
              ? `No plano ${planLabel("ESSENTIAL")} a distribuição é manual/Round Robin. Automática e por equipe no ${planLabel("PROFESSIONAL")}.`
              : `Redistribuição avançada de leads parados disponível no ${planLabel("ENTERPRISE")}.`}
            {" "}
            <Button component={Link} href="/#pricing" size="small" sx={{ ml: 0.5 }}>
              Ver planos
            </Button>
          </Alert>
        ) : null}
        <RadioGroup
          value={strategy}
          onChange={(e) => setStrategy(e.target.value as DistributionStrategy)}
        >          <Stack>
            {strategies.map((item) => (
              <FormControlLabel
                key={item.value}
                value={item.value}
                control={<Radio />}
                label={item.label}
              />
            ))}
          </Stack>
        </RadioGroup>
        {strategy === "manual" ? (
          <TextField
            select
            fullWidth
            label="Responsável"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            sx={{ mt: 2 }}
          >
            {(users.data || []).map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={distribute.isPending || (strategy === "manual" && !ownerId)}
          onClick={() =>
            distribute.mutate(
              { strategy, leadIds, ownerId: ownerId || undefined },
              {
                onSuccess: (res) => {
                  enqueueSnackbar(`${res.affected} leads processados`, { variant: "success" });
                  onClose();
                },
                onError: (err: unknown) => {
                  const message =
                    (err as { response?: { data?: { message?: string } } })?.response?.data
                      ?.message || "Falha ao distribuir";
                  enqueueSnackbar(message, { variant: "error" });
                },
              },
            )
          }
        >
          Aplicar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
