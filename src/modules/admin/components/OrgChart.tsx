"use client";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { Avatar, Box, Paper, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";

/** Nó hierárquico editável/expansível. */
export type OrgChartNode = {
  id?: string;
  name: string;
  title: string;
  children?: OrgChartNode[];
};

export const DEMO_ORG_CHART: OrgChartNode = {
  name: "Ana Silva",
  title: "President",
  children: [
    {
      name: "Bruno Costa",
      title: "VP Marketing",
      children: [
        { name: "Carla Dias", title: "Manager" },
        { name: "Diego Alves", title: "Manager" },
      ],
    },
    {
      name: "Elena Rocha",
      title: "VP Sales",
      children: [
        { name: "Fábio Nunes", title: "Manager" },
        { name: "Gina Prado", title: "Manager" },
        { name: "Hugo Lima", title: "Manager" },
      ],
    },
    {
      name: "Iris Mendes",
      title: "VP Production",
      children: [
        { name: "João Pires", title: "Manager" },
        { name: "Karen Souza", title: "Manager" },
      ],
    },
  ],
};

type OrgChartProps = {
  data?: OrgChartNode;
  renderActions?: (node: OrgChartNode) => ReactNode;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function avatarSrc(name: string) {
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=e8f4fa`;
}

function OrgCard({
  node,
  renderActions,
}: {
  node: OrgChartNode;
  renderActions?: (node: OrgChartNode) => ReactNode;
}) {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderRadius: 2,
        px: 1.5,
        py: 1.25,
        minWidth: 140,
        maxWidth: 180,
        textAlign: "center",
        border: 1,
        borderColor: "divider",
        boxShadow: theme.palette.mode === "dark" ? 2 : "0 2px 8px rgba(8, 20, 36, 0.08)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <Stack spacing={0.75} alignItems="center">
        <Avatar
          src={avatarSrc(node.name)}
          alt={node.name}
          sx={{
            width: 56,
            height: 56,
            bgcolor: "action.hover",
            color: "primary.dark",
            fontWeight: 700,
            fontSize: 16,
            border: "2px solid",
            borderColor: "primary.main",
          }}
        >
          {initials(node.name) || <PersonOutlineIcon fontSize="small" />}
        </Avatar>
        <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2, px: 0.5 }}>
          {node.name}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.15, px: 0.5, mt: -0.25 }}
        >
          {node.title}
        </Typography>
        {renderActions?.(node)}
      </Stack>
    </Paper>
  );
}

function OrgBranch({
  nodes,
  renderActions,
}: {
  nodes: OrgChartNode[];
  renderActions?: (node: OrgChartNode) => ReactNode;
}) {
  const theme = useTheme();
  if (!nodes.length) return null;
  const many = nodes.length > 1;
  const line = theme.palette.divider;

  return (
    <Box
      component="ul"
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        flexWrap: "nowrap",
        listStyle: "none",
        m: 0,
        p: 0,
        pt: 4,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: "50%",
          width: 0,
          height: 32,
          borderLeft: "2px solid",
          borderColor: line,
          transform: "translateX(-1px)",
        },
      }}
    >
      {nodes.map((child, index) => {
        const isFirst = index === 0;
        const isLast = index === nodes.length - 1;
        return (
          <Box
            component="li"
            key={child.id ?? `${child.name}-${child.title}-${index}`}
            sx={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              px: 1.5,
              pt: 4,
              "&::before": many
                ? {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: isFirst ? "50%" : 0,
                    right: isLast ? "50%" : 0,
                    height: 0,
                    borderTop: "2px solid",
                    borderColor: line,
                  }
                : { display: "none" },
              "&::after": {
                content: '""',
                position: "absolute",
                top: 0,
                left: "50%",
                width: 0,
                height: 32,
                borderLeft: "2px solid",
                borderColor: line,
                transform: "translateX(-1px)",
              },
            }}
          >
            <OrgTreeNode node={child} renderActions={renderActions} />
          </Box>
        );
      })}
    </Box>
  );
}

function OrgTreeNode({
  node,
  renderActions,
}: {
  node: OrgChartNode;
  renderActions?: (node: OrgChartNode) => ReactNode;
}) {
  const kids = node.children ?? [];
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <OrgCard node={node} renderActions={renderActions} />
      {kids.length ? <OrgBranch nodes={kids} renderActions={renderActions} /> : null}
    </Box>
  );
}

/** Organograma hierárquico (Flexbox + cards + conectores). Dados: `{ name, title, children[] }`. */
export default function OrgChart({ data = DEMO_ORG_CHART, renderActions }: OrgChartProps) {
  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        bgcolor: "background.default",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 2 },
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          justifyContent: "center",
          minWidth: "100%",
          py: 1,
        }}
      >
        <OrgTreeNode node={data} renderActions={renderActions} />
      </Box>
    </Box>
  );
}
