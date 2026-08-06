"use client";

import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Permission } from "@/lib/auth/permissions";
import { useSession } from "@/modules/auth/hooks";
import { useUIStore } from "@/store/ui";

export const DRAWER_WIDTH = 248;
export const TOPBAR_HEIGHT = 64;

const items: Array<{
  href: string;
  label: string;
  icon: ReactNode;
  permission: Permission;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardOutlinedIcon />, permission: "dashboard:visualizar" },
  { href: "/leads", label: "Leads", icon: <AccountTreeOutlinedIcon />, permission: "crm:visualizar" },
  { href: "/legal", label: "Jurídico", icon: <GavelOutlinedIcon />, permission: "contratos:editar" },
  { href: "/contracts", label: "Contratos", icon: <DescriptionOutlinedIcon />, permission: "contratos:visualizar" },
  { href: "/financial", label: "Financeiro", icon: <PaidOutlinedIcon />, permission: "financeiro:visualizar" },
  { href: "/reports", label: "Relatórios", icon: <AssessmentOutlinedIcon />, permission: "relatorios:exportar" },
  { href: "/admin/users", label: "Usuários", icon: <PeopleOutlineIcon />, permission: "admin:visualizar" },
  { href: "/admin", label: "Administração", icon: <SettingsOutlinedIcon />, permission: "admin:visualizar" },
];

const paperSx = {
  width: DRAWER_WIDTH,
  boxSizing: "border-box" as const,
  backgroundColor: "primary.main",
  color: "primary.contrastText",
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: user } = useSession();
  const permissions = user?.permissions ?? [];
  const visibleItems = items.filter((item) => permissions.includes(item.permission));

  return (
    <>
      <Toolbar sx={{ px: 2.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
            Cypher Ops
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Operação comercial
          </Typography>
        </Box>
      </Toolbar>
      <List sx={{ px: 1.5, pt: 1 }}>
        {visibleItems.map((item) => {
          const selected =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href)) ||
            (item.href === "/admin" &&
              pathname.startsWith("/admin") &&
              !pathname.startsWith("/admin/users"));
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={selected}
              onClick={onNavigate}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                color: "inherit",
                "&.Mui-selected": {
                  backgroundColor: "rgba(255,255,255,0.14)",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.18)" },
                },
                "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );
}

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* Mobile / tablet: temporary drawer */}
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          [`& .MuiDrawer-paper`]: paperSx,
        }}
      >
        <NavList onNavigate={() => setSidebarOpen(false)} />
      </Drawer>

      {/* Desktop: permanent sidebar */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", lg: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: paperSx,
        }}
      >
        <NavList />
      </Drawer>
    </>
  );
}
