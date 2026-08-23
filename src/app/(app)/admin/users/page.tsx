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
import { useEffect, useMemo, useState } from "react";
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
import {
  buildManagerExitDestinations,
  ReassignManagerExitDialog,
} from "@/modules/admin/components/ReassignManagerExitDialog";
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
import {
  ensureTeamNamed,
  fetchTeamsResilient,
  fetchTeamsWithMembers,
  findManagedTeamForUser,
  teamNameOptions,
  teamNamesInUse,
  updateTeam,
  upsertTeamMember,
  type CrmTeam,
} from "@/modules/admin/teams";
import { useSession } from "@/modules/auth/hooks";

type SavePayload = {
  values: AdminUserFormValues;
  permissions: Permission[];
  syncPermissions: boolean;
};

type UsersTab = "list" | "tree";

const CUSTOM_TEAM_VALUE = "__custom__";

type PendingManagerExit = {
  fromTeam: CrmTeam;
  managerName: string;
  collaboratorIds: string[];
  destinations: ReturnType<typeof buildManagerExitDestinations>;
  after: "deactivate" | "save";
  savePayload?: SavePayload;
};

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
  const [leadsReassignOpen, setLeadsReassignOpen] = useState(false);
  const [pendingManagerExit, setPendingManagerExit] = useState<PendingManagerExit | null>(null);
  const [teamSelectMode, setTeamSelectMode] = useState<"list" | "custom">("list");
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

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: async () => {
      const ownerId =
        data?.find((user) => user.isOwner)?.id ??
        data?.find((user) => user.role === Role.Administrador)?.id ??
        meId ??
        undefined;
      const result = await fetchTeamsResilient(ownerId);
      return result.teams
        .filter((team) => team.is_active)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    },
    enabled: Boolean(session.data) && (open || tab === "tree"),
  });

  const teamOptions = teamsQuery.data ?? [];
  const teamNames = useMemo(
    () => teamNameOptions(teamsQuery.data ?? []),
    [teamsQuery.data],
  );
  const ownerIdForTeams =
    data?.find((user) => user.isOwner)?.id ??
    data?.find((user) => user.role === Role.Administrador)?.id ??
    meId ??
    undefined;
  const usedTeamNames = useMemo(
    () => teamNamesInUse(teamsQuery.data ?? [], ownerIdForTeams),
    [teamsQuery.data, ownerIdForTeams],
  );

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
  const watchedTeam = watch("team");

  useEffect(() => {
    if (!open) return;
    if (!editing) {
      reset(emptyAdminUserForm);
      setDraftPermissions([]);
      setPermissionsDirty(false);
      setRoleAdjusted(false);
      setTeamSelectMode("list");
      return;
    }
    const source = editDetailQuery.data ?? editing;
    const names = teamNameOptions(teamsQuery.data ?? []);
    reset({
      name: source.name,
      email: source.email,
      phone: formatPhone(source.phone || ""),
      role: source.role,
      team: source.team || "",
      status: source.status === "Inativo" ? "Inativo" : "Ativo",
    });
    setTeamSelectMode(source.team && !names.includes(source.team) ? "custom" : "list");
    setPermissionsDirty(false);
    setRoleAdjusted(false);
  }, [open, editing, editDetailQuery.data, reset, teamsQuery.data]);

  useEffect(() => {
    if (!editing || !permissionsQuery.data || permissionsDirty || roleAdjusted) return;
    const fromApi = mapApiPermissions(permissionsQuery.data).filter((item) =>
      editablePermissions().includes(item),
    );
    setDraftPermissions(fromApi);
  }, [editing, permissionsQuery.data, permissionsDirty, roleAdjusted]);

  const save = useMutation({
    mutationFn: async ({ values, permissions, syncPermissions }: SavePayload) => {
      const ownerId =
        data?.find((user) => user.isOwner)?.id ??
        data?.find((user) => user.role === Role.Administrador)?.id ??
        meId ??
        undefined;
      const ensured = await ensureTeamNamed({ name: values.team, ownerId }).catch(() => null);
      const selectedTeam =
        ensured ??
        teamOptions.find((team) => team.name.toLowerCase() === values.team.trim().toLowerCase());

      if (editing) {
        const user = await updateUser(editing.id, values);
        if (syncPermissions) {
          await syncUserPermissionOverrides(editing.id, permissions);
        }
        if (selectedTeam && values.role !== Role.Administrador) {
          await upsertTeamMember(selectedTeam.id, {
            user_id: user.id,
            is_leader: values.role === Role.Gestor,
          }).catch(() => undefined);
        }
        if (values.role !== Role.Gestor || values.status === "Inativo") {
          const managed = await findManagedTeamForUser(editing.id, ownerId);
          if (managed && managed.collaboratorIds.length === 0) {
            await updateTeam(managed.team.id, { manager_user_id: null }).catch(() => undefined);
          }
        }
        return { user, invitationToken: undefined as string | undefined };
      }
      const created = await createUser(values);
      if (selectedTeam && values.role !== Role.Administrador) {
        await upsertTeamMember(selectedTeam.id, {
          user_id: created.id,
          is_leader: values.role === Role.Gestor,
        }).catch(() => undefined);
      }
      return { user: created, invitationToken: created.invitationToken };
    },
    onSuccess: ({ invitationToken }, { values, syncPermissions }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      void queryClient.invalidateQueries({ queryKey: queryKeys.teams });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orgTree });
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

  const canSubmit =
    isValid &&
    !editDetailQuery.isLoading &&
    !teamsQuery.isLoading &&
    !save.isPending &&
    Boolean(watchedTeam?.trim());

  async function maybeRequireManagerExit(params: {
    userId: string;
    userName: string;
    leavingManagerRole: boolean;
    after: PendingManagerExit["after"];
    savePayload?: SavePayload;
  }): Promise<boolean> {
    if (!params.leavingManagerRole) return false;
    const ownerId =
      data?.find((user) => user.isOwner)?.id ??
      data?.find((user) => user.role === Role.Administrador)?.id ??
      meId ??
      undefined;
    const managed = await findManagedTeamForUser(params.userId, ownerId);
    if (!managed || managed.collaboratorIds.length === 0) return false;

    const org = await fetchTeamsWithMembers(ownerId);
    const treeUsers = (data || []).filter((user) => user.status !== "Inativo");
    const owner = treeUsers.find((user) => user.isOwner) ?? null;
    const managers = org.teams
      .filter((team) => team.manager_user_id && team.manager_user_id !== owner?.id)
      .map((team) => {
        const manager = treeUsers.find((user) => user.id === team.manager_user_id);
        return manager ? { user: manager, team } : null;
      })
      .filter((item): item is { user: AppUser; team: CrmTeam } => Boolean(item));

    setPendingManagerExit({
      fromTeam: managed.team,
      managerName: params.userName,
      collaboratorIds: managed.collaboratorIds,
      destinations: buildManagerExitDestinations({
        owner,
        managers,
        excludeTeamId: managed.team.id,
      }),
      after: params.after,
      savePayload: params.savePayload,
    });
    return true;
  }

  async function submitForm(values: AdminUserFormValues) {
    const payload: SavePayload = {
      values,
      permissions: draftPermissions,
      syncPermissions: Boolean(editing && canEditOverrides && permissionsDirty),
    };
    if (editing) {
      const leavingManagerRole =
        values.status === "Inativo" ||
        (editing.role === Role.Gestor && values.role !== Role.Gestor);
      const blocked = await maybeRequireManagerExit({
        userId: editing.id,
        userName: editing.name,
        leavingManagerRole,
        after: "save",
        savePayload: payload,
      });
      if (blocked) return;
    }
    save.mutate(payload);
  }

  async function requestDeactivate(user: { id: string; name: string }) {
    setDeleteTarget(user);
    const ownerId =
      data?.find((item) => item.isOwner)?.id ??
      data?.find((item) => item.role === Role.Administrador)?.id ??
      meId ??
      undefined;
    const managed = await findManagedTeamForUser(user.id, ownerId);
    if (managed && managed.collaboratorIds.length > 0) {
      const blocked = await maybeRequireManagerExit({
        userId: user.id,
        userName: user.name,
        leavingManagerRole: true,
        after: "deactivate",
      });
      if (blocked) {
        setLeadsReassignOpen(false);
        return;
      }
    } else if (managed) {
      await updateTeam(managed.team.id, { manager_user_id: null }).catch(() => undefined);
    }
    setLeadsReassignOpen(true);
  }

  async function afterUserDeactivated() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.userDirectory });
    await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    await queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.kanban });
    await queryClient.invalidateQueries({ queryKey: queryKeys.orgTree });
    await queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    await refetch();
    setDeleteTarget(null);
    setLeadsReassignOpen(false);
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
    setTeamSelectMode("list");
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
                                  void requestDeactivate({ id: user.id, name: user.name });
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
                            onClick={() => void requestDeactivate({ id: user.id, name: user.name })}
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
                <Controller
                  name="team"
                  control={control}
                  render={({ field }) => {
                    const selectValue =
                      teamSelectMode === "custom"
                        ? CUSTOM_TEAM_VALUE
                        : field.value && teamNames.includes(field.value)
                          ? field.value
                          : field.value
                            ? CUSTOM_TEAM_VALUE
                            : "";
                    return (
                      <Stack spacing={1.5} sx={{ width: "100%" }}>
                        <TextField
                          id="admin-user-team"
                          select
                          label="Time"
                          fullWidth
                          required
                          value={selectValue}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next === CUSTOM_TEAM_VALUE) {
                              setTeamSelectMode("custom");
                              if (teamNames.includes(field.value)) field.onChange("");
                              return;
                            }
                            setTeamSelectMode("list");
                            field.onChange(next);
                          }}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          disabled={teamsQuery.isLoading}
                          error={Boolean(errors.team)}
                          helperText={
                            errors.team?.message ||
                            (teamsQuery.isLoading
                              ? "Carregando times…"
                              : "Escolha um time pré-definido ou adicione outro")
                          }
                        >
                          <MenuItem value="" disabled>
                            Selecione o time
                          </MenuItem>
                          {teamNames.map((name) => {
                            const inUse = usedTeamNames.has(name.toLowerCase());
                            return (
                              <MenuItem key={name} value={name}>
                                {name}
                                {inUse ? " · em uso" : ""}
                              </MenuItem>
                            );
                          })}
                          <MenuItem value={CUSTOM_TEAM_VALUE}>+ Adicionar time…</MenuItem>
                        </TextField>
                        {teamSelectMode === "custom" || selectValue === CUSTOM_TEAM_VALUE ? (
                          <TextField
                            id="admin-user-team-custom"
                            label="Nome do novo time"
                            fullWidth
                            required
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            error={Boolean(errors.team)}
                            helperText={errors.team?.message || "Será criado no CRM ao salvar"}
                          />
                        ) : null}
                      </Stack>
                    );
                  }}
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
        open={Boolean(deleteTarget) && leadsReassignOpen}
        userId={deleteTarget?.id ?? null}
        userName={deleteTarget?.name}
        onClose={() => {
          setDeleteTarget(null);
          setLeadsReassignOpen(false);
        }}
        onCompleted={afterUserDeactivated}
      />

      {pendingManagerExit ? (
        <ReassignManagerExitDialog
          open
          managerName={pendingManagerExit.managerName}
          fromTeam={pendingManagerExit.fromTeam}
          collaboratorIds={pendingManagerExit.collaboratorIds}
          destinations={pendingManagerExit.destinations}
          onClose={() => {
            setPendingManagerExit(null);
            if (pendingManagerExit.after === "deactivate") {
              setDeleteTarget(null);
              setLeadsReassignOpen(false);
            }
          }}
          onCompleted={async () => {
            const next = pendingManagerExit;
            setPendingManagerExit(null);
            await queryClient.invalidateQueries({ queryKey: queryKeys.orgTree });
            await queryClient.invalidateQueries({ queryKey: queryKeys.teams });
            if (next.after === "save" && next.savePayload) {
              save.mutate(next.savePayload);
              return;
            }
            if (next.after === "deactivate") {
              setLeadsReassignOpen(true);
            }
          }}
        />
      ) : null}
    </Stack>
  );
}
