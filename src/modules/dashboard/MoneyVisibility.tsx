"use client";

import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { IconButton, Tooltip } from "@mui/material";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils/format";
import { useUIStore } from "@/store/ui";

const HIDDEN_MONEY = "R$ ••••••";

export function useMoneyVisibility() {
  const moneyVisible = useUIStore((s) => s.moneyVisible);
  const toggleMoneyVisible = useUIStore((s) => s.toggleMoneyVisible);

  return {
    moneyVisible,
    toggleMoneyVisible,
    formatMoney: (value: number) => (moneyVisible ? formatCurrency(value) : HIDDEN_MONEY),
    /** Eixo Y/X — versão compacta para não estourar o SVG. */
    moneyAxisFormatter: (value: number | null) =>
      moneyVisible ? formatCompactCurrency(Number(value ?? 0)) : "•••",
  };
}

export function MoneyVisibilityToggle() {
  const { moneyVisible, toggleMoneyVisible } = useMoneyVisibility();
  return (
    <Tooltip title={moneyVisible ? "Ocultar valores monetários" : "Mostrar valores monetários"}>
      <IconButton
        size="small"
        onClick={toggleMoneyVisible}
        aria-label={moneyVisible ? "Ocultar valores monetários" : "Mostrar valores monetários"}
        aria-pressed={moneyVisible}
      >
        {moneyVisible ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
