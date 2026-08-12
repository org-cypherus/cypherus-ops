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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { api } from "@/lib/api/client";
import { ROLE_NAMES, type RoleName } from "@/lib/auth/permissions";
import { canAddActiveUser, nextPlanForMoreUsers, usersLimitLabel } from "@/lib/billing/limits";
import { planLabel } from "@/lib/billing/plan-catalog";
import { queryKeys } from "@/lib/query/keys";
import { formatPhone } from "@/lib/utils/phone";
import { defaultPasswordFromName } from "@/lib/utils/password";
import {
  adminUserFormSchema,
  emptyAdminUserForm,
  type AdminUserFormValues,
} from "@/modules/admin/schemas";
import { useSession } from "@/modules/auth/hooks";

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

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const session = useSession();
  const meId = session.data?.id;
  const features = session.data?.features;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<AdminUserFormValues>({
    resolver: zodResolver(adminUserFormSchema),
    mode: "onChange",
    defaultValues: emptyAdminUserForm,
  });

  const watchedName = watch("name");
  const previewPassword = watchedName?.trim()
    ? defaultPasswordFromName(watchedName)
    : "Sobrenome" + new Date().getFullYear();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const { data } = await api.get<{ data: AppUser[] }>("/users");
      return data.data;
    },
  });

  const activeCount = data?.filter((u) => u.status === "Ativo").length ?? 0;
  const atUserLimit = !canAddActiveUser(features, activeCount);
  const upgradePlan = nextPlanForMoreUsers(session.data?.subscription.planCode);
  const limitHint = usersLimitLabel(features, activeCount);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        name: editing.name,
        email: editing.email,
        phone: formatPhone(editing.phone),
        role: editing.role,
        team: editing.team,
        status: editing.status,
      });
    } else {
      reset(emptyAdminUserForm);
    }
  }, [open, editing, reset]);

  const save = useMutation({
    mutationFn: async (values: AdminUserFormValues) => {
      if (editing) {
        const { data } = await api.patch<AppUser>(`/users/${editing.id}`, values);
        return { user: data, temporaryPassword: undefined as string | undefined };
      }
      const { data } = await api.post<AppUser & { temporaryPassword?: string }>("/users", values);
      return { user: data, temporaryPassword: data.temporaryPassword };
    },
    onSuccess: ({ temporaryPassword }, values) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      if (editing) {
        enqueueSnackbar("Usuário atualizado", { variant: "success" });
        setOpen(false);
        setEditing(null);
        reset(emptyAdminUserForm);
      } else {
        setCreatedEmail(values.email);
        setCreatedPassword(temporaryPassword || defaultPasswordFromName(values.name));
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

  function closeDialog() {
    setCreatedPassword(null);
    setCreatedEmail(null);
    setOpen(false);
    setEditing(null);
    reset(emptyAdminUserForm);
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Gestão de Usuários</Typography>
          <Typography variant="body2" color="text.secondary">
            Colaboradores, cargos e status — senha inicial = sobrenome + ano
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {limitHint}
            {session.data?.subscription.planCode
              ? ` · plano ${planLabel(session.data.subscription.planCode)}`
              : ""}
          </Typography>
        </Box>
        <Tooltip title={atUserLimit ? "Limite de usuários do plano atingido" : ""}>
          <span>
            <Button
              variant="contained"
              disabled={atUserLimit}
              onClick={() => {
                setEditing(null);
                setCreatedPassword(null);
                setCreatedEmail(null);
                setOpen(true);
              }}
            >
              + Novo Usuário
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {atUserLimit ? (
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/#pricing" color="inherit" size="small">
              Ver planos
            </Button>
          }
        >
          {upgradePlan
            ? `Limite de usuários atingido — o plano ${planLabel(upgradePlan)} libera mais assentos para a equipe.`
            : "Limite de usuários atingido. Fale com o suporte para expandir a capacidade."}
        </Alert>
      ) : null}

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
                          setCreatedEmail(null);
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

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="sm">
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
                E-mail: <strong>{createdEmail}</strong>
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
            <Stack
              component="form"
              id="admin-user-form"
              spacing={2}
              mt={1}
              onSubmit={handleSubmit((values) => save.mutate(values))}
              noValidate
            >
              <TextField
                label="Nome"
                fullWidth
                {...register("name")}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
              <TextField
                label="E-mail"
                type="email"
                fullWidth
                autoComplete="email"
                {...register("email")}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Telefone"
                    fullWidth
                    inputMode="tel"
                    placeholder="(11) 98888-0000"
                    value={field.value}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    onBlur={field.onBlur}
                    error={Boolean(errors.phone)}
                    helperText={errors.phone?.message}
                  />
                )}
              />
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Cargo"
                    fullWidth
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={Boolean(errors.role)}
                    helperText={errors.role?.message}
                  >
                    {ROLE_NAMES.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label="Time"
                fullWidth
                {...register("team")}
                error={Boolean(errors.team)}
                helperText={errors.team?.message}
              />
              {editing && editing.id !== meId ? (
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      select
                      label="Status"
                      fullWidth
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      error={Boolean(errors.status)}
                      helperText={errors.status?.message}
                    >
                      <MenuItem value="Ativo">Ativo</MenuItem>
                      <MenuItem value="Inativo">Inativo</MenuItem>
                    </TextField>
                  )}
                />
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
            <Button variant="contained" onClick={closeDialog}>
              Fechar
            </Button>
          ) : (
            <>
              <Button onClick={closeDialog}>Cancelar</Button>
              <Button
                type="submit"
                form="admin-user-form"
                variant="contained"
                disabled={!isValid || save.isPending}
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
