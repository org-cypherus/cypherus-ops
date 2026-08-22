"use client";

import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box, Button, Typography } from "@mui/material";
import { getApiError } from "@/lib/api/client";
import { isPermissionDenied, permissionDeniedDescription } from "@/lib/api/errors";
import { AccessDeniedState } from "./AccessDeniedState";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  /** Quando for 403 / PERMISSION_DENIED, mostra estado amigável em vez de erro técnico. */
  error?: unknown;
  /** Ex.: "a lista de usuários" — usado se a API não enviar permission_key. */
  resourceLabel?: string;
};

export function ErrorState({
  title = "Algo deu errado",
  description = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  error,
  resourceLabel,
}: Props) {
  if (error) {
    const parsed = getApiError(error);
    if (isPermissionDenied(parsed)) {
      return (
        <AccessDeniedState
          description={permissionDeniedDescription(parsed, resourceLabel)}
        />
      );
    }
  }

  return (
    <Box
      py={{ xs: 6, sm: 8 }}
      px={{ xs: 2, sm: 3 }}
      textAlign="center"
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={1.5}
    >
      <ErrorOutlineIcon color="error" sx={{ fontSize: { xs: 40, sm: 48 } }} />
      <Typography variant="h6" sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.6 }}>
        {description}
      </Typography>
      {onRetry ? (
        <Button variant="outlined" onClick={onRetry} sx={{ mt: 1 }}>
          Tentar novamente
        </Button>
      ) : null}
    </Box>
  );
}
