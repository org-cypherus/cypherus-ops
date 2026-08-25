"use client";

import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getApiError } from "@/lib/api/client";
import { isUserNotFound } from "@/lib/api/errors";
import { queryKeys } from "@/lib/query/keys";
import type { AppUser } from "@/modules/admin/services";
import { OrgPersonNode } from "@/modules/admin/components/OrgHierarchyChart";
import { OrgTreeBlueprintView } from "@/modules/admin/components/OrgTreeLayouts";
import {
  buildManagerExitDestinations,
  ReassignManagerExitDialog,
} from "@/modules/admin/components/ReassignManagerExitDialog";
import {
  assignCollaboratorToManager,
  buildOrgTree,
  fetchTeamsWithMembers,
  linkManagerToOrg,
  loadExtraTeamNames,
  matchTeamName,
  rememberTeamName,
  removeTeamMember,
  teamNameOptions,
  teamNamesInUse,
  updateTeam,
  type CrmTeam,
  type OrgTreeManagerNode,
} from "@/modules/admin/teams";

type Props = {
  users: AppUser[];
  canManage: boolean;
};

type DialogMode =
  | { type: "link-manager" }
  | { type: "add-collaborator"; manager: OrgTreeManagerNode }
  | { type: "move-collaborator"; userId: string; fromTeamId: string }
  | { type: "change-manager"; manager: OrgTreeManagerNode }
  | null;

type PendingRemoveManager = {
  manager: OrgTreeManagerNode;
  collaboratorIds: string[];
};

const CUSTOM_TEAM_VALUE = "__custom__";

