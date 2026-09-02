import { describe, expect, it } from "vitest";
import {
  isPublicCrmPath,
  needsUpstreamAuth,
  PUBLIC_CATALOG_PREFIXES,
} from "./bff-public-routes";

const WRITE_METHODS = ["POST", "PATCH", "PUT", "DELETE"] as const;
const CATALOG_READ_METHODS = ["GET", "HEAD", "OPTIONS"] as const;

describe("isPublicCrmPath", () => {
  it("keeps auth, health, and signup public for every method they use", () => {
    expect(isPublicCrmPath("v1/auth/login", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/refresh", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/logout", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/invitations/accept", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/password-reset", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/password-reset/confirm", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/auth/email-verification", "POST")).toBe(true);
    expect(isPublicCrmPath("v1/health/live", "GET")).toBe(true);
    expect(isPublicCrmPath("v1/companies", "POST")).toBe(true);
  });

  it("does not treat company reads or other company verbs as signup", () => {
    expect(isPublicCrmPath("v1/companies", "GET")).toBe(false);
    expect(isPublicCrmPath("v1/companies", "PATCH")).toBe(false);
    expect(isPublicCrmPath("v1/companies/abc", "POST")).toBe(false);
  });

  it("allows unauthenticated catalog reads (GET/HEAD/OPTIONS) including subpaths — 27 cases", () => {
    let n = 0;
    for (const prefix of PUBLIC_CATALOG_PREFIXES) {
      for (const method of CATALOG_READ_METHODS) {
        expect(isPublicCrmPath(prefix, method)).toBe(true);
        expect(isPublicCrmPath(`${prefix}/abc`, method)).toBe(true);
        expect(isPublicCrmPath(`${prefix}/abc/features`, method)).toBe(true);
        n += 3;
      }
    }
    expect(n).toBe(27);
  });

  it("treats catalog writes as protected (POST/PATCH/PUT/DELETE) including subpaths — 24 cases", () => {
    let n = 0;
    for (const prefix of PUBLIC_CATALOG_PREFIXES) {
      for (const method of WRITE_METHODS) {
        expect(isPublicCrmPath(prefix, method)).toBe(false);
        expect(isPublicCrmPath(`${prefix}/abc`, method)).toBe(false);
        n += 2;
      }
    }
    expect(n).toBe(24);
  });
});

describe("needsUpstreamAuth", () => {
  it("is the inverse of isPublicCrmPath on the catalog write matrix — 24 cases", () => {
    let n = 0;
    for (const prefix of PUBLIC_CATALOG_PREFIXES) {
      for (const method of WRITE_METHODS) {
        expect(needsUpstreamAuth(prefix, method)).toBe(true);
        expect(needsUpstreamAuth(`${prefix}/abc`, method)).toBe(true);
        n += 2;
      }
    }
    expect(n).toBe(24);
  });

  it("does not require upstream JWT on public catalog reads — 9 cases", () => {
    let n = 0;
    for (const prefix of PUBLIC_CATALOG_PREFIXES) {
      for (const method of CATALOG_READ_METHODS) {
        expect(needsUpstreamAuth(prefix, method)).toBe(false);
        n += 1;
      }
    }
    expect(n).toBe(9);
  });

  it("requires upstream JWT on normal authenticated CRM routes", () => {
    expect(needsUpstreamAuth("v1/leads", "GET")).toBe(true);
    expect(needsUpstreamAuth("v1/leads/abc", "PATCH")).toBe(true);
    expect(needsUpstreamAuth("v1/companies", "GET")).toBe(true);
    expect(needsUpstreamAuth("v1/auth/me", "GET")).toBe(true);
  });

  it("does not require upstream JWT on login/signup (cookie is set by the response)", () => {
    expect(needsUpstreamAuth("v1/auth/login", "POST")).toBe(false);
    expect(needsUpstreamAuth("v1/companies", "POST")).toBe(false);
    expect(needsUpstreamAuth("v1/auth/refresh", "POST")).toBe(false);
  });
});
