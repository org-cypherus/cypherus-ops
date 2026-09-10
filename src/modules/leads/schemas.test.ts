import { describe, expect, it } from "vitest";
import type { CustomFieldDefinition } from "@/modules/custom-fields/types";
import { buildLeadFormSchema, leadFormSchema } from "./schemas";

const validBase = {
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "11999999999",
  cpf: "12345678909",
  priority: "alta" as const,
  status: "Novo Lead" as const,
  totalValue: 1000,
};

const requiredSelect: CustomFieldDefinition = {
  id: "cf-select",
  companyId: "c1",
  entity: "LEAD",
  key: "origem_detalhe",
  label: "Origem detalhe",
  type: "select",
  required: true,
  sortOrder: 0,
  options: ["Indicação", "Google"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("leadFormSchema", () => {
  it("accepts a valid lead payload", () => {
    const parsed = leadFormSchema.parse(validBase);
    expect(parsed.name).toBe("Maria Silva");
    expect(parsed.totalValue).toBe(1000);
  });

  it("rejects invalid email", () => {
    expect(() =>
      leadFormSchema.parse({
        name: "Maria",
        email: "invalid",
        phone: "11999999999",
      }),
    ).toThrow();
  });

  it("creates a lead without custom field defs", () => {
    const schema = buildLeadFormSchema([]);
    const parsed = schema.parse({ ...validBase, process: {} });
    expect(parsed.process).toEqual({});
  });

  it("requires a select option when the tenant defined one", () => {
    const schema = buildLeadFormSchema([requiredSelect]);
    expect(schema.safeParse({ ...validBase, process: {} }).success).toBe(false);
    expect(schema.safeParse({ ...validBase, process: { origem_detalhe: "" } }).success).toBe(false);
    const parsed = schema.parse({ ...validBase, process: { origem_detalhe: "Indicação" } });
    expect(parsed.process).toEqual({ origem_detalhe: "Indicação" });
  });
});
