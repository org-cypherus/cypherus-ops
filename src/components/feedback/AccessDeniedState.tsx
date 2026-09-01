"use client";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Box, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionVariant?: "text" | "outlined" | "contained";
  icon?: ReactNode;
};

/**
 * Estado amigável para falta de permissão (403 / PERMISSION_DENIED).
 * Não parece erro técnico — orienta o usuário a pedir acesso.
 */
export function AccessDeniedState({
  title = "Acesso restrito",
  description = "Seu perfil não tem permissão para ver este conteúdo. Se precisar, peça ao administrador da empresa para liberar o acesso.",
  actionLabel = "Voltar ao início",
  actionHref = "/leads",
  onAction,
  actionVariant = "outlined",
  icon,
}: Props) {
  return (
    <Box
      flex={1}
      minHeight={{ xs: 280, sm: 360 }}
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ xs: 2, sm: 3 }}
      py={{ xs: 4, sm: 6 }}
    >
      <Stack
        spacing={2}
        alignItems="center"
        textAlign="center"
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: (theme) =>
            theme.palette.mode === "dark" ? "none" : "0 1px 2px rgba(16, 24, 40, 0.04)",
        }}
      >
        <Box
          sx={{
            width: { xs: 56, sm: 64 },
            height: { xs: 56, sm: 64 },
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: "action.hover",
            color: "text.secondary",
          }}
        >
          {icon ?? <LockOutlinedIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />}
        </Box>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {description}
        </Typography>
        {onAction ? (
          <Button variant={actionVariant} onClick={onAction} sx={{ mt: 0.5 }}>
            {actionLabel}
          </Button>
        ) : actionHref ? (
          <Button component={Link} href={actionHref} variant={actionVariant} sx={{ mt: 0.5 }}>
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
