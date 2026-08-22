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
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSnackbar } from "notistack";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getApiError } from "@/lib/api/client";
import { mapApiPermissions } from "@/lib/auth/mappers";
import { Role, ROLE_NAMES, ROLE_PERMISSIONS, type Permission } from "@/lib/auth/permissions";
import { hasFeature } from "@/lib/billing/access";
import { canAddActiveUser, nextPlanForMoreUsers, usersLimitLabel } from "@/lib/billing/limits";
import { planLabel } from "@/lib/billing/plan-catalog";
import { queryKeys } from "@/lib/query/keys";
import { formatPhone } from "@/lib/utils/phone";
import { defaultPasswordFromName } from "@/lib/utils/password";
import { formatDate } from "@/lib/utils/format";
import { OrphanLeadsPanel } from "@/modules/admin/components/OrphanLeadsPanel";
import { ReassignLeadsOnDeleteDialog } from "@/modules/admin/components/ReassignLeadsOnDeleteDialog";
import { UserOrgTree } from "@/modules/admin/components/UserOrgTree";
import { UserPermissionsEditor } from "@/modules/admin/components/UserPermissionsEditor";
import { editablePermissions } from "@/modules/admin/permission-modules";
import {
  adminUserFormSchema,
  emptyAdminUserForm,
  type AdminUserFormValues,
} from "@/modules/admin/schemas";
import {
  createUser,
  fetchUser,
  fetchUserEffectivePermissions,
  fetchUsers,
  syncUserPermissionOverrides,
  updateUser,
  type AppUser,
} from "@/modules/admin/services";
import { useSession } from "@/modules/auth/hooks";

type SavePayload = {
  values: AdminUserFormValues;
  permissions: Permission[];
  syncPermissions: boolean;
};

type UsersTab = "list" | "tree";

