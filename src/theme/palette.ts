export const brand = {
  primary: "#1B3A5C",
  primaryLight: "#2E5A8A",
  accent: "#1E88E5",
  accentSoft: "#E3F2FD",
  success: "#2E7D32",
  warning: "#ED6C02",
  error: "#D32F2F",
  info: "#0288D1",
};

export const lightPalette = {
  mode: "light" as const,
  primary: { main: brand.primary, light: brand.primaryLight, dark: "#0F2438", contrastText: "#FFFFFF" },
  secondary: { main: brand.accent, light: "#64B5F6", dark: "#1565C0", contrastText: "#FFFFFF" },
  background: { default: "#F5F7FA", paper: "#FFFFFF" },
  text: { primary: "#1B1B1D", secondary: "#5A5F6B" },
  divider: "#E4E6EB",
  success: { main: brand.success },
  warning: { main: brand.warning },
  error: { main: brand.error },
  info: { main: brand.info },
};

export const darkPalette = {
  mode: "dark" as const,
  primary: { main: "#90CAF9", light: "#BBDEFB", dark: "#42A5F5", contrastText: "#0D1B2A" },
  secondary: { main: "#64B5F6", light: "#90CAF9", dark: "#1E88E5", contrastText: "#0D1B2A" },
  background: { default: "#0F1419", paper: "#1A2332" },
  text: { primary: "#F0F3F7", secondary: "#A8B0BD" },
  divider: "#2A3441",
  success: { main: "#66BB6A" },
  warning: { main: "#FFA726" },
  error: { main: "#EF5350" },
  info: { main: "#29B6F6" },
};
