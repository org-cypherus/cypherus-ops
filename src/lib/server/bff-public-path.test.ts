import { describe, expect, it } from "vitest";
import { isPublicCrmPath, needsUpstreamAuth } from "./bff-public-path";

const CATALOG_PREFIXES = ["v1/plans", "v1/features", "v1/permissions"] as const;
const WRITE_METHODS = ["POST", "PATCH", "PUT", "DELETE"] as const;

describe("isPublicCrmPath", () => {
  it("keeps auth, health and signup public", () => {
    expect(isPublicCrmPath("v1/auth/login", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/refresh", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/logout", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/invitations/accept", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/password-reset", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/email-verification", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/health/live", "GET")).toBe(true);
    expect(isPublicCrmPath("v1/companies", "POST")).toBe(true);
  });

  it("does not treat company reads or other company methods as public", () => {
    expect(isPublicCrmPath("v1/companies", "GET")).toBe(false);
    expect(isPublicCrmPath("v1/companies", "PATCH")).toBe(false);
    expect(isPublicCrmPath("v1/companies/abc", "POST")).toBe(false);
  });

  it("allows unauthenticated GET/HEAD on catalog prefixes and nested paths", () => {
    for (const prefix of CATALOG_PREFIXES) {
      expect(isPublicCrmPath(prefix, "GET")).toBe(true);
      expect(isPublicCrmPath(prefix, "HEAD")).toBe(true);
      expect(isPublicCrmPath(`${prefix}/abc`, "GET")).toBe(true);
      expect(isPublicCrmPath(`${prefix}/abc`, "HEAD")).toBe(true);
    }
  });

  it("treats catalog writes as protected (CRM-002)", () => {
    for (const prefix of CATALOG_PREFIXES) {
      for (const method of WRITE_METHODS) {
        expect(isPublicCrmPath(prefix, method)).toBe(false);
        expect(isPublicCrmPath(`${prefix}/abc`, method)).toBe(false);
      }
    }
  });

  it("treats normal CRM routes as protected", () => {
    expect(isPublicCrmPath("v1/leads", "GET")).toBe(false);
    expect(isPublicCrmPath("v1/leads", "POST")).toBe(false);
    expect(isPublicCrmPath("v1/me", "GET")).toBe(false);
  });
});

describe("needsUpstreamAuth", () => {
  it("is the inverse of isPublicCrmPath", () => {
    const samples: Array<[string, string]> = [
      ["v1/auth/login", "POST"],
      ["v1/companies", "POST"],
      ["v1/plans", "GET"],
      ["v1/plans", "PATCH"],
      ["v1/features/x", "DELETE"],
      ["v1/permissions", "POST"],
      ["v1/leads", "GET"],
    ];
    for (const [path, method] of samples) {
      expect(needsUpstreamAuth(path, method)).toBe(!isPublicCrmPath(path, method));
    }
  });

  it("requires CRM session + X-Upstream-Authorization on catalog writes", () => {
    for (const prefix of CATALOG_PREFIXES) {
      for (const method of WRITE_METHODS) {
        expect(needsUpstreamAuth(prefix, method)).toBe(true);
        expect(needsUpstreamAuth(`${prefix}/abc`, method)).toBe(true);
      }
    }
  });

  it("does not require upstream JWT for public catalog reads or signup", () => {
    expect(needsUpstreamAuth("v1/plans", "GET")).toBe(false);
    expect(needsUpstreamAuth("v1/features", "HEAD")).toBe(false);
    expect(needsUpstreamAuth("v1/permissions/x", "GET")).toBe(false);
    expect(needsUpstreamAuth("v1/companies", "POST")).toBe(false);
  });

  it("requires upstream JWT for normal CRM reads and writes", () => {
    expect(needsUpstreamAuth("v1/leads", "GET")).toBe(true);
    expect(needsUpstreamAuth("v1/companies", "GET")).toBe(true);
    expect(needsUpstreamAuth("v1/me", "GET")).toBe(true);
  });
});
