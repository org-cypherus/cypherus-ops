import { describe, expect, it } from "vitest";
import { isPlatformStaff, isPlatformStaffRole } from "./platform";

describe("isPlatformStaffRole", () => {
  it("accepts the three staff roles from the CRM", () => {
    expect(isPlatformStaffRole("PLATFORM_VIEWER")).toBe(true);
    expect(isPlatformStaffRole("PLATFORM_OPS")).toBe(true);
    expect(isPlatformStaffRole("PLATFORM_ADMIN")).toBe(true);
    expect(isPlatformStaffRole("ADMIN")).toBe(false);
    expect(isPlatformStaffRole("ops@cypherops.com.br")).toBe(false);
  });
});

describe("isPlatformStaff", () => {
  it("does not treat a tenant user or an email domain as platform staff", () => {
    expect(
      isPlatformStaff({
        id: "u1",
        email: "ops@cypherops.com.br",
        role: "Administrador",
      }),
    ).toBe(false);
    expect(isPlatformStaff({ email: "ops@cypherops.com.br" })).toBe(false);
  });

  it("accepts a platform /me payload", () => {
    expect(
      isPlatformStaff({
        id: "staff-1",
        email: "staff@cypherops.com.br",
        role: "PLATFORM_ADMIN",
        last_login_at: null,
      }),
    ).toBe(true);
  });
});
