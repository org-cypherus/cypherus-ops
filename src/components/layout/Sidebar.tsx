"use client";

import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
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
import { canAccess } from "@/lib/billing/access";
import { APP_NAV_ROUTES } from "@/lib/billing/routes";
import { Role } from "@/lib/auth/permissions";
import { useSession } from "@/modules/auth/hooks";
import { useUIStore } from "@/store/ui";

export const DRAWER_WIDTH = 248;
export const TOPBAR_HEIGHT = 64;

const icons: Record<string, ReactNode> = {
  "/dashboard": <DashboardOutlinedIcon />,
  "/dashboard/admin": <DashboardOutlinedIcon />,
  "/leads": <AccountTreeOutlinedIcon />,
  "/calendar": <CalendarMonthOutlinedIcon />,
  "/legal": <GavelOutlinedIcon />,
  "/contracts": <DescriptionOutlinedIcon />,
  "/financial": <PaidOutlinedIcon />,
  "/reports": <AssessmentOutlinedIcon />,
  "/admin/users": <PeopleOutlineIcon />,
  "/admin": <SettingsOutlinedIcon />,
};

const paperSx = {
  width: DRAWER_WIDTH,
  boxSizing: "border-box" as const,
  backgroundColor: "primary.main",
  color: "primary.contrastText",
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: user } = useSession();
  const adminUsesAdminDash =
    user?.role === Role.Administrador &&
    canAccess(user?.features, user?.permissions, "dashboard_advanced", "dashboard:visualizar");

  const visibleItems = APP_NAV_ROUTES.filter((item) => {
    if (item.feature) {
      return canAccess(user?.features, user?.permissions, item.feature, item.permission);
    }
    return Boolean(user?.permissions.includes(item.permission));
  }).map((item) =>
    item.href === "/dashboard" && adminUsesAdminDash
      ? { ...item, href: "/dashboard/admin", label: "Dashboard" }
      : item,
  );

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
            (item.href === "/dashboard/admin" && pathname.startsWith("/dashboard")) ||
            (item.href !== "/admin" &&
              item.href !== "/dashboard/admin" &&
              pathname.startsWith(item.href)) ||
            (item.href === "/admin" &&
              pathname.startsWith("/admin") &&
              !pathname.startsWith("/admin/users") &&
              !pathname.startsWith("/admin/enterprise"));
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
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                {icons[item.href] ?? icons["/dashboard"]}
              </ListItemIcon>
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
