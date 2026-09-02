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
import { useSession } from "@/modules/auth/hooks";
import { useUIStore } from "@/store/ui";
import { DRAWER_WIDTH, TOPBAR_HEIGHT } from "./Sidebar";

export function Topbar() {
  const { data: user } = useSession();
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
          gap: { xs: 1, sm: 1.5 },
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

        <IconButton onClick={toggleMode} aria-label="Alternar tema">
          {mode === "light" ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
        </IconButton>

        <Box display="flex" alignItems="center" gap={1} minWidth={0}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", flexShrink: 0 }}>
            {user?.name?.charAt(0) || "U"}
          </Avatar>
          <Box minWidth={0} display={{ xs: "none", sm: "block" }}>
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 600, lineHeight: 1.2, maxWidth: 160 }}
              title={user?.name || "Usuário"}
            >
              {user?.name || "Usuário"}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {user?.role || "—"}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
