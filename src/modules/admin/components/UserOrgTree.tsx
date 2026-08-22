"use client";

import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import {
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
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import { useMemo, useState, type ReactNode } from "react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { getApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { AppUser } from "@/modules/admin/services";
import {
  assignCollaboratorToManager,
  buildOrgTree,
  ensureRootTeam,
  fetchTeamsWithMembers,
  linkManagerToOrg,
  removeTeamMember,
  updateTeam,
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

function NodeCard({
  title,
  subtitle,
  badge,
  actions,
  depth = 0,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: ReactNode;
  depth?: number;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        ml: { xs: 0, sm: depth * 2.5 },
        borderLeftWidth: depth > 0 ? 3 : 1,
        borderLeftColor: depth === 0 ? "divider" : depth === 1 ? "primary.main" : "secondary.main",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
        <Box minWidth={0}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography fontWeight={700} noWrap>
              {title}
            </Typography>
            {badge ? <StatusBadge label={badge} /> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        </Box>
        {actions ? (
          <Stack direction="row" spacing={0.5} flexShrink={0}>
            {actions}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function UserOrgTree({ users, canManage }: Props) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [selectedUserId, setSelectedUserId] = useState("");

  const ownerId = users.find((user) => user.isOwner)?.id;

  const orgQuery = useQuery({
    queryKey: [...queryKeys.orgTree, ownerId ?? "none"] as const,
    queryFn: async () => {
      if (ownerId) await ensureRootTeam(ownerId);
      return fetchTeamsWithMembers();
    },
  });

  const tree = useMemo(() => {
    if (!orgQuery.data) {
      return buildOrgTree(users, [], {});
    }
    return buildOrgTree(users, orgQuery.data.teams, orgQuery.data.membersByTeamId);
  }, [orgQuery.data, users]);

  const invalidateOrg = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.teams });
    await queryClient.invalidateQueries({ queryKey: queryKeys.orgTree });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!dialog) return;
      if (dialog.type === "link-manager") {
        const manager = users.find((user) => user.id === selectedUserId);
        if (!manager || !tree.owner) throw new Error("Selecione um gestor.");
        await linkManagerToOrg({ ownerId: tree.owner.id, manager });
        return;
      }
      if (dialog.type === "add-collaborator") {
        if (!selectedUserId) throw new Error("Selecione um colaborador.");
        const previous = findTeamIdForUser(selectedUserId);
        await assignCollaboratorToManager({
          collaboratorId: selectedUserId,
          managerTeamId: dialog.manager.team.id,
          previousTeamId: previous,
        });
        return;
      }
      if (dialog.type === "move-collaborator") {
        if (!selectedUserId) throw new Error("Selecione o time/gestor de destino.");
        await assignCollaboratorToManager({
          collaboratorId: dialog.userId,
          managerTeamId: selectedUserId,
          previousTeamId: dialog.fromTeamId,
        });
        return;
      }
      if (dialog.type === "change-manager") {
        if (!selectedUserId) throw new Error("Selecione o novo gestor.");
        await updateTeam(dialog.manager.team.id, { manager_user_id: selectedUserId });
      }
    },
    onSuccess: async () => {
      enqueueSnackbar("Organograma atualizado", { variant: "success" });
      setDialog(null);
      setSelectedUserId("");
      await invalidateOrg();
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

  function findTeamIdForUser(userId: string): string | null {
    for (const node of tree.managers) {
      if (node.collaborators.some((item) => item.user.id === userId)) {
        return node.team.id;
      }
    }
    return null;
  }

  const candidatesForManager = users.filter(
    (user) =>
      user.status === "Ativo" &&
      !user.isOwner &&
      user.id !== tree.owner?.id &&
      !tree.managers.some((node) => node.user.id === user.id),
  );

  const candidatesForCollaborator = (managerId: string) =>
    users.filter(
      (user) =>
        user.status === "Ativo" &&
        !user.isOwner &&
        user.id !== managerId &&
        !tree.managers.some((node) => node.user.id === user.id),
    );

  if (orgQuery.isLoading) {
    return (
      <Box py={6} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (orgQuery.isError) {
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
            Owner → gestores → colaboradores (via times do CRM)
          </Typography>
        </Box>
        {canManage && tree.owner ? (
          <Button
            variant="outlined"
            startIcon={<PersonAddAlt1OutlinedIcon />}
            onClick={() => {
              setSelectedUserId("");
              setDialog({ type: "link-manager" });
            }}
            disabled={!candidatesForManager.length}
          >
            Vincular gestor
          </Button>
        ) : null}
      </Stack>

      {!tree.owner ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum administrador owner encontrado para a raiz do organograma.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          <NodeCard
            depth={0}
            title={tree.owner.name}
            subtitle={`${tree.owner.role} · owner`}
            badge={tree.owner.status}
            actions={
              <Tooltip title="Raiz do organograma">
                <AccountTreeOutlinedIcon color="action" fontSize="small" />
              </Tooltip>
            }
          />

          {tree.managers.map((node) => (
            <Stack key={node.team.id} spacing={1}>
              <NodeCard
                depth={1}
                title={node.user.name}
                subtitle={`${node.user.role} · gestor · ${node.team.name}`}
                badge={node.user.status}
                actions={
                  canManage ? (
                    <>
                      <Tooltip title="Adicionar colaborador">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedUserId("");
                            setDialog({ type: "add-collaborator", manager: node });
                          }}
                        >
                          <PersonAddAlt1OutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Trocar gestor do time">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedUserId(node.user.id);
                            setDialog({ type: "change-manager", manager: node });
                          }}
                        >
                          <SwapHorizOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : null
                }
              />
              {node.collaborators.map((collab) => (
                <NodeCard
                  key={`${node.team.id}-${collab.user.id}`}
                  depth={2}
                  title={collab.user.name}
                  subtitle={`${collab.user.role} · colaborador`}
                  badge={collab.user.status}
                  actions={
                    canManage ? (
                      <>
                        <Tooltip title="Mover para outro gestor">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUserId("");
                              setDialog({
                                type: "move-collaborator",
                                userId: collab.user.id,
                                fromTeamId: collab.teamId,
                              });
                            }}
                          >
                            <SwapHorizOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() =>
                            removeMutation.mutate({
                              teamId: collab.teamId,
                              userId: collab.user.id,
                            })
                          }
                          disabled={removeMutation.isPending}
                        >
                          Remover
                        </Button>
                      </>
                    ) : null
                  }
                />
              ))}
              {!node.collaborators.length ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: { xs: 1, sm: 5 } }}
                >
                  Nenhum colaborador neste time
                </Typography>
              ) : null}
            </Stack>
          ))}

          {!tree.managers.length ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum gestor vinculado. Use “Vincular gestor” para criar o time sob o owner.
            </Typography>
          ) : null}
        </Stack>
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
          <Stack spacing={1}>
            {tree.unassigned.map((user) => (
              <NodeCard
                key={user.id}
                title={user.name}
                subtitle={`${user.role} · ${user.email}`}
                badge={user.status}
              />
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
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {dialog?.type === "link-manager"
            ? "Vincular gestor"
            : dialog?.type === "add-collaborator"
              ? "Adicionar colaborador"
              : dialog?.type === "move-collaborator"
                ? "Mover colaborador"
                : dialog?.type === "change-manager"
                  ? "Trocar gestor do time"
                  : "Organograma"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {dialog?.type === "link-manager" ? (
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
            ) : null}

            {dialog?.type === "add-collaborator" ? (
              <TextField
                select
                fullWidth
                label="Colaborador"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {candidatesForCollaborator(dialog.manager.user.id).map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name} · {user.role}
                    {findTeamIdForUser(user.id) ? " (já em outro time)" : ""}
                  </MenuItem>
                ))}
              </TextField>
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
            }}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!selectedUserId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Salvando…" : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
