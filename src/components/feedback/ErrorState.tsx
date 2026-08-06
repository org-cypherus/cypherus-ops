"use client";

import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box, Button, Typography } from "@mui/material";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Algo deu errado",
  description = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
}: Props) {
  return (
    <Box py={8} px={3} textAlign="center" display="flex" flexDirection="column" alignItems="center" gap={1.5}>
      <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420  }}>
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
