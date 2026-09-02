import { describe, expect, it } from "vitest";
import { mapPlatformCompanyList, overviewFromListItems } from "./services";

describe("mapPlatformCompanyList", () => {
  it("reads the platform list envelope and ignores a raw tenant array leftover", () => {
    expect(
      mapPlatformCompanyList({
        items: [{ id: "c1", name: "Acme", document: "1", status: "ACTIVE", subscription: null }],
        next_cursor: null,
      }),
    ).toHaveLength(1);
    expect(mapPlatformCompanyList(undefined)).toEqual([]);
    expect(mapPlatformCompanyList([])).toEqual([]);
  });
});

describe("overviewFromListItems", () => {
  it("joins plan price from the platform catalog, not from tenant /v1/companies", () => {
    const overview = overviewFromListItems(
      [
        {
          id: "c1",
          name: "Acme",
          document: "1",
          status: "ACTIVE",
          subscription: {
            status: "ACTIVE",
            plan_id: "plan-pro",
            plan_code: "PROFESSIONAL",
            plan_name: "Profissional",
          },
        },
      ],
      [
        {
          id: "plan-pro",
          code: "PROFESSIONAL",
          name: "Profissional",
          description: null,
          price: "449.90",
          billing_interval: "MONTHLY",
          is_active: true,
        },
      ],
    );
    expect(overview[0]?.planName).toBe("Profissional");
    expect(overview[0]?.planCode).toBe("PROFESSIONAL");
    expect(overview[0]?.subscription?.status).toBe("ACTIVE");
    expect(overview[0]?.company.legal_name).toBeNull();
  });
});
