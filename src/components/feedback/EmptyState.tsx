"use client";

import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { Box, Button, Typography } from "@mui/material";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
};

export function EmptyState({ title, description, actionLabel, onAction, icon }: Props) {
  return (
    <Box
      py={8}
      px={3}
      textAlign="center"
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={1.5}
    >
      <Box color="text.secondary" fontSize={48}>
        {icon || <InboxOutlinedIcon fontSize="inherit" />}
      </Box>
      <Typography variant="h6">{title}</Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420  }}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction} sx={{ mt: 1 }}>
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
}