export function UserOrgTree({ users, canManage }: Props) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState<string[]>([]);
  const [selectedTeamName, setSelectedTeamName] = useState("");
  const [customTeamName, setCustomTeamName] = useState("");
  const [extraTeamNames, setExtraTeamNames] = useState<string[]>([]);
  const [pendingRemove, setPendingRemove] = useState<PendingRemoveManager | null>(null);

  const ownerId =
    users.find((user) => user.isOwner)?.id ??
    users.find((user) => user.role === "Administrador" && user.status === "Ativo")?.id;

  const orgQuery = useQuery({
    queryKey: [...queryKeys.orgTree, ownerId ?? "none"] as const,
    queryFn: () => fetchTeamsWithMembers(ownerId),
    placeholderData: (previous) => previous,
  });

  const tree = useMemo(() => {
    if (!orgQuery.data) {
      return buildOrgTree(users, [], {});
    }
    return buildOrgTree(users, orgQuery.data.teams, orgQuery.data.membersByTeamId);
  }, [orgQuery.data, users]);

  const teamOptions = useMemo(
    () => teamNameOptions(orgQuery.data?.teams ?? [], extraTeamNames),
    [orgQuery.data?.teams, extraTeamNames],
  );

  useEffect(() => {
    setExtraTeamNames(loadExtraTeamNames());
  }, [dialog]);

  const usedTeamNames = useMemo(
    () => teamNamesInUse(orgQuery.data?.teams ?? [], tree.owner?.id),
    [orgQuery.data?.teams, tree.owner?.id],
  );
  const memberNotices = useMemo(() => {
    const byTeam = orgQuery.data?.messagesByTeamId ?? {};
    return Array.from(new Set(Object.values(byTeam).filter(Boolean)));
  }, [orgQuery.data?.messagesByTeamId]);

  const invalidateOrg = async () => {
    // Recarrega mesclando com o snapshot local — não deixa a UI “apagar” a árvore.
    await queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    await queryClient.refetchQueries({ queryKey: [...queryKeys.orgTree, ownerId ?? "none"] });
  };

  const resolvedTeamName =
    selectedTeamName === CUSTOM_TEAM_VALUE ? customTeamName.trim() : selectedTeamName.trim();

  const mutation = useMutation({
    mutationFn: async (): Promise<
      | { kind: "linked"; team: CrmTeam; manager: AppUser }
      | { kind: "ok" }
    > => {
      if (!dialog) return { kind: "ok" };
      if (dialog.type === "link-manager") {
        const manager = users.find((user) => user.id === selectedUserId);
        if (!manager || !tree.owner) throw new Error("Selecione um gestor.");
        if (!resolvedTeamName) throw new Error("Selecione ou informe o time.");
        const team = await linkManagerToOrg({
          ownerId: tree.owner.id,
          manager,
          teamName: resolvedTeamName,
        });
        return { kind: "linked", team, manager };
      }
      if (dialog.type === "add-collaborator") {
        if (!selectedCollaboratorIds.length) {
          throw new Error("Selecione ao menos um colaborador.");
        }
        for (const collaboratorId of selectedCollaboratorIds) {
          await assignCollaboratorToManager({
            collaboratorId,
            managerTeamId: dialog.manager.team.id,
            previousTeamId: null,
          });
        }
        return { kind: "ok" };
      }
      if (dialog.type === "move-collaborator") {
        if (!selectedUserId) throw new Error("Selecione o time/gestor de destino.");
        await assignCollaboratorToManager({
          collaboratorId: dialog.userId,
          managerTeamId: selectedUserId,
          previousTeamId: dialog.fromTeamId,
        });
        return { kind: "ok" };
      }
      if (dialog.type === "change-manager") {
        if (!selectedUserId) throw new Error("Selecione o novo gestor.");
        if (selectedUserId === dialog.manager.user.id) return { kind: "ok" };
        await updateTeam(dialog.manager.team.id, { manager_user_id: selectedUserId });
        return { kind: "ok" };
      }
      return { kind: "ok" };
    },
    onSuccess: async (result) => {
      enqueueSnackbar("Organograma salvo", { variant: "success" });
      setSelectedUserId("");
      setSelectedCollaboratorIds([]);
      setSelectedTeamName("");
      setCustomTeamName("");
      // Snapshot local já foi atualizado nas mutações; refetch garante UI + persistência.
      await invalidateOrg();

      if (result.kind === "linked") {
        const node: OrgTreeManagerNode = {
          kind: "manager",
          user: result.manager,
          team: result.team,
          collaborators: [],
        };
        setDialog({ type: "add-collaborator", manager: node });
        return;
      }
      setDialog(null);
    },
    onError: (error) => {
      enqueueSnackbar(getApiError(error).message || "Não foi possível atualizar o organograma", {
        variant: "error",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      removeTeamMember(teamId, userId),
    onSuccess: async () => {
      enqueueSnackbar("Colaborador removido do time", { variant: "info" });
      await invalidateOrg();
    },
    onError: (error) => {
      enqueueSnackbar(getApiError(error).message || "Falha ao remover do time", { variant: "error" });
    },
  });

  const removeManagerMutation = useMutation({
    mutationFn: async (node: OrgTreeManagerNode) => {
      const collaboratorIds = node.collaborators.map((item) => item.user.id);
      if (collaboratorIds.length > 0) {
        throw new Error("REDISTRIBUTE_REQUIRED");
      }
      await updateTeam(node.team.id, { manager_user_id: null });
      await removeTeamMember(node.team.id, node.user.id).catch(() => undefined);
    },
    onSuccess: async () => {
      enqueueSnackbar("Gestor desvinculado", { variant: "info" });
      await invalidateOrg();
    },
    onError: (error, node) => {
      if (error instanceof Error && error.message === "REDISTRIBUTE_REQUIRED") {
        setPendingRemove({
          manager: node,
          collaboratorIds: node.collaborators.map((item) => item.user.id),
        });
        return;
      }
      enqueueSnackbar(getApiError(error).message || "Falha ao remover gestor", {
        variant: "error",
      });
    },
  });

  function findTeamIdForUser(userId: string): string | null {
    for (const collab of tree.ownerCollaborators) {
      if (collab.user.id === userId) return collab.teamId;
    }
    for (const node of tree.managers) {
      if (node.collaborators.some((item) => item.user.id === userId)) {
        return node.team.id;
      }
    }
    return null;
  }

  function openLinkManager() {
    setSelectedUserId("");
    setSelectedTeamName(
      teamOptions.find((name) => !usedTeamNames.has(name.toLowerCase())) ?? CUSTOM_TEAM_VALUE,
    );
    setCustomTeamName("");
    setDialog({ type: "link-manager" });
  }

  const candidatesForManager = users.filter(
    (user) =>
      user.status === "Ativo" &&
      !user.isOwner &&
      user.id !== tree.owner?.id &&
      !tree.managers.some((node) => node.user.id === user.id),
  );

  const candidatesForCollaborator = (managerId: string) =>
    tree.unassigned.filter(
      (user) =>
        user.status === "Ativo" &&
        !user.isOwner &&
        user.id !== managerId &&
        !tree.managers.some((node) => node.user.id === user.id),
    );

  function toggleCollaborator(userId: string) {
    setSelectedCollaboratorIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function openAddCollaborator(manager: OrgTreeManagerNode) {
    setSelectedUserId("");
    setSelectedCollaboratorIds([]);
    setDialog({ type: "add-collaborator", manager });
  }

  const canConfirmDialog =
    dialog?.type === "link-manager"
      ? Boolean(selectedUserId && resolvedTeamName) && !mutation.isPending
      : dialog?.type === "add-collaborator"
        ? selectedCollaboratorIds.length > 0 && !mutation.isPending
        : Boolean(selectedUserId) && !mutation.isPending;

  if (orgQuery.isLoading && !tree.owner) {
    return (
      <Box py={6} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (orgQuery.isError && !(tree.owner && isUserNotFound(getApiError(orgQuery.error)))) {
    return (
      <ErrorState
        error={orgQuery.error}
        resourceLabel="o organograma de times"
        onRetry={() => orgQuery.refetch()}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Organograma
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hierarquia Owner → gestores → colaboradores
          </Typography>
        </Box>
        {canManage && tree.owner ? (
          <Button
            variant="outlined"
            startIcon={<PersonAddAlt1OutlinedIcon />}
            onClick={openLinkManager}
            disabled={!candidatesForManager.length}
          >
            Vincular gestor
          </Button>
        ) : null}
      </Stack>

      {memberNotices.map((notice) => (
        <Alert key={notice} severity="info">
          {notice}
        </Alert>
      ))}

      {!tree.owner ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum administrador owner encontrado para a raiz do organograma.
        </Typography>
      ) : (
        <OrgTreeBlueprintView
          tree={tree}
          hideEmptyHint={memberNotices.length > 0}
          actions={{
            canManage,
            onAddCollaborator: openAddCollaborator,
            onChangeManager: (manager) => {
              setSelectedUserId(manager.user.id);
              setDialog({ type: "change-manager", manager });
            },
            onRemoveManager: (manager) => removeManagerMutation.mutate(manager),
            onMoveCollaborator: (userId, fromTeamId) => {
              setSelectedUserId("");
              setDialog({ type: "move-collaborator", userId, fromTeamId });
            },
            onRemoveCollaborator: (teamId, userId) => removeMutation.mutate({ teamId, userId }),
            removingMember: removeMutation.isPending,
            removingManager: removeManagerMutation.isPending,
          }}
        />
      )}

      <Divider />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Sem vínculo
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Usuários ativos que ainda não estão no organograma
        </Typography>
        {tree.unassigned.length ? (
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
            sx={{
              p: 2,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              borderStyle: "dashed",
            }}
          >
            {tree.unassigned.map((user) => (
              <OrgPersonNode key={user.id} size={56} name={user.name} subtitle={user.role} />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Todos os usuários ativos estão na árvore.
          </Typography>
        )}
      </Box>

      <Dialog
        open={Boolean(dialog)}
        onClose={() => {
          if (mutation.isPending) return;
          setDialog(null);
          setSelectedUserId("");
          setSelectedCollaboratorIds([]);
          setSelectedTeamName("");
          setCustomTeamName("");
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {dialog?.type === "link-manager"
            ? "Vincular gestor"
            : dialog?.type === "add-collaborator"
              ? "Adicionar colaboradores"
              : dialog?.type === "move-collaborator"
                ? "Mover colaborador"
                : dialog?.type === "change-manager"
                  ? "Trocar gestor do time"
                  : "Organograma"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {dialog?.type === "link-manager" ? (
              <>
                <TextField
                  select
                  fullWidth
                  label="Gestor"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {candidatesForManager.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} · {user.role}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label="Time"
                  value={selectedTeamName}
                  onChange={(e) => setSelectedTeamName(e.target.value)}
                  helperText="Comercial, Gestor, Operação e Marketing — ou adicione outro time"
                >
                  {teamOptions.map((name) => {
                    const inUse = usedTeamNames.has(name.toLowerCase());
                    return (
                      <MenuItem key={name} value={name} disabled={inUse}>
                        {name}
                        {inUse ? " · em uso" : ""}
                      </MenuItem>
                    );
                  })}
                  <MenuItem value={CUSTOM_TEAM_VALUE}>+ Adicionar time</MenuItem>
                </TextField>
                {selectedTeamName === CUSTOM_TEAM_VALUE ? (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
                    <TextField
                      fullWidth
                      label="Nome do novo time"
                      value={customTeamName}
                      onChange={(e) => setCustomTeamName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        const next = customTeamName.trim();
                        if (!next) return;
                        const canonical = matchTeamName(next, teamOptions) ?? next;
                        rememberTeamName(canonical);
                        setExtraTeamNames(loadExtraTeamNames());
                        setSelectedTeamName(canonical);
                        setCustomTeamName("");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outlined"
                      sx={{ mt: { sm: 0.5 }, whiteSpace: "nowrap", minHeight: 40 }}
                      disabled={!customTeamName.trim()}
                      onClick={() => {
                        const next = customTeamName.trim();
                        if (!next) return;
                        const canonical = matchTeamName(next, teamOptions) ?? next;
                        rememberTeamName(canonical);
                        setExtraTeamNames(loadExtraTeamNames());
                        setSelectedTeamName(canonical);
                        setCustomTeamName("");
                      }}
                    >
                      Adicionar
                    </Button>
                  </Stack>
                ) : null}
              </>
            ) : null}

            {dialog?.type === "add-collaborator" ? (
              <>
                <Alert severity="info">
                  Selecione um ou mais usuários sem vínculo para o time de{" "}
                  <strong>{dialog.manager.user.name}</strong> ({dialog.manager.team.name}).
                </Alert>
                {candidatesForCollaborator(dialog.manager.user.id).length ? (
                  <Stack
                    spacing={0.5}
                    sx={{
                      maxHeight: 280,
                      overflowY: "auto",
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      px: 1.5,
                      py: 0.5,
                    }}
                  >
                    {candidatesForCollaborator(dialog.manager.user.id).map((user) => (
                      <FormControlLabel
                        key={user.id}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedCollaboratorIds.includes(user.id)}
                            onChange={() => toggleCollaborator(user.id)}
                          />
                        }
                        label={
                          <Typography variant="body2">
                            {user.name} · {user.role}
                          </Typography>
                        }
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Não há usuários sem vínculo disponíveis para adicionar.
                  </Typography>
                )}
              </>
            ) : null}

            {dialog?.type === "move-collaborator" ? (
              <TextField
                select
                fullWidth
                label="Novo gestor / time"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {tree.managers
                  .filter((node) => node.team.id !== dialog.fromTeamId)
                  .map((node) => (
                    <MenuItem key={node.team.id} value={node.team.id}>
                      {node.user.name} · {node.team.name}
                    </MenuItem>
                  ))}
                {tree.owner && tree.rootTeam ? (
                  <MenuItem value={tree.rootTeam.id}>
                    {tree.owner.name} · owner
                  </MenuItem>
                ) : null}
              </TextField>
            ) : null}

            {dialog?.type === "change-manager" ? (
              <TextField
                select
                fullWidth
                label="Novo gestor"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users
                  .filter((user) => user.status === "Ativo" && !user.isOwner)
                  .map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name} · {user.role}
                    </MenuItem>
                  ))}
              </TextField>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialog(null);
              setSelectedUserId("");
              setSelectedCollaboratorIds([]);
              setSelectedTeamName("");
              setCustomTeamName("");
            }}
            disabled={mutation.isPending}
          >
            {dialog?.type === "add-collaborator" ? "Fechar" : "Cancelar"}
          </Button>
          <Button
            variant="contained"
            disabled={
              !canConfirmDialog ||
              (dialog?.type === "add-collaborator" &&
                !candidatesForCollaborator(dialog.manager.user.id).length)
            }
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Salvando…"
              : dialog?.type === "add-collaborator"
                ? `Adicionar${selectedCollaboratorIds.length ? ` (${selectedCollaboratorIds.length})` : ""}`
                : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

      {pendingRemove ? (
        <ReassignManagerExitDialog
          open
          managerName={pendingRemove.manager.user.name}
          fromTeam={pendingRemove.manager.team}
          collaboratorIds={pendingRemove.collaboratorIds}
          destinations={buildManagerExitDestinations({
            owner: tree.owner,
            managers: tree.managers,
            excludeTeamId: pendingRemove.manager.team.id,
          })}
          onClose={() => setPendingRemove(null)}
          onCompleted={async () => {
            await removeTeamMember(
              pendingRemove.manager.team.id,
              pendingRemove.manager.user.id,
            ).catch(() => undefined);
            setPendingRemove(null);
            await invalidateOrg();
          }}
        />
      ) : null}
    </Stack>
  );
}