export default function UsersPage() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const session = useSession();
  const meId = session.data?.id;
  const features = session.data?.features;
  const planCode = session.data?.subscription.planCode;
  const isAdmin = session.data?.role === Role.Administrador;
  const hasAdvancedPermissions =
    hasFeature(features, "advanced_permissions") ||
    planCode === "PROFESSIONAL" ||
    planCode === "ENTERPRISE";
  const canEditOverrides = isAdmin && hasAdvancedPermissions;
  const [tab, setTab] = useState<UsersTab>("list");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Permission[]>([]);
  const [permissionsDirty, setPermissionsDirty] = useState(false);
  const [roleAdjusted, setRoleAdjusted] = useState(false);

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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users,
    queryFn: fetchUsers,
  });

  const editDetailQuery = useQuery({
    queryKey: queryKeys.userDetail(editing?.id ?? ""),
    queryFn: () => fetchUser(editing!.id),
    enabled: Boolean(open && editing?.id),
  });

  const permissionsQuery = useQuery({
    queryKey: queryKeys.userPermissions(editing?.id ?? ""),
    queryFn: () => fetchUserEffectivePermissions(editing!.id),
    enabled: Boolean(open && editing && isAdmin),
  });

  const activeCount = data?.filter((u) => u.status === "Ativo").length ?? 0;
  const atUserLimit = !canAddActiveUser(features, activeCount);
  const upgradePlan = nextPlanForMoreUsers(planCode);
  const limitHint = usersLimitLabel(features, activeCount);
  const showPermissions = Boolean(editing && isAdmin && !createdPassword);
  const canSubmit = isValid && !editDetailQuery.isLoading;

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      reset(emptyAdminUserForm);
      setDraftPermissions([]);
      setPermissionsDirty(false);
      setRoleAdjusted(false);
      return;
    }
    const source = editDetailQuery.data ?? editing;
    reset({
      name: source.name,
      email: source.email,
      phone: formatPhone(source.phone || ""),
      role: source.role,
      team: source.team || "",
      status: source.status === "Inativo" ? "Inativo" : "Ativo",
    });
    setPermissionsDirty(false);
    setRoleAdjusted(false);
  }, [open, editing, editDetailQuery.data, reset]);

  useEffect(() => {
    if (!editing || !permissionsQuery.data || permissionsDirty || roleAdjusted) return;
    const fromApi = mapApiPermissions(permissionsQuery.data).filter((item) =>
      editablePermissions().includes(item),
    );
    setDraftPermissions(fromApi);
  }, [editing, permissionsQuery.data, permissionsDirty, roleAdjusted]);

  const save = useMutation({
    mutationFn: async ({ values, permissions, syncPermissions }: SavePayload) => {
      if (editing) {
        const user = await updateUser(editing.id, values);
        if (syncPermissions) {
          await syncUserPermissionOverrides(editing.id, permissions);
        }
        return { user, invitationToken: undefined as string | undefined };
      }
      const created = await createUser(values);
      return { user: created, invitationToken: created.invitationToken };
    },
    onSuccess: ({ invitationToken }, { values, syncPermissions }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      if (editing) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.userDetail(editing.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.userPermissions(editing.id) });
        enqueueSnackbar(
          syncPermissions ? "Usuário e permissões atualizados" : "Usuário atualizado",
          { variant: "success" },
        );
        setOpen(false);
        setEditing(null);
        reset(emptyAdminUserForm);
        setPermissionsDirty(false);
        setRoleAdjusted(false);
      } else {
        setCreatedEmail(values.email);
        setCreatedPassword(invitationToken || defaultPasswordFromName(values.name));
        enqueueSnackbar("Convite enviado", { variant: "success" });
      }
    },
    onError: (err: unknown) => {
      enqueueSnackbar(getApiError(err).message || "Falha ao salvar usuário", { variant: "error" });
    },
  });

  function submitForm(values: AdminUserFormValues) {
    save.mutate({
      values,
      permissions: draftPermissions,
      syncPermissions: Boolean(editing && canEditOverrides && permissionsDirty),
    });
  }
  async function afterUserDeactivated() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.userDirectory });
    await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    await queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.kanban });
    await refetch();
    setDeleteTarget(null);
  }

  function closeDialog() {
    setCreatedPassword(null);
    setCreatedEmail(null);
    setOpen(false);
    setEditing(null);
    reset(emptyAdminUserForm);
    setDraftPermissions([]);
    setPermissionsDirty(false);
    setRoleAdjusted(false);
  }

  function handlePermissionsChange(next: Permission[]) {
    setDraftPermissions(next);
    setPermissionsDirty(true);
  }

  function handleRoleChange(role: AdminUserFormValues["role"], onChange: (value: string) => void) {
    onChange(role);
    if (!editing || permissionsDirty) return;
    setRoleAdjusted(true);
    setDraftPermissions(
      ROLE_PERMISSIONS[role].filter((item) => editablePermissions().includes(item)),
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4">Gestão de Usuários</Typography>
          <Typography variant="body2" color="text.secondary">
            Colaboradores, cargos e convites — o token de convite é exibido uma única vez
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

      <Tabs
        value={tab}
        onChange={(_, value: UsersTab) => setTab(value)}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="list" label="Lista" />
        <Tab value="tree" label="Árvore" />
      </Tabs>

      {tab === "tree" ? (
        isLoading ? (
          <Box py={8} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : isError ? (
          <ErrorState
            error={error}
            resourceLabel="a lista de usuários da empresa"
            onRetry={() => refetch()}
          />
        ) : (
          <UserOrgTree users={(data || []).filter((user) => user.status !== "Inativo")} canManage={isAdmin} />
        )
      ) : isLoading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : isError ? (
        <ErrorState
          error={error}
          resourceLabel="a lista de usuários da empresa"
          onRetry={() => refetch()}
        />
      ) : (
        <Stack spacing={2.5}>
          <OrphanLeadsPanel />
          <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Telefone</TableCell>
                <TableCell>Cargo</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Criado em</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data || [])
                .filter((user) => user.status !== "Inativo")
                .map((user) => {
                const isSelf = user.id === meId;
                const canDeactivate = !isSelf && user.status === "Ativo" && !user.isOwner;
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
                      {user.isOwner ? (
                        <Typography component="span" variant="caption" color="primary.main">
                          {" "}
                          · owner
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {user.phone || "—"}
                    </TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <StatusBadge label={user.status} />
                        <Tooltip
                          title={
                            isSelf
                              ? "Você não pode inativar o próprio cadastro"
                              : user.isOwner
                                ? "O proprietário da empresa não pode ser desativado"
                                : user.status !== "Ativo"
                                  ? "Apenas usuários ativos podem ser desativados"
                                  : "Desativar usuário"
                          }
                        >
                          <span>
                            <Switch
                              size="small"
                              checked={user.status === "Ativo"}
                              disabled={!canDeactivate}
                              onChange={() => {
                                if (canDeactivate) {
                                  setDeleteTarget({ id: user.id, name: user.name });
                                }
                              }}
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
                      {canDeactivate ? (
                        <Tooltip title="Desativar">
                          <IconButton
                            size="small"
                            onClick={() => setDeleteTarget({ id: user.id, name: user.name })}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        </Stack>
      )}

      <Dialog
        open={open}
        onClose={closeDialog}
        fullWidth
        maxWidth={showPermissions ? "md" : "sm"}
        fullScreen={fullScreenDialog}
        scroll="paper"
      >
        <DialogTitle>
          {createdPassword ? "Usuário criado" : editing ? "Editar usuário" : "Novo usuário"}
        </DialogTitle>
        <DialogContent dividers={showPermissions}>
          {createdPassword ? (
            <Stack spacing={2} mt={1}>
              <Alert severity="success">Conta criada. Envie estas credenciais ao colaborador:</Alert>
              <Typography variant="body2">
                E-mail: <strong>{createdEmail}</strong>
              </Typography>
              <Typography variant="body2">
                Token de convite: <strong>{createdPassword}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Envie o token ao colaborador. No login, use <strong>Primeiro acesso</strong> para
                validar o convite e definir a senha.
              </Typography>
            </Stack>
          ) : editDetailQuery.isLoading && editing ? (
            <Box py={6} display="flex" justifyContent="center">
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Stack
              component="form"
              id="admin-user-form"
              spacing={2}
              mt={1}
              onSubmit={handleSubmit(submitForm)}
              noValidate
            >
              <TextField
                id="admin-user-name"
                label="Nome"
                fullWidth
                required
                {...register("name")}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
              <TextField
                id="admin-user-email"
                label="E-mail"
                type="email"
                fullWidth
                required
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
                    id="admin-user-phone"
                    label="Telefone"
                    fullWidth
                    required
                    inputMode="tel"
                    placeholder="(11) 98888-0000"
                    value={field.value}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={Boolean(errors.phone)}
                    helperText={errors.phone?.message}
                  />
                )}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      id="admin-user-role"
                      select
                      label="Cargo"
                      fullWidth
                      required
                      value={field.value}
                      onChange={(e) =>
                        handleRoleChange(
                          e.target.value as AdminUserFormValues["role"],
                          field.onChange,
                        )
                      }
                      onBlur={field.onBlur}
                      inputRef={field.ref}
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
                  id="admin-user-team"
                  label="Time"
                  fullWidth
                  required
                  {...register("team")}
                  error={Boolean(errors.team)}
                  helperText={errors.team?.message}
                />
              </Stack>
              {editing ? (
                <Typography variant="body2" color="text.secondary">
                  Criado em:{" "}
                  <strong>
                    {formatDate(editDetailQuery.data?.createdAt ?? editing.createdAt)}
                  </strong>
                </Typography>
              ) : null}
              {editing && editing.id !== meId ? (
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      id="admin-user-status"
                      select
                      label="Status"
                      fullWidth
                      required
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
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

              {showPermissions ? (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <UserPermissionsEditor
                    selected={draftPermissions}
                    onChange={handlePermissionsChange}
                    loading={permissionsQuery.isLoading}
                    disabled={save.isPending || !canEditOverrides}
                    planBlocked={!hasAdvancedPermissions}
                  />
                </>
              ) : null}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
          {createdPassword ? (
            <Button variant="contained" onClick={closeDialog}>
              Fechar
            </Button>
          ) : (
            <>
              <Button onClick={closeDialog}>Cancelar</Button>
              <Button
                type="submit"
                form={editDetailQuery.isLoading && editing ? undefined : "admin-user-form"}
                variant="contained"
                disabled={!canSubmit || save.isPending || (Boolean(editing) && editDetailQuery.isLoading)}
              >
                {save.isPending
                  ? "Salvando…"
                  : permissionsDirty && canEditOverrides
                    ? "Salvar usuário e permissões"
                    : "Salvar"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <ReassignLeadsOnDeleteDialog
        open={Boolean(deleteTarget)}
        userId={deleteTarget?.id ?? null}
        userName={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onCompleted={afterUserDeactivated}
      />
    </Stack>
  );
}
