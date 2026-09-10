import { z } from "zod";
import { buildProcessSchema } from "@/modules/custom-fields/schema-builder";
import type { CustomFieldDefinition } from "@/modules/custom-fields/types";
import { PIPELINE_STAGES } from "./types";

export const leadFormBaseSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Informe o telefone"),
  whatsapp: z.string().optional(),
  cpf: z.string().min(11, "Informe o CPF"),
  origin: z.string().optional(),
  campaign: z.string().optional(),
  channel: z.string().optional(),
  ownerId: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta"]),
  status: z.enum(PIPELINE_STAGES),
  totalValue: z.coerce.number().min(0),
  observations: z.string().optional(),
  tags: z.string().optional(),
});

export function buildLeadFormSchema(defs: CustomFieldDefinition[] = []) {
  return leadFormBaseSchema.extend({
    process: buildProcessSchema(defs),
  });
}

export const leadFormSchema = buildLeadFormSchema();

export type LeadFormValues = z.infer<typeof leadFormBaseSchema> & {
  process: Record<string, unknown>;
};

export const leadSectionSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  birthDate: z.string().optional(),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  origin: z.string().optional(),
  campaign: z.string().optional(),
  channel: z.string().optional(),
  priority: z.enum(["baixa", "media", "alta"]).optional(),
  tags: z.string().optional(),
  totalValue: z.coerce.number().optional(),
  process: z.record(z.unknown()).optional(),
  observations: z.string().optional(),
});
