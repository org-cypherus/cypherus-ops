"use client";

import { createTheme, type ThemeOptions } from "@mui/material/styles";
import { darkPalette, lightPalette } from "./palette";

const shared: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Manrope", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: "none" },
      },
    },
  },
};

export function createAppTheme(mode: "light" | "dark") {
  return createTheme({
    ...shared,
    palette: mode === "light" ? lightPalette : darkPalette,
  });
}
