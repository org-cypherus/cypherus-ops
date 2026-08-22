import { describe, expect, it } from "vitest";
import { adminUserFormSchema } from "./schemas";

describe("adminUserFormSchema", () => {
  it("accepts a valid user payload", () => {
    const parsed = adminUserFormSchema.safeParse({
      name: "Ana Souza",
      email: "ana@cypherops.com",
      phone: "(11) 98888-1001",
      role: "Comercial",
      team: "Vendas",
      status: "Ativo",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires phone and team on create and edit", () => {
    const parsed = adminUserFormSchema.safeParse({
      name: "Ana Souza",
      email: "ana@cypherops.com",
      phone: "",
      role: "Comercial",
      team: "",
      status: "Ativo",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects incomplete name, bad email and short phone", () => {
    const parsed = adminUserFormSchema.safeParse({
      name: "Ana",
      email: "ana@",
      phone: "1199",
      role: "Comercial",
      team: "",
      status: "Ativo",
    });
    expect(parsed.success).toBe(false);
  });
});
