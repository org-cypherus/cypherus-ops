import { z, type ZodTypeAny } from "zod";
import {
  CUSTOM_FIELD_KEY_RE,
  CUSTOM_FIELD_TYPES,
  RESERVED_PROCESS_KEYS,
  type CustomFieldDefinition,
  type CustomFieldType,
} from "./types";

export function defaultValueForField(def: CustomFieldDefinition): unknown {
  switch (def.type) {
    case "bool":
      return false;
    case "number":
    case "money":
      return def.required ? 0 : "";
    default:
      return "";
  }
}

export function defaultProcessValues(defs: CustomFieldDefinition[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const def of defs) {
    values[def.key] = defaultValueForField(def);
  }
  return values;
}

function requiredMessage(label: string) {
  return `${label} é obrigatório`;
}

function zodForField(def: CustomFieldDefinition): ZodTypeAny {
  switch (def.type) {
    case "text": {
      const base = z.string();
      return def.required ? base.min(1, requiredMessage(def.label)) : base.optional().default("");
    }
    case "number":
    case "money": {
      if (def.required) {
        return z.coerce.number({ invalid_type_error: `${def.label} inválido` });
      }
      return z.preprocess((value) => (value === "" || value == null ? undefined : value), z.coerce.number().optional());
    }
    case "date": {
      const base = z.string();
      return def.required ? base.min(1, requiredMessage(def.label)) : base.optional().default("");
    }
    case "bool":
      return z.boolean();
    case "select": {
      const options = def.options ?? [];
      if (def.required) {
        return z
          .string()
          .min(1, requiredMessage(def.label))
          .refine((value) => options.includes(value), `Selecione ${def.label}`);
      }
      return z
        .string()
        .optional()
        .default("")
        .refine((value) => !value || options.includes(value), `Selecione ${def.label}`);
    }
  }
}

export function buildProcessSchema(defs: CustomFieldDefinition[]) {
  if (!defs.length) {
    return z.record(z.unknown()).optional().default({});
  }
  const shape: Record<string, ZodTypeAny> = {};
  for (const def of defs) {
    shape[def.key] = zodForField(def);
  }
  return z.object(shape);
}

/** Payload de `process` para a API: chaves definidas + reservadas. Sem totalValue da UI. */
export function processPayloadFromForm(
  defs: CustomFieldDefinition[],
  process: Record<string, unknown> | undefined,
  totalValue: number,
  observations?: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    potential_value: totalValue,
    value: totalValue,
  };
  const allowed = new Set(defs.map((def) => def.key));
  for (const def of defs) {
    const value = process?.[def.key];
    if (value === undefined || value === "") {
      if (def.required) payload[def.key] = value ?? "";
      continue;
    }
    payload[def.key] = coerceProcessValue(def.type, value);
  }
  if (observations && (defs.length === 0 || allowed.has("observations"))) {
    payload.observations = observations;
  }
  return payload;
}

export function coerceProcessValue(type: CustomFieldType, value: unknown): unknown {
  switch (type) {
    case "number":
    case "money": {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    case "bool":
      return Boolean(value);
    default:
      return value == null ? "" : String(value);
  }
}

export function isReservedProcessKey(key: string) {
  return RESERVED_PROCESS_KEYS.has(key);
}

export const customFieldAdminSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1, "Informe a chave")
      .max(63, "Chave muito longa")
      .regex(CUSTOM_FIELD_KEY_RE, "Use snake_case ASCII, começando com letra")
      .refine((key) => !isReservedProcessKey(key), "Esta chave é reservada"),
    label: z.string().trim().min(1, "Informe o rótulo").max(120, "Rótulo muito longo"),
    type: z.enum(CUSTOM_FIELD_TYPES),
    required: z.boolean(),
    optionsText: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type !== "select") return;
    const options = parseOptionsText(values.optionsText);
    if (options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["optionsText"],
        message: "Lista precisa de pelo menos 2 opções",
      });
    }
    if (options.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["optionsText"],
        message: "No máximo 50 opções",
      });
    }
    if (options.some((option) => option.length > 80)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["optionsText"],
        message: "Cada opção deve ter no máximo 80 caracteres",
      });
    }
  });

export type CustomFieldAdminValues = z.infer<typeof customFieldAdminSchema>;

export function parseOptionsText(raw?: string) {
  return (raw ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extraProcessColumns(defs: CustomFieldDefinition[]) {
  return defs
    .filter((def) => !isReservedProcessKey(def.key))
    .map((def) => ({ key: def.key, label: def.label, type: def.type }));
}

export function pickDefinedProcessValues(
  process: Record<string, unknown> | undefined,
  defs: CustomFieldDefinition[],
): Record<string, unknown> {
  const allowed = new Set(defs.map((def) => def.key));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(process ?? {})) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}
