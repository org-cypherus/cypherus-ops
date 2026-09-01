"use client";

import { Box, useMediaQuery, useTheme, type BoxProps } from "@mui/material";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Altura do gráfico no desktop. Mobile usa ~85%. */
  height?: number;
  sx?: BoxProps["sx"];
};

/**
 * Contém MUI X Charts sem estourar o grid (minWidth: 0 + overflow).
 * O chart precisa de um pai com largura definida para recalcular o SVG.
 */
export function ChartShell({ children, height = 280, sx }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
  const chartHeight = isMobile ? Math.max(220, Math.round(height * 0.85)) : height;

  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        height: chartHeight,
        overflow: "hidden",
        "& .MuiChartsLegend-root": {
          flexWrap: "wrap",
          gap: 0.5,
        },
        "& svg": {
          maxWidth: "100%",
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Margens compactas para eixos monetários longos (R$ …). */
export function useChartMargins(kind: "money" | "count" | "pie" = "money") {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });

  if (kind === "pie") {
    return isMobile
      ? { left: 8, right: 8, top: 8, bottom: 56 }
      : { left: 16, right: 16, top: 16, bottom: 64 };
  }

  if (kind === "count") {
    return isMobile
      ? { left: 36, right: 8, top: 16, bottom: 40 }
      : { left: 48, right: 16, top: 24, bottom: 40 };
  }

  return isMobile
    ? { left: 52, right: 8, top: 16, bottom: 44 }
    : { left: 64, right: 16, top: 24, bottom: 48 };
}

export function useIsCompactChart() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
}
