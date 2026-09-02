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
import { Controller, useForm } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
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
  adminUserEditSchema,
  adminUserFormSchema,
  emptyAdminUserForm,
  type AdminUserFormValues,
} from "@/modules/admin/schemas";
import {
  createUser,
  fetchUserEffectivePermissions,
  fetchUsers,
  syncUserPermissionOverrides,
  updateUser,
  type AppUser,
} from "@/modules/admin/services";
import {
  ensureTeamNamed,
  fetchTeamsWithMembers,
  findManagedTeamForUser,
  matchTeamName,
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
  const sessionPermissions = session.data?.permissions ?? [];
  const canCreateUsers = isAdmin || sessionPermissions.includes("usuarios:criar");
  const canEditUsers = isAdmin || sessionPermissions.includes("usuarios:editar");
  const canDeactivateUsers = isAdmin || sessionPermissions.includes("usuarios:excluir");
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
  const [extraTeamNames, setExtraTeamNames] = useState<string[]>([]);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Permission[]>([]);
  const [permissionsDirty, setPermissionsDirty] = useState(false);
  const [roleAdjusted, setRoleAdjusted] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Ativo" | "Inativo">("all");
  const editingRef = useRef<AppUser | null>(null);
  editingRef.current = editing;

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<AdminUserFormValues>({
    resolver: async (values, context, options) => {
      const schema = editingRef.current ? adminUserEditSchema : adminUserFormSchema;
      return zodResolver(schema)(values, context, options);
    },
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
    staleTime: 0,
  });

  const teamsQuery = useQuery({
    queryKey: queryKeys.teams,
    queryFn: async () => {
      const ownerId =
        data?.find((user) => user.isOwner)?.id ??
        data?.find((user) => user.role === Role.Administrador)?.id ??
        meId ??
        undefined;
      const result = await fetchTeamsWithMembers(ownerId);
      return {
        teams: result.teams
          .filter((team) => team.is_active)
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        membersByTeamId: result.membersByTeamId,
      };
    },
    enabled: Boolean(session.data),
    staleTime: 0,
  });

  const teamOptions = teamsQuery.data?.teams ?? [];
  const membersByTeamId = teamsQuery.data?.membersByTeamId ?? {};
  const teamNames = useMemo(
    () => teamNameOptions(teamOptions, extraTeamNames),
    [teamOptions, extraTeamNames],
  );

  function commitTeamToList(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "";
    const canonical = matchTeamName(trimmed, teamNames) ?? trimmed;
    setExtraTeamNames((current) =>
      current.some((name) => name.toLowerCase() === canonical.toLowerCase())
        ? current
        : [...current, canonical],
    );
    setTeamSelectMode("list");
    return canonical;
  }

  const ownerIdForTeams =
    data?.find((user) => user.isOwner)?.id ??
    data?.find((user) => user.role === Role.Administrador)?.id ??
    meId ??
    undefined;
  const usedTeamNames = useMemo(
    () => teamNamesInUse(teamOptions, ownerIdForTeams),
    [teamOptions, ownerIdForTeams],
  );
  const activeUsers = useMemo(
    () => (data || []).filter((user) => user.status !== "Inativo"),
    [data],
  );
  const filteredUsers = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    const email = emailFilter.trim().toLowerCase();
    return (data || []).filter((user) => {
      if (statusFilter !== "all" && user.status !== statusFilter) return false;
      if (name && !user.name.toLowerCase().includes(name)) return false;
      if (email && !user.email.toLowerCase().includes(email)) return false;
      if (roleFilter && user.role !== roleFilter) return false;
      return true;
    });
  }, [data, nameFilter, emailFilter, roleFilter, statusFilter]);
  const hasActiveUserFilters = Boolean(
    nameFilter.trim() || emailFilter.trim() || roleFilter || statusFilter !== "all",
  );

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
    const names = teamNameOptions(teamOptions, extraTeamNames);
    reset({
      name: editing.name,
      email: editing.email,
      phone: formatPhone(editing.phone || ""),
      role: editing.role,
      team: editing.team || "",
      status: editing.status === "Inativo" ? "Inativo" : "Ativo",
    });
    setTeamSelectMode(editing.team && !matchTeamName(editing.team, names) ? "custom" : "list");
    setPermissionsDirty(false);
    setRoleAdjusted(false);
  }, [open, editing, reset]);

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
      const teamName = values.team.trim();
      const ensured = teamName
        ? await ensureTeamNamed({ name: teamName, ownerId }).catch(() => null)
        : null;
      const selectedTeam =
        ensured ??
        teamOptions.find((team) => team.name.toLowerCase() === teamName.toLowerCase());

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
          if (values.role === Role.Gestor) {
            const canTake =
              !selectedTeam.manager_user_id ||
              selectedTeam.manager_user_id === user.id ||
              selectedTeam.manager_user_id === ownerId;
            if (canTake) {
              await updateTeam(selectedTeam.id, { manager_user_id: user.id }).catch(() => undefined);
            }
          }
        }
        if (
          editing.role === Role.Gestor &&
          (values.role !== Role.Gestor || values.status === "Inativo")
        ) {
          const managed = await findManagedTeamForUser(editing.id, ownerId, teamOptions).catch(
            () => null,
          );
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
        if (values.role === Role.Gestor) {
          const canTake =
            !selectedTeam.manager_user_id ||
            selectedTeam.manager_user_id === created.id ||
            selectedTeam.manager_user_id === ownerId;
          if (canTake) {
            await updateTeam(selectedTeam.id, { manager_user_id: created.id }).catch(() => undefined);
          }
        }
      }
      return { user: created, invitationToken: created.invitationToken };
    },
    onSuccess: async ({ invitationToken }, { values, syncPermissions }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users }),
        queryClient.invalidateQueries({ queryKey: queryKeys.teams }),
      ]);
      if (editing) {
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

  const canSubmit = !save.isPending && (editing ? true : isValid && Boolean(watchedTeam?.trim()));

  async function maybeRequireManagerExit(params: {
    userId: string;
    userName: string;
    leavingManagerRole: boolean;
    after: PendingManagerExit["after"];
    savePayload?: SavePayload;
  }): Promise<boolean> {
    if (!params.leavingManagerRole) return false;
    try {
      const ownerId =
        data?.find((user) => user.isOwner)?.id ??
        data?.find((user) => user.role === Role.Administrador)?.id ??
        meId ??
        undefined;
      const managed = await findManagedTeamForUser(params.userId, ownerId, teamOptions);
      if (!managed || managed.collaboratorIds.length === 0) return false;

      const treeUsers = (data || []).filter((user) => user.status !== "Inativo");
      const owner = treeUsers.find((user) => user.isOwner) ?? null;
      const managers = teamOptions
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
    } catch {
      return false;
    }
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
      }).catch(() => false);
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
    const managed = await findManagedTeamForUser(user.id, ownerId, teamOptions);
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
    <Stack
      spacing={2.5}
      sx={{
        flex: 1,
        minHeight: 0,
        ...(tab === "tree" ? { overflow: "hidden", height: "100%" } : { overflow: "auto" }),
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2} flexShrink={0}>
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
        <Tooltip
          title={
            atUserLimit
              ? "Limite de usuários do plano atingido"
              : canCreateUsers
                ? ""
                : "Sem permissão para criar usuários"
          }
        >
          <span>
            <Button
              variant="contained"
              disabled={atUserLimit || !canCreateUsers}
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
        sx={{ borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Tab value="list" label="Lista" />
        <Tab value="tree" label="Árvore" />
      </Tabs>

      {tab === "tree" ? (
        isLoading ? (
          <Box py={8} display="flex" justifyContent="center" flex={1}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <ErrorState
            error={error}
            resourceLabel="a lista de usuários da empresa"
            onRetry={() => refetch()}
          />
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <UserOrgTree
              users={data || []}
              teams={teamOptions}
              membersByTeamId={membersByTeamId}
              teamsLoading={teamsQuery.isLoading}
              teamsError={teamsQuery.error}
              onRetryTeams={() => void teamsQuery.refetch()}
              canManage={isAdmin}
            />
          </Box>
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
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Nome"
              placeholder="Buscar por nome..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              sx={{ minWidth: 180, flex: 1 }}
            />
            <TextField
              size="small"
              label="E-mail"
              placeholder="Buscar por e-mail..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              sx={{ minWidth: 180, flex: 1 }}
            />
            <TextField
              select
              size="small"
              label="Cargo"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {ROLE_NAMES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "Ativo" | "Inativo")}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="Ativo">Ativo</MenuItem>
              <MenuItem value="Inativo">Inativo</MenuItem>
            </TextField>
            {hasActiveUserFilters ? (
              <Button
                size="small"
                onClick={() => {
                  setNameFilter("");
                  setEmailFilter("");
                  setRoleFilter("");
                  setStatusFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </Stack>
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
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum usuário encontrado com esses filtros.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                const isSelf = user.id === meId;
                const canDeactivate =
                  canDeactivateUsers && !isSelf && user.status === "Ativo" && !user.isOwner;
                return (
                  <TableRow
                    key={user.id}
                    hover
                    sx={user.status === "Inativo" ? { opacity: 0.72 } : undefined}
                  >
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
                                  : canDeactivateUsers
                                    ? "Desativar usuário"
                                    : "Sem permissão para desativar usuários"
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
                      {canEditUsers ? (
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
                      ) : null}
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
              })
              )}
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
                    required={!editing}
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
                    const matchedName = matchTeamName(field.value, teamNames);
                    const selectValue =
                      teamSelectMode === "custom"
                        ? CUSTOM_TEAM_VALUE
                        : matchedName
                          ? matchedName
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
                          required={!editing}
                          value={selectValue}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next === CUSTOM_TEAM_VALUE) {
                              setTeamSelectMode("custom");
                              if (matchTeamName(field.value, teamNames)) field.onChange("");
                              return;
                            }
                            setTeamSelectMode("list");
                            field.onChange(next);
                          }}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          error={Boolean(errors.team)}
                          helperText={
                            errors.team?.message ||
                            (teamsQuery.isLoading
                              ? "Carregando times da empresa…"
                              : teamsQuery.isError
                                ? "Não foi possível listar os times. Use um nome padrão ou adicione outro."
                                : "Times cadastrados na empresa — ou adicione outro")
                          }
                        >
                          <MenuItem value="">
                            {editing ? "Sem time" : "Selecione o time"}
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
                          <MenuItem value={CUSTOM_TEAM_VALUE}>+ Adicionar time</MenuItem>
                        </TextField>
                        {teamSelectMode === "custom" || selectValue === CUSTOM_TEAM_VALUE ? (
                          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                            <TextField
                              id="admin-user-team-custom"
                              label="Nome do novo time"
                              fullWidth
                              required
                              autoFocus
                              value={matchTeamName(field.value, teamNames) ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              onBlur={field.onBlur}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                const next = commitTeamToList(field.value);
                                if (next) field.onChange(next);
                              }}
                              error={Boolean(errors.team)}
                              helperText={
                                errors.team?.message || "O time entra na lista e é criado ao salvar"
                              }
                            />
                            <Button
                              type="button"
                              variant="outlined"
                              sx={{ mt: { sm: 0.5 }, whiteSpace: "nowrap", minHeight: 40 }}
                              disabled={!field.value.trim()}
                              onClick={() => {
                                const next = commitTeamToList(field.value);
                                if (next) field.onChange(next);
                              }}
                            >
                              Adicionar
                            </Button>
                          </Stack>
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
                    {formatDate(editing.createdAt)}
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
                form="admin-user-form"
                variant="contained"
                disabled={!canSubmit || save.isPending}
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
