"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api/client";
import { Role, ROLE_NAMES, type RoleName } from "@/lib/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import { useSession } from "@/modules/auth/hooks";
import { defaultPasswordFromName } from "@/lib/utils/password";

type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: RoleName;
  team: string;
  status: "Ativo" | "Inativo";
  mustChangePassword?: boolean;
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: Role.Comercial as RoleName,
  team: "Vendas",
  status: "Ativo" as "Ativo" | "Inativo",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const session = useSession();
  const meId = session.data?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const { data } = await api.get<{ data: AppUser[] }>("/users");
      return data.data;
    },
  });

  const previewPassword = form.name.trim()
    ? defaultPasswordFromName(form.name)
    : "Sobrenome" + new Date().getFullYear();

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { data } = await api.patch<AppUser>(`/users/${editing.id}`, form);
        return { user: data, temporaryPassword: undefined as string | undefined };
      }
      const { data } = await api.post<AppUser & { temporaryPassword?: string }>("/users", form);
      return { user: data, temporaryPassword: data.temporaryPassword };
    },
    onSuccess: ({ temporaryPassword }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      if (editing) {
        enqueueSnackbar("Usuário atualizado", { variant: "success" });
        setOpen(false);
        setEditing(null);
        setForm(emptyForm);
      } else {
        setCreatedPassword(temporaryPassword || previewPassword);
        enqueueSnackbar("Usuário criado", { variant: "success" });
      }
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Falha ao salvar usuário";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (user: AppUser) =>
      api.patch(`/users/${user.id}`, {
        status: user.status === "Ativo" ? "Inativo" : "Ativo",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      enqueueSnackbar("Status atualizado", { variant: "success" });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Não foi possível alterar o status";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      enqueueSnackbar("Usuário excluído", { variant: "success" });
      setDeleteId(null);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Não foi possível excluir";
      enqueueSnackbar(message, { variant: "error" });
    },
  });

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Gestão de Usuários</Typography>
          <Typography variant="body2" color="text.secondary">
            Colaboradores, cargos e status — senha inicial = sobrenome + ano
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setEditing(null);
            setForm(emptyForm);
            setCreatedPassword(null);
            setOpen(true);
          }}
        >
          + Novo Usuário
        </Button>
      </Stack>

      {isLoading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Cargo</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data || []).map((user) => {
                const isSelf = user.id === meId;
                return (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      {user.name}
                      {isSelf ? (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {" "}
                          (você)
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.team}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StatusBadge label={user.status} />
                        <Tooltip title={isSelf ? "Você não pode inativar o próprio cadastro" : ""}>
                          <span>
                            <Switch
                              size="small"
                              checked={user.status === "Ativo"}
                              disabled={isSelf || toggleStatus.isPending}
                              onChange={() => toggleStatus.mutate(user)}
                            />
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(user);
                          setCreatedPassword(null);
                          setForm({
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            role: user.role,
                            team: user.team,
                            status: user.status,
                          });
                          setOpen(true);
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <Tooltip title={isSelf ? "Você não pode excluir a si mesmo" : "Excluir"}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={isSelf}
                            onClick={() => setDeleteId(user.id)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={open}
        onClose={() => {
          if (createdPassword) {
            setCreatedPassword(null);
            setOpen(false);
            setForm(emptyForm);
            return;
          }
          setOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {createdPassword ? "Usuário criado" : editing ? "Editar usuário" : "Novo usuário"}
        </DialogTitle>
        <DialogContent>
          {createdPassword ? (
            <Stack spacing={2} mt={1}>
              <Alert severity="success">
                Conta criada. Envie estas credenciais ao colaborador:
              </Alert>
              <Typography variant="body2">
                E-mail: <strong>{form.email}</strong>
              </Typography>
              <Typography variant="body2">
                Senha temporária: <strong>{createdPassword}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Padrão: último sobrenome + ano atual. No primeiro acesso o usuário será solicitado a
                alterar a senha.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} mt={1}>
              <TextField label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth />
              <TextField label="E-mail" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} fullWidth />
              <TextField label="Telefone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} fullWidth />
              <TextField
                select
                label="Cargo"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as RoleName }))}
                fullWidth
              >
                {ROLE_NAMES.map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Time" value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))} fullWidth />
              {editing && editing.id !== meId ? (
                <TextField
                  select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "Ativo" | "Inativo" }))}
                  fullWidth
                >
                  <MenuItem value="Ativo">Ativo</MenuItem>
                  <MenuItem value="Inativo">Inativo</MenuItem>
                </TextField>
              ) : null}
              {!editing ? (
                <Alert severity="info">
                  Senha inicial prevista: <strong>{previewPassword}</strong>
                </Alert>
              ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {createdPassword ? (
            <Button
              variant="contained"
              onClick={() => {
                setCreatedPassword(null);
                setOpen(false);
                setForm(emptyForm);
              }}
            >
              Fechar
            </Button>
          ) : (
            <>
              <Button onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                variant="contained"
                disabled={!form.name || !form.email || save.isPending}
                onClick={() => save.mutate()}
              >
                Salvar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Excluir usuário"
        description="Esta ação remove o usuário do sistema. Continuar?"
        confirmLabel="Excluir"
        loading={remove.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </Stack>
  );
}
