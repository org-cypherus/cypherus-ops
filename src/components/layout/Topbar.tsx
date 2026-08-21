"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { useLogout, useSession } from "@/modules/auth/hooks";
import { formatLoadMs } from "@/lib/perf/route-metrics";
import { useRouteLoadMetrics } from "@/lib/perf/useRouteLoadMetrics";
import { useUIStore } from "@/store/ui";
import { DRAWER_WIDTH, TOPBAR_HEIGHT } from "./Sidebar";

function MetricsCaption() {
  const { paintMs, sessionMs, primaryMs, primaryLabel } = useRouteLoadMetrics();
  const parts: string[] = [];
  if (paintMs != null) parts.push(`paint ${formatLoadMs(paintMs)}`);
  if (sessionMs != null) parts.push(`sess ${formatLoadMs(sessionMs)}`);
  if (primaryMs != null) {
    parts.push(`${primaryLabel ?? "data"} ${formatLoadMs(primaryMs)}`);
  }

  if (!parts.length) return null;

  return (
    <Typography
      variant="caption"
      color="text.secondary"
      title="paint = frame pós-rota · sess = useSession ready · data = query principal"
      sx={{
        display: { xs: "none", md: "block" },
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        userSelect: "none",
        maxWidth: 360,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {parts.join(" · ")}
    </Typography>
  );
}

export function Topbar() {
  const { data: user } = useSession();
  const logout = useLogout();
  const mode = useUIStore((s) => s.mode);
  const toggleMode = useUIStore((s) => s.toggleMode);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        width: { xs: "100%", lg: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { xs: 0, lg: `${DRAWER_WIDTH}px` },
        height: TOPBAR_HEIGHT,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Toolbar
        sx={{
          gap: { xs: 1, sm: 2 },
          minHeight: `${TOPBAR_HEIGHT}px !important`,
          height: TOPBAR_HEIGHT,
          px: { xs: 1.5, lg: 3 },
        }}
      >
        <IconButton
          edge="start"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu"
          sx={{ display: { xs: "inline-flex", lg: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flex: 1 }} />

        <MetricsCaption />

        <IconButton onClick={toggleMode} aria-label="Alternar tema">
          {mode === "light" ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
        </IconButton>
        <Box
          display="flex"
          alignItems="center"
          gap={1.25}
          sx={{ cursor: "pointer" }}
          onClick={() => logout.mutate()}
          title="Sair"
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
            {user?.name?.charAt(0) || "U"}
          </Avatar>
          <Box display={{ xs: "none", md: "block" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {user?.name || "Usuário"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.isPlatformAdmin ? "Plataforma" : user?.role || "—"}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
