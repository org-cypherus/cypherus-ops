import { describe, expect, it } from "vitest";
import { matchAppRoute } from "./routes";

describe("matchAppRoute", () => {
  it("matches nested contract paths", () => {
    expect(matchAppRoute("/contracts/new")?.feature).toBe("contracts");
    expect(matchAppRoute("/contracts/abc")?.feature).toBe("contracts");
  });

  it("prefers specific admin feature routes over /admin", () => {
    expect(matchAppRoute("/admin/permissions")?.feature).toBe("advanced_permissions");
    expect(matchAppRoute("/admin/roles")?.feature).toBe("advanced_permissions");
    expect(matchAppRoute("/admin/enterprise")?.href).toBe("/admin/enterprise");
    expect(matchAppRoute("/admin")?.feature).toBeUndefined();
    expect(matchAppRoute("/admin/users")?.feature).toBeUndefined();
  });

  it("does not expose calendar, legal or reports in the gated nav", () => {
    expect(matchAppRoute("/calendar")).toBeUndefined();
    expect(matchAppRoute("/legal")).toBeUndefined();
    expect(matchAppRoute("/reports")).toBeUndefined();
  });

  it("does not treat platform console as a tenant-gated route", () => {
    expect(matchAppRoute("/platform")).toBeUndefined();
    expect(matchAppRoute("/platform/companies")).toBeUndefined();
    expect(matchAppRoute("/platform/plans")).toBeUndefined();
    expect(matchAppRoute("/platform/billing")).toBeUndefined();
  });
});
