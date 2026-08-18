"use client";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import {
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Link as MuiLink,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import NextLink from "next/link";
import { useCallback, useId, useState } from "react";
import { scrollToHash } from "@/lib/utils/scroll";
import { hero, landingColors, navLinks } from "../content";

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const drawerTitleId = useId();

  const onAnchorClick = useCallback((href: string) => {
    setOpen(false);
    // Defer so the drawer can close before scrolling on mobile.
    requestAnimationFrame(() => scrollToHash(href));
  }, []);

  return (
    <>
      <Box
        component="a"
        href="#conteudo-principal"
        sx={{
          position: "absolute",
          left: 16,
          top: 16,
          zIndex: 1300,
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: landingColors.primarySolid,
          color: landingColors.bg,
          fontWeight: 700,
          textDecoration: "none",
          transform: "translateY(-160%)",
          "&:focus": { transform: "translateY(0)" },
        }}
      >
        Ir para o conteúdo
      </Box>

      <Box
        component="header"
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          bgcolor: "rgba(8, 20, 36, 0.82)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${landingColors.border}`,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" justifyContent="space-between" py={1.75}>
            <Typography
              component={NextLink}
              href="/"
              aria-label="Cypher Ops — página inicial"
              sx={{
                fontWeight: 800,
                fontSize: "1.25rem",
                color: landingColors.primary,
                textDecoration: "none",
                letterSpacing: "-0.02em",
              }}
            >
              Cypher Ops
            </Typography>

            <Box component="nav" aria-label="Seções da página" sx={{ display: { xs: "none", md: "block" } }}>
              <Stack direction="row" spacing={3} component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {navLinks.map((link) => (
                  <Box component="li" key={link.href}>
                    <MuiLink
                      href={link.href}
                      underline="none"
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToHash(link.href);
                        window.history.replaceState(null, "", link.href);
                      }}
                      sx={{
                        color: landingColors.muted,
                        fontWeight: 500,
                        "&:hover": { color: landingColors.primary },
                      }}
                    >
                      {link.label}
                    </MuiLink>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ display: { xs: "none", md: "flex" } }}
              component="nav"
              aria-label="Conta"
            >
              <Button
                component={NextLink}
                href="/login"
                sx={{ color: landingColors.muted, "&:hover": { color: landingColors.primary, bgcolor: "transparent" } }}
              >
                Entrar
              </Button>
              <Button
                component={NextLink}
                href="/signup"
                variant="contained"
                sx={{
                  bgcolor: landingColors.primarySolid,
                  color: landingColors.bg,
                  fontWeight: 700,
                  px: 2.5,
                  "&:hover": { bgcolor: landingColors.primary },
                }}
              >
                Criar conta
              </Button>
            </Stack>

            <IconButton
              aria-label="Abrir menu de navegação"
              aria-expanded={open}
              aria-controls="landing-mobile-menu"
              onClick={() => setOpen(true)}
              sx={{ display: { xs: "inline-flex", md: "none" }, color: landingColors.primary }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Stack>
        </Container>
      </Box>

      <Drawer
        id="landing-mobile-menu"
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            "aria-labelledby": drawerTitleId,
            sx: {
              width: "min(100%, 320px)",
              bgcolor: landingColors.bg,
              color: landingColors.text,
              borderLeft: `1px solid ${landingColors.border}`,
            },
          },
        }}
      >
        <Box component="nav" aria-label="Menu mobile" sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography id={drawerTitleId} fontWeight={800} color={landingColors.primary}>
              Menu
            </Typography>
            <IconButton aria-label="Fechar menu" onClick={() => setOpen(false)} sx={{ color: landingColors.muted }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          <List disablePadding>
            {navLinks.map((link) => (
              <ListItem key={link.href} disablePadding>
                <ListItemButton
                  component="a"
                  href={link.href}
                  onClick={(event) => {
                    event.preventDefault();
                    onAnchorClick(link.href);
                    window.history.replaceState(null, "", link.href);
                  }}
                >
                  <ListItemText primary={<Typography fontWeight={600}>{link.label}</Typography>} />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton component={NextLink} href="/login" onClick={() => setOpen(false)}>
                <ListItemText primary="Entrar" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding sx={{ mt: 1 }}>
              <ListItemButton
                component={NextLink}
                href={hero.primaryCta.href}
                onClick={() => setOpen(false)}
                sx={{
                  bgcolor: landingColors.primarySolid,
                  color: landingColors.bg,
                  borderRadius: 1,
                  fontWeight: 700,
                  "&:hover": { bgcolor: landingColors.primary },
                }}
              >
                <ListItemText primary={<Typography fontWeight={700}>Criar conta</Typography>} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
}
