"use client";

import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import OrgChart, { type OrgChartNode } from "@/modules/admin/components/OrgChart";
import { OrgZoomCanvas } from "@/modules/admin/components/OrgZoomCanvas";
import type { OrgTree, OrgTreeManagerNode } from "@/modules/admin/teams";

export type OrgTreeViewActions = {
  canManage: boolean;
  onAddCollaborator: (manager: OrgTreeManagerNode) => void;
  onChangeManager: (manager: OrgTreeManagerNode) => void;
  onRemoveManager: (manager: OrgTreeManagerNode) => void;
  onMoveCollaborator: (userId: string, fromTeamId: string) => void;
  onRemoveCollaborator: (teamId: string, userId: string) => void;
  removingMember?: boolean;
  removingManager?: boolean;
};

/** Converte a árvore real (Owner → gestores → colaboradores) para JSON hierárquico. */
export function orgTreeToChartData(tree: OrgTree): OrgChartNode | null {
  if (!tree.owner) return null;
  const children: OrgChartNode[] = [];

  for (const collab of tree.ownerCollaborators) {
    children.push({
      id: `collab:${collab.teamId}:${collab.user.id}`,
      name: collab.user.name,
      title: collab.user.role,
    });
  }

  for (const node of tree.managers) {
    children.push({
      id: `manager:${node.team.id}`,
      name: node.user.name,
      title: `${node.user.role} · ${node.team.name}`,
      children: node.collaborators.map((collab) => ({
        id: `collab:${collab.teamId}:${collab.user.id}`,
        name: collab.user.name,
        title: collab.user.role,
      })),
    });
  }

  return {
    id: `owner:${tree.owner.id}`,
    name: tree.owner.name,
    title: `${tree.owner.role} · owner`,
    children,
  };
}

function ManagerActions({
  node,
  actions,
}: {
  node: OrgTreeManagerNode;
  actions: OrgTreeViewActions;
}) {
  if (!actions.canManage) return null;
  return (
    <Stack direction="row" spacing={0} justifyContent="center">
      <Tooltip title="Adicionar colaborador">
        <IconButton size="small" onClick={() => actions.onAddCollaborator(node)}>
          <PersonAddAlt1OutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Trocar gestor">
        <IconButton size="small" onClick={() => actions.onChangeManager(node)}>
          <SwapHorizOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Remover gestor">
        <IconButton
          size="small"
          onClick={() => actions.onRemoveManager(node)}
          disabled={actions.removingManager}
        >
          <PersonRemoveOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function CollabActions({
  userId,
  teamId,
  actions,
}: {
  userId: string;
  teamId: string;
  actions: OrgTreeViewActions;
}) {
  if (!actions.canManage) return null;
  return (
    <Stack direction="row" spacing={0} justifyContent="center">
      <Tooltip title="Mover">
        <IconButton size="small" onClick={() => actions.onMoveCollaborator(userId, teamId)}>
          <SwapHorizOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Remover">
        <IconButton
          size="small"
          onClick={() => actions.onRemoveCollaborator(teamId, userId)}
          disabled={actions.removingMember}
        >
          <PersonRemoveOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export function OrgTreeBlueprintView({
  tree,
  actions,
  hideEmptyHint = false,
}: {
  tree: OrgTree;
  actions: OrgTreeViewActions;
  hideEmptyHint?: boolean;
}) {
  const data = orgTreeToChartData(tree);
  if (!data) return null;

  const managersByTeam = new Map(tree.managers.map((node) => [node.team.id, node]));

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
      {!hideEmptyHint && !tree.managers.length && !tree.ownerCollaborators.length ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum gestor vinculado. Use “Vincular gestor” para montar a hierarquia.
        </Typography>
      ) : null}
      <OrgZoomCanvas
        fitKey={`${tree.owner?.id ?? data.id}:${tree.managers.length}:${tree.ownerCollaborators.length}`}
      >
        <OrgChart
          contained
          data={data}
          renderActions={(node) => {
            if (!node.id) return null;
            if (node.id.startsWith("manager:")) {
              const teamId = node.id.slice("manager:".length);
              const manager = managersByTeam.get(teamId);
              if (!manager) return null;
              return (
                <Box>
                  <ManagerActions node={manager} actions={actions} />
                  {!manager.collaborators.length && actions.canManage ? (
                    <Button size="small" onClick={() => actions.onAddCollaborator(manager)}>
                      + Colaboradores
                    </Button>
                  ) : null}
                </Box>
              );
            }
            if (node.id.startsWith("collab:")) {
              const parts = node.id.split(":");
              const teamId = parts[1];
              const userId = parts[2];
              if (!teamId || !userId) return null;
              return <CollabActions userId={userId} teamId={teamId} actions={actions} />;
            }
            return null;
          }}
        />
      </OrgZoomCanvas>
    </Stack>
  );
}
