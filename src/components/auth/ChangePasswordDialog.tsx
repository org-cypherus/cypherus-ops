"use client";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useSession } from "@/modules/auth/hooks";

export function ChangePasswordDialog() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const mustChange = Boolean(session.data?.mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const change = useMutation({
    mutationFn: async () => {
      await api.post("/me/change-password", { currentPassword, newPassword });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      enqueueSnackbar("Senha atualizada", { variant: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Não foi possível alterar a senha";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  return (
    <Dialog open={mustChange} disableEscapeKeyDown fullWidth maxWidth="xs">
      <DialogTitle>Alterar senha</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info">
            Você está usando uma senha temporária. Defina uma nova senha para continuar.
          </Alert>
          <TextField
            label="Senha atual (temporária)"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Confirmar nova senha"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={Boolean(confirm) && confirm !== newPassword}
            helperText={confirm && confirm !== newPassword ? "As senhas não conferem" : " "}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          disabled={
            change.isPending ||
            newPassword.length < 6 ||
            newPassword !== confirm ||
            !currentPassword
          }
          onClick={() => change.mutate()}
        >
          Salvar nova senha
        </Button>
      </DialogActions>
    </Dialog>
  );
}
