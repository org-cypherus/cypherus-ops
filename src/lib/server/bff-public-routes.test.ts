import { describe, expect, it } from "vitest";
import {
  isPlatformApiPath,
  isPublicCrmPath,
  needsUpstreamAuth,
  requiresCrmSession,
  requiresPlatformSession,
} from "./bff-public-routes";

describe("isPublicCrmPath", () => {
  it("keeps auth and signup routes public", () => {
    expect(isPublicCrmPath("v1/auth/login", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/refresh", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/companies", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/health/live", "GET")).toBe(true);
  });

  it("keeps platform staff login/refresh/logout public", () => {
    expect(isPublicCrmPath("v1/platform/auth/login", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/platform/auth/refresh", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/platform/auth/logout", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/platform/auth/me", "GET")).toBe(false);
    expect(isPublicCrmPath("v1/platform/companies", "GET")).toBe(false);
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

  it("requires a CRM cookie on platform admin APIs except public auth", () => {
    expect(requiresCrmSession("v1/platform/companies", "GET")).toBe(true);
    expect(requiresCrmSession("v1/platform/auth/me", "GET")).toBe(true);
    expect(requiresCrmSession("v1/platform/auth/login", "POST")).toBe(false);
  });
});

describe("requiresPlatformSession", () => {
  it("gates the platform surface on typ=platform, not on email", () => {
    expect(isPlatformApiPath("v1/platform/companies")).toBe(true);
    expect(requiresPlatformSession("v1/platform/companies")).toBe(true);
    expect(requiresPlatformSession("v1/platform/auth/me")).toBe(true);
    expect(requiresPlatformSession("v1/platform/plans/abc")).toBe(true);
    expect(requiresPlatformSession("v1/platform/auth/login")).toBe(false);
    expect(requiresPlatformSession("v1/platform/auth/refresh")).toBe(false);
    expect(requiresPlatformSession("v1/platform/auth/logout")).toBe(false);
    expect(requiresPlatformSession("v1/companies")).toBe(false);
    expect(requiresPlatformSession("v1/me")).toBe(false);
  });
});
