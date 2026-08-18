/** Paleta canônica Cypher Ops — alinhada à home (landing). */
export const brand = {
  bg: "#081424",
  surface: "#111c2d",
  surfaceHigh: "#1f2a3c",
  surfaceBright: "#2a3547",
  primary: "#4cd7f6",
  primarySolid: "#06b6d4",
  primaryDark: "#0891b2",
  onPrimary: "#003640",
  text: "#d8e3fa",
  muted: "#bcc9cd",
  border: "rgba(255,255,255,0.10)",
  success: "#2E7D32",
  warning: "#ED6C02",
  error: "#D32F2F",
  info: "#0288D1",
} as const;

/** Tokens usados pela LP — mesmo objeto do tema dark. */
export const landingColors = {
  bg: brand.bg,
  surface: brand.surface,
  surfaceHigh: brand.surfaceHigh,
  surfaceBright: brand.surfaceBright,
  primary: brand.primary,
  primarySolid: brand.primarySolid,
  onPrimary: brand.onPrimary,
  text: brand.text,
  muted: brand.muted,
  border: brand.border,
} as const;

export const lightPalette = {
  mode: "light" as const,
  primary: {
    main: brand.primarySolid,
    light: brand.primary,
    dark: brand.primaryDark,
    contrastText: "#FFFFFF",
  },
  secondary: {
    main: brand.primaryDark,
    light: brand.primary,
    dark: brand.onPrimary,
    contrastText: "#FFFFFF",
  },
  background: { default: "#F0F6FA", paper: "#FFFFFF" },
  text: { primary: brand.bg, secondary: "#5A6B7A" },
  divider: "#D5E0EA",
  success: { main: brand.success },
  warning: { main: brand.warning },
  error: { main: brand.error },
  info: { main: brand.info },
};

export const darkPalette = {
  mode: "dark" as const,
  primary: {
    main: brand.primary,
    light: "#7EE3F9",
    dark: brand.primarySolid,
    contrastText: brand.onPrimary,
  },
  secondary: {
    main: brand.primarySolid,
    light: brand.primary,
    dark: brand.primaryDark,
    contrastText: brand.onPrimary,
  },
  background: { default: brand.bg, paper: brand.surface },
  text: { primary: brand.text, secondary: brand.muted },
  divider: brand.border,
  success: { main: "#66BB6A" },
  warning: { main: "#FFA726" },
  error: { main: "#EF5350" },
  info: { main: brand.primarySolid },
};
