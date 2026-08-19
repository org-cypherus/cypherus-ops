import { describe, expect, it } from "vitest";
import { isPlatformAdminEmail, parseCsvList } from "./platform";

describe("parseCsvList", () => {
  it("normalizes emails and drops empties", () => {
    expect(parseCsvList("  Ana@Cypherops.com.br, ,ops@cypherops.com.br ")).toEqual([
      "ana@cypherops.com.br",
      "ops@cypherops.com.br",
    ]);
  });
});

describe("isPlatformAdminEmail", () => {
  it("matches explicit allowlist", () => {
    expect(
      isPlatformAdminEmail("luccas@empresa.com", {
        emails: ["luccas@empresa.com"],
        domains: [],
      }),
    ).toBe(true);
    expect(
      isPlatformAdminEmail("ana@cypherops.com", {
        emails: ["ops@cypherops.com.br"],
        domains: [],
      }),
    ).toBe(false);
  });

  it("matches operational domain and ignores demo tenant emails", () => {
    expect(
      isPlatformAdminEmail("ops@cypherops.com.br", {
        emails: [],
        domains: ["cypherops.com.br"],
      }),
    ).toBe(true);
    expect(
      isPlatformAdminEmail("ana@cypherops.com", {
        emails: [],
        domains: ["cypherops.com.br"],
      }),
    ).toBe(false);
  });

  it("defaults to cypherops.com.br when no domain list is given", () => {
    expect(isPlatformAdminEmail("financeiro@cypherops.com.br", { emails: [] })).toBe(true);
  });
});
