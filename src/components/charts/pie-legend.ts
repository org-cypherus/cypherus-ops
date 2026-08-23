import type { PieChartProps } from "@mui/x-charts/PieChart";

/** Legenda embaixo, com margem para não cortar nem cobrir as fatias. */
export const pieChartLegendLayout = {
  height: 360,
  margin: { top: 8, bottom: 88, left: 8, right: 8 },
  slotProps: {
    legend: {
      direction: "row",
      position: { vertical: "bottom", horizontal: "middle" },
      padding: 0,
      itemGap: 8,
    },
  },
} satisfies Pick<PieChartProps, "height" | "margin" | "slotProps">;
