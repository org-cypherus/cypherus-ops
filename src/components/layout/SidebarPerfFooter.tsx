"use client";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { formatLoadMs } from "@/lib/perf/route-metrics";
import { useRouteLoadMetrics } from "@/lib/perf/useRouteLoadMetrics";
import { useUIStore } from "@/store/ui";

export function SidebarPerfFooter() {
  const visible = useUIStore((s) => s.perfMetricsVisible);
  const toggle = useUIStore((s) => s.togglePerfMetricsVisible);
  const { paintMs, sessionMs, primaryMs, primaryLabel, totalMs, resourcesMs } =
    useRouteLoadMetrics();

  return (
    <Box
      sx={{
        mt: "auto",
        px: 1.5,
        pt: 1,
        pb: 1.5,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Desempenho
        </Typography>
        <IconButton
          size="small"
          onClick={toggle}
          aria-label={visible ? "Ocultar métricas de desempenho" : "Visualizar métricas de desempenho"}
          aria-pressed={visible}
          title={visible ? "Ocultar" : "Visualizar"}
        >
          {visible ? (
            <VisibilityOutlinedIcon fontSize="small" />
          ) : (
            <VisibilityOffOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </Stack>

      {visible ? (
        <Stack spacing={0.35} mt={1} sx={{ fontVariantNumeric: "tabular-nums" }}>
          <Typography variant="body2" fontWeight={700} color="text.primary">
            Total {totalMs != null ? formatLoadMs(totalMs) : "…"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Resources {resourcesMs != null ? formatLoadMs(resourcesMs) : "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Paint {paintMs != null ? formatLoadMs(paintMs) : "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Sessão {sessionMs != null ? formatLoadMs(sessionMs) : "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {primaryLabel ?? "Dados"} {primaryMs != null ? formatLoadMs(primaryMs) : "—"}
          </Typography>
        </Stack>
      ) : null}
    </Box>
  );
}
