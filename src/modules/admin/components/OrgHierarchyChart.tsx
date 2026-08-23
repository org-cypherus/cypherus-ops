"use client";

import { Avatar, Box, Stack, Tooltip, Typography } from "@mui/material";
import { Children, isValidElement, type ReactNode } from "react";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function avatarSrc(name: string, photoUrl?: string | null) {
  if (photoUrl?.trim()) return photoUrl.trim();
  // Placeholder circular “foto” estável por nome (até o CRM expor avatar real).
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=e8eef5`;
}

type OrgPersonNodeProps = {
  name: string;
  subtitle?: string;
  photoUrl?: string | null;
  accent?: "root" | "manager" | "member";
  size?: number;
  actions?: ReactNode;
};

/** Nó do organograma: foto circular + nome (estilo hierarquia da referência). */
export function OrgPersonNode({
  name,
  subtitle,
  photoUrl,
  accent = "member",
  size = 72,
  actions,
}: OrgPersonNodeProps) {
  const ring =
    accent === "root" ? "primary.main" : accent === "manager" ? "secondary.main" : "grey.400";

  return (
    <Stack
      spacing={0.75}
      alignItems="center"
      sx={{ position: "relative", zIndex: 1, maxWidth: size + 48 }}
    >
      <Tooltip title={subtitle ? `${name} · ${subtitle}` : name} placement="top">
        <Avatar
          src={avatarSrc(name, photoUrl)}
          alt={name}
          sx={{
            width: size,
            height: size,
            fontSize: size * 0.32,
            fontWeight: 700,
            bgcolor: "grey.200",
            color: "text.primary",
            border: "3px solid",
            borderColor: ring,
            boxShadow: 1,
          }}
        >
          {initialsFromName(name)}
        </Avatar>
      </Tooltip>
      <Typography
        variant="caption"
        fontWeight={700}
        textAlign="center"
        sx={{ lineHeight: 1.2, px: 0.5 }}
      >
        {name.split(/\s+/).slice(0, 2).join(" ")}
      </Typography>
      {subtitle ? (
        <Typography
          variant="caption"
          color="text.secondary"
          textAlign="center"
          sx={{ lineHeight: 1.15, px: 0.5, mt: -0.5 }}
        >
          {subtitle}
        </Typography>
      ) : null}
      {actions ? (
        <Stack direction="row" spacing={0} justifyContent="center" flexWrap="wrap" useFlexGap>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

type HierarchyBranchProps = {
  children: ReactNode;
};

const LINE = "grey.700";

/**
 * Ramo horizontal com conectores ortogonais (pai → barra → filhos),
 * no estilo do organograma clássico da referência.
 */
export function HierarchyChildren({ children }: HierarchyBranchProps) {
  const items = Children.toArray(children);
  if (!items.length) return null;
  const many = items.length > 1;

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
          borderColor: LINE,
          transform: "translateX(-1px)",
        },
      }}
    >
      {items.map((child, index) => {
        const key = isValidElement(child) && child.key != null ? child.key : `branch-${index}`;
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        return (
          <Box
            component="li"
            key={key}
            sx={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              px: { xs: 1.25, sm: 2 },
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
                    borderColor: LINE,
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
                borderColor: LINE,
                transform: "translateX(-1px)",
              },
            }}
          >
            {child}
          </Box>
        );
      })}
    </Box>
  );
}

type HierarchyRootProps = {
  children: ReactNode;
};

/** Container com scroll horizontal para organogramas largos. */
export function HierarchyRoot({ children }: HierarchyRootProps) {
  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        py: 2,
        px: 2,
        bgcolor: "background.paper",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "100%",
          py: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
