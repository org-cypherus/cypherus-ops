import { describe, expect, it } from "vitest";
import {
  decodeJwtPayload,
  isPlatformAccessToken,
  jwtExp,
  resolvePlatformUpstreamPath,
} from "./jwt-payload";

function encodePayload(payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("decodeJwtPayload / jwtExp", () => {
  it("reads a compact JWT payload without verifying the signature", () => {
    const token = encodePayload({ typ: "platform", exp: 1_700_000_000, sub: "staff-1" });
    expect(decodeJwtPayload(token)).toMatchObject({ typ: "platform", sub: "staff-1" });
    expect(jwtExp(token)).toBe(1_700_000_000);
  });

  it("returns null for garbage", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(jwtExp("abc")).toBeNull();
  });
});

describe("isPlatformAccessToken", () => {
  it("is true only when typ=platform", () => {
    expect(isPlatformAccessToken(encodePayload({ typ: "platform" }))).toBe(true);
    expect(isPlatformAccessToken(encodePayload({ company_id: "c1" }))).toBe(false);
    expect(isPlatformAccessToken(encodePayload({ typ: "tenant" }))).toBe(false);
    expect(isPlatformAccessToken(null)).toBe(false);
    expect(isPlatformAccessToken("")).toBe(false);
  });
});

describe("resolvePlatformUpstreamPath", () => {
  const platform = encodePayload({ typ: "platform" });
  const tenant = encodePayload({ company_id: "c1" });

  it("rewrites tenant auth refresh/logout to platform when the cookie is platform", () => {
    expect(resolvePlatformUpstreamPath("v1/auth/refresh", platform)).toBe("v1/platform/auth/refresh");
    expect(resolvePlatformUpstreamPath("v1/auth/logout", platform)).toBe("v1/platform/auth/logout");
    expect(resolvePlatformUpstreamPath("v1/me", platform)).toBe("v1/me");
  });

  it("does not rewrite tenant sessions", () => {
    expect(resolvePlatformUpstreamPath("v1/auth/refresh", tenant)).toBe("v1/auth/refresh");
    expect(resolvePlatformUpstreamPath("v1/auth/logout", tenant)).toBe("v1/auth/logout");
    expect(resolvePlatformUpstreamPath("v1/auth/refresh", null)).toBe("v1/auth/refresh");
  });
});
