import { describe, expect, it } from "vitest";
import { isPublicCrmPath, needsUpstreamAuth, requiresCrmSession } from "./bff-public-routes";

describe("isPublicCrmPath", () => {
  it("keeps auth and signup routes public", () => {
    expect(isPublicCrmPath("v1/auth/login", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/refresh", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/companies", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/health/live", "GET")).toBe(true);
  });

  it("allows unauthenticated GET on catalog prefixes", () => {
    for (const prefix of ["v1/plans", "v1/features", "v1/permissions"]) {
      expect(isPublicCrmPath(prefix, "GET")).toBe(true);
      expect(isPublicCrmPath(prefix, "HEAD")).toBe(true);
      expect(isPublicCrmPath(prefix, "OPTIONS")).toBe(true);
      expect(isPublicCrmPath(`${prefix}/abc`, "GET")).toBe(true);
    }
  });

  it("treats catalog mutations as protected", () => {
    for (const prefix of ["v1/plans", "v1/features", "v1/permissions"]) {
      for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
        expect(isPublicCrmPath(prefix, method)).toBe(false);
        expect(isPublicCrmPath(`${prefix}/abc`, method)).toBe(false);
      }
    }
  });
});

describe("needsUpstreamAuth / requiresCrmSession", () => {
  it("requires session for catalog writes and normal CRM routes", () => {
    expect(needsUpstreamAuth("v1/plans", "PATCH")).toBe(true);
    expect(requiresCrmSession("v1/plans/plan-1", "DELETE")).toBe(true);
    expect(needsUpstreamAuth("v1/leads", "GET")).toBe(true);
  });

  it("does not require session for public catalog reads", () => {
    expect(needsUpstreamAuth("v1/plans", "GET")).toBe(false);
    expect(requiresCrmSession("v1/features", "GET")).toBe(false);
    expect(needsUpstreamAuth("v1/permissions", "HEAD")).toBe(false);
  });
});
