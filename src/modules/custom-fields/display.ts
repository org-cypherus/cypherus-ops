import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { CustomFieldDefinition } from "./types";

export function formatCustomFieldValue(def: CustomFieldDefinition, value: unknown): string {
  if (value == null || value === "") return "—";
  switch (def.type) {
    case "money": {
      const n = Number(value);
      return Number.isFinite(n) ? formatCurrency(n) : "—";
    }
    case "number": {
      const n = Number(value);
      return Number.isFinite(n) ? String(n) : "—";
    }
    case "bool":
      return value === true || value === "true" || value === 1 || value === "1" ? "Sim" : "Não";
    case "date":
      return formatDate(String(value));
    default:
      return String(value);
  }
}
