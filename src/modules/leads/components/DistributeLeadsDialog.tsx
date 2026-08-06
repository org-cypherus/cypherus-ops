"use client";

import {
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
import { useQuery } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useDistributeLeads } from "../hooks";

const strategies = [
  { value: "manual", label: "Manual" },
  { value: "round_robin", label: "Round Robin" },
  { value: "team", label: "Distribuição por equipe" },
  { value: "automatic", label: "Distribuição automática" },
  { value: "redistribute", label: "Redistribuição (leads parados)" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  leadIds?: string[];
};

export function DistributeLeadsDialog({ open, onClose, leadIds }: Props) {
  const [strategy, setStrategy] = useState("round_robin");
  const [ownerId, setOwnerId] = useState("");
  const distribute = useDistributeLeads();
  const { enqueueSnackbar } = useSnackbar();
  const users = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const { data } = await api.get<{ data: Array<{ id: string; name: string; role: string }> }>("/users");
      return data.data.filter((u) => u.role === "Comercial" || u.role === "Gestor");
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Distribuição de Leads</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {leadIds?.length
            ? `${leadIds.length} lead(s) selecionado(s).`
            : "Aplica a todos os leads elegíveis conforme a estratégia."}
        </Typography>
        <RadioGroup value={strategy} onChange={(e) => setStrategy(e.target.value)}>
          <Stack>
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
