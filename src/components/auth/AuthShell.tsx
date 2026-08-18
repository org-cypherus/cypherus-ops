"use client";

import { Box } from "@mui/material";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Padding vertical extra (signup). */
  py?: number | { xs?: number; sm?: number; md?: number };
};

/**
 * Shell de auth com fundo abstrato filtrado para ciano/azul da marca
 * (o filter fica numa camada atrás para não afetar o formulário).
 */
export function AuthShell({ children, py = 0 }: Props) {
  return (
    <Box
      component="main"
      minHeight="100dvh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      py={py}
      position="relative"
      overflow="hidden"
      bgcolor="background.default"
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/bg-abstract.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          /* Magenta/roxo → ciano (#4cd7f6 / #06b6d4) */
          filter:
            "hue-rotate(-105deg) saturate(1.05) brightness(0.85) contrast(1.05)",
          transform: "scale(1.02)",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(160deg, rgba(8,20,36,0.65) 0%, rgba(8,20,36,0.35) 40%, rgba(6,182,212,0.18) 100%)",
        }}
      />
      <Box
        position="relative"
        zIndex={1}
        width="100%"
        display="flex"
        justifyContent="center"
      >
        {children}
      </Box>
    </Box>
  );
}
