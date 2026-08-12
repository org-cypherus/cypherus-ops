import { describe, expect, it } from "vitest";
import { isValidCnpj } from "@/lib/utils/document";
import {
  loginSchema,
  resolvePlanCode,
  signupAdminSchema,
  signupCompanySchema,
  signupSchema,
} from "./schemas";
import { billingIntervalLabel, canSubmitSignup, validateSignupStep } from "./signup-flow";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "ana@cypherops.com",
      password: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "123456",
    });
    expect(result.success).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("accepts a valid CNPJ", () => {
    expect(isValidCnpj("04.252.011/0001-10")).toBe(true);
  });

  it("rejects repeated digits", () => {
    expect(isValidCnpj("11.111.111/1111-11")).toBe(false);
  });

  it("rejects wrong check digits", () => {
    expect(isValidCnpj("04.252.011/0001-11")).toBe(false);
  });
});

describe("signup schemas", () => {
  it("validates company step", () => {
    const ok = signupCompanySchema.safeParse({
      companyName: "Cypher Ops",
      legalName: "Cypher Ops Tecnologia LTDA",
      document: "04.252.011/0001-10",
    });
    expect(ok.success).toBe(true);
  });

  it("rejects single-word admin name", () => {
    const result = signupAdminSchema.safeParse({
      adminName: "Ana",
      email: "ana@cypherops.com",
      password: "SenhaForte1",
      confirmPassword: "SenhaForte1",
    });
    expect(result.success).toBe(false);
  });

  it("requires matching passwords", () => {
    const result = signupAdminSchema.safeParse({
      adminName: "Ana Silva",
      email: "ana@cypherops.com",
      password: "SenhaForte1",
      confirmPassword: "SenhaForte2",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak password", () => {
    const result = signupAdminSchema.safeParse({
      adminName: "Ana Silva",
      email: "ana@cypherops.com",
      password: "senhafraca",
      confirmPassword: "senhafraca",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a full signup payload", () => {
    const result = signupSchema.safeParse({
      companyName: "Cypher Ops",
      legalName: "Cypher Ops Tecnologia LTDA",
      document: "04.252.011/0001-10",
      adminName: "Ana Silva",
      email: "ana@cypherops.com",
      password: "SenhaForte1",
      confirmPassword: "SenhaForte1",
      planCode: "PROFESSIONAL",
      billingInterval: "MONTHLY",
    });
    expect(result.success).toBe(true);
  });
});

describe("resolvePlanCode", () => {
  it("maps slug and defaults to PROFESSIONAL", () => {
    expect(resolvePlanCode("essencial")).toBe("ESSENTIAL");
    expect(resolvePlanCode("profissional")).toBe("PROFESSIONAL");
    expect(resolvePlanCode(null)).toBe("PROFESSIONAL");
    expect(resolvePlanCode("unknown")).toBe("PROFESSIONAL");
  });
});

describe("signup-flow", () => {
  it("validates step payloads independently", () => {
    const companyOk = validateSignupStep(0, {
      companyName: "Cypher Ops",
      legalName: "Cypher Ops LTDA",
      document: "04.252.011/0001-10",
    });
    expect(companyOk.success).toBe(true);

    const companyFail = validateSignupStep(0, {
      companyName: "",
      legalName: "",
      document: "123",
    });
    expect(companyFail.success).toBe(false);
  });

  it("only allows submit on review step", () => {
    expect(canSubmitSignup(0)).toBe(false);
    expect(canSubmitSignup(2)).toBe(false);
    expect(canSubmitSignup(3)).toBe(true);
  });

  it("labels billing interval", () => {
    expect(billingIntervalLabel("MONTHLY")).toBe("Mensal");
    expect(billingIntervalLabel("YEARLY")).toBe("Anual");
  });
});
