import { describe, expect, it } from "vitest";
import { leadFormSchema } from "./schemas";

describe("leadFormSchema", () => {
  it("accepts a valid lead payload", () => {
    const parsed = leadFormSchema.parse({
      name: "Maria Silva",
      email: "maria@example.com",
      phone: "11999999999",
      cpf: "12345678909",
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

