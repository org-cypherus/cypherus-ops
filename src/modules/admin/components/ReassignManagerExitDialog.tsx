"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { getApiError } from "@/lib/api/client";
import type { AppUser } from "@/modules/admin/services";
import {
  transferManagerCollaborators,
  type CrmTeam,
  type ManagerExitTarget,
} from "@/modules/admin/teams";

export type ManagerExitDestinationOption = {
  value: string;
  label: string;
  target: ManagerExitTarget;
};

type Props = {
  open: boolean;
  managerName: string;
  fromTeam: CrmTeam;
  collaboratorIds: string[];
  destinations: ManagerExitDestinationOption[];
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
};

export function ReassignManagerExitDialog({
  open,
  managerName,
  fromTeam,
  collaboratorIds,
  destinations,
  onClose,
  onCompleted,
}: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!open) setSelected("");
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const dest = destinations.find((item) => item.value === selected);
      if (!dest) throw new Error("Escolha um novo gestor ou o owner.");
      await transferManagerCollaborators({
        fromTeamId: fromTeam.id,
        collaboratorIds,
        target: dest.target,
      });
    },
    onSuccess: async () => {
      enqueueSnackbar("Colaboradores redistribuídos", { variant: "success" });
      await onCompleted();
      onClose();
    },
    onError: (error) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível redistribuir", {
        variant: "error",
      });
    },
  });

  const count = collaboratorIds.length;

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Redistribuir colaboradores</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="warning">
            <Typography variant="body2">
              <strong>{managerName}</strong> deixa o time <strong>{fromTeam.name}</strong> com{" "}
              {count} colaborador{count === 1 ? "" : "es"} vinculado{count === 1 ? "" : "s"}.
              Escolha um novo gestor ou mova para o owner.
            </Typography>
          </Alert>
          <TextField
            select
            fullWidth
            label="Destino"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {destinations.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={!selected || mutation.isPending || !destinations.length}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Salvando…" : "Confirmar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function buildManagerExitDestinations(params: {
  owner: AppUser | null;
  managers: Array<{ user: AppUser; team: CrmTeam }>;
  excludeTeamId: string;
}): ManagerExitDestinationOption[] {
  const options: ManagerExitDestinationOption[] = [];
  if (params.owner) {
    options.push({
      value: `owner:${params.owner.id}`,
      label: `${params.owner.name} · owner`,
      target: { kind: "owner", ownerId: params.owner.id },
    });
  }
  for (const node of params.managers) {
    if (node.team.id === params.excludeTeamId) continue;
    options.push({
      value: `manager:${node.team.id}`,
      label: `${node.user.name} · ${node.team.name}`,
      target: { kind: "manager", teamId: node.team.id },
    });
  }
  return options;
}
