import { describe, expect, it } from "vitest";
import { parseLeadsCsv } from "@/lib/utils/download";
import { leadFormSchema } from "./schemas";

describe("leadFormSchema", () => {
  it("accepts a valid lead payload", () => {
    const parsed = leadFormSchema.parse({
      name: "Maria Silva",
      email: "maria@example.com",
      phone: "11999999999",
      priority: "alta",
      status: "Novo Lead",
      totalValue: 1000,
    });
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
});

describe("parseLeadsCsv", () => {
  it("parses portuguese headers", () => {
    const rows = parseLeadsCsv(
      ["nome,email,telefone,cpf,origem,valor", "Ana,ana@x.com,1199,111,Google Ads,15000"].join("\n"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Ana");
    expect(rows[0].process.totalValue).toBe(15000);
  });
});
