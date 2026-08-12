import { describe, expect, it } from "vitest";
import { matchAppRoute } from "./routes";

describe("matchAppRoute", () => {
  it("matches nested contract and calendar paths", () => {
    expect(matchAppRoute("/calendar")?.feature).toBe("agenda");
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

  it("maps legal to contracts feature", () => {
    expect(matchAppRoute("/legal")?.feature).toBe("contracts");
  });
});
