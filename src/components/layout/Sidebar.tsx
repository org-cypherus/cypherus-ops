"use client";

import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
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
import { useQueryClient } from "@tanstack/react-query";
import { canAccess } from "@/lib/billing/access";
import { APP_NAV_ROUTES } from "@/lib/billing/routes";
import { PLATFORM_NAV_ROUTES, isPlatformPath } from "@/lib/platform/routes";
import { Role } from "@/lib/auth/permissions";
import { prefetchNavHref } from "@/lib/query/prefetch-routes";
import { useSession } from "@/modules/auth/hooks";
import { useUIStore } from "@/store/ui";

export const DRAWER_WIDTH = 248;
export const TOPBAR_HEIGHT = 64;

const icons: Record<string, ReactNode> = {
  "/dashboard": <DashboardOutlinedIcon />,
  "/dashboard/admin": <DashboardOutlinedIcon />,
  "/leads": <AccountTreeOutlinedIcon />,
  "/contracts": <DescriptionOutlinedIcon />,
  "/financial": <PaidOutlinedIcon />,
  "/admin/users": <PeopleOutlineIcon />,
  "/admin": <SettingsOutlinedIcon />,
  "/platform": <HubOutlinedIcon />,
  "/platform/companies": <BusinessOutlinedIcon />,
  "/platform/plans": <CreditCardOutlinedIcon />,
  "/platform/billing": <PaidOutlinedIcon />,
};

const paperSx = {
  width: DRAWER_WIDTH,
  boxSizing: "border-box" as const,
  backgroundColor: "background.paper",
  color: "text.primary",
  borderRight: "1px solid",
  borderColor: "divider",
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const platformMode = Boolean(user?.isPlatformAdmin);
  const adminUsesAdminDash =
    user?.role === Role.Administrador &&
    canAccess(user?.features, user?.permissions, "dashboard_advanced", "dashboard:visualizar");

  const tenantItems = APP_NAV_ROUTES.filter((item) => {
    if (item.feature) {
      return canAccess(user?.features, user?.permissions, item.feature, item.permission);
    }
    return Boolean(user?.permissions.includes(item.permission));
  }).map((item) =>
    item.href === "/dashboard" && adminUsesAdminDash
      ? { ...item, href: "/dashboard/admin", label: "Dashboard" }
      : item,
  );

  const visibleItems = platformMode
    ? [
        ...PLATFORM_NAV_ROUTES,
        { href: "/leads", label: "CRM da empresa" },
      ]
    : tenantItems;

  return (
    <>
      <Toolbar sx={{ px: 2.5 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, letterSpacing: "-0.03em", color: "primary.main" }}
          >
            Cypher Ops
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {platformMode ? "Console da plataforma" : "Operação comercial"}
          </Typography>
        </Box>
      </Toolbar>
      <List sx={{ px: 1.5, pt: 1 }}>
        {visibleItems.map((item) => {
          const selected =
            pathname === item.href ||
            (item.href === "/dashboard/admin" && pathname.startsWith("/dashboard")) ||
            (item.href === "/platform" && isPlatformPath(pathname) && pathname === "/platform") ||
            (item.href !== "/admin" &&
              item.href !== "/dashboard/admin" &&
              item.href !== "/platform" &&
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
              onMouseEnter={() => {
                void prefetchNavHref(queryClient, item.href);
              }}
              onFocus={() => {
                void prefetchNavHref(queryClient, item.href);
              }}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                color: "text.secondary",
                "&.Mui-selected": {
                  color: "primary.main",
                  backgroundColor: "rgba(76, 215, 246, 0.12)",
                  "&:hover": { backgroundColor: "rgba(76, 215, 246, 0.18)" },
                  "& .MuiListItemIcon-root": { color: "primary.main" },
                },
                "&:hover": { backgroundColor: "action.hover", color: "text.primary" },
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
