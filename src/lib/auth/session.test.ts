import { describe, expect, it, beforeEach } from "vitest";
import {
  clearCachedSessionUser,
  getCachedSessionUpdatedAt,
  getCachedSessionUser,
  setCachedSessionUser,
  type SessionUser,
} from "./session";

const sampleUser = {
  id: "u1",
  name: "Ana",
  email: "ana@example.com",
  role: "Administrador",
  permissions: ["leads:visualizar"],
  companyId: "c1",
  company: { id: "c1", name: "Acme", status: "ACTIVE" },
  subscription: { planCode: "PROFESSIONAL", status: "ACTIVE" },
  features: {},
} as SessionUser;

describe("session cache", () => {
  beforeEach(() => {
    clearCachedSessionUser();
  });

  it("round-trips a valid session snapshot", () => {
    setCachedSessionUser(sampleUser);
    expect(getCachedSessionUser()).toEqual(sampleUser);
    expect(getCachedSessionUpdatedAt()).toEqual(expect.any(Number));
  });

  it("rejects malformed snapshots", () => {
    sessionStorage.setItem("cypher_ops_session_user", JSON.stringify({ id: 1 }));
    expect(getCachedSessionUser()).toBeUndefined();
  });

  it("clears snapshot", () => {
    setCachedSessionUser(sampleUser);
    clearCachedSessionUser();
    expect(getCachedSessionUser()).toBeUndefined();
    expect(getCachedSessionUpdatedAt()).toBeUndefined();
  });
});
