"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useSession, useLogout } from "@/modules/auth/hooks";
import { useUIStore } from "@/store/ui";
import { DRAWER_WIDTH, TOPBAR_HEIGHT } from "./Sidebar";

export function Topbar() {
  const { data: user } = useSession();
  const logout = useLogout();
  const mode = useUIStore((s) => s.mode);
  const toggleMode = useUIStore((s) => s.toggleMode);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setNotificationsOpen = useUIStore((s) => s.setNotificationsOpen);
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

        <TextField
          size="small"
          placeholder="Pesquisar nome, CPF, telefone, contrato..."
          onClick={() => setSearchOpen(true)}
          InputProps={{
            readOnly: true,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            flex: 1,
            maxWidth: 480,
            display: { xs: "none", sm: "block" },
          }}
        />
        <IconButton
          onClick={() => setSearchOpen(true)}
          aria-label="Pesquisar"
          sx={{ display: { xs: "inline-flex", sm: "none" } }}
        >
          <SearchIcon />
        </IconButton>

        <Box sx={{ flex: 1 }} />

        <IconButton onClick={toggleMode} aria-label="Alternar tema">
          {mode === "light" ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
        </IconButton>
        <IconButton onClick={() => setNotificationsOpen(true)} aria-label="Notificações">
          <Badge color="error" variant="dot">
            <NotificationsNoneOutlinedIcon />
          </Badge>
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
              {user?.role || "—"}
            </Typography>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
